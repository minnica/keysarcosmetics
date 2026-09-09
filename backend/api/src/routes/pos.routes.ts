import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { POS_PERMISSION_KEYS, type PosPermissionKey } from "@cosmetics/types";
import { z } from "zod";
import {
  posAuthorizationVerifyRequestSchema,
  posBranchAssignmentsSchema,
  posCredentialUpsertSchema,
  posEmployeeWriteSchema,
  posLoginRequestSchema,
  posMasterAuthorizationRequestSchema,
  posMasterAccessUpdateSchema,
  posPersonalAuthorizationRequestSchema,
  posRolePermissionsSchema,
  posRoleWriteSchema,
  posSelfCredentialUpdateSchema,
  posTerminalBranchChangeSchema,
  posTerminalRegistrationSchema,
  posTerminalStatusUpdateSchema,
} from "../contracts/pos.contracts";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  posAuthMiddleware,
  requirePosPermission,
} from "../middlewares/pos-auth.middleware";
import { prisma } from "../prisma/client";
import {
  credentialIdentity,
  findCredentialForSession,
  resolvePosPermissions,
  signPosToken,
  toPosSession,
} from "../services/pos-auth";
import {
  POS_AUTHORIZATION_MINUTES,
  POS_DUMMY_BCRYPT_HASH,
  POS_LOCK_MINUTES,
  POS_MAX_FAILED_ATTEMPTS,
  addMinutes,
  createAuthorizationToken,
  createTerminalSecret,
  fingerprintSecret,
  hashOpaqueToken,
  hashPosSecret,
  normalizePosAlias,
  normalizeTerminalCode,
  verifyPosSecret,
} from "../services/pos-security";
import {
  PosScopeError,
  resolvePosAuthorizedBranches,
} from "../services/pos-scope";

const router: ExpressRouter = Router();
const db = prisma;

const provisionCredentialSchema = posCredentialUpsertSchema
  .omit({ authorizationToken: true })
  .extend({
    employeeId: z.string().trim().min(1).optional(),
    userId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (Boolean(value.employeeId) === Boolean(value.userId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indica exactamente employeeId o userId",
        path: ["employeeId"],
      });
    }
  });

const credentialBodySchema = posCredentialUpsertSchema.extend({
  authorizationToken: z.string().uuid(),
});

const branchProfileSchema = z
  .object({
    code: z.string().trim().min(2).max(32),
    address: z.string().trim().max(500).nullable().default(null),
    timezone: z.string().trim().min(3).max(64).default("America/Mexico_City"),
    active: z.boolean().default(true),
  })
  .strict();

function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.rol !== "SUPER_ADMIN") {
    res
      .status(403)
      .json({ success: false, message: "Se requiere SUPER_ADMIN", data: null });
    return;
  }
  next();
}

function requireEmployeeDirectoryAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (
    req.posUser?.isMaster ||
    req.posUser?.permissions.some(
      (permission) =>
        permission === "EMPLOYEES_VIEW" || permission === "SETTINGS_MANAGE",
    )
  ) {
    next();
    return;
  }
  res
    .status(403)
    .json({ success: false, message: "Permiso POS insuficiente", data: null });
}

function requireMasterPosSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.posUser?.isMaster) {
    next();
    return;
  }
  res.status(403).json({
    success: false,
    message: "Se requiere una sesión master vigente",
    data: null,
  });
}

function requestAuditData(req: Request) {
  return {
    ipAddress: req.ip?.slice(0, 64) ?? null,
    userAgent: req.get("user-agent")?.slice(0, 512) ?? null,
  };
}

async function audit(
  req: Request,
  data: {
    action: string;
    outcome: "SUCCESS" | "DENIED" | "FAILURE";
    actorCredentialId?: string | null;
    terminalId?: string | null;
    branchId?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await db.auditLog.create({
    data: {
      action: data.action,
      outcome: data.outcome,
      actorCredentialId: data.actorCredentialId ?? null,
      terminalId: data.terminalId ?? null,
      branchId: data.branchId ?? null,
      targetType: data.targetType ?? null,
      targetId: data.targetId ?? null,
      metadata: data.metadata ?? Prisma.JsonNull,
      ...requestAuditData(req),
    },
  });
}

function publicTerminal(terminal: {
  id: string;
  code: string;
  name: string;
  status: "PENDING" | "ACTIVE" | "REVOKED";
  lastSeenAt: Date | null;
  branch: {
    id: string;
    nombre: string;
    activa: boolean;
    posProfile: { code: string } | null;
  };
}) {
  return {
    id: terminal.id,
    code: terminal.code,
    name: terminal.name,
    status: terminal.status,
    branch: {
      id: terminal.branch.id,
      name: terminal.branch.nombre,
      code: terminal.branch.posProfile?.code ?? null,
      active: terminal.branch.activa,
    },
    lastSeenAt: terminal.lastSeenAt?.toISOString() ?? null,
  };
}

async function registerFailedAttempt(credentialId: string): Promise<void> {
  const updated = await db.posCredential.update({
    where: { id: credentialId },
    data: { failedAttempts: { increment: 1 } },
    select: { failedAttempts: true },
  });
  if (updated.failedAttempts >= POS_MAX_FAILED_ATTEMPTS) {
    await db.posCredential.update({
      where: { id: credentialId },
      data: { lockedUntil: addMinutes(new Date(), POS_LOCK_MINUTES) },
    });
  }
}

async function consumeAuthorization(
  token: string,
  purpose: string,
  terminalId: string,
  sessionId: string,
  target?: { entityType: string; entityId: string },
) {
  const tokenHash = hashOpaqueToken(token);
  return db.$transaction(async (tx) => {
    const authorization = await tx.masterAuthorization.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        purpose: true,
        entityType: true,
        entityId: true,
        terminalId: true,
        expiresAt: true,
        usedAt: true,
        actorCredentialId: true,
        sessionId: true,
      },
    });
    const valid =
      authorization &&
      authorization.purpose === purpose &&
      authorization.terminalId === terminalId &&
      authorization.sessionId === sessionId &&
      authorization.usedAt === null &&
      authorization.expiresAt > new Date() &&
      (!target ||
        (authorization.entityType === target.entityType &&
          authorization.entityId === target.entityId));
    if (!valid) return null;

    const consumed = await tx.masterAuthorization.updateMany({
      where: { id: authorization.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return consumed.count === 1 ? authorization : null;
  });
}

async function consumePersonalAuthorization(
  token: string,
  purpose: string,
  credentialId: string,
  terminalId: string,
  sessionId: string,
) {
  const tokenHash = hashOpaqueToken(token);
  return db.$transaction(async (tx) => {
    const authorization = await tx.posPersonalAuthorization.findUnique({
      where: { tokenHash },
    });
    const valid =
      authorization &&
      authorization.purpose === purpose &&
      authorization.credentialId === credentialId &&
      authorization.terminalId === terminalId &&
      authorization.sessionId === sessionId &&
      authorization.usedAt === null &&
      authorization.revokedAt === null &&
      authorization.expiresAt > new Date();
    if (!valid) return null;
    const consumed = await tx.posPersonalAuthorization.updateMany({
      where: { id: authorization.id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    });
    return consumed.count === 1 ? authorization : null;
  });
}

async function revokeCredentialSessionsAndAuthorizations(
  tx: Prisma.TransactionClient,
  credentialIds: string[],
  reason: string,
  revokedAt = new Date(),
) {
  if (credentialIds.length === 0) return;
  const sessions = await tx.posSession.findMany({
    where: { credentialId: { in: credentialIds }, revokedAt: null },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);
  await tx.posSession.updateMany({
    where: { id: { in: sessionIds }, revokedAt: null },
    data: { revokedAt, revokeReason: reason },
  });
  if (sessionIds.length === 0) return;
  await tx.posPersonalAuthorization.updateMany({
    where: {
      sessionId: { in: sessionIds },
      usedAt: null,
      revokedAt: null,
    },
    data: { revokedAt },
  });
  await tx.masterAuthorization.updateMany({
    where: { sessionId: { in: sessionIds }, usedAt: null },
    data: { usedAt: revokedAt },
  });
}

async function upsertCredential(input: {
  employeeId?: string;
  userId?: string;
  alias: string;
  pin?: string;
  active: boolean;
  offlineEnabled: boolean;
  isMaster: boolean;
}) {
  const ownerWhere = input.employeeId
    ? { employeeId: input.employeeId }
    : { userId: input.userId! };
  const existing = await db.posCredential.findFirst({ where: ownerWhere });
  if (!existing && !input.pin) throw new Error("PIN_REQUIRED");
  if (
    input.pin &&
    (await db.posDelegatedMasterCode.findUnique({
      where: {
        codeFingerprint: fingerprintSecret(input.pin, "delegated-master"),
      },
      select: { id: true },
    }))
  )
    throw new Error("PIN_CONFLICTS_WITH_DELEGATED_MASTER");

  const pinData = input.pin
    ? {
        pinHash: await hashPosSecret(input.pin),
        pinFingerprint: fingerprintSecret(input.pin, "pin"),
      }
    : {};
  const aliasNormalized = normalizePosAlias(input.alias);
  const credential = existing
    ? await db.posCredential.update({
        where: { id: existing.id },
        data: {
          alias: input.alias.trim(),
          aliasNormalized,
          active: input.active,
          offlineEnabled: input.offlineEnabled,
          failedAttempts: 0,
          lockedUntil: null,
          version: { increment: 1 },
          ...pinData,
        },
      })
    : await db.posCredential.create({
        data: {
          ...ownerWhere,
          alias: input.alias.trim(),
          aliasNormalized,
          active: input.active,
          offlineEnabled: input.offlineEnabled,
          pinHash: pinData.pinHash!,
          pinFingerprint: pinData.pinFingerprint!,
        },
      });

  const activeDelegation = input.employeeId
    ? await db.posDelegatedMasterAssignment.findFirst({
        where: { employeeId: input.employeeId, active: true },
        select: { id: true },
      })
    : null;
  const effectiveMaster = input.isMaster || Boolean(activeDelegation);
  await db.posMasterCredential.upsert({
    where: { credentialId: credential.id },
    create: {
      credentialId: credential.id,
      active: effectiveMaster,
      managedByDelegation: !input.isMaster && Boolean(activeDelegation),
    },
    update: {
      active: effectiveMaster,
      managedByDelegation: !input.isMaster && Boolean(activeDelegation),
    },
  });
  return credential;
}

function handleUniqueConflict(error: unknown, res: Response): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    res.status(409).json({
      success: false,
      message: "El alias, PIN, código o secreto ya está registrado",
      data: null,
    });
    return true;
  }
  return false;
}

function handleMissingPin(error: unknown, res: Response): boolean {
  if (error instanceof Error && error.message === "PIN_REQUIRED") {
    res.status(400).json({
      success: false,
      message: "El PIN es obligatorio al crear una credencial POS",
      data: null,
    });
    return true;
  }
  return false;
}

function handleDelegatedCodeConflict(error: unknown, res: Response): boolean {
  if (
    error instanceof Error &&
    error.message === "PIN_CONFLICTS_WITH_DELEGATED_MASTER"
  ) {
    res.status(409).json({
      success: false,
      message: "El código coincide con un acceso master delegado",
      data: null,
    });
    return true;
  }
  return false;
}

// Bootstrap administrativo con la sesión compartida. No crea datos automáticamente.
router.put(
  "/provision/credentials",
  authMiddleware,
  requireSuperAdmin,
  async (req, res) => {
    const parsed = provisionCredentialSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Credencial POS inválida",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    try {
      const owner = parsed.data.employeeId
        ? await db.empleado.findUnique({
            where: { id: parsed.data.employeeId },
            select: { id: true, nombreCompleto: true },
          })
        : await db.usuario.findUnique({
            where: { id: parsed.data.userId! },
            select: { id: true, nombre: true },
          });
      if (!owner) {
        res.status(404).json({
          success: false,
          message: "Propietario de credencial no encontrado",
          data: null,
        });
        return;
      }
      const credential = await upsertCredential(parsed.data);
      await audit(req, {
        action: "POS_CREDENTIAL_PROVISIONED",
        outcome: "SUCCESS",
        targetType: parsed.data.employeeId ? "Empleado" : "Usuario",
        targetId: parsed.data.employeeId ?? parsed.data.userId,
        metadata: {
          provisionedByUserId: req.user!.id,
          isMaster: parsed.data.isMaster,
        },
      });
      res.json({
        success: true,
        message: "Credencial POS guardada",
        data: {
          id: credential.id,
          employeeId: credential.employeeId,
          userId: credential.userId,
          alias: credential.aliasNormalized,
          displayName:
            "nombreCompleto" in owner ? owner.nombreCompleto : owner.nombre,
          active: credential.active,
          offlineEnabled: credential.offlineEnabled,
          isMaster: parsed.data.isMaster,
          lockedUntil: credential.lockedUntil?.toISOString() ?? null,
        },
      });
    } catch (error) {
      if (handleMissingPin(error, res)) return;
      if (handleDelegatedCodeConflict(error, res)) return;
      if (handleUniqueConflict(error, res)) return;
      console.error("[pos.provision.credential]", error);
      res.status(500).json({
        success: false,
        message: "No se pudo guardar la credencial POS",
        data: null,
      });
    }
  },
);

router.post(
  "/terminals",
  authMiddleware,
  requireSuperAdmin,
  async (req, res) => {
    const parsed = posTerminalRegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Terminal inválida",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    try {
      const branch = await db.sucursal.findFirst({
        where: { id: parsed.data.branchId, activa: true },
        select: { id: true },
      });
      if (!branch) {
        res.status(404).json({
          success: false,
          message: "Sucursal activa no encontrada",
          data: null,
        });
        return;
      }
      const terminalSecret = createTerminalSecret();
      const terminal = await db.posTerminal.create({
        data: {
          code: normalizeTerminalCode(parsed.data.code),
          name: parsed.data.name,
          branchId: branch.id,
          status: "PENDING",
          secretHash: await hashPosSecret(terminalSecret),
          secretFingerprint: fingerprintSecret(terminalSecret, "terminal"),
          registeredByUserId: req.user!.id,
        },
        include: {
          branch: { include: { posProfile: { select: { code: true } } } },
        },
      });
      await audit(req, {
        action: "POS_TERMINAL_REGISTERED",
        outcome: "SUCCESS",
        terminalId: terminal.id,
        branchId: terminal.branchId,
        targetType: "PosTerminal",
        targetId: terminal.id,
        metadata: { registeredByUserId: req.user!.id },
      });
      res.status(201).json({
        success: true,
        message:
          "Terminal registrada; conserva el secreto porque no volverá a mostrarse",
        data: { terminal: publicTerminal(terminal), terminalSecret },
      });
    } catch (error) {
      if (handleUniqueConflict(error, res)) return;
      console.error("[pos.terminals.register]", error);
      res.status(500).json({
        success: false,
        message: "No se pudo registrar la terminal",
        data: null,
      });
    }
  },
);

router.patch(
  "/terminals/:id/status",
  authMiddleware,
  requireSuperAdmin,
  async (req, res) => {
    const parsed = posTerminalStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Estado de terminal inválido",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const terminalId = req.params["id"]!;
    try {
      const current = await db.posTerminal.findUnique({
        where: { id: terminalId },
        select: { status: true },
      });
      if (!current) {
        res.status(404).json({
          success: false,
          message: "Terminal no encontrada",
          data: null,
        });
        return;
      }
      const terminal = await db.posTerminal.update({
        where: { id: terminalId },
        data: { status: parsed.data.status },
        include: {
          branch: { include: { posProfile: { select: { code: true } } } },
        },
      });
      const changedAt = new Date();
      await db.$transaction([
        db.posSession.updateMany({
          where: { terminalId, revokedAt: null },
          data: {
            revokedAt: changedAt,
            revokeReason: "TERMINAL_STATUS_CHANGED",
          },
        }),
        db.posPersonalAuthorization.updateMany({
          where: { terminalId, usedAt: null, revokedAt: null },
          data: { revokedAt: changedAt },
        }),
        db.masterAuthorization.updateMany({
          where: { terminalId, usedAt: null },
          data: { usedAt: changedAt },
        }),
      ]);
      await audit(req, {
        action: "POS_TERMINAL_STATUS_CHANGED",
        outcome: "SUCCESS",
        terminalId,
        branchId: terminal.branchId,
        targetType: "PosTerminal",
        targetId: terminalId,
        metadata: {
          previousStatus: current.status,
          nextStatus: terminal.status,
          changedByUserId: req.user!.id,
        },
      });
      res.json({
        success: true,
        message:
          terminal.status === "ACTIVE"
            ? "Terminal activada"
            : "Terminal revocada",
        data: publicTerminal(terminal),
      });
    } catch (error) {
      console.error("[pos.terminals.status]", error);
      res.status(500).json({
        success: false,
        message: "No se pudo cambiar el estado de la terminal",
        data: null,
      });
    }
  },
);

router.put(
  "/provision/branches/:id/profile",
  authMiddleware,
  requireSuperAdmin,
  async (req, res) => {
    const parsed = branchProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Perfil POS de sucursal inválido",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const branchId = req.params["id"]!;
    try {
      const branch = await db.sucursal.findUnique({
        where: { id: branchId },
        select: { id: true, nombre: true, activa: true },
      });
      if (!branch) {
        res.status(404).json({
          success: false,
          message: "Sucursal no encontrada",
          data: null,
        });
        return;
      }
      const profile = await db.$transaction(async (tx) => {
        const saved = await tx.posBranchProfile.upsert({
          where: { branchId },
          create: {
            branchId,
            code: normalizeTerminalCode(parsed.data.code),
            address: parsed.data.address,
            timezone: parsed.data.timezone,
            activo: parsed.data.active,
          },
          update: {
            code: normalizeTerminalCode(parsed.data.code),
            address: parsed.data.address,
            timezone: parsed.data.timezone,
            activo: parsed.data.active,
          },
        });
        await tx.inventoryLocation.upsert({
          where: { branchId },
          create: {
            branchId,
            code: `BR-${normalizeTerminalCode(parsed.data.code)}`.slice(0, 64),
            name: branch.nombre,
            type: "BRANCH",
            active: branch.activa && parsed.data.active,
          },
          update: {
            name: branch.nombre,
            active: branch.activa && parsed.data.active,
          },
        });
        return saved;
      });
      await audit(req, {
        action: "POS_BRANCH_PROFILE_UPDATED",
        outcome: "SUCCESS",
        branchId,
        targetType: "Sucursal",
        targetId: branchId,
        metadata: { updatedByUserId: req.user!.id },
      });
      res.json({
        success: true,
        message: "Perfil POS de sucursal actualizado",
        data: {
          id: profile.id,
          branchId,
          branchName: branch.nombre,
          branchActive: branch.activa,
          code: profile.code,
          address: profile.address,
          timezone: profile.timezone,
          active: profile.activo,
        },
      });
    } catch (error) {
      if (handleUniqueConflict(error, res)) return;
      console.error("[pos.provision.branch-profile]", error);
      res.status(500).json({
        success: false,
        message: "No se pudo guardar el perfil POS de sucursal",
        data: null,
      });
    }
  },
);

router.post(
  "/terminals/:id/rotate-secret",
  authMiddleware,
  requireSuperAdmin,
  async (req, res) => {
    const terminalId = req.params["id"]!;
    try {
      const terminalSecret = createTerminalSecret();
      const terminal = await db.posTerminal.update({
        where: { id: terminalId },
        data: {
          secretHash: await hashPosSecret(terminalSecret),
          secretFingerprint: fingerprintSecret(terminalSecret, "terminal"),
        },
        include: {
          branch: { include: { posProfile: { select: { code: true } } } },
        },
      });
      await audit(req, {
        action: "POS_TERMINAL_SECRET_ROTATED",
        outcome: "SUCCESS",
        terminalId,
        branchId: terminal.branchId,
        targetType: "PosTerminal",
        targetId: terminalId,
        metadata: { rotatedByUserId: req.user!.id },
      });
      res.json({
        success: true,
        message:
          "Secreto rotado; conserva el nuevo valor porque no volverá a mostrarse",
        data: { terminal: publicTerminal(terminal), terminalSecret },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          success: false,
          message: "Terminal no encontrada",
          data: null,
        });
        return;
      }
      if (handleUniqueConflict(error, res)) return;
      console.error("[pos.terminals.rotate-secret]", error);
      res.status(500).json({
        success: false,
        message: "No se pudo rotar el secreto de terminal",
        data: null,
      });
    }
  },
);

router.post("/auth/login", async (req, res) => {
  const parsed = posLoginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Datos de acceso inválidos",
      data: parsed.error.flatten().fieldErrors,
    });
    return;
  }
  const denied = async (
    credentialId?: string,
    terminalId?: string,
    branchId?: string,
  ) => {
    await audit(req, {
      action: "POS_LOGIN",
      outcome: "DENIED",
      actorCredentialId: credentialId,
      terminalId,
      branchId,
    });
    res.status(401).json({
      success: false,
      message: "Credenciales incorrectas o temporalmente bloqueadas",
      data: null,
    });
  };
  try {
    const terminal = await db.posTerminal.findUnique({
      where: { code: normalizeTerminalCode(parsed.data.terminalCode) },
      include: {
        branch: { include: { posProfile: { select: { code: true } } } },
      },
    });
    const terminalSecretMatches = await verifyPosSecret(
      parsed.data.terminalSecret,
      terminal?.secretHash ?? POS_DUMMY_BCRYPT_HASH,
    );
    if (
      !terminal ||
      terminal.status !== "ACTIVE" ||
      !terminal.branch.activa ||
      !terminalSecretMatches
    ) {
      await denied();
      return;
    }

    const credential = await db.posCredential.findUnique({
      where: { aliasNormalized: parsed.data.alias },
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
    const pinMatches = await verifyPosSecret(
      parsed.data.pin,
      credential?.pinHash ?? POS_DUMMY_BCRYPT_HASH,
    );
    if (!credential?.active) {
      await denied(undefined, terminal.id, terminal.branchId);
      return;
    }
    const identity = credentialIdentity(credential);
    if (
      !identity.identityActive ||
      (credential.lockedUntil && credential.lockedUntil > new Date())
    ) {
      await denied(credential.id, terminal.id, terminal.branchId);
      return;
    }
    if (!pinMatches) {
      await registerFailedAttempt(credential.id);
      await denied(credential.id, terminal.id, terminal.branchId);
      return;
    }

    const permissions = await resolvePosPermissions(
      identity.positionId,
      identity.isMaster,
    );
    if (!identity.isMaster && permissions.length === 0) {
      await denied(credential.id, terminal.id, terminal.branchId);
      return;
    }
    await Promise.all([
      db.posCredential.update({
        where: { id: credential.id },
        data: { failedAttempts: 0, lockedUntil: null },
      }),
      db.posTerminal.update({
        where: { id: terminal.id },
        data: { lastSeenAt: new Date() },
      }),
    ]);
    const branchScope = await resolvePosAuthorizedBranches({
      credentialId: credential.id,
      positionId: identity.positionId,
      isMaster: identity.isMaster,
      sessionBranchId: terminal.branchId,
    });
    const sessionId = randomUUID();
    const payload = {
      credentialId: credential.id,
      actorId: identity.actorId,
      employeeId: identity.employeeId,
      userId: identity.userId,
      positionId: identity.positionId,
      displayName: identity.displayName,
      alias: credential.aliasNormalized,
      sessionId,
      terminalId: terminal.id,
      branchId: terminal.branchId,
      credentialVersion: credential.version,
      isMaster: identity.isMaster,
      permissions,
    };
    const signed = signPosToken(payload);
    await db.posSession.create({
      data: {
        id: sessionId,
        credentialId: credential.id,
        terminalId: terminal.id,
        branchId: terminal.branchId,
        expiresAt: new Date(signed.expiresAt),
      },
    });
    await audit(req, {
      action: "POS_LOGIN",
      outcome: "SUCCESS",
      actorCredentialId: credential.id,
      terminalId: terminal.id,
      branchId: terminal.branchId,
    });
    res.json({
      success: true,
      message: "Autenticación POS exitosa",
      data: toPosSession(payload, signed.token, signed.expiresAt, terminal, {
        mode: branchScope.mode,
        branches: branchScope.branches,
      }),
    });
  } catch (error) {
    console.error("[pos.auth.login]", error);
    if (error instanceof PosScopeError) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        data: null,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "No se pudo iniciar la sesión POS",
      data: null,
    });
  }
});

router.get("/auth/me", posAuthMiddleware, async (req, res) => {
  try {
    const [credential, terminal] = await Promise.all([
      findCredentialForSession(req.posUser!.credentialId),
      db.posTerminal.findUnique({
        where: { id: req.posUser!.terminalId },
        include: {
          branch: { include: { posProfile: { select: { code: true } } } },
        },
      }),
    ]);
    if (!credential || !terminal) {
      res
        .status(401)
        .json({ success: false, message: "Sesión POS inválida", data: null });
      return;
    }
    const identity = credentialIdentity(credential);
    const [permissions, branchScope] = await Promise.all([
      resolvePosPermissions(identity.positionId, identity.isMaster),
      resolvePosAuthorizedBranches({
        credentialId: credential.id,
        positionId: identity.positionId,
        isMaster: identity.isMaster,
        sessionBranchId: req.posUser!.branchId,
      }),
    ]);
    const payload = { ...req.posUser!, ...identity, permissions };
    const token = req.headers.authorization!.slice(7);
    const expiresAt = new Date((req.posUser!.exp ?? 0) * 1000).toISOString();
    res.json({
      success: true,
      message: "OK",
      data: toPosSession(payload, token, expiresAt, terminal, {
        mode: branchScope.mode,
        branches: branchScope.branches,
      }),
    });
  } catch (error) {
    console.error("[pos.auth.me]", error);
    res.status(500).json({
      success: false,
      message: "No se pudo consultar la sesión POS",
      data: null,
    });
  }
});

router.post("/authorizations", posAuthMiddleware, async (req, res) => {
  const parsed = posMasterAuthorizationRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Autorización inválida",
      data: parsed.error.flatten().fieldErrors,
    });
    return;
  }
  try {
    let credential = await db.posCredential.findUnique({
      where: parsed.data.alias
        ? { aliasNormalized: parsed.data.alias }
        : { pinFingerprint: fingerprintSecret(parsed.data.pin, "pin") },
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
    let identity = credential ? credentialIdentity(credential) : null;
    let locked = Boolean(
      credential?.lockedUntil && credential.lockedUntil > new Date(),
    );
    let pinMatches = !locked
      ? await verifyPosSecret(
          parsed.data.pin,
          credential?.pinHash ?? POS_DUMMY_BCRYPT_HASH,
        )
      : false;

    // Si el formulario no muestra alias, el código delegado sólo puede resolver
    // al empleado de la sesión. Cuando el visual sí incluye alias (Close Day),
    // éste selecciona la asignación nominal y conserva la atribución individual.
    const delegatedEmployeeId = parsed.data.alias
      ? identity?.employeeId
      : req.posUser!.employeeId;
    if (
      (!credential?.masterProfile?.active || !pinMatches) &&
      delegatedEmployeeId
    ) {
      const delegated = await db.posDelegatedMasterCode.findUnique({
        where: {
          codeFingerprint: fingerprintSecret(
            parsed.data.pin,
            "delegated-master",
          ),
        },
        include: {
          assignments: {
            where: {
              employeeId: delegatedEmployeeId,
              active: true,
              revokedAt: null,
            },
            take: 1,
          },
        },
      });
      const delegatedMatches =
        delegated?.active && delegated.assignments.length === 1
          ? await verifyPosSecret(parsed.data.pin, delegated.codeHash)
          : false;
      if (delegatedMatches) {
        if (!parsed.data.alias)
          credential = await db.posCredential.findUnique({
            where: { id: req.posUser!.credentialId },
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
        identity = credential ? credentialIdentity(credential) : null;
        locked = Boolean(
          credential?.lockedUntil && credential.lockedUntil > new Date(),
        );
        pinMatches = true;
      }
    }
    if (
      !credential?.active ||
      !identity?.identityActive ||
      !credential.masterProfile?.active ||
      locked ||
      !pinMatches
    ) {
      if (credential?.active && !locked && !pinMatches) {
        await registerFailedAttempt(credential.id);
      }
      await audit(req, {
        action: "POS_MASTER_AUTHORIZATION",
        outcome: "DENIED",
        actorCredentialId: credential?.id,
        terminalId: req.posUser!.terminalId,
        branchId: req.posUser!.branchId,
        targetType: parsed.data.entityType,
        targetId: parsed.data.entityId,
      });
      res.status(403).json({
        success: false,
        message: "Credencial master inválida",
        data: null,
      });
      return;
    }
    await db.posCredential.update({
      where: { id: credential.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    const authorizationToken = createAuthorizationToken();
    const expiresAt = addMinutes(new Date(), POS_AUTHORIZATION_MINUTES);
    await db.masterAuthorization.create({
      data: {
        tokenHash: hashOpaqueToken(authorizationToken),
        purpose: parsed.data.purpose,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        scope: parsed.data.scope as Prisma.InputJsonValue | undefined,
        actorCredentialId: credential.id,
        terminalId: req.posUser!.terminalId,
        sessionId: req.posUser!.sessionId,
        expiresAt,
      },
    });
    await audit(req, {
      action: "POS_MASTER_AUTHORIZATION",
      outcome: "SUCCESS",
      actorCredentialId: credential.id,
      terminalId: req.posUser!.terminalId,
      branchId: req.posUser!.branchId,
      targetType: parsed.data.entityType,
      targetId: parsed.data.entityId,
      metadata: { purpose: parsed.data.purpose },
    });
    res.status(201).json({
      success: true,
      message: "Autorización master emitida",
      data: {
        authorizationToken,
        purpose: parsed.data.purpose,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[pos.authorizations.create]", error);
    res.status(500).json({
      success: false,
      message: "No se pudo emitir la autorización",
      data: null,
    });
  }
});

router.post("/auth/verify", posAuthMiddleware, async (req, res) => {
  const parsed = posAuthorizationVerifyRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Autorización inválida",
      data: parsed.error.flatten().fieldErrors,
    });
    return;
  }
  const authorization = await consumeAuthorization(
    parsed.data.authorizationToken,
    parsed.data.purpose,
    req.posUser!.terminalId,
    req.posUser!.sessionId,
  );
  if (!authorization) {
    res.status(403).json({
      success: false,
      message: "Autorización vencida, usada o inválida",
      data: null,
    });
    return;
  }
  await audit(req, {
    action: "POS_MASTER_AUTHORIZATION_CONSUMED",
    outcome: "SUCCESS",
    actorCredentialId: authorization.actorCredentialId,
    terminalId: req.posUser!.terminalId,
    branchId: req.posUser!.branchId,
    metadata: { purpose: parsed.data.purpose },
  });
  res.json({
    success: true,
    message: "Autorización válida",
    data: { verified: true },
  });
});

router.post("/personal-authorizations", posAuthMiddleware, async (req, res) => {
  const parsed = posPersonalAuthorizationRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Autorización personal inválida",
      data: parsed.error.flatten().fieldErrors,
    });
    return;
  }
  const credential = await findCredentialForSession(req.posUser!.credentialId);
  const locked = Boolean(
    credential?.lockedUntil && credential.lockedUntil > new Date(),
  );
  const matches = !locked
    ? await verifyPosSecret(
        parsed.data.pin,
        credential?.pinHash ?? POS_DUMMY_BCRYPT_HASH,
      )
    : false;
  if (
    !credential?.active ||
    !credentialIdentity(credential).identityActive ||
    !matches
  ) {
    if (credential?.active && !locked && !matches)
      await registerFailedAttempt(credential.id);
    await audit(req, {
      action: "POS_PERSONAL_AUTHORIZATION",
      outcome: "DENIED",
      actorCredentialId: credential?.id,
      terminalId: req.posUser!.terminalId,
      branchId: req.posUser!.branchId,
      metadata: { purpose: parsed.data.purpose },
    });
    res.status(403).json({
      success: false,
      message: "El código personal no corresponde a la sesión",
      data: null,
    });
    return;
  }
  await db.posCredential.update({
    where: { id: credential.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });
  const authorizationToken = createAuthorizationToken();
  const expiresAt = addMinutes(new Date(), 2);
  await db.posPersonalAuthorization.create({
    data: {
      tokenHash: hashOpaqueToken(authorizationToken),
      purpose: parsed.data.purpose,
      scope: parsed.data.scope as Prisma.InputJsonValue | undefined,
      credentialId: credential.id,
      terminalId: req.posUser!.terminalId,
      sessionId: req.posUser!.sessionId,
      expiresAt,
    },
  });
  await audit(req, {
    action: "POS_PERSONAL_AUTHORIZATION",
    outcome: "SUCCESS",
    actorCredentialId: credential.id,
    terminalId: req.posUser!.terminalId,
    branchId: req.posUser!.branchId,
    metadata: { purpose: parsed.data.purpose },
  });
  res.status(201).json({
    success: true,
    message: "Autorización personal emitida",
    data: {
      authorizationToken,
      purpose: parsed.data.purpose,
      expiresAt: expiresAt.toISOString(),
    },
  });
});

router.post(
  "/personal-authorizations/verify",
  posAuthMiddleware,
  async (req, res) => {
    const parsed = posAuthorizationVerifyRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Autorización personal inválida",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const authorization = await consumePersonalAuthorization(
      parsed.data.authorizationToken,
      parsed.data.purpose,
      req.posUser!.credentialId,
      req.posUser!.terminalId,
      req.posUser!.sessionId,
    );
    if (!authorization) {
      res.status(403).json({
        success: false,
        message: "Autorización personal vencida, usada o inválida",
        data: null,
      });
      return;
    }
    res.json({
      success: true,
      message: "Autorización personal válida",
      data: { verified: true },
    });
  },
);

router.post(
  "/session/exit",
  posAuthMiddleware,
  requirePosPermission("SESSION_EXIT"),
  async (req, res) => {
    const now = new Date();
    await db.$transaction(async (tx) => {
      const revoked = await tx.posSession.updateMany({
        where: {
          id: req.posUser!.sessionId,
          credentialId: req.posUser!.credentialId,
          revokedAt: null,
        },
        data: { revokedAt: now, revokeReason: "EXIT_WITHOUT_CLOSE_DAY" },
      });
      if (revoked.count !== 1) return;
      await Promise.all([
        tx.posPersonalAuthorization.updateMany({
          where: {
            sessionId: req.posUser!.sessionId,
            usedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: now },
        }),
        tx.masterAuthorization.updateMany({
          where: { sessionId: req.posUser!.sessionId, usedAt: null },
          data: { usedAt: now },
        }),
        tx.auditLog.create({
          data: {
            action: "POS_SESSION_EXIT_WITHOUT_CLOSE_DAY",
            outcome: "SUCCESS",
            actorCredentialId: req.posUser!.credentialId,
            terminalId: req.posUser!.terminalId,
            branchId: req.posUser!.branchId,
            targetType: "PosSession",
            targetId: req.posUser!.sessionId,
            metadata: { businessDayChanged: false, attendanceChanged: false },
            ...requestAuditData(req),
          },
        }),
      ]);
    });
    res.json({
      success: true,
      message: "Sesión cerrada sin modificar jornada ni asistencia",
      data: { revokedAt: now.toISOString() },
    });
  },
);

router.get("/branches", posAuthMiddleware, async (req, res) => {
  const branches = await db.sucursal.findMany({
    where: { id: { in: req.posUser!.authorizedBranchIds }, activa: true },
    orderBy: { nombre: "asc" },
    include: { posProfile: { select: { code: true } } },
  });
  res.json({
    success: true,
    message: "OK",
    data: branches.map((branch) => ({
      id: branch.id,
      name: branch.nombre,
      code: branch.posProfile?.code ?? null,
      active: branch.activa,
    })),
  });
});

router.get(
  "/terminals",
  posAuthMiddleware,
  requirePosPermission("TERMINALS_MANAGE"),
  async (_req, res) => {
    const terminals = await db.posTerminal.findMany({
      orderBy: { code: "asc" },
      include: {
        branch: { include: { posProfile: { select: { code: true } } } },
      },
    });
    res.json({
      success: true,
      message: "OK",
      data: terminals.map(publicTerminal),
    });
  },
);

router.post(
  "/terminals/:id/branch",
  posAuthMiddleware,
  requirePosPermission("TERMINALS_MANAGE"),
  async (req, res) => {
    const parsed = posTerminalBranchChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Cambio de sucursal inválido",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const terminalId = req.params["id"]!;
    const authorization = await consumeAuthorization(
      parsed.data.authorizationToken,
      "TERMINAL_BRANCH_CHANGE",
      req.posUser!.terminalId,
      req.posUser!.sessionId,
      { entityType: "PosTerminal", entityId: terminalId },
    );
    if (!authorization) {
      res.status(403).json({
        success: false,
        message: "Autorización master requerida",
        data: null,
      });
      return;
    }
    try {
      const branch = await db.sucursal.findFirst({
        where: { id: parsed.data.branchId, activa: true },
        select: { id: true },
      });
      const current = await db.posTerminal.findUnique({
        where: { id: terminalId },
        select: { branchId: true },
      });
      if (!branch || !current) {
        res.status(404).json({
          success: false,
          message: "Terminal o sucursal activa no encontrada",
          data: null,
        });
        return;
      }
      const terminal = await db.posTerminal.update({
        where: { id: terminalId },
        data: { branchId: branch.id },
        include: {
          branch: { include: { posProfile: { select: { code: true } } } },
        },
      });
      const changedAt = new Date();
      await db.$transaction([
        db.posSession.updateMany({
          where: { terminalId, revokedAt: null },
          data: {
            revokedAt: changedAt,
            revokeReason: "TERMINAL_BRANCH_CHANGED",
          },
        }),
        db.posPersonalAuthorization.updateMany({
          where: { terminalId, usedAt: null, revokedAt: null },
          data: { revokedAt: changedAt },
        }),
        db.masterAuthorization.updateMany({
          where: { terminalId, usedAt: null },
          data: { usedAt: changedAt },
        }),
      ]);
      await audit(req, {
        action: "POS_TERMINAL_BRANCH_CHANGED",
        outcome: "SUCCESS",
        actorCredentialId: authorization.actorCredentialId,
        terminalId,
        branchId: branch.id,
        targetType: "PosTerminal",
        targetId: terminalId,
        metadata: {
          previousBranchId: current.branchId,
          nextBranchId: branch.id,
        },
      });
      res.json({
        success: true,
        message: "Sucursal de terminal actualizada; inicia sesión nuevamente",
        data: publicTerminal(terminal),
      });
    } catch (error) {
      console.error("[pos.terminals.branch]", error);
      res.status(500).json({
        success: false,
        message: "No se pudo cambiar la sucursal",
        data: null,
      });
    }
  },
);

router.get(
  "/access/bootstrap",
  posAuthMiddleware,
  requireEmployeeDirectoryAccess,
  async (_req, res) => {
    const [employees, roles, permissionTree] = await Promise.all([
      db.empleado.findMany({
        orderBy: [{ activo: "desc" }, { nombreCompleto: "asc" }],
        select: {
          id: true,
          nombreCompleto: true,
          activo: true,
          positionId: true,
          sucursalId: true,
          posCredentials: {
            select: {
              id: true,
              employeeId: true,
              userId: true,
              aliasNormalized: true,
              active: true,
              offlineEnabled: true,
              lockedUntil: true,
              masterProfile: { select: { active: true } },
              posBranchAssignments: { select: { branchId: true } },
            },
          },
        },
      }),
      db.position.findMany({
        orderBy: [{ activo: "desc" }, { nombre: "asc" }],
        select: {
          id: true,
          nombre: true,
          posDescription: true,
          activo: true,
          posPermissions: {
            where: {
              allowed: true,
              permissionNode: { grantable: true, active: true },
            },
            select: { permissionNode: { select: { key: true } } },
          },
          posBranchAssignments: { select: { branchId: true } },
        },
      }),
      db.posPermissionNode.findMany({
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      }),
    ]);
    const valid = new Set<string>(POS_PERMISSION_KEYS);
    res.json({
      success: true,
      message: "OK",
      data: {
        employees: employees.map((employee) => {
          const credential = employee.posCredentials[0] ?? null;
          return {
            id: employee.id,
            displayName: employee.nombreCompleto,
            active: employee.activo,
            positionId: employee.positionId,
            branchId: employee.sucursalId,
            assignedBranchIds:
              credential?.posBranchAssignments.map(
                (assignment) => assignment.branchId,
              ) ?? [],
            credential: credential
              ? {
                  id: credential.id,
                  employeeId: credential.employeeId,
                  userId: credential.userId,
                  alias: credential.aliasNormalized,
                  displayName: employee.nombreCompleto,
                  active: credential.active,
                  offlineEnabled: credential.offlineEnabled,
                  isMaster: Boolean(credential.masterProfile?.active),
                  lockedUntil: credential.lockedUntil?.toISOString() ?? null,
                }
              : null,
          };
        }),
        roles: roles.map((role) => ({
          id: role.id,
          name: role.nombre,
          description: role.posDescription,
          active: role.activo,
          permissions: role.posPermissions
            .map((grant) => grant.permissionNode.key)
            .filter((key): key is PosPermissionKey => valid.has(key)),
          assignedBranchIds: role.posBranchAssignments.map(
            (assignment) => assignment.branchId,
          ),
        })),
        permissionTree: permissionTree.map((node) => ({
          id: node.id,
          key: node.key,
          label: node.label,
          parentId: node.parentId,
          grantable: node.grantable,
          sortOrder: node.sortOrder,
          version: node.version,
        })),
      },
    });
  },
);

const employeeAccessInclude = {
  posCredentials: {
    select: {
      id: true,
      employeeId: true,
      userId: true,
      aliasNormalized: true,
      active: true,
      offlineEnabled: true,
      lockedUntil: true,
      masterProfile: { select: { active: true } },
      posBranchAssignments: { select: { branchId: true } },
    },
  },
} satisfies Prisma.EmpleadoInclude;

function publicEmployeeAccess(
  employee: Prisma.EmpleadoGetPayload<{
    include: typeof employeeAccessInclude;
  }>,
) {
  const credential = employee.posCredentials[0] ?? null;
  return {
    id: employee.id,
    displayName: employee.nombreCompleto,
    active: employee.activo,
    positionId: employee.positionId,
    branchId: employee.sucursalId,
    assignedBranchIds:
      credential?.posBranchAssignments.map(
        (assignment) => assignment.branchId,
      ) ?? [],
    credential: credential
      ? {
          id: credential.id,
          employeeId: credential.employeeId,
          userId: credential.userId,
          alias: credential.aliasNormalized,
          displayName: employee.nombreCompleto,
          active: credential.active,
          offlineEnabled: credential.offlineEnabled,
          isMaster: Boolean(credential.masterProfile?.active),
          lockedUntil: credential.lockedUntil?.toISOString() ?? null,
        }
      : null,
  };
}

function splitEmployeeName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  return {
    nombres: parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0]!,
    apellidoPaterno: parts.length > 1 ? parts.at(-1)! : ".",
    apellidoMaterno: "",
    nombreCompleto: displayName.trim(),
  };
}

router.post(
  "/access/positions",
  posAuthMiddleware,
  requirePosPermission("EMPLOYEES_MANAGE"),
  requireMasterPosSession,
  async (req, res) => {
    const parsed = posRoleWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Puesto inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const role = await db.position.create({
        data: {
          nombre: parsed.data.name,
          posDescription: parsed.data.description ?? null,
          activo: parsed.data.active,
        },
      });
      await audit(req, {
        action: "POS_POSITION_CREATED",
        outcome: "SUCCESS",
        actorCredentialId: req.posUser!.credentialId,
        terminalId: req.posUser!.terminalId,
        branchId: req.posUser!.branchId,
        targetType: "Position",
        targetId: role.id,
      });
      return res.status(201).json({
        success: true,
        message: "Puesto creado",
        data: {
          id: role.id,
          name: role.nombre,
          description: role.posDescription,
          active: role.activo,
          permissions: [],
          assignedBranchIds: [],
        },
      });
    } catch (error) {
      if (handleUniqueConflict(error, res)) return;
      throw error;
    }
  },
);

router.put(
  "/access/positions/:id",
  posAuthMiddleware,
  requirePosPermission("EMPLOYEES_MANAGE"),
  requireMasterPosSession,
  async (req, res) => {
    const parsed = posRoleWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Puesto inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    const positionId = req.params["id"]!;
    if (!parsed.data.active) {
      const activeEmployees = await db.empleado.count({
        where: { positionId, activo: true },
      });
      if (activeEmployees > 0)
        return res.status(409).json({
          success: false,
          message:
            "Reasigna a los empleados activos antes de inactivar el puesto",
          data: null,
        });
    }
    try {
      const role = await db.position.update({
        where: { id: positionId },
        data: {
          nombre: parsed.data.name,
          posDescription: parsed.data.description ?? null,
          activo: parsed.data.active,
        },
        include: {
          posPermissions: {
            where: { allowed: true, permissionNode: { active: true } },
            include: { permissionNode: { select: { key: true } } },
          },
          posBranchAssignments: { select: { branchId: true } },
        },
      });
      await audit(req, {
        action: "POS_POSITION_UPDATED",
        outcome: "SUCCESS",
        actorCredentialId: req.posUser!.credentialId,
        terminalId: req.posUser!.terminalId,
        branchId: req.posUser!.branchId,
        targetType: "Position",
        targetId: role.id,
      });
      return res.json({
        success: true,
        message: "Puesto actualizado",
        data: {
          id: role.id,
          name: role.nombre,
          description: role.posDescription,
          active: role.activo,
          permissions: role.posPermissions.map(
            (grant) => grant.permissionNode.key,
          ),
          assignedBranchIds: role.posBranchAssignments.map(
            (item) => item.branchId,
          ),
        },
      });
    } catch (error) {
      if (handleUniqueConflict(error, res)) return;
      return res.status(404).json({
        success: false,
        message: "Puesto no encontrado",
        data: null,
      });
    }
  },
);

router.post(
  "/access/employees",
  posAuthMiddleware,
  requirePosPermission("EMPLOYEES_MANAGE"),
  requireMasterPosSession,
  async (req, res) => {
    const parsed = posEmployeeWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Empleado inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    if (!parsed.data.pin)
      return res.status(400).json({
        success: false,
        message: "El código personal es obligatorio al registrar",
        data: null,
      });
    if (
      await db.posDelegatedMasterCode.findUnique({
        where: {
          codeFingerprint: fingerprintSecret(
            parsed.data.pin,
            "delegated-master",
          ),
        },
        select: { id: true },
      })
    )
      return res.status(409).json({
        success: false,
        message: "El código coincide con un acceso master delegado",
        data: null,
      });
    const position = parsed.data.positionId
      ? await db.position.findFirst({
          where: { id: parsed.data.positionId, activo: true },
          select: { id: true, nombre: true },
        })
      : null;
    if (parsed.data.positionId && !position)
      return res.status(400).json({
        success: false,
        message: "El puesto seleccionado no está activo",
        data: null,
      });
    try {
      const pinHash = await hashPosSecret(parsed.data.pin);
      const employee = await db.$transaction(async (tx) => {
        const created = await tx.empleado.create({
          data: {
            ...splitEmployeeName(parsed.data.displayName),
            banco: "",
            numeroCuenta: "",
            puesto: position?.nombre ?? "",
            positionId: position?.id ?? null,
            sucursalId: req.posUser!.branchId,
            metaIndividual: 0,
            activo: parsed.data.active,
          },
        });
        await tx.posCredential.create({
          data: {
            employeeId: created.id,
            alias: parsed.data.alias,
            aliasNormalized: normalizePosAlias(parsed.data.alias),
            pinHash,
            pinFingerprint: fingerprintSecret(parsed.data.pin!, "pin"),
            active: parsed.data.active,
            offlineEnabled: false,
          },
        });
        return created;
      });
      const loaded = await db.empleado.findUniqueOrThrow({
        where: { id: employee.id },
        include: employeeAccessInclude,
      });
      await audit(req, {
        action: "POS_EMPLOYEE_CREATED",
        outcome: "SUCCESS",
        actorCredentialId: req.posUser!.credentialId,
        terminalId: req.posUser!.terminalId,
        branchId: req.posUser!.branchId,
        targetType: "Empleado",
        targetId: employee.id,
      });
      return res.status(201).json({
        success: true,
        message: "Empleado creado",
        data: publicEmployeeAccess(loaded),
      });
    } catch (error) {
      if (handleUniqueConflict(error, res)) return;
      throw error;
    }
  },
);

router.put(
  "/access/employees/:id",
  posAuthMiddleware,
  requirePosPermission("EMPLOYEES_MANAGE"),
  requireMasterPosSession,
  async (req, res) => {
    const parsed = posEmployeeWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Empleado inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    const employeeId = req.params["id"]!;
    if (!parsed.data.active && employeeId === req.posUser!.employeeId)
      return res.status(409).json({
        success: false,
        message: "No puedes inactivar al empleado de la sesión vigente",
        data: null,
      });
    const position = parsed.data.positionId
      ? await db.position.findFirst({
          where: { id: parsed.data.positionId, activo: true },
          select: { id: true, nombre: true },
        })
      : null;
    if (parsed.data.positionId && !position)
      return res.status(400).json({
        success: false,
        message: "El puesto seleccionado no está activo",
        data: null,
      });
    try {
      if (
        parsed.data.pin &&
        (await db.posDelegatedMasterCode.findUnique({
          where: {
            codeFingerprint: fingerprintSecret(
              parsed.data.pin,
              "delegated-master",
            ),
          },
          select: { id: true },
        }))
      )
        return res.status(409).json({
          success: false,
          message: "El código coincide con un acceso master delegado",
          data: null,
        });
      const pinData = parsed.data.pin
        ? {
            pinHash: await hashPosSecret(parsed.data.pin),
            pinFingerprint: fingerprintSecret(parsed.data.pin, "pin"),
          }
        : {};
      await db.$transaction(async (tx) => {
        const previous = await tx.empleado.findUniqueOrThrow({
          where: { id: employeeId },
          include: { posCredentials: { select: { id: true } } },
        });
        const credential = previous.posCredentials[0];
        if (!credential) throw new Error("CREDENTIAL_NOT_FOUND");
        const roleChanged = previous.positionId !== (position?.id ?? null);
        const statusChanged = previous.activo !== parsed.data.active;
        let transferredCustomers = 0;
        if (previous.activo && !parsed.data.active) {
          const assignments = await tx.customerPortfolioAssignment.findMany({
            where: { employeeId, effectiveTo: null },
          });
          const company = assignments.length
            ? await tx.posCommercialCompany.findFirstOrThrow({
                where: { active: true },
              })
            : null;
          const changedAt = new Date();
          for (const assignment of assignments) {
            await tx.customerPortfolioAssignment.update({
              where: { id: assignment.id },
              data: {
                effectiveTo: changedAt,
                endedReason: "SELLER_INACTIVATED",
                ownerNameSnapshot: previous.nombreCompleto,
              },
            });
            await tx.customerPortfolioAssignment.create({
              data: {
                customerId: assignment.customerId,
                branchId: assignment.branchId,
                companyId: company!.id,
                ownerNameSnapshot: company!.name,
                ownerCodeSnapshot: company!.salesNumber,
                createdByCredentialId: req.posUser!.credentialId,
              },
            });
            await tx.posPortfolioTransferEvent.create({
              data: {
                customerId: assignment.customerId,
                branchId: assignment.branchId,
                sellerId: previous.id,
                sellerNameSnapshot: previous.nombreCompleto,
                companyId: company!.id,
                companyNameSnapshot: company!.name,
                companyNumberSnapshot: company!.salesNumber,
                reason: "SELLER_INACTIVATED",
                actorCredentialId: req.posUser!.credentialId,
                transferredAt: changedAt,
              },
            });
          }
          transferredCustomers = assignments.length;
        }
        await tx.empleado.update({
          where: { id: employeeId },
          data: {
            ...splitEmployeeName(parsed.data.displayName),
            puesto: position?.nombre ?? "",
            positionId: position?.id ?? null,
            activo: parsed.data.active,
          },
        });
        await tx.posCredential.update({
          where: { id: credential.id },
          data: {
            alias: parsed.data.alias,
            aliasNormalized: normalizePosAlias(parsed.data.alias),
            active: parsed.data.active,
            failedAttempts: 0,
            lockedUntil: null,
            version: { increment: 1 },
            ...pinData,
          },
        });
        const accessChangedAt = new Date();
        await revokeCredentialSessionsAndAuthorizations(
          tx,
          [credential.id],
          "EMPLOYEE_ACCESS_CHANGED",
          accessChangedAt,
        );
        await tx.auditLog.create({
          data: {
            action: "POS_EMPLOYEE_UPDATED",
            outcome: "SUCCESS",
            actorCredentialId: req.posUser!.credentialId,
            terminalId: req.posUser!.terminalId,
            branchId: req.posUser!.branchId,
            targetType: "Empleado",
            targetId: employeeId,
            metadata: {
              roleChanged,
              statusChanged,
              pinChanged: Boolean(parsed.data.pin),
              transferredCustomers,
            },
            ...requestAuditData(req),
          },
        });
      });
      const loaded = await db.empleado.findUniqueOrThrow({
        where: { id: employeeId },
        include: employeeAccessInclude,
      });
      return res.json({
        success: true,
        message: "Empleado actualizado",
        data: publicEmployeeAccess(loaded),
      });
    } catch (error) {
      if (handleUniqueConflict(error, res)) return;
      const missingCredential =
        error instanceof Error && error.message === "CREDENTIAL_NOT_FOUND";
      return res.status(404).json({
        success: false,
        message: missingCredential
          ? "Credencial POS no encontrada"
          : "Empleado no encontrado",
        data: null,
      });
    }
  },
);

router.put(
  "/access/master-delegations",
  posAuthMiddleware,
  requirePosPermission("EMPLOYEES_MANAGE"),
  requireMasterPosSession,
  async (req, res) => {
    const parsed = posMasterAccessUpdateSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Asignación master inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    const employeeIds = [...new Set(parsed.data.employeeIds)];
    const employees = await db.empleado.findMany({
      where: { id: { in: employeeIds }, activo: true },
      include: {
        posCredentials: {
          select: {
            id: true,
            pinFingerprint: true,
            masterProfile: {
              select: { active: true, managedByDelegation: true },
            },
          },
        },
      },
    });
    if (
      employees.length !== employeeIds.length ||
      employees.some((employee) => employee.posCredentials.length !== 1)
    )
      return res.status(400).json({
        success: false,
        message:
          "La selección contiene empleados inactivos o sin credencial POS",
        data: null,
      });
    if (parsed.data.code) {
      const fingerprint = fingerprintSecret(
        parsed.data.code,
        "delegated-master",
      );
      const personalFingerprint = fingerprintSecret(parsed.data.code, "pin");
      const collides = await db.posCredential.findUnique({
        where: { pinFingerprint: personalFingerprint },
        select: { id: true },
      });
      if (collides)
        return res.status(409).json({
          success: false,
          message: "El código coincide con una clave personal",
          data: null,
        });
      const codeHash = await hashPosSecret(parsed.data.code);
      await db.$transaction(async (tx) => {
        const code = await tx.posDelegatedMasterCode.upsert({
          where: { codeFingerprint: fingerprint },
          create: { codeFingerprint: fingerprint, codeHash },
          update: { codeHash, active: true, version: { increment: 1 } },
        });
        const now = new Date();
        for (const employee of employees) {
          await tx.posDelegatedMasterAssignment.updateMany({
            where: { employeeId: employee.id, active: true },
            data: {
              active: false,
              revokedAt: now,
              revokedByCredentialId: req.posUser!.credentialId,
            },
          });
          await tx.posDelegatedMasterAssignment.create({
            data: {
              codeId: code.id,
              employeeId: employee.id,
              grantedByCredentialId: req.posUser!.credentialId,
            },
          });
          const credentialId = employee.posCredentials[0]!.id;
          const masterProfile = employee.posCredentials[0]!.masterProfile;
          if (!masterProfile?.active) {
            await tx.posMasterCredential.upsert({
              where: { credentialId },
              create: {
                credentialId,
                active: true,
                managedByDelegation: true,
              },
              update: { active: true, managedByDelegation: true },
            });
          }
          await tx.posCredential.update({
            where: { id: credentialId },
            data: { version: { increment: 1 } },
          });
          await revokeCredentialSessionsAndAuthorizations(
            tx,
            [credentialId],
            "MASTER_ACCESS_CHANGED",
            now,
          );
        }
      });
    } else {
      const now = new Date();
      await db.$transaction(async (tx) => {
        for (const employee of employees) {
          await tx.posDelegatedMasterAssignment.updateMany({
            where: { employeeId: employee.id, active: true },
            data: {
              active: false,
              revokedAt: now,
              revokedByCredentialId: req.posUser!.credentialId,
            },
          });
          const credentialId = employee.posCredentials[0]!.id;
          await tx.posMasterCredential.updateMany({
            where: { credentialId, managedByDelegation: true },
            data: { active: false, managedByDelegation: false },
          });
          await tx.posCredential.update({
            where: { id: credentialId },
            data: { version: { increment: 1 } },
          });
          await revokeCredentialSessionsAndAuthorizations(
            tx,
            [credentialId],
            "MASTER_ACCESS_CHANGED",
            now,
          );
        }
      });
    }
    await audit(req, {
      action: parsed.data.code
        ? "POS_MASTER_ACCESS_ASSIGNED"
        : "POS_MASTER_ACCESS_REVOKED",
      outcome: "SUCCESS",
      actorCredentialId: req.posUser!.credentialId,
      terminalId: req.posUser!.terminalId,
      branchId: req.posUser!.branchId,
      targetType: "Empleado",
      metadata: { employeeIds },
    });
    return res.json({
      success: true,
      message: parsed.data.code
        ? "Acceso master asignado"
        : "Acceso master revocado",
      data: { employeeIds },
    });
  },
);

router.put("/access/me/credential", posAuthMiddleware, async (req, res) => {
  const parsed = posSelfCredentialUpdateSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      success: false,
      message: "Datos de acceso inválidos",
      data: parsed.error.flatten().fieldErrors,
    });
  const credential = await db.posCredential.findUnique({
    where: { id: req.posUser!.credentialId },
  });
  const matches = await verifyPosSecret(
    parsed.data.currentPin,
    credential?.pinHash ?? POS_DUMMY_BCRYPT_HASH,
  );
  if (!credential?.active || !matches)
    return res.status(403).json({
      success: false,
      message: "La contraseña personal actual es incorrecta",
      data: null,
    });
  try {
    if (
      parsed.data.newPin &&
      (await db.posDelegatedMasterCode.findUnique({
        where: {
          codeFingerprint: fingerprintSecret(
            parsed.data.newPin,
            "delegated-master",
          ),
        },
        select: { id: true },
      }))
    )
      return res.status(409).json({
        success: false,
        message: "El código coincide con un acceso master delegado",
        data: null,
      });
    const pinData = parsed.data.newPin
      ? {
          pinHash: await hashPosSecret(parsed.data.newPin),
          pinFingerprint: fingerprintSecret(parsed.data.newPin, "pin"),
        }
      : {};
    const now = new Date();
    await db.$transaction(async (tx) => {
      await tx.posCredential.update({
        where: { id: credential.id },
        data: {
          alias: parsed.data.alias,
          aliasNormalized: normalizePosAlias(parsed.data.alias),
          version: { increment: 1 },
          failedAttempts: 0,
          lockedUntil: null,
          ...pinData,
        },
      });
      await revokeCredentialSessionsAndAuthorizations(
        tx,
        [credential.id],
        "SELF_CREDENTIAL_CHANGED",
        now,
      );
      await tx.auditLog.create({
        data: {
          action: "POS_SELF_CREDENTIAL_UPDATED",
          outcome: "SUCCESS",
          actorCredentialId: credential.id,
          terminalId: req.posUser!.terminalId,
          branchId: req.posUser!.branchId,
          targetType: "PosCredential",
          targetId: credential.id,
          metadata: {
            aliasChanged:
              credential.aliasNormalized !==
              normalizePosAlias(parsed.data.alias),
            pinChanged: Boolean(parsed.data.newPin),
          },
          ...requestAuditData(req),
        },
      });
    });
    return res.json({
      success: true,
      message: "Acceso actualizado; inicia sesión nuevamente",
      data: { revokedAt: now.toISOString() },
    });
  } catch (error) {
    if (handleUniqueConflict(error, res)) return;
    throw error;
  }
});

router.put(
  "/access/positions/:id/permissions",
  posAuthMiddleware,
  requirePosPermission("EMPLOYEES_MANAGE"),
  async (req, res) => {
    const parsed = posRolePermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Permisos inválidos",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const positionId = req.params["id"]!;
    if (!req.posUser!.isMaster && req.posUser!.positionId === positionId) {
      res.status(403).json({
        success: false,
        message: "No puedes modificar los permisos de tu propio puesto",
        data: null,
      });
      return;
    }
    const authorization = await consumeAuthorization(
      parsed.data.authorizationToken,
      "POSITION_PERMISSIONS_UPDATE",
      req.posUser!.terminalId,
      req.posUser!.sessionId,
      { entityType: "Position", entityId: positionId },
    );
    if (!authorization) {
      res.status(403).json({
        success: false,
        message: "Autorización master requerida",
        data: null,
      });
      return;
    }
    const position = await db.position.findUnique({
      where: { id: positionId },
      select: { id: true },
    });
    if (!position) {
      res
        .status(404)
        .json({ success: false, message: "Puesto no encontrado", data: null });
      return;
    }
    const nodes = await db.posPermissionNode.findMany({
      where: {
        key: { in: parsed.data.permissions },
        grantable: true,
        active: true,
      },
      select: { id: true, key: true },
    });
    if (nodes.length !== new Set(parsed.data.permissions).size) {
      res.status(400).json({
        success: false,
        message: "El catálogo de permisos está incompleto",
        data: null,
      });
      return;
    }
    await db.$transaction(async (tx) => {
      await tx.positionPosPermission.deleteMany({ where: { positionId } });
      if (nodes.length > 0) {
        await tx.positionPosPermission.createMany({
          data: nodes.map((node) => ({
            positionId,
            permissionNodeId: node.id,
            allowed: true,
          })),
        });
      }
      const affected = await tx.posCredential.findMany({
        where: { employee: { positionId } },
        select: { id: true },
      });
      const credentialIds = affected.map((item) => item.id);
      if (credentialIds.length > 0) {
        const changedAt = new Date();
        await tx.posCredential.updateMany({
          where: { id: { in: credentialIds } },
          data: { version: { increment: 1 } },
        });
        await revokeCredentialSessionsAndAuthorizations(
          tx,
          credentialIds,
          "POSITION_PERMISSIONS_CHANGED",
          changedAt,
        );
      }
    });
    await audit(req, {
      action: "POS_POSITION_PERMISSIONS_UPDATED",
      outcome: "SUCCESS",
      actorCredentialId: authorization.actorCredentialId,
      terminalId: req.posUser!.terminalId,
      branchId: req.posUser!.branchId,
      targetType: "Position",
      targetId: positionId,
      metadata: { permissions: parsed.data.permissions },
    });
    res.json({
      success: true,
      message: "Permisos POS actualizados",
      data: { positionId, permissions: nodes.map((node) => node.key) },
    });
  },
);

router.put(
  "/access/positions/:id/branches",
  posAuthMiddleware,
  requirePosPermission("EMPLOYEES_MANAGE"),
  async (req, res) => {
    const parsed = posBranchAssignmentsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Alcance de sucursales inválido",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const positionId = req.params["id"]!;
    if (!req.posUser!.isMaster && req.posUser!.positionId === positionId) {
      res.status(403).json({
        success: false,
        message: "No puedes ampliar el alcance de tu propio puesto",
        data: null,
      });
      return;
    }
    const authorization = await consumeAuthorization(
      parsed.data.authorizationToken,
      "POSITION_BRANCH_SCOPE_UPDATE",
      req.posUser!.terminalId,
      req.posUser!.sessionId,
      { entityType: "Position", entityId: positionId },
    );
    if (!authorization) {
      res.status(403).json({
        success: false,
        message: "Autorización master requerida",
        data: null,
      });
      return;
    }
    const branchIds = [...new Set(parsed.data.branchIds)];
    const [position, branches, previous] = await Promise.all([
      db.position.findUnique({
        where: { id: positionId },
        select: { id: true },
      }),
      db.sucursal.findMany({
        where: { id: { in: branchIds }, activa: true },
        select: { id: true },
      }),
      db.posPositionBranchAssignment.findMany({
        where: { positionId },
        select: { branchId: true },
      }),
    ]);
    if (!position)
      return res
        .status(404)
        .json({ success: false, message: "Puesto no encontrado", data: null });
    if (branches.length !== branchIds.length)
      return res.status(400).json({
        success: false,
        message: "El alcance contiene sucursales inactivas o inexistentes",
        data: null,
      });
    await db.$transaction(async (tx) => {
      await tx.posPositionBranchAssignment.deleteMany({
        where: { positionId },
      });
      if (branchIds.length)
        await tx.posPositionBranchAssignment.createMany({
          data: branchIds.map((branchId) => ({ positionId, branchId })),
        });
      const affected = await tx.posCredential.findMany({
        where: { employee: { positionId } },
        select: { id: true },
      });
      const credentialIds = affected.map((item) => item.id);
      if (credentialIds.length > 0) {
        await tx.posCredential.updateMany({
          where: { id: { in: credentialIds } },
          data: { version: { increment: 1 } },
        });
        await revokeCredentialSessionsAndAuthorizations(
          tx,
          credentialIds,
          "POSITION_BRANCH_SCOPE_CHANGED",
        );
      }
      await tx.auditLog.create({
        data: {
          action: "POS_POSITION_BRANCH_SCOPE_UPDATED",
          outcome: "SUCCESS",
          actorCredentialId: authorization.actorCredentialId,
          terminalId: req.posUser!.terminalId,
          branchId: req.posUser!.branchId,
          targetType: "Position",
          targetId: positionId,
          metadata: {
            previousBranchIds: previous.map((item) => item.branchId),
            nextBranchIds: branchIds,
          },
          ...requestAuditData(req),
        },
      });
    });
    res.json({
      success: true,
      message: "Alcance del puesto actualizado",
      data: { positionId, branchIds },
    });
  },
);

router.put(
  "/access/credentials/:id/branches",
  posAuthMiddleware,
  requirePosPermission("EMPLOYEES_MANAGE"),
  async (req, res) => {
    const parsed = posBranchAssignmentsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Alcance de sucursales inválido",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const credentialId = req.params["id"]!;
    if (!req.posUser!.isMaster && req.posUser!.credentialId === credentialId) {
      res.status(403).json({
        success: false,
        message: "No puedes ampliar el alcance de tu propia credencial",
        data: null,
      });
      return;
    }
    const authorization = await consumeAuthorization(
      parsed.data.authorizationToken,
      "CREDENTIAL_BRANCH_SCOPE_UPDATE",
      req.posUser!.terminalId,
      req.posUser!.sessionId,
      { entityType: "PosCredential", entityId: credentialId },
    );
    if (!authorization) {
      res.status(403).json({
        success: false,
        message: "Autorización master requerida",
        data: null,
      });
      return;
    }
    const branchIds = [...new Set(parsed.data.branchIds)];
    const [credential, branches, previous] = await Promise.all([
      db.posCredential.findUnique({
        where: { id: credentialId },
        select: { id: true },
      }),
      db.sucursal.findMany({
        where: { id: { in: branchIds }, activa: true },
        select: { id: true },
      }),
      db.posCredentialBranchAssignment.findMany({
        where: { credentialId },
        select: { branchId: true },
      }),
    ]);
    if (!credential)
      return res.status(404).json({
        success: false,
        message: "Credencial no encontrada",
        data: null,
      });
    if (branches.length !== branchIds.length)
      return res.status(400).json({
        success: false,
        message: "El alcance contiene sucursales inactivas o inexistentes",
        data: null,
      });
    await db.$transaction(async (tx) => {
      await tx.posCredentialBranchAssignment.deleteMany({
        where: { credentialId },
      });
      if (branchIds.length)
        await tx.posCredentialBranchAssignment.createMany({
          data: branchIds.map((branchId) => ({ credentialId, branchId })),
        });
      await tx.posCredential.update({
        where: { id: credentialId },
        data: { version: { increment: 1 } },
      });
      await revokeCredentialSessionsAndAuthorizations(
        tx,
        [credentialId],
        "CREDENTIAL_BRANCH_SCOPE_CHANGED",
      );
      await tx.auditLog.create({
        data: {
          action: "POS_CREDENTIAL_BRANCH_SCOPE_UPDATED",
          outcome: "SUCCESS",
          actorCredentialId: authorization.actorCredentialId,
          terminalId: req.posUser!.terminalId,
          branchId: req.posUser!.branchId,
          targetType: "PosCredential",
          targetId: credentialId,
          metadata: {
            previousBranchIds: previous.map((item) => item.branchId),
            nextBranchIds: branchIds,
          },
          ...requestAuditData(req),
        },
      });
    });
    res.json({
      success: true,
      message: "Alcance de la credencial actualizado",
      data: { credentialId, branchIds },
    });
  },
);

router.put(
  "/access/employees/:id/credential",
  posAuthMiddleware,
  requirePosPermission("EMPLOYEES_MANAGE"),
  async (req, res) => {
    const parsed = credentialBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Credencial inválida",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const employeeId = req.params["id"]!;
    const authorization = await consumeAuthorization(
      parsed.data.authorizationToken,
      "EMPLOYEE_CREDENTIAL_UPDATE",
      req.posUser!.terminalId,
      req.posUser!.sessionId,
      { entityType: "Empleado", entityId: employeeId },
    );
    if (!authorization) {
      res.status(403).json({
        success: false,
        message: "Autorización master requerida",
        data: null,
      });
      return;
    }
    try {
      const employee = await db.empleado.findUnique({
        where: { id: employeeId },
        select: { id: true, nombreCompleto: true },
      });
      if (!employee) {
        res.status(404).json({
          success: false,
          message: "Empleado no encontrado",
          data: null,
        });
        return;
      }
      const credential = await upsertCredential({ ...parsed.data, employeeId });
      await audit(req, {
        action: "POS_EMPLOYEE_CREDENTIAL_UPDATED",
        outcome: "SUCCESS",
        actorCredentialId: authorization.actorCredentialId,
        terminalId: req.posUser!.terminalId,
        branchId: req.posUser!.branchId,
        targetType: "Empleado",
        targetId: employeeId,
        metadata: {
          active: credential.active,
          offlineEnabled: credential.offlineEnabled,
          isMaster: parsed.data.isMaster,
        },
      });
      res.json({
        success: true,
        message: "Credencial del empleado actualizada",
        data: {
          id: credential.id,
          employeeId,
          userId: null,
          alias: credential.aliasNormalized,
          displayName: employee.nombreCompleto,
          active: credential.active,
          offlineEnabled: credential.offlineEnabled,
          isMaster: parsed.data.isMaster,
          lockedUntil: credential.lockedUntil?.toISOString() ?? null,
        },
      });
    } catch (error) {
      if (handleMissingPin(error, res)) return;
      if (handleDelegatedCodeConflict(error, res)) return;
      if (handleUniqueConflict(error, res)) return;
      console.error("[pos.access.employee.credential]", error);
      res.status(500).json({
        success: false,
        message: "No se pudo actualizar la credencial",
        data: null,
      });
    }
  },
);

export default router;
