"use client";

import { useMemo, useState } from "react";
import { Activity, BarChart3, Building2, CalendarDays, CircleDollarSign, Scale, TrendingUp, WalletCards } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import { employeeCostAllocationShares, payrollCostAllocationMode } from "./payroll-cost-branch-selector";
import { usePayrollDemo } from "./payroll-demo-context";
import { ReportExportButtons } from "./report-export-buttons";

type ReportScope = "MONTHLY" | "QUARTERLY" | "ANNUAL";

interface ReportPeriod {
  key: string;
  label: string;
  start: string;
  end: string;
  months: string[];
}

interface BranchSummaryRow {
  id: string;
  branch: string;
  sales: number;
  fixedSalary: number;
  variablePay: number;
  deductions: number;
  payrollCost: number;
  socialCost: number;
  isrCost: number;
  totalCost: number;
  employees: number;
}

interface MonthlyTrend {
  month: string;
  label: string;
  sales: number;
  payroll: number;
  social: number;
  isr: number;
  totalCost: number;
}

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const compactMoney = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", notation: "compact", maximumFractionDigits: 1 });
const monthName = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
const shortMonthName = new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit", timeZone: "UTC" });

function monthBounds(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

function monthLabel(month: string) {
  return monthName.format(new Date(`${month}-01T12:00:00Z`)).toLocaleUpperCase("es-MX");
}

function buildScopeOptions(scope: ReportScope, months: string[]): ReportPeriod[] {
  if (scope === "MONTHLY") {
    return months.map((month) => ({ key: month, label: monthLabel(month), ...monthBounds(month), months: [month] }));
  }

  const grouped = new Map<string, string[]>();
  months.forEach((month) => {
    const year = Number(month.slice(0, 4));
    const monthNumber = Number(month.slice(5, 7));
    const key = scope === "QUARTERLY" ? `${year}-Q${Math.ceil(monthNumber / 3)}` : String(year);
    grouped.set(key, [...(grouped.get(key) ?? []), month]);
  });

  return Array.from(grouped.entries()).map(([key, groupedMonths]) => {
    const orderedMonths = [...groupedMonths].sort();
    const first = orderedMonths[0] ?? months[0] ?? "2026-01";
    const last = orderedMonths.at(-1) ?? first;
    const year = first.slice(0, 4);
    const label = scope === "QUARTERLY"
      ? `TRIMESTRE ${key.slice(-1)} · ${year} · ${orderedMonths.length} MESES`
      : `${year} · ${orderedMonths.length} MESES DISPONIBLES`;
    return { key, label, start: monthBounds(first).start, end: monthBounds(last).end, months: orderedMonths };
  });
}

function Metric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) {
  return <Card><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="label-caps">{label}</p><p className="number-display mt-2 text-xl">{value}</p><p className="mt-1 text-[10px] text-[color:var(--text-muted)]">{detail}</p></div><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]"><Icon className="h-4 w-4" /></span></div></CardContent></Card>;
}

export function PayrollBranchReportDemo() {
  const { state, currentPeriod, periodOptions, payrollLines } = usePayrollDemo();
  const availableMonths = useMemo(() => Array.from(new Set(periodOptions.map((period) => period.start.slice(0, 7)))), [periodOptions]);
  const [scope, setScope] = useState<ReportScope>("MONTHLY");
  const [periodKey, setPeriodKey] = useState(currentPeriod.start.slice(0, 7));
  const scopeOptions = useMemo(() => buildScopeOptions(scope, availableMonths), [availableMonths, scope]);
  const selectedPeriod = scopeOptions.find((option) => option.key === periodKey) ?? scopeOptions[0] ?? {
    key: currentPeriod.start.slice(0, 7),
    label: monthLabel(currentPeriod.start.slice(0, 7)),
    start: currentPeriod.start,
    end: currentPeriod.end,
    months: [currentPeriod.start.slice(0, 7)],
  };

  function selectScope(nextScope: ReportScope) {
    const nextOptions = buildScopeOptions(nextScope, availableMonths);
    setScope(nextScope);
    setPeriodKey(nextOptions[0]?.key ?? currentPeriod.start.slice(0, 7));
  }

  const analysis = useMemo(() => {
    const snapshots = selectedPeriod.months.map((month): { month: string; rows: BranchSummaryRow[]; trend: MonthlyTrend } => {
      const bounds = monthBounds(month);
      const lines = payrollLines(bounds.start, state.calculationMode, bounds.end);
      const rows = state.branches.map((branch) => {
        let branchSales = 0;
        let fixedSalary = 0;
        let variablePay = 0;
        let deductions = 0;
        let socialCost = 0;
        let isrCost = 0;
        const employeeIds = new Set<string>();

        lines.forEach((line) => {
          const employeeSales = state.sales.filter((sale) => sale.employeeId === line.employee.id && sale.date >= bounds.start && sale.date <= bounds.end);
          const employeeSalesTotal = employeeSales.reduce((sum, sale) => sum + sale.amount, 0);
          const employeeBranchSales = employeeSales.filter((sale) => sale.branchId === branch.id).reduce((sum, sale) => sum + sale.amount, 0);
          const salesShare = employeeSalesTotal > 0 ? employeeBranchSales / employeeSalesTotal : 0;
          const allocationMode = payrollCostAllocationMode(state.payrollCostAllocationModes, line.employee.id, bounds.start, bounds.end);
          const costShare = employeeCostAllocationShares({ employee: line.employee, branches: state.branches, sales: state.sales, periodStart: bounds.start, periodEnd: bounds.end, mode: allocationMode }).find((allocation) => allocation.branchId === branch.id)?.share ?? 0;
          if (costShare > 0) employeeIds.add(line.employee.id);
          branchSales += line.sales * salesShare;
          fixedSalary += line.fixedSalary * costShare;
          variablePay += (line.commission + line.bonuses + line.externalAdditions - line.viaticsAdditions) * costShare;
          deductions += (line.fines + line.loanDeduction + line.externalDeductions - line.viaticsDeductions) * costShare;
          socialCost += line.socialCost * costShare;
          isrCost += line.isrCost * costShare;
        });

        const branchViatics = state.viaticsEntries.filter((entry) => entry.branchId === branch.id && entry.requestedAt >= bounds.start && entry.requestedAt <= bounds.end && entry.status === "APPROVED");
        branchViatics.forEach((entry) => employeeIds.add(entry.employeeId));
        variablePay += branchViatics.filter((entry) => state.viaticsConcepts.find((concept) => concept.id === entry.conceptId)?.effect === "ADD").reduce((sum, entry) => sum + entry.amount, 0);
        deductions += branchViatics.filter((entry) => state.viaticsConcepts.find((concept) => concept.id === entry.conceptId)?.effect === "DEDUCT").reduce((sum, entry) => sum + entry.amount, 0);
        const payrollCost = fixedSalary + variablePay - deductions;
        return { id: branch.id, branch: branch.name, sales: branchSales, fixedSalary, variablePay, deductions, payrollCost, socialCost, isrCost, totalCost: payrollCost + socialCost + isrCost, employees: employeeIds.size };
      });
      const payroll = rows.reduce((sum, row) => sum + row.payrollCost, 0);
      const social = rows.reduce((sum, row) => sum + row.socialCost, 0);
      const isr = rows.reduce((sum, row) => sum + row.isrCost, 0);
      return {
        month,
        rows,
        trend: {
          month,
          label: shortMonthName.format(new Date(`${month}-01T12:00:00Z`)).replace(".", "").toLocaleUpperCase("es-MX"),
          sales: rows.reduce((sum, row) => sum + row.sales, 0),
          payroll,
          social,
          isr,
          totalCost: payroll + social + isr,
        },
      };
    });

    const rows = state.branches.map((branch) => {
      const entries = snapshots.map((snapshot) => snapshot.rows.find((row) => row.id === branch.id)).filter((row): row is BranchSummaryRow => Boolean(row));
      return {
        id: branch.id,
        branch: branch.name,
        sales: entries.reduce((sum, row) => sum + row.sales, 0),
        fixedSalary: entries.reduce((sum, row) => sum + row.fixedSalary, 0),
        variablePay: entries.reduce((sum, row) => sum + row.variablePay, 0),
        deductions: entries.reduce((sum, row) => sum + row.deductions, 0),
        payrollCost: entries.reduce((sum, row) => sum + row.payrollCost, 0),
        socialCost: entries.reduce((sum, row) => sum + row.socialCost, 0),
        isrCost: entries.reduce((sum, row) => sum + row.isrCost, 0),
        totalCost: entries.reduce((sum, row) => sum + row.totalCost, 0),
        employees: Math.max(0, ...entries.map((row) => row.employees)),
      };
    });
    return { rows, trend: snapshots.map((snapshot) => snapshot.trend) };
  }, [payrollLines, selectedPeriod.months, state.branches, state.calculationMode, state.payrollCostAllocationModes, state.sales, state.viaticsConcepts, state.viaticsEntries]);

  const rows = analysis.rows;
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalPayroll = rows.reduce((sum, row) => sum + row.payrollCost, 0);
  const totalSocial = rows.reduce((sum, row) => sum + row.socialCost, 0);
  const totalIsr = rows.reduce((sum, row) => sum + row.isrCost, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);
  const totalEmployees = new Set(state.employees.filter((employee) => employee.active).map((employee) => employee.id)).size;
  const maxCost = Math.max(...rows.map((row) => row.totalCost), 1);
  const maxTrend = Math.max(...analysis.trend.flatMap((item) => [item.sales, item.totalCost]), 1);
  const efficiencyRows = [...rows].sort((a, b) => (b.sales / Math.max(b.totalCost, 1)) - (a.sales / Math.max(a.totalCost, 1)));
  const exportConfig = {
    title: "Desglose analítico de nómina por sucursal",
    subtitle: `${selectedPeriod.label} · ${selectedPeriod.start} — ${selectedPeriod.end} · Datos mock`,
    filename: `nomina-por-sucursal-${scope.toLocaleLowerCase("es-MX")}-${selectedPeriod.key}`,
    sheetName: "Por sucursal",
    rows,
    columns: [
      { header: "SUCURSAL", accessor: (row: BranchSummaryRow) => row.branch, width: 24 },
      { header: "EMPLEADOS", accessor: (row: BranchSummaryRow) => row.employees, format: "number" as const, width: 12 },
      { header: "VENTAS", accessor: (row: BranchSummaryRow) => row.sales, format: "currency" as const, width: 16 },
      { header: "SUELDO FIJO", accessor: (row: BranchSummaryRow) => row.fixedSalary, format: "currency" as const, width: 16 },
      { header: "VARIABLE", accessor: (row: BranchSummaryRow) => row.variablePay, format: "currency" as const, width: 16 },
      { header: "DEDUCCIONES", accessor: (row: BranchSummaryRow) => row.deductions, format: "currency" as const, width: 16 },
      { header: "NÓMINA NETA", accessor: (row: BranchSummaryRow) => row.payrollCost, format: "currency" as const, width: 18 },
      { header: "COSTO SOCIAL", accessor: (row: BranchSummaryRow) => row.socialCost, format: "currency" as const, width: 17 },
      { header: "ISR", accessor: (row: BranchSummaryRow) => row.isrCost, format: "currency" as const, width: 14 },
      { header: "COSTO TOTAL", accessor: (row: BranchSummaryRow) => row.totalCost, format: "currency" as const, width: 18 },
      { header: "COSTO / VENTA", accessor: (row: BranchSummaryRow) => row.sales > 0 ? row.totalCost / row.sales : 0, format: "percent" as const, width: 15 },
    ],
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">REPORTE ANALÍTICO</Badge><span className="text-xs text-[color:var(--text-muted)]">Distribución por punto de venta</span></div><h1 className="page-title">Dashboard por sucursal</h1><p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">Compara ventas, nómina y cargas por mes, trimestre o año con la distribución configurada para cada empleado.</p></div>
        <ReportExportButtons config={exportConfig} />
      </header>

      <Card className="border-[color:var(--border-color)]">
        <CardContent className="flex flex-col gap-4 p-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2"><Label>Alcance del reporte</Label><div className="inline-flex rounded-lg border border-[color:var(--border-color)] p-1">{(["MONTHLY", "QUARTERLY", "ANNUAL"] as ReportScope[]).map((item) => <Button key={item} type="button" size="sm" variant={scope === item ? "default" : "ghost"} className="h-8 px-3 text-[10px]" onClick={() => selectScope(item)}>{item === "MONTHLY" ? "Mensual" : item === "QUARTERLY" ? "Trimestral" : "Anual"}</Button>)}</div></div>
            <div className="min-w-0 space-y-2 sm:w-[330px]"><Label htmlFor="branch-report-period">Periodo analizado</Label><Select value={selectedPeriod.key} onValueChange={setPeriodKey}><SelectTrigger id="branch-report-period" className="h-10"><SelectValue /></SelectTrigger><SelectContent>{scopeOptions.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#c3a583]/35 bg-[#c3a583]/10 px-3 py-2"><CalendarDays className="h-4 w-4 text-[#987049]" /><div><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">Periodo consolidado</p><p className="text-xs font-semibold">{selectedPeriod.start} — {selectedPeriod.end}</p></div></div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={TrendingUp} label="VENTAS" value={money.format(totalSales)} detail={`${selectedPeriod.months.length} ${selectedPeriod.months.length === 1 ? "mes" : "meses"} acumulados`} />
        <Metric icon={WalletCards} label="COSTO INTEGRAL" value={money.format(totalCost)} detail="Nómina + social + ISR" />
        <Metric icon={CircleDollarSign} label="COSTO / VENTA" value={`${totalSales > 0 ? (totalCost / totalSales * 100).toFixed(1) : "0.0"}%`} detail="Participación integral" />
        <Metric icon={Scale} label="PROMEDIO / EMPLEADO" value={money.format(totalEmployees > 0 ? totalCost / totalEmployees : 0)} detail={`${totalEmployees} empleados vigentes`} />
        <Metric icon={Building2} label="SUCURSALES" value={String(rows.length)} detail="Centros de costo" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card><CardHeader><CardTitle className="section-heading uppercase">Costo comparado</CardTitle><CardDescription>Participación integral por sucursal.</CardDescription></CardHeader><CardContent className="space-y-4">{rows.map((row) => <div key={row.id}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-semibold">{row.branch}</span><span className="number-display">{money.format(row.totalCost)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className="h-full rounded-full bg-gradient-to-r from-[#c3a583] to-[#648672]" style={{ width: `${Math.max(row.totalCost / maxCost * 100, row.totalCost > 0 ? 4 : 0)}%` }} /></div><p className="mt-1 text-[10px] text-[color:var(--text-muted)]">{row.employees} empleados · {totalCost > 0 ? (row.totalCost / totalCost * 100).toFixed(1) : "0.0"}% del costo total</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="section-heading uppercase">Composición del costo</CardTitle><CardDescription>Qué conceptos forman el gasto integral seleccionado.</CardDescription></CardHeader><CardContent className="space-y-4">{[
          { label: "NÓMINA NETA", value: totalPayroll, color: "bg-[#9a744c]" },
          { label: "COSTO SOCIAL", value: totalSocial, color: "bg-[#648672]" },
          { label: "ISR", value: totalIsr, color: "bg-[#7a6f89]" },
        ].map((item) => <div key={item.label} className="grid grid-cols-[110px_minmax(0,1fr)_100px] items-center gap-3"><span className="text-[9px] font-semibold tracking-[0.08em] text-[color:var(--text-muted)]">{item.label}</span><div className="h-2 overflow-hidden rounded-full bg-[color:var(--accent-hover)]"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${totalCost > 0 ? item.value / totalCost * 100 : 0}%` }} /></div><span className="number-display text-right text-xs">{money.format(item.value)}</span></div>)}</CardContent></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Card><CardHeader><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-[color:var(--text-secondary)]" /><CardTitle className="section-heading uppercase">Tendencia mensual</CardTitle></div><CardDescription>Ventas frente al costo integral dentro del periodo.</CardDescription></CardHeader><CardContent><div className="grid min-h-[210px] grid-cols-[repeat(auto-fit,minmax(64px,1fr))] items-end gap-2 border-b border-[color:var(--border-color)] pb-3">{analysis.trend.map((item) => <div key={item.month} className="flex h-full min-w-0 flex-col justify-end"><div className="mb-2 flex h-36 items-end justify-center gap-1"><span className="w-3 rounded-t bg-[#c3a583]" style={{ height: `${Math.max(item.sales / maxTrend * 100, item.sales > 0 ? 4 : 0)}%` }} title={`Ventas ${money.format(item.sales)}`} /><span className="w-3 rounded-t bg-[#648672]" style={{ height: `${Math.max(item.totalCost / maxTrend * 100, item.totalCost > 0 ? 4 : 0)}%` }} title={`Costo ${money.format(item.totalCost)}`} /></div><p className="truncate text-center text-[8px] font-semibold text-[color:var(--text-muted)]">{item.label}</p><p className="truncate text-center text-[8px]">{compactMoney.format(item.totalCost)}</p></div>)}</div><div className="mt-3 flex gap-5 text-[9px] font-semibold text-[color:var(--text-muted)]"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#c3a583]" />VENTAS</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#648672]" />COSTO INTEGRAL</span></div></CardContent></Card>
        <Card><CardHeader><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[color:var(--text-secondary)]" /><CardTitle className="section-heading uppercase">Rendimiento</CardTitle></div><CardDescription>Ventas generadas por cada peso de costo.</CardDescription></CardHeader><CardContent className="space-y-2">{efficiencyRows.map((row, index) => { const returnRate = row.sales / Math.max(row.totalCost, 1); return <div key={row.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-[color:var(--border-color)] px-3 py-2.5"><span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ${index === 0 ? "bg-[#342b23] text-[#f0d9b8]" : "bg-[color:var(--accent-hover)] text-[color:var(--text-muted)]"}`}>{index + 1}</span><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{row.branch}</p><p className="text-[9px] text-[color:var(--text-muted)]">Costo / venta {row.sales > 0 ? (row.totalCost / row.sales * 100).toFixed(1) : "0.0"}%</p></div><span className="number-display text-sm">{returnRate.toFixed(2)}x</span></div>; })}</CardContent></Card>
      </div>

      <Card className="overflow-hidden"><CardHeader><CardTitle className="section-heading uppercase">Reporte consolidado por sucursal</CardTitle><CardDescription>Ventas, nómina y cargas completas del periodo elegido.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>SUCURSAL</TableHead><TableHead className="text-right">VENTAS</TableHead><TableHead className="text-right">FIJO</TableHead><TableHead className="text-right">VARIABLE</TableHead><TableHead className="text-right">DEDUCCIONES</TableHead><TableHead className="text-right">NÓMINA</TableHead><TableHead className="text-right">SOCIAL</TableHead><TableHead className="text-right">ISR</TableHead><TableHead className="text-right">TOTAL</TableHead><TableHead className="text-right">COSTO / VENTA</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><p className="font-semibold">{row.branch}</p><p className="text-xs text-[color:var(--text-muted)]">{row.employees} empleados</p></TableCell><TableCell className="number-display text-right">{money.format(row.sales)}</TableCell><TableCell className="number-display text-right">{money.format(row.fixedSalary)}</TableCell><TableCell className="number-display text-right">{money.format(row.variablePay)}</TableCell><TableCell className="number-display text-right text-rose-700 dark:text-rose-300">{money.format(row.deductions)}</TableCell><TableCell className="number-display text-right">{money.format(row.payrollCost)}</TableCell><TableCell className="number-display text-right">{money.format(row.socialCost)}</TableCell><TableCell className="number-display text-right">{money.format(row.isrCost)}</TableCell><TableCell className="number-display text-right font-semibold">{money.format(row.totalCost)}</TableCell><TableCell className="number-display text-right">{row.sales > 0 ? `${(row.totalCost / row.sales * 100).toFixed(1)}%` : "—"}</TableCell></TableRow>)}</TableBody><TableFooter><TableRow><TableCell>TOTAL</TableCell><TableCell className="number-display text-right">{money.format(totalSales)}</TableCell><TableCell colSpan={6} /><TableCell className="number-display text-right">{money.format(totalCost)}</TableCell><TableCell className="number-display text-right">{totalSales > 0 ? `${(totalCost / totalSales * 100).toFixed(1)}%` : "—"}</TableCell></TableRow></TableFooter></Table></div></CardContent></Card>
    </div>
  );
}
