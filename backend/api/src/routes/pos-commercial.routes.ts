import { randomUUID } from "node:crypto";
import { Router, type Request, type Router as ExpressRouter } from "express";
import { Prisma, type PosCatalogChangeAction } from "@prisma/client";
import { z } from "zod";
import {
  posAuthMiddleware,
  requireAnyPosPermission,
  requirePosPermission,
} from "../middlewares/pos-auth.middleware";
import { prisma } from "../prisma/client";
import { consumeTicketAuthorization } from "../services/pos-tickets";

const router: ExpressRouter = Router();
const db = prisma;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-MX");

const catalogRead = requireAnyPosPermission(
  "SALE_CREATE",
  "PAYMENTS_MANAGE",
  "SETTINGS_VIEW",
  "SETTINGS_MANAGE",
  "REPORTS_VIEW",
);

const bankSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    active: z.boolean().default(true),
    sourceName: z.string().trim().min(2).max(120).default("MANUAL"),
    sourceReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();
const networkSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    active: z.boolean().default(true),
    sourceName: z.string().trim().min(2).max(120).default("MANUAL"),
    sourceReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();
const installmentSchema = z
  .object({
    months: z.number().int().min(1).max(120),
    label: z.string().trim().min(2).max(120),
    active: z.boolean().default(true),
    sourceName: z.string().trim().min(2).max(120).default("MANUAL"),
    sourceReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();
const courtesyProductSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    type: z.enum(["FACIAL", "BODY"]),
    active: z.boolean().default(true),
  })
  .strict();
const courtesyPackageSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    productIds: z.array(z.string().trim().min(1)).min(1).max(2),
    active: z.boolean().default(true),
  })
  .strict();
const courtesyConfigurationSchema = z
  .object({
    required: z.boolean(),
    defaultPackageId: z.string().trim().min(1).nullable(),
  })
  .strict();
const companySchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    salesNumber: z
      .string()
      .trim()
      .regex(/^[A-Z0-9-]{3,80}$/),
    active: z.boolean().default(true),
  })
  .strict();
const employeeStatusSchema = z
  .object({
    active: z.boolean(),
    reason: z.string().trim().min(3).max(500),
    authorizationToken: z.string().uuid(),
  })
  .strict();

const auditData = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent")?.slice(0, 500),
  requestId: req.get("x-request-id")?.slice(0, 120),
});

const bankDto = (bank: {
  id: string;
  name: string;
  active: boolean;
  version: number;
  sourceName: string;
  sourceReviewedAt: Date;
}) => ({
  id: bank.id,
  name: bank.name,
  active: bank.active,
  version: bank.version,
  sourceName: bank.sourceName,
  sourceReviewedAt: bank.sourceReviewedAt.toISOString().slice(0, 10),
});

const cardNetworkDto = (item: {
  id: string;
  name: string;
  active: boolean;
  version: number;
  sourceName: string;
  sourceReviewedAt: Date;
}) => ({
  id: item.id,
  name: item.name,
  active: item.active,
  version: item.version,
  sourceName: item.sourceName,
  sourceReviewedAt: item.sourceReviewedAt.toISOString().slice(0, 10),
});

const installmentDto = (item: {
  id: string;
  months: number;
  label: string;
  active: boolean;
  version: number;
  sourceName: string;
  sourceReviewedAt: Date;
}) => ({
  id: item.id,
  months: item.months,
  label: item.label,
  active: item.active,
  version: item.version,
  sourceName: item.sourceName,
  sourceReviewedAt: item.sourceReviewedAt.toISOString().slice(0, 10),
});

router.get(
  "/settings/payment-catalogs",
  posAuthMiddleware,
  catalogRead,
  async (_req, res) => {
    const [banks, cardNetworks, installmentOptions] = await Promise.all([
      db.posBank.findMany({ orderBy: { name: "asc" } }),
      db.posCardNetwork.findMany({ orderBy: { name: "asc" } }),
      db.posInstallmentOption.findMany({ orderBy: { months: "asc" } }),
    ]);
    res.json({
      success: true,
      message: "OK",
      data: {
        banks: banks.map(bankDto),
        cardNetworks: cardNetworks.map(cardNetworkDto),
        installmentOptions: installmentOptions.map(installmentDto),
      },
    });
  },
);

function actionFor(
  previousActive: boolean,
  nextActive: boolean,
): PosCatalogChangeAction {
  if (previousActive && !nextActive) return "INACTIVATED";
  if (!previousActive && nextActive) return "REACTIVATED";
  return "UPDATED";
}

router.post(
  "/settings/banks",
  posAuthMiddleware,
  requirePosPermission("PAYMENTS_MANAGE"),
  async (req, res) => {
    const parsed = bankSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Banco inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const bank = await db.$transaction(async (tx) => {
        const created = await tx.posBank.create({
          data: {
            id: `MX-BANK-${randomUUID()}`,
            ...parsed.data,
            normalizedName: normalize(parsed.data.name),
            sourceReviewedAt: new Date(
              `${parsed.data.sourceReviewedAt}T00:00:00.000Z`,
            ),
            createdByCredentialId: req.posUser!.credentialId,
          },
        });
        await tx.posBankChange.create({
          data: {
            bankId: created.id,
            action: "CREATED",
            version: 1,
            nextSnapshot: parsed.data,
            actorCredentialId: req.posUser!.credentialId,
          },
        });
        return created;
      });
      res
        .status(201)
        .json({ success: true, message: "Banco creado", data: bankDto(bank) });
    } catch {
      res
        .status(409)
        .json({ success: false, message: "El banco ya existe", data: null });
    }
  },
);

router.put(
  "/settings/banks/:id",
  posAuthMiddleware,
  requirePosPermission("PAYMENTS_MANAGE"),
  async (req, res) => {
    const parsed = bankSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Banco inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const bank = await db.$transaction(async (tx) => {
        const previous = await tx.posBank.findUniqueOrThrow({
          where: { id: req.params["id"]! },
        });
        const version = previous.version + 1;
        const next = await tx.posBank.update({
          where: { id: previous.id },
          data: {
            ...parsed.data,
            normalizedName: normalize(parsed.data.name),
            sourceReviewedAt: new Date(
              `${parsed.data.sourceReviewedAt}T00:00:00.000Z`,
            ),
            version,
          },
        });
        await tx.posBankChange.create({
          data: {
            bankId: next.id,
            action: actionFor(previous.active, next.active),
            version,
            previousSnapshot: {
              name: previous.name,
              active: previous.active,
              sourceName: previous.sourceName,
              sourceReviewedAt: previous.sourceReviewedAt
                .toISOString()
                .slice(0, 10),
            },
            nextSnapshot: parsed.data,
            actorCredentialId: req.posUser!.credentialId,
          },
        });
        return next;
      });
      res.json({
        success: true,
        message: "Banco actualizado",
        data: bankDto(bank),
      });
    } catch {
      res.status(404).json({
        success: false,
        message: "Banco no encontrado o duplicado",
        data: null,
      });
    }
  },
);

router.post(
  "/settings/card-networks",
  posAuthMiddleware,
  requirePosPermission("PAYMENTS_MANAGE"),
  async (req, res) => {
    const parsed = networkSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Red inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.$transaction(async (tx) => {
        const created = await tx.posCardNetwork.create({
          data: {
            id: `NETWORK-${randomUUID()}`,
            ...parsed.data,
            sourceReviewedAt: new Date(
              `${parsed.data.sourceReviewedAt}T00:00:00.000Z`,
            ),
            normalizedName: normalize(parsed.data.name),
            createdByCredentialId: req.posUser!.credentialId,
          },
        });
        await tx.posCardNetworkChange.create({
          data: {
            networkId: created.id,
            action: "CREATED",
            version: 1,
            nextSnapshot: parsed.data,
            actorCredentialId: req.posUser!.credentialId,
          },
        });
        return created;
      });
      res.status(201).json({
        success: true,
        message: "Red creada",
        data: cardNetworkDto(item),
      });
    } catch {
      res
        .status(409)
        .json({ success: false, message: "La red ya existe", data: null });
    }
  },
);

router.put(
  "/settings/card-networks/:id",
  posAuthMiddleware,
  requirePosPermission("PAYMENTS_MANAGE"),
  async (req, res) => {
    const parsed = networkSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Red inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.$transaction(async (tx) => {
        const previous = await tx.posCardNetwork.findUniqueOrThrow({
          where: { id: req.params["id"]! },
        });
        const version = previous.version + 1;
        const next = await tx.posCardNetwork.update({
          where: { id: previous.id },
          data: {
            ...parsed.data,
            normalizedName: normalize(parsed.data.name),
            sourceReviewedAt: new Date(
              `${parsed.data.sourceReviewedAt}T00:00:00.000Z`,
            ),
            version,
          },
        });
        await tx.posCardNetworkChange.create({
          data: {
            networkId: next.id,
            action: actionFor(previous.active, next.active),
            version,
            previousSnapshot: {
              name: previous.name,
              active: previous.active,
              sourceName: previous.sourceName,
              sourceReviewedAt: previous.sourceReviewedAt
                .toISOString()
                .slice(0, 10),
            },
            nextSnapshot: parsed.data,
            actorCredentialId: req.posUser!.credentialId,
          },
        });
        return next;
      });
      res.json({
        success: true,
        message: "Red actualizada",
        data: cardNetworkDto(item),
      });
    } catch {
      res.status(404).json({
        success: false,
        message: "Red no encontrada o duplicada",
        data: null,
      });
    }
  },
);

router.post(
  "/settings/installment-options",
  posAuthMiddleware,
  requirePosPermission("PAYMENTS_MANAGE"),
  async (req, res) => {
    const parsed = installmentSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Plazo inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.$transaction(async (tx) => {
        const created = await tx.posInstallmentOption.create({
          data: {
            id: `MONTHS-${randomUUID()}`,
            ...parsed.data,
            sourceReviewedAt: new Date(
              `${parsed.data.sourceReviewedAt}T00:00:00.000Z`,
            ),
            createdByCredentialId: req.posUser!.credentialId,
          },
        });
        await tx.posInstallmentOptionChange.create({
          data: {
            optionId: created.id,
            action: "CREATED",
            version: 1,
            nextSnapshot: parsed.data,
            actorCredentialId: req.posUser!.credentialId,
          },
        });
        return created;
      });
      res.status(201).json({
        success: true,
        message: "Plazo creado",
        data: installmentDto(item),
      });
    } catch {
      res
        .status(409)
        .json({ success: false, message: "El plazo ya existe", data: null });
    }
  },
);

router.put(
  "/settings/installment-options/:id",
  posAuthMiddleware,
  requirePosPermission("PAYMENTS_MANAGE"),
  async (req, res) => {
    const parsed = installmentSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Plazo inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.$transaction(async (tx) => {
        const previous = await tx.posInstallmentOption.findUniqueOrThrow({
          where: { id: req.params["id"]! },
        });
        const version = previous.version + 1;
        const next = await tx.posInstallmentOption.update({
          where: { id: previous.id },
          data: {
            ...parsed.data,
            sourceReviewedAt: new Date(
              `${parsed.data.sourceReviewedAt}T00:00:00.000Z`,
            ),
            version,
          },
        });
        await tx.posInstallmentOptionChange.create({
          data: {
            optionId: next.id,
            action: actionFor(previous.active, next.active),
            version,
            previousSnapshot: {
              months: previous.months,
              label: previous.label,
              active: previous.active,
              sourceName: previous.sourceName,
              sourceReviewedAt: previous.sourceReviewedAt
                .toISOString()
                .slice(0, 10),
            },
            nextSnapshot: parsed.data,
            actorCredentialId: req.posUser!.credentialId,
          },
        });
        return next;
      });
      res.json({
        success: true,
        message: "Plazo actualizado",
        data: installmentDto(item),
      });
    } catch {
      res.status(404).json({
        success: false,
        message: "Plazo no encontrado o duplicado",
        data: null,
      });
    }
  },
);

const courtesyInclude = {
  lines: { include: { product: true }, orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.PosCourtesyPackageInclude;

type CourtesyPackagePayload = Prisma.PosCourtesyPackageGetPayload<{
  include: typeof courtesyInclude;
}>;

const courtesyPackageDto = (item: CourtesyPackagePayload) => ({
  id: item.id,
  name: item.name,
  active: item.active,
  version: item.version,
  productIds: item.lines.map((line) => line.productId),
  products: item.lines.map((line) => ({
    id: line.product.id,
    name: line.product.name,
    type: line.product.type,
    active: line.product.active,
  })),
});

async function validCourtesyPackages(tx: Prisma.TransactionClient) {
  const packages = await tx.posCourtesyPackage.findMany({
    where: { active: true },
    include: courtesyInclude,
    orderBy: { name: "asc" },
  });
  return packages.filter(
    (item) =>
      item.lines.length >= 1 &&
      item.lines.length <= 2 &&
      item.lines.every((line) => line.product.active),
  );
}

async function repairCourtesyDefaults(tx: Prisma.TransactionClient) {
  const valid = await validCourtesyPackages(tx);
  const validIds = new Set(valid.map((item) => item.id));
  const configurations = await tx.posCourtesyCheckoutConfiguration.findMany();
  for (const configuration of configurations) {
    if (
      configuration.defaultPackageId &&
      validIds.has(configuration.defaultPackageId)
    )
      continue;
    const fallback = valid[0] ?? null;
    await tx.posCourtesyCheckoutConfiguration.update({
      where: { id: configuration.id },
      data: {
        required: fallback ? configuration.required : false,
        defaultPackageId: fallback?.id ?? null,
        defaultPackageVersion: fallback?.version ?? null,
      },
    });
  }
}

router.get(
  "/settings/courtesy-configuration",
  posAuthMiddleware,
  requireAnyPosPermission("SALE_CREATE", "SETTINGS_VIEW", "SETTINGS_MANAGE"),
  async (req, res) => {
    const [products, packages, configuration] = await Promise.all([
      db.posCourtesyProduct.findMany({ orderBy: { name: "asc" } }),
      db.posCourtesyPackage.findMany({
        include: courtesyInclude,
        orderBy: { name: "asc" },
      }),
      db.posCourtesyCheckoutConfiguration.findFirst({
        where: {
          OR: [{ branchId: req.posUser!.branchId }, { branchId: null }],
        },
        orderBy: { branchId: "desc" },
      }),
    ]);
    res.json({
      success: true,
      message: "OK",
      data: {
        required: configuration?.required ?? false,
        defaultPackageId: configuration?.defaultPackageId ?? null,
        products: products.map(({ id, name, type, active, version }) => ({
          id,
          name,
          type,
          active,
          version,
        })),
        packages: packages.map(courtesyPackageDto),
      },
    });
  },
);

router.post(
  "/settings/courtesy-products",
  posAuthMiddleware,
  requirePosPermission("SETTINGS_MANAGE"),
  async (req, res) => {
    const parsed = courtesyProductSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Producto de cortesía inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const product = await db.$transaction(async (tx) => {
        const created = await tx.posCourtesyProduct.create({
          data: {
            ...parsed.data,
            normalizedName: normalize(parsed.data.name),
            createdByCredentialId: req.posUser!.credentialId,
          },
        });
        await tx.posCourtesyProductVersion.create({
          data: {
            productId: created.id,
            version: 1,
            nameSnapshot: created.name,
            typeSnapshot: created.type,
            activeSnapshot: created.active,
            actorCredentialId: req.posUser!.credentialId,
          },
        });
        return created;
      });
      res.status(201).json({
        success: true,
        message: "Producto de cortesía creado",
        data: product,
      });
    } catch {
      res.status(409).json({
        success: false,
        message: "El producto de cortesía ya existe",
        data: null,
      });
    }
  },
);

router.put(
  "/settings/courtesy-products/:id",
  posAuthMiddleware,
  requirePosPermission("SETTINGS_MANAGE"),
  async (req, res) => {
    const parsed = courtesyProductSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Producto de cortesía inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const product = await db.$transaction(
        async (tx) => {
          const previous = await tx.posCourtesyProduct.findUniqueOrThrow({
            where: { id: req.params["id"]! },
          });
          const version = previous.version + 1;
          const next = await tx.posCourtesyProduct.update({
            where: { id: previous.id },
            data: {
              ...parsed.data,
              normalizedName: normalize(parsed.data.name),
              version,
            },
          });
          await tx.posCourtesyProductVersion.create({
            data: {
              productId: next.id,
              version,
              nameSnapshot: next.name,
              typeSnapshot: next.type,
              activeSnapshot: next.active,
              actorCredentialId: req.posUser!.credentialId,
            },
          });
          if (previous.active && !next.active) {
            const affected = await tx.posCourtesyPackage.findMany({
              where: { active: true, lines: { some: { productId: next.id } } },
              include: courtesyInclude,
            });
            for (const item of affected) {
              const packageVersion = item.version + 1;
              await tx.posCourtesyPackage.update({
                where: { id: item.id },
                data: { active: false, version: packageVersion },
              });
              await tx.posCourtesyPackageVersion.create({
                data: {
                  packageId: item.id,
                  version: packageVersion,
                  nameSnapshot: item.name,
                  activeSnapshot: false,
                  linesSnapshot: item.lines.map((line) => ({
                    productId: line.productId,
                    name: line.product.name,
                    type: line.product.type,
                  })),
                  actorCredentialId: req.posUser!.credentialId,
                },
              });
            }
            await repairCourtesyDefaults(tx);
          }
          return next;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      res.json({
        success: true,
        message: "Producto de cortesía actualizado",
        data: product,
      });
    } catch {
      res.status(404).json({
        success: false,
        message: "Producto no encontrado o duplicado",
        data: null,
      });
    }
  },
);

async function validateCourtesyProducts(
  tx: Prisma.TransactionClient,
  productIds: string[],
) {
  const products = await tx.posCourtesyProduct.findMany({
    where: { id: { in: [...new Set(productIds)] }, active: true },
  });
  if (products.length !== new Set(productIds).size)
    throw new Error("COURTESY_PRODUCTS_INVALID");
  const map = new Map(products.map((product) => [product.id, product]));
  return productIds.map((id) => map.get(id)!);
}

router.post(
  "/settings/courtesy-packages",
  posAuthMiddleware,
  requirePosPermission("SETTINGS_MANAGE"),
  async (req, res) => {
    const parsed = courtesyPackageSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Paquete de cortesía inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.$transaction(async (tx) => {
        const products = await validateCourtesyProducts(
          tx,
          parsed.data.productIds,
        );
        const created = await tx.posCourtesyPackage.create({
          data: {
            name: parsed.data.name,
            normalizedName: normalize(parsed.data.name),
            active: parsed.data.active,
            createdByCredentialId: req.posUser!.credentialId,
            lines: {
              create: parsed.data.productIds.map((productId, sortOrder) => ({
                productId,
                sortOrder,
              })),
            },
          },
          include: courtesyInclude,
        });
        await tx.posCourtesyPackageVersion.create({
          data: {
            packageId: created.id,
            version: 1,
            nameSnapshot: created.name,
            activeSnapshot: created.active,
            linesSnapshot: products.map((product) => ({
              productId: product.id,
              name: product.name,
              type: product.type,
            })),
            actorCredentialId: req.posUser!.credentialId,
          },
        });
        return courtesyPackageDto(created);
      });
      res.status(201).json({
        success: true,
        message: "Paquete de cortesía creado",
        data: item,
      });
    } catch {
      res.status(409).json({
        success: false,
        message: "Paquete duplicado o con productos inactivos",
        data: null,
      });
    }
  },
);

router.put(
  "/settings/courtesy-packages/:id",
  posAuthMiddleware,
  requirePosPermission("SETTINGS_MANAGE"),
  async (req, res) => {
    const parsed = courtesyPackageSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Paquete de cortesía inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const item = await db.$transaction(
        async (tx) => {
          const previous = await tx.posCourtesyPackage.findUniqueOrThrow({
            where: { id: req.params["id"]! },
          });
          const products = await validateCourtesyProducts(
            tx,
            parsed.data.productIds,
          );
          const version = previous.version + 1;
          const next = await tx.posCourtesyPackage.update({
            where: { id: previous.id },
            data: {
              name: parsed.data.name,
              normalizedName: normalize(parsed.data.name),
              active: parsed.data.active,
              version,
              lines: {
                deleteMany: {},
                create: parsed.data.productIds.map((productId, sortOrder) => ({
                  productId,
                  sortOrder,
                })),
              },
            },
            include: courtesyInclude,
          });
          await tx.posCourtesyPackageVersion.create({
            data: {
              packageId: next.id,
              version,
              nameSnapshot: next.name,
              activeSnapshot: next.active,
              linesSnapshot: products.map((product) => ({
                productId: product.id,
                name: product.name,
                type: product.type,
              })),
              actorCredentialId: req.posUser!.credentialId,
            },
          });
          await repairCourtesyDefaults(tx);
          return courtesyPackageDto(next);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      res.json({
        success: true,
        message: "Paquete de cortesía actualizado",
        data: item,
      });
    } catch {
      res.status(404).json({
        success: false,
        message: "Paquete no encontrado, duplicado o con productos inactivos",
        data: null,
      });
    }
  },
);

router.put(
  "/settings/courtesy-configuration",
  posAuthMiddleware,
  requirePosPermission("SETTINGS_MANAGE"),
  async (req, res) => {
    const parsed = courtesyConfigurationSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Configuración inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const configuration = await db.$transaction(async (tx) => {
        const valid = await validCourtesyPackages(tx);
        const selected = parsed.data.defaultPackageId
          ? valid.find((item) => item.id === parsed.data.defaultPackageId)
          : valid[0];
        if (parsed.data.required && !selected)
          throw new Error("NO_VALID_PACKAGE");
        return tx.posCourtesyCheckoutConfiguration.upsert({
          where: { branchId: req.posUser!.branchId },
          create: {
            branchId: req.posUser!.branchId,
            required: parsed.data.required,
            defaultPackageId: selected?.id ?? null,
            defaultPackageVersion: selected?.version ?? null,
            updatedByCredentialId: req.posUser!.credentialId,
          },
          update: {
            required: parsed.data.required && Boolean(selected),
            defaultPackageId: selected?.id ?? null,
            defaultPackageVersion: selected?.version ?? null,
            updatedByCredentialId: req.posUser!.credentialId,
          },
        });
      });
      const [products, packages] = await Promise.all([
        db.posCourtesyProduct.findMany({ orderBy: { name: "asc" } }),
        db.posCourtesyPackage.findMany({
          include: courtesyInclude,
          orderBy: { name: "asc" },
        }),
      ]);
      res.json({
        success: true,
        message: "Configuración actualizada",
        data: {
          required: configuration.required,
          defaultPackageId: configuration.defaultPackageId,
          products: products.map(({ id, name, type, active, version }) => ({
            id,
            name,
            type,
            active,
            version,
          })),
          packages: packages.map(courtesyPackageDto),
        },
      });
    } catch {
      res.status(409).json({
        success: false,
        message: "La captura obligatoria requiere un paquete activo y válido",
        data: null,
      });
    }
  },
);

router.get(
  "/settings/commercial-company",
  posAuthMiddleware,
  requireAnyPosPermission("SALE_CREATE", "SETTINGS_VIEW", "SETTINGS_MANAGE"),
  async (_req, res) => {
    const company = await db.posCommercialCompany.findFirst({
      orderBy: { creadoEn: "asc" },
    });
    res.json({ success: true, message: "OK", data: company });
  },
);

router.put(
  "/settings/commercial-company",
  posAuthMiddleware,
  requirePosPermission("SETTINGS_MANAGE"),
  async (req, res) => {
    const parsed = companySchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Empresa inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    try {
      const company = await db.$transaction(async (tx) => {
        const previous = await tx.posCommercialCompany.findFirstOrThrow({
          orderBy: { creadoEn: "asc" },
        });
        const next = await tx.posCommercialCompany.update({
          where: { id: previous.id },
          data: {
            ...parsed.data,
            salesNumber: parsed.data.salesNumber.toLocaleUpperCase("es-MX"),
            version: { increment: 1 },
            updatedByCredentialId: req.posUser!.credentialId,
          },
        });
        await tx.auditLog.create({
          data: {
            action: "POS_COMMERCIAL_COMPANY_UPDATED",
            outcome: "SUCCESS",
            actorCredentialId: req.posUser!.credentialId,
            terminalId: req.posUser!.terminalId,
            branchId: req.posUser!.branchId,
            targetType: "PosCommercialCompany",
            targetId: next.id,
            metadata: {
              previous: {
                name: previous.name,
                salesNumber: previous.salesNumber,
                active: previous.active,
              },
              next: parsed.data,
            },
            ...auditData(req),
          },
        });
        return next;
      });
      res.json({
        success: true,
        message: "Empresa actualizada",
        data: company,
      });
    } catch {
      res.status(409).json({
        success: false,
        message: "Número comercial duplicado",
        data: null,
      });
    }
  },
);

router.put(
  "/access/employees/:id/status",
  posAuthMiddleware,
  requirePosPermission("EMPLOYEES_MANAGE"),
  async (req, res) => {
    const parsed = employeeStatusSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Estado inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    const employeeId = req.params["id"]!;
    if (!parsed.data.active && employeeId === req.posUser!.employeeId)
      return res.status(409).json({
        success: false,
        message: "No puedes inactivar al empleado de la sesión vigente",
        data: null,
      });
    try {
      const result = await db.$transaction(
        async (tx) => {
          const authorization = await consumeTicketAuthorization(
            tx,
            parsed.data.authorizationToken,
            "EMPLOYEE_STATUS_UPDATE",
            req.posUser!.terminalId,
            { entityType: "Empleado", entityId: employeeId },
            req.posUser!.sessionId,
          );
          if (!authorization) throw new Error("AUTHORIZATION_REQUIRED");
          await tx.$queryRaw(
            Prisma.sql`SELECT "id" FROM "Empleado" WHERE "id" = ${employeeId} FOR UPDATE`,
          );
          const employee = await tx.empleado.findUniqueOrThrow({
            where: { id: employeeId },
          });
          if (employee.activo === parsed.data.active)
            return { employee, transferredCustomers: 0 };
          let transferredCustomers = 0;
          if (!parsed.data.active) {
            const company = await tx.posCommercialCompany.findFirstOrThrow({
              where: { active: true },
            });
            const assignments = await tx.customerPortfolioAssignment.findMany({
              where: { employeeId, effectiveTo: null },
            });
            const changedAt = new Date();
            for (const assignment of assignments) {
              await tx.$queryRaw(
                Prisma.sql`SELECT "id" FROM "Customer" WHERE "id" = ${assignment.customerId} FOR UPDATE`,
              );
              await tx.customerPortfolioAssignment.update({
                where: { id: assignment.id },
                data: {
                  effectiveTo: changedAt,
                  endedReason: "SELLER_INACTIVATED",
                  ownerNameSnapshot: employee.nombreCompleto,
                },
              });
              await tx.customerPortfolioAssignment.create({
                data: {
                  customerId: assignment.customerId,
                  branchId: assignment.branchId,
                  companyId: company.id,
                  ownerNameSnapshot: company.name,
                  ownerCodeSnapshot: company.salesNumber,
                  createdByCredentialId: authorization.actorCredentialId,
                },
              });
              await tx.posPortfolioTransferEvent.create({
                data: {
                  customerId: assignment.customerId,
                  branchId: assignment.branchId,
                  sellerId: employee.id,
                  sellerNameSnapshot: employee.nombreCompleto,
                  companyId: company.id,
                  companyNameSnapshot: company.name,
                  companyNumberSnapshot: company.salesNumber,
                  reason: "SELLER_INACTIVATED",
                  actorCredentialId: authorization.actorCredentialId,
                  transferredAt: changedAt,
                },
              });
            }
            transferredCustomers = assignments.length;
            await tx.posCredential.updateMany({
              where: { employeeId },
              data: { active: false, version: { increment: 1 } },
            });
          }
          const updated = await tx.empleado.update({
            where: { id: employeeId },
            data: { activo: parsed.data.active },
          });
          await tx.auditLog.create({
            data: {
              action: parsed.data.active
                ? "POS_SELLER_REACTIVATED"
                : "POS_SELLER_INACTIVATED",
              outcome: "SUCCESS",
              actorCredentialId: authorization.actorCredentialId,
              terminalId: req.posUser!.terminalId,
              branchId: req.posUser!.branchId,
              targetType: "Empleado",
              targetId: employeeId,
              metadata: { reason: parsed.data.reason, transferredCustomers },
              ...auditData(req),
            },
          });
          return { employee: updated, transferredCustomers };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      res.json({
        success: true,
        message: result.employee.activo
          ? "Vendedor reactivado; la cartera anterior permanece en empresa"
          : "Vendedor inactivado y cartera transferida",
        data: {
          employeeId,
          active: result.employee.activo,
          transferredCustomers: result.transferredCustomers,
        },
      });
    } catch (error) {
      const auth =
        error instanceof Error && error.message === "AUTHORIZATION_REQUIRED";
      res.status(auth ? 403 : 404).json({
        success: false,
        message: auth
          ? "Autorización master requerida"
          : "Vendedor o empresa no encontrado",
        data: null,
      });
    }
  },
);

export default router;
