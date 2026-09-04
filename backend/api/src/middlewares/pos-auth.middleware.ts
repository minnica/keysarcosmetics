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
import { resolvePosAuthorizedBranches } from "../services/pos-scope";

export async function posAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ success: false, message: "Token POS requerido", data: null });
    return;
  }

  try {
    const payload = jwt.verify(authorization.slice(7), getPosJwtSecret(), {
      audience: POS_JWT_AUDIENCE,
      issuer: POS_JWT_ISSUER,
    }) as PosJwtPayload;
    if (payload.tokenType !== "pos") throw new Error("Tipo de token inválido");

    const [credential, terminal, session] = await Promise.all([
      findCredentialForSession(payload.credentialId),
      prisma.posTerminal.findUnique({
        where: { id: payload.terminalId },
        select: {
          status: true,
          branchId: true,
          branch: { select: { activa: true } },
        },
      }),
      payload.sessionId
        ? prisma.posSession.findUnique({
            where: { id: payload.sessionId },
            select: {
              credentialId: true,
              terminalId: true,
              branchId: true,
              expiresAt: true,
              revokedAt: true,
            },
          })
        : null,
    ]);
    if (
      !credential?.active ||
      credential.version !== payload.credentialVersion ||
      terminal?.status !== "ACTIVE" ||
      !terminal.branch.activa ||
      terminal.branchId !== payload.branchId ||
      !session ||
      session.credentialId !== payload.credentialId ||
      session.terminalId !== payload.terminalId ||
      session.branchId !== payload.branchId ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date()
    ) {
      res
        .status(401)
        .json({ success: false, message: "Sesión POS inválida", data: null });
      return;
    }

    const identity = credentialIdentity(credential);
    if (!identity.identityActive) {
      res
        .status(401)
        .json({ success: false, message: "Sesión POS inválida", data: null });
      return;
    }
    const [permissions, branchScope] = await Promise.all([
      resolvePosPermissions(identity.positionId, identity.isMaster),
      resolvePosAuthorizedBranches({
        credentialId: credential.id,
        positionId: identity.positionId,
        isMaster: identity.isMaster,
        sessionBranchId: payload.branchId,
      }),
    ]);
    req.posUser = {
      ...payload,
      ...identity,
      permissions,
      authorizedBranchIds: branchScope.branchIds,
      authorizedHistoricalBranchIds: branchScope.historicalBranchIds,
      branchScope: branchScope.mode,
    };
    next();
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError
        ? "La sesión POS expiró"
        : "Token POS inválido";
    res.status(401).json({ success: false, message, data: null });
  }
}

export function requirePosPermission(permission: PosPermissionKey) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.posUser) {
      res
        .status(401)
        .json({ success: false, message: "Sesión POS requerida", data: null });
      return;
    }
    if (
      !req.posUser.isMaster &&
      !req.posUser.permissions.includes(permission)
    ) {
      res
        .status(403)
        .json({
          success: false,
          message: "Permiso POS insuficiente",
          data: null,
        });
      return;
    }
    next();
  };
}

export function requireAnyPosPermission(...permissions: PosPermissionKey[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.posUser) {
      res
        .status(401)
        .json({ success: false, message: "Sesión POS requerida", data: null });
      return;
    }
    if (
      !req.posUser.isMaster &&
      !permissions.some((permission) =>
        req.posUser!.permissions.includes(permission),
      )
    ) {
      res
        .status(403)
        .json({
          success: false,
          message: "Permiso POS insuficiente",
          data: null,
        });
      return;
    }
    next();
  };
}
