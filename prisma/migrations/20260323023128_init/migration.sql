-- CreateEnum
CREATE TYPE "AudioStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "VocabList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalFile" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "dupeRows" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "arabicPrimary" TEXT NOT NULL,
    "arabicFull" TEXT NOT NULL,
    "english" TEXT,
    "audioUrl" TEXT,
    "audioStatus" "AudioStatus" NOT NULL DEFAULT 'PENDING',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoJob" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "videoUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabItem_listId_idx" ON "VocabItem"("listId");

-- CreateIndex
CREATE INDEX "VocabItem_listId_position_idx" ON "VocabItem"("listId", "position");

-- CreateIndex
CREATE INDEX "VideoJob_listId_idx" ON "VideoJob"("listId");

-- AddForeignKey
ALTER TABLE "VocabItem" ADD CONSTRAINT "VocabItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "VocabList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoJob" ADD CONSTRAINT "VideoJob_listId_fkey" FOREIGN KEY ("listId") REFERENCES "VocabList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
