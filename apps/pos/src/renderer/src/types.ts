export type ScreenId =
  | "sale"
  | "seller-sales"
  | "receipts"
  | "customers"
  | "appointments"
  | "inventory"
  | "inventory-movements"
  | "catalog"
  | "settings"
  | "x-report"
  | "cash-manager"
  | "close-day"
  | "employees"
  | "competition"
  | "websites"
  | "data-update";

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
  minPrice: number;
  maxPrice: number;
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
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  birthday: string;
  gender: string;
  phone: string;
  whatsapp: string;
  source: ClientSource;
  companyName: string;
  companyLocked: boolean;
  ownerId: string | null;
  saleSellerIds: string[];
}

export type ClientSource = "APPROACH" | "LEAD" | "REFERRAL" | "SOCIAL";

export interface Seller {
  id: string;
  name: string;
  initials: string;
  active: boolean;
  accessCode: string;
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
  sellerSummary: string;
  items: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  deviation: number;
  paymentMethod: PaymentMethod;
  payments: PaymentEntry[];
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  products: TicketProductLine[];
  sellerSales: TicketSellerSale[];
  status: "COMPLETED" | "REFUNDED";
  ticketType?: "SALE" | "LAYAWAY_PAYMENT";
  relatedTicketId?: string;
  inventoryDeductions?: TicketInventoryLine[];
  cancelledAt?: string;
  cancelledAtIso?: string;
  refundAmount?: number;
  returnedProducts?: TicketInventoryLine[];
}

export interface TicketInventoryLine {
  productId: string;
  productName: string;
  quantity: number;
  branch: string;
}

export interface TicketCancellationRequest {
  refundAmount: number;
  returnedProducts: TicketInventoryLine[];
}

export interface ReceiptSettings {
  logoUrl: string;
  companyName: string;
  branchName: string;
  address: string;
  footerMessage: string;
  policies: string;
  showClientName: boolean;
  showClientPhone: boolean;
  showSellerName: boolean;
}

export type InventoryMovementDirection = "ADD" | "REMOVE" | "TRANSFER";

export type BranchInventory = Record<string, Record<string, number>>;

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
}

export interface InventoryMovementDraft {
  productId: string;
  direction: InventoryMovementDirection;
  reason: string;
  quantity: number;
  sourceBranch: string;
  destinationBranch: string | null;
  comment: string;
}

export interface InventoryAdjustmentBatch {
  id: string;
  folio: string;
  createdAt: string;
  createdAtIso: string;
  adjustments: InventoryMovementDraft[];
  status: "PENDING" | "APPROVED" | "CANCELLED";
  resolvedAt: string | null;
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
}

export interface LayawayRecord {
  id: string;
  originalTicketId: string;
  createdAt: string;
  createdAtIso: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  sellerIds: string[];
  total: number;
  amountPaid: number;
  balanceDue: number;
  items: LayawayItem[];
  payments: LayawayPaymentRecord[];
  status: "ACTIVE" | "PAID";
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
  branch: string;
  reason: "OUT_OF_STOCK" | "LAYAWAY_LIQUIDATION";
  createdAt: string;
  createdAtIso: string;
  status: "PENDING" | "FULFILLED";
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
}

export interface TicketProductLine {
  productId: string;
  name: string;
  quantity: number;
  total: number;
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
