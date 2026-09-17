"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, BarChart3, Building2, CheckCircle2, ChevronLeft,
  ChevronRight, Clock3, FileCheck2, Gauge, History, Landmark,
  LockKeyhole, MonitorCheck, Search, ShieldCheck, TrendingDown, TrendingUp,
  UsersRound, WalletCards, XCircle,
} from "lucide-react";
import {
  Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table,
  TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@cosmetics/ui";
import {
  type DemoState, type EmployeePayrollLine, type PayrollModule,
  payrollModuleLabel, periodTaxInclusionForRange, usePayrollDemo,
} from "./payroll-demo-context";
import {
  employeeCostAllocationShares, payrollCostAllocationMode,
} from "./payroll-cost-branch-selector";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", notation: "compact", maximumFractionDigits: 1 });
const monthLabel = new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit", timeZone: "UTC" });
const longMonthLabel = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });

type LinesProvider = (start: string, mode?: DemoState["calculationMode"], end?: string, module?: PayrollModule) => EmployeePayrollLine[];
type BranchRow = { id: string; name: string; city: string; sales: number; payroll: number; social: number; isr: number; totalCost: number; employeeIds: Set<string>; authorized: number };
type ScopeAnalysis = { month: string; sales: number; payroll: number; social: number; isr: number; totalCost: number; reconciliationDelta: number; employeeIds: Set<string>; expectedReceipts: number; authorizedReceipts: number; unassignedEmployeeIds: string[]; branchRows: BranchRow[] };
type ExceptionItem = { id: string; level: "CRITICAL" | "WARNING"; title: string; detail: string; href: string };

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function monthRange(month: string) {
  const [yearText = "1970", monthText = "01"] = month.split("-");
  const year = Number(yearText);
  const number = Number(monthText);
  return { start: isoDate(new Date(Date.UTC(year, number - 1, 1))), end: isoDate(new Date(Date.UTC(year, number, 0))) };
}
function shiftMonth(month: string, offset: number) {
  const [yearText = "1970", monthText = "01"] = month.split("-");
  const year = Number(yearText);
  const number = Number(monthText);
  return isoDate(new Date(Date.UTC(year, number - 1 + offset, 1))).slice(0, 7);
}
function formatMonth(month: string, long = false) {
  return (long ? longMonthLabel : monthLabel).format(new Date(`${month}-01T12:00:00Z`)).replace(".", "").toLocaleUpperCase("es-MX");
}

function buildScopeAnalysis({ state, payrollLines, month, module, branchId }: { state: DemoState; payrollLines: LinesProvider; month: string; module: PayrollModule | "ALL"; branchId: string }): ScopeAnalysis {
  const { start, end } = monthRange(month);
  const tax = periodTaxInclusionForRange(state.periodTaxInclusions, start, end);
  const includeSocial = tax?.includeSocialCost ?? true;
  const includeIsr = tax?.includeIsr ?? true;
  const lines = payrollLines(start, state.calculationMode, end, module === "ALL" ? "CONSOLIDATED" : module);
  const authorizedIds = new Set(state.decisions.filter((decision) => decision.periodStart.startsWith(month) && decision.status === "AUTHORIZED").map((decision) => decision.employeeId));
  const rows = state.branches.map<BranchRow>((branch) => ({
    id: branch.id, name: branch.name, city: branch.city,
    sales: state.sales.filter((sale) => sale.branchId === branch.id && sale.date >= start && sale.date <= end).reduce((sum, sale) => sum + sale.amount, 0),
    payroll: 0, social: 0, isr: 0, totalCost: 0, employeeIds: new Set<string>(), authorized: 0,
  }));
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const unassigned = new Set<string>();
  let allocatedTotal = 0;

  lines.forEach((line) => {
    const mode = payrollCostAllocationMode(state.payrollCostAllocationModes, line.employee.id, start, end);
    const allocations = employeeCostAllocationShares({ employee: line.employee, branches: state.branches, sales: state.sales, periodStart: start, periodEnd: end, mode });
    if (!allocations.length) { unassigned.add(line.employee.id); return; }
    allocations.forEach(({ branchId: targetId, share }) => {
      const row = rowById.get(targetId);
      if (!row) { unassigned.add(line.employee.id); return; }
      const payroll = line.total * share;
      const social = includeSocial ? line.socialCost * share : 0;
      const isr = includeIsr ? line.isrCost * share : 0;
      row.payroll += payroll; row.social += social; row.isr += isr;
      row.totalCost += payroll + social + isr; row.employeeIds.add(line.employee.id);
      allocatedTotal += payroll + social + isr;
    });
  });
  rows.forEach((row) => { row.authorized = Array.from(row.employeeIds).filter((id) => authorizedIds.has(id)).length; });
  const scopedRows = branchId === "ALL" ? rows : rows.filter((row) => row.id === branchId);
  const employeeIds = new Set(scopedRows.flatMap((row) => Array.from(row.employeeIds)));
  const sourceTotal = lines.reduce((sum, line) => sum + line.total + (includeSocial ? line.socialCost : 0) + (includeIsr ? line.isrCost : 0), 0);
  return {
    month,
    sales: scopedRows.reduce((sum, row) => sum + row.sales, 0),
    payroll: scopedRows.reduce((sum, row) => sum + row.payroll, 0),
    social: scopedRows.reduce((sum, row) => sum + row.social, 0),
    isr: scopedRows.reduce((sum, row) => sum + row.isr, 0),
    totalCost: scopedRows.reduce((sum, row) => sum + row.totalCost, 0),
    reconciliationDelta: branchId === "ALL" ? Math.abs(sourceTotal - allocatedTotal) : 0,
    employeeIds,
    expectedReceipts: employeeIds.size,
    authorizedReceipts: Array.from(employeeIds).filter((id) => authorizedIds.has(id)).length,
    unassignedEmployeeIds: Array.from(unassigned),
    branchRows: rows,
  };
}

function MetricCard({ icon: Icon, label, value, detail, tone = "neutral" }: { icon: typeof Activity; label: string; value: string; detail: string; tone?: "neutral" | "green" | "amber" | "rose" }) {
  const tones = {
    neutral: "border-[color:var(--border-color)] bg-[color:var(--bg-card)]",
    green: "border-emerald-300/80 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/20",
    amber: "border-amber-300/80 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/20",
    rose: "border-rose-300/80 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/20",
  };
  return <Card className={tones[tone]}><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{label}</p><p className="number-display mt-2 text-2xl text-[color:var(--text-primary)]">{value}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#b99568]/25 bg-[#b99568]/10 text-[#8a6744]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">{detail}</p></CardContent></Card>;
}

function StatusGate({ passed, label, detail }: { passed: boolean; label: string; detail: string }) {
  return <div className="flex items-start gap-3 border-b border-[color:var(--border-color)] py-3 last:border-b-0"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/45 dark:text-rose-300"}`}>{passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}</span><div className="min-w-0"><p className="text-sm font-semibold">{label}</p><p className="mt-0.5 text-xs leading-5 text-[color:var(--text-muted)]">{detail}</p></div></div>;
}

export function PayrollControlCenterDemo() {
  const { state, periodOptions, currentPeriod, payrollLines } = usePayrollDemo();
  const [selectedMonth, setSelectedMonth] = useState(currentPeriod.start.slice(0, 7));
  const [moduleFilter, setModuleFilter] = useState<PayrollModule | "ALL">("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<"20" | "40" | "60" | "ALL">("20");
  const [traceOpen, setTraceOpen] = useState(false);
  const dataUpdatedAt = useMemo(() => {
    const latestUpdate = [
      ...state.branches.map((branch) => branch.lastSyncedAt ?? branch.registeredAt),
      ...state.runs.map((run) => run.createdAt),
      ...state.decisions.map((decision) => decision.updatedAt),
      ...state.kioskReceiptDecisions.map((decision) => decision.updatedAt),
      ...state.notificationTemplates.map((template) => template.updatedAt),
    ].sort((left, right) => right.localeCompare(left))[0] ?? currentPeriod.end;
    return new Date(latestUpdate.length === 10 ? `${latestUpdate}T12:00:00` : latestUpdate);
  }, [currentPeriod.end, state]);

  const monthOptions = useMemo(() => Array.from(new Set(periodOptions.map((period) => period.start.slice(0, 7)))), [periodOptions]);
  const current = useMemo(() => buildScopeAnalysis({ state, payrollLines, month: selectedMonth, module: moduleFilter, branchId: branchFilter }), [branchFilter, moduleFilter, payrollLines, selectedMonth, state]);
  const history = useMemo(() => Array.from({ length: 6 }, (_, index) => shiftMonth(selectedMonth, index - 5)).map((month) => buildScopeAnalysis({ state, payrollLines, month, module: moduleFilter, branchId: branchFilter })), [branchFilter, moduleFilter, payrollLines, selectedMonth, state]);
  const forecastSources = useMemo(() => [-3, -2, -1].map((offset) => buildScopeAnalysis({ state, payrollLines, month: shiftMonth(selectedMonth, offset), module: moduleFilter, branchId: branchFilter })), [branchFilter, moduleFilter, payrollLines, selectedMonth, state]);
  const forecastWeights = [0.2, 0.3, 0.5];
  const forecast = {
    month: shiftMonth(selectedMonth, 1),
    sales: forecastSources.reduce((sum, item, index) => sum + item.sales * (forecastWeights[index] ?? 0), 0),
    totalCost: forecastSources.reduce((sum, item, index) => sum + item.totalCost * (forecastWeights[index] ?? 0), 0),
  };
  const latest = forecastSources[2];
  const forecastChange = latest && latest.totalCost > 0 ? ((forecast.totalCost - latest.totalCost) / latest.totalCost) * 100 : null;
  const scopedEmployees = state.employees.filter((employee) => current.employeeIds.has(employee.id));
  const invalidAccounts = scopedEmployees.filter((employee) => (employee.clabe ?? employee.account).replace(/\D/g, "").length !== 18);
  const selectedRuns = state.runs.filter((run) => run.periodStart.startsWith(selectedMonth) && (moduleFilter === "ALL" || run.module === moduleFilter));
  const pendingOperational = state.adjustments.filter((item) => item.periodStart.startsWith(selectedMonth) && item.status === "PENDING" && (moduleFilter === "ALL" || item.payrollModule === moduleFilter)).length + state.movements.filter((item) => item.periodStart.startsWith(selectedMonth) && item.status === "PENDING" && (moduleFilter === "ALL" || item.payrollModule === moduleFilter)).length + state.loans.filter((item) => item.requestedAt.startsWith(selectedMonth) && item.status === "PENDING" && (moduleFilter === "ALL" || item.payrollModule === moduleFilter)).length;
  const receiptGate = current.expectedReceipts > 0 && current.authorizedReceipts === current.expectedReceipts;
  const reconciliationGate = current.reconciliationDelta < 0.01;
  const allocationGate = current.unassignedEmployeeIds.length === 0;
  const accountsGate = invalidAccounts.length === 0;
  const movementGate = pendingOperational === 0;
  const runsGate = selectedRuns.length > 0 && selectedRuns.every((run) => run.status !== "DRAFT");
  const gates = [receiptGate, reconciliationGate, allocationGate, accountsGate, movementGate, runsGate];
  const passedGates = gates.filter(Boolean).length;
  const readiness = Math.round((passedGates / gates.length) * 100);

  const exceptions = useMemo<ExceptionItem[]>(() => {
    const items: ExceptionItem[] = [];
    current.unassignedEmployeeIds.forEach((employeeId) => {
      const employee = state.employees.find((row) => row.id === employeeId);
      items.push({ id: `allocation-${employeeId}`, level: "CRITICAL", title: "Centro de costo sin asignar", detail: employee?.name ?? employeeId, href: "/accesos" });
    });
    invalidAccounts.forEach((employee) => items.push({ id: `account-${employee.id}`, level: "CRITICAL", title: "CLABE incompleta", detail: `${employee.name} · ${employee.position}`, href: "/empleados" }));
    state.decisions.filter((decision) => decision.periodStart.startsWith(selectedMonth) && decision.status === "CLARIFICATION" && current.employeeIds.has(decision.employeeId)).forEach((decision) => {
      const employee = state.employees.find((row) => row.id === decision.employeeId);
      items.push({ id: `clarification-${decision.employeeId}`, level: "WARNING", title: "Aclaración de recibo", detail: `${employee?.name ?? decision.employeeId} · ${decision.note || "Sin nota"}`, href: "/recibos" });
    });
    selectedRuns.filter((run) => run.status === "DRAFT").forEach((run) => items.push({ id: `run-${run.id}`, level: "WARNING", title: "Corrida todavía en borrador", detail: `${payrollModuleLabel(state, run.module)} · ${run.periodStart} — ${run.periodEnd}`, href: run.module === "CONSOLIDATED" ? "/" : run.module === "FIXED" ? "/nomina-salario-fijo" : run.module === "SPECIALIST" ? "/nomina-especialistas" : run.module === "CONTRACTOR" ? "/nomina-honorarios" : "/nomina-comisiones" }));
    if (pendingOperational > 0) items.push({ id: "pending-operations", level: "WARNING", title: "Operaciones pendientes", detail: `${pendingOperational} movimientos, bonos, préstamos o ajustes requieren resolución.`, href: "/movimientos" });
    return items;
  }, [current.employeeIds, current.unassignedEmployeeIds, invalidAccounts, pendingOperational, selectedMonth, selectedRuns, state]);

  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const visibleRows = current.branchRows.filter((row) => branchFilter === "ALL" || row.id === branchFilter).filter((row) => !normalizedSearch || `${row.name} ${row.city}`.toLocaleLowerCase("es-MX").includes(normalizedSearch)).sort((left, right) => right.totalCost - left.totalCost);
  const effectiveSize = pageSize === "ALL" ? Math.max(visibleRows.length, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / effectiveSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = visibleRows.slice((currentPage - 1) * effectiveSize, currentPage * effectiveSize);
  const chartData = [...history.map((item) => ({ label: formatMonth(item.month), sales: Math.round(item.sales), cost: Math.round(item.totalCost), forecast: false })), { label: `${formatMonth(forecast.month)} P`, sales: Math.round(forecast.sales), cost: Math.round(forecast.totalCost), forecast: true }];
  const costToSales = current.sales > 0 ? (current.totalCost / current.sales) * 100 : 0;
  const selectedBranchName = branchFilter === "ALL" ? "EMPRESA COMPLETA" : state.branches.find((branch) => branch.id === branchFilter)?.name ?? "SUCURSAL";
  const selectedModuleName = moduleFilter === "ALL" ? "TODAS LAS NÓMINAS" : payrollModuleLabel(state, moduleFilter);

  return <>
    <div className="space-y-5">
      <header className="overflow-hidden rounded-3xl border border-[#806044]/35 bg-[linear-gradient(120deg,#1f1a17_0%,#3e3026_55%,#765235_100%)] px-5 py-5 text-white shadow-[0_24px_70px_rgba(35,24,16,0.20)] md:px-7 md:py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl"><div className="flex flex-wrap items-center gap-2"><Badge className="border-white/20 bg-white/10 text-[#f4ddbd] hover:bg-white/10"><MonitorCheck className="mr-1.5 h-3.5 w-3.5" />DIRECCIÓN</Badge><span className="text-xs uppercase tracking-[0.14em] text-white/55">Información confidencial</span></div><h1 className="mt-4 font-emofera text-3xl tracking-[0.035em] text-[#fff8ef] md:text-4xl">Centro de control</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#dccbbb]">Visión ejecutiva de cierre, costo laboral, ventas, riesgos y pronósticos de toda la operación de nómina.</p></div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[680px]">
            <div className="space-y-1.5">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#f2d8ba]">Periodo</span>
              <Select value={selectedMonth} onValueChange={(value) => { setSelectedMonth(value); setPage(1); }}><SelectTrigger style={{ backgroundColor: "rgba(33, 26, 22, 0.88)", color: "#fff8ee" }} className="h-10 border-[#e6c69f]/45 text-xs font-semibold shadow-none [&>span]:text-[#fff8ee] [&_svg]:text-[#f2d8ba]"><SelectValue /></SelectTrigger><SelectContent>{monthOptions.map((month) => <SelectItem key={month} value={month}>{formatMonth(month, true)}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#f2d8ba]">Tipo de nómina</span>
              <Select value={moduleFilter} onValueChange={(value) => { setModuleFilter(value as PayrollModule | "ALL"); setPage(1); }}><SelectTrigger style={{ backgroundColor: "rgba(33, 26, 22, 0.88)", color: "#fff8ee" }} className="h-10 border-[#e6c69f]/45 text-xs font-semibold shadow-none [&>span]:text-[#fff8ee] [&_svg]:text-[#f2d8ba]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">TODAS LAS NÓMINAS</SelectItem>{state.payrollModules.filter((module) => module.id !== "CONSOLIDATED" && module.active).map((module) => <SelectItem key={module.id} value={module.id}>{module.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#f2d8ba]">Alcance</span>
              <Select value={branchFilter} onValueChange={(value) => { setBranchFilter(value); setPage(1); }}><SelectTrigger style={{ backgroundColor: "rgba(33, 26, 22, 0.88)", color: "#fff8ee" }} className="h-10 border-[#e6c69f]/45 text-xs font-semibold shadow-none [&>span]:text-[#fff8ee] [&_svg]:text-[#f2d8ba]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">EMPRESA COMPLETA</SelectItem>{state.branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[11px] text-white/60"><span className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-emerald-300" />Datos sincronizados durante la sesión</span><span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" />Actualizado {dataUpdatedAt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span><span className="flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5" />Privacidad: 3 min · cierre de sesión: 5 min</span></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores ejecutivos">
        <MetricCard icon={TrendingUp} label="Ventas" value={money.format(current.sales)} detail={`${selectedBranchName} · ${formatMonth(selectedMonth, true)}`} />
        <MetricCard icon={WalletCards} label="Costo integral" value={money.format(current.totalCost)} detail={`${selectedModuleName} · nómina + cargas`} />
        <MetricCard icon={Gauge} label="Costo / venta" value={`${costToSales.toFixed(1)}%`} detail="Participación del costo laboral sobre la venta" />
        <MetricCard icon={FileCheck2} label="Recibos aprobados" value={`${current.authorizedReceipts}/${current.expectedReceipts}`} detail={receiptGate ? "Autorización completa" : "Existen recibos pendientes"} tone={receiptGate ? "green" : "rose"} />
        <MetricCard icon={AlertTriangle} label="Excepciones" value={String(exceptions.length)} detail={exceptions.length ? "Requieren atención antes del cierre" : "Sin incidencias abiertas"} tone={exceptions.length ? "rose" : "green"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_0.8fr]">
        <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader className="border-b border-[color:var(--border-color)]"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-[#9a744c]" />Tendencia y pronóstico ejecutivo</CardTitle><CardDescription className="mt-1">Ventas contra costo integral; la última columna es el pronóstico del siguiente mes.</CardDescription></div><Button variant="outline" size="sm" onClick={() => setTraceOpen(true)}><History className="mr-2 h-4 w-4" />Ver trazabilidad</Button></div></CardHeader><CardContent className="pt-5">
          <div className="h-[290px] w-full" aria-label="Tendencia histórica y pronóstico de ventas y costo"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(139,111,82,0.18)" /><XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => compactMoney.format(Number(value))} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={64} /><Tooltip formatter={(value) => money.format(Number(value))} contentStyle={{ borderRadius: 12, borderColor: "rgba(139,111,82,0.24)", fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} /><Bar dataKey="sales" name="VENTAS" radius={[5, 5, 0, 0]} maxBarSize={34}>{chartData.map((item) => <Cell key={item.label} fill={item.forecast ? "#c49b70" : "#765235"} fillOpacity={item.forecast ? 0.55 : 0.92} />)}</Bar><Line type="monotone" dataKey="cost" name="COSTO INTEGRAL" stroke="#648672" strokeWidth={2.5} dot={{ r: 3, fill: "#648672" }} /></ComposedChart></ResponsiveContainer></div>
          <div className="mt-4 grid gap-3 border-t border-[color:var(--border-color)] pt-4 sm:grid-cols-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">Próxima venta estimada</p><p className="number-display mt-1 text-lg">{money.format(forecast.sales)}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">Próximo costo estimado</p><p className="number-display mt-1 text-lg">{money.format(forecast.totalCost)}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">Cambio vs. último histórico</p><p className={`number-display mt-1 flex items-center gap-1 text-lg ${forecastChange !== null && forecastChange > 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>{forecastChange !== null && forecastChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}{forecastChange === null ? "SIN BASE" : `${forecastChange >= 0 ? "+" : ""}${forecastChange.toFixed(1)}%`}</p></div></div>
        </CardContent></Card>

        <Card className="border-[color:var(--border-color)]"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-[#9a744c]" />Preparación de cierre</CardTitle><CardDescription className="mt-1">Seis controles verificables antes de dispersar.</CardDescription></div><div className="text-right"><p className="number-display text-3xl">{readiness}%</p><p className="text-[10px] text-[color:var(--text-muted)]">{passedGates} de 6 controles</p></div></div></CardHeader><CardContent><div className="mb-2 h-2 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className={`h-full rounded-full ${readiness === 100 ? "bg-emerald-600" : "bg-amber-600"}`} style={{ width: `${readiness}%` }} /></div><StatusGate passed={receiptGate} label="Recibos autorizados" detail={`${current.authorizedReceipts} de ${current.expectedReceipts} recibos`} /><StatusGate passed={reconciliationGate} label="Conciliación contable" detail={`Diferencia ${money.format(current.reconciliationDelta)}`} /><StatusGate passed={allocationGate} label="Centros de costo" detail={allocationGate ? "Todos los costos están direccionados" : `${current.unassignedEmployeeIds.length} empleados sin distribución`} /><StatusGate passed={accountsGate} label="Cuentas bancarias" detail={accountsGate ? "CLABE completa en el alcance" : `${invalidAccounts.length} registros incompletos`} /><StatusGate passed={movementGate} label="Operación resuelta" detail={movementGate ? "Sin movimientos pendientes" : `${pendingOperational} pendientes`} /><StatusGate passed={runsGate} label="Corridas autorizadas" detail={runsGate ? "Listas para pago o pagadas" : "Existen corridas en borrador"} /></CardContent></Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader className="border-b border-[color:var(--border-color)]"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-[#9a744c]" />Control por sucursal</CardTitle><CardDescription className="mt-1">Vista compacta preparada para decenas de puntos de venta.</CardDescription></div><div className="relative w-full lg:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-9 pl-9 text-xs" placeholder="BUSCAR SUCURSAL O CIUDAD" aria-label="Buscar sucursal" /></div></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>SUCURSAL</TableHead><TableHead className="text-right">VENTAS</TableHead><TableHead className="text-right">NÓMINA</TableHead><TableHead className="text-right">CARGAS</TableHead><TableHead className="text-right">COSTO TOTAL</TableHead><TableHead className="text-right">COSTO / VENTA</TableHead><TableHead className="text-center">APROBACIÓN</TableHead></TableRow></TableHeader><TableBody>
          {pagedRows.map((row) => { const ratio = row.sales > 0 ? (row.totalCost / row.sales) * 100 : 0; return <TableRow key={row.id}><TableCell><p className="font-semibold">{row.name}</p><p className="text-[10px] text-[color:var(--text-muted)]">{row.city} · {row.employeeIds.size} empleados</p></TableCell><TableCell className="number-display text-right">{money.format(row.sales)}</TableCell><TableCell className="number-display text-right">{money.format(row.payroll)}</TableCell><TableCell className="number-display text-right">{money.format(row.social + row.isr)}</TableCell><TableCell className="number-display text-right font-semibold">{money.format(row.totalCost)}</TableCell><TableCell className="number-display text-right">{ratio.toFixed(1)}%</TableCell><TableCell className="text-center"><Badge variant="outline" className={row.authorized === row.employeeIds.size && row.employeeIds.size > 0 ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>{row.authorized}/{row.employeeIds.size}</Badge></TableCell></TableRow>; })}
          {!pagedRows.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-[color:var(--text-muted)]">No hay sucursales que coincidan con la selección.</TableCell></TableRow>}
        </TableBody><TableFooter><TableRow><TableCell>TOTAL DEL ALCANCE</TableCell><TableCell className="number-display text-right">{money.format(current.sales)}</TableCell><TableCell className="number-display text-right">{money.format(current.payroll)}</TableCell><TableCell className="number-display text-right">{money.format(current.social + current.isr)}</TableCell><TableCell className="number-display text-right">{money.format(current.totalCost)}</TableCell><TableCell className="number-display text-right">{costToSales.toFixed(1)}%</TableCell><TableCell /></TableRow></TableFooter></Table></div>
        <div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">Filas</span><Select value={pageSize} onValueChange={(value) => { setPageSize(value as typeof pageSize); setPage(1); }}><SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="20">20</SelectItem><SelectItem value="40">40</SelectItem><SelectItem value="60">60</SelectItem><SelectItem value="ALL">TODAS</SelectItem></SelectContent></Select><span className="text-xs text-[color:var(--text-muted)]">{visibleRows.length} sucursales</span></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><span className="min-w-20 text-center text-xs"><strong>{currentPage}</strong> de <strong>{totalPages}</strong></span><Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente <ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>
        </CardContent></Card>

        <Card className="border-[color:var(--border-color)]"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-rose-600" />Excepciones accionables</CardTitle><CardDescription className="mt-1">Ordenadas para resolver antes del cierre.</CardDescription></div><Badge variant="outline">{exceptions.length}</Badge></div></CardHeader><CardContent className="space-y-2">
          {exceptions.slice(0, 8).map((item) => <Link key={item.id} href={item.href} className="flex items-start gap-3 rounded-xl border border-[color:var(--border-color)] p-3 transition-colors hover:bg-[color:var(--accent-hover)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99568]"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.level === "CRITICAL" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/45 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300"}`}>{item.level === "CRITICAL" ? <AlertTriangle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[11px] leading-4 text-[color:var(--text-muted)]">{item.detail}</span></span><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[color:var(--text-muted)]" /></Link>)}
          {!exceptions.length && <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 px-4 py-8 text-center dark:border-emerald-800 dark:bg-emerald-950/20"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700 dark:text-emerald-300" /><p className="mt-3 text-sm font-semibold">Sin excepciones abiertas</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">El alcance seleccionado está listo para revisión directiva.</p></div>}
          {exceptions.length > 8 && <p className="pt-2 text-center text-xs font-semibold text-[color:var(--text-muted)]">+{exceptions.length - 8} excepciones adicionales</p>}
        </CardContent></Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-[color:var(--border-color)]"><CardContent className="flex items-start gap-3 p-4"><Landmark className="mt-0.5 h-5 w-5 text-[#9a744c]" /><div><p className="text-sm font-semibold">Fuente única de cálculo</p><p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">Reutiliza la misma nómina, ventas, cargas y centros de costo del consolidado.</p></div></CardContent></Card>
        <Card className="border-[color:var(--border-color)]"><CardContent className="flex items-start gap-3 p-4"><UsersRound className="mt-0.5 h-5 w-5 text-[#9a744c]" /><div><p className="text-sm font-semibold">Escalable por diseño</p><p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">Filtros, búsqueda y paginación evitan cargar visualmente cientos de registros.</p></div></CardContent></Card>
        <Card className="border-[color:var(--border-color)]"><CardContent className="flex items-start gap-3 p-4"><LockKeyhole className="mt-0.5 h-5 w-5 text-[#9a744c]" /><div><p className="text-sm font-semibold">Acceso restringido</p><p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">Solo roles autorizados; la privacidad se activa a los 3 minutos y la sesión completa se cierra a los 5.</p></div></CardContent></Card>
      </section>
    </div>


    <Dialog open={traceOpen} onOpenChange={setTraceOpen}><DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Trazabilidad del pronóstico</DialogTitle><DialogDescription>El cálculo conserva los meses fuente, su peso y el resultado para que Dirección pueda auditarlo.</DialogDescription></DialogHeader><div className="space-y-4"><div className="rounded-2xl border border-[#b99568]/30 bg-[#b99568]/10 p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a6744]">Método</p><p className="mt-2 text-sm leading-6">Promedio móvil ponderado: 20% del mes más antiguo, 30% del siguiente y 50% del mes más reciente. No sustituye una proyección financiera aprobada.</p></div><div className="overflow-x-auto rounded-2xl border border-[color:var(--border-color)]"><Table><TableHeader><TableRow><TableHead>MES HISTÓRICO</TableHead><TableHead className="text-center">PESO</TableHead><TableHead className="text-right">VENTAS</TableHead><TableHead className="text-right">COSTO</TableHead></TableRow></TableHeader><TableBody>{forecastSources.map((item, index) => <TableRow key={item.month}><TableCell className="font-semibold">{formatMonth(item.month, true)}</TableCell><TableCell className="number-display text-center">{Math.round((forecastWeights[index] ?? 0) * 100)}%</TableCell><TableCell className="number-display text-right">{money.format(item.sales)}</TableCell><TableCell className="number-display text-right">{money.format(item.totalCost)}</TableCell></TableRow>)}</TableBody><TableFooter><TableRow><TableCell>PRONÓSTICO {formatMonth(forecast.month, true)}</TableCell><TableCell className="text-center">100%</TableCell><TableCell className="number-display text-right">{money.format(forecast.sales)}</TableCell><TableCell className="number-display text-right">{money.format(forecast.totalCost)}</TableCell></TableRow></TableFooter></Table></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[color:var(--border-color)] p-4"><p className="text-xs font-semibold">Alcance aplicado</p><p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">{selectedBranchName} · {selectedModuleName}</p></div><div className="rounded-xl border border-[color:var(--border-color)] p-4"><p className="text-xs font-semibold">Origen de datos</p><p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">Ventas registradas, nómina calculada, cargas del periodo y distribución vigente por sucursal.</p></div></div></div></DialogContent></Dialog>
  </>;
}
