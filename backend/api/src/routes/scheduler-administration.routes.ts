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
  SCHEDULER_APPOINTMENT_STATUSES,
  SCHEDULER_COMMISSION_MODES,
  SCHEDULER_COMMISSION_PERIODS,
  SCHEDULER_COMMISSION_TARGET_TYPES,
  SCHEDULER_GIFT_CARD_STATUSES,
  SCHEDULER_SETTING_SECTIONS,
  SCHEDULER_WEEKDAYS,
  type SchedulerAdministrationCatalogDto,
  type SchedulerCommissionPolicyDto,
  type SchedulerGiftCardTemplateDto,
  type SchedulerPackageProfileDto,
  type SchedulerPosReferencesDto,
  type SchedulerResolvedSettingDto,
  type SchedulerScreenKey,
  type SchedulerSettingSection,
} from "@cosmetics/types";
import { prisma } from "../prisma/client";
import {
  consumeSchedulerAuthorization,
  hasSchedulerBranchAccess,
  hasSchedulerCapability,
  resolveSchedulerAccessForRequest,
  type ResolvedSchedulerAccess,
} from "../services/scheduler-access";
import {
  assertSchedulerSettingHasNoSecrets,
  mergeSchedulerSettingDocuments,
  schedulerCommissionIdentityKey,
  schedulerSettingPrecedence,
  schedulerSettingScopeFields,
  validateSchedulerClassSchedules,
  validateSchedulerCommissionPolicy,
} from "../services/scheduler-administration";
import {
  normalizeSchedulerCatalogName,
  parseSchedulerEffectiveRange,
  uniqueSchedulerIds,
} from "../services/scheduler-operations";

const router: ExpressRouter = Router();
const id = z.string().trim().min(1).max(191);
const isoDate = z.string().datetime({ offset: true });
const money = z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/);
const percentage = z.string().regex(/^\d{1,3}(?:\.\d{1,4})?$/);
const effectiveRange = {
  effectiveFrom: isoDate.optional(),
  effectiveTo: isoDate.nullable().optional(),
};
const packageSchema = z
  .object({
    commerceId: id,
    acceptsOnline: z.boolean(),
    simultaneous: z.boolean(),
    sessions: z.number().int().min(1).max(1000),
    active: z.boolean(),
    ...effectiveRange,
    expectedVersion: z.number().int().positive().optional(),
    branchProfileIds: z.array(id).min(1),
    serviceLines: z
      .array(
        z
          .object({
            serviceProfileId: id,
            quantity: z.number().int().min(1).max(1000),
            priceOverride: money.nullable().optional(),
            sortOrder: z.number().int().min(0).max(10000),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
const addonSchema = z
  .object({
    commerceId: id,
    durationMinutes: z.number().int().min(0).max(1440),
    active: z.boolean(),
    ...effectiveRange,
    expectedVersion: z.number().int().positive().optional(),
    serviceProfileIds: z.array(id),
  })
  .strict();
const classScheduleSchema = z
  .object({
    effectiveFrom: isoDate.optional(),
    schedules: z.array(
      z
        .object({
          branchProfileId: id,
          professionalProfileId: id,
          weekday: z.enum(SCHEDULER_WEEKDAYS),
          startMinute: z.number().int(),
          endMinute: z.number().int(),
          capacity: z.number().int(),
        })
        .strict(),
    ),
  })
  .strict();
const commissionRuleSchema = z
  .object({
    mode: z.enum(SCHEDULER_COMMISSION_MODES),
    amount: money.nullable().optional(),
    percentage: percentage.nullable().optional(),
    tiers: z
      .array(
        z
          .object({
            fromAmount: money,
            toAmount: money.nullable(),
            percentage,
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
const commissionSchema = z
  .object({
    commerceId: id,
    targetType: z.enum(SCHEDULER_COMMISSION_TARGET_TYPES),
    targetId: id.nullable().optional(),
    period: z.enum(SCHEDULER_COMMISSION_PERIODS),
    active: z.boolean(),
    ...effectiveRange,
    expectedVersion: z.number().int().positive().optional(),
    rules: z.array(commissionRuleSchema).min(1).max(4),
  })
  .strict();
const giftCardSchema = z
  .object({
    commerceId: id,
    name: z.string().trim().min(1).max(160),
    type: z.enum(["SERVICE", "AMOUNT"]),
    amount: money.nullable().optional(),
    salePrice: money,
    validityDays: z.number().int().min(1).max(3650),
    description: z.string().trim().max(5000).nullable().optional(),
    designKey: z.string().trim().min(1).max(120),
    status: z.enum(SCHEDULER_GIFT_CARD_STATUSES),
    serviceProfileIds: z.array(id),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.type === "SERVICE" && value.serviceProfileIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serviceProfileIds"],
        message: "Una gift card de servicio requiere al menos un servicio",
      });
    }
    if (value.type === "SERVICE" && value.amount != null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Una gift card de servicio no acepta monto libre",
      });
    }
    if (
      value.type === "AMOUNT" &&
      (value.amount == null ||
        Number(value.amount) <= 0 ||
        value.serviceProfileIds.length > 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Una gift card de monto requiere monto y no acepta servicios",
      });
    }
  });
const statusColorsSchema = z
  .object({
    authorizationToken: z.string().min(32).max(128),
    expectedVersions: z.record(z.string(), z.number().int().positive()),
    colors: z
      .array(
        z
          .object({
            status: z.enum(SCHEDULER_APPOINTMENT_STATUSES),
            color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
const settingDocument = z
  .record(z.string(), z.unknown())
  .refine(
    (value) => Buffer.byteLength(JSON.stringify(value), "utf8") <= 65_536,
    {
      message: "La configuración no puede superar 64 KiB",
    },
  );
const settingSchema = z
  .object({
    scope: z.enum(["COMMERCE", "BRANCH", "USER"]),
    commerceId: id,
    branchProfileId: id.nullable().optional(),
    document: settingDocument,
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
const resolvedSettingQuery = z
  .object({
    commerceId: id,
    branchProfileId: id.optional(),
  })
  .strict();

const settingScreens: Record<SchedulerSettingSection, SchedulerScreenKey> = {
  company: "scheduler/settings/company",
  website: "scheduler/settings/website",
  agenda: "scheduler/settings/agenda",
  payments: "scheduler/settings/payments",
  reminders: "scheduler/settings/reminders",
  records: "scheduler/settings/records",
  emails: "scheduler/settings/emails",
  integrations: "scheduler/settings/integrations",
  notifications: "scheduler/settings/notifications",
  clients: "scheduler/settings/clients",
  surveys: "scheduler/settings/surveys",
};

function validationError(res: Response, message: string, data: unknown = null) {
  res.status(400).json({ success: false, message, data });
}

function conflict(res: Response, message: string) {
  res.status(409).json({ success: false, message, data: null });
}

function isConcurrentWrite(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  );
}

async function requireAnyAdministrationRead(
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
  const screens: SchedulerScreenKey[] = [
    "scheduler/administration/services",
    "scheduler/administration/professionals",
    "scheduler/administration/commissions",
    "scheduler/administration/resources",
    "scheduler/administration/gift-cards",
    "scheduler/administration/status-colors",
  ];
  if (
    !screens.some((screen) => hasSchedulerCapability(access, screen, "READ"))
  ) {
    res.status(403).json({
      success: false,
      message: "No tienes acceso a la administración de Scheduler",
      data: null,
    });
    return;
  }
  req.schedulerAccess = access;
  next();
}

function requireAdministrationCapability(
  screen: SchedulerScreenKey,
  capability: "READ" | "WRITE" | "ADMIN",
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
    if (!hasSchedulerCapability(access, screen, capability)) {
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

async function audit(
  tx: Prisma.TransactionClient,
  input: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    branchId?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await tx.auditLog.create({
    data: { application: "SCHEDULER", outcome: "SUCCESS", ...input },
  });
}

async function commerceScope(
  access: ResolvedSchedulerAccess,
  commerceId: string,
  complete: boolean,
): Promise<boolean> {
  if (access.role === "SUPER_ADMIN") {
    return Boolean(
      await prisma.schedulerCommerce.findUnique({
        where: { id: commerceId },
        select: { id: true },
      }),
    );
  }
  const profiles = await prisma.schedulerBranchProfile.findMany({
    where: { commerceId },
    select: { branchId: true },
  });
  if (!profiles.length) return false;
  const allowed = profiles.filter((profile) =>
    hasSchedulerBranchAccess(access, profile.branchId),
  );
  return complete ? allowed.length === profiles.length : allowed.length > 0;
}

async function authorizedBranchProfiles(
  access: ResolvedSchedulerAccess,
  profileIds: string[],
  commerceId?: string,
) {
  const uniqueIds = uniqueSchedulerIds(profileIds);
  const profiles = await prisma.schedulerBranchProfile.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, branchId: true, commerceId: true },
  });
  if (
    profiles.length !== uniqueIds.length ||
    profiles.some(
      (profile) =>
        !hasSchedulerBranchAccess(access, profile.branchId) ||
        (commerceId && profile.commerceId !== commerceId),
    )
  ) {
    return null;
  }
  return profiles;
}

function mapPackage(row: {
  id: string;
  posPackageId: string;
  commerceId: string;
  acceptsOnline: boolean;
  simultaneous: boolean;
  sessions: number;
  active: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  version: number;
  posPackage: {
    name: string;
    sku: string;
    price: Prisma.Decimal;
    status: "DRAFT" | "PUBLISHED" | "INACTIVE";
  };
  branchAssignments: Array<{ branchProfileId: string }>;
  serviceLines: Array<{
    serviceProfileId: string;
    quantity: number;
    priceOverride: Prisma.Decimal | null;
    sortOrder: number;
    serviceProfile: { catalogItem: { name: string } };
  }>;
}): SchedulerPackageProfileDto {
  return {
    id: row.id,
    posPackageId: row.posPackageId,
    commerceId: row.commerceId,
    name: row.posPackage.name,
    sku: row.posPackage.sku,
    price: row.posPackage.price.toFixed(2),
    posStatus: row.posPackage.status,
    acceptsOnline: row.acceptsOnline,
    simultaneous: row.simultaneous,
    sessions: row.sessions,
    active: row.active,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    version: row.version,
    branchProfileIds: row.branchAssignments.map((item) => item.branchProfileId),
    serviceLines: row.serviceLines.map((line) => ({
      serviceProfileId: line.serviceProfileId,
      serviceName: line.serviceProfile.catalogItem.name,
      quantity: line.quantity,
      priceOverride: line.priceOverride?.toFixed(2) ?? null,
      sortOrder: line.sortOrder,
    })),
  };
}

function mapCommission(row: {
  id: string;
  commerceId: string;
  targetType: "DEFAULT" | "PROFESSIONAL" | "CATALOG_ITEM";
  professionalProfileId: string | null;
  catalogItemId: string | null;
  active: boolean;
  currentVersion: number;
  professionalProfile: { employee: { nombreCompleto: string } } | null;
  catalogItem: { name: string } | null;
  versions: Array<{
    period: "DAY" | "WEEK" | "FORTNIGHT" | "MONTH";
    effectiveFrom: Date;
    effectiveTo: Date | null;
    rules: Array<{
      mode:
        | "APPOINTMENT"
        | "ATTENDED_APPOINTMENT"
        | "SALES_PERCENTAGE"
        | "BRANCH_SALES_TIER";
      amount: Prisma.Decimal | null;
      percentage: Prisma.Decimal | null;
      tiers: Array<{
        fromAmount: Prisma.Decimal;
        toAmount: Prisma.Decimal | null;
        percentage: Prisma.Decimal;
      }>;
    }>;
  }>;
}): SchedulerCommissionPolicyDto {
  const version = row.versions[0]!;
  return {
    id: row.id,
    commerceId: row.commerceId,
    targetType: row.targetType,
    targetId: row.professionalProfileId ?? row.catalogItemId,
    targetName:
      row.professionalProfile?.employee.nombreCompleto ??
      row.catalogItem?.name ??
      "Regla por defecto",
    active: row.active,
    currentVersion: row.currentVersion,
    period: version.period,
    effectiveFrom: version.effectiveFrom.toISOString(),
    effectiveTo: version.effectiveTo?.toISOString() ?? null,
    payrollAuthority: "PAYROLL",
    rules: version.rules.map((rule) => ({
      mode: rule.mode,
      amount: rule.amount?.toFixed(2) ?? null,
      percentage: rule.percentage?.toString() ?? null,
      tiers: rule.tiers.map((tier) => ({
        fromAmount: tier.fromAmount.toFixed(2),
        toAmount: tier.toAmount?.toFixed(2) ?? null,
        percentage: tier.percentage.toString(),
      })),
    })),
  };
}

router.get("/catalog", requireAnyAdministrationRead, async (req, res) => {
  try {
    const access = req.schedulerAccess!;
    const branchIds = access.authorizedBranches.map((branch) => branch.id);
    const branchProfiles = await prisma.schedulerBranchProfile.findMany({
      where: { branchId: { in: branchIds } },
      select: { id: true, commerceId: true },
    });
    const branchProfileIds = branchProfiles.map((profile) => profile.id);
    const commerceIds = uniqueSchedulerIds(
      branchProfiles.map((profile) => profile.commerceId),
    );
    const ownProfessional = access.selfProfessionalOnly
      ? await prisma.schedulerProfessionalProfile.findUnique({
          where: { employeeId: access.professionalEmployeeId ?? "__none__" },
          select: { id: true },
        })
      : null;
    const canReadServices = hasSchedulerCapability(
      access,
      "scheduler/administration/services",
      "READ",
    );
    const canReadCommissions = hasSchedulerCapability(
      access,
      "scheduler/administration/commissions",
      "READ",
    );
    const canReadGiftCards = hasSchedulerCapability(
      access,
      "scheduler/administration/gift-cards",
      "READ",
    );
    const canReadColors = hasSchedulerCapability(
      access,
      "scheduler/administration/status-colors",
      "READ",
    );
    const [packages, addons, classSchedules, policies, giftCards, colors] =
      await Promise.all([
        canReadServices
          ? prisma.schedulerPackageProfile.findMany({
              where: {
                commerceId: { in: commerceIds },
                branchAssignments: {
                  some: { branchProfileId: { in: branchProfileIds } },
                },
              },
              include: {
                posPackage: {
                  select: { name: true, sku: true, price: true, status: true },
                },
                branchAssignments: {
                  where: { branchProfileId: { in: branchProfileIds } },
                },
                serviceLines: {
                  include: {
                    serviceProfile: {
                      select: { catalogItem: { select: { name: true } } },
                    },
                  },
                  orderBy: { sortOrder: "asc" },
                },
              },
              orderBy: { posPackage: { name: "asc" } },
            })
          : [],
        canReadServices
          ? prisma.schedulerAddonProfile.findMany({
              where: { commerceId: { in: commerceIds } },
              include: {
                catalogItem: {
                  select: { name: true, sku: true, listPrice: true },
                },
                serviceAssignments: { where: { active: true } },
              },
              orderBy: { catalogItem: { name: "asc" } },
            })
          : [],
        canReadServices
          ? prisma.schedulerClassSchedule.findMany({
              where: {
                branchProfileId: { in: branchProfileIds },
                ...(ownProfessional
                  ? { professionalProfileId: ownProfessional.id }
                  : {}),
              },
              orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
            })
          : [],
        canReadCommissions
          ? prisma.schedulerCommissionPolicy.findMany({
              where: {
                commerceId: { in: commerceIds },
                ...(ownProfessional
                  ? {
                      OR: [
                        { targetType: "DEFAULT" },
                        { professionalProfileId: ownProfessional.id },
                      ],
                    }
                  : {}),
              },
              include: {
                professionalProfile: {
                  select: { employee: { select: { nombreCompleto: true } } },
                },
                catalogItem: { select: { name: true } },
                versions: {
                  where: { version: { gt: 0 } },
                  orderBy: { version: "desc" },
                  take: 1,
                  include: {
                    rules: {
                      orderBy: { sortOrder: "asc" },
                      include: { tiers: { orderBy: { sortOrder: "asc" } } },
                    },
                  },
                },
              },
              orderBy: { identityKey: "asc" },
            })
          : [],
        canReadGiftCards
          ? prisma.schedulerGiftCardTemplate.findMany({
              where: { commerceId: { in: commerceIds } },
              include: { services: { select: { serviceProfileId: true } } },
              orderBy: { name: "asc" },
            })
          : [],
        canReadColors
          ? prisma.schedulerStatusColor.findMany({
              where: { commerceId: { in: commerceIds } },
              orderBy: [{ commerceId: "asc" }, { status: "asc" }],
            })
          : [],
      ]);
    const data: SchedulerAdministrationCatalogDto = {
      packages: packages.map(mapPackage),
      addons: addons.map((row) => ({
        id: row.id,
        catalogItemId: row.catalogItemId,
        commerceId: row.commerceId,
        name: row.catalogItem.name,
        sku: row.catalogItem.sku,
        listPrice: row.catalogItem.listPrice.toFixed(2),
        durationMinutes: row.durationMinutes,
        active: row.active,
        effectiveFrom: row.effectiveFrom.toISOString(),
        effectiveTo: row.effectiveTo?.toISOString() ?? null,
        version: row.version,
        serviceProfileIds: row.serviceAssignments.map(
          (item) => item.serviceProfileId,
        ),
      })),
      classSchedules: classSchedules.map((row) => ({
        id: row.id,
        serviceProfileId: row.serviceProfileId,
        branchProfileId: row.branchProfileId,
        professionalProfileId: row.professionalProfileId,
        weekday: row.weekday,
        startMinute: row.startMinute,
        endMinute: row.endMinute,
        capacity: row.capacity,
        active: row.active,
        effectiveFrom: row.effectiveFrom.toISOString(),
        effectiveTo: row.effectiveTo?.toISOString() ?? null,
      })),
      commissionPolicies: policies
        .filter((row) => row.versions.length)
        .map(mapCommission),
      giftCards: giftCards.map(
        (row): SchedulerGiftCardTemplateDto => ({
          id: row.id,
          commerceId: row.commerceId,
          name: row.name,
          type: row.type,
          amount: row.amount?.toFixed(2) ?? null,
          salePrice: row.salePrice.toFixed(2),
          validityDays: row.validityDays,
          description: row.description,
          designKey: row.designKey,
          status: row.status,
          serviceProfileIds: row.services.map((item) => item.serviceProfileId),
          version: row.version,
        }),
      ),
      statusColors: commerceIds.map((commerceId) => ({
        commerceId,
        colors: colors
          .filter((row) => row.commerceId === commerceId)
          .map((row) => ({
            status: row.status,
            color: row.color,
            version: row.version,
          })),
      })),
    };
    res.json({ success: true, message: "OK", data });
  } catch (error) {
    console.error("[scheduler.administration.catalog]", error);
    res.status(500).json({
      success: false,
      message: "No fue posible cargar la administración de Scheduler",
      data: null,
    });
  }
});

router.put(
  "/packages/:posPackageId",
  requireAdministrationCapability("scheduler/administration/services", "ADMIN"),
  async (req, res) => {
    const parsed = packageSchema.safeParse(req.body);
    if (!parsed.success) {
      return validationError(
        res,
        "Revisa la configuración del paquete",
        parsed.error.flatten().fieldErrors,
      );
    }
    try {
      const access = req.schedulerAccess!;
      const input = parsed.data;
      if (!(await commerceScope(access, input.commerceId, true))) {
        return void res.status(403).json({
          success: false,
          message: "El comercio está fuera de tu alcance administrativo",
          data: null,
        });
      }
      const branchProfiles = await authorizedBranchProfiles(
        access,
        input.branchProfileIds,
        input.commerceId,
      );
      if (!branchProfiles)
        return validationError(
          res,
          "Las sucursales están fuera de tu alcance o comercio",
        );
      const lineIds = uniqueSchedulerIds(
        input.serviceLines.map((line) => line.serviceProfileId),
      );
      if (lineIds.length !== input.serviceLines.length)
        return validationError(
          res,
          "Los servicios del paquete no deben repetirse",
        );
      const [posPackage, services, existing] = await Promise.all([
        prisma.posPackage.findFirst({
          where: { id: req.params["posPackageId"], deletedAt: null },
          include: { lines: { select: { itemId: true } } },
        }),
        prisma.schedulerServiceProfile.findMany({
          where: { id: { in: lineIds } },
          select: {
            id: true,
            catalogItemId: true,
            branchAssignments: {
              where: {
                branchProfileId: { in: input.branchProfileIds },
                active: true,
              },
              select: { branchProfileId: true },
            },
          },
        }),
        prisma.schedulerPackageProfile.findUnique({
          where: { posPackageId: req.params["posPackageId"] },
          select: { id: true, version: true, commerceId: true },
        }),
      ]);
      if (
        existing &&
        existing.commerceId !== input.commerceId &&
        !(await commerceScope(access, existing.commerceId, true))
      ) {
        return void res.status(403).json({
          success: false,
          message: "El paquete pertenece a un comercio fuera de tu alcance",
          data: null,
        });
      }
      if (!posPackage || services.length !== lineIds.length)
        return validationError(
          res,
          "El paquete o alguno de sus servicios no existe",
        );
      const packageItemIds = new Set(
        posPackage.lines.map((line) => line.itemId),
      );
      if (
        services.some((service) => !packageItemIds.has(service.catalogItemId))
      ) {
        return validationError(
          res,
          "Scheduler sólo puede extender servicios incluidos en el paquete POS",
        );
      }
      if (
        services.some(
          (service) =>
            service.branchAssignments.length !== input.branchProfileIds.length,
        )
      ) {
        return validationError(
          res,
          "Cada servicio debe estar disponible en todas las sucursales del paquete",
        );
      }
      if (existing && input.expectedVersion !== existing.version)
        return conflict(
          res,
          "La configuración del paquete cambió; recarga e intenta de nuevo",
        );
      const range = parseSchedulerEffectiveRange(input);
      const row = await prisma.$transaction(async (tx) => {
        const profileData = {
          commerceId: input.commerceId,
          acceptsOnline: input.acceptsOnline,
          simultaneous: input.simultaneous,
          sessions: input.sessions,
          active: input.active,
          ...range,
          deactivatedAt: input.active ? null : new Date(),
        };
        let profile;
        if (existing) {
          const updated = await tx.schedulerPackageProfile.updateMany({
            where: { id: existing.id, version: existing.version },
            data: { ...profileData, version: { increment: 1 } },
          });
          if (updated.count !== 1) throw new Error("VERSION_CONFLICT");
          profile = await tx.schedulerPackageProfile.findUniqueOrThrow({
            where: { id: existing.id },
          });
        } else {
          profile = await tx.schedulerPackageProfile.create({
            data: {
              posPackageId: posPackage.id,
              ...profileData,
            },
          });
        }
        await tx.schedulerPackageBranchAssignment.deleteMany({
          where: { packageProfileId: profile.id },
        });
        await tx.schedulerPackageServiceLine.deleteMany({
          where: { packageProfileId: profile.id },
        });
        await tx.schedulerPackageBranchAssignment.createMany({
          data: input.branchProfileIds.map((branchProfileId) => ({
            packageProfileId: profile.id,
            branchProfileId,
          })),
        });
        await tx.schedulerPackageServiceLine.createMany({
          data: input.serviceLines.map((line) => ({
            packageProfileId: profile.id,
            serviceProfileId: line.serviceProfileId,
            quantity: line.quantity,
            priceOverride:
              line.priceOverride == null
                ? null
                : new Prisma.Decimal(line.priceOverride),
            sortOrder: line.sortOrder,
          })),
        });
        await audit(tx, {
          actorUserId: access.userId,
          action: existing
            ? "SCHEDULER_PACKAGE_UPDATE"
            : "SCHEDULER_PACKAGE_CREATE",
          targetType: "SchedulerPackageProfile",
          targetId: profile.id,
          metadata: { posPackageId: posPackage.id, version: profile.version },
        });
        return profile;
      });
      res
        .status(existing ? 200 : 201)
        .json({
          success: true,
          message: "Paquete guardado",
          data: { id: row.id, version: row.version },
        });
    } catch (error) {
      if (
        (error instanceof Error && error.message === "VERSION_CONFLICT") ||
        isConcurrentWrite(error)
      ) {
        return conflict(
          res,
          "La configuración del paquete cambió; recarga e intenta de nuevo",
        );
      }
      console.error("[scheduler.administration.package]", error);
      conflict(res, "No fue posible guardar el paquete");
    }
  },
);

router.put(
  "/addons/:catalogItemId",
  requireAdministrationCapability("scheduler/administration/services", "ADMIN"),
  async (req, res) => {
    const parsed = addonSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa el complemento",
        parsed.error.flatten().fieldErrors,
      );
    try {
      const access = req.schedulerAccess!;
      if (!(await commerceScope(access, parsed.data.commerceId, true))) {
        return void res
          .status(403)
          .json({
            success: false,
            message: "El comercio está fuera de tu alcance administrativo",
            data: null,
          });
      }
      const serviceIds = uniqueSchedulerIds(parsed.data.serviceProfileIds);
      if (serviceIds.length !== parsed.data.serviceProfileIds.length)
        return validationError(res, "Los servicios no deben repetirse");
      const [item, services, existing] = await Promise.all([
        prisma.catalogItem.findFirst({
          where: {
            id: req.params["catalogItemId"],
            deletedAt: null,
            kind: { in: ["PRODUCT", "SERVICE"] },
          },
          select: { id: true },
        }),
        prisma.schedulerServiceProfile.findMany({
          where: {
            id: { in: serviceIds },
            branchAssignments: {
              some: { branchProfile: { commerceId: parsed.data.commerceId } },
            },
          },
          select: { id: true },
        }),
        prisma.schedulerAddonProfile.findUnique({
          where: { catalogItemId: req.params["catalogItemId"] },
          select: { id: true, version: true, commerceId: true },
        }),
      ]);
      if (
        existing &&
        existing.commerceId !== parsed.data.commerceId &&
        !(await commerceScope(access, existing.commerceId, true))
      ) {
        return void res.status(403).json({
          success: false,
          message: "El complemento pertenece a un comercio fuera de tu alcance",
          data: null,
        });
      }
      if (!item || services.length !== serviceIds.length)
        return validationError(
          res,
          "El complemento o sus servicios no existen en el comercio",
        );
      if (existing && parsed.data.expectedVersion !== existing.version)
        return conflict(
          res,
          "El complemento cambió; recarga e intenta de nuevo",
        );
      const range = parseSchedulerEffectiveRange(parsed.data);
      const profile = await prisma.$transaction(async (tx) => {
        const profileData = {
          commerceId: parsed.data.commerceId,
          durationMinutes: parsed.data.durationMinutes,
          active: parsed.data.active,
          ...range,
          deactivatedAt: parsed.data.active ? null : new Date(),
        };
        let saved;
        if (existing) {
          const updated = await tx.schedulerAddonProfile.updateMany({
            where: { id: existing.id, version: existing.version },
            data: { ...profileData, version: { increment: 1 } },
          });
          if (updated.count !== 1) throw new Error("VERSION_CONFLICT");
          saved = await tx.schedulerAddonProfile.findUniqueOrThrow({
            where: { id: existing.id },
          });
        } else {
          saved = await tx.schedulerAddonProfile.create({
            data: {
              catalogItemId: item.id,
              ...profileData,
            },
          });
        }
        await tx.schedulerServiceAddonAssignment.deleteMany({
          where: { addonProfileId: saved.id },
        });
        if (serviceIds.length) {
          await tx.schedulerServiceAddonAssignment.createMany({
            data: serviceIds.map((serviceProfileId, sortOrder) => ({
              addonProfileId: saved.id,
              serviceProfileId,
              sortOrder,
            })),
          });
        }
        await audit(tx, {
          actorUserId: access.userId,
          action: existing
            ? "SCHEDULER_ADDON_UPDATE"
            : "SCHEDULER_ADDON_CREATE",
          targetType: "SchedulerAddonProfile",
          targetId: saved.id,
          metadata: { version: saved.version },
        });
        return saved;
      });
      res
        .status(existing ? 200 : 201)
        .json({
          success: true,
          message: "Complemento guardado",
          data: { id: profile.id, version: profile.version },
        });
    } catch (error) {
      if (
        (error instanceof Error && error.message === "VERSION_CONFLICT") ||
        isConcurrentWrite(error)
      ) {
        return conflict(
          res,
          "El complemento cambió; recarga e intenta de nuevo",
        );
      }
      console.error("[scheduler.administration.addon]", error);
      conflict(res, "No fue posible guardar el complemento");
    }
  },
);

router.put(
  "/classes/:serviceProfileId/schedules",
  requireAdministrationCapability("scheduler/administration/services", "ADMIN"),
  async (req, res) => {
    const parsed = classScheduleSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa los horarios de clase",
        parsed.error.flatten().fieldErrors,
      );
    try {
      validateSchedulerClassSchedules(parsed.data);
      const access = req.schedulerAccess!;
      const branchIds = uniqueSchedulerIds(
        parsed.data.schedules.map((item) => item.branchProfileId),
      );
      const branches = await authorizedBranchProfiles(access, branchIds);
      if (!branches)
        return validationError(res, "Alguna sucursal está fuera de tu alcance");
      const service = await prisma.schedulerServiceProfile.findUnique({
        where: { id: req.params["serviceProfileId"] },
        select: {
          id: true,
          mode: true,
          capacity: true,
          branchAssignments: {
            where: { active: true },
            select: {
              branchProfileId: true,
              branchProfile: { select: { branchId: true, commerceId: true } },
            },
          },
          classSchedules: {
            where: { active: true },
            select: { effectiveFrom: true },
            orderBy: { effectiveFrom: "desc" },
            take: 1,
          },
        },
      });
      if (!service || service.mode !== "CLASS")
        return validationError(
          res,
          "El servicio no es una clase activa de Scheduler",
        );
      if (
        service.branchAssignments.some(
          (assignment) =>
            !hasSchedulerBranchAccess(
              access,
              assignment.branchProfile.branchId,
            ),
        )
      ) {
        return void res.status(403).json({
          success: false,
          message:
            "La clase tiene sucursales fuera de tu alcance administrativo",
          data: null,
        });
      }
      const serviceBranchIds = new Set(
        service.branchAssignments.map(
          (assignment) => assignment.branchProfileId,
        ),
      );
      if (
        parsed.data.schedules.some(
          (schedule) => !serviceBranchIds.has(schedule.branchProfileId),
        )
      ) {
        return validationError(
          res,
          "Cada horario debe pertenecer a una sucursal activa de la clase",
        );
      }
      if (
        parsed.data.schedules.some((item) => item.capacity > service.capacity)
      ) {
        return validationError(
          res,
          "La capacidad del horario excede la capacidad de la clase",
        );
      }
      const professionalIds = uniqueSchedulerIds(
        parsed.data.schedules.map((item) => item.professionalProfileId),
      );
      const assignments =
        await prisma.schedulerProfessionalServiceAssignment.findMany({
          where: {
            serviceProfileId: service.id,
            professionalProfileId: { in: professionalIds },
            branchProfileId: { in: branchIds },
            active: true,
          },
          select: { professionalProfileId: true, branchProfileId: true },
        });
      const assignmentKeys = new Set(
        assignments.map(
          (item) => `${item.professionalProfileId}:${item.branchProfileId}`,
        ),
      );
      if (
        parsed.data.schedules.some(
          (item) =>
            !assignmentKeys.has(
              `${item.professionalProfileId}:${item.branchProfileId}`,
            ),
        )
      ) {
        return validationError(
          res,
          "Cada clase requiere un profesional habilitado para el servicio y sucursal",
        );
      }
      const effectiveFrom = parsed.data.effectiveFrom
        ? new Date(parsed.data.effectiveFrom)
        : new Date();
      if (
        service.classSchedules[0] &&
        effectiveFrom <= service.classSchedules[0].effectiveFrom
      ) {
        return validationError(
          res,
          "La nueva vigencia debe ser posterior al horario vigente",
        );
      }
      const otherClassSchedules = await prisma.schedulerClassSchedule.findMany({
        where: {
          serviceProfileId: { not: service.id },
          branchProfileId: { in: branchIds },
          professionalProfileId: { in: professionalIds },
          active: true,
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
        },
        select: {
          branchProfileId: true,
          professionalProfileId: true,
          weekday: true,
          startMinute: true,
          endMinute: true,
        },
      });
      if (
        parsed.data.schedules.some((schedule) =>
          otherClassSchedules.some(
            (existingSchedule) =>
              existingSchedule.branchProfileId === schedule.branchProfileId &&
              existingSchedule.professionalProfileId ===
                schedule.professionalProfileId &&
              existingSchedule.weekday === schedule.weekday &&
              schedule.startMinute < existingSchedule.endMinute &&
              existingSchedule.startMinute < schedule.endMinute,
          ),
        )
      ) {
        return conflict(
          res,
          "El profesional ya tiene otra clase en ese horario",
        );
      }
      const ids = await prisma.$transaction(
        async (tx) => {
          await tx.schedulerClassSchedule.updateMany({
            where: { serviceProfileId: service.id, active: true },
            data: {
              active: false,
              effectiveTo: effectiveFrom,
              deactivatedAt: new Date(),
            },
          });
          const rows = await Promise.all(
            parsed.data.schedules.map((item) =>
              tx.schedulerClassSchedule.create({
                data: { serviceProfileId: service.id, effectiveFrom, ...item },
              }),
            ),
          );
          await audit(tx, {
            actorUserId: access.userId,
            action: "SCHEDULER_CLASS_SCHEDULE_REPLACE",
            targetType: "SchedulerServiceProfile",
            targetId: service.id,
            metadata: { scheduleCount: rows.length },
          });
          return rows.map((row) => row.id);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      res.json({
        success: true,
        message: "Horarios de clase actualizados",
        data: { ids },
      });
    } catch (error) {
      if (isConcurrentWrite(error)) {
        return conflict(
          res,
          "Los horarios cambiaron; recarga e intenta de nuevo",
        );
      }
      console.error("[scheduler.administration.class-schedules]", error);
      validationError(
        res,
        error instanceof Error
          ? error.message
          : "No fue posible guardar los horarios",
      );
    }
  },
);

router.put(
  "/commission-policies",
  requireAdministrationCapability(
    "scheduler/administration/commissions",
    "ADMIN",
  ),
  async (req, res) => {
    const parsed = commissionSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa la política de comisión",
        parsed.error.flatten().fieldErrors,
      );
    try {
      validateSchedulerCommissionPolicy(parsed.data);
      const access = req.schedulerAccess!;
      if (!(await commerceScope(access, parsed.data.commerceId, true))) {
        return void res
          .status(403)
          .json({
            success: false,
            message: "El comercio está fuera de tu alcance administrativo",
            data: null,
          });
      }
      const identityKey = schedulerCommissionIdentityKey(parsed.data);
      const professional =
        parsed.data.targetType === "PROFESSIONAL"
          ? await prisma.schedulerProfessionalProfile.findFirst({
              where: {
                id: parsed.data.targetId ?? "__none__",
                branchAssignments: {
                  some: {
                    branchProfile: { commerceId: parsed.data.commerceId },
                  },
                },
              },
              select: { id: true },
            })
          : null;
      const item =
        parsed.data.targetType === "CATALOG_ITEM"
          ? await prisma.catalogItem.findFirst({
              where: {
                id: parsed.data.targetId ?? "__none__",
                deletedAt: null,
              },
              select: { id: true },
            })
          : null;
      if (
        (parsed.data.targetType === "PROFESSIONAL" && !professional) ||
        (parsed.data.targetType === "CATALOG_ITEM" && !item)
      ) {
        return validationError(
          res,
          "El objetivo de comisión no existe en el comercio",
        );
      }
      const existing = await prisma.schedulerCommissionPolicy.findUnique({
        where: { identityKey },
        select: {
          id: true,
          currentVersion: true,
          versions: {
            where: { version: { gt: 0 } },
            orderBy: { version: "desc" },
            take: 1,
            select: { effectiveFrom: true },
          },
        },
      });
      if (existing && parsed.data.expectedVersion !== existing.currentVersion) {
        return conflict(res, "La política cambió; recarga e intenta de nuevo");
      }
      const range = parseSchedulerEffectiveRange(parsed.data);
      if (
        existing?.versions[0] &&
        range.effectiveFrom <= existing.versions[0].effectiveFrom
      ) {
        return validationError(
          res,
          "La nueva vigencia debe ser posterior a la versión actual",
        );
      }
      const policy = await prisma.$transaction(
        async (tx) => {
          const nextVersion = existing ? existing.currentVersion + 1 : 1;
          let saved;
          if (existing) {
            const updated = await tx.schedulerCommissionPolicy.updateMany({
              where: {
                id: existing.id,
                currentVersion: existing.currentVersion,
              },
              data: {
                active: parsed.data.active,
                currentVersion: nextVersion,
              },
            });
            if (updated.count !== 1) throw new Error("VERSION_CONFLICT");
            saved = await tx.schedulerCommissionPolicy.findUniqueOrThrow({
              where: { id: existing.id },
            });
          } else {
            saved = await tx.schedulerCommissionPolicy.create({
              data: {
                commerceId: parsed.data.commerceId,
                identityKey,
                targetType: parsed.data.targetType,
                professionalProfileId: professional?.id,
                catalogItemId: item?.id,
                active: parsed.data.active,
              },
            });
          }
          if (existing) {
            await tx.schedulerCommissionPolicyVersion.updateMany({
              where: {
                policyId: saved.id,
                version: existing.currentVersion,
                effectiveTo: null,
              },
              data: { effectiveTo: range.effectiveFrom },
            });
          }
          await tx.schedulerCommissionPolicyVersion.create({
            data: {
              policyId: saved.id,
              version: nextVersion,
              period: parsed.data.period,
              active: parsed.data.active,
              ...range,
              createdByUserId: access.userId,
              rules: {
                create: parsed.data.rules.map((rule, sortOrder) => ({
                  mode: rule.mode,
                  amount:
                    rule.amount == null
                      ? null
                      : new Prisma.Decimal(rule.amount),
                  percentage:
                    rule.percentage == null
                      ? null
                      : new Prisma.Decimal(rule.percentage),
                  sortOrder,
                  tiers: {
                    create: (rule.tiers ?? []).map((tier, tierOrder) => ({
                      fromAmount: new Prisma.Decimal(tier.fromAmount),
                      toAmount:
                        tier.toAmount == null
                          ? null
                          : new Prisma.Decimal(tier.toAmount),
                      percentage: new Prisma.Decimal(tier.percentage),
                      sortOrder: tierOrder,
                    })),
                  },
                })),
              },
            },
          });
          await audit(tx, {
            actorUserId: access.userId,
            action: existing
              ? "SCHEDULER_COMMISSION_POLICY_VERSION"
              : "SCHEDULER_COMMISSION_POLICY_CREATE",
            targetType: "SchedulerCommissionPolicy",
            targetId: saved.id,
            metadata: { version: nextVersion, payrollAuthority: "PAYROLL" },
          });
          return { id: saved.id, version: nextVersion };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      res
        .status(existing ? 200 : 201)
        .json({
          success: true,
          message: "Política de comisión versionada",
          data: policy,
        });
    } catch (error) {
      if (
        (error instanceof Error && error.message === "VERSION_CONFLICT") ||
        isConcurrentWrite(error)
      ) {
        return conflict(res, "La política cambió; recarga e intenta de nuevo");
      }
      console.error("[scheduler.administration.commission]", error);
      validationError(
        res,
        error instanceof Error
          ? error.message
          : "No fue posible guardar la política",
      );
    }
  },
);

async function saveGiftCard(req: Request, res: Response, giftCardId?: string) {
  const parsed = giftCardSchema.safeParse(req.body);
  if (!parsed.success)
    return validationError(
      res,
      "Revisa la gift card",
      parsed.error.flatten().fieldErrors,
    );
  try {
    const access = req.schedulerAccess!;
    if (!(await commerceScope(access, parsed.data.commerceId, true))) {
      return void res
        .status(403)
        .json({
          success: false,
          message: "El comercio está fuera de tu alcance administrativo",
          data: null,
        });
    }
    const serviceIds = uniqueSchedulerIds(parsed.data.serviceProfileIds);
    if (serviceIds.length !== parsed.data.serviceProfileIds.length)
      return validationError(res, "Los servicios no deben repetirse");
    const [services, existing] = await Promise.all([
      prisma.schedulerServiceProfile.findMany({
        where: {
          id: { in: serviceIds },
          branchAssignments: {
            some: { branchProfile: { commerceId: parsed.data.commerceId } },
          },
        },
        select: { id: true },
      }),
      giftCardId
        ? prisma.schedulerGiftCardTemplate.findUnique({
            where: { id: giftCardId },
            select: { id: true, version: true, commerceId: true },
          })
        : null,
    ]);
    if (services.length !== serviceIds.length)
      return validationError(res, "Algún servicio no existe en el comercio");
    if (giftCardId && !existing)
      return void res
        .status(404)
        .json({
          success: false,
          message: "Gift card no encontrada",
          data: null,
        });
    if (
      existing &&
      existing.commerceId !== parsed.data.commerceId &&
      !(await commerceScope(access, existing.commerceId, true))
    ) {
      return void res.status(403).json({
        success: false,
        message: "La gift card pertenece a un comercio fuera de tu alcance",
        data: null,
      });
    }
    if (existing && parsed.data.expectedVersion !== existing.version)
      return conflict(res, "La gift card cambió; recarga e intenta de nuevo");
    const row = await prisma.$transaction(async (tx) => {
      const data = {
        commerceId: parsed.data.commerceId,
        name: parsed.data.name,
        normalizedName: normalizeSchedulerCatalogName(parsed.data.name),
        type: parsed.data.type,
        amount:
          parsed.data.amount == null
            ? null
            : new Prisma.Decimal(parsed.data.amount),
        salePrice: new Prisma.Decimal(parsed.data.salePrice),
        validityDays: parsed.data.validityDays,
        description: parsed.data.description ?? null,
        designKey: parsed.data.designKey,
        status: parsed.data.status,
      };
      let saved;
      if (existing) {
        const updated = await tx.schedulerGiftCardTemplate.updateMany({
          where: { id: existing.id, version: existing.version },
          data: { ...data, version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Error("VERSION_CONFLICT");
        saved = await tx.schedulerGiftCardTemplate.findUniqueOrThrow({
          where: { id: existing.id },
        });
      } else {
        saved = await tx.schedulerGiftCardTemplate.create({ data });
      }
      await tx.schedulerGiftCardService.deleteMany({
        where: { giftCardId: saved.id },
      });
      if (serviceIds.length) {
        await tx.schedulerGiftCardService.createMany({
          data: serviceIds.map((serviceProfileId) => ({
            giftCardId: saved.id,
            serviceProfileId,
          })),
        });
      }
      await audit(tx, {
        actorUserId: access.userId,
        action: existing
          ? "SCHEDULER_GIFT_CARD_UPDATE"
          : "SCHEDULER_GIFT_CARD_CREATE",
        targetType: "SchedulerGiftCardTemplate",
        targetId: saved.id,
        metadata: { version: saved.version, status: saved.status },
      });
      return saved;
    });
    res
      .status(existing ? 200 : 201)
      .json({
        success: true,
        message: "Gift card guardada",
        data: { id: row.id, version: row.version },
      });
  } catch (error) {
    if (
      (error instanceof Error && error.message === "VERSION_CONFLICT") ||
      isConcurrentWrite(error)
    ) {
      return conflict(res, "La gift card cambió; recarga e intenta de nuevo");
    }
    console.error("[scheduler.administration.gift-card]", error);
    conflict(
      res,
      "No fue posible guardar la gift card; revisa que el nombre sea único",
    );
  }
}

router.post(
  "/gift-cards",
  requireAdministrationCapability(
    "scheduler/administration/gift-cards",
    "ADMIN",
  ),
  (req, res) => saveGiftCard(req, res),
);
router.put(
  "/gift-cards/:id",
  requireAdministrationCapability(
    "scheduler/administration/gift-cards",
    "ADMIN",
  ),
  (req, res) => saveGiftCard(req, res, req.params["id"]),
);

router.put(
  "/status-colors/:commerceId",
  requireAdministrationCapability(
    "scheduler/administration/status-colors",
    "ADMIN",
  ),
  async (req, res) => {
    const parsed = statusColorsSchema.safeParse(req.body);
    if (!parsed.success)
      return validationError(
        res,
        "Revisa la paleta de estados",
        parsed.error.flatten().fieldErrors,
      );
    const commerceId = req.params["commerceId"]!;
    const statuses = uniqueSchedulerIds(
      parsed.data.colors.map((color) => color.status),
    );
    if (statuses.length !== parsed.data.colors.length)
      return validationError(res, "Los estados no deben repetirse");
    try {
      const access = req.schedulerAccess!;
      if (!(await commerceScope(access, commerceId, true))) {
        return void res
          .status(403)
          .json({
            success: false,
            message: "El comercio está fuera de tu alcance administrativo",
            data: null,
          });
      }
      const result = await prisma.$transaction(async (tx) => {
        const authorization = await consumeSchedulerAuthorization({
          token: parsed.data.authorizationToken,
          purpose: "STATUS_COLORS_CHANGE",
          actorUserId: access.userId,
          screenKey: "scheduler/administration/status-colors",
          targetType: "SchedulerCommerce",
          targetId: commerceId,
          tx,
        });
        if (!authorization) throw new Error("INVALID_AUTHORIZATION");
        const existing = await tx.schedulerStatusColor.findMany({
          where: {
            commerceId,
            status: { in: parsed.data.colors.map((color) => color.status) },
          },
        });
        for (const color of parsed.data.colors) {
          const current = existing.find((item) => item.status === color.status);
          const expected = parsed.data.expectedVersions[color.status];
          if (current && expected !== current.version)
            throw new Error("VERSION_CONFLICT");
          if (current) {
            const updated = await tx.schedulerStatusColor.updateMany({
              where: { id: current.id, version: current.version },
              data: {
                color: color.color.toUpperCase(),
                version: { increment: 1 },
              },
            });
            if (updated.count !== 1) throw new Error("VERSION_CONFLICT");
          } else {
            await tx.schedulerStatusColor.create({
              data: {
                commerceId,
                status: color.status,
                color: color.color.toUpperCase(),
              },
            });
          }
        }
        await audit(tx, {
          actorUserId: access.userId,
          action: "SCHEDULER_STATUS_COLORS_UPDATE",
          targetType: "SchedulerCommerce",
          targetId: commerceId,
          metadata: { statuses },
        });
        return tx.schedulerStatusColor.findMany({
          where: { commerceId },
          orderBy: { status: "asc" },
        });
      });
      res.json({
        success: true,
        message: "Colores actualizados",
        data: result.map((row) => ({
          status: row.status,
          color: row.color,
          version: row.version,
        })),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_AUTHORIZATION") {
        return void res
          .status(403)
          .json({
            success: false,
            message: "La autorización expiró o no corresponde al comercio",
            data: null,
          });
      }
      if (
        (error instanceof Error && error.message === "VERSION_CONFLICT") ||
        isConcurrentWrite(error)
      ) {
        return conflict(res, "La paleta cambió; recarga e intenta de nuevo");
      }
      console.error("[scheduler.administration.status-colors]", error);
      res
        .status(500)
        .json({
          success: false,
          message: "No fue posible guardar la paleta",
          data: null,
        });
    }
  },
);

router.get("/settings/:section/resolved", async (req, res) => {
  const section = SCHEDULER_SETTING_SECTIONS.find(
    (value) => value === req.params["section"],
  );
  const parsed = resolvedSettingQuery.safeParse(req.query);
  if (!section || !parsed.success)
    return validationError(res, "Consulta de configuración inválida");
  try {
    const access = await resolveSchedulerAccessForRequest(req);
    if (!access)
      return void res
        .status(401)
        .json({ success: false, message: "No autenticado", data: null });
    const screen = settingScreens[section];
    if (!hasSchedulerCapability(access, screen, "READ")) {
      return void res
        .status(403)
        .json({
          success: false,
          message: "No tienes acceso a esta configuración",
          data: null,
        });
    }
    if (!(await commerceScope(access, parsed.data.commerceId, false))) {
      return void res
        .status(403)
        .json({
          success: false,
          message: "El comercio está fuera de tu alcance",
          data: null,
        });
    }
    let branchProfileId: string | null = null;
    if (parsed.data.branchProfileId) {
      const branch = await prisma.schedulerBranchProfile.findUnique({
        where: { id: parsed.data.branchProfileId },
        select: { id: true, branchId: true, commerceId: true },
      });
      if (
        !branch ||
        branch.commerceId !== parsed.data.commerceId ||
        !hasSchedulerBranchAccess(access, branch.branchId)
      ) {
        return void res
          .status(403)
          .json({
            success: false,
            message: "La sucursal está fuera de tu alcance",
            data: null,
          });
      }
      branchProfileId = branch.id;
    }
    const rows = await prisma.schedulerSetting.findMany({
      where: {
        section,
        OR: [
          { scope: "COMMERCE", commerceId: parsed.data.commerceId },
          ...(branchProfileId
            ? [{ scope: "BRANCH" as const, branchProfileId }]
            : []),
          {
            scope: "USER",
            userId: access.userId,
            commerceId: parsed.data.commerceId,
          },
        ],
      },
    });
    const ordered = schedulerSettingPrecedence
      .map((scope) => rows.find((row) => row.scope === scope))
      .filter((row): row is (typeof rows)[number] => Boolean(row));
    const documents = ordered
      .map((row) => row.document)
      .filter(
        (document): document is Prisma.JsonObject =>
          Boolean(document) &&
          typeof document === "object" &&
          !Array.isArray(document),
      ) as Array<Record<string, unknown>>;
    const data: SchedulerResolvedSettingDto = {
      section,
      precedence: schedulerSettingPrecedence,
      document: mergeSchedulerSettingDocuments(...documents),
      layers: ordered.map((row) => ({
        scope: row.scope,
        scopeReferenceId: row.scopeReferenceId,
        version: row.version,
      })),
    };
    res.json({ success: true, message: "OK", data });
  } catch (error) {
    console.error("[scheduler.administration.settings.resolve]", error);
    res
      .status(500)
      .json({
        success: false,
        message: "No fue posible resolver la configuración",
        data: null,
      });
  }
});

router.put("/settings/:section", async (req, res) => {
  const section = SCHEDULER_SETTING_SECTIONS.find(
    (value) => value === req.params["section"],
  );
  const parsed = settingSchema.safeParse(req.body);
  if (!section || !parsed.success)
    return validationError(
      res,
      "Configuración inválida",
      parsed.success ? null : parsed.error.flatten().fieldErrors,
    );
  try {
    const access = await resolveSchedulerAccessForRequest(req);
    if (!access)
      return void res
        .status(401)
        .json({ success: false, message: "No autenticado", data: null });
    const screen = settingScreens[section];
    const capability = parsed.data.scope === "USER" ? "WRITE" : "ADMIN";
    if (!hasSchedulerCapability(access, screen, capability)) {
      return void res
        .status(403)
        .json({
          success: false,
          message: "No tienes capacidad para guardar esta configuración",
          data: null,
        });
    }
    assertSchedulerSettingHasNoSecrets(parsed.data.document);
    if (
      !(await commerceScope(
        access,
        parsed.data.commerceId,
        parsed.data.scope === "COMMERCE",
      ))
    ) {
      return void res
        .status(403)
        .json({
          success: false,
          message: "El comercio está fuera de tu alcance",
          data: null,
        });
    }
    if (parsed.data.scope === "BRANCH") {
      const branches = await authorizedBranchProfiles(
        access,
        [parsed.data.branchProfileId ?? "__none__"],
        parsed.data.commerceId,
      );
      if (!branches)
        return void res
          .status(403)
          .json({
            success: false,
            message: "La sucursal está fuera de tu alcance",
            data: null,
          });
    }
    const fields = schedulerSettingScopeFields({
      ...parsed.data,
      userId: access.userId,
    });
    const existing = await prisma.schedulerSetting.findUnique({
      where: {
        scope_scopeReferenceId_section: {
          scope: parsed.data.scope,
          scopeReferenceId: fields.scopeReferenceId,
          section,
        },
      },
      select: { id: true, version: true },
    });
    if (existing && parsed.data.expectedVersion !== existing.version)
      return conflict(
        res,
        "La configuración cambió; recarga e intenta de nuevo",
      );
    const safeDocument = JSON.parse(
      JSON.stringify(parsed.data.document),
    ) as Prisma.InputJsonObject;
    const saved = await prisma.$transaction(async (tx) => {
      let setting;
      if (existing) {
        const updated = await tx.schedulerSetting.updateMany({
          where: { id: existing.id, version: existing.version },
          data: {
            document: safeDocument,
            updatedByUserId: access.userId,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new Error("VERSION_CONFLICT");
        setting = await tx.schedulerSetting.findUniqueOrThrow({
          where: { id: existing.id },
        });
      } else {
        setting = await tx.schedulerSetting.create({
          data: {
            scope: parsed.data.scope,
            section,
            document: safeDocument,
            updatedByUserId: access.userId,
            ...fields,
          },
        });
      }
      await tx.schedulerSettingVersion.create({
        data: {
          settingId: setting.id,
          version: setting.version,
          document: safeDocument,
          createdByUserId: access.userId,
        },
      });
      await audit(tx, {
        actorUserId: access.userId,
        action: existing
          ? "SCHEDULER_SETTING_VERSION"
          : "SCHEDULER_SETTING_CREATE",
        targetType: "SchedulerSetting",
        targetId: setting.id,
        metadata: { scope: setting.scope, section, version: setting.version },
      });
      return setting;
    });
    res
      .status(existing ? 200 : 201)
      .json({
        success: true,
        message: "Configuración guardada",
        data: { id: saved.id, version: saved.version },
      });
  } catch (error) {
    if (
      (error instanceof Error && error.message === "VERSION_CONFLICT") ||
      isConcurrentWrite(error)
    ) {
      return conflict(
        res,
        "La configuración cambió; recarga e intenta de nuevo",
      );
    }
    if (error instanceof Error && error.message.includes("infraestructura"))
      return validationError(res, error.message);
    console.error("[scheduler.administration.settings.save]", error);
    conflict(res, "No fue posible guardar la configuración");
  }
});

router.get("/pos-references", async (req, res) => {
  const branchId =
    typeof req.query["branchId"] === "string"
      ? req.query["branchId"]
      : undefined;
  try {
    const access = await resolveSchedulerAccessForRequest(req);
    if (!access)
      return void res
        .status(401)
        .json({ success: false, message: "No autenticado", data: null });
    const canRead =
      hasSchedulerCapability(access, "scheduler/settings/payments", "READ") ||
      hasSchedulerCapability(
        access,
        "scheduler/administration/services",
        "READ",
      );
    if (!canRead)
      return void res
        .status(403)
        .json({
          success: false,
          message: "No tienes acceso a referencias comerciales",
          data: null,
        });
    if (branchId && !hasSchedulerBranchAccess(access, branchId)) {
      return void res
        .status(403)
        .json({
          success: false,
          message: "La sucursal está fuera de tu alcance",
          data: null,
        });
    }
    const [methods, tickets, policies, packages] = await Promise.all([
      prisma.metodoPago.findMany({
        where: {
          activo: true,
          OR: [{ posPolicy: null }, { posPolicy: { activeForPos: true } }],
        },
        include: { posPolicy: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.posTicketConfiguration.findMany({
        where: branchId
          ? { OR: [{ branchId: null }, { branchId }] }
          : { branchId: null },
        orderBy: { branchId: "asc" },
      }),
      prisma.posCourtesyPolicy.findMany({
        where: { active: true, deletedAt: null },
        orderBy: { name: "asc" },
      }),
      prisma.posPackage.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      }),
    ]);
    const data: SchedulerPosReferencesDto = {
      source: "POS",
      readOnly: true,
      paymentMethods: methods.map((method) => ({
        id: method.id,
        name: method.nombre,
        type: method.tipo,
        requiresReference: method.posPolicy?.requiresReference ?? false,
        referenceLabel: method.posPolicy?.referenceLabel ?? null,
        minAmount: method.posPolicy?.minAmount?.toFixed(2) ?? null,
        maxAmount: method.posPolicy?.maxAmount?.toFixed(2) ?? null,
      })),
      ticketConfigurations: tickets.map((ticket) => ({
        id: ticket.id,
        branchId: ticket.branchId,
        companyName: ticket.companyName,
        policies: ticket.policies,
        footerMessage: ticket.footerMessage,
        showVatBreakdown: ticket.showVatBreakdown,
      })),
      policies: policies.map((policy) => ({
        id: policy.id,
        name: policy.name,
        description: policy.description,
        requiresCustomer: policy.requiresCustomer,
        requiresAuthorization: policy.requiresAuthorization,
      })),
      packages: packages.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        price: item.price.toFixed(2),
        status: item.status,
      })),
    };
    res.json({ success: true, message: "OK", data });
  } catch (error) {
    console.error("[scheduler.administration.pos-references]", error);
    res
      .status(500)
      .json({
        success: false,
        message: "No fue posible cargar las referencias POS",
        data: null,
      });
  }
});

export default router;
