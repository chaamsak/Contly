import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
// @ts-expect-error No types available for ffprobe-static
import ffprobeStatic from "ffprobe-static";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { prisma } from "./db";
import { getStorage } from "./storage";

// Set fluent-ffmpeg to use our installed ffmpeg static binaries
ffmpeg.setFfmpegPath(ffmpegStatic as string);
ffmpeg.setFfprobePath(ffprobeStatic.path);

async function generateFrame(
  arabic: string,
  english: string | null,
  outPath: string,
  bgImage: any
): Promise<void> {
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext("2d");

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, 1280, 720);
  } else {
    ctx.fillStyle = "#1e293b"; // fallback slate-800
    ctx.fillRect(0, 0, 1280, 720);
  }

  // Draw a 40% dark overlay to guarantee the white text has high contrast
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, 1280, 720);

  // Modern text rendering
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (english) {
    // Both Arabic and English
    ctx.fillStyle = "#ffffff"; // Pure white
    ctx.font = 'bold 72px "Arial", "Noto Sans Arabic", sans-serif';
    ctx.fillText(arabic, 640, 300);

    ctx.fillStyle = "#e5e7eb"; // gray-200 for subtitle
    ctx.font = '36px "Arial", sans-serif';
    ctx.fillText(english, 640, 420);
  } else {
    // Only Arabic
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 72px "Arial", "Noto Sans Arabic", sans-serif';
    ctx.fillText(arabic, 640, 360);
  }

  const buffer = canvas.encodeSync("png");
  await fs.writeFile(outPath, buffer);
  
  // Free the massive native canvas buffer explicitly
  (canvas as any) = null;
}

function createItemVideo(
  imagePath: string,
  audioPath: string,
  outPath: string,
  delaySec: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .loop() // Loop the static image infinitely
      .input(audioPath)
      .complexFilter([
        // Format the audio to 24kHz mono to ensure strict compatibility with the silence generator
        {
          filter: "aformat",
          options: "sample_rates=24000:channel_layouts=mono",
          inputs: "1:a",
          outputs: ["afmt"],
        },
        // Split the formatted audio into two identical streams
        {
          filter: "asplit",
          options: 2,
          inputs: "afmt",
          outputs: ["a1", "a2"],
        },
        // Generate a pure silence stream of `delaySec` seconds
        {
          filter: "anullsrc",
          options: { r: 24000, cl: "mono", d: delaySec },
          outputs: ["silence"],
        },
        // Concatenate: Audio 1 -> Silence -> Audio 2
        {
          filter: "concat",
          options: { n: 3, v: 0, a: 1 },
          inputs: ["a1", "silence", "a2"],
          outputs: ["aout"],
        },
      ])
      .outputOptions([
        "-map 0:v",     // Map the image as the video stream
        "-map [aout]",  // Map our concatenated sequence as the audio stream
        "-c:v libx264", // Video codec
        "-c:a aac",     // Audio codec
        "-pix_fmt yuv420p",
        "-shortest",    // CRITICAL: Stop the output when the shortest stream (the audio) ends!
      ])
      .save(outPath)
      .on("end", () => resolve())
      .on("error", (err) => {
        console.error(`ffmpeg error for ${outPath}:`, err);
        reject(err);
      });
  });
}

function concatVideos(
  videoPaths: string[],
  outPath: string,
  tempDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    videoPaths.forEach((v) => cmd.input(v));

    cmd
      .on("error", (err) => {
        console.error(`ffmpeg merge error:`, err);
        reject(err);
      })
      .on("end", () => resolve())
      .mergeToFile(outPath, tempDir);
  });
}

export async function processVideoJob(
  jobId: string,
  listId: string,
  delaySeconds: number,
  items: any[]
) {
  const tempDir = path.join(os.tmpdir(), `contly-job-${jobId}`);
  let statusUpdated = false;

  try {
    await fs.mkdir(tempDir, { recursive: true });

    // 1. Mark as PROCESSING securely
    await prisma.videoJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING" },
    });
    statusUpdated = true;

    const generatedVideos: string[] = [];
    const storageService = getStorage();

    // Load background image ONCE to prevent severe Node.js Object Memory leaks
    let bgImage: any = null;
    try {
      const { loadImage } = await import("@napi-rs/canvas");
      bgImage = await loadImage("https://cdn.mos.cms.futurecdn.net/BfemybeKVXCf9pgX9WCxsc.jpg");
    } catch (bgErr) {
      console.warn("Could not preload bgImage:", bgErr);
    }

    // 2. Iterate through items to generate frames and videos
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.audioUrl) continue;

      const audioBufferResult = await fetchAudioBuffer(item.audioUrl);
      if (!audioBufferResult) {
        throw new Error(`Failed to resolve audio for item ${item.id}`);
      }

      const audioPath = path.join(tempDir, `item_${i}.mp3`);
      await fs.writeFile(audioPath, audioBufferResult);

      const framePath = path.join(tempDir, `item_${i}.png`);
      await generateFrame(item.arabicPrimary, item.english, framePath, bgImage);

      const videoPath = path.join(tempDir, `item_${i}.mp4`);
      console.log(`[Job ${jobId}] Rendering video for word ${i + 1}/${items.length}...`);
      await createItemVideo(framePath, audioPath, videoPath, delaySeconds);

      generatedVideos.push(videoPath);
      
      // Forcefully yield the Node event loop to allow Render's garbage collector to dump the Native Canvas memory
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (generatedVideos.length === 0) {
      throw new Error("No items with audio found to generate a video.");
    }

    // 3. Concatenate all pieces together
    const finalVideoPath = path.join(tempDir, "final.mp4");
    console.log(`[Job ${jobId}] Concatenating ${generatedVideos.length} clips...`);
    await concatVideos(generatedVideos, finalVideoPath, tempDir);

    // 4. Upload the final MP4 to our Storage Provider
    const finalVideoBuffer = await fs.readFile(finalVideoPath);
    const videoUrl = await storageService.saveVideo(
      `contly_${listId}_${Date.now()}.mp4`,
      finalVideoBuffer
    );

    // 5. Conclude the job
    await prisma.videoJob.update({
      where: { id: jobId },
      data: { 
        status: "READY",
        videoUrl,
      },
    });
    console.log(`[Job ${jobId}] Finished successfully! Url: ${videoUrl}`);
  } catch (error: any) {
    console.error(`[Job ${jobId}] FAILED:`, error);
    if (statusUpdated || !statusUpdated) {
      // Regardless, flag as error
      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          error: error.message || "An unknown error occurred",
        },
      });
    }
  } finally {
    // 6. Cleanup temporary system files to prevent memory leak
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error(`[Job ${jobId}] Failed to clean temp dir:`, cleanupError);
    }
  }
}

async function fetchAudioBuffer(audioUrl: string): Promise<Buffer | null> {
  // If we are using Local Storage, the audioUrl is like `/audio/xyz.mp3`
  if (audioUrl.startsWith("/")) {
    const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const absolute = `${publicAppUrl}${audioUrl}`;
    const res = await fetch(absolute);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // If using generic HTTP (like Vercel Blob)
  if (audioUrl.startsWith("http")) {
    const res = await fetch(audioUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  return null;
}
