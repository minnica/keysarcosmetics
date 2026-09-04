import jwt, { type SignOptions } from "jsonwebtoken";
import {
  POS_PERMISSION_KEYS,
  type PosPermissionKey,
  type PosSessionDto,
} from "@cosmetics/types";
import { prisma } from "../prisma/client";
import type { PosJwtPayload, PosOfflineGrantPayload } from "../types/pos-jwt";
import { getPosJwtSecret } from "./pos-security";

export const POS_JWT_AUDIENCE = "keysar-pos";
export const POS_JWT_ISSUER = "keysar-api";
export const POS_OFFLINE_AUDIENCE = "keysar-pos-offline";

type CredentialWithIdentity = Awaited<ReturnType<typeof findCredentialForSession>>;

export async function findCredentialForSession(credentialId: string) {
  return prisma.posCredential.findUnique({
    where: { id: credentialId },
    include: {
      employee: {
        select: {
          id: true,
          nombreCompleto: true,
          activo: true,
          positionId: true,
        },
      },
      user: {
        select: {
          id: true,
          nombre: true,
          activo: true,
          empleado: {
            select: {
              id: true,
              nombreCompleto: true,
              activo: true,
              positionId: true,
            },
          },
        },
      },
      masterProfile: { select: { active: true } },
    },
  });
}

export function credentialIdentity(credential: NonNullable<CredentialWithIdentity>) {
  const employee = credential.employee ?? credential.user?.empleado ?? null;
  const displayName =
    employee?.nombreCompleto ?? credential.user?.nombre ?? credential.alias;
  const identityActive = credential.employee
    ? credential.employee.activo
    : Boolean(credential.user?.activo && (!credential.user.empleado || credential.user.empleado.activo));

  return {
    actorId: credential.employeeId ?? credential.userId ?? credential.id,
    employeeId: employee?.id ?? null,
    userId: credential.userId,
    displayName,
    positionId: employee?.positionId ?? null,
    identityActive,
    isMaster: Boolean(credential.masterProfile?.active),
  };
}

export async function resolvePosPermissions(
  positionId: string | null,
  isMaster: boolean,
): Promise<PosPermissionKey[]> {
  if (isMaster) return [...POS_PERMISSION_KEYS];
  if (!positionId) return [];

  const grants = await prisma.positionPosPermission.findMany({
    where: {
      positionId,
      allowed: true,
      permissionNode: { active: true, grantable: true },
    },
    select: { permissionNode: { select: { key: true } } },
  });
  const valid = new Set<string>(POS_PERMISSION_KEYS);
  return grants
    .map((grant) => grant.permissionNode.key)
    .filter((key): key is PosPermissionKey => valid.has(key));
}

export function signPosToken(
  payload: Omit<PosJwtPayload, "tokenType" | "iat" | "exp">,
): { token: string; expiresAt: string } {
  const expiresIn = (process.env["POS_JWT_EXPIRES_IN"] ?? "8h") as SignOptions["expiresIn"];
  const token = jwt.sign(
    { ...payload, tokenType: "pos" },
    getPosJwtSecret(),
    {
      expiresIn,
      audience: POS_JWT_AUDIENCE,
      issuer: POS_JWT_ISSUER,
      subject: payload.credentialId,
    },
  );
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string" || typeof decoded.exp !== "number") {
    throw new Error("No se pudo calcular la vigencia del JWT POS");
  }
  return { token, expiresAt: new Date(decoded.exp * 1000).toISOString() };
}

export function signPosOfflineGrant(
  payload: Omit<PosJwtPayload, "tokenType" | "iat" | "exp">,
): { token: string; expiresAt: string } {
  const expiresIn = (process.env["POS_OFFLINE_GRANT_EXPIRES_IN"] ??
    "72h") as SignOptions["expiresIn"];
  const token = jwt.sign(
    { ...payload, tokenType: "pos-offline" },
    getPosJwtSecret(),
    {
      expiresIn,
      audience: POS_OFFLINE_AUDIENCE,
      issuer: POS_JWT_ISSUER,
      subject: payload.credentialId,
    },
  );
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string" || typeof decoded.exp !== "number") {
    throw new Error("No se pudo calcular la vigencia del grant offline");
  }
  return { token, expiresAt: new Date(decoded.exp * 1000).toISOString() };
}

export function verifyPosOfflineGrant(token: string): PosOfflineGrantPayload {
  const payload = jwt.verify(token, getPosJwtSecret(), {
    audience: POS_OFFLINE_AUDIENCE,
    issuer: POS_JWT_ISSUER,
  }) as PosOfflineGrantPayload;
  if (payload.tokenType !== "pos-offline") {
    throw new Error("Tipo de grant offline inválido");
  }
  return payload;
}

export function toPosSession(
  payload: Omit<PosJwtPayload, "tokenType" | "iat" | "exp">,
  token: string,
  expiresAt: string,
  terminal: {
    id: string;
    code: string;
    branch: { id: string; nombre: string; activa: boolean; posProfile: { code: string } | null };
  },
): PosSessionDto {
  return {
    accessToken: token,
    expiresAt,
    actor: {
      id: payload.actorId,
      employeeId: payload.employeeId,
      userId: payload.userId,
      positionId: payload.positionId,
      displayName: payload.displayName,
      alias: payload.alias,
      isMaster: payload.isMaster,
    },
    terminal: {
      id: terminal.id,
      code: terminal.code,
      branch: {
        id: terminal.branch.id,
        name: terminal.branch.nombre,
        code: terminal.branch.posProfile?.code ?? null,
        active: terminal.branch.activa,
      },
    },
    permissions: payload.permissions,
  };
}
