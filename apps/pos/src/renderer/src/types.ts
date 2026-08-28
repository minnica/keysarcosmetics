export type ScreenId =
  | "dashboard"
  | "sale"
  | "seller-sales"
  | "receipts"
  | "customers"
  | "appointments"
  | "inventory"
  | "warehouse"
  | "branch-inventory"
  | "suppliers"
  | "inventory-movements"
  | "deals"
  | "catalog"
  | "settings"
  | "x-report"
  | "reports"
  | "cash-manager"
  | "clock-in"
  | "close-day"
  | "employees"
  | "competition"
  | "websites"
  | "data-update"
  | "my-account";

export interface PosSessionUser {
  id: string;
  name: string;
  initials: string;
  roleId: string;
  isMaster: boolean;
  branch: string;
  loggedInAtIso: string;
}

export type InventoryAuditType = "OPENING" | "CLOSING";

export interface InventoryAuditLine {
  productId: string;
  productName: string;
  sku: string;
  image: string;
  expectedStock: number;
  actualStock: number;
  difference: number;
}

export interface InventoryCountAudit {
  id: string;
  type: InventoryAuditType;
  branch: string;
  createdAtIso: string;
  createdById: string;
  createdByName: string;
  skipped: boolean;
  comment: string;
  lines: InventoryAuditLine[];
}

export interface PosDaySession {
  id: string;
  branch: string;
  openedAtIso: string;
  openedById: string;
  openingAuditId: string;
  status: "OPEN" | "CLOSED";
  closingAuditId: string | null;
  closedAtIso: string | null;
  closedById: string | null;
  closedByName: string | null;
}

export type ProductKind = "PRODUCT" | "SERVICE";

export interface Product {
  id: string;
  name: string;
  sku: string;
  family: string;
  category: string;
  group: string;
  kind: ProductKind;
  image: string;
  description?: string;
  benefits?: string[];
  showInDigitalCatalog?: boolean;
  minPrice: number;
  maxPrice: number;
  includesVat: boolean;
  costUsd: number;
  costMxn: number;
  partnerCost?: number;
  testerOrderEnabled?: boolean;
  supplierId?: string | null;
  supplierName?: string | null;
  presentation?: string;
  unitsPerPackage?: number;
  stock: number | null;
  stockMin: number | null;
  stockMax: number | null;
  branches: string[];
  active: boolean;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  comment: string;
  adminAuthorized: boolean;
  dealId?: string;
  dealName?: string;
  dealInstanceId?: string;
  dealQuantity?: number;
}

export interface Client {
  id: string;
  registrationFolio: string;
  registeredAtIso: string;
  firstName: string;
  lastName: string;
  birthday: string;
  gender: string;
  phone: string;
  whatsapp: string;
  source: ClientSource;
  sourceLabel: string;
  companyName: string;
  companyLocked: boolean;
  ownerId: string | null;
  saleSellerIds: string[];
  registrationBranch?: string;
}

export type ClientSource = string;

export interface ClientSourceOption {
  id: string;
  label: string;
  active: boolean;
  locksCompany: boolean;
}

export interface Seller {
  id: string;
  name: string;
  alias: string;
  initials: string;
  active: boolean;
  accessCode: string;
  masterAccessCode: string | null;
  canViewCosts: boolean;
  roleId: string;
}

export type EmployeeConfigurationPermission =
  | "TICKET"
  | "INVENTORY_CATALOG"
  | "INVENTORY_AUDIT"
  | "INVENTORY_MOVEMENTS"
  | "WAREHOUSE_MOVEMENTS"
  | "PAYMENT_METHODS"
  | "CUSTOMER_FIELDS"
  | "DEALS"
  | "COMPETITIONS"
  | "REPORTS_COSTS"
  | "BRANCHES"
  | "USERS_ROLES";

export interface EmployeeRole {
  id: string;
  name: string;
  description: string;
  active: boolean;
  system: boolean;
  moduleAccess: ScreenId[];
  moduleEditAccess: ScreenId[];
  modulePrintAccess: ScreenId[];
  configurationAccess: EmployeeConfigurationPermission[];
}

export type CourtesyPackage =
  | "FACIAL"
  | "BODY"
  | "DOUBLE_FACIAL"
  | "DOUBLE_BODY"
  | "MIXED";

export interface CourtesySettings {
  required: boolean;
  defaultPackage: CourtesyPackage;
  enabledPackages: CourtesyPackage[];
}

export interface AttendanceRecord {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerInitials: string;
  branch: string;
  clockInAt: string;
  clockInAtIso: string;
  clockOutAt: string | null;
  clockOutAtIso: string | null;
  status: "ONLINE" | "OFFLINE";
  clockOutReason: "MANUAL" | "CLOSE_DAY" | null;
}

export interface ExpenseType {
  id: string;
  name: string;
  active: boolean;
}

export interface CashExpense {
  id: string;
  folio: string;
  createdAt: string;
  createdAtIso: string;
  expenseDate: string;
  typeId: string;
  typeName: string;
  amount: number;
  branch: string;
  sellerId: string;
  sellerName: string;
  concept: string;
  comment: string;
  authorizedBy: string;
  status: "ACTIVE" | "VOIDED";
  updatedAtIso: string | null;
}

export type OperationalNotificationType =
  | "SALE_COMPLETED"
  | "CASH_EXPENSE"
  | "PRODUCT_CREATED"
  | "INVENTORY_ADD"
  | "INVENTORY_REMOVE"
  | "INVENTORY_TRANSFER"
  | "CLOSE_DAY"
  | "CLOCK_IN";

export type OperationalNotificationAccess = "VIEW" | "EDIT";

export interface OperationalNotificationPreference {
  type: OperationalNotificationType;
  enabled: boolean;
  recipientUserIds: string[];
  recipientAccess?: Partial<Record<string, OperationalNotificationAccess>>;
}

export interface OperationalNotification {
  id: string;
  type: OperationalNotificationType;
  title: string;
  detail: string;
  moduleLabel: string;
  branch: string;
  actorId: string;
  actorName: string;
  reference: string;
  createdAtIso: string;
  recipientUserIds: string[];
  readByUserIds: string[];
}

export type CompetitionType = "AMOUNT" | "PRODUCT" | "PACKAGE" | "PERIOD";

export interface SalesCompetition {
  id: string;
  name: string;
  type: CompetitionType;
  active: boolean;
  dateFrom: string;
  dateTo: string;
  branch: string;
  targetAmount: number | null;
  productId: string | null;
  packageProductIds: string[];
  createdAtIso: string;
}

export type DealStatus = "DRAFT" | "PUBLISHED" | "INACTIVE";

export interface RetailDealLine {
  productId: string;
  quantity: number;
}

export interface RetailDeal {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  lines: RetailDealLine[];
  branches: string[];
  startDate: string;
  endDate: string;
  status: DealStatus;
  createdAtIso: string;
  publishedAtIso: string | null;
  authorizedBy: string | null;
}

export interface MasterUser {
  id: string;
  name: string;
  initials: string;
  active: boolean;
  accessCode: string;
  role: "MASTER";
}

export interface SellerSplit {
  sellerId: string;
  value: number;
}

export interface Ticket {
  id: string;
  createdAt: string;
  createdAtIso: string;
  clientName: string;
  clientPhone: string;
  branchName?: string;
  branchAddress?: string;
  sellerSummary: string;
  items: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  netTotal?: number;
  vatAmount?: number;
  deviation: number;
  paymentMethod: PaymentMethod;
  payments: PaymentEntry[];
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  products: TicketProductLine[];
  sellerSales: TicketSellerSale[];
  deals?: TicketDealSale[];
  status: "COMPLETED" | "REFUNDED";
  ticketType?: "SALE" | "LAYAWAY_PAYMENT";
  relatedTicketId?: string;
  inventoryDeductions?: TicketInventoryLine[];
  cancelledAt?: string;
  cancelledAtIso?: string;
  refundAmount?: number;
  returnedProducts?: TicketInventoryLine[];
  nonReturnedProducts?: TicketNonReturnLine[];
  syncStatus?: "SYNCED" | "PENDING_SYNC";
  createdOffline?: boolean;
  syncedAtIso?: string | null;
}

export interface TicketInventoryLine {
  productId: string;
  productName: string;
  quantity: number;
  branch: string;
}

export interface TicketNonReturnLine extends TicketInventoryLine {
  disposition: "GIFT" | "COURTESY";
}

export interface TicketCancellationRequest {
  refundAmount: number;
  returnedProducts: TicketInventoryLine[];
  nonReturnedProducts: TicketNonReturnLine[];
}

export interface TicketEditProductInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface TicketEditRequest {
  clientName: string;
  clientPhone: string;
  sellerIds: string[];
  products: TicketEditProductInput[];
  discountAmount: number;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  paymentMethodId: PaymentMethod;
  payments: PaymentEntry[];
  authorizationCode: string;
}

export type VoucherKind =
  | "NEXT_PURCHASE_DISCOUNT"
  | "COMPANION_FACIAL"
  | "MEMBERSHIP_DISCOUNT";

export interface VoucherTemplate {
  id: string;
  name: string;
  kind: VoucherKind;
  value: number;
  message: string;
  active: boolean;
  visibleToSellers: boolean;
}

export interface VoucherIssue {
  id: string;
  folio: string;
  voucherId: string;
  voucherName: string;
  voucherKind: VoucherKind;
  value: number;
  message: string;
  ticketId: string;
  clientName: string;
  clientPhone: string;
  branch: string;
  issuedAtIso: string;
  status: "ISSUED" | "REDEEMED" | "CANCELLED";
  redeemedAtIso?: string;
}

export interface ReceiptSettings {
  logoUrl: string;
  logoWidth: number;
  companyName: string;
  branchName: string;
  address: string;
  footerMessage: string;
  policies: string;
  showClientName: boolean;
  showClientPhone: boolean;
  showSellerName: boolean;
  showVatBreakdown: boolean;
  showSpareCoverageMessage: boolean;
}

export type InventoryMovementDirection = "ADD" | "REMOVE" | "TRANSFER";

export type InventoryMovementCategory =
  | "SALE"
  | "WRITE_OFF"
  | "DEMO"
  | "ADJUSTMENT"
  | "TRANSFER"
  | "RETURN"
  | "DELIVERY";

export type BranchInventory = Record<string, Record<string, number>>;

export interface InventoryBranchOrderDraft {
  branch: string;
  lines: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface InventoryBranchOrderResult {
  branch: string;
  folio: string;
}

export interface InventoryMovementReason {
  id: string;
  name: string;
  active: boolean;
}

export interface InventoryMovement {
  id: string;
  folio: string;
  createdAt: string;
  createdAtIso: string;
  productId: string;
  productName: string;
  direction: InventoryMovementDirection;
  reason: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  sourceBranch: string;
  destinationBranch: string | null;
  destinationPreviousStock: number | null;
  destinationNewStock: number | null;
  comment: string;
  category: InventoryMovementCategory;
  unitCostUsd: number;
  unitCostMxn: number;
  totalCostUsd: number;
  totalCostMxn: number;
  settledOwedProductId?: string | null;
  settledClientName?: string | null;
  settledClientPhone?: string | null;
  settledSellerNames?: string[];
  settledQuantity?: number;
  approvalBatchId?: string | null;
  reversalOfMovementId?: string | null;
}

export interface InventoryMovementDraft {
  productId: string;
  direction: InventoryMovementDirection;
  reason: string;
  quantity: number;
  sourceBranch: string;
  destinationBranch: string | null;
  comment: string;
  settlementOwedProductId: string | null;
}

export interface InventoryAdjustmentBatch {
  id: string;
  folio: string;
  createdAt: string;
  createdAtIso: string;
  adjustments: InventoryMovementDraft[];
  status: "PENDING" | "APPROVED" | "CANCELLED" | "REVERSED";
  resolvedAt: string | null;
}

export type WarehouseMovementKind = "ENTRY" | "SHIPMENT" | "BRANCH_REQUEST" | "PURCHASE_ORDER";
export type WarehouseRequestType = "PRODUCT" | "TESTER" | "SUPPLY";

export type WarehouseMovementStatus =
  | "DRAFT"
  | "REQUESTED"
  | "CREATION_APPROVED"
  | "SENT"
  | "RECEIVED"
  | "CANCELLED";

export interface WarehouseMovementCategory {
  id: string;
  name: string;
  active: boolean;
  createdAtIso: string;
}

export interface WarehouseMovementLine {
  productId: string;
  productName: string;
  sku: string;
  itemType?: "PRODUCT" | "SUPPLY";
  quantity: number;
  unitCostUsd: number;
  unitCostMxn: number;
  partnerCost: number;
  partnerCostUsd?: number;
  retailPrice: number;
  family?: string;
  category?: string;
  supplierId?: string | null;
  supplierName?: string | null;
  presentation?: string;
  unitsPerPackage?: number;
}

export interface WarehouseMovement {
  id: string;
  folio: string;
  kind: WarehouseMovementKind;
  requestType?: WarehouseRequestType;
  priceListId?: string | null;
  priceListName?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  categoryId: string;
  categoryLabel: string;
  destinationBranch: string | null;
  status: WarehouseMovementStatus;
  lines: WarehouseMovementLine[];
  comment: string;
  createdAtIso: string;
  createdByName: string;
  creationApprovedAtIso: string | null;
  creationApprovedByName: string | null;
  sentAtIso: string | null;
  sentByName: string | null;
  receivedAtIso: string | null;
  receivedByName: string | null;
  cancelledAtIso: string | null;
  cancelledByName: string | null;
  returnedToOrdersAtIso?: string | null;
  returnedToOrdersByName?: string | null;
}

export type WarehouseStock = Record<string, number>;

export interface WarehouseSupplyItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  image: string;
  costUsd: number;
  costMxn: number;
  partnerCost: number;
  retailPrice: number;
  family: string;
  category: string;
  stockMin: number;
  stockMax: number;
  presentation: string;
  unitsPerPackage: number;
  supplierId: string | null;
  supplierName: string | null;
  active: boolean;
  branchVisible: boolean;
}

export interface WarehouseSupplier {
  id: string;
  folio: string;
  businessName: string;
  contactName: string;
  rfc: string;
  taxRegime: string;
  businessLine: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
  createdAtIso: string;
}

export interface WarehousePriceListItem {
  productId: string;
  priceMxn: number;
  priceUsd: number;
}

export interface WarehousePriceList {
  id: string;
  name: string;
  active: boolean;
  branchNames: string[];
  clientIds: string[];
  items: WarehousePriceListItem[];
  createdAtIso: string;
}

export interface WarehousePricingSelection {
  priceListId: string | null;
  customerId: string | null;
}

export interface LayawayItem {
  cartItemId: string;
  productId: string;
  productName: string;
  kind: ProductKind;
  quantity: number;
  deliveredQuantity: number;
}

export interface LayawayPaymentRecord {
  id: string;
  folio: string;
  createdAt: string;
  createdAtIso: string;
  amount: number;
  methodId: PaymentMethod;
  payments?: PaymentEntry[];
  balanceAfter?: number;
  sellerId?: string;
  sellerName?: string;
}

export interface LayawayRecord {
  id: string;
  originalTicketId: string;
  createdAt: string;
  createdAtIso: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  branch: string;
  sellerIds: string[];
  total: number;
  amountPaid: number;
  balanceDue: number;
  items: LayawayItem[];
  payments: LayawayPaymentRecord[];
  status: "ACTIVE" | "PAID";
}

export interface OwedProductDelivery {
  id: string;
  quantity: number;
  deliveredAt: string;
  deliveredAtIso: string;
  branch: string;
  movementId: string | null;
}

export interface OwedProductRecord {
  id: string;
  ticketId: string;
  layawayId: string | null;
  clientId: string;
  clientName: string;
  clientPhone: string;
  productId: string;
  productName: string;
  quantity: number;
  deliveredQuantity: number;
  branch: string;
  sellerIds: string[];
  sellerNames: string[];
  inventoryCommitted: boolean;
  deliveryHistory: OwedProductDelivery[];
  reason: "OUT_OF_STOCK" | "LAYAWAY_LIQUIDATION";
  createdAt: string;
  createdAtIso: string;
  status: "PENDING" | "FULFILLED" | "CANCELLED";
}

export type PaymentMethod = string;

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  active: boolean;
}

export interface PaymentEntry {
  id: string;
  methodId: PaymentMethod;
  amount: number;
  authorizationCode?: string;
  cardOrBank?: string;
  folio?: string;
  createdAt?: string;
  createdAtIso?: string;
  relatedTicketId?: string;
}

export interface TicketProductLine {
  productId: string;
  name: string;
  quantity: number;
  total: number;
  includesVat?: boolean;
  netTotal?: number;
  vatAmount?: number;
  dealId?: string;
  dealName?: string;
  dealInstanceId?: string;
}

export interface TicketDealSale {
  dealId: string;
  dealName: string;
  dealSku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productIds: string[];
}

export interface TicketSellerSale {
  sellerId: string;
  sellerName: string;
  amount: number;
}

export type AppointmentKind = "COURTESY" | "NEXT_SESSION" | "NO_APPOINTMENT";

export interface AppointmentDraft {
  kind: AppointmentKind;
  service: string;
  date: string;
  branch: string;
  time: string;
}

export interface Appointment extends AppointmentDraft {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  ticketId: string;
  sellerIds: string[];
  recordedAt: string;
  recordedAtIso: string;
  status: "SCHEDULED" | "PENDING";
}

export type PaymentStatus = "PAID" | "LAYAWAY" | "PENDING";

export type DiscountMode = "PERCENT" | "AMOUNT";

export type ClientField =
  | "firstName"
  | "lastName"
  | "birthday"
  | "gender"
  | "phone"
  | "whatsapp"
  | "source"
  | "companyName";

export type RequiredClientFields = Record<ClientField, boolean>;

export interface NewClientDraft {
  firstName: string;
  lastName: string;
  birthday: string;
  gender: string;
  phone: string;
  whatsapp: string;
  source: ClientSource | "";
  companyName: string;
}

export interface BillingProfile {
  personalName: string;
  companyName: string;
  notificationEmails: string[];
}

export interface BillingCard {
  id: string;
  holderName: string;
  brand: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  authorizationCodeConfigured: boolean;
  isDefault: boolean;
}

export interface BillingLocation {
  id: string;
  name: string;
  costUsd: number;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  billingStartDate: string;
  nextBillingDate: string;
  paymentCardId: string | null;
}

export interface BillingHistoryEntry {
  id: string;
  invoiceNumber: string;
  locationId: string;
  locationName: string;
  period: string;
  billedAt: string;
  paidAt: string | null;
  totalUsd: number;
  status: "PAID" | "PENDING" | "FAILED";
  cardLast4: string | null;
}
