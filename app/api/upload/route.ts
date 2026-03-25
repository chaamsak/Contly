import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseExcel } from "@/lib/excel";
import type { UploadResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const result = parseExcel(buffer);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "No valid Arabic vocabulary rows found in the file." },
        { status: 400 }
      );
    }

    // Create the vocab list with items
    const list = await prisma.vocabList.create({
      data: {
        name: file.name.replace(/\.(xlsx|xls|csv)$/i, ""),
        originalFile: file.name,
        totalRows: result.totalRows,
        skippedRows: result.skippedRows,
        dupeRows: result.dupeRows,
        items: {
          create: result.rows.map((row, index) => ({
            arabicPrimary: row.arabicPrimary,
            arabicFull: row.arabicFull,
            english: row.english,
            position: index,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    const response: UploadResponse = {
      listId: list.id,
      name: list.name,
      totalRows: list.totalRows,
      skippedRows: list.skippedRows,
      dupeRows: list.dupeRows,
      itemCount: list.items.length,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process file. Please try again." },
      { status: 500 }
    );
  }
}
