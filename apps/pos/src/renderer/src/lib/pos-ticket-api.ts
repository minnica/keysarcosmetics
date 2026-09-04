import type { PosTicketDto } from "@cosmetics/types";
import { calculateIncludedVat } from "../tax";
import type {
  CardNetwork,
  LayawayRecord,
  OwedProductRecord,
  Ticket,
} from "../types";

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const supportedCardNetwork = (value: string | null): CardNetwork | undefined =>
  value === "VISA" || value === "MASTERCARD" ? value : undefined;

export function ticketFromDto(dto: PosTicketDto): Ticket {
  // Bootstraps cifrados emitidos antes de Fase 12 no incluían participantes.
  const participants = dto.participants ?? [];
  const participantSales =
    participants.length > 0
      ? participants.map((participant) => ({
          sellerId:
            participant.employeeId ?? participant.companyId ?? participant.id,
          sellerName: participant.name,
          amount: Number(participant.shareAmount),
          participantKind: participant.kind,
          participantCode: participant.code,
        }))
      : dto.sellers.map((seller) => ({
          sellerId: seller.employeeId,
          sellerName: seller.name,
          amount: Number(seller.shareAmount),
          participantKind: "SELLER" as const,
          participantCode: seller.employeeId,
        }));
  const payments = dto.paymentOperations.flatMap((operation) =>
    operation.payments.map((payment) => ({
      id: payment.id,
      methodId: payment.methodId,
      amount: Number(payment.amount),
      ...(payment.authorizationLastFour
        ? { authorizationCode: payment.authorizationLastFour }
        : {}),
      ...((payment.bankName ?? payment.institution)
        ? { cardOrBank: payment.bankName ?? payment.institution! }
        : {}),
      ...(payment.bankId ? { bankId: payment.bankId } : {}),
      ...(payment.bankName ? { bankName: payment.bankName } : {}),
      ...(payment.cardType ? { cardType: payment.cardType } : {}),
      ...(supportedCardNetwork(payment.cardNetworkId)
        ? { cardNetwork: supportedCardNetwork(payment.cardNetworkId)! }
        : {}),
      ...(payment.installmentMonths
        ? { installmentMonths: payment.installmentMonths }
        : {}),
      folio: operation.folio,
      createdAt: dateLabel(operation.createdAt),
      createdAtIso: operation.createdAt,
      relatedTicketId: dto.id,
    })),
  );
  return {
    id: dto.folio,
    backendId: dto.id,
    createdAt: dateLabel(dto.createdAt),
    createdAtIso: dto.createdAt,
    ...(dto.customerId ? { clientId: dto.customerId } : {}),
    clientName: dto.customerName ?? "Público general",
    clientPhone: dto.customerPhone ?? "",
    branchName: dto.branchName,
    sellerSummary: participantSales
      .map((participant) => participant.sellerName)
      .join(" / "),
    items: dto.lines.reduce((sum, line) => sum + Number(line.quantity), 0),
    discountAmount: Number(dto.discountTotal),
    subtotal: Number(dto.subtotal),
    total: Number(dto.total),
    netTotal: Number(dto.total) - Number(dto.taxTotal),
    vatAmount: Number(dto.taxTotal),
    deviation: Number(dto.total) - Number(dto.minimumTotal),
    paymentMethod: payments[0]?.methodId ?? "",
    payments,
    amountPaid: Number(dto.amountReceived),
    balanceDue: Number(dto.pendingAmount),
    paymentStatus: dto.settlementStatus,
    products: dto.lines.map((line) => {
      const tax = calculateIncludedVat(
        Number(line.total),
        Number(line.taxTotal) > 0,
      );
      return {
        backendLineId: line.id,
        productId: line.itemId ?? line.id,
        name: line.itemName,
        quantity: Number(line.quantity),
        total: Number(line.total),
        includesVat: Number(line.taxTotal) > 0,
        netTotal: tax.net,
        vatAmount: Number(line.taxTotal),
        ...(line.packageId
          ? {
              dealId: line.packageId,
              dealName: line.packageName ?? "Paquete",
              dealInstanceId: line.packageId,
            }
          : {}),
      };
    }),
    sellerSales: participantSales,
    status:
      dto.status === "CANCELED" || dto.status === "REFUNDED"
        ? "REFUNDED"
        : "COMPLETED",
    syncStatus: "SYNCED",
    createdOffline: false,
    syncedAtIso: dto.createdAt,
  };
}

export function layawayFromDto(dto: PosTicketDto): LayawayRecord | null {
  if (dto.settlementStatus === "PAID") return null;
  return {
    id: dto.id,
    originalTicketId: dto.folio,
    createdAt: dateLabel(dto.createdAt),
    createdAtIso: dto.createdAt,
    clientId: dto.customerId ?? "",
    clientName: dto.customerName ?? "Público general",
    clientPhone: dto.customerPhone ?? "",
    branch: dto.branchName,
    sellerIds: dto.sellers.map((seller) => seller.employeeId),
    total: Number(dto.total),
    amountPaid: Number(dto.amountReceived),
    balanceDue: Number(dto.pendingAmount),
    items: dto.lines
      .filter((line) => line.kind === "SALE")
      .map((line) => ({
        cartItemId: line.id,
        productId: line.itemId ?? line.id,
        productName: line.itemName,
        kind: "PRODUCT",
        quantity: Number(line.quantity),
        deliveredQuantity: Number(line.quantity),
      })),
    payments: dto.paymentOperations.map((operation) => ({
      id: operation.id,
      folio: operation.folio,
      createdAt: dateLabel(operation.createdAt),
      createdAtIso: operation.createdAt,
      amount: Number(operation.amount),
      methodId: operation.payments[0]?.methodId ?? "",
      payments: operation.payments.map((payment) => ({
        id: payment.id,
        methodId: payment.methodId,
        amount: Number(payment.amount),
        ...(payment.authorizationLastFour
          ? { authorizationCode: payment.authorizationLastFour }
          : {}),
        ...((payment.bankName ?? payment.institution)
          ? { cardOrBank: payment.bankName ?? payment.institution! }
          : {}),
        ...(payment.bankId ? { bankId: payment.bankId } : {}),
        ...(payment.bankName ? { bankName: payment.bankName } : {}),
        ...(payment.cardType ? { cardType: payment.cardType } : {}),
        ...(supportedCardNetwork(payment.cardNetworkId)
          ? { cardNetwork: supportedCardNetwork(payment.cardNetworkId)! }
          : {}),
        ...(payment.installmentMonths
          ? { installmentMonths: payment.installmentMonths }
          : {}),
        folio: operation.folio,
        createdAt: dateLabel(operation.createdAt),
        createdAtIso: operation.createdAt,
      })),
      balanceAfter: Number(dto.pendingAmount),
    })),
    status: "ACTIVE",
  };
}

export function owedProductsFromDto(dto: PosTicketDto): OwedProductRecord[] {
  return dto.owedProducts.map((owed) => ({
    id: owed.id,
    backendTicketLineId: owed.ticketLineId,
    ticketId: dto.folio,
    layawayId: dto.settlementStatus === "PAID" ? null : dto.id,
    clientId: dto.customerId ?? "",
    clientName: dto.customerName ?? "Público general",
    clientPhone: dto.customerPhone ?? "",
    productId: owed.itemId,
    productName: owed.itemName,
    quantity: Number(owed.quantity),
    deliveredQuantity: Number(owed.deliveredQuantity),
    branch: dto.branchName,
    sellerIds: dto.sellers.map((seller) => seller.employeeId),
    sellerNames: dto.sellers.map((seller) => seller.name),
    inventoryCommitted: owed.inventoryCommitted,
    deliveryHistory: [],
    reason: owed.inventoryCommitted ? "OUT_OF_STOCK" : "LAYAWAY_LIQUIDATION",
    createdAt: dateLabel(dto.createdAt),
    createdAtIso: dto.createdAt,
    status:
      owed.status === "DELIVERED"
        ? "FULFILLED"
        : owed.status === "CANCELED"
          ? "CANCELLED"
          : "PENDING",
  }));
}
