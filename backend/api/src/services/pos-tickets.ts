import { Prisma, type MetodoPagoTipo } from "@prisma/client";
import type {
  PosTicketCreateRequestDto,
  PosTicketDto,
  PosTicketQuoteDto,
  PosTicketQuoteRequestDto,
} from "@cosmetics/types";
import { hashOpaqueToken } from "./pos-security";
import {
  PosInventoryError,
  businessDateValue,
  createInventoryLedgerMovement,
  money,
} from "./pos-inventory";
import { enqueuePosNotification } from "./pos-notifications";
import {
  activateMembershipsForTicket,
  cancelMembershipsForTicket,
  createMembershipsForTicket,
} from "./pos-memberships";

export class PosTicketError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

type Transaction = Prisma.TransactionClient;

const toCents = (value: string | Prisma.Decimal | number) =>
  Math.round(Number(value) * 100);
const fromCents = (value: number) => (value / 100).toFixed(2);
const decimalFromCents = (value: number) =>
  new Prisma.Decimal(fromCents(value));
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-MX");
const normalizePhone = (value: string | null | undefined) =>
  value ? value.replace(/\D/g, "") || null : null;

export function allocateLargestRemainder(
  totalCents: number,
  weights: number[],
): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0)
    throw new Error("Total inválido");
  if (weights.length === 0) return [];
  const weightTotal = weights.reduce(
    (sum, weight) => sum + Math.max(0, weight),
    0,
  );
  if (weightTotal <= 0) throw new Error("Pesos inválidos");
  const ideals = weights.map(
    (weight) => (totalCents * Math.max(0, weight)) / weightTotal,
  );
  const result = ideals.map(Math.floor);
  let pending = totalCents - result.reduce((sum, value) => sum + value, 0);
  const order = ideals
    .map((ideal, index) => ({ index, remainder: ideal - Math.floor(ideal) }))
    .sort(
      (left, right) =>
        right.remainder - left.remainder || left.index - right.index,
    );
  for (let index = 0; pending > 0; index += 1, pending -= 1) {
    result[order[index % order.length]!.index]! += 1;
  }
  return result;
}

interface CatalogSnapshot {
  id: string;
  name: string;
  sku: string;
  kind: "PRODUCT" | "SERVICE" | "SUPPLY" | "MACHINE" | "MEMBERSHIP";
  listPriceCents: number;
  minimumPriceCents: number;
  unitCostCents: number;
  taxRateBasisPoints: number;
  familyName: string | null;
  categoryName: string | null;
}

interface QuotedLine {
  item: CatalogSnapshot;
  quantity: number;
  quantityDecimal: string;
  unitPriceCents: number;
  subtotalCents: number;
  minimumCents: number;
  discountCents: number;
  totalCents: number;
  taxCents: number;
  notes: string | null;
  packageId: string | null;
  packageName: string | null;
  packageVersion: number | null;
  delivered: boolean;
}

export interface AuthoritativeQuote {
  subtotalCents: number;
  minimumCents: number;
  spareCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  amountReceivedCents: number;
  pendingCents: number;
  requiresAuthorization: boolean;
  lines: QuotedLine[];
}

export function quoteFromSnapshots(input: {
  lines: Array<{
    item: CatalogSnapshot;
    quantity: string;
    unitPrice: string;
    notes?: string;
    packageId?: string;
    packageName?: string;
    packageVersion?: number;
    delivered?: boolean;
  }>;
  payments?: Array<{ amount: string }>;
  discount?: { kind: "PERCENT" | "FIXED"; value: string };
}): AuthoritativeQuote {
  const baseLines = input.lines.map((line) => {
    const quantity = Number(line.quantity);
    const unitPriceCents = toCents(line.unitPrice);
    return {
      item: line.item,
      quantity,
      quantityDecimal: quantity.toFixed(2),
      unitPriceCents,
      subtotalCents: Math.round(unitPriceCents * quantity),
      minimumCents: Math.round(line.item.minimumPriceCents * quantity),
      notes: line.notes?.trim() || null,
      packageId: line.packageId ?? null,
      packageName: line.packageName ?? null,
      packageVersion: line.packageVersion ?? null,
      delivered: line.delivered ?? true,
    };
  });
  const subtotalCents = baseLines.reduce(
    (sum, line) => sum + line.subtotalCents,
    0,
  );
  const minimumCents = baseLines.reduce(
    (sum, line) => sum + line.minimumCents,
    0,
  );
  const requestedDiscount = input.discount
    ? input.discount.kind === "PERCENT"
      ? Math.round((subtotalCents * Number(input.discount.value)) / 100)
      : toCents(input.discount.value)
    : 0;
  const discountCents = Math.min(
    Math.max(0, subtotalCents - minimumCents),
    requestedDiscount,
  );
  const allocatedDiscounts =
    subtotalCents > 0
      ? allocateLargestRemainder(
          discountCents,
          baseLines.map((line) => line.subtotalCents),
        )
      : baseLines.map(() => 0);
  const lines = baseLines.map<QuotedLine>((line, index) => {
    const lineDiscount = allocatedDiscounts[index] ?? 0;
    const totalCents = line.subtotalCents - lineDiscount;
    const taxCents =
      line.item.taxRateBasisPoints > 0
        ? Math.round(
            (totalCents * line.item.taxRateBasisPoints) /
              (10_000 + line.item.taxRateBasisPoints),
          )
        : 0;
    return { ...line, discountCents: lineDiscount, totalCents, taxCents };
  });
  const totalCents = subtotalCents - discountCents;
  const amountReceivedCents = (input.payments ?? []).reduce(
    (sum, payment) => sum + toCents(payment.amount),
    0,
  );
  if (amountReceivedCents > totalCents)
    throw new PosTicketError("Los cobros exceden el total del ticket");
  return {
    subtotalCents,
    minimumCents,
    spareCents: Math.max(0, subtotalCents - minimumCents),
    discountCents,
    taxCents: lines.reduce((sum, line) => sum + line.taxCents, 0),
    totalCents,
    amountReceivedCents,
    pendingCents: totalCents - amountReceivedCents,
    requiresAuthorization: totalCents < minimumCents,
    lines,
  };
}

async function catalogSnapshots(
  tx: Transaction,
  input: PosTicketQuoteRequestDto,
  branchId: string,
) {
  const itemIds = [...new Set(input.lines.map((line) => line.itemId))];
  const packageIds = [
    ...new Set(
      input.lines.flatMap((line) => (line.packageId ? [line.packageId] : [])),
    ),
  ];
  const [items, packages] = await Promise.all([
    tx.catalogItem.findMany({
      where: {
        id: { in: itemIds },
        active: true,
        deletedAt: null,
        OR: [
          { branchVisibility: { none: {} } },
          { branchVisibility: { some: { branchId, visible: true } } },
        ],
      },
      include: {
        family: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    packageIds.length
      ? tx.posPackage.findMany({
          where: {
            id: { in: packageIds },
            status: "PUBLISHED",
            deletedAt: null,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
              { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
            ],
          },
          include: { lines: true },
        })
      : Promise.resolve([]),
  ]);
  if (items.length !== itemIds.length)
    throw new PosTicketError(
      "El ticket contiene artículos inactivos, invisibles o inexistentes",
    );
  if (packages.length !== packageIds.length)
    throw new PosTicketError(
      "El ticket contiene un paquete no publicado o fuera de vigencia",
    );
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const packageMap = new Map(packages.map((item) => [item.id, item]));
  for (const packageItem of packages) {
    const requested = input.lines.filter(
      (line) => line.packageId === packageItem.id,
    );
    if (requested.length !== packageItem.lines.length) {
      throw new PosTicketError(
        `El paquete ${packageItem.name} debe venderse completo`,
      );
    }
    const ratios = packageItem.lines.map((definition) => {
      const line = requested.find(
        (candidate) => candidate.itemId === definition.itemId,
      );
      if (!line)
        throw new PosTicketError(
          `El paquete ${packageItem.name} no contiene todas sus líneas`,
        );
      return new Prisma.Decimal(line.quantity).dividedBy(definition.quantity);
    });
    if (
      ratios.some(
        (ratio) => ratio.lessThanOrEqualTo(0) || !ratio.equals(ratios[0]!),
      )
    ) {
      throw new PosTicketError(
        `Las cantidades del paquete ${packageItem.name} no son consistentes`,
      );
    }
    const expectedCents = Math.round(
      toCents(packageItem.price) * Number(ratios[0]!),
    );
    const requestedCents = requested.reduce(
      (sum, line) =>
        sum + Math.round(toCents(line.unitPrice) * Number(line.quantity)),
      0,
    );
    if (requestedCents !== expectedCents) {
      throw new PosTicketError(
        `El precio del paquete ${packageItem.name} no coincide con su versión publicada`,
      );
    }
  }
  return input.lines.map((line) => {
    const item = itemMap.get(line.itemId)!;
    if (
      item.kind === "MEMBERSHIP" &&
      (!new Prisma.Decimal(line.quantity).isInteger() ||
        new Prisma.Decimal(line.quantity).lessThanOrEqualTo(0))
    ) {
      throw new PosTicketError(
        "Las membresías sólo se venden en unidades enteras mayores a cero",
      );
    }
    const packageItem = line.packageId ? packageMap.get(line.packageId) : null;
    if (
      packageItem &&
      !packageItem.lines.some((entry) => entry.itemId === line.itemId)
    ) {
      throw new PosTicketError(
        `El artículo ${item.sku} no pertenece al paquete indicado`,
      );
    }
    return {
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        kind: item.kind,
        listPriceCents: toCents(item.listPrice),
        minimumPriceCents: packageItem
          ? toCents(line.unitPrice)
          : toCents(item.minimumPrice),
        unitCostCents: toCents(item.unitCost),
        taxRateBasisPoints: Math.round(Number(item.taxRate) * 100),
        familyName: item.family?.name ?? null,
        categoryName: item.category?.name ?? null,
      } satisfies CatalogSnapshot,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      notes: line.notes,
      packageId: packageItem?.id,
      packageName: packageItem?.name,
      packageVersion: packageItem ? 1 : undefined,
      delivered: line.delivered,
    };
  });
}

export async function calculateAuthoritativeQuote(
  tx: Transaction,
  input: PosTicketQuoteRequestDto,
  branchId: string,
): Promise<AuthoritativeQuote> {
  const snapshots = await catalogSnapshots(tx, input, branchId);
  return quoteFromSnapshots({
    lines: snapshots,
    payments: input.payments,
    discount: input.discount,
  });
}

export function quoteDto(quote: AuthoritativeQuote): PosTicketQuoteDto {
  return {
    subtotal: fromCents(quote.subtotalCents),
    minimumTotal: fromCents(quote.minimumCents),
    spareTotal: fromCents(quote.spareCents),
    discountTotal: fromCents(quote.discountCents),
    taxTotal: fromCents(quote.taxCents),
    total: fromCents(quote.totalCents),
    amountReceived: fromCents(quote.amountReceivedCents),
    pendingAmount: fromCents(quote.pendingCents),
    requiresAuthorization: quote.requiresAuthorization,
    authorizationPurpose: quote.requiresAuthorization
      ? "SALE_BELOW_MINIMUM"
      : null,
    lines: quote.lines.map((line) => ({
      itemId: line.item.id,
      itemName: line.item.name,
      sku: line.item.sku,
      quantity: line.quantityDecimal,
      unitPrice: fromCents(line.unitPriceCents),
      unitMinimumPrice: fromCents(line.item.minimumPriceCents),
      subtotal: fromCents(line.subtotalCents),
      discountTotal: fromCents(line.discountCents),
      taxTotal: fromCents(line.taxCents),
      total: fromCents(line.totalCents),
      packageId: line.packageId,
    })),
  };
}

export async function consumeTicketAuthorization(
  tx: Transaction,
  token: string | undefined,
  purpose: string,
  terminalId: string,
  target?: { entityType: string; entityId: string },
  sessionId?: string,
) {
  if (!token) return null;
  const authorization = await tx.masterAuthorization.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
  });
  const valid =
    authorization &&
    authorization.purpose === purpose &&
    authorization.terminalId === terminalId &&
    (sessionId === undefined || authorization.sessionId === sessionId) &&
    authorization.usedAt === null &&
    authorization.expiresAt > new Date() &&
    (!target ||
      (authorization.entityType === target.entityType &&
        authorization.entityId === target.entityId));
  if (!valid) return null;
  const consumed = await tx.masterAuthorization.updateMany({
    where: { id: authorization.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return consumed.count === 1 ? authorization : null;
}

async function validateSellers(
  tx: Transaction,
  sellers: PosTicketCreateRequestDto["sellers"],
  totalCents: number,
  branchId: string,
  customerId: string | null,
) {
  const employees = await tx.empleado.findMany({
    where: {
      id: { in: sellers.map((seller) => seller.employeeId) },
      activo: true,
      OR: [
        { todasSucursales: true },
        { sucursalId: branchId },
        ...(customerId
          ? [
              {
                customerPortfolios: {
                  some: { customerId, effectiveTo: null },
                },
              },
            ]
          : []),
      ],
    },
    select: { id: true, nombreCompleto: true },
  });
  if (employees.length !== sellers.length)
    throw new PosTicketError(
      "El ticket contiene vendedores inactivos o inexistentes",
    );
  const shares = sellers.map((seller) => toCents(seller.share));
  if (shares.reduce((sum, share) => sum + share, 0) !== totalCents) {
    throw new PosTicketError(
      "La distribución de vendedores no coincide con el total",
    );
  }
  return { employees, shares };
}

async function validatePayments(
  tx: Transaction,
  payments: PosTicketCreateRequestDto["payments"],
) {
  if (payments.length === 0) return [];
  const methods = await tx.metodoPago.findMany({
    where: {
      id: { in: payments.map((payment) => payment.methodId) },
      activo: true,
    },
    include: { posPolicy: true },
  });
  if (
    methods.length !== new Set(payments.map((payment) => payment.methodId)).size
  ) {
    throw new PosTicketError(
      "El cobro contiene métodos inactivos o inexistentes",
    );
  }
  const map = new Map(methods.map((method) => [method.id, method]));
  for (const payment of payments) {
    const method = map.get(payment.methodId)!;
    if (!method.posPolicy?.activeForPos)
      throw new PosTicketError(`${method.nombre} no está habilitado para POS`);
    const amount = new Prisma.Decimal(payment.amount);
    if (
      method.posPolicy.minAmount &&
      amount.lessThan(method.posPolicy.minAmount)
    )
      throw new PosTicketError(
        `El importe no alcanza el mínimo de ${method.nombre}`,
      );
    if (
      method.posPolicy.maxAmount &&
      amount.greaterThan(method.posPolicy.maxAmount)
    )
      throw new PosTicketError(
        `El importe excede el máximo de ${method.nombre}`,
      );
    if (method.posPolicy.requiresReference && !payment.reference)
      throw new PosTicketError(`${method.nombre} requiere referencia`);
    if (
      method.tipo !== "EFECTIVO" &&
      (!payment.institution || !payment.authorizationLastFour)
    ) {
      throw new PosTicketError(
        `${method.nombre} requiere institución y cuatro dígitos de autorización`,
      );
    }
  }
  return payments.map((payment) => ({
    payment,
    method: map.get(payment.methodId)!,
  }));
}

async function nextSequence(
  tx: Transaction,
  sequence:
    | "PosTicketFolioSeq"
    | "PosPaymentFolioSeq"
    | "PosDeliveryFolioSeq"
    | "PosVoucherFolioSeq",
) {
  const rows = await tx.$queryRaw<Array<{ value: bigint }>>(
    Prisma.sql`SELECT nextval(${Prisma.raw(`'"${sequence}"'`)}) AS value`,
  );
  return BigInt(rows[0]!.value);
}

async function projectPaymentOperation(
  tx: Transaction,
  input: {
    operationId: string;
    branchId: string;
    businessDate: string;
    note: string;
    sellers: Array<{ employeeId: string; weightCents: number }>;
    payments: Array<{ methodId: string; amountCents: number }>;
    negative?: boolean;
  },
) {
  const total = input.payments.reduce(
    (sum, payment) => sum + payment.amountCents,
    0,
  );
  if (total === 0) return;
  const sellerTotals = allocateLargestRemainder(
    total,
    input.sellers.map((seller) => seller.weightCents),
  );
  const remainingColumns = input.payments.map((payment) => payment.amountCents);
  let remainingTotal = total;
  for (
    let sellerIndex = 0;
    sellerIndex < input.sellers.length;
    sellerIndex += 1
  ) {
    const seller = input.sellers[sellerIndex]!;
    let rowRemaining = sellerTotals[sellerIndex]!;
    const details: Array<{ metodoPagoId: string; cantidad: Prisma.Decimal }> =
      [];
    for (
      let paymentIndex = 0;
      paymentIndex < input.payments.length;
      paymentIndex += 1
    ) {
      const payment = input.payments[paymentIndex]!;
      const cell =
        paymentIndex === input.payments.length - 1
          ? rowRemaining
          : Math.min(
              rowRemaining,
              Math.floor(
                (rowRemaining * remainingColumns[paymentIndex]!) /
                  Math.max(1, remainingTotal),
              ),
            );
      if (cell > 0)
        details.push({
          metodoPagoId: payment.methodId,
          cantidad: decimalFromCents(cell),
        });
      rowRemaining -= cell;
      remainingColumns[paymentIndex]! -= cell;
      remainingTotal -= cell;
    }
    if (rowRemaining !== 0)
      throw new PosTicketError(
        "No se pudo conciliar la proyección legacy",
        500,
      );
    const venta = await tx.venta.create({
      data: {
        fecha: businessDateValue(input.businessDate),
        notas: input.note,
        sesionId: input.operationId,
        sucursalId: input.branchId,
        vendedorId: seller.employeeId,
        detalles: {
          create: details.map((detail) => ({
            ...detail,
            cantidad: input.negative
              ? detail.cantidad.negated()
              : detail.cantidad,
          })),
        },
      },
    });
    await tx.posLegacySaleProjection.create({
      data: {
        operationId: input.operationId,
        employeeId: seller.employeeId,
        ventaId: venta.id,
        amount: input.negative
          ? decimalFromCents(sellerTotals[sellerIndex]!).negated()
          : decimalFromCents(sellerTotals[sellerIndex]!),
      },
    });
  }
  if (remainingColumns.some((value) => value !== 0))
    throw new PosTicketError(
      "La proyección legacy no coincide con los cobros",
      500,
    );
}

const ticketInclude = {
  branch: { select: { nombre: true } },
  customer: { select: { id: true } },
  lines: {
    include: { item: { select: { kind: true } } },
    orderBy: { creadoEn: "asc" as const },
  },
  sellers: { orderBy: { creadoEn: "asc" as const } },
  paymentOperations: {
    include: { payments: true },
    orderBy: { creadoEn: "asc" as const },
  },
  layaway: true,
  owedProducts: {
    include: { item: { select: { name: true } } },
    orderBy: { creadoEn: "asc" as const },
  },
  appointments: {
    include: { branch: { select: { nombre: true } } },
    orderBy: { creadoEn: "asc" as const },
  },
} satisfies Prisma.PosTicketInclude;

type TicketPayload = Prisma.PosTicketGetPayload<{
  include: typeof ticketInclude;
}>;

export function ticketDto(ticket: TicketPayload): PosTicketDto {
  const lines = ticket.lines.map((line) => ({
    id: line.id,
    kind: line.kind,
    itemId: line.itemId,
    itemName: line.itemNameSnapshot,
    sku: line.skuSnapshot,
    quantity: money(line.quantity)!,
    unitPrice: money(line.unitPrice)!,
    unitListPrice: money(line.unitListPrice)!,
    unitMinimumPrice: money(line.unitMinimumPrice)!,
    subtotal: money(line.subtotal)!,
    discountTotal: money(line.discountTotal)!,
    taxTotal: money(line.taxTotal)!,
    total: money(line.total)!,
    packageId: line.packageId,
    packageName: line.packageNameSnapshot,
    notes: line.notes,
  }));
  return {
    id: ticket.id,
    folio: ticket.folio,
    status: ticket.status,
    settlementStatus: ticket.settlementStatus,
    businessDate: ticket.businessDate.toISOString().slice(0, 10),
    createdAt: ticket.creadoEn.toISOString(),
    branchId: ticket.branchId,
    branchName: ticket.branch.nombre,
    customerId: ticket.customerId,
    customerName: ticket.customerNameSnapshot,
    customerPhone: ticket.customerPhoneSnapshot,
    subtotal: money(ticket.subtotal)!,
    minimumTotal: money(ticket.minimumTotal)!,
    spareTotal: money(ticket.spareTotal)!,
    discountTotal: money(ticket.discountTotal)!,
    taxTotal: money(ticket.taxTotal)!,
    total: money(ticket.total)!,
    amountReceived: money(ticket.amountPaid)!,
    pendingAmount: money(ticket.pendingAmount)!,
    requiresAuthorization:
      ticket.total.lessThan(ticket.minimumTotal) && !ticket.authorizationId,
    authorizationPurpose: ticket.total.lessThan(ticket.minimumTotal)
      ? "SALE_BELOW_MINIMUM"
      : null,
    lines,
    sellers: ticket.sellers.map((seller) => ({
      employeeId: seller.employeeId,
      name: seller.sellerNameSnapshot,
      shareAmount: money(seller.shareAmount)!,
      sharePercent: money(seller.sharePercent)!,
      clockedIn: seller.clockedInSnapshot,
      presenceBranchId: seller.presenceBranchIdSnapshot,
      attendanceId: seller.attendanceIdSnapshot,
    })),
    paymentOperations: ticket.paymentOperations.map((operation) => ({
      id: operation.id,
      folio: operation.folio,
      kind: operation.kind,
      amount: money(operation.amount)!,
      businessDate: operation.businessDate.toISOString().slice(0, 10),
      createdAt: operation.creadoEn.toISOString(),
      payments: operation.payments.map((payment) => ({
        id: payment.id,
        methodId: payment.paymentMethodId,
        methodName: payment.methodNameSnapshot,
        methodType: payment.methodTypeSnapshot,
        amount: money(payment.amount)!,
        reference: payment.reference,
        institution: payment.institution,
        authorizationLastFour: payment.authorizationLastFour,
      })),
    })),
    owedProducts: ticket.owedProducts.map((owed) => ({
      id: owed.id,
      ticketLineId: owed.ticketLineId,
      itemId: owed.itemId,
      itemName: owed.item.name,
      quantity: money(owed.quantity)!,
      deliveredQuantity: money(owed.deliveredQuantity)!,
      pendingQuantity: owed.quantity.minus(owed.deliveredQuantity).toFixed(2),
      inventoryCommitted: owed.inventoryCommitted,
      status: owed.status,
    })),
    appointments: ticket.appointments.map((appointment) => ({
      id: appointment.id,
      kind: appointment.kind,
      status: appointment.status,
      serviceItemId: appointment.serviceItemId,
      serviceName: appointment.serviceNameSnapshot,
      branchId: appointment.branchId,
      branchName: appointment.branch.nombre,
      sellerId: appointment.sellerId,
      scheduledAt: appointment.scheduledAt?.toISOString() ?? null,
    })),
  };
}

export async function findTicket(tx: Transaction, ticketId: string) {
  return tx.posTicket.findUnique({
    where: { id: ticketId },
    include: ticketInclude,
  });
}

async function requireOpenBusinessDay(
  tx: Transaction,
  branchId: string,
  businessDate: string,
) {
  const day = await tx.posBusinessDay.findUnique({
    where: {
      branchId_businessDate: {
        branchId,
        businessDate: businessDateValue(businessDate),
      },
    },
    select: { status: true },
  });
  if (day?.status !== "OPEN") {
    throw new PosTicketError(
      "La operación requiere una jornada abierta para la fecha operativa actual",
      409,
    );
  }
}

export async function createTicket(
  tx: Transaction,
  input: PosTicketCreateRequestDto,
  context: {
    credentialId: string;
    terminalId: string;
    branchId: string;
    businessDate: string;
    isMaster: boolean;
    sessionId?: string;
  },
) {
  if (input.branchId !== context.branchId)
    throw new PosTicketError("La sucursal no coincide con la terminal", 403);
  await requireOpenBusinessDay(tx, context.branchId, context.businessDate);
  const quote = await calculateAuthoritativeQuote(tx, input, context.branchId);
  const authorization = quote.requiresAuthorization
    ? await consumeTicketAuthorization(
        tx,
        input.authorizationToken,
        "SALE_BELOW_MINIMUM",
        context.terminalId,
        undefined,
        context.sessionId,
      )
    : null;
  if (quote.requiresAuthorization && !authorization) {
    throw new PosTicketError(
      "El total está debajo del mínimo combinado y requiere autorización master",
      403,
    );
  }
  const { employees, shares } = await validateSellers(
    tx,
    input.sellers,
    quote.totalCents,
    context.branchId,
    input.customer.id ?? null,
  );
  const openAttendances = await tx.posAttendance.findMany({
    where: {
      employeeId: { in: input.sellers.map((seller) => seller.employeeId) },
      branchId: context.branchId,
      status: "OPEN",
      clockOutAt: null,
    },
    select: { id: true, employeeId: true, branchId: true },
  });
  const attendanceByEmployee = new Map(
    openAttendances.map((attendance) => [attendance.employeeId, attendance]),
  );
  const payments = await validatePayments(tx, input.payments);
  if (
    payments.reduce((sum, entry) => sum + toCents(entry.payment.amount), 0) !==
    quote.amountReceivedCents
  ) {
    throw new PosTicketError("Los pagos no coinciden con la cotización");
  }
  const customer = input.customer.id
    ? await tx.customer.findFirst({
        where: { id: input.customer.id, active: true, deletedAt: null },
      })
    : input.customer.create
      ? await tx.customer.create({
          data: {
            displayName: input.customer.create.displayName,
            normalizedName: normalize(input.customer.create.displayName),
            phone: normalizePhone(input.customer.create.phone),
            email: input.customer.create.email ?? null,
            sourceId: input.customer.create.sourceId ?? null,
            notes: input.customer.create.notes ?? null,
            portfolios: input.customer.create.ownerEmployeeId
              ? {
                  create: {
                    branchId: context.branchId,
                    employeeId: input.customer.create.ownerEmployeeId,
                    createdByCredentialId: context.credentialId,
                  },
                }
              : undefined,
          },
        })
      : null;
  if (!customer) throw new PosTicketError("Cliente no encontrado");
  const sequence = await nextSequence(tx, "PosTicketFolioSeq");
  const terminal = await tx.posTerminal.findUnique({
    where: { id: context.terminalId },
    select: { code: true },
  });
  if (!terminal) throw new PosTicketError("Terminal no encontrada", 404);
  const folio = `KSR-${terminal.code.toLocaleUpperCase("es-MX")}-${sequence.toString().padStart(6, "0")}`;
  const status = quote.pendingCents === 0 ? "COMPLETED" : "LAYAWAY";
  const settlementStatus =
    quote.pendingCents === 0
      ? "PAID"
      : quote.amountReceivedCents > 0
        ? "LAYAWAY"
        : "PENDING";
  const employeeMap = new Map(
    employees.map((employee) => [employee.id, employee]),
  );
  let ticket = await tx.posTicket.create({
    data: {
      folio,
      terminalSequence: sequence,
      status,
      settlementStatus,
      businessDate: businessDateValue(context.businessDate),
      branchId: context.branchId,
      terminalId: context.terminalId,
      createdByCredentialId: context.credentialId,
      customerId: customer.id,
      customerNameSnapshot: customer.displayName,
      customerPhoneSnapshot: customer.phone,
      subtotal: decimalFromCents(quote.subtotalCents),
      minimumTotal: decimalFromCents(quote.minimumCents),
      spareTotal: decimalFromCents(quote.spareCents),
      discountTotal: decimalFromCents(quote.discountCents),
      taxTotal: decimalFromCents(quote.taxCents),
      total: decimalFromCents(quote.totalCents),
      amountPaid: decimalFromCents(quote.amountReceivedCents),
      pendingAmount: decimalFromCents(quote.pendingCents),
      authorizationId: authorization?.id ?? null,
      lines: {
        create: [
          ...quote.lines.map((line) => ({
            kind: "SALE" as const,
            itemId: line.item.id,
            packageId: line.packageId,
            packageVersionSnapshot: line.packageVersion,
            packageNameSnapshot: line.packageName,
            itemNameSnapshot: line.item.name,
            skuSnapshot: line.item.sku,
            familySnapshot: line.item.familyName,
            categorySnapshot: line.item.categoryName,
            quantity: new Prisma.Decimal(line.quantityDecimal),
            unitListPrice: decimalFromCents(line.item.listPriceCents),
            unitMinimumPrice: decimalFromCents(line.item.minimumPriceCents),
            unitPrice: decimalFromCents(line.unitPriceCents),
            unitCostSnapshot: decimalFromCents(line.item.unitCostCents),
            taxRateSnapshot: new Prisma.Decimal(
              line.item.taxRateBasisPoints / 100,
            ),
            subtotal: decimalFromCents(line.subtotalCents),
            minimumTotal: decimalFromCents(line.minimumCents),
            discountTotal: decimalFromCents(line.discountCents),
            taxTotal: decimalFromCents(line.taxCents),
            total: decimalFromCents(line.totalCents),
            notes: line.notes,
          })),
          ...(input.courtesies ?? []).map((courtesy, index) => ({
            kind: "GIFT" as const,
            itemId: courtesy.serviceItemId ?? null,
            itemNameSnapshot: courtesy.serviceName,
            skuSnapshot: `REGALO-${index + 1}`,
            quantity: new Prisma.Decimal(1),
            unitListPrice: new Prisma.Decimal(0),
            unitMinimumPrice: new Prisma.Decimal(0),
            unitPrice: new Prisma.Decimal(0),
            unitCostSnapshot: new Prisma.Decimal(0),
            taxRateSnapshot: new Prisma.Decimal(0),
            subtotal: new Prisma.Decimal(0),
            minimumTotal: new Prisma.Decimal(0),
            discountTotal: new Prisma.Decimal(0),
            taxTotal: new Prisma.Decimal(0),
            total: new Prisma.Decimal(0),
          })),
        ],
      },
      sellers: {
        create: input.sellers.map((seller, index) => ({
          employeeId: seller.employeeId,
          sellerNameSnapshot: employeeMap.get(seller.employeeId)!
            .nombreCompleto,
          shareAmount: decimalFromCents(shares[index]!),
          sharePercent: new Prisma.Decimal(
            quote.totalCents
              ? ((shares[index]! * 100) / quote.totalCents).toFixed(4)
              : "0",
          ),
          clockedInSnapshot: attendanceByEmployee.has(seller.employeeId),
          presenceBranchIdSnapshot:
            attendanceByEmployee.get(seller.employeeId)?.branchId ?? null,
          attendanceIdSnapshot:
            attendanceByEmployee.get(seller.employeeId)?.id ?? null,
        })),
      },
      layaway:
        quote.pendingCents > 0
          ? {
              create: {
                amountPaid: decimalFromCents(quote.amountReceivedCents),
                pendingAmount: decimalFromCents(quote.pendingCents),
              },
            }
          : undefined,
    },
    include: ticketInclude,
  });

  await createMembershipsForTicket(tx, {
    ticketId: ticket.id,
    credentialId: context.credentialId,
    activate: status === "COMPLETED",
  });

  const productLines = quote.lines.filter(
    (line) => line.item.kind === "PRODUCT",
  );
  const branchLocation = productLines.length
    ? await tx.inventoryLocation.findUnique({
        where: { branchId: context.branchId },
      })
    : null;
  if (productLines.length > 0 && !branchLocation)
    throw new PosTicketError(
      "La sucursal no tiene ubicación de inventario",
      409,
    );
  const deliveredProductLines = productLines.filter((line) => line.delivered);
  const ticketLineByKey = new Map(
    ticket.lines
      .filter((line) => line.kind === "SALE" && line.itemId)
      .map((line) => [`${line.itemId}:${line.packageId ?? ""}`, line]),
  );
  const owedData: Array<{
    ticketId: string;
    ticketLineId: string;
    itemId: string;
    quantity: Prisma.Decimal;
    inventoryCommitted: boolean;
  }> = productLines
    .filter((line) => !line.delivered)
    .map((line) => ({
      ticketId: ticket.id,
      ticketLineId: ticketLineByKey.get(
        `${line.item.id}:${line.packageId ?? ""}`,
      )!.id,
      itemId: line.item.id,
      quantity: new Prisma.Decimal(line.quantityDecimal),
      inventoryCommitted: false,
    }));
  if (deliveredProductLines.length > 0) {
    const inventoryByItem = new Map<
      string,
      { item: QuotedLine["item"]; quantity: Prisma.Decimal }
    >();
    for (const line of deliveredProductLines) {
      const current = inventoryByItem.get(line.item.id);
      inventoryByItem.set(line.item.id, {
        item: line.item,
        quantity: (current?.quantity ?? new Prisma.Decimal(0)).plus(
          line.quantityDecimal,
        ),
      });
    }
    const movement = await createInventoryLedgerMovement(tx, {
      type: "REMOVE",
      reason: `VENTA_${folio}`,
      businessDate: context.businessDate,
      actorCredentialId: context.credentialId,
      terminalId: context.terminalId,
      lines: [...inventoryByItem.values()].map(({ item, quantity }) => ({
        itemId: item.id,
        fromLocationId: branchLocation!.id,
        toLocationId: null,
        quantity,
        unitCostSnapshot: decimalFromCents(item.unitCostCents),
        metadata: { ticketId: ticket.id, ticketFolio: folio },
        requireSourceStock: false,
      })),
    });
    await tx.posTicket.update({
      where: { id: ticket.id },
      data: { inventoryMovementId: movement.id },
    });
    const ticketLinesByItem = new Map<string, typeof ticket.lines>();
    for (const quoted of deliveredProductLines) {
      const line = ticketLineByKey.get(
        `${quoted.item.id}:${quoted.packageId ?? ""}`,
      )!;
      ticketLinesByItem.set(line.itemId!, [
        ...(ticketLinesByItem.get(line.itemId!) ?? []),
        line,
      ]);
    }
    const shortageOwed = movement.lines.flatMap((line) => {
      const before = Number(line.fromQuantityBefore ?? 0);
      const requested = Number(line.quantity);
      let shortage = Math.max(0, requested - Math.max(0, before));
      return (ticketLinesByItem.get(line.itemId) ?? []).flatMap(
        (ticketLine) => {
          if (shortage <= 0) return [];
          const lineShortage = Math.min(shortage, Number(ticketLine.quantity));
          shortage -= lineShortage;
          return [
            {
              ticketId: ticket.id,
              ticketLineId: ticketLine.id,
              itemId: line.itemId,
              quantity: new Prisma.Decimal(lineShortage.toFixed(2)),
              inventoryCommitted: true,
            },
          ];
        },
      );
    });
    owedData.push(...shortageOwed);
  }
  if (owedData.length) await tx.posOwedProduct.createMany({ data: owedData });

  const createdAppointments = [];
  const appointmentBranchIds = [
    ...new Set(
      (input.appointments ?? []).map((appointment) => appointment.branchId),
    ),
  ];
  if (
    appointmentBranchIds.length > 0 &&
    (await tx.sucursal.count({
      where: { id: { in: appointmentBranchIds }, activa: true },
    })) !== appointmentBranchIds.length
  ) {
    throw new PosTicketError(
      "La cita contiene una sucursal inactiva o inexistente",
    );
  }
  for (const appointment of input.appointments ?? []) {
    createdAppointments.push(
      await tx.posAppointment.create({
        data: {
          ticketId: ticket.id,
          customerId: customer.id,
          kind: appointment.kind,
          status:
            appointment.kind === "NO_APPOINTMENT" ? "PENDING" : "SCHEDULED",
          serviceItemId: appointment.serviceItemId ?? null,
          serviceNameSnapshot: appointment.serviceName,
          branchId: appointment.branchId,
          sellerId: appointment.sellerId ?? null,
          scheduledAt: appointment.scheduledAt
            ? new Date(appointment.scheduledAt)
            : null,
          createdByCredentialId: context.credentialId,
        },
      }),
    );
  }
  const giftLines = ticket.lines.filter((line) => line.kind === "GIFT");
  for (const [index, courtesy] of (input.courtesies ?? []).entries()) {
    const policy = courtesy.policyId
      ? await tx.posCourtesyPolicy.findFirst({
          where: { id: courtesy.policyId, active: true, deletedAt: null },
        })
      : null;
    let courtesyAuthorizationId: string | null = null;
    if (policy?.requiresAuthorization && !context.isMaster) {
      const auth = await consumeTicketAuthorization(
        tx,
        courtesy.authorizationToken,
        "SALE_COURTESY",
        context.terminalId,
        { entityType: "PosCourtesyPolicy", entityId: policy.id },
      );
      if (!auth)
        throw new PosTicketError(
          "La cortesía requiere autorización master",
          403,
        );
      courtesyAuthorizationId = auth.id;
    }
    await tx.posCourtesy.create({
      data: {
        ticketId: ticket.id,
        ticketLineId: giftLines[index]!.id,
        appointmentId:
          courtesy.appointmentIndex === undefined
            ? null
            : (createdAppointments[courtesy.appointmentIndex]?.id ?? null),
        policyId: policy?.id ?? null,
        policyNameSnapshot: policy?.name ?? courtesy.policyName,
        authorizationId:
          courtesyAuthorizationId ??
          (policy?.requiresAuthorization && context.isMaster
            ? context.credentialId
            : null),
      },
    });
  }

  if (quote.amountReceivedCents > 0) {
    const paymentSequence = await nextSequence(tx, "PosPaymentFolioSeq");
    const operation = await tx.posPaymentOperation.create({
      data: {
        ticketId: ticket.id,
        folio: `${settlementStatus === "LAYAWAY" ? "APT" : "COB"}-${paymentSequence.toString().padStart(6, "0")}`,
        kind: "SALE",
        amount: decimalFromCents(quote.amountReceivedCents),
        businessDate: businessDateValue(context.businessDate),
        actorCredentialId: context.credentialId,
        terminalId: context.terminalId,
        payments: {
          create: payments.map(({ payment, method }) => ({
            paymentMethodId: method.id,
            methodNameSnapshot: method.nombre,
            methodTypeSnapshot: method.tipo,
            amount: new Prisma.Decimal(payment.amount),
            reference: payment.reference ?? null,
            institution: payment.institution ?? null,
            authorizationLastFour: payment.authorizationLastFour ?? null,
          })),
        },
      },
    });
    await projectPaymentOperation(tx, {
      operationId: operation.id,
      branchId: context.branchId,
      businessDate: context.businessDate,
      note: `Proyección POS ${folio} / ${operation.folio}`,
      sellers: input.sellers.map((seller, index) => ({
        employeeId: seller.employeeId,
        weightCents: shares[index]!,
      })),
      payments: payments.map(({ payment, method }) => ({
        methodId: method.id,
        amountCents: toCents(payment.amount),
      })),
    });
  }
  ticket = (await findTicket(tx, ticket.id))!;
  await enqueuePosNotification(tx, {
    kind: "SALE_COMPLETED",
    title: `Venta finalizada · ${ticket.folio}`,
    message: `${ticket.customerNameSnapshot ?? "Público general"} · ${ticket.total.toFixed(2)} MXN`,
    branchId: ticket.branchId,
    audiencePermission: "SALE_VIEW_ALL",
    createdByCredentialId: context.credentialId,
    sourceType: "PosTicket",
    sourceId: ticket.id,
  });
  return ticket;
}

export async function addLayawayPayment(
  tx: Transaction,
  input: {
    ticketId: string;
    payments: PosTicketCreateRequestDto["payments"];
    deliveredTicketLineIds?: string[];
  },
  context: {
    credentialId: string;
    terminalId: string;
    branchId: string;
    businessDate: string;
  },
) {
  await requireOpenBusinessDay(tx, context.branchId, context.businessDate);
  const ticket = await findTicket(tx, input.ticketId);
  if (!ticket || ticket.branchId !== context.branchId)
    throw new PosTicketError("Apartado no encontrado", 404);
  if (
    !ticket.layaway ||
    ticket.layaway.pendingAmount.lessThanOrEqualTo(0) ||
    ticket.status === "CANCELED"
  )
    throw new PosTicketError("El apartado ya no admite abonos", 409);
  const payments = await validatePayments(tx, input.payments);
  const amountCents = payments.reduce(
    (sum, entry) => sum + toCents(entry.payment.amount),
    0,
  );
  const pendingCents = toCents(ticket.layaway.pendingAmount);
  if (amountCents > pendingCents)
    throw new PosTicketError("El abono excede el saldo pendiente");
  const paymentSequence = await nextSequence(tx, "PosPaymentFolioSeq");
  const operation = await tx.posPaymentOperation.create({
    data: {
      ticketId: ticket.id,
      folio: `APT-${paymentSequence.toString().padStart(6, "0")}`,
      kind: "LAYAWAY_PAYMENT",
      amount: decimalFromCents(amountCents),
      businessDate: businessDateValue(context.businessDate),
      actorCredentialId: context.credentialId,
      terminalId: context.terminalId,
      payments: {
        create: payments.map(({ payment, method }) => ({
          paymentMethodId: method.id,
          methodNameSnapshot: method.nombre,
          methodTypeSnapshot: method.tipo,
          amount: new Prisma.Decimal(payment.amount),
          reference: payment.reference ?? null,
          institution: payment.institution ?? null,
          authorizationLastFour: payment.authorizationLastFour ?? null,
        })),
      },
    },
  });
  const nextPending = pendingCents - amountCents;
  await tx.posLayaway.update({
    where: { ticketId: ticket.id },
    data: {
      amountPaid: { increment: decimalFromCents(amountCents) },
      pendingAmount: decimalFromCents(nextPending),
      paidAt: nextPending === 0 ? new Date() : null,
    },
  });
  await tx.posTicket.update({
    where: { id: ticket.id },
    data: {
      amountPaid: { increment: decimalFromCents(amountCents) },
      pendingAmount: decimalFromCents(nextPending),
      settlementStatus: nextPending === 0 ? "PAID" : "LAYAWAY",
      status: nextPending === 0 ? "COMPLETED" : "LAYAWAY",
    },
  });
  await projectPaymentOperation(tx, {
    operationId: operation.id,
    branchId: context.branchId,
    businessDate: context.businessDate,
    note: `Abono POS ${ticket.folio} / ${operation.folio}`,
    sellers: ticket.sellers.map((seller) => ({
      employeeId: seller.employeeId,
      weightCents: toCents(seller.shareAmount),
    })),
    payments: payments.map(({ payment, method }) => ({
      methodId: method.id,
      amountCents: toCents(payment.amount),
    })),
  });
  if (nextPending === 0) {
    await activateMembershipsForTicket(
      tx,
      ticket.id,
      context.credentialId,
      operation.id,
    );
  }
  const deliveredLineIds = new Set(input.deliveredTicketLineIds ?? []);
  for (const owed of ticket.owedProducts.filter(
    (candidate) =>
      candidate.status === "PENDING" &&
      deliveredLineIds.has(candidate.ticketLineId),
  )) {
    await deliverOwedProduct(
      tx,
      {
        owedProductId: owed.id,
        quantity: owed.quantity.minus(owed.deliveredQuantity).toFixed(2),
      },
      context,
    );
  }
  return (await findTicket(tx, ticket.id))!;
}

export async function deliverOwedProduct(
  tx: Transaction,
  input: { owedProductId: string; quantity: string },
  context: {
    credentialId: string;
    terminalId: string;
    branchId: string;
    businessDate: string;
  },
) {
  await requireOpenBusinessDay(tx, context.branchId, context.businessDate);
  const owed = await tx.posOwedProduct.findUnique({
    where: { id: input.owedProductId },
    include: { ticket: true, item: true },
  });
  if (!owed || owed.ticket.branchId !== context.branchId)
    throw new PosTicketError("Producto adeudado no encontrado", 404);
  if (owed.status !== "PENDING")
    throw new PosTicketError("El producto adeudado ya no admite entregas", 409);
  const quantity = new Prisma.Decimal(input.quantity);
  if (quantity.greaterThan(owed.quantity.minus(owed.deliveredQuantity)))
    throw new PosTicketError("La entrega excede la cantidad pendiente");
  const branchLocation = owed.inventoryCommitted
    ? null
    : await tx.inventoryLocation.findUnique({
        where: { branchId: context.branchId },
      });
  if (!owed.inventoryCommitted && !branchLocation)
    throw new PosTicketError(
      "La sucursal no tiene ubicación de inventario",
      409,
    );
  const movement = await createInventoryLedgerMovement(tx, {
    type: "REMOVE",
    reason: `ENTREGA_ADEUDO_${owed.ticket.folio}`,
    businessDate: context.businessDate,
    actorCredentialId: context.credentialId,
    terminalId: context.terminalId,
    lines: [
      {
        itemId: owed.itemId,
        fromLocationId: branchLocation?.id ?? null,
        toLocationId: null,
        quantity,
        unitCostSnapshot: owed.item.unitCost,
        metadata: {
          owedProductId: owed.id,
          inventoryAlreadyCommittedAtSale: owed.inventoryCommitted,
        },
        requireSourceStock: !owed.inventoryCommitted,
      },
    ],
  });
  const sequence = await nextSequence(tx, "PosDeliveryFolioSeq");
  const delivery = await tx.posOwedProductDelivery.create({
    data: {
      folio: `ENT-${sequence.toString().padStart(6, "0")}`,
      businessDate: businessDateValue(context.businessDate),
      actorCredentialId: context.credentialId,
      terminalId: context.terminalId,
      inventoryMovementId: movement.id,
      lines: {
        create: [{ owedProductId: owed.id, itemId: owed.itemId, quantity }],
      },
    },
    include: { lines: true },
  });
  const deliveredQuantity = owed.deliveredQuantity.plus(quantity);
  await tx.posOwedProduct.update({
    where: { id: owed.id },
    data: {
      deliveredQuantity,
      status: deliveredQuantity.equals(owed.quantity) ? "DELIVERED" : "PENDING",
    },
  });
  return {
    id: delivery.id,
    folio: delivery.folio,
    businessDate: delivery.businessDate.toISOString().slice(0, 10),
    createdAt: delivery.creadoEn.toISOString(),
    lines: delivery.lines.map((line) => ({
      owedProductId: line.owedProductId,
      itemId: line.itemId,
      quantity: money(line.quantity)!,
    })),
  };
}

export async function appendTicketRevision(
  tx: Transaction,
  input: {
    ticketId: string;
    reason: string;
    authorizationToken: string;
    snapshot: Prisma.InputJsonValue;
  },
  context: {
    credentialId: string;
    terminalId: string;
    branchId: string;
    businessDate: string;
    isMaster: boolean;
    sessionId?: string;
  },
) {
  await requireOpenBusinessDay(tx, context.branchId, context.businessDate);
  const ticket = await findTicket(tx, input.ticketId);
  if (!ticket || ticket.branchId !== context.branchId)
    throw new PosTicketError("Ticket no encontrado", 404);
  const authorization = await consumeTicketAuthorization(
    tx,
    input.authorizationToken,
    "TICKET_REVISION",
    context.terminalId,
    { entityType: "PosTicket", entityId: ticket.id },
    context.sessionId,
  );
  if (!authorization)
    throw new PosTicketError("La revisión requiere autorización master", 403);
  const event = await tx.posTicketEvent.create({
    data: {
      ticketId: ticket.id,
      type: "REVISION",
      reason: input.reason,
      snapshot: input.snapshot,
      actorCredentialId: context.credentialId,
      authorizationId: authorization.id,
    },
  });
  await tx.posTicket.update({
    where: { id: ticket.id },
    data: { version: { increment: 1 } },
  });
  return {
    id: event.id,
    type: event.type,
    amount: money(event.amount)!,
    reason: event.reason,
    createdAt: event.creadoEn.toISOString(),
  };
}

export async function cancelOrReturnTicket(
  tx: Transaction,
  input: {
    ticketId: string;
    reason: string;
    refundAmount?: string;
    returnedLines: Array<{ ticketLineId: string; quantity: string }>;
    revision?: Record<string, unknown>;
    authorizationToken: string;
  },
  context: {
    credentialId: string;
    terminalId: string;
    branchId: string;
    businessDate: string;
    isMaster: boolean;
    sessionId?: string;
  },
) {
  await requireOpenBusinessDay(tx, context.branchId, context.businessDate);
  const ticket = await findTicket(tx, input.ticketId);
  if (!ticket || ticket.branchId !== context.branchId)
    throw new PosTicketError("Ticket no encontrado", 404);
  if (ticket.status === "CANCELED" || ticket.status === "REFUNDED") {
    throw new PosTicketError(
      "El ticket ya tiene una cancelación o devolución",
      409,
    );
  }
  const authorization = await consumeTicketAuthorization(
    tx,
    input.authorizationToken,
    "TICKET_CANCELLATION",
    context.terminalId,
    { entityType: "PosTicket", entityId: ticket.id },
    context.sessionId,
  );
  if (!authorization)
    throw new PosTicketError(
      "La cancelación requiere autorización master",
      403,
    );
  const refundCents = toCents(input.refundAmount ?? "0.00");
  if (refundCents > toCents(ticket.amountPaid))
    throw new PosTicketError("La devolución excede lo cobrado");
  const returned = input.returnedLines.map((requested) => {
    const line = ticket.lines.find(
      (candidate) =>
        candidate.id === requested.ticketLineId && candidate.itemId,
    );
    if (
      !line ||
      new Prisma.Decimal(requested.quantity).greaterThan(line.quantity)
    )
      throw new PosTicketError("La devolución contiene una cantidad inválida");
    return { line, quantity: new Prisma.Decimal(requested.quantity) };
  });
  const physicalReturned = returned.filter(
    ({ line }) => line.item?.kind === "PRODUCT",
  );
  const pendingCommittedReturns = ticket.owedProducts
    .filter((owed) => owed.status === "PENDING" && owed.inventoryCommitted)
    .map((owed) => ({
      owed,
      quantity: owed.quantity.minus(owed.deliveredQuantity),
    }))
    .filter(({ quantity }) => quantity.greaterThan(0));
  let inventoryMovementId: string | null = null;
  if (physicalReturned.length > 0 || pendingCommittedReturns.length > 0) {
    const location = await tx.inventoryLocation.findUnique({
      where: { branchId: context.branchId },
    });
    if (!location)
      throw new PosTicketError(
        "La sucursal no tiene ubicación de inventario",
        409,
      );
    const movement = await createInventoryLedgerMovement(tx, {
      type: "RETURN",
      reason: `DEVOLUCION_${ticket.folio}`,
      notes: input.reason,
      businessDate: context.businessDate,
      actorCredentialId: context.credentialId,
      terminalId: context.terminalId,
      lines: [
        ...physicalReturned.map(({ line, quantity }) => ({
          itemId: line.itemId!,
          fromLocationId: null,
          toLocationId: location.id,
          quantity,
          unitCostSnapshot: line.unitCostSnapshot,
          metadata: { ticketId: ticket.id, ticketLineId: line.id },
        })),
        ...pendingCommittedReturns.map(({ owed, quantity }) => {
          const line = ticket.lines.find(
            (candidate) => candidate.id === owed.ticketLineId,
          )!;
          return {
            itemId: owed.itemId,
            fromLocationId: null,
            toLocationId: location.id,
            quantity,
            unitCostSnapshot: line.unitCostSnapshot,
            metadata: {
              ticketId: ticket.id,
              ticketLineId: line.id,
              owedProductId: owed.id,
              commitmentReversal: true,
            },
          };
        }),
      ],
    });
    inventoryMovementId = movement.id;
  }
  let operationId: string | null = null;
  if (refundCents > 0) {
    const paidByMethod = new Map<
      string,
      { amountCents: number; name: string; type: MetodoPagoTipo }
    >();
    for (const operation of ticket.paymentOperations.filter(
      (candidate) => candidate.kind !== "REFUND",
    )) {
      for (const payment of operation.payments) {
        const current = paidByMethod.get(payment.paymentMethodId);
        paidByMethod.set(payment.paymentMethodId, {
          amountCents: (current?.amountCents ?? 0) + toCents(payment.amount),
          name: payment.methodNameSnapshot,
          type: payment.methodTypeSnapshot,
        });
      }
    }
    const methods = [...paidByMethod.entries()];
    const allocations = allocateLargestRemainder(
      refundCents,
      methods.map(([, value]) => value.amountCents),
    );
    const sequence = await nextSequence(tx, "PosPaymentFolioSeq");
    const operation = await tx.posPaymentOperation.create({
      data: {
        ticketId: ticket.id,
        folio: `DEV-${sequence.toString().padStart(6, "0")}`,
        kind: "REFUND",
        amount: decimalFromCents(refundCents),
        businessDate: businessDateValue(context.businessDate),
        actorCredentialId: context.credentialId,
        terminalId: context.terminalId,
        payments: {
          create: methods.flatMap(([methodId, value], index) =>
            allocations[index]
              ? [
                  {
                    paymentMethodId: methodId,
                    methodNameSnapshot: value.name,
                    methodTypeSnapshot: value.type,
                    amount: decimalFromCents(allocations[index]!),
                    reference: `DEVOLUCIÓN ${ticket.folio}`,
                  },
                ]
              : [],
          ),
        },
      },
    });
    operationId = operation.id;
    await projectPaymentOperation(tx, {
      operationId: operation.id,
      branchId: context.branchId,
      businessDate: context.businessDate,
      note: `Compensación POS ${ticket.folio} / ${operation.folio}`,
      negative: true,
      sellers: ticket.sellers.map((seller) => ({
        employeeId: seller.employeeId,
        weightCents: toCents(seller.shareAmount),
      })),
      payments: methods.flatMap(([methodId], index) =>
        allocations[index]
          ? [{ methodId, amountCents: allocations[index]! }]
          : [],
      ),
    });
  }
  const fullCancellation = refundCents === toCents(ticket.amountPaid);
  const event = await tx.posTicketEvent.create({
    data: {
      ticketId: ticket.id,
      type: fullCancellation ? "CANCELLATION" : "RETURN",
      amount: decimalFromCents(refundCents),
      reason: input.reason,
      snapshot: {
        refundAmount: fromCents(refundCents),
        returnedLines: input.returnedLines,
        committedOwedReversed: pendingCommittedReturns.map(
          ({ owed, quantity }) => ({
            owedProductId: owed.id,
            quantity: quantity.toFixed(2),
          }),
        ),
        operationId,
        ...(input.revision ? { revision: input.revision } : {}),
      } as Prisma.InputJsonValue,
      actorCredentialId: context.credentialId,
      authorizationId: authorization.id,
      inventoryMovementId,
    },
  });
  const fullyReturnedMembershipLineIds = returned
    .filter(
      ({ line, quantity }) =>
        line.item?.kind === "MEMBERSHIP" && quantity.equals(line.quantity),
    )
    .map(({ line }) => line.id);
  if (fullCancellation || fullyReturnedMembershipLineIds.length > 0) {
    await cancelMembershipsForTicket(tx, {
      ticketId: ticket.id,
      credentialId: context.credentialId,
      sourceId: event.id,
      reason: input.reason,
      ...(fullCancellation
        ? {}
        : { ticketLineIds: fullyReturnedMembershipLineIds }),
    });
  }
  await tx.posTicket.update({
    where: { id: ticket.id },
    data: {
      status: fullCancellation ? "CANCELED" : "REFUNDED",
      version: { increment: 1 },
    },
  });
  await Promise.all([
    tx.posOwedProduct.updateMany({
      where: { ticketId: ticket.id, status: "PENDING" },
      data: { status: "CANCELED" },
    }),
    tx.posAppointment.updateMany({
      where: { ticketId: ticket.id, status: { in: ["PENDING", "SCHEDULED"] } },
      data: { status: "CANCELED" },
    }),
  ]);
  return {
    id: event.id,
    type: event.type,
    amount: money(event.amount)!,
    reason: event.reason,
    createdAt: event.creadoEn.toISOString(),
  };
}

export async function issueVoucher(
  tx: Transaction,
  input: { ticketId: string; templateId: string },
  context: { credentialId: string; branchId: string },
) {
  const [ticket, template, existing] = await Promise.all([
    tx.posTicket.findUnique({ where: { id: input.ticketId } }),
    tx.posVoucherTemplate.findFirst({
      where: { id: input.templateId, active: true, deletedAt: null },
    }),
    tx.posVoucherIssue.findUnique({
      where: {
        ticketId_templateId: {
          ticketId: input.ticketId,
          templateId: input.templateId,
        },
      },
      include: { _count: { select: { printEvents: true } } },
    }),
  ]);
  if (!ticket || ticket.branchId !== context.branchId)
    throw new PosTicketError("Ticket no encontrado", 404);
  if (!template)
    throw new PosTicketError("Plantilla de voucher no encontrada", 404);
  if (ticket.status === "CANCELED")
    throw new PosTicketError(
      "No se emiten vouchers para tickets cancelados",
      409,
    );
  if (existing) return existing;
  const sequence = await nextSequence(tx, "PosVoucherFolioSeq");
  return tx.posVoucherIssue.create({
    data: {
      folio: `VCH-${sequence.toString().padStart(6, "0")}`,
      templateId: template.id,
      ticketId: ticket.id,
      customerId: ticket.customerId,
      templateNameSnapshot: template.name,
      kindSnapshot: template.kind,
      valueSnapshot: template.value,
      messageSnapshot: template.message,
      issuedByCredentialId: context.credentialId,
    },
    include: { _count: { select: { printEvents: true } } },
  });
}

export async function printVoucher(
  tx: Transaction,
  issueId: string,
  context: { credentialId: string; terminalId: string; branchId: string },
) {
  const issue = await tx.posVoucherIssue.findUnique({
    where: { id: issueId },
    include: {
      ticket: { select: { branchId: true } },
      _count: { select: { printEvents: true } },
    },
  });
  if (!issue || issue.ticket.branchId !== context.branchId)
    throw new PosTicketError("Voucher no encontrado", 404);
  const event = await tx.posVoucherPrintEvent.create({
    data: {
      issueId: issue.id,
      copyNumber: issue._count.printEvents + 1,
      actorCredentialId: context.credentialId,
      terminalId: context.terminalId,
    },
  });
  return {
    issueId: issue.id,
    copyNumber: event.copyNumber,
    printedAt: event.creadoEn.toISOString(),
  };
}

export function voucherDto(issue: {
  id: string;
  folio: string;
  templateId: string;
  templateNameSnapshot: string;
  kindSnapshot: string;
  valueSnapshot: Prisma.Decimal;
  messageSnapshot: string;
  ticketId: string;
  customerId: string | null;
  status: string;
  creadoEn: Date;
  _count: { printEvents: number };
}) {
  return {
    id: issue.id,
    folio: issue.folio,
    templateId: issue.templateId,
    templateName: issue.templateNameSnapshot,
    kind: issue.kindSnapshot,
    value: money(issue.valueSnapshot)!,
    message: issue.messageSnapshot,
    ticketId: issue.ticketId,
    customerId: issue.customerId,
    status: issue.status,
    printCount: issue._count.printEvents,
    issuedAt: issue.creadoEn.toISOString(),
  };
}

export const paymentTypeToPublic = (value: MetodoPagoTipo) => value;
