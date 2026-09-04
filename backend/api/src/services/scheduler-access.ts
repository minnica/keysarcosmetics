import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { Prisma, type Rol } from "@prisma/client";
import {
  SCHEDULER_SCREEN_KEYS,
  type SchedulerAuthorizationPurpose,
  type SchedulerBootstrapDto,
  type SchedulerCapability,
  type SchedulerPermissionDto,
  type SchedulerScreenKey,
} from "@cosmetics/types";
import { prisma } from "../prisma/client";

const screenKeySet = new Set<string>(SCHEDULER_SCREEN_KEYS);
const authorizationTtlMs = 2 * 60 * 1000;
const lockDurationMs = 15 * 60 * 1000;
const maxFailedAttempts = 5;

export interface ResolvedSchedulerAccess {
  userId: string;
  name: string;
  email: string;
  role: Rol;
  employeeId: string | null;
  positionId: string | null;
  positionName: string | null;
  canManageAccess: boolean;
  selfProfessionalOnly: boolean;
  professionalEmployeeId: string | null;
  permissions: SchedulerPermissionDto[];
  authorizedBranches: Array<{ id: string; name: string; active: boolean }>;
  branchScope: SchedulerBootstrapDto["branchScope"];
  secondaryAuthorizationConfigured: boolean;
}

interface AuthorizationRequirement {
  screenKey: SchedulerScreenKey;
  capability: SchedulerCapability;
  branchRequired?: boolean;
}

export const schedulerAuthorizationRequirements: Record<
  SchedulerAuthorizationPurpose,
  AuthorizationRequirement
> = {
  CLIENT_RECORD_VIEW: {
    screenKey: "scheduler/clients",
    capability: "READ",
  },
  CLIENT_VISIT_HISTORY_VIEW: {
    screenKey: "scheduler/clients",
    capability: "READ",
  },
  CLIENT_FINANCIAL_HISTORY_VIEW: {
    screenKey: "scheduler/clients",
    capability: "READ",
  },
  CLIENT_MERGE: {
    screenKey: "scheduler/clients",
    capability: "ADMIN",
  },
  STATUS_COLORS_CHANGE: {
    screenKey: "scheduler/administration/status-colors",
    capability: "ADMIN",
  },
  AVAILABILITY_OVERRIDE: {
    screenKey: "scheduler/agenda",
    capability: "EXCEPTION",
    branchRequired: true,
  },
  SENSITIVE_EXPORT: {
    screenKey: "scheduler/clients",
    capability: "EXPORT",
  },
  MEDICAL_RECORD_VIEW: {
    screenKey: "scheduler/settings/records",
    capability: "READ",
  },
  MEDICAL_RECORD_EDIT: {
    screenKey: "scheduler/settings/records",
    capability: "WRITE",
  },
  PRIVATE_DOCUMENT_DOWNLOAD: {
    screenKey: "scheduler/administration/consents",
    capability: "READ",
  },
  MEDICAL_DOCUMENT_DOWNLOAD: {
    screenKey: "scheduler/settings/records",
    capability: "READ",
  },
};

function permissionCapabilities(permission: {
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
  canExport: boolean;
  canOverride: boolean;
}): SchedulerCapability[] {
  const capabilities: SchedulerCapability[] = [];
  if (permission.canRead) capabilities.push("READ");
  if (permission.canWrite) capabilities.push("WRITE");
  if (permission.canAdmin) capabilities.push("ADMIN");
  if (permission.canExport) capabilities.push("EXPORT");
  if (permission.canOverride) capabilities.push("EXCEPTION");
  return capabilities;
}

export function isSchedulerMockModeEnabled(): boolean {
  return (
    process.env["NODE_ENV"] === "development" &&
    process.env["SCHEDULER_ALLOW_MOCKS"] === "true"
  );
}

export async function resolveSchedulerAccess(
  userId: string,
): Promise<ResolvedSchedulerAccess | null> {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      sucursalId: true,
      empleadoId: true,
      schedulerSecondaryCredential: {
        select: { active: true },
      },
      empleado: {
        select: {
          id: true,
          activo: true,
          sucursalId: true,
          positionId: true,
          position: {
            select: {
              id: true,
              nombre: true,
              activo: true,
              canManageSchedulerAccess: true,
              schedulerSelfProfessionalOnly: true,
              schedulerScreenPermissions: {
                orderBy: { screenKey: "asc" },
              },
              schedulerBranchAssignments: {
                select: {
                  branch: {
                    select: { id: true, nombre: true, activa: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user?.activo || (user.empleado && !user.empleado.activo)) return null;

  const isGlobalAdmin = user.rol === "SUPER_ADMIN";
  const position = user.empleado?.position ?? null;
  const validPosition = position?.activo ? position : null;
  const canManageAccess = Boolean(
    isGlobalAdmin || validPosition?.canManageSchedulerAccess,
  );

  const permissions: SchedulerPermissionDto[] = isGlobalAdmin
    ? SCHEDULER_SCREEN_KEYS.map((screenKey) => ({
        screenKey,
        capabilities: ["READ", "WRITE", "ADMIN", "EXPORT", "EXCEPTION"],
      }))
    : (validPosition?.schedulerScreenPermissions ?? [])
        .filter((permission) => screenKeySet.has(permission.screenKey))
        .map((permission) => ({
          screenKey: permission.screenKey as SchedulerScreenKey,
          capabilities: permissionCapabilities(permission),
        }))
        .filter((permission) => permission.capabilities.length > 0);

  let authorizedBranches: ResolvedSchedulerAccess["authorizedBranches"] = [];
  let branchScope: ResolvedSchedulerAccess["branchScope"] = "NONE";

  if (isGlobalAdmin) {
    authorizedBranches = (
      await prisma.sucursal.findMany({
        where: { activa: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, activa: true },
      })
    ).map((branch) => ({
      id: branch.id,
      name: branch.nombre,
      active: branch.activa,
    }));
    branchScope = "ALL_ACTIVE";
  } else if (validPosition?.schedulerBranchAssignments.length) {
    authorizedBranches = validPosition.schedulerBranchAssignments
      .map(({ branch }) => ({
        id: branch.id,
        name: branch.nombre,
        active: branch.activa,
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "es"));
    branchScope = "ASSIGNED";
  } else {
    const ownBranchId = user.sucursalId ?? user.empleado?.sucursalId ?? null;
    if (ownBranchId) {
      const branch = await prisma.sucursal.findUnique({
        where: { id: ownBranchId },
        select: { id: true, nombre: true, activa: true },
      });
      if (branch) {
        authorizedBranches = [
          { id: branch.id, name: branch.nombre, active: branch.activa },
        ];
        branchScope = "OWN_BRANCH";
      }
    }
  }

  return {
    userId: user.id,
    name: user.nombre,
    email: user.email,
    role: user.rol,
    employeeId: user.empleado?.id ?? user.empleadoId,
    positionId: validPosition?.id ?? null,
    positionName: validPosition?.nombre ?? null,
    canManageAccess,
    selfProfessionalOnly: Boolean(
      !isGlobalAdmin && validPosition?.schedulerSelfProfessionalOnly,
    ),
    professionalEmployeeId: user.empleado?.id ?? null,
    permissions,
    authorizedBranches,
    branchScope,
    secondaryAuthorizationConfigured: Boolean(
      user.schedulerSecondaryCredential?.active,
    ),
  };
}

export function hasSchedulerCapability(
  access: ResolvedSchedulerAccess,
  screenKey: SchedulerScreenKey,
  capability: SchedulerCapability,
): boolean {
  return access.permissions.some(
    (permission) =>
      permission.screenKey === screenKey &&
      permission.capabilities.includes(capability),
  );
}

export function hasSchedulerBranchAccess(
  access: ResolvedSchedulerAccess,
  branchId: string,
): boolean {
  return access.authorizedBranches.some((branch) => branch.id === branchId);
}

export async function resolveSchedulerAccessForRequest(
  req: Request,
): Promise<ResolvedSchedulerAccess | null> {
  if (!req.user) return null;
  return resolveSchedulerAccess(req.user.id);
}

export function requireSchedulerCapability(
  screenKey: SchedulerScreenKey,
  capability: SchedulerCapability,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const access = await resolveSchedulerAccessForRequest(req);
    if (!access) {
      res
        .status(401)
        .json({ success: false, message: "No autenticado", data: null });
      return;
    }
    if (!hasSchedulerCapability(access, screenKey, capability)) {
      res.status(403).json({
        success: false,
        message: "No tienes la capacidad requerida en Scheduler",
        data: null,
      });
      return;
    }
    req.schedulerAccess = access;
    next();
  };
}

export async function requireSchedulerAccessManager(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const access = await resolveSchedulerAccessForRequest(req);
  if (!access) {
    res
      .status(401)
      .json({ success: false, message: "No autenticado", data: null });
    return;
  }
  if (!access.canManageAccess) {
    res.status(403).json({
      success: false,
      message: "No tienes permisos para administrar accesos de Scheduler",
      data: null,
    });
    return;
  }
  req.schedulerAccess = access;
  next();
}

export function toSchedulerBootstrap(
  access: ResolvedSchedulerAccess,
): SchedulerBootstrapDto {
  return {
    user: {
      id: access.userId,
      name: access.name,
      email: access.email,
      role: access.role,
      employeeId: access.employeeId,
      positionId: access.positionId,
      positionName: access.positionName,
    },
    canManageAccess: access.canManageAccess,
    selfProfessionalOnly: access.selfProfessionalOnly,
    professionalEmployeeId: access.professionalEmployeeId,
    permissions: access.permissions,
    authorizedBranches: access.authorizedBranches,
    authorizedBranchIds: access.authorizedBranches.map((branch) => branch.id),
    branchScope: access.branchScope,
    secondaryAuthorizationConfigured: access.secondaryAuthorizationConfigured,
    mockModeEnabled: isSchedulerMockModeEnabled(),
  };
}

export function schedulerAuthorizationTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function schedulerRequestAuditContext(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0]?.trim() || req.ip || null;
  return {
    ipAddress: ipAddress?.slice(0, 64) ?? null,
    userAgent: req.get("user-agent")?.slice(0, 512) ?? null,
  };
}

export async function writeSchedulerAudit(input: {
  req: Request;
  action: string;
  outcome: "SUCCESS" | "DENIED" | "FAILED";
  actorUserId: string;
  branchId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  const requestContext = schedulerRequestAuditContext(input.req);
  await prisma.auditLog.create({
    data: {
      application: "SCHEDULER",
      action: input.action,
      outcome: input.outcome,
      actorUserId: input.actorUserId,
      branchId: input.branchId ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata,
      ...requestContext,
    },
  });
}

export async function verifySchedulerSecondarySecret(input: {
  userId: string;
  secret: string;
}): Promise<boolean> {
  const credential = await prisma.schedulerSecondaryCredential.findUnique({
    where: { userId: input.userId },
  });
  if (!credential?.active) return false;

  const now = new Date();
  if (credential.lockedUntil && credential.lockedUntil > now) return false;

  const valid = await bcrypt.compare(input.secret, credential.secretHash);
  if (!valid) {
    const failedAttempts = credential.failedAttempts + 1;
    await prisma.schedulerSecondaryCredential.update({
      where: { id: credential.id },
      data: {
        failedAttempts,
        lockedUntil:
          failedAttempts >= maxFailedAttempts
            ? new Date(now.getTime() + lockDurationMs)
            : null,
      },
    });
    return false;
  }

  await prisma.schedulerSecondaryCredential.update({
    where: { id: credential.id },
    data: { failedAttempts: 0, lockedUntil: null, lastUsedAt: now },
  });
  return true;
}

export async function issueSchedulerAuthorization(input: {
  access: ResolvedSchedulerAccess;
  secret: string;
  purpose: SchedulerAuthorizationPurpose;
  screenKey: SchedulerScreenKey;
  branchId?: string;
  targetType?: string;
  targetId?: string;
}) {
  const requirement = schedulerAuthorizationRequirements[input.purpose];
  if (requirement.screenKey !== input.screenKey) return null;
  if (
    !hasSchedulerCapability(
      input.access,
      requirement.screenKey,
      requirement.capability,
    )
  ) {
    return null;
  }
  if (requirement.branchRequired && !input.branchId) return null;
  if (
    input.branchId &&
    !hasSchedulerBranchAccess(input.access, input.branchId)
  ) {
    return null;
  }
  const secretValid = await verifySchedulerSecondarySecret({
    userId: input.access.userId,
    secret: input.secret,
  });
  if (!secretValid) return null;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + authorizationTtlMs);
  await prisma.schedulerAuthorization.create({
    data: {
      tokenHash: schedulerAuthorizationTokenHash(token),
      purpose: input.purpose,
      screenKey: input.screenKey,
      actorUserId: input.access.userId,
      branchId: input.branchId,
      expiresAt,
      scope: {
        ...(input.targetType ? { targetType: input.targetType } : {}),
        ...(input.targetId ? { targetId: input.targetId } : {}),
      },
    },
  });
  return { token, expiresAt };
}

export async function consumeSchedulerAuthorization(input: {
  token: string;
  purpose: SchedulerAuthorizationPurpose;
  actorUserId: string;
  screenKey: SchedulerScreenKey;
  branchId?: string;
  targetType?: string;
  targetId?: string;
  tx?: Prisma.TransactionClient;
}) {
  const database = input.tx ?? prisma;
  const tokenHash = schedulerAuthorizationTokenHash(input.token);
  const authorization = await database.schedulerAuthorization.findUnique({
    where: { tokenHash },
  });
  if (
    !authorization ||
    authorization.purpose !== input.purpose ||
    authorization.actorUserId !== input.actorUserId ||
    authorization.screenKey !== input.screenKey ||
    authorization.branchId !== (input.branchId ?? null) ||
    authorization.usedAt ||
    authorization.revokedAt ||
    authorization.expiresAt <= new Date()
  ) {
    return null;
  }

  const scope = authorization.scope;
  if (input.targetType || input.targetId) {
    if (
      !scope ||
      Array.isArray(scope) ||
      typeof scope !== "object" ||
      scope["targetType"] !== input.targetType ||
      scope["targetId"] !== input.targetId
    ) {
      return null;
    }
  }

  const usedAt = new Date();
  const consumed = await database.schedulerAuthorization.updateMany({
    where: {
      id: authorization.id,
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: usedAt },
    },
    data: { usedAt },
  });
  return consumed.count === 1 ? { ...authorization, usedAt } : null;
}
