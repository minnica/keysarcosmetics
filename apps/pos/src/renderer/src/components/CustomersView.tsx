import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import {
  AlertTriangle,
  Building2,
  CakeSlice,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  KeyRound,
  LogOut,
  Eye,
  FileSpreadsheet,
  Gift,
  ImageDown,
  Pencil,
  Phone,
  Printer,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Upload,
  UserRound,
  MessageCircle,
  Plus,
  Save,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverAnchor,
  PopoverContent,
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
import { formatCurrency, masterUser } from "../mock-data";
import { cardNetworkLabels } from "../bank-catalog";
import type {
  Appointment,
  BankCatalogEntry,
  Client,
  ClientMembership,
  LayawayRecord,
  OwedProductRecord,
  PaymentEntry,
  PaymentMethodOption,
  Seller,
  Ticket,
  ReceiptSettings,
  VoucherIssue,
} from "../types";
import { HistoryPagination, useHistoryPagination } from "./HistoryPagination";
import { LayawayPaymentDialog } from "./LayawayPaymentDialog";

type AccessMode = "search" | "seller";

interface CustomersViewProps {
  clients: Client[];
  memberships: ClientMembership[];
  sellers: Seller[];
  tickets: Ticket[];
  voucherIssues: VoucherIssue[];
  appointments: Appointment[];
  owedProducts: OwedProductRecord[];
  layaways: LayawayRecord[];
  paymentMethods: PaymentMethodOption[];
  bankCatalog: BankCatalogEntry[];
  branches: string[];
  receiptSettings: ReceiptSettings;
  sessionSellerId: string | null;
  sessionIsMaster: boolean;
  isMasterCode: (code: string) => boolean;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onBulkImportClients: (clients: Client[]) => void;
  onRegisterLayawayPayment: (
    layawayId: string,
    payments: PaymentEntry[],
    sellerId: string,
    deliveredCartItemIds: string[],
  ) => void;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim();
const normalizePhone = (value: string) => value.replace(/\D/g, "");

interface BirthdayMessage {
  id: string;
  name: string;
  text: string;
}

const initialBirthdayMessages: BirthdayMessage[] = [
  {
    id: "message-elegant",
    name: "Elegante",
    text: "Que este nuevo año de vida esté lleno de bienestar, belleza y momentos inolvidables. ¡Feliz cumpleaños!",
  },
  {
    id: "message-warm",
    name: "Cálido",
    text: "Hoy celebramos tu esencia y todo lo bonito que compartes con el mundo. Deseamos que tengas un cumpleaños maravilloso.",
  },
  {
    id: "message-gift",
    name: "Con regalo",
    text: "¡Feliz cumpleaños! Tenemos una sorpresa especial para consentirte. Gracias por formar parte de Keysar Cosmetics.",
  },
];

const birthdayDesigns = [
  {
    id: "gold",
    name: "Elegancia dorada",
    season: "Todo el año",
    colors: ["#f6ead9", "#a97945", "#3b2b22"],
  },
  {
    id: "spring",
    name: "Primavera floral",
    season: "Primavera",
    colors: ["#f7e7ec", "#bd7188", "#5f3d4b"],
  },
  {
    id: "summer",
    name: "Verano coral",
    season: "Verano",
    colors: ["#ffeadf", "#dd765e", "#59352d"],
  },
  {
    id: "holiday",
    name: "Temporada festiva",
    season: "Invierno",
    colors: ["#e8efe8", "#55745f", "#263c2e"],
  },
] as const;

const loadBirthdayMessages = () => {
  try {
    const stored = window.sessionStorage.getItem("keysar-birthday-messages");
    if (!stored) return initialBirthdayMessages;
    const parsed = JSON.parse(stored) as BirthdayMessage[];
    return parsed.length > 0 ? parsed : initialBirthdayMessages;
  } catch {
    return initialBirthdayMessages;
  }
};

interface ClientMembershipSummary {
  active: number;
  total: number;
  memberships: ClientMembership[];
}

const emptyMembershipSummary: ClientMembershipSummary = {
  active: 0,
  total: 0,
  memberships: [],
};

function CustomerMembershipPreview({
  clientName,
  summary,
}: {
  clientName: string;
  summary: ClientMembershipSummary;
}) {
  const [open, setOpen] = useState(false);
  const orderedMemberships = useMemo(
    () =>
      [...summary.memberships].sort((left, right) => {
        if (left.status === "ACTIVE" && right.status !== "ACTIVE") return -1;
        if (right.status === "ACTIVE" && left.status !== "ACTIVE") return 1;
        return right.purchaseDateIso.localeCompare(left.purchaseDateIso);
      }),
    [summary.memberships],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          className={`customer-membership-count ${summary.active > 0 ? "is-active" : ""}`}
          aria-label={`Ver membresías de ${clientName}: ${summary.active} activas de ${summary.total} compradas`}
          aria-expanded={open}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={() => setOpen(true)}
        >
          <CreditCard size={15} />
          <span>
            <strong>
              {summary.active > 0
                ? `${summary.active} ${summary.active === 1 ? "activa" : "activas"}`
                : "Sin activas"}
            </strong>
            <small>
              {summary.total} {summary.total === 1 ? "comprada" : "compradas"}
            </small>
          </span>
        </button>
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={7}
        className="customer-membership-popover"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="customer-membership-popover-heading">
          <CreditCard size={16} />
          <span>
            <strong>Membresías de {clientName}</strong>
            <small>{summary.active} activas · {summary.total} compradas</small>
          </span>
        </div>
        {orderedMemberships.length > 0 ? (
          <div className="customer-membership-popover-list">
            {orderedMemberships.map((membership) => {
              const remaining = Math.max(
                0,
                membership.totalSessions - membership.usedSessions,
              );
              const statusLabel =
                membership.status === "ACTIVE"
                  ? "ACTIVA"
                  : membership.status === "EXHAUSTED"
                    ? "AGOTADA"
                    : "CANCELADA";
              return (
                <article key={membership.id}>
                  <span>
                    <strong>{membership.membershipName}</strong>
                    <small>{membership.branch} · {membership.purchaseDateIso.slice(0, 10)}</small>
                  </span>
                  <span>
                    <b className={`is-${membership.status.toLocaleLowerCase("es-MX")}`}>
                      {statusLabel}
                    </b>
                    <small>{remaining}/{membership.totalSessions} sesiones</small>
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="customer-membership-popover-empty">
            Esta clienta todavía no tiene membresías registradas.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function CustomersView({
  clients,
  memberships,
  sellers,
  tickets,
  voucherIssues,
  appointments,
  owedProducts,
  layaways,
  paymentMethods,
  bankCatalog,
  branches,
  receiptSettings,
  sessionSellerId,
  sessionIsMaster,
  isMasterCode,
  onUpdateClient,
  onDeleteClient,
  onBulkImportClients,
  onRegisterLayawayPayment,
}: CustomersViewProps) {
  const [accessMode, setAccessMode] = useState<AccessMode>("search");
  const [nameSearch, setNameSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [maximumAmount, setMaximumAmount] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [sellerFilter, setSellerFilter] = useState("ALL");
  const [accessCode, setAccessCode] = useState("");
  const [authorizedSellerId, setAuthorizedSellerId] = useState("");
  const [masterAuthorized, setMasterAuthorized] = useState(false);
  const [debtOnly, setDebtOnly] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [expandedClientId, setExpandedClientId] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [deleteFolio, setDeleteFolio] = useState("");
  const [deleteMasterCode, setDeleteMasterCode] = useState("");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkMasterCode, setBulkMasterCode] = useState("");
  const [bulkFilename, setBulkFilename] = useState("");
  const [bulkImportRows, setBulkImportRows] = useState<Client[]>([]);
  const [bulkImportErrors, setBulkImportErrors] = useState<string[]>([]);
  const [birthdayClient, setBirthdayClient] = useState<Client | null>(null);
  const [selectedBirthdayDesignId, setSelectedBirthdayDesignId] = useState("gold");
  const [birthdayMessages, setBirthdayMessages] = useState<BirthdayMessage[]>(
    loadBirthdayMessages,
  );
  const [selectedBirthdayMessageId, setSelectedBirthdayMessageId] = useState(
    initialBirthdayMessages[0]!.id,
  );

  const activeSellers = useMemo(
    () => sellers.filter((seller) => seller.active),
    [sellers],
  );
  const membershipSummaryByClientId = useMemo(
    () =>
      memberships.reduce(
        (summary, membership) => {
          const current = summary.get(membership.clientId) ?? {
            active: 0,
            total: 0,
            memberships: [],
          };
          current.total += 1;
          if (membership.status === "ACTIVE") current.active += 1;
          current.memberships.push(membership);
          summary.set(membership.clientId, current);
          return summary;
        },
        new Map<string, ClientMembershipSummary>(),
      ),
    [memberships],
  );
  const clientMembershipSummary = (clientId: string) =>
    membershipSummaryByClientId.get(clientId) ?? emptyMembershipSummary;

  useEffect(() => {
    window.sessionStorage.setItem(
      "keysar-birthday-messages",
      JSON.stringify(birthdayMessages),
    );
  }, [birthdayMessages]);
  useEffect(() => {
    setSelectedBranches((current) =>
      current.filter((branch) => branches.includes(branch)),
    );
  }, [branches]);
  const authorizedSeller = activeSellers.find(
    (seller) => seller.id === authorizedSellerId,
  );
  const normalizedName = normalize(nameSearch);
  const normalizedPhone = normalizePhone(phoneSearch);
  const searchIsReady =
    normalizedName.length >= 2 ||
    normalizedPhone.length >= 4 ||
    minimumAmount !== "" ||
    maximumAmount !== "" ||
    selectedBranches.length > 0 ||
    sellerFilter !== "ALL";

  useEffect(() => {
    if (!masterAuthorized) return;
    let inactivityTimer = window.setTimeout(() => undefined, 0);
    const lockMasterSession = () => {
      setMasterAuthorized(false);
      setDebtOnly(false);
      setAccessMode("search");
      setExpandedClientId("");
      setEditingClient(null);
      setDeletingClient(null);
      toast.info("La sesión master se bloqueó por 3 minutos de inactividad.");
    };
    const restartTimer = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(lockMasterSession, 180_000);
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
  }, [masterAuthorized]);

  const clientTickets = (client: Client) => {
    const phone = normalizePhone(client.phone);
    const fullName = normalize(`${client.firstName} ${client.lastName}`);
    return tickets.filter(
      (ticket) =>
        ticket.status === "COMPLETED" &&
        ticket.ticketType !== "LAYAWAY_PAYMENT" &&
        ((phone && normalizePhone(ticket.clientPhone) === phone) ||
          normalize(ticket.clientName) === fullName),
    );
  };

  const clientAppointments = (client: Client) =>
    appointments.filter(
      (appointment) =>
        appointment.clientId === client.id ||
        normalizePhone(appointment.clientPhone) === normalizePhone(client.phone),
    );

  const clientVouchers = (client: Client) => {
    const phone = normalizePhone(client.phone);
    const fullName = normalize(`${client.firstName} ${client.lastName}`);
    return voucherIssues.filter(
      (voucher) =>
        voucher.clientId === client.id ||
        (phone && normalizePhone(voucher.clientPhone) === phone) ||
        normalize(voucher.clientName) === fullName,
    );
  };

  const clientOutstandingBalance = (client: Client) =>
    clientTickets(client).reduce(
      (sum, ticket) => sum + Math.max(0, ticket.balanceDue),
      0,
    );

  const paymentLabel = (methodId: string) =>
    paymentMethods.find((method) => method.id === methodId)?.label ?? methodId;

  const visibleClients = useMemo(() => {
    const base =
      accessMode === "seller"
        ? masterAuthorized
          ? clients
          : authorizedSellerId
          ? clients.filter((client) =>
              client.saleSellerIds.includes(authorizedSellerId),
            )
          : []
        : searchIsReady
          ? clients
          : [];
    const minimum = minimumAmount === "" ? null : Number(minimumAmount);
    const maximum = maximumAmount === "" ? null : Number(maximumAmount);

    return base.filter((client) => {
      const fullName = normalize(`${client.firstName} ${client.lastName}`);
      const phone = normalizePhone(client.phone);
      if (normalizedName && !fullName.includes(normalizedName)) return false;
      if (normalizedPhone && !phone.includes(normalizedPhone)) return false;
      if (
        sellerFilter !== "ALL" &&
        client.ownerId !== sellerFilter &&
        !client.saleSellerIds.includes(sellerFilter)
      )
        return false;

      const purchases = clientTickets(client);
      if (debtOnly && clientOutstandingBalance(client) <= 0.01) return false;
      const purchaseTotal = purchases.reduce(
        (sum, ticket) => sum + ticket.total,
        0,
      );
      if (minimum !== null && purchaseTotal < minimum) return false;
      if (maximum !== null && purchaseTotal > maximum) return false;
      if (
        selectedBranches.length > 0 &&
        !purchases.some((ticket) =>
          selectedBranches.includes(ticket.branchName ?? "Polanco"),
        )
      )
        return false;
      return true;
    });
  }, [
    accessMode,
    authorizedSellerId,
    clients,
    debtOnly,
    maximumAmount,
    masterAuthorized,
    minimumAmount,
    normalizedName,
    normalizedPhone,
    searchIsReady,
    sellerFilter,
    selectedBranches,
    tickets,
  ]);
  const customerPagination = useHistoryPagination(
    visibleClients,
    `${accessMode}|${authorizedSellerId}|${masterAuthorized}|${debtOnly}|${normalizedName}|${normalizedPhone}|${minimumAmount}|${maximumAmount}|${sellerFilter}|${selectedBranches.join(",")}`,
  );

  const getClientOwner = (client: Client) => {
    if (client.companyLocked) return client.companyName;
    const owner = client.ownerId
      ? sellers.find((seller) => seller.id === client.ownerId)
      : null;
    return owner?.active ? owner.name : "Keysar Cosmetics";
  };

  const getPreviousClientOwner = (client: Client) => {
    const historyEntry = [...(client.ownershipHistory ?? [])].sort((left, right) =>
      right.endedAtIso.localeCompare(left.endedAtIso),
    )[0];
    if (historyEntry) {
      const seller = sellers.find(
        (candidate) => candidate.id === historyEntry.sellerId,
      );
      return {
        name: seller?.name ?? historyEntry.sellerName,
        active: seller?.active ?? false,
        endedAtIso: historyEntry.endedAtIso,
      };
    }
    const legacyInactiveSeller = client.ownerId
      ? sellers.find(
          (seller) => seller.id === client.ownerId && !seller.active,
        )
      : null;
    return legacyInactiveSeller
      ? { name: legacyInactiveSeller.name, active: false, endedAtIso: "" }
      : null;
  };

  const authorizeSeller = () => {
    if (isMasterCode(accessCode)) {
      setMasterAuthorized(true);
      setDebtOnly(false);
      setAuthorizedSellerId("");
      setAccessError("");
      setAccessCode("");
      return;
    }
    const seller = activeSellers.find(
      (candidate) => candidate.accessCode === accessCode.trim(),
    );
    if (!seller) {
      setAuthorizedSellerId("");
      setAccessError("Clave inválida o vendedor inactivo.");
      return;
    }
    setAuthorizedSellerId(seller.id);
    setMasterAuthorized(false);
    setDebtOnly(false);
    setAccessError("");
    setAccessCode("");
  };

  const changeAccessMode = (mode: AccessMode) => {
    setAccessMode(mode);
    setNameSearch("");
    setPhoneSearch("");
    setSellerFilter("ALL");
    setAccessCode("");
    setAuthorizedSellerId("");
    setMasterAuthorized(false);
    setDebtOnly(false);
    setAccessError("");
    setExpandedClientId("");
  };

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const printClient = (client: Client) => {
    const purchases = clientTickets(client);
    const customerAppointments = clientAppointments(client);
    const customerVouchers = clientVouchers(client);
    const membershipSummary = clientMembershipSummary(client.id);
    const previousOwner = getPreviousClientOwner(client);
    const popup = window.open("", "_blank", "width=720,height=860");
    if (!popup) {
      toast.error("El navegador bloqueó la ventana de impresión.");
      return;
    }
    const logo = receiptSettings.logoUrl
      ? `<img src="${escapeHtml(receiptSettings.logoUrl)}" alt="Logo" />`
      : "";
    const voucherHistoryHtml = `<h2>VOUCHERS ENTREGADOS · ${customerVouchers.length}</h2>${
      customerVouchers.length
        ? customerVouchers
            .map(
              (voucher) =>
                `<article><strong>${escapeHtml(voucher.folio)} · ${escapeHtml(voucher.voucherName)}</strong><small>${escapeHtml(new Date(voucher.issuedAtIso).toLocaleString("es-MX"))} · ${escapeHtml(voucher.branch)} · Ticket ${escapeHtml(voucher.ticketId)}</small><br>${escapeHtml(voucher.status)}</article>`,
            )
            .join("")
        : "<p>Sin vouchers entregados.</p>"
    }`;
    popup.document.write(`<!doctype html><html lang="es"><head><title>${escapeHtml(client.registrationFolio)}</title><style>
      body{font-family:Arial,sans-serif;color:#111;margin:32px}header{text-align:center;border-bottom:2px solid #111;padding-bottom:18px}header img{display:block;max-width:${receiptSettings.logoWidth}px;max-height:72px;object-fit:contain;margin:0 auto 10px}h1{font-size:20px;margin:5px 0}h2{font-size:14px;margin-top:24px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}.meta div,article{border:1px solid #bbb;padding:9px}small{color:#666}article{margin:7px 0}article strong{display:block}@media print{body{margin:8mm}}
    </style></head><body><header>${logo}<h1>${escapeHtml(receiptSettings.companyName)}</h1><strong>EXPEDIENTE DE CLIENTE</strong></header><div class="meta"><div><small>FOLIO</small><br><strong>${escapeHtml(client.registrationFolio)}</strong></div><div><small>CLIENTE</small><br><strong>${escapeHtml(`${client.firstName} ${client.lastName}`)}</strong></div><div><small>TELÉFONO</small><br>${escapeHtml(client.phone || "Sin registro")}</div><div><small>PROPIETARIO ACTUAL</small><br>${escapeHtml(getClientOwner(client) || "Empresa")}</div>${previousOwner ? `<div><small>VENDEDOR ANTERIOR</small><br><strong>${escapeHtml(previousOwner.name)}</strong><br><small>${previousOwner.active ? "Cuenta reactivada · relación anterior" : "Inactivo"}${previousOwner.endedAtIso ? ` · transferencia ${escapeHtml(new Date(previousOwner.endedAtIso).toLocaleDateString("es-MX"))}` : ""}</small></div>` : ""}<div><small>CUMPLEAÑOS</small><br>${escapeHtml(client.birthday || "Sin registro")}</div><div><small>PROCEDENCIA</small><br>${escapeHtml(client.sourceLabel)}</div><div><small>MEMBRESÍAS</small><br><strong>${membershipSummary.active} activas · ${membershipSummary.total} compradas</strong></div></div><h2>HISTORIAL DE COMPRA</h2>${purchases.length ? purchases.map((ticket) => `<article><strong>${escapeHtml(ticket.id)} · ${escapeHtml(formatCurrency(ticket.total))}</strong><small>${escapeHtml(ticket.createdAt)} · ${escapeHtml(ticket.branchName ?? "Polanco")}</small><br>${escapeHtml(ticket.products.map((product) => `${product.quantity} × ${product.name}`).join(" · "))}</article>`).join("") : "<p>Sin compras registradas.</p>"}<h2>CITAS Y CORTESÍAS</h2>${customerAppointments.length ? customerAppointments.map((appointment) => `<article><strong>${escapeHtml(appointment.service)}</strong><small>${escapeHtml(`${appointment.date} · ${appointment.time} · ${appointment.branch}`)}</small></article>`).join("") : "<p>Sin citas registradas.</p>"}${voucherHistoryHtml}<script>window.onload=()=>window.print();</script></body></html>`);
    popup.document.close();
  };

  const saveClientEdit = () => {
    if (!editingClient) return;
    if (!editingClient.firstName.trim() || !editingClient.phone.trim()) {
      toast.error("Nombre y teléfono son obligatorios.");
      return;
    }
    onUpdateClient(editingClient);
    setEditingClient(null);
    toast.success("Registro del cliente actualizado.");
  };

  const confirmClientDeletion = () => {
    if (!deletingClient) return;
    if (deleteFolio.trim() !== deletingClient.registrationFolio) {
      toast.error("La primera validación no coincide con el folio.");
      return;
    }
    if (!isMasterCode(deleteMasterCode)) {
      toast.error("La segunda validación requiere el código master.");
      return;
    }
    onDeleteClient(deletingClient.id);
    setExpandedClientId("");
    setDeletingClient(null);
    setDeleteFolio("");
    setDeleteMasterCode("");
    toast.success("Cliente borrado del directorio activo; el histórico se conserva.");
  };

  const exportClientsToExcel = async () => {
    if (visibleClients.length === 0) {
      toast.error("Realiza una búsqueda para exportar clientes autorizados.");
      return;
    }
    const XLSX = await import("xlsx");
    const rows = visibleClients.map((client) => {
      const purchases = clientTickets(client);
      const membershipSummary = clientMembershipSummary(client.id);
      const previousOwner = getPreviousClientOwner(client);
      return {
        Folio: client.registrationFolio,
        Nombre: client.firstName,
        Apellido: client.lastName,
        Cumpleaños: client.birthday,
        Género: client.gender,
        Teléfono: client.phone,
        WhatsApp: client.whatsapp,
        Procedencia: client.sourceLabel,
        Empresa: client.companyName || "Keysar Cosmetics",
        Vendedor: getClientOwner(client),
        "Vendedor anterior": previousOwner?.name ?? "",
        "Estado actual vendedor anterior": previousOwner
          ? previousOwner.active
            ? "Activo"
            : "Inactivo"
          : "",
        "Sucursal de registro": client.registrationBranch ?? "",
        "Membresías activas": membershipSummary.active,
        "Membresías compradas": membershipSummary.total,
        "Compra total": purchases.reduce((sum, ticket) => sum + ticket.total, 0),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 13 },
      { wch: 14 },
      { wch: 17 },
      { wch: 17 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 19 },
      { wch: 19 },
      { wch: 22 },
      { wch: 15 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    XLSX.writeFile(
      workbook,
      `clientes-keysar-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success(`${visibleClients.length} clientes exportados a Excel.`);
  };

  const downloadBulkTemplate = () => {
    const anchor = document.createElement("a");
    anchor.href = "/templates/clientes-carga-masiva.xlsx";
    anchor.download = "plantilla-carga-masiva-clientes.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    toast.success("Plantilla de clientes descargada.");
  };

  const formatImportedBirthday = (value: unknown) => {
    if (value instanceof Date && !Number.isNaN(value.getTime()))
      return value.toISOString().slice(0, 10);
    if (typeof value === "number") {
      const date = new Date(Math.round((value - 25_569) * 86_400_000));
      return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
    }
    const text = String(value ?? "").trim();
    if (!text) return "";
    const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const [, year = "", month = "", day = ""] = isoMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return text;
  };

  const readBulkClientFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBulkFilename(file.name);
    setBulkImportRows([]);
    setBulkImportErrors([]);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("El archivo no contiene hojas.");
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) throw new Error("No fue posible leer la primera hoja.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
        raw: true,
        range: 3,
      });
      const imported: Client[] = [];
      const errors: string[] = [];
      const knownPhones = new Set(clients.map((client) => normalizePhone(client.phone)));
      rows.forEach((row, index) => {
        const line = index + 5;
        const firstName = String(row["nombre*"] ?? "").trim();
        const lastName = String(row["apellido*"] ?? "").trim();
        const phone = String(row["telefono*"] ?? "").trim();
        const normalizedImportedPhone = normalizePhone(phone);
        if (!firstName || !lastName || normalizedImportedPhone.length < 7) {
          errors.push(`Fila ${line}: nombre, apellido y teléfono válido son obligatorios.`);
          return;
        }
        if (knownPhones.has(normalizedImportedPhone)) {
          errors.push(`Fila ${line}: el teléfono ${phone} ya está registrado o repetido.`);
          return;
        }
        knownPhones.add(normalizedImportedPhone);
        const sourceLabel = String(row.procedencia ?? "Abordaje").trim() || "Abordaje";
        const normalizedSource = normalize(sourceLabel);
        const companyLocked =
          normalizedSource.includes("lead") || normalizedSource.includes("redes");
        const requestedOwnerId = String(row.vendedor_id ?? "").trim();
        const owner = activeSellers.find((seller) => seller.id === requestedOwnerId);
        const createdAt = new Date();
        imported.push({
          id: `client-bulk-${createdAt.getTime()}-${index}-${crypto.randomUUID().slice(0, 8)}`,
          registrationFolio: `CLI-MAS-${String(createdAt.getFullYear()).slice(-2)}-${String(createdAt.getTime()).slice(-6)}-${String(index + 1).padStart(2, "0")}`,
          registeredAtIso: createdAt.toISOString(),
          firstName,
          lastName,
          birthday: formatImportedBirthday(row.cumpleanos),
          gender: String(row.genero ?? "Sin especificar").trim() || "Sin especificar",
          phone,
          whatsapp: String(row.whatsapp ?? phone).trim() || phone,
          source: sourceLabel.toLocaleUpperCase("es-MX").replaceAll(" ", "_"),
          sourceLabel,
          companyName:
            String(row.empresa ?? "").trim() ||
            (companyLocked ? "Keysar Cosmetics" : ""),
          companyLocked,
          ownerId: owner?.id ?? null,
          saleSellerIds: owner ? [owner.id] : [],
          registrationBranch: String(row.sucursal ?? "").trim(),
        });
      });
      setBulkImportRows(imported);
      setBulkImportErrors(errors);
      if (imported.length === 0)
        toast.error("El archivo no contiene clientes válidos para importar.");
      else toast.success(`${imported.length} clientes listos para importar.`);
    } catch {
      setBulkImportErrors(["No fue posible leer el archivo. Usa la plantilla XLSX descargable."]);
      toast.error("Archivo inválido para carga masiva.");
    }
  };

  const confirmBulkImport = () => {
    if (!masterAuthorized && !isMasterCode(bulkMasterCode)) {
      toast.error("La carga masiva requiere el código master.");
      return;
    }
    if (bulkImportRows.length === 0) {
      toast.error("Selecciona un archivo con clientes válidos.");
      return;
    }
    onBulkImportClients(bulkImportRows);
    toast.success(`${bulkImportRows.length} clientes agregados al directorio.`);
    setBulkImportOpen(false);
    setBulkMasterCode("");
    setBulkFilename("");
    setBulkImportRows([]);
    setBulkImportErrors([]);
  };

  const birthdayScope = useMemo(() => {
    if (masterAuthorized || sessionIsMaster) return clients;
    if (authorizedSellerId)
      return clients.filter((client) =>
        client.saleSellerIds.includes(authorizedSellerId),
      );
    if (sessionSellerId)
      return clients.filter(
        (client) =>
          client.ownerId === sessionSellerId ||
          client.saleSellerIds.includes(sessionSellerId),
      );
    return [];
  }, [
    authorizedSellerId,
    clients,
    masterAuthorized,
    sessionIsMaster,
    sessionSellerId,
  ]);
  const today = new Date();
  const birthdayParts = (client: Client) =>
    client.birthday.split("-").map((part) => Number(part));
  const todayBirthdays = birthdayScope.filter((client) => {
    const [, month, day] = birthdayParts(client);
    return month === today.getMonth() + 1 && day === today.getDate();
  });
  const monthlyBirthdays = birthdayScope
    .filter((client) => birthdayParts(client)[1] === today.getMonth() + 1)
    .sort((a, b) => (birthdayParts(a)[2] ?? 0) - (birthdayParts(b)[2] ?? 0));
  const selectedBirthdayMessage =
    birthdayMessages.find((message) => message.id === selectedBirthdayMessageId) ??
    birthdayMessages[0];
  const selectedBirthdayDesign =
    birthdayDesigns.find((design) => design.id === selectedBirthdayDesignId) ??
    birthdayDesigns[0];

  const updateSelectedBirthdayMessage = (text: string) => {
    if (!selectedBirthdayMessage) return;
    setBirthdayMessages((current) =>
      current.map((message) =>
        message.id === selectedBirthdayMessage.id ? { ...message, text } : message,
      ),
    );
  };

  const addBirthdayMessage = () => {
    const id = `message-${Date.now()}`;
    setBirthdayMessages((current) => [
      ...current,
      { id, name: `Mensaje ${current.length + 1}`, text: "Escribe aquí tu felicitación personalizada." },
    ]);
    setSelectedBirthdayMessageId(id);
  };

  const deleteBirthdayMessage = () => {
    if (birthdayMessages.length <= 1 || !selectedBirthdayMessage) {
      toast.error("Debe conservarse al menos un mensaje.");
      return;
    }
    const remaining = birthdayMessages.filter(
      (message) => message.id !== selectedBirthdayMessage.id,
    );
    setBirthdayMessages(remaining);
    setSelectedBirthdayMessageId(remaining[0]!.id);
    toast.success("Mensaje eliminado.");
  };

  const createBirthdayCardBlob = async () => {
    if (!birthdayClient || !selectedBirthdayMessage) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const [background, accent, ink] = selectedBirthdayDesign.colors;
    const gradient = context.createLinearGradient(0, 0, 1080, 1080);
    gradient.addColorStop(0, background);
    gradient.addColorStop(1, "#ffffff");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1080, 1080);
    context.globalAlpha = 0.16;
    context.fillStyle = accent;
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 173) % 1080;
      const y = (index * 241) % 1080;
      context.beginPath();
      context.arc(x, y, 36 + (index % 4) * 18, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.strokeStyle = accent;
    context.lineWidth = 5;
    context.strokeRect(48, 48, 984, 984);

    if (receiptSettings.logoUrl) {
      try {
        const logo = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          const timeout = window.setTimeout(
            () => reject(new Error("Tiempo de carga del logo agotado.")),
            1_500,
          );
          image.onload = () => {
            window.clearTimeout(timeout);
            resolve(image);
          };
          image.onerror = () => {
            window.clearTimeout(timeout);
            reject(new Error("No se pudo cargar el logo."));
          };
          image.src = new URL(receiptSettings.logoUrl, window.location.href).href;
        });
        const ratio = Math.min(190 / logo.width, 120 / logo.height);
        context.drawImage(
          logo,
          540 - (logo.width * ratio) / 2,
          125,
          logo.width * ratio,
          logo.height * ratio,
        );
      } catch {
        // Si la imagen no carga, el nombre de la empresa mantiene la identidad.
      }
    }
    context.fillStyle = ink;
    context.textAlign = "center";
    context.font = "600 30px Georgia";
    context.fillText(receiptSettings.companyName, 540, 285);
    context.fillStyle = accent;
    context.font = "italic 42px Georgia";
    context.fillText("Una celebración para ti", 540, 390);
    context.fillStyle = ink;
    context.font = "700 78px Georgia";
    context.fillText(`${birthdayClient.firstName}`, 540, 510);
    context.font = "700 62px Georgia";
    context.fillText("¡Feliz cumpleaños!", 540, 600);

    const words = selectedBirthdayMessage.text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    context.font = "32px Arial";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > 780 && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    });
    if (line) lines.push(line);
    lines.slice(0, 5).forEach((text, index) =>
      context.fillText(text, 540, 700 + index * 45),
    );
    context.fillStyle = accent;
    context.font = "700 25px Arial";
    context.fillText(`Con cariño, ${receiptSettings.companyName}`, 540, 950);
    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.96),
    );
  };

  const downloadBirthdayCard = async () => {
    const blob = await createBirthdayCardBlob();
    if (!blob || !birthdayClient) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `feliz-cumpleanos-${normalize(`${birthdayClient.firstName}-${birthdayClient.lastName}`).replaceAll(" ", "-")}.png`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    toast.success("Tarjeta de cumpleaños descargada en PNG.");
  };

  const shareBirthdayCard = async () => {
    const blob = await createBirthdayCardBlob();
    if (!blob || !birthdayClient || !selectedBirthdayMessage) return;
    const filename = `feliz-cumpleanos-${birthdayClient.firstName}.png`;
    const file = new File([blob], filename, { type: "image/png" });
    const shareData = {
      files: [file],
      text: `${selectedBirthdayMessage.text}\n\n${receiptSettings.companyName}`,
      title: `Feliz cumpleaños, ${birthdayClient.firstName}`,
    };
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share(shareData);
      } catch {
        toast.info("El envío de la tarjeta fue cancelado.");
      }
      return;
    }
    await downloadBirthdayCard();
    const phone = normalizePhone(birthdayClient.whatsapp || birthdayClient.phone);
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(shareData.text)}`,
      "_blank",
      "noopener,noreferrer",
    );
    toast.info("Se descargó la tarjeta; adjúntala en la conversación de WhatsApp.");
  };

  const toggleBranch = (branch: string) => {
    setSelectedBranches((current) =>
      current.includes(branch)
        ? current.filter((item) => item !== branch)
        : [...current, branch],
    );
  };

  const emptyMessage =
    accessMode === "search"
      ? !searchIsReady
        ? "Escribe al menos 2 letras del nombre o 4 dígitos del teléfono."
        : "No se encontraron clientes con los filtros seleccionados."
      : authorizedSeller || masterAuthorized
        ? "No se encontraron clientes con estos filtros."
        : "Ingresa la clave personal del vendedor para consultar sus registros.";

  return (
    <div className="view-stack customers-register-view">
      <Card className="customer-access-card">
        <CardContent>
          <div className="customer-access-heading">
            <div>
              <span className="section-kicker">CONSULTA PROTEGIDA</span>
              <h2>Registro de clientes</h2>
              <p>
                Busca un registro específico o entra con la clave del vendedor
                para consultar únicamente su cartera.
              </p>
            </div>
            <div className="customer-directory-actions">
              <span className="customer-security-icon"><ShieldCheck size={24} /></span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exportClientsToExcel}
                disabled={visibleClients.length === 0}
              >
                <FileSpreadsheet size={15} /> Descargar Excel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setBulkImportOpen(true)}
              >
                <Upload size={15} /> Carga masiva
              </Button>
            </div>
          </div>

          <div className="segmented-control customer-access-tabs">
            <button
              type="button"
              className={accessMode === "search" ? "is-active" : ""}
              onClick={() => changeAccessMode("search")}
            >
              <Search size={16} /> Buscar cliente
            </button>
            <button
              type="button"
              className={accessMode === "seller" ? "is-active" : ""}
              onClick={() => changeAccessMode("seller")}
            >
              <KeyRound size={16} /> Vendedor o master
            </button>
          </div>

          {accessMode === "seller" && !authorizedSeller && !masterAuthorized ? (
            <div className="customer-access-controls">
              <div className="customer-access-code-row">
                <div className="search-input-wrap">
                  <KeyRound size={17} />
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") authorizeSeller();
                    }}
                    placeholder="Clave de 4 dígitos"
                    aria-label="Clave de acceso de vendedor o master"
                  />
                </div>
                <Button
                  type="button"
                  onClick={authorizeSeller}
                  disabled={accessCode.trim().length !== 4}
                >
                  Consultar
                </Button>
              </div>
              <span
                className={
                  accessError
                    ? "customer-access-error"
                    : "customer-access-note"
                }
              >
                {accessError ||
                  "Usa el alias y código personal autorizado."}
              </span>
            </div>
          ) : (
            <>
              {(authorizedSeller || masterAuthorized) && (
                <div className="customer-access-session">
                  <div>
                    <span className="seller-avatar">
                      {masterAuthorized
                        ? masterUser.initials
                        : authorizedSeller?.initials}
                    </span>
                    <span>
                      <strong>
                        {masterAuthorized
                          ? masterUser.name
                          : authorizedSeller?.name}
                      </strong>
                      <small>
                        {masterAuthorized
                          ? "Acceso master al directorio completo."
                          : "Consulta limitada a sus propios registros."}
                      </small>
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAuthorizedSellerId("");
                      setMasterAuthorized(false);
                    }}
                  >
                    <LogOut size={15} /> Cerrar acceso
                  </Button>
                  {(masterAuthorized || authorizedSeller) && (
                    <Button
                      type="button"
                      variant={debtOnly ? "default" : "outline"}
                      className="customer-debt-search-button"
                      onClick={() => setDebtOnly((current) => !current)}
                    >
                      <AlertTriangle size={15} />
                      {debtOnly
                        ? masterAuthorized
                          ? "Mostrando adeudos"
                          : "Mostrando mis adeudos"
                        : masterAuthorized
                          ? "Clientes con adeudo"
                          : "Mis clientes con adeudo"}
                    </Button>
                  )}
                </div>
              )}
              <div className="customer-query-grid">
                <div className="field-stack">
                  <span>Nombre</span>
                  <div className="search-input-wrap">
                    <Search size={16} />
                    <Input
                      value={nameSearch}
                      onChange={(event) => setNameSearch(event.target.value)}
                      placeholder="Nombre o apellido"
                    />
                  </div>
                </div>
                <div className="field-stack">
                  <span>Teléfono</span>
                  <div className="search-input-wrap">
                    <Phone size={16} />
                    <Input
                      value={phoneSearch}
                      onChange={(event) => setPhoneSearch(event.target.value)}
                      placeholder="Número telefónico"
                    />
                  </div>
                </div>
                <div className="field-stack">
                  <span>Vendedor</span>
                  <Select value={sellerFilter} onValueChange={setSellerFilter}>
                    <SelectTrigger aria-label="Filtrar clientes por vendedor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos los vendedores</SelectItem>
                      {activeSellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="field-stack">
                  <span>Compra desde</span>
                  <Input
                    type="number"
                    min="0"
                    value={minimumAmount}
                    onChange={(event) => setMinimumAmount(event.target.value)}
                    placeholder="$0"
                  />
                </div>
                <div className="field-stack">
                  <span>Compra hasta</span>
                  <Input
                    type="number"
                    min="0"
                    value={maximumAmount}
                    onChange={(event) => setMaximumAmount(event.target.value)}
                    placeholder="Sin límite"
                  />
                </div>
              </div>
              <div className="customer-branch-filter">
                <span>SUCURSAL DE COMPRA</span>
                <button
                  type="button"
                  className={selectedBranches.length === 0 ? "is-active" : ""}
                  onClick={() => setSelectedBranches([])}
                >
                  Todas
                </button>
                {branches.map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    className={
                      selectedBranches.includes(branch) ? "is-active" : ""
                    }
                    onClick={() => toggleBranch(branch)}
                  >
                    {branch}
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {visibleClients.length > 0 ? (
        <Card className="data-card customer-register-card">
          <CardContent className="p-0">
            <div className="data-card-heading">
              <div>
                <span>REGISTROS AUTORIZADOS</span>
                <h2>Clientes encontrados</h2>
              </div>
              <Badge variant="outline">{visibleClients.length} registros</Badge>
            </div>
            <div className="table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FOLIO</TableHead>
                    <TableHead>NOMBRE COMPLETO</TableHead>
                    <TableHead>TELÉFONO</TableHead>
                    <TableHead>CUMPLEAÑOS</TableHead>
                    <TableHead>MEMBRESÍAS</TableHead>
                    <TableHead>COMPRA TOTAL</TableHead>
                    <TableHead className="text-right">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerPagination.paginatedItems.map((client) => {
                    const purchases = clientTickets(client);
                    const membershipSummary = clientMembershipSummary(client.id);
                    const customerAppointments = clientAppointments(client);
                    const customerVouchers = clientVouchers(client);
                    const customerProductDebts = owedProducts.filter(
                      (record) =>
                        record.clientId === client.id ||
                        normalizePhone(record.clientPhone) ===
                          normalizePhone(client.phone),
                    );
                    const customerLayaways = layaways.filter(
                      (layaway) =>
                        layaway.clientId === client.id ||
                        normalizePhone(layaway.clientPhone) ===
                          normalizePhone(client.phone),
                    );
                    const purchaseTotal = purchases.reduce(
                      (sum, ticket) => sum + ticket.total,
                      0,
                    );
                    const outstandingBalance = clientOutstandingBalance(client);
                    const outstandingTickets = purchases.filter(
                      (ticket) => ticket.balanceDue > 0.01,
                    );
                    const expanded = expandedClientId === client.id;
                    const previousOwner = getPreviousClientOwner(client);
                    return (
                      <Fragment key={client.id}>
                        <TableRow>
                          <TableCell>
                            <strong>{client.registrationFolio}</strong>
                          </TableCell>
                          <TableCell>
                            <div className="customer-table-name">
                              <span>
                                {client.firstName.charAt(0)}
                                {client.lastName.charAt(0)}
                              </span>
                              <strong>
                                {client.firstName} {client.lastName}
                              </strong>
                              {outstandingBalance > 0.01 && (
                                <span className="customer-debt-badge">
                                  <AlertTriangle size={12} /> Adeudo {formatCurrency(outstandingBalance)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{client.phone || "Sin teléfono"}</TableCell>
                          <TableCell>
                            {client.birthday || "Sin registro"}
                          </TableCell>
                          <TableCell>
                            <CustomerMembershipPreview
                              clientName={`${client.firstName} ${client.lastName}`}
                              summary={membershipSummary}
                            />
                          </TableCell>
                          <TableCell>
                            <strong>{formatCurrency(purchaseTotal)}</strong>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="customer-row-actions">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={`Visualizar expediente de ${client.firstName}`}
                                title="Visualizar"
                                onClick={() =>
                                  setExpandedClientId(expanded ? "" : client.id)
                                }
                              >
                                {expanded ? (
                                  <ChevronUp size={15} />
                                ) : (
                                  <Eye size={15} />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={`Imprimir expediente de ${client.firstName}`}
                                title="Imprimir"
                                onClick={() => printClient(client)}
                              >
                                <Printer size={15} />
                              </Button>
                              {masterAuthorized && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={`Editar cliente ${client.firstName}`}
                                    title="Editar"
                                    onClick={() => setEditingClient({ ...client })}
                                  >
                                    <Pencil size={15} />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="customer-delete-action"
                                    aria-label={`Borrar cliente ${client.firstName}`}
                                    title="Borrar"
                                    onClick={() => {
                                      setDeletingClient(client);
                                      setDeleteFolio("");
                                      setDeleteMasterCode("");
                                    }}
                                  >
                                    <Trash2 size={15} />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow className="customer-history-row">
                            <TableCell colSpan={7}>
                              <div className="customer-history-panel">
                                {outstandingBalance > 0.01 && (
                                  <div className="customer-debt-alert">
                                    <AlertTriangle size={21} />
                                    <span>
                                      <strong>Cliente con saldo pendiente</strong>
                                      <small>
                                        {outstandingTickets.length} {outstandingTickets.length === 1 ? "ticket pendiente" : "tickets pendientes"} · Total por cobrar {formatCurrency(outstandingBalance)}
                                      </small>
                                    </span>
                                  </div>
                                )}
                                <div className="customer-profile-summary">
                                  <div>
                                    <ReceiptText size={17} />
                                    <span>
                                      <small>REGISTRO</small>
                                      <strong>{client.registrationFolio}</strong>
                                    </span>
                                  </div>
                                  <div>
                                    <CalendarDays size={17} />
                                    <span>
                                      <small>FECHA DE ALTA</small>
                                      <strong>
                                        {new Date(
                                          client.registeredAtIso,
                                        ).toLocaleDateString("es-MX")}
                                      </strong>
                                    </span>
                                  </div>
                                  <div>
                                    <Building2 size={17} />
                                    <span>
                                      <small>PROCEDENCIA</small>
                                      <strong>{client.sourceLabel}</strong>
                                    </span>
                                  </div>
                                  <div>
                                    {getClientOwner(client) ===
                                    "Keysar Cosmetics" ? (
                                      <Building2 size={17} />
                                    ) : (
                                      <UserRound size={17} />
                                    )}
                                    <span>
                                      <small>PERTENECE A</small>
                                      <strong>{getClientOwner(client)}</strong>
                                    </span>
                                  </div>
                                  {previousOwner && (
                                    <div>
                                      <UserRound size={17} />
                                      <span>
                                        <small>VENDEDOR ANTERIOR</small>
                                        <strong>{previousOwner.name}</strong>
                                        <em>
                                          {previousOwner.active
                                            ? "Cuenta reactivada · relación anterior"
                                            : "Inactivo"}
                                          {previousOwner.endedAtIso
                                            ? ` · Cartera transferida ${new Date(previousOwner.endedAtIso).toLocaleDateString("es-MX")}`
                                            : " · Cartera de empresa"}
                                        </em>
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <CreditCard size={17} />
                                    <span>
                                      <small>MEMBRESÍAS</small>
                                      <strong>
                                        {membershipSummary.active} {membershipSummary.active === 1 ? "activa" : "activas"}
                                      </strong>
                                      <em>{membershipSummary.total} compradas</em>
                                    </span>
                                  </div>
                                </div>
                                {customerLayaways.length > 0 && (
                                  <div className="customer-layaway-section">
                                    <div className="section-title-row">
                                      <div>
                                        <span className="section-kicker">
                                          TICKETS Y PAGOS
                                        </span>
                                        <h3>
                                          <CreditCard size={16} /> Apartados liquidados y Add payment
                                        </h3>
                                      </div>
                                      <Badge variant="outline">
                                        {customerLayaways.filter(
                                          (layaway) => layaway.status === "ACTIVE",
                                        ).length} activos
                                      </Badge>
                                    </div>
                                    {customerLayaways.map((layaway) => {
                                      const sellerId =
                                        layaway.sellerIds.find((id) =>
                                          sellers.some(
                                            (seller) =>
                                              seller.id === id && seller.active,
                                          ),
                                        ) ??
                                        client.ownerId ??
                                        activeSellers[0]?.id ??
                                        "";
                                      return (
                                        <Card
                                          key={layaway.id}
                                          className="layaway-account-card"
                                        >
                                          <CardContent>
                                            <div className="layaway-account-heading">
                                              <span>
                                                <strong>
                                                  {layaway.originalTicketId}
                                                </strong>
                                                <small>
                                                  {layaway.createdAt} · {layaway.branch}
                                                </small>
                                              </span>
                                              <span>
                                                <small>PAGADO</small>
                                                <strong>
                                                  {formatCurrency(
                                                    layaway.amountPaid,
                                                  )}
                                                </strong>
                                              </span>
                                              <span>
                                                <small>SALDO</small>
                                                <strong>
                                                  {formatCurrency(
                                                    layaway.balanceDue,
                                                  )}
                                                </strong>
                                              </span>
                                              <Badge
                                                className={
                                                  layaway.status === "PAID"
                                                    ? "layaway-status-paid"
                                                    : undefined
                                                }
                                                variant={
                                                  layaway.status === "PAID"
                                                    ? "default"
                                                    : "outline"
                                                }
                                              >
                                                {layaway.status === "PAID"
                                                  ? "LIQUIDADO"
                                                  : "PENDIENTE"}
                                              </Badge>
                                            </div>
                                            <div className="layaway-products-summary">
                                              {layaway.items.map((item) => (
                                                <span key={item.cartItemId}>
                                                  {item.productName}: {item.deliveredQuantity}/{item.quantity} entregado(s)
                                                </span>
                                              ))}
                                            </div>
                                            <div className="layaway-payment-history">
                                              {layaway.payments.map((payment) => (
                                                <div key={payment.id}>
                                                  <span>
                                                    <strong>{payment.folio}</strong>
                                                    <small>{payment.createdAt}</small>
                                                  </span>
                                                  <span>
                                                    {(payment.payments ?? [{
                                                      id: payment.id,
                                                      methodId: payment.methodId,
                                                      amount: payment.amount,
                                                    }])
                                                      .map(
                                                        (entry) =>
                                                          `${paymentLabel(entry.methodId)}${entry.cardNetwork ? ` · ${cardNetworkLabels[entry.cardNetwork]}` : ""}${entry.cardOrBank ? ` · ${entry.cardOrBank}` : ""}${entry.authorizationCode ? ` · Aut. ${entry.authorizationCode}` : ""} ${formatCurrency(entry.amount)}`,
                                                      )
                                                      .join(" + ")}
                                                    {typeof payment.balanceAfter === "number" && (
                                                      <small>
                                                        Saldo {formatCurrency(payment.balanceAfter)}
                                                      </small>
                                                    )}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                            {layaway.status === "ACTIVE" && (
                                              <LayawayPaymentDialog
                                                layaway={layaway}
                                                paymentMethods={paymentMethods}
                                                bankCatalog={bankCatalog}
                                                sellerId={sellerId}
                                                onRegister={(payments, deliveryIds) =>
                                                  onRegisterLayawayPayment(
                                                    layaway.id,
                                                    payments,
                                                    sellerId,
                                                    deliveryIds,
                                                  )
                                                }
                                              />
                                            )}
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="customer-history-columns">
                                  <section>
                                    <h3>
                                      <ReceiptText size={16} /> Historial de
                                      compra
                                    </h3>
                                    {purchases.map((ticket) => (
                                      <article
                                        key={ticket.id}
                                        className="customer-history-item"
                                      >
                                        <div>
                                          <strong>{ticket.id}</strong>
                                          <Badge variant="outline">
                                            {ticket.paymentStatus}
                                          </Badge>
                                        </div>
                                        <p>
                                          {ticket.products
                                            .map(
                                              (product) =>
                                                `${product.quantity} × ${product.name}`,
                                            )
                                            .join(" · ")}
                                        </p>
                                        {ticket.payments.length > 0 && (
                                          <div className="customer-history-payment-summary">
                                            {ticket.payments.map((payment) => (
                                              <small key={payment.id}>
                                                {paymentLabel(payment.methodId)}
                                                {payment.cardType === "CREDIT"
                                                  ? payment.installmentMonths &&
                                                    payment.installmentMonths > 1
                                                    ? ` · ${payment.installmentMonths} MSI`
                                                    : " · una exhibición"
                                                  : payment.cardType === "DEBIT"
                                                    ? " · débito"
                                                    : ""}
                                                {` · ${formatCurrency(payment.amount)}`}
                                              </small>
                                            ))}
                                          </div>
                                        )}
                                        <footer>
                                          <span>
                                            <Store size={13} />{" "}
                                            {ticket.branchName ?? "Polanco"}
                                          </span>
                                          <span>{ticket.createdAt}</span>
                                          <strong>
                                            {formatCurrency(ticket.total)}
                                          </strong>
                                        </footer>
                                      </article>
                                    ))}
                                    {purchases.length === 0 && (
                                      <p className="empty-inline">
                                        Sin compras registradas.
                                      </p>
                                    )}
                                  </section>
                                  <section>
                                    <h3>
                                      <CalendarDays size={16} /> Citas y
                                      cortesías
                                    </h3>
                                    {customerAppointments.map((appointment) => (
                                      <article
                                        key={appointment.id}
                                        className="customer-history-item"
                                      >
                                        <div>
                                          <strong>{appointment.service}</strong>
                                          <Badge variant="outline">
                                            {appointment.status}
                                          </Badge>
                                        </div>
                                        <p>
                                          {appointment.date} · {appointment.time}
                                        </p>
                                        <footer>
                                          <span>
                                            <Store size={13} />{" "}
                                            {appointment.branch}
                                          </span>
                                          <span>{appointment.kind}</span>
                                        </footer>
                                      </article>
                                    ))}
                                    {customerAppointments.length === 0 && (
                                      <p className="empty-inline">
                                        Sin citas registradas.
                                      </p>
                                    )}
                                  </section>
                                  <section>
                                    <h3>
                                      <AlertTriangle size={16} /> Productos por entregar
                                    </h3>
                                    {customerProductDebts.map((record) => (
                                      <article
                                        key={record.id}
                                        className="customer-history-item"
                                      >
                                        <div>
                                          <strong>{record.productName}</strong>
                                          <Badge variant="outline">
                                            {record.status === "PENDING"
                                              ? "PENDIENTE"
                                              : record.status === "FULFILLED"
                                                ? "ENTREGADO"
                                                : "CANCELADO"}
                                          </Badge>
                                        </div>
                                        <p>
                                          Debe {record.quantity - record.deliveredQuantity} · Entregado {record.deliveredQuantity} de {record.quantity}
                                        </p>
                                        <footer>
                                          <span><Store size={13} /> {record.branch}</span>
                                          <span>{record.sellerNames.join(" / ") || "Empresa"}</span>
                                        </footer>
                                        {record.deliveryHistory.map((delivery) => (
                                          <small key={delivery.id}>
                                            Entrega: {delivery.quantity} pza · {delivery.deliveredAt}
                                          </small>
                                        ))}
                                      </article>
                                    ))}
                                    {customerProductDebts.length === 0 && (
                                      <p className="empty-inline">
                                        Sin compromisos de producto.
                                      </p>
                                    )}
                                  </section>
                                  <section>
                                    <h3>
                                      <Gift size={16} /> Vouchers entregados
                                      <Badge variant="outline">
                                        {customerVouchers.length}
                                      </Badge>
                                    </h3>
                                    {customerVouchers.map((voucher) => {
                                      const promotionCount = customerVouchers.filter(
                                        (issue) => issue.voucherId === voucher.voucherId,
                                      ).length;
                                      return (
                                        <article
                                          key={voucher.id}
                                          className="customer-history-item"
                                        >
                                          <div>
                                            <strong>{voucher.voucherName}</strong>
                                            <Badge variant="outline">
                                              {voucher.status === "ISSUED"
                                                ? "ENTREGADO"
                                                : voucher.status === "REDEEMED"
                                                  ? "CANJEADO"
                                                  : "CANCELADO"}
                                            </Badge>
                                          </div>
                                          <p>
                                            {voucher.folio} · Esta promoción se ha
                                            entregado {promotionCount} {promotionCount === 1
                                              ? "vez"
                                              : "veces"} a la clienta.
                                          </p>
                                          <footer>
                                            <span>
                                              <Store size={13} /> {voucher.branch}
                                            </span>
                                            <span>
                                              {new Date(
                                                voucher.issuedAtIso,
                                              ).toLocaleString("es-MX")}
                                            </span>
                                            <strong>{voucher.ticketId}</strong>
                                          </footer>
                                        </article>
                                      );
                                    })}
                                    {customerVouchers.length === 0 && (
                                      <p className="empty-inline">
                                        Sin vouchers entregados.
                                      </p>
                                    )}
                                  </section>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <HistoryPagination
              total={visibleClients.length}
              page={customerPagination.page}
              pageSize={customerPagination.pageSize}
              pageCount={customerPagination.pageCount}
              onPageChange={customerPagination.setPage}
              onPageSizeChange={customerPagination.setPageSize}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="customer-locked-empty">
          {accessMode === "search" ? (
            <Search size={28} />
          ) : (
            <KeyRound size={28} />
          )}
          <h3>Directorio protegido</h3>
          <p>{emptyMessage}</p>
        </div>
      )}

      <Card className="customer-birthday-dashboard">
        <CardContent>
          <div className="birthday-dashboard-heading">
            <div>
              <span className="section-kicker">CUMPLEAÑOS DE CLIENTES</span>
              <h2>Celebraciones y tarjetas</h2>
              <p>
                Consulta las celebraciones autorizadas y crea una felicitación
                personalizada con la identidad de la empresa.
              </p>
            </div>
            <CakeSlice size={28} />
          </div>
          {birthdayScope.length > 0 ? (
            <div className="birthday-lists-grid">
              <section className="birthday-list-card is-today">
                <header>
                  <span><Gift size={17} /> CUMPLEAÑOS DE HOY</span>
                  <Badge>{todayBirthdays.length}</Badge>
                </header>
                <div>
                  {todayBirthdays.map((client) => (
                    <article key={client.id}>
                      <span className="birthday-client-avatar">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </span>
                      <div>
                        <strong>{client.firstName} {client.lastName}</strong>
                        <small>{client.whatsapp || client.phone} · {getClientOwner(client)}</small>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setBirthdayClient(client)}
                      >
                        <Sparkles size={14} /> Crear tarjeta
                      </Button>
                    </article>
                  ))}
                  {todayBirthdays.length === 0 && (
                    <p className="empty-inline">No hay cumpleaños registrados para hoy.</p>
                  )}
                </div>
              </section>
              <section className="birthday-list-card">
                <header>
                  <span><CalendarDays size={17} /> CUMPLEAÑOS DEL MES</span>
                  <Badge variant="outline">{monthlyBirthdays.length}</Badge>
                </header>
                <div>
                  {monthlyBirthdays.map((client) => {
                    const [, , birthdayDay] = birthdayParts(client);
                    return (
                      <article key={client.id}>
                        <span className="birthday-day-badge">{String(birthdayDay).padStart(2, "0")}</span>
                        <div>
                          <strong>{client.firstName} {client.lastName}</strong>
                          <small>{client.whatsapp || client.phone}</small>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setBirthdayClient(client)}
                        >
                          <Gift size={14} /> Felicitar
                        </Button>
                      </article>
                    );
                  })}
                  {monthlyBirthdays.length === 0 && (
                    <p className="empty-inline">No hay cumpleaños registrados este mes.</p>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="birthday-locked-state">
              <ShieldCheck size={22} />
              <span>
                <strong>Información protegida</strong>
                <small>Busca una clienta o ingresa la clave del vendedor/master para consultar cumpleaños.</small>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={bulkImportOpen}
        onOpenChange={(open) => {
          setBulkImportOpen(open);
          if (!open) {
            setBulkMasterCode("");
            setBulkFilename("");
            setBulkImportRows([]);
            setBulkImportErrors([]);
          }
        }}
      >
        <DialogContent className="customer-bulk-dialog sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Carga masiva de clientes</DialogTitle>
            <DialogDescription>
              Descarga la plantilla, completa una clienta por fila y vuelve a cargar el archivo XLSX.
            </DialogDescription>
          </DialogHeader>
          <div className="bulk-import-steps">
            <section>
              <span className="bulk-step-number">1</span>
              <div>
                <strong>Descargar plantilla</strong>
                <small>Incluye ejemplo, campos obligatorios y catálogos permitidos.</small>
              </div>
              <Button type="button" variant="outline" onClick={downloadBulkTemplate}>
                <FileSpreadsheet size={15} /> Descargar XLSX
              </Button>
            </section>
            <section>
              <span className="bulk-step-number">2</span>
              <div>
                <strong>Seleccionar archivo completado</strong>
                <small>{bulkFilename || "Sólo archivos .xlsx o .xls"}</small>
              </div>
              <label className="bulk-file-button" htmlFor="bulk-client-file">
                <Upload size={15} /> Elegir archivo
              </label>
              <input
                id="bulk-client-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={readBulkClientFile}
              />
            </section>
          </div>
          {(bulkImportRows.length > 0 || bulkImportErrors.length > 0) && (
            <div className="bulk-import-result">
              <div>
                <CheckCircle2 size={17} />
                <span><strong>{bulkImportRows.length} válidos</strong><small>Listos para agregar</small></span>
              </div>
              <div className={bulkImportErrors.length > 0 ? "has-errors" : ""}>
                <AlertTriangle size={17} />
                <span><strong>{bulkImportErrors.length} observaciones</strong><small>{bulkImportErrors.slice(0, 3).join(" · ") || "Sin errores"}</small></span>
              </div>
            </div>
          )}
          {!masterAuthorized && (
            <div className="field-stack">
              <Label>Código master para confirmar la carga</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={bulkMasterCode}
                onChange={(event) => setBulkMasterCode(event.target.value)}
                placeholder="Código de 4 dígitos"
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkImportOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                bulkImportRows.length === 0 ||
                (!masterAuthorized && !isMasterCode(bulkMasterCode))
              }
              onClick={confirmBulkImport}
            >
              <Upload size={15} /> Importar {bulkImportRows.length} clientes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={birthdayClient !== null} onOpenChange={(open) => !open && setBirthdayClient(null)}>
        <DialogContent className="birthday-card-dialog sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Tarjeta de cumpleaños</DialogTitle>
            <DialogDescription>
              Elige un diseño de temporada, personaliza el mensaje y descarga o comparte la tarjeta.
            </DialogDescription>
          </DialogHeader>
          {birthdayClient && selectedBirthdayMessage && (
            <div className="birthday-card-workspace">
              <div className="birthday-card-controls">
                <div className="field-stack">
                  <Label>Diseño por temporada</Label>
                  <div className="birthday-design-grid">
                    {birthdayDesigns.map((design) => (
                      <button
                        key={design.id}
                        type="button"
                        className={selectedBirthdayDesignId === design.id ? "is-selected" : ""}
                        onClick={() => setSelectedBirthdayDesignId(design.id)}
                      >
                        <span style={{ background: `linear-gradient(135deg, ${design.colors[0]}, ${design.colors[1]})` }} />
                        <strong>{design.name}</strong>
                        <small>{design.season}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field-stack">
                  <Label>Mensaje</Label>
                  <Select value={selectedBirthdayMessageId} onValueChange={setSelectedBirthdayMessageId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {birthdayMessages.map((message) => (
                        <SelectItem key={message.id} value={message.id}>{message.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <textarea
                    className="birthday-message-editor"
                    value={selectedBirthdayMessage.text}
                    onChange={(event) => updateSelectedBirthdayMessage(event.target.value)}
                  />
                  <div className="birthday-message-actions">
                    <Button type="button" variant="outline" size="sm" onClick={addBirthdayMessage}>
                      <Plus size={14} /> Nuevo
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => toast.success("Mensaje guardado para esta sesión.")}>
                      <Save size={14} /> Guardar
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="icon-action-button is-danger" onClick={deleteBirthdayMessage} aria-label="Borrar mensaje" title="Borrar">
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              </div>
              <article
                className={`birthday-card-preview design-${selectedBirthdayDesign.id}`}
                style={{
                  "--birthday-bg": selectedBirthdayDesign.colors[0],
                  "--birthday-accent": selectedBirthdayDesign.colors[1],
                  "--birthday-ink": selectedBirthdayDesign.colors[2],
                } as CSSProperties}
              >
                <i className="birthday-orb orb-one" />
                <i className="birthday-orb orb-two" />
                {receiptSettings.logoUrl && <img src={receiptSettings.logoUrl} alt={receiptSettings.companyName} />}
                <small>{receiptSettings.companyName}</small>
                <span>Una celebración para ti</span>
                <strong>{birthdayClient.firstName}</strong>
                <h3>¡Feliz cumpleaños!</h3>
                <p>{selectedBirthdayMessage.text}</p>
                <footer>Con cariño, {receiptSettings.companyName}</footer>
              </article>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBirthdayClient(null)}>
              Cerrar
            </Button>
            <Button type="button" variant="outline" onClick={downloadBirthdayCard}>
              <ImageDown size={16} /> Descargar PNG
            </Button>
            <Button type="button" onClick={shareBirthdayCard}>
              <MessageCircle size={16} /> Enviar por WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingClient !== null}
        onOpenChange={(open) => {
          if (!open) setEditingClient(null);
        }}
      >
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Editar registro de cliente</DialogTitle>
            <DialogDescription>
              Acceso master. Los datos vigentes se actualizarán en los módulos relacionados.
            </DialogDescription>
          </DialogHeader>
          {editingClient && (
            <div className="customer-edit-grid">
              <div className="field-stack">
                <Label>Nombre</Label>
                <Input
                  value={editingClient.firstName}
                  onChange={(event) =>
                    setEditingClient({ ...editingClient, firstName: event.target.value })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Apellido</Label>
                <Input
                  value={editingClient.lastName}
                  onChange={(event) =>
                    setEditingClient({ ...editingClient, lastName: event.target.value })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Teléfono</Label>
                <Input
                  value={editingClient.phone}
                  onChange={(event) =>
                    setEditingClient({ ...editingClient, phone: event.target.value })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>WhatsApp</Label>
                <Input
                  value={editingClient.whatsapp}
                  onChange={(event) =>
                    setEditingClient({ ...editingClient, whatsapp: event.target.value })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Cumpleaños</Label>
                <Input
                  type="date"
                  value={editingClient.birthday}
                  onChange={(event) =>
                    setEditingClient({ ...editingClient, birthday: event.target.value })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Género</Label>
                <Select
                  value={editingClient.gender || "Sin especificar"}
                  onValueChange={(gender) => setEditingClient({ ...editingClient, gender })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="No binario">No binario</SelectItem>
                    <SelectItem value="Sin especificar">Sin especificar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field-stack customer-edit-wide">
                <Label>Vendedor asignado</Label>
                <Select
                  value={editingClient.ownerId ?? "COMPANY"}
                  onValueChange={(ownerId) =>
                    setEditingClient({
                      ...editingClient,
                      ownerId: ownerId === "COMPANY" ? null : ownerId,
                      companyLocked: ownerId === "COMPANY",
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY">Keysar Cosmetics</SelectItem>
                    {activeSellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingClient(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveClientEdit}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingClient !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingClient(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Doble validación para borrar</DialogTitle>
            <DialogDescription>
              El cliente saldrá del directorio activo. Sus tickets e historial no se eliminan.
            </DialogDescription>
          </DialogHeader>
          {deletingClient && (
            <div className="customer-delete-validation">
              <div className="customer-delete-warning">
                <AlertTriangle size={18} />
                <span><strong>{deletingClient.firstName} {deletingClient.lastName}</strong><small>{deletingClient.registrationFolio}</small></span>
              </div>
              <div className="field-stack">
                <Label>1. Escribe el folio del cliente</Label>
                <Input
                  value={deleteFolio}
                  onChange={(event) => setDeleteFolio(event.target.value)}
                  placeholder={deletingClient.registrationFolio}
                />
              </div>
              <div className="field-stack">
                <Label>2. Confirma con código master</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={deleteMasterCode}
                  onChange={(event) => setDeleteMasterCode(event.target.value)}
                  placeholder="Código de 4 dígitos"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingClient(null)}>
              Conservar cliente
            </Button>
            <Button
              type="button"
              size="icon"
              className="customer-confirm-delete icon-action-button is-danger"
              aria-label="Borrar registro"
              title="Borrar registro"
              disabled={
                !deletingClient ||
                deleteFolio.trim() !== deletingClient.registrationFolio ||
                !isMasterCode(deleteMasterCode)
              }
              onClick={confirmClientDeletion}
            >
              <Trash2 size={16} />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
