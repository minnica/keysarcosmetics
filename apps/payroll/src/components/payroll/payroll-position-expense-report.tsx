"use client";

import { Fragment, useMemo, useState } from "react";
import type { ElementType } from "react";
import { BarChart3, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronUp, CircleDollarSign, Search, SlidersHorizontal, TrendingDown, TrendingUp, Users, WalletCards } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@cosmetics/ui";
import type { EmployeePayrollLine } from "./payroll-demo-context";
import { usePayrollDemo } from "./payroll-demo-context";
import { ReportExportButtons } from "./report-export-buttons";

interface EmployeeExpenseRow {
  id: string;
  name: string;
  position: string;
  branch: string;
  category: string;
  payroll: number;
  socialCost: number;
  isrCost: number;
  total: number;
}

interface PositionExpenseRow {
  position: string;
  employees: EmployeeExpenseRow[];
  employeeCount: number;
  payroll: number;
  socialCost: number;
  isrCost: number;
  total: number;
  previousTotal: number;
  percentage: number;
  change: number | null;
}

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const compactMoney = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", notation: "compact", maximumFractionDigits: 1 });

function shiftMonth(date: string, offset: number) {
  const [year = 2026, month = 1, day = 1] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function toEmployeeRows(lines: EmployeePayrollLine[], branchName: (branchId: string) => string): EmployeeExpenseRow[] {
  return lines.map((line) => ({
    id: line.employee.id,
    name: line.employee.name,
    position: line.employee.position || "SIN PUESTO",
    branch: branchName(line.employee.branchId),
    category: line.employee.category,
    payroll: line.total,
    socialCost: line.socialCost,
    isrCost: line.isrCost,
    total: line.totalCost,
  }));
}

function groupByPosition(current: EmployeeExpenseRow[], previous: EmployeeExpenseRow[]): PositionExpenseRow[] {
  const previousByPosition = new Map<string, number>();
  previous.forEach((row) => previousByPosition.set(row.position, (previousByPosition.get(row.position) ?? 0) + row.total));
  const grouped = new Map<string, Omit<PositionExpenseRow, "previousTotal" | "percentage" | "change">>();
  current.forEach((row) => {
    const item = grouped.get(row.position) ?? { position: row.position, employees: [], employeeCount: 0, payroll: 0, socialCost: 0, isrCost: 0, total: 0 };
    item.employees.push(row);
    item.employeeCount += 1;
    item.payroll += row.payroll;
    item.socialCost += row.socialCost;
    item.isrCost += row.isrCost;
    item.total += row.total;
    grouped.set(row.position, item);
  });
  const total = Array.from(grouped.values()).reduce((sum, row) => sum + row.total, 0);
  return Array.from(grouped.values()).map((row) => {
    const previousTotal = previousByPosition.get(row.position) ?? 0;
    return { ...row, previousTotal, percentage: total > 0 ? row.total / total * 100 : 0, change: previousTotal > 0 ? (row.total - previousTotal) / previousTotal * 100 : row.total > 0 ? null : 0 };
  }).sort((a, b) => b.total - a.total);
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) return <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200">SIN BASE</Badge>;
  const up = value >= 0;
  return <Badge variant="outline" className={up ? "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"}>{up ? "+" : ""}{value.toFixed(1)}%</Badge>;
}

function Metric({ icon: Icon, label, value, detail, tone = "gold" }: { icon: ElementType; label: string; value: string; detail: string; tone?: "gold" | "green" | "rose" }) {
  const toneClass = tone === "green" ? "border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-200" : tone === "rose" ? "border-rose-300/50 bg-rose-50 text-rose-700 dark:bg-rose-950/25 dark:text-rose-200" : "border-[#c3a583]/45 bg-[#c3a583]/10 text-[#8a6744]";
  return <Card><CardContent className="flex items-start justify-between gap-3 p-4"><div><p className="label-caps">{label}</p><p className="number-display mt-2 text-xl">{value}</p><p className="mt-1 text-[10px] text-[color:var(--text-muted)]">{detail}</p></div><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${toneClass}`}><Icon className="h-4 w-4" /></span></CardContent></Card>;
}

export function PayrollPositionExpenseReport() {
  const { state, payrollLines } = usePayrollDemo();
  const config = state.periodConfigs.find((item) => item.module === "CONSOLIDATED");
  const initialStart = config?.periodStart ?? "2026-09-01";
  const initialEnd = config?.periodEnd ?? "2026-09-15";
  const [dateFrom, setDateFrom] = useState(initialStart);
  const [dateTo, setDateTo] = useState(initialEnd);
  const [nameQuery, setNameQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);
  const previousFrom = shiftMonth(dateFrom, -1);
  const previousTo = shiftMonth(dateTo, -1);
  const positionOptions = useMemo(() => Array.from(new Set([
    ...state.positions.filter((position) => position.active).map((position) => position.name),
    ...state.employees.map((employee) => employee.position || "SIN PUESTO"),
  ])).sort((a, b) => a.localeCompare(b, "es-MX")), [state.employees, state.positions]);

  const analysis = useMemo(() => {
    const matchesFilters = (line: EmployeePayrollLine) => {
      const normalized = nameQuery.trim().toLocaleLowerCase("es-MX");
      return (!normalized || line.employee.name.toLocaleLowerCase("es-MX").includes(normalized)) && (positionFilter === "ALL" || (line.employee.position || "SIN PUESTO") === positionFilter);
    };
    const branchName = (branchId: string) => state.branches.find((branch) => branch.id === branchId)?.name ?? "SIN SUCURSAL";
    const current = toEmployeeRows(payrollLines(dateFrom, state.calculationMode, dateTo, "CONSOLIDATED").filter(matchesFilters), branchName);
    const previous = toEmployeeRows(payrollLines(previousFrom, state.calculationMode, previousTo, "CONSOLIDATED").filter(matchesFilters), branchName);
    return { current, previous, positions: groupByPosition(current, previous) };
  }, [dateFrom, dateTo, nameQuery, payrollLines, positionFilter, previousFrom, previousTo, state.branches, state.calculationMode]);

  const totalPayroll = analysis.current.reduce((sum, row) => sum + row.payroll, 0);
  const totalSocial = analysis.current.reduce((sum, row) => sum + row.socialCost, 0);
  const totalIsr = analysis.current.reduce((sum, row) => sum + row.isrCost, 0);
  const total = analysis.current.reduce((sum, row) => sum + row.total, 0);
  const previousTotal = analysis.previous.reduce((sum, row) => sum + row.total, 0);
  const costChange = previousTotal > 0 ? (total - previousTotal) / previousTotal * 100 : null;
  const previousHeadcount = new Set(analysis.previous.map((row) => row.id)).size;
  const headcount = new Set(analysis.current.map((row) => row.id)).size;
  const headcountChange = previousHeadcount > 0 ? (headcount - previousHeadcount) / previousHeadcount * 100 : null;
  const maxCost = Math.max(...analysis.positions.map((row) => row.total), 1);
  const maxComparison = Math.max(...analysis.positions.flatMap((row) => [row.total, row.previousTotal]), 1);
  const exportConfig = {
    title: "Reporte ejecutivo de gastos por puesto",
    subtitle: `${dateFrom} — ${dateTo} · Comparativo ${previousFrom} — ${previousTo}`,
    filename: `gastos-por-puesto-${dateFrom}-${dateTo}`,
    sheetName: "Detalle por empleado",
    orientation: "landscape" as const,
    rows: analysis.current,
    columns: [
      { header: "EMPLEADO", accessor: (row: EmployeeExpenseRow) => row.name, width: 28 },
      { header: "PUESTO", accessor: (row: EmployeeExpenseRow) => row.position, width: 28 },
      { header: "SUCURSAL", accessor: (row: EmployeeExpenseRow) => row.branch, width: 18 },
      { header: "TIPO", accessor: (row: EmployeeExpenseRow) => row.category, width: 16 },
      { header: "NÓMINA", accessor: (row: EmployeeExpenseRow) => row.payroll, format: "currency" as const, width: 16 },
      { header: "COSTO SOCIAL", accessor: (row: EmployeeExpenseRow) => row.socialCost, format: "currency" as const, width: 16 },
      { header: "ISR", accessor: (row: EmployeeExpenseRow) => row.isrCost, format: "currency" as const, width: 14 },
      { header: "COSTO TOTAL", accessor: (row: EmployeeExpenseRow) => row.total, format: "currency" as const, width: 17 },
    ],
    summarySection: { title: "Costo acumulado por puesto", sheetName: "Resumen por puesto", labelHeader: "Puesto", valueHeader: "Costo total", rows: analysis.positions.map((row) => ({ label: row.position, value: row.total })), totalLabel: "Gasto total", total },
  };

  function resetFilters() {
    setDateFrom(initialStart);
    setDateTo(initialEnd);
    setNameQuery("");
    setPositionFilter("ALL");
    setExpandedPosition(null);
  }

  return (
    <div className="space-y-6">
      <header><div className="mb-2 flex items-center gap-2"><Badge variant="outline">REPORTE EJECUTIVO</Badge><span className="text-xs text-[color:var(--text-muted)]">Distribución y evolución del costo laboral</span></div><h1 className="page-title">Gastos por puesto</h1><p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Filtra por periodo, colaborador o puesto; abre cada renglón para revisar su integración y compara el resultado contra el mes anterior.</p></header>

      <Card className="border-[color:var(--border-color)]"><CardContent className="p-4"><div className="mb-3 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[#956f48]" /><p className="text-xs font-semibold uppercase tracking-[0.1em]">Filtros del reporte</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[160px_160px_minmax(220px,1fr)_260px_auto] xl:items-end"><div className="space-y-2"><Label htmlFor="position-report-from">Desde</Label><Input id="position-report-from" type="date" value={dateFrom} onChange={(event) => { const value = event.target.value; setDateFrom(value); if (value > dateTo) setDateTo(value); }} /></div><div className="space-y-2"><Label htmlFor="position-report-to">Hasta</Label><Input id="position-report-to" type="date" value={dateTo} onChange={(event) => { const value = event.target.value; setDateTo(value); if (value < dateFrom) setDateFrom(value); }} /></div><div className="space-y-2"><Label htmlFor="position-report-name">Nombre</Label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" /><Input id="position-report-name" className="pl-9" value={nameQuery} onChange={(event) => setNameQuery(event.target.value)} placeholder="BUSCAR EMPLEADO" /></div></div><div className="space-y-2"><Label htmlFor="position-report-position">Puesto</Label><Select value={positionFilter} onValueChange={setPositionFilter}><SelectTrigger id="position-report-position"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">TODOS LOS PUESTOS</SelectItem>{positionOptions.map((position) => <SelectItem key={position} value={position}>{position}</SelectItem>)}</SelectContent></Select></div><Button size="sm" variant="outline" className="h-10" onClick={resetFilters}>Limpiar</Button></div></CardContent></Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]"><CardHeader className="border-b border-white/15 bg-[linear-gradient(110deg,rgba(52,43,35,0.99),rgba(111,82,55,0.95))] text-white"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#e7c69d]" /><CardTitle className="section-heading uppercase text-[#f5e9da]">Resumen de gastos por puesto</CardTitle></div><CardDescription className="mt-1 text-[#d8c9b8]">{headcount} personas · {analysis.positions.length} puestos · {dateFrom} — {dateTo}</CardDescription></div><div className="flex items-center gap-4"><div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d8c9b8]">Gasto total</p><p className="number-display mt-1 text-2xl text-white">{money.format(total)}</p></div><ReportExportButtons config={exportConfig} disabled={!analysis.current.length} iconOnly appearance="on-dark" /></div></div></CardHeader></Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={WalletCards} label="NÓMINA NETA" value={money.format(totalPayroll)} detail={`${total > 0 ? (totalPayroll / total * 100).toFixed(1) : "0.0"}% del gasto`} /><Metric icon={CircleDollarSign} label="CARGAS E ISR" value={money.format(totalSocial + totalIsr)} detail={`${total > 0 ? ((totalSocial + totalIsr) / total * 100).toFixed(1) : "0.0"}% del gasto`} /><Metric icon={costChange !== null && costChange < 0 ? TrendingDown : TrendingUp} label="CAMBIO VS. MES ANTERIOR" value={costChange === null ? "SIN BASE" : `${costChange >= 0 ? "+" : ""}${costChange.toFixed(1)}%`} detail={`${money.format(previousTotal)} en periodo comparable`} tone={costChange !== null && costChange < 0 ? "green" : "rose"} /><Metric icon={Users} label="PERSONAL" value={`${headcount}`} detail={headcountChange === null ? "Sin base comparable" : `${headcountChange >= 0 ? "+" : ""}${headcountChange.toFixed(1)}% vs. mes anterior`} /></div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="section-heading uppercase">Participación del gasto</CardTitle><CardDescription>Proporción de cada puesto en el costo filtrado.</CardDescription></CardHeader><CardContent className="space-y-4">{analysis.positions.slice(0, 8).map((row) => <div key={row.position}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold">{row.position}</span><span className="number-display">{row.percentage.toFixed(1)}% · {compactMoney.format(row.total)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-gradient-to-r from-[#c3a583] via-[#9b7957] to-[#648672]" style={{ width: `${Math.max(row.total / maxCost * 100, row.total > 0 ? 3 : 0)}%` }} /></div></div>)}{!analysis.positions.length && <p className="py-8 text-center text-sm text-[color:var(--text-muted)]">No hay información para los filtros seleccionados.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="section-heading uppercase">Comparativo mensual por puesto</CardTitle><CardDescription>Periodo actual frente al rango equivalente del mes anterior.</CardDescription></CardHeader><CardContent className="space-y-4">{analysis.positions.slice(0, 8).map((row) => <div key={row.position}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="truncate text-xs font-semibold">{row.position}</span><ChangeBadge value={row.change} /></div><div className="grid gap-1"><div className="flex items-center gap-2"><span className="w-14 text-[8px] font-semibold text-[color:var(--text-muted)]">ACTUAL</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-[#9b7957]" style={{ width: `${Math.max(row.total / maxComparison * 100, 0)}%` }} /></div><span className="w-16 text-right text-[9px]">{compactMoney.format(row.total)}</span></div><div className="flex items-center gap-2"><span className="w-14 text-[8px] font-semibold text-[color:var(--text-muted)]">ANTERIOR</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-[#648672]" style={{ width: `${Math.max(row.previousTotal / maxComparison * 100, 0)}%` }} /></div><span className="w-16 text-right text-[9px]">{compactMoney.format(row.previousTotal)}</span></div></div></div>)}{!analysis.positions.length && <p className="py-8 text-center text-sm text-[color:var(--text-muted)]">No hay puestos para comparar.</p>}</CardContent></Card>
      </div>

      <Card className="overflow-hidden"><CardHeader className="border-b border-[color:var(--border-color)]"><CardTitle className="section-heading uppercase">Detalle ejecutivo por puesto</CardTitle><CardDescription>Selecciona el nombre de un puesto para desplegar las personas y los conceptos que integran su costo.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>PUESTO</TableHead><TableHead className="text-center">PERSONAL</TableHead><TableHead className="text-right">NÓMINA</TableHead><TableHead className="text-right">SOCIAL</TableHead><TableHead className="text-right">ISR</TableHead><TableHead className="text-right">COSTO TOTAL</TableHead><TableHead className="text-right">PARTICIPACIÓN</TableHead><TableHead className="text-right">VS. ANTERIOR</TableHead></TableRow></TableHeader><TableBody>{analysis.positions.map((row) => {
          const expanded = expandedPosition === row.position;
          return <Fragment key={row.position}><TableRow className={expanded ? "bg-[color:var(--accent-hover)]/30" : undefined}><TableCell><button type="button" className="inline-flex items-center gap-2 text-left text-xs font-semibold uppercase text-[#765638] hover:text-[#9b744f]" onClick={() => setExpandedPosition(expanded ? null : row.position)} aria-expanded={expanded}>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{row.position}</button></TableCell><TableCell className="text-center">{row.employeeCount}</TableCell><TableCell className="number-display text-right">{money.format(row.payroll)}</TableCell><TableCell className="number-display text-right">{money.format(row.socialCost)}</TableCell><TableCell className="number-display text-right">{money.format(row.isrCost)}</TableCell><TableCell className="number-display text-right font-semibold">{money.format(row.total)}</TableCell><TableCell className="number-display text-right">{row.percentage.toFixed(1)}%</TableCell><TableCell className="text-right"><ChangeBadge value={row.change} /></TableCell></TableRow>{expanded && <TableRow><TableCell colSpan={8} className="bg-[color:var(--accent-hover)]/15 p-0"><div className="p-4"><div className="mb-3 flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-[#8a6744]" /><p className="text-[10px] font-semibold uppercase tracking-[0.1em]">Integración de {row.position}</p></div><div className="overflow-x-auto rounded-xl border border-[color:var(--border-color)]"><Table><TableHeader><TableRow><TableHead>EMPLEADO</TableHead><TableHead>SUCURSAL</TableHead><TableHead>TIPO</TableHead><TableHead className="text-right">NÓMINA</TableHead><TableHead className="text-right">SOCIAL</TableHead><TableHead className="text-right">ISR</TableHead><TableHead className="text-right">TOTAL</TableHead></TableRow></TableHeader><TableBody>{row.employees.map((employee) => <TableRow key={employee.id}><TableCell className="font-semibold">{employee.name}</TableCell><TableCell>{employee.branch}</TableCell><TableCell><Badge variant="outline" className="text-[8px]">{employee.category}</Badge></TableCell><TableCell className="number-display text-right">{money.format(employee.payroll)}</TableCell><TableCell className="number-display text-right">{money.format(employee.socialCost)}</TableCell><TableCell className="number-display text-right">{money.format(employee.isrCost)}</TableCell><TableCell className="number-display text-right font-semibold">{money.format(employee.total)}</TableCell></TableRow>)}</TableBody></Table></div></div></TableCell></TableRow>}</Fragment>;
        })}</TableBody><TableFooter><TableRow><TableCell>TOTAL FILTRADO</TableCell><TableCell className="text-center">{headcount}</TableCell><TableCell className="number-display text-right">{money.format(totalPayroll)}</TableCell><TableCell className="number-display text-right">{money.format(totalSocial)}</TableCell><TableCell className="number-display text-right">{money.format(totalIsr)}</TableCell><TableCell className="number-display text-right">{money.format(total)}</TableCell><TableCell className="text-right">100%</TableCell><TableCell /></TableRow></TableFooter></Table></div></CardContent></Card>
    </div>
  );
}
