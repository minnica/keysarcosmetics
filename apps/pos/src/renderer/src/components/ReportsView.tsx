import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeDollarSign,
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  LayoutDashboard,
  PackageSearch,
  Percent,
  ReceiptText,
  Store,
  TrendingDown,
  TrendingUp,
  UserRoundSearch,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  Input,
  Label,
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
  toast,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import { getTicketTaxSummary, roundCurrency } from "../tax";
import { getProductSpare, getTicketSpare } from "../spare";
import { ReportsCustomerDialog } from "./ReportsCustomerDialog";
import { HistoryPagination, useHistoryPagination } from "./HistoryPagination";
import type {
  Appointment,
  BranchInventory,
  CashExpense,
  Client,
  ExpenseType,
  InventoryMovement,
  PaymentMethodOption,
  Product,
  ReceiptSettings,
  Seller,
  Ticket,
} from "../types";

type ReportKey =
  | "SALES_DETAIL"
  | "CASH_MOVEMENTS"
  | "SOLD_PRODUCTS"
  | "SALES_BY_EMPLOYEE"
  | "MERCHANDISE_OVERVIEW"
  | "MERCHANDISE_MOVEMENTS"
  | "MERCHANDISE_PROFITABILITY"
  | "EMPLOYEE_PERFORMANCE"
  | "EMPLOYEE_DAILY"
  | "CUSTOMER_OVERVIEW";

type ReportGroupKey = "SALES" | "MERCHANDISE" | "EMPLOYEE" | "CUSTOMER";
type ProductKindFilter = "ALL" | "PRODUCT" | "SERVICE";
type DetailRow = Record<string, string | number>;

interface ReportDefinition {
  key: ReportKey;
  label: string;
  description: string;
}

interface ReportGroup {
  key: ReportGroupKey;
  label: string;
  icon: typeof BarChart3;
  items: ReportDefinition[];
}

interface MetricDefinition {
  label: string;
  value: string;
  detail: string;
  tone?: "positive" | "negative" | "neutral";
}

interface ReportsViewProps {
  tickets: Ticket[];
  products: Product[];
  movements: InventoryMovement[];
  clients: Client[];
  sellers: Seller[];
  appointments: Appointment[];
  paymentMethods: PaymentMethodOption[];
  branches: string[];
  branchInventory: BranchInventory;
  receiptSettings: ReceiptSettings;
  expenses: CashExpense[];
  expenseTypes: ExpenseType[];
  canViewCosts: boolean;
}

const reportGroups: ReportGroup[] = [
  {
    key: "SALES",
    label: "Reportes de ventas",
    icon: BadgeDollarSign,
    items: [
      {
        key: "SALES_DETAIL",
        label: "Detalle de ventas",
        description: "Ingresos, SPARE, impuestos, descuentos, cobros y tickets.",
      },
      {
        key: "SOLD_PRODUCTS",
        label: "Productos vendidos",
        description: "Unidades, precio, costo, utilidad y participación.",
      },
      {
        key: "SALES_BY_EMPLOYEE",
        label: "Ventas por empleados",
        description: "Venta atribuida, tickets y productividad comercial.",
      },
      {
        key: "CASH_MOVEMENTS",
        label: "Movimientos de efectivo",
        description: "Cobros, gastos autorizados, anulaciones y flujo neto por folio.",
      },
    ],
  },
  {
    key: "MERCHANDISE",
    label: "Reportes de mercancía",
    icon: Boxes,
    items: [
      {
        key: "MERCHANDISE_OVERVIEW",
        label: "Resumen de mercancía",
        description: "Existencia, entradas, bajas, ventas y valor de stock.",
      },
      {
        key: "MERCHANDISE_MOVEMENTS",
        label: "Altas, bajas y transferencias",
        description: "Trazabilidad por folio, motivo, producto y sucursal.",
      },
      {
        key: "MERCHANDISE_PROFITABILITY",
        label: "Rentabilidad y demanda",
        description: "Margen, costo, rotación y productos de alta o baja demanda.",
      },
    ],
  },
  {
    key: "EMPLOYEE",
    label: "Reportes de empleados",
    icon: UserRoundSearch,
    items: [
      {
        key: "EMPLOYEE_PERFORMANCE",
        label: "Desempeño por vendedor",
        description: "Venta, mayor ticket, promedio, clientes y participación.",
      },
      {
        key: "EMPLOYEE_DAILY",
        label: "Días y productividad",
        description: "Días con venta, ritmo diario, descuentos y artículos por ticket.",
      },
    ],
  },
  {
    key: "CUSTOMER",
    label: "Reportes de clientes",
    icon: UsersRound,
    items: [
      {
        key: "CUSTOMER_OVERVIEW",
        label: "Comportamiento de clientes",
        description: "Altas, visitas, recurrencia, procedencia y citas.",
      },
    ],
  },
];

const reportDefinitions = reportGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.key })),
);

const getBusinessDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const inputDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const today = () => inputDate(new Date());

const thirtyDaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return inputDate(date);
};

const percentage = (value: number) =>
  `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(value)}%`;

const compactNumber = (value: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(value);

const currencyColumns = new Set(
  [
    "precio completo",
    "precio sin iva",
    "iva",
    "venta",
    "venta sin iva",
    "costo",
    "costo unitario",
    "costo total",
    "utilidad",
    "mayor ticket",
    "ticket promedio",
    "saldo",
    "cobrado",
    "descuento",
    "descuentos",
    "compra total",
    "spare",
    "spare unitario",
    "spare total",
    "monto",
    "impacto",
    "ingresos",
    "gastos",
    "flujo neto",
  ].map((column) => column.toLocaleLowerCase("es-MX")),
);

const isCurrencyColumn = (column: string) =>
  currencyColumns.has(column.trim().toLocaleLowerCase("es-MX"));

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function ReportsView({
  tickets,
  products,
  movements,
  clients,
  sellers,
  appointments,
  paymentMethods,
  branches,
  branchInventory,
  receiptSettings,
  expenses,
  expenseTypes,
  canViewCosts,
}: ReportsViewProps) {
  const [activeReport, setActiveReport] =
    useState<ReportKey>("SALES_DETAIL");
  const [openGroup, setOpenGroup] = useState<ReportGroupKey | null>("SALES");
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [selectedBranches, setSelectedBranches] = useState<string[]>(branches);
  const [sellerId, setSellerId] = useState("ALL");
  const [paymentMethodId, setPaymentMethodId] = useState("ALL");
  const [expenseTypeId, setExpenseTypeId] = useState("ALL");
  const [productKind, setProductKind] =
    useState<ProductKindFilter>("ALL");
  const [search, setSearch] = useState("");
  const [comparePrevious, setComparePrevious] = useState(true);
  const [exporting, setExporting] = useState<"PDF" | "EXCEL" | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  useEffect(() => {
    setSelectedBranches((current) => {
      const valid = current.filter((branch) => branches.includes(branch));
      const added = branches.filter((branch) => !current.includes(branch));
      return [...valid, ...added];
    });
  }, [branches]);

  const activeDefinition =
    reportDefinitions.find((definition) => definition.key === activeReport) ??
    reportDefinitions[0]!;
  const activeGroup = activeDefinition.group;
  const validPeriod = Boolean(dateFrom && dateTo && dateFrom <= dateTo);
  const allBranchesSelected = selectedBranches.length === branches.length;
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const selectedCustomer =
    clients.find((client) => client.id === selectedCustomerId) ?? null;

  const openCustomerFromRow = (row: DetailRow) => {
    const ticket = tickets.find((candidate) => candidate.id === row.Folio);
    const customerName = String(row.Cliente ?? "");
    const customer = clients.find(
      (client) =>
        (ticket?.clientPhone && client.phone === ticket.clientPhone) ||
        `${client.firstName} ${client.lastName}`.trim() === customerName ||
        client.registrationFolio === row.Folio,
    );
    if (!customer) {
      toast.info("No se encontró el expediente activo de esta clienta.");
      return;
    }
    setSelectedCustomerId(customer.id);
    setCustomerDialogOpen(true);
  };

  const selectReportGroup = (group: ReportGroup) => {
    const defaultReport = group.items[0];
    if (defaultReport) setActiveReport(defaultReport.key);
    setOpenGroup(group.key);
  };

  const selectReport = (definition: ReportDefinition, group: ReportGroupKey) => {
    setActiveReport(definition.key);
    setOpenGroup(group);
  };

  const toggleBranch = (branch: string) => {
    setSelectedBranches((current) => {
      if (current.includes(branch)) {
        if (current.length === 1) {
          toast.info("El reporte necesita al menos una sucursal.");
          return current;
        }
        return current.filter((item) => item !== branch);
      }
      return [...current, branch];
    });
  };

  const ticketBranch = (ticket: Ticket) =>
    ticket.branchName ?? receiptSettings.branchName;
  const isTicketInScope = (ticket: Ticket, from = dateFrom, to = dateTo) =>
    ticket.status === "COMPLETED" &&
    ticket.ticketType !== "LAYAWAY_PAYMENT" &&
    getBusinessDate(ticket.createdAtIso) >= from &&
    getBusinessDate(ticket.createdAtIso) <= to &&
    selectedBranches.includes(ticketBranch(ticket)) &&
    (sellerId === "ALL" ||
      ticket.sellerSales.some((sale) => sale.sellerId === sellerId)) &&
    (paymentMethodId === "ALL" ||
      ticket.payments.some((payment) => payment.methodId === paymentMethodId));

  const filteredTickets = useMemo(
    () => (validPeriod ? tickets.filter((ticket) => isTicketInScope(ticket)) : []),
    // The filters are intentionally grouped into one reporting scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      dateFrom,
      dateTo,
      paymentMethodId,
      receiptSettings.branchName,
      selectedBranches,
      sellerId,
      tickets,
      validPeriod,
    ],
  );

  const filteredExpenses = useMemo(
    () =>
      validPeriod
        ? expenses.filter(
            (expense) =>
              expense.expenseDate >= dateFrom &&
              expense.expenseDate <= dateTo &&
              selectedBranches.includes(expense.branch) &&
              (sellerId === "ALL" || expense.sellerId === sellerId) &&
              (expenseTypeId === "ALL" || expense.typeId === expenseTypeId),
          )
        : [],
    [
      dateFrom,
      dateTo,
      expenseTypeId,
      expenses,
      selectedBranches,
      sellerId,
      validPeriod,
    ],
  );

  const filteredMovements = useMemo(
    () =>
      validPeriod
        ? movements.filter((movement) => {
            const date = getBusinessDate(movement.createdAtIso);
            const matchesBranch =
              selectedBranches.includes(movement.sourceBranch) ||
              Boolean(
                movement.destinationBranch &&
                  selectedBranches.includes(movement.destinationBranch),
              );
            const product = productById.get(movement.productId);
            const matchesKind =
              productKind === "ALL" || product?.kind === productKind;
            return (
              date >= dateFrom && date <= dateTo && matchesBranch && matchesKind
            );
          })
        : [],
    [
      dateFrom,
      dateTo,
      movements,
      productById,
      productKind,
      selectedBranches,
      validPeriod,
    ],
  );

  const saleLines = useMemo(
    () =>
      filteredTickets.flatMap((ticket) => {
        const discountRatio =
          ticket.subtotal > 0 ? ticket.total / ticket.subtotal : 1;
        const ticketTax = getTicketTaxSummary(ticket);
        return ticket.products.flatMap((line) => {
          const product = productById.get(line.productId);
          if (productKind !== "ALL" && product?.kind !== productKind) return [];
          const gross = roundCurrency(line.total * discountRatio);
          const net =
            typeof line.netTotal === "number"
              ? line.netTotal
              : ticket.total > 0
                ? roundCurrency(gross * (ticketTax.net / ticket.total))
                : 0;
          const cost = roundCurrency((product?.costMxn ?? 0) * line.quantity);
          return [
            {
              ticket,
              product,
              productId: line.productId,
              name: line.name,
              quantity: line.quantity,
              gross,
              net,
              vat: roundCurrency(gross - net),
              cost,
              profit: roundCurrency(net - cost),
            },
          ];
        });
      }),
    [filteredTickets, productById, productKind],
  );

  const salesTotal = filteredTickets.reduce(
    (sum, ticket) => sum + ticket.total,
    0,
  );
  const netSales = filteredTickets.reduce(
    (sum, ticket) => sum + getTicketTaxSummary(ticket).net,
    0,
  );
  const vatTotal = filteredTickets.reduce(
    (sum, ticket) => sum + getTicketTaxSummary(ticket).vat,
    0,
  );
  const collectedTotal = filteredTickets.reduce(
    (sum, ticket) =>
      sum + ticket.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0),
    0,
  );
  const cashIncomeTotal = filteredTickets.reduce(
    (sum, ticket) =>
      sum +
      ticket.payments
        .filter(
          (payment) =>
            paymentMethodId === "ALL" || payment.methodId === paymentMethodId,
        )
        .reduce((paymentSum, payment) => paymentSum + payment.amount, 0),
    0,
  );
  const cashIncomeTicketCount = filteredTickets.filter((ticket) =>
    ticket.payments.some(
      (payment) =>
        payment.amount > 0 &&
        (paymentMethodId === "ALL" || payment.methodId === paymentMethodId),
    ),
  ).length;
  const discountTotal = filteredTickets.reduce(
    (sum, ticket) => sum + ticket.discountAmount,
    0,
  );
  const pendingTotal = filteredTickets.reduce(
    (sum, ticket) => sum + ticket.balanceDue,
    0,
  );
  const totalSpare = filteredTickets.reduce(
    (sum, ticket) => sum + getTicketSpare(ticket, products),
    0,
  );
  const costOfGoods = saleLines.reduce((sum, line) => sum + line.cost, 0);
  const grossProfit = netSales - costOfGoods;
  const marginRate = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
  const unitsSold = saleLines.reduce((sum, line) => sum + line.quantity, 0);
  const averageTicket =
    filteredTickets.length > 0 ? salesTotal / filteredTickets.length : 0;
  const activeExpenses = filteredExpenses.filter(
    (expense) => expense.status === "ACTIVE",
  );
  const expenseTotal = activeExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const cashFlowNet = cashIncomeTotal - expenseTotal;
  const averageExpense =
    activeExpenses.length > 0 ? expenseTotal / activeExpenses.length : 0;

  const previousSales = useMemo(() => {
    if (!validPeriod || !comparePrevious) return 0;
    const start = new Date(`${dateFrom}T12:00:00`);
    const end = new Date(`${dateTo}T12:00:00`);
    const days = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
    );
    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - days + 1);
    const from = inputDate(previousStart);
    const to = inputDate(previousEnd);
    return tickets
      .filter((ticket) => isTicketInScope(ticket, from, to))
      .reduce((sum, ticket) => sum + ticket.total, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    comparePrevious,
    dateFrom,
    dateTo,
    paymentMethodId,
    selectedBranches,
    sellerId,
    tickets,
    validPeriod,
  ]);
  const salesChange =
    previousSales > 0 ? ((salesTotal - previousSales) / previousSales) * 100 : 0;

  const productSummary = useMemo(() => {
    const summary = new Map<
      string,
      {
        productId: string;
        name: string;
        sku: string;
        family: string;
        kind: string;
        units: number;
        gross: number;
        net: number;
        vat: number;
        cost: number;
        profit: number;
      }
    >();
    saleLines.forEach((line) => {
      const current = summary.get(line.productId) ?? {
        productId: line.productId,
        name: line.name,
        sku: line.product?.sku ?? "HISTÓRICO",
        family: line.product?.family ?? "Histórico",
        kind: line.product?.kind === "SERVICE" ? "Servicio" : "Producto",
        units: 0,
        gross: 0,
        net: 0,
        vat: 0,
        cost: 0,
        profit: 0,
      };
      summary.set(line.productId, {
        ...current,
        units: current.units + line.quantity,
        gross: current.gross + line.gross,
        net: current.net + line.net,
        vat: current.vat + line.vat,
        cost: current.cost + line.cost,
        profit: current.profit + line.profit,
      });
    });
    return Array.from(summary.values()).sort((left, right) => right.units - left.units);
  }, [saleLines]);

  const employeeSummary = useMemo(
    () =>
      sellers
        .filter((seller) => sellerId === "ALL" || seller.id === sellerId)
        .map((seller) => {
          const sellerTickets = filteredTickets.filter((ticket) =>
            ticket.sellerSales.some((sale) => sale.sellerId === seller.id),
          );
          const allocatedSales = sellerTickets.reduce(
            (sum, ticket) =>
              sum +
              ticket.sellerSales
                .filter((sale) => sale.sellerId === seller.id)
                .reduce((saleSum, sale) => saleSum + sale.amount, 0),
            0,
          );
          const days = new Set(
            sellerTickets.map((ticket) => getBusinessDate(ticket.createdAtIso)),
          ).size;
          const clientsServed = new Set(
            sellerTickets.map((ticket) => ticket.clientPhone || ticket.clientName),
          ).size;
          const largestTicket = Math.max(0, ...sellerTickets.map((ticket) => ticket.total));
          const sellerUnits = sellerTickets.reduce(
            (sum, ticket) =>
              sum + ticket.products.reduce((lineSum, line) => lineSum + line.quantity, 0),
            0,
          );
          const sellerDiscounts = sellerTickets.reduce(
            (sum, ticket) => sum + ticket.discountAmount,
            0,
          );
          return {
            id: seller.id,
            name: seller.name,
            active: seller.active,
            tickets: sellerTickets.length,
            sales: allocatedSales,
            days,
            clients: clientsServed,
            largestTicket,
            averageTicket:
              sellerTickets.length > 0 ? allocatedSales / sellerTickets.length : 0,
            unitsPerTicket:
              sellerTickets.length > 0 ? sellerUnits / sellerTickets.length : 0,
            discounts: sellerDiscounts,
          };
        })
        .sort((left, right) => right.sales - left.sales),
    [filteredTickets, sellerId, sellers],
  );

  const merchandiseSummary = useMemo(
    () =>
      products
        .filter((product) => productKind === "ALL" || product.kind === productKind)
        .map((product) => {
          const sold = productSummary.find((item) => item.productId === product.id);
          const productMovements = filteredMovements.filter(
            (movement) => movement.productId === product.id,
          );
          const additions = productMovements
            .filter((movement) => movement.direction === "ADD")
            .reduce((sum, movement) => sum + movement.quantity, 0);
          const removals = productMovements
            .filter(
              (movement) =>
                movement.direction === "REMOVE" && movement.category !== "SALE",
            )
            .reduce((sum, movement) => sum + movement.quantity, 0);
          const transfers = productMovements
            .filter((movement) => movement.direction === "TRANSFER")
            .reduce((sum, movement) => sum + movement.quantity, 0);
          const totalStock = selectedBranches
            .filter((branch) => product.branches.includes(branch))
            .reduce(
              (sum, branch) =>
                sum + (branchInventory[branch]?.[product.id] ?? 0),
              0,
            );
          const demand = sold?.units ?? 0;
          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            family: product.family,
            kind: product.kind === "SERVICE" ? "Servicio" : "Producto",
            stock: product.kind === "SERVICE" ? 0 : Math.round(totalStock),
            additions,
            removals,
            transfers,
            unitsSold: demand,
            sales: sold?.net ?? 0,
            cost: sold?.cost ?? 0,
            profit: sold?.profit ?? 0,
            margin: sold && sold.net > 0 ? (sold.profit / sold.net) * 100 : 0,
            demand:
              demand >= 5 ? "Alta" : demand >= 2 ? "Media" : "Baja",
          };
        })
        .sort((left, right) => right.unitsSold - left.unitsSold),
    [
      branchInventory,
      filteredMovements,
      productKind,
      productSummary,
      products,
      selectedBranches,
    ],
  );

  const customerSummary = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return clients
      .map((client) => {
        const customerTickets = filteredTickets.filter(
          (ticket) =>
            (client.phone && ticket.clientPhone === client.phone) ||
            ticket.clientName === `${client.firstName} ${client.lastName}`,
        );
        const customerAppointments = appointments.filter((appointment) => {
          const date = getBusinessDate(appointment.recordedAtIso);
          return (
            appointment.clientId === client.id &&
            date >= dateFrom &&
            date <= dateTo &&
            selectedBranches.includes(appointment.branch)
          );
        });
        const total = customerTickets.reduce((sum, ticket) => sum + ticket.total, 0);
        const pending = customerTickets.reduce(
          (sum, ticket) => sum + ticket.balanceDue,
          0,
        );
        return {
          id: client.id,
          folio: client.registrationFolio,
          name: `${client.firstName} ${client.lastName}`,
          phone: client.phone,
          source: client.sourceLabel,
          branch: client.registrationBranch ?? "Sin sucursal",
          owner:
            sellers.find((seller) => seller.id === client.ownerId)?.name ??
            "Cartera empresa",
          visits: customerTickets.length,
          total,
          average: customerTickets.length > 0 ? total / customerTickets.length : 0,
          pending,
          appointments: customerAppointments.length,
          isNew:
            getBusinessDate(client.registeredAtIso) >= dateFrom &&
            getBusinessDate(client.registeredAtIso) <= dateTo &&
            (!client.registrationBranch ||
              selectedBranches.includes(client.registrationBranch)),
        };
      })
      .filter((client) =>
        query
          ? [client.name, client.phone, client.folio, client.source, client.owner].some(
              (value) => value.toLocaleLowerCase("es-MX").includes(query),
            )
          : true,
      )
      .filter((client) =>
        activeGroup === "CUSTOMER" ? client.visits > 0 || client.isNew : true,
      )
      .sort((left, right) => right.total - left.total);
  }, [
    activeGroup,
    appointments,
    clients,
    dateFrom,
    dateTo,
    filteredTickets,
    search,
    selectedBranches,
    sellers,
  ]);

  const movementAdditions = filteredMovements
    .filter((movement) => movement.direction === "ADD")
    .reduce((sum, movement) => sum + movement.quantity, 0);
  const movementRemovals = filteredMovements
    .filter((movement) => movement.direction === "REMOVE")
    .reduce((sum, movement) => sum + movement.quantity, 0);
  const movementTransfers = filteredMovements
    .filter((movement) => movement.direction === "TRANSFER")
    .reduce((sum, movement) => sum + movement.quantity, 0);
  const writeOffCost = filteredMovements
    .filter(
      (movement) =>
        movement.direction === "REMOVE" && movement.category !== "SALE",
    )
    .reduce((sum, movement) => sum + movement.totalCostMxn, 0);
  const newCustomers = customerSummary.filter((client) => client.isNew).length;
  const repeatCustomers = customerSummary.filter((client) => client.visits > 1).length;
  const repeatRate =
    customerSummary.length > 0
      ? (repeatCustomers / customerSummary.length) * 100
      : 0;

  const rawMetrics: MetricDefinition[] = (() => {
    if (activeReport === "CASH_MOVEMENTS") {
      return [
        {
          label: "INGRESOS COBRADOS",
          value: formatCurrency(cashIncomeTotal),
          detail: `${cashIncomeTicketCount} tickets con cobro`,
          tone: "positive",
        },
        {
          label: "GASTOS VIGENTES",
          value: formatCurrency(expenseTotal),
          detail: `${activeExpenses.length} movimientos autorizados`,
          tone: expenseTotal > 0 ? "negative" : "neutral",
        },
        {
          label: "FLUJO NETO",
          value: formatCurrency(cashFlowNet),
          detail: "Ingresos cobrados menos gastos vigentes",
          tone: cashFlowNet >= 0 ? "positive" : "negative",
        },
        {
          label: "GASTO PROMEDIO",
          value: formatCurrency(averageExpense),
          detail: "Promedio por folio vigente",
        },
        {
          label: "MOVIMIENTOS ANULADOS",
          value: compactNumber(
            filteredExpenses.filter((expense) => expense.status === "VOIDED").length,
          ),
          detail: "Visibles para auditoría · impacto $0.00",
        },
        {
          label: "SALDO PENDIENTE",
          value: formatCurrency(pendingTotal),
          detail: "Cobros aún no recibidos",
          tone: pendingTotal > 0 ? "negative" : "neutral",
        },
      ];
    }
    if (activeGroup === "MERCHANDISE") {
      return [
        {
          label: "UNIDADES VENDIDAS",
          value: compactNumber(unitsSold),
          detail: `${productSummary.length} artículos con movimiento`,
        },
        {
          label: "COSTO VENDIDO",
          value: formatCurrency(costOfGoods),
          detail: "Costo MXN registrado",
        },
        {
          label: "UTILIDAD BRUTA",
          value: formatCurrency(grossProfit),
          detail: `${percentage(marginRate)} sobre venta sin IVA`,
          tone: grossProfit >= 0 ? "positive" : "negative",
        },
        {
          label: "ENTRADAS",
          value: compactNumber(movementAdditions),
          detail: "Unidades sumadas al inventario",
        },
        {
          label: "BAJAS / SALIDAS",
          value: compactNumber(movementRemovals),
          detail: `${formatCurrency(writeOffCost)} de costo`,
          tone: movementRemovals > 0 ? "negative" : "neutral",
        },
        {
          label: "TRANSFERENCIAS",
          value: compactNumber(movementTransfers),
          detail: "Unidades entre sucursales",
        },
      ];
    }
    if (activeGroup === "EMPLOYEE") {
      const leader = employeeSummary[0];
      return [
        {
          label: "VENTA ATRIBUIDA",
          value: formatCurrency(employeeSummary.reduce((sum, employee) => sum + employee.sales, 0)),
          detail: `${employeeSummary.length} vendedores analizados`,
        },
        {
          label: "LÍDER DEL PERIODO",
          value: leader?.name ?? "Sin ventas",
          detail: leader ? formatCurrency(leader.sales) : "Sin actividad",
          tone: "positive",
        },
        {
          label: "MAYOR TICKET",
          value: formatCurrency(Math.max(0, ...employeeSummary.map((employee) => employee.largestTicket))),
          detail: "Ticket completo atendido",
        },
        {
          label: "TICKET PROMEDIO",
          value: formatCurrency(averageTicket),
          detail: `${filteredTickets.length} operaciones`,
        },
        {
          label: "DÍAS CON VENTA",
          value: compactNumber(Math.max(0, ...employeeSummary.map((employee) => employee.days))),
          detail: "Máximo individual del periodo",
        },
        {
          label: "CLIENTES ATENDIDOS",
          value: compactNumber(new Set(filteredTickets.map((ticket) => ticket.clientPhone || ticket.clientName)).size),
          detail: "Clientes únicos",
        },
      ];
    }
    if (activeGroup === "CUSTOMER") {
      return [
        {
          label: "CLIENTES EN PERIODO",
          value: compactNumber(customerSummary.length),
          detail: `${newCustomers} registros nuevos`,
        },
        {
          label: "TASA DE RECURRENCIA",
          value: percentage(repeatRate),
          detail: `${repeatCustomers} clientes con más de una visita`,
          tone: repeatRate >= 35 ? "positive" : "neutral",
        },
        {
          label: "VALOR PROMEDIO",
          value: formatCurrency(customerSummary.length > 0 ? customerSummary.reduce((sum, client) => sum + client.total, 0) / customerSummary.length : 0),
          detail: "Compra por cliente",
        },
        {
          label: "VISITAS PROMEDIO",
          value: compactNumber(customerSummary.length > 0 ? customerSummary.reduce((sum, client) => sum + client.visits, 0) / customerSummary.length : 0),
          detail: "Tickets por cliente",
        },
        {
          label: "SALDO PENDIENTE",
          value: formatCurrency(customerSummary.reduce((sum, client) => sum + client.pending, 0)),
          detail: "Apartados y pendientes de cobro",
          tone: "negative",
        },
        {
          label: "CITAS REGISTRADAS",
          value: compactNumber(customerSummary.reduce((sum, client) => sum + client.appointments, 0)),
          detail: "Cortesías y próximas sesiones",
        },
      ];
    }
    const leaderProduct = productSummary[0];
    return [
      {
        label: "VENTA COMPLETA",
        value: formatCurrency(salesTotal),
        detail: `${comparePrevious ? `${salesChange >= 0 ? "+" : ""}${percentage(salesChange)} vs periodo anterior` : "Comparación desactivada"}`,
        tone: salesChange > 0 ? "positive" : salesChange < 0 ? "negative" : "neutral",
      },
      {
        label: "VENTA SIN IVA",
        value: formatCurrency(netSales),
        detail: `${formatCurrency(vatTotal)} de IVA incluido`,
      },
      {
        label: "TICKET PROMEDIO",
        value: formatCurrency(averageTicket),
        detail: `${filteredTickets.length} tickets`,
      },
      {
        label: "COBRADO",
        value: formatCurrency(collectedTotal),
        detail: `${formatCurrency(pendingTotal)} pendiente`,
        tone: "positive",
      },
      {
        label: "DESCUENTOS",
        value: formatCurrency(discountTotal),
        detail: `${percentage(salesTotal + discountTotal > 0 ? (discountTotal / (salesTotal + discountTotal)) * 100 : 0)} de venta previa`,
        tone: discountTotal > 0 ? "negative" : "neutral",
      },
      {
        label: "SPARE DEL PERIODO",
        value: formatCurrency(totalSpare),
        detail: "Diferencia acumulada entre precio máximo y mínimo",
        tone: "positive",
      },
      {
        label: "PRODUCTO LÍDER",
        value: leaderProduct?.name ?? "Sin ventas",
        detail: leaderProduct ? `${leaderProduct.units} unidades · ${formatCurrency(leaderProduct.gross)}` : "Sin actividad",
      },
    ];
  })();
  const metrics = canViewCosts
    ? rawMetrics
    : rawMetrics
        .filter((metric) => !/costo|utilidad|margen/i.test(metric.label))
        .map((metric) =>
          metric.label === "BAJAS / SALIDAS"
            ? { ...metric, detail: "Unidades descontadas del inventario" }
            : metric,
        );

  const trendRows = useMemo(() => {
    const map = new Map<string, number>();
    filteredTickets.forEach((ticket) => {
      const date = getBusinessDate(ticket.createdAtIso);
      const ticketCollected = ticket.payments.reduce(
        (sum, payment) =>
          sum +
          (paymentMethodId === "ALL" || payment.methodId === paymentMethodId
            ? payment.amount
            : 0),
        0,
      );
      map.set(
        date,
        (map.get(date) ?? 0) +
          (activeReport === "CASH_MOVEMENTS" ? ticketCollected : ticket.total),
      );
    });
    if (activeReport === "CASH_MOVEMENTS") {
      activeExpenses.forEach((expense) => {
        map.set(
          expense.expenseDate,
          (map.get(expense.expenseDate) ?? 0) - expense.amount,
        );
      });
    }
    return Array.from(map, ([label, value]) => ({ label, value })).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [activeExpenses, activeReport, filteredTickets, paymentMethodId]);

  const distributionRows = useMemo(() => {
    if (activeReport === "CASH_MOVEMENTS") {
      const typeMap = new Map<string, number>();
      activeExpenses.forEach((expense) =>
        typeMap.set(
          expense.typeName,
          (typeMap.get(expense.typeName) ?? 0) + expense.amount,
        ),
      );
      return Array.from(typeMap, ([label, value]) => ({ label, value })).sort(
        (left, right) => right.value - left.value,
      );
    }
    if (activeGroup === "MERCHANDISE") {
      return [
        { label: "Entradas", value: movementAdditions },
        { label: "Bajas / salidas", value: movementRemovals },
        { label: "Transferencias", value: movementTransfers },
      ];
    }
    if (activeGroup === "EMPLOYEE") {
      return employeeSummary.slice(0, 7).map((employee) => ({
        label: employee.name,
        value: employee.sales,
      }));
    }
    if (activeGroup === "CUSTOMER") {
      const sourceMap = new Map<string, number>();
      customerSummary.forEach((client) =>
        sourceMap.set(client.source, (sourceMap.get(client.source) ?? 0) + 1),
      );
      return Array.from(sourceMap, ([label, value]) => ({ label, value })).sort(
        (left, right) => right.value - left.value,
      );
    }
    return paymentMethods
      .map((method) => ({
        label: method.label,
        value: filteredTickets.reduce(
          (sum, ticket) =>
            sum +
            ticket.payments
              .filter((payment) => payment.methodId === method.id)
              .reduce((paymentSum, payment) => paymentSum + payment.amount, 0),
          0,
        ),
      }))
      .filter((item) => item.value > 0);
  }, [
    activeGroup,
    activeExpenses,
    activeReport,
    customerSummary,
    employeeSummary,
    filteredTickets,
    movementAdditions,
    movementRemovals,
    movementTransfers,
    paymentMethods,
  ]);

  const rawDetailRows: DetailRow[] = useMemo(() => {
    if (activeReport === "CASH_MOVEMENTS") {
      const incomeRows = filteredTickets.flatMap((ticket) =>
        ticket.payments
          .filter(
            (payment) =>
              paymentMethodId === "ALL" || payment.methodId === paymentMethodId,
          )
          .map((payment) => ({
            sortAt: ticket.createdAtIso,
            row: {
              Fecha: getBusinessDate(ticket.createdAtIso),
              Folio: ticket.id,
              Movimiento: "INGRESO",
              Tipo:
                paymentMethods.find((method) => method.id === payment.methodId)
                  ?.label ?? payment.methodId,
              Usuario: ticket.sellerSummary,
              Sucursal: ticketBranch(ticket),
              Concepto: `Cobro de ticket · ${ticket.clientName}`,
              Monto: roundCurrency(payment.amount),
              Impacto: roundCurrency(payment.amount),
              Estado: "VIGENTE",
              Autorización: "Cobro registrado en ticket",
              Comentario: "—",
            } satisfies DetailRow,
          })),
      );
      const expenseRows = filteredExpenses.map((expense) => ({
        sortAt: expense.createdAtIso,
        row: {
          Fecha: expense.expenseDate,
          Folio: expense.folio,
          Movimiento: "GASTO",
          Tipo: expense.typeName,
          Usuario: expense.sellerName,
          Sucursal: expense.branch,
          Concepto: expense.concept,
          Monto: roundCurrency(expense.amount),
          Impacto:
            expense.status === "ACTIVE" ? roundCurrency(-expense.amount) : 0,
          Estado: expense.status === "ACTIVE" ? "VIGENTE" : "ANULADO",
          Autorización: expense.authorizedBy,
          Comentario: expense.comment || "—",
        } satisfies DetailRow,
      }));
      return [...incomeRows, ...expenseRows]
        .sort((left, right) => right.sortAt.localeCompare(left.sortAt))
        .map((item) => item.row);
    }
    if (activeReport === "SALES_DETAIL") {
      return filteredTickets.map((ticket) => {
        const tax = getTicketTaxSummary(ticket);
        return {
          Fecha: getBusinessDate(ticket.createdAtIso),
          Folio: ticket.id,
          Sucursal: ticketBranch(ticket),
          Cliente: ticket.clientName,
          Vendedor: ticket.sellerSummary,
          Productos: ticket.products.reduce((sum, line) => sum + line.quantity, 0),
          "Precio completo": ticket.total,
          "Precio sin IVA": tax.net,
          IVA: tax.vat,
          SPARE: roundCurrency(getTicketSpare(ticket, products)),
          Descuento: ticket.discountAmount,
          Cobrado: ticket.amountPaid,
          Saldo: ticket.balanceDue,
          "Forma de pago": ticket.payments
            .map(
              (payment) =>
                paymentMethods.find((method) => method.id === payment.methodId)?.label ??
                payment.methodId,
            )
            .join(" / "),
        };
      });
    }
    if (activeReport === "SOLD_PRODUCTS") {
      return productSummary.map((product) => ({
        SKU: product.sku,
        Producto: product.name,
        Familia: product.family,
        Tipo: product.kind,
        Unidades: product.units,
        "Precio completo": roundCurrency(product.gross),
        "Precio sin IVA": roundCurrency(product.net),
        IVA: roundCurrency(product.vat),
        "Spare unitario": roundCurrency(
          getProductSpare(productById.get(product.productId) ?? { minPrice: 0, maxPrice: 0 }),
        ),
        "Spare total": roundCurrency(
          getProductSpare(productById.get(product.productId) ?? { minPrice: 0, maxPrice: 0 }) *
            product.units,
        ),
        Costo: roundCurrency(product.cost),
        Utilidad: roundCurrency(product.profit),
        Margen: percentage(product.net > 0 ? (product.profit / product.net) * 100 : 0),
        Participación: percentage(unitsSold > 0 ? (product.units / unitsSold) * 100 : 0),
      }));
    }
    if (activeReport === "SALES_BY_EMPLOYEE" || activeGroup === "EMPLOYEE") {
      return employeeSummary.map((employee) => ({
        Vendedor: employee.name,
        Estatus: employee.active ? "Activo" : "Baja",
        Venta: roundCurrency(employee.sales),
        Tickets: employee.tickets,
        "Días con venta": employee.days,
        "Mayor ticket": roundCurrency(employee.largestTicket),
        "Ticket promedio": roundCurrency(employee.averageTicket),
        "Artículos / ticket": compactNumber(employee.unitsPerTicket),
        Clientes: employee.clients,
        Descuentos: roundCurrency(employee.discounts),
        Participación: percentage(salesTotal > 0 ? (employee.sales / salesTotal) * 100 : 0),
      }));
    }
    if (activeReport === "MERCHANDISE_MOVEMENTS") {
      return filteredMovements.map((movement) => ({
        Fecha: getBusinessDate(movement.createdAtIso),
        Folio: movement.folio,
        Producto: movement.productName,
        Tipo:
          movement.direction === "ADD"
            ? "Entrada"
            : movement.direction === "TRANSFER"
              ? "Transferencia"
              : "Baja / salida",
        Origen: movement.sourceBranch,
        Destino: movement.destinationBranch ?? "—",
        Cantidad: movement.quantity,
        Existencia: `${movement.previousStock} → ${movement.newStock}`,
        Motivo: movement.reason,
        "Costo unitario": movement.unitCostMxn,
        "Costo total": movement.totalCostMxn,
      }));
    }
    if (activeGroup === "MERCHANDISE") {
      return merchandiseSummary.map((product) => ({
        SKU: product.sku,
        Producto: product.name,
        Familia: product.family,
        Tipo: product.kind,
        Existencia: product.stock,
        Entradas: product.additions,
        Bajas: product.removals,
        Transferencias: product.transfers,
        Vendidos: product.unitsSold,
        "Venta sin IVA": roundCurrency(product.sales),
        "Spare unitario": roundCurrency(
          getProductSpare(productById.get(product.id) ?? { minPrice: 0, maxPrice: 0 }),
        ),
        "Spare total": roundCurrency(
          getProductSpare(productById.get(product.id) ?? { minPrice: 0, maxPrice: 0 }) *
            product.unitsSold,
        ),
        Costo: roundCurrency(product.cost),
        Utilidad: roundCurrency(product.profit),
        Margen: percentage(product.margin),
        Demanda: product.demand,
      }));
    }
    return customerSummary.map((client) => ({
      Folio: client.folio,
      Cliente: client.name,
      Teléfono: client.phone,
      Procedencia: client.source,
      Sucursal: client.branch,
      Propietario: client.owner,
      Visitas: client.visits,
      "Compra total": roundCurrency(client.total),
      "Ticket promedio": roundCurrency(client.average),
      Saldo: roundCurrency(client.pending),
      Citas: client.appointments,
      Segmento:
        client.total >= 3000
          ? "VIP"
          : client.visits > 1
            ? "Recurrente"
            : client.isNew
              ? "Nuevo"
              : "Ocasional",
    }));
  }, [
    activeGroup,
    activeReport,
    customerSummary,
    employeeSummary,
    filteredExpenses,
    filteredMovements,
    filteredTickets,
    paymentMethodId,
    paymentMethods,
    productById,
    productSummary,
    products,
    receiptSettings.branchName,
    salesTotal,
    unitsSold,
  ]);

  const detailRows = useMemo(
    () =>
      canViewCosts
        ? rawDetailRows
        : rawDetailRows.map((row) =>
            Object.fromEntries(
              Object.entries(row).filter(
                ([column]) => !/costo|utilidad|margen/i.test(column),
              ),
            ) as DetailRow,
          ),
    [canViewCosts, rawDetailRows],
  );

  const searchedDetailRows = useMemo(() => {
    if (activeGroup === "CUSTOMER" || !search.trim()) return detailRows;
    const query = search.trim().toLocaleLowerCase("es-MX");
    return detailRows.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLocaleLowerCase("es-MX").includes(query),
      ),
    );
  }, [activeGroup, detailRows, search]);
  const detailPagination = useHistoryPagination(
    searchedDetailRows,
    `${activeReport}|${dateFrom}|${dateTo}|${selectedBranches.join(",")}|${sellerId}|${paymentMethodId}|${expenseTypeId}|${productKind}|${search}`,
  );

  const detailColumns = Object.keys(searchedDetailRows[0] ?? detailRows[0] ?? {});
  const maxTrend = Math.max(1, ...trendRows.map((item) => item.value));
  const maxDistribution = Math.max(1, ...distributionRows.map((item) => item.value));
  const topDemand = merchandiseSummary.slice(0, 6);
  const lowDemand = [...merchandiseSummary]
    .filter((product) => product.kind === "Producto")
    .sort((left, right) => left.unitsSold - right.unitsSold)
    .slice(0, 6);

  const summaryExportRows: DetailRow[] =
    activeReport === "CASH_MOVEMENTS"
      ? [
          { Concepto: "Reporte", Valor: activeDefinition.label },
          { Concepto: "Periodo", Valor: `${dateFrom} al ${dateTo}` },
          {
            Concepto: "Sucursales",
            Valor: allBranchesSelected
              ? "Empresa general"
              : selectedBranches.join(" / "),
          },
          { Concepto: "Ingresos cobrados", Valor: roundCurrency(cashIncomeTotal) },
          { Concepto: "Gastos vigentes", Valor: roundCurrency(expenseTotal) },
          { Concepto: "Flujo neto", Valor: roundCurrency(cashFlowNet) },
          { Concepto: "Gasto promedio", Valor: roundCurrency(averageExpense) },
          { Concepto: "Gastos anulados", Valor: filteredExpenses.filter((expense) => expense.status === "VOIDED").length },
          { Concepto: "Saldo pendiente", Valor: roundCurrency(pendingTotal) },
          { Concepto: "Registros detallados", Valor: searchedDetailRows.length },
        ]
      : [
          { Concepto: "Reporte", Valor: activeDefinition.label },
          { Concepto: "Periodo", Valor: `${dateFrom} al ${dateTo}` },
          {
            Concepto: "Sucursales",
            Valor: allBranchesSelected
              ? "Empresa general"
              : selectedBranches.join(" / "),
          },
          { Concepto: "Venta completa", Valor: roundCurrency(salesTotal) },
          { Concepto: "Venta sin IVA", Valor: roundCurrency(netSales) },
          { Concepto: "IVA incluido", Valor: roundCurrency(vatTotal) },
          ...(canViewCosts ? [
            { Concepto: "Costo vendido", Valor: roundCurrency(costOfGoods) },
            { Concepto: "Utilidad bruta", Valor: roundCurrency(grossProfit) },
            { Concepto: "Margen", Valor: percentage(marginRate) },
          ] : []),
          { Concepto: "SPARE", Valor: roundCurrency(totalSpare) },
          { Concepto: "Registros detallados", Valor: searchedDetailRows.length },
        ];

  const exportFilename = `reporte-${slugify(activeDefinition.label)}-${dateFrom}-${dateTo}`;

  const exportExcel = async () => {
    if (!validPeriod) return;
    setExporting("EXCEL");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.json_to_sheet(summaryExportRows);
      const detailSheet = XLSX.utils.json_to_sheet(
        searchedDetailRows.length > 0
          ? searchedDetailRows
          : [{ Resultado: "Sin operaciones para los filtros seleccionados" }],
      );
      if (detailSheet["!ref"])
        detailSheet["!autofilter"] = { ref: detailSheet["!ref"] };
      summarySheet["!cols"] = [{ wch: 26 }, { wch: 36 }];
      detailSheet["!cols"] = detailColumns.map(() => ({ wch: 21 }));
      detailColumns.forEach((column, columnIndex) => {
        searchedDetailRows.forEach((_, rowIndex) => {
          const address = XLSX.utils.encode_cell({
            r: rowIndex + 1,
            c: columnIndex,
          });
          const cell = detailSheet[address];
          if (cell?.t === "n") {
            cell.z = isCurrencyColumn(column) ? "$#,##0.00" : "0.##";
          }
        });
      });
      summaryExportRows.forEach((row, rowIndex) => {
        const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: 1 });
        const cell = summarySheet[address];
        const concept = String(row.Concepto ?? "");
        if (
          cell?.t === "n" &&
          /venta|iva|costo|utilidad|spare|ingreso|gasto|flujo|saldo/i.test(concept)
        ) {
          cell.z = "$#,##0.00";
        }
      });
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen ejecutivo");
      XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle");
      XLSX.writeFile(workbook, `${exportFilename}.xlsx`, { compression: true });
      toast.success("Reporte ejecutivo descargado en Excel.");
    } catch {
      toast.error("No fue posible generar el archivo Excel.");
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    if (!validPeriod) return;
    setExporting("PDF");
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setTextColor(40, 33, 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(receiptSettings.companyName.toLocaleUpperCase("es-MX"), 36, 36);
      doc.setFontSize(14);
      doc.text(activeDefinition.label.toLocaleUpperCase("es-MX"), 36, 57);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(
        `${dateFrom} al ${dateTo} · ${allBranchesSelected ? "Empresa general" : selectedBranches.join(" / ")}`,
        36,
        74,
      );
      doc.setDrawColor(174, 139, 104);
      doc.line(36, 86, doc.internal.pageSize.getWidth() - 36, 86);
      const pdfSummaryHead =
        activeReport === "CASH_MOVEMENTS"
          ? ["Ingresos", "Gastos", "Flujo neto", "Gasto promedio", "Anulados", "Saldo pendiente", "Registros"]
          : ["Venta completa", "Sin IVA", "IVA", ...(canViewCosts ? ["Costo", "Utilidad", "Margen"] : []), "SPARE", "Registros"];
      const pdfSummaryBody =
        activeReport === "CASH_MOVEMENTS"
          ? [
              formatCurrency(cashIncomeTotal),
              formatCurrency(expenseTotal),
              formatCurrency(cashFlowNet),
              formatCurrency(averageExpense),
              filteredExpenses.filter((expense) => expense.status === "VOIDED").length,
              formatCurrency(pendingTotal),
              searchedDetailRows.length,
            ]
          : [
              formatCurrency(salesTotal),
              formatCurrency(netSales),
              formatCurrency(vatTotal),
              ...(canViewCosts ? [formatCurrency(costOfGoods), formatCurrency(grossProfit), percentage(marginRate)] : []),
              formatCurrency(totalSpare),
              searchedDetailRows.length,
            ];
      autoTable(doc, {
        startY: 98,
        head: [pdfSummaryHead],
        body: [pdfSummaryBody],
        theme: "grid",
        headStyles: { fillColor: [83, 67, 55], textColor: [255, 255, 255] },
        styles: { fontSize: 7, cellPadding: 4 },
      });
      const tableDoc = doc as typeof doc & { lastAutoTable?: { finalY: number } };
      autoTable(doc, {
        startY: (tableDoc.lastAutoTable?.finalY ?? 135) + 20,
        head: [detailColumns.length > 0 ? detailColumns : ["Resultado"]],
        body:
          searchedDetailRows.length > 0
            ? searchedDetailRows.map((row) =>
                detailColumns.map((column) => {
                  const value = row[column];
                  return typeof value === "number" && isCurrencyColumn(column)
                    ? formatCurrency(value)
                    : String(value ?? "");
                }),
              )
            : [["Sin operaciones para los filtros seleccionados"]],
        theme: "grid",
        styles: {
          fontSize: detailColumns.length > 10 ? 5.2 : 6.3,
          cellPadding: 2.8,
          textColor: [42, 36, 31],
          lineColor: [214, 201, 190],
          lineWidth: 0.3,
        },
        headStyles: { fillColor: [109, 86, 67], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [249, 246, 243] },
      });
      doc.save(`${exportFilename}.pdf`);
      toast.success("Reporte ejecutivo descargado en PDF.");
    } catch {
      toast.error("No fue posible generar el reporte PDF.");
    } finally {
      setExporting(null);
    }
  };

  const renderMoneyCell = (
    column: string,
    value: string | number | undefined,
  ): ReactNode => {
    if (
      typeof value === "number" &&
      isCurrencyColumn(column)
    ) {
      return formatCurrency(value);
    }
    return value ?? "—";
  };

  return (
    <div className="reports-workspace">
      <aside className="reports-catalog-card">
        <div className="reports-catalog-heading">
          <span className="section-kicker">CENTRO ANALÍTICO</span>
          <h2>Reports</h2>
          <p>Selecciona un reporte ejecutivo.</p>
        </div>
        <nav aria-label="Tipos de reportes">
          {reportGroups.map((group) => {
            const Icon = group.icon;
            const open = openGroup === group.key;
            const groupActive = activeGroup === group.key;
            return (
              <div className={`reports-menu-group ${groupActive ? "is-active" : ""}`} key={group.key}>
                <button
                  type="button"
                  className="reports-menu-trigger"
                  onClick={() => selectReportGroup(group)}
                  aria-expanded={open}
                  aria-current={groupActive ? "page" : undefined}
                >
                  <Icon size={17} />
                  <span>{group.label}</span>
                  {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                {open && (
                  <div className="reports-submenu">
                    {group.items.map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        className={activeReport === item.key ? "is-active" : ""}
                        onClick={() => selectReport(item, group.key)}
                      >
                        <span>{item.label}</span>
                        <small>{item.description}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="reports-catalog-note">
          <ReceiptText size={16} />
          <span>
            <strong>Reporte mock en tiempo real</strong>
            <small>Usa los registros vigentes de esta sesión.</small>
          </span>
        </div>
      </aside>

      <div
        className="reports-main"
        key={activeReport}
        aria-label={`Ventana de reporte: ${activeDefinition.label}`}
      >
        <Card className="reports-hero-card">
          <CardContent>
            <div>
              <span className="section-kicker">{reportGroups.find((group) => group.key === activeGroup)?.label}</span>
              <h2>{activeDefinition.label}</h2>
              <p>{activeDefinition.description}</p>
            </div>
            <div className="reports-export-actions">
              <Button type="button" variant="outline" onClick={exportExcel} disabled={!validPeriod || Boolean(exporting)}>
                <FileSpreadsheet size={16} />
                {exporting === "EXCEL" ? "Generando…" : "Excel"}
              </Button>
              <Button type="button" onClick={exportPdf} disabled={!validPeriod || Boolean(exporting)}>
                <FileText size={16} />
                {exporting === "PDF" ? "Generando…" : "PDF"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="reports-filter-card">
          <CardContent>
            <div className="reports-filter-heading">
              <span><Filter size={16} /> FILTROS AVANZADOS</span>
              <Badge variant="outline">
                {allBranchesSelected ? "EMPRESA GENERAL" : `${selectedBranches.length} SUCURSAL${selectedBranches.length === 1 ? "" : "ES"}`}
              </Badge>
            </div>
            <div className="reports-filter-grid">
              <div className="field-stack">
                <Label>Desde</Label>
                <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Fecha inicial" />
              </div>
              <div className="field-stack">
                <Label>Hasta</Label>
                <DatePicker value={dateTo} onChange={setDateTo} placeholder="Fecha final" />
              </div>
              {(activeGroup === "SALES" || activeGroup === "EMPLOYEE" || activeGroup === "CUSTOMER") && (
                <div className="field-stack">
                  <Label>Usuario / vendedor</Label>
                  <Select value={sellerId} onValueChange={setSellerId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos los vendedores</SelectItem>
                      {sellers.map((seller) => (
                        <SelectItem value={seller.id} key={seller.id}>{seller.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(activeGroup === "SALES" || activeGroup === "EMPLOYEE") && (
                <div className="field-stack">
                  <Label>Forma de pago</Label>
                  <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas las formas de pago</SelectItem>
                      {paymentMethods.map((method) => (
                        <SelectItem value={method.id} key={method.id}>{method.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {activeReport === "CASH_MOVEMENTS" && (
                <div className="field-stack">
                  <Label>Tipo de gasto</Label>
                  <Select value={expenseTypeId} onValueChange={setExpenseTypeId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos los tipos de gasto</SelectItem>
                      {expenseTypes.map((type) => (
                        <SelectItem value={type.id} key={type.id}>
                          {type.name}{type.active ? "" : " · Inactivo"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(activeGroup === "MERCHANDISE" || activeReport === "SOLD_PRODUCTS") && (
                <div className="field-stack">
                  <Label>Tipo de artículo</Label>
                  <Select value={productKind} onValueChange={(value) => setProductKind(value as ProductKindFilter)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Productos y servicios</SelectItem>
                      <SelectItem value="PRODUCT">Sólo productos</SelectItem>
                      <SelectItem value="SERVICE">Sólo servicios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="field-stack reports-search-filter">
                <Label>Buscar dentro del reporte</Label>
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Folio, producto, cliente, vendedor…" />
              </div>
            </div>
            <div className="reports-branch-filter">
              <span><Store size={15} /> Sucursales</span>
              <button type="button" className={allBranchesSelected ? "is-active" : ""} onClick={() => setSelectedBranches(branches)}>Todas · Empresa</button>
              {branches.map((branch) => (
                <button type="button" key={branch} className={selectedBranches.includes(branch) ? "is-active" : ""} onClick={() => toggleBranch(branch)}>{branch}</button>
              ))}
              {activeReport !== "CASH_MOVEMENTS" && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={comparePrevious}
                  className="reports-compare-switch"
                  onClick={() => setComparePrevious((current) => !current)}
                >
                  <span className={`mock-switch ${comparePrevious ? "is-on" : ""}`}><i /></span>
                  Comparar periodo anterior
                </button>
              )}
            </div>
            {!validPeriod && <p className="reports-filter-error">La fecha inicial debe ser igual o anterior a la final.</p>}
          </CardContent>
        </Card>

        <div className="reports-metric-grid">
          {metrics.map((metric) => (
            <article className={`reports-metric ${metric.tone ? `is-${metric.tone}` : ""}`} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </div>

        <div className="reports-chart-grid">
          <Card className="reports-chart-card">
            <CardContent>
              <div className="reports-card-heading">
                <div><span>TENDENCIA</span><h3>{activeReport === "CASH_MOVEMENTS" ? "Flujo neto por día" : "Operación por día"}</h3></div>
                {salesChange >= 0 ? <TrendingUp size={19} /> : <TrendingDown size={19} />}
              </div>
              <div className="reports-column-chart">
                {trendRows.map((item) => (
                  <div key={item.label}>
                    <strong>{formatCurrency(item.value)}</strong>
                    <i><b style={{ height: `${Math.max(4, (item.value / maxTrend) * 100)}%` }} /></i>
                    <small>{item.label.slice(5)}</small>
                  </div>
                ))}
                {trendRows.length === 0 && <p>Sin ventas para los filtros elegidos.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="reports-chart-card">
            <CardContent>
              <div className="reports-card-heading">
                <div>
                  <span>DISTRIBUCIÓN</span>
                  <h3>{activeReport === "CASH_MOVEMENTS" ? "Gastos por tipo" : activeGroup === "CUSTOMER" ? "Procedencia" : activeGroup === "EMPLOYEE" ? "Venta por vendedor" : activeGroup === "MERCHANDISE" ? "Flujo de inventario" : "Formas de pago"}</h3>
                </div>
                <BarChart3 size={19} />
              </div>
              <div className="reports-horizontal-chart">
                {distributionRows.map((item) => (
                  <div key={item.label}>
                    <span><b>{item.label}</b><strong>{activeGroup === "CUSTOMER" || activeGroup === "MERCHANDISE" ? compactNumber(item.value) : formatCurrency(item.value)}</strong></span>
                    <i><b style={{ width: `${Math.max(3, (item.value / maxDistribution) * 100)}%` }} /></i>
                  </div>
                ))}
                {distributionRows.length === 0 && <p>Sin distribución disponible.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {activeGroup === "MERCHANDISE" && (
          <div className="reports-demand-grid">
            <Card className="reports-demand-card is-high">
              <CardContent>
                <div className="reports-card-heading">
                  <div><span>ALTA DEMANDA</span><h3>Productos con mayor salida</h3></div>
                  <TrendingUp size={19} />
                </div>
                {topDemand.map((product, index) => (
                  <div className="reports-demand-line" key={product.id}>
                    <span>{index + 1}</span><strong>{product.name}</strong><b>{product.unitsSold} pz</b>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="reports-demand-card is-low">
              <CardContent>
                <div className="reports-card-heading">
                  <div><span>BAJA DEMANDA</span><h3>Atención de rotación</h3></div>
                  <TrendingDown size={19} />
                </div>
                {lowDemand.map((product, index) => (
                  <div className="reports-demand-line" key={product.id}>
                    <span>{index + 1}</span><strong>{product.name}</strong><b>{product.unitsSold} pz</b>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="data-card reports-detail-card">
          <CardContent className="p-0">
            <div className="data-card-heading">
              <div>
                <span>DETALLE EJECUTIVO</span>
                <h2>{activeDefinition.label}</h2>
              </div>
              <Badge variant="outline">{searchedDetailRows.length} REGISTROS</Badge>
            </div>
            <div className="table-scroll reports-table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    {detailColumns.map((column) => <TableHead key={column}>{column.toLocaleUpperCase("es-MX")}</TableHead>)}
                    {activeGroup === "CUSTOMER" && <TableHead>EXPEDIENTE</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailPagination.paginatedItems.map((row, index) => (
                    <TableRow key={`${String(row.Folio ?? row.SKU ?? row.Cliente ?? row.Vendedor ?? "row")}-${index}`}>
                      {detailColumns.map((column) => (
                        <TableCell
                          key={column}
                          className={
                            column === "Impacto" && typeof row[column] === "number"
                              ? row[column] < 0
                                ? "reports-cash-impact is-negative"
                                : row[column] > 0
                                  ? "reports-cash-impact is-positive"
                                  : "reports-cash-impact is-neutral"
                              : undefined
                          }
                        >
                          {column === "Cliente" ? (
                            <button
                              type="button"
                              className="reports-client-link"
                              onClick={() => openCustomerFromRow(row)}
                            >
                              {renderMoneyCell(column, row[column])}
                              <ExternalLink size={13} />
                            </button>
                          ) : (
                            renderMoneyCell(column, row[column])
                          )}
                        </TableCell>
                      ))}
                      {activeGroup === "CUSTOMER" && (
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="reports-customer-dashboard-button"
                            aria-label={`Abrir dashboard de ${String(row.Cliente ?? "cliente")}`}
                            title="Ver dashboard e historial integral"
                            onClick={() => openCustomerFromRow(row)}
                          >
                            <LayoutDashboard size={16} />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {searchedDetailRows.length === 0 && (
                    <TableRow><TableCell colSpan={Math.max(1, detailColumns.length + (activeGroup === "CUSTOMER" ? 1 : 0))}><div className="reports-empty-state"><PackageSearch size={24} /><strong>Sin resultados</strong><span>Ajusta las fechas, sucursales o filtros avanzados.</span></div></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <HistoryPagination
              total={searchedDetailRows.length}
              page={detailPagination.page}
              pageSize={detailPagination.pageSize}
              pageCount={detailPagination.pageCount}
              onPageChange={detailPagination.setPage}
              onPageSizeChange={detailPagination.setPageSize}
            />
          </CardContent>
        </Card>

        <div className="reports-insight-strip">
          <CircleDollarSign size={18} />
          <span>
            <strong>Lectura ejecutiva:</strong>{" "}
            {activeReport === "CASH_MOVEMENTS"
              ? "el flujo neto considera cobros recibidos menos gastos vigentes; los folios anulados permanecen en auditoría con impacto $0.00."
              : canViewCosts
                ? "utilidad estimada con costo MXN registrado y venta sin IVA; cancelaciones y abonos independientes no inflan la venta."
                : "ventas, impuestos, SPARE y operación del periodo; los costos permanecen protegidos por rol."}
          </span>
          <WalletCards size={18} />
          <span>Descargas listas para conciliación, análisis comercial y revisión por sucursal.</span>
          <Download size={18} />
          <Percent size={18} />
        </div>

        <ReportsCustomerDialog
          open={customerDialogOpen}
          client={selectedCustomer}
          tickets={tickets}
          appointments={appointments}
          paymentMethods={paymentMethods}
          onOpenChange={setCustomerDialogOpen}
        />
      </div>
    </div>
  );
}
