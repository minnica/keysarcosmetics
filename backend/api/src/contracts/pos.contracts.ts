import { z } from "zod";
import { POS_PERMISSION_KEYS } from "@cosmetics/types";

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
    pin: z.string().regex(/^\d{4,12}$/, "PIN inválido").optional(),
    active: z.boolean().default(true),
    offlineEnabled: z.boolean().default(false),
    isMaster: z.boolean().default(false),
    authorizationToken: z.string().uuid().optional(),
  })
  .strict();

export const posRolePermissionsSchema = z
  .object({
    permissions: z.array(z.enum(POS_PERMISSION_KEYS)).max(POS_PERMISSION_KEYS.length),
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
  })
  .strict();

export const posCatalogItemUpsertSchema = z
  .object({
    id: idSchema,
    sku: z.string().min(1).max(96),
    name: z.string().min(1).max(240),
    kind: z.enum(["PRODUCT", "SERVICE", "SUPPLY", "MACHINE"]),
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
    kind: z.enum(["PRODUCT", "SERVICE", "SUPPLY", "MACHINE"]),
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

export const posTicketLineInputSchema = z
  .object({
    itemId: idSchema,
    quantity: moneySchema,
    unitPrice: moneySchema,
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const posTicketSellerInputSchema = z
  .object({
    employeeId: idSchema,
    share: moneySchema,
  })
  .strict();

export const posTicketPaymentInputSchema = z
  .object({
    methodId: idSchema,
    methodType: z.enum(["CASH", "CARD", "TRANSFER", "OTHER"]),
    amount: moneySchema,
    reference: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

export const posTicketQuoteRequestSchema = z
  .object({
    branchId: idSchema,
    customerId: idSchema.optional(),
    lines: z.array(posTicketLineInputSchema).min(1).max(500),
    sellers: z.array(posTicketSellerInputSchema).min(1).max(50),
    payments: z.array(posTicketPaymentInputSchema).min(1).max(20),
    authorizationToken: z.string().uuid().optional(),
  })
  .strict();

export const posTicketQuoteSchema = z
  .object({
    subtotal: moneySchema,
    discountTotal: moneySchema,
    taxTotal: moneySchema,
    total: moneySchema,
    amountReceived: moneySchema,
    pendingAmount: moneySchema,
    requiresAuthorization: z.boolean(),
  })
  .strict();

export const posTicketSchema = posTicketQuoteSchema.extend({
  id: idSchema,
  folio: z.string().regex(/^KSR-[A-Z0-9-]+$/, "Folio POS inválido"),
  status: z.enum(["COMPLETED", "LAYAWAY", "CANCELED", "REFUNDED"]),
  businessDate: businessDateSchema,
  createdAt: isoUtcSchema,
});

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

export type PosLoginRequest = z.infer<typeof posLoginRequestSchema>;
export type PosTerminalRegistration = z.infer<
  typeof posTerminalRegistrationSchema
>;
export type PosTicketQuoteRequest = z.infer<typeof posTicketQuoteRequestSchema>;
