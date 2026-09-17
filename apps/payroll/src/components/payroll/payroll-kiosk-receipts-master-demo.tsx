"use client";

import { Fragment, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MessageSquareText,
  ReceiptText,
  Search,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@cosmetics/ui";
import { resolveBranchCommission } from "./branch-commission-calculator";
import {
  type DemoEmployee,
  type DemoKioskReceiptDecision,
  usePayrollDemo,
} from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const percent = new Intl.NumberFormat("es-MX", {
  style: "percent",
  maximumFractionDigits: 1,
});
const monthFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const label = monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
  return label.charAt(0).toLocaleUpperCase("es-MX") + label.slice(1);
}

function allocateInteger(total: number, weights: number[]) {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const exactValues = weights.map((weight) => (total * weight) / weightTotal);
  const values = exactValues.map(Math.floor);
  let remainder = total - values.reduce((sum, value) => sum + value, 0);

  exactValues
    .map((value, index) => ({ fraction: value - values[index]!, index }))
    .sort((left, right) => right.fraction - left.fraction)
    .forEach(({ index }) => {
      if (remainder <= 0) return;
      values[index] = (values[index] ?? 0) + 1;
      remainder -= 1;
    });

  return values;
}

function buildDailyBreakdown({
  month,
  weekIndex,
  sales,
  transactions,
}: {
  month: string;
  weekIndex: number;
  sales: number;
  transactions: number;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
  const startDay = weekIndex * 7 + 1;
  const endDay = weekIndex === 3 ? lastDay : Math.min(startDay + 6, lastDay);
  const days = Array.from(
    { length: Math.max(0, endDay - startDay + 1) },
    (_, index) => startDay + index,
  );
  const weights = days.map(
    (day, index) => 1 + ((day + index + weekIndex) % 5) * 0.08,
  );
  const dailySalesInCents = allocateInteger(Math.round(sales * 100), weights);
  const dailyTransactions = allocateInteger(transactions, weights);

  return days.map((day, index) => {
    const isoDate = `${month}-${String(day).padStart(2, "0")}`;
    return {
      date: isoDate,
      label: dayFormatter.format(new Date(`${isoDate}T00:00:00Z`)),
      sales: (dailySalesInCents[index] ?? 0) / 100,
      transactions: dailyTransactions[index] ?? 0,
    };
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
}

type ReceiptStatus = "PENDING" | "AUTHORIZED" | "CLARIFICATION";

interface ManagerReceiptRow {
  id: string;
  manager: DemoEmployee;
  branchNames: string[];
  schemeName: string;
  sales: number;
  target: number;
  transactions: number;
  rate: number;
  commission: number;
  decision: DemoKioskReceiptDecision | undefined;
  status: ReceiptStatus;
}

export function PayrollKioskReceiptsMasterDemo({
  onOpenOwnReceipt,
}: {
  onOpenOwnReceipt?: (() => void) | undefined;
}) {
  const { state } = usePayrollDemo();
  const currentMonth = localIsoDate().slice(0, 7);
  const currentYear = currentMonth.slice(0, 4);
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set(
          state.kioskMonthlySales
            .map((sale) => sale.month)
            .filter(
              (month) => month.startsWith(currentYear) && month < currentMonth,
            ),
        ),
      )
        .sort()
        .reverse(),
    [currentMonth, currentYear, state.kioskMonthlySales],
  );
  const [selectedMonth, setSelectedMonth] = useState(
    monthOptions[0] ?? currentMonth,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<ManagerReceiptRow | null>(null);

  const rows = useMemo(() => {
    const resolved = new Map<string, ManagerReceiptRow>();

    state.kioskTargets.forEach((target) => {
      const resolution = resolveBranchCommission({
        branchId: target.branchId,
        month: selectedMonth,
        schemes: state.branchCommissionSchemes,
        sales: state.kioskMonthlySales,
        fallbackTarget: target,
      });
      if (!resolution.managerId) return;
      const manager = state.employees.find(
        (employee) => employee.id === resolution.managerId,
      );
      if (!manager) return;
      const includedBranchIds = resolution.scheme?.branchIds ?? [
        target.branchId,
      ];
      const key = `${manager.id}-${resolution.scheme?.id ?? target.branchId}`;
      if (resolved.has(key)) return;
      const branchNames = includedBranchIds.map(
        (branchId) =>
          state.branches.find((branch) => branch.id === branchId)?.name ??
          "SUCURSAL",
      );
      const sales = resolution.combined
        ? resolution.salesBase
        : resolution.branchSales;
      const monthlyTarget = state.kioskTargets
        .filter((item) => includedBranchIds.includes(item.branchId))
        .reduce((sum, item) => sum + item.monthlyTarget, 0);
      const transactions = state.kioskMonthlySales
        .filter(
          (sale) =>
            sale.month === selectedMonth &&
            includedBranchIds.includes(sale.branchId),
        )
        .reduce((sum, sale) => sum + sale.transactions, 0);
      const decision = state.kioskReceiptDecisions.find(
        (item) => item.managerId === manager.id && item.month === selectedMonth,
      );

      resolved.set(key, {
        id: key,
        manager,
        branchNames,
        schemeName: resolution.scheme?.name ?? "META INDIVIDUAL",
        sales,
        target: monthlyTarget,
        transactions,
        rate: resolution.rate,
        commission: sales * resolution.rate,
        decision,
        status: decision?.status ?? "PENDING",
      });
    });

    return Array.from(resolved.values()).sort((a, b) =>
      a.manager.name.localeCompare(b.manager.name, "es-MX"),
    );
  }, [selectedMonth, state]);

  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const visibleRows = rows.filter((row) => {
    const matchesSearch =
      !normalizedSearch ||
      `${row.manager.name} ${row.manager.position} ${row.branchNames.join(" ")} ${row.schemeName}`
        .toLocaleLowerCase("es-MX")
        .includes(normalizedSearch);
    const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const effectivePageSize =
    pageSize === "ALL" ? Math.max(visibleRows.length, 1) : Number(pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(visibleRows.length / effectivePageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const pagedRows = visibleRows.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );
  const visibleStart =
    visibleRows.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const visibleEnd = Math.min(
    currentPage * effectivePageSize,
    visibleRows.length,
  );
  const approvedCount = rows.filter(
    (row) => row.status === "AUTHORIZED",
  ).length;
  const clarificationCount = rows.filter(
    (row) => row.status === "CLARIFICATION",
  ).length;
  const pendingRows = rows.filter((row) => row.status !== "AUTHORIZED");
  const totalCommission = rows.reduce((sum, row) => sum + row.commission, 0);
  const allApproved = rows.length > 0 && pendingRows.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              VISTA USUARIO MÁSTER
            </Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Aprobación independiente del recibo personal
            </span>
          </div>
          <h1 className="page-title">Recibos gerenciales</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Consulta la comisión mensual, abre el comprobante completo y
            confirma qué gerente ya lo aprobó.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
          {onOpenOwnReceipt && (
            <Button variant="outline" onClick={onOpenOwnReceipt}>
              <ReceiptText className="mr-2 h-4 w-4" />
              Mi recibo gerencial
            </Button>
          )}
          <div className="w-full sm:w-64">
            <Label className="sr-only">Periodo gerencial</Label>
            <Select
              value={selectedMonth}
              onValueChange={(value) => {
                setSelectedMonth(value);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Periodo gerencial">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month}>
                    {monthLabel(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<ReceiptText className="h-5 w-5" />}
          label="RECIBOS GERENCIALES"
          value={`${rows.length}`}
        />
        <Metric
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="APROBADOS POR GERENCIA"
          value={`${approvedCount} / ${rows.length}`}
        />
        <Metric
          icon={<MessageSquareText className="h-5 w-5" />}
          label="ACLARACIONES"
          value={`${clarificationCount}`}
        />
        <Metric
          icon={<BadgeCheck className="h-5 w-5" />}
          label="COMISIÓN GERENCIAL"
          value={money.format(totalCommission)}
        />
      </div>

      <section
        className={`rounded-2xl border p-4 ${allApproved ? "border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100" : "border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100"}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex gap-3">
          {allApproved ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {allApproved
                ? "Todas las comisiones gerenciales fueron aprobadas"
                : `Faltan ${pendingRows.length} ${pendingRows.length === 1 ? "recibo gerencial" : "recibos gerenciales"} por aprobar`}
            </p>
            <p className="mt-1 text-xs leading-5">
              {allApproved
                ? `El periodo ${monthLabel(selectedMonth)} está completo.`
                : `Pendientes: ${pendingRows.map((row) => row.manager.name).join(", ")}.`}
            </p>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="section-heading uppercase">
                Gerencias del periodo
              </CardTitle>
              <CardDescription>
                El estatus corresponde solo a la comisión gerencial mensual.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                <Input
                  className="h-9 pl-9"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="BUSCAR GERENTE, SUCURSAL O ESQUEMA"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="h-9 w-full sm:w-48"
                  aria-label="Filtrar estatus gerencial"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">TODOS LOS ESTATUS</SelectItem>
                  <SelectItem value="PENDING">PENDIENTES</SelectItem>
                  <SelectItem value="AUTHORIZED">APROBADOS</SelectItem>
                  <SelectItem value="CLARIFICATION">ACLARACIONES</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden grid-cols-[minmax(210px,1.2fr)_minmax(190px,1fr)_130px_135px_180px_96px] gap-4 border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] lg:grid">
            <span>Gerente</span>
            <span>Sucursal / esquema</span>
            <span className="text-right">Ventas</span>
            <span className="text-right">Comisión</span>
            <span>Estatus</span>
            <span className="text-right">Acciones</span>
          </div>
          <div className="divide-y divide-[color:var(--border-color)]">
            {pagedRows.map((row) => (
              <article
                key={row.id}
                id={`recibo-gerencial-${row.manager.id}-${selectedMonth}`}
                className="grid gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--accent-hover)]/20 lg:grid-cols-[minmax(210px,1.2fr)_minmax(190px,1fr)_130px_135px_180px_96px] lg:items-center lg:gap-4 lg:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/35 text-xs font-semibold">
                    {initials(row.manager.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {row.manager.name}
                    </p>
                    <p className="truncate text-[11px] text-[color:var(--text-muted)]">
                      {row.manager.position}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="truncate text-xs font-medium">
                    {row.branchNames.join(" · ")}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[color:var(--text-muted)]">
                    {row.schemeName} · {percent.format(row.rate)}
                  </p>
                </div>
                <p className="number-display text-sm lg:text-right">
                  {money.format(row.sales)}
                </p>
                <p className="number-display text-base font-semibold lg:text-right">
                  {money.format(row.commission)}
                </p>
                <div>
                  <ManagerDecisionBadge status={row.status} />
                  {row.decision?.updatedAt && (
                    <p className="mt-1 text-[9px] text-[color:var(--text-muted)]">
                      {new Date(row.decision.updatedAt).toLocaleString(
                        "es-MX",
                        {
                          dateStyle: "short",
                          timeStyle: "short",
                        },
                      )}
                    </p>
                  )}
                </div>
                <div className="flex justify-start gap-1 lg:justify-end">
                  <IconButton
                    label={`Ver recibo gerencial de ${row.manager.name}`}
                    onClick={() => setPreview(row)}
                    icon={<Eye className="h-4 w-4" />}
                  />
                  <IconButton
                    label={`Descargar recibo gerencial de ${row.manager.name}`}
                    onClick={() =>
                      toast.success(
                        "Descarga gerencial simulada; no se utilizó backend.",
                      )
                    }
                    icon={<Download className="h-4 w-4" />}
                  />
                </div>
              </article>
            ))}
            {!visibleRows.length && (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <UserRound className="h-8 w-8 text-[color:var(--text-muted)]" />
                <p className="mt-3 text-sm font-semibold">
                  No encontramos recibos gerenciales
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Modifica la búsqueda, el estatus o el periodo.
                </p>
              </div>
            )}
          </div>
          {visibleRows.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/10 px-4 py-2.5 text-[10px] sm:flex-row sm:items-center sm:justify-between">
              <p>
                Mostrando{" "}
                <strong>
                  {visibleStart}–{visibleEnd}
                </strong>{" "}
                de <strong>{visibleRows.length}</strong> recibos · página{" "}
                {currentPage} de {totalPages}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Label className="text-[9px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                  Filas
                </Label>
                <Select
                  value={pageSize}
                  onValueChange={(value) => {
                    setPageSize(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className="h-7 w-[82px] rounded-lg text-[9px] font-semibold"
                    aria-label="Recibos gerenciales por página"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[20, 40, 60].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                    <SelectItem value="ALL">TODAS</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg px-2 text-[9px]"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft className="mr-1 h-3 w-3" />
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg px-2 text-[9px]"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                >
                  Siguiente
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(preview)} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Recibo gerencial · {preview?.manager.name}
            </DialogTitle>
            <DialogDescription>
              Documento mensual independiente del recibo personal de ventas.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <ManagerReceiptDocument row={preview} month={selectedMonth} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManagerReceiptDocument({
  row,
  month,
}: {
  row: ManagerReceiptRow;
  month: string;
}) {
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const weeklyShares = [0.22, 0.25, 0.27, 0.26];
  const weeklySalesInCents = allocateInteger(
    Math.round(row.sales * 100),
    weeklyShares,
  );
  const weeklyTransactions = allocateInteger(row.transactions, weeklyShares);
  const weeklySales = weeklyShares.map((_, index) => {
    const label = `SEMANA ${index + 1}`;
    const sales = (weeklySalesInCents[index] ?? 0) / 100;
    const transactions = weeklyTransactions[index] ?? 0;
    return {
      label,
      sales,
      transactions,
      days: buildDailyBreakdown({
        month,
        weekIndex: index,
        sales,
        transactions,
      }),
    };
  });
  const achievement = row.target > 0 ? row.sales / row.target : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] shadow-xl">
      <div className="bg-[linear-gradient(135deg,#24211e_0%,#49382a_72%,#76563a_150%)] px-6 py-5 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-brand text-xl tracking-[0.12em]">
              KEYSAR COSMETICS
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/60">
              Recibo mensual de comisión gerencial
            </p>
          </div>
          <ManagerDecisionBadge status={row.status} dark />
        </div>
      </div>
      <div className="space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="label-caps">GERENTE RESPONSABLE</p>
            <p className="mt-1 text-lg font-semibold">{row.manager.name}</p>
            <p className="text-sm text-[color:var(--text-muted)]">
              {row.manager.position} · {row.branchNames.join(" · ")}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="label-caps">PERIODO MENSUAL</p>
            <p className="mt-1 font-semibold">{monthLabel(month)}</p>
            <p className="text-xs text-[color:var(--text-muted)]">
              Aprobación separada del recibo personal
            </p>
          </div>
        </div>
        <Separator />
        <div className="grid gap-3 sm:grid-cols-3">
          <Summary label="META DEL ESQUEMA" value={money.format(row.target)} />
          <Summary label="VENTAS REGISTRADAS" value={money.format(row.sales)} />
          <Summary label="CUMPLIMIENTO" value={percent.format(achievement)} />
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Desglose mensual</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CORTE</TableHead>
                <TableHead className="text-right">TRANSACCIONES</TableHead>
                <TableHead className="text-right">VENTA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklySales.map((week) => {
                const isExpanded = expandedWeek === week.label;
                const detailId = `detalle-${month}-${week.label.replace(" ", "-").toLowerCase()}`;

                return (
                  <Fragment key={week.label}>
                    <TableRow
                      className={
                        isExpanded
                          ? "bg-[color:var(--accent-hover)]/30"
                          : undefined
                      }
                    >
                      <TableCell>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md py-1 text-left font-medium transition-colors hover:text-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
                          aria-expanded={isExpanded}
                          aria-controls={detailId}
                          onClick={() =>
                            setExpandedWeek(isExpanded ? null : week.label)
                          }
                        >
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                          {week.label}
                          <span className="text-[10px] font-normal text-[color:var(--text-muted)]">
                            {isExpanded ? "Ocultar días" : "Ver días"}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="number-display text-right">
                        {week.transactions}
                      </TableCell>
                      <TableCell className="number-display text-right">
                        {money.format(week.sales)}
                      </TableCell>
                    </TableRow>
                    {isExpanded &&
                      week.days.map((day, dayIndex) => (
                        <TableRow
                          key={day.date}
                          id={dayIndex === 0 ? detailId : undefined}
                          className="bg-[color:var(--bg-secondary)]/55"
                        >
                          <TableCell className="pl-10 text-xs capitalize text-[color:var(--text-muted)]">
                            {day.label}
                          </TableCell>
                          <TableCell className="number-display text-right text-xs">
                            {day.transactions}
                          </TableCell>
                          <TableCell className="number-display text-right text-xs">
                            {money.format(day.sales)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_260px] sm:items-end">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span>Esquema gerencial</span>
              <strong className="text-right">{row.schemeName}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Escala aplicada</span>
              <strong>{percent.format(row.rate)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Estado del gerente</span>
              <strong>
                {row.status === "AUTHORIZED"
                  ? "APROBADO"
                  : row.status === "CLARIFICATION"
                    ? "ACLARACIÓN"
                    : "PENDIENTE"}
              </strong>
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--accent)]/45 bg-[color:var(--accent-hover)]/35 p-5 text-right">
            <p className="label-caps">COMISIÓN GERENCIAL</p>
            <p className="number-display mt-1 text-3xl">
              {money.format(row.commission)}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Pago independiente
            </p>
          </div>
        </div>
        {row.decision?.note && (
          <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 p-4">
            <p className="label-caps">REGISTRO DE APROBACIÓN</p>
            <p className="mt-1 text-sm">{row.decision.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ManagerDecisionBadge({
  status,
  dark = false,
}: {
  status: ReceiptStatus;
  dark?: boolean;
}) {
  const content =
    status === "AUTHORIZED"
      ? "APROBADO POR GERENCIA"
      : status === "CLARIFICATION"
        ? "ACLARACIÓN SOLICITADA"
        : "PENDIENTE DE GERENCIA";
  return (
    <Badge
      variant="outline"
      className={
        dark
          ? "border-white/25 bg-white/10 text-white"
          : status === "AUTHORIZED"
            ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
            : status === "CLARIFICATION"
              ? "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
              : "border-slate-300 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
      }
    >
      {content}
    </Badge>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <span className="text-[color:var(--text-secondary)]">{icon}</span>
        <p className="label-caps mt-4">{label}</p>
        <p className="number-display mt-2 text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[color:var(--accent-hover)]/35 p-4">
      <p className="label-caps">{label}</p>
      <p className="number-display mt-2 text-lg">{value}</p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className="h-8 w-8 rounded-lg"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}
