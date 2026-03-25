import type { AudioStatus, VideoStatus } from "@prisma/client";

/* ── Shared types used across client and server ── */

export type PlayState =
  | "idle"
  | "loading"
  | "playing"
  | "waiting"
  | "error";

/* ── API response shapes ── */

export interface VocabItemResponse {
  id: string;
  listId: string;
  arabicPrimary: string;
  arabicFull: string;
  english: string | null;
  audioUrl: string | null;
  audioStatus: AudioStatus;
  position: number;
}

export interface VocabListResponse {
  id: string;
  name: string;
  originalFile: string | null;
  totalRows: number;
  skippedRows: number;
  dupeRows: number;
  createdAt: string;
  items: VocabItemResponse[];
}

export interface UploadResponse {
  listId: string;
  name: string;
  totalRows: number;
  skippedRows: number;
  dupeRows: number;
  itemCount: number;
}

export interface TtsResponse {
  audioUrl: string;
  audioStatus: AudioStatus;
}

export interface VideoJobResponse {
  id: string;
  listId: string;
  status: VideoStatus;
  videoUrl: string | null;
  error: string | null;
  createdAt: string;
}

/* ── Excel parsing types ── */

export interface ParsedRow {
  arabicPrimary: string;
  arabicFull: string;
  english: string | null;
}

export interface ParseResult {
  rows: ParsedRow[];
  totalRows: number;
  skippedRows: number;
  dupeRows: number;
}
