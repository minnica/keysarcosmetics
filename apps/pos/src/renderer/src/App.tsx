import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  DollarSign,
  Filter,
  LockKeyhole,
  Minus,
  PackageCheck,
  Pencil,
  Percent,
  Printer,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trash2,
  WifiOff,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Toaster,
  toast,
} from "@cosmetics/ui";
import {
  CheckoutDialog,
  type CheckoutResult,
} from "./components/CheckoutDialog";
import { AppointmentsView } from "./components/AppointmentsView";
import { CatalogView } from "./components/CatalogView";
import { CustomersView } from "./components/CustomersView";
import { DataUpdateView } from "./components/DataUpdateView";
import { InventoryMovementsView } from "./components/InventoryMovementsView";
import { PosSidebar } from "./components/PosSidebar";
import { ProductDialog } from "./components/ProductDialog";
import { ReceiptTicketDialog } from "./components/ReceiptTicketDialog";
import { SellerSalesView } from "./components/SellerSalesView";
import { TicketEditDialog } from "./components/TicketEditDialog";
import { TicketCancellationDialog } from "./components/TicketCancellationDialog";
import {
  administratorCode,
  encodeMinimumPrice,
  formatCurrency,
  getSellerSku,
  getSellerSkuBase,
  initialAppointments,
  initialBranchInventory,
  initialClients,
  initialInventoryMovementReasons,
  initialPaymentMethods,
  initialLayaways,
  initialReceiptSettings,
  initialRequiredClientFields,
  initialTickets,
  products as initialProducts,
  sellers,
} from "./mock-data";
import type {
  Appointment,
  BranchInventory,
  CartItem,
  ClientField,
  DiscountMode,
  InventoryAdjustmentBatch,
  InventoryMovement,
  InventoryMovementDraft,
  InventoryMovementReason,
  LayawayRecord,
  OwedProductRecord,
  PaymentMethodOption,
  Product,
  ReceiptSettings,
  RequiredClientFields,
  ScreenId,
  Ticket,
  TicketCancellationRequest,
  TicketInventoryLine,
} from "./types";

const screenMetadata: Record<ScreenId, { title: string; subtitle: string }> = {
  sale: { title: "Sale", subtitle: "Venta retail" },
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
  inventory: { title: "Inventory", subtitle: "Existencias del catálogo mock" },
  "inventory-movements": {
    title: "Movimientos de inventario",
    subtitle: "Entradas, bajas y ajustes de existencias",
  },
  catalog: {
    title: "Catálogo",
    subtitle: "Productos, familias, categorías y sucursales",
  },
  settings: {
    title: "Settings",
    subtitle: "Reglas de captura del punto de venta",
  },
  "x-report": {
    title: "X-Report",
    subtitle: "Corte parcial sin cerrar el día",
  },
  "cash-manager": {
    title: "Cash manager",
    subtitle: "Movimientos de caja de la terminal",
  },
  "close-day": { title: "Close day", subtitle: "Resumen y cierre operativo" },
  employees: { title: "Employees", subtitle: "Equipo y estatus de vendedores" },
  competition: {
    title: "Competition",
    subtitle: "Metas retail y desempeño del equipo",
  },
  websites: { title: "Websites", subtitle: "Accesos rápidos de operación" },
  "data-update": {
    title: "Data update",
    subtitle: "Sincronización offline del POS",
  },
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

const paymentStatusLabels: Record<Ticket["paymentStatus"], string> = {
  PAID: "Pagado",
  LAYAWAY: "Apartado",
  PENDING: "Pendiente de cobro",
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

const isCartFloorCoveredOrAuthorized = (items: CartItem[]) => {
  if (items.length === 0) return true;
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const minimumTotal = items.reduce(
    (sum, item) => sum + item.product.minPrice * item.quantity,
    0,
  );
  return subtotal >= minimumTotal || items.some((item) => item.adminAuthorized);
};

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("sale");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("Todos");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState(initialProducts);
  const [catalogFamilies, setCatalogFamilies] = useState(() =>
    Array.from(new Set(initialProducts.map((product) => product.family))),
  );
  const [catalogCategories, setCatalogCategories] = useState(() =>
    Array.from(new Set(initialProducts.map((product) => product.category))),
  );
  const [catalogGroups, setCatalogGroups] = useState(() =>
    Array.from(new Set(initialProducts.map((product) => product.group))),
  );
  const [inventoryMovementReasons, setInventoryMovementReasons] = useState<
    InventoryMovementReason[]
  >(initialInventoryMovementReasons);
  const [inventoryMovements, setInventoryMovements] = useState<
    InventoryMovement[]
  >([]);
  const [inventoryAdjustmentBatches, setInventoryAdjustmentBatches] = useState<
    InventoryAdjustmentBatch[]
  >([]);
  const [branchInventory, setBranchInventory] = useState<BranchInventory>(
    initialBranchInventory,
  );
  const [owedProducts, setOwedProducts] = useState<OwedProductRecord[]>([]);
  const [newMovementReason, setNewMovementReason] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("PERCENT");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [clients, setClients] = useState(initialClients);
  const [tickets, setTickets] = useState(initialTickets);
  const [layaways, setLayaways] = useState<LayawayRecord[]>(initialLayaways);
  const [appointments, setAppointments] =
    useState<Appointment[]>(initialAppointments);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(
    initialReceiptSettings,
  );
  const [selectedReceiptTicket, setSelectedReceiptTicket] =
    useState<Ticket | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [ticketEditOpen, setTicketEditOpen] = useState(false);
  const [cancellingTicket, setCancellingTicket] = useState<Ticket | null>(null);
  const [ticketCancellationOpen, setTicketCancellationOpen] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [xReportAccessCode, setXReportAccessCode] = useState("");
  const [xReportAuthorized, setXReportAuthorized] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    initialPaymentMethods,
  );
  const [paymentSettingsOpen, setPaymentSettingsOpen] = useState(false);
  const [paymentSettingsCode, setPaymentSettingsCode] = useState("");
  const [paymentSettingsAuthorized, setPaymentSettingsAuthorized] =
    useState(false);
  const [newPaymentMethodName, setNewPaymentMethodName] = useState("");
  const [requiredFields, setRequiredFields] = useState<RequiredClientFields>(
    initialRequiredClientFields,
  );
  const paymentLabel = (methodId: string) =>
    paymentMethods.find((method) => method.id === methodId)?.label ?? methodId;
  const activeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "COMPLETED"),
    [tickets],
  );
  const cancellationReturnableProducts = useMemo<TicketInventoryLine[]>(() => {
    if (!cancellingTicket) return [];
    if (cancellingTicket.inventoryDeductions)
      return cancellingTicket.inventoryDeductions;
    return cancellingTicket.products.flatMap((line) => {
      const product = catalogProducts.find(
        (candidate) => candidate.id === line.productId,
      );
      return product?.kind === "PRODUCT"
        ? [
            {
              productId: line.productId,
              productName: line.name,
              quantity: line.quantity,
              branch: "Polanco",
            },
          ]
        : [];
    });
  }, [cancellingTicket, catalogProducts]);

  const saleProducts = useMemo(
    () =>
      catalogProducts.filter(
        (product) => product.active && product.branches.includes("Polanco"),
      ),
    [catalogProducts],
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
        (selectedCategory === "Todas" || product.category === selectedCategory)
      );
    });
  }, [saleProducts, search, selectedCategory, selectedFamily]);

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
    (sum, item) => sum + item.product.minPrice * item.quantity,
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
    (sum, item) => sum + item.product.minPrice * item.quantity,
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

  const openCheckout = () => {
    if (!isCartFloorCoveredOrAuthorized(cart)) {
      toast.error(
        "El total del ticket no cubre el mínimo combinado y requiere autorización administrativa.",
      );
      return;
    }
    setCheckoutOpen(true);
  };

  const completeTicket = (result: CheckoutResult) => {
    setClients((current) =>
      result.createdClient
        ? [result.client, ...current]
        : current.map((client) =>
            client.id === result.client.id ? result.client : client,
          ),
    );
    const createdAt = new Date();
    const ticketId = createUniqueFolio(tickets);
    const courtesyAppointments = result.appointments.filter(
      (appointment) => appointment.kind === "COURTESY",
    );
    const ticket: Ticket = {
      id: ticketId,
      createdAt: new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(createdAt),
      createdAtIso: createdAt.toISOString(),
      clientName: `${result.client.firstName} ${result.client.lastName}`,
      clientPhone: result.client.phone,
      sellerSummary: result.sellerSummary,
      items: cartCount + courtesyAppointments.length,
      discountAmount: ticketDiscountAmount,
      subtotal: cartSubtotal,
      total: ticketTotal,
      deviation: ticketDeviation,
      paymentMethod: result.paymentMethod,
      payments: result.payments,
      amountPaid: result.amountPaid,
      balanceDue: result.balanceDue,
      paymentStatus: result.paymentStatus,
      products: [
        ...cart.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          total: item.unitPrice * item.quantity,
        })),
        ...courtesyAppointments.map((appointment, index) => ({
          productId: `courtesy-${ticketId}-${index + 1}`,
          name: `${appointment.service} · REGALO`,
          quantity: 1,
          total: 0,
        })),
      ],
      sellerSales: result.sellerSales,
      status: "COMPLETED",
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
    const polancoStock = { ...(branchInventory.Polanco ?? {}) };
    const deliveredByCartItem = new Map<string, number>();
    const deliveryDebts: OwedProductRecord[] = [];
    cart.forEach((item) => {
      if (item.product.kind !== "PRODUCT" || !requestedDeliveryIds.has(item.id))
        return;
      const available = polancoStock[item.product.id] ?? 0;
      const delivered = Math.min(available, item.quantity);
      const shortage = item.quantity - delivered;
      polancoStock[item.product.id] = available - delivered;
      deliveredByCartItem.set(item.id, delivered);
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
          branch: "Polanco",
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
              branch: "Polanco",
            },
          ]
        : [];
    });
    setTickets((current) => [ticket, ...current]);
    setBranchInventory((current) => ({
      ...current,
      Polanco: polancoStock,
    }));
    setCatalogProducts((current) =>
      current.map((product) =>
        product.stock === null
          ? product
          : { ...product, stock: polancoStock[product.id] ?? 0 },
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
        payments: result.payments.map((payment) => ({
          id: payment.id,
          folio: ticketId,
          createdAt: ticket.createdAt,
          createdAtIso: ticket.createdAtIso,
          amount: payment.amount,
          methodId: payment.methodId,
        })),
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
          ? `Apartado ${ticket.id} registrado con saldo pendiente.`
          : `Ticket ${ticket.id} registrado como pendiente de cobro.`,
    );
    if (createdAppointments.length > 0) {
      toast.info(
        `${createdAppointments.length} cita${createdAppointments.length === 1 ? "" : "s"} registrada${createdAppointments.length === 1 ? "" : "s"} para ${clientName}.`,
      );
    }
  };

  const authorizePaymentSettings = () => {
    if (paymentSettingsCode !== administratorCode) {
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
    if (
      paymentMethods.some(
        (method) =>
          method.label.toLocaleLowerCase("es-MX") ===
          label.toLocaleLowerCase("es-MX"),
      )
    ) {
      toast.error("Ese método de pago ya existe.");
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

  const saveCatalogProduct = (product: Product) => {
    setCatalogProducts((current) => {
      const exists = current.some((item) => item.id === product.id);
      const duplicateSku = current.some(
        (item) => item.id !== product.id && item.sku === product.sku,
      );
      if (duplicateSku) {
        toast.error("El SKU base ya está registrado.");
        return current;
      }
      return exists
        ? current.map((item) => (item.id === product.id ? product : item))
        : [product, ...current];
    });
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

  const registerInventoryMovements = (
    adjustments: InventoryMovementDraft[],
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
            : Math.max(0, previousStock - adjustment.quantity);
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
        return [
          {
            id: crypto.randomUUID(),
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
            comment: adjustment.comment.trim(),
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
    toast.success(
      `${movements.length} movimientos aplicados al inventario por sucursal.`,
    );
  };

  const requestInventoryBatch = (adjustments: InventoryMovementDraft[]) => {
    if (adjustments.length === 0) return;
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
    if (
      !window.confirm(
        `¿Aprobar ${batch.folio} y aplicar ${batch.adjustments.length} movimientos al inventario?`,
      )
    )
      return;
    registerInventoryMovements(batch.adjustments);
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

  const cancelInventoryBatch = (batchId: string) => {
    const batch = inventoryAdjustmentBatches.find(
      (candidate) => candidate.id === batchId,
    );
    if (!batch || batch.status !== "PENDING") return;
    if (!window.confirm(`¿Cancelar ${batch.folio} sin afectar inventario?`))
      return;
    setInventoryAdjustmentBatches((current) =>
      current.map((candidate) =>
        candidate.id === batchId
          ? {
              ...candidate,
              status: "CANCELLED",
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
    toast.info(`${batch.folio} cancelado. No se generaron movimientos.`);
  };

  const fulfillOwedProduct = (owedProductId: string) => {
    const record = owedProducts.find((item) => item.id === owedProductId);
    if (!record || record.status !== "PENDING") return;
    const available = branchInventory[record.branch]?.[record.productId] ?? 0;
    if (available < record.quantity) {
      toast.error("Todavía no hay existencia suficiente para entregar.");
      return;
    }
    const nextBranchStock = {
      ...(branchInventory[record.branch] ?? {}),
      [record.productId]: available - record.quantity,
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
        item.id === owedProductId ? { ...item, status: "FULFILLED" } : item,
      ),
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
                          item.deliveredQuantity + record.quantity,
                        ),
                      }
                    : item,
                ),
              }
            : layaway,
        ),
      );
    }
    toast.success(`${record.productName} quedó marcado como entregado.`);
  };

  const registerLayawayPayment = (
    layawayId: string,
    requestedAmount: number,
    methodId: string,
    sellerId: string,
  ) => {
    const layaway = layaways.find((item) => item.id === layawayId);
    const seller = sellers.find((item) => item.id === sellerId);
    if (!layaway || layaway.status === "PAID" || !seller) return;
    const amount = Math.min(layaway.balanceDue, Math.max(0, requestedAmount));
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
    const polancoStock = { ...(branchInventory.Polanco ?? {}) };
    const newDebts: OwedProductRecord[] = [];
    const updatedItems = layaway.items.map((item) => {
      if (!isLiquidation || item.kind !== "PRODUCT") return item;
      const alreadyOwed = owedProducts
        .filter(
          (record) =>
            record.layawayId === layaway.id &&
            record.productId === item.productId &&
            record.status === "PENDING",
        )
        .reduce((sum, record) => sum + record.quantity, 0);
      const quantityToDeliver = Math.max(
        0,
        item.quantity - item.deliveredQuantity - alreadyOwed,
      );
      const available = polancoStock[item.productId] ?? 0;
      const delivered = Math.min(available, quantityToDeliver);
      const shortage = quantityToDeliver - delivered;
      polancoStock[item.productId] = available - delivered;
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
          branch: "Polanco",
          reason: "LAYAWAY_LIQUIDATION",
          createdAt: createdAtLabel,
          createdAtIso: createdAt.toISOString(),
          status: "PENDING",
        });
      }
      return {
        ...item,
        deliveredQuantity: item.deliveredQuantity + delivered,
      };
    });
    const paymentRecord = {
      id: crypto.randomUUID(),
      folio: paymentFolio,
      createdAt: createdAtLabel,
      createdAtIso: createdAt.toISOString(),
      amount,
      methodId,
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
        Polanco: polancoStock,
      }));
      setCatalogProducts((current) =>
        current.map((product) =>
          product.stock === null
            ? product
            : { ...product, stock: polancoStock[product.id] ?? 0 },
        ),
      );
      if (newDebts.length > 0)
        setOwedProducts((current) => [...newDebts, ...current]);
    }
    const paymentTicket: Ticket = {
      id: paymentFolio,
      createdAt: createdAtLabel,
      createdAtIso: createdAt.toISOString(),
      clientName: layaway.clientName,
      clientPhone: layaway.clientPhone,
      sellerSummary: seller.name,
      items: 1,
      discountAmount: 0,
      subtotal: amount,
      total: amount,
      deviation: 0,
      paymentMethod: methodId,
      payments: [
        { id: paymentRecord.id, methodId: paymentRecord.methodId, amount },
      ],
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
    };
    setTickets((current) => [
      paymentTicket,
      ...current.map((ticket) =>
        ticket.id === layaway.originalTicketId
          ? {
              ...ticket,
              amountPaid: ticket.amountPaid + amount,
              balanceDue,
              paymentStatus: isLiquidation
                ? ("PAID" as const)
                : ("LAYAWAY" as const),
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

  const previewTicket = (ticket: Ticket) => {
    setSelectedReceiptTicket(ticket);
    setReceiptPreviewOpen(true);
  };

  const editTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setTicketEditOpen(true);
  };

  const saveTicketChanges = (ticketId: string, changes: Partial<Ticket>) => {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, ...changes } : ticket,
      ),
    );
    toast.success(`Ticket ${ticketId} actualizado.`);
  };

  const openTicketCancellation = (ticket: Ticket) => {
    if (ticket.status === "REFUNDED") return;
    setCancellingTicket(ticket);
    setTicketCancellationOpen(true);
  };

  const cancelTicket = (request: TicketCancellationRequest) => {
    const ticket = cancellingTicket;
    if (!ticket || ticket.status === "REFUNDED") return;
    const cancelledAt = new Date();
    const cancelledAtLabel = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(cancelledAt);
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
          },
        ];
      },
    );

    if (returnMovements.length > 0) {
      setBranchInventory(nextInventory);
      setCatalogProducts((current) =>
        current.map((product) =>
          product.stock !== null
            ? { ...product, stock: nextInventory.Polanco?.[product.id] ?? 0 }
            : product,
        ),
      );
      setInventoryMovements((current) => [
        ...[...returnMovements].reverse(),
        ...current,
      ]);
    }

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
      current.filter((record) => record.ticketId !== ticket.id),
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
        returnMovements.length > 0
          ? `; ${returnMovements.length} productos regresaron al inventario`
          : " sin devolución de inventario"
      }.`,
    );
  };

  const renderSale = () => (
    <div className="sale-layout">
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
            <Sparkles size={17} /> {filteredProducts.length} opciones
          </div>
        </div>

        <div className="filter-section">
          <span className="filter-label">
            <Filter size={14} /> Familia
          </span>
          <div className="filter-pills">
            {families.map((family) => (
              <button
                key={family}
                type="button"
                className={selectedFamily === family ? "is-active" : ""}
                onClick={() => {
                  setSelectedFamily(family);
                  setSelectedCategory("Todas");
                }}
              >
                {family}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-section is-compact">
          <span className="filter-label">Categoría</span>
          <div className="filter-pills is-secondary">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={selectedCategory === category ? "is-active" : ""}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
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
                    aria-label={`SKU vendedor ${getSellerSku(product)}`}
                  >
                    <span>SKU</span>
                    <strong>{getSellerSkuBase(product)}</strong>
                    <b>-{encodeMinimumPrice(product.minPrice)}</b>
                  </div>
                  <div className="product-price-row">
                    <span>Precio de lista</span>
                    <strong>{formatCurrency(product.maxPrice)}</strong>
                  </div>
                  <div className="product-stock-row">
                    <span>
                      {product.stock === null
                        ? "Agenda abierta"
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
              return (
                <article key={item.id} className="cart-item">
                  <button
                    type="button"
                    className="cart-item-image-button"
                    onClick={() => openCartItem(item)}
                    aria-label={`Editar ${item.product.name}`}
                  >
                    <img src={item.product.image} alt={item.product.name} />
                  </button>
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
            <button
              type="button"
              className={`discount-trigger ${discountOpen ? "is-active" : ""}`}
              onClick={() => setDiscountOpen((current) => !current)}
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
            {discountOpen && (
              <div className="discount-popover">
                <div className="discount-mode-switch">
                  <button
                    type="button"
                    className={discountMode === "PERCENT" ? "is-active" : ""}
                    onClick={() => setDiscountMode("PERCENT")}
                    aria-label="Aplicar descuento por porcentaje"
                  >
                    <Percent size={13} />
                  </button>
                  <button
                    type="button"
                    className={discountMode === "AMOUNT" ? "is-active" : ""}
                    onClick={() => setDiscountMode("AMOUNT")}
                    aria-label="Aplicar descuento por importe"
                  >
                    <DollarSign size={13} />
                  </button>
                </div>
                <div className="ticket-discount-input-row">
                  <span>{discountMode === "PERCENT" ? "%" : "$"}</span>
                  <Input
                    type="number"
                    min="0"
                    max={
                      discountMode === "PERCENT" && cartSubtotal > 0
                        ? (maxPromotionalDiscount / cartSubtotal) * 100
                        : maxPromotionalDiscount
                    }
                    step="0.01"
                    value={discountValue}
                    onChange={(event) =>
                      setDiscountValue(Number(event.target.value))
                    }
                    aria-label={
                      discountMode === "PERCENT"
                        ? "Porcentaje de descuento promocional"
                        : "Importe de descuento promocional"
                    }
                  />
                  <strong>-{formatCurrency(ticketDiscountAmount)}</strong>
                </div>
                <small>
                  Tope disponible {formatCurrency(maxPromotionalDiscount)} para
                  respetar el precio mínimo del ticket.
                </small>
              </div>
            )}
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
    </div>
  );

  const renderReceipts = () => {
    const normalizedSearch = receiptSearch.trim().toLocaleLowerCase("es-MX");
    const filteredTickets = tickets.filter((ticket) => {
      const ticketDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
      }).format(new Date(ticket.createdAtIso));
      const matchesDate = !receiptDate || ticketDate === receiptDate;
      const matchesSearch =
        !normalizedSearch ||
        ticket.clientName
          .toLocaleLowerCase("es-MX")
          .includes(normalizedSearch) ||
        ticket.sellerSummary
          .toLocaleLowerCase("es-MX")
          .includes(normalizedSearch) ||
        ticket.id.toLocaleLowerCase("es-MX").includes(normalizedSearch);
      return matchesDate && matchesSearch;
    });
    const activeFilteredTickets = filteredTickets.filter(
      (ticket) => ticket.status === "COMPLETED",
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
    return (
      <div className="view-stack">
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
            <div className="receipt-filter-field">
              <CalendarDays size={17} />
              <DatePicker
                value={receiptDate}
                onChange={setReceiptDate}
                placeholder="Selecciona fecha"
              />
            </div>
            <div className="receipt-filter-field">
              <Search size={17} />
              <Input
                value={receiptSearch}
                onChange={(event) => setReceiptSearch(event.target.value)}
                placeholder="Buscar por cliente, vendedor o folio"
                aria-label="Buscar tickets por nombre o folio"
              />
            </div>
            {(receiptDate || receiptSearch) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReceiptDate("");
                  setReceiptSearch("");
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
                <h2>Ventas recientes</h2>
              </div>
              <Button type="button" variant="outline">
                <Download size={16} /> Exportar
              </Button>
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
                  {filteredTickets.map((ticket) => (
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
                          <button
                            type="button"
                            onClick={() => editTicket(ticket)}
                            aria-label={`Editar ticket ${ticket.id}`}
                            title="Editar"
                            disabled={ticket.status === "REFUNDED"}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => previewTicket(ticket)}
                            aria-label={`Imprimir ticket ${ticket.id}`}
                            title="Imprimir"
                          >
                            <Printer size={15} />
                          </button>
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
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderInventory = () => (
    <Card className="data-card">
      <CardContent className="p-0">
        <div className="data-card-heading">
          <div>
            <span>CATÁLOGO MOCK</span>
            <h2>Productos y servicios</h2>
          </div>
          <Badge>
            {catalogProducts
              .filter((product) => product.active && product.kind === "PRODUCT")
              .reduce((sum, product) => sum + (product.stock ?? 0), 0)}{" "}
            piezas
          </Badge>
        </div>
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ARTÍCULO</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>FAMILIA</TableHead>
                <TableHead>GRUPO</TableHead>
                <TableHead>PRECIO DE LISTA</TableHead>
                <TableHead>EXISTENCIA / LÍMITES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogProducts
                .filter((product) => product.active)
                .map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="table-product">
                        <img src={product.image} alt="" />
                        <strong>{product.name}</strong>
                      </div>
                    </TableCell>
                    <TableCell>
                      <strong className="floor-code">
                        {getSellerSku(product)}
                      </strong>
                    </TableCell>
                    <TableCell>{product.family}</TableCell>
                    <TableCell>{product.group}</TableCell>
                    <TableCell>{formatCurrency(product.maxPrice)}</TableCell>
                    <TableCell>
                      {product.stock === null ? (
                        <Badge variant="outline">SERVICIO</Badge>
                      ) : (
                        `${product.stock} · mín ${product.stockMin} / máx ${product.stockMax}`
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderSettings = () => (
    <div className="settings-grid">
      <Card className="settings-card">
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
                onClick={() =>
                  setRequiredFields((current) => ({
                    ...current,
                    [field]: !current[field],
                  }))
                }
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
      <Card className="settings-card accent-card">
        <CardContent>
          <span className="section-kicker">PRECIOS</span>
          <h2>Control administrativo</h2>
          <p>
            El precio de lista puede incrementarse sin límite. Bajar del piso
            interno requiere autorización y su margen sólo aparece en el
            X-Report protegido.
          </p>
          <div className="admin-code-preview">
            <span>CÓDIGO MOCK</span>
            <strong>••••</strong>
            <small>Demostración: 2468</small>
          </div>
          <div className="rule-list">
            <span>
              <CheckCircle2 size={16} /> Precio sobre lista sin límite
            </span>
            <span>
              <CheckCircle2 size={16} /> Autorizar precios bajo el mínimo
            </span>
            <span>
              <CheckCircle2 size={16} /> Margen visible sólo en X-Report
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
            <img src={receiptSettings.logoUrl} alt="Logo configurado" />
          </div>
          <p>
            Personaliza el encabezado, la información visible y el mensaje que
            recibirá la clienta en la impresión térmica.
          </p>
          <div className="receipt-settings-fields">
            <div className="field-stack">
              <span>URL del logo</span>
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
              <span>Sucursal</span>
              <Input
                value={receiptSettings.branchName}
                onChange={(event) =>
                  setReceiptSettings((current) => ({
                    ...current,
                    branchName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field-stack">
              <span>Dirección</span>
              <Input
                value={receiptSettings.address}
                onChange={(event) =>
                  setReceiptSettings((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
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
                    {receiptSettings[field]
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
              <span className="section-kicker">USUARIO MASTER</span>
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
            {paymentMethods.map((method) => (
              <span key={method.id}>
                <CheckCircle2 size={14} /> {method.label}
              </span>
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
              <small>Mock de demostración: 2468.</small>
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
              <button
                key={reason.id}
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
    </div>
  );

  const renderXReport = () => {
    if (!xReportAuthorized) {
      const authorizeReport = () => {
        if (xReportAccessCode !== administratorCode) {
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
            <span className="section-kicker">REPORTE ADMINISTRATIVO</span>
            <h2>Margen protegido</h2>
            <p>
              El margen contra precio mínimo y los ajustes bajo piso requieren
              permisos administrativos.
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
            <small>Mock de demostración: 2468.</small>
          </CardContent>
        </Card>
      );
    }

    const reportTickets = activeTickets.filter(
      (ticket) => ticket.ticketType !== "LAYAWAY_PAYMENT",
    );
    const total = reportTickets.reduce((sum, ticket) => sum + ticket.total, 0);
    const margin = reportTickets.reduce(
      (sum, ticket) => sum + ticket.deviation,
      0,
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
    const pending = reportTickets.reduce(
      (sum, ticket) => sum + ticket.balanceDue,
      0,
    );
    const discounts = reportTickets.reduce(
      (sum, ticket) => sum + ticket.discountAmount,
      0,
    );
    const paidByMethod = (methodId: string) =>
      activeTickets.reduce(
        (sum, ticket) =>
          sum +
          ticket.payments.reduce(
            (ticketSum, payment) =>
              ticketSum + (payment.methodId === methodId ? payment.amount : 0),
            0,
          ),
        0,
      );
    return (
      <div className="view-stack">
        <div className="metric-grid three-columns">
          <MetricCard
            label="VENTA BRUTA"
            value={formatCurrency(total)}
            icon={CircleDollarSign}
            tone="neutral"
          />
          <MetricCard
            label="TICKETS"
            value={String(reportTickets.length)}
            icon={PackageCheck}
            tone="neutral"
          />
          <MetricCard
            label="MARGEN VS. MÍNIMO"
            value={`${margin >= 0 ? "+" : ""}${formatCurrency(margin)}`}
            icon={margin >= 0 ? TrendingUp : TrendingDown}
            tone={margin >= 0 ? "positive" : "negative"}
          />
        </div>
        <Card className="report-card">
          <CardContent>
            <div className="report-card-header">
              <div>
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
            <Button type="button">
              <Download size={16} /> Descargar X-Report mock
            </Button>
          </CardContent>
        </Card>
        <Card className="data-card admin-margin-table">
          <CardContent className="p-0">
            <div className="data-card-heading">
              <div>
                <span>CONTROL ADMINISTRATIVO</span>
                <h2>Margen por ticket</h2>
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
                    <TableHead>MARGEN VS. MÍNIMO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportTickets.map((ticket) => (
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
                          className={`deviation-pill ${ticket.deviation < 0 ? "is-negative" : "is-positive"}`}
                        >
                          {ticket.deviation >= 0 ? "+" : ""}
                          {formatCurrency(ticket.deviation)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderEmployees = () => (
    <div className="employee-grid">
      {sellers.map((seller, index) => (
        <Card
          key={seller.id}
          className={`employee-card ${seller.active ? "" : "is-inactive"}`}
        >
          <CardContent>
            <div className="employee-avatar">{seller.initials}</div>
            <div>
              <h3>{seller.name}</h3>
              <span>Vendedor retail</span>
            </div>
            <Badge variant={seller.active ? "default" : "outline"}>
              {seller.active ? "ACTIVO" : "BAJA"}
            </Badge>
            <div className="employee-sales">
              <small>VENTA HOY</small>
              <strong>
                {seller.active
                  ? formatCurrency(1120 + index * 475)
                  : formatCurrency(0)}
              </strong>
            </div>
            {!seller.active && (
              <p>Sus clientes ahora pertenecen a Keysar Cosmetics.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderCloseDay = () => {
    const saleTickets = activeTickets.filter(
      (ticket) => ticket.ticketType !== "LAYAWAY_PAYMENT",
    );
    const total = saleTickets.reduce((sum, ticket) => sum + ticket.total, 0);
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
            <span className="section-kicker">22 AGOSTO 2026</span>
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
            <div className="closing-total">
              <span>TOTAL DEL DÍA</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <div className="close-day-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
              >
                <Printer size={17} /> Imprimir ticket de cierre
              </Button>
              <Button
                type="button"
                onClick={() =>
                  toast.success("Cierre mock completado. No se enviaron datos.")
                }
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
            <strong>KEYSAR COSMETICS</strong>
            <span>SUCURSAL POLANCO · TERMINAL 01</span>
            <span>CIERRE DE DÍA · 22/08/2026</span>
            <span>OPERADOR: EMMA</span>
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

          <section className="receipt-totals">
            <div>
              <span>Venta final</span>
              <strong>{formatCurrency(total)}</strong>
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
            <div className="receipt-grand-total">
              <span>TICKETS</span>
              <strong>{activeTickets.length}</strong>
            </div>
          </section>
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

  const renderScreen = () => {
    switch (activeScreen) {
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
            onPreviewTicket={previewTicket}
            onRegisterLayawayPayment={registerLayawayPayment}
          />
        );
      case "receipts":
        return renderReceipts();
      case "customers":
        return <CustomersView clients={clients} sellers={sellers} />;
      case "appointments":
        return (
          <AppointmentsView appointments={appointments} sellers={sellers} />
        );
      case "inventory":
        return renderInventory();
      case "catalog":
        return (
          <CatalogView
            products={catalogProducts}
            families={catalogFamilies}
            categories={catalogCategories}
            groups={catalogGroups}
            onSave={saveCatalogProduct}
            onStatusChange={setCatalogProductStatus}
            onAddFamily={(name) => addCatalogOption(setCatalogFamilies, name)}
            onAddCategory={(name) =>
              addCatalogOption(setCatalogCategories, name)
            }
            onAddGroup={(name) => addCatalogOption(setCatalogGroups, name)}
          />
        );
      case "inventory-movements":
        return (
          <InventoryMovementsView
            products={catalogProducts}
            reasons={inventoryMovementReasons}
            movements={inventoryMovements}
            branchInventory={branchInventory}
            owedProducts={owedProducts}
            batches={inventoryAdjustmentBatches}
            onRequestBatch={requestInventoryBatch}
            onApproveBatch={approveInventoryBatch}
            onCancelBatch={cancelInventoryBatch}
            onFulfillOwedProduct={fulfillOwedProduct}
          />
        );
      case "settings":
        return renderSettings();
      case "x-report":
        return renderXReport();
      case "employees":
        return renderEmployees();
      case "close-day":
        return renderCloseDay();
      case "data-update":
        return <DataUpdateView />;
      default:
        return renderGenericModule();
    }
  };

  const metadata = screenMetadata[activeScreen];
  return (
    <div className="pos-app">
      <PosSidebar
        activeScreen={activeScreen}
        collapsed={sidebarCollapsed}
        cartCount={cartCount}
        onNavigate={setActiveScreen}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />
      <main className="pos-main">
        <header className="page-header">
          <div>
            <span className="eyebrow">KEYSAR COSMETICS · POLANCO</span>
            <h1>{metadata.title}</h1>
            <p>{metadata.subtitle}</p>
          </div>
          <div className="header-status">
            <span className="status-dot" />
            <div>
              <strong>Terminal 01</strong>
              <small>Operador: EMMA</small>
            </div>
          </div>
        </header>
        <div className="page-content">{renderScreen()}</div>
      </main>
      <ProductDialog
        product={selectedProduct}
        cartItem={editingCartItem}
        otherItemsSubtotal={dialogOtherItemsSubtotal}
        otherItemsMinimumTotal={dialogOtherItemsMinimumTotal}
        open={productDialogOpen}
        onOpenChange={handleProductDialogOpenChange}
        onSubmit={submitCartItem}
        onRemove={removeCartItem}
      />
      <CheckoutDialog
        open={checkoutOpen}
        total={ticketTotal}
        discountAmount={ticketDiscountAmount}
        cart={cart}
        clients={clients}
        sellers={sellers}
        paymentMethods={paymentMethods}
        requiredFields={requiredFields}
        onOpenChange={setCheckoutOpen}
        onComplete={completeTicket}
      />
      <ReceiptTicketDialog
        open={receiptPreviewOpen}
        ticket={selectedReceiptTicket}
        settings={receiptSettings}
        paymentMethods={paymentMethods}
        onOpenChange={setReceiptPreviewOpen}
      />
      <TicketEditDialog
        open={ticketEditOpen}
        ticket={editingTicket}
        sellers={sellers}
        onOpenChange={setTicketEditOpen}
        onSave={saveTicketChanges}
      />
      <TicketCancellationDialog
        open={ticketCancellationOpen}
        ticket={cancellingTicket}
        returnableProducts={cancellationReturnableProducts}
        onOpenChange={(open) => {
          setTicketCancellationOpen(open);
          if (!open) setCancellingTicket(null);
        }}
        onConfirm={cancelTicket}
      />
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
