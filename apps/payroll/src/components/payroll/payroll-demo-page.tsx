"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CircleMinus,
  Clock3,
  FileCheck2,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
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
  type PayrollCostAllocationMode,
  type DemoPayrollPeriodConfig,
  type PayrollStatus,
  employeeCommissionPayrollModule,
  employeeSalaryPayrollModule,
  moduleTaxInclusionForRange,
  periodTaxInclusionForRange,
  payrollModuleLabel,
  payrollModuleLabels,
  roleHasPermission,
  sortByListMode,
  usePayrollDemo,
} from "./payroll-demo-context";
import { PayrollModuleAnalytics } from "./payroll-module-analytics";
import {
  PayrollConsolidatedSalesAnalytics,
  type ConsolidatedBranchSalesPoint,
  type ConsolidatedSalesTrendPoint,
} from "./payroll-consolidated-sales-analytics";
import {
  employeeCostAllocationShares,
  employeeCostBranchIds,
  payrollCostAllocationMode,
} from "./payroll-cost-branch-selector";
import { ReportExportButtons } from "./report-export-buttons";
import {
  nextTableSort,
  sortTableRows,
  SortableTableHead,
  type TableSortKind,
  type TableSortState,
} from "./sortable-table-head";

type PayrollView = PayrollModule;
type PeriodDisplay = "FORTNIGHT" | "MONTHLY";
type PayrollColumnSortKey =
  | "employee"
  | "bank"
  | "position"
  | "grossSales"
  | "salesWithoutVat"
  | "commission"
  | "invoiceSubtotal"
  | "ivaAmount"
  | "isrRetention"
  | "ivaRetention"
  | "fixedSalary"
  | "doublePay"
  | "commissionBonuses"
  | "deductions"
  | "adjustments"
  | "carriedBalance"
  | "christmasBonus"
  | "settlement"
  | "payrollBeforeDeductions"
  | "totalDeductions"
  | "payroll"
  | "socialCost"
  | "isr"
  | "approval"
  | "totalCost";

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

const shortMonthLabel = new Intl.DateTimeFormat("es-MX", {
  month: "short",
  year: "2-digit",
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

function StatusBadge({ status }: { status: PayrollStatus }) {
  const config = {
    DRAFT: {
      label: "BORRADOR",
      className:
        "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
    },
    APPROVED: {
      label: "AUTORIZADA",
      className:
        "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
    },
    PAID: {
      label: "PAGADA",
      className:
        "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200",
    },
  }[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="overflow-hidden border-[color:var(--border-color)] bg-[color:var(--bg-card)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps">{label}</p>
            <p className="number-display mt-2 text-2xl text-[color:var(--text-primary)]">
              {value}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              {detail}
            </p>
          </div>
          <span className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)] p-2.5 text-[color:var(--text-secondary)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CostToggle({
  label,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100" : "border-[color:var(--border-color)] bg-[color:var(--input-disabled-bg)] text-[color:var(--text-muted)]"}`}
    >
      <span
        aria-hidden="true"
        className={`relative h-4 w-8 rounded-full ${checked ? "bg-emerald-600" : "bg-stone-300 dark:bg-stone-700"}`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[17px]" : "translate-x-0.5"}`}
        />
      </span>
      {label}
    </button>
  );
}

function MasterReopenDialog({ runId }: { runId: string }) {
  const { state, setRunStatus } = usePayrollDemo();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const authorizedCodes = state.employees.flatMap((employee) => {
    const role = state.roles.find((item) => item.id === employee.roleId);
    return employee.active &&
      employee.secondaryAccessKey &&
      role?.permissions.includes("security.second_key.manage")
      ? [employee.secondaryAccessKey]
      : [];
  });

  function close() {
    setOpen(false);
    setCode("");
  }

  function reopen() {
    if (!authorizedCodes.includes(code)) {
      toast.error(
        "Código maestro incorrecto o sin permiso para reabrir nóminas.",
      );
      setCode("");
      return;
    }
    setRunStatus(runId, "DRAFT");
    close();
    toast.success(
      "Nómina reabierta. La corrida volvió a borrador y salió de Dispersión.",
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <KeyRound className="mr-2 h-4 w-4" />
        Modificar con código máster
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reabrir nómina protegida</DialogTitle>
            <DialogDescription>
              El cierre bloquea importes, cargas y movimientos. Ingresa la
              segunda clave de un usuario autorizado para devolver la corrida a
              borrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/35 p-4 text-center">
              <p className="label-caps">CÓDIGO MAESTRO</p>
              <div
                className="mt-3 flex justify-center gap-3"
                aria-label={`${code.length} de 4 dígitos capturados`}
              >
                {Array.from({ length: 4 }, (_, index) => (
                  <span
                    key={index}
                    className={`h-3 w-3 rounded-full border ${index < code.length ? "border-[#9a704d] bg-[#9a704d]" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"}`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <Button
                  key={digit}
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() =>
                    setCode((current) =>
                      current.length < 4 ? `${current}${digit}` : current,
                    )
                  }
                >
                  {digit}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                className="h-10 text-xs"
                onClick={() => setCode("")}
              >
                Limpiar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() =>
                  setCode((current) =>
                    current.length < 4 ? `${current}0` : current,
                  )
                }
              >
                0
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 text-xs"
                onClick={() => setCode((current) => current.slice(0, -1))}
              >
                Borrar
              </Button>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50/70 p-3 text-xs text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                La reapertura queda simulada en memoria. En producción deberá
                registrar usuario, fecha, motivo y versión anterior.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={reopen} disabled={code.length !== 4}>
              Autorizar reapertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RunDialog({
  open,
  onOpenChange,
  module,
  config,
  mode,
  onModeChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: PayrollModule;
  config: DemoPayrollPeriodConfig;
  mode: "WITH_VAT" | "WITHOUT_VAT";
  onModeChange: (mode: "WITH_VAT" | "WITHOUT_VAT") => void;
}) {
  const { state, createRun, setPayrollCostAllocationModes } = usePayrollDemo();
  const defaultPayDate = new Date(`${config.periodEnd}T12:00:00`);
  defaultPayDate.setDate(defaultPayDate.getDate() + 3);
  const [payDate, setPayDate] = useState(
    defaultPayDate.toISOString().slice(0, 10),
  );
  const allocationCandidates = useMemo(() => {
    if (module !== "COMMISSION") return [];
    return state.employees
      .filter(
        (employee) =>
          employee.hireDate <= config.periodEnd &&
          (!employee.terminationDate ||
            employee.terminationDate >= config.periodStart),
      )
      .map((employee) => {
        const salesByBranch = state.sales
          .filter(
            (sale) =>
              sale.employeeId === employee.id &&
              sale.date >= config.periodStart &&
              sale.date <= config.periodEnd,
          )
          .reduce<
            Record<string, number>
          >((totals, sale) => ({ ...totals, [sale.branchId]: (totals[sale.branchId] ?? 0) + sale.amount }), {});
        const branches = Object.entries(salesByBranch)
          .filter(
            ([branchId, amount]) =>
              amount > 0 &&
              state.branches.some((branch) => branch.id === branchId),
          )
          .map(([branchId, amount]) => ({
            branch: state.branches.find((branch) => branch.id === branchId)!,
            amount,
          }))
          .sort((left, right) => right.amount - left.amount);
        const total = branches.reduce((sum, item) => sum + item.amount, 0);
        return {
          employee,
          branches,
          total,
          topShare: total > 0 ? (branches[0]?.amount ?? 0) / total : 0,
        };
      })
      .filter((candidate) => candidate.branches.length > 1);
  }, [
    config.periodEnd,
    config.periodStart,
    module,
    state.branches,
    state.employees,
    state.sales,
  ]);
  const [allocationModes, setAllocationModes] = useState<
    Record<string, PayrollCostAllocationMode>
  >(() =>
    Object.fromEntries(
      allocationCandidates.map((candidate) => [
        candidate.employee.id,
        state.payrollCostAllocationModes[
          `${config.periodStart}:${candidate.employee.id}`
        ] ?? (candidate.topShare >= 0.55 ? "SALES_SHARE" : "EQUAL"),
      ]),
    ),
  );

  function submit() {
    if (module === "COMMISSION" && allocationCandidates.length > 0)
      setPayrollCostAllocationModes(config.periodStart, allocationModes);
    createRun(module, config.periodStart, config.periodEnd, mode, payDate);
    toast.success(
      module === "COMMISSION" && allocationCandidates.length > 0
        ? "Nómina preparada con la distribución elegida por sucursal."
        : "Nómina preparada con datos mock.",
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          module === "COMMISSION" && allocationCandidates.length > 0
            ? "max-h-[92vh] max-w-4xl overflow-y-auto"
            : "max-w-lg"
        }
      >
        <DialogHeader>
          <DialogTitle>Crear nueva nómina</DialogTitle>
          <DialogDescription>
            Usará exclusivamente el periodo y corte definidos para este módulo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Periodo a calcular</Label>
            <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/40 px-4 py-3">
              <p className="font-semibold">{config.label}</p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                {config.periodStart} — {config.periodEnd} · corte{" "}
                {config.cutoffDate}
              </p>
            </div>
            <p className="text-xs text-[color:var(--text-muted)]">
              Este periodo solo se modifica desde Configuración.
            </p>
          </div>
          {module === "COMMISSION" && allocationCandidates.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/20">
              <div className="flex items-start gap-3 border-b border-amber-300/60 px-4 py-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                    Revisión de vendedores con venta en varias sucursales
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-amber-900/75 dark:text-amber-100/70">
                    Antes de crear la nómina elige si cada costo se reparte por
                    partes iguales o según el porcentaje real de venta.
                  </p>
                </div>
              </div>
              <div className="divide-y divide-amber-300/45">
                {allocationCandidates.map((candidate) => {
                  const selectedMode =
                    allocationModes[candidate.employee.id] ?? "SALES_SHARE";
                  const leadingBranch = candidate.branches[0];
                  return (
                    <article
                      key={candidate.employee.id}
                      className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(190px,.8fr)_minmax(260px,1.35fr)_220px] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {candidate.employee.name}
                        </p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                          {candidate.employee.position} ·{" "}
                          {candidate.branches.length} sucursales
                        </p>
                        {leadingBranch && candidate.topShare >= 0.55 && (
                          <p className="mt-1.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                            Mayor venta en {leadingBranch.branch.name}:{" "}
                            {(candidate.topShare * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <div className="grid gap-1.5">
                        {candidate.branches.map(({ branch, amount }) => {
                          const share =
                            candidate.total > 0 ? amount / candidate.total : 0;
                          return (
                            <div
                              key={branch.id}
                              className="grid grid-cols-[88px_minmax(70px,1fr)_68px_42px] items-center gap-2 text-[10px]"
                            >
                              <span className="truncate font-semibold">
                                {branch.name}
                              </span>
                              <span className="h-1.5 overflow-hidden rounded-full bg-amber-100 dark:bg-white/10">
                                <span
                                  className="block h-full rounded-full bg-[color:var(--accent)]"
                                  style={{ width: `${share * 100}%` }}
                                />
                              </span>
                              <span className="number-display text-right">
                                {money.format(amount)}
                              </span>
                              <span className="text-right font-semibold text-[color:var(--text-muted)]">
                                {(share * 100).toFixed(0)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-1">
                        <div
                          className="grid grid-cols-2 gap-1"
                          role="group"
                          aria-label={`Distribución de ${candidate.employee.name}`}
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              selectedMode === "EQUAL" ? "default" : "ghost"
                            }
                            className="h-8 px-2 text-[9px]"
                            onClick={() =>
                              setAllocationModes((current) => ({
                                ...current,
                                [candidate.employee.id]: "EQUAL",
                              }))
                            }
                          >
                            <ListChecks className="mr-1.5 h-3.5 w-3.5" />
                            Parejo
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              selectedMode === "SALES_SHARE"
                                ? "default"
                                : "ghost"
                            }
                            className="h-8 px-2 text-[9px]"
                            onClick={() =>
                              setAllocationModes((current) => ({
                                ...current,
                                [candidate.employee.id]: "SALES_SHARE",
                              }))
                            }
                          >
                            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                            Por venta
                          </Button>
                        </div>
                        <p className="px-2 pb-1 pt-1.5 text-center text-[8px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-muted)]">
                          {selectedMode === "SALES_SHARE"
                            ? "RECOMENDADO · PARTICIPACIÓN REAL"
                            : `${(100 / candidate.branches.length).toFixed(0)}% PARA CADA SUCURSAL`}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          <div
            className={`grid gap-4 ${module === "COMMISSION" ? "sm:grid-cols-2" : ""}`}
          >
            {module === "COMMISSION" && (
              <div className="space-y-2">
                <Label htmlFor="run-mode">Base de comisión</Label>
                <Select
                  value={mode}
                  onValueChange={(value) =>
                    onModeChange(value as "WITH_VAT" | "WITHOUT_VAT")
                  }
                >
                  <SelectTrigger id="run-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WITH_VAT">CON IVA</SelectItem>
                    <SelectItem value="WITHOUT_VAT">SIN IVA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="pay-date">Fecha de pago</Label>
              <Input
                id="pay-date"
                type="date"
                value={payDate}
                min={config.periodEnd}
                onChange={(event) => setPayDate(event.target.value)}
              />
            </div>
          </div>
          <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/40 p-4 text-sm text-[color:var(--text-muted)]">
            <div className="flex gap-2">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-secondary)]" />
              <p>
                Modo demostración: se crea un borrador local y todos los módulos
                se actualizan en la sesión.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>
            <Plus className="mr-2 h-4 w-4" />
            Crear nómina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DoublePayDaysPanel({
  lines,
  view,
  periodStart,
  periodEnd,
  payrollLocked,
}: {
  lines: EmployeePayrollLine[];
  view: "FIXED" | "SPECIALIST";
  periodStart: string;
  periodEnd: string;
  payrollLocked: boolean;
}) {
  const { state, addDoublePayDay, deleteDoublePayDay } = usePayrollDemo();
  const eligibleLines = lines.filter(
    (line) => employeeSalaryPayrollModule(line.employee) === view,
  );
  const [employeeId, setEmployeeId] = useState("");
  const [paymentDate, setPaymentDate] = useState(periodStart);
  const [reason, setReason] = useState("DÍA FESTIVO / FERIADO");
  const selectedEmployee =
    eligibleLines.find((line) => line.employee.id === employeeId)?.employee ??
    eligibleLines[0]?.employee;
  const effectiveDate =
    paymentDate >= periodStart && paymentDate <= periodEnd
      ? paymentDate
      : periodStart;
  const periodEntries = state.doublePayDays
    .filter(
      (entry) =>
        entry.payrollModule === view &&
        entry.date >= periodStart &&
        entry.date <= periodEnd,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const activeRole = state.roles.find(
    (role) => role.id === activeEmployee?.roleId,
  );
  const canManage = roleHasPermission(activeRole, "payroll.create");
  const controlsDisabled = payrollLocked || !canManage;
  const dailySalary = (selectedEmployee?.monthlySalary ?? 0) / 30;

  function submit() {
    if (!selectedEmployee) {
      toast.error("Selecciona un empleado con sueldo en esta nómina.");
      return;
    }
    if (effectiveDate < periodStart || effectiveDate > periodEnd) {
      toast.error("La fecha debe pertenecer al periodo seleccionado.");
      return;
    }
    if (
      periodEntries.some(
        (entry) =>
          entry.employeeId === selectedEmployee.id &&
          entry.date === effectiveDate,
      )
    ) {
      toast.error("Ese empleado ya tiene pago doble en la fecha seleccionada.");
      return;
    }
    addDoublePayDay({
      employeeId: selectedEmployee.id,
      payrollModule: view,
      date: effectiveDate,
      reason,
    });
    toast.success(
      `Pago doble agregado: ${money.format(dailySalary)} adicionales para ${selectedEmployee.name}.`,
    );
  }

  return (
    <Card className="overflow-hidden border-amber-300/70 bg-amber-50/45 dark:border-amber-800/60 dark:bg-amber-950/10">
      <CardHeader className="border-b border-amber-200/70 pb-4 dark:border-amber-900/60">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              Días festivos o feriados con pago doble
            </CardTitle>
            <CardDescription className="mt-1 max-w-3xl">
              El sueldo ordinario ya cubre el día laborado. Este registro suma
              un salario diario adicional para completar el pago al doble y lo
              distribuye a las sucursales del empleado.
            </CardDescription>
          </div>
          <Badge className="w-fit border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            {periodEntries.length} REGISTRO
            {periodEntries.length === 1 ? "" : "S"} EN EL PERIODO
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_1.2fr_auto] xl:items-end">
          <div className="space-y-2">
            <Label>Empleado</Label>
            <Select
              value={selectedEmployee?.id ?? ""}
              onValueChange={setEmployeeId}
              disabled={controlsDisabled || eligibleLines.length === 0}
            >
              <SelectTrigger aria-label="Empleado para pago doble">
                <SelectValue placeholder="Selecciona empleado" />
              </SelectTrigger>
              <SelectContent>
                {eligibleLines.map((line) => (
                  <SelectItem
                    key={line.employee.id}
                    value={line.employee.id}
                  >
                    {line.employee.name} · {line.employee.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`double-pay-date-${view}`}>Fecha laborada</Label>
            <Input
              id={`double-pay-date-${view}`}
              type="date"
              min={periodStart}
              max={periodEnd}
              value={effectiveDate}
              disabled={controlsDisabled}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`double-pay-reason-${view}`}>Motivo</Label>
            <Input
              id={`double-pay-reason-${view}`}
              value={reason}
              disabled={controlsDisabled}
              placeholder="DÍA FESTIVO / FERIADO"
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={controlsDisabled || !selectedEmployee}
            onClick={submit}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar día doble
          </Button>
        </div>
        {selectedEmployee ? (
          <div className="rounded-xl border border-amber-200 bg-white/70 px-4 py-3 text-xs dark:border-amber-900 dark:bg-black/10">
            <span className="font-semibold">Vista previa:</span>{" "}
            {selectedEmployee.name} · salario diario{" "}
            <span className="number-display font-semibold">
              {money.format(dailySalary)}
            </span>{" "}
            · adicional a integrar{" "}
            <span className="number-display font-semibold text-amber-800 dark:text-amber-200">
              {money.format(dailySalary)}
            </span>
          </div>
        ) : null}
        {periodEntries.length > 0 ? (
          <div className="grid gap-2 lg:grid-cols-2">
            {periodEntries.map((entry) => {
              const employee = state.employees.find(
                (item) => item.id === entry.employeeId,
              );
              const amount = (employee?.monthlySalary ?? 0) / 30;
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 dark:border-amber-900 dark:bg-black/10"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">
                      {employee?.name ?? "EMPLEADO"} · {entry.date}
                    </p>
                    <p className="truncate text-[10px] text-[color:var(--text-muted)]">
                      {entry.reason} · 1 día adicional ·{" "}
                      <span className="number-display">
                        {money.format(amount)}
                      </span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-rose-700"
                    aria-label={`Eliminar pago doble de ${employee?.name ?? "empleado"}`}
                    disabled={controlsDisabled}
                    onClick={() => {
                      deleteDoublePayDay(entry.id);
                      toast.success("Registro de pago doble eliminado.");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[color:var(--text-muted)]">
            No hay días dobles registrados en este periodo.
          </p>
        )}
        {payrollLocked ? (
          <p className="flex items-center gap-1 text-[10px] font-medium text-amber-800 dark:text-amber-200">
            <LockKeyhole className="h-3 w-3" />
            La nómina está cerrada; reábrela con código maestro para modificar
            estos registros.
          </p>
        ) : !canManage ? (
          <p className="flex items-center gap-1 text-[10px] font-medium text-amber-800 dark:text-amber-200">
            <LockKeyhole className="h-3 w-3" />
            Tu rol no tiene autorización para crear movimientos de nómina.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PayrollTable({
  lines,
  view,
  periodStart,
  periodEnd,
  includeSocialCost,
  includeIsr,
}: {
  lines: EmployeePayrollLine[];
  view: PayrollView;
  periodStart: string;
  periodEnd: string;
  includeSocialCost: boolean;
  includeIsr: boolean;
}) {
  const { state } = usePayrollDemo();
  const moduleDefinition = state.payrollModules.find(
    (module) => module.id === view,
  );
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [tableSort, setTableSort] =
    useState<TableSortState<PayrollColumnSortKey>>(null);
  const commissionFilters = view === "COMMISSION";
  const positionOptions = useMemo(
    () =>
      Array.from(new Set(lines.map((line) => line.employee.position))).sort(
        (left, right) => left.localeCompare(right, "es-MX"),
      ),
    [lines],
  );
  const branchOptions = useMemo(
    () =>
      state.branches.filter((branch) =>
        lines.some((line) => line.employee.branchId === branch.id),
      ),
    [lines, state.branches],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const filteredLines = useMemo(
    () =>
      commissionFilters
        ? lines.filter((line) => {
            const branch =
              state.branches.find(
                (item) => item.id === line.employee.branchId,
              )?.name ?? "SIN SUCURSAL";
            const matchesSearch =
              !normalizedSearch ||
              `${line.employee.name} ${line.employee.position} ${branch} ${line.schemeName}`
                .toLocaleLowerCase("es-MX")
                .includes(normalizedSearch);
            return (
              matchesSearch &&
              (positionFilter === "ALL" ||
                line.employee.position === positionFilter) &&
              (branchFilter === "ALL" ||
                line.employee.branchId === branchFilter)
            );
          })
        : lines,
    [
      branchFilter,
      commissionFilters,
      lines,
      normalizedSearch,
      positionFilter,
      state.branches,
    ],
  );
  const sortedLines = useMemo(
    () =>
      sortTableRows(filteredLines, tableSort, {
        employee: (line) => line.employee.name,
        bank: (line) => `${line.employee.bank} ${line.employee.account}`,
        position: (line) =>
          `${line.employee.position} ${line.schemeName ?? ""}`,
        grossSales: (line) => line.grossSales,
        salesWithoutVat: (line) => line.salesWithoutVat,
        commission: (line) => line.commission,
        invoiceSubtotal: (line) => line.invoiceSubtotal,
        ivaAmount: (line) => line.ivaAmount,
        isrRetention: (line) => line.isrRetention,
        ivaRetention: (line) => line.ivaRetention,
        fixedSalary: (line) => line.fixedSalary,
        doublePay: (line) => line.doublePayAmount,
        commissionBonuses: (line) => line.commission + line.bonuses,
        deductions: (line) =>
          line.fines +
          line.loanDeduction +
          line.externalDeductions +
          line.viaticsDeductions +
          line.carriedNegativeBalance,
        adjustments: (line) =>
          line.externalAdditions -
          line.externalDeductions +
          line.viaticsAdditions -
          line.viaticsDeductions,
        carriedBalance: (line) => line.carriedNegativeBalance,
        christmasBonus: (line) => line.christmasBonusPayment,
        settlement: (line) => line.settlementPayment,
        payrollBeforeDeductions: (line) => line.payrollBeforeDeductions,
        totalDeductions: (line) => line.totalDeductions,
        payroll: (line) => line.total,
        socialCost: (line) => line.socialCost,
        isr: (line) => line.isrCost,
        approval: (line) =>
          state.decisions.some(
            (decision) =>
              decision.employeeId === line.employee.id &&
              decision.periodStart >= periodStart &&
              decision.periodStart <= periodEnd &&
              decision.status === "AUTHORIZED",
          )
            ? "APROBADO"
            : "PENDIENTE",
        totalCost: (line) => line.total + line.socialCost + line.isrCost,
      }),
    [filteredLines, periodEnd, periodStart, state.decisions, tableSort],
  );
  function changeTableSort(
    key: PayrollColumnSortKey,
    kind: TableSortKind,
  ) {
    setTableSort((current) => nextTableSort(current, key, kind));
    setPage(1);
  }
  const effectivePageSize =
    pageSize === "ALL" ? Math.max(sortedLines.length, 1) : Number(pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(sortedLines.length / effectivePageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const pagedLines = sortedLines.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );
  const visibleStart =
    sortedLines.length === 0
      ? 0
      : (currentPage - 1) * effectivePageSize + 1;
  const visibleEnd = Math.min(
    currentPage * effectivePageSize,
    sortedLines.length,
  );
  const payrollTotal = filteredLines.reduce(
    (sum, line) => sum + line.total,
    0,
  );
  const payrollBeforeDeductionsTotal = filteredLines.reduce(
    (sum, line) => sum + line.payrollBeforeDeductions,
    0,
  );
  const deductionsTotal = filteredLines.reduce(
    (sum, line) => sum + line.totalDeductions,
    0,
  );
  const socialTotal = filteredLines.reduce(
    (sum, line) => sum + line.socialCost,
    0,
  );
  const isrTotal = filteredLines.reduce(
    (sum, line) => sum + line.isrCost,
    0,
  );
  const total = payrollTotal + socialTotal + isrTotal;
  const contractor = view === "CONTRACTOR";
  const showSales =
    view === "CONSOLIDATED" ||
    contractor ||
    Boolean(moduleDefinition?.concepts.includes("COMMISSION"));
  const showSalary =
    view === "CONSOLIDATED" ||
    Boolean(moduleDefinition?.concepts.includes("SALARY"));
  const showDoublePay =
    (view === "FIXED" ||
      view === "SPECIALIST" ||
      view === "CONSOLIDATED") &&
    (view !== "CONSOLIDATED" ||
      filteredLines.some((line) => line.doublePayAmount > 0));
  const showApproval = view !== "FIXED" && view !== "SPECIALIST";
  const showNegativeBalances = filteredLines.some(
    (line) =>
      line.carriedNegativeBalance > 0 || line.newNegativeBalance > 0,
  );
  const showCommission =
    view === "CONSOLIDATED" ||
    Boolean(moduleDefinition?.concepts.includes("COMMISSION"));
  const showDeductions =
    view === "CONSOLIDATED" ||
    Boolean(
      moduleDefinition?.concepts.some(
        (concept) =>
          concept === "FINE" ||
          concept === "LOAN" ||
          concept === "ADVANCE" ||
          concept === "ADJUSTMENT_MINUS",
      ),
    );
  const showAdjustments =
    view === "CONSOLIDATED" ||
    Boolean(
      moduleDefinition?.concepts.some(
        (concept) =>
          concept === "ADJUSTMENT_PLUS" ||
          concept === "ADJUSTMENT_MINUS" ||
          concept === "VIATICS" ||
          (concept === "BONUS" && !showCommission),
      ),
    );
  const showChristmasBonus =
    (view === "CONSOLIDATED" || view === "CHRISTMAS_BONUS") &&
    state.christmasBonusPaymentPeriods.some(
      (payment) =>
        payment.active &&
        payment.paymentDate >= periodStart &&
        payment.paymentDate <= periodEnd,
    );
  const showSettlement =
    (view === "CONSOLIDATED" || view === "SETTLEMENT") &&
    filteredLines.some((line) => line.settlementPayment > 0);
  const settlementTotal = filteredLines.reduce(
    (sum, line) => sum + line.settlementPayment,
    0,
  );
  const christmasBonusTotal = filteredLines.reduce(
    (sum, line) => sum + line.christmasBonusPayment,
    0,
  );
  const doublePayTotal = filteredLines.reduce(
    (sum, line) => sum + line.doublePayAmount,
    0,
  );
  const approvedEmployeeIds = useMemo(
    () =>
      new Set(
        state.decisions
          .filter(
            (decision) =>
              decision.periodStart >= periodStart &&
              decision.periodStart <= periodEnd &&
              decision.status === "AUTHORIZED",
          )
          .map((decision) => decision.employeeId),
      ),
    [periodEnd, periodStart, state.decisions],
  );
  const approvedVisibleCount = filteredLines.filter((line) =>
    approvedEmployeeIds.has(line.employee.id),
  ).length;
  const reportRows = sortedLines.map((line) => ({
    employee: line.employee.name,
    position: line.employee.position,
    branch:
      state.branches.find((branch) => branch.id === line.employee.branchId)
        ?.name ?? "SIN SUCURSAL",
    bank: line.employee.bank,
    account: line.employee.account,
    scheme: line.schemeName,
    workedDays: `${line.workedDays} DE ${line.periodDays}`,
    grossSales: line.grossSales,
    salesWithoutVat: line.salesWithoutVat,
    salary: line.fixedSalary,
    doublePay: line.doublePayAmount,
    doublePayDetail: line.doublePayDays
      .map((entry) => `${entry.date} · ${entry.reason}`)
      .join(" | "),
    carriedBalance: line.carriedNegativeBalance,
    pendingBalance: line.newNegativeBalance,
    commission: line.commission,
    bonuses: line.bonuses,
    deductions: line.fines + line.loanDeduction,
    adjustments: line.externalAdditions - line.externalDeductions,
    settlement: line.settlementPayment > 0 ? line.settlementPayment : null,
    christmasBonus:
      line.christmasBonusPayment > 0 ? line.christmasBonusPayment : null,
    payrollBeforeDeductions: line.payrollBeforeDeductions,
    totalDeductions: line.totalDeductions,
    payroll: line.total,
    socialCost: line.socialCost,
    isr: line.isrCost,
    approval: approvedEmployeeIds.has(line.employee.id) ? "APROBADO" : "",
    total:
      line.total + line.socialCost + line.isrCost,
  }));
  const reportConfig = {
    title:
      view === "CONSOLIDATED"
        ? "Consolidado general de nómina"
        : `Detalle de ${payrollModuleLabel(state, view)}`,
    subtitle: `${periodStart} — ${periodEnd} · Costo social ${includeSocialCost ? "incluido" : "general excluido; excepciones por nómina vigentes"} · ISR ${includeIsr ? "incluido" : "general excluido; excepciones por nómina vigentes"}`,
    metadata: [
      { label: "Periodo", value: `${periodStart} — ${periodEnd}` },
      {
        label: "Reporte",
        value:
          view === "CONSOLIDATED"
            ? "CONSOLIDADO GENERAL"
            : payrollModuleLabel(state, view),
      },
      {
        label: "Alcance",
        value:
          commissionFilters &&
          (search.trim() ||
            positionFilter !== "ALL" ||
            branchFilter !== "ALL")
            ? "SELECCIÓN FILTRADA"
            : "REPORTE GENERAL · EMPRESA COMPLETA",
      },
      ...(commissionFilters
        ? [
            {
              label: "Puesto",
              value:
                positionFilter === "ALL" ? "TODOS" : positionFilter,
            },
            {
              label: "Sucursal",
              value:
                branchFilter === "ALL"
                  ? "TODAS"
                  : (state.branches.find(
                      (branch) => branch.id === branchFilter,
                    )?.name ?? "SUCURSAL"),
            },
          ]
        : []),
      {
        label: "Cargas incluidas",
        value: `COSTO SOCIAL ${includeSocialCost ? "GENERAL" : "SOLO EXCEPCIONES"} · ISR ${includeIsr ? "GENERAL" : "SOLO EXCEPCIONES"}`,
      },
    ],
    metrics: [
      { label: "Personal", value: String(filteredLines.length), detail: "Registros incluidos" },
      { label: "Nómina", value: money.format(payrollTotal), detail: "Pago del periodo" },
      ...(showDoublePay
        ? [
            {
              label: "Pago doble",
              value: money.format(doublePayTotal),
              detail: "Salario diario adicional",
            },
          ]
        : []),
      { label: "Cargas", value: money.format(socialTotal + isrTotal), detail: "Costo social + ISR" },
      { label: "Costo total", value: money.format(total), detail: "Nómina + cargas" },
    ],
    analysis: [
      ...(showApproval
        ? [
            `${approvedVisibleCount} de ${filteredLines.length} recibos de la selección aparecen aprobados por el personal.`,
          ]
        : [
            "Esta nómina no requiere aprobación individual del empleado; el control se realiza mediante el cierre de la corrida.",
          ]),
      `El costo social está ${includeSocialCost ? "incluido de forma general" : "excluido de forma general, conservando excepciones por nómina"} y el ISR está ${includeIsr ? "incluido de forma general" : "excluido de forma general, conservando excepciones por nómina"} en esta salida.`,
      ...(showDoublePay
        ? [
            `${filteredLines.reduce((sum, line) => sum + line.doublePayDayCount, 0)} días festivos o feriados agregan ${money.format(doublePayTotal)} a la nómina; el día ordinario permanece dentro del sueldo base.`,
          ]
        : []),
      ...(showNegativeBalances
        ? [
            `Los saldos negativos anteriores descuentan ${money.format(filteredLines.reduce((sum, line) => sum + line.carriedNegativeBalance, 0))}; cualquier remanente se conserva para el siguiente periodo.`,
          ]
        : []),
      "La exportación contiene únicamente la nómina seleccionada y no incluye filtros, navegación ni controles del sistema.",
    ],
    filename: `nomina-${view.toLocaleLowerCase()}-${periodStart}`,
    sheetName: "Nómina",
    orientation: "landscape" as const,
    rows: reportRows,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: (typeof reportRows)[number]) => row.employee,
        width: 28,
      },
      {
        header: "PUESTO",
        accessor: (row: (typeof reportRows)[number]) => row.position,
        width: 20,
      },
      {
        header: "SUCURSAL",
        accessor: (row: (typeof reportRows)[number]) => row.branch,
        width: 18,
      },
      {
        header: "BANCO",
        accessor: (row: (typeof reportRows)[number]) => row.bank,
        width: 15,
      },
      {
        header: "CUENTA / CLABE",
        accessor: (row: (typeof reportRows)[number]) => row.account,
        width: 22,
      },
      {
        header: "ESQUEMA",
        accessor: (row: (typeof reportRows)[number]) => row.scheme,
        width: 20,
      },
      {
        header: "DÍAS LABORADOS",
        accessor: (row: (typeof reportRows)[number]) => row.workedDays,
        width: 16,
      },
      {
        header: "VENTAS",
        accessor: (row: (typeof reportRows)[number]) => row.grossSales,
        format: "currency" as const,
        width: 15,
      },
      {
        header: "VENTAS SIN IVA",
        accessor: (row: (typeof reportRows)[number]) => row.salesWithoutVat,
        format: "currency" as const,
        width: 18,
      },
      {
        header: "SUELDO",
        accessor: (row: (typeof reportRows)[number]) => row.salary,
        format: "currency" as const,
        width: 15,
      },
      ...(showDoublePay
        ? [
            {
              header: "PAGO DOBLE ADICIONAL",
              accessor: (row: (typeof reportRows)[number]) => row.doublePay,
              format: "currency" as const,
              width: 19,
            },
            {
              header: "DETALLE PAGO DOBLE",
              accessor: (row: (typeof reportRows)[number]) =>
                row.doublePayDetail,
              width: 30,
            },
          ]
        : []),
      {
        header: "COMISIÓN",
        accessor: (row: (typeof reportRows)[number]) => row.commission,
        format: "currency" as const,
        width: 15,
      },
      {
        header: "BONOS",
        accessor: (row: (typeof reportRows)[number]) => row.bonuses,
        format: "currency" as const,
        width: 14,
      },
      {
        header: "DEDUCCIONES",
        accessor: (row: (typeof reportRows)[number]) => row.deductions,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "AJUSTES",
        accessor: (row: (typeof reportRows)[number]) => row.adjustments,
        format: "currency" as const,
        width: 14,
      },
      ...(showNegativeBalances
        ? [
            {
              header: "SALDO ANTERIOR",
              accessor: (row: (typeof reportRows)[number]) =>
                row.carriedBalance,
              format: "currency" as const,
              width: 17,
            },
            {
              header: "SALDO PENDIENTE",
              accessor: (row: (typeof reportRows)[number]) =>
                row.pendingBalance,
              format: "currency" as const,
              width: 18,
            },
          ]
        : []),
      ...(showChristmasBonus
        ? [
            {
              header: "AGUINALDO",
              accessor: (row: (typeof reportRows)[number]) =>
                row.christmasBonus,
              format: "currency" as const,
              width: 16,
            },
          ]
        : []),
      ...(showSettlement
        ? [
            {
              header: "LIQUIDACIÓN / FINIQUITO",
              accessor: (row: (typeof reportRows)[number]) => row.settlement,
              format: "currency" as const,
              width: 20,
            },
          ]
        : []),
      {
        header: "NÓMINA ANTES DE DESCUENTOS",
        accessor: (row: (typeof reportRows)[number]) =>
          row.payrollBeforeDeductions,
        format: "currency" as const,
        width: 22,
      },
      {
        header: "DESCUENTOS TOTALES",
        accessor: (row: (typeof reportRows)[number]) => row.totalDeductions,
        format: "currency" as const,
        width: 19,
      },
      {
        header: "NETO A PAGAR",
        accessor: (row: (typeof reportRows)[number]) => row.payroll,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "COSTO SOCIAL",
        accessor: (row: (typeof reportRows)[number]) => row.socialCost,
        format: "currency" as const,
        width: 17,
      },
      {
        header: "ISR",
        accessor: (row: (typeof reportRows)[number]) => row.isr,
        format: "currency" as const,
        width: 14,
      },
      ...(showApproval
        ? [
            {
              header: "APROBACIÓN",
              accessor: (row: (typeof reportRows)[number]) => row.approval,
              width: 16,
            },
          ]
        : []),
      {
        header: "COSTO TOTAL",
        accessor: (row: (typeof reportRows)[number]) => row.total,
        format: "currency" as const,
        width: 18,
      },
    ],
  };
  useEffect(
    () => setPage(1),
    [branchFilter, pageSize, positionFilter, search],
  );
  return (
    <Card className="overflow-hidden border-[color:var(--border-color)]">
      <CardHeader className="border-b border-[color:var(--border-color)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="section-heading uppercase">
              Contenido de la nómina
            </CardTitle>
            <CardDescription>
              {filteredLines.length} de {lines.length} empleados visibles en el
              cálculo actual.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">SOLO DATOS · MOCK</Badge>
            <ReportExportButtons
              config={reportConfig}
              disabled={!filteredLines.length}
              iconOnly
            />
          </div>
        </div>
        {commissionFilters ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_240px_240px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="BUSCAR EMPLEADO, PUESTO, SUCURSAL O ESQUEMA"
                aria-label="Buscar en nómina de comisiones"
              />
            </div>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger aria-label="Filtrar nómina de comisiones por puesto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODOS LOS PUESTOS</SelectItem>
                {positionOptions.map((position) => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger aria-label="Filtrar nómina de comisiones por sucursal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODAS LAS SUCURSALES</SelectItem>
                {branchOptions.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  column="employee"
                  label="EMPLEADO"
                  kind="text"
                  sort={tableSort}
                  onSort={changeTableSort}
                />
                <SortableTableHead
                  column="bank"
                  label="BANCO / CUENTA"
                  kind="text"
                  sort={tableSort}
                  onSort={changeTableSort}
                />
                <SortableTableHead
                  column="position"
                  label="PUESTO / ESQUEMA"
                  kind="text"
                  sort={tableSort}
                  onSort={changeTableSort}
                />
                {showSales && (
                  <SortableTableHead
                    column="grossSales"
                    label="VENTAS"
                    kind="number"
                    sort={tableSort}
                    onSort={changeTableSort}
                    align="right"
                  />
                )}
                {showSales && (
                  <SortableTableHead
                    column="salesWithoutVat"
                    label="VENTAS SIN IVA"
                    kind="number"
                    sort={tableSort}
                    onSort={changeTableSort}
                    align="right"
                  />
                )}
                {contractor ? (
                  <>
                    <SortableTableHead
                      column="commission"
                      label="COMISIÓN"
                      kind="number"
                      sort={tableSort}
                      onSort={changeTableSort}
                      align="right"
                    />
                    <SortableTableHead
                      column="invoiceSubtotal"
                      label="SUBTOTAL FACTURA"
                      kind="number"
                      sort={tableSort}
                      onSort={changeTableSort}
                      align="right"
                    />
                    <SortableTableHead
                      column="ivaAmount"
                      label="IVA"
                      kind="number"
                      sort={tableSort}
                      onSort={changeTableSort}
                      align="right"
                    />
                    <SortableTableHead
                      column="isrRetention"
                      label="RET. ISR"
                      kind="number"
                      sort={tableSort}
                      onSort={changeTableSort}
                      align="right"
                    />
                    <SortableTableHead
                      column="ivaRetention"
                      label="RET. IVA"
                      kind="number"
                      sort={tableSort}
                      onSort={changeTableSort}
                      align="right"
                    />
                  </>
                ) : (
                  <>
                    {showSalary && (
                      <SortableTableHead
                        column="fixedSalary"
                        label="SUELDO"
                        kind="number"
                        sort={tableSort}
                        onSort={changeTableSort}
                        align="right"
                      />
                    )}
                    {showDoublePay && (
                      <SortableTableHead
                        column="doublePay"
                        label="PAGO DOBLE"
                        kind="number"
                        sort={tableSort}
                        onSort={changeTableSort}
                        align="right"
                      />
                    )}
                    {showCommission && (
                      <SortableTableHead
                        column="commissionBonuses"
                        label="COMISIÓN + BONOS"
                        kind="number"
                        sort={tableSort}
                        onSort={changeTableSort}
                        align="right"
                      />
                    )}
                    {showDeductions && (
                      <SortableTableHead
                        column="deductions"
                        label="DEDUCCIONES"
                        kind="number"
                        sort={tableSort}
                        onSort={changeTableSort}
                        align="right"
                      />
                    )}
                  </>
                )}
                {showAdjustments && (
                  <SortableTableHead
                    column="adjustments"
                    label="AJUSTES"
                    kind="number"
                    sort={tableSort}
                    onSort={changeTableSort}
                    align="right"
                  />
                )}
                {showNegativeBalances && (
                  <SortableTableHead
                    column="carriedBalance"
                    label="SALDO ARRASTRADO"
                    kind="number"
                    sort={tableSort}
                    onSort={changeTableSort}
                    align="right"
                  />
                )}
                {showChristmasBonus && (
                  <SortableTableHead
                    column="christmasBonus"
                    label="AGUINALDO"
                    kind="number"
                    sort={tableSort}
                    onSort={changeTableSort}
                    align="right"
                  />
                )}
                {showSettlement && (
                  <SortableTableHead
                    column="settlement"
                    label="LIQUIDACIÓN / FINIQUITO"
                    kind="number"
                    sort={tableSort}
                    onSort={changeTableSort}
                    align="right"
                  />
                )}
                <SortableTableHead
                  column="payrollBeforeDeductions"
                  label="ANTES DE DESCUENTOS"
                  kind="number"
                  sort={tableSort}
                  onSort={changeTableSort}
                  align="right"
                />
                <SortableTableHead
                  column="totalDeductions"
                  label="DESCUENTOS TOTALES"
                  kind="number"
                  sort={tableSort}
                  onSort={changeTableSort}
                  align="right"
                />
                <SortableTableHead
                  column="payroll"
                  label="NETO A PAGAR"
                  kind="number"
                  sort={tableSort}
                  onSort={changeTableSort}
                  align="right"
                />
                <SortableTableHead
                  column="socialCost"
                  label="COSTO SOCIAL"
                  kind="number"
                  sort={tableSort}
                  onSort={changeTableSort}
                  align="right"
                />
                <SortableTableHead
                  column="isr"
                  label="ISR"
                  kind="number"
                  sort={tableSort}
                  onSort={changeTableSort}
                  align="right"
                />
                {showApproval && (
                  <SortableTableHead
                    column="approval"
                    label="APROBACIÓN"
                    kind="text"
                    sort={tableSort}
                    onSort={changeTableSort}
                    align="center"
                  />
                )}
                <SortableTableHead
                  column="totalCost"
                  label="COSTO TOTAL"
                  kind="number"
                  sort={tableSort}
                  onSort={changeTableSort}
                  align="right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedLines.map((line) => (
                <TableRow
                  key={line.employee.id}
                  className={
                    line.settlementPayment > 0
                      ? "bg-sky-50/80 ring-1 ring-inset ring-sky-200/70 dark:bg-sky-950/15 dark:ring-sky-800/50"
                      : line.newNegativeBalance > 0
                        ? "bg-rose-50/80 ring-1 ring-inset ring-rose-200/80 dark:bg-rose-950/15 dark:ring-rose-800/50"
                      : line.doublePayAmount > 0
                        ? "bg-amber-50/80 ring-1 ring-inset ring-amber-200/80 dark:bg-amber-950/15 dark:ring-amber-800/50"
                      : undefined
                  }
                >
                  <TableCell>
                    <p className="font-semibold text-[color:var(--text-primary)]">
                      {line.employee.name}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {state.branches.find(
                        (branch) => branch.id === line.employee.branchId,
                      )?.name ?? "SIN SUCURSAL"}{" "}
                      · ID {line.employee.id.toLocaleUpperCase("es-MX")}
                    </p>
                    {line.settlementPayment > 0 ? (
                      <Badge className="mt-1 border border-sky-300 bg-sky-100 text-[9px] text-sky-900">
                        LIQUIDACIÓN INTEGRADA
                      </Badge>
                    ) : null}
                    {line.doublePayAmount > 0 ? (
                      <Badge className="mt-1 border border-amber-300 bg-amber-100 text-[9px] text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                        PAGO DOBLE · {line.doublePayDayCount} DÍA
                        {line.doublePayDayCount === 1 ? "" : "S"}
                      </Badge>
                    ) : null}
                    {line.newNegativeBalance > 0 ? (
                      <Badge className="mt-1 border border-rose-300 bg-rose-100 text-[9px] text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
                        SALDO PENDIENTE ·{" "}
                        {money.format(line.newNegativeBalance)}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="min-w-44">
                    <p className="text-xs font-semibold">
                      {line.employee.bank}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                      Cuenta / CLABE
                    </p>
                    <p className="number-display text-xs">
                      {line.employee.account}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{line.employee.position}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {line.schemeName}
                      {line.rate > 0
                        ? ` · ${(line.rate * 100).toFixed(0)}%`
                        : ""}
                      {line.employee.category === "SELLER" ||
                      line.employee.category === "CONTRACTOR"
                        ? ` · ${line.calculationMode === "WITH_VAT" ? "CON IVA" : "SIN IVA"}`
                        : ""}
                    </p>
                  </TableCell>
                  {showSales && (
                    <TableCell className="number-display text-right">
                      {money.format(line.grossSales)}
                    </TableCell>
                  )}
                  {showSales && (
                    <TableCell
                      className={`number-display text-right ${line.calculationMode === "WITHOUT_VAT" ? "bg-amber-50/70 font-semibold text-amber-900 dark:bg-amber-950/25 dark:text-amber-200" : "text-[color:var(--text-secondary)]"}`}
                    >
                      <p>{money.format(line.salesWithoutVat)}</p>
                      {line.calculationMode === "WITHOUT_VAT" && (
                        <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] opacity-70">
                          BASE APLICADA
                        </p>
                      )}
                    </TableCell>
                  )}
                  {contractor ? (
                    <>
                      <TableCell className="number-display text-right">
                        {money.format(line.commission)}
                      </TableCell>
                      <TableCell className="number-display text-right">
                        {money.format(line.invoiceSubtotal)}
                      </TableCell>
                      <TableCell className="number-display text-right text-emerald-700 dark:text-emerald-300">
                        {money.format(line.ivaAmount)}
                      </TableCell>
                      <TableCell className="number-display text-right text-rose-700 dark:text-rose-300">
                        {money.format(line.isrRetention)}
                      </TableCell>
                      <TableCell className="number-display text-right text-rose-700 dark:text-rose-300">
                        {money.format(line.ivaRetention)}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      {showSalary && (
                        <TableCell className="text-right">
                          <p className="number-display">
                            {money.format(line.fixedSalary)}
                          </p>
                          {line.workedDays < line.periodDays && (
                            <p className="mt-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                              PRORRATEO · {line.workedDays}/{line.periodDays}{" "}
                              DÍAS
                            </p>
                          )}
                        </TableCell>
                      )}
                      {showDoublePay && (
                        <TableCell className="bg-amber-50/60 text-right dark:bg-amber-950/20">
                          <p className="number-display font-semibold text-amber-800 dark:text-amber-200">
                            {line.doublePayAmount > 0
                              ? money.format(line.doublePayAmount)
                              : "—"}
                          </p>
                          {line.doublePayDayCount > 0 ? (
                            <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-300">
                              {line.doublePayDays
                                .map((entry) => entry.date)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </TableCell>
                      )}
                      {showCommission && (
                        <TableCell className="number-display text-right text-emerald-700 dark:text-emerald-300">
                          {money.format(line.commission + line.bonuses)}
                        </TableCell>
                      )}
                    </>
                  )}
                  {showDeductions && (
                    <TableCell className="number-display text-right text-rose-700 dark:text-rose-300">
                      {money.format(
                        line.fines +
                          line.loanDeduction +
                          line.externalDeductions,
                      )}
                    </TableCell>
                  )}
                  {showAdjustments && (
                    <TableCell
                      className={`number-display text-right ${line.externalAdditions - line.externalDeductions < 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}
                    >
                      {money.format(
                        line.externalAdditions -
                          line.externalDeductions +
                          line.viaticsAdditions -
                          line.viaticsDeductions +
                          (!showCommission ? line.bonuses : 0),
                      )}
                    </TableCell>
                  )}
                  {showNegativeBalances && (
                    <TableCell className="bg-rose-50/60 text-right dark:bg-rose-950/20">
                      <p className="number-display font-semibold text-rose-800 dark:text-rose-200">
                        {line.carriedNegativeBalance > 0
                          ? `−${money.format(line.carriedNegativeBalance)}`
                          : "—"}
                      </p>
                      {line.newNegativeBalance > 0 ? (
                        <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.06em] text-rose-700 dark:text-rose-300">
                          PASA {money.format(line.newNegativeBalance)}
                        </p>
                      ) : null}
                    </TableCell>
                  )}
                  {showChristmasBonus && (
                    <TableCell className="number-display text-right font-semibold text-emerald-700 dark:text-emerald-300">
                      {line.christmasBonusPayment > 0
                        ? money.format(line.christmasBonusPayment)
                        : "—"}
                    </TableCell>
                  )}
                  {showSettlement && (
                    <TableCell className="number-display text-right font-semibold text-sky-700 dark:text-sky-300">
                      {line.settlementPayment > 0
                        ? money.format(line.settlementPayment)
                        : "—"}
                    </TableCell>
                  )}
                  <TableCell className="number-display bg-sky-50/50 text-right dark:bg-sky-950/15">
                    {money.format(line.payrollBeforeDeductions)}
                  </TableCell>
                  <TableCell className="number-display bg-rose-50/50 text-right text-rose-700 dark:bg-rose-950/15 dark:text-rose-300">
                    −{money.format(line.totalDeductions)}
                  </TableCell>
                  <TableCell className="number-display text-right text-base">
                    {money.format(line.total)}
                  </TableCell>
                  <TableCell
                    className={`number-display text-right ${includeSocialCost || line.socialCost > 0 ? "" : "text-[color:var(--text-muted)]"}`}
                  >
                    {includeSocialCost || line.socialCost > 0
                      ? money.format(line.socialCost)
                      : "EXCLUIDO"}
                  </TableCell>
                  <TableCell
                    className={`number-display text-right ${includeIsr || line.isrCost > 0 ? "" : "text-[color:var(--text-muted)]"}`}
                  >
                    {includeIsr || line.isrCost > 0
                      ? money.format(line.isrCost)
                      : "EXCLUIDO"}
                  </TableCell>
                  {showApproval && (
                    <TableCell className="text-center">
                      {approvedEmployeeIds.has(line.employee.id) ? (
                        <span className="inline-flex flex-col items-center gap-0.5 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2
                            className="h-5 w-5 fill-emerald-100 dark:fill-emerald-950"
                            aria-hidden="true"
                          />
                          <span className="text-[9px] font-semibold tracking-[0.08em]">
                            APROBADO
                          </span>
                        </span>
                      ) : (
                        <span className="sr-only">
                          Pendiente de aprobación
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="number-display text-right text-base font-semibold">
                    {money.format(
                      line.total + line.socialCost + line.isrCost,
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell
                  colSpan={
                    3 +
                    (showSales ? 2 : 0) +
                    (contractor
                      ? 5
                      : Number(showSalary) +
                        Number(showDoublePay) +
                        Number(showCommission) +
                        Number(showDeductions)) +
                    Number(showAdjustments) +
                    Number(showNegativeBalances)
                  }
                  className="text-right font-semibold"
                >
                  TOTALES
                </TableCell>
                {showChristmasBonus && (
                  <TableCell className="number-display text-right font-semibold text-emerald-700 dark:text-emerald-300">
                    {money.format(christmasBonusTotal)}
                  </TableCell>
                )}
                {showSettlement && (
                  <TableCell className="number-display text-right font-semibold text-sky-700 dark:text-sky-300">
                    {money.format(settlementTotal)}
                  </TableCell>
                )}
                <TableCell className="number-display bg-sky-50/50 text-right font-semibold dark:bg-sky-950/15">
                  {money.format(payrollBeforeDeductionsTotal)}
                </TableCell>
                <TableCell className="number-display bg-rose-50/50 text-right font-semibold text-rose-700 dark:bg-rose-950/15 dark:text-rose-300">
                  −{money.format(deductionsTotal)}
                </TableCell>
                <TableCell className="number-display text-right">
                  {money.format(payrollTotal)}
                </TableCell>
                <TableCell className="number-display text-right">
                  {money.format(socialTotal)}
                </TableCell>
                <TableCell className="number-display text-right">
                  {money.format(isrTotal)}
                </TableCell>
                {showApproval && <TableCell />}
                <TableCell className="number-display text-right text-base">
                  {money.format(total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        {filteredLines.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15 px-4 py-3 text-xs lg:flex-row lg:items-center lg:justify-between">
            <p>
              Mostrando{" "}
              <strong>
                {visibleStart}–{visibleEnd}
              </strong>{" "}
              de <strong>{filteredLines.length}</strong> empleados · página{" "}
              <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
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
                  className="h-8 w-[88px] rounded-lg text-[10px] font-semibold"
                  aria-label="Filas de nómina por página"
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
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-lg px-2.5 text-[10px]"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Anterior
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-lg px-2.5 text-[10px]"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
              >
                Siguiente
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConsolidatedDashboard({
  config,
  lines,
  includeSocialCost,
  includeIsr,
}: {
  config: DemoPayrollPeriodConfig;
  lines: EmployeePayrollLine[];
  includeSocialCost: boolean;
  includeIsr: boolean;
}) {
  const { state, listSortMode, setRunStatus, payrollLines } = usePayrollDemo();
  const run = state.runs.find(
    (item) =>
      item.module === "CONSOLIDATED" &&
      item.periodStart === config.periodStart &&
      item.periodEnd === config.periodEnd,
  );
  const totalSales = lines.reduce((sum, line) => sum + line.sales, 0);
  const payrollBeforeDeductions = lines.reduce(
    (sum, line) => sum + line.payrollBeforeDeductions,
    0,
  );
  const payrollDeductions = lines.reduce(
    (sum, line) => sum + line.totalDeductions,
    0,
  );
  const payrollBase = lines.reduce((sum, line) => sum + line.total, 0);
  const socialCost = lines.reduce((sum, line) => sum + line.socialCost, 0);
  const isrCost = lines.reduce((sum, line) => sum + line.isrCost, 0);
  const totalPayroll = payrollBase + socialCost + isrCost;
  const totalVariable = lines.reduce(
    (sum, line) => sum + line.commission + line.bonuses,
    0,
  );
  const payrollTypeColumns = state.payrollModules.filter(
    (module) => module.id !== "CONSOLIDATED",
  );
  const payrollLinesByModule = payrollTypeColumns.map((module) => ({
    module,
    lines: payrollLines(
      config.periodStart,
      state.calculationMode,
      config.periodEnd,
      module.id,
    ),
  }));
  const payrollLineTotalsByModule = new Map(
    payrollLinesByModule.map(({ module, lines: moduleLines }) => [
      module.id,
      new Map(moduleLines.map((line) => [line.employee.id, line.total])),
    ]),
  );
  const authorized = state.decisions.filter(
    (decision) =>
      decision.periodStart >= config.periodStart &&
      decision.periodStart <= config.periodEnd &&
      decision.status === "AUTHORIZED",
  ).length;
  const costAllocations = lines.flatMap((line) => {
    const allocationMode = payrollCostAllocationMode(
      state.payrollCostAllocationModes,
      line.employee.id,
      config.periodStart,
      config.periodEnd,
    );
    return employeeCostAllocationShares({
      employee: line.employee,
      branches: state.branches,
      sales: state.sales,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      mode: allocationMode,
    }).map(({ branchId, share }) => ({
      line,
      branchId,
      share,
      allocationMode,
    }));
  });
  const defaultBranchCosts = state.branches
    .map((branch) => {
      const branchAllocations = costAllocations.filter(
        (allocation) => allocation.branchId === branch.id,
      );
      const payroll = branchAllocations.reduce(
        (sum, { line, share }) => sum + line.total * share,
        0,
      );
      const payrollGross = branchAllocations.reduce(
        (sum, { line, share }) =>
          sum + line.payrollBeforeDeductions * share,
        0,
      );
      const deductions = branchAllocations.reduce(
        (sum, { line, share }) => sum + line.totalDeductions * share,
        0,
      );
      const social = branchAllocations.reduce(
        (sum, { line, share }) => sum + line.socialCost * share,
        0,
      );
      const isr = branchAllocations.reduce(
        (sum, { line, share }) => sum + line.isrCost * share,
        0,
      );
      const movements = branchAllocations.reduce(
        (sum, { line, share }) =>
          sum +
          (line.externalAdditions -
            line.externalDeductions -
            line.fines -
            line.loanDeduction) *
            share,
        0,
      );
      return {
        ...branch,
        payrollGross,
        deductions,
        payroll,
        social,
        isr,
        movements,
        total: payroll + social + isr,
        employees: new Set(
          branchAllocations.map(({ line }) => line.employee.id),
        ).size,
      };
    })
    .filter((branch) => branch.employees > 0);
  const branchCosts = sortByListMode(
    defaultBranchCosts,
    listSortMode,
    (branch) => branch.name,
    (branch) => branch.total,
  );
  const salesTrend = useMemo<ConsolidatedSalesTrendPoint[]>(() => {
    const selectedMonth = config.periodEnd.slice(0, 7);
    const [year = 0, monthNumber = 1] = selectedMonth.split("-").map(Number);

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(year, monthNumber - 1 - (5 - index), 1));
      const month = `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1,
      ).padStart(2, "0")}`;
      const period = monthlyPeriod(month);
      const monthLines = payrollLines(
        period.start,
        state.calculationMode,
        period.end,
        "CONSOLIDATED",
      );
      const sales = monthLines.reduce((sum, line) => sum + line.sales, 0);
      const totalCost = monthLines.reduce(
        (sum, line) => sum + line.total + line.socialCost + line.isrCost,
        0,
      );

      return {
        month,
        label: shortMonthLabel
          .format(new Date(`${month}-01T00:00:00Z`))
          .replace(".", "")
          .toLocaleUpperCase("es-MX"),
        sales,
        totalCost,
      };
    });
  }, [config.periodEnd, payrollLines, state.calculationMode]);
  const branchSales = useMemo<ConsolidatedBranchSalesPoint[]>(() => {
    const employeeIds = new Set(lines.map((line) => line.employee.id));
    const rawSalesByEmployee = new Map<
      string,
      { total: number; byBranch: Map<string, number> }
    >();

    state.sales.forEach((sale) => {
      if (
        !employeeIds.has(sale.employeeId) ||
        sale.date < config.periodStart ||
        sale.date > config.periodEnd
      ) {
        return;
      }
      const current = rawSalesByEmployee.get(sale.employeeId) ?? {
        total: 0,
        byBranch: new Map<string, number>(),
      };
      current.total += sale.amount;
      current.byBranch.set(
        sale.branchId,
        (current.byBranch.get(sale.branchId) ?? 0) + sale.amount,
      );
      rawSalesByEmployee.set(sale.employeeId, current);
    });

    const salesByBranch = new Map<string, number>();
    lines.forEach((line) => {
      const employeeSales = rawSalesByEmployee.get(line.employee.id);
      if (!employeeSales || employeeSales.total <= 0) return;
      employeeSales.byBranch.forEach((rawSales, branchId) => {
        const allocatedSales = line.sales * (rawSales / employeeSales.total);
        salesByBranch.set(
          branchId,
          (salesByBranch.get(branchId) ?? 0) + allocatedSales,
        );
      });
    });

    const costByBranch = new Map(
      branchCosts.map((branch) => [branch.id, branch]),
    );
    const defaultRows = state.branches
      .map((branch) => {
        const cost = costByBranch.get(branch.id);
        return {
          id: branch.id,
          name: branch.name,
          sales: salesByBranch.get(branch.id) ?? 0,
          cost: cost?.total ?? 0,
          employees: cost?.employees ?? 0,
        };
      })
      .filter((branch) => branch.sales > 0 || branch.cost > 0);
    return sortByListMode(
      defaultRows,
      listSortMode,
      (branch) => branch.name,
      (branch) => branch.sales,
    );
  }, [
    branchCosts,
    config.periodEnd,
    config.periodStart,
    listSortMode,
    lines,
    state.branches,
    state.sales,
  ]);
  const positionCostMap = new Map<
    string,
    {
      branchId: string;
      branch: string;
      position: string;
      employees: Set<string>;
      moduleAmounts: Record<string, number>;
      payrollGross: number;
      deductions: number;
      payroll: number;
      social: number;
      isr: number;
      total: number;
    }
  >();
  costAllocations.forEach(({ line, branchId, share }) => {
    const branch = state.branches.find((item) => item.id === branchId);
    const branchName = branch?.name ?? "SIN SUCURSAL";
    const key = `${branchId}|${line.employee.position}`;
    const row = positionCostMap.get(key) ?? {
      branchId,
      branch: branchName,
      position: line.employee.position,
      employees: new Set<string>(),
      moduleAmounts: {},
      payrollGross: 0,
      deductions: 0,
      payroll: 0,
      social: 0,
      isr: 0,
      total: 0,
    };
    const payroll = line.total * share;
    const payrollGross = line.payrollBeforeDeductions * share;
    const deductions = line.totalDeductions * share;
    const social = line.socialCost * share;
    const isr = line.isrCost * share;
    row.employees.add(line.employee.id);
    let assignedPayroll = 0;
    payrollTypeColumns.forEach((module) => {
      const moduleAmount =
        payrollLineTotalsByModule.get(module.id)?.get(line.employee.id) ?? 0;
      if (moduleAmount === 0) return;
      row.moduleAmounts[module.id] =
        (row.moduleAmounts[module.id] ?? 0) + moduleAmount * share;
      assignedPayroll += moduleAmount;
    });
    const unassignedPayroll = line.total - assignedPayroll;
    const fallbackModuleId =
      employeeCommissionPayrollModule(line.employee) ??
      employeeSalaryPayrollModule(line.employee);
    if (
      fallbackModuleId &&
      Math.abs(unassignedPayroll) >= 0.005 &&
      payrollLineTotalsByModule.has(fallbackModuleId)
    ) {
      row.moduleAmounts[fallbackModuleId] =
        (row.moduleAmounts[fallbackModuleId] ?? 0) + unassignedPayroll * share;
    }
    row.payrollGross += payrollGross;
    row.deductions += deductions;
    row.payroll += payroll;
    row.social += social;
    row.isr += isr;
    row.total += payroll + social + isr;
    positionCostMap.set(key, row);
  });
  const positionCosts = sortByListMode(
    Array.from(positionCostMap.values()).sort(
      (a, b) =>
        a.branch.localeCompare(b.branch, "es-MX") ||
        a.position.localeCompare(b.position, "es-MX"),
    ),
    listSortMode,
    (row) => `${row.branch} ${row.position}`,
    (row) => row.total,
  );
  const branchPositionCosts = sortByListMode(
    state.branches
      .map((branch) => ({
        branch,
        rows: positionCosts.filter((row) => row.branchId === branch.id),
      }))
      .filter((item) => item.rows.length > 0),
    listSortMode,
    (item) => item.branch.name,
    (item) => item.rows.reduce((sum, row) => sum + row.total, 0),
  );
  const reconciledTotal = positionCosts.reduce(
    (sum, row) => sum + row.total,
    0,
  );
  const comparisonDelta = Math.abs(totalPayroll - reconciledTotal);
  const periodAdjustments = state.adjustments.filter(
    (adjustment) =>
      adjustment.status === "APPROVED" &&
      adjustment.payrollDate >= config.periodStart &&
      adjustment.payrollDate <= config.periodEnd,
  );
  const periodMovements = state.movements.filter(
    (movement) =>
      movement.status === "APPROVED" &&
      movement.periodStart >= config.periodStart &&
      movement.periodStart <= config.periodEnd,
  );
  const periodViatics = state.viaticsEntries.filter(
    (entry) =>
      entry.status === "APPROVED" &&
      entry.periodStart !== null &&
      entry.periodStart >= config.periodStart &&
      entry.periodStart <= config.periodEnd,
  );
  const reconciliationIssues = [
    ...lines
      .filter(
        (line) =>
          employeeCostBranchIds(line.employee, state.branches).length === 0,
      )
      .map((line) => ({
        id: `employee-${line.employee.id}`,
        source: "NÓMINA",
        concept: line.employee.name,
        detail: `Empleado sin centro de costo válido · ${line.employee.position}`,
      })),
    ...periodAdjustments
      .filter(
        (adjustment) =>
          !state.branches.some((branch) => branch.id === adjustment.branchId),
      )
      .map((adjustment) => ({
        id: `adjustment-${adjustment.id}`,
        source: "MOVIMIENTOS DE NÓMINA",
        concept: adjustment.concept,
        detail: `${adjustment.payrollDate} · ${payrollModuleLabels[adjustment.payrollModule]} · sin sucursal válida`,
      })),
    ...periodMovements
      .filter((movement) => {
        const employee = state.employees.find(
          (item) => item.id === movement.employeeId,
        );
        return (
          !employee ||
          employeeCostBranchIds(employee, state.branches).length === 0
        );
      })
      .map((movement) => ({
        id: `movement-${movement.id}`,
        source: "BONOS Y MULTAS",
        concept: movement.concept,
        detail: `${movement.createdAt} · empleado o centro de costo sin asignar`,
      })),
    ...periodViatics
      .filter(
        (entry) =>
          !state.branches.some((branch) => branch.id === entry.branchId),
      )
      .map((entry) => ({
        id: `viatic-${entry.id}`,
        source: "VIÁTICOS",
        concept:
          state.viaticsConcepts.find(
            (concept) => concept.id === entry.conceptId,
          )?.name ?? entry.id,
        detail: `${entry.requestedAt} · comprobante ${entry.receiptName} · sin sucursal válida`,
      })),
  ];
  const reconciliationSuccessful =
    comparisonDelta < 0.01 && reconciliationIssues.length === 0;
  const reconciliationReportRows = positionCosts.map((row) => ({
    branch: row.branch,
    position: row.position,
    employees: row.employees.size,
    moduleAmounts: row.moduleAmounts,
    payrollGross: row.payrollGross,
    deductions: row.deductions,
    payroll: row.payroll,
    social: row.social,
    isr: row.isr,
    total: row.total,
  }));
  const reconciliationReportConfig = {
    title: "Conciliación de nómina por punto de venta y puesto",
    subtitle: `${config.periodStart} — ${config.periodEnd} · ${reconciliationSuccessful ? "Comparación exitosa" : "Requiere revisión"}`,
    metadata: [
      { label: "Periodo", value: `${config.periodStart} — ${config.periodEnd}` },
      { label: "Reporte", value: "CONCILIACIÓN FINAL" },
      { label: "Alcance", value: "REPORTE GENERAL · EMPRESA COMPLETA" },
      {
        label: "Estado",
        value: reconciliationSuccessful ? "COMPARACIÓN EXITOSA" : "REQUIERE REVISIÓN",
      },
    ],
    metrics: [
      { label: "Ventas", value: money.format(totalSales), detail: "Periodo conciliado" },
      { label: "Antes de descuentos", value: money.format(payrollBeforeDeductions), detail: "Cargo bruto de nómina" },
      { label: "Descuentos", value: money.format(payrollDeductions), detail: "Movimiento de reducción" },
      { label: "Neto a pagar", value: money.format(payrollBase), detail: "Bruto menos descuentos" },
      { label: "Cargas", value: money.format(socialCost + isrCost), detail: "Social + ISR" },
      { label: "Costo general", value: money.format(totalPayroll), detail: `${lines.length} empleados` },
    ],
    analysis: [
      reconciliationSuccessful
        ? "La suma por puesto, tipo de nómina y punto de venta coincide con el consolidado general."
        : `La conciliación presenta una diferencia de ${money.format(comparisonDelta)}.`,
      reconciliationIssues.length === 0
        ? "No existen movimientos del periodo sin sucursal de costo."
        : `${reconciliationIssues.length} movimientos requieren asignación o corrección de sucursal.`,
      `${payrollTypeColumns.length} tipos de nómina alimentan esta conciliación.`,
    ],
    filename: `conciliacion-nomina-${config.periodStart}`,
    sheetName: "Conciliación",
    rows: reconciliationReportRows,
    columns: [
      {
        header: "PUNTO DE VENTA",
        accessor: (row: (typeof reconciliationReportRows)[number]) =>
          row.branch,
        width: 20,
      },
      {
        header: "PUESTO",
        accessor: (row: (typeof reconciliationReportRows)[number]) =>
          row.position,
        width: 24,
      },
      {
        header: "EMPLEADOS",
        accessor: (row: (typeof reconciliationReportRows)[number]) =>
          row.employees,
        width: 12,
      },
      ...payrollTypeColumns.map((module) => ({
        header: module.name,
        accessor: (row: (typeof reconciliationReportRows)[number]) =>
          row.moduleAmounts[module.id] ?? 0,
        format: "currency" as const,
        width: 16,
      })),
      {
        header: "ANTES DE DESCUENTOS",
        accessor: (row: (typeof reconciliationReportRows)[number]) =>
          row.payrollGross,
        format: "currency" as const,
        width: 20,
      },
      {
        header: "DESCUENTOS",
        accessor: (row: (typeof reconciliationReportRows)[number]) =>
          row.deductions,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "NETO NÓMINA",
        accessor: (row: (typeof reconciliationReportRows)[number]) =>
          row.payroll,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "COSTO SOCIAL",
        accessor: (row: (typeof reconciliationReportRows)[number]) =>
          row.social,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "ISR",
        accessor: (row: (typeof reconciliationReportRows)[number]) => row.isr,
        format: "currency" as const,
        width: 14,
      },
      {
        header: "COSTO TOTAL",
        accessor: (row: (typeof reconciliationReportRows)[number]) => row.total,
        format: "currency" as const,
        width: 17,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={TrendingUp}
          label="VENTAS DEL PERIODO"
          value={money.format(totalSales)}
          detail={`Base global ${state.calculationMode === "WITH_VAT" ? "con IVA" : "sin IVA"} · excepciones aplicadas`}
        />
        <Metric
          icon={WalletCards}
          label="ANTES DE DESCUENTOS"
          value={money.format(payrollBeforeDeductions)}
          detail={`Percepciones · variable y bonos ${money.format(totalVariable)}`}
        />
        <Metric
          icon={CircleMinus}
          label="DESCUENTOS"
          value={money.format(payrollDeductions)}
          detail="Multas, préstamos, ajustes y saldos"
        />
        <Metric
          icon={Sparkles}
          label="NETO DE NÓMINA"
          value={money.format(payrollBase)}
          detail="Importe final después de descuentos"
        />
        <Metric
          icon={BadgeCheck}
          label="COSTO GENERAL"
          value={money.format(totalPayroll)}
          detail={`Neto + social ${money.format(socialCost)} + ISR ${money.format(isrCost)} · ${authorized}/${lines.length} validados`}
        />
      </div>

      {run && (
        <Card className="border-[color:var(--border-color)] bg-gradient-to-r from-[color:var(--bg-card)] to-[color:var(--accent-hover)]/35">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-[color:var(--accent)] p-2.5 text-white">
                <FileCheck2 className="h-5 w-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    Corrida {run.periodStart} / {run.periodEnd}
                  </p>
                  <StatusBadge status={run.status} />
                </div>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                  Pago programado{" "}
                  {dateLabel.format(new Date(`${run.payDate}T00:00:00Z`))} ·{" "}
                  {state.calculationMode === "WITH_VAT" ? "CON IVA" : "SIN IVA"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {run.status === "DRAFT" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setRunStatus(run.id, "APPROVED");
                    toast.success("Nómina autorizada en todos los módulos.");
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Autorizar
                </Button>
              )}
              {run.status === "APPROVED" && (
                <Button
                  onClick={() => {
                    setRunStatus(run.id, "PAID");
                    toast.success(
                      "Pago mock registrado y recibos actualizados.",
                    );
                  }}
                >
                  <CircleDollarSign className="mr-2 h-4 w-4" />
                  Marcar pagada
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/reportes/desglose-sucursal">
                  Ver costo por sucursal
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <PayrollConsolidatedSalesAnalytics
        periodLabel={`${config.periodStart} — ${config.periodEnd}`}
        trend={salesTrend}
        branches={branchSales}
        payrollBase={payrollBase}
        socialCost={socialCost}
        isrCost={isrCost}
        totalSales={totalSales}
      />

      <PayrollTable
        lines={lines}
        view="CONSOLIDATED"
        periodStart={config.periodStart}
        periodEnd={config.periodEnd}
        includeSocialCost={includeSocialCost}
        includeIsr={includeIsr}
      />

      <Card className="border-[color:var(--border-color)]">
        <CardHeader>
          <CardTitle className="section-heading uppercase">
            Distribución profesional por sucursal
          </CardTitle>
          <CardDescription>
            Nómina, movimientos y cargas fiscales del periodo mensual
            seleccionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {branchCosts.map((branch) => (
            <div
              key={branch.id}
              className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/25 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[color:var(--text-primary)]">
                    {branch.name}
                  </p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {branch.employees} empleados · movimientos{" "}
                    {money.format(branch.movements)}
                  </p>
                </div>
                <p className="number-display text-base">
                  {money.format(branch.total)}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[color:var(--border-color)] pt-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
                    Nómina
                  </p>
                  <p className="number-display mt-1">
                    {money.format(branch.payroll)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
                    Social
                  </p>
                  <p className="number-display mt-1">
                    {money.format(branch.social)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
                    ISR
                  </p>
                  <p className="number-display mt-1">
                    {money.format(branch.isr)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {(
          [
            "SELLER",
            "SPECIALIST",
            "MANAGEMENT",
            "CALL_CENTER",
            "CONTRACTOR",
          ] as EmployeeCategory[]
        ).map((category) => {
          const categoryLines = lines.filter(
            (line) => line.employee.category === category,
          );
          const total = categoryLines.reduce(
            (sum, line) =>
              sum +
              line.total + line.socialCost + line.isrCost,
            0,
          );
          return (
            <Card key={category} className="border-[color:var(--border-color)]">
              <CardContent className="p-5">
                <p className="label-caps">{categoryLabel(category)}</p>
                <p className="number-display mt-3 text-xl">
                  {money.format(total)}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {categoryLines.length} empleados
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <PayrollModuleAnalytics
        lines={lines}
        periodStart={config.periodStart}
        periodEnd={config.periodEnd}
        title="Consolidado de nómina"
      />

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="section-heading uppercase">
                Conciliación final por puesto y punto de venta
              </CardTitle>
              <CardDescription>
                Solo considera la nómina y los movimientos del periodo{" "}
                {config.periodStart} — {config.periodEnd}.
              </CardDescription>
            </div>
            <ReportExportButtons
              config={reconciliationReportConfig}
              disabled={!positionCosts.length}
              iconOnly
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {reconciliationSuccessful ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 text-emerald-950 dark:bg-emerald-950/25 dark:text-emerald-100">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">Comparación de nómina exitosa</p>
                <p className="mt-1 text-xs opacity-75">
                  El costo general {money.format(totalPayroll)} coincide con la
                  suma por puesto, tipo de nómina y punto de venta. No existen
                  movimientos sin sucursal.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-400 bg-amber-50/85 p-4 text-amber-950 dark:bg-amber-950/25 dark:text-amber-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-semibold">
                    La comparación de nómina requiere revisión
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    Diferencia contable: {money.format(comparisonDelta)} ·{" "}
                    {reconciliationIssues.length} movimientos o registros sin
                    ubicación válida.
                  </p>
                </div>
              </div>
              {reconciliationIssues.length > 0 && (
                <div className="mt-3 divide-y divide-amber-300/60 border-t border-amber-300/60">
                  {reconciliationIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="grid gap-1 py-2 text-xs sm:grid-cols-[180px_1fr_1.4fr]"
                    >
                      <strong>{issue.source}</strong>
                      <span>{issue.concept}</span>
                      <span>{issue.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {branchPositionCosts.map(({ branch, rows }) => {
              const branchPayrollGross = rows.reduce(
                (sum, row) => sum + row.payrollGross,
                0,
              );
              const branchDeductions = rows.reduce(
                (sum, row) => sum + row.deductions,
                0,
              );
              const branchPayroll = rows.reduce(
                (sum, row) => sum + row.payroll,
                0,
              );
              const branchModuleTotals = Object.fromEntries(
                payrollTypeColumns.map((module) => [
                  module.id,
                  rows.reduce(
                    (sum, row) => sum + (row.moduleAmounts[module.id] ?? 0),
                    0,
                  ),
                ]),
              );
              const branchSocial = rows.reduce(
                (sum, row) => sum + row.social,
                0,
              );
              const branchIsr = rows.reduce((sum, row) => sum + row.isr, 0);
              const branchTotal = rows.reduce((sum, row) => sum + row.total, 0);
              return (
                <div
                  key={branch.id}
                  className="overflow-hidden rounded-xl border border-[color:var(--border-color)]"
                >
                  <div className="flex flex-col gap-2 bg-[linear-gradient(115deg,#29231f,#4a3628)] px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/65">
                        Punto de venta
                      </p>
                      <p className="font-semibold">{branch.name}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                      <span>
                        Antes de descuentos{" "}
                        <strong className="number-display">
                          {money.format(branchPayrollGross)}
                        </strong>
                      </span>
                      <span>
                        Descuentos{" "}
                        <strong className="number-display text-rose-200">
                          −{money.format(branchDeductions)}
                        </strong>
                      </span>
                      <span>
                        Neto{" "}
                        <strong className="number-display">
                          {money.format(branchPayroll)}
                        </strong>
                      </span>
                      <span>
                        Social{" "}
                        <strong className="number-display">
                          {money.format(branchSocial)}
                        </strong>
                      </span>
                      <span>
                        ISR{" "}
                        <strong className="number-display">
                          {money.format(branchIsr)}
                        </strong>
                      </span>
                      <span>
                        Total{" "}
                        <strong className="number-display text-[#f1d2ad]">
                          {money.format(branchTotal)}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PUESTO</TableHead>
                          <TableHead className="text-right">
                            EMPLEADOS
                          </TableHead>
                          {payrollTypeColumns.map((module) => (
                            <TableHead
                              key={module.id}
                              className="min-w-32 text-right"
                            >
                              {module.name}
                            </TableHead>
                          ))}
                          <TableHead className="text-right">
                            ANTES DE DESCUENTOS
                          </TableHead>
                          <TableHead className="text-right">
                            DESCUENTOS
                          </TableHead>
                          <TableHead className="text-right">
                            NETO NÓMINA
                          </TableHead>
                          <TableHead className="text-right">
                            COSTO SOCIAL
                          </TableHead>
                          <TableHead className="text-right">ISR</TableHead>
                          <TableHead className="text-right">
                            COSTO TOTAL
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={`${row.branchId}-${row.position}`}>
                            <TableCell className="font-semibold">
                              {row.position}
                            </TableCell>
                            <TableCell className="number-display text-right">
                              {row.employees.size}
                            </TableCell>
                            {payrollTypeColumns.map((module) => (
                              <TableCell
                                key={module.id}
                                className="number-display text-right"
                              >
                                {money.format(
                                  row.moduleAmounts[module.id] ?? 0,
                                )}
                              </TableCell>
                            ))}
                            <TableCell className="number-display text-right">
                              {money.format(row.payrollGross)}
                            </TableCell>
                            <TableCell className="number-display text-right text-rose-700 dark:text-rose-300">
                              −{money.format(row.deductions)}
                            </TableCell>
                            <TableCell className="number-display text-right">
                              {money.format(row.payroll)}
                            </TableCell>
                            <TableCell className="number-display text-right">
                              {money.format(row.social)}
                            </TableCell>
                            <TableCell className="number-display text-right">
                              {money.format(row.isr)}
                            </TableCell>
                            <TableCell className="number-display text-right font-semibold">
                              {money.format(row.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-right font-semibold"
                          >
                            TOTAL {branch.name}
                          </TableCell>
                          {payrollTypeColumns.map((module) => (
                            <TableCell
                              key={module.id}
                              className="number-display text-right"
                            >
                              {money.format(
                                Number(branchModuleTotals[module.id] ?? 0),
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="number-display text-right">
                            {money.format(branchPayrollGross)}
                          </TableCell>
                          <TableCell className="number-display text-right text-rose-700 dark:text-rose-300">
                            −{money.format(branchDeductions)}
                          </TableCell>
                          <TableCell className="number-display text-right">
                            {money.format(branchPayroll)}
                          </TableCell>
                          <TableCell className="number-display text-right">
                            {money.format(branchSocial)}
                          </TableCell>
                          <TableCell className="number-display text-right">
                            {money.format(branchIsr)}
                          </TableCell>
                          <TableCell className="number-display text-right text-base">
                            {money.format(branchTotal)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--accent)]/40 bg-[color:var(--accent-hover)]/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Suma de todas las nóminas cargadas
              </p>
              <p className="text-xs text-[color:var(--text-muted)]">
                {positionCosts.length} puestos · {payrollTypeColumns.length}{" "}
                tipos de nómina · {branchPositionCosts.length} puntos de venta
              </p>
            </div>
            <p className="number-display text-2xl font-semibold">
              {money.format(reconciledTotal)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PayrollDemoPage({ view }: { view: PayrollView }) {
  const {
    state,
    payrollLines,
    periodOptions,
    setCalculationMode,
    closeRunAndOpenNextPeriod,
    setModuleTaxInclusion,
    setPeriodTaxInclusion,
    setRunStatus,
  } = usePayrollDemo();
  const moduleDefinition = state.payrollModules.find(
    (item) => item.id === view,
  );
  const config =
    state.periodConfigs.find((item) => item.module === view) ??
    state.periodConfigs[0]!;
  const [periodDisplay, setPeriodDisplay] = useState<PeriodDisplay>(
    view === "CONSOLIDATED" ? "MONTHLY" : "FORTNIGHT",
  );
  const [selectedFortnight, setSelectedFortnight] = useState(
    config.periodStart,
  );
  const [selectedMonth, setSelectedMonth] = useState(
    config.periodStart.slice(0, 7),
  );
  const [runDialog, setRunDialog] = useState(false);
  const monthOptions = useMemo(
    () =>
      Array.from(new Set(periodOptions.map((item) => item.start.slice(0, 7)))),
    [periodOptions],
  );
  const selectedPeriod = useMemo(() => {
    if (periodDisplay === "MONTHLY") return monthlyPeriod(selectedMonth);
    const period = periodOptions.find(
      (item) => item.start === selectedFortnight,
    );
    return period
      ? {
          start: period.start,
          end: period.end,
          label: fortnightLabel(period.start),
        }
      : {
          start: config.periodStart,
          end: config.periodEnd,
          label: fortnightLabel(config.periodStart),
        };
  }, [
    config.periodEnd,
    config.periodStart,
    periodDisplay,
    periodOptions,
    selectedFortnight,
    selectedMonth,
  ]);
  const periodTaxInclusion = periodTaxInclusionForRange(
    state.periodTaxInclusions,
    selectedPeriod.start,
    selectedPeriod.end,
  );
  const controlsGlobalTaxes = view === "CONSOLIDATED";
  const moduleTaxInclusion = controlsGlobalTaxes
    ? undefined
    : moduleTaxInclusionForRange(
        state.periodTaxInclusions,
        selectedPeriod.start,
        selectedPeriod.end,
        view as Exclude<PayrollModule, "CONSOLIDATED">,
      );
  const globalIncludeSocialCost =
    periodTaxInclusion?.includeSocialCost ?? true;
  const globalIncludeIsr = periodTaxInclusion?.includeIsr ?? true;
  const includeSocialCost =
    globalIncludeSocialCost ||
    (moduleTaxInclusion?.includeSocialCost ?? false);
  const includeIsr =
    globalIncludeIsr || (moduleTaxInclusion?.includeIsr ?? false);
  const calculationConfig = useMemo<DemoPayrollPeriodConfig>(
    () => ({
      ...config,
      periodStart: selectedPeriod.start,
      periodEnd: selectedPeriod.end,
      cutoffDate: selectedPeriod.end,
      label: selectedPeriod.label,
    }),
    [config, selectedPeriod],
  );
  const mode = state.calculationMode;
  const allLines = payrollLines(
    selectedPeriod.start,
    mode,
    selectedPeriod.end,
    view,
  );
  const lines = allLines;
  const selectedRun = state.runs.find(
    (run) =>
      run.module === view &&
      run.periodStart === selectedPeriod.start &&
      run.periodEnd === selectedPeriod.end,
  );
  const payrollLocked = Boolean(selectedRun && selectedRun.status !== "DRAFT");
  const taxPeriodLocked = state.runs.some(
    (run) =>
      run.periodStart === selectedPeriod.start &&
      run.periodEnd === selectedPeriod.end &&
      run.status !== "DRAFT",
  );
  const taxControlLocked = controlsGlobalTaxes
    ? taxPeriodLocked
    : payrollLocked;
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const isMaster = activeEmployee?.roleId === "role-admin";
  const allocatedBranchCount = new Set(
    lines.flatMap((line) => {
      const allocationMode = payrollCostAllocationMode(
        state.payrollCostAllocationModes,
        line.employee.id,
        selectedPeriod.start,
        selectedPeriod.end,
      );
      return employeeCostAllocationShares({
        employee: line.employee,
        branches: state.branches,
        sales: state.sales,
        periodStart: selectedPeriod.start,
        periodEnd: selectedPeriod.end,
        mode: allocationMode,
      }).map((allocation) => allocation.branchId);
    }),
  ).size;

  const titles = (
    {
      CONSOLIDATED: [
        "Consolidado de nómina",
        "Visualiza, autoriza y prepara el pago de todos los esquemas en un solo lugar.",
      ],
      FIXED: [
        "Nómina de salario fijo",
        "Incluye a cualquier puesto con sueldo asignado; no suma comisiones ni otros movimientos.",
      ],
      SPECIALIST: [
        "Nómina de especialistas",
        "Especialistas y facialistas con salario fijo por periodo.",
      ],
      COMMISSION: [
        "Nómina de comisiones",
        "Todos los puestos con comisión, movimientos y deducciones del periodo; nunca suma sueldo base.",
      ],
      CONTRACTOR: [
        "Nómina por honorarios",
        "Servicios facturados con IVA, retenciones y pago neto desglosado.",
      ],
    } as const
  )[
    view as
      | "CONSOLIDATED"
      | "FIXED"
      | "SPECIALIST"
      | "COMMISSION"
      | "CONTRACTOR"
  ] ?? [
    moduleDefinition?.name ?? "Módulo de nómina",
    moduleDefinition?.description ??
      "Módulo configurable integrado a reportes y costos.",
  ];
  const commissionModule = Boolean(
    moduleDefinition?.concepts.includes("COMMISSION"),
  );

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-[color:var(--accent)] text-[color:var(--text-secondary)]"
            >
              DEMO FRONTEND
            </Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Sin conexión a backend
            </span>
          </div>
          <h1 className="page-title">{titles[0]}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[color:var(--text-muted)]">
            {titles[1]}
          </p>
        </div>
        {view !== "CONSOLIDATED" && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/configuracion">
                <Settings2 className="mr-2 h-4 w-4" />
                Configuración
              </Link>
            </Button>
            {view !== "FIXED" && view !== "SPECIALIST" ? (
              <Button
                onClick={() => setRunDialog(true)}
                disabled={payrollLocked}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva nómina
              </Button>
            ) : null}
          </div>
        )}
      </header>

      {view !== "CONSOLIDATED" && (
        <Card className="relative overflow-hidden border-[color:var(--accent)]/45 bg-[linear-gradient(115deg,var(--bg-card)_0%,var(--accent-hover)_100%)] shadow-sm">
          <span
            aria-hidden="true"
            className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[color:var(--accent)]/10 blur-2xl"
          />
          <CardContent className="relative flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--accent)]/35 bg-[color:var(--accent)]/15 text-[color:var(--text-secondary)] shadow-sm">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    Periodo seleccionado para cálculo
                  </p>
                  <Badge variant="outline">
                    {periodDisplay === "MONTHLY" ? "MENSUAL" : "QUINCENAL"}
                  </Badge>
                </div>
                <p className="mt-1 font-brand text-2xl tracking-wide text-[color:var(--text-primary)]">
                  {selectedPeriod.label}
                </p>
                <p className="mt-1 text-sm font-medium text-[color:var(--text-secondary)]">
                  Del{" "}
                  {dateLabel.format(
                    new Date(`${selectedPeriod.start}T00:00:00Z`),
                  )}{" "}
                  al{" "}
                  {dateLabel.format(
                    new Date(`${selectedPeriod.end}T00:00:00Z`),
                  )}
                </p>
              </div>
            </div>
            <div className="max-w-xl rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)]/80 px-4 py-3 backdrop-blur">
              <p className="text-sm font-semibold">Alcance del periodo</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                Empleados, ventas, movimientos, costos y reportes se calculan
                exclusivamente dentro de estas fechas. Cambia la quincena o el
                mes en el selector inferior.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-[color:var(--border-color)]">
        <CardContent className="flex flex-col gap-4 p-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="space-y-2">
              <Label>Visualización y cálculo</Label>
              <div
                className="inline-flex w-full rounded-lg border border-[color:var(--border-color)] p-1 sm:w-auto"
                role="group"
                aria-label="Vista del periodo"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={periodDisplay === "FORTNIGHT" ? "default" : "ghost"}
                  aria-pressed={periodDisplay === "FORTNIGHT"}
                  onClick={() => setPeriodDisplay("FORTNIGHT")}
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  Quincenal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={periodDisplay === "MONTHLY" ? "default" : "ghost"}
                  aria-pressed={periodDisplay === "MONTHLY"}
                  onClick={() => setPeriodDisplay("MONTHLY")}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Mensual
                </Button>
              </div>
            </div>
            <div className="min-w-0 space-y-2 lg:w-[310px]">
              <Label htmlFor={`period-selector-${view}`}>
                Periodo a calcular
              </Label>
              {periodDisplay === "FORTNIGHT" ? (
                <Select
                  value={selectedFortnight}
                  onValueChange={setSelectedFortnight}
                >
                  <SelectTrigger id={`period-selector-${view}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((item) => (
                      <SelectItem key={item.start} value={item.start}>
                        {fortnightLabel(item.start)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id={`period-selector-${view}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month} value={month}>
                        {monthlyPeriod(month).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label>Cargas incluidas en el cálculo</Label>
              <div className="flex flex-wrap gap-2">
                <CostToggle
                  label={
                    controlsGlobalTaxes
                      ? "Costo social global"
                      : globalIncludeSocialCost
                        ? "Costo social · global"
                        : "Costo social · esta nómina"
                  }
                  checked={includeSocialCost}
                  disabled={
                    taxControlLocked ||
                    !isMaster ||
                    (!controlsGlobalTaxes && globalIncludeSocialCost)
                  }
                  onCheckedChange={(checked) => {
                    if (controlsGlobalTaxes) {
                      setPeriodTaxInclusion(
                        selectedPeriod.start,
                        selectedPeriod.end,
                        { includeSocialCost: checked },
                      );
                    } else {
                      setModuleTaxInclusion(
                        view as Exclude<PayrollModule, "CONSOLIDATED">,
                        selectedPeriod.start,
                        selectedPeriod.end,
                        { includeSocialCost: checked },
                      );
                    }
                    toast.success(
                      "Costo social " +
                        (checked ? "incluido" : "excluido") +
                        " para " +
                        selectedPeriod.label.toLocaleLowerCase("es-MX") +
                        (controlsGlobalTaxes
                          ? " en todos los módulos."
                          : ` únicamente en ${titles[0].toLocaleLowerCase("es-MX")}.`),
                    );
                  }}
                />
                <CostToggle
                  label={
                    controlsGlobalTaxes
                      ? "ISR global"
                      : globalIncludeIsr
                        ? "ISR · global"
                        : "ISR · esta nómina"
                  }
                  checked={includeIsr}
                  disabled={
                    taxControlLocked ||
                    !isMaster ||
                    (!controlsGlobalTaxes && globalIncludeIsr)
                  }
                  onCheckedChange={(checked) => {
                    if (controlsGlobalTaxes) {
                      setPeriodTaxInclusion(
                        selectedPeriod.start,
                        selectedPeriod.end,
                        { includeIsr: checked },
                      );
                    } else {
                      setModuleTaxInclusion(
                        view as Exclude<PayrollModule, "CONSOLIDATED">,
                        selectedPeriod.start,
                        selectedPeriod.end,
                        { includeIsr: checked },
                      );
                    }
                    toast.success(
                      "ISR " +
                        (checked ? "incluido" : "excluido") +
                        " para " +
                        selectedPeriod.label.toLocaleLowerCase("es-MX") +
                        (controlsGlobalTaxes
                          ? " en todos los módulos."
                          : ` únicamente en ${titles[0].toLocaleLowerCase("es-MX")}.`),
                    );
                  }}
                />
              </div>
              {!controlsGlobalTaxes && (
                <p className="mt-2 text-[10px] text-[color:var(--text-muted)]">
                  {globalIncludeSocialCost || globalIncludeIsr
                    ? "Las cargas activas por control global se aplican a todas las nóminas y no pueden apagarse desde este módulo."
                    : "El control global está apagado. Cada interruptor afecta únicamente esta nómina."}
                </p>
              )}
              {!isMaster && (
                <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                  <LockKeyhole className="h-3 w-3" />
                  Solo un usuario máster puede autorizar la activación o el
                  apagado de estas cargas.
                </p>
              )}
            </div>
            {commissionModule ? (
              <div className="space-y-2">
                <Label>Base de comisión global</Label>
                <div
                  className="inline-flex w-full rounded-lg border border-[color:var(--border-color)] p-1 sm:w-auto"
                  role="group"
                  aria-label="Base de comisión"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "WITH_VAT" ? "default" : "ghost"}
                    aria-pressed={mode === "WITH_VAT"}
                    disabled={payrollLocked}
                    onClick={() => {
                      setCalculationMode("WITH_VAT");
                      toast.success(
                        "Cálculo con IVA aplicado a todos los módulos relacionados.",
                      );
                    }}
                  >
                    Con IVA
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "WITHOUT_VAT" ? "default" : "ghost"}
                    aria-pressed={mode === "WITHOUT_VAT"}
                    disabled={payrollLocked}
                    onClick={() => {
                      setCalculationMode("WITHOUT_VAT");
                      toast.success(
                        "Cálculo sin IVA aplicado a todos los módulos relacionados.",
                      );
                    }}
                  >
                    Sin IVA
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {view === "CONSOLIDATED" ? (
        <ConsolidatedDashboard
          config={calculationConfig}
          lines={lines}
          includeSocialCost={includeSocialCost}
          includeIsr={includeIsr}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              icon={UsersRound}
              label="EMPLEADOS"
              value={String(lines.length)}
              detail="Incluidos en esta nómina"
            />
            <Metric
              icon={Building2}
              label="SUCURSALES"
              value={String(allocatedBranchCount)}
              detail="Centros de costo involucrados"
            />
            <Metric
              icon={Clock3}
              label="COSTO TOTAL"
              value={money.format(
                lines.reduce(
                  (sum, line) =>
                    sum +
                    line.total + line.socialCost + line.isrCost,
                  0,
                ),
              )}
              detail="Nómina + cargas generales o excepciones individuales"
            />
          </div>
          {(view === "FIXED" || view === "SPECIALIST") && (
            <DoublePayDaysPanel
              lines={lines}
              view={view}
              periodStart={selectedPeriod.start}
              periodEnd={selectedPeriod.end}
              payrollLocked={payrollLocked}
            />
          )}
          {selectedRun && (
            <Card
              className={`border-[color:var(--border-color)] ${payrollLocked ? "bg-[linear-gradient(110deg,var(--bg-card),rgba(53,79,61,.12))]" : "bg-[linear-gradient(110deg,var(--bg-card),var(--accent-hover))]"}`}
            >
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)]">
                    {payrollLocked ? (
                      <LockKeyhole className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                    ) : (
                      <FileCheck2 className="h-4 w-4 text-[color:var(--text-secondary)]" />
                    )}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {payrollLocked
                          ? "Nómina protegida contra modificaciones"
                          : "Cierre de la corrida"}
                      </p>
                      <StatusBadge status={selectedRun.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                      {payrollLocked
                        ? "Importes, cargas y movimientos están bloqueados. Solo un código maestro autorizado puede reabrir esta corrida."
                        : "Al cerrar, la corrida se bloquea y se habilita en Dispersión."}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRun.status === "DRAFT" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        const nextPeriod =
                          periodDisplay === "MONTHLY"
                            ? (() => {
                                const currentMonth = new Date(
                                  `${selectedPeriod.start.slice(0, 7)}-01T12:00:00`,
                                );
                                currentMonth.setMonth(
                                  currentMonth.getMonth() + 1,
                                );
                                return monthlyPeriod(
                                  currentMonth.toISOString().slice(0, 7),
                                );
                              })()
                            : [...periodOptions]
                                .filter(
                                  (period) =>
                                    period.start > selectedPeriod.end,
                                )
                                .sort((left, right) =>
                                  left.start.localeCompare(right.start),
                                )[0];
                        if (!nextPeriod) {
                          toast.error(
                            "No fue posible preparar el siguiente periodo.",
                          );
                          return;
                        }
                        const payDate = new Date(
                          `${nextPeriod.end}T12:00:00`,
                        );
                        payDate.setDate(payDate.getDate() + 3);
                        closeRunAndOpenNextPeriod(
                          selectedRun.id,
                          {
                            start: nextPeriod.start,
                            end: nextPeriod.end,
                            payDate: payDate.toISOString().slice(0, 10),
                            label: nextPeriod.label,
                          },
                          lines.map((line) => ({
                            employeeId: line.employee.id,
                            amount: line.newNegativeBalance,
                          })),
                        );
                        if (periodDisplay === "MONTHLY")
                          setSelectedMonth(nextPeriod.start.slice(0, 7));
                        else setSelectedFortnight(nextPeriod.start);
                        toast.success(
                          `Nómina cerrada para pago. Se abrió ${nextPeriod.label.toLocaleLowerCase("es-MX")}.`,
                        );
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Cerrar para pago
                    </Button>
                  ) : (
                    <>
                      <Button asChild size="sm">
                        <Link href="/dispersion-nomina">
                          <CircleDollarSign className="mr-2 h-4 w-4" />
                          Ver dispersión
                        </Link>
                      </Button>
                      <MasterReopenDialog runId={selectedRun.id} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <PayrollTable
            lines={lines}
            view={view}
            periodStart={selectedPeriod.start}
            periodEnd={selectedPeriod.end}
            includeSocialCost={includeSocialCost}
            includeIsr={includeIsr}
          />
          <PayrollModuleAnalytics
            lines={lines}
            periodStart={selectedPeriod.start}
            periodEnd={selectedPeriod.end}
            title={titles[0] ?? "Nómina"}
          />
        </>
      )}
      <RunDialog
        key={`${view}-${selectedPeriod.start}-${selectedPeriod.end}`}
        open={runDialog}
        onOpenChange={setRunDialog}
        module={view}
        config={calculationConfig}
        mode={mode}
        onModeChange={setCalculationMode}
      />
    </div>
  );
}
