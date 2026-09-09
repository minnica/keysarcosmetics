import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export const MAX_SCHEDULER_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const SCHEDULER_SIGNED_URL_TTL_SECONDS = 300;

function storageConfig() {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const bucket =
    process.env["SCHEDULER_PRIVATE_STORAGE_BUCKET"] ?? "scheduler-private";
  if (!url || !serviceRoleKey) return null;
  return {
    bucket,
    client: createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

export function isSchedulerPrivateStorageConfigured(): boolean {
  return storageConfig() != null;
}

export function validateSchedulerDocument(file: Express.Multer.File): void {
  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new Error("El documento debe ser PDF, DOC, DOCX, JPG o PNG");
  }
  if (file.size <= 0 || file.size > MAX_SCHEDULER_DOCUMENT_BYTES) {
    throw new Error("El documento debe pesar como máximo 5 MB");
  }
}

function extensionForMimeType(mimeType: string): string {
  return (
    {
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "image/jpeg": "jpg",
      "image/png": "png",
    }[mimeType] ?? "bin"
  );
}

export async function uploadSchedulerPrivateDocument(input: {
  area: "consents" | "customers" | "signed-consents";
  ownerId: string;
  file: Express.Multer.File;
}) {
  validateSchedulerDocument(input.file);
  const config = storageConfig();
  if (!config)
    throw new Error("El almacenamiento privado de Scheduler no está configurado");
  const storagePath = `${input.area}/${input.ownerId}/${randomUUID()}.${extensionForMimeType(input.file.mimetype)}`;
  const { error } = await config.client.storage
    .from(config.bucket)
    .upload(storagePath, input.file.buffer, {
      contentType: input.file.mimetype,
      upsert: false,
    });
  if (error) throw new Error(`No se pudo guardar el documento: ${error.message}`);
  return {
    storagePath,
    storageBucket: config.bucket,
    sha256: createHash("sha256").update(input.file.buffer).digest("hex"),
  };
}

export async function removeSchedulerPrivateDocument(
  storagePath: string,
): Promise<void> {
  const config = storageConfig();
  if (!config)
    throw new Error("El almacenamiento privado de Scheduler no está configurado");
  const { error } = await config.client.storage
    .from(config.bucket)
    .remove([storagePath]);
  if (error) throw new Error(`No se pudo retirar el documento: ${error.message}`);
}

export async function getSchedulerPrivateDocumentUrl(
  storagePath: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  const config = storageConfig();
  if (!config)
    throw new Error("El almacenamiento privado de Scheduler no está configurado");
  const { data, error } = await config.client.storage
    .from(config.bucket)
    .createSignedUrl(storagePath, SCHEDULER_SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(`No se pudo abrir el documento: ${error.message}`);
  return { url: data.signedUrl, expiresInSeconds: SCHEDULER_SIGNED_URL_TTL_SECONDS };
}
