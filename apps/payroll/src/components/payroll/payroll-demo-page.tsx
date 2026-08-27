"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  ListChecks,
  LockKeyhole,
  Plus,
  Settings2,
  Sparkles,
  TrendingUp,
  UsersRound,
  WalletCards,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@cosmetics/ui";
import Link from "next/link";
import {
  type EmployeeCategory,
  type EmployeePayrollLine,
  type PayrollModule,
  type DemoPayrollPeriodConfig,
  type PayrollStatus,
  payrollModuleLabels,
  usePayrollDemo,
} from "./payroll-demo-context";
import { PayrollModuleAnalytics } from "./payroll-module-analytics";
import { ReportExportButtons } from "./report-export-buttons";

type PayrollView = PayrollModule;
type PeriodDisplay = "FORTNIGHT" | "MONTHLY";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const dateLabel = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthLabel = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("es-MX") + value.slice(1);
}

function fortnightLabel(start: string) {
  const date = new Date(`${start}T00:00:00Z`);
  return `${capitalize(monthLabel.format(date))} (${date.getUTCDate() === 1 ? "1.ª" : "2.ª"} quincena)`;
}

function monthlyPeriod(month: string) {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(end).padStart(2, "0")}`,
    label: capitalize(monthLabel.format(new Date(`${month}-01T00:00:00Z`))),
  };
}

function categoryLabel(category: EmployeeCategory) {
  return {
    SELLER: "VENDEDORES",
    SPECIALIST: "ESPECIALISTAS",
    MANAGEMENT: "GERENCIA",
    CALL_CENTER: "CALL CENTER",
    CONTRACTOR: "HONORARIOS",
  }[category];
}

function payrollTypeForCategory(category: EmployeeCategory) {
  return {
    SELLER: "COMISIONES",
    SPECIALIST: "ESPECIALISTAS",
    MANAGEMENT: "SALARIO FIJO",
    CALL_CENTER: "SALARIO FIJO",
    CONTRACTOR: "HONORARIOS",
  }[category];
}

function StatusBadge({ status }: { status: PayrollStatus }) {
  const config = {
    DRAFT: { label: "BORRADOR", className: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" },
    APPROVED: { label: "AUTORIZADA", className: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" },
    PAID: { label: "PAGADA", className: "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200" },
  }[status];
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) {
  return (
    <Card className="overflow-hidden border-[color:var(--border-color)] bg-[color:var(--bg-card)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps">{label}</p>
            <p className="number-display mt-2 text-2xl text-[color:var(--text-primary)]">{value}</p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">{detail}</p>
          </div>
          <span className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)] p-2.5 text-[color:var(--text-secondary)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CostToggle({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-left text-xs font-semibold transition-colors ${checked ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100" : "border-[color:var(--border-color)] bg-[color:var(--input-disabled-bg)] text-[color:var(--text-muted)]"}`}><span aria-hidden="true" className={`relative h-4 w-8 rounded-full ${checked ? "bg-emerald-600" : "bg-stone-300 dark:bg-stone-700"}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[17px]" : "translate-x-0.5"}`} /></span>{label}</button>;
}

function RunDialog({ open, onOpenChange, module, config, mode, onModeChange }: { open: boolean; onOpenChange: (open: boolean) => void; module: PayrollModule; config: DemoPayrollPeriodConfig; mode: "WITH_VAT" | "WITHOUT_VAT"; onModeChange: (mode: "WITH_VAT" | "WITHOUT_VAT") => void }) {
  const { createRun } = usePayrollDemo();
  const defaultPayDate = new Date(`${config.periodEnd}T12:00:00`);
  defaultPayDate.setDate(defaultPayDate.getDate() + 3);
  const [payDate, setPayDate] = useState(defaultPayDate.toISOString().slice(0, 10));

  function submit() {
    createRun(module, config.periodStart, config.periodEnd, mode, payDate);
    toast.success("Nómina preparada con datos mock.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear nueva nómina</DialogTitle>
          <DialogDescription>Usará exclusivamente el periodo y corte definidos para este módulo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Periodo a calcular</Label>
            <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/40 px-4 py-3">
              <p className="font-semibold">{config.label}</p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">{config.periodStart} — {config.periodEnd} · corte {config.cutoffDate}</p>
            </div>
            <p className="text-xs text-[color:var(--text-muted)]">Este periodo solo se modifica desde Configuración.</p>
          </div>
          <div className={`grid gap-4 ${module === "COMMISSION" ? "sm:grid-cols-2" : ""}`}>
            {module === "COMMISSION" && <div className="space-y-2">
              <Label htmlFor="run-mode">Base de comisión</Label>
              <Select value={mode} onValueChange={(value) => onModeChange(value as "WITH_VAT" | "WITHOUT_VAT")}>
                <SelectTrigger id="run-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WITH_VAT">CON IVA</SelectItem>
                  <SelectItem value="WITHOUT_VAT">SIN IVA</SelectItem>
                </SelectContent>
              </Select>
            </div>}
            <div className="space-y-2">
              <Label htmlFor="pay-date">Fecha de pago</Label>
              <Input id="pay-date" type="date" value={payDate} min={config.periodEnd} onChange={(event) => setPayDate(event.target.value)} />
            </div>
          </div>
          <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/40 p-4 text-sm text-[color:var(--text-muted)]">
            <div className="flex gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-secondary)]" /><p>Modo demostración: se crea un borrador local y todos los módulos se actualizan en la sesión.</p></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}><Plus className="mr-2 h-4 w-4" />Crear nómina</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayrollTable({ lines, view, periodStart, periodEnd, includeSocialCost, includeIsr }: { lines: EmployeePayrollLine[]; view: PayrollView; periodStart: string; periodEnd: string; includeSocialCost: boolean; includeIsr: boolean }) {
  const { state } = usePayrollDemo();
  const payrollTotal = lines.reduce((sum, line) => sum + line.total, 0);
  const socialTotal = includeSocialCost ? lines.reduce((sum, line) => sum + line.socialCost, 0) : 0;
  const isrTotal = includeIsr ? lines.reduce((sum, line) => sum + line.isrCost, 0) : 0;
  const total = payrollTotal + socialTotal + isrTotal;
  const contractor = view === "CONTRACTOR";
  const reportRows = lines.map((line) => ({
    employee: line.employee.name,
    position: line.employee.position,
    branch: state.branches.find((branch) => branch.id === line.employee.branchId)?.name ?? "SIN SUCURSAL",
    bank: line.employee.bank,
    account: line.employee.account,
    scheme: line.schemeName,
    sales: line.sales,
    salary: line.fixedSalary,
    commission: line.commission,
    bonuses: line.bonuses,
    deductions: line.fines + line.loanDeduction,
    adjustments: line.externalAdditions - line.externalDeductions,
    payroll: line.total,
    socialCost: includeSocialCost ? line.socialCost : 0,
    isr: includeIsr ? line.isrCost : 0,
    total: line.total + (includeSocialCost ? line.socialCost : 0) + (includeIsr ? line.isrCost : 0),
  }));
  const reportConfig = {
    title: view === "CONSOLIDATED" ? "Consolidado general de nómina" : `Detalle de ${payrollModuleLabels[view]}`,
    subtitle: `${periodStart} — ${periodEnd} · Costo social ${includeSocialCost ? "incluido" : "excluido"} · ISR ${includeIsr ? "incluido" : "excluido"}`,
    filename: `nomina-${view.toLocaleLowerCase()}-${periodStart}`,
    sheetName: "Nómina",
    orientation: "landscape" as const,
    rows: reportRows,
    columns: [
      { header: "EMPLEADO", accessor: (row: typeof reportRows[number]) => row.employee, width: 28 },
      { header: "PUESTO", accessor: (row: typeof reportRows[number]) => row.position, width: 20 },
      { header: "SUCURSAL", accessor: (row: typeof reportRows[number]) => row.branch, width: 18 },
      { header: "BANCO", accessor: (row: typeof reportRows[number]) => row.bank, width: 15 },
      { header: "CUENTA / CLABE", accessor: (row: typeof reportRows[number]) => row.account, width: 22 },
      { header: "ESQUEMA", accessor: (row: typeof reportRows[number]) => row.scheme, width: 20 },
      { header: "VENTAS", accessor: (row: typeof reportRows[number]) => row.sales, format: "currency" as const, width: 15 },
      { header: "SUELDO", accessor: (row: typeof reportRows[number]) => row.salary, format: "currency" as const, width: 15 },
      { header: "COMISIÓN", accessor: (row: typeof reportRows[number]) => row.commission, format: "currency" as const, width: 15 },
      { header: "BONOS", accessor: (row: typeof reportRows[number]) => row.bonuses, format: "currency" as const, width: 14 },
      { header: "DEDUCCIONES", accessor: (row: typeof reportRows[number]) => row.deductions, format: "currency" as const, width: 16 },
      { header: "AJUSTES", accessor: (row: typeof reportRows[number]) => row.adjustments, format: "currency" as const, width: 14 },
      { header: "NÓMINA", accessor: (row: typeof reportRows[number]) => row.payroll, format: "currency" as const, width: 16 },
      { header: "COSTO SOCIAL", accessor: (row: typeof reportRows[number]) => row.socialCost, format: "currency" as const, width: 17 },
      { header: "ISR", accessor: (row: typeof reportRows[number]) => row.isr, format: "currency" as const, width: 14 },
      { header: "COSTO TOTAL", accessor: (row: typeof reportRows[number]) => row.total, format: "currency" as const, width: 18 },
    ],
  };
  return (
    <Card className="overflow-hidden border-[color:var(--border-color)]">
      <CardHeader className="border-b border-[color:var(--border-color)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="section-heading uppercase">Contenido de la nómina</CardTitle>
            <CardDescription>{lines.length} empleados incluidos en el cálculo actual.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">SOLO DATOS · MOCK</Badge><ReportExportButtons config={reportConfig} disabled={!lines.length} iconOnly /></div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>EMPLEADO</TableHead>
                <TableHead>BANCO / CUENTA</TableHead>
                <TableHead>PUESTO / ESQUEMA</TableHead>
                {(view === "CONSOLIDATED" || view === "COMMISSION" || contractor) && <TableHead className="text-right">VENTAS</TableHead>}
                {contractor ? <>
                  <TableHead className="text-right">COMISIÓN</TableHead>
                  <TableHead className="text-right">SUBTOTAL FACTURA</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">RET. ISR</TableHead>
                  <TableHead className="text-right">RET. IVA</TableHead>
                </> : <>
                  {(view === "CONSOLIDATED" || view === "FIXED" || view === "SPECIALIST") && <TableHead className="text-right">SUELDO</TableHead>}
                  {(view === "CONSOLIDATED" || view === "COMMISSION") && <TableHead className="text-right">COMISIÓN + BONOS</TableHead>}
                  {view === "CONSOLIDATED" && <TableHead className="text-right">DEDUCCIONES</TableHead>}
                </>}
                <TableHead className="text-right">AJUSTES</TableHead>
                <TableHead className="text-right">NÓMINA</TableHead>
                <TableHead className="text-right">COSTO SOCIAL</TableHead>
                <TableHead className="text-right">ISR</TableHead>
                <TableHead className="text-right">COSTO TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.employee.id}>
                  <TableCell>
                    <p className="font-semibold text-[color:var(--text-primary)]">{line.employee.name}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">{state.branches.find((branch) => branch.id === line.employee.branchId)?.name ?? "SIN SUCURSAL"} · ID {line.employee.id.toLocaleUpperCase("es-MX")}</p>
                  </TableCell>
                  <TableCell className="min-w-44"><p className="text-xs font-semibold">{line.employee.bank}</p><p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">Cuenta / CLABE</p><p className="number-display text-xs">{line.employee.account}</p></TableCell>
                  <TableCell>
                    <p className="text-sm">{line.employee.position}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">{line.schemeName}{line.rate > 0 ? ` · ${(line.rate * 100).toFixed(0)}%` : ""}{line.employee.category === "SELLER" || line.employee.category === "CONTRACTOR" ? ` · ${line.calculationMode === "WITH_VAT" ? "CON IVA" : "SIN IVA"}` : ""}</p>
                  </TableCell>
                  {(view === "CONSOLIDATED" || view === "COMMISSION" || contractor) && <TableCell className="number-display text-right">{money.format(line.sales)}</TableCell>}
                  {contractor ? <>
                    <TableCell className="number-display text-right">{money.format(line.commission)}</TableCell>
                    <TableCell className="number-display text-right">{money.format(line.invoiceSubtotal)}</TableCell>
                    <TableCell className="number-display text-right text-emerald-700 dark:text-emerald-300">{money.format(line.ivaAmount)}</TableCell>
                    <TableCell className="number-display text-right text-rose-700 dark:text-rose-300">{money.format(line.isrRetention)}</TableCell>
                    <TableCell className="number-display text-right text-rose-700 dark:text-rose-300">{money.format(line.ivaRetention)}</TableCell>
                  </> : <>
                    {(view === "CONSOLIDATED" || view === "FIXED" || view === "SPECIALIST") && <TableCell className="number-display text-right">{money.format(line.fixedSalary)}</TableCell>}
                    {(view === "CONSOLIDATED" || view === "COMMISSION") && <TableCell className="number-display text-right text-emerald-700 dark:text-emerald-300">{money.format(line.commission + line.bonuses)}</TableCell>}
                  </>}
                  {view === "CONSOLIDATED" && <TableCell className="number-display text-right text-rose-700 dark:text-rose-300">{money.format(line.fines + line.loanDeduction)}</TableCell>}
                  <TableCell className={`number-display text-right ${line.externalAdditions - line.externalDeductions < 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>{money.format(line.externalAdditions - line.externalDeductions)}</TableCell>
                  <TableCell className="number-display text-right text-base">{money.format(line.total)}</TableCell>
                  <TableCell className={`number-display text-right ${includeSocialCost ? "" : "text-[color:var(--text-muted)]"}`}>{includeSocialCost ? money.format(line.socialCost) : "EXCLUIDO"}</TableCell>
                  <TableCell className={`number-display text-right ${includeIsr ? "" : "text-[color:var(--text-muted)]"}`}>{includeIsr ? money.format(line.isrCost) : "EXCLUIDO"}</TableCell>
                  <TableCell className="number-display text-right text-base font-semibold">{money.format(line.total + (includeSocialCost ? line.socialCost : 0) + (includeIsr ? line.isrCost : 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={contractor ? 10 : view === "CONSOLIDATED" ? 8 : view === "COMMISSION" ? 6 : 5} className="text-right font-semibold">TOTALES</TableCell>
                <TableCell className="number-display text-right">{money.format(payrollTotal)}</TableCell>
                <TableCell className="number-display text-right">{money.format(socialTotal)}</TableCell>
                <TableCell className="number-display text-right">{money.format(isrTotal)}</TableCell>
                <TableCell className="number-display text-right text-base">{money.format(total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ConsolidatedDashboard({ config, lines, includeSocialCost, includeIsr }: { config: DemoPayrollPeriodConfig; lines: EmployeePayrollLine[]; includeSocialCost: boolean; includeIsr: boolean }) {
  const { state, setRunStatus } = usePayrollDemo();
  const run = state.runs.find((item) => item.module === "CONSOLIDATED" && item.periodStart === config.periodStart && item.periodEnd === config.periodEnd);
  const totalSales = lines.reduce((sum, line) => sum + line.sales, 0);
  const payrollBase = lines.reduce((sum, line) => sum + line.total, 0);
  const socialCost = includeSocialCost ? lines.reduce((sum, line) => sum + line.socialCost, 0) : 0;
  const isrCost = includeIsr ? lines.reduce((sum, line) => sum + line.isrCost, 0) : 0;
  const totalPayroll = payrollBase + socialCost + isrCost;
  const totalVariable = lines.reduce((sum, line) => sum + line.commission + line.bonuses, 0);
  const authorized = state.decisions.filter((decision) => decision.periodStart === config.periodStart && decision.status === "AUTHORIZED").length;
  const branchCosts = state.branches.map((branch) => {
    const branchLines = lines.filter((line) => line.employee.branchId === branch.id);
    const payroll = branchLines.reduce((sum, line) => sum + line.total, 0);
    const social = includeSocialCost ? branchLines.reduce((sum, line) => sum + line.socialCost, 0) : 0;
    const isr = includeIsr ? branchLines.reduce((sum, line) => sum + line.isrCost, 0) : 0;
    const movements = branchLines.reduce((sum, line) => sum + line.externalAdditions - line.externalDeductions - line.fines - line.loanDeduction, 0);
    return { ...branch, payroll, social, isr, movements, total: payroll + social + isr, employees: branchLines.length };
  }).filter((branch) => branch.employees > 0);
  const positionCostMap = new Map<string, { branchId: string; branch: string; position: string; payrollType: string; employees: Set<string>; payroll: number; social: number; isr: number; total: number }>();
  lines.forEach((line) => {
    const branch = state.branches.find((item) => item.id === line.employee.branchId);
    const branchName = branch?.name ?? "SIN SUCURSAL";
    const payrollType = payrollTypeForCategory(line.employee.category);
    const key = `${line.employee.branchId}|${line.employee.position}|${payrollType}`;
    const row = positionCostMap.get(key) ?? { branchId: line.employee.branchId, branch: branchName, position: line.employee.position, payrollType, employees: new Set<string>(), payroll: 0, social: 0, isr: 0, total: 0 };
    const social = includeSocialCost ? line.socialCost : 0;
    const isr = includeIsr ? line.isrCost : 0;
    row.employees.add(line.employee.id);
    row.payroll += line.total;
    row.social += social;
    row.isr += isr;
    row.total += line.total + social + isr;
    positionCostMap.set(key, row);
  });
  const positionCosts = Array.from(positionCostMap.values()).sort((a, b) => a.branch.localeCompare(b.branch, "es-MX") || a.payrollType.localeCompare(b.payrollType, "es-MX") || a.position.localeCompare(b.position, "es-MX"));
  const branchPositionCosts = state.branches.map((branch) => ({
    branch,
    rows: positionCosts.filter((row) => row.branchId === branch.id),
  })).filter((item) => item.rows.length > 0);
  const reconciledTotal = positionCosts.reduce((sum, row) => sum + row.total, 0);
  const comparisonDelta = Math.abs(totalPayroll - reconciledTotal);
  const periodAdjustments = state.adjustments.filter((adjustment) => adjustment.status === "APPROVED" && adjustment.payrollDate >= config.periodStart && adjustment.payrollDate <= config.periodEnd);
  const periodMovements = state.movements.filter((movement) => movement.status === "APPROVED" && movement.periodStart >= config.periodStart && movement.periodStart <= config.periodEnd);
  const periodViatics = state.viaticsEntries.filter((entry) => entry.status === "APPROVED" && entry.periodStart !== null && entry.periodStart >= config.periodStart && entry.periodStart <= config.periodEnd);
  const reconciliationIssues = [
    ...lines.filter((line) => !state.branches.some((branch) => branch.id === line.employee.branchId)).map((line) => ({ id: `employee-${line.employee.id}`, source: "NÓMINA", concept: line.employee.name, detail: `Empleado sin punto de venta válido · ${line.employee.position}` })),
    ...periodAdjustments.filter((adjustment) => !state.branches.some((branch) => branch.id === adjustment.branchId)).map((adjustment) => ({ id: `adjustment-${adjustment.id}`, source: "MOVIMIENTOS DE NÓMINA", concept: adjustment.concept, detail: `${adjustment.payrollDate} · ${payrollModuleLabels[adjustment.payrollModule]} · sin sucursal válida` })),
    ...periodMovements.filter((movement) => { const employee = state.employees.find((item) => item.id === movement.employeeId); return !employee || !state.branches.some((branch) => branch.id === employee.branchId); }).map((movement) => ({ id: `movement-${movement.id}`, source: "BONOS Y MULTAS", concept: movement.concept, detail: `${movement.createdAt} · empleado o sucursal sin asignar` })),
    ...periodViatics.filter((entry) => !state.branches.some((branch) => branch.id === entry.branchId)).map((entry) => ({ id: `viatic-${entry.id}`, source: "VIÁTICOS", concept: state.viaticsConcepts.find((concept) => concept.id === entry.conceptId)?.name ?? entry.id, detail: `${entry.requestedAt} · comprobante ${entry.receiptName} · sin sucursal válida` })),
  ];
  const reconciliationSuccessful = comparisonDelta < 0.01 && reconciliationIssues.length === 0;
  const reconciliationReportRows = positionCosts.map((row) => ({ branch: row.branch, position: row.position, payrollType: row.payrollType, employees: row.employees.size, payroll: row.payroll, social: row.social, isr: row.isr, total: row.total }));
  const reconciliationReportConfig = {
    title: "Conciliación de nómina por punto de venta y puesto",
    subtitle: `${config.periodStart} — ${config.periodEnd} · ${reconciliationSuccessful ? "Comparación exitosa" : "Requiere revisión"}`,
    filename: `conciliacion-nomina-${config.periodStart}`,
    sheetName: "Conciliación",
    rows: reconciliationReportRows,
    columns: [
      { header: "PUNTO DE VENTA", accessor: (row: typeof reconciliationReportRows[number]) => row.branch, width: 20 },
      { header: "PUESTO", accessor: (row: typeof reconciliationReportRows[number]) => row.position, width: 24 },
      { header: "NÓMINA", accessor: (row: typeof reconciliationReportRows[number]) => row.payrollType, width: 18 },
      { header: "EMPLEADOS", accessor: (row: typeof reconciliationReportRows[number]) => row.employees, width: 12 },
      { header: "NÓMINA BASE", accessor: (row: typeof reconciliationReportRows[number]) => row.payroll, format: "currency" as const, width: 16 },
      { header: "COSTO SOCIAL", accessor: (row: typeof reconciliationReportRows[number]) => row.social, format: "currency" as const, width: 16 },
      { header: "ISR", accessor: (row: typeof reconciliationReportRows[number]) => row.isr, format: "currency" as const, width: 14 },
      { header: "COSTO TOTAL", accessor: (row: typeof reconciliationReportRows[number]) => row.total, format: "currency" as const, width: 17 },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={TrendingUp} label="VENTAS DEL PERIODO" value={money.format(totalSales)} detail={`Acumulado ${state.calculationMode === "WITH_VAT" ? "con IVA" : "sin IVA"}`} />
        <Metric icon={WalletCards} label="NÓMINA BASE" value={money.format(payrollBase)} detail={`Variable y bonos ${money.format(totalVariable)}`} />
        <Metric icon={Sparkles} label="CARGAS SOCIALES" value={money.format(socialCost + isrCost)} detail={`Social ${money.format(socialCost)} · ISR ${money.format(isrCost)}`} />
        <Metric icon={BadgeCheck} label="COSTO GENERAL" value={money.format(totalPayroll)} detail={`${authorized} de ${lines.length} empleados validados`} />
      </div>

      {run && (
        <Card className="border-[color:var(--border-color)] bg-gradient-to-r from-[color:var(--bg-card)] to-[color:var(--accent-hover)]/35">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-[color:var(--accent)] p-2.5 text-white"><FileCheck2 className="h-5 w-5" /></span>
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">Corrida {run.periodStart} / {run.periodEnd}</p><StatusBadge status={run.status} /></div>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">Pago programado {dateLabel.format(new Date(`${run.payDate}T00:00:00Z`))} · {state.calculationMode === "WITH_VAT" ? "CON IVA" : "SIN IVA"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {run.status === "DRAFT" && <Button variant="outline" onClick={() => { setRunStatus(run.id, "APPROVED"); toast.success("Nómina autorizada en todos los módulos."); }}><CheckCircle2 className="mr-2 h-4 w-4" />Autorizar</Button>}
              {run.status === "APPROVED" && <Button onClick={() => { setRunStatus(run.id, "PAID"); toast.success("Pago mock registrado y recibos actualizados."); }}><CircleDollarSign className="mr-2 h-4 w-4" />Marcar pagada</Button>}
              <Button asChild variant="outline"><Link href="/reportes/desglose-sucursal">Ver costo por sucursal<ChevronRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <PayrollTable lines={lines} view="CONSOLIDATED" periodStart={config.periodStart} periodEnd={config.periodEnd} includeSocialCost={includeSocialCost} includeIsr={includeIsr} />

      <Card className="border-[color:var(--border-color)]">
        <CardHeader><CardTitle className="section-heading uppercase">Distribución profesional por sucursal</CardTitle><CardDescription>Nómina, movimientos y cargas fiscales del periodo mensual seleccionado.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {branchCosts.map((branch) => <div key={branch.id} className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/25 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[color:var(--text-primary)]">{branch.name}</p><p className="text-xs text-[color:var(--text-muted)]">{branch.employees} empleados · movimientos {money.format(branch.movements)}</p></div><p className="number-display text-base">{money.format(branch.total)}</p></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[color:var(--border-color)] pt-3 text-xs"><div><p className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">Nómina</p><p className="number-display mt-1">{money.format(branch.payroll)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">Social</p><p className="number-display mt-1">{money.format(branch.social)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">ISR</p><p className="number-display mt-1">{money.format(branch.isr)}</p></div></div></div>)}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {(["SELLER", "SPECIALIST", "MANAGEMENT", "CALL_CENTER", "CONTRACTOR"] as EmployeeCategory[]).map((category) => {
          const categoryLines = lines.filter((line) => line.employee.category === category);
          const total = categoryLines.reduce((sum, line) => sum + line.total + (includeSocialCost ? line.socialCost : 0) + (includeIsr ? line.isrCost : 0), 0);
          return (
            <Card key={category} className="border-[color:var(--border-color)]">
              <CardContent className="p-5">
                <p className="label-caps">{categoryLabel(category)}</p>
                <p className="number-display mt-3 text-xl">{money.format(total)}</p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">{categoryLines.length} empleados</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <PayrollModuleAnalytics lines={lines} periodStart={config.periodStart} periodEnd={config.periodEnd} title="Consolidado de nómina" />

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div><CardTitle className="section-heading uppercase">Conciliación final por puesto y punto de venta</CardTitle><CardDescription>Solo considera la nómina y los movimientos del periodo {config.periodStart} — {config.periodEnd}.</CardDescription></div>
            <ReportExportButtons config={reconciliationReportConfig} disabled={!positionCosts.length} iconOnly />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {reconciliationSuccessful ? <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 text-emerald-950 dark:bg-emerald-950/25 dark:text-emerald-100"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="font-semibold">Comparación de nómina exitosa</p><p className="mt-1 text-xs opacity-75">El costo general {money.format(totalPayroll)} coincide con la suma por puesto, tipo de nómina y punto de venta. No existen movimientos sin sucursal.</p></div></div> : <div className="rounded-xl border border-amber-400 bg-amber-50/85 p-4 text-amber-950 dark:bg-amber-950/25 dark:text-amber-100"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-semibold">La comparación de nómina requiere revisión</p><p className="mt-1 text-xs opacity-80">Diferencia contable: {money.format(comparisonDelta)} · {reconciliationIssues.length} movimientos o registros sin ubicación válida.</p></div></div>{reconciliationIssues.length > 0 && <div className="mt-3 divide-y divide-amber-300/60 border-t border-amber-300/60">{reconciliationIssues.map((issue) => <div key={issue.id} className="grid gap-1 py-2 text-xs sm:grid-cols-[180px_1fr_1.4fr]"><strong>{issue.source}</strong><span>{issue.concept}</span><span>{issue.detail}</span></div>)}</div>}</div>}

          <div className="space-y-4">{branchPositionCosts.map(({ branch, rows }) => { const branchPayroll = rows.reduce((sum, row) => sum + row.payroll, 0); const branchSocial = rows.reduce((sum, row) => sum + row.social, 0); const branchIsr = rows.reduce((sum, row) => sum + row.isr, 0); const branchTotal = rows.reduce((sum, row) => sum + row.total, 0); return <div key={branch.id} className="overflow-hidden rounded-xl border border-[color:var(--border-color)]"><div className="flex flex-col gap-2 bg-[linear-gradient(115deg,#29231f,#4a3628)] px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] uppercase tracking-[0.14em] text-white/65">Punto de venta</p><p className="font-semibold">{branch.name}</p></div><div className="flex flex-wrap gap-x-5 gap-y-1 text-xs"><span>Nómina <strong className="number-display">{money.format(branchPayroll)}</strong></span><span>Social <strong className="number-display">{money.format(branchSocial)}</strong></span><span>ISR <strong className="number-display">{money.format(branchIsr)}</strong></span><span>Total <strong className="number-display text-[#f1d2ad]">{money.format(branchTotal)}</strong></span></div></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>PUESTO</TableHead><TableHead>TIPO DE NÓMINA</TableHead><TableHead className="text-right">EMPLEADOS</TableHead><TableHead className="text-right">NÓMINA BASE</TableHead><TableHead className="text-right">COSTO SOCIAL</TableHead><TableHead className="text-right">ISR</TableHead><TableHead className="text-right">COSTO TOTAL</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={`${row.branchId}-${row.position}-${row.payrollType}`}><TableCell className="font-semibold">{row.position}</TableCell><TableCell><Badge variant="outline">{row.payrollType}</Badge></TableCell><TableCell className="number-display text-right">{row.employees.size}</TableCell><TableCell className="number-display text-right">{money.format(row.payroll)}</TableCell><TableCell className="number-display text-right">{money.format(row.social)}</TableCell><TableCell className="number-display text-right">{money.format(row.isr)}</TableCell><TableCell className="number-display text-right font-semibold">{money.format(row.total)}</TableCell></TableRow>)}</TableBody><TableFooter><TableRow><TableCell colSpan={3} className="text-right font-semibold">TOTAL {branch.name}</TableCell><TableCell className="number-display text-right">{money.format(branchPayroll)}</TableCell><TableCell className="number-display text-right">{money.format(branchSocial)}</TableCell><TableCell className="number-display text-right">{money.format(branchIsr)}</TableCell><TableCell className="number-display text-right text-base">{money.format(branchTotal)}</TableCell></TableRow></TableFooter></Table></div></div>; })}</div>

          <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--accent)]/40 bg-[color:var(--accent-hover)]/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Suma de todas las nóminas cargadas</p><p className="text-xs text-[color:var(--text-muted)]">{positionCosts.length} combinaciones de puesto y nómina · {branchPositionCosts.length} puntos de venta</p></div><p className="number-display text-2xl font-semibold">{money.format(reconciledTotal)}</p></div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PayrollDemoPage({ view }: { view: PayrollView }) {
  const { state, payrollLines, periodOptions, setCalculationMode } = usePayrollDemo();
  const config = state.periodConfigs.find((item) => item.module === view) ?? state.periodConfigs[0]!;
  const [periodDisplay, setPeriodDisplay] = useState<PeriodDisplay>(view === "CONSOLIDATED" ? "MONTHLY" : "FORTNIGHT");
  const [includeSocialCost, setIncludeSocialCost] = useState(true);
  const [includeIsr, setIncludeIsr] = useState(true);
  const [selectedFortnight, setSelectedFortnight] = useState(config.periodStart);
  const [selectedMonth, setSelectedMonth] = useState(config.periodStart.slice(0, 7));
  const [runDialog, setRunDialog] = useState(false);
  const monthOptions = useMemo(() => Array.from(new Set(periodOptions.map((item) => item.start.slice(0, 7)))), [periodOptions]);
  const selectedPeriod = useMemo(() => {
    if (periodDisplay === "MONTHLY") return monthlyPeriod(selectedMonth);
    const period = periodOptions.find((item) => item.start === selectedFortnight);
    return period ? { start: period.start, end: period.end, label: fortnightLabel(period.start) } : { start: config.periodStart, end: config.periodEnd, label: fortnightLabel(config.periodStart) };
  }, [config.periodEnd, config.periodStart, periodDisplay, periodOptions, selectedFortnight, selectedMonth]);
  const calculationConfig = useMemo<DemoPayrollPeriodConfig>(() => ({
    ...config,
    periodStart: selectedPeriod.start,
    periodEnd: selectedPeriod.end,
    cutoffDate: selectedPeriod.end,
    label: selectedPeriod.label,
  }), [config, selectedPeriod]);
  const mode = state.calculationMode;
  const allLines = payrollLines(selectedPeriod.start, mode, selectedPeriod.end, view);
  const lines = useMemo(() => {
    if (view === "FIXED") return allLines.filter((line) => line.employee.category === "MANAGEMENT" || line.employee.category === "CALL_CENTER");
    if (view === "SPECIALIST") return allLines.filter((line) => line.employee.category === "SPECIALIST");
    if (view === "COMMISSION") return allLines.filter((line) => line.employee.category === "SELLER");
    if (view === "CONTRACTOR") return allLines.filter((line) => line.employee.category === "CONTRACTOR");
    return allLines;
  }, [allLines, view]);

  const titles = {
    CONSOLIDATED: ["Consolidado de nómina", "Visualiza, autoriza y prepara el pago de todos los esquemas en un solo lugar."],
    FIXED: ["Nómina de salario fijo", "Gerencia y call center con salario fijo quincenal configurable."],
    SPECIALIST: ["Nómina de especialistas", "Especialistas y facialistas con salario fijo por periodo."],
    COMMISSION: ["Nómina de vendedores", "Comisiones por escalas, ventas, bonos y deducciones del periodo."],
    CONTRACTOR: ["Nómina por honorarios", "Servicios facturados con IVA, retenciones y pago neto desglosado."],
  }[view];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-[color:var(--accent)] text-[color:var(--text-secondary)]">DEMO FRONTEND</Badge><span className="text-xs text-[color:var(--text-muted)]">Sin conexión a backend</span></div>
          <h1 className="page-title">{titles[0]}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">{titles[1]}</p>
        </div>
        {view !== "CONSOLIDATED" && <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/configuracion"><Settings2 className="mr-2 h-4 w-4" />Configuración</Link></Button>
          <Button onClick={() => setRunDialog(true)}><Plus className="mr-2 h-4 w-4" />Nueva nómina</Button>
        </div>}
      </header>

      {view !== "CONSOLIDATED" && (
        <Card className="relative overflow-hidden border-[color:var(--accent)]/45 bg-[linear-gradient(115deg,var(--bg-card)_0%,var(--accent-hover)_100%)] shadow-sm">
          <span aria-hidden="true" className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[color:var(--accent)]/10 blur-2xl" />
          <CardContent className="relative flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--accent)]/35 bg-[color:var(--accent)]/15 text-[color:var(--text-secondary)] shadow-sm">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Periodo seleccionado para cálculo</p>
                  <Badge variant="outline">{periodDisplay === "MONTHLY" ? "MENSUAL" : "QUINCENAL"}</Badge>
                </div>
                <p className="mt-1 font-brand text-2xl tracking-wide text-[color:var(--text-primary)]">{selectedPeriod.label}</p>
                <p className="mt-1 text-sm font-medium text-[color:var(--text-secondary)]">Del {dateLabel.format(new Date(`${selectedPeriod.start}T00:00:00Z`))} al {dateLabel.format(new Date(`${selectedPeriod.end}T00:00:00Z`))}</p>
              </div>
            </div>
            <div className="max-w-xl rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)]/80 px-4 py-3 backdrop-blur">
              <p className="text-sm font-semibold">Alcance del periodo</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">Empleados, ventas, movimientos, costos y reportes se calculan exclusivamente dentro de estas fechas. Cambia la quincena o el mes en el selector inferior.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-[color:var(--border-color)]">
          <CardContent className="flex flex-col gap-4 p-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="space-y-2"><Label>Visualización y cálculo</Label><div className="inline-flex w-full rounded-lg border border-[color:var(--border-color)] p-1 sm:w-auto" role="group" aria-label="Vista del periodo"><Button type="button" size="sm" variant={periodDisplay === "FORTNIGHT" ? "default" : "ghost"} aria-pressed={periodDisplay === "FORTNIGHT"} onClick={() => setPeriodDisplay("FORTNIGHT")}><ListChecks className="mr-2 h-4 w-4" />Quincenal</Button><Button type="button" size="sm" variant={periodDisplay === "MONTHLY" ? "default" : "ghost"} aria-pressed={periodDisplay === "MONTHLY"} onClick={() => setPeriodDisplay("MONTHLY")}><CalendarDays className="mr-2 h-4 w-4" />Mensual</Button></div></div>
              <div className="min-w-0 space-y-2 lg:w-[310px]"><Label htmlFor={`period-selector-${view}`}>Periodo a calcular</Label>{periodDisplay === "FORTNIGHT" ? <Select value={selectedFortnight} onValueChange={setSelectedFortnight}><SelectTrigger id={`period-selector-${view}`}><SelectValue /></SelectTrigger><SelectContent>{periodOptions.map((item) => <SelectItem key={item.start} value={item.start}>{fortnightLabel(item.start)}</SelectItem>)}</SelectContent></Select> : <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger id={`period-selector-${view}`}><SelectValue /></SelectTrigger><SelectContent>{monthOptions.map((month) => <SelectItem key={month} value={month}>{monthlyPeriod(month).label}</SelectItem>)}</SelectContent></Select>}</div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-2"><Label>Cargas incluidas en el cálculo</Label><div className="flex flex-wrap gap-2"><CostToggle label="Costo social" checked={includeSocialCost} onCheckedChange={setIncludeSocialCost} /><CostToggle label="ISR" checked={includeIsr} onCheckedChange={setIncludeIsr} /></div></div>
              {view === "COMMISSION" ? <div className="space-y-2"><Label>Base de comisión global</Label><div className="inline-flex w-full rounded-lg border border-[color:var(--border-color)] p-1 sm:w-auto" role="group" aria-label="Base de comisión"><Button type="button" size="sm" variant={mode === "WITH_VAT" ? "default" : "ghost"} aria-pressed={mode === "WITH_VAT"} onClick={() => { setCalculationMode("WITH_VAT"); toast.success("Cálculo con IVA aplicado a todos los módulos relacionados."); }}>Con IVA</Button><Button type="button" size="sm" variant={mode === "WITHOUT_VAT" ? "default" : "ghost"} aria-pressed={mode === "WITHOUT_VAT"} onClick={() => { setCalculationMode("WITHOUT_VAT"); toast.success("Cálculo sin IVA aplicado a todos los módulos relacionados."); }}>Sin IVA</Button></div></div> : (view === "CONTRACTOR" ? <div className="rounded-xl border border-[color:var(--border-color)] px-4 py-2.5 text-sm"><p className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">Base sincronizada</p><p className="font-semibold">{mode === "WITH_VAT" ? "CON IVA" : "SIN IVA"} · desde Comisiones</p></div> : null)}
            </div>
          </CardContent>
        </Card>

      {view === "CONSOLIDATED" ? <ConsolidatedDashboard config={calculationConfig} lines={lines} includeSocialCost={includeSocialCost} includeIsr={includeIsr} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric icon={UsersRound} label="EMPLEADOS" value={String(lines.length)} detail="Incluidos en esta nómina" />
            <Metric icon={Building2} label="SUCURSALES" value={String(new Set(lines.map((line) => line.employee.branchId)).size)} detail="Centros de costo involucrados" />
            <Metric icon={Clock3} label="COSTO TOTAL" value={money.format(lines.reduce((sum, line) => sum + line.total + (includeSocialCost ? line.socialCost : 0) + (includeIsr ? line.isrCost : 0), 0))} detail={`Nómina${includeSocialCost ? " + costo social" : ""}${includeIsr ? " + ISR" : ""}`} />
          </div>
          <PayrollTable lines={lines} view={view} periodStart={selectedPeriod.start} periodEnd={selectedPeriod.end} includeSocialCost={includeSocialCost} includeIsr={includeIsr} />
          <PayrollModuleAnalytics lines={lines} periodStart={selectedPeriod.start} periodEnd={selectedPeriod.end} title={titles[0] ?? "Nómina"} />
        </>
      )}
      <RunDialog key={`${view}-${selectedPeriod.start}-${selectedPeriod.end}`} open={runDialog} onOpenChange={setRunDialog} module={view} config={calculationConfig} mode={mode} onModeChange={setCalculationMode} />
    </div>
  );
}
