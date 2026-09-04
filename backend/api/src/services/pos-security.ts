import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

export const POS_MAX_FAILED_ATTEMPTS = 5;
export const POS_LOCK_MINUTES = 15;
export const POS_AUTHORIZATION_MINUTES = 5;
export const POS_DUMMY_BCRYPT_HASH =
  "$2a$12$l3/t.BqgQ/68mqQBcHahsOmUTJCuEoFIcmDz40FAvQXZlgx8ISPhe";

function requiredSecret(name: "POS_PIN_PEPPER" | "POS_JWT_SECRET"): string {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} debe contener por lo menos 32 caracteres`);
  }
  return value;
}

export function getPosJwtSecret(): string {
  return requiredSecret("POS_JWT_SECRET");
}

export function normalizePosAlias(value: string): string {
  return value.trim().toLocaleLowerCase("es-MX");
}

export function normalizeTerminalCode(value: string): string {
  return value.trim().toLocaleUpperCase("en-US");
}

export function fingerprintSecret(value: string, purpose: "pin" | "terminal"): string {
  return createHmac("sha256", requiredSecret("POS_PIN_PEPPER"))
    .update(`${purpose}:${value}`)
    .digest("hex");
}

export function hashOpaqueToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashPosSecret(value: string): Promise<string> {
  return bcrypt.hash(value, 12);
}

export async function verifyPosSecret(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

export function createTerminalSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function createAuthorizationToken(): string {
  return randomUUID();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
