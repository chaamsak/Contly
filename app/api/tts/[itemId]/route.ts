import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTts } from "@/lib/tts";
import type { TtsResponse } from "@/lib/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    const item = await prisma.vocabItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // If audio is already ready, return it
    if (item.audioStatus === "READY" && item.audioUrl) {
      const response: TtsResponse = {
        audioUrl: item.audioUrl,
        audioStatus: item.audioStatus,
      };
      return NextResponse.json(response);
    }

    // Mark as generating
    await prisma.vocabItem.update({
      where: { id: itemId },
      data: { audioStatus: "GENERATING" },
    });

    try {
      const audioUrl = await generateTts(itemId, item.arabicPrimary, item.english || null);

      // Mark as ready
      const updated = await prisma.vocabItem.update({
        where: { id: itemId },
        data: {
          audioUrl,
          audioStatus: "READY",
        },
      });

      const response: TtsResponse = {
        audioUrl: updated.audioUrl!,
        audioStatus: updated.audioStatus,
      };

      return NextResponse.json(response);
    } catch (ttsError) {
      console.error("TTS generation failed:", ttsError);

      await prisma.vocabItem.update({
        where: { id: itemId },
        data: { audioStatus: "FAILED" },
      });

      return NextResponse.json(
        { error: "Failed to generate audio" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
