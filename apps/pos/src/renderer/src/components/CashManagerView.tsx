import { useEffect, useMemo, useState } from "react";
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
  toast,
} from "@cosmetics/ui";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  WalletCards,
  X,
} from "lucide-react";
import { formatCurrency, masterUser } from "../mock-data";
import type { CashExpense, ExpenseType, Seller } from "../types";
import { HistoryPagination } from "./HistoryPagination";

const businessDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const formatCreatedAt = (date: Date) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  })
    .format(date)
    .replace(",", " ·");

const createExpenseFolio = (expenses: CashExpense[]) => {
  const existing = new Set(expenses.map((expense) => expense.folio));
  let folio = "";
  do {
    folio = `GTO-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  } while (existing.has(folio));
  return folio;
};

const emptyForm = {
  typeId: "",
  amount: "",
  branch: "",
  sellerId: "",
  concept: "",
  comment: "",
  expenseDate: businessDate(),
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalizeAccessUser = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-MX");

const matchesAccessUser = (name: string, id: string, input: string) => {
  const normalizedName = normalizeAccessUser(name);
  return [normalizedName, normalizedName.split(" ")[0], normalizeAccessUser(id)].includes(input);
};

interface CashManagerViewProps {
  sellers: Seller[];
  branches: string[];
  activeBranch: string;
  expenseTypes: ExpenseType[];
  expenses: CashExpense[];
  companyName: string;
  logoUrl: string;
  isMasterCode: (code: string) => boolean;
  apiManaged?: boolean;
  operator?: { id: string; name: string; isMaster: boolean } | null;
  onCreateExpense: (expense: CashExpense) => void;
  onUpdateExpense: (expense: CashExpense) => void;
  onVoidExpense: (id: string) => void;
}

export function CashManagerView({
  sellers,
  branches,
  activeBranch,
  expenseTypes,
  expenses,
  companyName,
  logoUrl,
  isMasterCode,
  apiManaged = false,
  operator = null,
  onCreateExpense,
  onUpdateExpense,
  onVoidExpense,
}: CashManagerViewProps) {
  const today = businessDate();
  const activeSellers = sellers.filter((seller) => seller.active);
  const [loginSellerId, setLoginSellerId] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loggedSellerId, setLoggedSellerId] = useState("");
  const [masterAuthorized, setMasterAuthorized] = useState(false);
  const [masterCode, setMasterCode] = useState("");
  const [reminderOpen, setReminderOpen] = useState(false);
  const [movementCode, setMovementCode] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CashExpense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedExpense, setSelectedExpense] = useState<CashExpense | null>(null);
  const [dateFilter, setDateFilter] = useState(today);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sellerFilter, setSellerFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState(activeBranch);
  const [search, setSearch] = useState("");
  const [amountFrom, setAmountFrom] = useState("");
  const [amountTo, setAmountTo] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<"EXCEL" | "PDF" | null>(null);

  const loggedSeller =
    sellers.find((seller) => seller.id === loggedSellerId) ??
    (loggedSellerId === masterUser.id ? masterUser : undefined) ??
    (apiManaged && operator
      ? {
          id: operator.id,
          name: operator.name,
          alias: "",
          initials: operator.name.slice(0, 2).toLocaleUpperCase("es-MX"),
          active: true,
          accessCode: "",
          masterAccessCode: operator.isMaster ? "PROTECTED" : null,
          canViewCosts: false,
          roleId: "",
        }
      : undefined);

  useEffect(() => {
    if (apiManaged && operator) {
      setLoggedSellerId(operator.id);
      setMasterAuthorized(operator.isMaster);
    }
  }, [apiManaged, operator]);

  useEffect(() => {
    if (!masterAuthorized) return;
    let timeout = window.setTimeout(() => {
      setMasterAuthorized(false);
      setMasterCode("");
      setDateFilter(today);
      setBranchFilter(activeBranch);
      toast.info("Cash Manager master se bloqueó por inactividad.");
    }, 180_000);
    const renew = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        setMasterAuthorized(false);
        setMasterCode("");
        setDateFilter(today);
        setBranchFilter(activeBranch);
        toast.info("Cash Manager master se bloqueó por inactividad.");
      }, 180_000);
    };
    window.addEventListener("pointerdown", renew);
    window.addEventListener("keydown", renew);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pointerdown", renew);
      window.removeEventListener("keydown", renew);
    };
  }, [activeBranch, masterAuthorized, today]);

  useEffect(() => {
    if (branchFilter !== "ALL" && !branches.includes(branchFilter))
      setBranchFilter(masterAuthorized ? "ALL" : activeBranch);
    setForm((current) =>
      current.branch && !branches.includes(current.branch)
        ? { ...current, branch: activeBranch }
        : current,
    );
  }, [activeBranch, branchFilter, branches, masterAuthorized]);

  const visibleExpenses = useMemo(() => {
    const minimum = amountFrom ? Number(amountFrom) : null;
    const maximum = amountTo ? Number(amountTo) : null;
    return expenses
      .filter((expense) => branches.includes(expense.branch))
      .filter(
        (expense) =>
          masterAuthorized ||
          (expense.expenseDate === today && expense.branch === activeBranch),
      )
      .filter((expense) => !dateFilter || expense.expenseDate === dateFilter)
      .filter((expense) => typeFilter === "ALL" || expense.typeId === typeFilter)
      .filter((expense) => sellerFilter === "ALL" || expense.sellerId === sellerFilter)
      .filter((expense) => branchFilter === "ALL" || expense.branch === branchFilter)
      .filter((expense) => minimum === null || expense.amount >= minimum)
      .filter((expense) => maximum === null || expense.amount <= maximum)
      .filter((expense) => {
        const query = search.trim().toLocaleLowerCase("es-MX");
        if (!query) return true;
        return [
          expense.folio,
          expense.typeName,
          expense.sellerName,
          expense.concept,
          expense.comment,
        ].some((value) => value.toLocaleLowerCase("es-MX").includes(query));
      })
      .sort((left, right) => right.createdAtIso.localeCompare(left.createdAtIso));
  }, [
    amountFrom,
    amountTo,
    activeBranch,
    branchFilter,
    branches,
    dateFilter,
    expenses,
    masterAuthorized,
    search,
    sellerFilter,
    today,
    typeFilter,
  ]);

  const activeVisibleExpenses = visibleExpenses.filter(
    (expense) => expense.status === "ACTIVE",
  );
  const totalAmount = activeVisibleExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const averageAmount = activeVisibleExpenses.length
    ? totalAmount / activeVisibleExpenses.length
    : 0;
  const largestExpense = Math.max(
    0,
    ...activeVisibleExpenses.map((expense) => expense.amount),
  );
  const byType = Array.from(
    activeVisibleExpenses
      .reduce<Map<string, { name: string; amount: number; count: number }>>(
        (summary, expense) => {
          const current = summary.get(expense.typeId);
          summary.set(expense.typeId, {
            name: expense.typeName,
            amount: (current?.amount ?? 0) + expense.amount,
            count: (current?.count ?? 0) + 1,
          });
          return summary;
        },
        new Map(),
      )
      .values(),
  ).sort((left, right) => right.amount - left.amount);

  const pageCount = Math.max(1, Math.ceil(visibleExpenses.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedExpenses = visibleExpenses.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const login = () => {
    const normalizedUser = normalizeAccessUser(loginSellerId);
    const normalizedCode = loginCode.trim();
    const hasMasterCode = isMasterCode(normalizedCode);

    if (
      hasMasterCode &&
      matchesAccessUser(masterUser.name, masterUser.id, normalizedUser)
    ) {
      setLoggedSellerId(masterUser.id);
      setMasterAuthorized(true);
      setLoginCode("");
      setDateFilter(today);
      setBranchFilter("ALL");
      toast.success(`Cash Manager abierto para ${masterUser.name}.`);
      return;
    }

    const seller = activeSellers.find(
      (item) =>
        matchesAccessUser(item.alias, item.alias, normalizedUser) &&
        (hasMasterCode || item.accessCode === normalizedCode),
    );
    if (!seller) {
      toast.error("Usuario o código de empleado incorrecto.");
      return;
    }
    setLoggedSellerId(seller.id);
    setMasterAuthorized(hasMasterCode);
    setLoginCode("");
    setDateFilter(today);
    setBranchFilter(hasMasterCode ? "ALL" : activeBranch);
    toast.success(`Cash Manager abierto para ${seller.name}.`);
  };

  const unlockMaster = () => {
    if (!isMasterCode(masterCode)) {
      toast.error("Código master incorrecto.");
      return;
    }
    setMasterAuthorized(true);
    setMasterCode("");
    setBranchFilter("ALL");
    toast.success("Historial y acciones administrativas habilitadas por 3 minutos.");
  };

  const openNewExpense = () => {
    if (!loggedSeller) return;
    if (apiManaged) {
      setEditingExpense(null);
      setForm({
        ...emptyForm,
        sellerId: loggedSeller.id,
        branch: activeBranch,
        typeId: expenseTypes.find((type) => type.active)?.id ?? "",
        expenseDate: today,
      });
      setFormOpen(true);
      return;
    }
    setEditingExpense(null);
    setMovementCode("");
    setReminderOpen(true);
  };

  const authorizeMovement = () => {
    if (!loggedSeller) return;
    if (
      movementCode.trim() !== loggedSeller.accessCode &&
      !isMasterCode(movementCode)
    ) {
      toast.error("El código no autoriza este registro.");
      return;
    }
    setReminderOpen(false);
    setForm({
      ...emptyForm,
      sellerId: loggedSeller.id,
      branch: activeBranch,
      typeId: expenseTypes.find((type) => type.active)?.id ?? "",
      expenseDate: today,
    });
    setFormOpen(true);
  };

  const openEditExpense = (expense: CashExpense) => {
    if (!masterAuthorized) return;
    setEditingExpense(expense);
    setForm({
      typeId: expense.typeId,
      amount: String(expense.amount),
      branch: expense.branch,
      sellerId: expense.sellerId,
      concept: expense.concept,
      comment: expense.comment,
      expenseDate: expense.expenseDate,
    });
    setFormOpen(true);
  };

  const saveExpense = () => {
    const amount = Number(form.amount);
    const seller =
      sellers.find((item) => item.id === form.sellerId) ??
      (form.sellerId === masterUser.id ? masterUser : undefined) ??
      (apiManaged && loggedSeller?.id === form.sellerId ? loggedSeller : undefined);
    const type = expenseTypes.find((item) => item.id === form.typeId);
    if (!seller || !type || !form.branch || !form.concept.trim() || amount <= 0) {
      toast.error("Completa tipo, monto, sucursal, usuario y concepto.");
      return;
    }
    if (editingExpense) {
      onUpdateExpense({
        ...editingExpense,
        expenseDate: form.expenseDate,
        typeId: type.id,
        typeName: type.name,
        amount,
        branch: form.branch,
        sellerId: seller.id,
        sellerName: seller.name,
        concept: form.concept.trim(),
        comment: form.comment.trim(),
        authorizedBy: `${loggedSeller?.name ?? "Master"} · edición master`,
        updatedAtIso: new Date().toISOString(),
      });
      toast.success(`Gasto ${editingExpense.folio} actualizado.`);
    } else {
      const now = new Date();
      const expense: CashExpense = {
        id: crypto.randomUUID(),
        folio: createExpenseFolio(expenses),
        createdAt: formatCreatedAt(now),
        createdAtIso: now.toISOString(),
        expenseDate: form.expenseDate,
        typeId: type.id,
        typeName: type.name,
        amount,
        branch: form.branch,
        sellerId: seller.id,
        sellerName: seller.name,
        concept: form.concept.trim(),
        comment: form.comment.trim(),
        authorizedBy: `${loggedSeller?.name ?? seller.name} · código empleado`,
        status: "ACTIVE",
        updatedAtIso: null,
      };
      onCreateExpense(expense);
      setSelectedExpense(expense);
      toast.success(`Gasto registrado con folio ${expense.folio}.`);
    }
    setFormOpen(false);
    setEditingExpense(null);
    setPage(1);
  };

  const resetFilters = () => {
    setDateFilter(masterAuthorized ? "" : today);
    setTypeFilter("ALL");
    setSellerFilter("ALL");
    setBranchFilter(masterAuthorized ? "ALL" : activeBranch);
    setSearch("");
    setAmountFrom("");
    setAmountTo("");
    setPage(1);
  };

  const printExpense = (expense: CashExpense) => {
    if (!masterAuthorized) return;
    const popup = window.open("", "_blank", "width=520,height=760");
    if (!popup) {
      toast.error("Permite ventanas emergentes para imprimir el gasto.");
      return;
    }
    const logo = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="" style="max-width:92px;max-height:62px"/>`
      : "";
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(expense.folio)}</title><style>body{font-family:Arial,sans-serif;margin:28px;color:#171717}header{text-align:center;border-bottom:2px solid #171717;padding-bottom:14px}h1{font-size:20px;letter-spacing:3px;margin:8px 0}section{margin:18px 0}div{display:flex;justify-content:space-between;gap:18px;border-bottom:1px dotted #aaa;padding:9px 0}span{color:#666;font-size:12px}strong{font-size:13px;text-align:right}.total{border:2px solid #111;padding:13px;margin-top:18px;font-size:18px}footer{text-align:center;margin-top:25px;font-size:10px}</style></head><body><header>${logo}<h1>${escapeHtml(companyName)}</h1><strong>COMPROBANTE DE GASTO</strong></header><section><div><span>Folio</span><strong>${escapeHtml(expense.folio)}</strong></div><div><span>Fecha</span><strong>${escapeHtml(expense.createdAt)}</strong></div><div><span>Tipo</span><strong>${escapeHtml(expense.typeName)}</strong></div><div><span>Sucursal</span><strong>${escapeHtml(expense.branch)}</strong></div><div><span>Usuario</span><strong>${escapeHtml(expense.sellerName)}</strong></div><div><span>Concepto</span><strong>${escapeHtml(expense.concept)}</strong></div><div><span>Comentario</span><strong>${escapeHtml(expense.comment || "Sin comentario")}</strong></div><div><span>Autorización</span><strong>${escapeHtml(expense.authorizedBy)}</strong></div><div class="total"><span>TOTAL</span><strong>${escapeHtml(formatCurrency(expense.amount))}</strong></div></section><footer>REGISTRO MOCK · CASH MANAGER</footer><script>window.onload=()=>window.print();</script></body></html>`);
    popup.document.close();
  };

  const exportExcel = async () => {
    if (!masterAuthorized) return;
    setExporting("EXCEL");
    try {
      const XLSX = await import("xlsx");
      const rows = visibleExpenses.map((expense) => ({
        Folio: expense.folio,
        Fecha: expense.expenseDate,
        Hora: expense.createdAt,
        Tipo: expense.typeName,
        Sucursal: expense.branch,
        Usuario: expense.sellerName,
        Concepto: expense.concept,
        Comentario: expense.comment,
        Monto: expense.amount,
        Estado: expense.status === "ACTIVE" ? "Vigente" : "Anulado",
        Autorización: expense.authorizedBy,
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(rows),
        "Gastos",
      );
      XLSX.writeFile(workbook, `cash-manager-${dateFilter || "historico"}.xlsx`, {
        compression: true,
      });
      toast.success("Reporte de gastos descargado en Excel.");
    } catch {
      toast.error("No fue posible generar el archivo Excel.");
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    if (!masterAuthorized) return;
    setExporting("PDF");
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`${companyName} · Cash Manager`, 38, 42);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Periodo: ${dateFilter || "Histórico completo"} · ${visibleExpenses.length} registros`, 38, 59);
      doc.text(`Gasto vigente: ${formatCurrency(totalAmount)} · Promedio: ${formatCurrency(averageAmount)}`, 38, 73);
      autoTable(doc, {
        startY: 89,
        head: [["Folio", "Fecha", "Tipo", "Sucursal", "Usuario", "Concepto", "Monto", "Estado"]],
        body: visibleExpenses.map((expense) => [
          expense.folio,
          expense.expenseDate,
          expense.typeName,
          expense.branch,
          expense.sellerName,
          expense.concept,
          formatCurrency(expense.amount),
          expense.status === "ACTIVE" ? "Vigente" : "Anulado",
        ]),
        styles: { fontSize: 7, cellPadding: 5 },
        headStyles: { fillColor: [124, 90, 61] },
      });
      doc.save(`cash-manager-${dateFilter || "historico"}.pdf`);
      toast.success("Reporte ejecutivo descargado en PDF.");
    } catch {
      toast.error("No fue posible generar el archivo PDF.");
    } finally {
      setExporting(null);
    }
  };

  if (!loggedSeller && !apiManaged) {
    return (
      <Card className="cash-access-card">
        <CardContent>
          <div className="cash-access-icon"><WalletCards size={32} /></div>
          <span className="section-kicker">ACCESO POR EMPLEADO</span>
          <h2>Identifica al responsable de caja</h2>
          <p>Cada movimiento quedará ligado al usuario y código personal que autorice el registro.</p>
          <div className="cash-access-fields">
            <Input
              value={loginSellerId}
              onChange={(event) => setLoginSellerId(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") login(); }}
              placeholder="Escribe tu alias"
              aria-label="Alias de acceso de Cash Manager"
              autoComplete="username"
            />
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={loginCode}
              onChange={(event) => setLoginCode(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") login(); }}
              placeholder="Código de empleado"
              aria-label="Código de empleado para Cash Manager"
            />
            <Button type="button" onClick={login} disabled={!loginSellerId.trim() || loginCode.length !== 4}>
              <UserRoundCheck size={16} /> Ingresar
            </Button>
          </div>
          <small>Usa una credencial personal autorizada.</small>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="cash-manager-view">
      <Card className="cash-manager-hero">
        <CardContent>
          <div className="cash-manager-heading">
            <div>
              <span className="section-kicker">CAJA · {masterAuthorized ? "ACCESO MASTER" : "OPERACIÓN DEL DÍA"}</span>
              <h2>Gastos de operación</h2>
              <p>{loggedSeller?.name ?? "Operador POS"} · {masterAuthorized ? "historial y edición habilitados" : "consulta vigente sin edición"}</p>
            </div>
            <div className="cash-manager-actions">
              <Button type="button" onClick={openNewExpense}><Plus size={16} /> Registrar gasto</Button>
              <Button type="button" variant="outline" onClick={() => {
                setLoggedSellerId("");
                setMasterAuthorized(false);
                setLoginSellerId("");
              }}><LockKeyhole size={15} /> Cerrar usuario</Button>
            </div>
          </div>
          {!masterAuthorized && (
            <div className="cash-master-unlock">
              <ShieldCheck size={18} />
              <span><strong>Historial protegido</strong><small>Desbloquea fechas anteriores, edición, impresión y descargas.</small></span>
              <Input type="password" inputMode="numeric" maxLength={4} value={masterCode} onChange={(event) => setMasterCode(event.target.value)} placeholder="Código master" aria-label="Código master de Cash Manager" />
              <Button type="button" variant="outline" onClick={unlockMaster} disabled={masterCode.length !== 4}>Desbloquear</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="cash-metric-grid" aria-label="Dashboard de gastos">
        <Card><CardContent><CircleDollarSign size={20} /><span>GASTO VIGENTE</span><strong>{formatCurrency(totalAmount)}</strong><small>Según filtros activos</small></CardContent></Card>
        <Card><CardContent><ReceiptText size={20} /><span>MOVIMIENTOS</span><strong>{activeVisibleExpenses.length}</strong><small>{visibleExpenses.length - activeVisibleExpenses.length} anulados</small></CardContent></Card>
        <Card><CardContent><BarChart3 size={20} /><span>GASTO PROMEDIO</span><strong>{formatCurrency(averageAmount)}</strong><small>Por movimiento vigente</small></CardContent></Card>
        <Card><CardContent><AlertTriangle size={20} /><span>MAYOR GASTO</span><strong>{formatCurrency(largestExpense)}</strong><small>Registro de mayor importe</small></CardContent></Card>
      </section>

      <Card className="cash-filter-card">
        <CardContent>
          <div className="cash-filter-heading">
            <span><Filter size={17} /><strong>Filtros avanzados</strong></span>
            <div>
              {masterAuthorized && <Button type="button" variant="outline" onClick={exportExcel} disabled={Boolean(exporting)}><FileSpreadsheet size={15} /> {exporting === "EXCEL" ? "Generando…" : "Excel"}</Button>}
              {masterAuthorized && <Button type="button" variant="outline" onClick={exportPdf} disabled={Boolean(exporting)}><Download size={15} /> {exporting === "PDF" ? "Generando…" : "PDF"}</Button>}
              <Button type="button" variant="ghost" onClick={resetFilters}><RotateCcw size={15} /> Limpiar</Button>
            </div>
          </div>
          <div className="cash-filter-grid">
            <label><span><Search size={14} /> Buscar</span><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Folio, concepto o comentario" /></label>
            <label><span><CalendarDays size={14} /> Fecha</span>{masterAuthorized ? <DatePicker value={dateFilter} onChange={(value) => { setDateFilter(value); setPage(1); }} placeholder="Todo el historial" /> : <Input value={today} readOnly />}</label>
            <label><span>Tipo de gasto</span><Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos los tipos</SelectItem>{expenseTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent></Select></label>
            <label><span>Usuario</span><Select value={sellerFilter} onValueChange={(value) => { setSellerFilter(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos los usuarios</SelectItem>{activeSellers.map((seller) => <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>)}</SelectContent></Select></label>
            <label><span>Sucursal</span>{masterAuthorized ? <Select value={branchFilter} onValueChange={(value) => { setBranchFilter(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todas las sucursales</SelectItem>{branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent></Select> : <Input value={activeBranch} readOnly aria-label="Sucursal fija de Cash Manager" />}</label>
            <label><span>Monto desde</span><Input type="number" min="0" value={amountFrom} onChange={(event) => { setAmountFrom(event.target.value); setPage(1); }} placeholder="$0.00" /></label>
            <label><span>Monto hasta</span><Input type="number" min="0" value={amountTo} onChange={(event) => { setAmountTo(event.target.value); setPage(1); }} placeholder="Sin límite" /></label>
          </div>
        </CardContent>
      </Card>

      <div className="cash-manager-content">
        <Card className="data-card cash-expense-table-card">
          <CardContent>
            <div className="data-card-heading"><div><span>{masterAuthorized ? "HISTORIAL AUTORIZADO" : "MOVIMIENTOS DEL DÍA"}</span><h2>Registro de gastos</h2></div><Badge variant="outline">{visibleExpenses.length} folios</Badge></div>
            <div className="table-scroll">
              <Table>
                <TableHeader><TableRow><TableHead>Folio / fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Usuario</TableHead><TableHead>Sucursal</TableHead><TableHead>Concepto</TableHead><TableHead>Monto</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {paginatedExpenses.map((expense) => (
                    <TableRow key={expense.id} className={expense.status === "VOIDED" ? "is-voided" : ""}>
                      <TableCell><strong>{expense.folio}</strong><small>{expense.createdAt}</small></TableCell>
                      <TableCell>{expense.typeName}</TableCell>
                      <TableCell>{expense.sellerName}</TableCell>
                      <TableCell>{expense.branch}</TableCell>
                      <TableCell><strong>{expense.concept}</strong><small>{expense.comment || "Sin comentario"}</small></TableCell>
                      <TableCell><strong>{formatCurrency(expense.amount)}</strong></TableCell>
                      <TableCell><Badge variant={expense.status === "ACTIVE" ? "outline" : "destructive"}>{expense.status === "ACTIVE" ? "Vigente" : "Anulado"}</Badge></TableCell>
                      <TableCell><div className="cash-row-actions"><Button type="button" variant="ghost" size="icon" onClick={() => setSelectedExpense(expense)} aria-label={`Visualizar ${expense.folio}`}><Eye size={16} /></Button>{masterAuthorized && <Button type="button" variant="ghost" size="icon" onClick={() => printExpense(expense)} aria-label={`Imprimir ${expense.folio}`}><Printer size={16} /></Button>}{masterAuthorized && expense.status === "ACTIVE" && <Button type="button" variant="ghost" size="icon" onClick={() => openEditExpense(expense)} aria-label={`Editar ${expense.folio}`}><Pencil size={16} /></Button>}{masterAuthorized && expense.status === "ACTIVE" && <Button type="button" variant="ghost" size="icon" onClick={() => { if (window.confirm(`¿Anular el gasto ${expense.folio}?`)) onVoidExpense(expense.id); }} aria-label={`Borrar ${expense.folio}`}><Trash2 size={16} /></Button>}</div></TableCell>
                    </TableRow>
                  ))}
                  {paginatedExpenses.length === 0 && <TableRow><TableCell colSpan={8}><div className="cash-empty-state"><ReceiptText size={26} /><strong>Sin gastos para los filtros seleccionados</strong><span>Los nuevos registros aparecerán aquí con su folio único.</span></div></TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <HistoryPagination total={visibleExpenses.length} page={safePage} pageSize={pageSize} pageCount={pageCount} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
          </CardContent>
        </Card>

        <Card className="cash-breakdown-card"><CardContent><span className="section-kicker">DASHBOARD ANALÍTICO</span><h2>Distribución por tipo</h2><div className="cash-breakdown-list">{byType.map((item) => <div key={item.name}><span><strong>{item.name}</strong><small>{item.count} movimientos</small></span><div><i style={{ width: `${totalAmount ? Math.max(5, item.amount / totalAmount * 100) : 0}%` }} /></div><b>{formatCurrency(item.amount)}</b></div>)}{byType.length === 0 && <p>Sin importes vigentes en el periodo.</p>}</div></CardContent></Card>
      </div>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="cash-reminder-dialog sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Movimiento sujeto a autorización</DialogTitle><DialogDescription>Antes de continuar, confirma que Administración autorizó este gasto.</DialogDescription></DialogHeader>
          <div className="cash-reminder-body"><div><ShieldCheck size={28} /></div><span><small>AUTORIZACIÓN ADMINISTRATIVA</small><strong>Recuerda que todos los movimientos deben ser autorizados por Administración.</strong><p>El registro quedará automáticamente ligado a {loggedSeller?.name ?? "el operador POS"} y a la sucursal fija de la terminal.</p></span></div>
          <label className="cash-reminder-code"><KeyRound size={17} /><Input type="password" inputMode="numeric" maxLength={4} value={movementCode} onChange={(event) => setMovementCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") authorizeMovement(); }} placeholder="Código de autorización" /></label>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setReminderOpen(false)}>Cancelar</Button><Button type="button" className="cash-continue-button" onClick={authorizeMovement} disabled={movementCode.length !== 4}><CheckCircle2 size={16} /> Continuar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="cash-expense-dialog sm:max-w-[760px]">
          <DialogHeader><DialogTitle>{editingExpense ? `Editar ${editingExpense.folio}` : "Registrar gasto"}</DialogTitle><DialogDescription>Captura el detalle que se reflejará en Cash Manager y Close Day.</DialogDescription></DialogHeader>
          <div className="cash-expense-form">
            <label><span>Tipo de gasto</span><Select value={form.typeId} onValueChange={(value) => setForm((current) => ({ ...current, typeId: value }))}><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger><SelectContent>{expenseTypes.filter((type) => type.active || type.id === form.typeId).map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent></Select></label>
            <label><span>Monto</span><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="$0.00" /></label>
            <label><span>Fecha</span><DatePicker value={form.expenseDate} onChange={(value) => setForm((current) => ({ ...current, expenseDate: value }))} /></label>
            <label><span>Sucursal</span><Select value={form.branch} disabled={!masterAuthorized} onValueChange={(value) => setForm((current) => ({ ...current, branch: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent></Select><small>{masterAuthorized ? "Acceso master: puedes seleccionar cualquier sucursal." : `Sucursal fija de esta terminal: ${activeBranch}.`}</small></label>
            <label><span>Usuario responsable</span><Select value={form.sellerId} disabled={!editingExpense} onValueChange={(value) => setForm((current) => ({ ...current, sellerId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{activeSellers.map((seller) => <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>)}</SelectContent></Select></label>
            <label className="cash-form-wide"><span>Concepto</span><Input value={form.concept} onChange={(event) => setForm((current) => ({ ...current, concept: event.target.value }))} placeholder="Ej. Compra de insumos para sucursal" /></label>
            <label className="cash-form-wide"><span>Comentarios importantes</span><textarea value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} placeholder="Agrega proveedor, motivo, autorización o cualquier detalle relevante…" /></label>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="button" onClick={saveExpense}>{editingExpense ? <Pencil size={16} /> : <Plus size={16} />}{editingExpense ? "Guardar cambios" : "Registrar movimiento"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedExpense)} onOpenChange={(open) => { if (!open) setSelectedExpense(null); }}>
        <DialogContent className="cash-report-dialog sm:max-w-[720px]">
          {selectedExpense && (() => {
            const dailyActive = expenses.filter((expense) => expense.status === "ACTIVE" && expense.expenseDate === selectedExpense.expenseDate);
            const dailyTotal = dailyActive.reduce((sum, expense) => sum + expense.amount, 0);
            const sellerTotal = dailyActive.filter((expense) => expense.sellerId === selectedExpense.sellerId).reduce((sum, expense) => sum + expense.amount, 0);
            return <><DialogHeader><DialogTitle>Reporte ejecutivo · {selectedExpense.folio}</DialogTitle><DialogDescription>Detalle individual y contexto operativo del movimiento.</DialogDescription></DialogHeader><section className="cash-report-metrics"><div><span>MONTO</span><strong>{formatCurrency(selectedExpense.amount)}</strong></div><div><span>% DEL DÍA</span><strong>{dailyTotal ? `${(selectedExpense.amount / dailyTotal * 100).toFixed(1)}%` : "0%"}</strong></div><div><span>GASTO DEL USUARIO</span><strong>{formatCurrency(sellerTotal)}</strong></div><div><span>MOVIMIENTOS DEL DÍA</span><strong>{dailyActive.length}</strong></div></section><div className="cash-report-detail"><div><span>Fecha y hora</span><strong>{selectedExpense.createdAt}</strong></div><div><span>Tipo</span><strong>{selectedExpense.typeName}</strong></div><div><span>Sucursal</span><strong>{selectedExpense.branch}</strong></div><div><span>Usuario</span><strong>{selectedExpense.sellerName}</strong></div><div><span>Concepto</span><strong>{selectedExpense.concept}</strong></div><div><span>Comentario</span><strong>{selectedExpense.comment || "Sin comentario"}</strong></div><div><span>Autorización</span><strong>{selectedExpense.authorizedBy}</strong></div><div><span>Estado</span><strong>{selectedExpense.status === "ACTIVE" ? "Vigente" : "Anulado"}</strong></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setSelectedExpense(null)}>Cerrar</Button>{masterAuthorized && <Button type="button" onClick={() => printExpense(selectedExpense)}><Printer size={16} /> Imprimir</Button>}</DialogFooter></>;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ExpenseTypeSettingsProps {
  types: ExpenseType[];
  isMasterCode: (code: string) => boolean;
  onSave: (type: ExpenseType) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ExpenseTypeSettings({ types, isMasterCode, onSave, onToggle, onDelete }: ExpenseTypeSettingsProps) {
  const [authorized, setAuthorized] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");

  useEffect(() => {
    if (!authorized) return;
    const timeout = window.setTimeout(() => setAuthorized(false), 180_000);
    return () => window.clearTimeout(timeout);
  }, [authorized, types]);

  const save = () => {
    const normalized = name.trim();
    if (!normalized) return;
    const duplicate = types.some((type) => type.id !== editingId && type.name.toLocaleLowerCase("es-MX") === normalized.toLocaleLowerCase("es-MX"));
    if (duplicate) { toast.error("Ese tipo de gasto ya existe."); return; }
    const current = types.find((type) => type.id === editingId);
    onSave(current ? { ...current, name: normalized } : { id: `expense-${crypto.randomUUID().slice(0, 8)}`, name: normalized, active: true });
    setName("");
    setEditingId("");
    toast.success(current ? "Tipo de gasto actualizado." : "Tipo de gasto agregado.");
  };

  return <Card className="settings-card expense-type-settings-card"><CardContent><div className="expense-settings-heading"><div><span className="section-kicker">CASH MANAGER</span><h2>Tipos de gastos</h2></div><WalletCards size={24} /></div><p>Administra las opciones disponibles al registrar movimientos. Los gastos históricos conservan el nombre capturado.</p>{!authorized ? <div className="expense-settings-gate"><LockKeyhole size={17} /><Input type="password" inputMode="numeric" maxLength={4} value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && isMasterCode(code)) { setAuthorized(true); setCode(""); } }} placeholder="Código master" /><Button type="button" variant="outline" onClick={() => { if (!isMasterCode(code)) { toast.error("Código master incorrecto."); return; } setAuthorized(true); setCode(""); }} disabled={code.length !== 4}><ShieldCheck size={15} /> Configurar</Button></div> : <><div className="expense-type-editor"><Input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); }} placeholder={editingId ? "Editar tipo de gasto" : "Nuevo tipo de gasto"} /><Button type="button" onClick={save} disabled={!name.trim()}>{editingId ? <Pencil size={15} /> : <Plus size={15} />}{editingId ? "Guardar" : "Agregar"}</Button>{editingId && <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingId(""); setName(""); }}><X size={15} /></Button>}</div><div className="expense-type-list">{types.map((type) => <div key={type.id} className={type.active ? "" : "is-inactive"}><span><strong>{type.name}</strong><small>{type.active ? "Disponible en Cash Manager" : "Inactivo · visible sólo en históricos"}</small></span><button type="button" className={`mock-switch ${type.active ? "is-on" : ""}`} role="switch" aria-checked={type.active} onClick={() => onToggle(type.id)}><i /></button><Button type="button" variant="ghost" size="icon" onClick={() => { setEditingId(type.id); setName(type.name); }} aria-label={`Editar ${type.name}`}><Pencil size={15} /></Button><Button type="button" variant="ghost" size="icon" onClick={() => onDelete(type.id)} aria-label={`Borrar ${type.name}`}><Trash2 size={15} /></Button></div>)}</div><Button type="button" variant="outline" size="sm" onClick={() => setAuthorized(false)}><LockKeyhole size={14} /> Bloquear</Button></>}</CardContent></Card>;
}
