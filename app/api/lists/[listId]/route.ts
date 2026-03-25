import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    
    if (!listId) {
      return NextResponse.json({ error: "Missing list ID" }, { status: 400 });
    }

    const list = await prisma.vocabList.findUnique({
      where: { id: listId },
      include: {
        items: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error("Failed to fetch list:", error);
    return NextResponse.json(
      { error: "Failed to fetch list" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    
    await prisma.vocabItem.deleteMany({
      where: { listId },
    });
    
    await prisma.videoJob.deleteMany({
      where: { listId },
    });

    await prisma.vocabList.delete({
      where: { id: listId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete list:", error);
    return NextResponse.json(
      { error: "Failed to delete list" },
      { status: 500 }
    );
  }
}
