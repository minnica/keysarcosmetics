import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);
export const MAX_PAYROLL_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function storageConfig() {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const bucket = process.env["PAYROLL_STORAGE_BUCKET"] ?? "payroll-attachments";
  if (!url || !serviceRoleKey) return null;
  return {
    bucket,
    client: createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

export function isPayrollStorageConfigured(): boolean {
  return storageConfig() != null;
}

export function validatePayrollAttachment(file: Express.Multer.File): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error("El comprobante debe ser JPG, PNG o PDF.");
  }
  if (file.size > MAX_PAYROLL_ATTACHMENT_BYTES) {
    throw new Error("El comprobante no puede superar 10 MB.");
  }
}

export async function uploadPayrollAttachment(
  movementId: string,
  file: Express.Multer.File,
) {
  validatePayrollAttachment(file);
  const config = storageConfig();
  if (!config)
    throw new Error("Supabase Storage no está configurado para Payroll.");
  const extension =
    file.mimetype === "application/pdf"
      ? "pdf"
      : file.mimetype === "image/png"
        ? "png"
        : "jpg";
  const path = `movements/${movementId}/${randomUUID()}.${extension}`;
  const { error } = await config.client.storage
    .from(config.bucket)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (error)
    throw new Error(`No se pudo guardar el comprobante: ${error.message}`);
  return { path, bucket: config.bucket };
}

export async function removePayrollAttachment(
  storagePath: string,
): Promise<void> {
  const config = storageConfig();
  if (!config)
    throw new Error("Supabase Storage no está configurado para Payroll.");
  const { error } = await config.client.storage
    .from(config.bucket)
    .remove([storagePath]);
  if (error)
    throw new Error(`No se pudo borrar el comprobante: ${error.message}`);
}

export async function getPayrollAttachmentUrl(
  storagePath: string,
): Promise<string> {
  const config = storageConfig();
  if (!config)
    throw new Error("Supabase Storage no está configurado para Payroll.");
  const { data, error } = await config.client.storage
    .from(config.bucket)
    .createSignedUrl(storagePath, 300);
  if (error)
    throw new Error(`No se pudo abrir el comprobante: ${error.message}`);
  return data.signedUrl;
}
