import { Prisma } from "@prisma/client";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { z } from "zod";
import {
  SCHEDULER_RESOURCE_KINDS,
  SCHEDULER_WEEKDAYS,
  type SchedulerOperationalCatalogDto,
  type SchedulerOperationalCandidatesDto,
  type SchedulerScreenKey,
} from "@cosmetics/types";
import { prisma } from "../prisma/client";
import {
  hasSchedulerCapability,
  hasSchedulerBranchAccess,
  resolveSchedulerAccessForRequest,
} from "../services/scheduler-access";
import {
  isValidIanaTimezone,
  normalizeSchedulerCatalogName,
  parseSchedulerEffectiveRange,
  schedulerAvailabilityOwner,
  schedulerAvailabilityOwnerFields,
  uniqueSchedulerIds,
  validateSchedulerAvailabilityRules,
} from "../services/scheduler-operations";

const router: ExpressRouter = Router();
const id = z.string().trim().min(1).max(191);
const isoDate = z.string().datetime({ offset: true });
const effectiveRange = {
  effectiveFrom: isoDate.optional(),
  effectiveTo: isoDate.nullable().optional(),
};
const activeRangeSchema = z.object({ active: z.boolean(), ...effectiveRange });
const commerceSchema = activeRangeSchema
  .extend({ name: z.string().trim().min(1).max(160) })
  .strict();
const branchProfileSchema = activeRangeSchema
  .extend({
    commerceId: id,
    timezone: z.string().trim().min(1).max(80),
    bookingEnabled: z.boolean(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
const professionalSchema = activeRangeSchema
  .extend({
    biography: z.string().trim().max(5000).nullable().optional(),
    acceptsOnline: z.boolean(),
    branchProfileIds: z.array(id),
    specialtyIds: z.array(id),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.active && value.branchProfileIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchProfileIds"],
        message: "Un profesional activo requiere al menos una sucursal",
      });
    }
  });
const serviceSchema = activeRangeSchema
  .extend({
    durationMinutes: z.number().int().min(1).max(1440),
    preparationMinutes: z.number().int().min(0).max(1440),
    cleanupMinutes: z.number().int().min(0).max(1440),
    capacity: z.number().int().min(1).max(1000),
    mode: z.enum(["INDIVIDUAL", "CLASS"]),
    acceptsOnline: z.boolean(),
    branchProfileIds: z.array(id),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.active && value.branchProfileIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchProfileIds"],
        message: "Un servicio activo requiere al menos una sucursal",
      });
    }
    if (value.mode === "INDIVIDUAL" && value.capacity !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capacity"],
        message: "Un servicio individual debe tener capacidad 1",
      });
    }
  });
const resourceSchema = activeRangeSchema
  .extend({
    branchProfileId: id,
    name: z.string().trim().min(1).max(160),
    kind: z.enum(SCHEDULER_RESOURCE_KINDS),
    capacity: z.number().int().min(1).max(1000),
    exclusive: z.boolean(),
    acceptsOnline: z.boolean(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
const specialtySchema = activeRangeSchema
  .extend({
    commerceId: id,
    name: z.string().trim().min(1).max(160),
  })
  .strict();
const groupSchema = activeRangeSchema
  .extend({
    commerceId: id,
    branchProfileId: id,
    name: z.string().trim().min(1).max(160),
    professionalProfileIds: z.array(id),
  })
  .strict();
const professionalServiceSchema = activeRangeSchema
  .extend({
    professionalProfileId: id,
    serviceProfileId: id,
    branchProfileId: id,
  })
  .strict();
const resourceRequirementSchema = activeRangeSchema
  .extend({
    serviceProfileId: id,
    resourceId: id,
    requiredUnits: z.number().int().min(1).max(1000),
    exclusive: z.boolean(),
  })
  .strict();
const availabilityOwnerSchema = z.object({
  branchProfileId: id,
  ownerType: z.enum(["BRANCH", "PROFESSIONAL", "RESOURCE"]),
  ownerId: id,
  effectiveFrom: isoDate.optional(),
});
const availabilityRulesSchema = availabilityOwnerSchema
  .extend({
    rules: z
      .array(
        z
          .object({
            kind: z.enum(["WORKING", "BREAK"]),
            weekday: z.enum(SCHEDULER_WEEKDAYS),
            startMinute: z.number().int(),
            endMinute: z.number().int(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
const availabilityExceptionsSchema = availabilityOwnerSchema
  .extend({
    exceptions: z
      .array(
        z
          .object({
            kind: z.enum(["AVAILABLE", "UNAVAILABLE"]),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            startMinute: z
              .number()
              .int()
              .min(0)
              .max(1439)
              .nullable()
              .optional(),
            endMinute: z.number().int().min(1).max(1440).nullable().optional(),
            reason: z.string().trim().max(500).nullable().optional(),
          })
          .strict()
          .superRefine((value, context) => {
            const bothAbsent =
              value.startMinute == null && value.endMinute == null;
            const bothValid =
              value.startMinute != null &&
              value.endMinute != null &&
              value.startMinute < value.endMinute;
            if (!bothAbsent && !bothValid)
              context.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  "La excepción debe ser de día completo o tener un intervalo válido",
              });
          }),
      )
      .max(366),
  })
  .strict();

const readScreens: SchedulerScreenKey[] = [
  "scheduler/administration/locals",
  "scheduler/administration/professionals",
  "scheduler/administration/services",
  "scheduler/administration/resources",
];

async function requireOperationsRead(
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
  if (
    !readScreens.some((screen) =>
      hasSchedulerCapability(access, screen, "READ"),
    )
  ) {
    res
      .status(403)
      .json({
        success: false,
        message: "No tienes acceso a los catálogos de Scheduler",
        data: null,
      });
    return;
  }
  req.schedulerAccess = access;
  next();
}

function requireOperationsAdmin(screen: SchedulerScreenKey) {
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
    if (!hasSchedulerCapability(access, screen, "ADMIN")) {
      res
        .status(403)
        .json({
          success: false,
          message: "No tienes capacidad administrativa en esta pantalla",
          data: null,
        });
      return;
    }
    req.schedulerAccess = access;
    next();
  };
}

function validationError(
  res: Response,
  message: string,
  data: unknown = null,
): void {
  res.status(400).json({ success: false, message, data });
}

function conflict(res: Response, message: string): void {
  res.status(409).json({ success: false, message, data: null });
}

async function audit(
  tx: Prisma.TransactionClient,
  input: {
    actorUserId: string;
    action: string;
    branchId?: string;
    targetType: string;
    targetId: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: { application: "SCHEDULER", outcome: "SUCCESS", ...input },
  });
}

async function authorizedBranchProfiles(req: Request, profileIds: string[]) {
  const uniqueIds = uniqueSchedulerIds(profileIds);
  const rows = await prisma.schedulerBranchProfile.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, branchId: true, commerceId: true, active: true },
  });
  const access = req.schedulerAccess!;
  if (
    rows.length !== uniqueIds.length ||
    rows.some((row) => !hasSchedulerBranchAccess(access, row.branchId))
  )
    return null;
  return rows;
}

async function schedulerBranchProfileScopeIds(req: Request): Promise<string[]> {
  const branchIds = req.schedulerAccess!.authorizedBranches.map(
    (branch) => branch.id,
  );
  return (
    await prisma.schedulerBranchProfile.findMany({
      where: { branchId: { in: branchIds } },
      select: { id: true },
    })
  ).map((row) => row.id);
}

async function ensureAvailabilityOwner(
  req: Request,
  input: z.infer<typeof availabilityOwnerSchema>,
) {
  const branch = await prisma.schedulerBranchProfile.findUnique({
    where: { id: input.branchProfileId },
    select: { id: true, branchId: true },
  });
  if (
    !branch ||
    !hasSchedulerBranchAccess(req.schedulerAccess!, branch.branchId)
  )
    return false;
  if (input.ownerType === "BRANCH") return input.ownerId === branch.id;
  if (input.ownerType === "RESOURCE") {
    return Boolean(
      await prisma.schedulerResource.findFirst({
        where: { id: input.ownerId, branchProfileId: branch.id },
        select: { id: true },
      }),
    );
  }
  if (req.schedulerAccess!.selfProfessionalOnly) {
    const ownProfile = await prisma.schedulerProfessionalProfile.findUnique({
      where: {
        employeeId: req.schedulerAccess!.professionalEmployeeId ?? "__none__",
      },
      select: { id: true },
    });
    if (ownProfile?.id !== input.ownerId) return false;
  }
  return Boolean(
    await prisma.schedulerProfessionalBranchAssignment.findFirst({
      where: {
        professionalProfileId: input.ownerId,
        branchProfileId: branch.id,
        active: true,
      },
      select: { id: true },
    }),
  );
}

function canAdminAvailabilityOwner(
  req: Request,
  ownerType: "BRANCH" | "PROFESSIONAL" | "RESOURCE",
): boolean {
  const screen: SchedulerScreenKey =
    ownerType === "BRANCH"
      ? "scheduler/administration/locals"
      : ownerType === "RESOURCE"
        ? "scheduler/administration/resources"
        : "scheduler/administration/professionals";
  return hasSchedulerCapability(req.schedulerAccess!, screen, "ADMIN");
}

router.get("/candidates", requireOperationsRead, async (req, res) => {
  try {
    const access = req.schedulerAccess!;
    const canReadProfessionals = hasSchedulerCapability(
      access,
      "scheduler/administration/professionals",
      "READ",
    );
    const canReadServices = hasSchedulerCapability(
      access,
      "scheduler/administration/services",
      "READ",
    );
    const canReadResources = hasSchedulerCapability(
      access,
      "scheduler/administration/resources",
      "READ",
    );
    const branchIds = access.authorizedBranches.map((branch) => branch.id);
    const employeeWhere: Prisma.EmpleadoWhereInput = access.selfProfessionalOnly
      ? { id: access.professionalEmployeeId ?? "__none__" }
      : access.role === "SUPER_ADMIN"
        ? {}
        : {
            OR: [
              { sucursalId: { in: branchIds } },
              { todasSucursales: true },
              ...(access.professionalEmployeeId
                ? [{ id: access.professionalEmployeeId }]
                : []),
            ],
          };
    const [branches, employees, services] = await Promise.all([
      prisma.sucursal.findMany({
        where: { id: { in: branchIds } },
        orderBy: [{ activa: "desc" }, { nombre: "asc" }],
        select: {
          id: true,
          nombre: true,
          activa: true,
          schedulerProfile: { select: { id: true, active: true } },
        },
      }),
      prisma.empleado.findMany({
        where: employeeWhere,
        orderBy: [{ activo: "desc" }, { nombreCompleto: "asc" }],
        select: {
          id: true,
          nombreCompleto: true,
          activo: true,
          sucursalId: true,
          todasSucursales: true,
          position: { select: { nombre: true } },
          schedulerProfessionalProfile: { select: { id: true, active: true } },
        },
      }),
      prisma.catalogItem.findMany({
        where: { kind: "SERVICE" },
        orderBy: [{ active: "desc" }, { name: "asc" }],
        select: {
          id: true,
          sku: true,
          name: true,
          active: true,
          published: true,
          schedulerServiceProfile: {
            select: { id: true, active: true, durationMinutes: true },
          },
        },
      }),
    ]);
    const data: SchedulerOperationalCandidatesDto = {
      branches: branches.map((row) => ({
        id: row.id,
        name: row.nombre,
        active: row.activa,
        profileId: row.schedulerProfile?.id ?? null,
        profileActive: row.schedulerProfile?.active ?? null,
      })),
      employees: canReadProfessionals
        ? employees.map((row) => ({
            id: row.id,
            name: row.nombreCompleto,
            active: row.activo,
            positionName: row.position?.nombre ?? null,
            branchId: row.sucursalId,
            allBranches: row.todasSucursales,
            profileId: row.schedulerProfessionalProfile?.id ?? null,
            profileActive: row.schedulerProfessionalProfile?.active ?? null,
          }))
        : [],
      services:
        canReadServices || canReadResources
          ? services.map((row) => ({
              id: row.id,
              sku: row.sku,
              name: row.name,
              active: row.active,
              published: row.published,
              profileId: row.schedulerServiceProfile?.id ?? null,
              profileActive: row.schedulerServiceProfile?.active ?? null,
              durationMinutes:
                row.schedulerServiceProfile?.durationMinutes ?? null,
            }))
          : [],
    };
    res.json({ success: true, message: "OK", data });
  } catch (error) {
    console.error("[scheduler.operations.candidates]", error);
    res
      .status(500)
      .json({
        success: false,
        message: "No fue posible cargar los candidatos",
        data: null,
      });
  }
});

router.get("/catalog", requireOperationsRead, async (req, res) => {
  try {
    const access = req.schedulerAccess!;
    const canReadLocals = hasSchedulerCapability(
      access,
      "scheduler/administration/locals",
      "READ",
    );
    const canReadProfessionals = hasSchedulerCapability(
      access,
      "scheduler/administration/professionals",
      "READ",
    );
    const canReadServices = hasSchedulerCapability(
      access,
      "scheduler/administration/services",
      "READ",
    );
    const canReadResources = hasSchedulerCapability(
      access,
      "scheduler/administration/resources",
      "READ",
    );
    const branchIds = access.authorizedBranches.map((branch) => branch.id);
    const professionalWhere: Prisma.SchedulerProfessionalProfileWhereInput =
      access.selfProfessionalOnly
        ? {
            employeeId: access.professionalEmployeeId ?? "__none__",
            branchAssignments: {
              some: { branchProfile: { branchId: { in: branchIds } } },
            },
          }
        : {
            branchAssignments: {
              some: { branchProfile: { branchId: { in: branchIds } } },
            },
          };
    const [
      branches,
      professionals,
      services,
      resources,
      specialties,
      groups,
      professionalServices,
      resourceRequirements,
      availabilityRules,
      availabilityExceptions,
    ] = await Promise.all([
      prisma.schedulerBranchProfile.findMany({
        where: { branchId: { in: branchIds } },
        include: { branch: { select: { nombre: true, activa: true } } },
        orderBy: { branch: { nombre: "asc" } },
      }),
      prisma.schedulerProfessionalProfile.findMany({
        where: professionalWhere,
        include: {
          employee: { select: { nombreCompleto: true, activo: true } },
          branchAssignments: {
            where: { active: true },
            select: { branchProfileId: true },
          },
          specialties: {
            where: { active: true },
            select: { specialtyId: true },
          },
        },
        orderBy: { employee: { nombreCompleto: "asc" } },
      }),
      prisma.schedulerServiceProfile.findMany({
        where: {
          branchAssignments: {
            some: { branchProfile: { branchId: { in: branchIds } } },
          },
        },
        include: {
          catalogItem: { select: { sku: true, name: true, active: true } },
          branchAssignments: {
            where: { active: true },
            select: { branchProfileId: true },
          },
        },
        orderBy: { catalogItem: { name: "asc" } },
      }),
      prisma.schedulerResource.findMany({
        where: { branchProfile: { branchId: { in: branchIds } } },
        orderBy: [{ branchProfileId: "asc" }, { name: "asc" }],
      }),
      prisma.schedulerSpecialty.findMany({
        where: {
          commerce: {
            branchProfiles: { some: { branchId: { in: branchIds } } },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.schedulerProfessionalGroup.findMany({
        where: { branchProfile: { branchId: { in: branchIds } } },
        include: {
          members: {
            where: { active: true },
            select: { professionalProfileId: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.schedulerProfessionalServiceAssignment.findMany({
        where: { branchProfile: { branchId: { in: branchIds } } },
      }),
      prisma.schedulerServiceResourceRequirement.findMany({
        where: { resource: { branchProfile: { branchId: { in: branchIds } } } },
      }),
      prisma.schedulerAvailabilityRule.findMany({
        where: { branchProfile: { branchId: { in: branchIds } }, active: true },
        orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
      }),
      prisma.schedulerAvailabilityException.findMany({
        where: { branchProfile: { branchId: { in: branchIds } }, active: true },
        orderBy: [{ date: "asc" }, { startMinute: "asc" }],
      }),
    ]);
    const commerceIds = uniqueSchedulerIds(
      branches.map((row) => row.commerceId),
    );
    const commerces = await prisma.schedulerCommerce.findMany({
      where: { id: { in: commerceIds } },
      orderBy: { name: "asc" },
    });
    const visibleProfessionalIds = new Set(professionals.map((row) => row.id));
    const visibleServiceIds = new Set(services.map((row) => row.id));
    const data: SchedulerOperationalCatalogDto = {
      commerces: canReadLocals
        ? commerces.map((row) => ({
            id: row.id,
            name: row.name,
            active: row.active,
            effectiveFrom: row.effectiveFrom.toISOString(),
            effectiveTo: row.effectiveTo?.toISOString() ?? null,
          }))
        : [],
      branches: branches.map((row) => ({
        id: row.id,
        branchId: row.branchId,
        branchName: row.branch.nombre,
        branchActive: row.branch.activa,
        commerceId: row.commerceId,
        timezone: row.timezone,
        bookingEnabled: row.bookingEnabled,
        active: row.active,
        effectiveFrom: row.effectiveFrom.toISOString(),
        effectiveTo: row.effectiveTo?.toISOString() ?? null,
        version: row.version,
      })),
      professionals: canReadProfessionals
        ? professionals.map((row) => ({
            id: row.id,
            employeeId: row.employeeId,
            name: row.employee.nombreCompleto,
            employeeActive: row.employee.activo,
            biography: row.biography,
            acceptsOnline: row.acceptsOnline,
            active: row.active,
            effectiveFrom: row.effectiveFrom.toISOString(),
            effectiveTo: row.effectiveTo?.toISOString() ?? null,
            version: row.version,
            branchProfileIds: row.branchAssignments.map(
              (item) => item.branchProfileId,
            ),
            specialtyIds: row.specialties.map((item) => item.specialtyId),
          }))
        : [],
      services:
        canReadServices || canReadResources
          ? services.map((row) => ({
              id: row.id,
              catalogItemId: row.catalogItemId,
              sku: row.catalogItem.sku,
              name: row.catalogItem.name,
              catalogActive: row.catalogItem.active,
              durationMinutes: row.durationMinutes,
              preparationMinutes: row.preparationMinutes,
              cleanupMinutes: row.cleanupMinutes,
              capacity: row.capacity,
              mode: row.mode,
              acceptsOnline: row.acceptsOnline,
              active: row.active,
              effectiveFrom: row.effectiveFrom.toISOString(),
              effectiveTo: row.effectiveTo?.toISOString() ?? null,
              version: row.version,
              branchProfileIds: row.branchAssignments.map(
                (item) => item.branchProfileId,
              ),
            }))
          : [],
      resources: canReadResources
        ? resources.map((row) => ({
            id: row.id,
            branchProfileId: row.branchProfileId,
            name: row.name,
            kind: row.kind,
            capacity: row.capacity,
            exclusive: row.exclusive,
            acceptsOnline: row.acceptsOnline,
            active: row.active,
            effectiveFrom: row.effectiveFrom.toISOString(),
            effectiveTo: row.effectiveTo?.toISOString() ?? null,
            version: row.version,
          }))
        : [],
      specialties: canReadProfessionals
        ? specialties.map((row) => ({
            id: row.id,
            commerceId: row.commerceId,
            name: row.name,
            active: row.active,
            effectiveFrom: row.effectiveFrom.toISOString(),
            effectiveTo: row.effectiveTo?.toISOString() ?? null,
          }))
        : [],
      groups: canReadProfessionals
        ? groups.map((row) => ({
            id: row.id,
            commerceId: row.commerceId,
            branchProfileId: row.branchProfileId,
            name: row.name,
            active: row.active,
            effectiveFrom: row.effectiveFrom.toISOString(),
            effectiveTo: row.effectiveTo?.toISOString() ?? null,
            professionalProfileIds: row.members
              .map((item) => item.professionalProfileId)
              .filter((profileId) => visibleProfessionalIds.has(profileId)),
          }))
        : [],
      professionalServices:
        canReadProfessionals && canReadServices
          ? professionalServices
              .filter(
                (row) =>
                  visibleProfessionalIds.has(row.professionalProfileId) &&
                  visibleServiceIds.has(row.serviceProfileId),
              )
              .map((row) => ({
                professionalProfileId: row.professionalProfileId,
                serviceProfileId: row.serviceProfileId,
                branchProfileId: row.branchProfileId,
                active: row.active,
                effectiveFrom: row.effectiveFrom.toISOString(),
                effectiveTo: row.effectiveTo?.toISOString() ?? null,
              }))
          : [],
      resourceRequirements: canReadResources
        ? resourceRequirements
            .filter((row) => visibleServiceIds.has(row.serviceProfileId))
            .map((row) => ({
              serviceProfileId: row.serviceProfileId,
              resourceId: row.resourceId,
              requiredUnits: row.requiredUnits,
              exclusive: row.exclusive,
              active: row.active,
              effectiveFrom: row.effectiveFrom.toISOString(),
              effectiveTo: row.effectiveTo?.toISOString() ?? null,
            }))
        : [],
      availabilityRules: availabilityRules
        .filter((row) =>
          row.professionalProfileId
            ? canReadProfessionals
            : row.resourceId
              ? canReadResources
              : canReadLocals,
        )
        .map((row) => ({
          id: row.id,
          branchProfileId: row.branchProfileId,
          ...schedulerAvailabilityOwner(row),
          kind: row.kind,
          weekday: row.weekday,
          startMinute: row.startMinute,
          endMinute: row.endMinute,
          effectiveFrom: row.effectiveFrom.toISOString(),
          effectiveTo: row.effectiveTo?.toISOString() ?? null,
        })),
      availabilityExceptions: availabilityExceptions
        .filter((row) =>
          row.professionalProfileId
            ? canReadProfessionals
            : row.resourceId
              ? canReadResources
              : canReadLocals,
        )
        .map((row) => ({
          id: row.id,
          branchProfileId: row.branchProfileId,
          ...schedulerAvailabilityOwner(row),
          kind: row.kind,
          date: row.date.toISOString().slice(0, 10),
          startMinute: row.startMinute,
          endMinute: row.endMinute,
          reason: row.reason,
          effectiveFrom: row.effectiveFrom.toISOString(),
          effectiveTo: row.effectiveTo?.toISOString() ?? null,
        })),
    };
    res.json({ success: true, message: "OK", data });
  } catch (error) {
    console.error("[scheduler.operations.catalog]", error);
    res
      .status(500)
      .json({
        success: false,
        message: "No fue posible cargar los catálogos operativos",
        data: null,
      });
  }
});

router.post(
  "/commerces",
  requireOperationsAdmin("scheduler/administration/locals"),
  async (req, res) => {
    const parsed = commerceSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa los datos del comercio",
        parsed.error.flatten().fieldErrors,
      );
    if (req.schedulerAccess!.role !== "SUPER_ADMIN")
      return void res
        .status(403)
        .json({
          success: false,
          message: "Sólo SUPER_ADMIN puede crear comercios",
          data: null,
        });
    try {
      const range = parseSchedulerEffectiveRange(parsed.data);
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx.schedulerCommerce.create({
          data: {
            name: parsed.data.name,
            normalizedName: normalizeSchedulerCatalogName(parsed.data.name),
            active: parsed.data.active,
            ...range,
            deactivatedAt: parsed.data.active ? null : new Date(),
          },
        });
        await audit(tx, {
          actorUserId: req.schedulerAccess!.userId,
          action: "SCHEDULER_COMMERCE_CREATE",
          targetType: "SchedulerCommerce",
          targetId: created.id,
        });
        return created;
      });
      res
        .status(201)
        .json({ success: true, message: "Comercio creado", data: row });
    } catch (error) {
      console.error("[scheduler.operations.commerce.create]", error);
      conflict(
        res,
        "No fue posible crear el comercio; revisa que el nombre no exista",
      );
    }
  },
);

router.put(
  "/commerces/:id",
  requireOperationsAdmin("scheduler/administration/locals"),
  async (req, res) => {
    const parsed = commerceSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa los datos del comercio",
        parsed.error.flatten().fieldErrors,
      );
    if (req.schedulerAccess!.role !== "SUPER_ADMIN")
      return void res
        .status(403)
        .json({
          success: false,
          message: "Sólo SUPER_ADMIN puede modificar comercios",
          data: null,
        });
    try {
      const range = parseSchedulerEffectiveRange(parsed.data);
      const row = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedulerCommerce.update({
          where: { id: req.params["id"] },
          data: {
            name: parsed.data.name,
            normalizedName: normalizeSchedulerCatalogName(parsed.data.name),
            active: parsed.data.active,
            ...range,
            deactivatedAt: parsed.data.active ? null : new Date(),
          },
        });
        await audit(tx, {
          actorUserId: req.schedulerAccess!.userId,
          action: "SCHEDULER_COMMERCE_UPDATE",
          targetType: "SchedulerCommerce",
          targetId: updated.id,
          metadata: { active: updated.active },
        });
        return updated;
      });
      res.json({ success: true, message: "Comercio actualizado", data: row });
    } catch (error) {
      console.error("[scheduler.operations.commerce.update]", error);
      conflict(res, "No fue posible actualizar el comercio");
    }
  },
);

router.put(
  "/branches/:branchId",
  requireOperationsAdmin("scheduler/administration/locals"),
  async (req, res) => {
    const parsed = branchProfileSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa el perfil de la sucursal",
        parsed.error.flatten().fieldErrors,
      );
    const branchId = req.params["branchId"]!;
    if (!hasSchedulerBranchAccess(req.schedulerAccess!, branchId))
      return void res
        .status(403)
        .json({
          success: false,
          message: "La sucursal está fuera de tu alcance",
          data: null,
        });
    if (!isValidIanaTimezone(parsed.data.timezone))
      return validationError(
        res,
        "La zona horaria debe ser un identificador IANA válido",
      );
    try {
      const [branch, commerce, existing] = await Promise.all([
        prisma.sucursal.findUnique({
          where: { id: branchId },
          select: { id: true, activa: true },
        }),
        prisma.schedulerCommerce.findUnique({
          where: { id: parsed.data.commerceId },
          select: { id: true, active: true },
        }),
        prisma.schedulerBranchProfile.findUnique({
          where: { branchId },
          select: {
            id: true,
            version: true,
            commerceId: true,
            _count: {
              select: {
                professionalAssignments: true,
                serviceAssignments: true,
                resources: true,
                groups: true,
              },
            },
          },
        }),
      ]);
      if (!branch || !commerce)
        return validationError(res, "La sucursal o el comercio no existen");
      if ((parsed.data.active || parsed.data.bookingEnabled) && !branch.activa)
        return validationError(
          res,
          "No puedes habilitar agenda en una sucursal canónica inactiva",
        );
      if (parsed.data.active && !commerce.active)
        return validationError(
          res,
          "No puedes activar una sucursal dentro de un comercio inactivo",
        );
      if (
        existing &&
        existing.commerceId !== parsed.data.commerceId &&
        Object.values(existing._count).some((count) => count > 0)
      )
        return validationError(
          res,
          "No puedes mover de comercio una sucursal que ya tiene configuración operativa",
        );
      if (existing && parsed.data.expectedVersion !== existing.version)
        return conflict(res, "El perfil cambió; recarga antes de guardar");
      if (parsed.data.bookingEnabled) {
        if (!existing)
          return validationError(
            res,
            "Guarda primero el perfil y configura horario, profesionales y servicios antes de habilitar reservas",
          );
        const [workingRules, professionals, services] = await Promise.all([
          prisma.schedulerAvailabilityRule.count({
            where: {
              branchProfileId: existing.id,
              professionalProfileId: null,
              resourceId: null,
              kind: "WORKING",
              active: true,
            },
          }),
          prisma.schedulerProfessionalBranchAssignment.count({
            where: {
              branchProfileId: existing.id,
              active: true,
              professionalProfile: { active: true },
            },
          }),
          prisma.schedulerServiceBranchAssignment.count({
            where: {
              branchProfileId: existing.id,
              active: true,
              serviceProfile: { active: true },
            },
          }),
        ]);
        if (!workingRules || !professionals || !services)
          return validationError(
            res,
            "Para habilitar reservas configura horario general, al menos un profesional y un servicio activos",
          );
      }
      const range = parseSchedulerEffectiveRange(parsed.data);
      const row = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedulerBranchProfile.upsert({
          where: { branchId },
          create: {
            branchId,
            commerceId: parsed.data.commerceId,
            timezone: parsed.data.timezone,
            bookingEnabled: parsed.data.bookingEnabled,
            active: parsed.data.active,
            ...range,
            deactivatedAt: parsed.data.active ? null : new Date(),
          },
          update: {
            commerceId: parsed.data.commerceId,
            timezone: parsed.data.timezone,
            bookingEnabled: parsed.data.bookingEnabled,
            active: parsed.data.active,
            ...range,
            deactivatedAt: parsed.data.active ? null : new Date(),
            version: { increment: 1 },
          },
        });
        await audit(tx, {
          actorUserId: req.schedulerAccess!.userId,
          action: "SCHEDULER_BRANCH_PROFILE_UPSERT",
          branchId,
          targetType: "SchedulerBranchProfile",
          targetId: updated.id,
          metadata: {
            active: updated.active,
            bookingEnabled: updated.bookingEnabled,
          },
        });
        return updated;
      });
      res.json({
        success: true,
        message: "Perfil de sucursal guardado",
        data: row,
      });
    } catch (error) {
      console.error("[scheduler.operations.branch]", error);
      res
        .status(500)
        .json({
          success: false,
          message: "No fue posible guardar el perfil de sucursal",
          data: null,
        });
    }
  },
);

router.put(
  "/professionals/:employeeId",
  requireOperationsAdmin("scheduler/administration/professionals"),
  async (req, res) => {
    const parsed = professionalSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa el perfil profesional",
        parsed.error.flatten().fieldErrors,
      );
    const branchProfiles = await authorizedBranchProfiles(
      req,
      parsed.data.branchProfileIds,
    );
    if (!branchProfiles)
      return validationError(
        res,
        "Una o más sucursales no existen o están fuera de tu alcance",
      );
    if (parsed.data.active && branchProfiles.some((row) => !row.active))
      return validationError(
        res,
        "Un profesional activo sólo puede asignarse a perfiles de sucursal activos",
      );
    try {
      const employeeId = req.params["employeeId"]!;
      if (
        req.schedulerAccess!.selfProfessionalOnly &&
        employeeId !== req.schedulerAccess!.professionalEmployeeId
      )
        return void res
          .status(403)
          .json({
            success: false,
            message: "Tu alcance está limitado al perfil profesional propio",
            data: null,
          });
      const [employee, existing, specialties] = await Promise.all([
        prisma.empleado.findUnique({
          where: { id: employeeId },
          select: {
            id: true,
            activo: true,
            sucursalId: true,
            todasSucursales: true,
          },
        }),
        prisma.schedulerProfessionalProfile.findUnique({
          where: { employeeId },
          select: {
            id: true,
            version: true,
            branchAssignments: {
              where: { active: true },
              select: { branchProfile: { select: { branchId: true } } },
            },
          },
        }),
        prisma.schedulerSpecialty.findMany({
          where: { id: { in: uniqueSchedulerIds(parsed.data.specialtyIds) } },
          select: { id: true, commerceId: true },
        }),
      ]);
      if (!employee) return validationError(res, "El empleado no existe");
      if (parsed.data.active && !employee.activo)
        return validationError(
          res,
          "No puedes activar un empleado inactivo como profesional",
        );
      if (
        req.schedulerAccess!.role !== "SUPER_ADMIN" &&
        !employee.todasSucursales &&
        employee.id !== req.schedulerAccess!.professionalEmployeeId &&
        (!employee.sucursalId ||
          !hasSchedulerBranchAccess(req.schedulerAccess!, employee.sucursalId))
      )
        return void res
          .status(403)
          .json({
            success: false,
            message: "El empleado está fuera de tu alcance",
            data: null,
          });
      if (
        req.schedulerAccess!.role !== "SUPER_ADMIN" &&
        existing?.branchAssignments.some(
          (assignment) =>
            !hasSchedulerBranchAccess(
              req.schedulerAccess!,
              assignment.branchProfile.branchId,
            ),
        )
      )
        return void res
          .status(403)
          .json({
            success: false,
            message:
              "El perfil también opera fuera de tu alcance; requiere un administrador con alcance completo",
            data: null,
          });
      if (existing && parsed.data.expectedVersion !== existing.version)
        return conflict(
          res,
          "El perfil profesional cambió; recarga antes de guardar",
        );
      const commerceIds = new Set(branchProfiles.map((row) => row.commerceId));
      if (
        specialties.length !==
          uniqueSchedulerIds(parsed.data.specialtyIds).length ||
        specialties.some((row) => !commerceIds.has(row.commerceId))
      )
        return validationError(
          res,
          "Una especialidad no pertenece al comercio de las sucursales seleccionadas",
        );
      const range = parseSchedulerEffectiveRange(parsed.data);
      const branchProfileScopeIds = await schedulerBranchProfileScopeIds(req);
      const profile = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedulerProfessionalProfile.upsert({
          where: { employeeId },
          create: {
            employeeId,
            biography: parsed.data.biography ?? null,
            acceptsOnline: parsed.data.acceptsOnline,
            active: parsed.data.active,
            ...range,
            deactivatedAt: parsed.data.active ? null : new Date(),
          },
          update: {
            biography: parsed.data.biography ?? null,
            acceptsOnline: parsed.data.acceptsOnline,
            active: parsed.data.active,
            ...range,
            deactivatedAt: parsed.data.active ? null : new Date(),
            version: { increment: 1 },
          },
        });
        const selectedBranches = uniqueSchedulerIds(
          parsed.data.branchProfileIds,
        );
        await tx.schedulerProfessionalBranchAssignment.updateMany({
          where: {
            professionalProfileId: updated.id,
            branchProfileId: {
              in: branchProfileScopeIds,
              ...(selectedBranches.length ? { notIn: selectedBranches } : {}),
            },
          },
          data: { active: false, deactivatedAt: new Date() },
        });
        for (const branchProfileId of selectedBranches)
          await tx.schedulerProfessionalBranchAssignment.upsert({
            where: {
              professionalProfileId_branchProfileId: {
                professionalProfileId: updated.id,
                branchProfileId,
              },
            },
            create: {
              professionalProfileId: updated.id,
              branchProfileId,
              active: true,
              effectiveFrom: range.effectiveFrom,
              effectiveTo: range.effectiveTo,
            },
            update: {
              active: true,
              effectiveFrom: range.effectiveFrom,
              effectiveTo: range.effectiveTo,
              deactivatedAt: null,
            },
          });
        const selectedSpecialties = uniqueSchedulerIds(
          parsed.data.specialtyIds,
        );
        await tx.schedulerProfessionalSpecialty.updateMany({
          where: {
            professionalProfileId: updated.id,
            specialty: { commerceId: { in: [...commerceIds] } },
            ...(selectedSpecialties.length
              ? { specialtyId: { notIn: selectedSpecialties } }
              : {}),
          },
          data: { active: false },
        });
        for (const specialtyId of selectedSpecialties)
          await tx.schedulerProfessionalSpecialty.upsert({
            where: {
              professionalProfileId_specialtyId: {
                professionalProfileId: updated.id,
                specialtyId,
              },
            },
            create: {
              professionalProfileId: updated.id,
              specialtyId,
              active: true,
              effectiveFrom: range.effectiveFrom,
              effectiveTo: range.effectiveTo,
            },
            update: {
              active: true,
              effectiveFrom: range.effectiveFrom,
              effectiveTo: range.effectiveTo,
            },
          });
        await audit(tx, {
          actorUserId: req.schedulerAccess!.userId,
          action: "SCHEDULER_PROFESSIONAL_PROFILE_UPSERT",
          targetType: "SchedulerProfessionalProfile",
          targetId: updated.id,
          metadata: {
            active: updated.active,
            branchProfileIds: selectedBranches,
            specialtyIds: selectedSpecialties,
          },
        });
        return updated;
      });
      res.json({
        success: true,
        message: "Perfil profesional guardado",
        data: profile,
      });
    } catch (error) {
      console.error("[scheduler.operations.professional]", error);
      res
        .status(500)
        .json({
          success: false,
          message: "No fue posible guardar el perfil profesional",
          data: null,
        });
    }
  },
);

router.put(
  "/services/:catalogItemId",
  requireOperationsAdmin("scheduler/administration/services"),
  async (req, res) => {
    const parsed = serviceSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa las reglas del servicio",
        parsed.error.flatten().fieldErrors,
      );
    const branchProfiles = await authorizedBranchProfiles(
      req,
      parsed.data.branchProfileIds,
    );
    if (!branchProfiles)
      return validationError(
        res,
        "Una o más sucursales no existen o están fuera de tu alcance",
      );
    if (parsed.data.active && branchProfiles.some((row) => !row.active))
      return validationError(
        res,
        "Un servicio activo sólo puede asignarse a perfiles de sucursal activos",
      );
    try {
      const catalogItemId = req.params["catalogItemId"]!;
      const [item, existing] = await Promise.all([
        prisma.catalogItem.findUnique({
          where: { id: catalogItemId },
          select: { id: true, kind: true, active: true },
        }),
        prisma.schedulerServiceProfile.findUnique({
          where: { catalogItemId },
          select: {
            id: true,
            version: true,
            branchAssignments: {
              where: { active: true },
              select: { branchProfile: { select: { branchId: true } } },
            },
          },
        }),
      ]);
      if (!item || item.kind !== "SERVICE")
        return validationError(
          res,
          "El elemento canónico no existe o no es un servicio",
        );
      if (parsed.data.active && !item.active)
        return validationError(
          res,
          "No puedes activar un servicio canónico inactivo",
        );
      if (
        req.schedulerAccess!.role !== "SUPER_ADMIN" &&
        existing?.branchAssignments.some(
          (assignment) =>
            !hasSchedulerBranchAccess(
              req.schedulerAccess!,
              assignment.branchProfile.branchId,
            ),
        )
      )
        return void res
          .status(403)
          .json({
            success: false,
            message:
              "El servicio también opera fuera de tu alcance; requiere un administrador con alcance completo",
            data: null,
          });
      if (existing && parsed.data.expectedVersion !== existing.version)
        return conflict(res, "El servicio cambió; recarga antes de guardar");
      const range = parseSchedulerEffectiveRange(parsed.data);
      const branchProfileScopeIds = await schedulerBranchProfileScopeIds(req);
      const profile = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedulerServiceProfile.upsert({
          where: { catalogItemId },
          create: {
            catalogItemId,
            durationMinutes: parsed.data.durationMinutes,
            preparationMinutes: parsed.data.preparationMinutes,
            cleanupMinutes: parsed.data.cleanupMinutes,
            capacity: parsed.data.capacity,
            mode: parsed.data.mode,
            acceptsOnline: parsed.data.acceptsOnline,
            active: parsed.data.active,
            ...range,
            deactivatedAt: parsed.data.active ? null : new Date(),
          },
          update: {
            durationMinutes: parsed.data.durationMinutes,
            preparationMinutes: parsed.data.preparationMinutes,
            cleanupMinutes: parsed.data.cleanupMinutes,
            capacity: parsed.data.capacity,
            mode: parsed.data.mode,
            acceptsOnline: parsed.data.acceptsOnline,
            active: parsed.data.active,
            ...range,
            deactivatedAt: parsed.data.active ? null : new Date(),
            version: { increment: 1 },
          },
        });
        const selected = uniqueSchedulerIds(parsed.data.branchProfileIds);
        await tx.schedulerServiceBranchAssignment.updateMany({
          where: {
            serviceProfileId: updated.id,
            branchProfileId: {
              in: branchProfileScopeIds,
              ...(selected.length ? { notIn: selected } : {}),
            },
          },
          data: { active: false, deactivatedAt: new Date() },
        });
        for (const branchProfileId of selected)
          await tx.schedulerServiceBranchAssignment.upsert({
            where: {
              serviceProfileId_branchProfileId: {
                serviceProfileId: updated.id,
                branchProfileId,
              },
            },
            create: {
              serviceProfileId: updated.id,
              branchProfileId,
              active: true,
              effectiveFrom: range.effectiveFrom,
              effectiveTo: range.effectiveTo,
            },
            update: {
              active: true,
              effectiveFrom: range.effectiveFrom,
              effectiveTo: range.effectiveTo,
              deactivatedAt: null,
            },
          });
        await audit(tx, {
          actorUserId: req.schedulerAccess!.userId,
          action: "SCHEDULER_SERVICE_PROFILE_UPSERT",
          targetType: "SchedulerServiceProfile",
          targetId: updated.id,
          metadata: { active: updated.active, branchProfileIds: selected },
        });
        return updated;
      });
      res.json({
        success: true,
        message: "Perfil de servicio guardado",
        data: profile,
      });
    } catch (error) {
      console.error("[scheduler.operations.service]", error);
      res
        .status(500)
        .json({
          success: false,
          message: "No fue posible guardar el perfil de servicio",
          data: null,
        });
    }
  },
);

async function saveResource(
  req: Request,
  res: Response,
  resourceId?: string,
): Promise<void> {
  const parsed = resourceSchema.safeParse(req.body);
  if (!parsed.success)
    return validationError(
      res,
      "Revisa el recurso",
      parsed.error.flatten().fieldErrors,
    );
  const branches = await authorizedBranchProfiles(req, [
    parsed.data.branchProfileId,
  ]);
  if (!branches)
    return validationError(
      res,
      "La sucursal no existe o está fuera de tu alcance",
    );
  if (parsed.data.active && !branches[0]!.active)
    return validationError(
      res,
      "No puedes activar un recurso en una sucursal inactiva",
    );
  try {
    const existing = resourceId
      ? await prisma.schedulerResource.findUnique({
          where: { id: resourceId },
          select: { version: true, branchProfileId: true },
        })
      : null;
    if (resourceId && !existing)
      return void res
        .status(404)
        .json({ success: false, message: "Recurso no encontrado", data: null });
    if (existing && existing.branchProfileId !== parsed.data.branchProfileId)
      return validationError(
        res,
        "Un recurso no puede moverse de sucursal; desactívalo y crea otro",
      );
    if (existing && parsed.data.expectedVersion !== existing.version)
      return conflict(res, "El recurso cambió; recarga antes de guardar");
    const range = parseSchedulerEffectiveRange(parsed.data);
    const row = await prisma.$transaction(async (tx) => {
      const values = {
        branchProfileId: parsed.data.branchProfileId,
        name: parsed.data.name,
        normalizedName: normalizeSchedulerCatalogName(parsed.data.name),
        kind: parsed.data.kind,
        capacity: parsed.data.capacity,
        exclusive: parsed.data.exclusive,
        acceptsOnline: parsed.data.acceptsOnline,
        active: parsed.data.active,
        ...range,
        deactivatedAt: parsed.data.active ? null : new Date(),
      };
      const saved = resourceId
        ? await tx.schedulerResource.update({
            where: { id: resourceId },
            data: { ...values, version: { increment: 1 } },
          })
        : await tx.schedulerResource.create({ data: values });
      await audit(tx, {
        actorUserId: req.schedulerAccess!.userId,
        action: resourceId
          ? "SCHEDULER_RESOURCE_UPDATE"
          : "SCHEDULER_RESOURCE_CREATE",
        branchId: branches[0]!.branchId,
        targetType: "SchedulerResource",
        targetId: saved.id,
        metadata: { active: saved.active, kind: saved.kind },
      });
      return saved;
    });
    res
      .status(resourceId ? 200 : 201)
      .json({ success: true, message: "Recurso guardado", data: row });
  } catch (error) {
    console.error("[scheduler.operations.resource]", error);
    conflict(
      res,
      "No fue posible guardar el recurso; revisa que el nombre no exista en la sucursal",
    );
  }
}

router.post(
  "/resources",
  requireOperationsAdmin("scheduler/administration/resources"),
  (req, res) => void saveResource(req, res),
);
router.put(
  "/resources/:id",
  requireOperationsAdmin("scheduler/administration/resources"),
  (req, res) => void saveResource(req, res, req.params["id"]),
);

async function saveNamedCatalog(
  req: Request,
  res: Response,
  kind: "specialty" | "group",
  recordId?: string,
): Promise<void> {
  const parsed = (
    kind === "specialty" ? specialtySchema : groupSchema
  ).safeParse(req.body);
  if (!parsed.success)
    return validationError(
      res,
      `Revisa ${kind === "specialty" ? "la especialidad" : "el grupo"}`,
      parsed.error.flatten().fieldErrors,
    );
  try {
    const commerce = await prisma.schedulerCommerce.findUnique({
      where: { id: parsed.data.commerceId },
      select: { id: true, branchProfiles: { select: { branchId: true } } },
    });
    if (!commerce) return validationError(res, "El comercio no existe");
    if (
      req.schedulerAccess!.role !== "SUPER_ADMIN" &&
      !commerce.branchProfiles.some((branch) =>
        hasSchedulerBranchAccess(req.schedulerAccess!, branch.branchId),
      )
    ) {
      return void res
        .status(403)
        .json({
          success: false,
          message: "El comercio está fuera de tu alcance",
          data: null,
        });
    }
    if (kind === "specialty") {
      if (recordId) {
        const current = await prisma.schedulerSpecialty.findUnique({
          where: { id: recordId },
          select: { commerceId: true },
        });
        if (!current)
          return void res
            .status(404)
            .json({
              success: false,
              message: "Especialidad no encontrada",
              data: null,
            });
        if (current.commerceId !== parsed.data.commerceId)
          return validationError(
            res,
            "Una especialidad no puede moverse de comercio",
          );
      }
      const values = {
        commerceId: parsed.data.commerceId,
        name: parsed.data.name,
        normalizedName: normalizeSchedulerCatalogName(parsed.data.name),
        active: parsed.data.active,
        ...parseSchedulerEffectiveRange(parsed.data),
        deactivatedAt: parsed.data.active ? null : new Date(),
      };
      const row = await prisma.$transaction(async (tx) => {
        const saved = recordId
          ? await tx.schedulerSpecialty.update({
              where: { id: recordId },
              data: values,
            })
          : await tx.schedulerSpecialty.create({ data: values });
        await audit(tx, {
          actorUserId: req.schedulerAccess!.userId,
          action: recordId
            ? "SCHEDULER_SPECIALTY_UPDATE"
            : "SCHEDULER_SPECIALTY_CREATE",
          targetType: "SchedulerSpecialty",
          targetId: saved.id,
          metadata: { active: saved.active },
        });
        return saved;
      });
      res
        .status(recordId ? 200 : 201)
        .json({ success: true, message: "Especialidad guardada", data: row });
      return;
    }
    const group = parsed.data as z.infer<typeof groupSchema>;
    if (recordId) {
      const current = await prisma.schedulerProfessionalGroup.findUnique({
        where: { id: recordId },
        select: { commerceId: true, branchProfileId: true },
      });
      if (!current)
        return void res
          .status(404)
          .json({ success: false, message: "Grupo no encontrado", data: null });
      if (
        current.commerceId !== group.commerceId ||
        current.branchProfileId !== group.branchProfileId
      )
        return validationError(
          res,
          "Un grupo no puede moverse de comercio o sucursal",
        );
    }
    const branches = await authorizedBranchProfiles(req, [
      group.branchProfileId,
    ]);
    if (!branches || branches[0]!.commerceId !== group.commerceId)
      return validationError(
        res,
        "La sucursal no pertenece al comercio o está fuera de tu alcance",
      );
    const memberIds = uniqueSchedulerIds(group.professionalProfileIds);
    const eligibleMembers =
      await prisma.schedulerProfessionalBranchAssignment.count({
        where: {
          professionalProfileId: { in: memberIds },
          branchProfileId: group.branchProfileId,
          active: true,
        },
      });
    if (eligibleMembers !== memberIds.length)
      return validationError(
        res,
        "Todos los integrantes deben estar asignados a la sucursal del grupo",
      );
    const values = {
      commerceId: group.commerceId,
      branchProfileId: group.branchProfileId,
      name: group.name,
      normalizedName: normalizeSchedulerCatalogName(group.name),
      active: group.active,
      ...parseSchedulerEffectiveRange(group),
      deactivatedAt: group.active ? null : new Date(),
    };
    const row = await prisma.$transaction(async (tx) => {
      const saved = recordId
        ? await tx.schedulerProfessionalGroup.update({
            where: { id: recordId },
            data: values,
          })
        : await tx.schedulerProfessionalGroup.create({ data: values });
      await tx.schedulerProfessionalGroupMember.updateMany({
        where: {
          groupId: saved.id,
          ...(memberIds.length
            ? { professionalProfileId: { notIn: memberIds } }
            : {}),
        },
        data: { active: false },
      });
      for (const professionalProfileId of memberIds)
        await tx.schedulerProfessionalGroupMember.upsert({
          where: {
            groupId_professionalProfileId: {
              groupId: saved.id,
              professionalProfileId,
            },
          },
          create: {
            groupId: saved.id,
            professionalProfileId,
            active: true,
            effectiveFrom: values.effectiveFrom,
            effectiveTo: values.effectiveTo,
          },
          update: {
            active: true,
            effectiveFrom: values.effectiveFrom,
            effectiveTo: values.effectiveTo,
          },
        });
      await audit(tx, {
        actorUserId: req.schedulerAccess!.userId,
        action: recordId ? "SCHEDULER_GROUP_UPDATE" : "SCHEDULER_GROUP_CREATE",
        branchId: branches[0]!.branchId,
        targetType: "SchedulerProfessionalGroup",
        targetId: saved.id,
        metadata: { active: saved.active, members: memberIds.length },
      });
      return saved;
    });
    res
      .status(recordId ? 200 : 201)
      .json({ success: true, message: "Grupo guardado", data: row });
  } catch (error) {
    console.error("[scheduler.operations.named-catalog]", error);
    conflict(
      res,
      "No fue posible guardar el registro; revisa que el nombre no exista",
    );
  }
}

router.post(
  "/specialties",
  requireOperationsAdmin("scheduler/administration/professionals"),
  (req, res) => void saveNamedCatalog(req, res, "specialty"),
);
router.put(
  "/specialties/:id",
  requireOperationsAdmin("scheduler/administration/professionals"),
  (req, res) => void saveNamedCatalog(req, res, "specialty", req.params["id"]),
);
router.post(
  "/groups",
  requireOperationsAdmin("scheduler/administration/professionals"),
  (req, res) => void saveNamedCatalog(req, res, "group"),
);
router.put(
  "/groups/:id",
  requireOperationsAdmin("scheduler/administration/professionals"),
  (req, res) => void saveNamedCatalog(req, res, "group", req.params["id"]),
);

router.put(
  "/professional-services",
  requireOperationsAdmin("scheduler/administration/professionals"),
  async (req, res) => {
    const parsed = professionalServiceSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa la compatibilidad profesional/servicio",
        parsed.error.flatten().fieldErrors,
      );
    const branches = await authorizedBranchProfiles(req, [
      parsed.data.branchProfileId,
    ]);
    if (!branches)
      return validationError(
        res,
        "La sucursal no existe o está fuera de tu alcance",
      );
    try {
      const [professionalBranch, serviceBranch] = await Promise.all([
        prisma.schedulerProfessionalBranchAssignment.findUnique({
          where: {
            professionalProfileId_branchProfileId: {
              professionalProfileId: parsed.data.professionalProfileId,
              branchProfileId: parsed.data.branchProfileId,
            },
          },
          select: { active: true },
        }),
        prisma.schedulerServiceBranchAssignment.findUnique({
          where: {
            serviceProfileId_branchProfileId: {
              serviceProfileId: parsed.data.serviceProfileId,
              branchProfileId: parsed.data.branchProfileId,
            },
          },
          select: { active: true },
        }),
      ]);
      if (!professionalBranch?.active || !serviceBranch?.active)
        return validationError(
          res,
          "El profesional y el servicio deben estar asignados a la sucursal",
        );
      const range = parseSchedulerEffectiveRange(parsed.data);
      const row = await prisma.$transaction(async (tx) => {
        const saved = await tx.schedulerProfessionalServiceAssignment.upsert({
          where: {
            professionalProfileId_serviceProfileId_branchProfileId: {
              professionalProfileId: parsed.data.professionalProfileId,
              serviceProfileId: parsed.data.serviceProfileId,
              branchProfileId: parsed.data.branchProfileId,
            },
          },
          create: { ...parsed.data, ...range },
          update: {
            active: parsed.data.active,
            ...range,
            deactivatedAt: parsed.data.active ? null : new Date(),
          },
        });
        await audit(tx, {
          actorUserId: req.schedulerAccess!.userId,
          action: "SCHEDULER_PROFESSIONAL_SERVICE_UPSERT",
          branchId: branches[0]!.branchId,
          targetType: "SchedulerProfessionalServiceAssignment",
          targetId: saved.id,
          metadata: { active: saved.active },
        });
        return saved;
      });
      res.json({
        success: true,
        message: "Compatibilidad guardada",
        data: row,
      });
    } catch (error) {
      console.error("[scheduler.operations.professional-service]", error);
      res
        .status(500)
        .json({
          success: false,
          message: "No fue posible guardar la compatibilidad",
          data: null,
        });
    }
  },
);

router.put(
  "/resource-requirements",
  requireOperationsAdmin("scheduler/administration/resources"),
  async (req, res) => {
    const parsed = resourceRequirementSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa el requisito de recurso",
        parsed.error.flatten().fieldErrors,
      );
    try {
      const resource = await prisma.schedulerResource.findUnique({
        where: { id: parsed.data.resourceId },
        select: {
          branchProfileId: true,
          capacity: true,
          branchProfile: { select: { branchId: true } },
        },
      });
      if (
        !resource ||
        !hasSchedulerBranchAccess(
          req.schedulerAccess!,
          resource.branchProfile.branchId,
        )
      )
        return void res
          .status(403)
          .json({
            success: false,
            message: "El recurso está fuera de tu alcance",
            data: null,
          });
      const serviceBranch =
        await prisma.schedulerServiceBranchAssignment.findUnique({
          where: {
            serviceProfileId_branchProfileId: {
              serviceProfileId: parsed.data.serviceProfileId,
              branchProfileId: resource.branchProfileId,
            },
          },
          select: { active: true },
        });
      if (!serviceBranch?.active)
        return validationError(
          res,
          "El servicio debe estar activo en la sucursal del recurso",
        );
      if (parsed.data.requiredUnits > resource.capacity)
        return validationError(
          res,
          "Las unidades requeridas exceden la capacidad del recurso",
        );
      const range = parseSchedulerEffectiveRange(parsed.data);
      const row = await prisma.$transaction(async (tx) => {
        const saved = await tx.schedulerServiceResourceRequirement.upsert({
          where: {
            serviceProfileId_resourceId: {
              serviceProfileId: parsed.data.serviceProfileId,
              resourceId: parsed.data.resourceId,
            },
          },
          create: { ...parsed.data, ...range },
          update: {
            requiredUnits: parsed.data.requiredUnits,
            exclusive: parsed.data.exclusive,
            active: parsed.data.active,
            ...range,
          },
        });
        await audit(tx, {
          actorUserId: req.schedulerAccess!.userId,
          action: "SCHEDULER_RESOURCE_REQUIREMENT_UPSERT",
          branchId: resource.branchProfile.branchId,
          targetType: "SchedulerServiceResourceRequirement",
          targetId: saved.id,
          metadata: {
            active: saved.active,
            requiredUnits: saved.requiredUnits,
          },
        });
        return saved;
      });
      res.json({
        success: true,
        message: "Requisito de recurso guardado",
        data: row,
      });
    } catch (error) {
      console.error("[scheduler.operations.resource-requirement]", error);
      res
        .status(500)
        .json({
          success: false,
          message: "No fue posible guardar el requisito",
          data: null,
        });
    }
  },
);

router.put("/availability/rules", requireOperationsRead, async (req, res) => {
  const parsed = availabilityRulesSchema.safeParse(req.body);
  if (!parsed.success)
    return validationError(
      res,
      "Revisa el horario recurrente",
      parsed.error.flatten().fieldErrors,
    );
  if (!canAdminAvailabilityOwner(req, parsed.data.ownerType))
    return void res
      .status(403)
      .json({
        success: false,
        message: "No tienes capacidad administrativa sobre este horario",
        data: null,
      });
  try {
    validateSchedulerAvailabilityRules(parsed.data.rules);
  } catch (error) {
    return validationError(
      res,
      error instanceof Error ? error.message : "Horario inválido",
    );
  }
  if (!(await ensureAvailabilityOwner(req, parsed.data)))
    return void res
      .status(403)
      .json({
        success: false,
        message:
          "El propietario del horario está fuera de tu alcance o sucursal",
        data: null,
      });
  try {
    const owner = schedulerAvailabilityOwnerFields(
      parsed.data.ownerType,
      parsed.data.ownerId,
    );
    const effectiveFrom = parsed.data.effectiveFrom
      ? new Date(parsed.data.effectiveFrom)
      : new Date();
    const rows = await prisma.$transaction(async (tx) => {
      await tx.schedulerAvailabilityRule.updateMany({
        where: {
          branchProfileId: parsed.data.branchProfileId,
          ...owner,
          active: true,
        },
        data: { active: false, effectiveTo: effectiveFrom },
      });
      const saved = [];
      for (const rule of parsed.data.rules)
        saved.push(
          await tx.schedulerAvailabilityRule.create({
            data: {
              branchProfileId: parsed.data.branchProfileId,
              ...owner,
              ...rule,
              active: true,
              effectiveFrom,
            },
          }),
        );
      const branch = await tx.schedulerBranchProfile.findUniqueOrThrow({
        where: { id: parsed.data.branchProfileId },
        select: { branchId: true },
      });
      await audit(tx, {
        actorUserId: req.schedulerAccess!.userId,
        action: "SCHEDULER_AVAILABILITY_RULES_REPLACE",
        branchId: branch.branchId,
        targetType: parsed.data.ownerType,
        targetId: parsed.data.ownerId,
        metadata: { rules: saved.length },
      });
      return saved;
    });
    res.json({
      success: true,
      message: "Horario recurrente guardado",
      data: rows,
    });
  } catch (error) {
    console.error("[scheduler.operations.availability.rules]", error);
    res
      .status(500)
      .json({
        success: false,
        message: "No fue posible guardar el horario",
        data: null,
      });
  }
});

router.put(
  "/availability/exceptions",
  requireOperationsRead,
  async (req, res) => {
    const parsed = availabilityExceptionsSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa las excepciones de horario",
        parsed.error.flatten().fieldErrors,
      );
    if (!canAdminAvailabilityOwner(req, parsed.data.ownerType))
      return void res
        .status(403)
        .json({
          success: false,
          message: "No tienes capacidad administrativa sobre estas excepciones",
          data: null,
        });
    if (!(await ensureAvailabilityOwner(req, parsed.data)))
      return void res
        .status(403)
        .json({
          success: false,
          message:
            "El propietario de las excepciones está fuera de tu alcance o sucursal",
          data: null,
        });
    try {
      const owner = schedulerAvailabilityOwnerFields(
        parsed.data.ownerType,
        parsed.data.ownerId,
      );
      const effectiveFrom = parsed.data.effectiveFrom
        ? new Date(parsed.data.effectiveFrom)
        : new Date();
      const rows = await prisma.$transaction(async (tx) => {
        await tx.schedulerAvailabilityException.updateMany({
          where: {
            branchProfileId: parsed.data.branchProfileId,
            ...owner,
            active: true,
          },
          data: { active: false, effectiveTo: effectiveFrom },
        });
        const saved = [];
        for (const exception of parsed.data.exceptions)
          saved.push(
            await tx.schedulerAvailabilityException.create({
              data: {
                branchProfileId: parsed.data.branchProfileId,
                ...owner,
                kind: exception.kind,
                date: new Date(`${exception.date}T00:00:00.000Z`),
                startMinute: exception.startMinute ?? null,
                endMinute: exception.endMinute ?? null,
                reason: exception.reason ?? null,
                active: true,
                effectiveFrom,
              },
            }),
          );
        const branch = await tx.schedulerBranchProfile.findUniqueOrThrow({
          where: { id: parsed.data.branchProfileId },
          select: { branchId: true },
        });
        await audit(tx, {
          actorUserId: req.schedulerAccess!.userId,
          action: "SCHEDULER_AVAILABILITY_EXCEPTIONS_REPLACE",
          branchId: branch.branchId,
          targetType: parsed.data.ownerType,
          targetId: parsed.data.ownerId,
          metadata: { exceptions: saved.length },
        });
        return saved;
      });
      res.json({ success: true, message: "Excepciones guardadas", data: rows });
    } catch (error) {
      console.error("[scheduler.operations.availability.exceptions]", error);
      res
        .status(500)
        .json({
          success: false,
          message: "No fue posible guardar las excepciones",
          data: null,
        });
    }
  },
);

export default router;
