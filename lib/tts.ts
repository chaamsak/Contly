import { getStorage } from "./storage";

interface TtsResult {
  audioContent: Buffer;
}

async function generateWithGoogle(text: string, voiceNameOverride?: string): Promise<Buffer> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not set");
  }

  const { TextToSpeechClient } = await import("@google-cloud/text-to-speech");
  const credentials = JSON.parse(credentialsJson);
  const client = new TextToSpeechClient({ credentials });

  const voiceName = voiceNameOverride || process.env.TTS_VOICE_NAME || "ar-XA-Wavenet-B";
  const languageCode = voiceName.substring(0, 5);

  const input = text.startsWith("<speak>") ? { ssml: text } : { text };

  const [response] = await client.synthesizeSpeech({
    input,
    voice: { languageCode, name: voiceName },
    audioConfig: {
      audioEncoding: "MP3" as const,
      speakingRate: 0.9,
    },
  });

  if (!response.audioContent) {
    throw new Error("No audio content returned from Google TTS");
  }

  return Buffer.from(response.audioContent as Uint8Array);
}

function createSilenceBuffer(durationMs: number): Buffer {
  const frameHeader = Buffer.from([0xff, 0xfb, 0x90, 0x00]); // 128kbps 44100Hz 
  const frameData = Buffer.alloc(417 - 4, 0); 
  const frame = Buffer.concat([frameHeader, frameData]);
  // One frame is ~26ms
  const numFrames = Math.ceil(durationMs / 26);
  const frames: Buffer[] = [];
  for (let i = 0; i < numFrames; i++) {
    frames.push(frame);
  }
  return Buffer.concat(frames);
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function generateTts(
  itemId: string,
  arabicText: string,
  englishText: string | null
): Promise<string> {
  const isMock = process.env.MOCK_TTS === "true";
  const fileName = `${itemId}.mp3`;

  let finalBuffer: Buffer;

  if (isMock) {
    finalBuffer = createSilenceBuffer(1000);
  } else {
    // Generate Arabic audio
    const arBuffer = await generateWithGoogle(arabicText, process.env.TTS_VOICE_NAME || "ar-XA-Wavenet-B");
    
    if (englishText) {
      // Generate English audio with American voice, prepended with a 500ms break
      const safeText = escapeXml(englishText);
      const enSsml = `<speak><break time="500ms"/>${safeText}</speak>`;
      const enBuffer = await generateWithGoogle(enSsml, "en-US-Neural2-F");
      // Concatenate parts natively. Both are 24kHz MP3s from Google so they stitch perfectly.
      finalBuffer = Buffer.concat([arBuffer, enBuffer]);
    } else {
      finalBuffer = arBuffer;
    }
  }

  const storage = getStorage();
  const url = await storage.save(fileName, finalBuffer);

  return url;
}
