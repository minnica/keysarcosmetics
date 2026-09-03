/**
 * Contrato público del POS.
 *
 * Los importes siempre viajan como strings decimales con dos posiciones para
 * no perder precisión entre PostgreSQL, Electron y las aplicaciones web.
 * Estos tipos no incluyen secretos, hashes, PINs ni costos protegidos.
 */

export type PosId = string;
export type Money = string;
export type IsoUtcDateTime = string;
export type BusinessDate = string;

export const POS_PERMISSION_KEYS = [
  "DASHBOARD_VIEW",
  "SALE_CREATE",
  "SALE_VIEW_OWN",
  "SALE_VIEW_ALL",
  "SALE_OVERRIDE_MINIMUM",
  "CUSTOMERS_VIEW",
  "CUSTOMERS_MANAGE",
  "CATALOG_VIEW",
  "CATALOG_MANAGE",
  "INVENTORY_VIEW",
  "INVENTORY_AUDIT",
  "INVENTORY_ADJUST",
  "WAREHOUSE_BRANCH_REQUEST",
  "WAREHOUSE_MANAGE",
  "PAYMENTS_MANAGE",
  "VOUCHERS_MANAGE",
  "BUSINESS_DAY_OPEN",
  "BUSINESS_DAY_CLOSE",
  "CASH_MANAGE",
  "REPORTS_VIEW",
  "REPORTS_COSTS",
  "EMPLOYEES_VIEW",
  "EMPLOYEES_MANAGE",
  "SETTINGS_MANAGE",
  "TERMINALS_MANAGE",
  "AUTHORIZATIONS_CREATE",
] as const;

export type PosPermissionKey = (typeof POS_PERMISSION_KEYS)[number];

export type PosCatalogItemKind = "PRODUCT" | "SERVICE" | "SUPPLY" | "MACHINE";
export type PosTerminalStatus = "PENDING" | "ACTIVE" | "REVOKED";
export type PosBusinessDayStatus = "OPEN" | "CLOSED";
export type PosCountKind = "OPENING" | "CLOSING";
export type PosTicketStatus = "COMPLETED" | "LAYAWAY" | "CANCELED" | "REFUNDED";
export type PosPaymentMethodType = "CASH" | "CARD" | "TRANSFER" | "OTHER";
export type PosSyncStatus =
  | "PENDING"
  | "SYNCING"
  | "SYNCED"
  | "ERROR"
  | "CONFLICT";

export interface PosPageRequest {
  page?: number;
  pageSize?: number;
}

export interface PosPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PosBranchSummaryDto {
  id: PosId;
  name: string;
  code: string | null;
  active: boolean;
}

export interface PosPermissionDto {
  key: PosPermissionKey;
  granted: boolean;
}

export interface PosSessionDto {
  accessToken: string;
  expiresAt: IsoUtcDateTime;
  actor: {
    id: PosId;
    employeeId: PosId | null;
    userId: PosId | null;
    displayName: string;
    alias: string;
    isMaster: boolean;
  };
  terminal: {
    id: PosId;
    code: string;
    branch: PosBranchSummaryDto;
  };
  permissions: PosPermissionKey[];
}

export interface PosLoginRequestDto {
  alias: string;
  pin: string;
  terminalCode: string;
}

export interface PosAuthorizationVerifyRequestDto {
  authorizationToken: string;
  purpose: string;
}

export interface PosTerminalDto {
  id: PosId;
  code: string;
  name: string;
  status: PosTerminalStatus;
  branch: PosBranchSummaryDto | null;
  lastSeenAt: IsoUtcDateTime | null;
}

export interface PosTaxonomyDto {
  id: PosId;
  name: string;
  active: boolean;
  parentId: PosId | null;
}

export interface PosCatalogItemDto {
  id: PosId;
  sku: string;
  name: string;
  kind: PosCatalogItemKind;
  family: PosTaxonomyDto | null;
  category: PosTaxonomyDto | null;
  description: string | null;
  benefits: string[];
  imageUrl: string | null;
  published: boolean;
  active: boolean;
  listPrice: Money;
  minimumPrice: Money;
  taxRate: Money;
  availableQuantity: Money | null;
}

/** Sólo para respuestas autorizadas por REPORTS_COSTS o un grant master. */
export interface PosCatalogItemWithCostsDto extends PosCatalogItemDto {
  unitCost: Money;
}

export interface PosCustomerDto {
  id: PosId;
  displayName: string;
  phone: string | null;
  email: string | null;
  active: boolean;
}

export interface PosInventoryBalanceDto {
  itemId: PosId;
  locationId: PosId;
  availableQuantity: Money;
  reservedQuantity: Money;
  version: number;
  updatedAt: IsoUtcDateTime;
}

export interface PosBlindCountLineDto {
  itemId: PosId;
  countedQuantity: Money;
  matchesExpected: boolean;
}

/** Sólo para INVENTORY_AUDIT; jamás serializar en la respuesta ciega. */
export interface PosAuditedCountLineDto extends PosBlindCountLineDto {
  expectedQuantity: Money;
  differenceQuantity: Money;
  unitCost: Money | null;
}

export interface PosTicketLineInputDto {
  itemId: PosId;
  quantity: Money;
  unitPrice: Money;
  notes?: string;
}

export interface PosTicketSellerInputDto {
  employeeId: PosId;
  share: Money;
}

export interface PosTicketPaymentInputDto {
  methodId: PosId;
  methodType: PosPaymentMethodType;
  amount: Money;
  reference?: string;
}

export interface PosTicketQuoteRequestDto {
  branchId: PosId;
  customerId?: PosId;
  lines: PosTicketLineInputDto[];
  sellers: PosTicketSellerInputDto[];
  payments: PosTicketPaymentInputDto[];
  authorizationToken?: string;
}

export interface PosTicketQuoteDto {
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  total: Money;
  amountReceived: Money;
  pendingAmount: Money;
  requiresAuthorization: boolean;
}

export interface PosTicketDto extends PosTicketQuoteDto {
  id: PosId;
  folio: string;
  status: PosTicketStatus;
  businessDate: BusinessDate;
  createdAt: IsoUtcDateTime;
}

export interface PosSyncOperationDto {
  id: string;
  sequence: number;
  status: PosSyncStatus;
  type: string;
  payload: unknown;
  createdAt: IsoUtcDateTime;
}
