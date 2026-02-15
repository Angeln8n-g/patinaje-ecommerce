import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "skating-store";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ""; // e.g. https://pub-xxx.r2.dev or custom domain

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

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

export function isConfigured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);
}

export async function uploadFile(
  buffer: Buffer,
  mimetype: string,
  folder: string = "uploads"
): Promise<{ url: string; key: string }> {
  if (!isConfigured()) {
    throw new Error("R2 storage is not configured");
  }

  if (!isAllowedType(mimetype)) {
    throw new Error(`Tipo de archivo no permitido: ${mimetype}`);
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("El archivo excede el tamaño máximo de 10MB");
  }

  const ext = ALLOWED_TYPES[mimetype];
  const key = `${folder}/${uuidv4()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  }));

  const url = `${R2_PUBLIC_URL}/${key}`;
  return { url, key };
}

export async function deleteFile(key: string): Promise<void> {
  if (!isConfigured()) return;

  await s3.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));
}
