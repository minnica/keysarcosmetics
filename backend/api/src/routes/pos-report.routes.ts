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
  type PosDataScopeDto,
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
import { hydratePosDataScope, resolvePosDataScope } from "../services/pos-scope";
import {
  exportFilterMetadata,
  paginateReportRows,
  resolvePosReportPeriod,
  signedPaymentAmount,
} from "../services/pos-reporting";

const router: ExpressRouter = Router();
const reportKeySchema = z.enum(POS_REPORT_KEYS);
const querySchema = z
  .object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
    branchIds: z.string().optional(),
    sellerId: z.string().optional(),
    paymentMethodId: z.string().optional(),
    bankId: z.string().optional(),
    cardType: z.enum(["CREDIT", "DEBIT"]).optional(),
    installmentMonths: z.coerce.number().int().min(1).max(120).optional(),
    operationKind: z
      .enum(["SALE", "LAYAWAY_PAYMENT", "REFUND", "REVISION"])
      .optional(),
    search: z.string().max(160).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(50),
  })
  .strict();

type ReportRow = Record<string, PosReportCell>;
type ReportPage = {
  rows: ReportRow[];
  total: number;
  summary?: Record<string, PosReportCell>;
};

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };

const money = (value: Prisma.Decimal | null | undefined) =>
  value?.toFixed(2) ?? "0.00";

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
      authorizedBranchIds: req.posUser!.authorizedHistoricalBranchIds,
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
  forExport = false,
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
          branch: { select: { id: true, nombre: true } },
          lines: { orderBy: { creadoEn: "asc" } },
          sellers: { orderBy: { creadoEn: "asc" } },
          paymentOperations: {
            include: { payments: true },
            orderBy: { creadoEn: "asc" },
          },
        },
        orderBy: [{ businessDate: "desc" }, { creadoEn: "desc" }],
        ...(forExport ? {} : { skip, take: pageSize }),
      }),
      prisma.posTicket.count({ where: ticketWhere }),
    ]);
    return {
      total,
      rows: tickets.map<ReportRow>((ticket) => ({
        Fecha: ticket.businessDate.toISOString().slice(0, 10),
        Folio: ticket.folio,
        branch_id: ticket.branch.id,
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
          ticket: {
            include: { branch: { select: { id: true, nombre: true } } },
          },
        },
        orderBy: { creadoEn: "desc" },
        ...(forExport ? {} : { skip, take: pageSize }),
      }),
      prisma.posTicketLine.count({ where: lineWhere }),
    ]);
    return {
      total,
      rows: lines.map<ReportRow>((line) => ({
        Fecha: line.ticket.businessDate.toISOString().slice(0, 10),
        Folio: line.ticket.folio,
        branch_id: line.ticket.branch.id,
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
        ticket: {
          include: { branch: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: { creadoEn: "desc" },
      ...(forExport ? {} : { skip, take: pageSize }),
    }),
    prisma.posTicketSeller.count({ where: sellerWhere }),
  ]);
  return {
    total,
    rows: sellers.map<ReportRow>((seller) => ({
      Fecha: seller.ticket.businessDate.toISOString().slice(0, 10),
      Folio: seller.ticket.folio,
      branch_id: seller.ticket.branch.id,
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
  forExport = false,
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
              include: {
                branch: { select: { id: true, nombre: true } },
                sellers: true,
              },
            },
          },
        },
      },
      orderBy: { creadoEn: "desc" },
      ...(forExport ? {} : { take }),
    }),
    prisma.posCashExpense.findMany({
      where: expenseWhere,
      include: { branch: { select: { id: true, nombre: true } } },
      orderBy: { creadoEn: "desc" },
      ...(forExport ? {} : { take }),
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
        branch_id: payment.operation.ticket.branch.id,
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
        branch_id: expense.branch.id,
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
    rows: (forExport ? merged : merged.slice(skip, skip + pageSize)).map(
      (item) => item.row,
    ),
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
  forExport = false,
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
        ...(forExport ? {} : { skip, take: pageSize }),
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
        branch_id_origen: line.fromLocation?.branch?.id ?? null,
        Destino:
          line.toLocation?.branch?.nombre ?? line.toLocation?.name ?? "—",
        branch_id_destino: line.toLocation?.branch?.id ?? null,
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
      ...(forExport ? {} : { skip, take: pageSize }),
    }),
    prisma.inventoryBalance.count({ where }),
  ]);
  return {
    total,
    rows: balances.map<ReportRow>((balance) => ({
      branch_id: balance.location.branch?.id ?? null,
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
  forExport = false,
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
        _count: {
          select: { posAppointments: true, posMemberships: true },
        },
      },
      orderBy: { creadoEn: "desc" },
      ...(forExport
        ? {}
        : { skip: (page - 1) * pageSize, take: pageSize }),
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
    const ticketBranches = [
      ...new Map(
        customer.posTickets.map((ticket) => [ticket.branch.id, ticket.branch]),
      ).values(),
    ];
    return {
      Cliente: customer.displayName,
      Teléfono: customer.phone,
      Procedencia: customer.source?.name ?? "—",
      branch_id: ticketBranches.length === 1 ? ticketBranches[0]!.id : null,
      Sucursal: ticketBranches.map((branch) => branch.nombre).join(" / ") || "—",
      Propietario:
        customer.portfolios[0]?.employee?.nombreCompleto ?? "Cartera empresa",
      Visitas: customer.posTickets.length,
      "Compra total": total.toFixed(2),
      "Ticket promedio": customer.posTickets.length
        ? total.div(customer.posTickets.length).toFixed(2)
        : "0.00",
      Saldo: pending.toFixed(2),
      Citas: customer._count.posAppointments,
      Membresías: customer._count.posMemberships,
    };
  });
  return { rows, total };
}

async function customerSourceRows(input: {
  branchIds: string[];
  from: Date;
  to: Date;
  sellerId?: string;
  paymentMethodId?: string;
  search?: string;
  page: number;
  pageSize: number;
  forExport: boolean;
}): Promise<ReportPage> {
  const tickets = await prisma.posTicket.findMany({
    where: {
      branchId: { in: input.branchIds },
      businessDate: { gte: input.from, lte: input.to },
      status: "COMPLETED",
      customerId: { not: null },
      ...(input.sellerId
        ? { sellers: { some: { employeeId: input.sellerId } } }
        : {}),
      ...(input.paymentMethodId
        ? {
            paymentOperations: {
              some: { payments: { some: { paymentMethodId: input.paymentMethodId } } },
            },
          }
        : {}),
    },
    select: {
      id: true,
      customerId: true,
      total: true,
      customer: {
        select: { source: { select: { id: true, name: true } } },
      },
      appointments: {
        where: { kind: { not: "NO_APPOINTMENT" } },
        select: { id: true },
      },
    },
  });
  const sourceMap = new Map<
    string,
    {
      sourceId: string | null;
      name: string;
      customers: Map<string, number>;
      sales: Prisma.Decimal;
      visits: number;
      appointments: number;
    }
  >();
  for (const ticket of tickets) {
    if (!ticket.customerId) continue;
    const sourceId = ticket.customer?.source?.id ?? null;
    const key = sourceId ?? "__NO_SOURCE__";
    const current = sourceMap.get(key) ?? {
      sourceId,
      name: ticket.customer?.source?.name ?? "Sin procedencia",
      customers: new Map<string, number>(),
      sales: new Prisma.Decimal(0),
      visits: 0,
      appointments: 0,
    };
    current.customers.set(
      ticket.customerId,
      (current.customers.get(ticket.customerId) ?? 0) + 1,
    );
    current.sales = current.sales.plus(ticket.total);
    current.visits += 1;
    current.appointments += ticket.appointments.length;
    sourceMap.set(key, current);
  }
  const totalCustomers = new Set(
    tickets.flatMap((ticket) => (ticket.customerId ? [ticket.customerId] : [])),
  ).size;
  const filteredSources = [...sourceMap.values()].filter(
    (source) =>
      !input.search ||
      source.name
        .toLocaleLowerCase("es-MX")
        .includes(input.search.toLocaleLowerCase("es-MX")),
  );
  const allRows = filteredSources
    .map<ReportRow>((source) => {
      const recurring = [...source.customers.values()].filter(
        (visits) => visits > 1,
      ).length;
      return {
        branch_id: input.branchIds.length === 1 ? input.branchIds[0]! : null,
        source_id: source.sourceId,
        Procedencia: source.name,
        Clientes: source.customers.size,
        Participación: totalCustomers
          ? ((source.customers.size / totalCustomers) * 100).toFixed(2)
          : "0.00",
        "Venta completada": source.sales.toFixed(2),
        "Ticket promedio": source.visits
          ? source.sales.div(source.visits).toFixed(2)
          : "0.00",
        "Clientes recurrentes": recurring,
        Recurrencia: source.customers.size
          ? ((recurring / source.customers.size) * 100).toFixed(2)
          : "0.00",
        Visitas: source.visits,
        Citas: source.appointments,
      };
    })
    .sort((left, right) =>
      Number(right["Venta completada"]) - Number(left["Venta completada"]),
    );
  return {
    rows: paginateReportRows(
      allRows,
      input.page,
      input.pageSize,
      input.forExport,
    ),
    total: allRows.length,
    summary: {
      Clientes: filteredSources.reduce(
        (sum, source) => sum + source.customers.size,
        0,
      ),
      "Venta completada": filteredSources
        .reduce((sum, source) => sum.plus(source.sales), new Prisma.Decimal(0))
        .toFixed(2),
      Visitas: filteredSources.reduce(
        (sum, source) => sum + source.visits,
        0,
      ),
      Citas: filteredSources.reduce(
        (sum, source) => sum + source.appointments,
        0,
      ),
    },
  };
}

async function bankReconciliationRows(input: {
  branchIds: string[];
  from: Date;
  to: Date;
  sellerId?: string;
  paymentMethodId?: string;
  bankId?: string;
  cardType?: "CREDIT" | "DEBIT";
  installmentMonths?: number;
  operationKind?: "SALE" | "LAYAWAY_PAYMENT" | "REFUND" | "REVISION";
  search?: string;
  page: number;
  pageSize: number;
  forExport: boolean;
}): Promise<ReportPage> {
  const where: Prisma.PosPaymentWhereInput = {
    ...(input.paymentMethodId ? { paymentMethodId: input.paymentMethodId } : {}),
    ...(input.bankId ? { bankId: input.bankId } : {}),
    ...(input.cardType ? { cardType: input.cardType } : {}),
    ...(input.installmentMonths
      ? { installmentMonths: input.installmentMonths }
      : {}),
    operation: {
      businessDate: { gte: input.from, lte: input.to },
      ...(input.operationKind ? { kind: input.operationKind } : {}),
      ticket: {
        branchId: { in: input.branchIds },
        ...(input.sellerId
          ? { sellers: { some: { employeeId: input.sellerId } } }
          : {}),
      },
    },
    ...(input.search
      ? {
          OR: [
            { bankNameSnapshot: { contains: input.search, mode: "insensitive" } },
            { methodNameSnapshot: { contains: input.search, mode: "insensitive" } },
            { reference: { contains: input.search, mode: "insensitive" } },
            { operation: { folio: { contains: input.search, mode: "insensitive" } } },
            {
              operation: {
                ticket: { folio: { contains: input.search, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };
  const payments = await prisma.posPayment.findMany({
    where,
    include: {
      operation: {
        include: {
          ticket: {
            include: {
              branch: { select: { id: true, nombre: true } },
              paymentOperations: {
                select: { id: true, kind: true, amount: true, creadoEn: true },
                orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
              },
            },
          },
        },
      },
    },
    orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
  });
  const commercialTickets = new Map<string, Prisma.Decimal>();
  let inflows = new Prisma.Decimal(0);
  let compensations = new Prisma.Decimal(0);
  let net = new Prisma.Decimal(0);
  const rows = payments.map<ReportRow>((payment) => {
    const signed = signedPaymentAmount(payment.amount, payment.operation.kind);
    net = net.plus(signed);
    if (signed.isNegative()) compensations = compensations.plus(signed.abs());
    else inflows = inflows.plus(signed);
    if (payment.operation.kind === "SALE")
      commercialTickets.set(
        payment.operation.ticket.id,
        payment.operation.ticket.total,
      );
    let reachedOperation = false;
    const collectedThroughOperation =
      payment.operation.ticket.paymentOperations.reduce((sum, operation) => {
        if (reachedOperation) return sum;
        const next = sum.plus(signedPaymentAmount(operation.amount, operation.kind));
        if (operation.id === payment.operation.id) reachedOperation = true;
        return next;
      }, new Prisma.Decimal(0));
    const reconciliationKind =
      payment.operation.kind === "REFUND"
        ? "COMPENSACION"
        : payment.operation.kind === "LAYAWAY_PAYMENT"
          ? collectedThroughOperation.greaterThanOrEqualTo(
              payment.operation.ticket.total,
            )
            ? "LIQUIDACION"
            : "ABONO"
          : payment.operation.kind === "SALE"
            ? "VENTA"
            : "REVISION";
    return {
      Fecha: payment.operation.businessDate.toISOString().slice(0, 10),
      branch_id: payment.operation.ticket.branch.id,
      Sucursal: payment.operation.ticket.branch.nombre,
      "Folio ticket": payment.operation.ticket.folio,
      "Folio movimiento": payment.operation.folio,
      Movimiento: payment.operation.kind,
      "Tipo conciliación": reconciliationKind,
      payment_id: payment.id,
      "Forma de pago": payment.methodNameSnapshot,
      bank_id: payment.bankId,
      Banco: payment.bankNameSnapshot,
      Tarjeta: payment.cardType,
      Red: payment.cardNetworkNameSnapshot,
      Plazo: payment.installmentMonths,
      Referencia: payment.reference,
      Autorización: payment.authorizationLastFour,
      Importe: signed.toFixed(2),
    };
  });
  return {
    rows: paginateReportRows(
      rows,
      input.page,
      input.pageSize,
      input.forExport,
    ),
    total: rows.length,
    summary: {
      Movimientos: rows.length,
      Ingresos: inflows.toFixed(2),
      Compensaciones: compensations.toFixed(2),
      Neto: net.toFixed(2),
      "Tickets comerciales": commercialTickets.size,
      "Venta comercial": [...commercialTickets.values()]
        .reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0))
        .toFixed(2),
    },
  };
}

async function inventoryCountRows(input: {
  branchIds: string[];
  from: Date;
  to: Date;
  includeCosts: boolean;
  search?: string;
  page: number;
  pageSize: number;
  forExport: boolean;
}): Promise<ReportPage> {
  const [branches, counts, movements, balances] = await Promise.all([
    prisma.sucursal.findMany({
      where: { id: { in: input.branchIds } },
      select: { id: true, nombre: true, activa: true },
    }),
    prisma.inventoryCount.findMany({
      where: {
        businessDate: { gte: input.from, lte: input.to },
        location: { branchId: { in: input.branchIds } },
      },
      include: {
        location: { select: { branchId: true } },
        lines: { include: { item: { select: { id: true, sku: true, name: true, unitCost: true } } } },
      },
      orderBy: [{ businessDate: "asc" }, { creadoEn: "asc" }],
    }),
    prisma.inventoryMovementLine.findMany({
      where: {
        movement: { businessDate: { gte: input.from, lte: input.to } },
        OR: [
          { fromLocation: { branchId: { in: input.branchIds } } },
          { toLocation: { branchId: { in: input.branchIds } } },
        ],
      },
      include: {
        movement: { select: { businessDate: true } },
        item: { select: { id: true, sku: true, name: true, unitCost: true } },
        fromLocation: { select: { branchId: true } },
        toLocation: { select: { branchId: true } },
      },
    }),
    prisma.inventoryBalance.findMany({
      where: { location: { branchId: { in: input.branchIds } } },
      include: {
        location: { select: { branchId: true } },
        item: { select: { id: true, sku: true, name: true, unitCost: true } },
      },
    }),
  ]);
  type CountValue = {
    itemId: string;
    sku: string;
    name: string;
    unitCost: Prisma.Decimal;
    opening: Prisma.Decimal | null;
    movement: Prisma.Decimal;
    existence: Prisma.Decimal | null;
    closing: Prisma.Decimal | null;
  };
  const byBranch = new Map<string, Map<string, CountValue>>();
  const valueFor = (branchId: string, item: { id: string; sku: string; name: string; unitCost: Prisma.Decimal }) => {
    const itemMap = byBranch.get(branchId) ?? new Map<string, CountValue>();
    byBranch.set(branchId, itemMap);
    const value = itemMap.get(item.id) ?? {
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      unitCost: item.unitCost,
      opening: null,
      movement: new Prisma.Decimal(0),
      existence: null,
      closing: null,
    };
    itemMap.set(item.id, value);
    return value;
  };
  for (const count of counts) {
    if (!count.location.branchId) continue;
    for (const line of count.lines) {
      const value = valueFor(count.location.branchId, line.item);
      if (count.kind === "OPENING" && value.opening === null)
        value.opening = line.countedQuantity;
      if (count.kind === "CLOSING") value.closing = line.countedQuantity;
      if (line.unitCostSnapshot) value.unitCost = line.unitCostSnapshot;
    }
  }
  for (const movement of movements) {
    for (const branchId of input.branchIds) {
      let delta = new Prisma.Decimal(0);
      if (movement.toLocation?.branchId === branchId)
        delta = delta.plus(movement.quantity);
      if (movement.fromLocation?.branchId === branchId)
        delta = delta.minus(movement.quantity);
      if (!delta.isZero())
        valueFor(branchId, movement.item).movement = valueFor(
          branchId,
          movement.item,
        ).movement.plus(delta);
    }
  }
  for (const balance of balances) {
    if (!balance.location.branchId) continue;
    valueFor(balance.location.branchId, balance.item).existence =
      balance.availableQuantity;
  }
  const branchById = new Map(branches.map((branch) => [branch.id, branch]));
  const branchRows: Array<{ branchId: string; value: CountValue; row: ReportRow }> = [];
  for (const branchId of input.branchIds) {
    const branch = branchById.get(branchId);
    for (const value of byBranch.get(branchId)?.values() ?? []) {
      if (
        input.search &&
        !`${value.sku} ${value.name}`
          .toLocaleLowerCase("es-MX")
          .includes(input.search.toLocaleLowerCase("es-MX"))
      )
        continue;
      branchRows.push({
        branchId,
        value,
        row: {
          Nivel: "SUCURSAL",
          branch_id: branchId,
          Sucursal: branch?.nombre ?? branchId,
          Activa: branch?.activa ?? false,
          SKU: value.sku,
          Producto: value.name,
          Apertura: value.opening?.toFixed(2) ?? null,
          Movimientos: value.movement.toFixed(2),
          Existencia: value.existence?.toFixed(2) ?? null,
          Cierre: value.closing?.toFixed(2) ?? null,
          ...(input.includeCosts
            ? {
                "Costo unitario": value.unitCost.toFixed(2),
                "Valor inventario": value.existence
                  ?.times(value.unitCost)
                  .toFixed(2) ?? null,
              }
            : {}),
        },
      });
    }
  }
  const consolidated = new Map<string, CountValue>();
  for (const { value } of branchRows) {
    const current = consolidated.get(value.itemId) ?? {
      ...value,
      opening: null,
      movement: new Prisma.Decimal(0),
      existence: null,
      closing: null,
    };
    current.opening =
      value.opening === null
        ? current.opening
        : (current.opening ?? new Prisma.Decimal(0)).plus(value.opening);
    current.movement = current.movement.plus(value.movement);
    current.existence =
      value.existence === null
        ? current.existence
        : (current.existence ?? new Prisma.Decimal(0)).plus(value.existence);
    current.closing =
      value.closing === null
        ? current.closing
        : (current.closing ?? new Prisma.Decimal(0)).plus(value.closing);
    consolidated.set(value.itemId, current);
  }
  const consolidatedRows = [...consolidated.values()].map<ReportRow>((value) => ({
    Nivel: "CONSOLIDADO",
    branch_id: null,
    Sucursal: "Consolidado autorizado",
    Activa: null,
    SKU: value.sku,
    Producto: value.name,
    Apertura: value.opening?.toFixed(2) ?? null,
    Movimientos: value.movement.toFixed(2),
    Existencia: value.existence?.toFixed(2) ?? null,
    Cierre: value.closing?.toFixed(2) ?? null,
    ...(input.includeCosts
      ? {
          "Costo unitario": null,
          "Valor inventario": value.existence
            ?.times(value.unitCost)
            .toFixed(2) ?? null,
        }
      : {}),
  }));
  const rows = [...branchRows.map((entry) => entry.row), ...consolidatedRows];
  return {
    rows: paginateReportRows(rows, input.page, input.pageSize, input.forExport),
    total: rows.length,
    summary: {
      Sucursales: input.branchIds.length,
      Productos: consolidated.size,
      "Filas por sucursal": branchRows.length,
      "Filas consolidadas": consolidatedRows.length,
    },
  };
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
  let period;
  try {
    period = resolvePosReportPeriod(parsed.data);
  } catch (error) {
    throw Object.assign(
      error instanceof Error ? error : new Error("Periodo inválido"),
      { status: 400 },
    );
  }
  const requestedBranchIds = await reportBranchIds(
    req,
    parsed.data.branchIds,
  );
  const scope = await hydratePosDataScope(
    resolvePosDataScope({
      authorizedBranchIds: req.posUser!.authorizedHistoricalBranchIds,
      requestedBranchIds,
      employeeId: req.posUser!.employeeId,
      canViewAllPortfolio: true,
    }),
  );
  const branchIds = scope.branchIds;
  const from = period.businessDateFrom;
  const to = period.businessDateTo;
  const includesCosts = Boolean(
    req.posUser!.isMaster || req.posUser!.permissions.includes("REPORTS_COSTS"),
  );
  const pageSize = Math.min(parsed.data.pageSize, 100);
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
      forExport,
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
      forExport,
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
      forExport,
    );
  } else if (key === "CUSTOMER_SOURCE_MONTHLY") {
    result = await customerSourceRows({
      branchIds,
      from,
      to,
      sellerId: parsed.data.sellerId,
      paymentMethodId: parsed.data.paymentMethodId,
      search: parsed.data.search,
      page: parsed.data.page,
      pageSize,
      forExport,
    });
  } else if (key === "BANK_RECONCILIATION") {
    result = await bankReconciliationRows({
      branchIds,
      from,
      to,
      sellerId: parsed.data.sellerId,
      paymentMethodId: parsed.data.paymentMethodId,
      bankId: parsed.data.bankId,
      cardType: parsed.data.cardType,
      installmentMonths: parsed.data.installmentMonths,
      operationKind: parsed.data.operationKind,
      search: parsed.data.search,
      page: parsed.data.page,
      pageSize,
      forExport,
    });
  } else if (key === "INVENTORY_COUNTS") {
    result = await inventoryCountRows({
      branchIds,
      from,
      to,
      includeCosts: includesCosts,
      search: parsed.data.search,
      page: parsed.data.page,
      pageSize,
      forExport,
    });
  } else {
    result = await customerRows(
      branchIds,
      from,
      to,
      parsed.data.search,
      parsed.data.page,
      pageSize,
      forExport,
    );
  }
  const rows = result.rows.map((row) =>
    redactPosReportCosts(row, includesCosts),
  );
  return {
    key,
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    branchIds,
    includesCosts,
    generatedAt: new Date().toISOString(),
    scope,
    summary: result.summary ?? { Registros: result.total },
    identityResolution: {
      strategy: "CANONICAL_IDS" as const,
      legacyFallbackMatches: 0,
    },
    columns: Object.keys(rows[0] ?? {}),
    rows,
    page: forExport ? 1 : parsed.data.page,
    pageSize: forExport ? result.total : pageSize,
    total: result.total,
  };
}

async function auditReportExport(
  req: Request,
  key: PosReportKey,
  dataset: {
    dateFrom: string;
    dateTo: string;
    branchIds: string[];
    rows: ReportRow[];
    includesCosts: boolean;
    scope: PosDataScopeDto;
  },
) {
  const query = querySchema.parse(req.query);
  await prisma.auditLog.create({
    data: {
      action: "POS_REPORT_EXPORT",
      outcome: "SUCCESS",
      actorCredentialId: req.posUser!.credentialId,
      terminalId: req.posUser!.terminalId,
      branchId:
        dataset.branchIds.length === 1 ? dataset.branchIds[0] : null,
      targetType: "PosReport",
      targetId: key,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")?.slice(0, 512),
      metadata: {
        key,
        format: "DATASET_FOR_PDF_XLSX",
        dateFrom: dataset.dateFrom,
        dateTo: dataset.dateTo,
        timeZone: dataset.scope.timeZone,
        branchIds: dataset.branchIds,
        branchCount: dataset.branchIds.length,
        rowCount: dataset.rows.length,
        includesCosts: dataset.includesCosts,
        filters: exportFilterMetadata(query),
      },
    },
  });
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
    const dataset = await createDataset(req, key.data, true);
    await auditReportExport(req, key.data, dataset);
    res.json({
      success: true,
      message: "Dataset autorizado",
      data: dataset,
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
