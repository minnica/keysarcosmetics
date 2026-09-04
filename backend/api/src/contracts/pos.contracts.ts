import { z } from "zod";
import {
  POS_OFFLINE_OPERATION_KINDS,
  POS_PERMISSION_KEYS,
} from "@cosmetics/types";

const idSchema = z.string().trim().min(1).max(191);
const moneySchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)\.\d{2}$/, "Importe decimal inválido");
const signedMoneySchema = z
  .string()
  .regex(/^-?(?:0|[1-9]\d*)\.\d{2}$/, "Importe decimal inválido");
const isoUtcSchema = z.string().datetime({ offset: true });
const businessDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha operativa inválida");
const positiveQuantitySchema = moneySchema.refine(
  (value) => Number(value) > 0,
  "La cantidad debe ser mayor a cero",
);
const aliasSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-zA-Z0-9._-]+$/, "Alias inválido")
  .transform((value) => value.toLocaleLowerCase("es-MX"));

export const posPageQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const posMutationHeadersSchema = z
  .object({
    "idempotency-key": z.string().uuid(),
  })
  .strict();

export const posLoginRequestSchema = z
  .object({
    alias: aliasSchema,
    pin: z.string().regex(/^\d{4,12}$/, "PIN inválido"),
    terminalCode: z.string().trim().min(1).max(64),
    terminalSecret: z.string().min(32).max(256),
  })
  .strict();

export const posMasterAuthorizationRequestSchema = z
  .object({
    alias: aliasSchema,
    pin: z.string().regex(/^\d{4,12}$/, "PIN inválido"),
    purpose: z.string().trim().min(1).max(80),
    entityType: z.string().trim().min(1).max(80).optional(),
    entityId: idSchema.optional(),
    scope: z.record(z.unknown()).optional(),
  })
  .strict();

export const posPersonalAuthorizationRequestSchema = z
  .object({
    pin: z.string().regex(/^\d{4,12}$/, "PIN inválido"),
    purpose: z.string().trim().min(1).max(80),
    scope: z.record(z.unknown()).optional(),
  })
  .strict();

export const posAuthorizationVerifyRequestSchema = z
  .object({
    authorizationToken: z.string().uuid(),
    purpose: z.string().trim().min(1).max(80),
  })
  .strict();

export const posTerminalRegistrationSchema = z
  .object({
    code: z.string().trim().min(3).max(64),
    name: z.string().trim().min(1).max(120),
    branchId: idSchema,
  })
  .strict();

export const posTerminalStatusUpdateSchema = z
  .object({ status: z.enum(["ACTIVE", "REVOKED"]) })
  .strict();

export const posTerminalBranchChangeSchema = z
  .object({
    branchId: idSchema,
    authorizationToken: z.string().uuid(),
  })
  .strict();

export const posCredentialUpsertSchema = z
  .object({
    alias: aliasSchema,
    pin: z
      .string()
      .regex(/^\d{4,12}$/, "PIN inválido")
      .optional(),
    active: z.boolean().default(true),
    offlineEnabled: z.boolean().default(false),
    isMaster: z.boolean().default(false),
    authorizationToken: z.string().uuid().optional(),
  })
  .strict();

export const posRolePermissionsSchema = z
  .object({
    permissions: z
      .array(z.enum(POS_PERMISSION_KEYS))
      .max(POS_PERMISSION_KEYS.length),
    authorizationToken: z.string().uuid(),
  })
  .strict();

export const posBranchAssignmentsSchema = z
  .object({
    branchIds: z.array(idSchema).max(500),
    authorizationToken: z.string().uuid(),
  })
  .strict();

export const posBranchSummarySchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(160),
    code: z.string().min(1).max(32).nullable(),
    active: z.boolean(),
  })
  .strict();

export const posSessionSchema = z
  .object({
    accessToken: z.string().min(1),
    expiresAt: isoUtcSchema,
    actor: z
      .object({
        id: idSchema,
        employeeId: idSchema.nullable(),
        userId: idSchema.nullable(),
        positionId: idSchema.nullable(),
        displayName: z.string().min(1).max(240),
        alias: aliasSchema,
        isMaster: z.boolean(),
      })
      .strict(),
    terminal: z
      .object({
        id: idSchema,
        code: z.string().min(1).max(64),
        branch: posBranchSummarySchema,
      })
      .strict(),
    permissions: z.array(z.enum(POS_PERMISSION_KEYS)),
    authorizedBranches: z.array(posBranchSummarySchema),
    branchScope: z.enum(["SESSION_BRANCH", "ASSIGNED", "ALL_ACTIVE"]),
  })
  .strict();

export const posCatalogItemUpsertSchema = z
  .object({
    id: idSchema,
    sku: z.string().min(1).max(96),
    name: z.string().min(1).max(240),
    kind: z.enum(["PRODUCT", "SERVICE", "SUPPLY", "MACHINE", "MEMBERSHIP"]),
    familyId: idSchema.nullable(),
    categoryId: idSchema.nullable(),
    description: z.string().max(4_000).nullable(),
    benefits: z.array(z.string().trim().min(1).max(500)).max(30),
    imageUrl: z.string().url().nullable(),
    published: z.boolean(),
    active: z.boolean(),
    listPrice: moneySchema,
    minimumPrice: moneySchema,
    taxRate: moneySchema,
    membershipTerms: z
      .object({
        id: idSchema,
        version: z.number().int().min(1),
        totalSessions: z.number().int().min(1),
        renewalThreshold: z.number().int().min(0),
        conditions: z.record(z.unknown()).nullable(),
        effectiveAt: isoUtcSchema,
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((item, context) => {
    if (item.published && (!item.description || item.benefits.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Un artículo publicado requiere descripción y beneficios",
        path: ["published"],
      });
    }
  });

const nullableIdSchema = idSchema.nullable().optional().default(null);
const optionalMoneySchema = moneySchema.nullable().optional().default(null);

export const posTaxonomyUpsertSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    parentId: nullableIdSchema,
    active: z.boolean().default(true),
  })
  .strict();

export const posCatalogItemWriteSchema = z
  .object({
    sku: z.string().trim().min(1).max(96),
    name: z.string().trim().min(1).max(240),
    kind: z.enum(["PRODUCT", "SERVICE", "SUPPLY", "MACHINE", "MEMBERSHIP"]),
    familyId: nullableIdSchema,
    categoryId: nullableIdSchema,
    supplierId: nullableIdSchema,
    description: z.string().trim().max(4_000).nullable().default(null),
    benefits: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
    branchIds: z.array(idSchema).max(500).default([]),
    published: z.boolean().default(false),
    active: z.boolean().default(true),
    listPrice: moneySchema,
    minimumPrice: moneySchema,
    unitCost: moneySchema,
    taxRate: moneySchema,
    membershipSessions: z
      .number()
      .int()
      .min(1)
      .max(10_000)
      .nullable()
      .default(null),
    membershipRenewalThreshold: z.number().int().min(0).max(10_000).default(2),
    membershipConditions: z.record(z.unknown()).nullable().default(null),
  })
  .strict()
  .superRefine((item, context) => {
    if (Number(item.minimumPrice) > Number(item.listPrice)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El precio mínimo no puede exceder la lista",
        path: ["minimumPrice"],
      });
    }
    if (Number(item.taxRate) > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IVA inválido",
        path: ["taxRate"],
      });
    }
    if (item.published && (!item.description || item.benefits.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Un artículo publicado requiere descripción y beneficios",
        path: ["published"],
      });
    }
    if (item.kind === "MEMBERSHIP" && item.membershipSessions === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Una membresía requiere sesiones enteras mayores a cero",
        path: ["membershipSessions"],
      });
    }
    if (item.kind !== "MEMBERSHIP" && item.membershipSessions !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sólo una membresía puede definir sesiones",
        path: ["membershipSessions"],
      });
    }
    if (
      item.membershipSessions !== null &&
      item.membershipRenewalThreshold > item.membershipSessions
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El umbral de renovación no puede exceder las sesiones",
        path: ["membershipRenewalThreshold"],
      });
    }
  });

export const posCustomerWriteSchema = z
  .object({
    displayName: z.string().trim().min(2).max(240),
    phone: z.string().trim().min(7).max(32).nullable().default(null),
    email: z.string().trim().email().max(320).nullable().default(null),
    sourceId: nullableIdSchema,
    notes: z.string().trim().max(4_000).nullable().default(null),
    active: z.boolean().default(true),
    branchId: nullableIdSchema,
    employeeId: nullableIdSchema,
  })
  .strict();

export const posCustomerSourceWriteSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    active: z.boolean().default(true),
  })
  .strict();

export const posSupplierWriteSchema = z
  .object({
    folio: z.string().trim().min(2).max(64),
    businessName: z.string().trim().min(2).max(240),
    contactName: z.string().trim().max(240).nullable().default(null),
    rfc: z.string().trim().max(20).nullable().default(null),
    taxRegime: z.string().trim().max(240).nullable().default(null),
    businessLine: z.string().trim().max(240).nullable().default(null),
    phone: z.string().trim().max(32).nullable().default(null),
    email: z.string().trim().email().max(320).nullable().default(null),
    address: z.string().trim().max(1_000).nullable().default(null),
    active: z.boolean().default(true),
  })
  .strict();

export const posPaymentPolicyWriteSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    type: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"]),
    active: z.boolean().default(true),
    activeForPos: z.boolean().default(true),
    requiresReference: z.boolean().default(false),
    referenceLabel: z.string().trim().max(80).nullable().default(null),
    minAmount: optionalMoneySchema,
    maxAmount: optionalMoneySchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.minAmount &&
      input.maxAmount &&
      Number(input.minAmount) > Number(input.maxAmount)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El mínimo excede el máximo",
        path: ["maxAmount"],
      });
    }
  });

export const posTicketConfigurationWriteSchema = z
  .object({
    logoAssetId: nullableIdSchema,
    companyName: z.string().trim().min(2).max(160),
    address: z.string().trim().max(1_000).nullable().default(null),
    footerMessage: z.string().trim().max(1_000).nullable().default(null),
    policies: z.string().trim().max(5_000).nullable().default(null),
    showClientName: z.boolean().default(true),
    showClientPhone: z.boolean().default(true),
    showSellerName: z.boolean().default(true),
    showVatBreakdown: z.boolean().default(true),
    showSpareCoverageMessage: z.boolean().default(true),
  })
  .strict();

export const posVoucherTemplateWriteSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    kind: z.enum([
      "NEXT_PURCHASE_DISCOUNT",
      "COMPANION_FACIAL",
      "MEMBERSHIP_DISCOUNT",
    ]),
    value: moneySchema,
    message: z.string().trim().min(1).max(1_000),
    active: z.boolean().default(true),
    visibleToSellers: z.boolean().default(false),
  })
  .strict();

export const posPackageWriteSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    sku: z.string().trim().min(2).max(96),
    description: z.string().trim().max(4_000).nullable().default(null),
    price: moneySchema,
    status: z.enum(["DRAFT", "PUBLISHED", "INACTIVE"]).default("DRAFT"),
    startsAt: isoUtcSchema.nullable().default(null),
    endsAt: isoUtcSchema.nullable().default(null),
    lines: z
      .array(z.object({ itemId: idSchema, quantity: moneySchema }).strict())
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.startsAt &&
      input.endsAt &&
      new Date(input.endsAt) <= new Date(input.startsAt)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rango de vigencia inválido",
        path: ["endsAt"],
      });
  });

export const posAssetUploadMetadataSchema = z
  .object({
    isPrimary: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  })
  .strict();

export const posTaxonomySchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(160),
    active: z.boolean(),
    parentId: idSchema.nullable(),
  })
  .strict();

export const posCatalogItemResponseSchema = z
  .object({
    id: idSchema,
    sku: z.string().min(1).max(96),
    name: z.string().min(1).max(240),
    kind: z.enum(["PRODUCT", "SERVICE", "SUPPLY", "MACHINE", "MEMBERSHIP"]),
    family: posTaxonomySchema.nullable(),
    category: posTaxonomySchema.nullable(),
    description: z.string().max(4_000).nullable(),
    benefits: z.array(z.string().min(1).max(500)),
    imageUrl: z.string().url().nullable(),
    published: z.boolean(),
    active: z.boolean(),
    listPrice: moneySchema,
    minimumPrice: moneySchema,
    taxRate: moneySchema,
    availableQuantity: signedMoneySchema.nullable(),
    membershipTerms: z
      .object({
        id: idSchema,
        version: z.number().int().min(1),
        totalSessions: z.number().int().min(1),
        renewalThreshold: z.number().int().min(0),
        conditions: z.record(z.unknown()).nullable(),
        effectiveAt: isoUtcSchema,
      })
      .strict()
      .nullable(),
  })
  .strict();

export const posCustomerSearchQuerySchema = z
  .object({
    query: z.string().trim().min(2).max(120),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const posCustomerResponseSchema = z
  .object({
    id: idSchema,
    displayName: z.string().min(1).max(240),
    phone: z.string().min(1).max(32).nullable(),
    email: z.string().email().nullable(),
    active: z.boolean(),
  })
  .strict();

export const posInventoryCountLineSchema = z
  .object({
    itemId: idSchema,
    countedQuantity: moneySchema,
  })
  .strict();

export const posInventoryCountRequestSchema = z
  .object({
    kind: z.enum(["OPENING", "CLOSING"]),
    businessDate: businessDateSchema,
    locationId: idSchema,
    notes: z.string().trim().max(500).optional(),
    lines: z.array(posInventoryCountLineSchema).min(1).max(10_000),
    authorizationToken: z.string().uuid().optional(),
  })
  .strict();

export const posInventoryQuerySchema = z
  .object({
    locationId: idSchema.optional(),
    businessDate: businessDateSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const posInventoryAdjustmentLineSchema = z
  .object({
    itemId: idSchema,
    type: z.enum(["ADD", "REMOVE", "TRANSFER", "RETURN", "DEMO", "WRITE_OFF"]),
    fromLocationId: idSchema.nullable().optional().default(null),
    toLocationId: idSchema.nullable().optional().default(null),
    quantity: positiveQuantitySchema,
    reason: z
      .string()
      .trim()
      .min(1)
      .max(240)
      .nullable()
      .optional()
      .default(null),
    notes: z.string().trim().max(1_000).nullable().optional().default(null),
  })
  .strict()
  .superRefine((line, context) => {
    const sourceOnly = ["REMOVE", "DEMO", "WRITE_OFF"].includes(line.type);
    const both = ["TRANSFER", "RETURN"].includes(line.type);
    if (line.type === "ADD" && (line.fromLocationId || !line.toLocationId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Una suma requiere sólo destino",
        path: ["toLocationId"],
      });
    }
    if (sourceOnly && (!line.fromLocationId || line.toLocationId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La baja requiere sólo origen",
        path: ["fromLocationId"],
      });
    }
    if (
      both &&
      (!line.fromLocationId ||
        !line.toLocationId ||
        line.fromLocationId === line.toLocationId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La transferencia requiere ubicaciones distintas",
        path: ["toLocationId"],
      });
    }
  });

export const posInventoryAdjustmentBatchWriteSchema = z
  .object({
    notes: z.string().trim().max(1_000).nullable().optional().default(null),
    lines: z.array(posInventoryAdjustmentLineSchema).min(1).max(500),
  })
  .strict();

export const posWarehouseRequestWriteSchema = z
  .object({
    source: z.enum(["BRANCH", "SUPPLIER"]),
    requestType: z.enum(["PRODUCT", "TESTER", "SUPPLY"]),
    branchId: idSchema.nullable().optional().default(null),
    supplierId: idSchema.nullable().optional().default(null),
    priceListId: idSchema.nullable().optional().default(null),
    customerId: idSchema.nullable().optional().default(null),
    notes: z.string().trim().max(1_000).nullable().optional().default(null),
    lines: z
      .array(
        z
          .object({ itemId: idSchema, quantity: positiveQuantitySchema })
          .strict(),
      )
      .min(1)
      .max(1_000),
  })
  .strict()
  .superRefine((request, context) => {
    if (
      new Set(request.lines.map((line) => line.itemId)).size !==
      request.lines.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No se permiten artículos duplicados",
        path: ["lines"],
      });
    }
    if (
      request.source === "BRANCH" &&
      (!request.branchId || request.supplierId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Una solicitud de sucursal requiere sucursal",
        path: ["branchId"],
      });
    }
    if (
      request.source === "SUPPLIER" &&
      (!request.supplierId || request.branchId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Un resurtido requiere proveedor",
        path: ["supplierId"],
      });
    }
  });

export const posWarehouseActionSchema = z
  .object({
    notes: z.string().trim().max(1_000).nullable().optional().default(null),
  })
  .strict();

export const posNotificationQuerySchema = z
  .object({
    unreadOnly: z.enum(["true", "false"]).optional().default("false"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const posTicketLineInputSchema = z
  .object({
    itemId: idSchema,
    quantity: positiveQuantitySchema,
    unitPrice: moneySchema,
    notes: z.string().trim().max(500).optional(),
    packageId: idSchema.optional(),
    delivered: z.boolean().optional().default(true),
  })
  .strict();

export const posTicketSellerInputSchema = z
  .object({
    employeeId: idSchema,
    share: positiveQuantitySchema,
  })
  .strict();

export const posTicketPaymentInputSchema = z
  .object({
    methodId: idSchema,
    methodType: z.enum(["CASH", "CARD", "TRANSFER", "OTHER"]).optional(),
    amount: positiveQuantitySchema,
    reference: z.string().trim().min(1).max(160).optional(),
    institution: z.string().trim().min(1).max(160).optional(),
    authorizationLastFour: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
  })
  .strict();

export const posTicketDiscountInputSchema = z
  .object({
    kind: z.enum(["PERCENT", "FIXED"]),
    value: moneySchema,
  })
  .strict()
  .superRefine((discount, context) => {
    if (discount.kind === "PERCENT" && Number(discount.value) > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Porcentaje inválido",
        path: ["value"],
      });
    }
  });

const posTicketQuoteRequestObjectSchema = z
  .object({
    branchId: idSchema,
    customerId: idSchema.optional(),
    lines: z.array(posTicketLineInputSchema).min(1).max(500),
    sellers: z.array(posTicketSellerInputSchema).min(1).max(50),
    payments: z.array(posTicketPaymentInputSchema).max(20).optional(),
    discount: posTicketDiscountInputSchema.optional(),
    authorizationToken: z.string().uuid().optional(),
  })
  .strict();

const validateTicketCollections = (
  input: z.infer<typeof posTicketQuoteRequestObjectSchema>,
  context: z.RefinementCtx,
) => {
  if (
    new Set(input.lines.map((line) => `${line.itemId}:${line.packageId ?? ""}`))
      .size !== input.lines.length
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "No se permiten líneas duplicadas",
      path: ["lines"],
    });
  }
  if (
    new Set(input.sellers.map((seller) => seller.employeeId)).size !==
    input.sellers.length
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "No se permiten vendedores duplicados",
      path: ["sellers"],
    });
  }
};

export const posTicketQuoteRequestSchema =
  posTicketQuoteRequestObjectSchema.superRefine(validateTicketCollections);

const posTicketCustomerSchema = z
  .object({
    id: idSchema.optional(),
    create: z
      .object({
        displayName: z.string().trim().min(2).max(240),
        phone: z
          .string()
          .trim()
          .min(7)
          .max(32)
          .nullable()
          .optional()
          .default(null),
        email: z
          .string()
          .trim()
          .email()
          .max(320)
          .nullable()
          .optional()
          .default(null),
        sourceId: nullableIdSchema,
        notes: z.string().trim().max(4_000).nullable().optional().default(null),
        ownerEmployeeId: nullableIdSchema,
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((customer, context) => {
    if (Boolean(customer.id) === Boolean(customer.create)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indica un cliente existente o uno nuevo",
      });
    }
  });

export const posTicketAppointmentInputSchema = z
  .object({
    kind: z.enum(["COURTESY", "NEXT_SESSION", "NO_APPOINTMENT"]),
    serviceItemId: idSchema.optional(),
    serviceName: z.string().trim().min(1).max(240),
    branchId: idSchema,
    sellerId: idSchema.optional(),
    scheduledAt: isoUtcSchema.optional(),
    agendaSlotId: idSchema.optional(),
    agendaReservationMode: z
      .enum(["SINGLE", "SIMULTANEOUS_DOUBLE", "CONSECUTIVE"])
      .optional(),
    membershipId: idSchema.optional(),
    courtesyReason: z.enum(["WELCOME", "COMPLAINT"]).optional(),
  })
  .strict()
  .superRefine((appointment, context) => {
    if (appointment.kind === "NO_APPOINTMENT" && appointment.scheduledAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sin cita no admite horario",
        path: ["scheduledAt"],
      });
    }
    if (appointment.kind !== "NO_APPOINTMENT" && !appointment.scheduledAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cita requiere horario",
        path: ["scheduledAt"],
      });
    }
    if (appointment.kind !== "NO_APPOINTMENT" && !appointment.agendaSlotId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cita requiere un slot vigente de Agenda",
        path: ["agendaSlotId"],
      });
    }
    if (
      appointment.kind === "NO_APPOINTMENT" &&
      (appointment.agendaSlotId ||
        appointment.agendaReservationMode ||
        appointment.membershipId ||
        appointment.courtesyReason)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sin cita no admite referencias de Agenda",
      });
    }
    if (appointment.membershipId && appointment.kind !== "NEXT_SESSION") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Una membresía sólo puede usarse para la próxima sesión",
        path: ["membershipId"],
      });
    }
    if (appointment.courtesyReason && appointment.kind !== "COURTESY") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El motivo de cortesía sólo aplica a cortesías",
        path: ["courtesyReason"],
      });
    }
    if (appointment.kind === "COURTESY" && !appointment.courtesyReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cortesía requiere motivo WELCOME o COMPLAINT",
        path: ["courtesyReason"],
      });
    }
    if (
      appointment.agendaReservationMode &&
      appointment.agendaReservationMode !== "SINGLE" &&
      appointment.kind !== "COURTESY"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La reservación doble sólo aplica a cortesías",
        path: ["agendaReservationMode"],
      });
    }
  });

export const posAgendaAvailabilityQuerySchema = z
  .object({
    branchId: idSchema,
    from: isoUtcSchema,
    to: isoUtcSchema,
    serviceItemId: idSchema.optional(),
    seats: z.coerce.number().int().min(1).max(2).default(1),
  })
  .strict()
  .refine((input) => new Date(input.to) > new Date(input.from), {
    message: "El fin del rango debe ser posterior al inicio",
    path: ["to"],
  })
  .refine(
    (input) =>
      new Date(input.to).getTime() - new Date(input.from).getTime() <=
      31 * 24 * 60 * 60 * 1000,
    { message: "La disponibilidad admite como máximo 31 días", path: ["to"] },
  );

export const posAgendaMembershipReservationSchema = z
  .object({
    membershipId: idSchema,
    agendaSlotId: idSchema,
    sellerId: idSchema.optional(),
  })
  .strict();

export const posAgendaConflictQuerySchema = posPageQuerySchema.extend({
  status: z.enum(["PENDING", "FAILED", "CONFLICT"]).optional(),
});

export const posAgendaRetrySchema = z
  .object({ eventId: z.string().uuid().optional() })
  .strict();

export const posAgendaCorrectionSchema = z
  .object({
    eventId: z.string().uuid(),
    authorizationToken: z.string().uuid(),
    reason: z.string().trim().min(3).max(1_000),
  })
  .strict();

export const agendaWebhookSchema = z
  .object({
    eventId: z.string().trim().min(1).max(200),
    type: z.enum(["ATTENDED", "CANCELED", "NO_SHOW"]),
    externalAppointmentId: z.string().trim().min(1).max(160),
    version: z.number().int().positive(),
    occurredAt: isoUtcSchema,
  })
  .strict();

export const posTicketCourtesyInputSchema = z
  .object({
    serviceItemId: idSchema.optional(),
    serviceName: z.string().trim().min(1).max(240),
    appointmentIndex: z.number().int().min(0).optional(),
    policyId: idSchema.optional(),
    policyName: z.string().trim().min(1).max(160),
    authorizationToken: z.string().uuid().optional(),
  })
  .strict();

export const posTicketCreateRequestSchema = posTicketQuoteRequestObjectSchema
  .extend({
    customer: posTicketCustomerSchema,
    payments: z.array(posTicketPaymentInputSchema).max(20),
    appointments: z
      .array(posTicketAppointmentInputSchema)
      .max(10)
      .optional()
      .default([]),
    courtesies: z
      .array(posTicketCourtesyInputSchema)
      .max(2)
      .optional()
      .default([]),
  })
  .strict()
  .superRefine(validateTicketCollections);

export const posTicketQuoteSchema = z
  .object({
    subtotal: moneySchema,
    discountTotal: moneySchema,
    taxTotal: moneySchema,
    total: moneySchema,
    amountReceived: moneySchema,
    pendingAmount: moneySchema,
    minimumTotal: moneySchema,
    spareTotal: moneySchema,
    requiresAuthorization: z.boolean(),
    authorizationPurpose: z.enum(["SALE_BELOW_MINIMUM"]).nullable(),
    lines: z.array(
      z
        .object({
          itemId: idSchema,
          itemName: z.string(),
          sku: z.string(),
          quantity: moneySchema,
          unitPrice: moneySchema,
          unitMinimumPrice: moneySchema,
          subtotal: moneySchema,
          discountTotal: moneySchema,
          taxTotal: moneySchema,
          total: moneySchema,
          packageId: idSchema.nullable(),
        })
        .strict(),
    ),
  })
  .strict();

export const posTicketSchema = posTicketQuoteSchema.extend({
  id: idSchema,
  folio: z.string().regex(/^KSR-[A-Z0-9-]+$/, "Folio POS inválido"),
  status: z.enum(["COMPLETED", "LAYAWAY", "CANCELED", "REFUNDED"]),
  businessDate: businessDateSchema,
  createdAt: isoUtcSchema,
});

export const posTicketListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    businessDate: businessDateSchema.optional(),
    customerId: idSchema.optional(),
    branchIds: z.string().optional(),
  })
  .strict();

export const posSaleSellerQuerySchema = z
  .object({
    query: z.string().trim().min(2).max(120).optional(),
    customerId: idSchema.optional(),
  })
  .strict();

export const posLayawayPaymentRequestSchema = z
  .object({
    payments: z.array(posTicketPaymentInputSchema).min(1).max(20),
    deliveredTicketLineIds: z.array(idSchema).max(500).optional().default([]),
  })
  .strict();

export const posOwedProductDeliveryRequestSchema = z
  .object({ quantity: positiveQuantitySchema })
  .strict();

export const posTicketEventRequestSchema = z
  .object({
    reason: z.string().trim().min(3).max(1_000),
    refundAmount: moneySchema.optional(),
    returnedLines: z
      .array(
        z
          .object({ ticketLineId: idSchema, quantity: positiveQuantitySchema })
          .strict(),
      )
      .max(500)
      .optional()
      .default([]),
    revision: z.record(z.string(), z.unknown()).optional(),
    authorizationToken: z.string().uuid(),
  })
  .strict();

const posMembershipStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "EXHAUSTED",
  "CANCELED",
]);
const posMembershipProfileSchema = z.enum([
  "POTENTIAL",
  "LOYAL",
  "VIP",
  "RECOVERY",
]);
const personalAuthorizationTokenSchema = z.string().min(32).max(256);

export const posMembershipListQuerySchema = z
  .object({
    branchIds: z.string().max(10_000).optional(),
    query: z.string().trim().max(120).optional(),
    status: posMembershipStatusSchema.optional(),
    profile: posMembershipProfileSchema.optional(),
    followUpOnly: z.enum(["true", "false"]).optional(),
    purchasedFrom: businessDateSchema.optional(),
    purchasedTo: businessDateSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const posMembershipAuthorizationSchema = z
  .object({ personalAuthorizationToken: personalAuthorizationTokenSchema })
  .strict();

export const posMembershipProfileRequestSchema = z
  .object({
    profile: posMembershipProfileSchema,
    personalAuthorizationToken: personalAuthorizationTokenSchema,
  })
  .strict();

export const posMembershipSellerChangeRequestSchema = z
  .object({
    sellerId: idSchema,
    reason: z.string().trim().min(2).max(1_000),
    personalAuthorizationToken: personalAuthorizationTokenSchema,
  })
  .strict();

export const posMembershipStatusChangeRequestSchema = z
  .object({
    status: z.enum(["ACTIVE", "CANCELED"]),
    reason: z.string().trim().min(2).max(1_000),
    personalAuthorizationToken: personalAuthorizationTokenSchema,
  })
  .strict();

export const posMembershipAttendanceRequestSchema = z
  .object({
    appointmentId: idSchema,
    event: z.enum(["ATTENDED", "CANCELED", "NO_SHOW", "RESCHEDULED"]),
    branchId: idSchema,
    signatureStatus: z
      .enum(["PENDING", "SIGNED", "NOT_REQUIRED"])
      .default("PENDING"),
    personalAuthorizationToken: personalAuthorizationTokenSchema,
  })
  .strict();

export const posMembershipClosureRequestSchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    branchIds: z.array(idSchema).min(1).max(500),
    personalAuthorizationToken: personalAuthorizationTokenSchema,
  })
  .strict();

export const posVoucherIssueRequestSchema = z
  .object({ templateId: idSchema })
  .strict();

export const posBusinessDayCountInputSchema = z
  .object({
    skipped: z.boolean().optional().default(false),
    authorizationToken: z.string().uuid().optional(),
    locationId: idSchema.optional(),
    notes: z.string().trim().max(500).optional(),
    lines: z.array(posInventoryCountLineSchema).min(1).max(10_000).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.skipped && !input.authorizationToken) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Omitir el conteo requiere autorización master",
        path: ["authorizationToken"],
      });
    }
    if (!input.skipped && (!input.locationId || !input.lines?.length)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El conteo requiere ubicación y partidas",
        path: ["lines"],
      });
    }
    if (
      input.lines &&
      new Set(input.lines.map((line) => line.itemId)).size !==
        input.lines.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No se permiten productos duplicados",
        path: ["lines"],
      });
    }
  });

export const posBusinessDayCloseSchema = z
  .object({ authorizationToken: z.string().uuid() })
  .strict();

export const posAttendanceClockInSchema = z
  .object({
    pin: z.string().regex(/^\d{4,12}$/, "PIN inválido"),
    branchId: idSchema.optional(),
  })
  .strict();

export const posAttendanceClockOutSchema = z
  .object({ pin: z.string().regex(/^\d{4,12}$/, "PIN inválido") })
  .strict();

export const posCashExpenseWriteSchema = z
  .object({
    expenseTypeId: idSchema,
    amount: positiveQuantitySchema,
    concept: z.string().trim().min(2).max(500),
    comment: z.string().trim().max(1_000).nullable().optional().default(null),
    employeeId: idSchema.nullable().optional().default(null),
  })
  .strict();

export const posCashExpenseCorrectionSchema = posCashExpenseWriteSchema
  .extend({
    authorizationToken: z.string().uuid(),
    reason: z.string().trim().min(3).max(1_000),
  })
  .strict();

export const posCashExpenseVoidSchema = z
  .object({
    authorizationToken: z.string().uuid(),
    reason: z.string().trim().min(3).max(1_000),
  })
  .strict();

export const posExpenseTypeWriteSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    active: z.boolean().optional().default(true),
  })
  .strict();

export const posOperationQuerySchema = z
  .object({
    businessDate: businessDateSchema.optional(),
    branchId: idSchema.optional(),
    status: z.enum(["ACTIVE", "VOIDED"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const posInventoryBalanceSchema = z
  .object({
    itemId: idSchema,
    locationId: idSchema,
    availableQuantity: signedMoneySchema,
    reservedQuantity: moneySchema,
    version: z.number().int().nonnegative(),
    updatedAt: isoUtcSchema,
  })
  .strict();

export const posOfflineOperationSchema = z
  .object({
    id: z.string().uuid(),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    kind: z.enum(POS_OFFLINE_OPERATION_KINDS),
    entityId: idSchema.nullable(),
    idempotencyKey: z.string().uuid(),
    createdAt: isoUtcSchema,
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export const posOfflinePushSchema = z
  .object({
    operations: z.array(posOfflineOperationSchema).min(1).max(100),
  })
  .strict()
  .superRefine((input, context) => {
    const ordered = [...input.operations].sort(
      (left, right) => left.sequence - right.sequence,
    );
    if (
      ordered.some(
        (operation, index) =>
          index > 0 && operation.sequence !== ordered[index - 1]!.sequence + 1,
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las operaciones deben formar una secuencia contigua",
        path: ["operations"],
      });
    }
  });

export type PosLoginRequest = z.infer<typeof posLoginRequestSchema>;
export type PosTerminalRegistration = z.infer<
  typeof posTerminalRegistrationSchema
>;
export type PosTicketQuoteRequest = z.infer<typeof posTicketQuoteRequestSchema>;
export type PosTicketCreateRequest = z.infer<
  typeof posTicketCreateRequestSchema
>;
