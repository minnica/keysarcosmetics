import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BadgePercent,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  DollarSign,
  Eye,
  Filter,
  LockKeyhole,
  Menu,
  Minus,
  PackageCheck,
  PackagePlus,
  PackageMinus,
  Pencil,
  Percent,
  Printer,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Toaster,
  toast,
} from "@cosmetics/ui";
import type {
  PosAttendanceDto,
  PosBranchSummaryDto,
  PosBusinessDayDto,
  PosCashExpenseDto,
  PosExpenseTypeDto,
  PosInventoryLocationDto,
  PosNotificationDto,
  PosOperationalSummaryDto,
  PosOfflineBootstrapDto,
  PosPermissionKey,
  PosSessionDto,
  PosSalesCompetitionDto,
  PosTicketQuoteDto,
} from "@cosmetics/types";
import {
  CheckoutDialog,
  type CheckoutResult,
} from "./components/CheckoutDialog";
import { AppointmentsView } from "./components/AppointmentsView";
import { CatalogView } from "./components/CatalogView";
import {
  CashManagerView,
  ExpenseTypeSettings,
} from "./components/CashManagerView";
import { ClockInView } from "./components/ClockInView";
import { CompetitionSettings } from "./components/CompetitionSettings";
import { CompetitionView } from "./components/CompetitionView";
import { CustomersView } from "./components/CustomersView";
import { DataUpdateView } from "./components/DataUpdateView";
import { DealPickerDialog } from "./components/DealPickerDialog";
import { DealsView } from "./components/DealsView";
import { DigitalCatalogView } from "./components/DigitalCatalogView";
import { EmployeesView } from "./components/EmployeesView";
import { InventoryMovementsView } from "./components/InventoryMovementsView";
import {
  WarehouseView,
  type WarehouseScope,
} from "./components/WarehouseView";
import { WarehouseSettings } from "./components/WarehouseSettings";
import { SuppliersView } from "./components/SuppliersView";
import { HistoryPagination } from "./components/HistoryPagination";
import { InventoryCatalogSettings } from "./components/InventoryCatalogSettings";
import { MyAccountView } from "./components/MyAccountView";
import {
  createDefaultNotificationPreferences,
  NotificationBell,
  NotificationSettings,
} from "./components/NotificationCenter";
import { PosSidebar } from "./components/PosSidebar";
import { ProductDialog } from "./components/ProductDialog";
import { ReceiptTicketDialog } from "./components/ReceiptTicketDialog";
import { ReportsView } from "./components/ReportsView";
import { SellerSalesView } from "./components/SellerSalesView";
import {
  InventoryCountScreen,
  MasterDashboard,
  PosLoginScreen,
} from "./components/SessionWorkflow";
import { TicketEditDialog } from "./components/TicketEditDialog";
import { TicketCancellationDialog } from "./components/TicketCancellationDialog";
import { VoucherSettings } from "./components/VoucherSettings";
import { XReportExecutiveExport } from "./components/XReportExecutiveExport";
import {
  administratorCode,
  formatCurrency,
  getSellerSku,
  initialAppointments,
  initialBillingCards,
  initialBillingHistory,
  initialBillingLocations,
  initialBillingProfile,
  initialBranchInventory,
  initialCashExpenses,
  initialClientSources,
  initialCompetitions,
  initialDeals,
  initialEmployeeRoles,
  initialExpenseTypes,
  initialClients,
  initialInventoryMovementReasons,
  initialInventoryMovements,
  initialPaymentMethods,
  initialLayaways,
  initialReceiptSettings,
  initialRequiredClientFields,
  initialTickets,
  masterUser,
  products as initialProducts,
  sellers as initialSellers,
} from "./mock-data";
import type {
  Appointment,
  AttendanceRecord,
  BillingCard,
  BillingHistoryEntry,
  BillingLocation,
  BillingProfile,
  BranchInventory,
  CashExpense,
  CartItem,
  Client,
  ClientField,
  ClientSourceOption,
  CourtesyPackage,
  CourtesySettings,
  DiscountMode,
  EmployeeRole,
  ExpenseType,
  InventoryAdjustmentBatch,
  InventoryBranchOrderDraft,
  InventoryBranchOrderResult,
  InventoryMovement,
  InventoryMovementDraft,
  InventoryMovementReason,
  InventoryAuditLine,
  InventoryCountAudit,
  WarehouseMovement,
  WarehouseMovementCategory,
  WarehouseMovementLine,
  WarehousePriceList,
  WarehousePricingSelection,
  WarehouseRequestType,
  WarehouseSupplyItem,
  WarehouseSupplier,
  WarehouseStock,
  LayawayRecord,
  OwedProductRecord,
  OperationalNotification,
  OperationalNotificationPreference,
  OperationalNotificationType,
  PaymentEntry,
  PaymentMethodOption,
  Product,
  PosDaySession,
  PosSessionUser,
  ReceiptSettings,
  RetailDeal,
  RequiredClientFields,
  ScreenId,
  SalesCompetition,
  Seller,
  Ticket,
  TicketCancellationRequest,
  TicketEditRequest,
  TicketInventoryLine,
  VoucherIssue,
  VoucherTemplate,
} from "./types";
import {
  calculateIncludedVat,
  getTicketTaxSummary,
  roundCurrency,
} from "./tax";
import { getTicketSpare } from "./spare";
import {
  accessFromDto,
  loginPos,
  permissionsToScreens,
  posApi,
  posApiEnabled,
  roleToPermissions,
  sessionUserFromDto,
} from "./lib/pos-api";
import {
  adjustmentBatchFromDto,
  inventoryMovementsFromDto,
  warehouseMovementFromDto,
} from "./lib/pos-inventory-api";
import {
  layawayFromDto,
  owedProductsFromDto,
  ticketFromDto,
} from "./lib/pos-ticket-api";
import {
  enqueueOfflineOperation,
  offlineQueueStatus,
  syncOfflineOperations,
  type OfflineQueueStatus,
} from "./lib/pos-offline";

const getSaleProductBrand = (product: Product) =>
  product.kind === "SERVICE"
    ? "Keysar Experiences"
    : product.supplierName
      ?.replace(" International", "")
      .replace(" México", "") ?? product.family;

const clientFromPosCustomer = (customer: { id: string; displayName: string; phone: string | null }): Client => {
  const [firstName = customer.displayName, ...lastNameParts] = customer.displayName.trim().split(/\s+/);
  return {
    id: customer.id,
    registrationFolio: customer.id,
    registeredAtIso: "",
    firstName,
    lastName: lastNameParts.join(" "),
    birthday: "",
    gender: "",
    phone: customer.phone ?? "",
    whatsapp: customer.phone ?? "",
    source: "",
    sourceLabel: "Directorio central",
    companyName: "",
    companyLocked: false,
    ownerId: null,
    saleSellerIds: [],
  };
};

/** Adapta el DTO público al componente existente sin reintroducir costos. */
const productFromPosCatalog = (item: {
  id: string; sku: string; name: string; kind: string;
  family: { name: string } | null; category: { name: string } | null;
  description: string | null; benefits: string[]; imageUrl: string | null;
  listPrice: string; minimumPrice: string; taxRate: string; unitCost?: string;
}, branch: string): Product => ({
  id: item.id, sku: item.sku, name: item.name,
  family: item.family?.name ?? "Sin familia", category: item.category?.name ?? "Sin categoría",
  group: item.family?.name ?? "General", kind: item.kind === "SERVICE" ? "SERVICE" : "PRODUCT",
  image: item.imageUrl ?? "./products/placeholder.png", ...(item.description ? { description: item.description } : {}),
  benefits: item.benefits, showInDigitalCatalog: true, minPrice: Number(item.minimumPrice), maxPrice: Number(item.listPrice),
  includesVat: Number(item.taxRate) > 0, costUsd: 0, costMxn: Number(item.unitCost ?? "0.00"),
  stock: item.kind === "SERVICE" ? null : 0, stockMin: null, stockMax: null, branches: [branch], active: true,
});

const notificationTypeFromApi = (
  kind: string,
): OperationalNotificationType => {
  if (kind === "SALE_COMPLETED" || kind === "CASH_EXPENSE" || kind === "PRODUCT_CREATED" ||
      kind === "INVENTORY_ADD" || kind === "INVENTORY_REMOVE" || kind === "INVENTORY_TRANSFER" ||
      kind === "CLOSE_DAY" || kind === "CLOCK_IN") return kind;
  return "INVENTORY_TRANSFER";
};

const formatSaleCount = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

async function loadAllApiPages<T>(
  load: (page: number, pageSize: number) => Promise<{ items: T[]; total: number }>,
): Promise<T[]> {
  const pageSize = 100;
  const items: T[] = [];
  let page = 1;
  let total = 0;
  do {
    const result = await load(page, pageSize);
    items.push(...result.items);
    total = result.total;
    if (result.items.length === 0) break;
    page += 1;
  } while (items.length < total);
  return items;
}

const courtesyPackageOptions: Array<{ id: CourtesyPackage; label: string; detail: string }> = [
  { id: "FACIAL", label: "Facial", detail: "1 servicio de cortesía" },
  { id: "BODY", label: "Corporal", detail: "1 servicio de cortesía" },
  { id: "DOUBLE_FACIAL", label: "Doble facial", detail: "2 servicios de cortesía" },
  { id: "DOUBLE_BODY", label: "Doble corporal", detail: "2 servicios de cortesía" },
  { id: "MIXED", label: "Mixto", detail: "Facial + corporal" },
];

const screenMetadata: Record<ScreenId, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Control ejecutivo de la jornada e inventario",
  },
  sale: { title: "Ventas", subtitle: "Captura y cobro de ventas" },
  "seller-sales": {
    title: "Mis ventas",
    subtitle: "Consulta personal de ventas, clientes y pagos",
  },
  receipts: {
    title: "Receipts",
    subtitle: "Tickets, cobros y descuentos",
  },
  customers: {
    title: "Customers",
    subtitle: "Directorio y pertenencia de clientes",
  },
  appointments: {
    title: "Citas",
    subtitle: "Cortesías y próximas sesiones",
  },
  inventory: {
    title: "Inventory",
    subtitle: "Productos, existencias, pedidos y sucursales",
  },
  warehouse: {
    title: "Pedido sucursales",
    subtitle: "Existencias, compras, solicitudes recibidas y distribución",
  },
  "branch-inventory": {
    title: "Almacén matriz",
    subtitle: "Solicitudes de productos, testers e insumos a bodega matriz",
  },
  suppliers: {
    title: "Proveedores",
    subtitle: "Directorio fiscal, productos y abastecimiento",
  },
  "inventory-movements": {
    title: "Movimientos de inventario",
    subtitle: "Entradas, bajas y ajustes de existencias",
  },
  deals: {
    title: "Paquetes y promociones",
    subtitle: "Paquetes, autorización y rentabilidad",
  },
  catalog: {
    title: "Catálogo digital",
    subtitle: "Libro visual por familias para mostrar al cliente",
  },
  settings: {
    title: "Settings",
    subtitle: "Reglas de captura del punto de venta",
  },
  "x-report": {
    title: "X-Report",
    subtitle: "Corte parcial sin cerrar el día",
  },
  reports: {
    title: "Reports",
    subtitle: "Reportes ejecutivos de ventas, mercancía, empleados y clientes",
  },
  "cash-manager": {
    title: "Cash manager",
    subtitle: "Movimientos de caja de la terminal",
  },
  "clock-in": {
    title: "Clock In",
    subtitle: "Asistencia y presencia de vendedores",
  },
  "close-day": { title: "Close day", subtitle: "Resumen y cierre operativo" },
  employees: {
    title: "Employees",
    subtitle: "Personal, puestos y control de accesos",
  },
  competition: {
    title: "Competition",
    subtitle: "Metas retail y desempeño del equipo",
  },
  websites: { title: "Websites", subtitle: "Accesos rápidos de operación" },
  "data-update": {
    title: "Data update",
    subtitle: "Sincronización offline del POS",
  },
  "my-account": {
    title: "My Account",
    subtitle: "Perfil, ubicaciones y facturación",
  },
};

type InterfaceLanguage = "ES" | "EN";

const screenMetadataEnglish: Record<ScreenId, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Executive control of the day and inventory" },
  sale: { title: "Sale", subtitle: "Retail sales" },
  "seller-sales": { title: "My sales", subtitle: "Personal sales, customers and payments" },
  receipts: { title: "Receipts", subtitle: "Tickets, payments and discounts" },
  customers: { title: "Customers", subtitle: "Customer directory and ownership" },
  appointments: { title: "Appointments", subtitle: "Courtesy services and upcoming sessions" },
  inventory: { title: "Inventory", subtitle: "Products, stock, orders and locations" },
  warehouse: { title: "Central warehouse", subtitle: "Central stock, purchases, requests and shipments" },
  "branch-inventory": { title: "Branch inventory", subtitle: "Product, tester and supply requests to the central warehouse" },
  suppliers: { title: "Suppliers", subtitle: "Tax directory, products and procurement" },
  "inventory-movements": { title: "Inventory movements", subtitle: "Entries, write-offs and stock adjustments" },
  deals: { title: "Deals", subtitle: "Packages, authorization and profitability" },
  catalog: { title: "Digital catalog", subtitle: "Visual family book for customers" },
  settings: { title: "Settings", subtitle: "Point-of-sale capture rules" },
  "x-report": { title: "X-Report", subtitle: "Partial report without closing the day" },
  reports: { title: "Reports", subtitle: "Executive sales, merchandise, employee and customer reports" },
  "cash-manager": { title: "Cash manager", subtitle: "Terminal cash movements" },
  "clock-in": { title: "Clock In", subtitle: "Seller attendance and presence" },
  "close-day": { title: "Close day", subtitle: "Operational summary and closing" },
  employees: { title: "Employees", subtitle: "People, roles and access control" },
  competition: { title: "Competition", subtitle: "Retail targets and team performance" },
  websites: { title: "Websites", subtitle: "Quick operational links" },
  "data-update": { title: "Data update", subtitle: "POS offline synchronization" },
  "my-account": { title: "My Account", subtitle: "Profile, locations and billing" },
};

const automaticDataUpdateIntervalMs = 60_000;
const terminalLocationStorageKey = "keysar-pos-terminal-location";
const offlineTicketQueueStorageKey = "keysar-pos-offline-ticket-queue";
const voucherIssuesStorageKey = "keysar-pos-voucher-issues";

type ConnectivityNoticeKind = "ONLINE" | "OFFLINE" | "SYNCED";

interface ConnectivityNotice {
  kind: ConnectivityNoticeKind;
  title: string;
  description: string;
  pendingCount: number;
}

const loadOfflineTicketQueue = (): Ticket[] => {
  if (posApiEnabled) return [];
  try {
    const storedQueue = window.localStorage.getItem(
      offlineTicketQueueStorageKey,
    );
    if (!storedQueue) return [];
    const parsedQueue: unknown = JSON.parse(storedQueue);
    return Array.isArray(parsedQueue) ? (parsedQueue as Ticket[]) : [];
  } catch {
    return [];
  }
};

const loadVoucherIssues = (): VoucherIssue[] => {
  if (posApiEnabled) return [];
  try {
    const storedIssues = window.localStorage.getItem(voucherIssuesStorageKey);
    if (!storedIssues) return [];
    const parsedIssues: unknown = JSON.parse(storedIssues);
    return Array.isArray(parsedIssues) ? (parsedIssues as VoucherIssue[]) : [];
  } catch {
    return [];
  }
};

const mergeOfflineTicketQueue = (baseTickets: Ticket[]) => {
  const queuedTickets = loadOfflineTicketQueue();
  const queuedIds = new Set(queuedTickets.map((ticket) => ticket.id));
  return [
    ...queuedTickets,
    ...baseTickets.filter((ticket) => !queuedIds.has(ticket.id)),
  ];
};
const initialBranchAddresses: Record<string, string> = {
  Polanco: "Av. Presidente Masaryk 123, Polanco, CDMX",
  Satélite: "Circuito Centro Comercial 2251, Satélite, Estado de México",
  "Roma Norte": "Av. Álvaro Obregón 180, Roma Norte, CDMX",
};

const clientFieldLabels: Record<ClientField, string> = {
  firstName: "Nombre",
  lastName: "Apellido",
  birthday: "Cumpleaños",
  gender: "Género",
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  source: "Procedencia",
  companyName: "Empresa asignada",
};

const clientFieldApiKeys: Record<ClientField, string> = {
  firstName: "FIRST_NAME",
  lastName: "LAST_NAME",
  birthday: "BIRTHDAY",
  gender: "GENDER",
  phone: "PHONE",
  whatsapp: "WHATSAPP",
  source: "SOURCE",
  companyName: "COMPANY_NAME",
};

const paymentStatusLabels: Record<Ticket["paymentStatus"], string> = {
  PAID: "Pagado",
  LAYAWAY: "Apartado",
  PENDING: "Pendiente de cobro",
};

const operationalBusinessDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const attendanceFromDto = (record: PosAttendanceDto): AttendanceRecord => ({
  id: record.id,
  sellerId: record.employeeId,
  sellerName: record.employeeName,
  sellerInitials: record.employeeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es-MX") ?? "")
    .join(""),
  branch: record.branchName,
  clockInAt: new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(record.clockInAt)),
  clockInAtIso: record.clockInAt,
  clockOutAt: record.clockOutAt
    ? new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(record.clockOutAt))
    : null,
  clockOutAtIso: record.clockOutAt,
  status: record.status === "OPEN" ? "ONLINE" : "OFFLINE",
  clockOutReason: record.closeReason === "CLOSE_DAY" ? "CLOSE_DAY" : record.closeReason === "MANUAL" ? "MANUAL" : null,
});

const expenseFromDto = (expense: PosCashExpenseDto): CashExpense => ({
  id: expense.id,
  folio: expense.folio,
  createdAt: new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(expense.createdAt)),
  createdAtIso: expense.createdAt,
  expenseDate: expense.businessDate,
  typeId: expense.expenseTypeId,
  typeName: expense.expenseTypeName,
  amount: Number(expense.amount),
  branch: expense.branchName,
  sellerId: expense.employeeId ?? "pos-system",
  sellerName: expense.employeeName,
  concept: expense.concept,
  comment: expense.comment ?? "",
  authorizedBy: "Registro POS autorizado",
  status: expense.status,
  updatedAtIso: expense.voidedAt,
});

const expenseTypeFromDto = (type: PosExpenseTypeDto): ExpenseType => ({
  id: type.id,
  name: type.name,
  active: type.active,
});

const daySessionFromDto = (day: PosBusinessDayDto): PosDaySession => ({
  id: day.id,
  branch: day.branchName,
  openedAtIso: day.openedAt,
  openedById: "pos-opened",
  openingAuditId: day.openingCountId ?? `opening-skip-${day.id}`,
  status: day.status,
  closingAuditId: day.closingCountId ?? (day.closingSkipped ? `closing-skip-${day.id}` : null),
  closedAtIso: day.closedAt,
  closedById: day.closedByName ? "pos-closed" : null,
  closedByName: day.closedByName,
});

const createInitialOperationalNotifications = (): OperationalNotification[] => {
  const currentDate = operationalBusinessDate(new Date().toISOString());
  const recipients = [masterUser.id];
  const ticketNotifications = initialTickets
    .filter(
      (ticket) =>
        ticket.status === "COMPLETED" &&
        operationalBusinessDate(ticket.createdAtIso) === currentDate,
    )
    .map<OperationalNotification>((ticket) => ({
      id: `notification-ticket-${ticket.id}`,
      type: "SALE_COMPLETED",
      title: `Venta finalizada · ${ticket.id}`,
      detail: `${ticket.clientName} · ${formatCurrency(ticket.total)} · ${ticket.sellerSummary}`,
      moduleLabel: "Ventas",
      branch: ticket.branchName ?? "Polanco",
      actorId: ticket.sellerSales[0]?.sellerId ?? masterUser.id,
      actorName: ticket.sellerSummary,
      reference: ticket.id,
      createdAtIso: ticket.createdAtIso,
      recipientUserIds: recipients,
      readByUserIds: [],
    }));
  const expenseNotifications = initialCashExpenses
    .filter((expense) => expense.expenseDate === currentDate)
    .map<OperationalNotification>((expense) => ({
      id: `notification-expense-${expense.id}`,
      type: "CASH_EXPENSE",
      title: `Gasto registrado · ${expense.folio}`,
      detail: `${expense.typeName} · ${formatCurrency(expense.amount)} · ${expense.concept}`,
      moduleLabel: "Cash manager",
      branch: expense.branch,
      actorId: expense.sellerId,
      actorName: expense.sellerName,
      reference: expense.folio,
      createdAtIso: expense.createdAtIso,
      recipientUserIds: recipients,
      readByUserIds: [],
    }));
  const movementNotifications = initialInventoryMovements
    .filter(
      (movement) =>
        movement.category !== "SALE" &&
        operationalBusinessDate(movement.createdAtIso) === currentDate,
    )
    .map<OperationalNotification>((movement) => ({
      id: `notification-movement-${movement.id}`,
      type:
        movement.direction === "ADD"
          ? "INVENTORY_ADD"
          : movement.direction === "TRANSFER"
            ? "INVENTORY_TRANSFER"
            : "INVENTORY_REMOVE",
      title:
        movement.direction === "ADD"
          ? `Entrada de producto · ${movement.folio}`
          : movement.direction === "TRANSFER"
            ? `Transferencia · ${movement.folio}`
            : `Baja de producto · ${movement.folio}`,
      detail: `${movement.productName} · ${movement.quantity} pz · ${movement.reason}`,
      moduleLabel: "Inventory · Movimientos",
      branch:
        movement.direction === "TRANSFER" && movement.destinationBranch
          ? `${movement.sourceBranch} → ${movement.destinationBranch}`
          : movement.sourceBranch,
      actorId: masterUser.id,
      actorName: masterUser.name,
      reference: movement.folio,
      createdAtIso: movement.createdAtIso,
      recipientUserIds: recipients,
      readByUserIds: [],
    }));
  return [...ticketNotifications, ...expenseNotifications, ...movementNotifications].sort(
    (left, right) => right.createdAtIso.localeCompare(left.createdAtIso),
  );
};

const createUniqueFolio = (tickets: Ticket[]) => {
  const existing = new Set(tickets.map((ticket) => ticket.id));
  let folio = "";
  do {
    const timestamp = Date.now().toString(36).toUpperCase();
    const unique = crypto.randomUUID().slice(0, 6).toUpperCase();
    folio = `KSR-${timestamp}-${unique}`;
  } while (existing.has(folio));
  return folio;
};

const getCartItemProtectedMinimum = (item: CartItem) => {
  if (item.dealId) return item.unitPrice * item.quantity;
  const protectedUnitPrice = item.adminAuthorized
    ? Math.min(item.unitPrice, item.product.minPrice)
    : item.product.minPrice;
  return protectedUnitPrice * item.quantity;
};

const isCartFloorCoveredOrAuthorized = (items: CartItem[]) => {
  if (items.length === 0) return true;
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const minimumTotal = items.reduce(
    (sum, item) => sum + getCartItemProtectedMinimum(item),
    0,
  );
  return subtotal >= minimumTotal;
};

const initialWarehouseCategories: WarehouseMovementCategory[] = [
  { id: "warehouse-products", name: "Envíos de producto", active: true, createdAtIso: "2026-08-01T14:00:00.000Z" },
  { id: "warehouse-testers", name: "Envíos de tester", active: true, createdAtIso: "2026-08-01T14:01:00.000Z" },
  { id: "warehouse-supplies", name: "Envíos de insumos", active: true, createdAtIso: "2026-08-01T14:02:00.000Z" },
  { id: "warehouse-furniture", name: "Envíos de mobiliario", active: true, createdAtIso: "2026-08-01T14:03:00.000Z" },
];

const apiWarehouseCategories: WarehouseMovementCategory[] = [
  { id: "warehouse-products", name: "Envíos de producto", active: true, createdAtIso: "" },
  { id: "warehouse-testers", name: "Envíos de tester", active: true, createdAtIso: "" },
  { id: "warehouse-supplies", name: "Envíos de insumos", active: true, createdAtIso: "" },
];

const apiInventoryMovementReasons: InventoryMovementReason[] = [
  { id: "TESTER", name: "Tester", active: true },
  { id: "DAMAGE", name: "Damage", active: true },
  { id: "LOST", name: "Lost", active: true },
  { id: "GIFT", name: "Gift", active: true },
];

const initialWarehouseSuppliers: WarehouseSupplier[] = [
  { id: "supplier-keysar-labs", folio: "PROV-0001", businessName: "Keysar Labs International", contactName: "Laura Ortega", rfc: "KLI240101K91", taxRegime: "601 · General de Ley", businessLine: "Cosmética y dermocosmética", phone: "55 9001 2210", email: "pedidos@keysarlabs.example", address: "Naucalpan, Estado de México", active: true, createdAtIso: "2026-08-01T12:00:00.000Z" },
  { id: "supplier-solaris", folio: "PROV-0002", businessName: "Solaris Dermal México", contactName: "Arturo Medina", rfc: "SDM2304158P2", taxRegime: "601 · General de Ley", businessLine: "Protección solar profesional", phone: "55 8110 4472", email: "ventas@solarisdermal.example", address: "Benito Juárez, Ciudad de México", active: true, createdAtIso: "2026-08-02T12:00:00.000Z" },
  { id: "supplier-medical", folio: "PROV-0003", businessName: "Medical Supply Center", contactName: "Fernanda Vélez", rfc: "MSC220905QH7", taxRegime: "626 · Simplificado de confianza", businessLine: "Insumos médicos y de cabina", phone: "55 7340 1198", email: "compras@medicalsupply.example", address: "Tlalnepantla, Estado de México", active: true, createdAtIso: "2026-08-03T12:00:00.000Z" },
];

const initialWarehouseSupplies: WarehouseSupplyItem[] = [
  { id: "supply-cotton", name: "Algodón facial profesional", sku: "INS-ALG-001", unit: "bolsa", image: "./products/hydra-cloud-cream.png", costUsd: 3.1, costMxn: 54, partnerCost: 66, retailPrice: 98, family: "Insumos", category: "Cabina facial", stockMin: 60, stockMax: 180, presentation: "Caja con 12 bolsas", unitsPerPackage: 12, supplierId: "supplier-medical", supplierName: "Medical Supply Center", active: true, branchVisible: true },
  { id: "supply-gloves", name: "Guantes de nitrilo", sku: "INS-GUA-002", unit: "caja", image: "./products/mineral-spf-50.png", costUsd: 7.4, costMxn: 129, partnerCost: 158, retailPrice: 220, family: "Insumos", category: "Protección", stockMin: 40, stockMax: 120, presentation: "Caja con 100 piezas", unitsPerPackage: 100, supplierId: "supplier-medical", supplierName: "Medical Supply Center", active: true, branchVisible: true },
  { id: "supply-headbands", name: "Bandas faciales desechables", sku: "INS-BAN-003", unit: "paquete", image: "./products/renewal-serum.png", costUsd: 4.6, costMxn: 80, partnerCost: 98, retailPrice: 145, family: "Insumos", category: "Cabina facial", stockMin: 80, stockMax: 220, presentation: "Caja con 20 paquetes", unitsPerPackage: 20, supplierId: "supplier-medical", supplierName: "Medical Supply Center", active: true, branchVisible: true },
  { id: "supply-sheets", name: "Sábanas desechables", sku: "INS-SAB-004", unit: "rollo", image: "./products/vitamin-c-glow.png", costUsd: 9.2, costMxn: 160, partnerCost: 195, retailPrice: 280, family: "Insumos", category: "Cabina corporal", stockMin: 30, stockMax: 90, presentation: "Caja con 6 rollos", unitsPerPackage: 6, supplierId: "supplier-medical", supplierName: "Medical Supply Center", active: true, branchVisible: false },
  { id: "supply-spatulas", name: "Espátulas cosméticas", sku: "INS-ESP-005", unit: "paquete", image: "./products/renewal-serum.png", costUsd: 2.8, costMxn: 49, partnerCost: 60, retailPrice: 90, family: "Insumos", category: "Aplicación", stockMin: 50, stockMax: 140, presentation: "Caja con 25 paquetes", unitsPerPackage: 25, supplierId: "supplier-medical", supplierName: "Medical Supply Center", active: true, branchVisible: true },
];

const initialWarehousePriceLists: WarehousePriceList[] = [
  {
    id: "warehouse-price-socio",
    name: "Socio por sucursal",
    active: true,
    branchNames: ["Polanco", "Satélite", "Roma Norte"],
    clientIds: [],
    items: [
      ...initialProducts.filter((product) => product.kind === "PRODUCT").map((product) => ({
        productId: product.id,
        priceMxn: product.partnerCost ?? Math.round(product.costMxn * 1.22),
        priceUsd: Math.round(product.costUsd * 1.22 * 100) / 100,
      })),
      ...initialWarehouseSupplies.map((supply) => ({ productId: supply.id, priceMxn: supply.partnerCost, priceUsd: Math.round(supply.costUsd * 1.22 * 100) / 100 })),
    ],
    createdAtIso: "2026-08-01T14:10:00.000Z",
  },
  {
    id: "warehouse-price-premium",
    name: "Cliente premium",
    active: true,
    branchNames: ["Polanco", "Satélite", "Roma Norte"],
    clientIds: ["client-1", "client-2"],
    items: [
      ...initialProducts.filter((product) => product.kind === "PRODUCT").map((product) => ({
        productId: product.id,
        priceMxn: Math.round((product.partnerCost ?? product.costMxn * 1.22) * 0.94),
        priceUsd: Math.round(product.costUsd * 1.15 * 100) / 100,
      })),
      ...initialWarehouseSupplies.map((supply) => ({ productId: supply.id, priceMxn: Math.round(supply.partnerCost * 0.96), priceUsd: Math.round(supply.costUsd * 1.16 * 100) / 100 })),
    ],
    createdAtIso: "2026-08-01T14:11:00.000Z",
  },
];

const initialWarehouseStock: WarehouseStock = Object.fromEntries(
  [
    ...initialProducts
      .filter((product) => product.kind === "PRODUCT")
      .map((product, index) => [product.id, [82, 64, 47, 91][index] ?? 25] as const),
    ...initialWarehouseSupplies.map((supply, index) => [supply.id, [120, 84, 160, 42, 95][index] ?? 30] as const),
  ],
);

const warehouseLineFromProduct = (product: Product, quantity: number): WarehouseMovementLine => ({
  productId: product.id,
  productName: product.name,
  sku: product.sku,
  itemType: "PRODUCT",
  quantity,
  unitCostUsd: product.costUsd,
  unitCostMxn: product.costMxn,
  partnerCost: product.partnerCost ?? Math.max(product.costMxn, Math.round(product.costMxn * 1.22)),
  partnerCostUsd: Math.round(product.costUsd * 1.22 * 100) / 100,
  retailPrice: product.maxPrice,
  family: product.family,
  category: product.category,
  supplierId: product.supplierId ?? null,
  supplierName: product.supplierName ?? null,
  presentation: product.presentation ?? "Pieza individual",
  unitsPerPackage: product.unitsPerPackage ?? 1,
});

const warehouseLineFromSupply = (supply: WarehouseSupplyItem, quantity: number): WarehouseMovementLine => ({
  productId: supply.id,
  productName: supply.name,
  sku: supply.sku,
  itemType: "SUPPLY",
  quantity,
  unitCostUsd: supply.costUsd,
  unitCostMxn: supply.costMxn,
  partnerCost: supply.partnerCost,
  partnerCostUsd: Math.round(supply.costUsd * 1.22 * 100) / 100,
  retailPrice: supply.retailPrice,
  family: supply.family,
  category: supply.category,
  supplierId: supply.supplierId,
  supplierName: supply.supplierName,
  presentation: supply.presentation,
  unitsPerPackage: supply.unitsPerPackage,
});

const initialWarehouseMovements: WarehouseMovement[] = (() => {
  const physical = initialProducts.filter((product) => product.kind === "PRODUCT");
  if (physical.length < 4) return [];
  return [
    {
      id: "warehouse-entry-demo", folio: "ALM-ENT-0001", kind: "ENTRY",
      categoryId: "warehouse-products", categoryLabel: "Ingreso de mercancía",
      destinationBranch: null, status: "RECEIVED",
      lines: [warehouseLineFromProduct(physical[0]!, 40), warehouseLineFromProduct(physical[1]!, 30)],
      comment: "Recepción de proveedor validada en bodega matriz.", createdAtIso: "2026-08-24T13:10:00.000Z", createdByName: "Master Keysar",
      creationApprovedAtIso: "2026-08-24T13:12:00.000Z", creationApprovedByName: "Master Keysar",
      sentAtIso: null, sentByName: null, receivedAtIso: "2026-08-24T13:12:00.000Z", receivedByName: "Bodega matriz",
      cancelledAtIso: null, cancelledByName: null,
    },
    {
      id: "warehouse-shipment-demo", folio: "ALM-ENV-0002", kind: "SHIPMENT",
      requestType: "TESTER",
      categoryId: "warehouse-testers", categoryLabel: "Envíos de tester",
      destinationBranch: "Satélite", status: "SENT", lines: [warehouseLineFromProduct(physical[2]!, 6)],
      comment: "Guía mock KSR-8842 · pendiente de carga en sucursal.", createdAtIso: "2026-08-24T14:20:00.000Z", createdByName: "Master Keysar",
      creationApprovedAtIso: "2026-08-24T14:25:00.000Z", creationApprovedByName: "Master Keysar",
      sentAtIso: "2026-08-24T14:30:00.000Z", sentByName: "Master Keysar", receivedAtIso: null, receivedByName: null,
      cancelledAtIso: null, cancelledByName: null,
    },
    {
      id: "warehouse-request-demo", folio: "ALM-PRO-0003", kind: "BRANCH_REQUEST",
      requestType: "PRODUCT",
      priceListId: "warehouse-price-socio", priceListName: "Socio por sucursal", customerId: null, customerName: null,
      categoryId: "warehouse-products", categoryLabel: "Envíos de producto",
      destinationBranch: "Roma Norte", status: "REQUESTED", lines: [warehouseLineFromProduct(physical[3]!, 12)],
      comment: "Solicitud para completar stock máximo de sucursal.", createdAtIso: "2026-08-24T15:05:00.000Z", createdByName: "Roma Norte",
      creationApprovedAtIso: null, creationApprovedByName: null, sentAtIso: null, sentByName: null,
      receivedAtIso: null, receivedByName: null, cancelledAtIso: null, cancelledByName: null,
    },
    {
      id: "warehouse-tester-request-demo", folio: "ALM-TST-0004", kind: "BRANCH_REQUEST", requestType: "TESTER",
      priceListId: "warehouse-price-premium", priceListName: "Cliente premium", customerId: "client-1", customerName: "Valeria Ruiz",
      categoryId: "warehouse-testers", categoryLabel: "Envíos de tester",
      destinationBranch: "Satélite", status: "CREATION_APPROVED", lines: [warehouseLineFromProduct(physical[0]!, 4)],
      comment: "Testers para cabina y demostración comercial.", createdAtIso: "2026-08-24T16:05:00.000Z", createdByName: "Satélite",
      creationApprovedAtIso: "2026-08-24T16:12:00.000Z", creationApprovedByName: "Master Keysar", sentAtIso: null, sentByName: null,
      receivedAtIso: null, receivedByName: null, cancelledAtIso: null, cancelledByName: null,
    },
    {
      id: "warehouse-supply-request-demo", folio: "ALM-INS-0005", kind: "BRANCH_REQUEST", requestType: "SUPPLY",
      priceListId: "warehouse-price-socio", priceListName: "Socio por sucursal", customerId: null, customerName: null,
      categoryId: "warehouse-supplies", categoryLabel: "Envíos de insumos",
      destinationBranch: "Polanco", status: "RECEIVED", lines: [warehouseLineFromSupply(initialWarehouseSupplies[0]!, 12), warehouseLineFromSupply(initialWarehouseSupplies[1]!, 3)],
      comment: "Insumos recibidos para operación de cabinas.", createdAtIso: "2026-08-24T16:40:00.000Z", createdByName: "Polanco",
      creationApprovedAtIso: "2026-08-24T16:45:00.000Z", creationApprovedByName: "Master Keysar", sentAtIso: "2026-08-24T16:50:00.000Z", sentByName: "Master Keysar",
      receivedAtIso: "2026-08-24T17:15:00.000Z", receivedByName: "Sofía Méndez", cancelledAtIso: null, cancelledByName: null,
    },
  ];
})();

function App() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [connectivityNotice, setConnectivityNotice] =
    useState<ConnectivityNotice | null>(null);
  const previousOnlineState = useRef(navigator.onLine);
  const offlineSyncingRef = useRef(false);
  const notificationPreferencesWriteRef = useRef<Promise<void>>(Promise.resolve());
  const [activeScreen, setActiveScreen] = useState<ScreenId>("sale");
  const [saleFocusMode, setSaleFocusMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarActivityTick, setSidebarActivityTick] = useState(0);
  const [sessionUser, setSessionUser] = useState<PosSessionUser | null>(null);
  const [apiSession, setApiSession] = useState<PosSessionDto | null>(null);
  const [apiPermissions, setApiPermissions] = useState<PosPermissionKey[]>([]);
  const [apiBranches, setApiBranches] = useState<PosBranchSummaryDto[]>([]);
  const [apiInventoryLocations, setApiInventoryLocations] = useState<PosInventoryLocationDto[]>([]);
  const [apiOperationalSummary, setApiOperationalSummary] = useState<PosOperationalSummaryDto | null>(null);
  const [offlineBootstrap, setOfflineBootstrap] = useState<PosOfflineBootstrapDto | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueStatus[]>([]);
  const [operatingOffline, setOperatingOffline] = useState(false);
  const [sessionStage, setSessionStage] = useState<
    "LOGIN" | "OPENING_COUNT" | "OPEN" | "CLOSING_COUNT"
  >("LOGIN");
  const [daySession, setDaySession] = useState<PosDaySession | null>(null);
  const [inventoryCountAudits, setInventoryCountAudits] = useState<
    InventoryCountAudit[]
  >([]);
  const [closeDayAuthorizationOpen, setCloseDayAuthorizationOpen] = useState(false);
  const [closeDayAuthorizationUser, setCloseDayAuthorizationUser] = useState("");
  const [closeDayAuthorizationCode, setCloseDayAuthorizationCode] = useState("");
  const [closeDayAuthorizationError, setCloseDayAuthorizationError] = useState("");
  const [search, setSearch] = useState("");
  const [interfaceLanguage] = useState<InterfaceLanguage>("ES");

  useEffect(() => {
    document.body.classList.add("executive-ledger-theme");
    document.body.classList.remove("executive-dark-mode");
    if (!posApiEnabled) {
      window.localStorage.removeItem("keysar-pos-color-mode");
      window.localStorage.removeItem("keysar-pos-language");
    }
    return () => {
      document.body.classList.remove(
        "executive-ledger-theme",
        "executive-dark-mode",
      );
    };
  }, []);

  useEffect(() => {
    const updateConnectionState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateConnectionState);
    window.addEventListener("offline", updateConnectionState);
    return () => {
      window.removeEventListener("online", updateConnectionState);
      window.removeEventListener("offline", updateConnectionState);
    };
  }, []);

  useEffect(() => {
    const compactViewport = window.matchMedia("(max-width: 920px)");
    const adaptSidebar = (event?: MediaQueryListEvent) =>
      setSidebarCollapsed(event ? event.matches : compactViewport.matches);
    adaptSidebar();
    compactViewport.addEventListener("change", adaptSidebar);
    return () => compactViewport.removeEventListener("change", adaptSidebar);
  }, []);

  useEffect(() => {
    if (sidebarCollapsed || sidebarPinned || sessionStage !== "OPEN") return;
    const inactivityTimer = window.setTimeout(() => {
      setSidebarCollapsed(true);
    }, 60_000);
    return () => window.clearTimeout(inactivityTimer);
  }, [sessionStage, sidebarActivityTick, sidebarCollapsed, sidebarPinned]);
  const [selectedFamily, setSelectedFamily] = useState("Todos");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedBrand, setSelectedBrand] = useState("Todas");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authoritativeQuote, setAuthoritativeQuote] = useState<PosTicketQuoteDto | null>(null);
  const [saleAuthorizationOpen, setSaleAuthorizationOpen] = useState(false);
  const [saleAuthorizationAlias, setSaleAuthorizationAlias] = useState("");
  const [saleAuthorizationCode, setSaleAuthorizationCode] = useState("");
  const [saleAuthorizationToken, setSaleAuthorizationToken] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(
    posApiEnabled ? [] : initialProducts,
  );
  const [sellers, setSellers] = useState<Seller[]>(
    posApiEnabled ? [] : initialSellers,
  );
  const isMasterAccessCode = (code: string) =>
    posApiEnabled
      ? Boolean(apiSession?.actor.isMaster && code.trim())
      : code.trim() === administratorCode ||
        sellers.some(
          (seller) =>
            seller.active &&
            Boolean(seller.masterAccessCode) &&
            seller.masterAccessCode === code.trim(),
        );
  const [employeeRoles, setEmployeeRoles] = useState<EmployeeRole[]>(
    posApiEnabled ? [] : initialEmployeeRoles,
  );
  const [employeeAccessAuthorized, setEmployeeAccessAuthorized] =
    useState(false);
  const [catalogFamilies, setCatalogFamilies] = useState(() =>
    posApiEnabled
      ? []
      : Array.from(new Set(initialProducts.map((product) => product.family))),
  );
  const [catalogFamilyStatus, setCatalogFamilyStatus] = useState<
    Record<string, boolean>
  >(() => posApiEnabled
    ? {}
    : Object.fromEntries(
      Array.from(new Set(initialProducts.map((product) => product.family))).map(
        (family) => [family, true],
      ),
    ),
  );
  const [catalogCategories, setCatalogCategories] = useState(() =>
    posApiEnabled
      ? []
      : Array.from(new Set(initialProducts.map((product) => product.category))),
  );
  const [catalogCategoryStatus, setCatalogCategoryStatus] = useState<
    Record<string, boolean>
  >(() => posApiEnabled
    ? {}
    : Object.fromEntries(
      Array.from(
        new Set(initialProducts.map((product) => product.category)),
      ).map((category) => [category, true]),
    ),
  );
  const [catalogGroups, setCatalogGroups] = useState(() =>
    posApiEnabled
      ? []
      : Array.from(new Set(initialProducts.map((product) => product.group))),
  );
  const [inventoryMovementReasons, setInventoryMovementReasons] = useState<
    InventoryMovementReason[]
  >(posApiEnabled ? apiInventoryMovementReasons : initialInventoryMovementReasons);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>(
    posApiEnabled ? [] : initialInventoryMovements,
  );
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseMovementCategory[]>(
    posApiEnabled ? apiWarehouseCategories : initialWarehouseCategories,
  );
  const [warehouseSupplies, setWarehouseSupplies] = useState<WarehouseSupplyItem[]>(posApiEnabled ? [] : initialWarehouseSupplies);
  const [warehouseSuppliers, setWarehouseSuppliers] = useState<WarehouseSupplier[]>(posApiEnabled ? [] : initialWarehouseSuppliers);
  const [warehousePriceLists, setWarehousePriceLists] = useState<WarehousePriceList[]>(posApiEnabled ? [] : initialWarehousePriceLists);
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStock>(posApiEnabled ? {} : initialWarehouseStock);
  const [warehouseMovements, setWarehouseMovements] = useState<WarehouseMovement[]>(posApiEnabled ? [] : initialWarehouseMovements);
  const [branchRequestEntryType, setBranchRequestEntryType] = useState<WarehouseRequestType>("PRODUCT");
  const [expenseTypes, setExpenseTypes] =
    useState<ExpenseType[]>(posApiEnabled ? [] : initialExpenseTypes);
  const [cashExpenses, setCashExpenses] =
    useState<CashExpense[]>(posApiEnabled ? [] : initialCashExpenses);
  const [notificationPreferences, setNotificationPreferences] = useState<
    OperationalNotificationPreference[]
  >(() => posApiEnabled ? [] : createDefaultNotificationPreferences(masterUser.id));
  const [operationalNotifications, setOperationalNotifications] = useState<
    OperationalNotification[]
  >(posApiEnabled ? [] : createInitialOperationalNotifications);
  const [inventoryAdjustmentBatches, setInventoryAdjustmentBatches] = useState<
    InventoryAdjustmentBatch[]
  >([]);
  const [branchInventory, setBranchInventory] = useState<BranchInventory>(
    posApiEnabled ? {} : initialBranchInventory,
  );
  const [activeBranch, setActiveBranch] = useState(() => {
    if (posApiEnabled) return "";
    const storedBranch = window.localStorage.getItem(terminalLocationStorageKey);
    return storedBranch && initialBranchInventory[storedBranch]
      ? storedBranch
      : "Polanco";
  });
  const [branchAddresses, setBranchAddresses] = useState<Record<string, string>>(
    posApiEnabled ? {} : initialBranchAddresses,
  );
  const [locationSwitchOpen, setLocationSwitchOpen] = useState(false);
  const [locationSwitchTarget, setLocationSwitchTarget] = useState("");
  const [locationSwitchAlias, setLocationSwitchAlias] = useState("");
  const [locationSwitchCode, setLocationSwitchCode] = useState("");
  const [owedProducts, setOwedProducts] = useState<OwedProductRecord[]>([]);
  const [newMovementReason, setNewMovementReason] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("PERCENT");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountDraftMode, setDiscountDraftMode] =
    useState<DiscountMode>("PERCENT");
  const [discountDraftValue, setDiscountDraftValue] = useState(0);
  const [clients, setClients] = useState<Client[]>(posApiEnabled ? [] : initialClients);
  const [tickets, setTickets] = useState<Ticket[]>(() =>
    posApiEnabled ? [] : mergeOfflineTicketQueue(initialTickets),
  );
  const [layaways, setLayaways] = useState<LayawayRecord[]>(posApiEnabled ? [] : initialLayaways);
  const [appointments, setAppointments] =
    useState<Appointment[]>(posApiEnabled ? [] : initialAppointments);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(() => ({
    ...initialReceiptSettings,
    branchName: `Sucursal ${activeBranch}`,
    address:
      initialBranchAddresses[activeBranch] ?? initialReceiptSettings.address,
  }));
  const [myAccountAuthorized, setMyAccountAuthorized] = useState(false);
  const [billingProfile, setBillingProfile] =
    useState<BillingProfile>(initialBillingProfile);
  const [billingCards, setBillingCards] =
    useState<BillingCard[]>(initialBillingCards);
  const [billingLocations, setBillingLocations] = useState<BillingLocation[]>(
    initialBillingLocations,
  );
  const [billingHistory, setBillingHistory] = useState<BillingHistoryEntry[]>(
    initialBillingHistory,
  );
  const [selectedReceiptTicket, setSelectedReceiptTicket] =
    useState<Ticket | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [ticketEditOpen, setTicketEditOpen] = useState(false);
  const [cancellingTicket, setCancellingTicket] = useState<Ticket | null>(null);
  const [ticketCancellationOpen, setTicketCancellationOpen] = useState(false);
  const [costAccessAuthorized, setCostAccessAuthorized] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [receiptBranch, setReceiptBranch] = useState("ALL");
  const [receiptPageSize, setReceiptPageSize] = useState(20);
  const [receiptPage, setReceiptPage] = useState(1);
  const [xReportPageSize, setXReportPageSize] = useState(20);
  const [xReportPage, setXReportPage] = useState(1);
  const [receiptHistoryCode, setReceiptHistoryCode] = useState("");
  const [receiptHistoryAuthorized, setReceiptHistoryAuthorized] =
    useState(false);
  const [xReportAccessCode, setXReportAccessCode] = useState("");
  const [xReportAuthorized, setXReportAuthorized] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [competitions, setCompetitions] = useState<SalesCompetition[]>(
    posApiEnabled ? [] : initialCompetitions,
  );
  const [deals, setDeals] = useState<RetailDeal[]>(posApiEnabled ? [] : initialDeals);
  const [dealPickerOpen, setDealPickerOpen] = useState(false);
  const [dealAccessAuthorized, setDealAccessAuthorized] = useState(false);
  const [competitionSettingsOpen, setCompetitionSettingsOpen] = useState(false);
  const [competitionSettingsAuthorized, setCompetitionSettingsAuthorized] =
    useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    posApiEnabled ? [] : initialPaymentMethods,
  );
  const [paymentSettingsOpen, setPaymentSettingsOpen] = useState(false);
  const [paymentSettingsCode, setPaymentSettingsCode] = useState("");
  const [paymentSettingsAuthorized, setPaymentSettingsAuthorized] =
    useState(false);
  const [newPaymentMethodName, setNewPaymentMethodName] = useState("");
  const [activeSettingsSection, setActiveSettingsSection] = useState("notifications");
  const [courtesySettings, setCourtesySettings] = useState<CourtesySettings>({
    required: true,
    defaultPackage: "FACIAL",
    enabledPackages: ["FACIAL", "BODY", "DOUBLE_FACIAL", "DOUBLE_BODY", "MIXED"],
  });
  const [voucherTemplates, setVoucherTemplates] = useState<VoucherTemplate[]>(posApiEnabled ? [] : [
    {
      id: "voucher-next-10",
      name: "10% en próxima compra",
      kind: "NEXT_PURCHASE_DISCOUNT",
      value: 10,
      message: "Disfruta 10% de descuento en tu próxima compra.",
      active: true,
      visibleToSellers: true,
    },
    {
      id: "voucher-companion-facial",
      name: "Facial para acompañante",
      kind: "COMPANION_FACIAL",
      value: 100,
      message: "Invita a una persona especial a disfrutar un facial de cortesía.",
      active: true,
      visibleToSellers: true,
    },
    {
      id: "voucher-membership-15",
      name: "15% en membresía",
      kind: "MEMBERSHIP_DISCOUNT",
      value: 15,
      message: "Obtén 15% de descuento al adquirir tu membresía.",
      active: true,
      visibleToSellers: false,
    },
  ]);
  const [voucherIssues, setVoucherIssues] =
    useState<VoucherIssue[]>(loadVoucherIssues);
  const [clientSources, setClientSources] = useState<ClientSourceOption[]>(
    posApiEnabled ? [] : initialClientSources,
  );
  const [clientSourceName, setClientSourceName] = useState("");
  const [editingClientSourceId, setEditingClientSourceId] = useState("");
  const [requiredFields, setRequiredFields] = useState<RequiredClientFields>(
    posApiEnabled
      ? {
          firstName: false,
          lastName: false,
          birthday: false,
          gender: false,
          phone: false,
          whatsapp: false,
          source: false,
          companyName: false,
        }
      : initialRequiredClientFields,
  );
  const [syncClock, setSyncClock] = useState(() => Date.now());
  const [sessionDataSync, setSessionDataSync] = useState(() => ({
    lastUpdatedAt: Date.now(),
    nextUpdateAt: Date.now() + automaticDataUpdateIntervalMs,
    updating: false,
    revision: 0,
  }));

  useEffect(() => {
    if (posApiEnabled) return;
    window.localStorage.setItem(
      voucherIssuesStorageKey,
      JSON.stringify(voucherIssues),
    );
  }, [voucherIssues]);
  const operationalBranches = useMemo(() => {
    if (posApiEnabled && apiBranches.length > 0)
      return apiBranches.map((branch) => branch.name);
    const branches = Object.keys(branchInventory);
    return [
      ...(branches.includes(activeBranch) ? [activeBranch] : []),
      ...branches.filter((branch) => branch !== activeBranch),
    ];
  }, [activeBranch, apiBranches, branchInventory]);

  const pushOperationalNotification = (
    notification: Omit<
      OperationalNotification,
      "id" | "recipientUserIds" | "readByUserIds"
    >,
  ) => {
    if (posApiEnabled) {
      void loadAllApiPages((page, pageSize) =>
        posApi.notifications({ page, pageSize }),
      ).then((items) => {
        if (!sessionUser) return;
        setOperationalNotifications(items.map((item) => ({
          id: item.id,
          type: notificationTypeFromApi(item.kind),
          title: item.title,
          detail: item.message,
          moduleLabel: item.sourceType ?? "Sistema POS",
          branch: apiBranches.find((branch) => branch.id === item.branchId)?.name ?? activeBranch,
          actorId: item.sourceId ?? "pos",
          actorName: "Sistema POS",
          reference: item.sourceId ?? item.warehouseRequestId ?? item.id,
          createdAtIso: item.createdAt,
          recipientUserIds: [sessionUser.id],
          readByUserIds: item.read ? [sessionUser.id] : [],
        })));
      }).catch(() => undefined);
      return;
    }
    const preference = notificationPreferences.find(
      (item) => item.type === notification.type,
    );
    if (
      !preference?.enabled ||
      preference.recipientUserIds.length === 0
    )
      return;
    setOperationalNotifications((current) => [
      {
        ...notification,
        id: `notification-${crypto.randomUUID()}`,
        recipientUserIds: [...preference.recipientUserIds],
        readByUserIds: [],
      },
      ...current,
    ]);
  };

  const markOperationalNotificationRead = (
    notificationId: string,
    userId: string,
  ) => {
    const applyRead = () => setOperationalNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId &&
        (userId === masterUser.id || notification.recipientUserIds.includes(userId)) &&
        !notification.readByUserIds.includes(userId)
          ? {
              ...notification,
              readByUserIds: [...notification.readByUserIds, userId],
            }
          : notification,
      ),
    );
    if (!posApiEnabled) {
      applyRead();
      return;
    }
    if (operatingOffline) {
      toast.info("Vuelve a estar en línea para registrar la lectura.");
      return;
    }
    void posApi.markNotificationRead(notificationId).then(applyRead).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la lectura.");
    });
  };

  const markAllOperationalNotificationsRead = (userId: string) => {
    const applyRead = () => setOperationalNotifications((current) =>
      current.map((notification) =>
        operationalBusinessDate(notification.createdAtIso) ===
          operationalBusinessDate(new Date().toISOString()) &&
        (userId === masterUser.id || notification.recipientUserIds.includes(userId)) &&
        !notification.readByUserIds.includes(userId)
          ? {
              ...notification,
              readByUserIds: [...notification.readByUserIds, userId],
            }
          : notification,
      ),
    );
    if (!posApiEnabled) {
      applyRead();
      return;
    }
    if (operatingOffline) {
      toast.info("Vuelve a estar en línea para registrar las lecturas.");
      return;
    }
    void posApi.markAllNotificationsRead().then(applyRead).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "No se pudieron registrar las lecturas.");
    });
  };

  const saveNotificationPreferences = (
    next: OperationalNotificationPreference[],
  ) => {
    setNotificationPreferences(next);
    if (!posApiEnabled) return;
    const warehouseKinds: PosNotificationDto["kind"][] = [
      "INVENTORY_TRANSFER",
      "WAREHOUSE_REQUESTED",
      "WAREHOUSE_CREATION_APPROVED",
      "WAREHOUSE_SHIPPED",
      "WAREHOUSE_RECEIVED",
      "WAREHOUSE_RETURNED",
      "WAREHOUSE_CANCELED",
    ];
    const preferences = next.flatMap((preference) => {
      const kinds: PosNotificationDto["kind"][] = preference.type === "INVENTORY_TRANSFER"
        ? warehouseKinds
        : [preference.type];
      const recipients = preference.enabled
        ? preference.recipientUserIds.map((actorId) => ({
            actorId,
            access: preference.recipientAccess?.[actorId] ?? "VIEW" as const,
          }))
        : [];
      return kinds.map((kind) => ({ kind, recipients }));
    });
    notificationPreferencesWriteRef.current = notificationPreferencesWriteRef.current
      .catch(() => undefined)
      .then(async () => {
        await posApi.updateNotificationPreferences(preferences);
        toast.success("Preferencias de notificación guardadas en el servidor.");
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "No se pudieron guardar las preferencias.");
      });
  };

  const toggleRequiredClientField = (field: ClientField) => {
    const required = !requiredFields[field];
    if (!posApiEnabled) {
      setRequiredFields((current) => ({ ...current, [field]: required }));
      return;
    }
    const sortOrder = (Object.keys(clientFieldApiKeys) as ClientField[]).indexOf(field);
    void posApi.updateCustomerRequiredField(clientFieldApiKeys[field], {
      label: clientFieldLabels[field],
      required,
      active: true,
      sortOrder,
    }).then((saved) => {
      setRequiredFields((current) => ({
        ...current,
        [field]: saved.active && saved.required,
      }));
    }).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el campo obligatorio.");
    });
  };

  const sessionEmployeeRole = useMemo(
    () =>
      employeeRoles.find(
        (role) => role.id === sessionUser?.roleId && role.active,
      ),
    [employeeRoles, sessionUser?.roleId],
  );

  const allowedScreens = useMemo<ScreenId[]>(() => {
    if (!sessionUser) return [];
    const resolved = sessionUser.isMaster
      ? Object.keys(screenMetadata) as ScreenId[]
      : posApiEnabled
        ? Array.from(
        new Set([...permissionsToScreens(apiPermissions), "my-account" as ScreenId]),
      )
        : Array.from(
            new Set([...(sessionEmployeeRole?.moduleAccess ?? []), "my-account" as ScreenId]),
          );
    if (!operatingOffline) return resolved;
    const offlineScreens = new Set<ScreenId>([
      "sale",
      "seller-sales",
      "receipts",
      "appointments",
      "close-day",
      "data-update",
      "my-account",
    ]);
    return resolved.filter((screen) => offlineScreens.has(screen));
  }, [apiPermissions, operatingOffline, sessionEmployeeRole, sessionUser]);

  const canEditActiveModule = Boolean(
    sessionUser?.isMaster ||
      activeScreen === "my-account" ||
      sessionEmployeeRole?.moduleEditAccess.includes(activeScreen),
  );
  const canPrintActiveModule = Boolean(
    sessionUser?.isMaster ||
      sessionEmployeeRole?.modulePrintAccess.includes(activeScreen),
  );

  const canManageWarehouse = Boolean(
    sessionUser?.isMaster ||
    employeeRoles
      .find((role) => role.id === sessionUser?.roleId && role.active)
      ?.configurationAccess.includes("WAREHOUSE_MOVEMENTS"),
  );
  const canViewProductCosts = Boolean(
    sessionUser?.isMaster || costAccessAuthorized,
  );
  const canCreateWarehouseRequest = allowedScreens.includes("branch-inventory");
  const canViewInventoryCountDifferences = Boolean(
    sessionUser?.isMaster ||
      employeeRoles
        .find((role) => role.id === sessionUser?.roleId && role.active)
        ?.configurationAccess.includes("INVENTORY_AUDIT"),
  );

  const countableProducts = useMemo(
    () =>
      catalogProducts.filter(
        (product) =>
          product.kind === "PRODUCT" &&
          product.active &&
          product.branches.includes(activeBranch),
      ),
    [activeBranch, catalogProducts],
  );

  const applyOfflineSession = (
    session: PosSessionDto,
    bootstrap: PosOfflineBootstrapDto,
  ) => {
    const nextUser = sessionUserFromDto(session);
    const branchName = session.terminal.branch.name;
    if (bootstrap.businessDay?.status === "CLOSED") {
      throw new Error("La jornada guardada ya fue cerrada; conecta la terminal para renovar su estado.");
    }
    const products = bootstrap.catalog
      .filter((item) => item.kind !== "SUPPLY")
      .map((item) => productFromPosCatalog(item, branchName));
    const locationById = new Map(
      bootstrap.inventoryLocations.map((location) => [location.id, location]),
    );
    const nextBranchInventory: BranchInventory = { [branchName]: {} };
    for (const balance of bootstrap.inventoryBalances) {
      const location = locationById.get(balance.locationId);
      if (location?.branchName) {
        nextBranchInventory[location.branchName] ??= {};
        nextBranchInventory[location.branchName]![balance.itemId] = Number(balance.availableQuantity);
      }
    }
    setCatalogProducts(products.map((product) => ({
      ...product,
      stock: product.kind === "PRODUCT" ? nextBranchInventory[branchName]?.[product.id] ?? 0 : null,
    })));
    setBranchInventory(nextBranchInventory);
    setApiInventoryLocations(bootstrap.inventoryLocations);
    setActiveBranch(branchName);
    setApiSession(session);
    setApiPermissions(session.permissions);
    setApiBranches([session.terminal.branch]);
    setOfflineBootstrap(bootstrap);
    setOperatingOffline(true);
    setDaySession(bootstrap.businessDay ? daySessionFromDto(bootstrap.businessDay) : null);
    setSellers(bootstrap.sellers.map((seller) => ({
      id: seller.id,
      name: seller.displayName,
      alias: "",
      initials: seller.displayName.split(/\s+/).filter(Boolean).slice(0, 2)
        .map((part) => part[0]?.toLocaleUpperCase("es-MX") ?? "").join(""),
      active: true,
      accessCode: "",
      masterAccessCode: null,
      canViewCosts: false,
      roleId: seller.positionId ?? "",
    })));
    setPaymentMethods(bootstrap.paymentMethods.filter((method) => method.activeForPos)
      .map((method) => ({ id: method.id, label: method.name, active: method.active })));
    setClientSources(bootstrap.customerSources.map((source) => ({
      id: source.id,
      label: source.name,
      active: source.active,
      locksCompany: false,
    })));
    setVoucherTemplates(bootstrap.voucherTemplates.map((voucher) => ({
      ...voucher,
      value: Number(voucher.value),
    })));
    setDeals(bootstrap.packages.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      description: item.description ?? "",
      price: Number(item.price),
      lines: item.lines.map((line) => ({ productId: line.itemId, quantity: Number(line.quantity) })),
      branches: [branchName],
      startDate: item.startsAt?.slice(0, 10) ?? "",
      endDate: item.endsAt?.slice(0, 10) ?? "",
      status: item.status,
      createdAtIso: item.startsAt ?? bootstrap.issuedAt,
      publishedAtIso: item.startsAt ?? bootstrap.issuedAt,
      authorizedBy: null,
    })));
    const cachedTickets = bootstrap.tickets.map(ticketFromDto);
    setTickets(cachedTickets);
    setLayaways(bootstrap.tickets.flatMap((ticket) => {
      const layaway = layawayFromDto(ticket);
      return layaway ? [layaway] : [];
    }));
    setOwedProducts(bootstrap.tickets.flatMap(owedProductsFromDto));
    if (bootstrap.ticketConfiguration) {
      const configuration = bootstrap.ticketConfiguration;
      setReceiptSettings((current) => ({
        ...current,
        companyName: configuration.companyName,
        address: configuration.address ?? current.address,
        footerMessage: configuration.footerMessage ?? current.footerMessage,
        policies: configuration.policies ?? current.policies,
        showClientName: configuration.showClientName,
        showClientPhone: configuration.showClientPhone,
        showSellerName: configuration.showSellerName,
        showVatBreakdown: configuration.showVatBreakdown,
        showSpareCoverageMessage: configuration.showSpareCoverageMessage,
        logoUrl: configuration.logoUrl ?? current.logoUrl,
        branchName: `Sucursal ${branchName}`,
      }));
    }
    const nextScreens = session.actor.isMaster
      ? ["sale" as const]
      : permissionsToScreens(session.permissions);
    setSessionUser(nextUser);
    setSessionStage(bootstrap.businessDay ? "OPEN" : "OPENING_COUNT");
    setActiveScreen(nextScreens[0] ?? "my-account");
    setSaleFocusMode(nextScreens[0] === "sale");
    void offlineQueueStatus(bootstrap).then(setOfflineQueue);
  };

  const applyApiSession = async (session: PosSessionDto) => {
    const nextUser = sessionUserFromDto(session);
    const branchName = session.terminal.branch.name;
    const currentBusinessDay = await posApi.currentBusinessDay();
    if (currentBusinessDay?.status === "CLOSED") {
      posApi.clearSession();
      setApiSession(null);
      setApiPermissions([]);
      throw new Error("La jornada actual de esta sucursal ya fue cerrada. La terminal no puede registrar operaciones retroactivas.");
    }
    const needsOpeningCount = !currentBusinessDay;
    setBranchInventory((current) =>
      current[branchName]
        ? current
        : {
            ...current,
            [branchName]: Object.fromEntries(
              catalogProducts
                .filter((product) => product.kind === "PRODUCT")
                .map((product) => [product.id, 0]),
            ),
          },
    );
    setActiveBranch(branchName);
    setReceiptSettings((current) => ({
      ...current,
      branchName: `Sucursal ${branchName}`,
    }));
    setApiSession(session);
    setApiPermissions(session.permissions);
    setOperatingOffline(false);
    setDaySession(currentBusinessDay ? daySessionFromDto(currentBusinessDay) : null);
    const branches = await posApi.branches();
    setApiBranches(branches);
    setBranchInventory((current) => ({
      ...current,
      ...Object.fromEntries(
        branches
          .filter((branch) => !current[branch.name])
          .map((branch) => [
            branch.name,
            Object.fromEntries(
              catalogProducts
                .filter((product) => product.kind === "PRODUCT")
                .map((product) => [product.id, 0]),
            ),
          ]),
      ),
    }));
    if (
      session.actor.isMaster ||
      session.permissions.includes("EMPLOYEES_VIEW") ||
      session.permissions.includes("SETTINGS_MANAGE")
    ) {
      const access = accessFromDto(await posApi.accessBootstrap());
      setEmployeeRoles(access.roles);
      setSellers(access.sellers);
    }
    // La configuración de impresión pertenece a la fase 2 y se resuelve desde
    // el backend al abrir una sesión API; no se persiste en el navegador.
    const [ticketConfiguration, customerRequiredFields] = await Promise.all([
      posApi.ticketConfiguration(),
      posApi.customerRequiredFields(),
    ]);
    setReceiptSettings((current) => ({
      ...current,
      companyName: ticketConfiguration.companyName,
      address: ticketConfiguration.address ?? "",
      footerMessage: ticketConfiguration.footerMessage ?? "",
      policies: ticketConfiguration.policies ?? "",
      showClientName: ticketConfiguration.showClientName,
      showClientPhone: ticketConfiguration.showClientPhone,
      showSellerName: ticketConfiguration.showSellerName,
      showVatBreakdown: ticketConfiguration.showVatBreakdown,
      showSpareCoverageMessage: ticketConfiguration.showSpareCoverageMessage,
      logoUrl: ticketConfiguration.logoUrl ?? "./logo.svg",
      branchName: `Sucursal ${branchName}`,
    }));
    const fieldByKey = new Map(
      customerRequiredFields.map((field) => [field.key, field]),
    );
    setRequiredFields(Object.fromEntries(
      (Object.keys(clientFieldApiKeys) as ClientField[]).map((field) => {
        const configured = fieldByKey.get(clientFieldApiKeys[field]);
        return [field, Boolean(configured?.active && configured.required)];
      }),
    ) as RequiredClientFields);
    let loadedCatalog: Awaited<ReturnType<typeof posApi.catalogItems>>["items"] = [];
    if (session.actor.isMaster || session.permissions.some((permission) => ["CATALOG_VIEW", "SALE_CREATE", "INVENTORY_VIEW", "INVENTORY_ADJUST", "WAREHOUSE_MANAGE", "WAREHOUSE_BRANCH_REQUEST"].includes(permission))) {
      loadedCatalog = await loadAllApiPages((page, pageSize) =>
        posApi.catalogItems({ page, pageSize }),
      );
      const products = loadedCatalog
        .filter((item) => item.kind !== "SUPPLY")
        .map((item) => productFromPosCatalog(item, branchName));
      setCatalogProducts(products);
      const families = Array.from(new Set(products.map((product) => product.family)));
      const categories = Array.from(new Set(products.map((product) => product.category)));
      setCatalogFamilies(families);
      setCatalogFamilyStatus(Object.fromEntries(families.map((family) => [family, true])));
      setCatalogCategories(categories);
      setCatalogCategoryStatus(Object.fromEntries(categories.map((category) => [category, true])));
      setCatalogGroups(Array.from(new Set(products.map((product) => product.group))));
    }
    if (session.actor.isMaster || session.permissions.some((permission) => ["INVENTORY_VIEW", "INVENTORY_ADJUST", "WAREHOUSE_MANAGE"].includes(permission))) {
      const [locations, balances, movements] = await Promise.all([
        posApi.inventoryLocations(),
        posApi.inventoryBalances(),
        loadAllApiPages((page, pageSize) => posApi.inventoryMovements({ page, pageSize })),
      ]);
      setApiInventoryLocations(locations);
      const locationById = new Map(locations.map((location) => [location.id, location]));
      const nextBranchInventory: BranchInventory = {};
      for (const location of locations.filter((candidate) => candidate.type === "BRANCH" && candidate.branchName)) {
        nextBranchInventory[location.branchName!] = Object.fromEntries(
          loadedCatalog.filter((item) => item.kind === "PRODUCT").map((item) => [item.id, 0]),
        );
      }
      const nextWarehouseStock: WarehouseStock = {};
      for (const balance of balances) {
        const location = locationById.get(balance.locationId);
        if (location?.type === "WAREHOUSE") nextWarehouseStock[balance.itemId] = Number(balance.availableQuantity);
        else if (location?.branchName) {
          nextBranchInventory[location.branchName] ??= {};
          nextBranchInventory[location.branchName]![balance.itemId] = Number(balance.availableQuantity);
        }
      }
      setBranchInventory(nextBranchInventory);
      setWarehouseStock(nextWarehouseStock);
      setCatalogProducts((current) => current.map((product) => ({
        ...product,
        stock: product.kind === "PRODUCT" ? nextBranchInventory[branchName]?.[product.id] ?? 0 : null,
        branches: locations.filter((location) => location.type === "BRANCH" && location.branchName).map((location) => location.branchName!),
      })));
      setInventoryMovements(inventoryMovementsFromDto(movements));
      if (session.actor.isMaster || session.permissions.includes("INVENTORY_ADJUST")) {
        const batches = await posApi.inventoryAdjustmentBatches();
        setInventoryAdjustmentBatches(batches.map((batch) => adjustmentBatchFromDto(batch, locations)));
      } else setInventoryAdjustmentBatches([]);
      setWarehouseSupplies(loadedCatalog.filter((item) => item.kind === "SUPPLY").map((item) => ({
        id: item.id, name: item.name, sku: item.sku, unit: "pieza", image: item.imageUrl ?? "./products/placeholder.png",
        costUsd: 0, costMxn: Number("unitCost" in item ? item.unitCost : "0.00"), partnerCost: 0, retailPrice: Number(item.listPrice),
        family: item.family?.name ?? "Insumos", category: item.category?.name ?? "General", stockMin: 0, stockMax: 0,
        presentation: "Pieza", unitsPerPackage: 1, supplierId: null, supplierName: null, active: item.active,
        branchVisible: true,
      })));
    } else {
      setInventoryMovements([]);
      setInventoryAdjustmentBatches([]);
      setWarehouseStock({});
    }
    if (session.actor.isMaster || session.permissions.some((permission) => ["WAREHOUSE_MANAGE", "WAREHOUSE_BRANCH_REQUEST"].includes(permission))) {
      const requests = await loadAllApiPages((page, pageSize) => posApi.warehouseRequests({ page, pageSize }));
      setWarehouseMovements(requests.map(warehouseMovementFromDto));
    } else setWarehouseMovements([]);
    const notifications = await loadAllApiPages((page, pageSize) => posApi.notifications({ page, pageSize }));
    setOperationalNotifications(notifications.map((notification) => ({
        id: notification.id,
        type: notificationTypeFromApi(notification.kind),
        title: notification.title,
        detail: notification.message,
        moduleLabel: notification.sourceType ?? "Sistema POS",
        branch: branches.find((branch) => branch.id === notification.branchId)?.name ?? branchName,
        actorId: notification.sourceId ?? "pos",
        actorName: "Sistema POS",
        reference: notification.sourceId ?? notification.warehouseRequestId ?? notification.id,
        createdAtIso: notification.createdAt,
        recipientUserIds: [nextUser.id],
        readByUserIds: notification.read ? [nextUser.id] : [],
      })));
    if (session.actor.isMaster || session.permissions.includes("SETTINGS_MANAGE")) {
      const preferences = await posApi.notificationPreferences();
      const grouped = new Map<OperationalNotificationType, OperationalNotificationPreference>();
      for (const preference of preferences) {
        const type = notificationTypeFromApi(preference.kind);
        const current = grouped.get(type) ?? { type, enabled: false, recipientUserIds: [], recipientAccess: {} };
        for (const recipient of preference.recipients) {
          if (!current.recipientUserIds.includes(recipient.actorId)) current.recipientUserIds.push(recipient.actorId);
          current.recipientAccess = { ...current.recipientAccess, [recipient.actorId]: recipient.access };
        }
        current.enabled = current.recipientUserIds.length > 0;
        grouped.set(type, current);
      }
      setNotificationPreferences(createDefaultNotificationPreferences(nextUser.id).map((preference) => grouped.get(preference.type) ?? { ...preference, enabled: false, recipientUserIds: [], recipientAccess: {} }));
    }
    if (session.actor.isMaster || session.permissions.includes("WAREHOUSE_MANAGE")) {
      const suppliers = await posApi.suppliers();
      setWarehouseSuppliers(suppliers.map((supplier) => ({
        id: supplier.id, folio: supplier.folio, businessName: supplier.businessName,
        contactName: supplier.contactName ?? "", rfc: supplier.rfc ?? "", taxRegime: "", businessLine: "",
        phone: supplier.phone ?? "", email: supplier.email ?? "", address: supplier.address ?? "",
        active: supplier.active, createdAtIso: new Date().toISOString(),
      })));
    }
    if (session.actor.isMaster || session.permissions.includes("VOUCHERS_MANAGE")) {
      const [vouchers, issues] = await Promise.all([
        posApi.voucherTemplates(),
        posApi.vouchers({ pageSize: 100 }),
      ]);
      setVoucherTemplates(vouchers.map((voucher) => ({ ...voucher, value: Number(voucher.value) })));
      setVoucherIssues(issues.items.map((issue) => ({
        id: issue.id,
        folio: issue.folio,
        voucherId: issue.templateId,
        voucherName: issue.templateName,
        voucherKind: issue.kind,
        value: Number(issue.value),
        message: issue.message,
        ticketId: issue.ticketId,
        clientId: issue.customerId,
        clientName: "Cliente POS",
        clientPhone: "",
        branch: branchName,
        issuedAtIso: issue.issuedAt,
        status: issue.status === "CANCELED" ? "CANCELLED" : issue.status,
      })));
    }
    if (!session.actor.isMaster && !session.permissions.includes("EMPLOYEES_VIEW") && session.permissions.includes("SALE_CREATE")) {
      const saleSellers = await posApi.saleSellers();
      setSellers(saleSellers.map((seller) => ({
        id: seller.id,
        name: seller.displayName,
        alias: "",
        initials: seller.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("es-MX") ?? "").join(""),
        active: true,
        accessCode: "",
        masterAccessCode: null,
        canViewCosts: false,
        roleId: seller.positionId ?? "",
      })));
    }
    if (session.actor.isMaster || session.permissions.some((permission) => permission === "CATALOG_VIEW" || permission === "SALE_CREATE")) {
      const packages = await posApi.packages();
      setDeals(packages.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        description: item.description ?? "",
        price: Number(item.price),
        lines: item.lines.map((line) => ({ productId: line.itemId, quantity: Number(line.quantity) })),
        branches: branches.map((branch) => branch.name),
        startDate: item.startsAt?.slice(0, 10) ?? "",
        endDate: item.endsAt?.slice(0, 10) ?? "",
        status: item.status,
        createdAtIso: item.startsAt ?? "",
        publishedAtIso: item.status === "PUBLISHED" ? item.startsAt ?? "" : null,
        authorizedBy: null,
      })));
    }
    if (session.actor.isMaster || session.permissions.includes("SALE_CREATE")) {
      const [methods, sources] = await Promise.all([
        posApi.paymentMethods(),
        posApi.customerSources(),
      ]);
      setPaymentMethods(methods.filter((method) => method.activeForPos).map((method) => ({ id: method.id, label: method.name, active: method.active })));
      setClientSources(sources.map((source) => ({ id: source.id, label: source.name, active: source.active, locksCompany: false })));
    }
    if (session.actor.isMaster || session.permissions.some((permission) => permission === "SALE_VIEW_OWN" || permission === "SALE_VIEW_ALL" || permission === "CUSTOMERS_VIEW")) {
      const ticketItems = await loadAllApiPages((page, pageSize) => posApi.tickets({ page, pageSize }));
      const realTickets = ticketItems.map(ticketFromDto);
      setTickets(realTickets);
      setLayaways(ticketItems.flatMap((ticket) => {
        const layaway = layawayFromDto(ticket);
        return layaway ? [layaway] : [];
      }));
      setOwedProducts(ticketItems.flatMap(owedProductsFromDto));
      setAppointments(ticketItems.flatMap((ticket) => ticket.appointments
        .filter((appointment) => appointment.status === "SCHEDULED" || appointment.status === "PENDING")
        .map((appointment) => {
          const scheduled = appointment.scheduledAt ? new Date(appointment.scheduledAt) : null;
          return {
            id: appointment.id,
            kind: appointment.kind,
            service: appointment.serviceName,
            date: scheduled ? appointment.scheduledAt!.slice(0, 10) : "",
            branch: appointment.branchName,
            time: scheduled ? appointment.scheduledAt!.slice(11, 16) : "",
            clientId: ticket.customerId ?? "",
            clientName: ticket.customerName ?? "Público general",
            clientPhone: ticket.customerPhone ?? "",
            ticketId: ticket.folio,
            sellerIds: appointment.sellerId ? [appointment.sellerId] : ticket.sellers.map((seller) => seller.employeeId),
            recordedAt: new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(ticket.createdAt)),
            recordedAtIso: ticket.createdAt,
            status: appointment.status === "SCHEDULED" ? "SCHEDULED" as const : "PENDING" as const,
          };
        })));
      const knownClients = new Map<string, Client>();
      for (const ticket of ticketItems) {
        if (!ticket.customerId || knownClients.has(ticket.customerId)) continue;
        const [firstName, ...lastName] = (ticket.customerName ?? "Cliente").split(/\s+/);
        knownClients.set(ticket.customerId, {
          id: ticket.customerId,
          registrationFolio: ticket.customerId,
          registeredAtIso: ticket.createdAt,
          firstName: firstName ?? "Cliente",
          lastName: lastName.join(" "),
          birthday: "",
          gender: "",
          phone: ticket.customerPhone ?? "",
          whatsapp: ticket.customerPhone ?? "",
          source: "",
          sourceLabel: "POS",
          companyName: "",
          companyLocked: false,
          ownerId: ticket.sellers[0]?.employeeId ?? null,
          saleSellerIds: ticket.sellers.map((seller) => seller.employeeId),
          registrationBranch: ticket.branchName,
        });
      }
      setClients([...knownClients.values()]);
    }
    if (session.actor.isMaster || session.permissions.includes("BUSINESS_DAY_OPEN")) {
      const attendance = await loadAllApiPages((page, pageSize) => posApi.attendance({ page, pageSize }));
      setAttendanceRecords(attendance.map(attendanceFromDto));
    } else {
      setAttendanceRecords([]);
    }
    if (session.actor.isMaster || session.permissions.includes("CASH_MANAGE")) {
      const [types, expenses] = await Promise.all([
        posApi.expenseTypes(),
        loadAllApiPages((page, pageSize) => posApi.expenses({ page, pageSize })),
      ]);
      setExpenseTypes(types.map(expenseTypeFromDto));
      setCashExpenses(expenses.map(expenseFromDto));
    } else {
      setCashExpenses([]);
    }
    if (session.actor.isMaster || session.permissions.some((permission) => permission === "DASHBOARD_VIEW" || permission === "REPORTS_VIEW")) {
      const canViewReports = session.actor.isMaster || session.permissions.includes("REPORTS_VIEW");
      const [summary, loadedCompetitions] = await Promise.all([
        canViewReports ? posApi.xReport() : posApi.dashboard(),
        canViewReports ? posApi.competitions() : Promise.resolve([]),
      ]);
      setApiOperationalSummary(summary);
      setCompetitions(loadedCompetitions.map((competition) => ({
        id: competition.id,
        name: competition.name,
        type: competition.type,
        active: competition.active,
        dateFrom: competition.dateFrom,
        dateTo: competition.dateTo,
        branch: branches.find((branch) => branch.id === competition.branchId)?.name ?? "Todas",
        targetAmount: competition.targetAmount === null ? null : Number(competition.targetAmount),
        productId: competition.itemId,
        packageProductIds: competition.packageItemIds,
        createdAtIso: competition.creadoEn,
      })));
    } else {
      setApiOperationalSummary(null);
      setCompetitions([]);
    }
    const nextScreens = session.actor.isMaster
      ? (Object.keys(screenMetadata) as ScreenId[])
      : permissionsToScreens(session.permissions);
    setSessionUser(nextUser);
    setSessionStage(needsOpeningCount ? "OPENING_COUNT" : "OPEN");
    setActiveScreen(nextScreens[0] ?? "my-account");
    setSaleFocusMode(nextScreens[0] === "sale");
  };

  const handleSoftwareLogin = async (credentials: {
    company: string;
    username: string;
    password: string;
    requestedBranch: string;
  }): Promise<string | null> => {
    if (posApiEnabled) {
      try {
        const login = await loginPos(credentials.username, credentials.password);
        if (login.bootstrap) {
          setOfflineBootstrap(login.bootstrap);
          void offlineQueueStatus(login.bootstrap).then(setOfflineQueue);
        }
        if (login.offline && login.bootstrap) {
          applyOfflineSession(login.session, login.bootstrap);
        } else {
          await applyApiSession(login.session);
        }
        setConnectivityNotice({
          kind: login.offline ? "OFFLINE" : "ONLINE",
          title: login.offline ? "Modo offline activado" : "Terminal conectada",
          description: login.offline
            ? `Acceso protegido con la caché vigente de ${login.session.terminal.branch.name}.`
            : `Sesión protegida iniciada en ${login.session.terminal.branch.name}.`,
          pendingCount: offlineQueue.length,
        });
        return null;
      } catch (error) {
        const response = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        return (
          response.response?.data?.message ?? response.message ??
          (navigator.onLine
            ? "No fue posible iniciar sesión en el POS."
            : "No existe una credencial offline vigente para este dispositivo.")
        );
      }
    }
    if (
      credentials.company.trim().toLocaleLowerCase("es-MX") !==
      receiptSettings.companyName.trim().toLocaleLowerCase("es-MX")
    )
      return "El nombre de la empresa no coincide con esta licencia.";
    const normalizedUser = credentials.username
      .trim()
      .toLocaleLowerCase("es-MX");
    const masterLogin =
      normalizedUser === "master" ||
      normalizedUser === masterUser.id.toLocaleLowerCase("es-MX") ||
      normalizedUser === masterUser.name.toLocaleLowerCase("es-MX");
    const seller = sellers.find(
      (candidate) =>
        candidate.active &&
        [candidate.alias].some(
          (value) => value.toLocaleLowerCase("es-MX") === normalizedUser,
        ),
    );
    if (masterLogin && !isMasterAccessCode(credentials.password))
      return "Contraseña master incorrecta.";
    if (!masterLogin && (!seller || seller.accessCode !== credentials.password.trim()))
      return "Usuario o contraseña incorrectos.";
    const selectedBranch = masterLogin
      ? credentials.requestedBranch
      : activeBranch;
    if (!branchInventory[selectedBranch]) return "La sucursal seleccionada no está activa.";
    if (masterLogin && selectedBranch !== activeBranch)
      applyTerminalLocation(selectedBranch);
    const loginDate = new Date();
    const nextUser: PosSessionUser = masterLogin
      ? {
          id: masterUser.id,
          name: masterUser.name,
          initials: masterUser.initials,
          roleId: "role-master",
          isMaster: true,
          branch: selectedBranch,
          loggedInAtIso: loginDate.toISOString(),
        }
      : {
          id: seller!.id,
          name: seller!.name,
          initials: seller!.initials,
          roleId: seller!.roleId,
          isMaster: Boolean(seller!.masterAccessCode),
          branch: selectedBranch,
          loggedInAtIso: loginDate.toISOString(),
        };
    if (
      !nextUser.isMaster &&
      !attendanceRecords.some(
        (record) => record.sellerId === nextUser.id && record.status === "ONLINE",
      )
    ) {
      const clockInAt = new Intl.DateTimeFormat("es-MX", {
        timeZone: "America/Mexico_City",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(loginDate);
      const attendance: AttendanceRecord = {
        id: `attendance-${crypto.randomUUID()}`,
        sellerId: nextUser.id,
        sellerName: nextUser.name,
        sellerInitials: nextUser.initials,
        branch: selectedBranch,
        clockInAt,
        clockInAtIso: loginDate.toISOString(),
        clockOutAt: null,
        clockOutAtIso: null,
        status: "ONLINE",
        clockOutReason: null,
      };
      setAttendanceRecords((current) => [attendance, ...current]);
      pushOperationalNotification({
        type: "CLOCK_IN",
        title: `Clock In · ${nextUser.name}`,
        detail: `Inicio de sesión y entrada a las ${clockInAt} en ${selectedBranch}.`,
        moduleLabel: "Clock In",
        branch: selectedBranch,
        actorId: nextUser.id,
        actorName: nextUser.name,
        reference: attendance.id,
        createdAtIso: attendance.clockInAtIso,
      });
    }
    const pendingTicketCount = tickets.filter(
      (ticket) => ticket.syncStatus === "PENDING_SYNC",
    ).length;
    setConnectivityNotice(
      isOnline
        ? {
            kind: "ONLINE",
            title: "Terminal conectada",
            description:
              pendingTicketCount > 0
                ? `Hay ${pendingTicketCount} ticket${pendingTicketCount === 1 ? "" : "s"} local${pendingTicketCount === 1 ? "" : "es"} listo${pendingTicketCount === 1 ? "" : "s"} para sincronizar.`
                : "La conexión a internet está disponible. Los tickets se enviarán al sistema en tiempo real.",
            pendingCount: pendingTicketCount,
          }
        : {
            kind: "OFFLINE",
            title: "Modo offline activado",
            description:
              "No hay conexión a internet. Puedes continuar usando el sistema y crear tickets; quedarán protegidos en esta terminal hasta recuperar la conexión.",
            pendingCount: pendingTicketCount,
          },
    );
    setSessionUser(nextUser);
    setSessionStage("OPENING_COUNT");
    setDaySession(null);
    setActiveScreen("sale");
    return null;
  };

  useEffect(() => {
    if (!posApiEnabled || !window.sessionStorage.getItem("pos_access_token"))
      return;
    let active = true;
    void posApi
      .me()
      .then((session) => {
        if (active) return applyApiSession(session);
        return undefined;
      })
      .catch(() => posApi.clearSession());
    return () => {
      active = false;
    };
  }, []);

  const authorizeCatalogExit = (alias: string, code: string) => {
    const normalizedAlias = alias.trim().toLocaleLowerCase("es-MX");
    const normalizedCode = code.trim();
    const isMasterAlias =
      normalizedAlias === "master" ||
      normalizedAlias === masterUser.id.toLocaleLowerCase("es-MX") ||
      normalizedAlias === masterUser.name.toLocaleLowerCase("es-MX");
    if (isMasterAlias) return isMasterAccessCode(normalizedCode);
    return sellers.some(
      (seller) =>
        seller.active &&
        seller.alias.toLocaleLowerCase("es-MX") === normalizedAlias &&
        [seller.accessCode, seller.masterAccessCode].includes(normalizedCode),
    );
  };

  const applyPhysicalInventoryCount = (
    lines: InventoryAuditLine[],
    branch: string,
  ) => {
    setBranchInventory((current) => ({
      ...current,
      [branch]: {
        ...(current[branch] ?? {}),
        ...Object.fromEntries(lines.map((line) => [line.productId, line.actualStock])),
      },
    }));
    if (branch === "Polanco") {
      const actualByProduct = new Map(
        lines.map((line) => [line.productId, line.actualStock]),
      );
      setCatalogProducts((current) =>
        current.map((product) =>
          actualByProduct.has(product.id)
            ? { ...product, stock: actualByProduct.get(product.id)! }
            : product,
        ),
      );
    }
  };

  const completeOpeningCount = (
    lines: InventoryAuditLine[],
    skipped: boolean,
    comment: string,
    persisted = false,
    backendDay?: PosBusinessDayDto,
    localDayId?: string,
  ) => {
    if (!sessionUser) return;
    if (posApiEnabled && !persisted && isOnline) {
      const location = apiInventoryLocations.find((candidate) => candidate.branchName === sessionUser.branch);
      if (skipped) {
        if (!apiSession) {
          toast.error("La sesión online no está disponible para autorizar la apertura.");
          return;
        }
        const alias = window.prompt("Alias master para omitir el conteo inicial:");
        const pin = alias ? window.prompt("PIN master:") : null;
        if (!alias || !pin) return;
        void posApi.createAuthorization({
          alias,
          pin,
          purpose: "BUSINESS_DAY_OPEN_SKIP",
          entityType: "Sucursal",
          entityId: apiSession.terminal.branch.id,
        }).then((authorization) => posApi.openBusinessDay({
          skipped: true,
          authorizationToken: authorization.authorizationToken,
          notes: comment,
        })).then((day) => completeOpeningCount(lines, true, comment, true, day)).catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "No se pudo abrir la jornada sin conteo.");
        });
        return;
      }
      if (!location) {
        toast.error("La sucursal no tiene una ubicación de inventario configurada.");
        return;
      }
      void posApi.openBusinessDay({
        locationId: location.id,
        notes: comment,
        lines: lines.map((line) => ({ itemId: line.productId, countedQuantity: line.actualStock.toFixed(2) })),
      }).then((day) => completeOpeningCount(lines, skipped, comment, true, day)).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo abrir la jornada."));
      return;
    }
    if (posApiEnabled && !persisted) {
      if (!offlineBootstrap) {
        toast.error("La credencial no tiene una caché offline vigente.");
        return;
      }
      if (skipped) {
        toast.error("Omitir el conteo inicial requiere conexión y autorización master.");
        return;
      }
      const location = apiInventoryLocations.find((candidate) => candidate.branchName === sessionUser.branch);
      if (!location) {
        toast.error("La caché no contiene la ubicación de inventario de la sucursal.");
        return;
      }
      const payload = {
        skipped: false,
        locationId: location.id,
        notes: comment,
        lines: lines.map((line) => ({ itemId: line.productId, countedQuantity: line.actualStock.toFixed(2) })),
      };
      void enqueueOfflineOperation({ kind: "BUSINESS_DAY_OPEN", payload }, offlineBootstrap)
        .then(async (queued) => {
          setOfflineQueue(await offlineQueueStatus(offlineBootstrap));
          completeOpeningCount(lines, false, comment, true, undefined, queued.id);
        })
        .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo proteger la apertura local."));
      return;
    }
    const createdAtIso = new Date().toISOString();
    const audit: InventoryCountAudit = {
      id: backendDay?.openingCountId ?? `audit-open-${crypto.randomUUID()}`,
      type: "OPENING",
      branch: sessionUser.branch,
      createdAtIso,
      createdById: sessionUser.id,
      createdByName: sessionUser.name,
      skipped,
      comment,
      lines: skipped
        ? lines.map((line) => ({
            ...line,
            actualStock: line.expectedStock,
            difference: 0,
          }))
        : lines,
    };
    if (!skipped) applyPhysicalInventoryCount(audit.lines, sessionUser.branch);
    setInventoryCountAudits((current) => [audit, ...current]);
    setDaySession(backendDay ? daySessionFromDto(backendDay) : {
      id: localDayId ?? `day-${crypto.randomUUID()}`,
      branch: sessionUser.branch,
      openedAtIso: createdAtIso,
      openedById: sessionUser.id,
      openingAuditId: audit.id,
      status: "OPEN",
      closingAuditId: null,
      closedAtIso: null,
      closedById: null,
      closedByName: null,
    });
    const nextAllowedScreens = sessionUser.isMaster
      ? (Object.keys(screenMetadata) as ScreenId[])
      : employeeRoles.find((role) => role.id === sessionUser.roleId)?.moduleAccess ?? [];
    setActiveScreen(
      nextAllowedScreens.includes("dashboard")
        ? "dashboard"
        : (nextAllowedScreens[0] ?? "my-account"),
    );
    setSessionStage("OPEN");
    setSidebarCollapsed(true);
    toast.success(
      skipped
        ? "Open Day autorizado sin conteo por usuario master."
        : "Conteo guardado. La jornada quedó abierta.",
    );
  };

  const completeClosingCount = (
    lines: InventoryAuditLine[],
    skipped: boolean,
    comment: string,
    persisted = false,
    backendDay?: PosBusinessDayDto,
  ) => {
    if (!sessionUser || !daySession) return;
    if (posApiEnabled && !persisted && isOnline) {
      const location = apiInventoryLocations.find((candidate) => candidate.branchName === sessionUser.branch);
      if (skipped) {
        const alias = window.prompt("Alias master para omitir el conteo final:");
        const pin = alias ? window.prompt("PIN master:") : null;
        if (!alias || !pin) return;
        void posApi.createAuthorization({
          alias,
          pin,
          purpose: "BUSINESS_DAY_CLOSE_SKIP",
          entityType: "PosBusinessDay",
          entityId: daySession.id,
        }).then((authorization) => posApi.submitClosingCount(daySession.id, {
          skipped: true,
          authorizationToken: authorization.authorizationToken,
          notes: comment,
        })).then((day) => completeClosingCount(lines, true, comment, true, day)).catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "No se pudo guardar el conteo final omitido.");
        });
        return;
      }
      if (!location) {
        toast.error("La sucursal no tiene una ubicación de inventario configurada.");
        return;
      }
      void posApi.submitClosingCount(daySession.id, {
        locationId: location.id,
        notes: comment,
        lines: lines.map((line) => ({ itemId: line.productId, countedQuantity: line.actualStock.toFixed(2) })),
      }).then((day) => completeClosingCount(lines, skipped, comment, true, day)).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo guardar el conteo final."));
      return;
    }
    if (posApiEnabled && !persisted) {
      if (!offlineBootstrap) {
        toast.error("La credencial no tiene una caché offline vigente.");
        return;
      }
      if (skipped) {
        toast.error("Omitir el conteo final requiere conexión y autorización master.");
        return;
      }
      const location = apiInventoryLocations.find((candidate) => candidate.branchName === sessionUser.branch);
      if (!location) {
        toast.error("La caché no contiene la ubicación de inventario de la sucursal.");
        return;
      }
      const payload = {
        skipped: false,
        locationId: location.id,
        notes: comment,
        lines: lines.map((line) => ({ itemId: line.productId, countedQuantity: line.actualStock.toFixed(2) })),
      };
      void enqueueOfflineOperation({
        kind: "BUSINESS_DAY_CLOSING_COUNT",
        entityId: daySession.id,
        payload,
      }, offlineBootstrap).then(async () => {
        setOfflineQueue(await offlineQueueStatus(offlineBootstrap));
        completeClosingCount(lines, false, comment, true);
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo proteger el conteo final local."));
      return;
    }
    const auditLines = skipped
      ? lines.map((line) => ({
          ...line,
          actualStock: line.expectedStock,
          difference: 0,
        }))
      : lines;
    const audit: InventoryCountAudit = {
      id: backendDay?.closingCountId ?? `audit-close-${crypto.randomUUID()}`,
      type: "CLOSING",
      branch: sessionUser.branch,
      createdAtIso: new Date().toISOString(),
      createdById: sessionUser.id,
      createdByName: sessionUser.name,
      skipped,
      comment,
      lines: auditLines,
    };
    if (!skipped) applyPhysicalInventoryCount(auditLines, sessionUser.branch);
    setInventoryCountAudits((current) => [audit, ...current]);
    setDaySession(backendDay ? daySessionFromDto(backendDay) : (current) =>
      current ? { ...current, closingAuditId: audit.id } : current,
    );
    setSessionStage("OPEN");
    setActiveScreen("close-day");
    toast.success(
      skipped
        ? "Conteo final omitido con autorización master. Ya puedes revisar el corte."
        : "Conteo final guardado. Ya puedes revisar e imprimir el corte.",
    );
  };

  const navigateToScreen = (screen: ScreenId) => {
    if (!allowedScreens.includes(screen)) {
      toast.error("Tu rol no tiene permiso para abrir este módulo.");
      return;
    }
    if (screen === "close-day" && daySession && !daySession.closingAuditId) {
      setSessionStage("CLOSING_COUNT");
      setActiveScreen("close-day");
      return;
    }
    setActiveScreen(screen);
    setSaleFocusMode(screen === "sale");
    setSidebarCollapsed(screen === "sale");
    setSidebarActivityTick((current) => current + 1);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => !current);
    setSidebarActivityTick((current) => current + 1);
  };

  const toggleSidebarPin = () => {
    setSidebarPinned((current) => {
      const nextPinned = !current;
      if (nextPinned) setSidebarCollapsed(false);
      return nextPinned;
    });
    setSidebarActivityTick((current) => current + 1);
  };

  const warehouseAuthorizationActor = (code: string) => {
    const normalizedCode = code.trim();
    if (!normalizedCode) return null;
    if (normalizedCode === masterUser.accessCode)
      return { id: masterUser.id, name: masterUser.name };
    const seller = sellers.find((candidate) => {
      if (!candidate.active) return false;
      const role = employeeRoles.find((item) => item.id === candidate.roleId && item.active);
      const permitted = Boolean(
        candidate.masterAccessCode ||
        role?.configurationAccess.includes("WAREHOUSE_MOVEMENTS"),
      );
      return permitted && [candidate.accessCode, candidate.masterAccessCode].includes(normalizedCode);
    });
    return seller ? { id: seller.id, name: seller.name } : null;
  };

  const refreshApiWarehouse = async () => {
    const requests = await posApi.warehouseRequests({ pageSize: 100 });
    setWarehouseMovements(requests.items.map(warehouseMovementFromDto));
    await refreshApiInventory();
  };

  const createWarehouseEntry = (
    lines: WarehouseMovementLine[],
    comment: string,
    code: string,
  ) => {
    if (posApiEnabled) {
      const matrix = apiInventoryLocations.find((location) => location.type === "WAREHOUSE");
      if (!matrix) { toast.error("No existe la ubicación de bodega matriz."); return false; }
      void posApi.createInventoryAdjustmentBatch({ notes: comment, lines: lines.map((line) => ({ itemId: line.productId, type: "ADD", fromLocationId: null, toLocationId: matrix.id, quantity: line.quantity.toFixed(2), reason: "INGRESO_BODEGA", notes: comment || null })) }).then((batch) => posApi.approveInventoryAdjustmentBatch(batch.id)).then(async () => { await refreshApiInventory(); toast.success("Ingreso confirmado en el ledger de bodega."); }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo registrar el ingreso."));
      return true;
    }
    const actor = warehouseAuthorizationActor(code);
    if (!actor) {
      toast.error("Código sin permiso para ingresos de almacén.");
      return false;
    }
    const now = new Date();
    const movement: WarehouseMovement = {
      id: `warehouse-${crypto.randomUUID()}`,
      folio: `ALM-ENT-${Date.now().toString(36).toUpperCase()}`,
      kind: "ENTRY",
      categoryId: "warehouse-products",
      categoryLabel: "Ingreso de mercancía",
      destinationBranch: null,
      status: "RECEIVED",
      lines,
      comment: comment.trim(),
      createdAtIso: now.toISOString(),
      createdByName: actor.name,
      creationApprovedAtIso: now.toISOString(),
      creationApprovedByName: actor.name,
      sentAtIso: null,
      sentByName: null,
      receivedAtIso: now.toISOString(),
      receivedByName: "Bodega matriz",
      cancelledAtIso: null,
      cancelledByName: null,
    };
    setWarehouseStock((current) => ({
      ...current,
      ...Object.fromEntries(lines.map((line) => [line.productId, (current[line.productId] ?? 0) + line.quantity])),
    }));
    setCatalogProducts((current) =>
      current.map((product) => {
        const line = lines.find((candidate) => candidate.productId === product.id);
        return line ? { ...product, partnerCost: line.partnerCost } : product;
      }),
    );
    setWarehouseMovements((current) => [movement, ...current]);
    toast.success(`${movement.folio} registrado. Existencias de bodega actualizadas.`);
    return true;
  };

  const createWarehouseMovement = (
    kind: "SHIPMENT" | "BRANCH_REQUEST",
    requestType: WarehouseRequestType,
    categoryId: string,
    branch: string,
    lines: WarehouseMovementLine[],
    comment: string,
    pricing: WarehousePricingSelection,
  ) => {
    if (posApiEnabled) {
      const branchId = apiBranches.find((candidate) => candidate.name === branch)?.id;
      if (!branchId) { toast.error("La sucursal seleccionada no está disponible para esta terminal."); return false; }
      void posApi.createWarehouseRequest({ source: "BRANCH", requestType, branchId, priceListId: pricing.priceListId, customerId: pricing.customerId, notes: comment, lines: lines.map((line) => ({ itemId: line.productId, quantity: line.quantity.toFixed(2) })) }).then(async (request) => {
        setWarehouseMovements((current) => [warehouseMovementFromDto(request), ...current]);
        toast.success(`${request.folio} creado; no se modificaron existencias.`);
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo crear la solicitud."));
      return true;
    }
    const category = warehouseCategories.find((candidate) => candidate.id === categoryId && candidate.active);
    const authorizedToCreate = kind === "BRANCH_REQUEST" ? canCreateWarehouseRequest : canManageWarehouse;
    const priceList = pricing.priceListId
      ? warehousePriceLists.find((candidate) => candidate.id === pricing.priceListId && candidate.active)
      : null;
    const customer = pricing.customerId ? clients.find((candidate) => candidate.id === pricing.customerId) : null;
    const priceListMatchesOrder = !priceList || (
      priceList.branchNames.includes(branch) &&
      (priceList.clientIds.length === 0 || Boolean(customer && priceList.clientIds.includes(customer.id)))
    );
    if (!authorizedToCreate || !category || !branchInventory[branch] || (kind === "BRANCH_REQUEST" && (!priceList || !priceListMatchesOrder))) {
      toast.error("No tienes permiso o la configuración del movimiento no es válida.");
      return false;
    }
    const pricedLines = lines.map((line) => {
      const listItem = priceList?.items.find((item) => item.productId === line.productId);
      return listItem ? { ...line, partnerCost: listItem.priceMxn, partnerCostUsd: listItem.priceUsd } : line;
    });
    const movement: WarehouseMovement = {
      id: `warehouse-${crypto.randomUUID()}`,
      folio: `ALM-${kind === "SHIPMENT" ? "ENV" : requestType === "TESTER" ? "TST" : requestType === "SUPPLY" ? "INS" : "PRO"}-${Date.now().toString(36).toUpperCase()}`,
      kind,
      requestType,
      priceListId: priceList?.id ?? null,
      priceListName: priceList?.name ?? null,
      customerId: customer?.id ?? null,
      customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : null,
      categoryId: category.id,
      categoryLabel: category.name,
      destinationBranch: branch,
      status: kind === "BRANCH_REQUEST" ? "REQUESTED" : "DRAFT",
      lines: pricedLines,
      comment: comment.trim(),
      createdAtIso: new Date().toISOString(),
      createdByName: sessionUser?.name ?? masterUser.name,
      creationApprovedAtIso: null,
      creationApprovedByName: null,
      sentAtIso: null,
      sentByName: null,
      receivedAtIso: null,
      receivedByName: null,
      cancelledAtIso: null,
      cancelledByName: null,
    };
    setWarehouseMovements((current) => [movement, ...current]);
    toast.success(`${movement.folio} creado y enviado a primera aprobación.`);
    return true;
  };

  const createInventoryBranchOrders = (
    orders: InventoryBranchOrderDraft[],
    authorizationCode: string,
  ): InventoryBranchOrderResult[] | null => {
    if (posApiEnabled) {
      if (!canCreateWarehouseRequest || orders.length === 0) return null;
      void Promise.all(orders.map((order) => {
        const branchId = apiBranches.find((branch) => branch.name === order.branch)?.id;
        if (!branchId) throw new Error(`Sucursal no disponible: ${order.branch}`);
        return posApi.createWarehouseRequest({ source: "BRANCH", requestType: "PRODUCT", branchId, notes: "Pedido generado desde Inventory para completar stock máximo.", lines: order.lines.map((line) => ({ itemId: line.productId, quantity: line.quantity.toFixed(2) })) });
      })).then(async (requests) => {
        await refreshApiWarehouse();
        toast.success(`${requests.length} ${requests.length === 1 ? "folio enviado" : "folios enviados"} a bodega matriz.`);
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudieron generar los pedidos."));
      return orders.map((order) => ({ branch: order.branch, folio: "Generando folio…" }));
    }
    if (!isMasterAccessCode(authorizationCode) || !canCreateWarehouseRequest) {
      toast.error("Se requiere autorización master para generar los pedidos.");
      return null;
    }
    const category = warehouseCategories.find(
      (candidate) => candidate.id === "warehouse-products" && candidate.active,
    );
    if (!category || orders.length === 0) {
      toast.error("No existe una categoría activa para envíos de producto.");
      return null;
    }
    const prepared = orders.map((order, index) => {
      const priceList = warehousePriceLists.find(
        (candidate) =>
          candidate.active &&
          candidate.branchNames.includes(order.branch) &&
          candidate.clientIds.length === 0,
      );
      const orderLines = order.lines.flatMap((draftLine) => {
        const product = catalogProducts.find(
          (candidate) =>
            candidate.id === draftLine.productId &&
            candidate.kind === "PRODUCT" &&
            candidate.active,
        );
        if (!product || draftLine.quantity < 1) return [];
        const baseLine = warehouseLineFromProduct(product, draftLine.quantity);
        const price = priceList?.items.find(
          (item) => item.productId === product.id,
        );
        return [
          price
            ? {
                ...baseLine,
                partnerCost: price.priceMxn,
                partnerCostUsd: price.priceUsd,
              }
            : baseLine,
        ];
      });
      if (!branchInventory[order.branch] || !priceList || orderLines.length === 0)
        return null;
      const nonce = crypto.randomUUID().slice(0, 5).toUpperCase();
      const folio = `ALM-PRO-${Date.now().toString(36).toUpperCase()}-${index + 1}-${nonce}`;
      const movement: WarehouseMovement = {
        id: `warehouse-${crypto.randomUUID()}`,
        folio,
        kind: "BRANCH_REQUEST",
        requestType: "PRODUCT",
        priceListId: priceList.id,
        priceListName: priceList.name,
        customerId: null,
        customerName: null,
        categoryId: category.id,
        categoryLabel: category.name,
        destinationBranch: order.branch,
        status: "REQUESTED",
        lines: orderLines,
        comment: "Pedido generado desde Inventory para completar stock máximo.",
        createdAtIso: new Date().toISOString(),
        createdByName: sessionUser?.name ?? masterUser.name,
        creationApprovedAtIso: null,
        creationApprovedByName: null,
        sentAtIso: null,
        sentByName: null,
        receivedAtIso: null,
        receivedByName: null,
        cancelledAtIso: null,
        cancelledByName: null,
      };
      return { movement, result: { branch: order.branch, folio } };
    });
    if (prepared.some((item) => item === null)) {
      toast.error(
        "Revisa las sucursales, productos y listas de precios antes de generar el pedido.",
      );
      return null;
    }
    const validPrepared = prepared.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
    setWarehouseMovements((current) => [
      ...validPrepared.map((item) => item.movement),
      ...current,
    ]);
    toast.success(
      `${validPrepared.length} ${validPrepared.length === 1 ? "folio enviado" : "folios enviados"} a Pedidos de sucursales.`,
    );
    return validPrepared.map((item) => item.result);
  };

  const editWarehouseMovement = (
    id: string,
    categoryId: string,
    branch: string,
    lines: WarehouseMovementLine[],
    comment: string,
    pricing: WarehousePricingSelection,
  ) => {
    if (posApiEnabled) {
      toast.info("La solicitud real conserva su snapshot; cancélala y crea una nueva para cambiar sus partidas.");
      return false;
    }
    if (!canManageWarehouse) return false;
    const movement = warehouseMovements.find((candidate) => candidate.id === id);
    const category = warehouseCategories.find((candidate) => candidate.id === categoryId && candidate.active);
    const priceList = pricing.priceListId
      ? warehousePriceLists.find((candidate) => candidate.id === pricing.priceListId && candidate.active)
      : null;
    const customer = pricing.customerId ? clients.find((candidate) => candidate.id === pricing.customerId) : null;
    const priceListMatchesOrder = !priceList || (
      priceList.branchNames.includes(branch) &&
      (priceList.clientIds.length === 0 || Boolean(customer && priceList.clientIds.includes(customer.id)))
    );
    if (!movement || !category || (movement.kind === "BRANCH_REQUEST" && (!priceList || !priceListMatchesOrder)) || !["DRAFT", "REQUESTED"].includes(movement.status)) {
      toast.error("Este movimiento ya no admite edición.");
      return false;
    }
    const pricedLines = lines.map((line) => {
      const listItem = priceList?.items.find((item) => item.productId === line.productId);
      return listItem ? { ...line, partnerCost: listItem.priceMxn, partnerCostUsd: listItem.priceUsd } : line;
    });
    setWarehouseMovements((current) => current.map((candidate) => candidate.id === id ? {
      ...candidate,
      categoryId: category.id,
      categoryLabel: category.name,
      destinationBranch: movement.kind === "PURCHASE_ORDER" ? null : branch,
      priceListId: movement.kind === "PURCHASE_ORDER" ? candidate.priceListId ?? null : priceList?.id ?? null,
      priceListName: movement.kind === "PURCHASE_ORDER" ? candidate.priceListName ?? null : priceList?.name ?? null,
      customerId: movement.kind === "PURCHASE_ORDER" ? candidate.customerId ?? null : customer?.id ?? null,
      customerName: movement.kind === "PURCHASE_ORDER" ? candidate.customerName ?? null : customer ? `${customer.firstName} ${customer.lastName}`.trim() : null,
      lines: pricedLines,
      comment: comment.trim(),
    } : candidate));
    toast.success(`${movement.folio} actualizado antes de su aprobación.`);
    return true;
  };

  const createWarehouseRestockOrder = (
    supplierId: string,
    lines: WarehouseMovementLine[],
    comment: string,
  ) => {
    if (posApiEnabled) {
      void posApi.createWarehouseRequest({ source: "SUPPLIER", requestType: "PRODUCT", supplierId, notes: comment, lines: lines.map((line) => ({ itemId: line.productId, quantity: line.quantity.toFixed(2) })) }).then((request) => {
        setWarehouseMovements((current) => [warehouseMovementFromDto(request), ...current]);
        toast.success(`${request.folio} generado; requiere dos aprobaciones distintas.`);
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo crear el resurtido."));
      return true;
    }
    const supplier = warehouseSuppliers.find((candidate) => candidate.id === supplierId && candidate.active);
    if (!canManageWarehouse || !supplier || lines.length === 0 || lines.some((line) => line.supplierId !== supplier.id)) {
      toast.error("Selecciona un proveedor activo y productos vinculados a él.");
      return false;
    }
    const movement: WarehouseMovement = {
      id: `warehouse-${crypto.randomUUID()}`,
      folio: `ALM-RES-${Date.now().toString(36).toUpperCase()}`,
      kind: "PURCHASE_ORDER",
      supplierId: supplier.id,
      supplierName: supplier.businessName,
      categoryId: "warehouse-products",
      categoryLabel: "Pedido de resurtido",
      destinationBranch: null,
      status: "REQUESTED",
      lines,
      comment: comment.trim(),
      createdAtIso: new Date().toISOString(),
      createdByName: sessionUser?.name ?? masterUser.name,
      creationApprovedAtIso: null,
      creationApprovedByName: null,
      sentAtIso: null,
      sentByName: null,
      receivedAtIso: null,
      receivedByName: null,
      cancelledAtIso: null,
      cancelledByName: null,
    };
    setWarehouseMovements((current) => [movement, ...current]);
    toast.success(`${movement.folio} generado según stock máximo; requiere doble aprobación.`);
    return true;
  };

  const approveWarehouseCreation = (id: string, code: string) => {
    if (posApiEnabled) {
      void posApi.warehouseRequestAction(id, "approve-creation").then(async () => { await refreshApiWarehouse(); toast.success("Primera aprobación registrada con la identidad de la sesión."); }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo aprobar."));
      return true;
    }
    const actor = warehouseAuthorizationActor(code);
    const movement = warehouseMovements.find((candidate) => candidate.id === id);
    if (!actor || !movement || !["DRAFT", "REQUESTED"].includes(movement.status)) {
      toast.error("No fue posible autorizar la creación del movimiento.");
      return false;
    }
    setWarehouseMovements((current) => current.map((candidate) => candidate.id === id ? {
      ...candidate,
      status: "CREATION_APPROVED",
      creationApprovedAtIso: new Date().toISOString(),
      creationApprovedByName: actor.name,
    } : candidate));
    toast.success(`Primera validación aprobada por ${actor.name}.`);
    return true;
  };

  const approveWarehouseSend = (id: string, code: string) => {
    if (posApiEnabled) {
      void posApi.warehouseRequestAction(id, "approve-send").then(async () => { await refreshApiWarehouse(); toast.success("Segunda aprobación y envío confirmados."); }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "La segunda aprobación debe realizarla otro usuario."));
      return true;
    }
    const actor = warehouseAuthorizationActor(code);
    const movement = warehouseMovements.find((candidate) => candidate.id === id);
    if (!actor || !movement || movement.status !== "CREATION_APPROVED") {
      toast.error("Segunda autorización inválida.");
      return false;
    }
    const missing = movement.kind === "PURCHASE_ORDER" ? undefined : movement.lines.find((line) => (warehouseStock[line.productId] ?? 0) < line.quantity);
    if (missing) {
      toast.error(`Bodega no cuenta con existencias suficientes de ${missing.productName}.`);
      return false;
    }
    if (movement.kind !== "PURCHASE_ORDER") setWarehouseStock((current) => ({
      ...current,
      ...Object.fromEntries(movement.lines.map((line) => [line.productId, (current[line.productId] ?? 0) - line.quantity])),
    }));
    setWarehouseMovements((current) => current.map((candidate) => candidate.id === id ? {
      ...candidate,
      status: "SENT",
      sentAtIso: new Date().toISOString(),
      sentByName: actor.name,
    } : candidate));
    toast.success(movement.kind === "PURCHASE_ORDER" ? `${movement.folio} autorizado y enviado al proveedor.` : `${movement.folio} enviado. Stock descontado de bodega; PDF disponible.`);
    return true;
  };

  const receiveWarehouseMovement = (id: string, code: string) => {
    if (posApiEnabled) {
      void posApi.warehouseRequestAction(id, "receive").then(async () => { await refreshApiWarehouse(); toast.success("Recepción confirmada atómicamente."); }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo recibir el pedido."));
      return true;
    }
    const actor = warehouseAuthorizationActor(code);
    if (!canManageWarehouse || !actor) {
      toast.error("Código sin autorización para cargar mercancía.");
      return false;
    }
    const movement = warehouseMovements.find((candidate) => candidate.id === id);
    const destination = movement?.destinationBranch;
    if (!movement || movement.status !== "SENT" || (movement.kind !== "PURCHASE_ORDER" && (!destination || !branchInventory[destination]))) {
      toast.error("El movimiento no está listo para cargarse en sucursal.");
      return false;
    }
    const receivedAt = new Date();
    if (movement.kind === "PURCHASE_ORDER") {
      setWarehouseStock((current) => ({
        ...current,
        ...Object.fromEntries(movement.lines.map((line) => [line.productId, (current[line.productId] ?? 0) + line.quantity])),
      }));
      setWarehouseMovements((current) => current.map((candidate) => candidate.id === id ? {
        ...candidate,
        status: "RECEIVED",
        receivedAtIso: receivedAt.toISOString(),
        receivedByName: actor.name,
      } : candidate));
      toast.success(`${movement.folio} recibido; existencias de bodega actualizadas.`);
      return true;
    }
    if (!destination) return false;
    const affectsRetailStock = movement.requestType !== "TESTER" && movement.requestType !== "SUPPLY";
    const destinationStock = branchInventory[destination] ?? {};
    if (affectsRetailStock) setBranchInventory((current) => ({
      ...current,
      [destination]: {
        ...current[destination],
        ...Object.fromEntries(movement.lines.map((line) => [line.productId, (current[destination]?.[line.productId] ?? 0) + line.quantity])),
      },
    }));
    const inventoryRecords: InventoryMovement[] = affectsRetailStock ? movement.lines.map((line, index) => ({
      id: `warehouse-inventory-${crypto.randomUUID()}`,
      folio: `${movement.folio}-${index + 1}`,
      createdAt: formatAttendanceTime(receivedAt),
      createdAtIso: receivedAt.toISOString(),
      productId: line.productId,
      productName: line.productName,
      direction: "TRANSFER",
      reason: movement.categoryLabel,
      quantity: line.quantity,
      previousStock: warehouseStock[line.productId] ?? 0,
      newStock: warehouseStock[line.productId] ?? 0,
      sourceBranch: "Bodega matriz",
      destinationBranch: destination,
      destinationPreviousStock: destinationStock[line.productId] ?? 0,
      destinationNewStock: (destinationStock[line.productId] ?? 0) + line.quantity,
      comment: `Mercancía cargada desde ${movement.folio}`,
      category: "TRANSFER",
      unitCostUsd: line.unitCostUsd,
      unitCostMxn: line.unitCostMxn,
      totalCostUsd: line.unitCostUsd * line.quantity,
      totalCostMxn: line.unitCostMxn * line.quantity,
    })) : [];
    if (inventoryRecords.length > 0) setInventoryMovements((current) => [...inventoryRecords, ...current]);
    setWarehouseMovements((current) => current.map((candidate) => candidate.id === id ? {
      ...candidate,
      status: "RECEIVED",
      receivedAtIso: receivedAt.toISOString(),
      receivedByName: actor.name,
    } : candidate));
    toast.success(affectsRetailStock
      ? `${movement.folio} cargado al inventario de ${destination}.`
      : `${movement.folio} recibido en ${destination}; se registró como consumo operativo sin sumar inventario vendible.`);
    return true;
  };

  const reverseWarehouseMovement = (movement: WarehouseMovement) => {
    if (movement.kind === "PURCHASE_ORDER") {
      if (movement.status === "RECEIVED") setWarehouseStock((current) => ({
        ...current,
        ...Object.fromEntries(movement.lines.map((line) => [line.productId, Math.max(0, (current[line.productId] ?? 0) - line.quantity)])),
      }));
      return;
    }
    if (movement.kind === "ENTRY" && movement.status === "RECEIVED") {
      setWarehouseStock((current) => ({
        ...current,
        ...Object.fromEntries(movement.lines.map((line) => [line.productId, Math.max(0, (current[line.productId] ?? 0) - line.quantity)])),
      }));
      return;
    }
    if (movement.status === "SENT" || movement.status === "RECEIVED") {
      setWarehouseStock((current) => ({
        ...current,
        ...Object.fromEntries(movement.lines.map((line) => [line.productId, (current[line.productId] ?? 0) + line.quantity])),
      }));
    }
    const affectsRetailStock = movement.requestType !== "TESTER" && movement.requestType !== "SUPPLY";
    if (movement.status === "RECEIVED" && movement.destinationBranch && affectsRetailStock) {
      const branch = movement.destinationBranch;
      const reversedAt = new Date();
      const currentBranchStock = branchInventory[branch] ?? {};
      const reversalRecords: InventoryMovement[] = movement.lines.map((line, index) => ({
        id: `warehouse-reversal-${crypto.randomUUID()}`,
        folio: `${movement.folio}-REV-${index + 1}`,
        createdAt: formatAttendanceTime(reversedAt),
        createdAtIso: reversedAt.toISOString(),
        productId: line.productId,
        productName: line.productName,
        direction: "TRANSFER",
        reason: `Cancelación · ${movement.categoryLabel}`,
        quantity: line.quantity,
        previousStock: currentBranchStock[line.productId] ?? 0,
        newStock: (currentBranchStock[line.productId] ?? 0) - line.quantity,
        sourceBranch: branch,
        destinationBranch: "Bodega matriz",
        destinationPreviousStock: warehouseStock[line.productId] ?? 0,
        destinationNewStock: (warehouseStock[line.productId] ?? 0) + line.quantity,
        comment: `Reversa automática del movimiento ${movement.folio}`,
        category: "TRANSFER",
        unitCostUsd: line.unitCostUsd,
        unitCostMxn: line.unitCostMxn,
        totalCostUsd: line.unitCostUsd * line.quantity,
        totalCostMxn: line.unitCostMxn * line.quantity,
      }));
      setBranchInventory((current) => ({
        ...current,
        [branch]: {
          ...current[branch],
          ...Object.fromEntries(movement.lines.map((line) => [line.productId, (current[branch]?.[line.productId] ?? 0) - line.quantity])),
        },
      }));
      setInventoryMovements((current) => [...reversalRecords, ...current]);
    }
  };

  const cancelWarehouseMovement = (id: string, code: string) => {
    if (posApiEnabled) {
      const movement = warehouseMovements.find((candidate) => candidate.id === id);
      const action = movement?.status === "SENT" ? "return-to-requested" : "cancel";
      void posApi.warehouseRequestAction(id, action).then(async () => { await refreshApiWarehouse(); toast.success(action === "cancel" ? "Solicitud cancelada." : "Envío regresado a pedidos y existencias restauradas."); }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo actualizar la solicitud."));
      return true;
    }
    const actor = warehouseAuthorizationActor(code);
    const movement = warehouseMovements.find((candidate) => candidate.id === id);
    if (!actor || !movement || movement.status === "CANCELLED") {
      toast.error("No fue posible cancelar el movimiento.");
      return false;
    }
    if (movement.status === "SENT" && ["BRANCH_REQUEST", "SHIPMENT"].includes(movement.kind)) {
      reverseWarehouseMovement(movement);
      const returnedAtIso = new Date().toISOString();
      setWarehouseMovements((current) => current.map((candidate) => candidate.id === id ? {
        ...candidate,
        status: "REQUESTED",
        creationApprovedAtIso: null,
        creationApprovedByName: null,
        sentAtIso: null,
        sentByName: null,
        receivedAtIso: null,
        receivedByName: null,
        returnedToOrdersAtIso: returnedAtIso,
        returnedToOrdersByName: actor.name,
        cancelledAtIso: null,
        cancelledByName: null,
        comment: `${candidate.comment}${candidate.comment ? " · " : ""}Envío devuelto a pedidos por ${actor.name}.`,
      } : candidate));
      toast.success(`${movement.folio} regresó a Pedidos de sucursales; el stock reservado volvió a bodega.`);
      return true;
    }
    reverseWarehouseMovement(movement);
    setWarehouseMovements((current) => current.map((candidate) => candidate.id === id ? {
      ...candidate,
      status: "CANCELLED",
      cancelledAtIso: new Date().toISOString(),
      cancelledByName: actor.name,
    } : candidate));
    toast.success(`${movement.folio} cancelado; inventarios revertidos.`);
    return true;
  };

  const deleteWarehouseMovement = (id: string, code: string) => {
    if (posApiEnabled) return cancelWarehouseMovement(id, code);
    const actor = warehouseAuthorizationActor(code);
    const movement = warehouseMovements.find((candidate) => candidate.id === id);
    if (!actor || !movement) {
      toast.error("Código sin permiso para borrar el movimiento.");
      return false;
    }
    if (!["DRAFT", "REQUESTED", "CANCELLED"].includes(movement.status)) reverseWarehouseMovement(movement);
    setWarehouseMovements((current) => current.filter((candidate) => candidate.id !== id));
    toast.success(`${movement.folio} eliminado por ${actor.name}; cualquier impacto fue revertido.`);
    return true;
  };

  const saveWarehouseCategory = (id: string | null, name: string) => {
    if (!canManageWarehouse) return false;
    const normalized = name.trim();
    if (!normalized || warehouseCategories.some((category) => category.id !== id && category.name.toLocaleLowerCase("es-MX") === normalized.toLocaleLowerCase("es-MX"))) {
      toast.error("El concepto ya existe o no es válido.");
      return false;
    }
    if (id) setWarehouseCategories((current) => current.map((category) => category.id === id ? { ...category, name: normalized } : category));
    else setWarehouseCategories((current) => [...current, { id: `warehouse-category-${crypto.randomUUID()}`, name: normalized, active: true, createdAtIso: new Date().toISOString() }]);
    toast.success(id ? "Concepto de almacén actualizado." : "Concepto de almacén agregado.");
    return true;
  };

  const toggleWarehouseCategory = (id: string) => {
    if (!canManageWarehouse) return;
    setWarehouseCategories((current) => current.map((category) => category.id === id ? { ...category, active: !category.active } : category));
  };

  const deleteWarehouseCategory = (id: string) => {
    if (!canManageWarehouse) return;
    const used = warehouseMovements.some((movement) => movement.categoryId === id);
    setWarehouseCategories((current) => used ? current.map((category) => category.id === id ? { ...category, active: false } : category) : current.filter((category) => category.id !== id));
    toast.success(used ? "Concepto inactivado; los históricos conservaron su nombre." : "Concepto eliminado.");
  };

  const toggleWarehouseSupplyVisibility = (id: string) => {
    if (!canManageWarehouse) return;
    setWarehouseSupplies((current) => current.map((supply) => supply.id === id
      ? { ...supply, branchVisible: !supply.branchVisible }
      : supply));
    toast.success("Visibilidad del insumo actualizada para nuevas solicitudes de sucursal.");
  };

  const saveWarehouseSupplier = (supplier: WarehouseSupplier) => {
    const folio = supplier.folio.trim().toLocaleUpperCase("es-MX");
    const rfc = supplier.rfc.trim().toLocaleUpperCase("es-MX");
    const duplicate = warehouseSuppliers.some((candidate) => candidate.id !== supplier.id && (candidate.folio === folio || candidate.rfc === rfc));
    if (!canManageWarehouse || !supplier.businessName.trim() || !folio || !rfc || duplicate) {
      toast.error(duplicate ? "El folio o RFC ya pertenece a otro proveedor." : "Completa razón social, folio y RFC del proveedor.");
      return false;
    }
    const exists = warehouseSuppliers.some((candidate) => candidate.id === supplier.id);
    const normalized = { ...supplier, folio, rfc, businessName: supplier.businessName.trim() };
    setWarehouseSuppliers((current) => exists ? current.map((candidate) => candidate.id === supplier.id ? normalized : candidate) : [normalized, ...current]);
    setWarehouseSupplies((current) => current.map((item) => item.supplierId === supplier.id ? { ...item, supplierName: normalized.businessName } : item));
    setCatalogProducts((current) => current.map((product) => product.supplierId === supplier.id ? { ...product, supplierName: normalized.businessName } : product));
    toast.success(exists ? "Proveedor y referencias actuales actualizados." : `${normalized.folio} registrado.`);
    return true;
  };

  const toggleWarehouseSupplier = (id: string) => {
    if (!canManageWarehouse) return;
    setWarehouseSuppliers((current) => current.map((supplier) => supplier.id === id ? { ...supplier, active: !supplier.active } : supplier));
  };

  const deleteWarehouseSupplier = (id: string) => {
    if (!canManageWarehouse) return;
    const used = warehouseSupplies.some((item) => item.supplierId === id) || catalogProducts.some((product) => product.supplierId === id) || warehouseMovements.some((movement) => movement.supplierId === id || movement.lines.some((line) => line.supplierId === id));
    setWarehouseSuppliers((current) => used ? current.map((supplier) => supplier.id === id ? { ...supplier, active: false } : supplier) : current.filter((supplier) => supplier.id !== id));
    toast.success(used ? "Proveedor inactivado; pedidos y productos conservaron su histórico." : "Proveedor eliminado.");
  };

  const saveWarehouseSupply = (item: WarehouseSupplyItem) => {
    const duplicate = warehouseSupplies.some((candidate) => candidate.id !== item.id && candidate.sku === item.sku) || catalogProducts.some((product) => product.sku === item.sku);
    const supplier = item.supplierId ? warehouseSuppliers.find((candidate) => candidate.id === item.supplierId) : null;
    if (!canManageWarehouse || !item.name.trim() || !item.sku.trim() || item.stockMax < item.stockMin || duplicate) {
      toast.error(duplicate ? "El SKU ya está registrado." : "Revisa nombre, SKU y límites de stock.");
      return false;
    }
    const exists = warehouseSupplies.some((candidate) => candidate.id === item.id);
    const normalized = { ...item, name: item.name.trim(), sku: item.sku.trim().toLocaleUpperCase("es-MX"), supplierName: supplier?.businessName ?? null };
    setWarehouseSupplies((current) => exists ? current.map((candidate) => candidate.id === item.id ? normalized : candidate) : [normalized, ...current]);
    if (!exists) {
      setWarehouseStock((current) => ({ ...current, [item.id]: 0 }));
      setWarehousePriceLists((current) => current.map((list) => ({ ...list, items: [...list.items, { productId: item.id, priceMxn: item.partnerCost, priceUsd: Math.round(item.costUsd * 1.22 * 100) / 100 }] })));
    }
    toast.success(exists ? "Producto de bodega actualizado en módulos actuales." : "Producto agregado a bodega con existencia inicial en cero.");
    return true;
  };

  const deleteWarehouseSupply = (id: string) => {
    if (!canManageWarehouse) return;
    const used = warehouseMovements.some((movement) => movement.lines.some((line) => line.productId === id));
    setWarehouseSupplies((current) => used ? current.map((item) => item.id === id ? { ...item, active: false, branchVisible: false } : item) : current.filter((item) => item.id !== id));
    if (!used) setWarehousePriceLists((current) => current.map((list) => ({ ...list, items: list.items.filter((price) => price.productId !== id) })));
    toast.success(used ? "Artículo inactivado; el historial permanece intacto." : "Artículo eliminado de bodega.");
  };

  const saveWarehousePriceList = (list: WarehousePriceList) => {
    const normalizedBranches = [...new Set(list.branchNames)].filter((branch) => operationalBranches.includes(branch));
    const normalizedClients = [...new Set(list.clientIds)].filter((id) => clients.some((client) => client.id === id));
    if (!canManageWarehouse || !list.name.trim() || normalizedBranches.length === 0 || list.items.length === 0 || list.items.some((item) => item.priceMxn < 0 || item.priceUsd < 0)) {
      toast.error("Revisa nombre, sucursales y precios de la lista.");
      return false;
    }
    const normalizedList = { ...list, name: list.name.trim(), branchNames: normalizedBranches, clientIds: normalizedClients };
    setWarehousePriceLists((current) => current.some((candidate) => candidate.id === list.id)
      ? current.map((candidate) => candidate.id === list.id ? normalizedList : candidate)
      : [normalizedList, ...current]);
    toast.success("Lista de precios guardada para nuevas solicitudes.");
    return true;
  };

  const toggleWarehousePriceList = (id: string) => {
    if (!canManageWarehouse) return;
    setWarehousePriceLists((current) => current.map((list) => list.id === id ? { ...list, active: !list.active } : list));
  };

  const deleteWarehousePriceList = (id: string) => {
    if (!canManageWarehouse) return;
    const used = warehouseMovements.some((movement) => movement.priceListId === id);
    setWarehousePriceLists((current) => used
      ? current.map((list) => list.id === id ? { ...list, active: false } : list)
      : current.filter((list) => list.id !== id));
    toast.success(used ? "Lista inactivada; los pedidos históricos conservaron sus precios." : "Lista de precios eliminada.");
  };

  const applyTerminalLocation = (branch: string) => {
    if (!branchInventory[branch]) return false;
    setActiveBranch(branch);
    setReceiptSettings((current) => ({
      ...current,
      branchName: `Sucursal ${branch}`,
      address:
        branchAddresses[branch] ?? "Dirección pendiente de configurar",
    }));
    if (!posApiEnabled) window.localStorage.setItem(terminalLocationStorageKey, branch);
    return true;
  };

  const openLocationSwitcher = () => {
    setLocationSwitchTarget(
      operationalBranches.find((branch) => branch !== activeBranch) ??
        activeBranch,
    );
    setLocationSwitchAlias(apiSession?.actor.isMaster ? apiSession.actor.alias : "");
    setLocationSwitchCode("");
    setLocationSwitchOpen(true);
  };

  const confirmLocationSwitch = async () => {
    if (posApiEnabled) {
      const target = apiBranches.find((branch) => branch.name === locationSwitchTarget);
      if (!apiSession || !target) {
        toast.error("Selecciona una sucursal operativa.");
        return;
      }
      try {
        const authorization = await posApi.createAuthorization({
          alias: locationSwitchAlias.trim(),
          pin: locationSwitchCode,
          purpose: "TERMINAL_BRANCH_CHANGE",
          entityType: "PosTerminal",
          entityId: apiSession.terminal.id,
        });
        await posApi.changeTerminalBranch(
          apiSession.terminal.id,
          target.id,
          authorization.authorizationToken,
        );
        posApi.clearSession();
        setApiSession(null);
        setApiPermissions([]);
        setSessionUser(null);
        setSessionStage("LOGIN");
        setLocationSwitchOpen(false);
        setLocationSwitchAlias("");
        setLocationSwitchCode("");
        toast.success("Sucursal actualizada. Inicia sesión nuevamente en la terminal.");
      } catch (error) {
        const response = error as { response?: { data?: { message?: string } } };
        toast.error(response.response?.data?.message ?? "No se pudo cambiar la sucursal de la terminal.");
      }
      return;
    }
    if (!isMasterAccessCode(locationSwitchCode)) {
      toast.error("Código incorrecto. Sólo el usuario master puede cambiar la ubicación.");
      return;
    }
    if (!locationSwitchTarget || !branchInventory[locationSwitchTarget]) {
      toast.error("Selecciona una sucursal operativa.");
      return;
    }
    if (locationSwitchTarget === activeBranch) {
      toast.info(`${activeBranch} ya es la ubicación fija de esta computadora.`);
      setLocationSwitchOpen(false);
      setLocationSwitchCode("");
      return;
    }
    const previousBranch = activeBranch;
    if (!applyTerminalLocation(locationSwitchTarget)) return;
    setLocationSwitchOpen(false);
    setLocationSwitchCode("");
    toast.success(
      `Terminal 01 cambió de ${previousBranch} a ${locationSwitchTarget}. La ubicación quedó fija en esta computadora.`,
    );
  };

  useEffect(() => {
    if (branchInventory[activeBranch]) return;
    const fallbackBranch = Object.keys(branchInventory)[0];
    if (fallbackBranch) applyTerminalLocation(fallbackBranch);
  }, [activeBranch, branchInventory]);

  useEffect(() => {
    const clockInterval = window.setInterval(() => setSyncClock(Date.now()), 1_000);
    return () => window.clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (
      !isOnline ||
      sessionDataSync.updating ||
      syncClock < sessionDataSync.nextUpdateAt
    )
      return;
    setSessionDataSync((current) => ({ ...current, updating: true }));
  }, [isOnline, sessionDataSync.nextUpdateAt, sessionDataSync.updating, syncClock]);

  useEffect(() => {
    if (!sessionDataSync.updating) return;
    const updateTimeout = window.setTimeout(() => {
      const completedAt = Date.now();
      setSessionDataSync((current) => ({
        ...current,
        lastUpdatedAt: completedAt,
        nextUpdateAt: completedAt + automaticDataUpdateIntervalMs,
        updating: false,
        revision: current.revision + 1,
      }));
      setSyncClock(completedAt);
    }, 850);
    return () => window.clearTimeout(updateTimeout);
  }, [sessionDataSync.updating]);

  const requestSessionDataSync = () => {
    if (!isOnline) {
      setConnectivityNotice({
        kind: "OFFLINE",
        title: "Sin conexión para sincronizar",
        description:
          "Los datos permanecen seguros en esta terminal. La sincronización comenzará automáticamente cuando vuelva internet.",
        pendingCount: tickets.filter(
          (ticket) => ticket.syncStatus === "PENDING_SYNC",
        ).length,
      });
      return;
    }
    if (posApiEnabled && offlineBootstrap && !offlineSyncingRef.current) {
      offlineSyncingRef.current = true;
      void syncOfflineOperations(
        offlineBootstrap,
        posApi.pushOfflineOperations,
      ).then(async (result) => {
        setOfflineBootstrap((current) => current ? { ...current, nextSequence: result.nextSequence } : current);
        setOfflineQueue(await offlineQueueStatus({ ...offlineBootstrap, nextSequence: result.nextSequence }));
        setTickets((current) => current.map((ticket) => {
          const synced = result.results.find((item) => item.id === ticket.backendId && item.status === "SYNCED");
          return synced ? { ...ticket, backendId: synced.serverEntityId ?? ticket.backendId!, syncStatus: "SYNCED", syncedAtIso: new Date().toISOString() } : ticket;
        }));
      }).catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "No fue posible sincronizar la terminal.");
      }).finally(() => {
        offlineSyncingRef.current = false;
      });
    }
    setSessionDataSync((current) =>
      current.updating ? current : { ...current, updating: true },
    );
  };

  useEffect(() => {
    if (posApiEnabled) return;
    const pendingTickets = tickets.filter(
      (ticket) => ticket.syncStatus === "PENDING_SYNC",
    );
    if (pendingTickets.length === 0) {
      window.localStorage.removeItem(offlineTicketQueueStorageKey);
      return;
    }
    window.localStorage.setItem(
      offlineTicketQueueStorageKey,
      JSON.stringify(pendingTickets),
    );
  }, [tickets]);

  useEffect(() => {
    if (previousOnlineState.current === isOnline) return;
    previousOnlineState.current = isOnline;
    if (!sessionUser) return;
    const pendingCount = posApiEnabled
      ? offlineQueue.filter((entry) => entry.status !== "SYNCED").length
      : tickets.filter((ticket) => ticket.syncStatus === "PENDING_SYNC").length;
    if (posApiEnabled && !isOnline) setOperatingOffline(true);
    if (posApiEnabled && isOnline && window.sessionStorage.getItem("pos_access_token")) {
      setOperatingOffline(false);
    }
    setConnectivityNotice(
      isOnline
        ? {
            kind: "ONLINE",
            title: "Conexión recuperada",
            description:
              pendingCount > 0
                ? `Internet volvió. El sistema está enviando ${pendingCount} ticket${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}.`
                : "Internet volvió y la terminal está operando en línea.",
            pendingCount,
          }
        : {
            kind: "OFFLINE",
            title: "Conexión interrumpida",
            description:
              "El POS cambió a modo offline. Puedes seguir vendiendo y los nuevos tickets se sincronizarán automáticamente después.",
            pendingCount,
          },
    );
  }, [isOnline, offlineBootstrap, offlineQueue, sessionUser, tickets]);

  useEffect(() => {
    if (!isOnline || !sessionUser) return;
    if (posApiEnabled) {
      if (
        !offlineBootstrap ||
        offlineSyncingRef.current ||
        !offlineQueue.some((entry) => ["PENDING", "ERROR", "SYNCING"].includes(entry.status))
      ) return;
      offlineSyncingRef.current = true;
      void syncOfflineOperations(offlineBootstrap, posApi.pushOfflineOperations)
        .then(async (result) => {
          const nextBootstrap = { ...offlineBootstrap, nextSequence: result.nextSequence };
          setOfflineBootstrap(nextBootstrap);
          const queue = await offlineQueueStatus(nextBootstrap);
          setOfflineQueue(queue);
          if (result.results.length > 0) {
            setTickets((current) => current.map((ticket) => {
              const synced = result.results.find((item) => item.id === ticket.backendId && item.status === "SYNCED");
              return synced ? { ...ticket, backendId: synced.serverEntityId ?? ticket.backendId!, syncStatus: "SYNCED", syncedAtIso: new Date().toISOString() } : ticket;
            }));
          }
          const conflicts = queue.filter((entry) => entry.status === "CONFLICT");
          setConnectivityNotice({
            kind: conflicts.length ? "OFFLINE" : "SYNCED",
            title: conflicts.length ? "Sincronización con conflictos" : "Operaciones sincronizadas",
            description: conflicts.length
              ? `${conflicts.length} operación${conflicts.length === 1 ? " requiere" : "es requieren"} revisión y permanece protegida localmente.`
              : `${result.results.filter((item) => item.status === "SYNCED").length} operación${result.results.length === 1 ? " fue conciliada" : "es fueron conciliadas"} con el servidor.`,
            pendingCount: queue.length,
          });
          if (window.sessionStorage.getItem("pos_access_token")) setOperatingOffline(false);
        })
        .catch(() => undefined)
        .finally(() => {
          offlineSyncingRef.current = false;
        });
      return;
    }
    const pendingTickets = tickets.filter(
      (ticket) => ticket.syncStatus === "PENDING_SYNC",
    );
    if (pendingTickets.length === 0) return;
    const syncedAtIso = new Date().toISOString();
    setTickets((current) =>
      current.map((ticket) =>
        ticket.syncStatus === "PENDING_SYNC"
          ? { ...ticket, syncStatus: "SYNCED", syncedAtIso }
          : ticket,
      ),
    );
    setSessionDataSync((current) => ({ ...current, updating: true }));
    setConnectivityNotice({
      kind: "SYNCED",
      title: "Tickets sincronizados",
      description: `${pendingTickets.length} ticket${pendingTickets.length === 1 ? " local fue enviado" : "s locales fueron enviados"} correctamente al sistema.`,
      pendingCount: 0,
    });
  }, [isOnline, offlineBootstrap, offlineQueue, sessionUser]);

  const renderConnectivityNotice = () => {
    const ConnectivityIcon =
      connectivityNotice?.kind === "OFFLINE" ? WifiOff : Wifi;
    return (
      <Dialog
        open={Boolean(connectivityNotice)}
        onOpenChange={(open) => {
          if (!open) setConnectivityNotice(null);
        }}
      >
        <DialogContent className="connectivity-dialog sm:max-w-[520px]">
          <DialogHeader className="dialog-header connectivity-dialog-header">
            <div
              className={`connectivity-dialog-icon is-${(connectivityNotice?.kind ?? "ONLINE").toLocaleLowerCase("en-US")}`}
            >
              <ConnectivityIcon size={25} />
            </div>
            <div>
              <span className="section-kicker">
                {connectivityNotice?.kind === "OFFLINE"
                  ? "OPERACIÓN LOCAL SEGURA"
                  : connectivityNotice?.kind === "SYNCED"
                    ? "SINCRONIZACIÓN COMPLETADA"
                    : "CONEXIÓN DISPONIBLE"}
              </span>
              <DialogTitle>{connectivityNotice?.title}</DialogTitle>
              <DialogDescription>
                {connectivityNotice?.description}
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="connectivity-dialog-summary">
            <span>
              <CheckCircle2 size={16} /> Acceso al sistema disponible
            </span>
            <span>
              <CheckCircle2 size={16} /> Venta y creación de tickets disponible
            </span>
            <span>
              {connectivityNotice?.kind === "OFFLINE" ? (
                <WifiOff size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              {connectivityNotice?.kind === "OFFLINE"
                ? "Sincronización automática en espera"
                : "Sincronización automática activa"}
            </span>
          </div>
          {connectivityNotice?.kind === "OFFLINE" && (
            <div className="connectivity-dialog-queue">
              <strong>{connectivityNotice.pendingCount}</strong>
              <span>
                {connectivityNotice.pendingCount === 1
                  ? "ticket pendiente en esta terminal"
                  : "tickets pendientes en esta terminal"}
              </span>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setConnectivityNotice(null)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const masterSessionActive =
    myAccountAuthorized ||
    costAccessAuthorized ||
    receiptHistoryAuthorized ||
    xReportAuthorized ||
    paymentSettingsAuthorized ||
    competitionSettingsAuthorized ||
    dealAccessAuthorized ||
    employeeAccessAuthorized;

  useEffect(() => {
    if (!masterSessionActive) return;
    let inactivityTimer = window.setTimeout(() => undefined, 0);
    const lockProtectedModules = () => {
      setMyAccountAuthorized(false);
      setCostAccessAuthorized(false);
      setReceiptHistoryAuthorized(false);
      setReceiptDate("");
      setReceiptBranch("ALL");
      setReceiptSearch("");
      setXReportAuthorized(false);
      setXReportAccessCode("");
      setPaymentSettingsAuthorized(false);
      setPaymentSettingsOpen(false);
      setPaymentSettingsCode("");
      setCompetitionSettingsAuthorized(false);
      setCompetitionSettingsOpen(false);
      setDealAccessAuthorized(false);
      setEmployeeAccessAuthorized(false);
      toast.info("Los módulos master se bloquearon por 3 minutos de inactividad.");
    };
    const restartTimer = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(lockProtectedModules, 180_000);
    };
    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, restartTimer, { passive: true }),
    );
    restartTimer();
    return () => {
      window.clearTimeout(inactivityTimer);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, restartTimer),
      );
    };
  }, [masterSessionActive]);

  const authorizeDealAccess = (code: string) => {
    const authorized = isMasterAccessCode(code);
    if (authorized) setDealAccessAuthorized(true);
    return authorized;
  };

  const reloadPosAccess = async () => {
    const access = accessFromDto(await posApi.accessBootstrap());
    setEmployeeRoles(access.roles);
    setSellers(access.sellers);
  };

  const authorizeEmployeeAccess = async (code: string, masterAlias?: string) => {
    if (posApiEnabled) {
      if (!apiSession) return false;
      try {
        const authorization = await posApi.createAuthorization({
          alias: masterAlias?.trim() ?? "",
          pin: code,
          purpose: "EMPLOYEES_ACCESS",
        });
        const authorized = await posApi.verifyAuthorization(
          authorization.authorizationToken,
          "EMPLOYEES_ACCESS",
        );
        if (authorized) setEmployeeAccessAuthorized(true);
        return authorized;
      } catch {
        return false;
      }
    }
    const authorized = isMasterAccessCode(code);
    if (authorized) setEmployeeAccessAuthorized(true);
    return authorized;
  };

  const saveEmployeeRole = async (role: EmployeeRole, masterCode?: string, masterAlias?: string) => {
    if (posApiEnabled) {
      if (!apiSession || !masterCode || !masterAlias) return false;
      try {
        const authorization = await posApi.createAuthorization({
          alias: masterAlias,
          pin: masterCode,
          purpose: "POSITION_PERMISSIONS_UPDATE",
          entityType: "Position",
          entityId: role.id,
        });
        await posApi.updateRolePermissions(
          role.id,
          roleToPermissions(role),
          authorization.authorizationToken,
        );
        await reloadPosAccess();
        return true;
      } catch (error) {
        const response = error as { response?: { data?: { message?: string } } };
        toast.error(response.response?.data?.message ?? "No se pudieron actualizar los permisos POS.");
        return false;
      }
    }
    setEmployeeRoles((current) =>
      current.some((candidate) => candidate.id === role.id)
        ? current.map((candidate) =>
            candidate.id === role.id ? role : candidate,
          )
        : [...current, role],
    );
    setSellers((current) =>
      current.map((seller) =>
        seller.roleId === role.id
          ? {
              ...seller,
              canViewCosts:
                role.configurationAccess.includes("REPORTS_COSTS"),
            }
          : seller,
      ),
    );
    return true;
  };

  const saveEmployeeSeller = async (seller: Seller, masterCode?: string, masterAlias?: string) => {
    const name = seller.name.trim();
    const alias = seller.alias.trim().toLocaleLowerCase("es-MX");
    const accessCode = seller.accessCode.trim();
    if (!name) {
      toast.error("Captura el nombre que aparecerá en el ticket.");
      return false;
    }
    if (!/^[a-z0-9._-]{3,24}$/i.test(alias)) {
      toast.error("El alias debe tener de 3 a 24 caracteres sin espacios.");
      return false;
    }
    if (posApiEnabled) {
      if (!apiSession || !masterCode || !masterAlias) return false;
      if (accessCode && !/^\d{4,12}$/.test(accessCode)) {
        toast.error("El código personal debe contener entre 4 y 12 dígitos.");
        return false;
      }
      try {
        const authorization = await posApi.createAuthorization({
          alias: masterAlias,
          pin: masterCode,
          purpose: "EMPLOYEE_CREDENTIAL_UPDATE",
          entityType: "Empleado",
          entityId: seller.id,
        });
        await posApi.updateEmployeeCredential(seller.id, {
          alias,
          ...(accessCode ? { pin: accessCode } : {}),
          active: seller.active,
          offlineEnabled: false,
          isMaster: Boolean(seller.masterAccessCode),
          authorizationToken: authorization.authorizationToken,
        });
        await reloadPosAccess();
        return true;
      } catch (error) {
        const response = error as { response?: { data?: { message?: string } } };
        toast.error(response.response?.data?.message ?? "No se pudo actualizar la credencial POS.");
        return false;
      }
    }
    if (
      sellers.some(
        (candidate) =>
          candidate.id !== seller.id &&
          candidate.alias.toLocaleLowerCase("es-MX") === alias,
      )
    ) {
      toast.error("Ese alias ya pertenece a otro vendedor.");
      return false;
    }
    if (!/^\d{4}$/.test(accessCode)) {
      toast.error("El código personal debe contener exactamente 4 dígitos.");
      return false;
    }
    if (
      accessCode === administratorCode ||
      sellers.some(
        (candidate) =>
          candidate.id !== seller.id &&
          (candidate.accessCode === accessCode ||
            candidate.masterAccessCode === accessCode),
      )
    ) {
      toast.error("El código personal ya está asignado.");
      return false;
    }
    const role = seller.roleId
      ? employeeRoles.find(
          (candidate) => candidate.id === seller.roleId && candidate.active,
        )
      : null;
    if (seller.roleId && (!role || role.system)) {
      toast.error("Selecciona un rol activo válido para el vendedor.");
      return false;
    }
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase("es-MX") ?? "")
      .join("");
    const normalizedSeller: Seller = {
      ...seller,
      name,
      alias,
      accessCode,
      initials: initials || "VE",
      canViewCosts: role?.configurationAccess.includes("REPORTS_COSTS") ?? false,
    };
    setSellers((current) =>
      current.some((candidate) => candidate.id === seller.id)
        ? current.map((candidate) =>
            candidate.id === seller.id ? normalizedSeller : candidate,
          )
        : [...current, normalizedSeller],
    );
    return true;
  };

  const saveCurrentSellerAccess = (input: {
    sellerId: string;
    currentCode: string;
    alias: string;
    newCode: string;
  }): string | null => {
    const seller = sellers.find(
      (candidate) => candidate.id === input.sellerId && candidate.active,
    );
    if (!seller || seller.id !== sessionUser?.id) {
      return "La sesión no está ligada a un vendedor activo.";
    }
    if (seller.accessCode !== input.currentCode.trim()) {
      return "La contraseña personal actual es incorrecta.";
    }
    const alias = input.alias.trim().toLocaleLowerCase("es-MX");
    if (!/^[a-z0-9._-]{3,24}$/i.test(alias)) {
      return "El alias debe tener de 3 a 24 caracteres válidos y no puede contener espacios.";
    }
    if (
      sellers.some(
        (candidate) =>
          candidate.id !== seller.id &&
          candidate.alias.toLocaleLowerCase("es-MX") === alias,
      )
    ) {
      return "Ese alias ya pertenece a otro vendedor.";
    }
    const requestedCode = input.newCode.trim();
    const nextAccessCode = requestedCode || seller.accessCode;
    if (requestedCode && !/^\d{4}$/.test(requestedCode)) {
      return "La nueva contraseña debe contener exactamente 4 dígitos.";
    }
    if (
      requestedCode &&
      (requestedCode === administratorCode ||
        sellers.some(
          (candidate) =>
            candidate.id !== seller.id &&
            (candidate.accessCode === requestedCode ||
              candidate.masterAccessCode === requestedCode),
        ))
    ) {
      return "La nueva contraseña ya está asignada a otro acceso.";
    }
    setSellers((current) =>
      current.map((candidate) =>
        candidate.id === seller.id
          ? { ...candidate, alias, accessCode: nextAccessCode }
          : candidate,
      ),
    );
    return null;
  };

  const toggleEmployeeRole = (roleId: string) => {
    const role = employeeRoles.find((candidate) => candidate.id === roleId);
    if (!role || role.system) return;
    if (
      role.active &&
      sellers.some((seller) => seller.active && seller.roleId === roleId)
    ) {
      toast.error(
        "Reasigna a los empleados activos antes de inactivar este rol.",
      );
      return;
    }
    setEmployeeRoles((current) =>
      current.map((candidate) =>
        candidate.id === roleId
          ? { ...candidate, active: !candidate.active }
          : candidate,
      ),
    );
  };

  const assignEmployeeRole = (sellerId: string, roleId: string) => {
    const role = employeeRoles.find(
      (candidate) =>
        candidate.id === roleId && candidate.active && !candidate.system,
    );
    if (!role) {
      toast.error("El rol seleccionado no está disponible.");
      return;
    }
    setSellers((current) =>
      current.map((seller) =>
        seller.id === sellerId
          ? {
              ...seller,
              roleId,
              canViewCosts:
                role.configurationAccess.includes("REPORTS_COSTS"),
            }
          : seller,
      ),
    );
    const seller = sellers.find((candidate) => candidate.id === sellerId);
    toast.success(
      `${seller?.name ?? "Empleado"} ahora tiene el rol ${role.name}.`,
    );
  };

  const setEmployeeMasterAccess = (
    sellerIds: string[],
    code: string | null,
  ) => {
    const selected = new Set(sellerIds);
    if (selected.size === 0) return false;
    if (code !== null) {
      if (!/^\d{4}$/.test(code)) {
        toast.error("El código master debe contener exactamente 4 dígitos.");
        return false;
      }
      if (code === administratorCode) {
        toast.error("Usa un código delegado diferente al código principal de Master Keysar.");
        return false;
      }
      if (sellers.some((seller) => seller.accessCode === code)) {
        toast.error("El código coincide con una clave personal de asistencia. Elige otro.");
        return false;
      }
    }
    if (
      sellers.some(
        (seller) => selected.has(seller.id) && !seller.active,
      )
    ) {
      toast.error("No se puede asignar acceso master a un empleado de baja.");
      return false;
    }
    setSellers((current) =>
      current.map((seller) =>
        selected.has(seller.id)
          ? { ...seller, masterAccessCode: code }
          : seller,
      ),
    );
    return true;
  };

  const saveDeal = (deal: RetailDeal) => {
    setDeals((current) =>
      current.some((candidate) => candidate.id === deal.id)
        ? current.map((candidate) => (candidate.id === deal.id ? deal : candidate))
        : [deal, ...current],
    );
  };

  const publishDeal = (dealId: string, code: string) => {
    if (!isMasterAccessCode(code)) return false;
    const deal = deals.find((candidate) => candidate.id === dealId);
    if (!deal) return false;
    const costTotal = deal.lines.reduce((sum, line) => {
      const product = catalogProducts.find((candidate) => candidate.id === line.productId);
      return sum + (product?.costMxn ?? 0) * line.quantity;
    }, 0);
    if (deal.price < costTotal || deal.lines.length < 2) return false;
    setDeals((current) =>
      current.map((candidate) =>
        candidate.id === dealId
          ? {
              ...candidate,
              status: "PUBLISHED",
              publishedAtIso: new Date().toISOString(),
              authorizedBy: masterUser.name,
            }
          : candidate,
      ),
    );
    return true;
  };

  const deactivateDeal = (dealId: string) => {
    setDeals((current) =>
      current.map((deal) =>
        deal.id === dealId ? { ...deal, status: "INACTIVE" } : deal,
      ),
    );
    toast.info("Paquete inactivado. Los tickets históricos conservaron su registro.");
  };

  const authorizeCompetitionSettings = (code: string) => {
    const authorized = isMasterAccessCode(code);
    if (authorized) setCompetitionSettingsAuthorized(true);
    return authorized;
  };

  const competitionFromApi = (competition: PosSalesCompetitionDto): SalesCompetition => ({
    id: competition.id,
    name: competition.name,
    type: competition.type,
    active: competition.active,
    dateFrom: competition.dateFrom,
    dateTo: competition.dateTo,
    branch: apiBranches.find((branch) => branch.id === competition.branchId)?.name ?? "Todas",
    targetAmount: competition.targetAmount === null ? null : Number(competition.targetAmount),
    productId: competition.itemId,
    packageProductIds: competition.packageItemIds,
    createdAtIso: competition.creadoEn,
  });

  const competitionToApi = (competition: SalesCompetition) => ({
    name: competition.name,
    type: competition.type,
    active: competition.active,
    dateFrom: competition.dateFrom,
    dateTo: competition.dateTo,
    branchId: apiBranches.find((branch) => branch.name === competition.branch)?.id ?? null,
    targetAmount: competition.targetAmount === null ? null : competition.targetAmount.toFixed(2),
    itemId: competition.productId,
    packageItemIds: competition.packageProductIds,
  });

  const saveCompetition = (competition: SalesCompetition) => {
    if (posApiEnabled) {
      const request = competitions.some((candidate) => candidate.id === competition.id)
        ? posApi.updateCompetition(competition.id, competitionToApi(competition))
        : posApi.createCompetition(competitionToApi(competition));
      void request.then((saved) => {
        const normalized = competitionFromApi(saved);
        setCompetitions((current) => current.some((candidate) => candidate.id === competition.id)
          ? current.map((candidate) => candidate.id === competition.id ? normalized : candidate)
          : [normalized, ...current]);
        toast.success("Competencia guardada en el servidor.");
      }).catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la competencia.");
      });
      return;
    }
    setCompetitions((current) =>
      current.some((candidate) => candidate.id === competition.id)
        ? current.map((candidate) =>
            candidate.id === competition.id ? competition : candidate,
          )
        : [competition, ...current],
    );
  };

  const toggleCompetition = (competitionId: string) => {
    if (posApiEnabled) {
      const competition = competitions.find((candidate) => candidate.id === competitionId);
      if (!competition) return;
      const next = { ...competition, active: !competition.active };
      void posApi.updateCompetition(competitionId, competitionToApi(next)).then((saved) => {
        const normalized = competitionFromApi(saved);
        setCompetitions((current) => current.map((candidate) => candidate.id === competitionId ? normalized : candidate));
      }).catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar la competencia.");
      });
      return;
    }
    setCompetitions((current) =>
      current.map((competition) =>
        competition.id === competitionId
          ? { ...competition, active: !competition.active }
          : competition,
      ),
    );
  };

  const deleteCompetition = (competitionId: string) => {
    if (posApiEnabled) {
      void posApi.deleteCompetition(competitionId).then(() => {
        setCompetitions((current) => current.filter((competition) => competition.id !== competitionId));
        toast.success("Competencia inactivada en el servidor.");
      }).catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "No se pudo inactivar la competencia.");
      });
      return;
    }
    setCompetitions((current) =>
      current.filter((competition) => competition.id !== competitionId),
    );
    toast.success("Competencia eliminada de la configuración mock.");
  };

  const paymentLabel = (methodId: string) =>
    paymentMethods.find((method) => method.id === methodId)?.label ?? methodId;

  const formatAttendanceTime = (date: Date) =>
    new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Mexico_City",
    }).format(date);

  const clockInSeller = async (accessCode: string, branch: string): Promise<boolean> => {
    if (posApiEnabled) {
      try {
        const attendance = await posApi.clockIn(accessCode);
        const record = attendanceFromDto(attendance);
        setAttendanceRecords((current) =>
          current.some((candidate) => candidate.id === record.id)
            ? current
            : [record, ...current],
        );
        toast.success(`${record.sellerName} registró entrada en ${record.branch}.`);
        return true;
      } catch (error) {
        const response = error as { response?: { data?: { message?: string } }; message?: string };
        toast.error(response.response?.data?.message ?? response.message ?? "No se pudo registrar la entrada.");
        return false;
      }
    }
    const seller = sellers.find(
      (candidate) =>
        candidate.active && candidate.accessCode === accessCode,
    );
    if (!seller) {
      toast.error("Código de vendedor incorrecto o inactivo.");
      return false;
    }
    if (
      attendanceRecords.some(
        (record) =>
          record.sellerId === seller.id && record.status === "ONLINE",
      )
    ) {
      toast.info(`${seller.name} ya se encuentra ONLINE.`);
      return false;
    }
    const clockInDate = new Date();
    const record: AttendanceRecord = {
      id: `attendance-${crypto.randomUUID()}`,
      sellerId: seller.id,
      sellerName: seller.name,
      sellerInitials: seller.initials,
      branch,
      clockInAt: formatAttendanceTime(clockInDate),
      clockInAtIso: clockInDate.toISOString(),
      clockOutAt: null,
      clockOutAtIso: null,
      status: "ONLINE",
      clockOutReason: null,
    };
    setAttendanceRecords((current) => [record, ...current]);
    pushOperationalNotification({
      type: "CLOCK_IN",
      title: `Clock In · ${seller.name}`,
      detail: `Entrada registrada a las ${record.clockInAt} en ${branch}.`,
      moduleLabel: "Clock In",
      branch,
      actorId: seller.id,
      actorName: seller.name,
      reference: record.id,
      createdAtIso: record.clockInAtIso,
    });
    toast.success(`${seller.name} registró entrada en ${branch}.`);
    return true;
  };

  const clockOutSeller = async (recordId: string) => {
    if (posApiEnabled) {
      try {
        const attendance = await posApi.clockOut(recordId);
        const record = attendanceFromDto(attendance);
        setAttendanceRecords((current) => current.map((candidate) => candidate.id === record.id ? record : candidate));
        toast.success(`${record.sellerName} registró su salida.`);
      } catch (error) {
        const response = error as { response?: { data?: { message?: string } }; message?: string };
        toast.error(response.response?.data?.message ?? response.message ?? "No se pudo registrar la salida.");
      }
      return;
    }
    const record = attendanceRecords.find(
      (candidate) =>
        candidate.id === recordId && candidate.status === "ONLINE",
    );
    if (!record) return;
    const clockOutDate = new Date();
    setAttendanceRecords((current) =>
      current.map((candidate) =>
        candidate.id === recordId
          ? {
              ...candidate,
              clockOutAt: formatAttendanceTime(clockOutDate),
              clockOutAtIso: clockOutDate.toISOString(),
              status: "OFFLINE",
              clockOutReason: "MANUAL",
            }
          : candidate,
      ),
    );
    toast.success(`${record.sellerName} registró su salida.`);
  };

  const completeCloseDay = (authorizedBy: { id: string; name: string }) => {
    const onlineCount = attendanceRecords.filter(
      (record) => record.status === "ONLINE",
    ).length;
    const clockOutDate = new Date();
    if (onlineCount > 0) {
      setAttendanceRecords((current) =>
        current.map((record) =>
          record.status === "ONLINE"
            ? {
                ...record,
                clockOutAt: formatAttendanceTime(clockOutDate),
                clockOutAtIso: clockOutDate.toISOString(),
                status: "OFFLINE",
                clockOutReason: "CLOSE_DAY",
              }
            : record,
        ),
      );
    }
    const closeDayTickets = tickets.filter(
      (ticket) =>
        ticket.status === "COMPLETED" &&
        ticket.ticketType !== "LAYAWAY_PAYMENT" &&
        (ticket.branchName ?? receiptSettings.branchName) === activeBranch &&
        operationalBusinessDate(ticket.createdAtIso) ===
          operationalBusinessDate(clockOutDate.toISOString()),
    );
    const closeDaySalesTotal = closeDayTickets.reduce(
      (sum, ticket) => sum + ticket.total,
      0,
    );
    const closeDayDate = operationalBusinessDate(clockOutDate.toISOString());
    const closeDayMonth = closeDayDate.slice(0, 7);
    const [closeYear, closeMonthNumber, closeDayNumber] = closeDayDate
      .split("-")
      .map(Number);
    const isLastCalendarDay =
      closeDayNumber ===
      new Date(closeYear ?? 0, closeMonthNumber ?? 1, 0).getDate();
    const branchMonthlySales = tickets
      .filter(
        (ticket) =>
          ticket.status === "COMPLETED" &&
          ticket.ticketType !== "LAYAWAY_PAYMENT" &&
          (ticket.branchName ?? receiptSettings.branchName) === activeBranch,
      )
      .reduce<Map<string, number>>((summary, ticket) => {
        const month = operationalBusinessDate(ticket.createdAtIso).slice(0, 7);
        summary.set(month, (summary.get(month) ?? 0) + ticket.total);
        return summary;
      }, new Map());
    const currentMonthSales = branchMonthlySales.get(closeDayMonth) ?? 0;
    const historicMonthlySalesRecord = Math.max(
      0,
      ...Array.from(branchMonthlySales.entries())
        .filter(([month]) => month < closeDayMonth)
        .map(([, amount]) => amount),
    );
    const closeDayExpenseTotal = cashExpenses
      .filter(
        (expense) =>
          expense.status === "ACTIVE" &&
          expense.branch === activeBranch &&
          expense.expenseDate === operationalBusinessDate(clockOutDate.toISOString()),
      )
      .reduce((sum, expense) => sum + expense.amount, 0);
    pushOperationalNotification({
      type: "CLOSE_DAY",
      title: `Corte realizado · ${activeBranch}`,
      detail: `${closeDayTickets.length} tickets · Venta ${formatCurrency(closeDaySalesTotal)} · Gastos ${formatCurrency(closeDayExpenseTotal)} · Neto ${formatCurrency(closeDaySalesTotal - closeDayExpenseTotal)}.`,
      moduleLabel: "Close day",
      branch: activeBranch,
      actorId: authorizedBy.id,
      actorName: authorizedBy.name,
      reference: `CLOSE-${Date.now().toString(36).toUpperCase()}`,
      createdAtIso: clockOutDate.toISOString(),
    });
    toast.success(
      onlineCount > 0
        ? `Cierre realizado por ${authorizedBy.name} a las ${formatAttendanceTime(clockOutDate)}. ${onlineCount} vendedor${onlineCount === 1 ? "" : "es"} ${onlineCount === 1 ? "quedó" : "quedaron"} OFFLINE.`
        : `Cierre realizado por ${authorizedBy.name} a las ${formatAttendanceTime(clockOutDate)}. No había vendedores ONLINE.`,
    );
    if (
      isLastCalendarDay &&
      historicMonthlySalesRecord > 0 &&
      currentMonthSales > historicMonthlySalesRecord
    ) {
      toast.success(
        `¡FELICIDADES! ${activeBranch} superó su récord mensual: ${formatCurrency(currentMonthSales)} frente a ${formatCurrency(historicMonthlySalesRecord)}.`,
      );
    }
    setDaySession((current) =>
      current
        ? {
            ...current,
            status: "CLOSED",
            closedAtIso: clockOutDate.toISOString(),
            closedById: authorizedBy.id,
            closedByName: authorizedBy.name,
          }
        : current,
    );
    setSessionUser(null);
    setApiSession(null);
    setApiPermissions([]);
    if (posApiEnabled) posApi.clearSession();
    if (posApiEnabled) void window.electronAPI?.posOfflineLogout();
    setOperatingOffline(false);
    setSessionStage("LOGIN");
    setActiveScreen("sale");
    setSidebarCollapsed(false);
    setCloseDayAuthorizationOpen(false);
    setCloseDayAuthorizationUser("");
    setCloseDayAuthorizationCode("");
    setCloseDayAuthorizationError("");
  };

  const authorizeCloseDay = () => {
    if (posApiEnabled) {
      if (!daySession) {
        setCloseDayAuthorizationError("No hay una jornada abierta para cerrar.");
        return;
      }
      if (operatingOffline) {
        if (!offlineBootstrap) {
          setCloseDayAuthorizationError("No existe una autorización offline vigente en esta terminal.");
          return;
        }
        void loginPos(
          closeDayAuthorizationUser.trim(),
          closeDayAuthorizationCode.trim(),
        ).then(async (login) => {
          if (!login.offline || !login.session.actor.isMaster || !login.bootstrap) {
            throw new Error("El cierre offline requiere una credencial master habilitada previamente.");
          }
          setOfflineBootstrap(login.bootstrap);
          await enqueueOfflineOperation({
            kind: "BUSINESS_DAY_CLOSE",
            entityId: daySession.id,
            payload: {},
          }, login.bootstrap);
          setOfflineQueue(await offlineQueueStatus(login.bootstrap));
          completeCloseDay({ id: login.session.actor.id, name: login.session.actor.displayName });
        }).catch((error: unknown) => {
          setCloseDayAuthorizationError(error instanceof Error ? error.message : "No se pudo autorizar el cierre offline.");
        });
        return;
      }
      void posApi.createAuthorization({
        alias: closeDayAuthorizationUser.trim(),
        pin: closeDayAuthorizationCode.trim(),
        purpose: "BUSINESS_DAY_CLOSE",
        entityType: "PosBusinessDay",
        entityId: daySession.id,
      }).then((authorization) =>
        posApi.closeBusinessDay(daySession.id, authorization.authorizationToken),
      ).then((day) => {
        completeCloseDay({ id: "pos-close", name: day.closedByName ?? closeDayAuthorizationUser.trim() });
      }).catch((error: unknown) => {
        const response = error as { response?: { data?: { message?: string } }; message?: string };
        setCloseDayAuthorizationError(response.response?.data?.message ?? response.message ?? "No se pudo cerrar la jornada.");
      });
      return;
    }
    const normalizedUser = closeDayAuthorizationUser
      .trim()
      .toLocaleLowerCase("es-MX");
    const code = closeDayAuthorizationCode.trim();
    const isMasterIdentity =
      normalizedUser === "master" ||
      normalizedUser === masterUser.id.toLocaleLowerCase("es-MX") ||
      normalizedUser === masterUser.name.toLocaleLowerCase("es-MX");
    if (isMasterIdentity && isMasterAccessCode(code)) {
      completeCloseDay({ id: masterUser.id, name: masterUser.name });
      return;
    }
    const seller = sellers.find(
      (candidate) =>
        candidate.active &&
        [candidate.alias].some(
          (value) => value.toLocaleLowerCase("es-MX") === normalizedUser,
        ) &&
        (candidate.accessCode === code || candidate.masterAccessCode === code),
    );
    if (!seller) {
      setCloseDayAuthorizationError("Usuario o clave incorrectos. El corte no fue registrado.");
      return;
    }
    completeCloseDay({ id: seller.id, name: seller.name });
  };

  const updateClientRecord = (updatedClient: Client) => {
    const previousClient = clients.find((client) => client.id === updatedClient.id);
    if (!previousClient) return;
    const previousName = `${previousClient.firstName} ${previousClient.lastName}`;
    const updatedName = `${updatedClient.firstName.trim()} ${updatedClient.lastName.trim()}`.trim();
    setClients((current) =>
      current.map((client) =>
        client.id === updatedClient.id
          ? {
              ...updatedClient,
              firstName: updatedClient.firstName.trim(),
              lastName: updatedClient.lastName.trim(),
            }
          : client,
      ),
    );
    setTickets((current) =>
      current.map((ticket) =>
        ticket.clientPhone === previousClient.phone || ticket.clientName === previousName
          ? { ...ticket, clientName: updatedName, clientPhone: updatedClient.phone }
          : ticket,
      ),
    );
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.clientId === updatedClient.id
          ? { ...appointment, clientName: updatedName, clientPhone: updatedClient.phone }
          : appointment,
      ),
    );
    setLayaways((current) =>
      current.map((layaway) =>
        layaway.clientId === updatedClient.id
          ? { ...layaway, clientName: updatedName, clientPhone: updatedClient.phone }
          : layaway,
      ),
    );
    setOwedProducts((current) =>
      current.map((record) =>
        record.clientId === updatedClient.id
          ? { ...record, clientName: updatedName, clientPhone: updatedClient.phone }
          : record,
      ),
    );
  };

  const deleteClientRecord = (clientId: string) => {
    setClients((current) => current.filter((client) => client.id !== clientId));
  };

  const importClientRecords = (importedClients: Client[]) => {
    setClients((current) => [...importedClients, ...current]);
  };

  const handleReceiptLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen válido.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El logo no debe superar 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setReceiptSettings((current) => ({ ...current, logoUrl: reader.result as string }));
      toast.success("Logo cargado y ajustado al formato de impresión.");
    };
    reader.onerror = () => toast.error("No fue posible leer la imagen.");
    reader.readAsDataURL(file);
  };

  const authorizeCostAccess = (code: string) => {
    const authorized = isMasterAccessCode(code);
    if (!authorized) {
      toast.error("Los costos sólo se desbloquean con un código Master.");
      return false;
    }
    setCostAccessAuthorized(true);
    toast.success("Costos y reportes mensuales desbloqueados.");
    return true;
  };
  const activeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "COMPLETED"),
    [tickets],
  );
  useEffect(() => {
    const currentMonth = operationalBusinessDate(new Date().toISOString()).slice(0, 7);
    const monthlyCounts = tickets
      .filter(
        (ticket) =>
          ticket.status === "COMPLETED" &&
          ticket.ticketType !== "LAYAWAY_PAYMENT",
      )
      .reduce<Map<string, number>>((summary, ticket) => {
        const month = operationalBusinessDate(ticket.createdAtIso).slice(0, 7);
        summary.set(month, (summary.get(month) ?? 0) + 1);
        return summary;
      }, new Map());
    const currentCount = monthlyCounts.get(currentMonth) ?? 0;
    const historicRecord = Math.max(
      0,
      ...Array.from(monthlyCounts.entries())
        .filter(([month]) => month < currentMonth)
        .map(([, count]) => count),
    );
    const celebrationKey = `keysar-ticket-record-${currentMonth}-${currentCount}`;
    if (
      historicRecord > 0 &&
      currentCount > historicRecord &&
      window.sessionStorage.getItem(celebrationKey) !== "shown"
    ) {
      window.sessionStorage.setItem(celebrationKey, "shown");
      toast.success(
        `¡FELICIDADES! Nuevo récord mensual: ${currentCount} tickets. Superaste la marca histórica de ${historicRecord}.`,
      );
    }
  }, [tickets]);
  const cancellationReturnableProducts = useMemo<TicketInventoryLine[]>(() => {
    if (!cancellingTicket) return [];
    if (cancellingTicket.inventoryDeductions)
      return cancellingTicket.inventoryDeductions;
    return cancellingTicket.products.flatMap((line) => {
      const product = catalogProducts.find(
        (candidate) => candidate.id === line.productId,
      );
      const owed = owedProducts.find((record) =>
        record.ticketId === cancellingTicket.id &&
        record.backendTicketLineId === line.backendLineId,
      );
      const deliveredQuantity = Math.max(
        0,
        line.quantity - (owed?.quantity ?? 0) + (owed?.deliveredQuantity ?? 0),
      );
      return product?.kind === "PRODUCT"
        && deliveredQuantity > 0
        ? [
            {
              ...(line.backendLineId ? { backendLineId: line.backendLineId } : {}),
              productId: line.productId,
              productName: line.name,
              quantity: deliveredQuantity,
              branch: cancellingTicket.branchName ?? activeBranch,
            },
          ]
        : [];
    });
  }, [activeBranch, cancellingTicket, catalogProducts, owedProducts]);

  const saleProducts = useMemo(
    () =>
      catalogProducts
        .filter(
          (product) =>
            product.active &&
            catalogFamilyStatus[product.family] !== false &&
            catalogCategoryStatus[product.category] !== false &&
            product.branches.includes(activeBranch),
        )
        .map((product) =>
          product.stock === null
            ? product
            : {
                ...product,
                stock: branchInventory[activeBranch]?.[product.id] ?? 0,
              },
        ),
    [
      activeBranch,
      branchInventory,
      catalogCategoryStatus,
      catalogFamilyStatus,
      catalogProducts,
    ],
  );
  const families = useMemo(
    () => [
      "Todos",
      ...Array.from(new Set(saleProducts.map((product) => product.family))),
    ],
    [saleProducts],
  );
  const categories = useMemo(() => {
    const scoped =
      selectedFamily === "Todos"
        ? saleProducts
        : saleProducts.filter((product) => product.family === selectedFamily);
    return [
      "Todas",
      ...Array.from(new Set(scoped.map((product) => product.category))),
    ];
  }, [saleProducts, selectedFamily]);
  const brands = useMemo(() => {
    const scoped = saleProducts.filter(
      (product) =>
        (selectedFamily === "Todos" || product.family === selectedFamily) &&
        (selectedCategory === "Todas" || product.category === selectedCategory),
    );
    return [
      "Todas",
      ...Array.from(new Set(scoped.map((product) => getSaleProductBrand(product)))),
    ];
  }, [saleProducts, selectedCategory, selectedFamily]);
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return saleProducts.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLocaleLowerCase("es-MX").includes(query) ||
        getSellerSku(product).toLocaleLowerCase("es-MX").includes(query);
      return (
        matchesSearch &&
        (selectedFamily === "Todos" || product.family === selectedFamily) &&
        (selectedCategory === "Todas" || product.category === selectedCategory) &&
        (selectedBrand === "Todas" || getSaleProductBrand(product) === selectedBrand)
      );
    });
  }, [saleProducts, search, selectedBrand, selectedCategory, selectedFamily]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const cartDeviation = cart.reduce(
    (sum, item) =>
      sum + (item.unitPrice - item.product.minPrice) * item.quantity,
    0,
  );
  const cartMinimumTotal = cart.reduce(
    (sum, item) => sum + getCartItemProtectedMinimum(item),
    0,
  );
  const maxPromotionalDiscount = Math.max(0, cartSubtotal - cartMinimumTotal);
  const normalizedDiscountValue = Math.max(0, discountValue || 0);
  const rawDiscountAmount =
    discountMode === "PERCENT"
      ? cartSubtotal * (Math.min(normalizedDiscountValue, 100) / 100)
      : normalizedDiscountValue;
  const ticketDiscountAmount = Math.min(
    maxPromotionalDiscount,
    rawDiscountAmount,
  );
  const maxPromotionalDiscountPercent =
    cartSubtotal > 0 ? (maxPromotionalDiscount / cartSubtotal) * 100 : 0;
  const discountDraftMaximum =
    discountDraftMode === "PERCENT"
      ? maxPromotionalDiscountPercent
      : maxPromotionalDiscount;
  const normalizedDiscountDraftValue = Math.max(
    0,
    discountDraftValue || 0,
  );
  const discountDraftAmount = Math.min(
    maxPromotionalDiscount,
    discountDraftMode === "PERCENT"
      ? cartSubtotal * (Math.min(normalizedDiscountDraftValue, 100) / 100)
      : normalizedDiscountDraftValue,
  );
  const discountDraftTotal = Math.max(0, cartSubtotal - discountDraftAmount);
  const ticketTotal = Math.max(0, cartSubtotal - ticketDiscountAmount);
  const ticketDeviation = cartDeviation - ticketDiscountAmount;
  const dialogOtherItems = cart.filter(
    (item) => item.id !== editingCartItem?.id,
  );
  const dialogOtherItemsSubtotal = dialogOtherItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const dialogOtherItemsMinimumTotal = dialogOtherItems.reduce(
    (sum, item) => sum + getCartItemProtectedMinimum(item),
    0,
  );

  const openProduct = (product: Product) => {
    setEditingCartItem(null);
    setSelectedProduct(product);
    setProductDialogOpen(true);
  };

  const openCartItem = (item: CartItem) => {
    setEditingCartItem(item);
    setSelectedProduct(item.product);
    setProductDialogOpen(true);
  };

  const submitCartItem = (item: CartItem) => {
    if (editingCartItem) {
      setCart((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? item : currentItem,
        ),
      );
      toast.success(`${item.product.name} se actualizó en el ticket.`);
      return;
    }
    setCart((current) => [...current, item]);
    toast.success(`${item.product.name} se añadió al carrito.`);
  };

  const addDealToCart = (deal: RetailDeal, dealQuantity: number) => {
    const dealProducts = deal.lines.flatMap((line) => {
      const product = catalogProducts.find(
        (candidate) => candidate.id === line.productId && candidate.active,
      );
      return product ? [{ line, product }] : [];
    });
    if (dealProducts.length !== deal.lines.length || dealProducts.length < 2) {
      toast.error("Uno de los artículos del paquete ya no está disponible.");
      return;
    }
    const instanceId = `deal-instance-${crypto.randomUUID()}`;
    const weightTotal = dealProducts.reduce(
      (sum, item) => sum + item.product.maxPrice * item.line.quantity,
      0,
    );
    let allocated = 0;
    const dealCartItems = dealProducts.map(({ line, product }, index) => {
      const lineAllocation =
        index === dealProducts.length - 1
          ? Math.round((deal.price - allocated) * 100) / 100
          : Math.round(
              ((deal.price * product.maxPrice * line.quantity) /
                Math.max(weightTotal, 1)) *
                100,
            ) / 100;
      allocated += lineAllocation;
      return {
        id: crypto.randomUUID(),
        product,
        quantity: line.quantity * dealQuantity,
        unitPrice: lineAllocation / line.quantity,
        comment: `Paquete ${deal.name}`,
        adminAuthorized: true,
        dealId: deal.id,
        dealName: deal.name,
        dealInstanceId: instanceId,
        dealQuantity,
      } satisfies CartItem;
    });
    setCart((current) => [...current, ...dealCartItems]);
    toast.success(
      `${dealQuantity} × ${deal.name} se añadió al ticket con ${dealProducts.length} artículos.`,
    );
  };

  const removeDealFromCart = (dealInstanceId: string) => {
    const dealName = cart.find(
      (item) => item.dealInstanceId === dealInstanceId,
    )?.dealName;
    setCart((current) =>
      current.filter((item) => item.dealInstanceId !== dealInstanceId),
    );
    if (dealName) toast.info(`${dealName} se quitó completo del ticket.`);
  };

  const removeCartItem = (itemId: string) => {
    const item = cart.find((candidate) => candidate.id === itemId);
    const nextCart = cart.filter((currentItem) => currentItem.id !== itemId);
    if (!isCartFloorCoveredOrAuthorized(nextCart)) {
      toast.error(
        "No puedes quitar esta cobertura: el ticket quedaría bajo su mínimo combinado. Edita una línea y autoriza el ajuste.",
      );
      return;
    }
    setCart(nextCart);
    if (item) toast.info(`${item.product.name} se quitó del ticket.`);
  };

  const handleProductDialogOpenChange = (open: boolean) => {
    setProductDialogOpen(open);
    if (!open) setEditingCartItem(null);
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    const nextCart = cart.map((item) =>
      item.id === itemId ? { ...item, quantity } : item,
    );
    if (!isCartFloorCoveredOrAuthorized(nextCart)) {
      toast.error(
        "La nueva cantidad deja el ticket bajo su mínimo combinado. Abre el producto para autorizar el ajuste.",
      );
      return;
    }
    setCart(nextCart);
  };

  const openCheckout = async () => {
    if (!posApiEnabled && !isCartFloorCoveredOrAuthorized(cart)) {
      toast.error(
        "El total del ticket no cubre el mínimo combinado y requiere autorización administrativa.",
      );
      return;
    }
    if (!posApiEnabled) {
      setCheckoutOpen(true);
      return;
    }
    if (!apiSession || cart.length === 0) return;
    if (operatingOffline) {
      if (!offlineBootstrap) {
        toast.error("La credencial no tiene una caché offline vigente.");
        return;
      }
      if (!isCartFloorCoveredOrAuthorized(cart)) {
        toast.error("Una venta bajo el mínimo combinado requiere conexión y autorización master.");
        return;
      }
      setAuthoritativeQuote(null);
      setSaleAuthorizationToken(null);
      setCheckoutOpen(true);
      return;
    }
    try {
      const quote = await posApi.quoteTicket({
        branchId: apiSession.terminal.branch.id,
        lines: cart.map((item) => ({
          itemId: item.product.id,
          quantity: item.quantity.toFixed(2),
          unitPrice: item.unitPrice.toFixed(2),
          ...(item.comment ? { notes: item.comment } : {}),
          ...(item.dealId ? { packageId: item.dealId } : {}),
        })),
        sellers: [{ employeeId: sellers.find((seller) => seller.active)?.id ?? apiSession.actor.id, share: ticketTotal.toFixed(2) }],
        ...(ticketDiscountAmount > 0 ? { discount: { kind: "FIXED" as const, value: ticketDiscountAmount.toFixed(2) } } : {}),
      });
      setAuthoritativeQuote(quote);
      setSaleAuthorizationToken(null);
      if (quote.requiresAuthorization) {
        setSaleAuthorizationAlias(apiSession.actor.isMaster ? apiSession.actor.alias : "");
        setSaleAuthorizationCode("");
        setSaleAuthorizationOpen(true);
        return;
      }
      setCheckoutOpen(true);
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "No se pudo validar el total del ticket.");
    }
  };

  const confirmSaleAuthorization = async () => {
    if (!apiSession || !authoritativeQuote) return;
    try {
      const authorization = await posApi.createAuthorization({
        alias: saleAuthorizationAlias.trim(),
        pin: saleAuthorizationCode,
        purpose: "SALE_BELOW_MINIMUM",
      });
      setSaleAuthorizationToken(authorization.authorizationToken);
      setSaleAuthorizationOpen(false);
      setCheckoutOpen(true);
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Autorización master inválida.");
    }
  };

  const completeTicket = async (result: CheckoutResult) => {
    let offlineOperationId: string | undefined;
    if (posApiEnabled && operatingOffline) {
      if (!apiSession || !offlineBootstrap) {
        toast.error("La sesión offline no está disponible.");
        return;
      }
      try {
        const sellerShares = result.sellerSales.map((sale) => Math.round(sale.amount * 100));
        const expectedCents = Math.round(ticketTotal * 100);
        const assignedCents = sellerShares.reduce((sum, share) => sum + share, 0);
        if (sellerShares.length > 0) sellerShares[sellerShares.length - 1]! += expectedCents - assignedCents;
        const appointments = result.appointments.map((appointment) => ({
          kind: appointment.kind,
          serviceName: appointment.service,
          branchId: apiSession.terminal.branch.id,
          ...(result.sellerSales[0]?.sellerId ? { sellerId: result.sellerSales[0].sellerId } : {}),
          ...(appointment.kind !== "NO_APPOINTMENT"
            ? { scheduledAt: new Date(`${appointment.date}T${appointment.time}:00`).toISOString() }
            : {}),
        }));
        const courtesyIndexes = result.appointments.flatMap((appointment, index) => appointment.kind === "COURTESY" ? [index] : []);
        const payload = {
          branchId: apiSession.terminal.branch.id,
          customer: result.createdClient ? { create: {
            displayName: `${result.client.firstName} ${result.client.lastName}`.trim(),
            phone: result.client.phone || null,
            sourceId: clientSources.some((source) => source.id === result.client.source) ? result.client.source : null,
            notes: result.client.whatsapp ? `WhatsApp: ${result.client.whatsapp}` : null,
            ownerEmployeeId: result.client.ownerId,
          } } : { id: result.client.id },
          lines: cart.map((item) => ({
            itemId: item.product.id,
            quantity: item.quantity.toFixed(2),
            unitPrice: item.unitPrice.toFixed(2),
            ...(item.comment ? { notes: item.comment } : {}),
            ...(item.dealId ? { packageId: item.dealId } : {}),
            delivered: result.paymentStatus === "PAID" || result.deliveredCartItemIds.includes(item.id),
          })),
          sellers: result.sellerSales.map((sale, index) => ({ employeeId: sale.sellerId, share: ((sellerShares[index] ?? 0) / 100).toFixed(2) })),
          payments: result.payments.map((payment) => ({
            methodId: payment.methodId,
            amount: payment.amount.toFixed(2),
            ...(payment.authorizationCode ? { reference: payment.authorizationCode, authorizationLastFour: payment.authorizationCode } : {}),
            ...(payment.cardOrBank ? { institution: payment.cardOrBank } : {}),
          })),
          ...(ticketDiscountAmount > 0 ? { discount: { kind: "FIXED", value: ticketDiscountAmount.toFixed(2) } } : {}),
          appointments,
          courtesies: courtesyIndexes.map((appointmentIndex) => ({
            serviceName: result.appointments[appointmentIndex]!.service,
            appointmentIndex,
            policyName: "Cortesía de bienvenida",
          })),
        };
        const queued = await enqueueOfflineOperation({ kind: "TICKET_CREATE", payload }, offlineBootstrap);
        offlineOperationId = queued.id;
        setOfflineQueue(await offlineQueueStatus(offlineBootstrap));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo proteger el ticket local.");
        return;
      }
    }
    if (posApiEnabled && !operatingOffline) {
      if (!apiSession) {
        toast.error("La sesión POS no está disponible.");
        return;
      }
      try {
        const sellerShares = result.sellerSales.map((sale) => Math.round(sale.amount * 100));
        const expectedCents = Math.round(Number(authoritativeQuote?.total ?? ticketTotal) * 100);
        const authoritativeDiscount = Number(authoritativeQuote?.discountTotal ?? ticketDiscountAmount);
        const assignedCents = sellerShares.reduce((sum, share) => sum + share, 0);
        if (sellerShares.length > 0) sellerShares[sellerShares.length - 1]! += expectedCents - assignedCents;
        const appointments = result.appointments.map((appointment) => {
          const branchId = apiBranches.find((branch) => branch.name === appointment.branch)?.id ?? apiSession.terminal.branch.id;
          const scheduledAt = appointment.kind === "NO_APPOINTMENT"
            ? undefined
            : new Date(`${appointment.date}T${appointment.time}:00`).toISOString();
          return {
            kind: appointment.kind,
            serviceName: appointment.service,
            branchId,
            ...(result.sellerSales[0]?.sellerId ? { sellerId: result.sellerSales[0].sellerId } : {}),
            ...(scheduledAt ? { scheduledAt } : {}),
          };
        });
        const courtesyIndexes = result.appointments.flatMap((appointment, index) => appointment.kind === "COURTESY" ? [index] : []);
        const dto = await posApi.createTicket({
          branchId: apiSession.terminal.branch.id,
          ...(!result.createdClient ? { customerId: result.client.id } : {}),
          customer: result.createdClient ? { create: {
            displayName: `${result.client.firstName} ${result.client.lastName}`.trim(),
            phone: result.client.phone || null,
            sourceId: clientSources.some((source) => source.id === result.client.source) ? result.client.source : null,
            notes: result.client.whatsapp ? `WhatsApp: ${result.client.whatsapp}` : null,
            ownerEmployeeId: result.client.ownerId,
          } } : { id: result.client.id },
          lines: cart.map((item) => ({
            itemId: item.product.id,
            quantity: item.quantity.toFixed(2),
            unitPrice: item.unitPrice.toFixed(2),
            ...(item.comment ? { notes: item.comment } : {}),
            ...(item.dealId ? { packageId: item.dealId } : {}),
            delivered: result.paymentStatus === "PAID" || result.deliveredCartItemIds.includes(item.id),
          })),
          sellers: result.sellerSales.map((sale, index) => ({ employeeId: sale.sellerId, share: ((sellerShares[index] ?? 0) / 100).toFixed(2) })),
          payments: result.payments.map((payment) => ({
            methodId: payment.methodId,
            amount: payment.amount.toFixed(2),
            ...(payment.authorizationCode ? { reference: payment.authorizationCode, authorizationLastFour: payment.authorizationCode } : {}),
            ...(payment.cardOrBank ? { institution: payment.cardOrBank } : {}),
          })),
          ...(authoritativeDiscount > 0 ? { discount: { kind: "FIXED" as const, value: authoritativeDiscount.toFixed(2) } } : {}),
          appointments,
          courtesies: courtesyIndexes.map((appointmentIndex) => ({
            serviceName: result.appointments[appointmentIndex]!.service,
            appointmentIndex,
            policyName: "Cortesía de bienvenida",
          })),
          ...(saleAuthorizationToken ? { authorizationToken: saleAuthorizationToken } : {}),
        });
        const ticket = ticketFromDto(dto);
        const client = { ...result.client, id: dto.customerId ?? result.client.id, registrationFolio: dto.customerId ?? result.client.registrationFolio };
        setClients((current) => result.createdClient ? [client, ...current] : current.map((item) => item.id === client.id ? client : item));
        setTickets((current) => [ticket, ...current.filter((item) => item.id !== ticket.id)]);
        const layaway = layawayFromDto(dto);
        if (layaway) setLayaways((current) => [layaway, ...current.filter((item) => item.id !== layaway.id)]);
        setOwedProducts((current) => [...owedProductsFromDto(dto), ...current]);
        const clientName = `${client.firstName} ${client.lastName}`.trim();
        setAppointments((current) => [...result.appointments.map((appointment, index) => ({
          ...appointment,
          id: `api-appointment-${dto.id}-${index}`,
          clientId: client.id,
          clientName,
          clientPhone: client.phone,
          ticketId: ticket.id,
          sellerIds: result.sellerSales.map((sale) => sale.sellerId),
          recordedAt: ticket.createdAt,
          recordedAtIso: ticket.createdAtIso,
          status: appointment.kind === "NO_APPOINTMENT" ? "PENDING" as const : "SCHEDULED" as const,
        })), ...current]);
        setBranchInventory((current) => {
          const branch = { ...(current[activeBranch] ?? {}) };
          for (const item of cart.filter((entry) =>
            entry.product.kind === "PRODUCT" &&
            (result.paymentStatus === "PAID" || result.deliveredCartItemIds.includes(entry.id)),
          )) branch[item.product.id] = (branch[item.product.id] ?? 0) - item.quantity;
          return { ...current, [activeBranch]: branch };
        });
        setCart([]);
        setDiscountMode("PERCENT");
        setDiscountValue(0);
        setDiscountOpen(false);
        setCheckoutOpen(false);
        setAuthoritativeQuote(null);
        setSaleAuthorizationToken(null);
        setActiveScreen("receipts");
        setSelectedReceiptTicket(ticket);
        setReceiptPreviewOpen(true);
        toast.success(`Ticket ${ticket.id} registrado y conciliado.`);
      } catch (error) {
        const message = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ?? (error instanceof Error ? error.message : "No se pudo registrar el ticket");
        toast.error(message);
      }
      return;
    }
    const ticketBranch = activeBranch;
    setClients((current) =>
      result.createdClient
        ? [result.client, ...current]
        : current.map((client) =>
            client.id === result.client.id ? result.client : client,
          ),
    );
    const createdAt = new Date();
    const ticketId = createUniqueFolio(tickets);
    const initialPaymentFolio =
      result.paymentStatus === "LAYAWAY"
        ? `APT-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
        : null;
    const createdAtLabel = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(createdAt);
    const ticketPayments = result.payments.map((payment) =>
      initialPaymentFolio
        ? {
            ...payment,
            folio: initialPaymentFolio,
            createdAt: createdAtLabel,
            createdAtIso: createdAt.toISOString(),
            relatedTicketId: ticketId,
          }
        : payment,
    );
    const courtesyAppointments = result.appointments.filter(
      (appointment) => appointment.kind === "COURTESY",
    );
    const dealInstanceIds = Array.from(
      new Set(
        cart.flatMap((item) =>
          item.dealInstanceId ? [item.dealInstanceId] : [],
        ),
      ),
    );
    const ticketDeals = dealInstanceIds.flatMap((instanceId) => {
      const dealItems = cart.filter(
        (item) => item.dealInstanceId === instanceId,
      );
      const firstItem = dealItems[0];
      const deal = deals.find((candidate) => candidate.id === firstItem?.dealId);
      return firstItem && deal
        ? [
            {
              dealId: deal.id,
              dealName: deal.name,
              dealSku: deal.sku,
              quantity: firstItem.dealQuantity ?? 1,
              unitPrice: deal.price,
              total: deal.price * (firstItem.dealQuantity ?? 1),
              productIds: dealItems.map((item) => item.product.id),
            },
          ]
        : [];
    });
    const ticketTaxRatio = cartSubtotal > 0 ? ticketTotal / cartSubtotal : 1;
    const cartTaxLines = cart.map((item) =>
      calculateIncludedVat(
        item.unitPrice * item.quantity * ticketTaxRatio,
        item.product.includesVat,
      ),
    );
    const ticketNetTotal = roundCurrency(
      cartTaxLines.reduce((sum, line) => sum + line.net, 0),
    );
    const ticketVatAmount = roundCurrency(ticketTotal - ticketNetTotal);
    const ticket: Ticket = {
      id: ticketId,
      ...(offlineOperationId ? { backendId: offlineOperationId } : {}),
      createdAt: createdAtLabel,
      createdAtIso: createdAt.toISOString(),
      clientId: result.client.id,
      clientName: `${result.client.firstName} ${result.client.lastName}`,
      clientPhone: result.client.phone,
      branchName: ticketBranch,
      branchAddress: branchAddresses[ticketBranch] ?? receiptSettings.address,
      sellerSummary: result.sellerSummary,
      items: cartCount + courtesyAppointments.length,
      discountAmount: ticketDiscountAmount,
      subtotal: cartSubtotal,
      total: ticketTotal,
      netTotal: ticketNetTotal,
      vatAmount: ticketVatAmount,
      deviation: ticketDeviation,
      paymentMethod: result.paymentMethod,
      payments: ticketPayments,
      amountPaid: result.amountPaid,
      balanceDue: result.balanceDue,
      paymentStatus: result.paymentStatus,
      products: [
        ...cart.map((item, index) => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          total: item.unitPrice * item.quantity,
          includesVat: item.product.includesVat,
          netTotal: cartTaxLines[index]?.net ?? item.unitPrice * item.quantity,
          vatAmount: cartTaxLines[index]?.vat ?? 0,
          ...(item.dealId
            ? {
                dealId: item.dealId,
                dealName: item.dealName ?? "Paquete",
                dealInstanceId: item.dealInstanceId ?? item.dealId,
              }
            : {}),
        })),
        ...courtesyAppointments.map((appointment, index) => ({
          productId: `courtesy-${ticketId}-${index + 1}`,
          name: `${appointment.service} · REGALO`,
          quantity: 1,
          total: 0,
          includesVat: false,
          netTotal: 0,
          vatAmount: 0,
        })),
      ],
      sellerSales: result.sellerSales,
      deals: ticketDeals,
      status: "COMPLETED",
      syncStatus: isOnline && !operatingOffline ? "SYNCED" : "PENDING_SYNC",
      createdOffline: !isOnline || operatingOffline,
      syncedAtIso: isOnline && !operatingOffline ? createdAt.toISOString() : null,
    };
    const clientName = `${result.client.firstName} ${result.client.lastName}`;
    const createdAppointments: Appointment[] = result.appointments.map(
      (appointment, index) => ({
        ...appointment,
        id: `appointment-${Date.now()}-${index}`,
        clientId: result.client.id,
        clientName,
        clientPhone: result.client.phone,
        ticketId,
        sellerIds: result.sellerSales.map((sale) => sale.sellerId),
        recordedAt: ticket.createdAt,
        recordedAtIso: ticket.createdAtIso,
        status: appointment.kind === "NO_APPOINTMENT" ? "PENDING" : "SCHEDULED",
      }),
    );
    setAppointments((current) => [...createdAppointments, ...current]);
    const requestedDeliveryIds = new Set(
      result.paymentStatus === "PAID"
        ? cart
            .filter((item) => item.product.kind === "PRODUCT")
            .map((item) => item.id)
        : result.paymentStatus === "LAYAWAY"
          ? result.deliveredCartItemIds
          : [],
    );
    const ticketBranchStock = { ...(branchInventory[ticketBranch] ?? {}) };
    const deliveredByCartItem = new Map<string, number>();
    const deliveryDebts: OwedProductRecord[] = [];
    const saleInventoryMovements: InventoryMovement[] = [];
    cart.forEach((item) => {
      if (item.product.kind !== "PRODUCT" || !requestedDeliveryIds.has(item.id))
        return;
      const available = ticketBranchStock[item.product.id] ?? 0;
      const delivered = Math.min(Math.max(available, 0), item.quantity);
      const shortage = item.quantity - delivered;
      const newStock = available - item.quantity;
      ticketBranchStock[item.product.id] = newStock;
      deliveredByCartItem.set(item.id, delivered);
      if (item.quantity > 0) {
        saleInventoryMovements.push({
          id: crypto.randomUUID(),
          folio: `VEN-${ticketId}-${saleInventoryMovements.length + 1}`,
          createdAt: ticket.createdAt,
          createdAtIso: ticket.createdAtIso,
          productId: item.product.id,
          productName: item.product.name,
          direction: "REMOVE",
          reason: `Venta ${ticketId}`,
          quantity: item.quantity,
          previousStock: available,
          newStock,
          sourceBranch: ticketBranch,
          destinationBranch: null,
          destinationPreviousStock: null,
          destinationNewStock: null,
          comment:
            shortage > 0
              ? `Venta a ${clientName}${item.dealName ? ` · Paquete ${item.dealName}` : ""} · ${delivered} entregado(s), ${shortage} pendiente(s)`
              : `Salida por venta a ${clientName}${item.dealName ? ` · Paquete ${item.dealName}` : ""}`,
          category: "SALE",
          unitCostUsd: item.product.costUsd,
          unitCostMxn: item.product.costMxn,
          totalCostUsd: item.product.costUsd * item.quantity,
          totalCostMxn: item.product.costMxn * item.quantity,
        });
      }
      if (shortage > 0) {
        deliveryDebts.push({
          id: crypto.randomUUID(),
          ticketId,
          layawayId:
            result.paymentStatus === "LAYAWAY" ? `layaway-${ticketId}` : null,
          clientId: result.client.id,
          clientName,
          clientPhone: result.client.phone,
          productId: item.product.id,
          productName: item.product.name,
          quantity: shortage,
          deliveredQuantity: 0,
          branch: ticketBranch,
          sellerIds: result.sellerSales.map((sale) => sale.sellerId),
          sellerNames: result.sellerSales.map((sale) => sale.sellerName),
          inventoryCommitted: true,
          deliveryHistory: [],
          reason: "OUT_OF_STOCK",
          createdAt: ticket.createdAt,
          createdAtIso: ticket.createdAtIso,
          status: "PENDING",
        });
      }
    });
    ticket.inventoryDeductions = cart.flatMap((item) => {
      const delivered = deliveredByCartItem.get(item.id) ?? 0;
      return delivered > 0
        ? [
            {
              productId: item.product.id,
              productName: item.product.name,
              quantity: delivered,
              branch: ticketBranch,
            },
          ]
        : [];
    });
    setTickets((current) => [ticket, ...current]);
    pushOperationalNotification({
      type: "SALE_COMPLETED",
      title: `Venta finalizada · ${ticket.id}`,
      detail: `${ticket.clientName} · ${formatCurrency(ticket.total)} · ${ticket.sellerSummary}`,
      moduleLabel: "Ventas",
      branch: ticketBranch,
      actorId: result.sellerSales[0]?.sellerId ?? masterUser.id,
      actorName: ticket.sellerSummary,
      reference: ticket.id,
      createdAtIso: ticket.createdAtIso,
    });
    if (saleInventoryMovements.length > 0) {
      setInventoryMovements((current) => [
        ...[...saleInventoryMovements].reverse(),
        ...current,
      ]);
    }
    setBranchInventory((current) => ({
      ...current,
      [ticketBranch]: ticketBranchStock,
    }));
    setCatalogProducts((current) =>
      current.map((product) =>
        product.stock === null
          ? product
          : { ...product, stock: ticketBranchStock[product.id] ?? 0 },
      ),
    );
    if (deliveryDebts.length > 0) {
      setOwedProducts((current) => [...deliveryDebts, ...current]);
    }
    if (result.paymentStatus === "LAYAWAY") {
      const layaway: LayawayRecord = {
        id: `layaway-${ticketId}`,
        originalTicketId: ticketId,
        createdAt: ticket.createdAt,
        createdAtIso: ticket.createdAtIso,
        clientId: result.client.id,
        clientName,
        clientPhone: result.client.phone,
        branch: ticketBranch,
        sellerIds: result.sellerSales.map((sale) => sale.sellerId),
        total: ticket.total,
        amountPaid: ticket.amountPaid,
        balanceDue: ticket.balanceDue,
        items: cart.map((item) => ({
          cartItemId: item.id,
          productId: item.product.id,
          productName: item.product.name,
          kind: item.product.kind,
          quantity: item.quantity,
          deliveredQuantity:
            item.product.kind === "SERVICE"
              ? item.quantity
              : (deliveredByCartItem.get(item.id) ?? 0),
        })),
        payments: initialPaymentFolio
          ? [
              {
                id: crypto.randomUUID(),
                folio: initialPaymentFolio,
                createdAt: ticket.createdAt,
                createdAtIso: ticket.createdAtIso,
                amount: ticketPayments.reduce(
                  (sum, payment) => sum + payment.amount,
                  0,
                ),
                methodId: ticketPayments[0]?.methodId ?? "CASH",
                payments: ticketPayments,
                balanceAfter: ticket.balanceDue,
                ...(result.sellerSales[0]
                  ? {
                      sellerId: result.sellerSales[0].sellerId,
                      sellerName: result.sellerSales[0].sellerName,
                    }
                  : {}),
              },
            ]
          : [],
        status: "ACTIVE",
      };
      setLayaways((current) => [layaway, ...current]);
    }
    setCart([]);
    setDiscountMode("PERCENT");
    setDiscountValue(0);
    setDiscountOpen(false);
    setCheckoutOpen(false);
    setActiveScreen("receipts");
    setSelectedReceiptTicket(ticket);
    setReceiptPreviewOpen(true);
    toast.success(
      result.paymentStatus === "PAID"
        ? `Ticket ${ticket.id} cobrado correctamente.`
        : result.paymentStatus === "LAYAWAY"
          ? `Apartado ${ticket.id} registrado. Pago ${initialPaymentFolio} generado.`
          : `Ticket ${ticket.id} registrado como pendiente de cobro.`,
    );
    if (createdAppointments.length > 0) {
      toast.info(
        `${createdAppointments.length} cita${createdAppointments.length === 1 ? "" : "s"} registrada${createdAppointments.length === 1 ? "" : "s"} para ${clientName}.`,
      );
    }
  };

  const authorizePaymentSettings = () => {
    if (!isMasterAccessCode(paymentSettingsCode)) {
      toast.error("Código master incorrecto.");
      return;
    }
    setPaymentSettingsAuthorized(true);
    setPaymentSettingsCode("");
    toast.success("Configuración de cobros desbloqueada.");
  };

  const addPaymentMethod = () => {
    const label = newPaymentMethodName.trim();
    if (!label) return;
    const existingMethod = paymentMethods.find(
      (method) =>
        method.label.toLocaleLowerCase("es-MX") ===
        label.toLocaleLowerCase("es-MX"),
    );
    if (existingMethod?.active) {
      toast.error("Ese método de pago ya existe.");
      return;
    }
    if (existingMethod) {
      setPaymentMethods((current) =>
        current.map((method) =>
          method.id === existingMethod.id ? { ...method, active: true } : method,
        ),
      );
      setNewPaymentMethodName("");
      toast.success(`${label} quedó disponible nuevamente en el cobro.`);
      return;
    }
    setPaymentMethods((current) => [
      ...current,
      {
        id: `CUSTOM-${Date.now()}`,
        label,
        active: true,
      },
    ]);
    setNewPaymentMethodName("");
    toast.success(`${label} quedó disponible en el cobro.`);
  };

  const removePaymentMethod = (methodId: string) => {
    if (!paymentSettingsAuthorized) {
      setPaymentSettingsOpen(true);
      toast.info("Desbloquea la configuración master para borrar el método.");
      return;
    }
    const activeMethods = paymentMethods.filter((method) => method.active);
    if (activeMethods.length <= 1) {
      toast.error("Debe permanecer al menos un método de pago activo.");
      return;
    }
    const method = paymentMethods.find((item) => item.id === methodId);
    if (!method) return;
    setPaymentMethods((current) =>
      current.map((item) =>
        item.id === methodId ? { ...item, active: false } : item,
      ),
    );
    toast.success(
      `${method.label} se retiró de nuevos cobros. Los tickets históricos lo conservan.`,
    );
  };

  const saveClientSource = () => {
    const label = clientSourceName.trim();
    if (!label) return;
    if (
      clientSources.some(
        (source) =>
          source.id !== editingClientSourceId &&
          source.label.toLocaleLowerCase("es-MX") ===
            label.toLocaleLowerCase("es-MX"),
      )
    ) {
      toast.error("Ya existe una procedencia con ese nombre.");
      return;
    }
    if (editingClientSourceId) {
      setClientSources((current) =>
        current.map((source) =>
          source.id === editingClientSourceId ? { ...source, label } : source,
        ),
      );
      toast.success("Procedencia actualizada para nuevos registros.");
    } else {
      setClientSources((current) => [
        ...current,
        {
          id: `SOURCE-${Date.now()}`,
          label,
          active: true,
          locksCompany: false,
        },
      ]);
      toast.success("Nueva procedencia disponible en el alta de clientes.");
    }
    setClientSourceName("");
    setEditingClientSourceId("");
  };

  const editClientSource = (source: ClientSourceOption) => {
    setEditingClientSourceId(source.id);
    setClientSourceName(source.label);
  };

  const toggleClientSource = (sourceId: string) => {
    setClientSources((current) =>
      current.map((source) =>
        source.id === sourceId
          ? { ...source, active: !source.active }
          : source,
      ),
    );
    if (editingClientSourceId === sourceId) {
      setEditingClientSourceId("");
      setClientSourceName("");
    }
  };

  const saveBillingProfile = (profile: BillingProfile) => {
    setBillingProfile(profile);
    setReceiptSettings((current) => ({
      ...current,
      companyName: profile.companyName,
    }));
  };

  const addBillingCard = (card: BillingCard) => {
    setBillingCards((current) => [...current, card]);
  };

  const setDefaultBillingCard = (cardId: string) => {
    setBillingCards((current) =>
      current.map((card) => ({ ...card, isDefault: card.id === cardId })),
    );
    toast.success("Método de pago principal actualizado.");
  };

  const removeBillingCard = (cardId: string) => {
    if (
      billingLocations.some(
        (location) =>
          location.status === "ACTIVE" && location.paymentCardId === cardId,
      )
    ) {
      toast.error(
        "No puedes eliminar una tarjeta ligada a una ubicación activa.",
      );
      return;
    }
    setBillingCards((current) => {
      const removed = current.find((card) => card.id === cardId);
      const remaining = current.filter((card) => card.id !== cardId);
      if (removed?.isDefault && remaining.length > 0)
        return remaining.map((card, index) => ({
          ...card,
          isDefault: index === 0,
        }));
      return remaining;
    });
    toast.success("Tarjeta eliminada de la sesión mock.");
  };

  const activateBillingLocation = (
    locationId: string,
    cardId: string,
    billingStartDate: string,
    nextBillingDate: string,
  ) => {
    const location = billingLocations.find((item) => item.id === locationId);
    const card = billingCards.find((item) => item.id === cardId);
    if (!location || !card) return;
    if (!branchInventory[location.name]) {
      setBranchInventory((current) => ({
        ...current,
        [location.name]: Object.fromEntries(
          catalogProducts
            .filter((product) => product.kind === "PRODUCT")
            .map((product) => [product.id, 0]),
        ),
      }));
      setCatalogProducts((current) =>
        current.map((product) => ({
          ...product,
          branches: product.branches.includes(location.name)
            ? product.branches
            : [...product.branches, location.name],
        })),
      );
    }
    setBranchAddresses((current) => ({
      ...current,
      [location.name]:
        current[location.name] ?? "Dirección pendiente de configurar",
    }));
    setBillingLocations((current) =>
      current.map((item) =>
        item.id === locationId
          ? {
              ...item,
              status: "ACTIVE",
              paymentCardId: cardId,
              billingStartDate,
              nextBillingDate,
            }
          : item,
      ),
    );
    setBillingHistory((current) => [
      {
        id: `billing-history-${Date.now()}`,
        invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
        locationId,
        locationName: location.name,
        period: new Intl.DateTimeFormat("es-MX", {
          month: "long",
          year: "numeric",
        }).format(new Date(`${billingStartDate}T12:00:00`)),
        billedAt: billingStartDate,
        paidAt: null,
        totalUsd: location.costUsd,
        status: "PENDING",
        cardLast4: card.last4,
      },
      ...current,
    ]);
  };

  const addBillingLocation = (name: string, costUsd: number) => {
    const normalizedName = name.trim();
    if (
      billingLocations.some(
        (location) =>
          location.name.toLocaleLowerCase("es-MX") ===
          normalizedName.toLocaleLowerCase("es-MX"),
      ) || branchInventory[normalizedName]
    ) {
      toast.error("Ya existe una sucursal con ese nombre.");
      return false;
    }
    const location: BillingLocation = {
      id: `billing-location-${crypto.randomUUID()}`,
      name: normalizedName,
      costUsd,
      status: "PENDING",
      billingStartDate: "",
      nextBillingDate: "",
      paymentCardId: null,
    };
    setBillingLocations((current) => [...current, location]);
    setBranchAddresses((current) => ({
      ...current,
      [normalizedName]: "Dirección pendiente de configurar",
    }));
    setBranchInventory((current) => ({
      ...current,
      [normalizedName]: Object.fromEntries(
        catalogProducts
          .filter((product) => product.kind === "PRODUCT")
          .map((product) => [product.id, 0]),
      ),
    }));
    setCatalogProducts((current) =>
      current.map((product) => ({
        ...product,
        branches: product.branches.includes(normalizedName)
          ? product.branches
          : [...product.branches, normalizedName],
      })),
    );
    return true;
  };

  const deactivateBillingLocation = (locationId: string) => {
    const location = billingLocations.find((item) => item.id === locationId);
    if (!location) return false;
    if (Object.keys(branchInventory).length <= 1) {
      toast.error("La empresa debe conservar al menos una sucursal operativa.");
      return false;
    }
    const remainingBranches = Object.keys(branchInventory).filter(
      (branch) => branch !== location.name,
    );
    const deactivatedAt = new Date();
    setBillingLocations((current) =>
      current.map((item) =>
        item.id === locationId
          ? { ...item, status: "INACTIVE", paymentCardId: null }
          : item,
      ),
    );
    setBranchInventory((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([branch]) => branch !== location.name),
      ),
    );
    setCatalogProducts((current) =>
      current.map((product) => ({
        ...product,
        branches: product.branches.filter(
          (branch) => branch !== location.name,
        ),
      })),
    );
    setDeals((current) =>
      current.map((deal) => ({
        ...deal,
        branches: deal.branches.filter((branch) => branch !== location.name),
      })),
    );
    setAttendanceRecords((current) =>
      current.map((record) =>
        record.branch === location.name && record.status === "ONLINE"
          ? {
              ...record,
              status: "OFFLINE",
              clockOutAt: formatAttendanceTime(deactivatedAt),
              clockOutAtIso: deactivatedAt.toISOString(),
              clockOutReason: "MANUAL",
            }
          : record,
      ),
    );
    if (activeBranch === location.name && remainingBranches[0]) {
      applyTerminalLocation(remainingBranches[0]);
    }
    return true;
  };

  const saveCatalogProduct = (product: Product) => {
    const previousProduct = catalogProducts.find(
      (item) => item.id === product.id,
    );
    const exists = Boolean(previousProduct);
    const duplicateSku = catalogProducts.some(
      (item) => item.id !== product.id && item.sku === product.sku,
    );
    if (duplicateSku) {
      toast.error("El SKU base ya está registrado.");
      return;
    }
    setCatalogProducts((current) =>
      exists
        ? current.map((item) => (item.id === product.id ? product : item))
        : [product, ...current],
    );
    if (previousProduct) {
      const syncCartItemProduct = (item: CartItem): CartItem => {
        if (item.product.id !== product.id) return item;
        const usedPreviousListPrice =
          !item.dealId &&
          !item.adminAuthorized &&
          item.unitPrice === previousProduct.maxPrice;
        return {
          ...item,
          product,
          unitPrice: usedPreviousListPrice ? product.maxPrice : item.unitPrice,
        };
      };
      setCart((current) => current.map(syncCartItemProduct));
      setSelectedProduct((current) =>
        current?.id === product.id ? product : current,
      );
      setEditingCartItem((current) =>
        current ? syncCartItemProduct(current) : current,
      );
    }
    if (product.kind === "PRODUCT") {
      setBranchInventory((current) =>
        Object.fromEntries(
          Object.entries(current).map(([branch, stock]) => [
            branch,
            {
              ...stock,
              [product.id]: product.branches.includes(branch)
                ? branch === "Polanco"
                  ? (product.stock ?? 0)
                  : (stock[product.id] ?? 0)
                : 0,
            },
          ]),
        ),
      );
    }
    if (!exists) {
      pushOperationalNotification({
        type: "PRODUCT_CREATED",
        title: `Alta de ${product.kind === "SERVICE" ? "servicio" : "producto"}`,
        detail: `${product.name} · ${product.sku} · ${formatCurrency(product.maxPrice)}.`,
        moduleLabel: "Inventory · Catálogo",
        branch:
          product.branches.length === operationalBranches.length
            ? "Todas las sucursales"
            : product.branches.join(" · "),
        actorId: masterUser.id,
        actorName: masterUser.name,
        reference: product.sku,
        createdAtIso: new Date().toISOString(),
      });
    }
  };

  const setCatalogProductStatus = (productId: string, active: boolean) => {
    setCatalogProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, active } : product,
      ),
    );
    if (!active) {
      setCart((current) =>
        current.filter((item) => item.product.id !== productId),
      );
      if (selectedProduct?.id === productId) {
        setProductDialogOpen(false);
        setSelectedProduct(null);
        setEditingCartItem(null);
      }
    }
    toast.info(
      active
        ? "Producto activado en las pantallas operativas."
        : "Producto desactivado. Los tickets históricos se conservaron.",
    );
  };

  const addCatalogOption = (
    setter: Dispatch<SetStateAction<string[]>>,
    name: string,
  ) => {
    setter((current) =>
      current.some(
        (item) =>
          item.toLocaleLowerCase("es-MX") === name.toLocaleLowerCase("es-MX"),
      )
        ? current
        : [...current, name],
    );
  };

  const renameCatalogFamily = (currentName: string, nextName: string) => {
    const name = nextName.trim();
    if (!name || name === currentName) return;
    if (
      catalogFamilies.some(
        (family) =>
          family !== currentName &&
          family.toLocaleLowerCase("es-MX") === name.toLocaleLowerCase("es-MX"),
      )
    ) {
      toast.error("Ya existe una familia con ese nombre.");
      return;
    }
    setCatalogFamilies((current) =>
      current.map((family) => (family === currentName ? name : family)),
    );
    setSelectedFamily((current) =>
      current === currentName ? name : current,
    );
    setCatalogFamilyStatus((current) => {
      const next = { ...current, [name]: current[currentName] !== false };
      delete next[currentName];
      return next;
    });
    setCatalogProducts((current) =>
      current.map((product) =>
        product.family === currentName ? { ...product, family: name } : product,
      ),
    );
    setCart((current) =>
      current.map((item) =>
        item.product.family === currentName
          ? { ...item, product: { ...item.product, family: name } }
          : item,
      ),
    );
    setSelectedProduct((current) =>
      current?.family === currentName ? { ...current, family: name } : current,
    );
    setEditingCartItem((current) =>
      current?.product.family === currentName
        ? { ...current, product: { ...current.product, family: name } }
        : current,
    );
    toast.success(`Familia actualizada a ${name} en todas las vistas actuales.`);
  };

  const renameCatalogCategory = (currentName: string, nextName: string) => {
    const name = nextName.trim();
    if (!name || name === currentName) return;
    if (
      catalogCategories.some(
        (category) =>
          category !== currentName &&
          category.toLocaleLowerCase("es-MX") ===
            name.toLocaleLowerCase("es-MX"),
      )
    ) {
      toast.error("Ya existe una categoría con ese nombre.");
      return;
    }
    setCatalogCategories((current) =>
      current.map((category) => (category === currentName ? name : category)),
    );
    setSelectedCategory((current) =>
      current === currentName ? name : current,
    );
    setCatalogCategoryStatus((current) => {
      const next = { ...current, [name]: current[currentName] !== false };
      delete next[currentName];
      return next;
    });
    setCatalogProducts((current) =>
      current.map((product) =>
        product.category === currentName
          ? { ...product, category: name }
          : product,
      ),
    );
    setCart((current) =>
      current.map((item) =>
        item.product.category === currentName
          ? { ...item, product: { ...item.product, category: name } }
          : item,
      ),
    );
    setSelectedProduct((current) =>
      current?.category === currentName
        ? { ...current, category: name }
        : current,
    );
    setEditingCartItem((current) =>
      current?.product.category === currentName
        ? { ...current, product: { ...current.product, category: name } }
        : current,
    );
    toast.success(`Categoría actualizada a ${name} en todas las vistas actuales.`);
  };

  const renameCatalogProduct = (productId: string, nextName: string) => {
    const name = nextName.trim();
    const product = catalogProducts.find((item) => item.id === productId);
    if (!product || !name || product.name === name) return;
    const oldName = product.name;
    setCatalogProducts((current) =>
      current.map((item) => (item.id === productId ? { ...item, name } : item)),
    );
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId
          ? { ...item, product: { ...item.product, name } }
          : item,
      ),
    );
    setSelectedProduct((current) =>
      current?.id === productId ? { ...current, name } : current,
    );
    setEditingCartItem((current) =>
      current?.product.id === productId
        ? { ...current, product: { ...current.product, name } }
        : current,
    );
    const renameTicket = (ticket: Ticket): Ticket => {
      const renamed: Ticket = {
        ...ticket,
        products: ticket.products.map((line) =>
          line.productId === productId ? { ...line, name } : line,
        ),
      };
      if (ticket.inventoryDeductions)
        renamed.inventoryDeductions = ticket.inventoryDeductions.map((line) =>
          line.productId === productId ? { ...line, productName: name } : line,
        );
      if (ticket.returnedProducts)
        renamed.returnedProducts = ticket.returnedProducts.map((line) =>
          line.productId === productId ? { ...line, productName: name } : line,
        );
      return renamed;
    };
    setTickets((current) => current.map(renameTicket));
    setSelectedReceiptTicket((current) =>
      current ? renameTicket(current) : current,
    );
    setEditingTicket((current) => (current ? renameTicket(current) : current));
    setCancellingTicket((current) =>
      current ? renameTicket(current) : current,
    );
    setInventoryMovements((current) =>
      current.map((movement) =>
        movement.productId === productId
          ? { ...movement, productName: name }
          : movement,
      ),
    );
    setOwedProducts((current) =>
      current.map((record) =>
        record.productId === productId
          ? { ...record, productName: name }
          : record,
      ),
    );
    setLayaways((current) =>
      current.map((layaway) => ({
        ...layaway,
        items: layaway.items.map((item) =>
          item.productId === productId ? { ...item, productName: name } : item,
        ),
      })),
    );
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.service === oldName
          ? { ...appointment, service: name }
          : appointment,
      ),
    );
    toast.success(`${oldName} se actualizó a ${name} en todos sus registros.`);
  };

  const setCatalogTaxonomyStatus = (
    type: "FAMILY" | "CATEGORY",
    name: string,
    active: boolean,
  ) => {
    if (type === "FAMILY")
      setCatalogFamilyStatus((current) => ({ ...current, [name]: active }));
    else
      setCatalogCategoryStatus((current) => ({ ...current, [name]: active }));
    if (!active) {
      if (type === "FAMILY")
        setSelectedFamily((current) => (current === name ? "Todos" : current));
      else
        setSelectedCategory((current) =>
          current === name ? "Todas" : current,
        );
      const matches = (product: Product) =>
        type === "FAMILY" ? product.family === name : product.category === name;
      setCart((current) =>
        current.filter((item) => !matches(item.product)),
      );
      if (selectedProduct && matches(selectedProduct)) {
        setProductDialogOpen(false);
        setSelectedProduct(null);
        setEditingCartItem(null);
      }
    }
    toast.info(
      active
        ? `${type === "FAMILY" ? "Familia" : "Categoría"} activada en las pantallas operativas.`
        : `${type === "FAMILY" ? "Familia" : "Categoría"} inactivada sin borrar el historial.`,
    );
  };

  const registerInventoryMovements = (
    adjustments: InventoryMovementDraft[],
    approvalBatchId: string | null = null,
  ) => {
    if (adjustments.length === 0) return;
    const productsById = new Map(
      catalogProducts.map((product) => [product.id, product]),
    );
    const nextInventory = Object.fromEntries(
      Object.entries(branchInventory).map(([branch, stock]) => [
        branch,
        { ...stock },
      ]),
    ) as BranchInventory;
    const nextOwedProducts = owedProducts.map((record) => ({
      ...record,
      deliveryHistory: [...record.deliveryHistory],
    }));
    const settledDeliveries: Array<{
      ticketId: string;
      layawayId: string | null;
      productId: string;
      productName: string;
      branch: string;
      quantity: number;
    }> = [];
    const createdAt = new Date();
    const formattedDate = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(createdAt);
    const movements = adjustments.flatMap<InventoryMovement>(
      (adjustment, index) => {
        const product = productsById.get(adjustment.productId);
        if (!product || product.stock === null) return [];
        const sourceStock = nextInventory[adjustment.sourceBranch] ?? {};
        nextInventory[adjustment.sourceBranch] = sourceStock;
        const previousStock = sourceStock[product.id] ?? 0;
        const newStock =
          adjustment.direction === "ADD"
            ? previousStock + adjustment.quantity
            : previousStock - adjustment.quantity;
        sourceStock[product.id] = newStock;
        let destinationPreviousStock: number | null = null;
        let destinationNewStock: number | null = null;
        if (
          adjustment.direction === "TRANSFER" &&
          adjustment.destinationBranch
        ) {
          const destinationStock =
            nextInventory[adjustment.destinationBranch] ?? {};
          nextInventory[adjustment.destinationBranch] = destinationStock;
          destinationPreviousStock = destinationStock[product.id] ?? 0;
          destinationNewStock = destinationPreviousStock + adjustment.quantity;
          destinationStock[product.id] = destinationNewStock;
        }
        const normalizedReason = adjustment.reason.toLocaleLowerCase("es-MX");
        const category =
          adjustment.direction === "TRANSFER"
            ? ("TRANSFER" as const)
            : adjustment.direction === "ADD"
              ? ("ADJUSTMENT" as const)
              : normalizedReason.includes("tester") ||
                  normalizedReason.includes("demo")
                ? ("DEMO" as const)
                : ("WRITE_OFF" as const);
        const movementId = crypto.randomUUID();
        const settlementBranch =
          adjustment.direction === "ADD"
            ? adjustment.sourceBranch
            : adjustment.direction === "TRANSFER"
              ? adjustment.destinationBranch
              : null;
        const debtIndex = nextOwedProducts.findIndex(
          (record) =>
            record.id === adjustment.settlementOwedProductId &&
            record.status === "PENDING" &&
            record.productId === product.id &&
            record.branch === settlementBranch,
        );
        const debt = debtIndex >= 0 ? nextOwedProducts[debtIndex] : null;
        const remainingDebt = debt
          ? Math.max(0, debt.quantity - debt.deliveredQuantity)
          : 0;
        const settledQuantity = Math.min(
          adjustment.quantity,
          remainingDebt,
        );
        if (debt && settledQuantity > 0) {
          const deliveredQuantity = debt.deliveredQuantity + settledQuantity;
          nextOwedProducts[debtIndex] = {
            ...debt,
            deliveredQuantity,
            status:
              deliveredQuantity >= debt.quantity ? "FULFILLED" : "PENDING",
            deliveryHistory: [
              ...debt.deliveryHistory,
              {
                id: crypto.randomUUID(),
                quantity: settledQuantity,
                deliveredAt: formattedDate,
                deliveredAtIso: createdAt.toISOString(),
                branch: debt.branch,
                movementId,
              },
            ],
          };
          settledDeliveries.push({
            ticketId: debt.ticketId,
            layawayId: debt.layawayId,
            productId: debt.productId,
            productName: debt.productName,
            branch: debt.branch,
            quantity: settledQuantity,
          });
        }
        return [
          {
            id: movementId,
            folio: `MOV-${Date.now().toString(36).toUpperCase()}-${index + 1}`,
            createdAt: formattedDate,
            createdAtIso: createdAt.toISOString(),
            productId: product.id,
            productName: product.name,
            direction: adjustment.direction,
            reason: adjustment.reason,
            quantity: adjustment.quantity,
            previousStock,
            newStock,
            sourceBranch: adjustment.sourceBranch,
            destinationBranch: adjustment.destinationBranch,
            destinationPreviousStock,
            destinationNewStock,
            comment:
              settledQuantity > 0 && debt
                ? `${adjustment.comment.trim()}${adjustment.comment.trim() ? " · " : ""}Entrega asignada a ${debt.clientName}`
                : adjustment.comment.trim(),
            category,
            unitCostUsd: product.costUsd,
            unitCostMxn: product.costMxn,
            totalCostUsd: product.costUsd * adjustment.quantity,
            totalCostMxn: product.costMxn * adjustment.quantity,
            settledOwedProductId: debt?.id ?? null,
            settledClientName: debt?.clientName ?? null,
            settledClientPhone: debt?.clientPhone ?? null,
            settledSellerNames: debt?.sellerNames ?? [],
            settledQuantity,
            approvalBatchId,
            reversalOfMovementId: null,
          },
        ];
      },
    );
    setBranchInventory(nextInventory);
    setCatalogProducts((current) =>
      current.map((product) =>
        product.stock !== null
          ? { ...product, stock: nextInventory.Polanco?.[product.id] ?? 0 }
          : product,
      ),
    );
    setInventoryMovements((current) => [
      ...[...movements].reverse(),
      ...current,
    ]);
    movements.forEach((movement) => {
      const type: OperationalNotificationType =
        movement.direction === "ADD"
          ? "INVENTORY_ADD"
          : movement.direction === "TRANSFER"
            ? "INVENTORY_TRANSFER"
            : "INVENTORY_REMOVE";
      pushOperationalNotification({
        type,
        title:
          movement.direction === "ADD"
            ? `Entrada aprobada · ${movement.folio}`
            : movement.direction === "TRANSFER"
              ? `Transferencia aprobada · ${movement.folio}`
              : `Baja aprobada · ${movement.folio}`,
        detail: `${movement.productName} · ${movement.quantity} pz · ${movement.reason}.`,
        moduleLabel: "Inventory · Movimientos",
        branch:
          movement.direction === "TRANSFER" && movement.destinationBranch
            ? `${movement.sourceBranch} → ${movement.destinationBranch}`
            : movement.sourceBranch,
        actorId: masterUser.id,
        actorName: masterUser.name,
        reference: movement.folio,
        createdAtIso: movement.createdAtIso,
      });
    });
    if (settledDeliveries.length > 0) {
      setOwedProducts(nextOwedProducts);
      setTickets((current) =>
        current.map((ticket) => {
          const deliveries = settledDeliveries.filter(
            (delivery) => delivery.ticketId === ticket.id,
          );
          if (deliveries.length === 0) return ticket;
          const deductions = (ticket.inventoryDeductions ?? []).map((line) => ({
            ...line,
          }));
          deliveries.forEach((delivery) => {
            const existing = deductions.find(
              (line) =>
                line.productId === delivery.productId &&
                line.branch === delivery.branch,
            );
            if (existing) existing.quantity += delivery.quantity;
            else deductions.push({
              productId: delivery.productId,
              productName: delivery.productName,
              quantity: delivery.quantity,
              branch: delivery.branch,
            });
          });
          return { ...ticket, inventoryDeductions: deductions };
        }),
      );
      setLayaways((current) =>
        current.map((layaway) => {
          const deliveries = settledDeliveries.filter(
            (delivery) => delivery.layawayId === layaway.id,
          );
          if (deliveries.length === 0) return layaway;
          return {
            ...layaway,
            items: layaway.items.map((item) => {
              const delivered = deliveries
                .filter((entry) => entry.productId === item.productId)
                .reduce((sum, entry) => sum + entry.quantity, 0);
              return delivered > 0
                ? {
                    ...item,
                    deliveredQuantity: Math.min(
                      item.quantity,
                      item.deliveredQuantity + delivered,
                    ),
                  }
                : item;
            }),
          };
        }),
      );
    }
    toast.success(
      `${movements.length} movimientos aplicados al inventario por sucursal${settledDeliveries.length > 0 ? `; ${settledDeliveries.length} entregas asignadas` : ""}.`,
    );
  };

  const refreshApiInventory = async () => {
    const [locations, balances, movements] = await Promise.all([
      posApi.inventoryLocations(), posApi.inventoryBalances(), posApi.inventoryMovements({ pageSize: 100 }),
    ]);
    setApiInventoryLocations(locations);
    const nextBranches: BranchInventory = {};
    for (const location of locations.filter((candidate) => candidate.type === "BRANCH" && candidate.branchName)) nextBranches[location.branchName!] = {};
    const nextWarehouse: WarehouseStock = {};
    for (const balance of balances) {
      const location = locations.find((candidate) => candidate.id === balance.locationId);
      if (location?.type === "WAREHOUSE") nextWarehouse[balance.itemId] = Number(balance.availableQuantity);
      else if (location?.branchName) {
        nextBranches[location.branchName] ??= {};
        nextBranches[location.branchName]![balance.itemId] = Number(balance.availableQuantity);
      }
    }
    setBranchInventory(nextBranches);
    setWarehouseStock(nextWarehouse);
    setInventoryMovements(inventoryMovementsFromDto(movements.items));
    if (apiSession?.actor.isMaster || apiPermissions.includes("INVENTORY_ADJUST")) {
      const batches = await posApi.inventoryAdjustmentBatches();
      setInventoryAdjustmentBatches(batches.map((batch) => adjustmentBatchFromDto(batch, locations)));
    }
  };

  const apiAdjustmentLines = (adjustments: InventoryMovementDraft[]) => adjustments.map((adjustment) => {
    const fromLocationId = adjustment.sourceBranch ? apiInventoryLocations.find((location) => (location.branchName ?? location.name) === adjustment.sourceBranch)?.id ?? null : null;
    const toLocationId = adjustment.destinationBranch ? apiInventoryLocations.find((location) => (location.branchName ?? location.name) === adjustment.destinationBranch)?.id ?? null : null;
    const reason = adjustment.reason.toLocaleLowerCase("es-MX");
    const type = adjustment.direction === "ADD" ? "ADD" : adjustment.direction === "TRANSFER" ? "TRANSFER" : reason.includes("tester") || reason.includes("demo") ? "DEMO" : reason.includes("dañ") || reason.includes("damage") || reason.includes("lost") ? "WRITE_OFF" : "REMOVE";
    return { itemId: adjustment.productId, type: type as "ADD" | "REMOVE" | "TRANSFER" | "DEMO" | "WRITE_OFF", fromLocationId, toLocationId, quantity: adjustment.quantity.toFixed(2), reason: adjustment.reason, notes: adjustment.comment || null };
  });

  const requestInventoryBatch = (adjustments: InventoryMovementDraft[]) => {
    if (adjustments.length === 0) return;
    if (posApiEnabled) {
      void posApi.createInventoryAdjustmentBatch({ lines: apiAdjustmentLines(adjustments) }).then(async (created) => {
        setInventoryAdjustmentBatches((current) => [adjustmentBatchFromDto(created, apiInventoryLocations), ...current]);
        toast.info(`${created.folio} quedó en espera de aprobación. El inventario no cambió.`);
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo crear el lote."));
      return;
    }
    const createdAt = new Date();
    const batch: InventoryAdjustmentBatch = {
      id: crypto.randomUUID(),
      folio: `LOT-${createdAt.getTime().toString(36).toUpperCase()}`,
      createdAt: new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(createdAt),
      createdAtIso: createdAt.toISOString(),
      adjustments,
      status: "PENDING",
      resolvedAt: null,
    };
    setInventoryAdjustmentBatches((current) => [batch, ...current]);
    toast.info(
      `${batch.folio} quedó en espera de aprobación. El inventario no cambió.`,
    );
  };

  const approveInventoryBatch = (batchId: string) => {
    const batch = inventoryAdjustmentBatches.find(
      (candidate) => candidate.id === batchId,
    );
    if (!batch || batch.status !== "PENDING") return;
    if (posApiEnabled) {
      void posApi.approveInventoryAdjustmentBatch(batchId).then(async () => {
        await refreshApiInventory();
        toast.success(`${batch.folio} aplicado al inventario.`);
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo aprobar el lote."));
      return;
    }
    registerInventoryMovements(batch.adjustments, batch.id);
    setInventoryAdjustmentBatches((current) =>
      current.map((candidate) =>
        candidate.id === batchId
          ? {
              ...candidate,
              status: "APPROVED",
              resolvedAt: new Intl.DateTimeFormat("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date()),
            }
          : candidate,
      ),
    );
  };

  const updateInventoryBatch = (
    batchId: string,
    adjustments: InventoryMovementDraft[],
  ) => {
    const batch = inventoryAdjustmentBatches.find(
      (candidate) => candidate.id === batchId,
    );
    if (!batch || batch.status !== "PENDING") return;
    if (adjustments.length === 0) {
      cancelInventoryBatch(batchId);
      return;
    }
    if (posApiEnabled) {
      void posApi.updateInventoryAdjustmentBatch(batchId, { lines: apiAdjustmentLines(adjustments) }).then((updated) => {
        setInventoryAdjustmentBatches((current) => current.map((candidate) => candidate.id === updated.id ? adjustmentBatchFromDto(updated, apiInventoryLocations) : candidate));
        toast.info(`${updated.folio} actualizado antes de su aprobación.`);
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo actualizar el lote."));
      return;
    }
    setInventoryAdjustmentBatches((current) =>
      current.map((candidate) =>
        candidate.id === batchId
          ? { ...candidate, adjustments }
          : candidate,
      ),
    );
    toast.info(`${batch.folio} actualizado antes de su aprobación.`);
  };

  const cancelInventoryBatch = (batchId: string) => {
    const batch = inventoryAdjustmentBatches.find(
      (candidate) => candidate.id === batchId,
    );
    if (
      !batch ||
      (batch.status !== "PENDING" && batch.status !== "APPROVED")
    )
      return;
    if (posApiEnabled) {
      void posApi.cancelInventoryAdjustmentBatch(batchId).then(async (updated) => {
        await refreshApiInventory();
        toast.success(updated.status === "CANCELED" ? `${updated.folio} cancelado sin impacto.` : `${updated.folio} revertido con un movimiento compensatorio.`);
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo cancelar el lote."));
      return;
    }
    const resolvedAt = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    if (batch.status === "PENDING") {
      setInventoryAdjustmentBatches((current) =>
        current.map((candidate) =>
          candidate.id === batchId
            ? {
                ...candidate,
                status: "CANCELLED",
                resolvedAt,
              }
            : candidate,
        ),
      );
      toast.info(`${batch.folio} cancelado. No se generaron movimientos.`);
      return;
    }

    const appliedMovements = inventoryMovements.filter(
      (movement) =>
        movement.approvalBatchId === batchId &&
        !movement.reversalOfMovementId,
    );
    if (appliedMovements.length === 0) {
      toast.error("No se encontraron movimientos aplicados para revertir.");
      return;
    }
    const nextInventory = Object.fromEntries(
      Object.entries(branchInventory).map(([branch, stock]) => [
        branch,
        { ...stock },
      ]),
    ) as BranchInventory;
    const reversedAt = new Date();
    const reversalMovements = appliedMovements.map<InventoryMovement>(
      (movement, index) => {
        if (movement.direction === "TRANSFER" && movement.destinationBranch) {
          const reversalSource = movement.destinationBranch;
          const reversalDestination = movement.sourceBranch;
          const sourceStock = nextInventory[reversalSource] ?? {};
          const destinationStock = nextInventory[reversalDestination] ?? {};
          nextInventory[reversalSource] = sourceStock;
          nextInventory[reversalDestination] = destinationStock;
          const previousStock = sourceStock[movement.productId] ?? 0;
          const newStock = previousStock - movement.quantity;
          const destinationPreviousStock =
            destinationStock[movement.productId] ?? 0;
          const destinationNewStock =
            destinationPreviousStock + movement.quantity;
          sourceStock[movement.productId] = newStock;
          destinationStock[movement.productId] = destinationNewStock;
          return {
            ...movement,
            id: crypto.randomUUID(),
            folio: `REV-${batch.folio}-${index + 1}`,
            createdAt: resolvedAt,
            createdAtIso: reversedAt.toISOString(),
            direction: "TRANSFER",
            reason: `Reversa de aprobación ${batch.folio}`,
            previousStock,
            newStock,
            sourceBranch: reversalSource,
            destinationBranch: reversalDestination,
            destinationPreviousStock,
            destinationNewStock,
            comment: `Cancelación de ${movement.folio} · ${movement.comment || "sin comentario"}`,
            category: "TRANSFER",
            totalCostUsd: -movement.totalCostUsd,
            totalCostMxn: -movement.totalCostMxn,
            approvalBatchId: batchId,
            reversalOfMovementId: movement.id,
            settledQuantity: 0,
          };
        }
        const sourceStock = nextInventory[movement.sourceBranch] ?? {};
        nextInventory[movement.sourceBranch] = sourceStock;
        const previousStock = sourceStock[movement.productId] ?? 0;
        const newStock =
          movement.direction === "ADD"
            ? previousStock - movement.quantity
            : previousStock + movement.quantity;
        sourceStock[movement.productId] = newStock;
        return {
          ...movement,
          id: crypto.randomUUID(),
          folio: `REV-${batch.folio}-${index + 1}`,
          createdAt: resolvedAt,
          createdAtIso: reversedAt.toISOString(),
          direction: movement.direction === "ADD" ? "REMOVE" : "ADD",
          reason: `Reversa de aprobación ${batch.folio}`,
          previousStock,
          newStock,
          destinationBranch: null,
          destinationPreviousStock: null,
          destinationNewStock: null,
          comment: `Cancelación de ${movement.folio} · ${movement.comment || "sin comentario"}`,
          category: "ADJUSTMENT",
          totalCostUsd: -movement.totalCostUsd,
          totalCostMxn: -movement.totalCostMxn,
          approvalBatchId: batchId,
          reversalOfMovementId: movement.id,
          settledQuantity: 0,
        };
      },
    );
    const settlementUndos = appliedMovements.flatMap((movement) => {
      if (!movement.settledOwedProductId || !movement.settledQuantity) return [];
      const debt = owedProducts.find(
        (record) => record.id === movement.settledOwedProductId,
      );
      return debt
        ? [
            {
              movementId: movement.id,
              debtId: debt.id,
              ticketId: debt.ticketId,
              layawayId: debt.layawayId,
              productId: debt.productId,
              branch: debt.branch,
              quantity: movement.settledQuantity,
            },
          ]
        : [];
    });
    if (settlementUndos.length > 0) {
      setOwedProducts((current) =>
        current.map((record) => {
          const undos = settlementUndos.filter(
            (undo) => undo.debtId === record.id,
          );
          if (undos.length === 0) return record;
          const quantity = undos.reduce(
            (sum, undo) => sum + undo.quantity,
            0,
          );
          return {
            ...record,
            deliveredQuantity: Math.max(0, record.deliveredQuantity - quantity),
            status: record.status === "CANCELLED" ? "CANCELLED" : "PENDING",
            deliveryHistory: record.deliveryHistory.filter(
              (delivery) =>
                !undos.some((undo) => undo.movementId === delivery.movementId),
            ),
          };
        }),
      );
      setTickets((current) =>
        current.map((ticket) => {
          const undos = settlementUndos.filter(
            (undo) => undo.ticketId === ticket.id,
          );
          if (undos.length === 0) return ticket;
          const deductions = (ticket.inventoryDeductions ?? []).flatMap(
            (line) => {
              const quantity = undos
                .filter(
                  (undo) =>
                    undo.productId === line.productId &&
                    undo.branch === line.branch,
                )
                .reduce((sum, undo) => sum + undo.quantity, 0);
              const nextQuantity = Math.max(0, line.quantity - quantity);
              return nextQuantity > 0
                ? [{ ...line, quantity: nextQuantity }]
                : [];
            },
          );
          return { ...ticket, inventoryDeductions: deductions };
        }),
      );
      setLayaways((current) =>
        current.map((layaway) => {
          const undos = settlementUndos.filter(
            (undo) => undo.layawayId === layaway.id,
          );
          if (undos.length === 0) return layaway;
          return {
            ...layaway,
            items: layaway.items.map((item) => {
              const quantity = undos
                .filter((undo) => undo.productId === item.productId)
                .reduce((sum, undo) => sum + undo.quantity, 0);
              return quantity > 0
                ? {
                    ...item,
                    deliveredQuantity: Math.max(
                      0,
                      item.deliveredQuantity - quantity,
                    ),
                  }
                : item;
            }),
          };
        }),
      );
    }
    setBranchInventory(nextInventory);
    setCatalogProducts((current) =>
      current.map((product) =>
        product.stock === null
          ? product
          : { ...product, stock: nextInventory.Polanco?.[product.id] ?? 0 },
      ),
    );
    setInventoryMovements((current) => [
      ...[...reversalMovements].reverse(),
      ...current,
    ]);
    setInventoryAdjustmentBatches((current) =>
      current.map((candidate) =>
        candidate.id === batchId
          ? {
              ...candidate,
              status: "REVERSED",
              resolvedAt,
            }
          : candidate,
      ),
    );
    toast.success(
      `${batch.folio} cancelado y revertido en ${reversalMovements.length} movimientos de inventario.`,
    );
  };

  const fulfillOwedProduct = (owedProductId: string) => {
    const record = owedProducts.find((item) => item.id === owedProductId);
    if (!record || record.status !== "PENDING") return;
    const available = branchInventory[record.branch]?.[record.productId] ?? 0;
    const remaining = Math.max(
      0,
      record.quantity - record.deliveredQuantity,
    );
    const pendingCommitted = owedProducts
      .filter(
        (item) =>
          item.status === "PENDING" &&
          item.inventoryCommitted &&
          item.branch === record.branch &&
          item.productId === record.productId,
      )
      .reduce(
        (sum, item) =>
          sum + Math.max(0, item.quantity - item.deliveredQuantity),
        0,
      );
    const coveredCommittedUnits = Math.max(
      0,
      pendingCommitted - Math.max(0, -available),
    );
    const deliveredNow = Math.min(
      remaining,
      record.inventoryCommitted
        ? coveredCommittedUnits
        : Math.max(available, 0),
    );
    if (deliveredNow < 1) {
      toast.error(
        "Todavía no hay entrada de inventario disponible para asignar a esta clienta.",
      );
      return;
    }
    if (posApiEnabled) {
      void posApi.deliverOwedProduct(record.id, deliveredNow.toFixed(2)).then((delivery) => {
        setOwedProducts((current) => current.map((item) => item.id !== owedProductId ? item : {
          ...item,
          deliveredQuantity: item.deliveredQuantity + deliveredNow,
          status: item.deliveredQuantity + deliveredNow >= item.quantity ? "FULFILLED" : "PENDING",
          deliveryHistory: [...item.deliveryHistory, {
            id: delivery.id,
            quantity: deliveredNow,
            deliveredAt: new Intl.DateTimeFormat("es-MX", {
              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
            }).format(new Date(delivery.createdAt)),
            deliveredAtIso: delivery.createdAt,
            branch: item.branch,
            movementId: delivery.id,
          }],
        }));
        toast.success(`${deliveredNow} ${record.productName} quedó entregado a ${record.clientName}.`);
      }).catch((error: unknown) => toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
          ?? "No se pudo registrar la entrega.",
      ));
      return;
    }
    const createdAt = new Date();
    const createdAtLabel = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(createdAt);
    const movementId = crypto.randomUUID();
    const newStock = record.inventoryCommitted
      ? available
      : available - deliveredNow;
    const nextBranchStock = {
      ...(branchInventory[record.branch] ?? {}),
      [record.productId]: newStock,
    };
    const nextInventory = {
      ...branchInventory,
      [record.branch]: nextBranchStock,
    };
    setBranchInventory(nextInventory);
    if (record.branch === "Polanco") {
      setCatalogProducts((current) =>
        current.map((product) =>
          product.id === record.productId && product.stock !== null
            ? { ...product, stock: nextBranchStock[record.productId] ?? 0 }
            : product,
        ),
      );
    }
    setOwedProducts((current) =>
      current.map((item) =>
        item.id === owedProductId
          ? {
              ...item,
              deliveredQuantity: item.deliveredQuantity + deliveredNow,
              status:
                item.deliveredQuantity + deliveredNow >= item.quantity
                  ? "FULFILLED"
                  : "PENDING",
              deliveryHistory: [
                ...item.deliveryHistory,
                {
                  id: crypto.randomUUID(),
                  quantity: deliveredNow,
                  deliveredAt: createdAtLabel,
                  deliveredAtIso: createdAt.toISOString(),
                  branch: item.branch,
                  movementId,
                },
              ],
            }
          : item,
      ),
    );
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== record.ticketId) return ticket;
        const deductions = (ticket.inventoryDeductions ?? []).map((line) => ({
          ...line,
        }));
        const existing = deductions.find(
          (line) =>
            line.productId === record.productId &&
            line.branch === record.branch,
        );
        if (existing) existing.quantity += deliveredNow;
        else deductions.push({
          productId: record.productId,
          productName: record.productName,
          quantity: deliveredNow,
          branch: record.branch,
        });
        return { ...ticket, inventoryDeductions: deductions };
      }),
    );
    if (record.layawayId) {
      setLayaways((current) =>
        current.map((layaway) =>
          layaway.id === record.layawayId
            ? {
                ...layaway,
                items: layaway.items.map((item) =>
                  item.productId === record.productId
                    ? {
                        ...item,
                        deliveredQuantity: Math.min(
                          item.quantity,
                          item.deliveredQuantity + deliveredNow,
                        ),
                      }
                    : item,
                ),
              }
            : layaway,
        ),
      );
    }
    const product = catalogProducts.find(
      (candidate) => candidate.id === record.productId,
    );
    if (product) {
      setInventoryMovements((current) => [
        {
          id: movementId,
          folio: `ENT-${record.ticketId}`,
          createdAt: createdAtLabel,
          createdAtIso: createdAt.toISOString(),
          productId: record.productId,
          productName: record.productName,
          direction: "REMOVE",
          reason: `Entrega pendiente ${record.ticketId}`,
          quantity: deliveredNow,
          previousStock: available,
          newStock,
          sourceBranch: record.branch,
          destinationBranch: null,
          destinationPreviousStock: null,
          destinationNewStock: null,
          comment: `Producto entregado a ${record.clientName}`,
          category: "DELIVERY",
          unitCostUsd: product.costUsd,
          unitCostMxn: product.costMxn,
          totalCostUsd: product.costUsd * deliveredNow,
          totalCostMxn: product.costMxn * deliveredNow,
          settledOwedProductId: record.id,
          settledClientName: record.clientName,
          settledClientPhone: record.clientPhone,
          settledSellerNames: record.sellerNames,
          settledQuantity: deliveredNow,
        },
        ...current,
      ]);
    }
    toast.success(
      `${deliveredNow} ${record.productName} quedó${deliveredNow === 1 ? "" : "n"} entregado${deliveredNow === 1 ? "" : "s"} a ${record.clientName}.`,
    );
  };

  const registerLayawayPayment = async (
    layawayId: string,
    requestedPayments: PaymentEntry[],
    sellerId: string,
    deliveredCartItemIds: string[],
  ) => {
    const layaway = layaways.find((item) => item.id === layawayId);
    const seller = sellers.find((item) => item.id === sellerId);
    if (!layaway || layaway.status === "PAID" || !seller) return;
    if (posApiEnabled && !operatingOffline) {
      void posApi.addLayawayPayment(layaway.id, requestedPayments.map((payment) => ({
        methodId: payment.methodId,
        amount: payment.amount.toFixed(2),
        ...(payment.authorizationCode ? { reference: payment.authorizationCode, authorizationLastFour: payment.authorizationCode } : {}),
        ...(payment.cardOrBank ? { institution: payment.cardOrBank } : {}),
      })), deliveredCartItemIds).then((dto) => {
        const updatedTicket = ticketFromDto(dto);
        const updatedLayaway = layawayFromDto(dto);
        setTickets((current) => current.map((ticket) => ticket.backendId === dto.id ? updatedTicket : ticket));
        setLayaways((current) => updatedLayaway
          ? current.map((item) => item.id === updatedLayaway.id ? updatedLayaway : item)
          : current.map((item) => item.id === dto.id ? { ...item, amountPaid: Number(dto.amountReceived), balanceDue: 0, status: "PAID" } : item));
        const updatedOwed = owedProductsFromDto(dto);
        setOwedProducts((current) => [
          ...updatedOwed,
          ...current.filter((item) => item.layawayId !== dto.id),
        ]);
        toast.success(`Abono registrado. Saldo ${formatCurrency(Number(dto.pendingAmount))}.`);
      }).catch((error: unknown) => toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "No se pudo registrar el abono."));
      return;
    }
    let offlinePaymentOperationId: string | undefined;
    if (posApiEnabled) {
      if (!offlineBootstrap) {
        toast.error("La credencial no tiene una caché offline vigente.");
        return;
      }
      try {
        const queued = await enqueueOfflineOperation({
          kind: "LAYAWAY_PAYMENT",
          entityId: layaway.id,
          payload: {
            payments: requestedPayments.map((payment) => ({
              methodId: payment.methodId,
              amount: payment.amount.toFixed(2),
              ...(payment.authorizationCode ? { reference: payment.authorizationCode, authorizationLastFour: payment.authorizationCode } : {}),
              ...(payment.cardOrBank ? { institution: payment.cardOrBank } : {}),
            })),
            deliveredTicketLineIds: deliveredCartItemIds,
          },
        }, offlineBootstrap);
        offlinePaymentOperationId = queued.id;
        setOfflineQueue(await offlineQueueStatus(offlineBootstrap));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo proteger el abono local.");
        return;
      }
    }
    let remainingPaymentCapacity = layaway.balanceDue;
    const appliedPayments = requestedPayments
      .map((payment) => {
        const amount = Math.min(
          remainingPaymentCapacity,
          Math.max(0, Number(payment.amount) || 0),
        );
        remainingPaymentCapacity -= amount;
        return { ...payment, amount };
      })
      .filter((payment) => payment.amount > 0);
    const amount = appliedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    if (amount <= 0) {
      toast.error("Ingresa un monto de abono mayor a cero.");
      return;
    }
    const createdAt = new Date();
    const createdAtLabel = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(createdAt);
    const paymentFolio = `APT-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const balanceDue = Math.max(0, layaway.balanceDue - amount);
    const isLiquidation = balanceDue < 0.01;
    const liquidationDeliveryIds = new Set(deliveredCartItemIds);
    const layawayBranchStock = {
      ...(branchInventory[layaway.branch] ?? {}),
    };
    const nextOwedProducts = owedProducts.map((record) => ({
      ...record,
      deliveryHistory: [...record.deliveryHistory],
    }));
    const newDebts: OwedProductRecord[] = [];
    const liquidationMovements: InventoryMovement[] = [];
    const liquidationDeliveredLines: TicketInventoryLine[] = [];
    const updatedItems = layaway.items.map((item) => {
      if (!isLiquidation || item.kind !== "PRODUCT") return item;
      const requestedAtLiquidation = liquidationDeliveryIds.has(
        item.cartItemId,
      );
      let existingDeliveredNow = 0;
      if (requestedAtLiquidation) {
        const pendingCommitted = nextOwedProducts
          .filter(
            (record) =>
              record.status === "PENDING" &&
              record.inventoryCommitted &&
              record.branch === layaway.branch &&
              record.productId === item.productId,
          )
          .reduce(
            (sum, record) =>
              sum +
              Math.max(0, record.quantity - record.deliveredQuantity),
            0,
          );
        let assignable = Math.max(
          0,
          pendingCommitted -
            Math.max(0, -(layawayBranchStock[item.productId] ?? 0)),
        );
        nextOwedProducts.forEach((record, index) => {
          if (
            assignable < 1 ||
            record.status !== "PENDING" ||
            record.layawayId !== layaway.id ||
            record.productId !== item.productId
          )
            return;
          const remaining = Math.max(
            0,
            record.quantity - record.deliveredQuantity,
          );
          const deliveredFromDebt = Math.min(remaining, assignable);
          if (deliveredFromDebt < 1) return;
          const movementId = crypto.randomUUID();
          const deliveredQuantity =
            record.deliveredQuantity + deliveredFromDebt;
          nextOwedProducts[index] = {
            ...record,
            deliveredQuantity,
            status:
              deliveredQuantity >= record.quantity ? "FULFILLED" : "PENDING",
            deliveryHistory: [
              ...record.deliveryHistory,
              {
                id: crypto.randomUUID(),
                quantity: deliveredFromDebt,
                deliveredAt: createdAtLabel,
                deliveredAtIso: createdAt.toISOString(),
                branch: layaway.branch,
                movementId,
              },
            ],
          };
          const product = catalogProducts.find(
            (candidate) => candidate.id === item.productId,
          );
          if (product) {
            const currentStock = layawayBranchStock[item.productId] ?? 0;
            liquidationMovements.push({
              id: movementId,
              folio: `ENT-${paymentFolio}-${liquidationMovements.length + 1}`,
              createdAt: createdAtLabel,
              createdAtIso: createdAt.toISOString(),
              productId: item.productId,
              productName: item.productName,
              direction: "REMOVE",
              reason: `Entrega solicitada al liquidar ${layaway.originalTicketId}`,
              quantity: deliveredFromDebt,
              previousStock: currentStock,
              newStock: currentStock,
              sourceBranch: layaway.branch,
              destinationBranch: null,
              destinationPreviousStock: null,
              destinationNewStock: null,
              comment: `Producto previamente comprometido entregado a ${layaway.clientName}`,
              category: "DELIVERY",
              unitCostUsd: product.costUsd,
              unitCostMxn: product.costMxn,
              totalCostUsd: product.costUsd * deliveredFromDebt,
              totalCostMxn: product.costMxn * deliveredFromDebt,
              settledOwedProductId: record.id,
              settledClientName: layaway.clientName,
              settledClientPhone: layaway.clientPhone,
              settledSellerNames: layaway.sellerIds.flatMap((id) => {
                const debtSeller = sellers.find((candidate) => candidate.id === id);
                return debtSeller ? [debtSeller.name] : [];
              }),
              settledQuantity: deliveredFromDebt,
            });
          }
          existingDeliveredNow += deliveredFromDebt;
          assignable -= deliveredFromDebt;
        });
      }
      const alreadyOwed = nextOwedProducts
        .filter(
          (record) =>
            record.layawayId === layaway.id &&
            record.productId === item.productId &&
            record.status === "PENDING",
        )
        .reduce(
          (sum, record) =>
            sum + Math.max(0, record.quantity - record.deliveredQuantity),
          0,
        );
      const quantityToDeliver = Math.max(
        0,
        item.quantity -
          item.deliveredQuantity -
          existingDeliveredNow -
          alreadyOwed,
      );
      const available = layawayBranchStock[item.productId] ?? 0;
      const delivered = requestedAtLiquidation
        ? Math.min(Math.max(available, 0), quantityToDeliver)
        : 0;
      const shortage = quantityToDeliver - delivered;
      const newStock = available - quantityToDeliver;
      layawayBranchStock[item.productId] = newStock;
      const product = catalogProducts.find(
        (candidate) => candidate.id === item.productId,
      );
      if (quantityToDeliver > 0 && product) {
        liquidationMovements.push({
          id: crypto.randomUUID(),
          folio: `LIQ-${paymentFolio}-${liquidationMovements.length + 1}`,
          createdAt: createdAtLabel,
          createdAtIso: createdAt.toISOString(),
          productId: item.productId,
          productName: item.productName,
          direction: "REMOVE",
          reason: `Entrega por liquidación ${layaway.originalTicketId}`,
          quantity: quantityToDeliver,
          previousStock: available,
          newStock,
          sourceBranch: layaway.branch,
          destinationBranch: null,
          destinationPreviousStock: null,
          destinationNewStock: null,
          comment:
            shortage > 0
              ? `Liquidación ${paymentFolio} · ${delivered} entregado(s), ${shortage} pendiente(s)${requestedAtLiquidation ? "" : " por recoger"}`
              : `Liquidación registrada en ${paymentFolio}`,
          category: "DELIVERY",
          unitCostUsd: product.costUsd,
          unitCostMxn: product.costMxn,
          totalCostUsd: product.costUsd * quantityToDeliver,
          totalCostMxn: product.costMxn * quantityToDeliver,
        });
      }
      if (shortage > 0) {
        newDebts.push({
          id: crypto.randomUUID(),
          ticketId: paymentFolio,
          layawayId: layaway.id,
          clientId: layaway.clientId,
          clientName: layaway.clientName,
          clientPhone: layaway.clientPhone,
          productId: item.productId,
          productName: item.productName,
          quantity: shortage,
          deliveredQuantity: 0,
          branch: layaway.branch,
          sellerIds: layaway.sellerIds,
          sellerNames: layaway.sellerIds.flatMap((sellerId) => {
            const debtSeller = sellers.find((candidate) => candidate.id === sellerId);
            return debtSeller ? [debtSeller.name] : [];
          }),
          inventoryCommitted: true,
          deliveryHistory: [],
          reason: "LAYAWAY_LIQUIDATION",
          createdAt: createdAtLabel,
          createdAtIso: createdAt.toISOString(),
          status: "PENDING",
        });
      }
      const deliveredAtLiquidation = existingDeliveredNow + delivered;
      if (deliveredAtLiquidation > 0) {
        liquidationDeliveredLines.push({
          productId: item.productId,
          productName: item.productName,
          quantity: deliveredAtLiquidation,
          branch: layaway.branch,
        });
      }
      return {
        ...item,
        deliveredQuantity:
          item.deliveredQuantity + deliveredAtLiquidation,
      };
    });
    const paymentEntries = appliedPayments.map((payment) => ({
      ...payment,
      folio: paymentFolio,
      createdAt: createdAtLabel,
      createdAtIso: createdAt.toISOString(),
      relatedTicketId: layaway.originalTicketId,
    }));
    const paymentRecord = {
      id: crypto.randomUUID(),
      folio: paymentFolio,
      createdAt: createdAtLabel,
      createdAtIso: createdAt.toISOString(),
      amount,
      methodId: paymentEntries[0]?.methodId ?? "CASH",
      payments: paymentEntries,
      balanceAfter: balanceDue,
      sellerId: seller.id,
      sellerName: seller.name,
    };
    setLayaways((current) =>
      current.map((item) =>
        item.id === layaway.id
          ? {
              ...item,
              amountPaid: item.amountPaid + amount,
              balanceDue,
              status: isLiquidation ? "PAID" : "ACTIVE",
              items: updatedItems,
              payments: [...item.payments, paymentRecord],
            }
          : item,
      ),
    );
    if (isLiquidation) {
      setBranchInventory((current) => ({
        ...current,
        [layaway.branch]: layawayBranchStock,
      }));
      setCatalogProducts((current) =>
        current.map((product) =>
          product.stock === null
            ? product
            : {
                ...product,
                stock: layawayBranchStock[product.id] ?? 0,
              },
        ),
      );
      if (
        newDebts.length > 0 ||
        nextOwedProducts.some(
          (record, index) =>
            record.deliveredQuantity !== owedProducts[index]?.deliveredQuantity,
        )
      )
        setOwedProducts([...newDebts, ...nextOwedProducts]);
      if (liquidationMovements.length > 0)
        setInventoryMovements((current) => [
          ...[...liquidationMovements].reverse(),
          ...current,
        ]);
    }
    const paymentTicket: Ticket = {
      id: paymentFolio,
      ...(offlinePaymentOperationId ? { backendId: offlinePaymentOperationId } : {}),
      createdAt: createdAtLabel,
      createdAtIso: createdAt.toISOString(),
      clientName: layaway.clientName,
      clientPhone: layaway.clientPhone,
      branchName: layaway.branch,
      branchAddress:
        branchAddresses[layaway.branch] ?? "Dirección pendiente de configurar",
      sellerSummary: seller.name,
      items: 1,
      discountAmount: 0,
      subtotal: amount,
      total: amount,
      deviation: 0,
      paymentMethod: paymentRecord.methodId,
      payments: paymentEntries,
      amountPaid: amount,
      balanceDue,
      paymentStatus: isLiquidation ? "PAID" : "LAYAWAY",
      products: [
        {
          productId: `layaway-payment-${layaway.id}`,
          name: `Abono a apartado ${layaway.originalTicketId}`,
          quantity: 1,
          total: amount,
        },
      ],
      sellerSales: [
        { sellerId: seller.id, sellerName: seller.name, amount: 0 },
      ],
      status: "COMPLETED",
      ticketType: "LAYAWAY_PAYMENT",
      relatedTicketId: layaway.originalTicketId,
      inventoryDeductions: liquidationDeliveredLines,
      syncStatus: isOnline && !operatingOffline ? "SYNCED" : "PENDING_SYNC",
      createdOffline: !isOnline || operatingOffline,
      syncedAtIso: isOnline && !operatingOffline ? createdAt.toISOString() : null,
    };
    setTickets((current) => [
      paymentTicket,
      ...current.map((ticket): Ticket =>
        ticket.id === layaway.originalTicketId
          ? {
              ...ticket,
              amountPaid: ticket.amountPaid + amount,
              balanceDue,
              paymentStatus: isLiquidation
                ? ("PAID" as const)
                : ("LAYAWAY" as const),
              syncStatus: isOnline ? "SYNCED" : "PENDING_SYNC",
              syncedAtIso: isOnline ? createdAt.toISOString() : null,
            }
          : ticket,
      ),
    ]);
    setSelectedReceiptTicket(paymentTicket);
    setReceiptPreviewOpen(true);
    toast.success(
      isLiquidation
        ? `Apartado liquidado. Se generó ${paymentFolio}.`
        : `Abono registrado con folio ${paymentFolio}.`,
    );
  };

  const addInventoryMovementReason = () => {
    const name = newMovementReason.trim();
    if (!name) return;
    if (
      inventoryMovementReasons.some(
        (reason) =>
          reason.name.toLocaleLowerCase("es-MX") ===
          name.toLocaleLowerCase("es-MX"),
      )
    ) {
      toast.error("Ese motivo ya existe.");
      return;
    }
    setInventoryMovementReasons((current) => [
      ...current,
      { id: `reason-${Date.now()}`, name, active: true },
    ]);
    setNewMovementReason("");
    toast.success(`${name} agregado a movimientos de inventario.`);
  };

  const removeInventoryMovementReason = (reasonId: string) => {
    const reason = inventoryMovementReasons.find((item) => item.id === reasonId);
    if (!reason) return;
    const activeReasons = inventoryMovementReasons.filter((item) => item.active);
    if (reason.active && activeReasons.length <= 1) {
      toast.error("Debe permanecer al menos un motivo de movimiento activo.");
      return;
    }
    setInventoryMovementReasons((current) =>
      current.filter((item) => item.id !== reasonId),
    );
    toast.success(
      `${reason.name} se borró de nuevos movimientos. El historial permanece intacto.`,
    );
  };

  const saveExpenseType = (type: ExpenseType) => {
    if (posApiEnabled) {
      const existing = expenseTypes.some((item) => item.id === type.id);
      const request = existing
        ? posApi.updateExpenseType(type.id, { name: type.name, active: type.active })
        : posApi.createExpenseType({ name: type.name, active: type.active });
      void request.then((saved) => {
        const mapped = expenseTypeFromDto(saved);
        setExpenseTypes((current) => existing
          ? current.map((item) => item.id === mapped.id ? mapped : item)
          : [...current, mapped]);
        toast.success(existing ? "Tipo de gasto actualizado." : "Tipo de gasto creado.");
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo guardar el tipo de gasto."));
      return;
    }
    setExpenseTypes((current) =>
      current.some((item) => item.id === type.id)
        ? current.map((item) => (item.id === type.id ? type : item))
        : [...current, type],
    );
  };

  const toggleExpenseType = (typeId: string) => {
    if (posApiEnabled) {
      const target = expenseTypes.find((type) => type.id === typeId);
      if (!target) return;
      void posApi.updateExpenseType(typeId, { name: target.name, active: !target.active }).then((saved) => {
        setExpenseTypes((current) => current.map((type) => type.id === typeId ? expenseTypeFromDto(saved) : type));
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo cambiar el tipo de gasto."));
      return;
    }
    setExpenseTypes((current) => {
      const target = current.find((type) => type.id === typeId);
      const activeCount = current.filter((type) => type.active).length;
      if (target?.active && activeCount <= 1) {
        toast.error("Debe permanecer al menos un tipo de gasto activo.");
        return current;
      }
      return current.map((type) =>
        type.id === typeId ? { ...type, active: !type.active } : type,
      );
    });
  };

  const deleteExpenseType = (typeId: string) => {
    if (posApiEnabled) {
      void posApi.deleteExpenseType(typeId).then(() => {
        setExpenseTypes((current) => current.filter((type) => type.id !== typeId));
        toast.success("Tipo de gasto retirado; el historial permanece en el servidor.");
      }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo retirar el tipo de gasto."));
      return;
    }
    const type = expenseTypes.find((item) => item.id === typeId);
    if (!type) return;
    if (cashExpenses.some((expense) => expense.typeId === typeId)) {
      setExpenseTypes((current) =>
        current.map((item) =>
          item.id === typeId ? { ...item, active: false } : item,
        ),
      );
      toast.info(
        `${type.name} se inactivó porque tiene movimientos históricos.`,
      );
      return;
    }
    setExpenseTypes((current) =>
      current.filter((item) => item.id !== typeId),
    );
    toast.success(`${type.name} se eliminó de nuevos registros.`);
  };

  const previewTicket = (ticket: Ticket) => {
    setSelectedReceiptTicket(ticket);
    setReceiptPreviewOpen(true);
  };

  const issueVoucher = async (ticket: Ticket, voucherId: string): Promise<VoucherIssue | null> => {
    const template = voucherTemplates.find(
      (candidate) =>
        candidate.id === voucherId &&
        candidate.active &&
        candidate.visibleToSellers,
    );
    if (!template) return null;
    if (posApiEnabled && !operatingOffline) {
      if (!ticket.backendId) {
        toast.error("El ticket no tiene una referencia de backend válida.");
        return null;
      }
      try {
        const dto = await posApi.issueVoucher(ticket.backendId, voucherId);
        const issue: VoucherIssue = {
          id: dto.id,
          folio: dto.folio,
          voucherId: dto.templateId,
          voucherName: dto.templateName,
          voucherKind: dto.kind,
          value: Number(dto.value),
          message: dto.message,
          ticketId: ticket.id,
          clientId: dto.customerId,
          clientName: ticket.clientName,
          clientPhone: ticket.clientPhone,
          branch: ticket.branchName ?? activeBranch,
          issuedAtIso: dto.issuedAt,
          status: dto.status === "CANCELED" ? "CANCELLED" : dto.status,
        };
        setVoucherIssues((current) => [issue, ...current.filter((candidate) => candidate.id !== issue.id)]);
        toast.success(`Voucher ${issue.folio} generado para ${ticket.clientName}.`);
        return issue;
      } catch (error) {
        toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "No se pudo emitir el voucher.");
        return null;
      }
    }
    let offlineVoucherOperationId: string | undefined;
    if (posApiEnabled) {
      if (!offlineBootstrap || !ticket.backendId) {
        toast.error("El ticket o la caché offline no están disponibles.");
        return null;
      }
      try {
        const queued = await enqueueOfflineOperation({
          kind: "VOUCHER_ISSUE",
          entityId: ticket.backendId,
          payload: { templateId: voucherId },
        }, offlineBootstrap);
        offlineVoucherOperationId = queued.id;
        setOfflineQueue(await offlineQueueStatus(offlineBootstrap));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo proteger el voucher local.");
        return null;
      }
    }
    const branch = ticket.branchName ?? activeBranch;
    const branchCode = branch
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase();
    const sequence =
      voucherIssues.filter((issue) => issue.branch === branch).length + 1;
    const issuedAtIso = new Date().toISOString();
    const normalizedTicketPhone = ticket.clientPhone.replace(/\D/g, "");
    const normalizedTicketName = ticket.clientName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-MX")
      .trim();
    const voucherClient = clients.find((client) => {
      if (ticket.clientId) return client.id === ticket.clientId;
      const clientPhone = client.phone.replace(/\D/g, "");
      const clientName = `${client.firstName} ${client.lastName}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es-MX")
        .trim();
      return (
        (normalizedTicketPhone && clientPhone === normalizedTicketPhone) ||
        clientName === normalizedTicketName
      );
    });
    const issue: VoucherIssue = {
      id: offlineVoucherOperationId ?? crypto.randomUUID(),
      folio: `VCH-${branchCode}-${String(sequence).padStart(6, "0")}`,
      voucherId: template.id,
      voucherName: template.name,
      voucherKind: template.kind,
      value: template.value,
      message: template.message,
      ticketId: ticket.id,
      clientId: ticket.clientId ?? voucherClient?.id ?? null,
      clientName: ticket.clientName,
      clientPhone: ticket.clientPhone,
      branch,
      issuedAtIso,
      status: "ISSUED",
    };
    setVoucherIssues((current) => [issue, ...current]);
    toast.success(`Voucher ${issue.folio} generado para ${ticket.clientName}.`);
    return issue;
  };

  const printVoucher = async (issue: VoucherIssue) => {
    if (!posApiEnabled) return;
    if (operatingOffline) {
      if (!offlineBootstrap) throw new Error("La caché offline no está disponible");
      const queued = await enqueueOfflineOperation({
        kind: "VOUCHER_PRINT",
        entityId: issue.id,
        payload: {},
      }, offlineBootstrap);
      setOfflineQueue(await offlineQueueStatus(offlineBootstrap));
      toast.success(`Impresión local protegida en la secuencia ${queued.sequence}.`);
      return;
    }
    try {
      await posApi.printVoucher(issue.id);
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "No se pudo registrar la impresión del voucher.");
      throw error;
    }
  };

  const editTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setTicketEditOpen(true);
  };

  const saveTicketChanges = async (
    ticketId: string,
    changes: TicketEditRequest,
  ): Promise<boolean> => {
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket || ticket.status === "REFUNDED") return false;
    const currentLayaway = layaways.find(
      (layaway) => layaway.originalTicketId === ticketId,
    );

    const selectedSellers = changes.sellerIds.flatMap((sellerId) => {
      const seller = sellers.find((candidate) => candidate.id === sellerId);
      return seller ? [seller] : [];
    });
    if (selectedSellers.length === 0 || changes.products.length === 0) {
      toast.error("El ticket necesita al menos un vendedor y un producto.");
      return false;
    }
    if (posApiEnabled) {
      if (!ticket.backendId) {
        toast.error("El ticket no tiene una referencia válida en el servidor.");
        return false;
      }
      try {
        const authorization = await posApi.createAuthorization({
          alias: changes.authorizationAlias,
          pin: changes.authorizationCode,
          purpose: "TICKET_REVISION",
          entityType: "PosTicket",
          entityId: ticket.backendId,
        });
        await posApi.reviseTicket(ticket.backendId, {
          reason: `Corrección solicitada para ${ticket.id}`,
          authorizationToken: authorization.authorizationToken,
          revision: {
            clientName: changes.clientName,
            clientPhone: changes.clientPhone,
            sellerIds: changes.sellerIds,
            products: changes.products,
            discountAmount: changes.discountAmount,
            paymentStatus: changes.paymentStatus,
            amountPaid: changes.amountPaid,
            payments: changes.payments,
          },
        });
        toast.success(`Revisión de ${ticket.id} registrada sin alterar el ticket original.`);
        return true;
      } catch (error) {
        toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "No se pudo registrar la revisión.");
        return false;
      }
    }

    const nextProducts = changes.products.flatMap((line, index) => {
      const product = catalogProducts.find(
        (candidate) => candidate.id === line.productId,
      );
      const historicalLine = ticket.products[index];
      const name = product?.name ?? historicalLine?.name;
      return name
        ? [
            {
              productId: line.productId,
              name,
              quantity: line.quantity,
              total: line.quantity * line.unitPrice,
              ...(historicalLine?.productId === line.productId && historicalLine.dealId
                ? {
                    dealId: historicalLine.dealId,
                    dealName: historicalLine.dealName ?? "Paquete",
                    dealInstanceId:
                      historicalLine.dealInstanceId ?? historicalLine.dealId,
                  }
                : {}),
            },
          ]
        : [];
    });
    if (nextProducts.length !== changes.products.length) {
      toast.error("Uno de los productos ya no está disponible para editar.");
      return false;
    }
    const editedLineByOriginalProductId = new Map(
      ticket.products.flatMap((originalLine, index) => {
        const editedLine = nextProducts[index];
        return editedLine
          ? [
              [
                originalLine.productId,
                {
                  productId: editedLine.productId,
                  productName: editedLine.name,
                },
              ] as const,
            ]
          : [];
      }),
    );
    const editedServiceByOriginalName = new Map(
      ticket.products.flatMap((originalLine, index) => {
        const editedLine = nextProducts[index];
        return editedLine
          ? [
              [
                originalLine.name.replace(/ · REGALO$/, ""),
                editedLine.name.replace(/ · REGALO$/, ""),
              ] as const,
            ]
          : [];
      }),
    );

    const subtotal = nextProducts.reduce((sum, line) => sum + line.total, 0);
    const discountAmount = Math.min(
      subtotal,
      Math.max(0, changes.discountAmount),
    );
    const total = Math.max(0, subtotal - discountAmount);
    const taxRatio = subtotal > 0 ? total / subtotal : 1;
    const nextProductsWithTax = nextProducts.map((line, index) => {
      const catalogProduct = catalogProducts.find(
        (candidate) => candidate.id === line.productId,
      );
      const includesVat =
        catalogProduct?.includesVat ??
        ticket.products[index]?.includesVat ??
        false;
      const tax = calculateIncludedVat(line.total * taxRatio, includesVat);
      return {
        ...line,
        includesVat,
        netTotal: tax.net,
        vatAmount: tax.vat,
      };
    });
    const netTotal = roundCurrency(
      nextProductsWithTax.reduce((sum, line) => sum + line.netTotal, 0),
    );
    const vatAmount = roundCurrency(total - netTotal);
    const minimumTotal = changes.products.reduce((sum, line) => {
      const product = catalogProducts.find(
        (candidate) => candidate.id === line.productId,
      );
      return sum + (product?.minPrice ?? 0) * line.quantity;
    }, 0);
    const nextDeviation = total - minimumTotal;
    if (
      nextDeviation < Math.min(0, ticket.deviation) &&
      !isMasterAccessCode(changes.authorizationCode)
    ) {
      toast.error(
        "La edición queda por debajo del mínimo combinado. Ingresa el código master.",
      );
      return false;
    }
    const paymentStatus =
      ticket.ticketType === "LAYAWAY_PAYMENT"
        ? ("PAID" as const)
        : changes.paymentStatus;
    const amountPaid =
      paymentStatus === "PAID"
        ? total
        : paymentStatus === "PENDING"
          ? 0
          : Math.min(total, Math.max(0, changes.amountPaid));
    if (
      paymentStatus === "LAYAWAY" &&
      (amountPaid <= 0 || amountPaid >= total)
    ) {
      toast.error(
        "El apartado necesita un abono mayor a cero y menor al total.",
      );
      return false;
    }
    const defaultPaymentMethod =
      changes.paymentMethodId || ticket.paymentMethod;
    const relatedPaymentTickets =
      ticket.ticketType === "LAYAWAY_PAYMENT"
        ? []
        : tickets
            .filter(
              (candidate) =>
                candidate.status === "COMPLETED" &&
                candidate.ticketType === "LAYAWAY_PAYMENT" &&
                candidate.relatedTicketId === ticketId,
            )
            .sort((left, right) =>
              left.createdAtIso.localeCompare(right.createdAtIso),
            );
    let allocationCapacity = amountPaid;
    const currentOriginalCollected = ticket.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    let originalPaymentAmount = Math.min(
      currentOriginalCollected,
      allocationCapacity,
    );
    allocationCapacity -= originalPaymentAmount;
    const relatedPaymentAllocations = new Map<string, number>();
    relatedPaymentTickets.forEach((paymentTicket) => {
      const currentCollected = paymentTicket.payments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );
      const allocated = Math.min(currentCollected, allocationCapacity);
      relatedPaymentAllocations.set(paymentTicket.id, allocated);
      allocationCapacity -= allocated;
    });
    originalPaymentAmount += allocationCapacity;
    let remainingOriginalPayment = originalPaymentAmount;
    const payments = changes.payments
      .map((payment, paymentIndex) => {
        const amount = Math.min(
          remainingOriginalPayment,
          Math.max(0, payment.amount),
        );
        remainingOriginalPayment -= amount;
        const historicalPayment = ticket.payments[paymentIndex];
        return {
          ...(historicalPayment ?? {}),
          ...payment,
          amount,
          ...(ticket.payments[0]?.folio
            ? { folio: ticket.payments[0].folio }
            : {}),
        };
      })
      .filter((payment) => payment.amount > 0);
    if (remainingOriginalPayment > 0 && payments[0]) {
      payments[0] = {
        ...payments[0],
        amount: payments[0].amount + remainingOriginalPayment,
      };
    }
    const balanceDue = Math.max(0, total - amountPaid);
    const relatedPaymentUpdates = new Map<string, Ticket>();
    relatedPaymentTickets.forEach((paymentTicket) => {
      const allocated = relatedPaymentAllocations.get(paymentTicket.id) ?? 0;
      const paymentMethod =
        paymentTicket.payments[0]?.methodId ?? paymentTicket.paymentMethod;
      const nextRelatedPayments =
        allocated > 0
          ? [
              {
                id:
                  paymentTicket.payments[0]?.id ?? crypto.randomUUID(),
                methodId: paymentMethod,
                amount: allocated,
              },
            ]
          : [];
      relatedPaymentUpdates.set(paymentTicket.id, {
        ...paymentTicket,
        clientName: changes.clientName,
        clientPhone: changes.clientPhone,
        sellerSummary: selectedSellers.map((seller) => seller.name).join(" / "),
        sellerSales: selectedSellers.map((seller) => ({
          sellerId: seller.id,
          sellerName: seller.name,
          amount: 0,
        })),
        subtotal: allocated,
        total: allocated,
        products: paymentTicket.products.map((product, index) =>
          index === 0 ? { ...product, total: allocated } : product,
        ),
        paymentMethod,
        payments: nextRelatedPayments,
        amountPaid: allocated,
        balanceDue,
        paymentStatus,
        status: allocated > 0 ? "COMPLETED" : "REFUNDED",
        ...(allocated > 0
          ? {}
          : {
              cancelledAt: new Date().toLocaleString("es-MX"),
              cancelledAtIso: new Date().toISOString(),
              refundAmount: paymentTicket.amountPaid,
            }),
      });
    });
    const baseSellerAmount = total / selectedSellers.length;
    const sellerSales = selectedSellers.map((seller, index) => ({
      sellerId: seller.id,
      sellerName: seller.name,
      amount:
        index === selectedSellers.length - 1
          ? total - baseSellerAmount * index
          : baseSellerAmount,
    }));
    const sellerSummary = selectedSellers
      .map((seller) => seller.name)
      .join(" / ");
    const dealStructurePreserved =
      ticket.products.length === nextProducts.length &&
      ticket.products.every((line, index) => {
        const nextLine = nextProducts[index];
        return (
          nextLine?.productId === line.productId &&
          nextLine.quantity === line.quantity &&
          Math.abs(nextLine.total - line.total) < 0.01
        );
      });
    const updatedTicket: Ticket = {
      ...ticket,
      clientName: changes.clientName,
      clientPhone: changes.clientPhone,
      sellerSummary,
      sellerSales,
      deals: dealStructurePreserved ? (ticket.deals ?? []) : [],
      products: nextProductsWithTax,
      items: nextProducts.reduce((sum, line) => sum + line.quantity, 0),
      subtotal,
      discountAmount,
      total,
      netTotal,
      vatAmount,
      deviation: nextDeviation,
      payments,
      amountPaid,
      balanceDue,
      paymentStatus,
      paymentMethod: payments[0]?.methodId ?? defaultPaymentMethod,
      syncStatus: isOnline ? "SYNCED" : "PENDING_SYNC",
      ...(ticket.createdOffline === undefined
        ? {}
        : { createdOffline: ticket.createdOffline }),
      syncedAtIso: isOnline ? new Date().toISOString() : null,
    };

    const matchedClient = clients.find(
      (client) =>
        (ticket.clientPhone && client.phone === ticket.clientPhone) ||
        `${client.firstName} ${client.lastName}` === ticket.clientName,
    );
    if (matchedClient) {
      const nameParts = changes.clientName.split(/\s+/).filter(Boolean);
      const firstName = nameParts.shift() ?? matchedClient.firstName;
      const lastName = nameParts.join(" ") || matchedClient.lastName;
      setClients((current) =>
        current.map((client) =>
          client.id === matchedClient.id
            ? {
                ...client,
                firstName,
                lastName,
                phone: changes.clientPhone,
                saleSellerIds: Array.from(
                  new Set([...client.saleSellerIds, ...changes.sellerIds]),
                ),
              }
            : client,
        ),
      );
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.ticketId === ticketId
          ? {
              ...appointment,
              clientName: changes.clientName,
              clientPhone: changes.clientPhone,
              sellerIds: changes.sellerIds,
              service:
                editedServiceByOriginalName.get(appointment.service) ??
                appointment.service,
            }
          : appointment,
      ),
    );

    const originalInventoryDeductions =
      ticket.inventoryDeductions ??
      (ticket.paymentStatus === "PAID"
        ? ticket.products.flatMap((line) => {
            const product = catalogProducts.find(
              (candidate) => candidate.id === line.productId,
            );
            return product?.kind === "PRODUCT"
              ? [
                  {
                    productId: product.id,
                    productName: product.name,
                    quantity: line.quantity,
                    branch:
                      ticket.branchName && branchInventory[ticket.branchName]
                        ? ticket.branchName
                        : activeBranch,
                  },
                ]
              : [];
          })
        : []);
    const canReconcileInventory = ticket.ticketType !== "LAYAWAY_PAYMENT";
    let nextInventoryDeductions = originalInventoryDeductions;
    if (canReconcileInventory) {
      const nextInventory = Object.fromEntries(
        Object.entries(branchInventory).map(([branch, stock]) => [
          branch,
          { ...stock },
        ]),
      ) as BranchInventory;
      const inventoryBranch =
        originalInventoryDeductions[0]?.branch ??
        (ticket.branchName && nextInventory[ticket.branchName]
          ? ticket.branchName
          : activeBranch);
      const branchStock = nextInventory[inventoryBranch] ?? {};
      nextInventory[inventoryBranch] = branchStock;
      const previousDelivered = new Map<string, number>();
      originalInventoryDeductions.forEach((line) => {
        branchStock[line.productId] =
          (branchStock[line.productId] ?? 0) + line.quantity;
        previousDelivered.set(
          line.productId,
          (previousDelivered.get(line.productId) ?? 0) + line.quantity,
        );
      });
      owedProducts
        .filter(
          (record) =>
            record.ticketId === ticketId &&
            record.status === "PENDING" &&
            record.inventoryCommitted,
        )
        .forEach((record) => {
          const debtBranchStock = nextInventory[record.branch] ?? {};
          nextInventory[record.branch] = debtBranchStock;
          debtBranchStock[record.productId] =
            (debtBranchStock[record.productId] ?? 0) +
            Math.max(0, record.quantity - record.deliveredQuantity);
        });

      const editedAt = new Date();
      const editedAtLabel = new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(editedAt);
      const deductions: TicketInventoryLine[] = [];
      const replacementMovements: InventoryMovement[] = [];
      const replacementDebts: OwedProductRecord[] = [];
      changes.products.forEach((line) => {
        const product = catalogProducts.find(
          (candidate) => candidate.id === line.productId,
        );
        if (!product || product.kind !== "PRODUCT") return;
        const requestedQuantity =
          paymentStatus === "PAID"
            ? line.quantity
            : Math.min(
                line.quantity,
                previousDelivered.get(line.productId) ?? 0,
              );
        const available = branchStock[line.productId] ?? 0;
        const delivered = Math.min(Math.max(available, 0), requestedQuantity);
        const shortage = requestedQuantity - delivered;
        const newStock = available - requestedQuantity;
        branchStock[line.productId] = newStock;
        if (delivered > 0) {
          deductions.push({
            productId: product.id,
            productName: product.name,
            quantity: delivered,
            branch: inventoryBranch,
          });
        }
        if (requestedQuantity > 0) {
          replacementMovements.push({
            id: crypto.randomUUID(),
            folio: `VEN-${ticketId}-EDIT-${replacementMovements.length + 1}`,
            createdAt: editedAtLabel,
            createdAtIso: editedAt.toISOString(),
            productId: product.id,
            productName: product.name,
            direction: "REMOVE",
            reason: `Venta ${ticketId} · ticket editado`,
            quantity: requestedQuantity,
            previousStock: available,
            newStock,
            sourceBranch: inventoryBranch,
            destinationBranch: null,
            destinationPreviousStock: null,
            destinationNewStock: null,
            comment:
              shortage > 0
                ? `Actualización de ticket · ${changes.clientName} · ${delivered} entregado(s), ${shortage} pendiente(s)`
                : `Actualización automática de ticket · ${changes.clientName}`,
            category: "SALE",
            unitCostUsd: product.costUsd,
            unitCostMxn: product.costMxn,
            totalCostUsd: product.costUsd * requestedQuantity,
            totalCostMxn: product.costMxn * requestedQuantity,
          });
        }
        if (shortage > 0) {
          replacementDebts.push({
            id: crypto.randomUUID(),
            ticketId,
            layawayId:
              paymentStatus === "LAYAWAY" ? `layaway-${ticketId}` : null,
            clientId: matchedClient?.id ?? `client-${ticketId}`,
            clientName: changes.clientName,
            clientPhone: changes.clientPhone,
            productId: product.id,
            productName: product.name,
            quantity: shortage,
            deliveredQuantity: 0,
            branch: inventoryBranch,
            sellerIds: changes.sellerIds,
            sellerNames: selectedSellers.map((seller) => seller.name),
            inventoryCommitted: true,
            deliveryHistory: [],
            reason:
              paymentStatus === "LAYAWAY"
                ? "LAYAWAY_LIQUIDATION"
                : "OUT_OF_STOCK",
            createdAt: editedAtLabel,
            createdAtIso: editedAt.toISOString(),
            status: "PENDING",
          });
        }
      });
      nextInventoryDeductions = deductions;
      updatedTicket.inventoryDeductions = deductions;
      setBranchInventory(nextInventory);
      setCatalogProducts((current) =>
        current.map((product) =>
          product.stock === null
            ? product
            : {
                ...product,
                stock: nextInventory.Polanco?.[product.id] ?? product.stock,
              },
        ),
      );
      setInventoryMovements((current) => [
        ...replacementMovements,
        ...current.filter(
          (movement) =>
            !(
              movement.category === "SALE" &&
              (movement.folio.includes(ticketId) ||
                movement.reason.includes(ticketId))
            ),
        ),
      ]);
      setOwedProducts((current) => [
        ...replacementDebts,
        ...current
          .filter(
            (record) =>
              record.ticketId !== ticketId || record.status === "FULFILLED",
          )
          .map((record) =>
            record.ticketId === ticketId
              ? (() => {
                  const editedProduct = editedLineByOriginalProductId.get(
                    record.productId,
                  );
                  return {
                    ...record,
                    clientName: changes.clientName,
                    clientPhone: changes.clientPhone,
                    sellerIds: changes.sellerIds,
                    sellerNames: selectedSellers.map((seller) => seller.name),
                    productId:
                      editedProduct?.productId ?? record.productId,
                    productName:
                      editedProduct?.productName ?? record.productName,
                  };
                })()
              : record,
          ),
      ]);
    } else {
      setOwedProducts((current) =>
        current.map((record) =>
          record.ticketId === ticketId
            ? (() => {
                const editedProduct = editedLineByOriginalProductId.get(
                  record.productId,
                );
                return {
                  ...record,
                  clientName: changes.clientName,
                  clientPhone: changes.clientPhone,
                  sellerIds: changes.sellerIds,
                  sellerNames: selectedSellers.map((seller) => seller.name),
                  productId: editedProduct?.productId ?? record.productId,
                  productName:
                    editedProduct?.productName ?? record.productName,
                };
              })()
            : record,
        ),
      );
    }

    if (ticket.ticketType === "LAYAWAY_PAYMENT" && ticket.relatedTicketId) {
      const paymentDelta = amountPaid - ticket.amountPaid;
      setLayaways((current) =>
        current.map((layaway) =>
          layaway.originalTicketId === ticket.relatedTicketId
            ? (() => {
                const nextAmountPaid = Math.min(
                  layaway.total,
                  Math.max(0, layaway.amountPaid + paymentDelta),
                );
                const nextBalanceDue = Math.max(
                  0,
                  layaway.total - nextAmountPaid,
                );
                const nextPayment = {
                  id: payments[0]?.id ?? crypto.randomUUID(),
                  folio: ticketId,
                  createdAt: ticket.createdAt,
                  createdAtIso: ticket.createdAtIso,
                  amount: amountPaid,
                  methodId: defaultPaymentMethod,
                  payments,
                  balanceAfter: nextBalanceDue,
                };
                const hasPayment = layaway.payments.some(
                  (payment) => payment.folio === ticketId,
                );
                return {
                  ...layaway,
                  amountPaid: nextAmountPaid,
                  balanceDue: nextBalanceDue,
                  status: nextBalanceDue < 0.01 ? "PAID" : "ACTIVE",
                  payments: hasPayment
                    ? layaway.payments.map((payment) =>
                        payment.folio === ticketId
                          ? nextPayment
                          : payment,
                      )
                    : [...layaway.payments, nextPayment],
                };
              })()
            : layaway,
        ),
      );
    } else {
      const deliveredByProduct = new Map(
        (nextInventoryDeductions ?? []).map((line) => [
          line.productId,
          line.quantity,
        ]),
      );
      const nextLayawayItems = changes.products.flatMap((line, index) => {
        const product = catalogProducts.find(
          (candidate) => candidate.id === line.productId,
        );
        const historicalLine = ticket.products.find(
          (candidate) => candidate.productId === line.productId,
        );
        const productName = product?.name ?? historicalLine?.name;
        return productName
          ? [
              {
                cartItemId: `edited-${ticketId}-${index}`,
                productId: line.productId,
                productName,
                kind: product?.kind ?? ("SERVICE" as const),
                quantity: line.quantity,
                deliveredQuantity:
                  product?.kind === "PRODUCT"
                    ? (deliveredByProduct.get(line.productId) ?? 0)
                    : line.quantity,
              },
            ]
          : [];
      });
      const originalPaymentFolio =
        ticket.payments[0]?.folio ??
        currentLayaway?.payments[0]?.folio ??
        ticketId;
      const originalPaymentRecords =
        payments.length > 0
          ? [
              {
                id:
                  currentLayaway?.payments.find(
                    (payment) => payment.folio === originalPaymentFolio,
                  )?.id ?? payments[0]?.id ?? crypto.randomUUID(),
                folio: originalPaymentFolio,
                createdAt: ticket.createdAt,
                createdAtIso: ticket.createdAtIso,
                amount: payments.reduce(
                  (sum, payment) => sum + payment.amount,
                  0,
                ),
                methodId: payments[0]?.methodId ?? defaultPaymentMethod,
                payments,
                balanceAfter: balanceDue,
              },
            ]
          : [];
      const relatedPaymentRecords = relatedPaymentTickets.flatMap(
        (paymentTicket) => {
          const nextPaymentTicket =
            relatedPaymentUpdates.get(paymentTicket.id) ?? paymentTicket;
          if (
            nextPaymentTicket.status !== "COMPLETED" ||
            nextPaymentTicket.payments.length === 0
          )
            return [];
          return [
            {
              id:
                currentLayaway?.payments.find(
                  (payment) => payment.folio === nextPaymentTicket.id,
                )?.id ?? nextPaymentTicket.payments[0]?.id ?? crypto.randomUUID(),
              folio: nextPaymentTicket.id,
              createdAt: nextPaymentTicket.createdAt,
              createdAtIso: nextPaymentTicket.createdAtIso,
              amount: nextPaymentTicket.payments.reduce(
                (sum, payment) => sum + payment.amount,
                0,
              ),
              methodId:
                nextPaymentTicket.payments[0]?.methodId ??
                nextPaymentTicket.paymentMethod,
              payments: nextPaymentTicket.payments,
              balanceAfter: nextPaymentTicket.balanceDue,
            },
          ];
        },
      );
      const nextLayawayPayments = [
        ...originalPaymentRecords,
        ...relatedPaymentRecords,
      ];
      const layawayBranch =
        nextInventoryDeductions[0]?.branch ?? ticket.branchName ?? activeBranch;
      setLayaways((current) => {
        const existing = current.find(
          (layaway) => layaway.originalTicketId === ticketId,
        );
        if (paymentStatus === "PENDING") {
          return current.filter(
            (layaway) => layaway.originalTicketId !== ticketId,
          );
        }
        if (!existing && paymentStatus !== "LAYAWAY") return current;
        const nextLayaway: LayawayRecord = {
          id: existing?.id ?? `layaway-${ticketId}`,
          originalTicketId: ticketId,
          createdAt: existing?.createdAt ?? ticket.createdAt,
          createdAtIso: existing?.createdAtIso ?? ticket.createdAtIso,
          clientId:
            existing?.clientId ?? matchedClient?.id ?? `client-${ticketId}`,
          clientName: changes.clientName,
          clientPhone: changes.clientPhone,
          branch: existing?.branch ?? layawayBranch,
          sellerIds: changes.sellerIds,
          total,
          amountPaid,
          balanceDue,
          items: nextLayawayItems,
          payments: nextLayawayPayments,
          status: paymentStatus === "PAID" ? "PAID" : "ACTIVE",
        };
        return existing
          ? current.map((layaway) =>
              layaway.originalTicketId === ticketId ? nextLayaway : layaway,
            )
          : [nextLayaway, ...current];
      });
    }

    setTickets((current) =>
      current.map((item) => {
        if (item.id === ticketId) return updatedTicket;
        const relatedUpdate = relatedPaymentUpdates.get(item.id);
        if (relatedUpdate) return relatedUpdate;
        if (
          ticket.ticketType === "LAYAWAY_PAYMENT" &&
          ticket.relatedTicketId === item.id
        ) {
          const amountPaid = Math.max(
            0,
            Math.min(item.total, item.amountPaid + (updatedTicket.amountPaid - ticket.amountPaid)),
          );
          const balanceDue = Math.max(0, item.total - amountPaid);
          return {
            ...item,
            amountPaid,
            balanceDue,
            paymentStatus:
              balanceDue === 0
                ? ("PAID" as const)
                : amountPaid > 0
                  ? ("LAYAWAY" as const)
                  : ("PENDING" as const),
          };
        }
        return item;
      }),
    );
    setSelectedReceiptTicket((current) =>
      current?.id === ticketId ? updatedTicket : current,
    );
    setEditingTicket(updatedTicket);
    setCancellingTicket((current) =>
      current?.id === ticketId ? updatedTicket : current,
    );
    toast.success(
      `Ticket ${ticketId} actualizado en ventas, cobros, apartados, inventario, cortes y dashboards.`,
    );
    return true;
  };

  const openTicketCancellation = (ticket: Ticket) => {
    if (ticket.status === "REFUNDED") return;
    setCancellingTicket(ticket);
    setTicketCancellationOpen(true);
  };

  const cancelTicket = async (request: TicketCancellationRequest) => {
    const ticket = cancellingTicket;
    if (!ticket || ticket.status === "REFUNDED") return;
    if (posApiEnabled) {
      if (!ticket.backendId) {
        toast.error("El ticket no tiene una referencia válida en el servidor.");
        return;
      }
      const returnedLines = request.returnedProducts.flatMap((returned) => {
        const line = ticket.products.find((candidate) => candidate.productId === returned.productId && candidate.backendLineId);
        return line?.backendLineId
          ? [{ ticketLineId: line.backendLineId, quantity: returned.quantity.toFixed(2) }]
          : [];
      });
      if (returnedLines.length !== request.returnedProducts.length) {
        toast.error("No fue posible identificar todas las líneas devueltas del ticket.");
        return;
      }
      try {
        const authorization = await posApi.createAuthorization({
          alias: request.authorizationAlias,
          pin: request.authorizationCode,
          purpose: "TICKET_CANCELLATION",
          entityType: "PosTicket",
          entityId: ticket.backendId,
        });
        await posApi.cancelTicket(ticket.backendId, {
          reason: request.reason,
          refundAmount: request.refundAmount.toFixed(2),
          returnedLines,
          revision: { nonReturnedProducts: request.nonReturnedProducts },
          authorizationToken: authorization.authorizationToken,
        });
        setTickets((current) => current.map((item) => item.id === ticket.id ? {
          ...item,
          status: "REFUNDED",
          refundAmount: request.refundAmount,
          returnedProducts: request.returnedProducts,
          nonReturnedProducts: request.nonReturnedProducts,
        } : item));
        setAppointments((current) => current.filter((appointment) => appointment.ticketId !== ticket.id));
        setOwedProducts((current) => current.map((record) => record.ticketId === ticket.id && record.status === "PENDING"
          ? { ...record, status: "CANCELLED" }
          : record));
        setLayaways((current) => current.filter((layaway) => layaway.originalTicketId !== ticket.id));
        setTicketCancellationOpen(false);
        setCancellingTicket(null);
        setReceiptPreviewOpen(false);
        setTicketEditOpen(false);
        toast.success(`Cancelación de ${ticket.id} registrada con compensaciones append-only.`);
      } catch (error) {
        toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "No se pudo cancelar el ticket.");
      }
      return;
    }
    const cancelledAt = new Date();
    const cancelledAtLabel = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(cancelledAt);
    const cancelledTicketIds = new Set([
      ticket.id,
      ...tickets
        .filter(
          (candidate) =>
            ticket.ticketType !== "LAYAWAY_PAYMENT" &&
            candidate.relatedTicketId === ticket.id,
        )
        .map((candidate) => candidate.id),
    ]);
    const nextInventory = Object.fromEntries(
      Object.entries(branchInventory).map(([branch, stock]) => [
        branch,
        { ...stock },
      ]),
    ) as BranchInventory;
    const returnMovements = request.returnedProducts.flatMap<InventoryMovement>(
      (line, index) => {
        const product = catalogProducts.find(
          (candidate) => candidate.id === line.productId,
        );
        if (!product || product.kind !== "PRODUCT" || line.quantity < 1)
          return [];
        const branchStock = nextInventory[line.branch] ?? {};
        nextInventory[line.branch] = branchStock;
        const previousStock = branchStock[line.productId] ?? 0;
        const newStock = previousStock + line.quantity;
        branchStock[line.productId] = newStock;
        return [
          {
            id: crypto.randomUUID(),
            folio: `CAN-${ticket.id}-${index + 1}`,
            createdAt: cancelledAtLabel,
            createdAtIso: cancelledAt.toISOString(),
            productId: line.productId,
            productName: line.productName,
            direction: "ADD",
            reason: `Devolución por cancelación ${ticket.id}`,
            quantity: line.quantity,
            previousStock,
            newStock,
            sourceBranch: line.branch,
            destinationBranch: null,
            destinationPreviousStock: null,
            destinationNewStock: null,
            comment: `Ticket cancelado · devolución a inventario`,
            category: "RETURN",
            unitCostUsd: product.costUsd,
            unitCostMxn: product.costMxn,
            totalCostUsd: product.costUsd * line.quantity,
            totalCostMxn: product.costMxn * line.quantity,
          },
        ];
      },
    );
    const pendingTicketDebts = owedProducts.filter(
      (record) =>
        cancelledTicketIds.has(record.ticketId) &&
        record.status === "PENDING" &&
        record.inventoryCommitted,
    );
    const debtReversalMovements =
      pendingTicketDebts.flatMap<InventoryMovement>((record, index) => {
        const quantity = Math.max(
          0,
          record.quantity - record.deliveredQuantity,
        );
        const product = catalogProducts.find(
          (candidate) => candidate.id === record.productId,
        );
        if (!product || quantity < 1) return [];
        const branchStock = nextInventory[record.branch] ?? {};
        nextInventory[record.branch] = branchStock;
        const previousStock = branchStock[record.productId] ?? 0;
        const newStock = previousStock + quantity;
        branchStock[record.productId] = newStock;
        return [
          {
            id: crypto.randomUUID(),
            folio: `CAN-DEU-${ticket.id}-${index + 1}`,
            createdAt: cancelledAtLabel,
            createdAtIso: cancelledAt.toISOString(),
            productId: record.productId,
            productName: record.productName,
            direction: "ADD",
            reason: `Reversión de deuda por cancelación ${ticket.id}`,
            quantity,
            previousStock,
            newStock,
            sourceBranch: record.branch,
            destinationBranch: null,
            destinationPreviousStock: null,
            destinationNewStock: null,
            comment: `Se eliminó el compromiso pendiente de ${record.clientName}`,
            category: "RETURN",
            unitCostUsd: product.costUsd,
            unitCostMxn: product.costMxn,
            totalCostUsd: product.costUsd * quantity,
            totalCostMxn: product.costMxn * quantity,
            settledOwedProductId: record.id,
            settledClientName: record.clientName,
            settledClientPhone: record.clientPhone,
            settledSellerNames: record.sellerNames,
            settledQuantity: 0,
          },
        ];
      });
    const nonReturnDisposition = new Map(
      request.nonReturnedProducts.map((line) => [
        line.productId,
        line.disposition,
      ]),
    );

    if (returnMovements.length > 0 || debtReversalMovements.length > 0) {
      setBranchInventory(nextInventory);
      setCatalogProducts((current) =>
        current.map((product) =>
          product.stock !== null
            ? { ...product, stock: nextInventory.Polanco?.[product.id] ?? 0 }
            : product,
        ),
      );
    }
    setInventoryMovements((current) => [
      ...[...returnMovements, ...debtReversalMovements].reverse(),
      ...current.map((movement) => {
        const disposition = nonReturnDisposition.get(movement.productId);
        const belongsToTicket =
          movement.category === "SALE" &&
          (movement.folio.includes(ticket.id) ||
            movement.reason.includes(ticket.id));
        if (!disposition || !belongsToTicket) return movement;
        const label = disposition === "GIFT" ? "Regalo" : "Cortesía";
        return {
          ...movement,
          category: "WRITE_OFF" as const,
          reason: `${label} por cancelación ${ticket.id}`,
          comment: `${movement.comment} · conservado como ${label.toLocaleLowerCase("es-MX")}`,
        };
      }),
    ]);

    setTickets((current) =>
      current.map((item) => {
        if (item.id === ticket.id) {
          return {
            ...item,
            status: "REFUNDED",
            cancelledAt: cancelledAtLabel,
            cancelledAtIso: cancelledAt.toISOString(),
            refundAmount: request.refundAmount,
            returnedProducts: request.returnedProducts,
            nonReturnedProducts: request.nonReturnedProducts,
          };
        }
        if (
          ticket.ticketType !== "LAYAWAY_PAYMENT" &&
          item.relatedTicketId === ticket.id
        ) {
          return {
            ...item,
            status: "REFUNDED",
            cancelledAt: cancelledAtLabel,
            cancelledAtIso: cancelledAt.toISOString(),
            refundAmount: item.amountPaid,
            returnedProducts: [],
            nonReturnedProducts: [],
          };
        }
        if (
          ticket.ticketType === "LAYAWAY_PAYMENT" &&
          ticket.relatedTicketId === item.id
        ) {
          const amountPaid = Math.max(0, item.amountPaid - ticket.amountPaid);
          const balanceDue = Math.max(0, item.total - amountPaid);
          return {
            ...item,
            amountPaid,
            balanceDue,
            paymentStatus: amountPaid > 0 ? "LAYAWAY" : "PENDING",
          };
        }
        return item;
      }),
    );
    setAppointments((current) =>
      current.filter((appointment) => appointment.ticketId !== ticket.id),
    );
    setOwedProducts((current) =>
      current.map((record) =>
        cancelledTicketIds.has(record.ticketId) && record.status === "PENDING"
          ? { ...record, status: "CANCELLED" }
          : record,
      ),
    );
    setLayaways((current) => {
      if (ticket.ticketType === "LAYAWAY_PAYMENT" && ticket.relatedTicketId) {
        return current.map((layaway) => {
          if (layaway.originalTicketId !== ticket.relatedTicketId)
            return layaway;
          const amountPaid = Math.max(0, layaway.amountPaid - ticket.amountPaid);
          return {
            ...layaway,
            amountPaid,
            balanceDue: Math.max(0, layaway.total - amountPaid),
            status: "ACTIVE",
            payments: layaway.payments.filter(
              (payment) => payment.folio !== ticket.id,
            ),
          };
        });
      }
      return current.filter((layaway) => layaway.originalTicketId !== ticket.id);
    });
    setTicketCancellationOpen(false);
    setCancellingTicket(null);
    setReceiptPreviewOpen(false);
    setTicketEditOpen(false);
    toast.success(
      `Ticket ${ticket.id} cancelado. Venta, cobros y citas fueron revertidos${
        returnMovements.length > 0 || debtReversalMovements.length > 0
          ? `; ${returnMovements.length} devoluciones y ${debtReversalMovements.length} compromisos se ajustaron en inventario`
          : " sin devolución de inventario"
      }${
        request.nonReturnedProducts.length > 0
          ? ` y ${request.nonReturnedProducts.length} quedaron registrados como regalo o cortesía`
          : ""
      }.`,
    );
  };

  const renderSale = () => (
    <div className="sale-layout">
      <aside className="sale-catalog-navigation">
        <header className="sale-catalog-navigation-header">
          <button
            type="button"
            className="sale-general-menu-button"
            onClick={() => {
              setSaleFocusMode(false);
              setSidebarCollapsed(false);
              setSidebarActivityTick((current) => current + 1);
            }}
          >
            <Menu size={15} /> Menú general
          </button>
          <span>CATÁLOGO DE VENTAS</span>
          <h2>Explorar productos</h2>
          <p>Elige una familia, categoría o marca para mostrar su colección.</p>
        </header>

        <div className="sale-catalog-groups">
          <section className="sale-catalog-group">
            <div className="sale-catalog-group-title">
              <span><Boxes size={15} /></span>
              <div><strong>Familias</strong><small>{formatSaleCount(Math.max(0, families.length - 1), "colección", "colecciones")}</small></div>
            </div>
            <div className="sale-catalog-options" role="list" aria-label="Familias de productos">
              {families.map((family) => {
                const optionCount = family === "Todos"
                  ? saleProducts.length
                  : saleProducts.filter((product) => product.family === family).length;
                return (
                  <button
                    key={family}
                    type="button"
                    className={selectedFamily === family ? "is-active" : ""}
                    onClick={() => {
                      setSelectedFamily(family);
                      setSelectedCategory("Todas");
                      setSelectedBrand("Todas");
                    }}
                  >
                    <span><strong>{family === "Todos" ? "Todo el catálogo" : family}</strong><small>{formatSaleCount(optionCount, "opción", "opciones")}</small></span>
                    <ChevronRight size={14} />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="sale-catalog-group">
            <div className="sale-catalog-group-title">
              <span><Filter size={15} /></span>
              <div><strong>Categorías</strong><small>{formatSaleCount(Math.max(0, categories.length - 1), "disponible", "disponibles")}</small></div>
            </div>
            <div className="sale-catalog-options" role="list" aria-label="Categorías de productos">
              {categories.map((category) => {
                const optionCount = saleProducts.filter(
                  (product) =>
                    (selectedFamily === "Todos" || product.family === selectedFamily) &&
                    (category === "Todas" || product.category === category),
                ).length;
                return (
                  <button
                    key={category}
                    type="button"
                    className={selectedCategory === category ? "is-active" : ""}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSelectedBrand("Todas");
                    }}
                  >
                    <span><strong>{category === "Todas" ? "Todas las categorías" : category}</strong><small>{formatSaleCount(optionCount, "opción", "opciones")}</small></span>
                    <ChevronRight size={14} />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="sale-catalog-group">
            <div className="sale-catalog-group-title">
              <span><Sparkles size={15} /></span>
              <div><strong>Marcas</strong><small>{formatSaleCount(Math.max(0, brands.length - 1), "disponible", "disponibles")}</small></div>
            </div>
            <div className="sale-catalog-options" role="list" aria-label="Marcas de productos">
              {brands.map((brand) => {
                const optionCount = saleProducts.filter(
                  (product) =>
                    (selectedFamily === "Todos" || product.family === selectedFamily) &&
                    (selectedCategory === "Todas" || product.category === selectedCategory) &&
                    (brand === "Todas" || getSaleProductBrand(product) === brand),
                ).length;
                return (
                  <button
                    key={brand}
                    type="button"
                    className={selectedBrand === brand ? "is-active" : ""}
                    onClick={() => setSelectedBrand(brand)}
                  >
                    <span><strong>{brand === "Todas" ? "Todas las marcas" : brand}</strong><small>{formatSaleCount(optionCount, "opción", "opciones")}</small></span>
                    <ChevronRight size={14} />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </aside>

      <section className="catalog-panel">
        <div className="sale-toolbar">
          <div className="catalog-search">
            <Search size={19} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o SKU…"
              aria-label="Buscar producto por nombre o SKU"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
          <div className="catalog-count">
            <Sparkles size={17} /> {formatSaleCount(filteredProducts.length, "opción", "opciones")}
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className="product-card"
                onClick={() => openProduct(product)}
              >
                <div className="product-image-wrap">
                  <img src={product.image} alt={product.name} />
                  <Badge className="product-card-kind">
                    {product.kind === "SERVICE"
                      ? "SERVICIO"
                      : product.category.toUpperCase()}
                  </Badge>
                </div>
                <div className="product-card-body">
                  <h3>{product.name}</h3>
                  <div
                    className="product-seller-sku"
                    aria-label={`SKU ${product.sku}`}
                  >
                    <span>SKU</span>
                    <strong>{product.sku}</strong>
                  </div>
                  <div className="product-price-row">
                    <span>Precio de lista</span>
                    <strong>{formatCurrency(product.maxPrice)}</strong>
                  </div>
                  <div className="product-stock-row">
                    <span
                      className={
                        product.stock !== null && product.stock < 0
                          ? "is-negative"
                          : ""
                      }
                    >
                      {product.stock === null
                        ? "Agenda abierta"
                        : product.stock < 0
                          ? `${product.stock} piezas · pendiente entregar`
                          : `${product.stock} piezas`}
                    </span>
                    <span className="add-product-hint">
                      Elegir <ChevronRight size={15} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-catalog">
            <Search size={28} />
            <h3>No encontramos productos</h3>
            <p>Prueba con otro nombre, SKU, familia o categoría.</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setSelectedFamily("Todos");
                setSelectedCategory("Todas");
                setSelectedBrand("Todas");
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </section>

      <aside className="cart-panel">
        <div className="cart-heading">
          <div>
            <span>TICKET ACTUAL</span>
            <h2>Carrito</h2>
          </div>
          <span className="cart-count">
            <ShoppingCart size={16} /> {cartCount}
          </span>
        </div>
        {cart.length === 0 ? (
          <div className="empty-cart">
            <div>
              <ShoppingBag size={28} />
            </div>
            <h3>Tu ticket está vacío</h3>
            <p>
              Selecciona una foto para configurar piezas, precio y comentarios.
            </p>
          </div>
        ) : (
          <div className="cart-items">
            {cart.map((item) => {
              if (item.dealInstanceId) {
                const dealItems = cart.filter(
                  (candidate) =>
                    candidate.dealInstanceId === item.dealInstanceId,
                );
                if (dealItems[0]?.id !== item.id) return null;
                const deal = deals.find(
                  (candidate) => candidate.id === item.dealId,
                );
                const dealTotal = dealItems.reduce(
                  (sum, dealItem) =>
                    sum + dealItem.unitPrice * dealItem.quantity,
                  0,
                );
                return (
                  <article key={item.dealInstanceId} className="cart-deal-group">
                    <div className="cart-deal-heading">
                      <span><PackageCheck size={16} /></span>
                      <div>
                        <small>{deal?.sku ?? "DEAL"}</small>
                        <strong>{item.dealName}</strong>
                        <em>{item.dealQuantity ?? 1} paquete{(item.dealQuantity ?? 1) === 1 ? "" : "s"}</em>
                      </div>
                      <button type="button" onClick={() => removeDealFromCart(item.dealInstanceId ?? "")} aria-label={`Quitar paquete ${item.dealName}`}><Trash2 size={14} /></button>
                    </div>
                    <div className="cart-deal-products">
                      {dealItems.map((dealItem) => (
                        <div key={dealItem.id}>
                          <span>{dealItem.quantity} × {dealItem.product.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="cart-deal-total">
                      <span>Precio autorizado del paquete</span>
                      <strong>{formatCurrency(dealTotal)}</strong>
                    </div>
                  </article>
                );
              }
              return (
                <article key={item.id} className="cart-item">
                  <div className="cart-item-main">
                    <div className="cart-item-title-row">
                      <button
                        type="button"
                        className="cart-item-edit-trigger"
                        onClick={() => openCartItem(item)}
                      >
                        <span>
                          <strong>{item.product.name}</strong>
                          <span>{formatCurrency(item.unitPrice)} c/u</span>
                        </span>
                        <Pencil size={14} />
                      </button>
                    </div>
                    {item.comment && (
                      <p className="cart-comment">“{item.comment}”</p>
                    )}
                    <div className="cart-item-footer">
                      <div className="mini-quantity">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity === 1}
                          aria-label="Reducir cantidad"
                        >
                          <Minus size={13} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(item.id, item.quantity + 1)
                          }
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <strong>
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="cart-summary">
          <div className="ticket-discount-compact">
            <div className="ticket-offer-actions">
              <button
                type="button"
                className={`discount-trigger ${discountOpen ? "is-active" : ""}`}
                onClick={() => {
                  setDiscountDraftMode(discountMode);
                  setDiscountDraftValue(discountValue);
                  setDiscountOpen(true);
                }}
                disabled={cart.length === 0}
                aria-label="Abrir descuento promocional"
                aria-expanded={discountOpen}
              >
                <BadgePercent size={15} />
                <span>Descuento</span>
                {ticketDiscountAmount > 0 && (
                  <strong>-{formatCurrency(ticketDiscountAmount)}</strong>
                )}
              </button>
              <button
                type="button"
                className="deal-ticket-trigger"
                onClick={() => {
                  setDiscountOpen(false);
                  setDealPickerOpen(true);
                }}
                aria-label="Abrir paquetes disponibles"
              >
                <PackagePlus size={16} />
                <span>Paquetes</span>
              </button>
            </div>
          </div>
          <div>
            <span>Subtotal</span>
            <strong>{formatCurrency(cartSubtotal)}</strong>
          </div>
          <div className="ticket-discount-line">
            <span>Descuento</span>
            <strong>-{formatCurrency(ticketDiscountAmount)}</strong>
          </div>
          <div className="cart-total">
            <span>Total</span>
            <strong>{formatCurrency(ticketTotal)}</strong>
          </div>
          <Button
            type="button"
            className="checkout-button"
            disabled={cart.length === 0}
            onClick={openCheckout}
          >
            Finalizar ticket <ArrowRight size={18} />
          </Button>
          <p>Los datos se conservan únicamente durante esta sesión mock.</p>
        </div>
      </aside>
      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent className="discount-entry-dialog sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Aplicar descuento</DialogTitle>
            <DialogDescription>
              Ingresa el descuento y confirma con la paloma para regresar al
              ticket.
            </DialogDescription>
          </DialogHeader>
          <form
            className="discount-entry-form"
            onSubmit={(event) => {
              event.preventDefault();
              setDiscountMode(discountDraftMode);
              setDiscountValue(
                Math.min(discountDraftMaximum, normalizedDiscountDraftValue),
              );
              setDiscountOpen(false);
            }}
          >
            <div className="discount-entry-mode" aria-label="Tipo de descuento">
              <button
                type="button"
                className={discountDraftMode === "PERCENT" ? "is-active" : ""}
                onClick={() => {
                  setDiscountDraftValue(
                    cartSubtotal > 0
                      ? (discountDraftAmount / cartSubtotal) * 100
                      : 0,
                  );
                  setDiscountDraftMode("PERCENT");
                }}
                aria-pressed={discountDraftMode === "PERCENT"}
              >
                <Percent size={18} />
                Porcentaje
              </button>
              <button
                type="button"
                className={discountDraftMode === "AMOUNT" ? "is-active" : ""}
                onClick={() => {
                  setDiscountDraftValue(discountDraftAmount);
                  setDiscountDraftMode("AMOUNT");
                }}
                aria-pressed={discountDraftMode === "AMOUNT"}
              >
                <DollarSign size={18} />
                Pesos
              </button>
            </div>

            <label className="discount-entry-field">
              <span>
                {discountDraftMode === "PERCENT"
                  ? "Porcentaje de descuento"
                  : "Monto del descuento"}
              </span>
              <div>
                <b>{discountDraftMode === "PERCENT" ? "%" : "$"}</b>
                <Input
                  type="number"
                  min="0"
                  max={discountDraftMaximum}
                  step="0.01"
                  value={discountDraftValue}
                  onChange={(event) =>
                    setDiscountDraftValue(Number(event.target.value))
                  }
                  aria-label={
                    discountDraftMode === "PERCENT"
                      ? "Porcentaje de descuento promocional"
                      : "Importe de descuento promocional"
                  }
                  autoFocus
                />
              </div>
            </label>

            <section className="discount-entry-preview" aria-live="polite">
              <span>DESCUENTO A APLICAR</span>
              <strong>-{formatCurrency(discountDraftAmount)}</strong>
              <div>
                <span>Subtotal <b>{formatCurrency(cartSubtotal)}</b></span>
                <span>Total actualizado <b>{formatCurrency(discountDraftTotal)}</b></span>
              </div>
            </section>

            <p className="discount-entry-limit">
              Tope disponible: <strong>{formatCurrency(maxPromotionalDiscount)}</strong>{" "}
              para respetar el precio mínimo del ticket.
            </p>

            <DialogFooter className="discount-entry-footer">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDiscountOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="discount-entry-accept">
                <CheckCircle2 size={18} /> Aceptar descuento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderReceipts = () => {
    const businessToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
    }).format(new Date());
    const normalizedSearch = receiptSearch.trim().toLocaleLowerCase("es-MX");
    const receiptBranches = Array.from(
      new Set([
        ...Object.keys(branchInventory),
        ...tickets
          .map((ticket) => ticket.branchName)
          .filter((branch): branch is string => Boolean(branch)),
      ]),
    ).sort((left, right) => left.localeCompare(right, "es-MX"));
    const filteredTickets = tickets.filter((ticket) => {
      const ticketDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
      }).format(new Date(ticket.createdAtIso));
      const matchesDate = receiptHistoryAuthorized
        ? !receiptDate || ticketDate === receiptDate
        : ticketDate === businessToday;
      const matchesBranch =
        !receiptHistoryAuthorized ||
        receiptBranch === "ALL" ||
        ticket.branchName === receiptBranch;
      const matchesSearch =
        !normalizedSearch ||
        ticket.clientName
          .toLocaleLowerCase("es-MX")
          .includes(normalizedSearch) ||
        ticket.sellerSummary
          .toLocaleLowerCase("es-MX")
          .includes(normalizedSearch) ||
        ticket.id.toLocaleLowerCase("es-MX").includes(normalizedSearch);
      return matchesDate && matchesBranch && matchesSearch;
    });
    const activeFilteredTickets = filteredTickets.filter(
      (ticket) => ticket.status === "COMPLETED",
    );
    const receiptPageCount = Math.max(
      1,
      Math.ceil(filteredTickets.length / receiptPageSize),
    );
    const safeReceiptPage = Math.min(receiptPage, receiptPageCount);
    const paginatedReceiptTickets = filteredTickets.slice(
      (safeReceiptPage - 1) * receiptPageSize,
      safeReceiptPage * receiptPageSize,
    );
    const filteredSaleTickets = activeFilteredTickets.filter(
      (ticket) => ticket.ticketType !== "LAYAWAY_PAYMENT",
    );
    const total = filteredSaleTickets.reduce(
      (sum, ticket) => sum + ticket.total,
      0,
    );
    const collected = activeFilteredTickets.reduce(
      (sum, ticket) =>
        sum +
        ticket.payments.reduce(
          (paymentTotal, payment) => paymentTotal + payment.amount,
          0,
        ),
      0,
    );
    const pending = filteredSaleTickets.reduce(
      (sum, ticket) => sum + ticket.balanceDue,
      0,
    );
    const salesByDate = Array.from(
      filteredSaleTickets
        .reduce<Map<string, number>>((summary, ticket) => {
          const date = new Intl.DateTimeFormat("es-MX", {
            day: "2-digit",
            month: "short",
            timeZone: "America/Mexico_City",
          }).format(new Date(ticket.createdAtIso));
          summary.set(date, (summary.get(date) ?? 0) + ticket.total);
          return summary;
        }, new Map())
        .entries(),
    ).slice(-6);
    const maxDailySale = Math.max(1, ...salesByDate.map(([, value]) => value));
    const paymentDashboard = paymentMethods.map((method) => ({
      ...method,
      total: activeFilteredTickets.reduce(
        (ticketSum, ticket) =>
          ticketSum +
          ticket.payments.reduce(
            (paymentSum, payment) =>
              paymentSum +
              (payment.methodId === method.id ? payment.amount : 0),
            0,
          ),
        0,
      ),
    }));
    const paidTickets = filteredSaleTickets.filter(
      (ticket) => ticket.paymentStatus === "PAID",
    ).length;
    const averageTicket = filteredSaleTickets.length > 0
      ? total / filteredSaleTickets.length
      : 0;
    const currentMonthKey = businessToday.slice(0, 7);
    const [currentYear = new Date().getFullYear(), currentMonthNumber = 1] =
      currentMonthKey.split("-").map(Number);
    const previousMonthKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
    }).format(new Date(currentYear, currentMonthNumber - 2, 1));
    const reportScopeTickets = tickets.filter(
      (ticket) =>
        ticket.status === "COMPLETED" &&
        ticket.ticketType !== "LAYAWAY_PAYMENT" &&
        (receiptBranch === "ALL" || ticket.branchName === receiptBranch),
    );
    const currentMonthTicketCount = reportScopeTickets.filter(
      (ticket) =>
        operationalBusinessDate(ticket.createdAtIso).slice(0, 7) === currentMonthKey,
    ).length;
    const previousMonthTicketCount = reportScopeTickets.filter(
      (ticket) =>
        operationalBusinessDate(ticket.createdAtIso).slice(0, 7) === previousMonthKey,
    ).length;
    const ticketCountComparison = previousMonthTicketCount > 0
      ? ((currentMonthTicketCount - previousMonthTicketCount) /
          previousMonthTicketCount) * 100
      : currentMonthTicketCount > 0
        ? 100
        : 0;
    const authorizeReceiptHistory = () => {
      if (!isMasterAccessCode(receiptHistoryCode)) {
        toast.error("Código master incorrecto.");
        return;
      }
      setReceiptHistoryAuthorized(true);
      setReceiptHistoryCode("");
      setReceiptDate("");
      setReceiptBranch("ALL");
      toast.success("Historial completo y acciones administrativas habilitados.");
    };
    return (
      <div className="view-stack">
        <Card className="receipt-access-card">
          <CardContent>
            <div className="receipt-access-copy">
              <LockKeyhole size={20} />
              <span>
                <small>
                  {receiptHistoryAuthorized
                    ? "SESIÓN MASTER"
                    : "ACCESO OPERATIVO"}
                </small>
                <strong>
                  {receiptHistoryAuthorized
                    ? "Historial completo habilitado"
                    : `Sólo tickets del día ${businessToday}`}
                </strong>
                <p>
                  {receiptHistoryAuthorized
                    ? "Puedes consultar fechas anteriores, editar y cancelar tickets."
                    : "Sin autorización master únicamente puedes visualizar e imprimir."}
                </p>
              </span>
            </div>
            {receiptHistoryAuthorized ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReceiptHistoryAuthorized(false);
                  setReceiptDate("");
                  setReceiptBranch("ALL");
                  setReceiptSearch("");
                  setReceiptPage(1);
                  toast.info("Receipts volvió a la vista operativa del día.");
                }}
              >
                <LockKeyhole size={15} /> Bloquear historial
              </Button>
            ) : (
              <div className="receipt-master-access">
                <Input
                  type="password"
                  value={receiptHistoryCode}
                  onChange={(event) => setReceiptHistoryCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") authorizeReceiptHistory();
                  }}
                  placeholder="Código master"
                  aria-label="Código master para historial de Receipts"
                />
                <Button
                  type="button"
                  onClick={authorizeReceiptHistory}
                  disabled={!receiptHistoryCode}
                >
                  <ShieldCheck size={15} /> Ver historial
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="metric-grid three-columns">
          <MetricCard
            label="VENTA DEL DÍA"
            value={formatCurrency(total)}
            icon={CircleDollarSign}
            tone="neutral"
          />
          <MetricCard
            label="TOTAL COBRADO"
            value={formatCurrency(collected)}
            icon={CheckCircle2}
            tone="positive"
          />
          <MetricCard
            label="SALDO PENDIENTE"
            value={formatCurrency(pending)}
            icon={Clock3}
            tone="negative"
          />
        </div>
        <div className="metric-grid three-columns receipt-ticket-kpis">
          <MetricCard
            label="TICKETS DEL PERIODO"
            value={String(filteredSaleTickets.length)}
            icon={ShoppingBag}
            tone="neutral"
          />
          <MetricCard
            label="PROMEDIO POR TICKET"
            value={formatCurrency(averageTicket)}
            icon={TrendingUp}
            tone="positive"
          />
          <MetricCard
            label="COMPARATIVO VS. MES ANTERIOR"
            value={`${ticketCountComparison >= 0 ? "+" : ""}${ticketCountComparison.toFixed(1)}%`}
            icon={ticketCountComparison >= 0 ? TrendingUp : TrendingDown}
            tone={ticketCountComparison >= 0 ? "positive" : "negative"}
          />
        </div>
        <div className="receipts-dashboard-grid">
          <Card className="receipts-dashboard-card sales-chart-card">
            <CardContent>
              <div className="dashboard-card-heading">
                <div>
                  <span>VENTA POR FECHA</span>
                  <h2>Comportamiento de tickets</h2>
                </div>
                <TrendingUp size={20} />
              </div>
              <div className="receipt-sales-bars">
                {salesByDate.map(([date, value]) => (
                  <div key={date}>
                    <strong>{formatCurrency(value)}</strong>
                    <span>
                      <i
                        style={{
                          height: `${Math.max(12, (value / maxDailySale) * 100)}%`,
                        }}
                      />
                    </span>
                    <small>{date}</small>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="receipts-dashboard-card">
            <CardContent>
              <div className="dashboard-card-heading">
                <div>
                  <span>FORMA DE PAGO</span>
                  <h2>Distribución cobrada</h2>
                </div>
                <CircleDollarSign size={20} />
              </div>
              <div className="payment-dashboard-list">
                {paymentDashboard.map((method) => (
                  <div key={method.id}>
                    <span>
                      <strong>{method.label}</strong>
                      <small>{formatCurrency(method.total)}</small>
                    </span>
                    <i>
                      <b
                        style={{
                          width: `${collected > 0 ? (method.total / collected) * 100 : 0}%`,
                        }}
                      />
                    </i>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="receipts-dashboard-card receipt-status-card">
            <CardContent>
              <div className="dashboard-card-heading">
                <div>
                  <span>ESTATUS</span>
                  <h2>Salud de cobranza</h2>
                </div>
                <CheckCircle2 size={20} />
              </div>
              <div className="receipt-status-ring">
                <strong>
                  {filteredSaleTickets.length > 0
                    ? Math.round(
                        (paidTickets / filteredSaleTickets.length) * 100,
                      )
                    : 0}
                  %
                </strong>
                <span>tickets pagados</span>
              </div>
              <div className="receipt-status-lines">
                <span>
                  Pagados <strong>{paidTickets}</strong>
                </span>
                <span>
                  Con saldo{" "}
                  <strong>{filteredSaleTickets.length - paidTickets}</strong>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="receipt-filter-card">
          <CardContent>
            {receiptHistoryAuthorized ? (
              <>
                <div className="receipt-filter-field">
                  <CalendarDays size={17} />
                  <DatePicker
                    value={receiptDate}
                    onChange={(date) => {
                      setReceiptDate(date);
                      setReceiptPage(1);
                    }}
                    placeholder="Todas las fechas"
                  />
                </div>
                <div className="receipt-filter-field receipt-branch-filter">
                  <Filter size={17} />
                  <Select value={receiptBranch} onValueChange={(branch) => {
                    setReceiptBranch(branch);
                    setReceiptPage(1);
                  }}>
                    <SelectTrigger aria-label="Filtrar Receipts por sucursal">
                      <SelectValue placeholder="Todas las sucursales" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas las sucursales</SelectItem>
                      {receiptBranches.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="receipt-current-day">
                <CalendarDays size={17} />
                <span>
                  <small>DÍA VIGENTE</small>
                  <strong>{businessToday}</strong>
                </span>
              </div>
            )}
            <div className="receipt-filter-field">
              <Search size={17} />
              <Input
                value={receiptSearch}
                onChange={(event) => {
                  setReceiptSearch(event.target.value);
                  setReceiptPage(1);
                }}
                placeholder="Buscar por cliente, vendedor o folio"
                aria-label="Buscar tickets por nombre o folio"
              />
            </div>
            {(receiptSearch ||
              (receiptHistoryAuthorized &&
                (receiptDate || receiptBranch !== "ALL"))) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReceiptDate("");
                  setReceiptBranch("ALL");
                  setReceiptSearch("");
                  setReceiptPage(1);
                }}
              >
                <RotateCcw size={15} /> Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="data-card">
          <CardContent className="p-0">
            <div className="data-card-heading">
              <div>
                <span>REGISTRO DE TICKETS</span>
                <h2>
                  {receiptHistoryAuthorized
                    ? "Historial de ventas"
                    : "Tickets del día vigente"}
                </h2>
              </div>
              {receiptHistoryAuthorized && (
                <Button type="button" variant="outline">
                  <Download size={16} /> Exportar
                </Button>
              )}
            </div>
            <div className="table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TICKET</TableHead>
                    <TableHead>FECHA</TableHead>
                    <TableHead>CLIENTE</TableHead>
                    <TableHead>VENDEDOR</TableHead>
                    <TableHead>PIEZAS</TableHead>
                    <TableHead>DESCUENTO</TableHead>
                    <TableHead>TOTAL</TableHead>
                    <TableHead>COBRO</TableHead>
                    <TableHead>SALDO</TableHead>
                    <TableHead>ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReceiptTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <strong>{ticket.id}</strong>
                        {ticket.status === "REFUNDED" && (
                          <Badge variant="outline" className="cancelled-ticket-badge">
                            CANCELADO
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{ticket.createdAt}</TableCell>
                      <TableCell>{ticket.clientName}</TableCell>
                      <TableCell>{ticket.sellerSummary}</TableCell>
                      <TableCell>{ticket.items}</TableCell>
                      <TableCell>
                        {ticket.discountAmount > 0 ? (
                          <strong className="receipt-discount">
                            -{formatCurrency(ticket.discountAmount)}
                          </strong>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <strong>{formatCurrency(ticket.total)}</strong>
                      </TableCell>
                      <TableCell>
                        <div className="receipt-payment-cell">
                          <span
                            className={`payment-status-pill status-${ticket.paymentStatus.toLocaleLowerCase("en-US")}`}
                          >
                            {paymentStatusLabels[ticket.paymentStatus]}
                          </span>
                          <small>
                            {ticket.payments.length > 0
                              ? ticket.payments
                                  .map(
                                    (payment) =>
                                      `${paymentLabel(payment.methodId)} ${formatCurrency(payment.amount)}`,
                                  )
                                  .join(" + ")
                              : "Sin abono"}
                          </small>
                        </div>
                      </TableCell>
                      <TableCell>
                        <strong
                          className={ticket.balanceDue > 0 ? "is-negative" : ""}
                        >
                          {ticket.balanceDue > 0
                            ? formatCurrency(ticket.balanceDue)
                            : "—"}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <div className="receipt-row-actions">
                          {receiptHistoryAuthorized && (
                            <button
                              type="button"
                              onClick={() => editTicket(ticket)}
                              aria-label={`Editar ticket ${ticket.id}`}
                              title="Editar"
                              disabled={ticket.status === "REFUNDED"}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => previewTicket(ticket)}
                            aria-label={`Visualizar ticket ${ticket.id}`}
                            title="Visualizar"
                          >
                            <Eye size={15} />
                          </button>
                          {receiptHistoryAuthorized && (
                            <button
                              type="button"
                              className="is-destructive"
                              onClick={() => openTicketCancellation(ticket)}
                              aria-label={`Cancelar ticket ${ticket.id}`}
                              title="Cancelar ticket"
                              disabled={ticket.status === "REFUNDED"}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10}>
                        No se encontraron tickets con esos filtros.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <HistoryPagination
              total={filteredTickets.length}
              page={safeReceiptPage}
              pageSize={receiptPageSize}
              pageCount={receiptPageCount}
              onPageChange={setReceiptPage}
              onPageSizeChange={(size) => {
                setReceiptPageSize(size);
                setReceiptPage(1);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderInventory = () => (
    <DigitalCatalogView
      products={catalogProducts.filter(
        (product) =>
          catalogFamilyStatus[product.family] !== false &&
          catalogCategoryStatus[product.category] !== false,
      )}
      companyName={receiptSettings.companyName}
      logoUrl={receiptSettings.logoUrl}
      authorizeExit={authorizeCatalogExit}
    />
  );

  const renderSettings = () => (
    <div className={`settings-grid is-sectioned settings-section-${activeSettingsSection}`}>
      <Card className="settings-card settings-directory-card">
        <CardContent>
          <span className="section-kicker">CENTRO DE CONFIGURACIÓN</span>
          <h2>Ajustes del sistema</h2>
          <p>Selecciona una categoría. Al abrir otra, la anterior se contrae automáticamente.</p>
          <div className="settings-directory-list">
            {([
              ["notifications", "Notificaciones", RefreshCw],
              ["inventory", "Inventario y catálogos", Boxes],
              ["cash", "Tipos de gastos", CircleDollarSign],
              ["competition", "Competiciones", TrendingUp],
              ["clients", "Clientes y procedencias", Users],
              ["courtesy", "Cortesías de bienvenida", Sparkles],
              ["pricing", "Precios y autorización", BadgePercent],
              ["receipt", "Diseño de ticket", Printer],
              ["payments", "Métodos de pago", CreditCard],
              ["vouchers", "Vouchers promocionales", Sparkles],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                className={activeSettingsSection === id ? "is-active" : ""}
                onClick={() => setActiveSettingsSection(id)}
              >
                <Icon size={18} />
                <strong>{label}</strong>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <NotificationSettings
        preferences={notificationPreferences}
        sellers={sellers}
        masterUser={posApiEnabled && sessionUser ? { ...masterUser, id: sessionUser.id, name: sessionUser.name, initials: sessionUser.initials } : masterUser}
        isMasterCode={isMasterAccessCode}
        onChange={saveNotificationPreferences}
        apiMode={posApiEnabled}
      />
      <InventoryCatalogSettings
        families={catalogFamilies}
        categories={catalogCategories}
        products={catalogProducts}
        familyStatus={catalogFamilyStatus}
        categoryStatus={catalogCategoryStatus}
        onRenameFamily={renameCatalogFamily}
        onRenameCategory={renameCatalogCategory}
        onRenameProduct={renameCatalogProduct}
        onToggleFamily={(name, active) =>
          setCatalogTaxonomyStatus("FAMILY", name, active)
        }
        onToggleCategory={(name, active) =>
          setCatalogTaxonomyStatus("CATEGORY", name, active)
        }
        onToggleProduct={setCatalogProductStatus}
      />
      <WarehouseSettings
        categories={warehouseCategories}
        canManage={canManageWarehouse}
        onSave={saveWarehouseCategory}
        onToggle={toggleWarehouseCategory}
        onDelete={deleteWarehouseCategory}
      />
      <ExpenseTypeSettings
        types={expenseTypes}
        isMasterCode={isMasterAccessCode}
        onSave={(type) => {
          if (!posApiEnabled) return saveExpenseType(type);
          const mutation = expenseTypes.some((item) => item.id === type.id)
            ? posApi.updateExpenseType(type.id, { name: type.name, active: type.active })
            : posApi.createExpenseType({ name: type.name, active: type.active });
          void mutation.then((saved) => {
            const mapped = expenseTypeFromDto(saved);
            setExpenseTypes((current) => current.some((item) => item.id === mapped.id) ? current.map((item) => item.id === mapped.id ? mapped : item) : [...current, mapped]);
          }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo guardar el tipo de gasto."));
        }}
        onToggle={(typeId) => {
          if (!posApiEnabled) return toggleExpenseType(typeId);
          const type = expenseTypes.find((item) => item.id === typeId);
          if (!type) return;
          void posApi.updateExpenseType(typeId, { name: type.name, active: !type.active }).then((saved) => {
            const mapped = expenseTypeFromDto(saved);
            setExpenseTypes((current) => current.map((item) => item.id === mapped.id ? mapped : item));
          }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo actualizar el tipo de gasto."));
        }}
        onDelete={(typeId) => {
          if (!posApiEnabled) return deleteExpenseType(typeId);
          void posApi.deleteExpenseType(typeId).then(() => {
            setExpenseTypes((current) => current.map((item) => item.id === typeId ? { ...item, active: false } : item));
          }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo retirar el tipo de gasto."));
        }}
      />
      <CompetitionSettings
        open={competitionSettingsOpen}
        authorized={competitionSettingsAuthorized}
        competitions={competitions}
        products={catalogProducts}
        branches={operationalBranches}
        onOpenChange={setCompetitionSettingsOpen}
        onAuthorize={authorizeCompetitionSettings}
        onLock={() => setCompetitionSettingsAuthorized(false)}
        onSave={saveCompetition}
        onToggle={toggleCompetition}
        onDelete={deleteCompetition}
      />
      <Card className="settings-card courtesy-settings-card">
        <CardContent>
          <span className="section-kicker">VENTA · CLIENTE NUEVO</span>
          <h2>Paquetes y productos de cortesía</h2>
          <p>Define si la cortesía es obligatoria y cuáles opciones podrá ofrecer el vendedor durante Checkout.</p>
          <button
            type="button"
            className={`courtesy-required-toggle ${courtesySettings.required ? "is-active" : ""}`}
            role="switch"
            aria-checked={courtesySettings.required}
            onClick={() => setCourtesySettings((current) => ({ ...current, required: !current.required }))}
          >
            <span>
              <strong>Solicitar cortesía al registrar cliente</strong>
              <small>{courtesySettings.required ? "Checkout exige paquete, fecha, sucursal y horario." : "La pregunta y el mensaje se omiten; la venta continúa normalmente."}</small>
            </span>
            <span className={`mock-switch ${courtesySettings.required ? "is-on" : ""}`}><i /></span>
          </button>
          <div className="courtesy-settings-options">
            {courtesyPackageOptions.map((option) => {
              const selected = courtesySettings.enabledPackages.includes(option.id);
              return (
                <label key={option.id} className={selected ? "is-selected" : ""}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => setCourtesySettings((current) => {
                      if (selected && current.enabledPackages.length === 1) {
                        toast.error("Conserva al menos un paquete de cortesía disponible.");
                        return current;
                      }
                      const enabledPackages = selected
                        ? current.enabledPackages.filter((id) => id !== option.id)
                        : [...current.enabledPackages, option.id];
                      return {
                        ...current,
                        enabledPackages,
                        defaultPackage: enabledPackages.includes(current.defaultPackage)
                          ? current.defaultPackage
                          : enabledPackages[0] ?? "FACIAL",
                      };
                    })}
                  />
                  <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                </label>
              );
            })}
          </div>
          <div className="field-stack courtesy-default-package">
            <span>Paquete seleccionado por defecto</span>
            <Select
              value={courtesySettings.defaultPackage}
              onValueChange={(value) => setCourtesySettings((current) => ({ ...current, defaultPackage: value as CourtesyPackage }))}
            >
              <SelectTrigger aria-label="Paquete de cortesía por defecto"><SelectValue /></SelectTrigger>
              <SelectContent>
                {courtesyPackageOptions.filter((option) => courtesySettings.enabledPackages.includes(option.id)).map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card className="settings-card client-required-settings-card">
        <CardContent>
          <span className="section-kicker">CLIENTES</span>
          <h2>Campos obligatorios</h2>
          <p>
            Define qué información debe completarse al registrar una nueva
            clienta durante el cierre del ticket.
          </p>
          <div className="settings-list">
            {(Object.keys(requiredFields) as ClientField[]).map((field) => (
              <button
                key={field}
                type="button"
                className="setting-row"
                onClick={() => toggleRequiredClientField(field)}
                role="switch"
                aria-checked={requiredFields[field]}
              >
                <span>
                  <strong>{clientFieldLabels[field]}</strong>
                  <small>
                    {requiredFields[field]
                      ? "Obligatorio para finalizar"
                      : "Campo opcional"}
                  </small>
                </span>
                <span
                  className={`mock-switch ${requiredFields[field] ? "is-on" : ""}`}
                >
                  <i />
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="settings-card client-source-settings-card">
        <CardContent>
          <span className="section-kicker">CLIENTES · PROCEDENCIA</span>
          <h2>Catálogo de procedencias</h2>
          <p>
            Las altas futuras usarán el nombre vigente. Cada cliente histórico
            conserva la procedencia registrada al momento de su alta.
          </p>
          <div className="client-source-editor">
            <Input
              value={clientSourceName}
              onChange={(event) => setClientSourceName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveClientSource();
              }}
              placeholder={
                editingClientSourceId
                  ? "Editar nombre de procedencia"
                  : "Nueva procedencia"
              }
              aria-label="Nombre de procedencia"
            />
            <Button
              type="button"
              onClick={saveClientSource}
              disabled={!clientSourceName.trim()}
            >
              {editingClientSourceId ? (
                <>
                  <CheckCircle2 size={15} /> Guardar
                </>
              ) : (
                <>
                  <Plus size={15} /> Agregar
                </>
              )}
            </Button>
            {editingClientSourceId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingClientSourceId("");
                  setClientSourceName("");
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
          <div className="client-source-list">
            {clientSources.map((source) => (
              <div
                key={source.id}
                className={source.active ? "" : "is-inactive"}
              >
                <span>
                  <strong>{source.label}</strong>
                  <small>
                    {source.active
                      ? "Disponible para nuevos registros"
                      : "Baja · se conserva en históricos"}
                  </small>
                </span>
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${source.label}`}
                    onClick={() => editClientSource(source)}
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={
                      source.active
                        ? `Dar de baja ${source.label}`
                        : `Restaurar ${source.label}`
                    }
                    onClick={() => toggleClientSource(source.id)}
                  >
                    {source.active ? (
                      <Trash2 size={15} />
                    ) : (
                      <RotateCcw size={15} />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="settings-card accent-card pricing-settings-card">
        <CardContent>
          <span className="section-kicker">PRECIOS</span>
          <h2>Control administrativo</h2>
          <p>
            El precio de lista puede incrementarse sin límite. Bajar del piso
            interno requiere autorización y el SPARE sólo aparece en el
            X-Report protegido.
          </p>
          <div className="admin-code-preview">
            <span>CÓDIGO MOCK</span>
            <strong>••••</strong>
            <small>La autorización real se valida en el servidor.</small>
          </div>
          <div className="rule-list">
            <span>
              <CheckCircle2 size={16} /> Precio sobre lista sin límite
            </span>
            <span>
              <CheckCircle2 size={16} /> Autorizar precios bajo el mínimo
            </span>
            <span>
              <CheckCircle2 size={16} /> SPARE visible sólo en X-Report
            </span>
          </div>
          <div className="cipher-legend">
            <span>CLAVE DE PISO</span>
            <strong>Esquema interno activo</strong>
            <small>La equivalencia no se muestra en la interfaz.</small>
          </div>
        </CardContent>
      </Card>
      <Card className="settings-card receipt-settings-card">
        <CardContent>
          <div className="receipt-settings-heading">
            <div>
              <span className="section-kicker">IMPRESIÓN DE TICKET</span>
              <h2>Diseño y datos del comprobante</h2>
            </div>
            {receiptSettings.logoUrl && (
              <img
                src={receiptSettings.logoUrl}
                alt="Logo configurado"
                style={{
                  width: `${Math.min(receiptSettings.logoWidth, 72)}px`,
                  height: `${Math.min(receiptSettings.logoWidth, 72)}px`,
                }}
              />
            )}
          </div>
          <p>
            Personaliza el encabezado, la información visible y el mensaje que
            recibirá la clienta en la impresión térmica.
          </p>
          <div className="receipt-settings-fields">
            <div className="field-stack receipt-logo-upload-field">
              <span>Adjuntar logo</span>
              <label className="receipt-logo-upload" htmlFor="receipt-logo-file">
                <Download size={16} /> Seleccionar imagen
              </label>
              <input
                id="receipt-logo-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleReceiptLogoUpload}
              />
              <small>PNG, JPG, WEBP o SVG · máximo 2 MB.</small>
            </div>
            <div className="field-stack">
              <span>URL del logo (opcional)</span>
              <Input
                value={receiptSettings.logoUrl}
                onChange={(event) =>
                  setReceiptSettings((current) => ({
                    ...current,
                    logoUrl: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field-stack receipt-logo-size-field">
              <span>Tamaño del logo: {receiptSettings.logoWidth}px</span>
              <input
                type="range"
                min="40"
                max="140"
                step="2"
                value={receiptSettings.logoWidth}
                onChange={(event) =>
                  setReceiptSettings((current) => ({
                    ...current,
                    logoWidth: Number(event.target.value),
                  }))
                }
                aria-label="Tamaño del logo en tickets"
              />
              <small>Se limita automáticamente al ancho del ticket térmico.</small>
            </div>
            <div className="field-stack">
              <span>Nombre de la empresa</span>
              <Input
                value={receiptSettings.companyName}
                onChange={(event) =>
                  setReceiptSettings((current) => ({
                    ...current,
                    companyName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field-stack">
              <span>Sucursal fija de esta computadora</span>
              <Input
                value={`Sucursal ${activeBranch}`}
                readOnly
              />
              <small>Para cambiarla usa las flechas del indicador inferior e ingresa el código master.</small>
            </div>
            <div className="field-stack">
              <span>Dirección de {activeBranch}</span>
              <Input
                value={receiptSettings.address}
                onChange={(event) => {
                  const address = event.target.value;
                  setReceiptSettings((current) => ({
                    ...current,
                    address,
                  }));
                  setBranchAddresses((current) => ({
                    ...current,
                    [activeBranch]: address,
                  }));
                }}
              />
            </div>
            <div className="field-stack receipt-settings-wide">
              <span>Mensaje para la clienta</span>
              <textarea
                value={receiptSettings.footerMessage}
                onChange={(event) =>
                  setReceiptSettings((current) => ({
                    ...current,
                    footerMessage: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field-stack receipt-settings-wide">
              <span>Políticas</span>
              <textarea
                value={receiptSettings.policies}
                onChange={(event) =>
                  setReceiptSettings((current) => ({
                    ...current,
                    policies: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="receipt-visibility-settings">
            {(
              [
                ["showClientName", "Mostrar nombre del cliente"],
                ["showClientPhone", "Mostrar teléfono del cliente"],
                ["showSellerName", "Mostrar nombre del vendedor"],
                ["showVatBreakdown", "Mostrar desglose de IVA"],
                ["showSpareCoverageMessage", "Mostrar mensaje de SPARE en Ventas"],
              ] as const
            ).map(([field, label]) => (
              <button
                key={field}
                type="button"
                className="setting-row"
                role="switch"
                aria-checked={receiptSettings[field]}
                onClick={() =>
                  setReceiptSettings((current) => ({
                    ...current,
                    [field]: !current[field],
                  }))
                }
              >
                <span>
                  <strong>{label}</strong>
                  <small>
                    {field === "showVatBreakdown"
                      ? receiptSettings[field]
                        ? "Muestra precio sin IVA e impuesto incluido"
                        : "Muestra la leyenda de precios con IVA incluido"
                      : field === "showSpareCoverageMessage"
                        ? receiptSettings[field]
                          ? "Muestra la confirmación cuando el ticket cubre la reducción"
                          : "Oculta únicamente la leyenda; conserva la validación"
                      : receiptSettings[field]
                        ? "Visible en el ticket"
                        : "Oculto en el ticket"}
                  </small>
                </span>
                <span
                  className={`mock-switch ${receiptSettings[field] ? "is-on" : ""}`}
                >
                  <i />
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="settings-card payment-settings-card">
        <CardContent>
          <div className="payment-settings-heading">
            <div>
              <span className="section-kicker">
                USUARIO MASTER · {masterUser.name}
              </span>
              <h2>Métodos de pago</h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaymentSettingsOpen((current) => !current)}
            >
              <LockKeyhole size={15} /> Configurar métodos de pago
            </Button>
          </div>
          <div className="configured-payment-methods">
            {paymentMethods.filter((method) => method.active).map((method) => (
              <div className="configured-payment-method" key={method.id}>
                <CheckCircle2 size={14} />
                <span>{method.label}</span>
                <button
                  type="button"
                  onClick={() => removePaymentMethod(method.id)}
                  aria-label={`Borrar método ${method.label}`}
                  title={`Borrar ${method.label}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          {paymentSettingsOpen && !paymentSettingsAuthorized && (
            <div className="master-settings-gate">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={paymentSettingsCode}
                onChange={(event) => setPaymentSettingsCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") authorizePaymentSettings();
                }}
                placeholder="Código master"
                aria-label="Código master para métodos de pago"
              />
              <Button
                type="button"
                onClick={authorizePaymentSettings}
                disabled={paymentSettingsCode.length !== 4}
              >
                <ShieldCheck size={15} /> Desbloquear
              </Button>
              <small>La autorización real se valida en el servidor.</small>
            </div>
          )}
          {paymentSettingsOpen && paymentSettingsAuthorized && (
            <div className="master-payment-editor">
              <div>
                <Input
                  value={newPaymentMethodName}
                  onChange={(event) =>
                    setNewPaymentMethodName(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addPaymentMethod();
                  }}
                  placeholder="Ej. Vale de tienda"
                  aria-label="Nombre del nuevo método de pago"
                />
                <Button
                  type="button"
                  onClick={addPaymentMethod}
                  disabled={!newPaymentMethodName.trim()}
                >
                  <Plus size={15} /> Agregar método
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentSettingsAuthorized(false)}
              >
                <LockKeyhole size={14} /> Bloquear configuración
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="settings-card movement-settings-card">
        <CardContent>
          <div className="movement-settings-heading">
            <div>
              <span className="section-kicker">INVENTARIO</span>
              <h2>Motivos de movimientos</h2>
            </div>
            <PackageCheck size={22} />
          </div>
          <p>
            Configura las opciones disponibles al dar de baja existencias. Los
            motivos inactivos permanecen en el historial.
          </p>
          <div className="movement-reason-list">
            {inventoryMovementReasons.map((reason) => (
              <div className="movement-reason-row" key={reason.id}>
                <button
                  type="button"
                  className="setting-row"
                  role="switch"
                  aria-checked={reason.active}
                  onClick={() =>
                    setInventoryMovementReasons((current) =>
                      current.map((item) =>
                        item.id === reason.id
                          ? { ...item, active: !item.active }
                          : item,
                      ),
                    )
                  }
                >
                  <span>
                    <strong>{reason.name}</strong>
                    <small>
                      {reason.active
                        ? "Disponible en movimientos"
                        : "Opción desactivada"}
                    </small>
                  </span>
                  <span className={`mock-switch ${reason.active ? "is-on" : ""}`}>
                    <i />
                  </span>
                </button>
                <button
                  type="button"
                  className="movement-reason-delete"
                  onClick={() => removeInventoryMovementReason(reason.id)}
                  aria-label={`Borrar motivo ${reason.name}`}
                  title={`Borrar ${reason.name}`}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="movement-reason-editor">
            <Input
              value={newMovementReason}
              onChange={(event) => setNewMovementReason(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addInventoryMovementReason();
              }}
              placeholder="Ej. Muestra de capacitación"
              aria-label="Nuevo motivo de movimiento"
            />
            <Button
              type="button"
              onClick={addInventoryMovementReason}
              disabled={!newMovementReason.trim()}
            >
              <Plus size={15} /> Agregar motivo
            </Button>
          </div>
        </CardContent>
      </Card>
      <VoucherSettings
        templates={voucherTemplates}
        issues={voucherIssues}
        isMasterCode={isMasterAccessCode}
        onChangeTemplates={setVoucherTemplates}
        onChangeIssues={setVoucherIssues}
      />
    </div>
  );

  const renderXReport = () => {
    if (!xReportAuthorized) {
      const authorizeReport = () => {
        if (!isMasterAccessCode(xReportAccessCode)) {
          toast.error("Código administrativo incorrecto.");
          return;
        }
        setXReportAuthorized(true);
        setXReportAccessCode("");
        toast.success("Reporte administrativo desbloqueado.");
      };

      return (
        <Card className="admin-report-gate">
          <CardContent>
            <div className="admin-report-icon">
              <LockKeyhole size={30} />
            </div>
            <span className="section-kicker">X-REPORT MULTISUCURSAL</span>
            <h2>Dashboard diario protegido</h2>
            <p>
              Consulta ventas, ingresos, vendedores, productos y movimientos
              de todas las sucursales. El SPARE entre precio máximo y mínimo continúa
              restringido a permisos administrativos.
            </p>
            <div className="admin-report-code-row">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={xReportAccessCode}
                onChange={(event) => setXReportAccessCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") authorizeReport();
                }}
                placeholder="Código administrativo"
                aria-label="Código para reporte administrativo"
              />
              <Button
                type="button"
                onClick={authorizeReport}
                disabled={xReportAccessCode.length !== 4}
              >
                <ShieldCheck size={16} /> Desbloquear
              </Button>
            </div>
            <small>La autorización real se valida en el servidor.</small>
          </CardContent>
        </Card>
      );
    }

    const businessToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
    }).format(new Date());
    const isToday = (createdAtIso: string) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
      }).format(new Date(createdAtIso)) === businessToday;
    const dailyActiveTickets = activeTickets.filter((ticket) =>
      isToday(ticket.createdAtIso),
    );
    const reportTickets = dailyActiveTickets.filter(
      (ticket) => ticket.ticketType !== "LAYAWAY_PAYMENT",
    );
    const xReportPageCount = Math.max(
      1,
      Math.ceil(reportTickets.length / xReportPageSize),
    );
    const safeXReportPage = Math.min(xReportPage, xReportPageCount);
    const paginatedXReportTickets = reportTickets.slice(
      (safeXReportPage - 1) * xReportPageSize,
      safeXReportPage * xReportPageSize,
    );
    const dailyMovements = inventoryMovements.filter((movement) =>
      isToday(movement.createdAtIso),
    );
    const total = reportTickets.reduce((sum, ticket) => sum + ticket.total, 0);
    const dailyTaxSummary = reportTickets.reduce(
      (summary, ticket) => {
        const tax = getTicketTaxSummary(ticket);
        return {
          net: summary.net + tax.net,
          vat: summary.vat + tax.vat,
        };
      },
      { net: 0, vat: 0 },
    );
    const spare = reportTickets.reduce(
      (sum, ticket) => sum + getTicketSpare(ticket, catalogProducts),
      0,
    );
    const collected = dailyActiveTickets.reduce(
      (sum, ticket) =>
        sum +
        ticket.payments.reduce(
          (paymentTotal, payment) => paymentTotal + payment.amount,
          0,
        ),
      0,
    );
    const pending = reportTickets.reduce(
      (sum, ticket) => sum + ticket.balanceDue,
      0,
    );
    const discounts = reportTickets.reduce(
      (sum, ticket) => sum + ticket.discountAmount,
      0,
    );
    const paidByMethod = (methodId: string) =>
      dailyActiveTickets.reduce(
        (sum, ticket) =>
          sum +
          ticket.payments.reduce(
            (ticketSum, payment) =>
              ticketSum + (payment.methodId === methodId ? payment.amount : 0),
            0,
          ),
        0,
      );
    const reportBranches = Array.from(
      new Set([
        ...Object.keys(branchInventory),
        ...reportTickets
          .map((ticket) => ticket.branchName)
          .filter((branch): branch is string => Boolean(branch)),
        ...dailyMovements.flatMap((movement) => [
          movement.sourceBranch,
          ...(movement.destinationBranch ? [movement.destinationBranch] : []),
        ]),
      ]),
    ).sort((left, right) => left.localeCompare(right, "es-MX"));
    const dailySoldProducts = Array.from(
      reportTickets
        .flatMap((ticket) => ticket.products)
        .reduce<
          Map<
            string,
            { id: string; name: string; quantity: number; total: number }
          >
        >((summary, product) => {
          const current = summary.get(product.productId);
          summary.set(product.productId, {
            id: product.productId,
            name: product.name,
            quantity: (current?.quantity ?? 0) + product.quantity,
            total: (current?.total ?? 0) + product.total,
          });
          return summary;
        }, new Map())
        .values(),
    ).sort((left, right) => right.quantity - left.quantity);
    const soldUnits = dailySoldProducts.reduce(
      (sum, product) => sum + product.quantity,
      0,
    );
    const dailySellerTotals = Array.from(
      reportTickets
        .flatMap((ticket) => ticket.sellerSales)
        .reduce<Map<string, { id: string; name: string; total: number }>>(
          (summary, sale) => {
            const current = summary.get(sale.sellerId);
            summary.set(sale.sellerId, {
              id: sale.sellerId,
              name: sale.sellerName,
              total: (current?.total ?? 0) + sale.amount,
            });
            return summary;
          },
          new Map(),
        )
        .values(),
    )
      .map((seller) => ({
        ...seller,
        tickets: reportTickets.filter((ticket) =>
          ticket.sellerSales.some((sale) => sale.sellerId === seller.id),
        ).length,
      }))
      .sort((left, right) => right.total - left.total);
    const dailyWriteOffs = dailyMovements.filter(
      (movement) =>
        movement.direction === "REMOVE" &&
        movement.category !== "SALE" &&
        movement.category !== "DELIVERY",
    );
    const writeOffUnits = dailyWriteOffs.reduce(
      (sum, movement) => sum + movement.quantity,
      0,
    );
    const dailyAdditions = dailyMovements
      .filter((movement) => movement.direction === "ADD")
      .reduce((sum, movement) => sum + movement.quantity, 0);
    const dailyTransfers = dailyMovements
      .filter((movement) => movement.direction === "TRANSFER")
      .reduce((sum, movement) => sum + movement.quantity, 0);
    const branchDashboard = reportBranches.map((branch) => {
      const branchSaleTickets = reportTickets.filter(
        (ticket) =>
          (ticket.branchName ?? activeBranch) === branch,
      );
      const branchPaymentTickets = dailyActiveTickets.filter(
        (ticket) =>
          (ticket.branchName ?? activeBranch) === branch,
      );
      const branchWriteOffs = dailyWriteOffs.filter(
        (movement) => movement.sourceBranch === branch,
      );
      const sellerIds = new Set(
        branchSaleTickets.flatMap((ticket) =>
          ticket.sellerSales.map((sale) => sale.sellerId),
        ),
      );
      return {
        branch,
        tickets: branchSaleTickets.length,
        sales: branchSaleTickets.reduce(
          (sum, ticket) => sum + ticket.total,
          0,
        ),
        netSales: branchSaleTickets.reduce(
          (sum, ticket) => sum + getTicketTaxSummary(ticket).net,
          0,
        ),
        vat: branchSaleTickets.reduce(
          (sum, ticket) => sum + getTicketTaxSummary(ticket).vat,
          0,
        ),
        collected: branchPaymentTickets.reduce(
          (sum, ticket) =>
            sum +
            ticket.payments.reduce(
              (paymentSum, payment) => paymentSum + payment.amount,
              0,
            ),
          0,
        ),
        soldUnits: branchSaleTickets.reduce(
          (sum, ticket) =>
            sum +
            ticket.products.reduce(
              (productSum, product) => productSum + product.quantity,
              0,
            ),
          0,
        ),
        writeOffUnits: branchWriteOffs.reduce(
          (sum, movement) => sum + movement.quantity,
          0,
        ),
        sellers: sellerIds.size,
        stock: Object.values(branchInventory[branch] ?? {}).reduce(
          (sum, quantity) => sum + quantity,
          0,
        ),
      };
    });
    const maxSellerTotal = Math.max(
      1,
      ...dailySellerTotals.map((seller) => seller.total),
    );
    const maxProductQuantity = Math.max(
      1,
      ...dailySoldProducts.map((product) => product.quantity),
    );
    const reportDayLabel = new Intl.DateTimeFormat("es-MX", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Mexico_City",
    }).format(new Date());
    const reportUpdatedAt = new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Mexico_City",
    }).format(new Date(sessionDataSync.lastUpdatedAt));
    return (
      <div className="view-stack">
        <div className="x-report-live-banner" aria-live="polite">
          <span className="status-dot" />
          <div className="x-report-live-copy">
            <strong>Dashboard en tiempo real · {reportDayLabel}</strong>
            {posApiEnabled && apiOperationalSummary && (
              <small>
                Datos confirmados por API · cobro {formatCurrency(Number(apiOperationalSummary.collectedTotal))} · gastos {formatCurrency(Number(apiOperationalSummary.expenseTotal))}
              </small>
            )}
            <small>
              Todas las sucursales activas · Actualizado {reportUpdatedAt}
            </small>
          </div>
          <Badge variant="outline">{reportBranches.length} SUCURSALES</Badge>
        </div>

        <XReportExecutiveExport
          tickets={tickets}
          products={catalogProducts}
          movements={inventoryMovements}
          paymentMethods={paymentMethods}
          branches={operationalBranches}
          receiptSettings={receiptSettings}
          loadAuthorizedRows={posApiEnabled ? async ({ dateFrom, dateTo, branch }) => {
            const branchIds = branch
              ? apiBranches.filter((candidate) => candidate.name === branch).map((candidate) => candidate.id)
              : apiBranches.map((candidate) => candidate.id);
            const load = async (key: "SALES_DETAIL" | "MERCHANDISE_MOVEMENTS") => {
              const rows: Array<Record<string, string | number>> = [];
              let page = 1;
              let total = 0;
              do {
                const dataset = await posApi.exportDataset(key, { dateFrom, dateTo, branchIds, page, pageSize: 500 });
                total = dataset.total;
                rows.push(...dataset.rows.map((row) => Object.fromEntries(Object.entries(row).map(([column, value]) => [
                  column,
                  value === null ? "" : typeof value === "boolean" ? String(value) : value,
                ]))));
                if (dataset.rows.length === 0) break;
                page += 1;
              } while (rows.length < total);
              return rows;
            };
            const [ticketRows, movementRows] = await Promise.all([
              load("SALES_DETAIL"),
              load("MERCHANDISE_MOVEMENTS"),
            ]);
            return { tickets: ticketRows, movements: movementRows };
          } : undefined}
        />

        <div className="metric-grid x-report-metric-grid">
          <MetricCard
            label="VENTA DEL DÍA"
            value={formatCurrency(total)}
            icon={ShoppingBag}
            tone="neutral"
          />
          <MetricCard
            label="VENTA SIN IVA"
            value={formatCurrency(dailyTaxSummary.net)}
            icon={DollarSign}
            tone="neutral"
          />
          <MetricCard
            label="IVA INCLUIDO"
            value={formatCurrency(dailyTaxSummary.vat)}
            icon={Percent}
            tone="neutral"
          />
          <MetricCard
            label="INGRESOS COBRADOS"
            value={formatCurrency(collected)}
            icon={CircleDollarSign}
            tone="positive"
          />
          <MetricCard
            label="SUCURSALES EN ALTA"
            value={String(reportBranches.length)}
            icon={Store}
            tone="neutral"
          />
          <MetricCard
            label="VENDEDORES CON VENTA"
            value={String(dailySellerTotals.length)}
            icon={Users}
            tone="neutral"
          />
          <MetricCard
            label="PRODUCTOS / SERVICIOS"
            value={String(soldUnits)}
            icon={Boxes}
            tone="neutral"
          />
          <MetricCard
            label="BAJAS DE INVENTARIO"
            value={String(writeOffUnits)}
            icon={PackageMinus}
            tone={writeOffUnits > 0 ? "negative" : "positive"}
          />
          <MetricCard
            label="SPARE DEL DÍA"
            value={formatCurrency(spare)}
            icon={BadgePercent}
            tone="positive"
          />
        </div>

        <Card className="data-card x-report-branch-card">
          <CardContent className="p-0">
            <div className="data-card-heading">
              <div>
                <span>RESUMEN MULTISUCURSAL</span>
                <h2>Operación de todas las tiendas</h2>
              </div>
              <Badge variant="outline">EN VIVO</Badge>
            </div>
            <div className="x-report-branch-grid">
              {branchDashboard.map((branch) => (
                <article key={branch.branch}>
                  <div>
                    <span className="x-report-store-icon">
                      <Store size={17} />
                    </span>
                    <span>
                      <strong>{branch.branch}</strong>
                      <small>{branch.stock} piezas en existencia</small>
                    </span>
                    <Badge variant="outline">ACTIVA</Badge>
                  </div>
                  <dl>
                    <div>
                      <dt>Venta</dt>
                      <dd>{formatCurrency(branch.sales)}</dd>
                    </div>
                    <div>
                      <dt>Ingresos</dt>
                      <dd>{formatCurrency(branch.collected)}</dd>
                    </div>
                    <div>
                      <dt>Venta sin IVA</dt>
                      <dd>{formatCurrency(branch.netSales)}</dd>
                    </div>
                    <div>
                      <dt>IVA incluido</dt>
                      <dd>{formatCurrency(branch.vat)}</dd>
                    </div>
                    <div>
                      <dt>Tickets</dt>
                      <dd>{branch.tickets}</dd>
                    </div>
                    <div>
                      <dt>Unidades</dt>
                      <dd>{branch.soldUnits}</dd>
                    </div>
                    <div>
                      <dt>Vendedores</dt>
                      <dd>{branch.sellers}</dd>
                    </div>
                    <div>
                      <dt>Bajas</dt>
                      <dd
                        className={
                          branch.writeOffUnits > 0 ? "is-negative" : ""
                        }
                      >
                        {branch.writeOffUnits}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="x-report-detail-grid">
          <Card className="x-report-dashboard-card">
            <CardContent>
              <div className="dashboard-card-heading">
                <div>
                  <span>EQUIPO DEL DÍA</span>
                  <h2>Vendedores con venta</h2>
                </div>
                <Users size={18} />
              </div>
              <div className="x-report-ranking-list">
                {dailySellerTotals.map((seller, index) => (
                  <div key={seller.id}>
                    <span className="x-report-rank">{index + 1}</span>
                    <span>
                      <strong>{seller.name}</strong>
                      <small>{seller.tickets} tickets</small>
                    </span>
                    <strong>{formatCurrency(seller.total)}</strong>
                    <i>
                      <b
                        style={{
                          width: `${Math.max(5, (seller.total / maxSellerTotal) * 100)}%`,
                        }}
                      />
                    </i>
                  </div>
                ))}
                {dailySellerTotals.length === 0 && (
                  <p className="x-report-empty">Sin vendedores con venta hoy.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="x-report-dashboard-card">
            <CardContent>
              <div className="dashboard-card-heading">
                <div>
                  <span>PRODUCTOS Y SERVICIOS</span>
                  <h2>Vendidos durante el día</h2>
                </div>
                <Boxes size={18} />
              </div>
              <div className="x-report-product-list">
                {dailySoldProducts.map((product) => (
                  <div key={product.id}>
                    <span>
                      <strong>{product.name}</strong>
                      <small>{formatCurrency(product.total)}</small>
                    </span>
                    <strong>{product.quantity} u.</strong>
                    <i>
                      <b
                        style={{
                          width: `${Math.max(5, (product.quantity / maxProductQuantity) * 100)}%`,
                        }}
                      />
                    </i>
                  </div>
                ))}
                {dailySoldProducts.length === 0 && (
                  <p className="x-report-empty">Sin productos vendidos hoy.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="x-report-dashboard-card">
            <CardContent>
              <div className="dashboard-card-heading">
                <div>
                  <span>FLUJO DE INVENTARIO</span>
                  <h2>Movimientos del día</h2>
                </div>
                <PackageCheck size={18} />
              </div>
              <div className="x-report-inventory-flow">
                <div>
                  <span>Entradas</span>
                  <strong className="is-positive">+{dailyAdditions}</strong>
                </div>
                <div>
                  <span>Bajas</span>
                  <strong className={writeOffUnits > 0 ? "is-negative" : ""}>
                    -{writeOffUnits}
                  </strong>
                </div>
                <div>
                  <span>Transferidas</span>
                  <strong>{dailyTransfers}</strong>
                </div>
              </div>
              <div className="x-report-writeoff-list">
                {dailyWriteOffs.map((movement) => (
                  <div key={movement.id}>
                    <span>
                      <strong>{movement.productName}</strong>
                      <small>
                        {movement.sourceBranch} · {movement.reason}
                      </small>
                    </span>
                    <strong className="is-negative">
                      -{movement.quantity}
                    </strong>
                  </div>
                ))}
                {dailyWriteOffs.length === 0 && (
                  <p className="x-report-empty">Sin bajas registradas hoy.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="report-card">
          <CardContent>
            <div className="report-card-header">
              <div>
                {receiptSettings.logoUrl && (
                  <img
                    className="report-logo"
                    src={receiptSettings.logoUrl}
                    alt={receiptSettings.companyName}
                    style={{ width: `${Math.min(receiptSettings.logoWidth, 72)}px` }}
                  />
                )}
                <span>TERMINAL 01</span>
                <h2>Corte parcial</h2>
              </div>
              <div className="report-admin-actions">
                <Badge variant="outline">ADMIN</Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setXReportAuthorized(false)}
                >
                  <LockKeyhole size={14} /> Bloquear
                </Button>
              </div>
            </div>
            <div className="report-lines">
              {paymentMethods.map((method) => (
                <div key={method.id}>
                  <span>{method.label}</span>
                  <strong>{formatCurrency(paidByMethod(method.id))}</strong>
                </div>
              ))}
              <div>
                <span>Saldo pendiente</span>
                <strong className={pending > 0 ? "is-negative" : ""}>
                  {formatCurrency(pending)}
                </strong>
              </div>
              <div>
                <span>Descuentos promocionales</span>
                <strong>{formatCurrency(discounts)}</strong>
              </div>
              <div className="report-total">
                <span>Total cobrado</span>
                <strong>{formatCurrency(collected)}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="data-card admin-margin-table">
          <CardContent className="p-0">
            <div className="data-card-heading">
              <div>
                <span>CONTROL ADMINISTRATIVO</span>
                <h2>SPARE por ticket</h2>
              </div>
              <ShieldCheck size={21} />
            </div>
            <div className="table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TICKET</TableHead>
                    <TableHead>CLIENTE</TableHead>
                    <TableHead>VENTA FINAL</TableHead>
                    <TableHead>DESCUENTO</TableHead>
                    <TableHead>SPARE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedXReportTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <strong>{ticket.id}</strong>
                      </TableCell>
                      <TableCell>{ticket.clientName}</TableCell>
                      <TableCell>{formatCurrency(ticket.total)}</TableCell>
                      <TableCell>
                        {ticket.discountAmount > 0
                          ? `-${formatCurrency(ticket.discountAmount)}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className="deviation-pill is-positive"
                        >
                          {formatCurrency(getTicketSpare(ticket, catalogProducts))}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <HistoryPagination
              total={reportTickets.length}
              page={safeXReportPage}
              pageSize={xReportPageSize}
              pageCount={xReportPageCount}
              onPageChange={setXReportPage}
              onPageSizeChange={(size) => {
                setXReportPageSize(size);
                setXReportPage(1);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCloseDay = () => {
    const saleTickets = activeTickets.filter(
      (ticket) => ticket.ticketType !== "LAYAWAY_PAYMENT",
    );
    const total = saleTickets.reduce((sum, ticket) => sum + ticket.total, 0);
    const closeDayDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const closeDayDisplayDate = new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
      .format(new Date())
      .toLocaleUpperCase("es-MX");
    const closeDayReceiptDate = closeDayDate.split("-").reverse().join("/");
    const closingInventoryAudit = daySession?.closingAuditId
      ? inventoryCountAudits.find(
          (audit) => audit.id === daySession.closingAuditId,
        ) ?? null
      : null;
    const closingInventoryErrors =
      closingInventoryAudit?.lines.filter((line) => line.difference !== 0) ?? [];
    const canViewInventoryDifferences = Boolean(
      sessionUser?.isMaster ||
      employeeRoles
        .find((role) => role.id === sessionUser?.roleId && role.active)
        ?.configurationAccess.includes("INVENTORY_AUDIT"),
    );
    const dailyExpenses = cashExpenses.filter(
      (expense) =>
        expense.status === "ACTIVE" &&
        expense.expenseDate === closeDayDate &&
        expense.branch === activeBranch,
    );
    const dailyExpenseTotal = dailyExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );
    const closeDayNetTotal = total - dailyExpenseTotal;
    const expensesBySeller = Array.from(
      dailyExpenses
        .reduce<
          Map<string, { name: string; total: number; expenses: CashExpense[] }>
        >((summary, expense) => {
          const current = summary.get(expense.sellerId);
          summary.set(expense.sellerId, {
            name: expense.sellerName,
            total: (current?.total ?? 0) + expense.amount,
            expenses: [...(current?.expenses ?? []), expense],
          });
          return summary;
        }, new Map())
        .values(),
    );
    const closeDayTaxSummary = saleTickets.reduce(
      (summary, ticket) => {
        const tax = getTicketTaxSummary(ticket);
        return { net: summary.net + tax.net, vat: summary.vat + tax.vat };
      },
      { net: 0, vat: 0 },
    );
    const collected = activeTickets.reduce(
      (sum, ticket) =>
        sum +
        ticket.payments.reduce(
          (paymentTotal, payment) => paymentTotal + payment.amount,
          0,
        ),
      0,
    );
    const pending = saleTickets.reduce(
      (sum, ticket) => sum + ticket.balanceDue,
      0,
    );
    const discounts = saleTickets.reduce(
      (sum, ticket) => sum + ticket.discountAmount,
      0,
    );
    const soldProducts = Array.from(
      saleTickets
        .flatMap((ticket) => ticket.products)
        .reduce<Map<string, { name: string; quantity: number; total: number }>>(
          (summary, product) => {
            const current = summary.get(product.productId);
            summary.set(product.productId, {
              name: product.name,
              quantity: (current?.quantity ?? 0) + product.quantity,
              total: (current?.total ?? 0) + product.total,
            });
            return summary;
          },
          new Map(),
        )
        .values(),
    );
    const sellerTotals = Array.from(
      saleTickets
        .flatMap((ticket) => ticket.sellerSales)
        .reduce<Map<string, { name: string; total: number }>>(
          (summary, sale) => {
            const current = summary.get(sale.sellerId);
            summary.set(sale.sellerId, {
              name: sale.sellerName,
              total: (current?.total ?? 0) + sale.amount,
            });
            return summary;
          },
          new Map(),
        )
        .values(),
    );
    const paymentTotals = paymentMethods.map((method) => ({
      ...method,
      total: activeTickets.reduce(
        (ticketSum, ticket) =>
          ticketSum +
          ticket.payments.reduce(
            (paymentSum, payment) =>
              paymentSum +
              (payment.methodId === method.id ? payment.amount : 0),
            0,
          ),
        0,
      ),
    }));
    const inventoryAdditions = inventoryMovements.filter(
      (movement) => movement.direction === "ADD",
    );
    const inventoryRemovals = inventoryMovements.filter(
      (movement) => movement.direction === "REMOVE",
    );
    const inventoryTransfers = inventoryMovements.filter(
      (movement) => movement.direction === "TRANSFER",
    );
    const pendingFacialAppointments = appointments.filter(
      (appointment) =>
        appointment.kind === "NO_APPOINTMENT" &&
        appointment.status === "PENDING",
    );
    const appointmentAlertsBySeller = sellers
      .filter((seller) => seller.active)
      .map((seller) => ({
        seller,
        clients: Array.from(
          new Set(
            pendingFacialAppointments
              .filter((appointment) =>
                appointment.sellerIds.includes(seller.id),
              )
              .map((appointment) => appointment.clientName),
          ),
        ),
      }))
      .filter((alert) => alert.clients.length > 0);
    return (
      <div className="close-day-grid">
        <Card className="close-day-card">
          <CardContent>
            <span className="section-kicker">{closeDayDisplayDate}</span>
            <h2>Terminal lista para cierre</h2>
            <div className="closing-checks">
              <span>
                <CheckCircle2 size={18} /> {activeTickets.length} tickets conciliados
              </span>
              <span>
                <CheckCircle2 size={18} /> Caja contada
              </span>
              <span>
                <CheckCircle2 size={18} /> Datos mock sincronizados
              </span>
              <span>
                <CheckCircle2 size={18} /> {inventoryMovements.length} ajustes
                de inventario registrados
              </span>
              <span>
                <CheckCircle2 size={18} /> {dailyExpenses.length} gastos de caja
                conciliados
              </span>
              <span className={canViewInventoryDifferences && closingInventoryErrors.length > 0 ? "is-audit-error" : ""}>
                {canViewInventoryDifferences && closingInventoryErrors.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                {canViewInventoryDifferences
                  ? `Auditoría final · ${closingInventoryErrors.length} diferencias`
                  : "Auditoría final completada · detalle protegido"}
              </span>
              <span>
                <CheckCircle2 size={18} />{" "}
                {
                  attendanceRecords.filter(
                    (record) => record.status === "ONLINE",
                  ).length
                }{" "}
                vendedores ONLINE por cerrar
              </span>
            </div>
            {appointmentAlertsBySeller.length > 0 && (
              <div className="close-day-appointment-alerts">
                <strong>Alertas de cita antes de cerrar</strong>
                {appointmentAlertsBySeller.map(({ seller, clients }) => (
                  <span key={seller.id}>
                    <AlertTriangle size={16} />
                    <b>{seller.name}:</b> {clients.join(", ")} sin facial
                    agendado
                  </span>
                ))}
              </div>
            )}
            {dailyExpenses.length > 0 ? (
              <div className="closing-expense-summary">
                <div>
                  <span>SUBTOTAL DE VENTA</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
                <div className="is-expense">
                  <span>GASTOS REGISTRADOS</span>
                  <strong>-{formatCurrency(dailyExpenseTotal)}</strong>
                </div>
                {expensesBySeller.map((seller) => (
                  <small key={seller.name}>
                    {seller.name} · {seller.expenses.length} movimientos · -
                    {formatCurrency(seller.total)}
                  </small>
                ))}
                <div className="closing-total">
                  <span>TOTAL DESPUÉS DE GASTOS</span>
                  <strong>{formatCurrency(closeDayNetTotal)}</strong>
                </div>
              </div>
            ) : (
              <div className="closing-total">
                <span>TOTAL DEL DÍA</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            )}
            <div className="close-day-actions">
              {canPrintActiveModule && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                >
                  <Printer size={17} /> Imprimir ticket de cierre
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  setCloseDayAuthorizationError("");
                  setCloseDayAuthorizationUser("");
                  setCloseDayAuthorizationCode("");
                  setCloseDayAuthorizationOpen(true);
                }}
                disabled={!closingInventoryAudit}
              >
                Cerrar día <ArrowRight size={17} />
              </Button>
            </div>
          </CardContent>
        </Card>
        <article
          className="close-day-receipt"
          aria-label="Ticket de cierre de día"
        >
          <header>
            {receiptSettings.logoUrl && (
              <img
                src={receiptSettings.logoUrl}
                alt={receiptSettings.companyName}
                style={{ width: `${receiptSettings.logoWidth}px` }}
              />
            )}
            <strong>{receiptSettings.companyName}</strong>
            <span>{receiptSettings.branchName.toLocaleUpperCase("es-MX")} · TERMINAL 01</span>
            <span>{receiptSettings.address}</span>
            <span>CIERRE DE DÍA · {closeDayReceiptDate}</span>
            <span>OPERADOR DEL CORTE: PENDIENTE DE AUTORIZACIÓN</span>
          </header>

          <section>
            <h3>PRODUCTOS VENDIDOS</h3>
            {soldProducts.map((product) => (
              <div className="receipt-detail-line" key={product.name}>
                <span>
                  {product.quantity} × {product.name}
                </span>
                <strong>{formatCurrency(product.total)}</strong>
              </div>
            ))}
          </section>

          <section>
            <h3>ENTRADAS DE INVENTARIO</h3>
            {inventoryAdditions.map((movement) => (
              <div className="receipt-detail-line" key={movement.id}>
                <span>{movement.productName}</span>
                <strong>+{movement.quantity} PZ</strong>
              </div>
            ))}
            {inventoryAdditions.length === 0 && (
              <div className="receipt-detail-line">
                <span>Sin entradas registradas</span>
                <strong>0 PZ</strong>
              </div>
            )}
          </section>

          <section>
            <h3>BAJAS DE INVENTARIO</h3>
            {inventoryRemovals.map((movement) => (
              <div className="receipt-detail-line" key={movement.id}>
                <span>
                  {movement.productName} · {movement.reason}
                </span>
                <strong>-{movement.quantity} PZ</strong>
              </div>
            ))}
            {inventoryRemovals.length === 0 && (
              <div className="receipt-detail-line">
                <span>Sin bajas registradas</span>
                <strong>0 PZ</strong>
              </div>
            )}
          </section>

          <section>
            <h3>TRANSFERENCIAS ENTRE SUCURSALES</h3>
            {inventoryTransfers.map((movement) => (
              <div className="receipt-detail-line" key={movement.id}>
                <span>
                  {movement.productName} · {movement.sourceBranch} →{" "}
                  {movement.destinationBranch}
                </span>
                <strong>{movement.quantity} PZ</strong>
              </div>
            ))}
            {inventoryTransfers.length === 0 && (
              <div className="receipt-detail-line">
                <span>Sin transferencias registradas</span>
                <strong>0 PZ</strong>
              </div>
            )}
          </section>

          <section>
            <h3>ALERTAS DE FACIAL POR VENDEDOR</h3>
            {appointmentAlertsBySeller.map(({ seller, clients }) => (
              <div className="receipt-detail-line" key={seller.id}>
                <span>
                  {seller.name} · {clients.join(", ")}
                </span>
                <strong>{clients.length} PEND.</strong>
              </div>
            ))}
            {appointmentAlertsBySeller.length === 0 && (
              <div className="receipt-detail-line">
                <span>Sin clientas pendientes de agendar</span>
                <strong>OK</strong>
              </div>
            )}
          </section>

          <section>
            <h3>VENTA POR VENDEDOR</h3>
            {sellerTotals.map((seller) => (
              <div className="receipt-detail-line" key={seller.name}>
                <span>{seller.name}</span>
                <strong>{formatCurrency(seller.total)}</strong>
              </div>
            ))}
          </section>

          <section>
            <h3>CORTE POR MÉTODO DE PAGO</h3>
            {paymentTotals.map((method) => (
              <div className="receipt-detail-line" key={method.id}>
                <span>{method.label}</span>
                <strong>{formatCurrency(method.total)}</strong>
              </div>
            ))}
          </section>

          {dailyExpenses.length > 0 && (
            <section>
              <h3>GASTOS POR VENDEDOR</h3>
              {expensesBySeller.flatMap((seller) => [
                <div className="receipt-detail-line receipt-expense-seller" key={`${seller.name}-total`}>
                  <span>{seller.name}</span>
                  <strong>-{formatCurrency(seller.total)}</strong>
                </div>,
                ...seller.expenses.map((expense) => (
                  <div className="receipt-detail-line receipt-expense-detail" key={expense.id}>
                    <span>
                      {expense.folio} · {expense.typeName} · {expense.concept}
                      {expense.comment ? ` · ${expense.comment}` : ""}
                    </span>
                    <strong>-{formatCurrency(expense.amount)}</strong>
                  </div>
                )),
              ])}
            </section>
          )}

          <section className="receipt-totals">
            <div>
              <span>{dailyExpenses.length > 0 ? "Subtotal de venta" : "Venta final"}</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <div>
              <span>Venta sin IVA</span>
              <strong>{formatCurrency(closeDayTaxSummary.net)}</strong>
            </div>
            <div>
              <span>IVA incluido</span>
              <strong>{formatCurrency(closeDayTaxSummary.vat)}</strong>
            </div>
            <div>
              <span>Descuentos</span>
              <strong>-{formatCurrency(discounts)}</strong>
            </div>
            <div>
              <span>Total cobrado</span>
              <strong>{formatCurrency(collected)}</strong>
            </div>
            <div>
              <span>Saldo pendiente</span>
              <strong>{formatCurrency(pending)}</strong>
            </div>
            {dailyExpenses.length > 0 && (
              <>
                <div className="receipt-expense-total">
                  <span>Gastos de caja</span>
                  <strong>-{formatCurrency(dailyExpenseTotal)}</strong>
                </div>
                <div className="receipt-cash-net-total">
                  <span>TOTAL DESPUÉS DE GASTOS</span>
                  <strong>{formatCurrency(closeDayNetTotal)}</strong>
                </div>
              </>
            )}
            <div className="receipt-grand-total">
              <span>TICKETS</span>
              <strong>{activeTickets.length}</strong>
            </div>
          </section>
          {canViewInventoryDifferences && closingInventoryErrors.length > 0 && (
            <section className="receipt-inventory-audit">
              <h3>AUDITORÍA DE INVENTARIO</h3>
              {closingInventoryErrors.map((line) => (
                <div className="receipt-detail-line" key={line.productId}>
                  <span>{line.productName} · Sistema {line.expectedStock} / Real {line.actualStock}</span>
                  <strong>{line.difference > 0 ? "+" : ""}{line.difference} PZ</strong>
                </div>
              ))}
            </section>
          )}
          <footer>*** CIERRE MOCK · SIN MOVIMIENTOS REALES ***</footer>
        </article>
        <div className="closing-note">
          <Clock3 size={22} />
          <div>
            <strong>Este cierre es una simulación</strong>
            <p>No modifica caja, inventario, backend ni base de datos.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderGenericModule = () => {
    const copy: Partial<
      Record<ScreenId, { label: string; description: string }>
    > = {
      "cash-manager": {
        label: "Caja en operación",
        description:
          "Entradas, retiros y arqueos quedarán disponibles cuando se conecte la capa de persistencia.",
      },
      competition: {
        label: "Meta retail",
        description:
          "Comparativa mock de vendedores, tickets y cumplimiento de metas comerciales.",
      },
      websites: {
        label: "Accesos internos",
        description:
          "Espacio reservado para accesos seguros a catálogos, capacitación y operación.",
      },
      "data-update": {
        label: "Modo offline",
        description:
          "La interfaz está preparada para mostrar el estado de sincronización del Electron POS.",
      },
    };
    const item = copy[activeScreen] ?? {
      label: "Módulo mock",
      description: "Vista de demostración sin conexión a servicios.",
    };
    return (
      <div className="generic-module">
        <div className="generic-icon">
          {activeScreen === "data-update" ? (
            <WifiOff size={34} />
          ) : (
            <Sparkles size={34} />
          )}
        </div>
        <span className="section-kicker">FRONTEND MOCK</span>
        <h2>{item.label}</h2>
        <p>{item.description}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => toast.info("Acción simulada: no se enviaron datos.")}
        >
          Probar acción mock
        </Button>
      </div>
    );
  };

  const renderWarehouseScreen = (scope: WarehouseScope) => (
    <WarehouseView
      scope={scope}
      products={catalogProducts}
      tickets={tickets}
      branches={
        sessionUser?.isMaster || canManageWarehouse
          ? operationalBranches
          : [activeBranch]
      }
      stock={warehouseStock}
      movements={warehouseMovements}
      categories={warehouseCategories}
      supplies={warehouseSupplies}
      suppliers={warehouseSuppliers}
      priceLists={warehousePriceLists}
      clients={clients}
      canManage={canManageWarehouse}
      canViewCosts={canViewProductCosts}
      canRequest={canCreateWarehouseRequest}
      currentUserName={sessionUser?.name ?? masterUser.name}
      {...(scope === "BRANCHES"
        ? { initialRequestType: branchRequestEntryType }
        : {})}
      onCreateEntry={createWarehouseEntry}
      onCreateMovement={createWarehouseMovement}
      onEditMovement={editWarehouseMovement}
      onApproveCreation={approveWarehouseCreation}
      onApproveSend={approveWarehouseSend}
      onReceive={receiveWarehouseMovement}
      onCancel={cancelWarehouseMovement}
      onDelete={deleteWarehouseMovement}
      onToggleSupplyVisibility={toggleWarehouseSupplyVisibility}
      onSaveSupply={saveWarehouseSupply}
      onDeleteSupply={deleteWarehouseSupply}
      onCreateRestockOrder={createWarehouseRestockOrder}
      onSavePriceList={saveWarehousePriceList}
      onTogglePriceList={toggleWarehousePriceList}
      onDeletePriceList={deleteWarehousePriceList}
    />
  );

  const renderScreen = () => {
    switch (activeScreen) {
      case "dashboard": {
        const dashboardRole = employeeRoles.find(
          (role) => role.id === sessionUser?.roleId && role.active,
        );
        const canViewInventoryAudit = Boolean(
          sessionUser?.isMaster ||
          dashboardRole?.configurationAccess.includes("INVENTORY_AUDIT"),
        );
        const canViewDashboardCosts = Boolean(
          sessionUser?.isMaster || costAccessAuthorized,
        );
        const openingAudit = daySession
          ? inventoryCountAudits.find(
              (audit) => audit.id === daySession.openingAuditId,
            )
          : null;
        const closingAudit =
          daySession?.closingAuditId
            ? inventoryCountAudits.find(
                (audit) => audit.id === daySession.closingAuditId,
              ) ?? null
            : null;
        return daySession && openingAudit ? (
          <MasterDashboard
            session={daySession}
            openingAudit={openingAudit}
            closingAudit={closingAudit}
            products={catalogProducts}
            branchInventory={branchInventory}
            movements={inventoryMovements}
            tickets={tickets}
            expenses={cashExpenses}
            appointments={appointments}
            paymentMethods={paymentMethods}
            availableBranches={operationalBranches}
            canViewAllBranches={Boolean(sessionUser?.isMaster)}
            showInventoryDifferences={canViewInventoryAudit}
            showCosts={canViewDashboardCosts}
          />
        ) : (
          renderGenericModule()
        );
      }
      case "sale":
        return renderSale();
      case "seller-sales":
        return (
          <SellerSalesView
            sellers={sellers}
            tickets={activeTickets}
            clients={clients}
            paymentMethods={paymentMethods}
            layaways={layaways}
            appointments={appointments}
            owedProducts={owedProducts}
            onPreviewTicket={previewTicket}
            onRegisterLayawayPayment={registerLayawayPayment}
          />
        );
      case "receipts":
        return renderReceipts();
      case "customers":
        return (
          <CustomersView
            clients={clients}
            sellers={sellers}
            tickets={activeTickets}
            voucherIssues={voucherIssues}
            appointments={appointments}
            owedProducts={owedProducts}
            layaways={layaways}
            paymentMethods={paymentMethods}
            branches={operationalBranches}
            receiptSettings={receiptSettings}
            sessionSellerId={sessionUser?.isMaster ? null : sessionUser?.id ?? null}
            sessionIsMaster={sessionUser?.isMaster ?? false}
            isMasterCode={isMasterAccessCode}
            onUpdateClient={updateClientRecord}
            onDeleteClient={deleteClientRecord}
            onBulkImportClients={importClientRecords}
            onRegisterLayawayPayment={registerLayawayPayment}
          />
        );
      case "appointments":
        return (
          <AppointmentsView appointments={appointments} sellers={sellers} />
        );
      case "inventory":
        return (
          <CatalogView
            products={catalogProducts}
            branchInventory={branchInventory}
            families={catalogFamilies.filter(
              (family) => catalogFamilyStatus[family] !== false,
            )}
            categories={catalogCategories.filter(
              (category) => catalogCategoryStatus[category] !== false,
            )}
            groups={catalogGroups}
            onSave={saveCatalogProduct}
            onStatusChange={setCatalogProductStatus}
            onAddFamily={(name) => {
              addCatalogOption(setCatalogFamilies, name);
              setCatalogFamilyStatus((current) => ({
                ...current,
                [name]: true,
              }));
            }}
            onAddCategory={(name) => {
              addCatalogOption(setCatalogCategories, name);
              setCatalogCategoryStatus((current) => ({
                ...current,
                [name]: true,
              }));
            }}
            onAddGroup={(name) => addCatalogOption(setCatalogGroups, name)}
            costAccessAuthorized={costAccessAuthorized}
            onAuthorizeCostAccess={authorizeCostAccess}
            isMasterCode={isMasterAccessCode}
            onCreateInventoryOrders={createInventoryBranchOrders}
            onLockCostAccess={() => setCostAccessAuthorized(false)}
            onOpenBranchRequest={(requestType) => {
              setBranchRequestEntryType(requestType);
              navigateToScreen("branch-inventory");
            }}
          />
        );
      case "catalog":
        return renderInventory();
      case "warehouse":
        return renderWarehouseScreen("MATRIX");
      case "branch-inventory":
        return renderWarehouseScreen("BRANCHES");
      case "suppliers":
        return (
          <SuppliersView
            suppliers={warehouseSuppliers}
            products={catalogProducts}
            supplies={warehouseSupplies}
            canManage={canManageWarehouse}
            canViewCosts={canViewProductCosts}
            onSaveSupplier={saveWarehouseSupplier}
            onToggleSupplier={toggleWarehouseSupplier}
            onDeleteSupplier={deleteWarehouseSupplier}
            onSaveItem={saveWarehouseSupply}
            onDeleteItem={deleteWarehouseSupply}
          />
        );
      case "inventory-movements":
        return (
          <InventoryMovementsView
            products={catalogProducts.map((product) => ({
              ...product,
              active:
                product.active &&
                catalogFamilyStatus[product.family] !== false &&
                catalogCategoryStatus[product.category] !== false,
            }))}
            reasons={inventoryMovementReasons}
            movements={inventoryMovements}
            branchInventory={branchInventory}
            owedProducts={owedProducts}
            batches={inventoryAdjustmentBatches}
            tickets={activeTickets}
            sellers={sellers}
            onRequestBatch={requestInventoryBatch}
            onUpdateBatch={updateInventoryBatch}
            onApproveBatch={approveInventoryBatch}
            onCancelBatch={cancelInventoryBatch}
            onFulfillOwedProduct={fulfillOwedProduct}
            costAccessAuthorized={costAccessAuthorized}
            onAuthorizeCostAccess={authorizeCostAccess}
            onLockCostAccess={() => setCostAccessAuthorized(false)}
          />
        );
      case "deals":
        return (
          <DealsView
            deals={deals}
            products={catalogProducts}
            tickets={activeTickets}
            branches={operationalBranches}
            authorized={dealAccessAuthorized}
            canViewCosts={canViewProductCosts}
            onAuthorize={authorizeDealAccess}
            onLock={() => setDealAccessAuthorized(false)}
            onSave={saveDeal}
            onPublish={publishDeal}
            onDeactivate={deactivateDeal}
          />
        );
      case "settings":
        return renderSettings();
      case "x-report":
        return renderXReport();
      case "reports":
        return (
          <ReportsView
            tickets={tickets}
            products={catalogProducts}
            movements={inventoryMovements}
            clients={clients}
            sellers={sellers}
            appointments={appointments}
            paymentMethods={paymentMethods}
            branches={operationalBranches}
            branchInventory={branchInventory}
            receiptSettings={receiptSettings}
            expenses={cashExpenses}
            expenseTypes={expenseTypes}
            canViewCosts={canViewProductCosts}
            loadAuthorizedDataset={posApiEnabled ? async (input) => {
              const branchIds = input.branches.flatMap((name) => {
                const branch = apiBranches.find((candidate) => candidate.name === name);
                return branch ? [branch.id] : [];
              });
              const rows: Array<Record<string, string | number>> = [];
              let page = 1;
              let total = 0;
              do {
                const dataset = await posApi.exportDataset(input.key, {
                  dateFrom: input.dateFrom,
                  dateTo: input.dateTo,
                  branchIds,
                  ...(input.sellerId ? { sellerId: input.sellerId } : {}),
                  ...(input.paymentMethodId ? { paymentMethodId: input.paymentMethodId } : {}),
                  ...(input.search ? { search: input.search } : {}),
                  page,
                  pageSize: 500,
                });
                total = dataset.total;
                rows.push(...dataset.rows.map((row) => Object.fromEntries(
                  Object.entries(row).map(([column, value]) => [
                    column,
                    value === null ? "" : typeof value === "boolean" ? String(value) : value,
                  ]),
                )));
                if (dataset.rows.length === 0) break;
                page += 1;
              } while (rows.length < total);
              return rows;
            } : undefined}
          />
        );
      case "cash-manager":
        return (
          <CashManagerView
            sellers={sellers}
            branches={operationalBranches}
            activeBranch={activeBranch}
            expenseTypes={expenseTypes}
            expenses={cashExpenses}
            companyName={receiptSettings.companyName}
            logoUrl={receiptSettings.logoUrl}
            isMasterCode={isMasterAccessCode}
            apiManaged={posApiEnabled}
            operator={sessionUser ? { id: sessionUser.id, name: sessionUser.name, isMaster: sessionUser.isMaster } : null}
            onCreateExpense={(expense) => {
              if (posApiEnabled) {
                void posApi.createExpense({
                  expenseTypeId: expense.typeId,
                  amount: expense.amount.toFixed(2),
                  concept: expense.concept,
                  comment: expense.comment || null,
                  employeeId: expense.sellerId === "pos-system" ? null : expense.sellerId,
                }).then((created) => {
                  const mapped = expenseFromDto(created);
                  setCashExpenses((current) => [mapped, ...current]);
                  toast.success(`Gasto registrado con folio ${mapped.folio}.`);
                }).catch((error: unknown) => {
                  const response = error as { response?: { data?: { message?: string } }; message?: string };
                  toast.error(response.response?.data?.message ?? response.message ?? "No se pudo registrar el gasto.");
                });
                return;
              }
              setCashExpenses((current) => [expense, ...current]);
              pushOperationalNotification({
                type: "CASH_EXPENSE",
                title: `Gasto registrado · ${expense.folio}`,
                detail: `${expense.typeName} · ${formatCurrency(expense.amount)} · ${expense.concept}`,
                moduleLabel: "Cash manager",
                branch: expense.branch,
                actorId: expense.sellerId,
                actorName: expense.sellerName,
                reference: expense.folio,
                createdAtIso: expense.createdAtIso,
              });
            }}
            onUpdateExpense={(expense) => {
              if (posApiEnabled) {
                const alias = window.prompt("Alias master para corregir el gasto:");
                const pin = alias ? window.prompt("PIN master:") : null;
                if (!alias || !pin) return;
                void posApi.createAuthorization({ alias, pin, purpose: "CASH_EXPENSE_EDIT", entityType: "PosCashExpense", entityId: expense.id })
                  .then((authorization) => posApi.correctExpense(expense.id, {
                    expenseTypeId: expense.typeId,
                    amount: expense.amount.toFixed(2),
                    concept: expense.concept,
                    comment: expense.comment || null,
                    employeeId: expense.sellerId === "pos-system" ? null : expense.sellerId,
                    authorizationToken: authorization.authorizationToken,
                    reason: "Corrección desde Cash Manager",
                  }))
                  .then((updated) => {
                    const mapped = expenseFromDto(updated);
                    setCashExpenses((current) => [mapped, ...current.map((item) => item.id === expense.id ? { ...item, status: "VOIDED" as const, updatedAtIso: new Date().toISOString() } : item)]);
                    toast.success(`Gasto corregido mediante ${mapped.folio}.`);
                  })
                  .catch((error: unknown) => {
                    const response = error as { response?: { data?: { message?: string } }; message?: string };
                    toast.error(response.response?.data?.message ?? response.message ?? "No se pudo corregir el gasto.");
                  });
                return;
              }
              setCashExpenses((current) =>
                current.map((item) =>
                  item.id === expense.id ? expense : item,
                ),
              );
              pushOperationalNotification({
                type: "CASH_EXPENSE",
                title: `Gasto editado · ${expense.folio}`,
                detail: `${expense.typeName} · ${formatCurrency(expense.amount)} · ${expense.concept}`,
                moduleLabel: "Cash manager",
                branch: expense.branch,
                actorId: expense.sellerId,
                actorName: expense.sellerName,
                reference: expense.folio,
                createdAtIso: new Date().toISOString(),
              });
            }}
            onVoidExpense={(expenseId) => {
              if (posApiEnabled) {
                const alias = window.prompt("Alias master para anular el gasto:");
                const pin = alias ? window.prompt("PIN master:") : null;
                if (!alias || !pin) return;
                void posApi.createAuthorization({ alias, pin, purpose: "CASH_EXPENSE_VOID", entityType: "PosCashExpense", entityId: expenseId })
                  .then((authorization) => posApi.voidExpense(expenseId, { authorizationToken: authorization.authorizationToken, reason: "Anulación desde Cash Manager" }))
                  .then((voided) => {
                    const mapped = expenseFromDto(voided);
                    setCashExpenses((current) => current.map((expense) => expense.id === mapped.id ? mapped : expense));
                    toast.success("El gasto fue anulado mediante una compensación auditada.");
                  })
                  .catch((error: unknown) => {
                    const response = error as { response?: { data?: { message?: string } }; message?: string };
                    toast.error(response.response?.data?.message ?? response.message ?? "No se pudo anular el gasto.");
                  });
                return;
              }
              const voidedExpense = cashExpenses.find(
                (expense) => expense.id === expenseId,
              );
              setCashExpenses((current) =>
                current.map((expense) =>
                  expense.id === expenseId
                    ? {
                        ...expense,
                        status: "VOIDED",
                        updatedAtIso: new Date().toISOString(),
                      }
                    : expense,
                ),
              );
              if (voidedExpense) {
                pushOperationalNotification({
                  type: "CASH_EXPENSE",
                  title: `Gasto anulado · ${voidedExpense.folio}`,
                  detail: `${voidedExpense.typeName} · ${formatCurrency(voidedExpense.amount)} · impacto retirado del corte.`,
                  moduleLabel: "Cash manager",
                  branch: voidedExpense.branch,
                  actorId: masterUser.id,
                  actorName: masterUser.name,
                  reference: voidedExpense.folio,
                  createdAtIso: new Date().toISOString(),
                });
              }
              toast.success("El gasto quedó anulado y dejó de afectar el corte.");
            }}
          />
        );
      case "clock-in":
        return (
          <ClockInView
            sellers={sellers}
            branches={operationalBranches}
            records={attendanceRecords}
            onClockIn={clockInSeller}
            onClockOut={clockOutSeller}
          />
        );
      case "employees":
        return (
          <EmployeesView
            authorized={employeeAccessAuthorized}
            managedByApi={posApiEnabled}
            defaultMasterAlias={apiSession?.actor.isMaster ? apiSession.actor.alias : ""}
            roles={employeeRoles}
            sellers={sellers}
            onAuthorize={authorizeEmployeeAccess}
            onLock={() => setEmployeeAccessAuthorized(false)}
            onSaveRole={saveEmployeeRole}
            onSaveSeller={saveEmployeeSeller}
            onToggleRole={toggleEmployeeRole}
            onAssignRole={assignEmployeeRole}
            onSetMasterAccess={setEmployeeMasterAccess}
          />
        );
      case "competition":
        return (
          <CompetitionView
            competitions={competitions}
            tickets={activeTickets}
            sellers={sellers}
            products={catalogProducts}
            onOpenSettings={() => {
              setActiveScreen("settings");
              setCompetitionSettingsOpen(true);
            }}
          />
        );
      case "close-day":
        return renderCloseDay();
      case "data-update":
        return (
          <DataUpdateView
            lastUpdatedAt={sessionDataSync.lastUpdatedAt}
            nextUpdateAt={sessionDataSync.nextUpdateAt}
            updating={sessionDataSync.updating}
            revision={sessionDataSync.revision}
            now={syncClock}
            onRequestSync={requestSessionDataSync}
            isOnline={isOnline}
            pendingTicketCount={posApiEnabled
              ? offlineQueue.filter((entry) => entry.status !== "SYNCED").length
              : tickets.filter((ticket) => ticket.syncStatus === "PENDING_SYNC").length}
          />
        );
      case "my-account":
        return (
          <MyAccountView
            isMasterSession={Boolean(sessionUser?.isMaster)}
            currentSeller={sessionUser ? sellers.find((seller) => seller.id === sessionUser.id) ?? null : null}
            authorized={myAccountAuthorized}
            profile={billingProfile}
            cards={billingCards}
            locations={billingLocations}
            history={billingHistory}
            isMasterCode={isMasterAccessCode}
            onAuthorize={() => setMyAccountAuthorized(true)}
            onLock={() => setMyAccountAuthorized(false)}
            onSaveProfile={saveBillingProfile}
            onAddCard={addBillingCard}
            onSetDefaultCard={setDefaultBillingCard}
            onRemoveCard={removeBillingCard}
            onActivateLocation={activateBillingLocation}
            onAddLocation={addBillingLocation}
            onDeactivateLocation={deactivateBillingLocation}
            onSaveSellerAccess={saveCurrentSellerAccess}
          />
        );
      default:
        return renderGenericModule();
    }
  };

  if (!sessionUser || sessionStage === "LOGIN") {
    return (
      <>
        <PosLoginScreen
          companyName={receiptSettings.companyName}
          branches={operationalBranches}
          fixedBranch={activeBranch}
          masterUser={masterUser}
          sellers={sellers}
          language={interfaceLanguage}
          terminalManaged={posApiEnabled}
          onLogin={handleSoftwareLogin}
        />
        {renderConnectivityNotice()}
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (sessionStage === "OPENING_COUNT") {
    return (
      <>
        <InventoryCountScreen
          mode="OPENING"
          branch={sessionUser.branch}
          user={sessionUser}
          products={countableProducts}
          expectedStock={branchInventory[sessionUser.branch] ?? {}}
          canSkip={sessionUser.isMaster}
          showDifferences={canViewInventoryCountDifferences}
          language={interfaceLanguage}
          onComplete={completeOpeningCount}
        />
        {renderConnectivityNotice()}
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (sessionStage === "CLOSING_COUNT") {
    return (
      <>
        <InventoryCountScreen
          mode="CLOSING"
          branch={sessionUser.branch}
          user={sessionUser}
          products={countableProducts}
          expectedStock={branchInventory[sessionUser.branch] ?? {}}
          canSkip={sessionUser.isMaster}
          showDifferences={canViewInventoryCountDifferences}
          language={interfaceLanguage}
          onBack={() => {
            setSessionStage("OPEN");
            setActiveScreen("sale");
          }}
          onComplete={completeClosingCount}
        />
        {renderConnectivityNotice()}
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (activeScreen === "close-day") {
    const closeDayReturnScreen: ScreenId = allowedScreens.includes("dashboard")
      ? "dashboard"
      : "sale";
    return (
      <div className="close-day-focus-shell">
        <main className="close-day-focus-window">
          <Button
            type="button"
            variant="outline"
            className="close-day-back-button"
            onClick={() => setActiveScreen(closeDayReturnScreen)}
          >
            <ArrowLeft size={16} /> Regresar al menú
          </Button>
          <header className="close-day-focus-header">
            <div>
              <span className="section-kicker">CIERRE OPERATIVO · {activeBranch.toLocaleUpperCase("es-MX")}</span>
              <h1>Close Day</h1>
              <p>Revisa el resumen, imprime el corte y autoriza el cierre final.</p>
            </div>
          </header>
          {renderCloseDay()}
        </main>
        <Dialog
          open={closeDayAuthorizationOpen}
          onOpenChange={(open) => {
            setCloseDayAuthorizationOpen(open);
            if (!open) {
              setCloseDayAuthorizationUser("");
              setCloseDayAuthorizationCode("");
              setCloseDayAuthorizationError("");
            }
          }}
        >
          <DialogContent className="close-day-authorization-dialog sm:max-w-[500px]">
            <DialogHeader className="dialog-header">
              <div className="terminal-location-dialog-icon"><ShieldCheck size={22} /></div>
              <DialogTitle>Autorizar cierre de día</DialogTitle>
              <DialogDescription>
                Vuelve a ingresar el alias y su clave. El sistema registrará quién realizó el corte y la hora exacta.
              </DialogDescription>
            </DialogHeader>
            <div className="close-day-authorization-fields">
              <label className="field-stack">
                <span>Alias del responsable</span>
                <Input
                  value={closeDayAuthorizationUser}
                  onChange={(event) => {
                    setCloseDayAuthorizationUser(event.target.value);
                    setCloseDayAuthorizationError("");
                  }}
                  placeholder="Alias de acceso"
                  autoComplete="off"
                />
              </label>
              <label className="field-stack">
                <span>Clave de usuario</span>
                <Input
                  type="password"
                  inputMode="numeric"
                  value={closeDayAuthorizationCode}
                  onChange={(event) => {
                    setCloseDayAuthorizationCode(event.target.value);
                    setCloseDayAuthorizationError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") authorizeCloseDay();
                  }}
                  placeholder="••••"
                  autoComplete="off"
                />
              </label>
            </div>
            {closeDayAuthorizationError && (
              <div className="close-day-authorization-error" role="alert">
                <AlertTriangle size={16} /> {closeDayAuthorizationError}
              </div>
            )}
            <div className="terminal-location-lock-note">
              <Clock3 size={15} />
              <span>La autorización quedará ligada al corte de {activeBranch} con fecha y hora de Ciudad de México.</span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCloseDayAuthorizationOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={authorizeCloseDay}
                disabled={!closeDayAuthorizationUser.trim() || !closeDayAuthorizationCode.trim()}
              >
                <LockKeyhole size={16} /> Autorizar y cerrar día
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {renderConnectivityNotice()}
        <Toaster richColors position="top-right" />
      </div>
    );
  }

  const metadata =
    activeScreen === "my-account" && !sessionUser.isMaster
      ? { title: "My Account", subtitle: "Alias y contraseña personal" }
      : screenMetadata[activeScreen];
  const secondsUntilNextUpdate = Math.max(
    0,
    Math.ceil((sessionDataSync.nextUpdateAt - syncClock) / 1_000),
  );
  const nextUpdateCountdown = `${String(Math.floor(secondsUntilNextUpdate / 60)).padStart(2, "0")}:${String(secondsUntilNextUpdate % 60).padStart(2, "0")}`;
  const lastUpdateTime = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(sessionDataSync.lastUpdatedAt));
  return (
    <div className={`pos-app ${activeScreen === "sale" && saleFocusMode ? "is-sale-focus" : ""}`}>
      {!(activeScreen === "sale" && saleFocusMode) && (
        <PosSidebar
          activeScreen={activeScreen}
          activeBranch={activeBranch}
          collapsed={sidebarCollapsed}
          pinned={sidebarPinned}
          allowedScreens={allowedScreens}
          cartCount={cartCount}
          language={interfaceLanguage}
          onNavigate={navigateToScreen}
          onRequestLocationSwitch={openLocationSwitcher}
          onToggle={toggleSidebar}
          onTogglePin={toggleSidebarPin}
        />
      )}
      <main className="pos-main">
        <header className="page-header">
          <div>
            <span className="eyebrow">
              {receiptSettings.companyName.toLocaleUpperCase("es-MX")} · {activeBranch.toLocaleUpperCase("es-MX")}
            </span>
            <h1>{metadata.title}</h1>
            <p>{metadata.subtitle}</p>
            {!sessionUser.isMaster && (
              <Badge
                variant="outline"
                className={`module-edit-status ${canEditActiveModule ? "is-editable" : "is-read-only"}`}
              >
                {canEditActiveModule ? <Pencil size={12} /> : <LockKeyhole size={12} />}
                {canEditActiveModule ? "Edición permitida" : "Solo consulta"}
              </Badge>
            )}
          </div>
          <div className="header-actions">
            <NotificationBell
              notifications={operationalNotifications}
              preferences={notificationPreferences}
              masterUser={posApiEnabled ? { ...masterUser, id: sessionUser.id, name: sessionUser.name, initials: sessionUser.initials } : masterUser}
              sellers={sellers}
              isMasterCode={isMasterAccessCode}
              onMarkRead={markOperationalNotificationRead}
              onMarkAllRead={markAllOperationalNotificationsRead}
              apiMode={posApiEnabled}
            />
            <div className="header-status">
              <div
                className={`header-sync-status ${isOnline && !operatingOffline ? "is-online" : "is-offline"}`}
                aria-live="polite"
              >
                <span className={sessionDataSync.updating ? "is-updating" : ""}>
                  {isOnline && !operatingOffline ? <RefreshCw size={15} /> : <WifiOff size={15} />}
                </span>
                <div>
                  <strong>
                    {!isOnline || operatingOffline
                      ? "Modo offline"
                      : sessionDataSync.updating
                      ? interfaceLanguage === "EN"
                        ? "Updating data…"
                        : "Actualizando datos…"
                      : `${interfaceLanguage === "EN" ? "Updated" : "Actualizado"} · ${lastUpdateTime}`}
                  </strong>
                  <small>
                    {!isOnline || operatingOffline
                      ? `${posApiEnabled ? offlineQueue.length : tickets.filter((ticket) => ticket.syncStatus === "PENDING_SYNC").length} operaciones pendientes de sincronizar`
                      : sessionDataSync.updating
                      ? interfaceLanguage === "EN"
                        ? "Automatic synchronization in progress"
                        : "Sincronización automática en curso"
                      : `${interfaceLanguage === "EN" ? "Next update in" : "Siguiente actualización en"} ${nextUpdateCountdown}`}
                  </small>
                </div>
              </div>
              <i className="header-status-divider" />
              <div className="header-terminal-status">
                <span className="status-dot" />
                <div>
                  <strong>Terminal 01</strong>
                  <small>
                    {interfaceLanguage === "EN" ? "Operator" : "Operador"}: {sessionUser.name}
                  </small>
                </div>
              </div>
            </div>
            {allowedScreens.includes("my-account") && <button
              type="button"
              className={`header-account-button ${activeScreen === "my-account" ? "is-active" : ""}`}
              onClick={() => navigateToScreen("my-account")}
              aria-current={activeScreen === "my-account" ? "page" : undefined}
            >
              <span className="header-account-icon">
                <CreditCard size={18} />
              </span>
              <span>
                <strong>My Account</strong>
                <small>
                  {sessionUser.isMaster
                    ? "Perfil, ubicaciones y facturación"
                    : "Alias y contraseña personal"}
                </small>
              </span>
              <ChevronRight size={16} />
            </button>}
          </div>
        </header>
        <div className="page-content">{renderScreen()}</div>
      </main>
      <Dialog
        open={locationSwitchOpen}
        onOpenChange={(open) => {
          setLocationSwitchOpen(open);
          if (!open) {
            setLocationSwitchAlias("");
            setLocationSwitchCode("");
          }
        }}
      >
        <DialogContent className="terminal-location-dialog sm:max-w-[520px]">
          <DialogHeader className="dialog-header">
            <div className="terminal-location-dialog-icon">
              <ArrowLeftRight size={22} />
            </div>
            <DialogTitle>Cambiar ubicación de la terminal</DialogTitle>
            <DialogDescription>
              Sólo un usuario master puede fijar esta computadora en otra
              sucursal. Las siguientes ventas, citas y movimientos usarán la
              nueva ubicación.
            </DialogDescription>
          </DialogHeader>
          <div className="terminal-location-route">
            <span>
              <small>UBICACIÓN ACTUAL</small>
              <strong>Sucursal {activeBranch}</strong>
            </span>
            <ArrowLeftRight size={18} />
            <span>
              <small>NUEVA UBICACIÓN</small>
              <strong>
                {locationSwitchTarget
                  ? `Sucursal ${locationSwitchTarget}`
                  : "Selecciona sucursal"}
              </strong>
            </span>
          </div>
          <div className="terminal-location-fields">
            <div className="field-stack">
              <span>Sucursal operativa</span>
              <Select
                value={locationSwitchTarget}
                onValueChange={setLocationSwitchTarget}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {operationalBranches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      Sucursal {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="field-stack">
              <span>Alias del usuario master</span>
              <Input
                value={locationSwitchAlias}
                onChange={(event) => setLocationSwitchAlias(event.target.value)}
                placeholder="Alias master"
                autoComplete="username"
              />
            </div>
            <div className="field-stack">
              <span>Código de autorización master</span>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={posApiEnabled ? 12 : 4}
                value={locationSwitchCode}
                onChange={(event) =>
                  setLocationSwitchCode(event.target.value.replace(/\D/g, ""))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") confirmLocationSwitch();
                }}
                placeholder="••••"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="terminal-location-lock-note">
            <LockKeyhole size={15} />
            <span>
              {posApiEnabled
                ? "La asignación quedará auditada en el servidor y requerirá iniciar sesión nuevamente."
                : "La selección quedará guardada localmente y se conservará al volver a abrir el POS en esta computadora."}
            </span>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocationSwitchOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
                onClick={() => void confirmLocationSwitch()}
              disabled={
                !locationSwitchTarget ||
                (posApiEnabled && !locationSwitchAlias.trim()) ||
                !locationSwitchCode.trim()
              }
            >
              <ShieldCheck size={16} /> Autorizar y fijar sucursal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ProductDialog
        product={selectedProduct}
        cartItem={editingCartItem}
        otherItemsSubtotal={dialogOtherItemsSubtotal}
        otherItemsMinimumTotal={dialogOtherItemsMinimumTotal}
        open={productDialogOpen}
        showSpareCoverageMessage={receiptSettings.showSpareCoverageMessage}
        isMasterCode={isMasterAccessCode}
        onOpenChange={handleProductDialogOpenChange}
        onSubmit={submitCartItem}
        onRemove={removeCartItem}
      />
      <CheckoutDialog
        open={checkoutOpen}
        total={Number(authoritativeQuote?.total ?? ticketTotal)}
        discountAmount={Number(authoritativeQuote?.discountTotal ?? ticketDiscountAmount)}
        cart={cart}
        clients={clients}
        sellers={sellers}
        paymentMethods={paymentMethods}
        branches={operationalBranches}
        sourceOptions={clientSources}
        requiredFields={requiredFields}
        courtesySettings={courtesySettings}
        isMasterCode={isMasterAccessCode}
        {...(posApiEnabled && !operatingOffline ? { onSearchClients: async (query: string) => {
          const response = await posApi.customerSearch(query, 1, 20);
          return response.items.map(clientFromPosCustomer);
        } } : {})}
        onOpenChange={setCheckoutOpen}
        onComplete={completeTicket}
      />
      <Dialog open={saleAuthorizationOpen} onOpenChange={setSaleAuthorizationOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Autorizar venta bajo mínimo</DialogTitle>
            <DialogDescription>
              El total autoritativo es {formatCurrency(Number(authoritativeQuote?.total ?? 0))} y el mínimo combinado es {formatCurrency(Number(authoritativeQuote?.minimumTotal ?? 0))}.
            </DialogDescription>
          </DialogHeader>
          <div className="form-grid two-columns">
            <div className="field-stack">
              <span>Alias master</span>
              <Input value={saleAuthorizationAlias} onChange={(event) => setSaleAuthorizationAlias(event.target.value)} autoComplete="username" />
            </div>
            <div className="field-stack">
              <span>PIN master</span>
              <Input type="password" value={saleAuthorizationCode} onChange={(event) => setSaleAuthorizationCode(event.target.value)} autoComplete="off" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaleAuthorizationOpen(false)}>Cancelar</Button>
            <Button type="button" disabled={!saleAuthorizationAlias.trim() || !saleAuthorizationCode} onClick={() => void confirmSaleAuthorization()}>
              <ShieldCheck size={16} /> Autorizar y continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DealPickerDialog
        open={dealPickerOpen}
        deals={deals}
        products={catalogProducts}
        branch={activeBranch}
        onOpenChange={setDealPickerOpen}
        onAddDeal={addDealToCart}
      />
      <ReceiptTicketDialog
        open={receiptPreviewOpen}
        ticket={selectedReceiptTicket}
        layaway={
          selectedReceiptTicket
            ? layaways.find(
                (layaway) =>
                  layaway.originalTicketId ===
                  (selectedReceiptTicket.ticketType === "LAYAWAY_PAYMENT"
                    ? selectedReceiptTicket.relatedTicketId
                    : selectedReceiptTicket.id),
              ) ?? null
            : null
        }
        settings={receiptSettings}
        branchAddresses={branchAddresses}
        paymentMethods={paymentMethods}
        voucherTemplates={voucherTemplates.filter(
          (voucher) => voucher.active && voucher.visibleToSellers,
        )}
        allowPrint={canPrintActiveModule}
        onIssueVoucher={issueVoucher}
        onPrintVoucher={printVoucher}
        onOpenChange={setReceiptPreviewOpen}
      />
      <TicketEditDialog
        open={ticketEditOpen}
        ticket={editingTicket}
        sellers={sellers}
        products={catalogProducts}
        paymentMethods={paymentMethods}
        backendMode={posApiEnabled}
        defaultAuthorizationAlias={apiSession?.actor.isMaster ? apiSession.actor.alias : ""}
        onOpenChange={setTicketEditOpen}
        onSave={saveTicketChanges}
      />
      <TicketCancellationDialog
        open={ticketCancellationOpen}
        ticket={cancellingTicket}
        returnableProducts={cancellationReturnableProducts}
        authorizationRequired={posApiEnabled}
        defaultAuthorizationAlias={apiSession?.actor.isMaster ? apiSession.actor.alias : ""}
        onOpenChange={(open) => {
          setTicketCancellationOpen(open);
          if (!open) setCancellingTicket(null);
        }}
        onConfirm={cancelTicket}
      />
      {renderConnectivityNotice()}
      <Toaster position="bottom-center" richColors />
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: typeof CircleDollarSign;
  tone: "neutral" | "positive" | "negative";
}

function MetricCard({ label, value, icon: Icon, tone }: MetricCardProps) {
  return (
    <Card className={`metric-card tone-${tone}`}>
      <CardContent>
        <div className="metric-icon">
          <Icon size={22} />
        </div>
        <span>{label}</span>
        <strong>{value}</strong>
      </CardContent>
    </Card>
  );
}

export default App;
