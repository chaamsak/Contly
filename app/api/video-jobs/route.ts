import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { VideoJobResponse } from "@/lib/types";
import { processVideoJob } from "@/lib/video";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listId, delaySeconds = 3 } = body as {
      listId: string;
      delaySeconds?: number;
    };

    if (!listId) {
      return NextResponse.json(
        { error: "listId is required" },
        { status: 400 }
      );
    }

    // Check the list exists
    const list = await prisma.vocabList.findUnique({
      where: { id: listId },
      include: {
        items: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    // Check all audio is READY
    const notReady = list.items.filter((i: any) => i.audioStatus !== "READY");
    if (notReady.length > 0) {
      return NextResponse.json(
        {
          error: `${notReady.length} item(s) do not have audio ready. Please generate audio for all items first.`,
        },
        { status: 400 }
      );
    }

    // Check for active job
    const activeJob = await prisma.videoJob.findFirst({
      where: {
        listId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (activeJob) {
      return NextResponse.json(
        { error: "There is already an active video job for this list." },
        { status: 409 }
      );
    }

    // Create the video job
    const job = await prisma.videoJob.create({
      data: {
        listId,
        status: "PENDING",
      },
    });

    // Trigger internal Node.js background process
    // We execute this asynchronously so the frontend immediately receives the 201 processing confirmation
    processVideoJob(job.id, listId, delaySeconds, list.items).catch((err) => {
      console.error("Unhandled error in background video generation:", err);
    });

    const response: VideoJobResponse = {
      id: job.id,
      listId: job.listId,
      status: job.status,
      videoUrl: job.videoUrl,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Video job creation error:", error);
    return NextResponse.json(
      { error: "Failed to create video job" },
      { status: 500 }
    );
  }
}
