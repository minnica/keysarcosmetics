import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import multer from "multer";
import { Prisma, type PosSalesCompetition } from "@prisma/client";
import { z } from "zod";
import {
  posAssetUploadMetadataSchema,
  posCatalogItemWriteSchema,
  posCustomerSearchQuerySchema,
  posCustomerSourceWriteSchema,
  posCustomerWriteSchema,
  posPackageWriteSchema,
  posPageQuerySchema,
  posPaymentPolicyWriteSchema,
  posSupplierWriteSchema,
  posTaxonomyUpsertSchema,
  posTicketConfigurationWriteSchema,
  posVoucherTemplateWriteSchema,
} from "../contracts/pos.contracts";
import {
  posAuthMiddleware,
  requireAnyPosPermission,
  requirePosPermission,
} from "../middlewares/pos-auth.middleware";
import { prisma } from "../prisma/client";
import {
  removeCatalogImage,
  uploadCatalogImage,
  validateCatalogImage,
} from "../services/pos-asset-storage";
import {
  enqueueAgendaCustomerUpdate,
  processAgendaSyncEvents,
} from "../services/pos-agenda";
import { enqueuePosNotification } from "../services/pos-notifications";
import {
  assertBranchAuthorized,
  resolveRequestedBranchIds,
} from "../services/pos-scope";

const router: ExpressRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
const db = prisma;
const MONEY = (value: Prisma.Decimal | number | string | null) =>
  value === null ? null : new Prisma.Decimal(value).toFixed(2);
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-MX");
const normalizeSku = (value: string) => value.trim().toLocaleUpperCase("es-MX");
const normalizePhone = (value: string | null) =>
  value ? value.replace(/\D/g, "") || null : null;
const decimal = (value: string) => new Prisma.Decimal(value);
const pages = (req: Request) => posPageQuerySchema.parse(req.query);
const costsAllowed = (req: Request) =>
  Boolean(
    req.posUser?.isMaster || req.posUser?.permissions.includes("REPORTS_COSTS"),
  );
const assetUrl = (
  assets: Array<{ publicUrl: string; isPrimary: boolean; status: string }>,
) =>
  assets.find((asset) => asset.isPrimary && asset.status === "READY")
    ?.publicUrl ??
  assets.find((asset) => asset.status === "READY")?.publicUrl ??
  null;
const requireCatalogRead = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (
    req.posUser?.isMaster ||
    req.posUser?.permissions.some((permission) =>
      [
        "CATALOG_VIEW",
        "SALE_CREATE",
        "INVENTORY_VIEW",
        "INVENTORY_ADJUST",
        "WAREHOUSE_MANAGE",
        "WAREHOUSE_BRANCH_REQUEST",
      ].includes(permission),
    )
  )
    return next();
  return res
    .status(403)
    .json({ success: false, message: "Permiso POS insuficiente", data: null });
};
const requireCustomerReadOrSale = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (
    req.posUser?.isMaster ||
    req.posUser?.permissions.some(
      (permission) =>
        permission === "CUSTOMERS_VIEW" || permission === "SALE_CREATE",
    )
  )
    return next();
  return res
    .status(403)
    .json({ success: false, message: "Permiso POS insuficiente", data: null });
};
const requirePaymentReadOrSale = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (
    req.posUser?.isMaster ||
    req.posUser?.permissions.some(
      (permission) =>
        permission === "PAYMENTS_MANAGE" || permission === "SALE_CREATE",
    )
  )
    return next();
  return res
    .status(403)
    .json({ success: false, message: "Permiso POS insuficiente", data: null });
};
const requirePackageReadOrSale = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (
    req.posUser?.isMaster ||
    req.posUser?.permissions.some(
      (permission) =>
        permission === "CATALOG_VIEW" || permission === "SALE_CREATE",
    )
  )
    return next();
  return res
    .status(403)
    .json({ success: false, message: "Permiso POS insuficiente", data: null });
};

function catalogDto(
  item: {
    id: string;
    sku: string;
    name: string;
    kind: "PRODUCT" | "SERVICE" | "SUPPLY" | "MACHINE" | "MEMBERSHIP";
    description: string | null;
    published: boolean;
    active: boolean;
    listPrice: Prisma.Decimal;
    minimumPrice: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    taxRate: Prisma.Decimal;
    family: {
      id: string;
      name: string;
      active: boolean;
      parentId: string | null;
    } | null;
    category: {
      id: string;
      name: string;
      active: boolean;
      parentId: string | null;
    } | null;
    benefits: Array<{ text: string }>;
    assets: Array<{ publicUrl: string; isPrimary: boolean; status: string }>;
    membershipTerms: Array<{
      id: string;
      version: number;
      totalSessions: number;
      renewalThreshold: number;
      conditions: Prisma.JsonValue;
      effectiveAt: Date;
    }>;
  },
  includeCosts: boolean,
) {
  const publicItem = {
    id: item.id,
    sku: item.sku,
    name: item.name,
    kind: item.kind,
    family: item.family,
    category: item.category,
    description: item.description,
    benefits: item.benefits.map((benefit) => benefit.text),
    imageUrl: assetUrl(item.assets),
    published: item.published,
    active: item.active,
    listPrice: MONEY(item.listPrice)!,
    minimumPrice: MONEY(item.minimumPrice)!,
    taxRate: MONEY(item.taxRate)!,
    availableQuantity: null,
    membershipTerms: item.membershipTerms[0]
      ? {
          id: item.membershipTerms[0].id,
          version: item.membershipTerms[0].version,
          totalSessions: item.membershipTerms[0].totalSessions,
          renewalThreshold: item.membershipTerms[0].renewalThreshold,
          conditions: item.membershipTerms[0].conditions as Record<
            string,
            unknown
          > | null,
          effectiveAt: item.membershipTerms[0].effectiveAt.toISOString(),
        }
      : null,
  };
  return includeCosts
    ? { ...publicItem, unitCost: MONEY(item.unitCost)! }
    : publicItem;
}

const membershipTermsInclude = {
  orderBy: { version: "desc" as const },
  take: 1,
};

async function nextMembershipSku(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ value: bigint }>>(
    Prisma.sql`SELECT nextval('"PosMembershipSkuSeq"') AS value`,
  );
  return `MEM-${rows[0]!.value.toString().padStart(6, "0")}`;
}

async function verifyReferences(
  input: z.infer<typeof posCatalogItemWriteSchema>,
  authorizedBranchIds: readonly string[],
) {
  resolveRequestedBranchIds({
    authorizedBranchIds,
    requestedBranchIds: input.branchIds,
  });
  const ids = [
    input.familyId,
    input.categoryId,
    input.supplierId,
    ...input.branchIds,
  ].filter((id): id is string => Boolean(id));
  if (ids.length === 0) return true;
  const [taxonomyCount, supplierCount, branchCount] = await Promise.all([
    input.familyId || input.categoryId
      ? db.catalogTaxonomy.count({
          where: {
            id: {
              in: [input.familyId, input.categoryId].filter(
                (id): id is string => Boolean(id),
              ),
            },
            active: true,
            deletedAt: null,
          },
        })
      : Promise.resolve(0),
    input.supplierId
      ? db.posSupplier.count({
          where: { id: input.supplierId, active: true, deletedAt: null },
        })
      : Promise.resolve(0),
    input.branchIds.length
      ? db.sucursal.count({
          where: { id: { in: input.branchIds }, activa: true },
        })
      : Promise.resolve(0),
  ]);
  return (
    taxonomyCount ===
      [input.familyId, input.categoryId].filter(Boolean).length &&
    supplierCount === (input.supplierId ? 1 : 0) &&
    branchCount === new Set(input.branchIds).size
  );
}

router.use(posAuthMiddleware);

router.get("/catalog/items", requireCatalogRead, async (req, res) => {
  const parsed = z
    .object({
      query: z.string().trim().max(120).optional(),
      kind: z
        .enum(["PRODUCT", "SERVICE", "SUPPLY", "MACHINE", "MEMBERSHIP"])
        .optional(),
      active: z.enum(["true", "false"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .parse(req.query);
  const branchId = req.posUser!.branchId;
  const where: Prisma.CatalogItemWhereInput = {
    deletedAt: null,
    ...(parsed.kind ? { kind: parsed.kind } : {}),
    ...(parsed.active ? { active: parsed.active === "true" } : {}),
    AND: [
      ...(parsed.query
        ? [
            {
              OR: [
                {
                  normalizedName: {
                    contains: normalize(parsed.query),
                    mode: "insensitive" as const,
                  },
                },
                {
                  sku: {
                    contains: normalizeSku(parsed.query),
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          ]
        : []),
      {
        OR: [
          { branchVisibility: { none: {} } },
          { branchVisibility: { some: { branchId, visible: true } } },
        ],
      },
    ],
  };
  const [items, total] = await Promise.all([
    db.catalogItem.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      include: {
        family: true,
        category: true,
        benefits: { orderBy: { sortOrder: "asc" } },
        assets: {
          where: { status: "READY" },
          orderBy: [{ isPrimary: "desc" }, { creadoEn: "asc" }],
        },
        membershipTerms: membershipTermsInclude,
      },
    }),
    db.catalogItem.count({ where }),
  ]);
  res.json({
    success: true,
    message: "OK",
    data: {
      items: items.map((item) => catalogDto(item, costsAllowed(req))),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
    },
  });
});

router.post(
  "/catalog/items",
  requirePosPermission("CATALOG_MANAGE"),
  async (req, res) => {
    const parsed = posCatalogItemWriteSchema.safeParse(req.body);
    if (
      !parsed.success ||
      !(await verifyReferences(parsed.data, req.posUser!.authorizedBranchIds))
    )
      return res.status(400).json({
        success: false,
        message: "Artículo o referencias inválidas",
        data: parsed.success ? null : parsed.error.flatten().fieldErrors,
      });
    const input = parsed.data;
    try {
      const item = await db.$transaction(async (tx) => {
        const sku =
          input.kind === "MEMBERSHIP"
            ? await nextMembershipSku(tx)
            : normalizeSku(input.sku);
        const created = await tx.catalogItem.create({
          data: {
            sku,
            name: input.name,
            normalizedName: normalize(input.name),
            kind: input.kind,
            familyId: input.familyId,
            categoryId: input.categoryId,
            supplierId: input.supplierId,
            description: input.description,
            published: input.published,
            active: input.active,
            listPrice: decimal(input.listPrice),
            minimumPrice: decimal(input.minimumPrice),
            unitCost: decimal(input.unitCost),
            taxRate: decimal(input.taxRate),
            benefits: {
              create: input.benefits.map((text, sortOrder) => ({
                text,
                sortOrder,
              })),
            },
            branchVisibility: {
              create: input.branchIds.map((branchId) => ({
                branchId,
                visible: true,
              })),
            },
            membershipTerms:
              input.kind === "MEMBERSHIP" && input.membershipSessions
                ? {
                    create: {
                      version: 1,
                      totalSessions: input.membershipSessions,
                      renewalThreshold: input.membershipRenewalThreshold,
                      conditions:
                        (input.membershipConditions as Prisma.InputJsonValue | null) ??
                        undefined,
                      createdByCredentialId: req.posUser!.credentialId,
                    },
                  }
                : undefined,
          },
          include: {
            family: true,
            category: true,
            benefits: true,
            assets: true,
            membershipTerms: membershipTermsInclude,
          },
        });
        await tx.catalogItemPrice.create({
          data: {
            itemId: created.id,
            listPrice: created.listPrice,
            minimumPrice: created.minimumPrice,
            unitCost: created.unitCost,
            taxRate: created.taxRate,
            createdByCredentialId: req.posUser!.credentialId,
          },
        });
        await enqueuePosNotification(tx, {
          kind: "PRODUCT_CREATED",
          title: `Alta de ${created.kind === "SERVICE" ? "servicio" : "producto"}`,
          message: `${created.name} · ${created.sku}`,
          audiencePermission: "CATALOG_VIEW",
          createdByCredentialId: req.posUser!.credentialId,
          sourceType: "CatalogItem",
          sourceId: created.id,
        });
        return created;
      });
      res.status(201).json({
        success: true,
        message: "Artículo creado",
        data: catalogDto(item, costsAllowed(req)),
      });
    } catch (error) {
      res
        .status(409)
        .json({ success: false, message: "SKU ya registrado", data: null });
    }
  },
);

router.put(
  "/catalog/items/:id",
  requirePosPermission("CATALOG_MANAGE"),
  async (req, res) => {
    const parsed = posCatalogItemWriteSchema.safeParse(req.body);
    if (
      !parsed.success ||
      !(await verifyReferences(parsed.data, req.posUser!.authorizedBranchIds))
    )
      return res.status(400).json({
        success: false,
        message: "Artículo o referencias inválidas",
        data: parsed.success ? null : parsed.error.flatten().fieldErrors,
      });
    const input = parsed.data;
    const id = req.params["id"]!;
    try {
      const item = await db.$transaction(async (tx) => {
        const existing = await tx.catalogItem.findFirst({
          where: { id, deletedAt: null },
          include: { membershipTerms: membershipTermsInclude },
        });
        if (!existing) return null;
        if (
          existing.kind !== input.kind &&
          (existing.kind === "MEMBERSHIP" || input.kind === "MEMBERSHIP")
        )
          throw new Error("MEMBERSHIP_KIND_IMMUTABLE");
        const changedPrice =
          !existing.listPrice.equals(input.listPrice) ||
          !existing.minimumPrice.equals(input.minimumPrice) ||
          !existing.unitCost.equals(input.unitCost) ||
          !existing.taxRate.equals(input.taxRate);
        const updated = await tx.catalogItem.update({
          where: { id },
          data: {
            sku:
              input.kind === "MEMBERSHIP"
                ? existing.kind === "MEMBERSHIP"
                  ? existing.sku
                  : await nextMembershipSku(tx)
                : normalizeSku(input.sku),
            name: input.name,
            normalizedName: normalize(input.name),
            kind: input.kind,
            familyId: input.familyId,
            categoryId: input.categoryId,
            supplierId: input.supplierId,
            description: input.description,
            published: input.published,
            active: input.active,
            listPrice: decimal(input.listPrice),
            minimumPrice: decimal(input.minimumPrice),
            unitCost: decimal(input.unitCost),
            taxRate: decimal(input.taxRate),
            benefits: {
              deleteMany: {},
              create: input.benefits.map((text, sortOrder) => ({
                text,
                sortOrder,
              })),
            },
            branchVisibility: {
              deleteMany: {},
              create: input.branchIds.map((branchId) => ({
                branchId,
                visible: true,
              })),
            },
          },
          include: {
            family: true,
            category: true,
            benefits: { orderBy: { sortOrder: "asc" } },
            assets: true,
            membershipTerms: membershipTermsInclude,
          },
        });
        if (changedPrice)
          await tx.catalogItemPrice.create({
            data: {
              itemId: id,
              listPrice: updated.listPrice,
              minimumPrice: updated.minimumPrice,
              unitCost: updated.unitCost,
              taxRate: updated.taxRate,
              createdByCredentialId: req.posUser!.credentialId,
            },
          });
        if (input.kind === "MEMBERSHIP" && input.membershipSessions) {
          const latest = existing.membershipTerms[0];
          const conditionsChanged =
            JSON.stringify(latest?.conditions ?? null) !==
            JSON.stringify(input.membershipConditions ?? null);
          if (
            !latest ||
            latest.totalSessions !== input.membershipSessions ||
            latest.renewalThreshold !== input.membershipRenewalThreshold ||
            conditionsChanged
          ) {
            await tx.posMembershipTerms.create({
              data: {
                itemId: id,
                version: (latest?.version ?? 0) + 1,
                totalSessions: input.membershipSessions,
                renewalThreshold: input.membershipRenewalThreshold,
                conditions:
                  (input.membershipConditions as Prisma.InputJsonValue | null) ??
                  undefined,
                createdByCredentialId: req.posUser!.credentialId,
              },
            });
            return tx.catalogItem.findUniqueOrThrow({
              where: { id },
              include: {
                family: true,
                category: true,
                benefits: { orderBy: { sortOrder: "asc" } },
                assets: true,
                membershipTerms: membershipTermsInclude,
              },
            });
          }
        }
        return updated;
      });
      if (!item)
        return res.status(404).json({
          success: false,
          message: "Artículo no encontrado",
          data: null,
        });
      res.json({
        success: true,
        message:
          "Artículo actualizado; el historial de precios permanece inmutable",
        data: catalogDto(item, costsAllowed(req)),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "MEMBERSHIP_KIND_IMMUTABLE"
      )
        return res.status(409).json({
          success: false,
          message:
            "Una membresía no puede convertirse desde o hacia un artículo físico existente",
          data: null,
        });
      res
        .status(409)
        .json({ success: false, message: "SKU ya registrado", data: null });
    }
  },
);

router.delete(
  "/catalog/items/:id",
  requirePosPermission("CATALOG_MANAGE"),
  async (req, res) => {
    const result = await db.catalogItem.updateMany({
      where: { id: req.params["id"]!, deletedAt: null },
      data: { active: false, published: false, deletedAt: new Date() },
    });
    res.status(result.count ? 200 : 404).json({
      success: Boolean(result.count),
      message: result.count ? "Artículo desactivado" : "Artículo no encontrado",
      data: null,
    });
  },
);

router.get(
  "/catalog/taxonomies",
  requirePosPermission("CATALOG_VIEW"),
  async (_req, res) => {
    const items = await db.catalogTaxonomy.findMany({
      where: { deletedAt: null },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });
    res.json({
      success: true,
      message: "OK",
      data: items.map(({ id, name, active, parentId }) => ({
        id,
        name,
        active,
        parentId,
      })),
    });
  },
);
router.post(
  "/catalog/taxonomies",
  requirePosPermission("CATALOG_MANAGE"),
  async (req, res) => {
    const parsed = posTaxonomyUpsertSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Taxonomía inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    if (
      parsed.data.parentId &&
      !(await db.catalogTaxonomy.findFirst({
        where: { id: parsed.data.parentId, active: true, deletedAt: null },
      }))
    )
      return res.status(400).json({
        success: false,
        message: "Familia padre inválida",
        data: null,
      });
    try {
      const item = await db.catalogTaxonomy.create({
        data: { ...parsed.data, normalizedName: normalize(parsed.data.name) },
      });
      res
        .status(201)
        .json({ success: true, message: "Taxonomía creada", data: item });
    } catch {
      res
        .status(409)
        .json({ success: false, message: "Taxonomía duplicada", data: null });
    }
  },
);

router.post(
  "/catalog/items/:id/assets",
  requirePosPermission("CATALOG_MANAGE"),
  upload.single("file"),
  async (req, res) => {
    const metadata = posAssetUploadMetadataSchema.safeParse(req.body);
    if (!metadata.success || !req.file)
      return res
        .status(400)
        .json({ success: false, message: "Imagen inválida", data: null });
    const item = await db.catalogItem.findFirst({
      where: { id: req.params["id"]!, deletedAt: null },
      select: { id: true },
    });
    if (!item)
      return res.status(404).json({
        success: false,
        message: "Artículo no encontrado",
        data: null,
      });
    try {
      validateCatalogImage(req.file);
      const stored = await uploadCatalogImage(item.id, req.file);
      const asset = await db.$transaction(async (tx) => {
        if (metadata.data.isPrimary)
          await tx.catalogAsset.updateMany({
            where: { itemId: item.id, isPrimary: true },
            data: { isPrimary: false },
          });
        return tx.catalogAsset.create({
          data: {
            itemId: item.id,
            ...stored,
            fileName: req.file!.originalname.slice(0, 255),
            mimeType: req.file!.mimetype,
            sizeBytes: req.file!.size,
            isPrimary: metadata.data.isPrimary,
            status: "READY",
            createdByCredentialId: req.posUser!.credentialId,
          },
        });
      });
      res.status(201).json({
        success: true,
        message: "Imagen guardada",
        data: {
          id: asset.id,
          publicUrl: asset.publicUrl,
          mimeType: asset.mimeType,
          isPrimary: asset.isPrimary,
          status: asset.status,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la imagen",
        data: null,
      });
    }
  },
);

router.get("/customers/search", requireCustomerReadOrSale, async (req, res) => {
  const parsed = posCustomerSearchQuerySchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({
      success: false,
      message: "Indica al menos dos caracteres para buscar",
      data: parsed.error.flatten().fieldErrors,
    });
  const needle = normalize(parsed.data.query);
  const phone = normalizePhone(parsed.data.query);
  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    active: true,
    OR: [
      { normalizedName: { contains: needle, mode: "insensitive" } },
      ...(phone ? [{ phone: { contains: phone } }] : []),
    ],
  };
  const [items, total] = await Promise.all([
    db.customer.findMany({
      where,
      include: {
        portfolios: {
          where: { effectiveTo: null },
          include: {
            employee: { select: { id: true, nombreCompleto: true } },
            company: { select: { id: true, name: true, salesNumber: true } },
          },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
      orderBy: { displayName: "asc" },
      skip: (parsed.data.page - 1) * parsed.data.pageSize,
      take: parsed.data.pageSize,
    }),
    db.customer.count({ where }),
  ]);
  res.json({
    success: true,
    message: "OK",
    data: {
      items: items.map((item) => {
        const portfolio = item.portfolios[0];
        return {
          id: item.id,
          displayName: item.displayName,
          phone: item.phone,
          email: item.email,
          active: item.active,
          agendaLinked: Boolean(item.externalClientId),
          currentPortfolio: portfolio
            ? {
                kind: portfolio.companyId
                  ? ("COMPANY" as const)
                  : ("SELLER" as const),
                employeeId: portfolio.employeeId,
                companyId: portfolio.companyId,
                ownerName:
                  portfolio.ownerNameSnapshot ??
                  portfolio.company?.name ??
                  portfolio.employee?.nombreCompleto ??
                  null,
                ownerCode:
                  portfolio.ownerCodeSnapshot ??
                  portfolio.company?.salesNumber ??
                  portfolio.employeeId,
              }
            : null,
        };
      }),
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total,
    },
  });
});

router.post(
  "/customers",
  requirePosPermission("CUSTOMERS_MANAGE"),
  async (req, res) => {
    const parsed = posCustomerWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Cliente inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    const input = parsed.data;
    if (input.branchId)
      assertBranchAuthorized(req.posUser!.authorizedBranchIds, input.branchId);
    try {
      const customer = await db.$transaction(async (tx) => {
        const source = input.sourceId
          ? await tx.customerSource.findFirst({
              where: { id: input.sourceId, active: true, deletedAt: null },
              select: { companyOwnedByDefault: true },
            })
          : null;
        const company = source?.companyOwnedByDefault
          ? await tx.posCommercialCompany.findFirst({ where: { active: true } })
          : null;
        if (source?.companyOwnedByDefault && !company)
          throw new Error("ACTIVE_COMPANY_REQUIRED");
        const created = await tx.customer.create({
          data: {
            displayName: input.displayName,
            normalizedName: normalize(input.displayName),
            phone: normalizePhone(input.phone),
            email: input.email?.toLocaleLowerCase("en-US") ?? null,
            sourceId: input.sourceId,
            notes: input.notes,
            active: input.active,
          },
        });
        if (input.branchId || input.employeeId || company)
          await tx.customerPortfolioAssignment.create({
            data: {
              customerId: created.id,
              branchId: input.branchId,
              employeeId: company ? null : input.employeeId,
              companyId: company?.id ?? null,
              ownerNameSnapshot: company?.name ?? null,
              ownerCodeSnapshot: company?.salesNumber ?? null,
              createdByCredentialId: req.posUser!.credentialId,
            },
          });
        return { created, company };
      });
      res.status(201).json({
        success: true,
        message: "Cliente creado",
        data: {
          id: customer.created.id,
          displayName: customer.created.displayName,
          phone: customer.created.phone,
          email: customer.created.email,
          active: customer.created.active,
          agendaLinked: Boolean(customer.created.externalClientId),
          currentPortfolio: customer.company
            ? {
                kind: "COMPANY",
                employeeId: null,
                companyId: customer.company.id,
                ownerName: customer.company.name,
                ownerCode: customer.company.salesNumber,
              }
            : input.employeeId
              ? {
                  kind: "SELLER",
                  employeeId: input.employeeId,
                  companyId: null,
                  ownerName: null,
                  ownerCode: input.employeeId,
                }
              : null,
        },
      });
    } catch (error) {
      res.status(409).json({
        success: false,
        message:
          error instanceof Error && error.message === "ACTIVE_COMPANY_REQUIRED"
            ? "No hay una empresa comercial activa para esta procedencia"
            : "Teléfono ya registrado",
        data: null,
      });
    }
  },
);

router.put(
  "/customers/:id",
  requirePosPermission("CUSTOMERS_MANAGE"),
  async (req, res) => {
    const parsed = posCustomerWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Cliente inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    const input = parsed.data;
    const updatesPortfolio =
      Object.prototype.hasOwnProperty.call(req.body, "branchId") ||
      Object.prototype.hasOwnProperty.call(req.body, "employeeId");
    if (input.branchId)
      assertBranchAuthorized(req.posUser!.authorizedBranchIds, input.branchId);
    try {
      const { customer, portfolio, agendaEventId } = await db.$transaction(
        async (tx) => {
          const updated = await tx.customer.update({
            where: { id: req.params["id"]! },
            data: {
              displayName: input.displayName,
              normalizedName: normalize(input.displayName),
              phone: normalizePhone(input.phone),
              email: input.email?.toLocaleLowerCase("en-US") ?? null,
              sourceId: input.sourceId,
              notes: input.notes,
              active: input.active,
            },
          });
          const event = updated.externalClientId
            ? await enqueueAgendaCustomerUpdate(tx, updated.id)
            : null;
          if (updatesPortfolio) {
            const employee = input.employeeId
              ? await tx.empleado.findFirst({
                  where: { id: input.employeeId, activo: true },
                  select: { id: true, nombreCompleto: true },
                })
              : null;
            if (input.employeeId && !employee)
              throw new Error("ACTIVE_EMPLOYEE_REQUIRED");
            const company = !employee
              ? await tx.posCommercialCompany.findFirst({
                  where: { active: true },
                  orderBy: { creadoEn: "asc" },
                })
              : null;
            if (!employee && !company)
              throw new Error("ACTIVE_COMPANY_REQUIRED");
            const previousPortfolio =
              await tx.customerPortfolioAssignment.findFirst({
                where: { customerId: updated.id, effectiveTo: null },
                orderBy: { effectiveFrom: "desc" },
              });
            if (
              previousPortfolio?.branchId !== input.branchId ||
              previousPortfolio?.employeeId !== (employee?.id ?? null) ||
              previousPortfolio?.companyId !== (company?.id ?? null)
            ) {
              await tx.customerPortfolioAssignment.updateMany({
                where: { customerId: updated.id, effectiveTo: null },
                data: {
                  effectiveTo: new Date(),
                  endedReason: "MANUAL_TRANSFER",
                },
              });
              await tx.customerPortfolioAssignment.create({
                data: {
                  customerId: updated.id,
                  branchId: input.branchId,
                  employeeId: employee?.id ?? null,
                  companyId: company?.id ?? null,
                  ownerNameSnapshot: employee?.nombreCompleto ?? company?.name,
                  ownerCodeSnapshot: employee?.id ?? company?.salesNumber,
                  createdByCredentialId: req.posUser!.credentialId,
                },
              });
            }
          }
          const currentPortfolio =
            await tx.customerPortfolioAssignment.findFirst({
              where: { customerId: updated.id, effectiveTo: null },
              include: {
                employee: { select: { nombreCompleto: true } },
                company: { select: { name: true, salesNumber: true } },
              },
              orderBy: { effectiveFrom: "desc" },
            });
          return {
            customer: updated,
            portfolio: currentPortfolio,
            agendaEventId: event?.id ?? null,
          };
        },
      );
      if (agendaEventId)
        await processAgendaSyncEvents({
          eventId: agendaEventId,
          limit: 1,
        }).catch(() => undefined);
      res.json({
        success: true,
        message: "Cliente actualizado",
        data: {
          id: customer.id,
          displayName: customer.displayName,
          phone: customer.phone,
          email: customer.email,
          active: customer.active,
          agendaLinked: Boolean(customer.externalClientId),
          currentPortfolio: portfolio
            ? {
                kind: portfolio.companyId
                  ? ("COMPANY" as const)
                  : ("SELLER" as const),
                employeeId: portfolio.employeeId,
                companyId: portfolio.companyId,
                ownerName:
                  portfolio.ownerNameSnapshot ??
                  portfolio.company?.name ??
                  portfolio.employee?.nombreCompleto ??
                  null,
                ownerCode:
                  portfolio.ownerCodeSnapshot ??
                  portfolio.company?.salesNumber ??
                  portfolio.employeeId,
              }
            : null,
        },
      });
    } catch {
      res.status(404).json({
        success: false,
        message: "Cliente no encontrado o teléfono duplicado",
        data: null,
      });
    }
  },
);

router.delete(
  "/customers/:id",
  requirePosPermission("CUSTOMERS_MANAGE"),
  async (req, res) => {
    const result = await db.customer.updateMany({
      where: { id: req.params["id"]!, deletedAt: null },
      data: { active: false, deletedAt: new Date() },
    });
    res.status(result.count ? 200 : 404).json({
      success: Boolean(result.count),
      message: result.count ? "Cliente desactivado" : "Cliente no encontrado",
      data: null,
    });
  },
);

router.get(
  "/customers/sources",
  requireCustomerReadOrSale,
  async (_req, res) => {
    const items = await db.customerSource.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    res.json({
      success: true,
      message: "OK",
      data: items.map(({ id, name, active, companyOwnedByDefault }) => ({
        id,
        name,
        active,
        companyOwnedByDefault,
      })),
    });
  },
);
router.post(
  "/customers/sources",
  requirePosPermission("CUSTOMERS_MANAGE"),
  async (req, res) => {
    const parsed = posCustomerSourceWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Fuente inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.customerSource.create({ data: parsed.data });
      res
        .status(201)
        .json({ success: true, message: "Fuente creada", data: item });
    } catch {
      res
        .status(409)
        .json({ success: false, message: "Fuente duplicada", data: null });
    }
  },
);
router.put(
  "/customers/sources/:id",
  requirePosPermission("CUSTOMERS_MANAGE"),
  async (req, res) => {
    const parsed = posCustomerSourceWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Fuente inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.customerSource.update({
        where: { id: req.params["id"]! },
        data: parsed.data,
      });
      res.json({ success: true, message: "Fuente actualizada", data: item });
    } catch {
      res.status(409).json({
        success: false,
        message: "Fuente no encontrada o duplicada",
        data: null,
      });
    }
  },
);

router.get(
  "/suppliers",
  requireAnyPosPermission("SUPPLIERS_VIEW", "WAREHOUSE_MANAGE"),
  async (_req, res) => {
    const items = await db.posSupplier.findMany({
      where: { deletedAt: null },
      orderBy: { businessName: "asc" },
    });
    res.json({
      success: true,
      message: "OK",
      data: items.map((item) => ({
        id: item.id,
        folio: item.folio,
        businessName: item.businessName,
        contactName: item.contactName,
        rfc: item.rfc,
        phone: item.phone,
        email: item.email,
        address: item.address,
        active: item.active,
      })),
    });
  },
);
router.post(
  "/suppliers",
  requireAnyPosPermission("SUPPLIERS_MANAGE", "WAREHOUSE_MANAGE"),
  async (req, res) => {
    const parsed = posSupplierWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Proveedor inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.posSupplier.create({
        data: {
          ...parsed.data,
          normalizedName: normalize(parsed.data.businessName),
        },
      });
      res
        .status(201)
        .json({ success: true, message: "Proveedor creado", data: item });
    } catch {
      res.status(409).json({
        success: false,
        message: "Proveedor o folio duplicado",
        data: null,
      });
    }
  },
);
router.put(
  "/suppliers/:id",
  requireAnyPosPermission("SUPPLIERS_MANAGE", "WAREHOUSE_MANAGE"),
  async (req, res) => {
    const parsed = posSupplierWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Proveedor inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.posSupplier.update({
        where: { id: req.params["id"]! },
        data: {
          ...parsed.data,
          normalizedName: normalize(parsed.data.businessName),
        },
      });
      res.json({ success: true, message: "Proveedor actualizado", data: item });
    } catch {
      res.status(404).json({
        success: false,
        message: "Proveedor no encontrado o duplicado",
        data: null,
      });
    }
  },
);

router.get(
  "/settings/payment-methods",
  requirePaymentReadOrSale,
  async (_req, res) => {
    const items = await db.metodoPago.findMany({
      orderBy: { nombre: "asc" },
      include: { posPolicy: true },
    });
    res.json({
      success: true,
      message: "OK",
      data: items.map((item) => ({
        id: item.id,
        name: item.nombre,
        type: item.tipo,
        active: item.activo,
        activeForPos: item.posPolicy?.activeForPos ?? false,
        requiresReference: item.posPolicy?.requiresReference ?? false,
        referenceLabel: item.posPolicy?.referenceLabel ?? null,
      })),
    });
  },
);
router.post(
  "/settings/payment-methods",
  requirePosPermission("PAYMENTS_MANAGE"),
  async (req, res) => {
    const parsed = posPaymentPolicyWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Método inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    const input = parsed.data;
    const duplicate = await db.metodoPago.findFirst({
      where: { nombre: { equals: input.name, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate)
      return res.status(409).json({
        success: false,
        message: "Ya existe un método con ese nombre",
        data: null,
      });
    const item = await db.metodoPago.create({
      data: {
        nombre: input.name,
        tipo: input.type,
        activo: input.active,
        posPolicy: {
          create: {
            activeForPos: input.activeForPos,
            requiresReference: input.requiresReference,
            referenceLabel: input.referenceLabel,
            minAmount: input.minAmount ? decimal(input.minAmount) : null,
            maxAmount: input.maxAmount ? decimal(input.maxAmount) : null,
          },
        },
      },
      include: { posPolicy: true },
    });
    res.status(201).json({
      success: true,
      message: "Método POS creado",
      data: {
        id: item.id,
        name: item.nombre,
        type: item.tipo,
        active: item.activo,
        activeForPos: item.posPolicy!.activeForPos,
        requiresReference: item.posPolicy!.requiresReference,
        referenceLabel: item.posPolicy!.referenceLabel,
      },
    });
  },
);
router.put(
  "/settings/payment-methods/:id",
  requirePosPermission("PAYMENTS_MANAGE"),
  async (req, res) => {
    const parsed = posPaymentPolicyWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Método inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    const input = parsed.data;
    try {
      const item = await db.metodoPago.update({
        where: { id: req.params["id"]! },
        data: {
          nombre: input.name,
          tipo: input.type,
          activo: input.active,
          posPolicy: {
            upsert: {
              create: {
                activeForPos: input.activeForPos,
                requiresReference: input.requiresReference,
                referenceLabel: input.referenceLabel,
                minAmount: input.minAmount ? decimal(input.minAmount) : null,
                maxAmount: input.maxAmount ? decimal(input.maxAmount) : null,
              },
              update: {
                activeForPos: input.activeForPos,
                requiresReference: input.requiresReference,
                referenceLabel: input.referenceLabel,
                minAmount: input.minAmount ? decimal(input.minAmount) : null,
                maxAmount: input.maxAmount ? decimal(input.maxAmount) : null,
              },
            },
          },
        },
        include: { posPolicy: true },
      });
      res.json({
        success: true,
        message: "Método POS actualizado",
        data: {
          id: item.id,
          name: item.nombre,
          type: item.tipo,
          active: item.activo,
          activeForPos: item.posPolicy!.activeForPos,
          requiresReference: item.posPolicy!.requiresReference,
          referenceLabel: item.posPolicy!.referenceLabel,
        },
      });
    } catch {
      res.status(404).json({
        success: false,
        message: "Método de pago no encontrado",
        data: null,
      });
    }
  },
);

router.get(
  "/settings/ticket",
  requireAnyPosPermission("SETTINGS_VIEW", "SETTINGS_MANAGE", "SALE_CREATE"),
  async (req, res) => {
    const config = await db.posTicketConfiguration.findFirst({
      where: { branchId: req.posUser!.branchId },
    });
    res.json({
      success: true,
      message: "OK",
      data: {
        branchId: req.posUser!.branchId,
        logoUrl: null,
        companyName: config?.companyName ?? "KEYSAR COSMETICS",
        address: config?.address ?? null,
        footerMessage: config?.footerMessage ?? null,
        policies: config?.policies ?? null,
        showClientName: config?.showClientName ?? true,
        showClientPhone: config?.showClientPhone ?? true,
        showSellerName: config?.showSellerName ?? true,
        showVatBreakdown: config?.showVatBreakdown ?? true,
        showSpareCoverageMessage: config?.showSpareCoverageMessage ?? true,
      },
    });
  },
);
router.put(
  "/settings/ticket",
  requirePosPermission("SETTINGS_MANAGE"),
  async (req, res) => {
    const parsed = posTicketConfigurationWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Configuración inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    const config = await db.posTicketConfiguration.upsert({
      where: { branchId: req.posUser!.branchId },
      create: { branchId: req.posUser!.branchId, ...parsed.data },
      update: parsed.data,
    });
    res.json({
      success: true,
      message: "Configuración actualizada",
      data: { ...config, logoUrl: null },
    });
  },
);

router.get(
  "/settings/vouchers",
  requirePosPermission("VOUCHERS_MANAGE"),
  async (_req, res) => {
    const items = await db.posVoucherTemplate.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    res.json({
      success: true,
      message: "OK",
      data: items.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        value: MONEY(item.value),
        message: item.message,
        active: item.active,
        visibleToSellers: item.visibleToSellers,
      })),
    });
  },
);
router.post(
  "/settings/vouchers",
  requirePosPermission("VOUCHERS_MANAGE"),
  async (req, res) => {
    const parsed = posVoucherTemplateWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Voucher inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.posVoucherTemplate.create({
        data: { ...parsed.data, value: decimal(parsed.data.value) },
      });
      res.status(201).json({
        success: true,
        message: "Plantilla creada",
        data: { ...item, value: MONEY(item.value) },
      });
    } catch {
      res.status(409).json({
        success: false,
        message: "Nombre de voucher duplicado",
        data: null,
      });
    }
  },
);

router.get("/packages", requirePackageReadOrSale, async (_req, res) => {
  const items = await db.posPackage.findMany({
    where: { deletedAt: null },
    include: { lines: true },
    orderBy: { name: "asc" },
  });
  res.json({
    success: true,
    message: "OK",
    data: items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      description: item.description,
      price: MONEY(item.price),
      status: item.status,
      startsAt: item.startsAt?.toISOString() ?? null,
      endsAt: item.endsAt?.toISOString() ?? null,
      lines: item.lines.map((line) => ({
        itemId: line.itemId,
        quantity: MONEY(line.quantity),
      })),
    })),
  });
});
router.post(
  "/packages",
  requirePosPermission("CATALOG_MANAGE"),
  async (req, res) => {
    const parsed = posPackageWriteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Paquete inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    const items = await db.catalogItem.count({
      where: {
        id: { in: parsed.data.lines.map((line) => line.itemId) },
        active: true,
        deletedAt: null,
      },
    });
    if (items !== new Set(parsed.data.lines.map((line) => line.itemId)).size)
      return res.status(400).json({
        success: false,
        message: "El paquete contiene artículos inválidos",
        data: null,
      });
    try {
      const item = await db.posPackage.create({
        data: {
          name: parsed.data.name,
          sku: normalizeSku(parsed.data.sku),
          description: parsed.data.description,
          price: decimal(parsed.data.price),
          status: parsed.data.status,
          startsAt: parsed.data.startsAt
            ? new Date(parsed.data.startsAt)
            : null,
          endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
          lines: {
            create: parsed.data.lines.map((line) => ({
              itemId: line.itemId,
              quantity: decimal(line.quantity),
            })),
          },
        },
        include: { lines: true },
      });
      res.status(201).json({
        success: true,
        message: "Paquete creado",
        data: {
          ...item,
          price: MONEY(item.price),
          lines: item.lines.map((line) => ({
            itemId: line.itemId,
            quantity: MONEY(line.quantity),
          })),
        },
      });
    } catch {
      res.status(409).json({
        success: false,
        message: "SKU de paquete duplicado",
        data: null,
      });
    }
  },
);

const priceListSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    supplierId: z.string().trim().min(1).nullable().default(null),
    status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).default("DRAFT"),
    effectiveFrom: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .default(null),
    effectiveTo: z.string().datetime({ offset: true }).nullable().default(null),
    branchIds: z.array(z.string().trim().min(1)).max(500).default([]),
    customerIds: z.array(z.string().trim().min(1)).max(500).default([]),
    lines: z
      .array(
        z
          .object({
            itemId: z.string().trim().min(1),
            price: z.string().regex(/^(?:0|[1-9]\d*)\.\d{2}$/),
            cost: z
              .string()
              .regex(/^(?:0|[1-9]\d*)\.\d{2}$/)
              .nullable()
              .default(null),
          })
          .strict(),
      )
      .min(1)
      .max(1_000),
  })
  .strict();
router.get(
  "/price-lists",
  requirePosPermission("WAREHOUSE_MANAGE"),
  async (req, res) => {
    const items = await db.posPriceList.findMany({
      where: {
        deletedAt: null,
        OR: [
          { branchAssignments: { none: {} } },
          {
            branchAssignments: {
              some: { branchId: { in: req.posUser!.authorizedBranchIds } },
            },
          },
        ],
      },
      include: {
        supplier: true,
        lines: true,
        branchAssignments: { include: { branch: true } },
        customerAssignments: { include: { customer: true } },
      },
      orderBy: [{ name: "asc" }, { version: "desc" }],
    });
    res.json({
      success: true,
      message: "OK",
      data: items.map((item) => ({
        id: item.id,
        name: item.name,
        version: item.version,
        status: item.status,
        supplierId: item.supplierId,
        supplierName: item.supplier?.businessName ?? null,
        effectiveFrom: item.effectiveFrom?.toISOString() ?? null,
        effectiveTo: item.effectiveTo?.toISOString() ?? null,
        branchIds: item.branchAssignments.map(
          (assignment) => assignment.branchId,
        ),
        customerIds: item.customerAssignments.map(
          (assignment) => assignment.customerId,
        ),
        lines: item.lines.map((line) => ({
          itemId: line.itemId,
          price: MONEY(line.price),
          ...(costsAllowed(req) ? { cost: MONEY(line.cost) } : {}),
        })),
      })),
    });
  },
);
router.post(
  "/price-lists",
  requirePosPermission("WAREHOUSE_MANAGE"),
  async (req, res) => {
    const parsed = priceListSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Lista de precios inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    const input = parsed.data;
    resolveRequestedBranchIds({
      authorizedBranchIds: req.posUser!.authorizedBranchIds,
      requestedBranchIds: input.branchIds,
    });
    if (
      input.effectiveFrom &&
      input.effectiveTo &&
      new Date(input.effectiveTo) <= new Date(input.effectiveFrom)
    )
      return res
        .status(400)
        .json({ success: false, message: "Vigencia inválida", data: null });
    const itemIds = new Set(input.lines.map((line) => line.itemId));
    if (
      itemIds.size !== input.lines.length ||
      (await db.catalogItem.count({
        where: { id: { in: [...itemIds] }, deletedAt: null, active: true },
      })) !== itemIds.size
    )
      return res.status(400).json({
        success: false,
        message: "La lista contiene artículos inválidos",
        data: null,
      });
    try {
      const latest = await db.posPriceList.aggregate({
        where: { name: input.name },
        _max: { version: true },
      });
      const list = await db.posPriceList.create({
        data: {
          name: input.name,
          version: (latest._max.version ?? 0) + 1,
          supplierId: input.supplierId,
          status: input.status,
          effectiveFrom: input.effectiveFrom
            ? new Date(input.effectiveFrom)
            : null,
          effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
          lines: {
            create: input.lines.map((line) => ({
              itemId: line.itemId,
              price: decimal(line.price),
              cost: line.cost ? decimal(line.cost) : null,
            })),
          },
          branchAssignments: {
            create: [...new Set(input.branchIds)].map((branchId) => ({
              branchId,
            })),
          },
          customerAssignments: {
            create: [...new Set(input.customerIds)].map((customerId) => ({
              customerId,
            })),
          },
        },
        include: { lines: true },
      });
      res.status(201).json({
        success: true,
        message: "Lista de precios versionada",
        data: {
          id: list.id,
          name: list.name,
          version: list.version,
          status: list.status,
          lines: list.lines.map((line) => ({
            itemId: line.itemId,
            price: MONEY(line.price),
            ...(costsAllowed(req) ? { cost: MONEY(line.cost) } : {}),
          })),
        },
      });
    } catch {
      res.status(400).json({
        success: false,
        message: "No se pudo crear la lista de precios",
        data: null,
      });
    }
  },
);

const customerFieldSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(/^[A-Z0-9_]+$/)
      .max(80),
    label: z.string().trim().min(2).max(120),
    required: z.boolean().default(false),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(10_000).default(0),
  })
  .strict();
router.get(
  "/settings/customer-fields",
  requireAnyPosPermission(
    "SETTINGS_VIEW",
    "SETTINGS_MANAGE",
    "SALE_CREATE",
    "CUSTOMERS_VIEW",
  ),
  async (_req, res) => {
    const items = await db.posCustomerRequiredField.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    res.json({ success: true, message: "OK", data: items });
  },
);
router.put(
  "/settings/customer-fields/:key",
  requirePosPermission("CUSTOMERS_MANAGE"),
  async (req, res) => {
    const parsed = customerFieldSchema.safeParse({
      ...req.body,
      key: req.params["key"],
    });
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Campo de cliente inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    const field = await db.posCustomerRequiredField.upsert({
      where: { key: parsed.data.key },
      create: parsed.data,
      update: parsed.data,
    });
    res.json({
      success: true,
      message: "Campo de cliente actualizado",
      data: field,
    });
  },
);

const courtesySchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1_000).nullable().default(null),
    requiresCustomer: z.boolean().default(true),
    requiresAuthorization: z.boolean().default(true),
    active: z.boolean().default(true),
  })
  .strict();
router.get(
  "/settings/courtesies",
  requirePosPermission("VOUCHERS_MANAGE"),
  async (_req, res) => {
    const items = await db.posCourtesyPolicy.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, message: "OK", data: items });
  },
);
router.post(
  "/settings/courtesies",
  requirePosPermission("VOUCHERS_MANAGE"),
  async (req, res) => {
    const parsed = courtesySchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Cortesía inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.posCourtesyPolicy.create({ data: parsed.data });
      res
        .status(201)
        .json({ success: true, message: "Cortesía creada", data: item });
    } catch {
      res.status(409).json({
        success: false,
        message: "Nombre de cortesía duplicado",
        data: null,
      });
    }
  },
);

const competitionSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    type: z.enum(["AMOUNT", "PRODUCT", "PACKAGE", "PERIOD"]),
    active: z.boolean().default(true),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    branchId: z.string().trim().min(1).nullable().default(null),
    targetAmount: z
      .string()
      .regex(/^(?:0|[1-9]\d*)\.\d{2}$/)
      .nullable()
      .default(null),
    itemId: z.string().trim().min(1).nullable().default(null),
    packageItemIds: z.array(z.string().trim().min(1)).max(100).default([]),
  })
  .strict();
const competitionDto = (item: PosSalesCompetition) => ({
  ...item,
  dateFrom: item.dateFrom.toISOString().slice(0, 10),
  dateTo: item.dateTo.toISOString().slice(0, 10),
  targetAmount: MONEY(item.targetAmount),
  creadoEn: item.creadoEn.toISOString(),
});
const validCompetition = (input: z.infer<typeof competitionSchema>) =>
  input.dateTo >= input.dateFrom &&
  !(
    (input.type === "AMOUNT" && !input.targetAmount) ||
    (input.type === "PRODUCT" && !input.itemId) ||
    (input.type === "PACKAGE" && input.packageItemIds.length === 0)
  );
const competitionData = (input: z.infer<typeof competitionSchema>) => ({
  name: input.name,
  type: input.type,
  active: input.active,
  dateFrom: new Date(`${input.dateFrom}T00:00:00.000Z`),
  dateTo: new Date(`${input.dateTo}T00:00:00.000Z`),
  branchId: input.branchId,
  targetAmount: input.targetAmount ? decimal(input.targetAmount) : null,
  itemId: input.itemId,
  packageItemIds: input.packageItemIds,
});
router.get(
  "/competitions",
  requireAnyPosPermission("COMPETITIONS_VIEW", "REPORTS_VIEW"),
  async (req, res) => {
    const items = await db.posSalesCompetition.findMany({
      where: {
        deletedAt: null,
        OR: [
          { branchId: null },
          { branchId: { in: req.posUser!.authorizedBranchIds } },
        ],
      },
      orderBy: { dateFrom: "desc" },
    });
    res.json({ success: true, message: "OK", data: items.map(competitionDto) });
  },
);
router.post(
  "/competitions",
  requirePosPermission("COMPETITIONS_MANAGE"),
  async (req, res) => {
    const parsed = competitionSchema.safeParse(req.body);
    if (!parsed.success || !validCompetition(parsed.data))
      return res.status(400).json({
        success: false,
        message: "Competencia inválida o incompleta",
        data: parsed.success ? null : parsed.error.flatten().fieldErrors,
      });
    if (parsed.data.branchId)
      assertBranchAuthorized(
        req.posUser!.authorizedBranchIds,
        parsed.data.branchId,
      );
    const item = await db.posSalesCompetition.create({
      data: competitionData(parsed.data),
    });
    res.status(201).json({
      success: true,
      message: "Competencia creada",
      data: competitionDto(item),
    });
  },
);
router.put(
  "/competitions/:id",
  requirePosPermission("COMPETITIONS_MANAGE"),
  async (req, res) => {
    const parsed = competitionSchema.safeParse(req.body);
    if (!parsed.success || !validCompetition(parsed.data))
      return res.status(400).json({
        success: false,
        message: "Competencia inválida o incompleta",
        data: parsed.success ? null : parsed.error.flatten().fieldErrors,
      });
    if (parsed.data.branchId)
      assertBranchAuthorized(
        req.posUser!.authorizedBranchIds,
        parsed.data.branchId,
      );
    const updated = await db.posSalesCompetition.updateMany({
      where: {
        id: req.params["id"]!,
        deletedAt: null,
        OR: [
          { branchId: null },
          { branchId: { in: req.posUser!.authorizedBranchIds } },
        ],
      },
      data: competitionData(parsed.data),
    });
    if (!updated.count)
      return res.status(404).json({
        success: false,
        message: "Competencia no encontrada",
        data: null,
      });
    const item = await db.posSalesCompetition.findUniqueOrThrow({
      where: { id: req.params["id"]! },
    });
    res.json({
      success: true,
      message: "Competencia actualizada",
      data: competitionDto(item),
    });
  },
);
router.delete(
  "/competitions/:id",
  requirePosPermission("COMPETITIONS_MANAGE"),
  async (req, res) => {
    const result = await db.posSalesCompetition.updateMany({
      where: {
        id: req.params["id"]!,
        deletedAt: null,
        OR: [
          { branchId: null },
          { branchId: { in: req.posUser!.authorizedBranchIds } },
        ],
      },
      data: { active: false, deletedAt: new Date() },
    });
    res.status(result.count ? 200 : 404).json({
      success: Boolean(result.count),
      message: result.count
        ? "Competencia inactivada"
        : "Competencia no encontrada",
      data: result.count ? { id: req.params["id"]! } : null,
    });
  },
);

router.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof multer.MulterError)
      return res.status(400).json({
        success: false,
        message: "Archivo demasiado grande o inválido",
        data: null,
      });
    next(error);
  },
);

export default router;
