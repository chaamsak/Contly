import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { VideoJobResponse } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const job = await prisma.videoJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const response: VideoJobResponse = {
      id: job.id,
      listId: job.listId,
      status: job.status,
      videoUrl: job.videoUrl,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Video job status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
