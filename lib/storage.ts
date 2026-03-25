import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

export interface StorageService {
  save(fileName: string, data: Buffer): Promise<string>;
  saveVideo(fileName: string, data: Buffer): Promise<string>;
}

class LocalStorage implements StorageService {
  private dir: string;

  constructor() {
    this.dir = path.join(process.cwd(), "public", "audio");
  }

  async save(fileName: string, data: Buffer): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const filePath = path.join(this.dir, fileName);
    await writeFile(filePath, data);
    return `/audio/${fileName}`;
  }

  async saveVideo(fileName: string, data: Buffer): Promise<string> {
    const videoDir = path.join(process.cwd(), "public", "videos");
    await mkdir(videoDir, { recursive: true });
    const filePath = path.join(videoDir, fileName);
    await writeFile(filePath, data);
    return `/videos/${fileName}`;
  }
}

class VercelBlobStorage implements StorageService {
  async save(fileName: string, data: Buffer): Promise<string> {
    const blob = await put(`audio/${fileName}`, data, {
      access: "public",
      contentType: "audio/mpeg",
    });
    return blob.url;
  }

  async saveVideo(fileName: string, data: Buffer): Promise<string> {
    const blob = await put(`videos/${fileName}`, data, {
      access: "public",
      contentType: "video/mp4",
    });
    return blob.url;
  }
}

export function getStorage(): StorageService {
  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "vercel-blob") {
    return new VercelBlobStorage();
  }

  return new LocalStorage();
}
