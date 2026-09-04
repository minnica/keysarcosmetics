import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import path from "node:path";

const POS_ASSET_BUCKET = process.env["POS_ASSET_BUCKET"] ?? "pos-assets";
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const POS_MAX_ASSET_BYTES = 5 * 1024 * 1024;

function storageClient() {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceRoleKey) throw new Error("El almacenamiento POS no está configurado");
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function validateCatalogImage(file: Express.Multer.File): void {
  if (!allowedMimeTypes.has(file.mimetype)) throw new Error("Formato de imagen no permitido");
  if (file.size <= 0 || file.size > POS_MAX_ASSET_BYTES) throw new Error("La imagen debe pesar entre 1 byte y 5 MB");
}

export async function uploadCatalogImage(itemId: string, file: Express.Multer.File) {
  validateCatalogImage(file);
  const extension = path.extname(file.originalname).toLocaleLowerCase("en-US") || ".img";
  const storagePath = `catalog/${itemId}/${crypto.randomUUID()}${extension}`;
  const client = storageClient();
  const { error } = await client.storage.from(POS_ASSET_BUCKET).upload(storagePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) throw new Error(`No se pudo guardar la imagen: ${error.message}`);
  const { data } = client.storage.from(POS_ASSET_BUCKET).getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl, bucket: POS_ASSET_BUCKET };
}

export async function removeCatalogImage(storagePath: string): Promise<void> {
  const client = storageClient();
  const { error } = await client.storage.from(POS_ASSET_BUCKET).remove([storagePath]);
  if (error) throw new Error(`No se pudo eliminar la imagen: ${error.message}`);
}
