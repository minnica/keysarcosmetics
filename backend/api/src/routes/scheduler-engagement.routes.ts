import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  SCHEDULER_CONTACT_CHANNEL_STATUSES,
  SCHEDULER_MESSAGE_CHANNELS,
} from "@cosmetics/types";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../prisma/client";
import {
  consumeSchedulerAuthorization,
  hasSchedulerBranchAccess,
  hasSchedulerCapability,
  requireSchedulerCapability,
  resolveSchedulerAccessForRequest,
  schedulerRequestAuditContext,
} from "../services/scheduler-access";
import { schedulerCustomerScopeWhere } from "../services/scheduler-customers";
import {
  decryptSchedulerValue,
  encryptSchedulerValue,
  normalizeSchedulerEngagementName,
  SchedulerEngagementError,
  schedulerSha256,
  validateSchedulerMessageTemplate,
} from "../services/scheduler-engagement";
import {
  getSchedulerPrivateDocumentUrl,
  MAX_SCHEDULER_DOCUMENT_BYTES,
  removeSchedulerPrivateDocument,
  uploadSchedulerPrivateDocument,
} from "../services/scheduler-private-storage";

const router: ExpressRouter = Router();
const identifier = z.string().trim().min(1).max(191);
const uuid = z.string().uuid();
const instant = z.string().datetime({ offset: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SCHEDULER_DOCUMENT_BYTES },
});

const messageTemplateSchema = z
  .object({
    commerceId: identifier,
    name: z.string().trim().min(2).max(160),
    channel: z.enum(SCHEDULER_MESSAGE_CHANNELS),
    active: z.boolean().default(true),
    subject: z.string().trim().min(1).max(240).nullable().optional(),
    body: z.string().trim().min(1).max(20_000),
    variables: z
      .array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/))
      .max(100),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
const contactSchema = z
  .object({
    channel: z.enum(SCHEDULER_MESSAGE_CHANNELS),
    status: z.enum(SCHEDULER_CONTACT_CHANNEL_STATUSES),
    source: z.string().trim().min(1).max(120).nullable().optional(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();
const enqueueSchema = z
  .object({
    templateId: identifier,
    customerId: identifier,
    branchId: identifier,
    appointmentId: uuid.nullable().optional(),
    scheduledAt: instant,
    variables: z.record(z.string(), z.string().max(4000)),
  })
  .strict();
const consentRecordSchema = z
  .object({
    templateVersionId: uuid,
    customerId: identifier,
    branchId: identifier,
    appointmentId: uuid.nullable().optional(),
  })
  .strict();
const consentStatusSchema = z
  .object({
    status: z.enum(["SIGNED", "DECLINED", "REVOKED"]),
    evidence: z.string().trim().min(16).max(4000).nullable().optional(),
  })
  .strict();
const medicalSchema = z
  .object({
    commerceId: identifier,
    fields: z.record(z.string(), z.unknown()),
    expectedVersion: z.number().int().positive().optional(),
    authorizationToken: z.string().min(32).max(128),
  })
  .strict()
  .refine(
    ({ fields }) => Buffer.byteLength(JSON.stringify(fields), "utf8") <= 65_536,
    { message: "El expediente no puede superar 64 KiB", path: ["fields"] },
  );
const surveyQuestionSchema = z
  .object({
    type: z.enum(["RATING", "COMMENT"]),
    prompt: z.string().trim().min(2).max(500),
    required: z.boolean(),
  })
  .strict();
const surveySchema = z
  .object({
    commerceId: identifier,
    name: z.string().trim().min(2).max(160),
    status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
    title: z.string().trim().min(2).max(240),
    introduction: z.string().trim().max(2000).nullable().optional(),
    questions: z.array(surveyQuestionSchema).min(1).max(100),
    serviceProfileIds: z.array(identifier).max(500),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();

function sendError(res: Response, error: unknown): void {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      message: "Datos inválidos",
      data: error.flatten().fieldErrors,
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || error.code === "P2034") {
      res.status(409).json({
        success: false,
        message: "La operación entra en conflicto con un cambio reciente",
        data: null,
      });
      return;
    }
  }
  if (error instanceof SchedulerEngagementError) {
    res.status(error.status).json({
      success: false,
      message: error.message,
      data: { code: error.code },
    });
    return;
  }
  if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) {
    const status = error.message.includes("CONFLICT")
      ? 409
      : error.message.includes("SCOPE_DENIED")
      ? 403
      : error.message === "AUTHORIZATION_INVALID"
        ? 403
        : error.message.endsWith("_NOT_FOUND")
          ? 404
          : 400;
    res.status(status).json({
      success: false,
      message:
        status === 409
          ? "La operación entra en conflicto con una solicitud anterior"
          : status === 403
          ? "No tienes acceso a esta operación"
          : status === 404
            ? "El recurso no fue encontrado"
            : "La operación no es válida",
      data: { code: error.message },
    });
    return;
  }
  console.error("[scheduler.engagement]", error);
  res.status(500).json({
    success: false,
    message: "No fue posible completar la operación",
    data: null,
  });
}

async function commerceAllowed(
  req: Request,
  commerceId: string,
  complete = false,
): Promise<boolean> {
  if (req.schedulerAccess!.role === "SUPER_ADMIN") {
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
  const allowed = profiles.filter(({ branchId }) =>
    hasSchedulerBranchAccess(req.schedulerAccess!, branchId),
  );
  return profiles.length > 0 &&
    (complete ? allowed.length === profiles.length : allowed.length > 0);
}

async function authorizedBranch(req: Request, branchId: string) {
  if (!hasSchedulerBranchAccess(req.schedulerAccess!, branchId)) return null;
  return prisma.schedulerBranchProfile.findUnique({
    where: { branchId },
    select: { id: true, branchId: true, commerceId: true },
  });
}

async function authorizedCustomer(req: Request, customerId: string, branchId?: string) {
  return prisma.customer.findFirst({
    where: {
      id: customerId,
      active: true,
      deletedAt: null,
      AND: [schedulerCustomerScopeWhere(req.schedulerAccess!, branchId)],
    },
    select: { id: true, phone: true, email: true },
  });
}

async function authorizedCustomerInCommerce(
  req: Request,
  customerId: string,
  commerceId: string,
) {
  const profiles = await prisma.schedulerBranchProfile.findMany({
    where: {
      commerceId,
      branchId: {
        in: req.schedulerAccess!.authorizedBranches.map(({ id }) => id),
      },
    },
    select: { branchId: true },
  });
  if (profiles.length === 0) return null;
  return prisma.customer.findFirst({
    where: {
      id: customerId,
      active: true,
      deletedAt: null,
      OR: profiles.map(({ branchId }) =>
        schedulerCustomerScopeWhere(req.schedulerAccess!, branchId),
      ),
    },
    select: { id: true, phone: true, email: true },
  });
}

async function audit(
  tx: Prisma.TransactionClient,
  req: Request,
  input: {
    action: string;
    targetType: string;
    targetId: string;
    branchId?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await tx.auditLog.create({
    data: {
      application: "SCHEDULER",
      outcome: "SUCCESS",
      actorUserId: req.schedulerAccess!.userId,
      ...input,
      ...schedulerRequestAuditContext(req),
    },
  });
}

async function requirePrivateDocumentRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const access = await resolveSchedulerAccessForRequest(req);
  if (!access) {
    res.status(401).json({ success: false, message: "No autenticado", data: null });
    return;
  }
  const allowed =
    hasSchedulerCapability(
      access,
      "scheduler/administration/consents",
      "READ",
    ) ||
    hasSchedulerCapability(access, "scheduler/settings/records", "READ");
  if (!allowed) {
    res.status(403).json({ success: false, message: "No tienes acceso a documentos privados", data: null });
    return;
  }
  req.schedulerAccess = access;
  next();
}

function templateDto(row: {
  id: string;
  commerceId: string;
  name: string;
  channel: "WHATSAPP" | "EMAIL" | "SMS";
  active: boolean;
  currentVersion: number;
  actualizadoEn: Date;
  versions: Array<{
    subject: string | null;
    body: string;
    variables: Prisma.JsonValue;
  }>;
}) {
  const version = row.versions[0]!;
  return {
    id: row.id,
    commerceId: row.commerceId,
    name: row.name,
    channel: row.channel,
    active: row.active,
    currentVersion: row.currentVersion,
    subject: version.subject,
    body: version.body,
    variables: version.variables,
    updatedAt: row.actualizadoEn.toISOString(),
  };
}

router.get(
  "/communications/templates",
  requireSchedulerCapability("scheduler/administration/whatsapp", "READ"),
  async (req, res) => {
    try {
      const commerceIds = (
        await prisma.schedulerBranchProfile.findMany({
          where: {
            branchId: {
              in: req.schedulerAccess!.authorizedBranches.map(({ id }) => id),
            },
          },
          select: { commerceId: true },
          distinct: ["commerceId"],
        })
      ).map(({ commerceId }) => commerceId);
      const rows = await prisma.schedulerMessageTemplate.findMany({
        where: { commerceId: { in: commerceIds } },
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
        },
        orderBy: [{ channel: "asc" }, { name: "asc" }],
      });
      res.json({ success: true, message: "OK", data: rows.map(templateDto) });
    } catch (error) {
      sendError(res, error);
    }
  },
);

async function writeTemplate(req: Request, templateId?: string) {
  const input = messageTemplateSchema.parse(req.body);
  try {
    validateSchedulerMessageTemplate(input);
  } catch (error) {
    throw new SchedulerEngagementError(
      error instanceof Error ? error.message : "Plantilla inválida",
    );
  }
  if (!(await commerceAllowed(req, input.commerceId, true))) {
    throw new Error("COMMERCE_SCOPE_DENIED");
  }
  return prisma.$transaction(
    async (tx) => {
      const current = templateId
        ? await tx.schedulerMessageTemplate.findUnique({
            where: { id: templateId },
          })
        : null;
      if (templateId && !current) throw new Error("TEMPLATE_NOT_FOUND");
      if (
        current &&
        (current.commerceId !== input.commerceId ||
          current.currentVersion !== input.expectedVersion)
      ) {
        throw new Prisma.PrismaClientKnownRequestError("version conflict", {
          code: "P2034",
          clientVersion: "scheduler",
        });
      }
      const version = (current?.currentVersion ?? 0) + 1;
      const template = current
        ? await tx.schedulerMessageTemplate.update({
            where: { id: current.id },
            data: {
              name: input.name,
              normalizedName: normalizeSchedulerEngagementName(input.name),
              channel: input.channel,
              active: input.active,
              currentVersion: version,
            },
          })
        : await tx.schedulerMessageTemplate.create({
            data: {
              commerceId: input.commerceId,
              name: input.name,
              normalizedName: normalizeSchedulerEngagementName(input.name),
              channel: input.channel,
              active: input.active,
            },
          });
      await tx.schedulerMessageTemplateVersion.create({
        data: {
          templateId: template.id,
          version,
          subject: input.subject ?? null,
          body: input.body,
          variables: input.variables,
          createdByUserId: req.schedulerAccess!.userId,
        },
      });
      await audit(tx, req, {
        action: current
          ? "SCHEDULER_MESSAGE_TEMPLATE_VERSIONED"
          : "SCHEDULER_MESSAGE_TEMPLATE_CREATED",
        targetType: "SchedulerMessageTemplate",
        targetId: template.id,
        metadata: { version, channel: input.channel },
      });
      return { id: template.id, version };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

router.post(
  "/communications/templates",
  requireSchedulerCapability("scheduler/administration/whatsapp", "ADMIN"),
  async (req, res) => {
    try {
      res.status(201).json({
        success: true,
        message: "Plantilla creada",
        data: await writeTemplate(req),
      });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.put(
  "/communications/templates/:id",
  requireSchedulerCapability("scheduler/administration/whatsapp", "ADMIN"),
  async (req, res) => {
    try {
      res.json({
        success: true,
        message: "Nueva versión registrada",
        data: await writeTemplate(req, req.params["id"]!),
      });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.get(
  "/communications/customers/:customerId/contact-channels",
  requireSchedulerCapability("scheduler/administration/whatsapp", "READ"),
  async (req, res) => {
    try {
      const customer = await authorizedCustomer(
        req,
        req.params["customerId"]!,
      );
      if (!customer) {
        res.status(404).json({ success: false, message: "Cliente no encontrado", data: null });
        return;
      }
      const rows = await prisma.schedulerCustomerContactChannel.findMany({
        where: { customerId: customer.id },
      });
      res.json({
        success: true,
        message: "OK",
        data: SCHEDULER_MESSAGE_CHANNELS.map((channel) => {
          const row = rows.find((item) => item.channel === channel);
          return {
            customerId: customer.id,
            channel,
            status: row?.status ?? "UNVERIFIED",
            available: channel === "EMAIL" ? Boolean(customer.email) : Boolean(customer.phone),
            verifiedAt: row?.verifiedAt?.toISOString() ?? null,
            consentedAt: row?.consentedAt?.toISOString() ?? null,
            optedOutAt: row?.optedOutAt?.toISOString() ?? null,
            source: row?.source ?? null,
            version: row?.version ?? 0,
          };
        }),
      });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.put(
  "/communications/customers/:customerId/contact-channels",
  requireSchedulerCapability("scheduler/administration/whatsapp", "WRITE"),
  async (req, res) => {
    try {
      const input = contactSchema.parse(req.body);
      const customer = await authorizedCustomer(
        req,
        req.params["customerId"]!,
      );
      if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
      const destination = input.channel === "EMAIL" ? customer.email : customer.phone;
      if (input.status === "OPTED_IN" && !destination) {
        res.status(409).json({ success: false, message: "El cliente no tiene ese canal disponible", data: null });
        return;
      }
      const current = await prisma.schedulerCustomerContactChannel.findUnique({
        where: { customerId_channel: { customerId: customer.id, channel: input.channel } },
      });
      if (current && current.version !== input.expectedVersion) {
        res.status(409).json({ success: false, message: "La preferencia cambió; vuelve a cargarla", data: null });
        return;
      }
      const now = new Date();
      const row = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedulerCustomerContactChannel.upsert({
          where: { customerId_channel: { customerId: customer.id, channel: input.channel } },
          create: {
            customerId: customer.id,
            channel: input.channel,
            status: input.status,
            destinationHash: destination ? schedulerSha256(destination.trim().toLowerCase()) : null,
            verifiedAt: input.status === "OPTED_IN" ? now : null,
            consentedAt: input.status === "OPTED_IN" ? now : null,
            optedOutAt: input.status === "OPTED_OUT" ? now : null,
            source: input.source ?? null,
          },
          update: {
            status: input.status,
            destinationHash: destination ? schedulerSha256(destination.trim().toLowerCase()) : null,
            verifiedAt: input.status === "OPTED_IN" ? current?.verifiedAt ?? now : null,
            consentedAt: input.status === "OPTED_IN" ? current?.consentedAt ?? now : null,
            optedOutAt: input.status === "OPTED_OUT" ? now : null,
            source: input.source ?? null,
            version: { increment: 1 },
          },
        });
        await audit(tx, req, {
          action: "SCHEDULER_CONTACT_PREFERENCE_UPDATED",
          targetType: "Customer",
          targetId: customer.id,
          metadata: { channel: input.channel, status: input.status, version: updated.version },
        });
        return updated;
      });
      res.json({ success: true, message: "Preferencia actualizada", data: { version: row.version } });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.post(
  "/communications/outbox",
  requireSchedulerCapability("scheduler/administration/whatsapp", "WRITE"),
  async (req, res) => {
    try {
      const input = enqueueSchema.parse(req.body);
      const idempotencyKey = req.get("Idempotency-Key")?.trim();
      if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 191) {
        res.status(400).json({ success: false, message: "Idempotency-Key es obligatorio", data: null });
        return;
      }
      const requestHash = schedulerSha256(
        JSON.stringify({
          ...input,
          variables: Object.fromEntries(
            Object.entries(input.variables).sort(([left], [right]) =>
              left.localeCompare(right),
            ),
          ),
        }),
      );
      const replay = await prisma.schedulerMessageOutbox.findUnique({
        where: { idempotencyKey },
      });
      if (replay) {
        if (replay.requestHash !== requestHash) {
          res.status(409).json({ success: false, message: "El Idempotency-Key ya se usó con otra solicitud", data: null });
          return;
        }
        res.json({ success: true, message: "Mensaje ya registrado", data: { id: replay.id, status: replay.status } });
        return;
      }
      const branch = await authorizedBranch(req, input.branchId);
      const customer = await authorizedCustomer(req, input.customerId, input.branchId);
      if (!branch || !customer) {
        res.status(404).json({ success: false, message: "Sucursal o cliente no encontrado", data: null });
        return;
      }
      const template = await prisma.schedulerMessageTemplate.findFirst({
        where: { id: input.templateId, commerceId: branch.commerceId, active: true },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      });
      const templateVersion = template?.versions[0];
      if (!template || !templateVersion) throw new Error("TEMPLATE_NOT_FOUND");
      const destination = template.channel === "EMAIL" ? customer.email : customer.phone;
      const preference = await prisma.schedulerCustomerContactChannel.findUnique({
        where: { customerId_channel: { customerId: customer.id, channel: template.channel } },
      });
      const destinationHash = destination
        ? schedulerSha256(destination.trim().toLowerCase())
        : null;
      if (
        !destination ||
        preference?.status !== "OPTED_IN" ||
        preference.destinationHash !== destinationHash
      ) {
        res.status(409).json({ success: false, message: "El canal no está disponible, verificado y autorizado", data: null });
        return;
      }
      const declared = templateVersion.variables;
      const providedKeys = Object.keys(input.variables).sort();
      const declaredKeys = Array.isArray(declared)
        ? declared.filter((key): key is string => typeof key === "string").sort()
        : [];
      if (
        !Array.isArray(declared) ||
        declaredKeys.length !== declared.length ||
        JSON.stringify(declaredKeys) !== JSON.stringify(providedKeys)
      ) {
        res.status(400).json({ success: false, message: "Faltan variables requeridas por la plantilla", data: null });
        return;
      }
      if (input.appointmentId) {
        const appointment = await prisma.schedulerAppointment.findFirst({
          where: {
            id: input.appointmentId,
            customerId: customer.id,
            branchProfileId: branch.id,
          },
          select: { id: true },
        });
        if (!appointment) throw new Error("APPOINTMENT_NOT_FOUND");
      }
      const encrypted = encryptSchedulerValue(destination);
      const scheduledAt = new Date(input.scheduledAt);
      const queued = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`scheduler-message:${req.schedulerAccess!.userId}:${idempotencyKey}`}, 0))`;
        const concurrent = await tx.schedulerMessageOutbox.findUnique({
          where: { idempotencyKey },
        });
        if (concurrent) {
          if (concurrent.requestHash !== requestHash) {
            throw new Error("IDEMPOTENCY_CONFLICT");
          }
          return { row: concurrent, created: false };
        }
        const created = await tx.schedulerMessageOutbox.create({
          data: {
            idempotencyKey,
            requestHash,
            appointmentId: input.appointmentId ?? null,
            customerId: customer.id,
            branchProfileId: branch.id,
            templateVersionId: templateVersion.id,
            channel: template.channel,
            destinationCiphertext: encrypted.ciphertext,
            destinationIv: encrypted.iv,
            destinationAuthTag: encrypted.authTag,
            encryptionKeyVersion: encrypted.keyVersion,
            variablesSnapshot: input.variables,
            scheduledAt,
            nextAttemptAt: scheduledAt,
            createdByUserId: req.schedulerAccess!.userId,
          },
        });
        await audit(tx, req, {
          action: "SCHEDULER_MESSAGE_ENQUEUED",
          targetType: "SchedulerMessageOutbox",
          targetId: created.id,
          branchId: branch.branchId,
          metadata: { channel: created.channel, scheduledAt: created.scheduledAt.toISOString() },
        });
        return { row: created, created: true };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      res.status(queued.created ? 201 : 200).json({
        success: true,
        message: queued.created ? "Mensaje registrado en outbox" : "Mensaje ya registrado",
        data: { id: queued.row.id, status: queued.row.status },
      });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.get(
  "/communications/outbox",
  requireSchedulerCapability("scheduler/administration/whatsapp", "READ"),
  async (req, res) => {
    try {
      const branchIds = req.schedulerAccess!.authorizedBranches.map(({ id }) => id);
      const rows = await prisma.schedulerMessageOutbox.findMany({
        where: {
          branchProfile: { branchId: { in: branchIds } },
          customer: schedulerCustomerScopeWhere(req.schedulerAccess!),
        },
        include: { branchProfile: { select: { branchId: true } } },
        orderBy: { creadoEn: "desc" },
        take: 100,
      });
      await prisma.auditLog.create({
        data: {
          application: "SCHEDULER",
          action: "SCHEDULER_MESSAGE_OUTBOX_READ",
          outcome: "SUCCESS",
          actorUserId: req.schedulerAccess!.userId,
          metadata: { count: rows.length, branchCount: branchIds.length },
          ...schedulerRequestAuditContext(req),
        },
      });
      res.json({
        success: true,
        message: "OK",
        data: rows.map((row) => ({
          id: row.id,
          idempotencyKey: row.idempotencyKey,
          appointmentId: row.appointmentId,
          customerId: row.customerId,
          branchId: row.branchProfile.branchId,
          templateVersionId: row.templateVersionId,
          channel: row.channel,
          status: row.status,
          scheduledAt: row.scheduledAt.toISOString(),
          attempts: row.attempts,
          lastErrorCode: row.lastErrorCode,
          createdAt: row.creadoEn.toISOString(),
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.post(
  "/communications/outbox/:id/retry",
  requireSchedulerCapability("scheduler/administration/whatsapp", "ADMIN"),
  async (req, res) => {
    try {
      const row = await prisma.schedulerMessageOutbox.findUnique({
        where: { id: req.params["id"] },
        include: { branchProfile: true },
      });
      if (
        !row ||
        !hasSchedulerBranchAccess(req.schedulerAccess!, row.branchProfile.branchId) ||
        !(await authorizedCustomer(
          req,
          row.customerId,
          row.branchProfile.branchId,
        ))
      ) {
        res.status(404).json({ success: false, message: "Mensaje no encontrado", data: null });
        return;
      }
      if (row.status !== "FAILED") {
        res.status(409).json({ success: false, message: "Sólo un envío fallido puede reintentarse manualmente", data: null });
        return;
      }
      await prisma.$transaction(async (tx) => {
        await tx.schedulerMessageOutbox.update({
          where: { id: row.id },
          data: { status: "RETRY", nextAttemptAt: new Date(), failedAt: null, lastErrorCode: null },
        });
        await audit(tx, req, {
          action: "SCHEDULER_MESSAGE_RETRY_REQUESTED",
          targetType: "SchedulerMessageOutbox",
          targetId: row.id,
          branchId: row.branchProfile.branchId,
        });
      });
      res.json({ success: true, message: "Reintento programado", data: { id: row.id } });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.get(
  "/documents/consent-templates",
  requireSchedulerCapability("scheduler/administration/consents", "READ"),
  async (req, res) => {
    try {
      const commerceIds = (
        await prisma.schedulerBranchProfile.findMany({
          where: { branchId: { in: req.schedulerAccess!.authorizedBranches.map(({ id }) => id) } },
          select: { commerceId: true },
          distinct: ["commerceId"],
        })
      ).map(({ commerceId }) => commerceId);
      const rows = await prisma.schedulerConsentTemplate.findMany({
        where: { commerceId: { in: commerceIds } },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        orderBy: { name: "asc" },
      });
      res.json({
        success: true,
        message: "OK",
        data: rows.map((row) => ({
          id: row.id,
          commerceId: row.commerceId,
          name: row.name,
          active: row.active,
          currentVersion: row.currentVersion,
          document: row.versions[0]
            ? {
                id: row.versions[0].id,
                version: row.versions[0].version,
                fileName: row.versions[0].fileName,
                mimeType: row.versions[0].mimeType,
                sizeBytes: row.versions[0].sizeBytes,
                sha256: row.versions[0].sha256,
                createdAt: row.versions[0].creadoEn.toISOString(),
              }
            : null,
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.post(
  "/documents/consent-templates/:id?",
  requireSchedulerCapability("scheduler/administration/consents", "ADMIN"),
  upload.single("file"),
  async (req, res) => {
    let uploadedPath: string | null = null;
    try {
      const input = z.object({ commerceId: identifier, name: z.string().trim().min(2).max(160) }).parse(req.body);
      if (!req.file || !(await commerceAllowed(req, input.commerceId, true))) throw new Error("INVALID_CONSENT_TEMPLATE");
      const templateId = req.params["id"]?.trim();
      const current = templateId
        ? await prisma.schedulerConsentTemplate.findUnique({ where: { id: templateId } })
        : null;
      if (templateId && (!current || current.commerceId !== input.commerceId)) throw new Error("CONSENT_TEMPLATE_NOT_FOUND");
      const uploaded = await uploadSchedulerPrivateDocument({
        area: "consents",
        ownerId: current?.id ?? input.commerceId,
        file: req.file,
      });
      uploadedPath = uploaded.storagePath;
      const result = await prisma.$transaction(async (tx) => {
        const version = (current?.currentVersion ?? 0) + 1;
        const template = current
          ? await tx.schedulerConsentTemplate.update({
              where: { id: current.id },
              data: { name: input.name, normalizedName: normalizeSchedulerEngagementName(input.name), currentVersion: version },
            })
          : await tx.schedulerConsentTemplate.create({
              data: { commerceId: input.commerceId, name: input.name, normalizedName: normalizeSchedulerEngagementName(input.name) },
            });
        const document = await tx.schedulerConsentTemplateVersion.create({
          data: {
            templateId: template.id,
            version,
            ...uploaded,
            fileName: req.file!.originalname.slice(0, 255),
            mimeType: req.file!.mimetype,
            sizeBytes: req.file!.size,
            createdByUserId: req.schedulerAccess!.userId,
          },
        });
        await audit(tx, req, { action: "SCHEDULER_CONSENT_TEMPLATE_VERSIONED", targetType: "SchedulerConsentTemplate", targetId: template.id, metadata: { version, sha256: uploaded.sha256 } });
        return { id: template.id, documentId: document.id, version };
      });
      res.status(201).json({ success: true, message: "Consentimiento guardado", data: result });
    } catch (error) {
      if (uploadedPath) await removeSchedulerPrivateDocument(uploadedPath).catch(() => undefined);
      sendError(res, error);
    }
  },
);

router.post(
  "/documents/consent-records",
  requireSchedulerCapability("scheduler/administration/consents", "WRITE"),
  async (req, res) => {
    try {
      const input = consentRecordSchema.parse(req.body);
      const branch = await authorizedBranch(req, input.branchId);
      const customer = await authorizedCustomer(req, input.customerId, input.branchId);
      if (!branch || !customer) throw new Error("SCOPE_NOT_FOUND");
      const version = await prisma.schedulerConsentTemplateVersion.findFirst({
        where: { id: input.templateVersionId, template: { commerceId: branch.commerceId, active: true } },
      });
      if (!version) throw new Error("CONSENT_VERSION_NOT_FOUND");
      if (input.appointmentId) {
        const appointment = await prisma.schedulerAppointment.findFirst({
          where: {
            id: input.appointmentId,
            customerId: customer.id,
            branchProfileId: branch.id,
          },
          select: { id: true },
        });
        if (!appointment) throw new Error("APPOINTMENT_NOT_FOUND");
      }
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx.schedulerConsentRecord.create({
          data: {
            templateVersionId: version.id,
            customerId: customer.id,
            appointmentId: input.appointmentId ?? null,
            branchProfileId: branch.id,
          },
        });
        await audit(tx, req, {
          action: "SCHEDULER_CONSENT_ASSIGNED",
          targetType: "SchedulerConsentRecord",
          targetId: created.id,
          branchId: branch.branchId,
        });
        return created;
      });
      res.status(201).json({ success: true, message: "Consentimiento asignado", data: { id: row.id, status: row.status } });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.get(
  "/documents/consent-records",
  requireSchedulerCapability("scheduler/administration/consents", "READ"),
  async (req, res) => {
    try {
      const input = z
        .object({ customerId: identifier, branchId: identifier })
        .parse(req.query);
      const branch = await authorizedBranch(req, input.branchId);
      const customer = await authorizedCustomer(
        req,
        input.customerId,
        input.branchId,
      );
      if (!branch || !customer) throw new Error("SCOPE_NOT_FOUND");
      const rows = await prisma.schedulerConsentRecord.findMany({
        where: { customerId: customer.id, branchProfileId: branch.id },
        include: {
          templateVersion: {
            include: { template: { select: { name: true } } },
          },
        },
        orderBy: { creadoEn: "desc" },
      });
      await prisma.auditLog.create({
        data: {
          application: "SCHEDULER",
          action: "SCHEDULER_CONSENT_RECORDS_READ",
          outcome: "SUCCESS",
          actorUserId: req.schedulerAccess!.userId,
          branchId: input.branchId,
          targetType: "Customer",
          targetId: customer.id,
          metadata: { count: rows.length },
          ...schedulerRequestAuditContext(req),
        },
      });
      res.json({
        success: true,
        message: "OK",
        data: rows.map((row) => ({
          id: row.id,
          templateName: row.templateVersion.template.name,
          templateVersion: row.templateVersion.version,
          appointmentId: row.appointmentId,
          status: row.status,
          signedAt: row.signedAt?.toISOString() ?? null,
          declinedAt: row.declinedAt?.toISOString() ?? null,
          revokedAt: row.revokedAt?.toISOString() ?? null,
          hasSignedDocument: Boolean(row.signedStoragePath),
          createdAt: row.creadoEn.toISOString(),
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.post(
  "/documents/consent-records/:id/status",
  requireSchedulerCapability("scheduler/administration/consents", "WRITE"),
  upload.single("file"),
  async (req, res) => {
    let uploadedPath: string | null = null;
    try {
      const input = consentStatusSchema.parse(req.body);
      const current = await prisma.schedulerConsentRecord.findUnique({
        where: { id: req.params["id"] },
        include: { branchProfile: true },
      });
      if (
        !current ||
        !hasSchedulerBranchAccess(
          req.schedulerAccess!,
          current.branchProfile.branchId,
        )
      ) {
        res.status(404).json({ success: false, message: "Consentimiento no encontrado", data: null });
        return;
      }
      if (
        !(await authorizedCustomer(
          req,
          current.customerId,
          current.branchProfile.branchId,
        ))
      ) {
        res.status(404).json({ success: false, message: "Consentimiento no encontrado", data: null });
        return;
      }
      const validTransition =
        (current.status === "PENDING" && ["SIGNED", "DECLINED"].includes(input.status)) ||
        (current.status === "SIGNED" && input.status === "REVOKED");
      if (!validTransition) {
        res.status(409).json({ success: false, message: "Cambio de estado de consentimiento inválido", data: null });
        return;
      }
      if (input.status === "SIGNED" && (!req.file || !input.evidence)) {
        res.status(400).json({ success: false, message: "La firma requiere documento y evidencia", data: null });
        return;
      }
      if (req.file) {
        if (input.status !== "SIGNED") throw new Error("UNEXPECTED_SIGNED_DOCUMENT");
        const uploaded = await uploadSchedulerPrivateDocument({
          area: "signed-consents",
          ownerId: current.id,
          file: req.file,
        });
        uploadedPath = uploaded.storagePath;
      }
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        const updated = await tx.schedulerConsentRecord.updateMany({
          where: { id: current.id, status: current.status },
          data: {
            status: input.status,
            signatureEvidenceHash:
              input.status === "SIGNED" ? schedulerSha256(input.evidence!) : undefined,
            signedStoragePath:
              input.status === "SIGNED" ? uploadedPath : undefined,
            signedAt: input.status === "SIGNED" ? now : undefined,
            declinedAt: input.status === "DECLINED" ? now : undefined,
            revokedAt: input.status === "REVOKED" ? now : undefined,
          },
        });
        if (updated.count !== 1) {
          throw new Prisma.PrismaClientKnownRequestError("version conflict", {
            code: "P2034",
            clientVersion: "scheduler",
          });
        }
        await audit(tx, req, {
          action: `SCHEDULER_CONSENT_${input.status}`,
          targetType: "SchedulerConsentRecord",
          targetId: current.id,
          branchId: current.branchProfile.branchId,
        });
      });
      res.json({ success: true, message: "Consentimiento actualizado", data: { id: current.id, status: input.status } });
    } catch (error) {
      if (uploadedPath) await removeSchedulerPrivateDocument(uploadedPath).catch(() => undefined);
      sendError(res, error);
    }
  },
);

router.post(
  "/documents/customers/:customerId",
  requireSchedulerCapability("scheduler/settings/records", "WRITE"),
  upload.single("file"),
  async (req, res) => {
    let uploadedPath: string | null = null;
    try {
      const input = z.object({ branchId: identifier, kind: z.enum(["CONSENT_SUPPORT", "MEDICAL_SUPPORT", "OTHER"]) }).parse(req.body);
      const branch = await authorizedBranch(req, input.branchId);
      const customer = await authorizedCustomer(req, req.params["customerId"]!, input.branchId);
      if (!req.file || !branch || !customer) throw new Error("INVALID_DOCUMENT");
      const uploaded = await uploadSchedulerPrivateDocument({ area: "customers", ownerId: customer.id, file: req.file });
      uploadedPath = uploaded.storagePath;
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx.schedulerCustomerDocument.create({
          data: {
            customerId: customer.id,
            branchProfileId: branch.id,
            kind: input.kind,
            ...uploaded,
            fileName: req.file!.originalname.slice(0, 255),
            mimeType: req.file!.mimetype,
            sizeBytes: req.file!.size,
            createdByUserId: req.schedulerAccess!.userId,
          },
        });
        await audit(tx, req, {
          action: "SCHEDULER_CUSTOMER_DOCUMENT_CREATED",
          targetType: "SchedulerCustomerDocument",
          targetId: created.id,
          branchId: branch.branchId,
          metadata: { kind: input.kind, sha256: uploaded.sha256 },
        });
        return created;
      });
      res.status(201).json({ success: true, message: "Documento guardado", data: { id: row.id, sha256: row.sha256 } });
    } catch (error) {
      if (uploadedPath) await removeSchedulerPrivateDocument(uploadedPath).catch(() => undefined);
      sendError(res, error);
    }
  },
);

router.get(
  "/documents/customers/:customerId",
  requireSchedulerCapability("scheduler/settings/records", "READ"),
  async (req, res) => {
    try {
      const branchId = identifier.parse(req.query["branchId"]);
      const token = z
        .string()
        .min(32)
        .max(128)
        .parse(req.get("x-scheduler-authorization"));
      const branch = await authorizedBranch(req, branchId);
      const customer = await authorizedCustomer(
        req,
        req.params["customerId"]!,
        branchId,
      );
      if (!branch || !customer) throw new Error("SCOPE_NOT_FOUND");
      const authorization = await consumeSchedulerAuthorization({
        token,
        purpose: "MEDICAL_RECORD_VIEW",
        actorUserId: req.schedulerAccess!.userId,
        screenKey: "scheduler/settings/records",
        targetType: "SchedulerCustomerDocuments",
        targetId: customer.id,
      });
      if (!authorization) throw new Error("AUTHORIZATION_INVALID");
      const rows = await prisma.schedulerCustomerDocument.findMany({
        where: { customerId: customer.id, branchProfileId: branch.id },
        orderBy: { creadoEn: "desc" },
      });
      await prisma.auditLog.create({
        data: {
          application: "SCHEDULER",
          action: "SCHEDULER_CUSTOMER_DOCUMENTS_READ",
          outcome: "SUCCESS",
          actorUserId: req.schedulerAccess!.userId,
          branchId,
          targetType: "Customer",
          targetId: customer.id,
          metadata: { count: rows.length },
          ...schedulerRequestAuditContext(req),
        },
      });
      res.json({
        success: true,
        message: "OK",
        data: rows.map((row) => ({
          id: row.id,
          customerId: row.customerId,
          branchId,
          kind: row.kind,
          fileName: row.fileName,
          mimeType: row.mimeType,
          sizeBytes: row.sizeBytes,
          sha256: row.sha256,
          createdAt: row.creadoEn.toISOString(),
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.post(
  "/documents/:kind/:id/signed-url",
  requirePrivateDocumentRead,
  async (req, res) => {
    try {
      const input = z.object({ authorizationToken: z.string().min(32).max(128) }).parse(req.body);
      const kind = z.enum(["consent", "signed-consent", "customer"]).parse(req.params["kind"]);
      const targetId = req.params["id"]!;
      const document =
        kind === "consent"
          ? await prisma.schedulerConsentTemplateVersion.findUnique({ where: { id: targetId }, include: { template: true } })
          : kind === "signed-consent"
            ? await prisma.schedulerConsentRecord.findUnique({ where: { id: targetId }, include: { branchProfile: true } })
            : await prisma.schedulerCustomerDocument.findUnique({ where: { id: targetId }, include: { branchProfile: true } });
      if (!document) {
        res.status(404).json({ success: false, message: "Documento no encontrado", data: null });
        return;
      }
      const scoped = kind === "consent"
        ? await commerceAllowed(req, (document as { template: { commerceId: string } }).template.commerceId)
        : hasSchedulerBranchAccess(req.schedulerAccess!, (document as { branchProfile: { branchId: string } }).branchProfile.branchId);
      if (!scoped) throw new Error("DOCUMENT_SCOPE_DENIED");
      if (kind !== "consent") {
        const scopedDocument = document as {
          customerId: string;
          branchProfile: { branchId: string };
        };
        if (
          !(await authorizedCustomer(
            req,
            scopedDocument.customerId,
            scopedDocument.branchProfile.branchId,
          ))
        ) {
          throw new Error("DOCUMENT_SCOPE_DENIED");
        }
      }
      const medicalDocument = kind === "customer";
      const screenKey = medicalDocument
        ? "scheduler/settings/records"
        : "scheduler/administration/consents";
      const capability = req.schedulerAccess!.permissions.find(
        (permission) => permission.screenKey === screenKey,
      );
      if (!capability?.capabilities.includes("READ")) {
        res.status(403).json({ success: false, message: "No tienes acceso al documento", data: null });
        return;
      }
      const authorization = await consumeSchedulerAuthorization({
        token: input.authorizationToken,
        purpose: medicalDocument
          ? "MEDICAL_DOCUMENT_DOWNLOAD"
          : "PRIVATE_DOCUMENT_DOWNLOAD",
        actorUserId: req.schedulerAccess!.userId,
        screenKey,
        targetType: kind,
        targetId,
      });
      if (!authorization) {
        res.status(403).json({ success: false, message: "Autorización inválida o vencida", data: null });
        return;
      }
      const storagePath =
        kind === "signed-consent"
          ? (document as { signedStoragePath: string | null }).signedStoragePath
          : (document as { storagePath: string }).storagePath;
      if (!storagePath) {
        res.status(409).json({ success: false, message: "El consentimiento aún no tiene documento firmado", data: null });
        return;
      }
      const data = await getSchedulerPrivateDocumentUrl(storagePath);
      await prisma.auditLog.create({ data: { application: "SCHEDULER", action: "SCHEDULER_PRIVATE_DOCUMENT_READ", outcome: "SUCCESS", actorUserId: req.schedulerAccess!.userId, targetType: kind, targetId, ...schedulerRequestAuditContext(req) } });
      res.json({ success: true, message: "URL temporal generada", data });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.get(
  "/medical-records/:customerId",
  requireSchedulerCapability("scheduler/settings/records", "READ"),
  async (req, res) => {
    try {
      const commerceId = identifier.parse(req.query["commerceId"]);
      const token = z.string().min(32).max(128).parse(req.get("x-scheduler-authorization"));
      if (!(await commerceAllowed(req, commerceId))) throw new Error("COMMERCE_SCOPE_DENIED");
      const customer = await authorizedCustomerInCommerce(
        req,
        req.params["customerId"]!,
        commerceId,
      );
      if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
      const data = await prisma.$transaction(async (tx) => {
        const authorization = await consumeSchedulerAuthorization({ token, purpose: "MEDICAL_RECORD_VIEW", actorUserId: req.schedulerAccess!.userId, screenKey: "scheduler/settings/records", targetType: "SchedulerMedicalRecord", targetId: customer.id, tx });
        if (!authorization) throw new Error("AUTHORIZATION_INVALID");
        const row = await tx.schedulerMedicalRecord.findUnique({ where: { commerceId_customerId: { commerceId, customerId: customer.id } } });
        const fields = row
          ? JSON.parse(decryptSchedulerValue({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag, keyVersion: row.encryptionKeyVersion })) as Record<string, unknown>
          : {};
        await audit(tx, req, { action: "SCHEDULER_MEDICAL_RECORD_READ", targetType: "SchedulerMedicalRecord", targetId: customer.id, metadata: { commerceId, version: row?.version ?? 0 } });
        return { customerId: customer.id, commerceId, fields, version: row?.version ?? 0, updatedAt: row?.actualizadoEn.toISOString() ?? new Date(0).toISOString() };
      });
      res.json({ success: true, message: "OK", data });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.put(
  "/medical-records/:customerId",
  requireSchedulerCapability("scheduler/settings/records", "WRITE"),
  async (req, res) => {
    try {
      const input = medicalSchema.parse(req.body);
      if (!(await commerceAllowed(req, input.commerceId))) throw new Error("COMMERCE_SCOPE_DENIED");
      const customer = await authorizedCustomerInCommerce(
        req,
        req.params["customerId"]!,
        input.commerceId,
      );
      if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
      const result = await prisma.$transaction(async (tx) => {
        const authorization = await consumeSchedulerAuthorization({ token: input.authorizationToken, purpose: "MEDICAL_RECORD_EDIT", actorUserId: req.schedulerAccess!.userId, screenKey: "scheduler/settings/records", targetType: "SchedulerMedicalRecord", targetId: customer.id, tx });
        if (!authorization) throw new Error("AUTHORIZATION_INVALID");
        const current = await tx.schedulerMedicalRecord.findUnique({ where: { commerceId_customerId: { commerceId: input.commerceId, customerId: customer.id } } });
        if (current && current.version !== input.expectedVersion) throw new Prisma.PrismaClientKnownRequestError("version conflict", { code: "P2034", clientVersion: "scheduler" });
        const encrypted = encryptSchedulerValue(JSON.stringify(input.fields));
        const row = await tx.schedulerMedicalRecord.upsert({
          where: { commerceId_customerId: { commerceId: input.commerceId, customerId: customer.id } },
          create: { commerceId: input.commerceId, customerId: customer.id, ciphertext: encrypted.ciphertext, iv: encrypted.iv, authTag: encrypted.authTag, encryptionKeyVersion: encrypted.keyVersion, updatedByUserId: req.schedulerAccess!.userId },
          update: { ciphertext: encrypted.ciphertext, iv: encrypted.iv, authTag: encrypted.authTag, encryptionKeyVersion: encrypted.keyVersion, version: { increment: 1 }, updatedByUserId: req.schedulerAccess!.userId },
        });
        await audit(tx, req, { action: "SCHEDULER_MEDICAL_RECORD_UPDATED", targetType: "SchedulerMedicalRecord", targetId: customer.id, metadata: { commerceId: input.commerceId, version: row.version } });
        return { version: row.version, updatedAt: row.actualizadoEn.toISOString() };
      });
      res.json({ success: true, message: "Expediente actualizado", data: result });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.get(
  "/surveys",
  requireSchedulerCapability("scheduler/administration/surveys", "READ"),
  async (req, res) => {
    try {
      const commerceIds = (await prisma.schedulerBranchProfile.findMany({ where: { branchId: { in: req.schedulerAccess!.authorizedBranches.map(({ id }) => id) } }, select: { commerceId: true }, distinct: ["commerceId"] })).map(({ commerceId }) => commerceId);
      const rows = await prisma.schedulerSurvey.findMany({ where: { commerceId: { in: commerceIds } }, include: { versions: { orderBy: { version: "desc" }, take: 1, include: { questions: { orderBy: { sortOrder: "asc" } } } }, services: true }, orderBy: { name: "asc" } });
      res.json({ success: true, message: "OK", data: rows.map((row) => ({ id: row.id, commerceId: row.commerceId, name: row.name, status: row.status, currentVersion: row.currentVersion, title: row.versions[0]?.title ?? row.name, introduction: row.versions[0]?.introduction ?? null, questions: row.versions[0]?.questions ?? [], serviceProfileIds: row.services.map(({ serviceProfileId }) => serviceProfileId) })) });
    } catch (error) {
      sendError(res, error);
    }
  },
);

async function writeSurvey(req: Request, surveyId?: string) {
  const input = surveySchema.parse(req.body);
  if (!(await commerceAllowed(req, input.commerceId, true))) throw new Error("COMMERCE_SCOPE_DENIED");
  const serviceCount = await prisma.schedulerServiceProfile.count({ where: { id: { in: [...new Set(input.serviceProfileIds)] }, branchAssignments: { some: { branchProfile: { commerceId: input.commerceId } } } } });
  if (serviceCount !== new Set(input.serviceProfileIds).size) throw new Error("SERVICE_SCOPE_DENIED");
  return prisma.$transaction(async (tx) => {
    const current = surveyId ? await tx.schedulerSurvey.findUnique({ where: { id: surveyId } }) : null;
    if (surveyId && !current) throw new Error("SURVEY_NOT_FOUND");
    if (current && (current.commerceId !== input.commerceId || current.currentVersion !== input.expectedVersion)) throw new Prisma.PrismaClientKnownRequestError("version conflict", { code: "P2034", clientVersion: "scheduler" });
    const version = (current?.currentVersion ?? 0) + 1;
    const survey = current
      ? await tx.schedulerSurvey.update({ where: { id: current.id }, data: { name: input.name, normalizedName: normalizeSchedulerEngagementName(input.name), status: input.status, currentVersion: version } })
      : await tx.schedulerSurvey.create({ data: { commerceId: input.commerceId, name: input.name, normalizedName: normalizeSchedulerEngagementName(input.name), status: input.status } });
    const snapshot = await tx.schedulerSurveyVersion.create({ data: { surveyId: survey.id, version, title: input.title, introduction: input.introduction ?? null, createdByUserId: req.schedulerAccess!.userId, questions: { create: input.questions.map((question, sortOrder) => ({ ...question, sortOrder })) } } });
    await tx.schedulerSurveyService.deleteMany({ where: { surveyId: survey.id } });
    if (input.serviceProfileIds.length) await tx.schedulerSurveyService.createMany({ data: [...new Set(input.serviceProfileIds)].map((serviceProfileId) => ({ surveyId: survey.id, serviceProfileId })) });
    await audit(tx, req, { action: current ? "SCHEDULER_SURVEY_VERSIONED" : "SCHEDULER_SURVEY_CREATED", targetType: "SchedulerSurvey", targetId: survey.id, metadata: { version, status: input.status } });
    return { id: survey.id, version, versionId: snapshot.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

router.post(
  "/surveys",
  requireSchedulerCapability("scheduler/administration/surveys", "ADMIN"),
  async (req, res) => {
    try { res.status(201).json({ success: true, message: "Encuesta creada", data: await writeSurvey(req) }); } catch (error) { sendError(res, error); }
  },
);
router.put(
  "/surveys/:id",
  requireSchedulerCapability("scheduler/administration/surveys", "ADMIN"),
  async (req, res) => {
    try { res.json({ success: true, message: "Nueva versión de encuesta registrada", data: await writeSurvey(req, req.params["id"]!) }); } catch (error) { sendError(res, error); }
  },
);

router.post(
  "/surveys/:id/tokens",
  requireSchedulerCapability("scheduler/administration/surveys", "WRITE"),
  async (req, res) => {
    try {
      const input = z.object({ customerId: identifier, appointmentId: uuid.nullable().optional(), expiresAt: instant }).parse(req.body);
      const survey = await prisma.schedulerSurvey.findFirst({ where: { id: req.params["id"], status: "ACTIVE" }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
      if (!survey?.versions[0] || !(await commerceAllowed(req, survey.commerceId))) throw new Error("SURVEY_NOT_FOUND");
      const customer = await authorizedCustomerInCommerce(
        req,
        input.customerId,
        survey.commerceId,
      );
      if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
      if (input.appointmentId) {
        const appointment = await prisma.schedulerAppointment.findFirst({
          where: {
            id: input.appointmentId,
            customerId: customer.id,
            branchProfile: { commerceId: survey.commerceId },
            services: {
              some: {
                serviceProfile: {
                  surveyAssignments: { some: { surveyId: survey.id } },
                },
              },
            },
          },
          select: { id: true },
        });
        if (!appointment) throw new Error("APPOINTMENT_NOT_ELIGIBLE");
      }
      const expiresAt = new Date(input.expiresAt);
      if (expiresAt <= new Date() || expiresAt.getTime() > Date.now() + 90 * 86_400_000) throw new Error("INVALID_EXPIRATION");
      const token = randomBytes(32).toString("base64url");
      await prisma.$transaction(async (tx) => {
        const row = await tx.schedulerSurveyToken.create({ data: { tokenHash: schedulerSha256(token), surveyVersionId: survey.versions[0]!.id, customerId: customer.id, appointmentId: input.appointmentId ?? null, expiresAt } });
        await audit(tx, req, { action: "SCHEDULER_SURVEY_TOKEN_ISSUED", targetType: "SchedulerSurveyToken", targetId: row.id, metadata: { surveyId: survey.id, expiresAt: expiresAt.toISOString() } });
      });
      res.status(201).json({ success: true, message: "Token de encuesta emitido", data: { token, expiresAt: expiresAt.toISOString() } });
    } catch (error) { sendError(res, error); }
  },
);

export default router;
