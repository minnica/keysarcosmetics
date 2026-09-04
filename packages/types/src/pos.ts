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
  "SALE_VIEW",
  "SALE_CREATE",
  "SALE_VIEW_OWN",
  "SALE_VIEW_ALL",
  "SALE_OVERRIDE_MINIMUM",
  "SELLER_SALES_VIEW",
  "SELLER_SALES_PRINT",
  "RECEIPTS_VIEW",
  "RECEIPTS_PRINT",
  "CUSTOMERS_VIEW",
  "CUSTOMERS_MANAGE",
  "CUSTOMERS_PRINT",
  "APPOINTMENTS_VIEW",
  "APPOINTMENTS_MANAGE",
  "APPOINTMENTS_PRINT",
  "MEMBERSHIPS_VIEW",
  "MEMBERSHIPS_MANAGE",
  "MEMBERSHIPS_PRINT",
  "COMPETITIONS_VIEW",
  "COMPETITIONS_MANAGE",
  "WEBSITES_VIEW",
  "CATALOG_VIEW",
  "CATALOG_MANAGE",
  "INVENTORY_VIEW",
  "INVENTORY_AUDIT",
  "INVENTORY_ADJUST",
  "INVENTORY_MANAGE",
  "INVENTORY_PRINT",
  "INVENTORY_MOVEMENTS_VIEW",
  "INVENTORY_MOVEMENTS_MANAGE",
  "INVENTORY_MOVEMENTS_PRINT",
  "WAREHOUSE_BRANCH_REQUEST",
  "WAREHOUSE_BRANCH_VIEW",
  "WAREHOUSE_BRANCH_PRINT",
  "WAREHOUSE_MANAGE",
  "WAREHOUSE_VIEW",
  "WAREHOUSE_PRINT",
  "SUPPLIERS_VIEW",
  "SUPPLIERS_MANAGE",
  "SUPPLIERS_PRINT",
  "DEALS_VIEW",
  "DEALS_MANAGE",
  "DEALS_PRINT",
  "PAYMENTS_MANAGE",
  "VOUCHERS_MANAGE",
  "BUSINESS_DAY_OPEN",
  "BUSINESS_DAY_CLOSE",
  "CASH_MANAGE",
  "CASH_VIEW",
  "CASH_PRINT",
  "X_REPORT_VIEW",
  "X_REPORT_PRINT",
  "REPORTS_VIEW",
  "REPORTS_PRINT",
  "REPORTS_COSTS",
  "EMPLOYEES_VIEW",
  "EMPLOYEES_MANAGE",
  "SETTINGS_MANAGE",
  "SETTINGS_VIEW",
  "MY_ACCOUNT_VIEW",
  "DATA_UPDATE_VIEW",
  "DATA_UPDATE_MANAGE",
  "CLOCK_IN_VIEW",
  "SESSION_EXIT",
  "BANK_RECONCILIATION_VIEW",
  "BANK_RECONCILIATION_PRINT",
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

export const POS_OFFLINE_OPERATION_KINDS = [
  "BUSINESS_DAY_OPEN",
  "INVENTORY_COUNT",
  "TICKET_CREATE",
  "LAYAWAY_PAYMENT",
  "VOUCHER_ISSUE",
  "VOUCHER_PRINT",
  "BUSINESS_DAY_CLOSING_COUNT",
  "BUSINESS_DAY_CLOSE",
] as const;

export type PosOfflineOperationKind =
  (typeof POS_OFFLINE_OPERATION_KINDS)[number];

export interface PosOfflineOperationDto {
  id: PosId;
  sequence: number;
  kind: PosOfflineOperationKind;
  entityId: PosId | null;
  idempotencyKey: string;
  createdAt: IsoUtcDateTime;
  payload: Record<string, unknown>;
}

export interface PosOfflineOperationResultDto {
  id: PosId;
  sequence: number;
  status: PosSyncStatus;
  message: string;
  serverEntityId: PosId | null;
  data: unknown;
}

export interface PosOfflineBootstrapDto {
  grantToken: string;
  grantExpiresAt: IsoUtcDateTime;
  issuedAt: IsoUtcDateTime;
  nextSequence: number;
  session: Omit<PosSessionDto, "accessToken">;
  catalog: PosCatalogItemDto[];
  packages: PosPackageDto[];
  paymentMethods: PosPaymentMethodDto[];
  voucherTemplates: PosVoucherTemplateDto[];
  customerSources: PosCustomerSourceDto[];
  ticketConfiguration: PosTicketConfigurationDto | null;
  sellers: Array<{
    id: PosId;
    displayName: string;
    positionId: PosId | null;
  }>;
  inventoryLocations: PosInventoryLocationDto[];
  inventoryBalances: PosInventoryBalanceDto[];
  businessDay: PosBusinessDayDto | null;
  tickets: PosTicketDto[];
}

export interface PosOfflinePushRequestDto {
  operations: PosOfflineOperationDto[];
}

export interface PosOfflinePushResultDto {
  results: PosOfflineOperationResultDto[];
  nextSequence: number;
}

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
  authorizedBranches: PosBranchSummaryDto[];
  branchScope: "SESSION_BRANCH" | "ASSIGNED" | "ALL_ACTIVE";
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

export interface PosPersonalAuthorizationRequestDto {
  pin: string;
  purpose: string;
  scope?: Record<string, unknown>;
}

export interface PosPersonalAuthorizationDto {
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
  assignedBranchIds: PosId[];
  credential: PosCredentialSummaryDto | null;
}

export interface PosRoleAccessDto {
  id: PosId;
  name: string;
  active: boolean;
  permissions: PosPermissionKey[];
  assignedBranchIds: PosId[];
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
    version: number;
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

export type PosInventoryLocationType = "BRANCH" | "WAREHOUSE";
export type PosInventoryMovementType =
  | "ADD"
  | "REMOVE"
  | "TRANSFER"
  | "RETURN"
  | "DEMO"
  | "WRITE_OFF"
  | "REVERSAL"
  | "COUNT_ADJUSTMENT"
  | "WAREHOUSE_SHIPMENT"
  | "WAREHOUSE_RECEIPT"
  | "SUPPLIER_RECEIPT";

export interface PosInventoryLocationDto {
  id: PosId;
  code: string;
  name: string;
  type: PosInventoryLocationType;
  branchId: PosId | null;
  branchName: string | null;
  active: boolean;
}

export interface PosInventoryMovementLineDto {
  id: PosId;
  itemId: PosId;
  itemName: string;
  sku: string;
  fromLocation: PosInventoryLocationDto | null;
  toLocation: PosInventoryLocationDto | null;
  quantity: Money;
  fromQuantityBefore: Money | null;
  fromQuantityAfter: Money | null;
  toQuantityBefore: Money | null;
  toQuantityAfter: Money | null;
}

export interface PosInventoryMovementLineWithCostsDto extends PosInventoryMovementLineDto {
  unitCostSnapshot: Money | null;
}

export interface PosInventoryMovementDto {
  id: PosId;
  folio: string;
  type: PosInventoryMovementType;
  status: "APPLIED" | "REVERSED";
  reason: string | null;
  notes: string | null;
  businessDate: BusinessDate;
  adjustmentBatchId: PosId | null;
  warehouseRequestId: PosId | null;
  reversalOfId: PosId | null;
  createdAt: IsoUtcDateTime;
  lines: Array<
    PosInventoryMovementLineDto | PosInventoryMovementLineWithCostsDto
  >;
}

export interface PosInventoryAdjustmentLineInputDto {
  itemId: PosId;
  type: "ADD" | "REMOVE" | "TRANSFER" | "RETURN" | "DEMO" | "WRITE_OFF";
  fromLocationId?: PosId | null;
  toLocationId?: PosId | null;
  quantity: Money;
  reason?: string | null;
  notes?: string | null;
}

export interface PosInventoryAdjustmentBatchDto {
  id: PosId;
  folio: string;
  status: "PENDING" | "APPLIED" | "CANCELED" | "REVERSED";
  notes: string | null;
  createdAt: IsoUtcDateTime;
  resolvedAt: IsoUtcDateTime | null;
  lines: PosInventoryAdjustmentLineInputDto[];
  movementId: PosId | null;
}

export interface PosInventoryCountDto {
  id: PosId;
  kind: PosCountKind;
  businessDate: BusinessDate;
  locationId: PosId;
  createdAt: IsoUtcDateTime;
  lines: PosBlindCountLineDto[];
}

export interface PosAuditedInventoryCountDto extends Omit<
  PosInventoryCountDto,
  "lines"
> {
  notes: string | null;
  lines: PosAuditedCountLineDto[];
}

export type PosWarehouseRequestStatus =
  | "REQUESTED"
  | "CREATION_APPROVED"
  | "SEND_APPROVED"
  | "SHIPPED"
  | "RECEIVED"
  | "CANCELED";

export interface PosWarehouseRequestLineDto {
  id: PosId;
  itemId: PosId;
  itemName: string;
  sku: string;
  quantity: Money;
  priceSnapshot: Money | null;
  priceListNameSnapshot: string | null;
  customerNameSnapshot: string | null;
}

export interface PosWarehouseRequestLineWithCostsDto extends PosWarehouseRequestLineDto {
  unitCostSnapshot: Money | null;
}

export interface PosWarehouseRequestEventDto {
  id: PosId;
  fromStatus: PosWarehouseRequestStatus | null;
  toStatus: PosWarehouseRequestStatus;
  action: string;
  actorCredentialId: PosId;
  notes: string | null;
  createdAt: IsoUtcDateTime;
}

export interface PosWarehouseRequestDto {
  id: PosId;
  folio: string;
  source: "BRANCH" | "SUPPLIER";
  requestType: "PRODUCT" | "TESTER" | "SUPPLY";
  status: PosWarehouseRequestStatus;
  branchId: PosId | null;
  branchName: string | null;
  supplierId: PosId | null;
  supplierName: string | null;
  priceListId: PosId | null;
  customerId: PosId | null;
  sourceLocationId: PosId | null;
  destinationLocationId: PosId;
  notes: string | null;
  createdAt: IsoUtcDateTime;
  creationApprovedAt: IsoUtcDateTime | null;
  sendApprovedAt: IsoUtcDateTime | null;
  shippedAt: IsoUtcDateTime | null;
  receivedAt: IsoUtcDateTime | null;
  canceledAt: IsoUtcDateTime | null;
  lines: Array<
    PosWarehouseRequestLineDto | PosWarehouseRequestLineWithCostsDto
  >;
  events: PosWarehouseRequestEventDto[];
}

export interface PosWarehouseRequestCreateDto {
  source: "BRANCH" | "SUPPLIER";
  requestType: "PRODUCT" | "TESTER" | "SUPPLY";
  branchId?: PosId | null;
  supplierId?: PosId | null;
  priceListId?: PosId | null;
  customerId?: PosId | null;
  notes?: string | null;
  lines: Array<{ itemId: PosId; quantity: Money }>;
}

export interface PosNotificationDto {
  id: PosId;
  kind:
    | "WAREHOUSE_REQUESTED"
    | "WAREHOUSE_CREATION_APPROVED"
    | "WAREHOUSE_SHIPPED"
    | "WAREHOUSE_RECEIVED"
    | "WAREHOUSE_RETURNED"
    | "WAREHOUSE_CANCELED"
    | "SALE_COMPLETED"
    | "CASH_EXPENSE"
    | "PRODUCT_CREATED"
    | "INVENTORY_ADD"
    | "INVENTORY_REMOVE"
    | "INVENTORY_TRANSFER"
    | "CLOSE_DAY"
    | "CLOCK_IN";
  title: string;
  message: string;
  branchId: PosId | null;
  warehouseRequestId: PosId | null;
  sourceType: string | null;
  sourceId: string | null;
  access: "VIEW" | "EDIT";
  deliveredAt: IsoUtcDateTime | null;
  read: boolean;
  readAt: IsoUtcDateTime | null;
  createdAt: IsoUtcDateTime;
}

export interface PosNotificationPreferenceDto {
  kind: PosNotificationDto["kind"];
  recipients: Array<{
    actorId: PosId;
    displayName: string;
    access: "VIEW" | "EDIT";
  }>;
}

export interface PosCustomerRequiredFieldDto {
  id: PosId;
  key: string;
  label: string;
  required: boolean;
  active: boolean;
  sortOrder: number;
}

export interface PosSalesCompetitionDto {
  id: PosId;
  name: string;
  type: "AMOUNT" | "PRODUCT" | "PACKAGE" | "PERIOD";
  active: boolean;
  dateFrom: BusinessDate;
  dateTo: BusinessDate;
  branchId: PosId | null;
  targetAmount: Money | null;
  itemId: PosId | null;
  packageItemIds: PosId[];
  creadoEn: IsoUtcDateTime;
}

export const POS_REPORT_KEYS = [
  "SALES_DETAIL",
  "CASH_MOVEMENTS",
  "SOLD_PRODUCTS",
  "SALES_BY_EMPLOYEE",
  "MERCHANDISE_OVERVIEW",
  "MERCHANDISE_MOVEMENTS",
  "MERCHANDISE_PROFITABILITY",
  "EMPLOYEE_PERFORMANCE",
  "EMPLOYEE_DAILY",
  "CUSTOMER_OVERVIEW",
] as const;

export type PosReportKey = (typeof POS_REPORT_KEYS)[number];
export type PosReportCell = string | number | boolean | null;

export interface PosReportDatasetDto {
  key: PosReportKey;
  dateFrom: BusinessDate;
  dateTo: BusinessDate;
  branchIds: PosId[];
  includesCosts: boolean;
  generatedAt: IsoUtcDateTime;
  columns: string[];
  rows: Array<Record<string, PosReportCell>>;
  page: number;
  pageSize: number;
  total: number;
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
  packageId?: PosId;
  delivered?: boolean;
}

export interface PosTicketSellerInputDto {
  employeeId: PosId;
  share: Money;
}

export interface PosTicketPaymentInputDto {
  methodId: PosId;
  methodType?: PosPaymentMethodType;
  amount: Money;
  reference?: string;
  institution?: string;
  authorizationLastFour?: string;
}

export interface PosTicketDiscountInputDto {
  kind: "PERCENT" | "FIXED";
  value: Money;
}

export interface PosTicketAppointmentInputDto {
  kind: "COURTESY" | "NEXT_SESSION" | "NO_APPOINTMENT";
  serviceItemId?: PosId;
  serviceName: string;
  branchId: PosId;
  sellerId?: PosId;
  scheduledAt?: IsoUtcDateTime;
}

export interface PosTicketCourtesyInputDto {
  serviceItemId?: PosId;
  serviceName: string;
  appointmentIndex?: number;
  policyId?: PosId;
  policyName: string;
  authorizationToken?: string;
}

export interface PosTicketCustomerInputDto {
  id?: PosId;
  create?: {
    displayName: string;
    phone?: string | null;
    email?: string | null;
    sourceId?: PosId | null;
    notes?: string | null;
    ownerEmployeeId?: PosId | null;
  };
}

export interface PosTicketQuoteRequestDto {
  branchId: PosId;
  customerId?: PosId;
  lines: PosTicketLineInputDto[];
  sellers: PosTicketSellerInputDto[];
  payments?: PosTicketPaymentInputDto[];
  discount?: PosTicketDiscountInputDto;
  authorizationToken?: string;
}

export interface PosTicketQuoteDto {
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  total: Money;
  amountReceived: Money;
  pendingAmount: Money;
  minimumTotal: Money;
  spareTotal: Money;
  requiresAuthorization: boolean;
  authorizationPurpose: "SALE_BELOW_MINIMUM" | null;
  lines: Array<{
    itemId: PosId;
    itemName: string;
    sku: string;
    quantity: Money;
    unitPrice: Money;
    unitMinimumPrice: Money;
    subtotal: Money;
    discountTotal: Money;
    taxTotal: Money;
    total: Money;
    packageId: PosId | null;
  }>;
}

export interface PosTicketCreateRequestDto extends PosTicketQuoteRequestDto {
  customer: PosTicketCustomerInputDto;
  payments: PosTicketPaymentInputDto[];
  appointments?: PosTicketAppointmentInputDto[];
  courtesies?: PosTicketCourtesyInputDto[];
}

export interface PosTicketPaymentDto {
  id: PosId;
  methodId: PosId;
  methodName: string;
  methodType: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "OTRO";
  amount: Money;
  reference: string | null;
  institution: string | null;
  authorizationLastFour: string | null;
}

export interface PosPaymentOperationDto {
  id: PosId;
  folio: string;
  kind: "SALE" | "LAYAWAY_PAYMENT" | "REFUND" | "REVISION";
  amount: Money;
  businessDate: BusinessDate;
  createdAt: IsoUtcDateTime;
  payments: PosTicketPaymentDto[];
}

export interface PosTicketLineDto {
  id: PosId;
  kind: "SALE" | "GIFT";
  itemId: PosId | null;
  itemName: string;
  sku: string;
  quantity: Money;
  unitPrice: Money;
  unitListPrice: Money;
  unitMinimumPrice: Money;
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  total: Money;
  packageId: PosId | null;
  packageName: string | null;
  notes: string | null;
}

export interface PosTicketSellerDto {
  employeeId: PosId;
  name: string;
  shareAmount: Money;
  sharePercent: Money;
  clockedIn: boolean;
  presenceBranchId: PosId | null;
  attendanceId: PosId | null;
}

export interface PosSaleSellerDto {
  id: PosId;
  displayName: string;
  alias: string | null;
  positionId: PosId | null;
  clockedIn: boolean;
  attendanceId: PosId | null;
  attendanceBranchId: PosId | null;
  portfolioOwner: boolean;
}

export interface PosOwedProductDto {
  id: PosId;
  ticketLineId: PosId;
  itemId: PosId;
  itemName: string;
  quantity: Money;
  deliveredQuantity: Money;
  pendingQuantity: Money;
  inventoryCommitted: boolean;
  status: "PENDING" | "DELIVERED" | "CANCELED";
}

export interface PosAppointmentDto {
  id: PosId;
  kind: "COURTESY" | "NEXT_SESSION" | "NO_APPOINTMENT";
  status: "PENDING" | "SCHEDULED" | "CANCELED" | "COMPLETED";
  serviceItemId: PosId | null;
  serviceName: string;
  branchId: PosId;
  branchName: string;
  sellerId: PosId | null;
  scheduledAt: IsoUtcDateTime | null;
}

export interface PosTicketDto extends Omit<PosTicketQuoteDto, "lines"> {
  id: PosId;
  folio: string;
  status: PosTicketStatus;
  businessDate: BusinessDate;
  createdAt: IsoUtcDateTime;
  settlementStatus: "PAID" | "LAYAWAY" | "PENDING";
  branchId: PosId;
  branchName: string;
  customerId: PosId | null;
  customerName: string | null;
  customerPhone: string | null;
  lines: PosTicketLineDto[];
  sellers: PosTicketSellerDto[];
  paymentOperations: PosPaymentOperationDto[];
  owedProducts: PosOwedProductDto[];
  appointments: PosAppointmentDto[];
}

export interface PosLayawayPaymentRequestDto {
  payments: PosTicketPaymentInputDto[];
  deliveredTicketLineIds?: PosId[];
}

export interface PosOwedProductDeliveryRequestDto {
  quantity: Money;
}

export interface PosTicketEventRequestDto {
  reason: string;
  refundAmount?: Money;
  returnedLines?: Array<{ ticketLineId: PosId; quantity: Money }>;
  revision?: Record<string, unknown>;
  authorizationToken: string;
}

export interface PosTicketEventDto {
  id: PosId;
  type: "REVISION" | "CANCELLATION" | "RETURN";
  amount: Money;
  reason: string;
  createdAt: IsoUtcDateTime;
}

export interface PosVoucherIssueDto {
  id: PosId;
  folio: string;
  templateId: PosId;
  templateName: string;
  kind: "NEXT_PURCHASE_DISCOUNT" | "COMPANION_FACIAL" | "MEMBERSHIP_DISCOUNT";
  value: Money;
  message: string;
  ticketId: PosId;
  customerId: PosId | null;
  status: "ISSUED" | "REDEEMED" | "CANCELED";
  printCount: number;
  issuedAt: IsoUtcDateTime;
}

export interface PosBusinessDayDto {
  id: PosId;
  branchId: PosId;
  branchName: string;
  businessDate: BusinessDate;
  status: PosBusinessDayStatus;
  openingCountId: PosId | null;
  openingSkipped: boolean;
  openedByName: string;
  openedAt: IsoUtcDateTime;
  closingCountId: PosId | null;
  closingSkipped: boolean;
  closedByName: string | null;
  closedAt: IsoUtcDateTime | null;
}

export interface PosBusinessDayCountInputDto {
  skipped?: boolean;
  authorizationToken?: string;
  locationId?: PosId;
  notes?: string;
  lines?: Array<{ itemId: PosId; countedQuantity: Money }>;
}

export interface PosBusinessDayCloseDto {
  authorizationToken: string;
}

export interface PosAttendanceDto {
  id: PosId;
  businessDayId: PosId;
  employeeId: PosId;
  employeeName: string;
  branchId: PosId;
  branchName: string;
  businessDate: BusinessDate;
  clockInAt: IsoUtcDateTime;
  clockOutAt: IsoUtcDateTime | null;
  status: "OPEN" | "CLOSED";
  closeReason: "MANUAL" | "CLOSE_DAY" | null;
}

export interface PosExpenseTypeDto {
  id: PosId;
  name: string;
  active: boolean;
}

export interface PosCashExpenseDto {
  id: PosId;
  folio: string;
  businessDate: BusinessDate;
  branchId: PosId;
  branchName: string;
  employeeId: PosId | null;
  employeeName: string;
  expenseTypeId: PosId;
  expenseTypeName: string;
  amount: Money;
  concept: string;
  comment: string | null;
  status: "ACTIVE" | "VOIDED";
  correctsExpenseId: PosId | null;
  createdAt: IsoUtcDateTime;
  voidedAt: IsoUtcDateTime | null;
}

export interface PosCashExpenseWriteDto {
  expenseTypeId: PosId;
  amount: Money;
  concept: string;
  comment?: string | null;
  employeeId?: PosId | null;
}

export interface PosCashExpenseCorrectionDto extends PosCashExpenseWriteDto {
  authorizationToken: string;
  reason: string;
}

export interface PosCashExpenseVoidDto {
  authorizationToken: string;
  reason: string;
}

export interface PosOperationalSummaryDto {
  businessDate: BusinessDate;
  branchId: PosId | null;
  branchName: string;
  businessDayStatus: PosBusinessDayStatus | "NOT_OPENED";
  salesTotal: Money;
  collectedTotal: Money;
  discountTotal: Money;
  expenseTotal: Money;
  netCashFlow: Money;
  ticketCount: number;
  sellerCount: number;
  unitsSold: Money;
  inventoryMovementCount: number;
  attendanceOpenCount: number;
  paymentMethods: Array<{ methodId: PosId; name: string; amount: Money }>;
  sellers: Array<{ employeeId: PosId; name: string; amount: Money }>;
  products: Array<{
    itemId: PosId | null;
    name: string;
    quantity: Money;
    amount: Money;
  }>;
  inventoryAudit?: {
    opening: PosInventoryCountDto | PosAuditedInventoryCountDto | null;
    closing: PosInventoryCountDto | PosAuditedInventoryCountDto | null;
  };
}

export interface PosSyncOperationDto {
  id: string;
  sequence: number;
  status: PosSyncStatus;
  type: string;
  payload: unknown;
  createdAt: IsoUtcDateTime;
}
