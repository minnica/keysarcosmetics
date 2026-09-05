import { Prisma } from "@prisma/client";
import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { z } from "zod";
import {
  SCHEDULER_CUSTOMER_CONTACT_PREFERENCES,
  SCHEDULER_CUSTOMER_FIELD_TYPES,
  type SchedulerAuthorizationPurpose,
  type SchedulerCustomerDetailDto,
  type SchedulerCustomerFieldDefinitionDto,
  type SchedulerCustomerFinancialHistoryDto,
  type SchedulerCustomerPageDto,
  type SchedulerCustomerSummaryDto,
  type SchedulerCustomerVisitHistoryDto,
} from "@cosmetics/types";
import { prisma } from "../prisma/client";
import {
  consumeSchedulerAuthorization,
  hasSchedulerBranchAccess,
  requireSchedulerCapability,
  writeSchedulerAudit,
} from "../services/scheduler-access";
import {
  assertMergeableExternalCustomerIds,
  findSchedulerCustomerPhoneDuplicate,
  lockSchedulerCustomerPhone,
  normalizeSchedulerCustomerEmail,
  normalizeSchedulerCustomerFieldKey,
  normalizeSchedulerCustomerName,
  normalizeSchedulerCustomerPhone,
  SchedulerCustomerError,
  schedulerCustomerScopeWhere,
  schedulerCustomerSnapshot,
  validateSchedulerCustomerFieldValue,
} from "../services/scheduler-customers";

const router: ExpressRouter = Router();
const id = z.string().trim().min(1).max(191);
const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  branchId: id.optional(),
});
const searchSchema = pageSchema
  .extend({ query: z.string().trim().min(2).max(120) })
  .strict();
const customerSchema = z
  .object({
    displayName: z.string().trim().min(2).max(240),
    phone: nullableText(32),
    email: z.string().trim().email().max(320).nullable().optional(),
    sourceId: id.nullable().optional(),
    branchId: id,
    notes: nullableText(4000),
    active: z.boolean().optional(),
    expectedVersion: z.number().int().positive().optional(),
    profile: z
      .object({
        preferredName: nullableText(240),
        preferredLocale: z.string().trim().min(2).max(24).optional(),
        contactPreference: z
          .enum(SCHEDULER_CUSTOMER_CONTACT_PREFERENCES)
          .optional(),
        notes: nullableText(4000),
      })
      .strict()
      .optional(),
    aliases: z.array(z.string().trim().min(2).max(240)).max(50).optional(),
    alternateEmails: z
      .array(z.string().trim().email().max(320))
      .max(50)
      .optional(),
    customFields: z
      .array(z.object({ definitionId: id, value: z.unknown() }).strict())
      .max(100)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!normalizeSchedulerCustomerName(value.displayName)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["displayName"],
        message: "El nombre debe contener letras o números",
      });
    }
    const phone = normalizeSchedulerCustomerPhone(value.phone);
    if (value.phone && (!phone || phone.length < 10 || phone.length > 15)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "El teléfono normalizado debe tener entre 10 y 15 dígitos",
      });
    }
    value.aliases?.forEach((alias, index) => {
      if (!normalizeSchedulerCustomerName(alias)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["aliases", index],
          message: "El alias debe contener letras o números",
        });
      }
    });
  });
const mergeSchema = z
  .object({
    sourceCustomerId: id,
    targetCustomerId: id,
    expectedSourceVersion: z.number().int().positive(),
    expectedTargetVersion: z.number().int().positive(),
    reason: z.string().trim().min(10).max(500),
    authorizationToken: z.string().min(32).max(128),
  })
  .strict()
  .refine((value) => value.sourceCustomerId !== value.targetCustomerId, {
    message: "El origen y el destino deben ser clientes distintos",
  });
const fieldDefinitionSchema = z
  .object({
    commerceId: id,
    key: z.string().trim().min(2).max(80),
    label: z.string().trim().min(2).max(160),
    type: z.enum(SCHEDULER_CUSTOMER_FIELD_TYPES),
    options: z
      .array(z.string().trim().min(1).max(160))
      .max(100)
      .nullable()
      .optional(),
    required: z.boolean().optional(),
    active: z.boolean().optional(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (normalizeSchedulerCustomerFieldKey(value.key).length < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["key"],
        message: "La clave debe contener letras o números",
      });
    }
    if (
      value.type === "SELECT" &&
      (!value.options || value.options.length === 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Un campo SELECT requiere opciones",
      });
    }
    if (value.type !== "SELECT" && value.options?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Sólo los campos SELECT aceptan opciones",
      });
    }
  });

function customerSummaryInclude(branchIds: string[]) {
  return {
    source: true,
    schedulerProfile: true,
    schedulerAliases: {
      where: { active: true },
      orderBy: { value: "asc" as const },
    },
    portfolios: {
      where: { branchId: { in: branchIds }, effectiveTo: null },
      include: {
        branch: { select: { nombre: true } },
        employee: { select: { nombreCompleto: true } },
        company: { select: { name: true } },
      },
      orderBy: { effectiveFrom: "desc" as const },
    },
  } satisfies Prisma.CustomerInclude;
}

type CustomerSummaryRow = Prisma.CustomerGetPayload<{
  include: ReturnType<typeof customerSummaryInclude>;
}>;

function toCustomerSummary(
  row: CustomerSummaryRow,
): SchedulerCustomerSummaryDto {
  return {
    id: row.id,
    displayName: row.displayName,
    preferredName: row.schedulerProfile?.preferredName ?? null,
    phone: row.phone,
    email: row.email,
    source: row.source
      ? {
          id: row.source.id,
          name: row.source.name,
          active: row.source.active,
          companyOwnedByDefault: row.source.companyOwnedByDefault,
        }
      : null,
    active: row.active,
    version: row.version,
    aliases: row.schedulerAliases
      .filter((alias) => alias.kind === "NAME")
      .map((alias) => alias.value),
    currentPortfolios: row.portfolios.map((portfolio) => ({
      id: portfolio.id,
      branchId: portfolio.branchId,
      branchName: portfolio.branch?.nombre ?? null,
      employeeId: portfolio.employeeId,
      ownerName:
        portfolio.ownerNameSnapshot ??
        portfolio.employee?.nombreCompleto ??
        portfolio.company?.name ??
        null,
      effectiveFrom: portfolio.effectiveFrom.toISOString(),
      effectiveTo: portfolio.effectiveTo?.toISOString() ?? null,
    })),
  };
}

function jsonOptions(value: Prisma.JsonValue | null): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

function toFieldDefinition(row: {
  id: string;
  commerceId: string;
  key: string;
  label: string;
  type: SchedulerCustomerFieldDefinitionDto["type"];
  options: Prisma.JsonValue | null;
  required: boolean;
  active: boolean;
  version: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}): SchedulerCustomerFieldDefinitionDto {
  return {
    ...row,
    options: jsonOptions(row.options),
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
  };
}

function sendCustomerError(
  res: Response,
  error: unknown,
  fallback: string,
): void {
  if (error instanceof SchedulerCustomerError) {
    res.status(error.status).json({
      success: false,
      message: error.message,
      data: { code: error.code },
    });
    return;
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    res.status(409).json({
      success: false,
      message: "La identidad ya está registrada en otro cliente",
      data: { code: "CUSTOMER_IDENTITY_CONFLICT" },
    });
    return;
  }
  console.error("[scheduler.customers]", error);
  res.status(500).json({ success: false, message: fallback, data: null });
}

async function consumeCustomerAuthorization(input: {
  req: Request;
  purpose: SchedulerAuthorizationPurpose;
  targetType: string;
  targetId: string;
  token?: string;
}): Promise<boolean> {
  const access = input.req.schedulerAccess!;
  const header = input.req.get("x-scheduler-authorization");
  const token = input.token ?? header;
  const consumed = token
    ? await consumeSchedulerAuthorization({
        token,
        purpose: input.purpose,
        actorUserId: access.userId,
        screenKey: "scheduler/clients",
        targetType: input.targetType,
        targetId: input.targetId,
      })
    : null;
  if (!consumed) {
    await writeSchedulerAudit({
      req: input.req,
      action: "SCHEDULER_CUSTOMER_AUTHORIZATION_CONSUME",
      outcome: "DENIED",
      actorUserId: access.userId,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: { purpose: input.purpose },
    });
  }
  return Boolean(consumed);
}

async function accessibleCommerceIds(req: Request): Promise<string[]> {
  const branchIds = req.schedulerAccess!.authorizedBranches.map(
    (branch) => branch.id,
  );
  return (
    await prisma.schedulerBranchProfile.findMany({
      where: { branchId: { in: branchIds } },
      distinct: ["commerceId"],
      select: { commerceId: true },
    })
  ).map((row) => row.commerceId);
}

async function validateCustomerInputReferences(
  req: Request,
  input: z.infer<typeof customerSchema>,
  existingCustomerId?: string,
): Promise<
  Array<{
    id: string;
    version: number;
    type: (typeof SCHEDULER_CUSTOMER_FIELD_TYPES)[number];
    options: Prisma.JsonValue | null;
  }>
> {
  if (!hasSchedulerBranchAccess(req.schedulerAccess!, input.branchId)) {
    throw new SchedulerCustomerError(
      "La sucursal está fuera de tu alcance",
      403,
      "BRANCH_FORBIDDEN",
    );
  }
  if (
    req.schedulerAccess!.selfProfessionalOnly &&
    !req.schedulerAccess!.professionalEmployeeId
  ) {
    throw new SchedulerCustomerError(
      "La cuenta no tiene un profesional propio para asignar la cartera",
      403,
      "PROFESSIONAL_SCOPE_UNAVAILABLE",
    );
  }
  const [branch, source] = await Promise.all([
    prisma.schedulerBranchProfile.findFirst({
      where: { branchId: input.branchId, active: true },
      select: { branchId: true, commerceId: true },
    }),
    input.sourceId
      ? prisma.customerSource.findFirst({
          where: { id: input.sourceId, active: true, deletedAt: null },
          select: { id: true },
        })
      : null,
  ]);
  if (!branch)
    throw new SchedulerCustomerError(
      "La sucursal no tiene un perfil activo",
      409,
      "BRANCH_NOT_CONFIGURED",
    );
  if (input.sourceId && !source)
    throw new SchedulerCustomerError(
      "La procedencia no existe o está inactiva",
    );
  const definitions = await prisma.schedulerCustomerFieldDefinition.findMany({
    where: {
      commerceId: branch.commerceId,
      active: true,
      effectiveTo: null,
    },
    select: {
      id: true,
      commerceId: true,
      version: true,
      type: true,
      options: true,
      required: true,
    },
  });
  const fieldIds = new Set(
    (input.customFields ?? []).map((field) => field.definitionId),
  );
  const submittedDefinitions = definitions.filter((definition) =>
    fieldIds.has(definition.id),
  );
  if (
    fieldIds.size !== (input.customFields ?? []).length ||
    submittedDefinitions.length !== fieldIds.size
  ) {
    throw new SchedulerCustomerError(
      "Uno o más campos personalizados no existen o están inactivos",
    );
  }
  const existingRequiredDefinitionIds = existingCustomerId
    ? new Set(
        (
          await prisma.schedulerCustomerFieldValue.findMany({
            where: {
              customerId: existingCustomerId,
              definitionId: {
                in: definitions
                  .filter((definition) => definition.required)
                  .map((definition) => definition.id),
              },
            },
            select: { definitionId: true },
          })
        ).map((field) => field.definitionId),
      )
    : new Set<string>();
  if (
    definitions.some(
      (definition) =>
        definition.required &&
        !fieldIds.has(definition.id) &&
        !existingRequiredDefinitionIds.has(definition.id),
    )
  ) {
    throw new SchedulerCustomerError(
      "Completa todos los campos personalizados obligatorios",
    );
  }
  for (const definition of submittedDefinitions) {
    const field = input.customFields!.find(
      (candidate) => candidate.definitionId === definition.id,
    )!;
    if (
      definition.commerceId !== branch.commerceId ||
      !validateSchedulerCustomerFieldValue(
        definition.type,
        field.value,
        definition.options,
      )
    ) {
      throw new SchedulerCustomerError(
        "El valor de un campo personalizado no coincide con su definición",
      );
    }
  }
  return submittedDefinitions;
}

async function replaceCustomerMetadata(
  tx: Prisma.TransactionClient,
  customerId: string,
  input: z.infer<typeof customerSchema>,
  definitions: Awaited<ReturnType<typeof validateCustomerInputReferences>>,
): Promise<void> {
  const primaryEmail = normalizeSchedulerCustomerEmail(input.email);
  const alternateEmails = [
    ...new Set(
      (input.alternateEmails ?? [])
        .map(normalizeSchedulerCustomerEmail)
        .filter((value): value is string => Boolean(value)),
    ),
  ].filter((email) => email !== primaryEmail);
  const aliases = [
    ...new Set(
      (input.aliases ?? [])
        .map((value) => ({
          value: value.trim(),
          normalizedValue: normalizeSchedulerCustomerName(value),
        }))
        .map((value) => JSON.stringify(value)),
    ),
  ].map(
    (value) => JSON.parse(value) as { value: string; normalizedValue: string },
  );

  await tx.schedulerCustomerProfile.upsert({
    where: { customerId },
    create: {
      customerId,
      preferredName: input.profile?.preferredName ?? null,
      preferredLocale: input.profile?.preferredLocale ?? "es-MX",
      contactPreference: input.profile?.contactPreference ?? "WHATSAPP",
      notes: input.profile?.notes ?? null,
    },
    update: {
      active: true,
      ...(input.profile
        ? {
            preferredName: input.profile.preferredName ?? null,
            preferredLocale: input.profile.preferredLocale ?? "es-MX",
            contactPreference: input.profile.contactPreference ?? "WHATSAPP",
            notes: input.profile.notes ?? null,
            version: { increment: 1 },
          }
        : {}),
    },
  });

  if (input.aliases !== undefined) {
    await tx.schedulerCustomerAlias.updateMany({
      where: { customerId, kind: "NAME" },
      data: { active: false },
    });
    for (const alias of aliases) {
      await tx.schedulerCustomerAlias.upsert({
        where: {
          customerId_kind_normalizedValue: {
            customerId,
            kind: "NAME",
            normalizedValue: alias.normalizedValue,
          },
        },
        create: { customerId, kind: "NAME", ...alias },
        update: { value: alias.value, active: true },
      });
    }
  }

  if (input.email !== undefined || input.alternateEmails !== undefined) {
    await tx.schedulerCustomerEmail.updateMany({
      where: { customerId },
      data: { active: false, isPrimary: false },
    });
    for (const email of [primaryEmail, ...alternateEmails].filter(
      (value): value is string => Boolean(value),
    )) {
      await tx.schedulerCustomerEmail.upsert({
        where: {
          customerId_normalizedEmail: { customerId, normalizedEmail: email },
        },
        create: {
          customerId,
          email,
          normalizedEmail: email,
          isPrimary: email === primaryEmail,
        },
        update: { email, active: true, isPrimary: email === primaryEmail },
      });
    }
  }

  for (const field of input.customFields ?? []) {
    const definition = definitions.find(
      (item) => item.id === field.definitionId,
    )!;
    await tx.schedulerCustomerFieldValue.upsert({
      where: {
        customerId_definitionId: {
          customerId,
          definitionId: field.definitionId,
        },
      },
      create: {
        customerId,
        definitionId: field.definitionId,
        definitionVersionSnapshot: definition.version,
        value: field.value as Prisma.InputJsonValue,
      },
      update: {
        definitionVersionSnapshot: definition.version,
        value: field.value as Prisma.InputJsonValue,
      },
    });
  }
}

router.get(
  "/search",
  requireSchedulerCapability("scheduler/clients", "READ"),
  async (req, res) => {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Indica al menos dos caracteres para buscar",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const access = req.schedulerAccess!;
    if (
      parsed.data.branchId &&
      !hasSchedulerBranchAccess(access, parsed.data.branchId)
    ) {
      res.status(403).json({
        success: false,
        message: "La sucursal está fuera de tu alcance",
        data: null,
      });
      return;
    }
    const needle = normalizeSchedulerCustomerName(parsed.data.query);
    const phone = normalizeSchedulerCustomerPhone(parsed.data.query);
    const email = normalizeSchedulerCustomerEmail(parsed.data.query)!;
    const branchIds = parsed.data.branchId
      ? [parsed.data.branchId]
      : access.authorizedBranches.map((branch) => branch.id);
    const where: Prisma.CustomerWhereInput = {
      AND: [
        { active: true, deletedAt: null },
        schedulerCustomerScopeWhere(access, parsed.data.branchId),
        {
          OR: [
            { normalizedName: { contains: needle, mode: "insensitive" } },
            { email: { contains: email, mode: "insensitive" } },
            ...(phone
              ? [
                  { phoneNormalized: { contains: phone } },
                  { phone: { contains: phone } },
                  {
                    schedulerAliases: {
                      some: {
                        kind: "PHONE" as const,
                        normalizedValue: { contains: phone },
                        active: true,
                      },
                    },
                  },
                ]
              : []),
            {
              schedulerAliases: {
                some: {
                  kind: "NAME",
                  normalizedValue: { contains: needle },
                  active: true,
                },
              },
            },
            {
              schedulerEmails: {
                some: { normalizedEmail: { contains: email }, active: true },
              },
            },
          ],
        },
      ],
    };
    try {
      const [items, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          include: customerSummaryInclude(branchIds),
          orderBy: [{ displayName: "asc" }, { id: "asc" }],
          skip: (parsed.data.page - 1) * parsed.data.pageSize,
          take: parsed.data.pageSize,
        }),
        prisma.customer.count({ where }),
      ]);
      const data: SchedulerCustomerPageDto = {
        items: items.map(toCustomerSummary),
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total,
      };
      res.json({ success: true, message: "OK", data });
    } catch (error) {
      sendCustomerError(res, error, "No fue posible buscar clientes");
    }
  },
);

router.get(
  "/sources",
  requireSchedulerCapability("scheduler/clients", "READ"),
  async (_req, res) => {
    try {
      const data = await prisma.customerSource.findMany({
        where: { deletedAt: null },
        orderBy: [{ active: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          active: true,
          companyOwnedByDefault: true,
        },
      });
      res.json({ success: true, message: "OK", data });
    } catch (error) {
      sendCustomerError(res, error, "No fue posible cargar las procedencias");
    }
  },
);

router.get(
  "/field-definitions",
  requireSchedulerCapability("scheduler/clients", "READ"),
  async (req, res) => {
    try {
      const commerceIds = await accessibleCommerceIds(req);
      const rows = await prisma.schedulerCustomerFieldDefinition.findMany({
        where: {
          commerceId: { in: commerceIds },
          active: true,
          effectiveTo: null,
        },
        orderBy: [{ commerceId: "asc" }, { label: "asc" }, { version: "desc" }],
      });
      res.json({
        success: true,
        message: "OK",
        data: rows.map(toFieldDefinition),
      });
    } catch (error) {
      sendCustomerError(
        res,
        error,
        "No fue posible cargar los campos de cliente",
      );
    }
  },
);

router.post(
  "/field-definitions",
  requireSchedulerCapability("scheduler/settings/clients", "ADMIN"),
  async (req, res) => {
    const parsed = fieldDefinitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Revisa la definición del campo",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    try {
      const commerceIds = await accessibleCommerceIds(req);
      if (!commerceIds.includes(parsed.data.commerceId))
        throw new SchedulerCustomerError(
          "El comercio está fuera de tu alcance",
          403,
        );
      const normalizedKey = normalizeSchedulerCustomerFieldKey(parsed.data.key);
      const created = await prisma.$transaction(async (tx) => {
        const existing = await tx.schedulerCustomerFieldDefinition.findFirst({
          where: {
            commerceId: parsed.data.commerceId,
            normalizedKey,
            effectiveTo: null,
          },
        });
        if (existing)
          throw new SchedulerCustomerError(
            "Ya existe un campo vigente con esa clave",
            409,
          );
        const row = await tx.schedulerCustomerFieldDefinition.create({
          data: {
            commerceId: parsed.data.commerceId,
            key: parsed.data.key,
            normalizedKey,
            label: parsed.data.label,
            type: parsed.data.type,
            options: parsed.data.options ?? Prisma.DbNull,
            required: parsed.data.required ?? false,
            active: parsed.data.active ?? true,
          },
        });
        await tx.auditLog.create({
          data: {
            application: "SCHEDULER",
            action: "SCHEDULER_CUSTOMER_FIELD_CREATE",
            outcome: "SUCCESS",
            actorUserId: req.schedulerAccess!.userId,
            targetType: "SchedulerCustomerFieldDefinition",
            targetId: row.id,
            metadata: {
              commerceId: row.commerceId,
              key: row.normalizedKey,
              version: row.version,
            },
          },
        });
        return row;
      });
      res.status(201).json({
        success: true,
        message: "Campo de cliente creado",
        data: toFieldDefinition(created),
      });
    } catch (error) {
      sendCustomerError(res, error, "No fue posible crear el campo");
    }
  },
);

router.put(
  "/field-definitions/:id",
  requireSchedulerCapability("scheduler/settings/clients", "ADMIN"),
  async (req, res) => {
    const parsed = fieldDefinitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Revisa la definición del campo",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    try {
      const commerceIds = await accessibleCommerceIds(req);
      const created = await prisma.$transaction(async (tx) => {
        const previous = await tx.schedulerCustomerFieldDefinition.findUnique({
          where: { id: req.params["id"]! },
        });
        if (
          !previous ||
          previous.effectiveTo !== null ||
          !commerceIds.includes(previous.commerceId) ||
          parsed.data.commerceId !== previous.commerceId
        ) {
          throw new SchedulerCustomerError(
            "Campo no encontrado o fuera de alcance",
            404,
          );
        }
        if (parsed.data.expectedVersion !== previous.version)
          throw new SchedulerCustomerError(
            "El campo cambió; recarga antes de guardar",
            409,
            "VERSION_CONFLICT",
          );
        const now = new Date();
        await tx.schedulerCustomerFieldDefinition.update({
          where: { id: previous.id },
          data: { active: false, effectiveTo: now },
        });
        const row = await tx.schedulerCustomerFieldDefinition.create({
          data: {
            commerceId: previous.commerceId,
            key: parsed.data.key,
            normalizedKey: normalizeSchedulerCustomerFieldKey(parsed.data.key),
            label: parsed.data.label,
            type: parsed.data.type,
            options: parsed.data.options ?? Prisma.DbNull,
            required: parsed.data.required ?? false,
            active: parsed.data.active ?? true,
            version: previous.version + 1,
            effectiveFrom: now,
          },
        });
        await tx.auditLog.create({
          data: {
            application: "SCHEDULER",
            action: "SCHEDULER_CUSTOMER_FIELD_VERSION_CREATE",
            outcome: "SUCCESS",
            actorUserId: req.schedulerAccess!.userId,
            targetType: "SchedulerCustomerFieldDefinition",
            targetId: row.id,
            metadata: {
              previousId: previous.id,
              commerceId: row.commerceId,
              key: row.normalizedKey,
              version: row.version,
            },
          },
        });
        return row;
      });
      res.json({
        success: true,
        message: "Nueva versión del campo creada",
        data: toFieldDefinition(created),
      });
    } catch (error) {
      sendCustomerError(res, error, "No fue posible versionar el campo");
    }
  },
);

router.post(
  "/",
  requireSchedulerCapability("scheduler/clients", "WRITE"),
  async (req, res) => {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Revisa los datos del cliente",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    try {
      const definitions = await validateCustomerInputReferences(
        req,
        parsed.data,
      );
      const phoneNormalized = normalizeSchedulerCustomerPhone(
        parsed.data.phone,
      );
      const email = normalizeSchedulerCustomerEmail(parsed.data.email);
      const createdId = await prisma.$transaction(
        async (tx) => {
          await lockSchedulerCustomerPhone(tx, phoneNormalized);
          if (await findSchedulerCustomerPhoneDuplicate(tx, phoneNormalized)) {
            throw new SchedulerCustomerError(
              "Ya existe un cliente con ese teléfono",
              409,
              "PHONE_DUPLICATE",
            );
          }
          const created = await tx.customer.create({
            data: {
              displayName: parsed.data.displayName,
              normalizedName: normalizeSchedulerCustomerName(
                parsed.data.displayName,
              ),
              phone: phoneNormalized,
              phoneNormalized,
              email,
              sourceId: parsed.data.sourceId ?? null,
              notes: parsed.data.notes ?? null,
              active: parsed.data.active ?? true,
              portfolios: {
                create: {
                  branchId: parsed.data.branchId,
                  employeeId: req.schedulerAccess!.selfProfessionalOnly
                    ? req.schedulerAccess!.professionalEmployeeId
                    : null,
                },
              },
            },
          });
          await replaceCustomerMetadata(
            tx,
            created.id,
            parsed.data,
            definitions,
          );
          await tx.auditLog.create({
            data: {
              application: "SCHEDULER",
              action: "SCHEDULER_CUSTOMER_CREATE",
              outcome: "SUCCESS",
              actorUserId: req.schedulerAccess!.userId,
              branchId: parsed.data.branchId,
              targetType: "Customer",
              targetId: created.id,
              metadata: {
                sourceId: created.sourceId,
                phoneNormalized: Boolean(phoneNormalized),
              },
            },
          });
          return created.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      const row = await prisma.customer.findUniqueOrThrow({
        where: { id: createdId },
        include: customerSummaryInclude([parsed.data.branchId]),
      });
      res.status(201).json({
        success: true,
        message: "Cliente creado",
        data: toCustomerSummary(row),
      });
    } catch (error) {
      sendCustomerError(res, error, "No fue posible crear el cliente");
    }
  },
);

router.put(
  "/:id",
  requireSchedulerCapability("scheduler/clients", "WRITE"),
  async (req, res) => {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Revisa los datos del cliente",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    try {
      const customerId = req.params["id"]!;
      const definitions = await validateCustomerInputReferences(
        req,
        parsed.data,
        customerId,
      );
      const scoped = await prisma.customer.findFirst({
        where: {
          AND: [
            { id: customerId, deletedAt: null },
            schedulerCustomerScopeWhere(
              req.schedulerAccess!,
              parsed.data.branchId,
            ),
          ],
        },
        select: { id: true, version: true },
      });
      if (!scoped)
        throw new SchedulerCustomerError(
          "Cliente no encontrado o fuera de alcance",
          404,
        );
      if (parsed.data.expectedVersion !== scoped.version)
        throw new SchedulerCustomerError(
          "El cliente cambió; recarga antes de guardar",
          409,
          "VERSION_CONFLICT",
        );
      const phoneNormalized = normalizeSchedulerCustomerPhone(
        parsed.data.phone,
      );
      const email = normalizeSchedulerCustomerEmail(parsed.data.email);
      await prisma.$transaction(
        async (tx) => {
          await lockSchedulerCustomerPhone(tx, phoneNormalized);
          if (
            await findSchedulerCustomerPhoneDuplicate(
              tx,
              phoneNormalized,
              customerId,
            )
          ) {
            throw new SchedulerCustomerError(
              "Ya existe otro cliente con ese teléfono",
              409,
              "PHONE_DUPLICATE",
            );
          }
          const updated = await tx.customer.updateMany({
            where: { id: customerId, version: parsed.data.expectedVersion },
            data: {
              displayName: parsed.data.displayName,
              normalizedName: normalizeSchedulerCustomerName(
                parsed.data.displayName,
              ),
              phone: phoneNormalized,
              phoneNormalized,
              email,
              sourceId: parsed.data.sourceId ?? null,
              notes: parsed.data.notes ?? null,
              active: parsed.data.active ?? true,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1)
            throw new SchedulerCustomerError(
              "El cliente cambió; recarga antes de guardar",
              409,
              "VERSION_CONFLICT",
            );
          await replaceCustomerMetadata(
            tx,
            customerId,
            parsed.data,
            definitions,
          );
          await tx.auditLog.create({
            data: {
              application: "SCHEDULER",
              action: "SCHEDULER_CUSTOMER_UPDATE",
              outcome: "SUCCESS",
              actorUserId: req.schedulerAccess!.userId,
              branchId: parsed.data.branchId,
              targetType: "Customer",
              targetId: customerId,
              metadata: { expectedVersion: parsed.data.expectedVersion },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      const row = await prisma.customer.findUniqueOrThrow({
        where: { id: customerId },
        include: customerSummaryInclude([parsed.data.branchId]),
      });
      res.json({
        success: true,
        message: "Cliente actualizado",
        data: toCustomerSummary(row),
      });
    } catch (error) {
      sendCustomerError(res, error, "No fue posible actualizar el cliente");
    }
  },
);

router.post(
  "/merge",
  requireSchedulerCapability("scheduler/clients", "ADMIN"),
  async (req, res) => {
    const parsed = mergeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Revisa la solicitud de fusión",
        data: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const mergeTarget = `${parsed.data.sourceCustomerId}:${parsed.data.targetCustomerId}`;
    try {
      const scope = schedulerCustomerScopeWhere(req.schedulerAccess!);
      const accessible = await prisma.customer.count({
        where: {
          id: {
            in: [parsed.data.sourceCustomerId, parsed.data.targetCustomerId],
          },
          AND: [scope],
        },
      });
      if (accessible !== 2)
        throw new SchedulerCustomerError(
          "Uno o ambos clientes no existen o están fuera de alcance",
          404,
        );
      if (
        !(await consumeCustomerAuthorization({
          req,
          purpose: "CLIENT_MERGE",
          targetType: "CustomerMerge",
          targetId: mergeTarget,
          token: parsed.data.authorizationToken,
        }))
      ) {
        throw new SchedulerCustomerError(
          "La autorización de fusión expiró, ya fue usada o no corresponde",
          403,
          "AUTHORIZATION_REQUIRED",
        );
      }
      const result = await prisma.$transaction(
        async (tx) => {
          const customers = await tx.customer.findMany({
            where: {
              id: {
                in: [
                  parsed.data.sourceCustomerId,
                  parsed.data.targetCustomerId,
                ],
              },
            },
            include: {
              schedulerProfile: true,
              schedulerAliases: true,
              schedulerEmails: true,
              schedulerFieldValues: true,
            },
            orderBy: { id: "asc" },
          });
          const source = customers.find(
            (customer) => customer.id === parsed.data.sourceCustomerId,
          );
          const target = customers.find(
            (customer) => customer.id === parsed.data.targetCustomerId,
          );
          if (
            !source?.active ||
            source.deletedAt ||
            !target?.active ||
            target.deletedAt
          )
            throw new SchedulerCustomerError(
              "Ambos clientes deben estar activos para fusionarse",
              409,
            );
          if (
            source.version !== parsed.data.expectedSourceVersion ||
            target.version !== parsed.data.expectedTargetVersion
          )
            throw new SchedulerCustomerError(
              "Uno de los clientes cambió; recarga antes de fusionar",
              409,
              "VERSION_CONFLICT",
            );
          assertMergeableExternalCustomerIds(
            source.externalClientId,
            target.externalClientId,
          );
          const sourcePhoneNormalized =
            source.phoneNormalized ??
            normalizeSchedulerCustomerPhone(source.phone);
          const targetPhoneNormalized =
            target.phoneNormalized ??
            normalizeSchedulerCustomerPhone(target.phone);
          for (const phone of [sourcePhoneNormalized, targetPhoneNormalized])
            await lockSchedulerCustomerPhone(tx, phone);

          const reassignedRelations: Record<string, number> = {};
          const move = async (
            name: string,
            operation: Promise<{ count: number }>,
          ) => {
            reassignedRelations[name] = (await operation).count;
          };
          await move(
            "portfolios",
            tx.customerPortfolioAssignment.updateMany({
              where: { customerId: source.id },
              data: { customerId: target.id },
            }),
          );
          await move(
            "portfolioTransfers",
            tx.posPortfolioTransferEvent.updateMany({
              where: { customerId: source.id },
              data: { customerId: target.id },
            }),
          );
          await move(
            "warehouseRequests",
            tx.warehouseRequest.updateMany({
              where: { customerId: source.id },
              data: { customerId: target.id },
            }),
          );
          await move(
            "tickets",
            tx.posTicket.updateMany({
              where: { customerId: source.id },
              data: { customerId: target.id },
            }),
          );
          await move(
            "appointments",
            tx.posAppointment.updateMany({
              where: { customerId: source.id },
              data: { customerId: target.id },
            }),
          );
          await move(
            "schedulerAppointments",
            tx.schedulerAppointment.updateMany({
              where: { customerId: source.id },
              data: { customerId: target.id },
            }),
          );
          await move(
            "memberships",
            tx.posClientMembership.updateMany({
              where: { customerId: source.id },
              data: { customerId: target.id },
            }),
          );
          await move(
            "agendaReservations",
            tx.agendaReservation.updateMany({
              where: { customerId: source.id },
              data: { customerId: target.id },
            }),
          );
          await move(
            "agendaEvents",
            tx.agendaSyncEvent.updateMany({
              where: { customerId: source.id },
              data: { customerId: target.id },
            }),
          );
          await move(
            "vouchers",
            tx.posVoucherIssue.updateMany({
              where: { customerId: source.id },
              data: { customerId: target.id },
            }),
          );

          const sourcePriceLists =
            await tx.priceListCustomerAssignment.findMany({
              where: { customerId: source.id },
              select: { id: true, priceListId: true },
            });
          const targetPriceLists = new Set(
            (
              await tx.priceListCustomerAssignment.findMany({
                where: { customerId: target.id },
                select: { priceListId: true },
              })
            ).map((row) => row.priceListId),
          );
          const duplicatePriceListIds = sourcePriceLists
            .filter((row) => targetPriceLists.has(row.priceListId))
            .map((row) => row.id);
          reassignedRelations.priceLists = (
            await tx.priceListCustomerAssignment.updateMany({
              where: {
                customerId: source.id,
                id: { notIn: duplicatePriceListIds },
              },
              data: { customerId: target.id },
            })
          ).count;
          reassignedRelations.duplicatePriceListsRemoved = (
            await tx.priceListCustomerAssignment.deleteMany({
              where: { id: { in: duplicatePriceListIds } },
            })
          ).count;

          for (const alias of source.schedulerAliases) {
            await tx.schedulerCustomerAlias.upsert({
              where: {
                customerId_kind_normalizedValue: {
                  customerId: target.id,
                  kind: alias.kind,
                  normalizedValue: alias.normalizedValue,
                },
              },
              create: {
                customerId: target.id,
                kind: alias.kind,
                value: alias.value,
                normalizedValue: alias.normalizedValue,
                active: alias.active,
              },
              update: { active: true },
            });
          }
          const sourceNameNormalized = normalizeSchedulerCustomerName(
            source.displayName,
          );
          if (sourceNameNormalized !== target.normalizedName) {
            await tx.schedulerCustomerAlias.upsert({
              where: {
                customerId_kind_normalizedValue: {
                  customerId: target.id,
                  kind: "NAME",
                  normalizedValue: sourceNameNormalized,
                },
              },
              create: {
                customerId: target.id,
                kind: "NAME",
                value: source.displayName,
                normalizedValue: sourceNameNormalized,
              },
              update: { active: true },
            });
          }
          if (
            sourcePhoneNormalized &&
            sourcePhoneNormalized !== targetPhoneNormalized
          ) {
            await tx.schedulerCustomerAlias.upsert({
              where: {
                customerId_kind_normalizedValue: {
                  customerId: target.id,
                  kind: "PHONE",
                  normalizedValue: sourcePhoneNormalized,
                },
              },
              create: {
                customerId: target.id,
                kind: "PHONE",
                value: source.phone ?? sourcePhoneNormalized,
                normalizedValue: sourcePhoneNormalized,
              },
              update: { active: true },
            });
          }
          reassignedRelations.aliases = source.schedulerAliases.length;
          await tx.schedulerCustomerAlias.deleteMany({
            where: { customerId: source.id },
          });

          for (const email of source.schedulerEmails) {
            await tx.schedulerCustomerEmail.upsert({
              where: {
                customerId_normalizedEmail: {
                  customerId: target.id,
                  normalizedEmail: email.normalizedEmail,
                },
              },
              create: {
                customerId: target.id,
                email: email.email,
                normalizedEmail: email.normalizedEmail,
                active: email.active,
                isPrimary: false,
                verifiedAt: email.verifiedAt,
              },
              update: {
                active: true,
                verifiedAt: email.verifiedAt ?? undefined,
              },
            });
          }
          const sourceCanonicalEmail = normalizeSchedulerCustomerEmail(
            source.email,
          );
          if (sourceCanonicalEmail) {
            await tx.schedulerCustomerEmail.upsert({
              where: {
                customerId_normalizedEmail: {
                  customerId: target.id,
                  normalizedEmail: sourceCanonicalEmail,
                },
              },
              create: {
                customerId: target.id,
                email: sourceCanonicalEmail,
                normalizedEmail: sourceCanonicalEmail,
                active: true,
                isPrimary: false,
              },
              update: { active: true },
            });
          }
          reassignedRelations.emails = source.schedulerEmails.length;
          await tx.schedulerCustomerEmail.deleteMany({
            where: { customerId: source.id },
          });

          const targetDefinitionIds = new Set(
            target.schedulerFieldValues.map((field) => field.definitionId),
          );
          const conflictingFields = source.schedulerFieldValues
            .filter((field) => targetDefinitionIds.has(field.definitionId))
            .map((field) => field.id);
          reassignedRelations.customFields = (
            await tx.schedulerCustomerFieldValue.updateMany({
              where: {
                customerId: source.id,
                id: { notIn: conflictingFields },
              },
              data: { customerId: target.id },
            })
          ).count;
          reassignedRelations.conflictingCustomFieldsPreservedOnTarget =
            conflictingFields.length;
          await tx.schedulerCustomerFieldValue.deleteMany({
            where: { id: { in: conflictingFields } },
          });

          if (source.schedulerProfile && target.schedulerProfile) {
            await tx.schedulerCustomerProfile.update({
              where: { id: target.schedulerProfile.id },
              data: {
                preferredName:
                  target.schedulerProfile.preferredName ??
                  source.schedulerProfile.preferredName,
                notes:
                  target.schedulerProfile.notes ??
                  source.schedulerProfile.notes,
                version: { increment: 1 },
              },
            });
            await tx.schedulerCustomerProfile.update({
              where: { id: source.schedulerProfile.id },
              data: { active: false, version: { increment: 1 } },
            });
          } else if (source.schedulerProfile) {
            await tx.schedulerCustomerProfile.update({
              where: { id: source.schedulerProfile.id },
              data: { customerId: target.id, version: { increment: 1 } },
            });
          }

          const targetPhone = targetPhoneNormalized
            ? target.phone
            : source.phone;
          const mergedPhoneNormalized =
            targetPhoneNormalized ?? sourcePhoneNormalized;
          const targetEmail = target.email ?? source.email;
          const targetExternalClientId =
            target.externalClientId ?? source.externalClientId;
          await tx.customer.update({
            where: { id: source.id },
            data: {
              phone: null,
              phoneNormalized: null,
              externalClientId: null,
              email: null,
              active: false,
              deletedAt: new Date(),
              version: { increment: 1 },
            },
          });
          const updatedTarget = await tx.customer.update({
            where: { id: target.id },
            data: {
              phone: targetPhone,
              phoneNormalized: mergedPhoneNormalized,
              email: targetEmail,
              externalClientId: targetExternalClientId,
              sourceId: target.sourceId ?? source.sourceId,
              notes: target.notes ?? source.notes,
              version: { increment: 1 },
            },
          });
          const event = await tx.schedulerCustomerMergeEvent.create({
            data: {
              sourceCustomerId: source.id,
              targetCustomerId: target.id,
              actorUserId: req.schedulerAccess!.userId,
              reason: parsed.data.reason,
              sourceSnapshot: {
                ...schedulerCustomerSnapshot(source),
                schedulerProfile: source.schedulerProfile
                  ? {
                      preferredName: source.schedulerProfile.preferredName,
                      preferredLocale: source.schedulerProfile.preferredLocale,
                      contactPreference:
                        source.schedulerProfile.contactPreference,
                      notes: source.schedulerProfile.notes,
                      version: source.schedulerProfile.version,
                    }
                  : null,
                aliases: source.schedulerAliases.map((alias) => ({
                  kind: alias.kind,
                  value: alias.value,
                  normalizedValue: alias.normalizedValue,
                  active: alias.active,
                })),
                emails: source.schedulerEmails.map((email) => ({
                  email: email.email,
                  normalizedEmail: email.normalizedEmail,
                  isPrimary: email.isPrimary,
                  active: email.active,
                  verifiedAt: email.verifiedAt?.toISOString() ?? null,
                })),
                customFields: source.schedulerFieldValues.map((field) => ({
                  definitionId: field.definitionId,
                  definitionVersionSnapshot: field.definitionVersionSnapshot,
                  value: field.value,
                })),
              },
              targetSnapshot: {
                ...schedulerCustomerSnapshot(target),
                schedulerProfile: target.schedulerProfile
                  ? {
                      preferredName: target.schedulerProfile.preferredName,
                      preferredLocale: target.schedulerProfile.preferredLocale,
                      contactPreference:
                        target.schedulerProfile.contactPreference,
                      notes: target.schedulerProfile.notes,
                      version: target.schedulerProfile.version,
                    }
                  : null,
                aliases: target.schedulerAliases.map((alias) => ({
                  kind: alias.kind,
                  value: alias.value,
                  normalizedValue: alias.normalizedValue,
                  active: alias.active,
                })),
                emails: target.schedulerEmails.map((email) => ({
                  email: email.email,
                  normalizedEmail: email.normalizedEmail,
                  isPrimary: email.isPrimary,
                  active: email.active,
                  verifiedAt: email.verifiedAt?.toISOString() ?? null,
                })),
                customFields: target.schedulerFieldValues.map((field) => ({
                  definitionId: field.definitionId,
                  definitionVersionSnapshot: field.definitionVersionSnapshot,
                  value: field.value,
                })),
              },
              reassignedRelations,
            },
          });
          await tx.auditLog.create({
            data: {
              application: "SCHEDULER",
              action: "SCHEDULER_CUSTOMER_MERGE",
              outcome: "SUCCESS",
              actorUserId: req.schedulerAccess!.userId,
              targetType: "Customer",
              targetId: target.id,
              metadata: {
                mergeEventId: event.id,
                sourceCustomerId: source.id,
                reassignedRelations,
              },
            },
          });
          return {
            mergeEventId: event.id,
            sourceCustomerId: source.id,
            targetCustomerId: target.id,
            targetVersion: updatedTarget.version,
            reassignedRelations,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 30_000,
        },
      );
      res.json({ success: true, message: "Clientes fusionados", data: result });
    } catch (error) {
      await writeSchedulerAudit({
        req,
        action: "SCHEDULER_CUSTOMER_MERGE",
        outcome: "FAILED",
        actorUserId: req.schedulerAccess!.userId,
        targetType: "CustomerMerge",
        targetId: mergeTarget,
        metadata: {
          code:
            error instanceof SchedulerCustomerError ? error.code : "UNEXPECTED",
        },
      }).catch(() => undefined);
      sendCustomerError(res, error, "No fue posible fusionar los clientes");
    }
  },
);

router.get(
  "/:id/visits",
  requireSchedulerCapability("scheduler/clients", "READ"),
  async (req, res) => {
    const parsed = pageSchema.safeParse(req.query);
    if (!parsed.success)
      return void res.status(400).json({
        success: false,
        message: "Paginación inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    const customerId = req.params["id"]!;
    try {
      const customer = await prisma.customer.findFirst({
        where: {
          AND: [
            { id: customerId },
            schedulerCustomerScopeWhere(
              req.schedulerAccess!,
              parsed.data.branchId,
            ),
          ],
        },
        select: { id: true },
      });
      if (!customer)
        throw new SchedulerCustomerError(
          "Cliente no encontrado o fuera de alcance",
          404,
        );
      if (
        !(await consumeCustomerAuthorization({
          req,
          purpose: "CLIENT_VISIT_HISTORY_VIEW",
          targetType: "Customer",
          targetId: customerId,
        }))
      )
        throw new SchedulerCustomerError(
          "Se requiere una autorización temporal para consultar visitas",
          403,
          "AUTHORIZATION_REQUIRED",
        );
      const branchIds = parsed.data.branchId
        ? [parsed.data.branchId]
        : req.schedulerAccess!.authorizedBranches.map((branch) => branch.id);
      const where = { customerId, branchId: { in: branchIds } };
      const schedulerWhere = {
        customerId,
        branchProfile: { branchId: { in: branchIds } },
      };
      const fetchLimit = parsed.data.page * parsed.data.pageSize;
      const [posItems, posTotal, schedulerItems, schedulerTotal] =
        await Promise.all([
        prisma.posAppointment.findMany({
          where,
          include: { branch: { select: { nombre: true } } },
          orderBy: [{ scheduledAt: "desc" }, { creadoEn: "desc" }],
          take: fetchLimit,
        }),
        prisma.posAppointment.count({ where }),
        prisma.schedulerAppointment.findMany({
          where: schedulerWhere,
          include: {
            branchProfile: { include: { branch: true } },
            services: {
              orderBy: { sequence: "asc" },
              select: { serviceNameSnapshot: true },
            },
          },
          orderBy: [{ startsAt: "desc" }, { creadoEn: "desc" }],
          take: fetchLimit,
        }),
        prisma.schedulerAppointment.count({ where: schedulerWhere }),
      ]);
      const mergedItems: SchedulerCustomerVisitHistoryDto["items"] = [
        ...schedulerItems.map((item) => ({
          id: item.id,
          origin: "SCHEDULER_APPOINTMENT" as const,
          branchId: item.branchProfile.branchId,
          branchName: item.branchProfile.branch.nombre,
          serviceName: item.services
            .map((service) => service.serviceNameSnapshot)
            .join(" + "),
          status: item.status,
          scheduledAt: item.startsAt.toISOString(),
          createdAt: item.creadoEn.toISOString(),
        })),
        ...posItems.map((item) => ({
          id: item.id,
          origin: "POS_APPOINTMENT" as const,
          branchId: item.branchId,
          branchName: item.branch.nombre,
          serviceName: item.serviceNameSnapshot,
          status: item.status,
          scheduledAt: item.scheduledAt?.toISOString() ?? null,
          createdAt: item.creadoEn.toISOString(),
        })),
      ]
        .sort((left, right) =>
          (right.scheduledAt ?? right.createdAt).localeCompare(
            left.scheduledAt ?? left.createdAt,
          ),
        )
        .slice(
          (parsed.data.page - 1) * parsed.data.pageSize,
          parsed.data.page * parsed.data.pageSize,
        );
      const data: SchedulerCustomerVisitHistoryDto = {
        items: mergedItems,
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total: posTotal + schedulerTotal,
        legacyRegistroCitaLinked: false,
      };
      await writeSchedulerAudit({
        req,
        action: "SCHEDULER_CUSTOMER_VISITS_VIEW",
        outcome: "SUCCESS",
        actorUserId: req.schedulerAccess!.userId,
        targetType: "Customer",
        targetId: customerId,
        metadata: { page: parsed.data.page, branchIds },
      });
      res.json({ success: true, message: "OK", data });
    } catch (error) {
      sendCustomerError(res, error, "No fue posible consultar las visitas");
    }
  },
);

router.get(
  "/:id/financial-history",
  requireSchedulerCapability("scheduler/clients", "READ"),
  async (req, res) => {
    const parsed = pageSchema.safeParse(req.query);
    if (!parsed.success)
      return void res.status(400).json({
        success: false,
        message: "Paginación inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    const customerId = req.params["id"]!;
    try {
      const customer = await prisma.customer.findFirst({
        where: {
          AND: [
            { id: customerId },
            schedulerCustomerScopeWhere(
              req.schedulerAccess!,
              parsed.data.branchId,
            ),
          ],
        },
        select: { id: true },
      });
      if (!customer)
        throw new SchedulerCustomerError(
          "Cliente no encontrado o fuera de alcance",
          404,
        );
      if (
        !(await consumeCustomerAuthorization({
          req,
          purpose: "CLIENT_FINANCIAL_HISTORY_VIEW",
          targetType: "Customer",
          targetId: customerId,
        }))
      )
        throw new SchedulerCustomerError(
          "Se requiere una autorización temporal para consultar finanzas",
          403,
          "AUTHORIZATION_REQUIRED",
        );
      const branchIds = parsed.data.branchId
        ? [parsed.data.branchId]
        : req.schedulerAccess!.authorizedBranches.map((branch) => branch.id);
      const where = { customerId, branchId: { in: branchIds } };
      const [items, total] = await Promise.all([
        prisma.posTicket.findMany({
          where,
          include: {
            branch: { select: { nombre: true } },
            paymentOperations: {
              include: { payments: true },
              orderBy: { creadoEn: "asc" },
            },
          },
          orderBy: [{ businessDate: "desc" }, { creadoEn: "desc" }],
          skip: (parsed.data.page - 1) * parsed.data.pageSize,
          take: parsed.data.pageSize,
        }),
        prisma.posTicket.count({ where }),
      ]);
      const data: SchedulerCustomerFinancialHistoryDto = {
        items: items.map((ticket) => ({
          ticketId: ticket.id,
          folio: ticket.folio,
          branchId: ticket.branchId,
          branchName: ticket.branch.nombre,
          businessDate: ticket.businessDate.toISOString().slice(0, 10),
          status: ticket.status,
          settlementStatus: ticket.settlementStatus,
          total: ticket.total.toFixed(2),
          amountPaid: ticket.amountPaid.toFixed(2),
          pendingAmount: ticket.pendingAmount.toFixed(2),
          payments: ticket.paymentOperations.flatMap((operation) =>
            operation.payments.map((payment) => ({
              operationId: operation.id,
              operationKind: operation.kind,
              operationFolio: operation.folio,
              method: payment.methodNameSnapshot,
              amount: payment.amount.toFixed(2),
              createdAt: payment.creadoEn.toISOString(),
            })),
          ),
        })),
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total,
        authority: "POS_READ_ONLY",
      };
      await writeSchedulerAudit({
        req,
        action: "SCHEDULER_CUSTOMER_FINANCIAL_HISTORY_VIEW",
        outcome: "SUCCESS",
        actorUserId: req.schedulerAccess!.userId,
        targetType: "Customer",
        targetId: customerId,
        metadata: { page: parsed.data.page, branchIds },
      });
      res.json({ success: true, message: "OK", data });
    } catch (error) {
      sendCustomerError(
        res,
        error,
        "No fue posible consultar el historial financiero",
      );
    }
  },
);

router.get(
  "/:id",
  requireSchedulerCapability("scheduler/clients", "READ"),
  async (req, res) => {
    const customerId = req.params["id"]!;
    try {
      if (
        !(await consumeCustomerAuthorization({
          req,
          purpose: "CLIENT_RECORD_VIEW",
          targetType: "Customer",
          targetId: customerId,
        }))
      )
        throw new SchedulerCustomerError(
          "Se requiere una autorización temporal para consultar el expediente",
          403,
          "AUTHORIZATION_REQUIRED",
        );
      const access = req.schedulerAccess!;
      const branchIds = access.authorizedBranches.map((branch) => branch.id);
      const commerceIds = await accessibleCommerceIds(req);
      const row = await prisma.customer.findFirst({
        where: {
          AND: [
            { id: customerId, deletedAt: null },
            schedulerCustomerScopeWhere(access),
          ],
        },
        include: {
          ...customerSummaryInclude(branchIds),
          schedulerEmails: {
            where: { active: true },
            orderBy: [{ isPrimary: "desc" }, { email: "asc" }],
          },
          schedulerFieldValues: {
            where: { definition: { commerceId: { in: commerceIds } } },
            include: { definition: true },
          },
          schedulerMergesAsSource: { orderBy: { creadoEn: "desc" }, take: 20 },
          schedulerMergesAsTarget: { orderBy: { creadoEn: "desc" }, take: 20 },
        },
      });
      if (!row)
        throw new SchedulerCustomerError(
          "Cliente no encontrado o fuera de alcance",
          404,
        );
      const summary = toCustomerSummary(row);
      const data: SchedulerCustomerDetailDto = {
        ...summary,
        notes: row.notes,
        profile: row.schedulerProfile
          ? {
              preferredLocale: row.schedulerProfile.preferredLocale,
              contactPreference: row.schedulerProfile.contactPreference,
              notes: row.schedulerProfile.notes,
              version: row.schedulerProfile.version,
            }
          : null,
        emails: row.schedulerEmails.map((email) => ({
          email: email.email,
          isPrimary: email.isPrimary,
          verifiedAt: email.verifiedAt?.toISOString() ?? null,
        })),
        customFields: row.schedulerFieldValues.map((field) => ({
          definitionId: field.definitionId,
          definitionVersion: field.definitionVersionSnapshot,
          key: field.definition.key,
          label: field.definition.label,
          type: field.definition.type,
          value: field.value,
        })),
        mergeHistory: [
          ...row.schedulerMergesAsSource,
          ...row.schedulerMergesAsTarget,
        ]
          .sort(
            (left, right) => right.creadoEn.getTime() - left.creadoEn.getTime(),
          )
          .slice(0, 20)
          .map((event) => ({
            id: event.id,
            sourceCustomerId: event.sourceCustomerId,
            targetCustomerId: event.targetCustomerId,
            reason: event.reason,
            createdAt: event.creadoEn.toISOString(),
          })),
      };
      await writeSchedulerAudit({
        req,
        action: "SCHEDULER_CUSTOMER_RECORD_VIEW",
        outcome: "SUCCESS",
        actorUserId: access.userId,
        targetType: "Customer",
        targetId: customerId,
      });
      res.json({ success: true, message: "OK", data });
    } catch (error) {
      sendCustomerError(res, error, "No fue posible consultar el expediente");
    }
  },
);

export default router;
