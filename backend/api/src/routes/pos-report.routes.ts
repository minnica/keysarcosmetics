import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  POS_REPORT_KEYS,
  type PosReportCell,
  type PosReportKey,
} from "@cosmetics/types";
import {
  posAuthMiddleware,
  requirePosPermission,
} from "../middlewares/pos-auth.middleware";
import { prisma } from "../prisma/client";
import {
  redactPosReportCosts,
  resolvePosReportBranchScope,
} from "../services/pos-report-policy";

const router: ExpressRouter = Router();
const reportKeySchema = z.enum(POS_REPORT_KEYS);
const querySchema = z
  .object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    branchIds: z.string().optional(),
    sellerId: z.string().optional(),
    paymentMethodId: z.string().optional(),
    search: z.string().max(160).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(50),
  })
  .strict();

type ReportRow = Record<string, PosReportCell>;
type ReportPage = { rows: ReportRow[]; total: number };

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };

const money = (value: Prisma.Decimal | null | undefined) =>
  value?.toFixed(2) ?? "0.00";
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function reportBranchIds(req: Request, requested: string | undefined) {
  const ids = [
    ...new Set(
      (requested ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  try {
    return resolvePosReportBranchScope({
      authorizedBranchIds: req.posUser!.authorizedBranchIds,
      requestedBranchIds: ids,
    });
  } catch (error) {
    throw Object.assign(
      error instanceof Error
        ? error
        : new Error("Alcance de sucursal inválido"),
      {
        status:
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof error.status === "number"
            ? error.status
            : 400,
      },
    );
  }
}

async function salesRows(
  key: PosReportKey,
  branchIds: string[],
  from: Date,
  to: Date,
  sellerId?: string,
  paymentMethodId?: string,
  includeCosts = false,
  page = 1,
  pageSize = 50,
  search?: string,
): Promise<ReportPage> {
  const skip = (page - 1) * pageSize;
  const ticketWhere: Prisma.PosTicketWhereInput = {
    branchId: { in: branchIds },
    businessDate: { gte: from, lte: to },
    status: { in: ["COMPLETED", "LAYAWAY", "REFUNDED", "CANCELED"] },
    ...(sellerId ? { sellers: { some: { employeeId: sellerId } } } : {}),
    ...(paymentMethodId
      ? {
          paymentOperations: {
            some: { payments: { some: { paymentMethodId } } },
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { folio: { contains: search, mode: "insensitive" } },
            { customerNameSnapshot: { contains: search, mode: "insensitive" } },
            {
              lines: {
                some: {
                  OR: [
                    {
                      itemNameSnapshot: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                    { skuSnapshot: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
            {
              sellers: {
                some: {
                  sellerNameSnapshot: { contains: search, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };
  if (key === "SALES_DETAIL") {
    const [tickets, total] = await Promise.all([
      prisma.posTicket.findMany({
        where: ticketWhere,
        include: {
          branch: { select: { nombre: true } },
          lines: { orderBy: { creadoEn: "asc" } },
          sellers: { orderBy: { creadoEn: "asc" } },
          paymentOperations: {
            include: { payments: true },
            orderBy: { creadoEn: "asc" },
          },
        },
        orderBy: [{ businessDate: "desc" }, { creadoEn: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.posTicket.count({ where: ticketWhere }),
    ]);
    return {
      total,
      rows: tickets.map<ReportRow>((ticket) => ({
        Fecha: ticket.businessDate.toISOString().slice(0, 10),
        Folio: ticket.folio,
        Sucursal: ticket.branch.nombre,
        Cliente: ticket.customerNameSnapshot ?? "Público general",
        Vendedor: ticket.sellers
          .map((seller) => seller.sellerNameSnapshot)
          .join(" / "),
        Productos: ticket.lines
          .reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0))
          .toFixed(2),
        Venta: money(ticket.total),
        "Venta sin IVA": ticket.total.minus(ticket.taxTotal).toFixed(2),
        IVA: money(ticket.taxTotal),
        SPARE: money(ticket.spareTotal),
        Descuento: money(ticket.discountTotal),
        Cobrado: money(ticket.amountPaid),
        Saldo: money(ticket.pendingAmount),
        Estado: ticket.status,
        "Forma de pago": ticket.paymentOperations
          .flatMap((operation) => operation.payments)
          .filter(
            (payment) =>
              !paymentMethodId || payment.paymentMethodId === paymentMethodId,
          )
          .map((payment) => payment.methodNameSnapshot)
          .join(" / "),
      })),
    };
  }
  if (key === "SOLD_PRODUCTS" || key === "MERCHANDISE_PROFITABILITY") {
    const lineWhere: Prisma.PosTicketLineWhereInput = { ticket: ticketWhere };
    const [lines, total] = await Promise.all([
      prisma.posTicketLine.findMany({
        where: lineWhere,
        include: {
          ticket: { include: { branch: { select: { nombre: true } } } },
        },
        orderBy: { creadoEn: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.posTicketLine.count({ where: lineWhere }),
    ]);
    return {
      total,
      rows: lines.map<ReportRow>((line) => ({
        Fecha: line.ticket.businessDate.toISOString().slice(0, 10),
        Folio: line.ticket.folio,
        Sucursal: line.ticket.branch.nombre,
        SKU: line.skuSnapshot,
        Producto: line.itemNameSnapshot,
        Familia: line.familySnapshot,
        Categoría: line.categorySnapshot,
        Unidades: line.quantity.toFixed(2),
        Venta: money(line.total),
        "Venta sin IVA": line.total.minus(line.taxTotal).toFixed(2),
        IVA: money(line.taxTotal),
        SPARE: line.unitListPrice
          .minus(line.unitMinimumPrice)
          .times(line.quantity)
          .toFixed(2),
        ...(includeCosts
          ? {
              Costo: line.unitCostSnapshot.times(line.quantity).toFixed(2),
              Utilidad: line.total
                .minus(line.taxTotal)
                .minus(line.unitCostSnapshot.times(line.quantity))
                .toFixed(2),
            }
          : {}),
      })),
    };
  }
  const sellerWhere: Prisma.PosTicketSellerWhereInput = {
    ticket: ticketWhere,
    ...(sellerId ? { employeeId: sellerId } : {}),
  };
  const [sellers, total] = await Promise.all([
    prisma.posTicketSeller.findMany({
      where: sellerWhere,
      include: {
        ticket: { include: { branch: { select: { nombre: true } } } },
      },
      orderBy: { creadoEn: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.posTicketSeller.count({ where: sellerWhere }),
  ]);
  return {
    total,
    rows: sellers.map<ReportRow>((seller) => ({
      Fecha: seller.ticket.businessDate.toISOString().slice(0, 10),
      Folio: seller.ticket.folio,
      Sucursal: seller.ticket.branch.nombre,
      Vendedor: seller.sellerNameSnapshot,
      Venta: money(seller.shareAmount),
      Participación: seller.sharePercent.toFixed(2),
      Estado: seller.ticket.status,
    })),
  };
}

async function cashRows(
  branchIds: string[],
  from: Date,
  to: Date,
  paymentMethodId: string | undefined,
  page: number,
  pageSize: number,
  search?: string,
): Promise<ReportPage> {
  const paymentWhere: Prisma.PosPaymentWhereInput = {
    ...(paymentMethodId ? { paymentMethodId } : {}),
    operation: {
      businessDate: { gte: from, lte: to },
      ticket: { branchId: { in: branchIds } },
    },
    ...(search
      ? {
          OR: [
            { methodNameSnapshot: { contains: search, mode: "insensitive" } },
            { operation: { folio: { contains: search, mode: "insensitive" } } },
            {
              operation: {
                ticket: { folio: { contains: search, mode: "insensitive" } },
              },
            },
            {
              operation: {
                ticket: {
                  sellers: {
                    some: {
                      sellerNameSnapshot: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
  const expenseWhere: Prisma.PosCashExpenseWhereInput = {
    branchId: { in: branchIds },
    businessDate: { gte: from, lte: to },
    ...(search
      ? {
          OR: [
            { folio: { contains: search, mode: "insensitive" } },
            { concept: { contains: search, mode: "insensitive" } },
            { expenseTypeSnapshot: { contains: search, mode: "insensitive" } },
            { employeeNameSnapshot: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const take = page * pageSize;
  const [payments, expenses, paymentTotal, expenseTotal] = await Promise.all([
    prisma.posPayment.findMany({
      where: paymentWhere,
      include: {
        operation: {
          include: {
            ticket: {
              include: { branch: { select: { nombre: true } }, sellers: true },
            },
          },
        },
      },
      orderBy: { creadoEn: "desc" },
      take,
    }),
    prisma.posCashExpense.findMany({
      where: expenseWhere,
      include: { branch: { select: { nombre: true } } },
      orderBy: { creadoEn: "desc" },
      take,
    }),
    prisma.posPayment.count({ where: paymentWhere }),
    prisma.posCashExpense.count({ where: expenseWhere }),
  ]);
  const merged = [
    ...payments.map((payment) => ({
      sortAt: payment.creadoEn.toISOString(),
      row: {
        Fecha: payment.operation.businessDate.toISOString().slice(0, 10),
        Folio: payment.operation.folio,
        Movimiento: "INGRESO",
        Tipo: payment.methodNameSnapshot,
        Usuario: payment.operation.ticket.sellers
          .map((seller) => seller.sellerNameSnapshot)
          .join(" / "),
        Sucursal: payment.operation.ticket.branch.nombre,
        Concepto: `Cobro de ${payment.operation.ticket.folio}`,
        Monto: money(payment.amount),
        Impacto:
          payment.operation.kind === "REFUND"
            ? money(payment.amount.negated())
            : money(payment.amount),
        Estado: "VIGENTE",
      } satisfies ReportRow,
    })),
    ...expenses.map((expense) => ({
      sortAt: expense.creadoEn.toISOString(),
      row: {
        Fecha: expense.businessDate.toISOString().slice(0, 10),
        Folio: expense.folio,
        Movimiento: "GASTO",
        Tipo: expense.expenseTypeSnapshot,
        Usuario: expense.employeeNameSnapshot,
        Sucursal: expense.branch.nombre,
        Concepto: expense.concept,
        Monto: money(expense.amount),
        Impacto:
          expense.status === "ACTIVE"
            ? money(expense.amount.negated())
            : "0.00",
        Estado: expense.status,
      } satisfies ReportRow,
    })),
  ].sort((a, b) => b.sortAt.localeCompare(a.sortAt));
  const skip = (page - 1) * pageSize;
  return {
    rows: merged.slice(skip, skip + pageSize).map((item) => item.row),
    total: paymentTotal + expenseTotal,
  };
}

async function merchandiseRows(
  key: PosReportKey,
  branchIds: string[],
  from: Date,
  to: Date,
  includeCosts: boolean,
  page: number,
  pageSize: number,
  search?: string,
): Promise<ReportPage> {
  const skip = (page - 1) * pageSize;
  if (key === "MERCHANDISE_MOVEMENTS") {
    const where: Prisma.InventoryMovementLineWhereInput = {
      AND: [
        { movement: { businessDate: { gte: from, lte: to } } },
        {
          OR: [
            { fromLocation: { branchId: { in: branchIds } } },
            { toLocation: { branchId: { in: branchIds } } },
          ],
        },
        ...(search
          ? [
              {
                OR: [
                  {
                    item: {
                      name: { contains: search, mode: "insensitive" as const },
                    },
                  },
                  {
                    item: {
                      sku: { contains: search, mode: "insensitive" as const },
                    },
                  },
                  {
                    movement: {
                      folio: { contains: search, mode: "insensitive" as const },
                    },
                  },
                  {
                    movement: {
                      reason: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };
    const [lines, total] = await Promise.all([
      prisma.inventoryMovementLine.findMany({
        where,
        include: {
          movement: true,
          item: true,
          fromLocation: { include: { branch: true } },
          toLocation: { include: { branch: true } },
        },
        orderBy: { creadoEn: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.inventoryMovementLine.count({ where }),
    ]);
    return {
      total,
      rows: lines.map<ReportRow>((line) => ({
        Fecha: line.movement.businessDate.toISOString().slice(0, 10),
        Folio: line.movement.folio,
        Producto: line.item.name,
        SKU: line.item.sku,
        Tipo: line.movement.type,
        Origen:
          line.fromLocation?.branch?.nombre ?? line.fromLocation?.name ?? "—",
        Destino:
          line.toLocation?.branch?.nombre ?? line.toLocation?.name ?? "—",
        Cantidad: line.quantity.toFixed(2),
        Motivo: line.movement.reason,
        ...(includeCosts
          ? {
              "Costo unitario": money(line.unitCostSnapshot),
              "Costo total":
                line.unitCostSnapshot?.times(line.quantity).toFixed(2) ??
                "0.00",
            }
          : {}),
      })),
    };
  }
  const where: Prisma.InventoryBalanceWhereInput = {
    location: { branchId: { in: branchIds } },
    ...(search
      ? {
          item: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };
  const [balances, total] = await Promise.all([
    prisma.inventoryBalance.findMany({
      where,
      include: {
        item: { include: { family: true, category: true } },
        location: { include: { branch: true } },
      },
      orderBy: [{ locationId: "asc" }, { itemId: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.inventoryBalance.count({ where }),
  ]);
  return {
    total,
    rows: balances.map<ReportRow>((balance) => ({
      Sucursal: balance.location.branch?.nombre ?? balance.location.name,
      SKU: balance.item.sku,
      Producto: balance.item.name,
      Familia: balance.item.family?.name ?? "—",
      Categoría: balance.item.category?.name ?? "—",
      Existencia: balance.availableQuantity.toFixed(2),
      Reservado: balance.reservedQuantity.toFixed(2),
      Disponible: balance.availableQuantity.toFixed(2),
      ...(includeCosts
        ? {
            "Costo unitario": money(balance.item.unitCost),
            "Valor inventario": balance.item.unitCost
              .times(balance.availableQuantity)
              .toFixed(2),
          }
        : {}),
    })),
  };
}

async function customerRows(
  branchIds: string[],
  from: Date,
  to: Date,
  search: string | undefined,
  page: number,
  pageSize: number,
): Promise<ReportPage> {
  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { normalizedName: { contains: search.toLocaleLowerCase("es-MX") } },
            { phone: { contains: search } },
          ],
        }
      : {}),
    posTickets: {
      some: {
        branchId: { in: branchIds },
        businessDate: { gte: from, lte: to },
      },
    },
  };
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        source: true,
        posTickets: {
          where: {
            branchId: { in: branchIds },
            businessDate: { gte: from, lte: to },
          },
          include: { branch: true },
        },
        portfolios: {
          where: { effectiveTo: null },
          include: { branch: true, employee: true },
          take: 1,
          orderBy: { effectiveFrom: "desc" },
        },
        _count: { select: { posAppointments: true } },
      },
      orderBy: { creadoEn: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);
  const rows = customers.map<ReportRow>((customer) => {
    const total = customer.posTickets.reduce(
      (sum, ticket) => sum.plus(ticket.total),
      new Prisma.Decimal(0),
    );
    const pending = customer.posTickets.reduce(
      (sum, ticket) => sum.plus(ticket.pendingAmount),
      new Prisma.Decimal(0),
    );
    return {
      Cliente: customer.displayName,
      Teléfono: customer.phone,
      Procedencia: customer.source?.name ?? "—",
      Sucursal:
        customer.portfolios[0]?.branch?.nombre ??
        customer.posTickets[0]?.branch.nombre ??
        "—",
      Propietario:
        customer.portfolios[0]?.employee?.nombreCompleto ?? "Cartera empresa",
      Visitas: customer.posTickets.length,
      "Compra total": total.toFixed(2),
      "Ticket promedio": customer.posTickets.length
        ? total.div(customer.posTickets.length).toFixed(2)
        : "0.00",
      Saldo: pending.toFixed(2),
      Citas: customer._count.posAppointments,
    };
  });
  return { rows, total };
}

async function createDataset(
  req: Request,
  key: PosReportKey,
  forExport: boolean,
) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success)
    throw Object.assign(new Error("Consulta de reporte inválida"), {
      status: 400,
      details: parsed.error.flatten().fieldErrors,
    });
  if (parsed.data.dateFrom > parsed.data.dateTo)
    throw Object.assign(new Error("El periodo del reporte es inválido"), {
      status: 400,
    });
  const branchIds = await reportBranchIds(req, parsed.data.branchIds);
  const from = dateValue(parsed.data.dateFrom);
  const to = dateValue(parsed.data.dateTo);
  const includesCosts = Boolean(
    req.posUser!.isMaster || req.posUser!.permissions.includes("REPORTS_COSTS"),
  );
  const pageSize = Math.min(parsed.data.pageSize, forExport ? 500 : 100);
  let result: ReportPage;
  if (
    [
      "SALES_DETAIL",
      "SOLD_PRODUCTS",
      "SALES_BY_EMPLOYEE",
      "MERCHANDISE_PROFITABILITY",
      "EMPLOYEE_PERFORMANCE",
      "EMPLOYEE_DAILY",
    ].includes(key)
  ) {
    result = await salesRows(
      key,
      branchIds,
      from,
      to,
      parsed.data.sellerId,
      parsed.data.paymentMethodId,
      includesCosts,
      parsed.data.page,
      pageSize,
      parsed.data.search,
    );
  } else if (key === "CASH_MOVEMENTS") {
    result = await cashRows(
      branchIds,
      from,
      to,
      parsed.data.paymentMethodId,
      parsed.data.page,
      pageSize,
      parsed.data.search,
    );
  } else if (["MERCHANDISE_OVERVIEW", "MERCHANDISE_MOVEMENTS"].includes(key)) {
    result = await merchandiseRows(
      key,
      branchIds,
      from,
      to,
      includesCosts,
      parsed.data.page,
      pageSize,
      parsed.data.search,
    );
  } else {
    result = await customerRows(
      branchIds,
      from,
      to,
      parsed.data.search,
      parsed.data.page,
      pageSize,
    );
  }
  const rows = result.rows.map((row) =>
    redactPosReportCosts(row, includesCosts),
  );
  return {
    key,
    dateFrom: parsed.data.dateFrom,
    dateTo: parsed.data.dateTo,
    branchIds,
    includesCosts,
    generatedAt: new Date().toISOString(),
    columns: Object.keys(rows[0] ?? {}),
    rows,
    page: parsed.data.page,
    pageSize,
    total: result.total,
  };
}

router.use(posAuthMiddleware);

router.get(
  "/reports/:key",
  requirePosPermission("REPORTS_VIEW"),
  asyncRoute(async (req, res) => {
    const key = reportKeySchema.safeParse(req.params["key"]);
    if (!key.success)
      return res
        .status(404)
        .json({ success: false, message: "Reporte no encontrado", data: null });
    res.json({
      success: true,
      message: "OK",
      data: await createDataset(req, key.data, false),
    });
  }),
);

router.get(
  "/exports/:key",
  requirePosPermission("REPORTS_PRINT"),
  asyncRoute(async (req, res) => {
    const key = reportKeySchema.safeParse(req.params["key"]);
    if (!key.success)
      return res
        .status(404)
        .json({ success: false, message: "Dataset no encontrado", data: null });
    res.json({
      success: true,
      message: "Dataset autorizado",
      data: await createDataset(req, key.data, true),
    });
  }),
);

router.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof Error && "status" in error) {
      const value = error as Error & { status: number; details?: unknown };
      return res.status(value.status).json({
        success: false,
        message: value.message,
        data: value.details ?? null,
      });
    }
    next(error);
  },
);

export default router;
