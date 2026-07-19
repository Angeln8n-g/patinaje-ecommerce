import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool.js";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function isAllowedType(mimetype: string): boolean {
  return mimetype in ALLOWED_TYPES;
}

/**
 * Since database storage is built-in, it is always considered configured.
 */
export function isConfigured(): boolean {
  return true;
}

export async function uploadFile(
  buffer: Buffer,
  mimetype: string,
  folder: string = "uploads"
): Promise<{ url: string; key: string }> {
  if (!isAllowedType(mimetype)) {
    throw new Error(`Tipo de archivo no permitido: ${mimetype}`);
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("El archivo excede el tamaño máximo de 10MB");
  }

  const ext = ALLOWED_TYPES[mimetype];
  const key = `${folder}/${uuidv4()}${ext}`;

  // Store file binary content and metadata in PostgreSQL database
  await pool.query(
    "INSERT INTO uploads (key, mimetype, data, size) VALUES ($1, $2, $3, $4)",
    [key, mimetype, buffer, buffer.length]
  );

  // Generate public serving URL using the BACKEND_URL environment variable
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  const url = `${backendUrl}/api/upload/file/${key}`;

  return { url, key };
}

export async function deleteFile(key: string): Promise<void> {
  await pool.query("DELETE FROM uploads WHERE key = $1", [key]);
}
