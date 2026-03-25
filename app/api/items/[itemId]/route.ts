import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    await prisma.vocabItem.delete({
      where: { id: itemId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();

    const currentItem = await prisma.vocabItem.findUnique({
      where: { id: itemId },
    });

    if (!currentItem) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    const { arabicPrimary, arabicFull, english } = body;

    // Check if relevant text content changed to invalidate the audio cache
    const textChanged =
      (arabicPrimary !== undefined && arabicPrimary !== currentItem.arabicPrimary) ||
      (english !== undefined && english !== currentItem.english);

    const updateData: any = {};
    if (arabicPrimary !== undefined) updateData.arabicPrimary = arabicPrimary;
    if (arabicFull !== undefined) updateData.arabicFull = arabicFull;
    if (english !== undefined) updateData.english = english;

    if (textChanged) {
      updateData.audioStatus = "PENDING";
      updateData.audioUrl = null;
    }

    const updated = await prisma.vocabItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Patch error:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}
