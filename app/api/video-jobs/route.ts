import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { VideoJobResponse } from "@/lib/types";

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

    // Format exactly as the standalone contly-worker expects
    const workerPayload = {
      jobId: job.id,
      delaySeconds,
      items: list.items.map((i: any) => ({
        id: i.id,
        arabicPrimary: i.arabicPrimary,
        english: i.english,
        // Ensure audioUrl is fully absolute before sending to external worker
        audioUrl: i.audioUrl?.startsWith("http")
          ? i.audioUrl
          : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${i.audioUrl}`,
      })),
    };

    const workerUrl = process.env.WORKER_URL || "http://localhost:4000";
    const workerSecret = process.env.WORKER_SECRET || "bonjour";

    // Trigger external Node.js background worker asynchronously
    fetch(`${workerUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${workerSecret}`,
      },
      body: JSON.stringify(workerPayload),
    }).catch((err) => {
      console.error("Failed to reach contly-worker webhook:", err);
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
