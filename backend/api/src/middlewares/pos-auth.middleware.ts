import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { PosPermissionKey } from "@cosmetics/types";
import { prisma } from "../prisma/client";
import type { PosJwtPayload } from "../types/pos-jwt";
import {
  POS_JWT_AUDIENCE,
  POS_JWT_ISSUER,
  credentialIdentity,
  findCredentialForSession,
  resolvePosPermissions,
} from "../services/pos-auth";
import { getPosJwtSecret } from "../services/pos-security";

export async function posAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Token POS requerido", data: null });
    return;
  }

  try {
    const payload = jwt.verify(authorization.slice(7), getPosJwtSecret(), {
      audience: POS_JWT_AUDIENCE,
      issuer: POS_JWT_ISSUER,
    }) as PosJwtPayload;
    if (payload.tokenType !== "pos") throw new Error("Tipo de token inválido");

    const [credential, terminal] = await Promise.all([
      findCredentialForSession(payload.credentialId),
      prisma.posTerminal.findUnique({
        where: { id: payload.terminalId },
        select: { status: true, branchId: true, branch: { select: { activa: true } } },
      }),
    ]);
    if (
      !credential?.active ||
      credential.version !== payload.credentialVersion ||
      terminal?.status !== "ACTIVE" ||
      !terminal.branch.activa ||
      terminal.branchId !== payload.branchId
    ) {
      res.status(401).json({ success: false, message: "Sesión POS inválida", data: null });
      return;
    }

    const identity = credentialIdentity(credential);
    if (!identity.identityActive) {
      res.status(401).json({ success: false, message: "Sesión POS inválida", data: null });
      return;
    }
    req.posUser = {
      ...payload,
      ...identity,
      permissions: await resolvePosPermissions(identity.positionId, identity.isMaster),
    };
    next();
  } catch (error) {
    const message = error instanceof jwt.TokenExpiredError ? "La sesión POS expiró" : "Token POS inválido";
    res.status(401).json({ success: false, message, data: null });
  }
}

export function requirePosPermission(permission: PosPermissionKey) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.posUser) {
      res.status(401).json({ success: false, message: "Sesión POS requerida", data: null });
      return;
    }
    if (!req.posUser.isMaster && !req.posUser.permissions.includes(permission)) {
      res.status(403).json({ success: false, message: "Permiso POS insuficiente", data: null });
      return;
    }
    next();
  };
}
