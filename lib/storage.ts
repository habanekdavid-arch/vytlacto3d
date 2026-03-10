import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function sanitizeFileName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);

  const safeBase = base
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${safeBase || "model"}${ext || ".stl"}`;
}

export async function storeFileLocal(buffer: Buffer, originalName: string) {
  await ensureUploadDir();

  const safeName = sanitizeFileName(originalName);
  const unique = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const fullPath = path.join(UPLOAD_DIR, unique);

  await fs.writeFile(fullPath, buffer);

  return {
    key: unique,
    path: fullPath,
  };
}

export function getLocalFilePath(fileKey: string) {
  const normalized = fileKey.replace(/\\/g, "/");

  if (
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    normalized.startsWith("\\")
  ) {
    throw new Error("Invalid file key");
  }

  return path.join(UPLOAD_DIR, normalized);
}