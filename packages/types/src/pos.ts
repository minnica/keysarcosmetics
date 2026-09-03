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
    positionId: PosId | null;
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
  terminalSecret: string;
}

export interface PosMasterAuthorizationRequestDto {
  alias: string;
  pin: string;
  purpose: string;
  entityType?: string;
  entityId?: string;
  scope?: Record<string, unknown>;
}

export interface PosMasterAuthorizationDto {
  authorizationToken: string;
  purpose: string;
  expiresAt: IsoUtcDateTime;
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

export interface PosTerminalRegistrationRequestDto {
  code: string;
  name: string;
  branchId: PosId;
}

export interface PosTerminalStatusUpdateDto {
  status: "ACTIVE" | "REVOKED";
}

/** El secreto sólo se entrega al registrar o rotar una terminal. */
export interface PosTerminalRegistrationResultDto {
  terminal: PosTerminalDto;
  terminalSecret: string;
}

export interface PosCredentialSummaryDto {
  id: PosId;
  employeeId: PosId | null;
  userId: PosId | null;
  alias: string;
  displayName: string;
  active: boolean;
  offlineEnabled: boolean;
  isMaster: boolean;
  lockedUntil: IsoUtcDateTime | null;
}

export interface PosEmployeeAccessDto {
  id: PosId;
  displayName: string;
  active: boolean;
  positionId: PosId | null;
  branchId: PosId | null;
  credential: PosCredentialSummaryDto | null;
}

export interface PosRoleAccessDto {
  id: PosId;
  name: string;
  active: boolean;
  permissions: PosPermissionKey[];
}

export interface PosAccessBootstrapDto {
  employees: PosEmployeeAccessDto[];
  roles: PosRoleAccessDto[];
  permissionTree: Array<{
    id: PosId;
    key: string;
    label: string;
    parentId: PosId | null;
    grantable: boolean;
    sortOrder: number;
  }>;
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

export interface PosCatalogAssetDto {
  id: PosId;
  publicUrl: string;
  mimeType: string;
  isPrimary: boolean;
  status: "PENDING" | "READY" | "FAILED" | "DELETED";
}

export interface PosCustomerSourceDto {
  id: PosId;
  name: string;
  active: boolean;
}

export interface PosCustomerDto {
  id: PosId;
  displayName: string;
  phone: string | null;
  email: string | null;
  active: boolean;
}

export interface PosSupplierDto {
  id: PosId;
  folio: string;
  businessName: string;
  contactName: string | null;
  rfc: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
}

export interface PosPaymentMethodDto {
  id: PosId;
  name: string;
  type: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "OTRO";
  active: boolean;
  activeForPos: boolean;
  requiresReference: boolean;
  referenceLabel: string | null;
}

export interface PosTicketConfigurationDto {
  branchId: PosId | null;
  logoUrl: string | null;
  companyName: string;
  address: string | null;
  footerMessage: string | null;
  policies: string | null;
  showClientName: boolean;
  showClientPhone: boolean;
  showSellerName: boolean;
  showVatBreakdown: boolean;
  showSpareCoverageMessage: boolean;
}

export interface PosVoucherTemplateDto {
  id: PosId;
  name: string;
  kind: "NEXT_PURCHASE_DISCOUNT" | "COMPANION_FACIAL" | "MEMBERSHIP_DISCOUNT";
  value: Money;
  message: string;
  active: boolean;
  visibleToSellers: boolean;
}

export interface PosPackageDto {
  id: PosId;
  name: string;
  sku: string;
  description: string | null;
  price: Money;
  status: "DRAFT" | "PUBLISHED" | "INACTIVE";
  startsAt: IsoUtcDateTime | null;
  endsAt: IsoUtcDateTime | null;
  lines: Array<{ itemId: PosId; quantity: Money }>;
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
