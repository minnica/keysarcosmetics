import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import {
  SCHEDULER_AUTHORIZATION_PURPOSES,
  SCHEDULER_CAPABILITIES,
  SCHEDULER_SCREEN_KEYS,
  type SchedulerAccessManagementDto,
  type SchedulerCapability,
  type SchedulerManagedPositionDto,
  type SchedulerPermissionDto,
  type SchedulerScreenKey,
} from "@cosmetics/types";
import { authMiddleware } from "../middlewares/auth.middleware";
import { prisma } from "../prisma/client";
import {
  issueSchedulerAuthorization,
  consumeSchedulerAuthorization,
  hasSchedulerBranchAccess,
  hasSchedulerCapability,
  requireSchedulerAccessManager,
  resolveSchedulerAccessForRequest,
  schedulerAuthorizationRequirements,
  toSchedulerBootstrap,
  writeSchedulerAudit,
} from "../services/scheduler-access";
import schedulerOperationsRoutes from "./scheduler-operations.routes";

const router: ExpressRouter = Router();
const screenKeys = new Set<string>(SCHEDULER_SCREEN_KEYS);

const screenKeySchema = z.custom<SchedulerScreenKey>(
  (value): value is SchedulerScreenKey =>
    typeof value === "string" && screenKeys.has(value),
  { message: "Pantalla de Scheduler inválida" },
);
const authorizationSchema = z.object({
  secret: z
    .string()
    .regex(/^\d{4,12}$/, "El código debe tener de 4 a 12 dígitos"),
  purpose: z.enum(SCHEDULER_AUTHORIZATION_PURPOSES),
  screenKey: screenKeySchema,
  branchId: z.string().trim().min(1).optional(),
  targetType: z.string().trim().min(1).max(80).optional(),
  targetId: z.string().trim().min(1).max(160).optional(),
});
const secondarySecretSchema = z
  .object({
    currentPassword: z.string().min(1),
    secret: z
      .string()
      .regex(/^\d{4,12}$/, "El código debe tener de 4 a 12 dígitos"),
  })
  .strict();
const permissionSchema = z
  .object({
    canManageSchedulerAccess: z.boolean().optional(),
    selfProfessionalOnly: z.boolean(),
    permissions: z.array(
      z
        .object({
          screenKey: screenKeySchema,
          capabilities: z.array(z.enum(SCHEDULER_CAPABILITIES)),
        })
        .superRefine((permission, context) => {
          const capabilities = new Set<SchedulerCapability>(
            permission.capabilities,
          );
          if (capabilities.size !== permission.capabilities.length) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Las capacidades no deben repetirse",
            });
          }
          if (
            [...capabilities].some((capability) => capability !== "READ") &&
            !capabilities.has("READ")
          ) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "READ es obligatorio para conceder otra capacidad",
            });
          }
        }),
    ),
  })
  .strict();
const branchAssignmentSchema = z
  .object({ branchIds: z.array(z.string().trim().min(1)) })
  .strict();
const authorizationConsumeSchema = authorizationSchema
  .omit({ secret: true })
  .extend({
    token: z.string().min(32).max(128),
  });

router.use(authMiddleware);
router.use("/operations", schedulerOperationsRoutes);

router.get("/bootstrap", async (req, res) => {
  try {
    const access = await resolveSchedulerAccessForRequest(req);
    if (!access) {
      res
        .status(401)
        .json({ success: false, message: "No autenticado", data: null });
      return;
    }
    res.json({
      success: true,
      message: "OK",
      data: toSchedulerBootstrap(access),
    });
  } catch (error) {
    console.error("[scheduler.bootstrap]", error);
    res.status(500).json({
      success: false,
      message: "No fue posible cargar la sesión de Scheduler",
      data: null,
    });
  }
});

router.put("/security/secondary-secret", async (req, res) => {
  try {
    const parsed = secondarySecretSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Revisa la contraseña y el código secundario",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const access = await resolveSchedulerAccessForRequest(req);
    if (!access) {
      res
        .status(401)
        .json({ success: false, message: "No autenticado", data: null });
      return;
    }
    const user = await prisma.usuario.findUnique({
      where: { id: access.userId },
      select: { passwordHash: true },
    });
    const passwordValid = Boolean(
      user &&
      (await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)),
    );
    if (!passwordValid) {
      await writeSchedulerAudit({
        req,
        action: "SCHEDULER_SECONDARY_SECRET_CHANGE",
        outcome: "DENIED",
        actorUserId: access.userId,
      });
      res.status(403).json({
        success: false,
        message: "No fue posible validar la contraseña actual",
        data: null,
      });
      return;
    }
    const secretHash = await bcrypt.hash(parsed.data.secret, 12);
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.schedulerAuthorization.updateMany({
        where: { actorUserId: access.userId, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.schedulerSecondaryCredential.upsert({
        where: { userId: access.userId },
        create: { userId: access.userId, secretHash },
        update: {
          secretHash,
          active: true,
          failedAttempts: 0,
          lockedUntil: null,
          version: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          application: "SCHEDULER",
          action: "SCHEDULER_SECONDARY_SECRET_CHANGE",
          outcome: "SUCCESS",
          actorUserId: access.userId,
          metadata: { invalidatedPreviousAuthorizations: true },
        },
      });
    });
    res.json({
      success: true,
      message: "Código secundario actualizado",
      data: { configured: true },
    });
  } catch (error) {
    console.error("[scheduler.secondary-secret]", error);
    res.status(500).json({
      success: false,
      message: "No fue posible actualizar el código secundario",
      data: null,
    });
  }
});

router.post("/authorizations", async (req, res) => {
  try {
    const parsed = authorizationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Solicitud de autorización inválida",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const access = await resolveSchedulerAccessForRequest(req);
    if (!access) {
      res
        .status(401)
        .json({ success: false, message: "No autenticado", data: null });
      return;
    }
    const authorization = await issueSchedulerAuthorization({
      access,
      ...parsed.data,
    });
    if (!authorization) {
      await writeSchedulerAudit({
        req,
        action: "SCHEDULER_SECONDARY_AUTHORIZATION",
        outcome: "DENIED",
        actorUserId: access.userId,
        branchId: parsed.data.branchId,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        metadata: {
          purpose: parsed.data.purpose,
          screenKey: parsed.data.screenKey,
        },
      });
      res.status(403).json({
        success: false,
        message: "Código inválido, bloqueado o sin alcance suficiente",
        data: null,
      });
      return;
    }
    await writeSchedulerAudit({
      req,
      action: "SCHEDULER_SECONDARY_AUTHORIZATION",
      outcome: "SUCCESS",
      actorUserId: access.userId,
      branchId: parsed.data.branchId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      metadata: {
        purpose: parsed.data.purpose,
        screenKey: parsed.data.screenKey,
        expiresAt: authorization.expiresAt.toISOString(),
      },
    });
    res.status(201).json({
      success: true,
      message: "Autorización temporal emitida",
      data: {
        token: authorization.token,
        purpose: parsed.data.purpose,
        expiresAt: authorization.expiresAt.toISOString(),
        actor: { userId: access.userId, name: access.name },
      },
    });
  } catch (error) {
    console.error("[scheduler.authorization]", error);
    res.status(500).json({
      success: false,
      message: "No fue posible emitir la autorización",
      data: null,
    });
  }
});

router.post("/authorizations/consume", async (req, res) => {
  try {
    const parsed = authorizationConsumeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Autorización temporal inválida",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const access = await resolveSchedulerAccessForRequest(req);
    if (!access) {
      res
        .status(401)
        .json({ success: false, message: "No autenticado", data: null });
      return;
    }
    const requirement = schedulerAuthorizationRequirements[parsed.data.purpose];
    const stillAuthorized =
      requirement.screenKey === parsed.data.screenKey &&
      hasSchedulerCapability(
        access,
        requirement.screenKey,
        requirement.capability,
      ) &&
      (!parsed.data.branchId ||
        hasSchedulerBranchAccess(access, parsed.data.branchId));
    if (!stillAuthorized) {
      res.status(403).json({
        success: false,
        message: "La sesión ya no conserva el permiso o alcance autorizado",
        data: null,
      });
      return;
    }
    const consumed = await consumeSchedulerAuthorization({
      ...parsed.data,
      actorUserId: access.userId,
    });
    if (!consumed) {
      await writeSchedulerAudit({
        req,
        action: "SCHEDULER_SECONDARY_AUTHORIZATION_CONSUME",
        outcome: "DENIED",
        actorUserId: access.userId,
        branchId: parsed.data.branchId,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        metadata: {
          purpose: parsed.data.purpose,
          screenKey: parsed.data.screenKey,
        },
      });
      res.status(403).json({
        success: false,
        message:
          "La autorización expiró, ya fue usada o no corresponde al alcance",
        data: null,
      });
      return;
    }
    await writeSchedulerAudit({
      req,
      action: "SCHEDULER_SECONDARY_AUTHORIZATION_CONSUME",
      outcome: "SUCCESS",
      actorUserId: access.userId,
      branchId: parsed.data.branchId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      metadata: {
        purpose: parsed.data.purpose,
        screenKey: parsed.data.screenKey,
      },
    });
    res.json({
      success: true,
      message: "Autorización consumida",
      data: { authorized: true },
    });
  } catch (error) {
    console.error("[scheduler.authorization.consume]", error);
    res.status(500).json({
      success: false,
      message: "No fue posible consumir la autorización",
      data: null,
    });
  }
});

router.get("/access", requireSchedulerAccessManager, async (req, res) => {
  try {
    const access = req.schedulerAccess!;
    const [positions, allBranches] = await Promise.all([
      prisma.position.findMany({
        orderBy: [{ activo: "desc" }, { nombre: "asc" }],
        include: {
          schedulerScreenPermissions: { orderBy: { screenKey: "asc" } },
          schedulerBranchAssignments: { select: { branchId: true } },
        },
      }),
      prisma.sucursal.findMany({
        orderBy: [{ activa: "desc" }, { nombre: "asc" }],
        select: { id: true, nombre: true, activa: true },
      }),
    ]);
    const allowedBranchIds = new Set(
      access.authorizedBranches.map((branch) => branch.id),
    );
    const data: SchedulerAccessManagementDto = {
      screens: SCHEDULER_SCREEN_KEYS,
      capabilities: SCHEDULER_CAPABILITIES,
      branches: allBranches
        .filter(
          (branch) =>
            access.role === "SUPER_ADMIN" || allowedBranchIds.has(branch.id),
        )
        .map((branch) => ({
          id: branch.id,
          name: branch.nombre,
          active: branch.activa,
        })),
      positions: positions.map(toManagedPosition),
    };
    res.json({ success: true, message: "OK", data });
  } catch (error) {
    console.error("[scheduler.access]", error);
    res.status(500).json({
      success: false,
      message: "No fue posible cargar los accesos de Scheduler",
      data: null,
    });
  }
});

router.put(
  "/access/positions/:id/permissions",
  requireSchedulerAccessManager,
  async (req, res) => {
    try {
      const parsed = permissionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Revisa los permisos enviados",
          data: parsed.error.flatten().fieldErrors,
        });
        return;
      }
      const access = req.schedulerAccess!;
      const position = await prisma.position.findUnique({
        where: { id: req.params["id"] },
        select: { id: true, canManageSchedulerAccess: true },
      });
      if (!position) {
        res.status(404).json({
          success: false,
          message: "Puesto no encontrado",
          data: null,
        });
        return;
      }
      if (
        access.role !== "SUPER_ADMIN" &&
        parsed.data.canManageSchedulerAccess !== undefined &&
        parsed.data.canManageSchedulerAccess !==
          position.canManageSchedulerAccess
      ) {
        res.status(403).json({
          success: false,
          message:
            "Sólo SUPER_ADMIN puede delegar la administración de accesos",
          data: null,
        });
        return;
      }
      const permissions = new Map(
        parsed.data.permissions.map((permission) => [
          permission.screenKey,
          new Set(permission.capabilities),
        ]),
      );
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.position.update({
          where: { id: position.id },
          data: {
            schedulerSelfProfessionalOnly: parsed.data.selfProfessionalOnly,
            ...(access.role === "SUPER_ADMIN" &&
            parsed.data.canManageSchedulerAccess !== undefined
              ? {
                  canManageSchedulerAccess:
                    parsed.data.canManageSchedulerAccess,
                }
              : {}),
          },
        });
        await tx.positionSchedulerScreenPermission.deleteMany({
          where: { positionId: position.id },
        });
        await tx.positionSchedulerScreenPermission.createMany({
          data: SCHEDULER_SCREEN_KEYS.map((screenKey) => {
            const capabilities =
              permissions.get(screenKey) ?? new Set<SchedulerCapability>();
            return {
              positionId: position.id,
              screenKey,
              canRead: capabilities.has("READ"),
              canWrite: capabilities.has("WRITE"),
              canAdmin: capabilities.has("ADMIN"),
              canExport: capabilities.has("EXPORT"),
              canOverride: capabilities.has("EXCEPTION"),
            };
          }),
        });
        await tx.auditLog.create({
          data: {
            application: "SCHEDULER",
            action: "SCHEDULER_POSITION_PERMISSIONS_UPDATE",
            outcome: "SUCCESS",
            actorUserId: access.userId,
            targetType: "Position",
            targetId: position.id,
            metadata: {
              selfProfessionalOnly: parsed.data.selfProfessionalOnly,
              grantedScreens: parsed.data.permissions.length,
            },
          },
        });
      });
      res.json({
        success: true,
        message: "Permisos de Scheduler actualizados",
        data: await findManagedPosition(position.id),
      });
    } catch (error) {
      console.error("[scheduler.access.permissions]", error);
      res.status(500).json({
        success: false,
        message: "No fue posible actualizar los permisos",
        data: null,
      });
    }
  },
);

router.put(
  "/access/positions/:id/branches",
  requireSchedulerAccessManager,
  async (req, res) => {
    try {
      const parsed = branchAssignmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Revisa las sucursales enviadas",
          data: parsed.error.flatten().fieldErrors,
        });
        return;
      }
      const access = req.schedulerAccess!;
      const position = await prisma.position.findUnique({
        where: { id: req.params["id"] },
        select: { id: true },
      });
      if (!position) {
        res.status(404).json({
          success: false,
          message: "Puesto no encontrado",
          data: null,
        });
        return;
      }
      const requestedBranchIds = [...new Set(parsed.data.branchIds)];
      const managerBranchIds = new Set(
        access.authorizedBranches.map((branch) => branch.id),
      );
      if (
        access.role !== "SUPER_ADMIN" &&
        requestedBranchIds.some((branchId) => !managerBranchIds.has(branchId))
      ) {
        res.status(403).json({
          success: false,
          message: "No puedes delegar una sucursal fuera de tu alcance",
          data: null,
        });
        return;
      }
      const existingBranches = await prisma.sucursal.count({
        where: { id: { in: requestedBranchIds } },
      });
      if (existingBranches !== requestedBranchIds.length) {
        res.status(400).json({
          success: false,
          message: "Una o más sucursales no existen",
          data: null,
        });
        return;
      }
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.positionSchedulerBranchAssignment.deleteMany({
          where: {
            positionId: position.id,
            ...(access.role === "SUPER_ADMIN"
              ? {}
              : { branchId: { in: [...managerBranchIds] } }),
          },
        });
        await tx.positionSchedulerBranchAssignment.createMany({
          data: requestedBranchIds.map((branchId) => ({
            positionId: position.id,
            branchId,
          })),
          skipDuplicates: true,
        });
        await tx.auditLog.create({
          data: {
            application: "SCHEDULER",
            action: "SCHEDULER_POSITION_BRANCHES_UPDATE",
            outcome: "SUCCESS",
            actorUserId: access.userId,
            targetType: "Position",
            targetId: position.id,
            metadata: { branchIds: requestedBranchIds },
          },
        });
      });
      res.json({
        success: true,
        message: "Sucursales de Scheduler actualizadas",
        data: await findManagedPosition(position.id),
      });
    } catch (error) {
      console.error("[scheduler.access.branches]", error);
      res.status(500).json({
        success: false,
        message: "No fue posible actualizar las sucursales",
        data: null,
      });
    }
  },
);

function toPermissionDto(permission: {
  screenKey: string;
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
  canExport: boolean;
  canOverride: boolean;
}): SchedulerPermissionDto | null {
  if (!screenKeys.has(permission.screenKey)) return null;
  const capabilities: SchedulerCapability[] = [];
  if (permission.canRead) capabilities.push("READ");
  if (permission.canWrite) capabilities.push("WRITE");
  if (permission.canAdmin) capabilities.push("ADMIN");
  if (permission.canExport) capabilities.push("EXPORT");
  if (permission.canOverride) capabilities.push("EXCEPTION");
  return {
    screenKey: permission.screenKey as SchedulerScreenKey,
    capabilities,
  };
}

function toManagedPosition(position: {
  id: string;
  nombre: string;
  activo: boolean;
  canManageSchedulerAccess: boolean;
  schedulerSelfProfessionalOnly: boolean;
  schedulerScreenPermissions: Array<{
    screenKey: string;
    canRead: boolean;
    canWrite: boolean;
    canAdmin: boolean;
    canExport: boolean;
    canOverride: boolean;
  }>;
  schedulerBranchAssignments: Array<{ branchId: string }>;
}): SchedulerManagedPositionDto {
  return {
    id: position.id,
    name: position.nombre,
    active: position.activo,
    canManageSchedulerAccess: position.canManageSchedulerAccess,
    selfProfessionalOnly: position.schedulerSelfProfessionalOnly,
    branchIds: position.schedulerBranchAssignments.map(
      ({ branchId }) => branchId,
    ),
    permissions: position.schedulerScreenPermissions
      .map(toPermissionDto)
      .filter((permission): permission is SchedulerPermissionDto =>
        Boolean(permission),
      ),
  };
}

async function findManagedPosition(
  positionId: string,
): Promise<SchedulerManagedPositionDto | null> {
  const position = await prisma.position.findUnique({
    where: { id: positionId },
    include: {
      schedulerScreenPermissions: { orderBy: { screenKey: "asc" } },
      schedulerBranchAssignments: { select: { branchId: true } },
    },
  });
  return position ? toManagedPosition(position) : null;
}

export default router;
