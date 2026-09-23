"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Gift,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Search,
  Store,
  UsersRound,
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
import { ReportExportButtons } from "./report-export-buttons";
import {
  type DemoPayrollRun,
  type EmployeePayrollLine,
  temporaryBonusAwardsForPeriod,
  usePayrollDemo,
} from "./payroll-demo-context";
import { employeeCostAllocationShares } from "./payroll-cost-branch-selector";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function shortPeriodLabel(start: string) {
  const date = new Date(`${start}T00:00:00Z`);
  const month = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  const capitalized =
    month.charAt(0).toLocaleUpperCase("es-MX") + month.slice(1);
  return `${capitalized} (${date.getUTCDate() === 1 ? "1.ª" : "2.ª"} quincena)`;
}

export function PayrollCommissionCalculationDemo() {
  const {
    state,
    currentPeriod,
    periodOptions,
    payrollLines,
    createRun,
    closeCommissionRun,
    reopenCommissionRun,
    resetCommissionApprovals,
    setCalculationMode,
    setCommissionModeOverride,
  } = usePayrollDemo();
  const [periodStart, setPeriodStart] = useState(currentPeriod.start);
  const period =
    periodOptions.find((item) => item.start === periodStart) ?? currentPeriod;
  const activeRun = state.runs.find(
    (item) =>
      item.module === "COMMISSION" &&
      item.periodStart === period.start &&
      item.periodEnd === period.end,
  );
  const payrollLocked = Boolean(activeRun && activeRun.status !== "DRAFT");
  const calculationMode = activeRun?.mode ?? state.calculationMode;
  const [payDate, setPayDate] = useState(activeRun?.payDate ?? period.end);
  const [draftMode, setDraftMode] = useState<DemoPayrollRun["mode"]>(
    state.calculationMode,
  );
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);
  const [showMissing, setShowMissing] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [masterCode, setMasterCode] = useState("");
  const lines = useMemo(
    () => payrollLines(period.start, calculationMode, period.end, "COMMISSION"),
    [calculationMode, payrollLines, period.end, period.start],
  );
  const consolidatedActivityLines = useMemo(
    () =>
      payrollLines(
        period.start,
        calculationMode,
        period.end,
        "CONSOLIDATED",
      ).filter(
        (line) =>
          line.grossSales > 0 || line.commission > 0 || line.bonuses > 0,
      ),
    [calculationMode, payrollLines, period.end, period.start],
  );
  const detailRows = useMemo(
    () =>
      lines.map((line) => {
        const grossSales = state.sales
          .filter(
            (sale) =>
              sale.employeeId === line.employee.id &&
              sale.date >= period.start &&
              sale.date <= period.end,
          )
          .reduce((sum, sale) => sum + sale.amount, 0);
        const branch = state.branches.find(
          (item) => item.id === line.employee.branchId,
        );
        const approvalStatus = state.decisions.find(
          (decision) =>
            decision.employeeId === line.employee.id &&
            decision.periodStart === period.start,
        )?.status;
        return {
          line,
          branch: branch?.name ?? "SIN SUCURSAL",
          grossSales,
          netSales: grossSales / 1.16,
          approvalStatus,
        };
      }),
    [
      lines,
      period.end,
      period.start,
      state.branches,
      state.decisions,
      state.sales,
    ],
  );
  const approvedReceiptCount = detailRows.filter(
    (row) => row.approvalStatus === "AUTHORIZED",
  ).length;
  const pendingReceiptCount = detailRows.length - approvedReceiptCount;
  const masterEmployee = state.employees.find(
    (employee) =>
      employee.active &&
      employee.roleId === "role-admin" &&
      employee.secondaryAccessKey,
  );
  const missingScheme = detailRows.filter(
    (row) => row.line.schemeName === "SIN ESQUEMA",
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const positionOptions = Array.from(
    new Set(detailRows.map((row) => row.line.employee.position)),
  ).sort((left, right) => left.localeCompare(right, "es-MX"));
  const branchOptions = Array.from(
    new Set(detailRows.map((row) => row.branch)),
  ).sort((left, right) => left.localeCompare(right, "es-MX"));
  const filteredRows = detailRows.filter((row) => {
    const matchesSearch =
      !normalizedSearch ||
      `${row.line.employee.name} ${row.line.employee.position} ${row.branch} ${row.line.schemeName}`
        .toLocaleLowerCase("es-MX")
        .includes(normalizedSearch);
    return (
      matchesSearch &&
      (positionFilter === "ALL" ||
        row.line.employee.position === positionFilter) &&
      (branchFilter === "ALL" || row.branch === branchFilter)
    );
  });
  const filteredDeductions = filteredRows.reduce(
    (sum, row) =>
      sum +
      row.line.fines +
      row.line.loanDeduction +
      row.line.externalDeductions +
      row.line.viaticsDeductions +
      row.line.carriedNegativeBalance,
    0,
  );
  const filteredAdjustments = filteredRows.reduce(
    (sum, row) =>
      sum +
      row.line.externalAdditions -
      row.line.externalDeductions +
      row.line.viaticsAdditions -
      row.line.viaticsDeductions,
    0,
  );
  const effectivePageSize =
    pageSize === "ALL" ? Math.max(filteredRows.length, 1) : Number(pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / effectivePageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );
  const visibleStart =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const visibleEnd = Math.min(
    currentPage * effectivePageSize,
    filteredRows.length,
  );
  const selectedSales = detailRows.reduce(
    (sum, row) => sum + row.line.sales,
    0,
  );
  const calculatedCommission = detailRows.reduce(
    (sum, row) => sum + row.line.commission,
    0,
  );
  const calculatedBonuses = detailRows.reduce(
    (sum, row) => sum + row.line.bonuses,
    0,
  );
  const consolidatedSales = consolidatedActivityLines.reduce(
    (sum, line) => sum + line.sales,
    0,
  );
  const consolidatedCommission = consolidatedActivityLines.reduce(
    (sum, line) => sum + line.commission,
    0,
  );
  const consolidatedBonuses = consolidatedActivityLines.reduce(
    (sum, line) => sum + line.bonuses,
    0,
  );
  const salesDifference = selectedSales - consolidatedSales;
  const commissionDifference = calculatedCommission - consolidatedCommission;
  const bonusDifference = calculatedBonuses - consolidatedBonuses;
  const consolidatedReconciled =
    Math.abs(salesDifference) < 0.01 &&
    Math.abs(commissionDifference) < 0.01 &&
    Math.abs(bonusDifference) < 0.01;
  const payrollTotal = detailRows.reduce((sum, row) => sum + row.line.total, 0);
  const deductions = detailRows.reduce(
    (sum, row) =>
      sum +
      row.line.fines +
      row.line.loanDeduction +
      row.line.externalDeductions +
      row.line.viaticsDeductions +
      row.line.carriedNegativeBalance,
    0,
  );
  const adjustments = detailRows.reduce(
    (sum, row) =>
      sum +
      row.line.externalAdditions -
      row.line.externalDeductions +
      row.line.viaticsAdditions -
      row.line.viaticsDeductions,
    0,
  );
  const exportRows = filteredRows.map((row) => ({
    employee: row.line.employee.name,
    branch: row.branch,
    grossSales: row.grossSales,
    netSales: row.netSales,
    mode: row.line.calculationMode === "WITH_VAT" ? "CON IVA" : "SIN IVA",
    scheme: row.line.schemeName,
    rate: row.line.rate,
    commission: row.line.commission,
    bonus: row.line.bonuses,
    fine: row.line.fines,
    loan: row.line.loanDeduction,
    carriedBalance: row.line.carriedNegativeBalance,
    pendingBalance: row.line.newNegativeBalance,
    approval: row.approvalStatus === "AUTHORIZED" ? "APROBADO" : "",
    total: row.line.total,
  }));
  const exportConfig = {
    title: "Cálculo de comisiones",
    subtitle: `${period.start} — ${period.end} · Base global ${calculationMode === "WITH_VAT" ? "con IVA" : "sin IVA"}`,
    metadata: [
      { label: "Periodo", value: `${period.start} — ${period.end}` },
      { label: "Tipo de nómina", value: "COMISIONES" },
      {
        label: "Puesto",
        value: positionFilter === "ALL" ? "TODOS" : positionFilter,
      },
      {
        label: "Sucursal",
        value: branchFilter === "ALL" ? "EMPRESA COMPLETA" : branchFilter,
      },
      {
        label: "Alcance",
        value:
          positionFilter === "ALL" && branchFilter === "ALL" && !search.trim()
            ? "REPORTE GENERAL"
            : "SELECCIÓN FILTRADA",
      },
      {
        label: "Base de cálculo",
        value: calculationMode === "WITH_VAT" ? "CON IVA" : "SIN IVA",
      },
    ],
    metrics: [
      {
        label: "Ventas calculadas",
        value: money.format(
          filteredRows.reduce((sum, row) => sum + row.line.sales, 0),
        ),
        detail: "Selección exportada",
      },
      {
        label: "Nómina total",
        value: money.format(
          filteredRows.reduce((sum, row) => sum + row.line.total, 0),
        ),
        detail: `${filteredRows.length} empleados`,
      },
      {
        label: "Deducciones",
        value: money.format(filteredDeductions),
        detail: "Multas, préstamos y ajustes",
      },
      {
        label: "Conciliación",
        value: consolidatedReconciled ? "CUADRADA" : "REVISAR",
        detail: "Ventas, comisiones y bonos contra Consolidado",
      },
    ],
    analysis: [
      `${filteredRows.filter((row) => row.approvalStatus === "AUTHORIZED").length} de ${filteredRows.length} recibos de la selección aparecen aprobados por el personal.`,
      `La selección de comisiones suma ${money.format(filteredRows.reduce((sum, row) => sum + row.line.total, 0))}.`,
      `La conciliación general contra Consolidado ${consolidatedReconciled ? "está cuadrada" : "presenta diferencias"}: ventas ${money.format(salesDifference)}, comisiones ${money.format(commissionDifference)} y bonos ${money.format(bonusDifference)}.`,
      `El archivo incluye ventas con IVA y sin IVA para auditar la base aplicada a cada empleado.`,
    ],
    filename: `calculo-comisiones-${period.start}`,
    sheetName: "Comisiones",
    orientation: "landscape" as const,
    rows: exportRows,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: (typeof exportRows)[number]) => row.employee,
        width: 30,
      },
      {
        header: "SUCURSAL",
        accessor: (row: (typeof exportRows)[number]) => row.branch,
        width: 18,
      },
      {
        header: "VENTAS CON IVA",
        accessor: (row: (typeof exportRows)[number]) => row.grossSales,
        format: "currency" as const,
        width: 18,
      },
      {
        header: "VENTAS SIN IVA",
        accessor: (row: (typeof exportRows)[number]) => row.netSales,
        format: "currency" as const,
        width: 18,
      },
      {
        header: "BASE",
        accessor: (row: (typeof exportRows)[number]) => row.mode,
        width: 14,
      },
      {
        header: "ESQUEMA",
        accessor: (row: (typeof exportRows)[number]) => row.scheme,
        width: 24,
      },
      {
        header: "PORCENTAJE",
        accessor: (row: (typeof exportRows)[number]) => row.rate,
        format: "percent" as const,
        width: 14,
      },
      {
        header: "COMISIÓN",
        accessor: (row: (typeof exportRows)[number]) => row.commission,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "BONO",
        accessor: (row: (typeof exportRows)[number]) => row.bonus,
        format: "currency" as const,
        width: 14,
      },
      {
        header: "MULTA",
        accessor: (row: (typeof exportRows)[number]) => row.fine,
        format: "currency" as const,
        width: 14,
      },
      {
        header: "PRÉSTAMO",
        accessor: (row: (typeof exportRows)[number]) => row.loan,
        format: "currency" as const,
        width: 14,
      },
      {
        header: "SALDO ANTERIOR",
        accessor: (row: (typeof exportRows)[number]) => row.carriedBalance,
        format: "currency" as const,
        width: 17,
      },
      {
        header: "SALDO PENDIENTE",
        accessor: (row: (typeof exportRows)[number]) => row.pendingBalance,
        format: "currency" as const,
        width: 18,
      },
      {
        header: "APROBACIÓN",
        accessor: (row: (typeof exportRows)[number]) => row.approval,
        width: 15,
      },
      {
        header: "TOTAL PAGO",
        accessor: (row: (typeof exportRows)[number]) => row.total,
        format: "currency" as const,
        width: 18,
      },
    ],
  };

  useEffect(
    () => setPage(1),
    [branchFilter, pageSize, periodStart, positionFilter, search],
  );

  useEffect(() => {
    setPayDate(activeRun?.payDate ?? period.end);
    setDraftMode(activeRun?.mode ?? state.calculationMode);
    setMasterCode("");
  }, [
    activeRun?.id,
    activeRun?.mode,
    activeRun?.payDate,
    period.end,
    state.calculationMode,
  ]);

  function saveAndRecalculate() {
    if (payrollLocked) {
      toast.error(
        "La nómina está cerrada. Reábrela con código maestro antes de modificar el cálculo.",
      );
      return;
    }
    const payrollChanged =
      !activeRun ||
      activeRun.mode !== draftMode ||
      activeRun.payDate !== payDate;
    setCalculationMode(draftMode);
    createRun("COMMISSION", period.start, period.end, draftMode, payDate);
    if (payrollChanged)
      resetCommissionApprovals(
        period.start,
        detailRows.map((row) => row.line.employee.id),
        "NÓMINA RECALCULADA · REQUIERE NUEVA CONFIRMACIÓN",
      );
    toast.success(
      "Borrador guardado y todos los reportes fueron recalculados.",
    );
  }

  function closePayroll() {
    if (!activeRun || activeRun.status !== "DRAFT") {
      toast.error("No existe una corrida abierta para cerrar.");
      return;
    }
    closeCommissionRun(activeRun.id);
    setCloseDialogOpen(false);
    toast.success(
      "Nómina cerrada manualmente. Los importes quedaron bloqueados.",
    );
  }

  function reopenPayroll() {
    if (!activeRun || !masterEmployee?.secondaryAccessKey) {
      toast.error("No existe un código máster disponible.");
      return;
    }
    if (masterCode !== masterEmployee.secondaryAccessKey) {
      toast.error("Código máster incorrecto.");
      setMasterCode("");
      return;
    }
    reopenCommissionRun(
      activeRun.id,
      masterCode,
      "CORRECCIÓN AUTORIZADA EN CÁLCULO DE COMISIONES",
    );
    setReopenDialogOpen(false);
    setMasterCode("");
    toast.success(
      "Nómina reabierta. Cada cambio revocará la confirmación del personal afectado.",
    );
  }

  return (
    <div className="space-y-7">
      <header>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">SUBMENÚ INDEPENDIENTE</Badge>
          <span className="text-xs text-[color:var(--text-muted)]">
            Cálculo auditable por empleado
          </span>
        </div>
        <h1 className="page-title">Cálculo de comisiones</h1>
        <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
          Configura la corrida, aplica excepciones de IVA por empleado y revisa
          cada concepto antes del pago.
        </p>
      </header>

      <Card className="overflow-hidden border-[color:var(--border-color)] bg-[linear-gradient(135deg,#24211e_0%,#332a23_58%,#5d4631_150%)] text-white shadow-xl">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 border-b border-white/15 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">
                Periodo seleccionado
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="number-display text-lg">
                  {period.start} — {period.end}
                </p>
                <Badge className="border-white/15 bg-white/10 text-white">
                  {activeRun?.status === "APPROVED"
                    ? "CERRADA"
                    : activeRun?.status === "PAID"
                      ? "PAGADA"
                      : "BORRADOR"}
                </Badge>
              </div>
              {activeRun?.status !== "DRAFT" ? (
                <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/55">
                  {activeRun?.closureReason === "ALL_RECEIPTS_AUTHORIZED"
                    ? "CIERRE AUTOMÁTICO · TODOS LOS RECIBOS APROBADOS"
                    : "CIERRE MANUAL · DATOS BLOQUEADOS"}
                </p>
              ) : activeRun?.reopenedAt ? (
                <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-amber-200">
                  REABIERTA CON CÓDIGO MÁSTER · REVISIÓN{" "}
                  {activeRun.revision ?? 1}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {payrollLocked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  onClick={() => setReopenDialogOpen(true)}
                >
                  <KeyRound className="mr-1.5 h-4 w-4" />
                  Modificar con código máster
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-amber-200/40 bg-amber-200/10 text-amber-50 hover:bg-amber-200/20 hover:text-white"
                  disabled={!activeRun || !detailRows.length}
                  onClick={() => setCloseDialogOpen(true)}
                >
                  <LockKeyhole className="mr-1.5 h-4 w-4" />
                  Cerrar nómina
                </Button>
              )}
              <span className="hidden text-right text-[10px] uppercase leading-4 tracking-[0.14em] text-white/55 sm:block">
                Descargar
                <br />
                reporte
              </span>
              <ReportExportButtons
                config={exportConfig}
                disabled={!filteredRows.length}
                iconOnly
                appearance="on-dark"
              />
            </div>
          </div>
          <div className="grid gap-5 pt-5 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">
                Ventas calculadas
              </p>
              <p className="number-display mt-1 text-xl">
                {money.format(selectedSales)}
              </p>
              <p className="mt-1 text-[10px] text-white/50">
                Base global y excepciones individuales
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">
                Nómina total
              </p>
              <p className="number-display mt-1 text-xl">
                {money.format(payrollTotal)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">
                Deducciones
              </p>
              <p className="number-display mt-1 text-xl">
                {money.format(deductions)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">
                Balance general
              </p>
              <p className="number-display mt-1 text-xl">
                {money.format(selectedSales - payrollTotal)}
              </p>
            </div>
          </div>
          <div
            className={`mt-5 flex flex-col gap-2 rounded-xl border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between ${
              consolidatedReconciled
                ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-50"
                : "border-rose-300/40 bg-rose-300/10 text-rose-50"
            }`}
          >
            <span className="flex items-center gap-2 font-semibold uppercase tracking-[0.1em]">
              {consolidatedReconciled ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              Consolidación{" "}
              {consolidatedReconciled ? "cuadrada" : "con diferencia"}
            </span>
            <span className="number-display text-[10px] text-white/70">
              VENTAS {money.format(salesDifference)} · COMISIONES{" "}
              {money.format(commissionDifference)} · BONOS{" "}
              {money.format(bonusDifference)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cerrar nómina de comisiones</DialogTitle>
            <DialogDescription>
              El cierre es manual y bloqueará importes, fecha de pago, base de
              venta y excepciones individuales del periodo.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/25 p-4 text-sm">
            <p className="font-semibold">
              {period.start} — {period.end}
            </p>
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              {approvedReceiptCount} de {detailRows.length} empleados han
              confirmado su recibo · {pendingReceiptCount} pendientes.
            </p>
            {pendingReceiptCount > 0 ? (
              <p className="mt-3 flex gap-2 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                El cierre manual está permitido, pero conservará como pendientes
                las confirmaciones faltantes.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCloseDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={closePayroll}>
              <LockKeyhole className="mr-2 h-4 w-4" />
              Confirmar cierre manual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Autorizar modificación de nómina</DialogTitle>
            <DialogDescription>
              Ingresa el código privado máster. La corrida volverá a borrador y
              cualquier empleado afectado deberá confirmar nuevamente su recibo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="commission-master-code">Código máster</Label>
            <Input
              id="commission-master-code"
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={masterCode}
              onChange={(event) =>
                setMasterCode(event.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="4 dígitos"
              className="text-center text-lg tracking-[0.45em]"
            />
            <p className="text-[10px] text-[color:var(--text-muted)]">
              La reapertura quedará registrada con fecha, usuario máster y
              número de revisión.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReopenDialogOpen(false);
                setMasterCode("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={masterCode.length !== 4}
              onClick={reopenPayroll}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Reabrir para modificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label-caps">CONFIGURAR BORRADOR</p>
          {payrollLocked && (
            <Badge
              variant="outline"
              className="border-emerald-300 text-emerald-800 dark:text-emerald-200"
            >
              NÓMINA BLOQUEADA · REQUIERE CÓDIGO MÁSTER
            </Badge>
          )}
        </div>
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_180px_200px_auto] lg:items-end">
            <div className="space-y-2">
              <Label>Quincena</Label>
              <Select
                value={periodStart}
                onValueChange={(value) => {
                  setPeriodStart(value);
                  const selected = periodOptions.find(
                    (item) => item.start === value,
                  );
                  if (selected) setPayDate(selected.end);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((item) => (
                    <SelectItem key={item.start} value={item.start}>
                      {shortPeriodLabel(item.start)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[color:var(--text-muted)]">
                Consulta o crea una corrida de los últimos 12 meses.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission-pay-date">Día de pago</Label>
              <Input
                id="commission-pay-date"
                type="date"
                min={period.end}
                value={payDate}
                disabled={payrollLocked}
                onChange={(event) => setPayDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Base global de ventas</Label>
              <Select
                value={draftMode}
                disabled={payrollLocked}
                onValueChange={(value) =>
                  setDraftMode(value as DemoPayrollRun["mode"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WITH_VAT">CALCULAR CON IVA</SelectItem>
                  <SelectItem value="WITHOUT_VAT">CALCULAR SIN IVA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveAndRecalculate} disabled={payrollLocked}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Guardar y recalcular
            </Button>
          </CardContent>
        </Card>
      </section>

      {missingScheme.length > 0 && (
        <Card className="border-amber-500 bg-amber-50/80 dark:bg-amber-950/25">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    Revisa la configuración del personal con comisión
                  </p>
                  <p className="mt-1 text-sm text-amber-900/75 dark:text-amber-200/75">
                    {missingScheme.length}{" "}
                    {missingScheme.length === 1
                      ? "empleado no tiene"
                      : "empleados no tienen"}{" "}
                    esquema vigente para este periodo.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-amber-600"
                onClick={() => setShowMissing((current) => !current)}
              >
                <ChevronDown
                  className={`mr-2 h-4 w-4 transition-transform ${showMissing ? "rotate-180" : ""}`}
                />
                {showMissing ? "Ocultar detalle" : "Ver detalle por empleado"}
              </Button>
            </div>
            {showMissing && (
              <div className="mt-4 border-t border-amber-400/50 pt-3">
                {missingScheme.map((row) => (
                  <div
                    key={row.line.employee.id}
                    className="flex items-center justify-between gap-4 py-1 text-sm"
                  >
                    <span className="font-medium">
                      {row.line.employee.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-amber-600 text-amber-800 dark:text-amber-200"
                    >
                      SIN ESQUEMA
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-caps">DETALLE POR EMPLEADO</p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Expediente compacto sin desplazamiento horizontal. Las excepciones
              individuales se reflejan en todos los reportes.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <span>
              Ventas calculadas{" "}
              <strong className="number-display">
                {money.format(selectedSales)}
              </strong>
            </span>
            <span>
              Deducciones{" "}
              <strong className="number-display">
                {money.format(deductions)}
              </strong>
            </span>
            <span>
              Ajustes netos{" "}
              <strong className="number-display">
                {money.format(adjustments)}
              </strong>
            </span>
          </div>
        </div>
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="grid gap-3 p-3 lg:grid-cols-[minmax(260px,1fr)_240px_240px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="BUSCAR EMPLEADO, PUESTO, SUCURSAL O ESQUEMA"
                aria-label="Buscar empleado en cálculo de comisiones"
              />
            </div>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger aria-label="Filtrar cálculo de comisiones por puesto">
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
              <SelectTrigger aria-label="Filtrar cálculo de comisiones por sucursal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODAS LAS SUCURSALES</SelectItem>
                {branchOptions.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-[color:var(--border-color)]">
          <CardContent className="p-0 [&>div]:overflow-hidden">
            {pagedRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-[color:var(--text-muted)]">
                No hay empleados que coincidan con la búsqueda.
              </div>
            ) : (
              <Table className="table-fixed text-[10px] xl:text-[11px]">
                <colgroup>
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "7%" }} />
                </colgroup>
                <TableHeader className="bg-[linear-gradient(110deg,#28231f,#3b3027)] text-white">
                  <TableRow className="border-[#5a493b] hover:bg-transparent">
                    {[
                      "EMPLEADO / SUCURSAL",
                      "ESQUEMA / %",
                      "BASE",
                      "VENTA IVA",
                      "VENTA SIN IVA",
                      "COMISIÓN",
                      "BONO",
                      "MULTA / PRÉST.",
                      "AJUSTE",
                      "VIÁTICOS",
                      "CUENTA",
                      "APROBACIÓN",
                      "TOTAL PAGO",
                    ].map((label, index) => (
                      <TableHead
                        key={label}
                        className={`h-9 px-2 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/75 ${index >= 3 && index !== 11 ? "text-right" : index === 11 ? "text-center" : ""}`}
                      >
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.map((row) => {
                    const override =
                      state.commissionModeOverrides[
                        `${period.start}:${row.line.employee.id}`
                      ] ?? state.commissionModeOverrides[row.line.employee.id];
                    const adjustment =
                      row.line.externalAdditions - row.line.externalDeductions;
                    const viatics =
                      row.line.viaticsAdditions - row.line.viaticsDeductions;
                    return (
                      <TableRow
                        key={row.line.employee.id}
                        className="h-[58px] border-[color:var(--border-color)] hover:bg-[color:var(--accent-hover)]/25"
                      >
                        <TableCell className="px-2 py-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="truncate font-semibold text-[color:var(--text-primary)]">
                                {row.line.employee.name}
                              </p>
                              {row.line.schemeName === "SIN ESQUEMA" && (
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                                  title="Sin esquema"
                                />
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[8px] uppercase tracking-wide text-[color:var(--text-muted)]">
                              {row.line.employee.position}
                            </p>
                            <p className="truncate text-[8px] font-semibold text-[color:var(--text-secondary)]">
                              {row.branch}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <p className="line-clamp-2 font-semibold leading-3">
                            {row.line.schemeName}
                          </p>
                          <p className="number-display mt-1 text-[10px] text-[color:var(--text-secondary)]">
                            {(row.line.rate * 100).toFixed(1)}%
                          </p>
                        </TableCell>
                        <TableCell className="px-1.5 py-2">
                          <Select
                            value={override ?? "GLOBAL"}
                            disabled={payrollLocked}
                            onValueChange={(value) => {
                              setCommissionModeOverride(
                                row.line.employee.id,
                                period.start,
                                value === "GLOBAL"
                                  ? null
                                  : (value as DemoPayrollRun["mode"]),
                              );
                              toast.success(
                                `Base individual actualizada para ${row.line.employee.name}.`,
                              );
                            }}
                          >
                            <SelectTrigger
                              aria-label={`Base de cálculo de ${row.line.employee.name}`}
                              className={`h-7 min-w-0 rounded-md px-2 text-[9px] font-semibold ${override ? "border-[#b58b60] bg-[#c3a583]/12" : "border-[color:var(--border-color)] bg-transparent"}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GLOBAL">
                                HEREDA ·{" "}
                                {calculationMode === "WITH_VAT"
                                  ? "IVA"
                                  : "SIN IVA"}
                              </SelectItem>
                              <SelectItem value="WITH_VAT">CON IVA</SelectItem>
                              <SelectItem value="WITHOUT_VAT">
                                SIN IVA
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="number-display px-2 py-2 text-right leading-4">
                          {money.format(row.grossSales)}
                        </TableCell>
                        <TableCell className="number-display px-2 py-2 text-right leading-4">
                          {money.format(row.netSales)}
                        </TableCell>
                        <TableCell className="number-display px-2 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                          {money.format(row.line.commission)}
                        </TableCell>
                        <TableCell className="number-display px-2 py-2 text-right">
                          {money.format(row.line.bonuses)}
                        </TableCell>
                        <TableCell className="number-display px-2 py-2 text-right">
                          <span className="block text-rose-700 dark:text-rose-300" title="Multas">
                            M −{money.format(row.line.fines)}
                          </span>
                          <span className="mt-0.5 block text-amber-700 dark:text-amber-300" title="Préstamos y adelantos">
                            P −{money.format(row.line.loanDeduction)}
                          </span>
                          {row.line.carriedNegativeBalance > 0 ? (
                            <span className="mt-0.5 block text-[7px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                              SALDO −{money.format(row.line.carriedNegativeBalance)}
                            </span>
                          ) : null}
                          {row.line.newNegativeBalance > 0 ? (
                            <span className="mt-0.5 block text-[7px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                              PASA {money.format(row.line.newNegativeBalance)}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell
                          className={`number-display px-2 py-2 text-right ${adjustment < 0 ? "text-rose-700 dark:text-rose-300" : adjustment > 0 ? "text-emerald-700 dark:text-emerald-300" : ""}`}
                        >
                          {money.format(adjustment)}
                        </TableCell>
                        <TableCell className="number-display px-2 py-2 text-right">
                          {money.format(viatics)}
                        </TableCell>
                        <TableCell className="number-display px-2 py-2 text-right text-[9px]">
                          {row.line.employee.account}
                        </TableCell>
                        <TableCell className="px-1 py-2 text-center">
                          {row.approvalStatus === "AUTHORIZED" ? (
                            <span
                              className="inline-flex flex-col items-center gap-0.5 text-emerald-700 dark:text-emerald-300"
                              aria-label="Aprobado por usuario"
                            >
                              <CheckCircle2 className="h-4 w-4 fill-emerald-100 dark:fill-emerald-950" />
                              <span className="text-[7px] font-bold tracking-wide">
                                APROBADO
                              </span>
                            </span>
                          ) : (
                            <span className="sr-only">
                              Pendiente de aprobación
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="number-display bg-[color:var(--accent-hover)]/25 px-2 py-2 text-right text-xs font-semibold">
                          {money.format(row.line.total)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 px-4 py-3 text-xs lg:flex-row lg:items-center lg:justify-between">
            <p>
              Mostrando{" "}
              <strong>
                {visibleStart}–{visibleEnd}
              </strong>{" "}
              de <strong>{filteredRows.length}</strong> registros · página{" "}
              <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Label className="whitespace-nowrap text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                Filas
              </Label>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger
                  className="h-8 w-[88px] rounded-lg text-[10px] font-semibold"
                  aria-label="Filas por página"
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
        </Card>
      </section>

      <CommissionBranchCostReport
        lines={lines}
        periodStart={period.start}
        periodEnd={period.end}
        payrollTotal={payrollTotal}
      />
    </div>
  );
}

interface CommissionBranchCostRow {
  line: EmployeePayrollLine;
  branchSales: Record<string, number>;
  branchCommissionCosts: Record<string, number>;
  branchBonusCosts: Record<string, number>;
  branchMovementCosts: Record<string, number>;
  branchCosts: Record<string, number>;
  movementNet: number;
}

interface CommissionBonusCostRow {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  concept: string;
  source: "REGISTRADO" | "TEMPORAL" | "CONCILIACIÓN";
  branchId: string;
  branchName: string;
  allocationShare: number;
  amount: number;
}

function CommissionBranchCostReport({
  lines,
  periodStart,
  periodEnd,
  payrollTotal,
}: {
  lines: EmployeePayrollLine[];
  periodStart: string;
  periodEnd: string;
  payrollTotal: number;
}) {
  const { state } = usePayrollDemo();
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);

  const bonusBreakdownRows = useMemo<CommissionBonusCostRow[]>(() => {
    const lineByEmployee = new Map(
      lines.map((line) => [line.employee.id, line]),
    );
    const validBranchIds = new Set(state.branches.map((branch) => branch.id));
    const rows: CommissionBonusCostRow[] = [];
    const detailedTotalsByEmployee = new Map<string, number>();

    function appendBonus({
      id,
      employeeId,
      concept,
      source,
      amount,
      requestedBranchIds,
    }: {
      id: string;
      employeeId: string;
      concept: string;
      source: CommissionBonusCostRow["source"];
      amount: number;
      requestedBranchIds: string[];
    }) {
      const line = lineByEmployee.get(employeeId);
      if (!line || amount <= 0) return;
      const fallbackBranchIds = line.employee.costBranchIds.length
        ? line.employee.costBranchIds
        : [line.employee.branchId];
      const branchIds = Array.from(
        new Set(
          (requestedBranchIds.length
            ? requestedBranchIds
            : fallbackBranchIds
          ).filter((branchId) => validBranchIds.has(branchId)),
        ),
      );
      const resolvedBranchIds = branchIds.length
        ? branchIds
        : fallbackBranchIds.filter((branchId) => validBranchIds.has(branchId));
      if (!resolvedBranchIds.length) return;
      detailedTotalsByEmployee.set(
        employeeId,
        (detailedTotalsByEmployee.get(employeeId) ?? 0) + amount,
      );

      let assigned = 0;
      resolvedBranchIds.forEach((branchId, index) => {
        const allocatedAmount =
          index === resolvedBranchIds.length - 1
            ? amount - assigned
            : amount / resolvedBranchIds.length;
        assigned += allocatedAmount;
        rows.push({
          id: `${id}-${branchId}`,
          employeeId,
          employeeName: line.employee.name,
          position: line.employee.position,
          concept,
          source,
          branchId,
          branchName:
            state.branches.find((branch) => branch.id === branchId)?.name ??
            "SIN SUCURSAL",
          allocationShare: 1 / resolvedBranchIds.length,
          amount: allocatedAmount,
        });
      });
    }

    state.movements
      .filter(
        (movement) =>
          movement.type === "BONUS" &&
          movement.status === "APPROVED" &&
          movement.periodStart >= periodStart &&
          movement.periodStart <= periodEnd,
      )
      .forEach((movement) => {
        const line = lineByEmployee.get(movement.employeeId);
        if (
          !line ||
          (movement.mode === "SCALE" && line.sales < (movement.threshold ?? 0))
        )
          return;
        appendBonus({
          id: movement.id,
          employeeId: movement.employeeId,
          concept: movement.concept,
          source: "REGISTRADO",
          amount: movement.amount,
          requestedBranchIds: movement.costBranchIds,
        });
      });

    temporaryBonusAwardsForPeriod(state, periodStart, periodEnd).forEach(
      (award) =>
        appendBonus({
          id: award.id,
          employeeId: award.employee.id,
          concept: award.concept.name,
          source: "TEMPORAL",
          amount: award.amount,
          requestedBranchIds: award.costBranchIds,
        }),
    );

    lines.forEach((line) => {
      const detailedAmount =
        detailedTotalsByEmployee.get(line.employee.id) ?? 0;
      const difference = line.bonuses - detailedAmount;
      if (Math.abs(difference) < 0.01 || difference <= 0) return;
      appendBonus({
        id: `bonus-reconciliation-${line.employee.id}`,
        employeeId: line.employee.id,
        concept: "BONO CALCULADO EN NÓMINA",
        source: "CONCILIACIÓN",
        amount: difference,
        requestedBranchIds: line.employee.costBranchIds,
      });
    });

    return rows.sort(
      (left, right) =>
        left.employeeName.localeCompare(right.employeeName, "es-MX") ||
        left.concept.localeCompare(right.concept, "es-MX") ||
        left.branchName.localeCompare(right.branchName, "es-MX"),
    );
  }, [lines, periodEnd, periodStart, state]);

  const bonusCostsByEmployee = useMemo(() => {
    const costs = new Map<string, Record<string, number>>();
    bonusBreakdownRows.forEach((bonus) => {
      const employeeCosts = costs.get(bonus.employeeId) ?? {};
      employeeCosts[bonus.branchId] =
        (employeeCosts[bonus.branchId] ?? 0) + bonus.amount;
      costs.set(bonus.employeeId, employeeCosts);
    });
    return costs;
  }, [bonusBreakdownRows]);

  const rows = useMemo<CommissionBranchCostRow[]>(
    () =>
      lines.map((line) => {
        const salesFactor =
          line.grossSales > 0 ? line.sales / line.grossSales : 1;
        const branchSales = state.sales
          .filter(
            (sale) =>
              sale.employeeId === line.employee.id &&
              sale.date >= periodStart &&
              sale.date <= periodEnd,
          )
          .reduce<Record<string, number>>((totals, sale) => {
            totals[sale.branchId] =
              (totals[sale.branchId] ?? 0) + sale.amount * salesFactor;
            return totals;
          }, {});
        const allocations = employeeCostAllocationShares({
          employee: line.employee,
          branches: state.branches,
          sales: state.sales,
          periodStart,
          periodEnd,
          mode: "SALES_SHARE",
        });
        const movementNet = line.total - line.commission - line.bonuses;
        const allocateAmount = (amount: number) => {
          const costs: Record<string, number> = {};
          let assigned = 0;
          allocations.forEach((allocation, index) => {
            const cost =
              index === allocations.length - 1
                ? amount - assigned
                : amount * allocation.share;
            costs[allocation.branchId] = cost;
            assigned += cost;
          });
          return costs;
        };
        const branchCommissionCosts = allocateAmount(line.commission);
        const branchMovementCosts = allocateAmount(movementNet);
        const branchBonusCosts =
          bonusCostsByEmployee.get(line.employee.id) ??
          allocateAmount(line.bonuses);
        const branchCosts: Record<string, number> = {};
        new Set([
          ...Object.keys(branchCommissionCosts),
          ...Object.keys(branchBonusCosts),
          ...Object.keys(branchMovementCosts),
        ]).forEach((branchId) => {
          branchCosts[branchId] =
            (branchCommissionCosts[branchId] ?? 0) +
            (branchBonusCosts[branchId] ?? 0) +
            (branchMovementCosts[branchId] ?? 0);
        });
        return {
          line,
          branchSales,
          branchCommissionCosts,
          branchBonusCosts,
          branchMovementCosts,
          branchCosts,
          movementNet,
        };
      }),
    [
      bonusCostsByEmployee,
      lines,
      periodEnd,
      periodStart,
      state.branches,
      state.sales,
    ],
  );
  const branchColumns = useMemo(
    () =>
      state.branches.filter((branch) =>
        rows.some(
          (row) =>
            Object.hasOwn(row.branchCosts, branch.id) ||
            (row.branchSales[branch.id] ?? 0) > 0,
        ),
      ),
    [rows, state.branches],
  );
  const visibleBranchColumns =
    branchFilter === "ALL"
      ? branchColumns
      : branchColumns.filter((branch) => branch.id === branchFilter);
  const positionOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.line.employee.position))).sort(
        (left, right) => left.localeCompare(right, "es-MX"),
      ),
    [rows],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      !normalizedSearch ||
      `${row.line.employee.name} ${row.line.employee.position} ${row.line.schemeName}`
        .toLocaleLowerCase("es-MX")
        .includes(normalizedSearch);
    const matchesPosition =
      positionFilter === "ALL" || row.line.employee.position === positionFilter;
    const matchesBranch =
      branchFilter === "ALL" ||
      Object.hasOwn(row.branchCosts, branchFilter) ||
      (row.branchSales[branchFilter] ?? 0) > 0;
    return matchesSearch && matchesPosition && matchesBranch;
  });
  const effectivePageSize =
    pageSize === "ALL" ? Math.max(filteredRows.length, 1) : Number(pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / effectivePageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );
  const visibleStart =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const visibleEnd = Math.min(
    currentPage * effectivePageSize,
    filteredRows.length,
  );
  const scopedAmount = (
    _row: CommissionBranchCostRow,
    branchAmounts: Record<string, number>,
    completeAmount: number,
  ) =>
    branchFilter === "ALL"
      ? completeAmount
      : (branchAmounts[branchFilter] ?? 0);
  const filteredCommission = filteredRows.reduce(
    (sum, row) =>
      sum + scopedAmount(row, row.branchCommissionCosts, row.line.commission),
    0,
  );
  const filteredBonuses = filteredRows.reduce(
    (sum, row) =>
      sum + scopedAmount(row, row.branchBonusCosts, row.line.bonuses),
    0,
  );
  const filteredMovements = filteredRows.reduce(
    (sum, row) =>
      sum + scopedAmount(row, row.branchMovementCosts, row.movementNet),
    0,
  );
  const filteredPayroll = filteredRows.reduce(
    (sum, row) => sum + scopedAmount(row, row.branchCosts, row.line.total),
    0,
  );
  const branchCostTotal = filteredRows.reduce(
    (total, row) =>
      total +
      visibleBranchColumns.reduce(
        (sum, branch) => sum + (row.branchCosts[branch.id] ?? 0),
        0,
      ),
    0,
  );
  const componentTotal =
    filteredCommission + filteredBonuses + filteredMovements;
  const componentDifference = componentTotal - filteredPayroll;
  const reconciliationDifference = branchCostTotal - filteredPayroll;
  const reconciled =
    Math.abs(reconciliationDifference) < 0.01 &&
    Math.abs(componentDifference) < 0.01;
  const filteredEmployeeIds = new Set(
    filteredRows.map((row) => row.line.employee.id),
  );
  const filteredBonusBreakdownRows = bonusBreakdownRows.filter(
    (bonus) =>
      filteredEmployeeIds.has(bonus.employeeId) &&
      (branchFilter === "ALL" || bonus.branchId === branchFilter),
  );
  const generalScope =
    !search.trim() && positionFilter === "ALL" && branchFilter === "ALL";
  const branchName =
    state.branches.find((branch) => branch.id === branchFilter)?.name ??
    "TODAS";
  const exportConfig = {
    title: "Carga de costo de comisiones por empleado y sucursal",
    subtitle: `${periodStart} — ${periodEnd} · ${generalScope ? "REPORTE GENERAL" : "SELECCIÓN FILTRADA"}`,
    metadata: [
      { label: "Periodo", value: `${periodStart} — ${periodEnd}` },
      {
        label: "Puesto",
        value: positionFilter === "ALL" ? "TODOS" : positionFilter,
      },
      {
        label: "Sucursal POS",
        value: branchFilter === "ALL" ? "TODAS" : branchName,
      },
      {
        label: "Origen",
        value: "VENTAS POR PUNTO DE VENTA · DISTRIBUCIÓN PROPORCIONAL",
      },
    ],
    metrics: [
      {
        label: "Comisiones",
        value: money.format(filteredCommission),
        detail: "Pago por esquema",
      },
      {
        label: "Bonos",
        value: money.format(filteredBonuses),
        detail: "Desglose por empleado y sucursal",
      },
      {
        label: "Otros movimientos",
        value: money.format(filteredMovements),
        detail: "Ajustes y deducciones netas",
      },
      {
        label: "Total nómina",
        value: money.format(filteredPayroll),
        detail: reconciled ? "Componentes conciliados" : "Revisar diferencia",
      },
    ],
    analysis: [
      `Comisiones ${money.format(filteredCommission)} + bonos ${money.format(filteredBonuses)} + otros movimientos ${money.format(filteredMovements)} = ${money.format(componentTotal)}; la diferencia contra nómina es ${money.format(componentDifference)}.`,
      `La carga por sucursal ${reconciled ? "coincide" : "no coincide"} con la nómina de la selección; la diferencia es ${money.format(reconciliationDifference)}.`,
      generalScope
        ? `El reporte completo concilia ${money.format(branchCostTotal)} contra el total superior de ${money.format(payrollTotal)}.`
        : "Los filtros reducen las filas visibles; la conciliación se realiza contra los empleados seleccionados.",
      "Los bonos respetan la sucursal de costo elegida en su registro. Comisión y otros movimientos usan la participación de ventas POS; si no existen ventas, se usa el centro de costo asignado.",
    ],
    filename: `costo-comisiones-sucursal-${periodStart}`,
    sheetName: "Costo por sucursal",
    orientation: "landscape" as const,
    rows: filteredRows,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: CommissionBranchCostRow) => row.line.employee.name,
        width: 24,
      },
      {
        header: "PUESTO",
        accessor: (row: CommissionBranchCostRow) => row.line.employee.position,
        width: 20,
      },
      {
        header: "VENTA CALCULADA",
        accessor: (row: CommissionBranchCostRow) =>
          branchFilter === "ALL"
            ? row.line.sales
            : (row.branchSales[branchFilter] ?? 0),
        format: "currency" as const,
        width: 15,
      },
      {
        header: "COMISIÓN",
        accessor: (row: CommissionBranchCostRow) =>
          scopedAmount(row, row.branchCommissionCosts, row.line.commission),
        format: "currency" as const,
        width: 15,
      },
      {
        header: "BONOS",
        accessor: (row: CommissionBranchCostRow) =>
          scopedAmount(row, row.branchBonusCosts, row.line.bonuses),
        format: "currency" as const,
        width: 15,
      },
      {
        header: "OTROS MOVIMIENTOS",
        accessor: (row: CommissionBranchCostRow) =>
          scopedAmount(row, row.branchMovementCosts, row.movementNet),
        format: "currency" as const,
        width: 16,
      },
      ...visibleBranchColumns.map((branch) => ({
        header: branch.name,
        accessor: (row: CommissionBranchCostRow) =>
          row.branchCosts[branch.id] ?? 0,
        format: "currency" as const,
        width: 15,
      })),
      {
        header: branchFilter === "ALL" ? "TOTAL NÓMINA" : "COSTO SELECCIONADO",
        accessor: (row: CommissionBranchCostRow) =>
          scopedAmount(row, row.branchCosts, row.line.total),
        format: "currency" as const,
        width: 17,
      },
    ],
  };

  useEffect(() => setPage(1), [branchFilter, pageSize, positionFilter, search]);

  return (
    <section
      className="space-y-4 border-t border-[color:var(--border-color)] pt-7"
      aria-labelledby="commission-cost-report-title"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="label-caps">CONCILIACIÓN POR PUNTO DE VENTA</p>
            <Badge
              variant="outline"
              className={
                reconciled
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
              }
            >
              {reconciled ? "CUADRADA" : "REVISAR DIFERENCIA"}
            </Badge>
          </div>
          <h2
            id="commission-cost-report-title"
            className="mt-1 text-xl font-semibold"
          >
            Carga de costo por empleado y sucursal
          </h2>
          <p className="mt-1 max-w-4xl text-sm text-[color:var(--text-muted)]">
            Cada columna muestra cuánto de la nómina pagó la sucursal según las
            ventas importadas del punto de venta. La suma general debe coincidir
            con la nómina total del periodo.
          </p>
        </div>
        <ReportExportButtons
          config={exportConfig}
          disabled={!filteredRows.length}
        />
      </div>

      <Card className="border-[color:var(--border-color)]">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(260px,1fr)_240px_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="BUSCAR EMPLEADO, PUESTO O ESQUEMA"
              aria-label="Buscar en carga de costo de comisiones"
            />
          </div>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger aria-label="Filtrar carga de costo por puesto">
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
            <SelectTrigger aria-label="Filtrar carga de costo por sucursal POS">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">TODAS LAS SUCURSALES POS</SelectItem>
              {branchColumns.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="p-4">
            <UsersRound className="h-5 w-5 text-[color:var(--text-secondary)]" />
            <p className="label-caps mt-3">PERSONAL</p>
            <p className="number-display mt-1 text-xl">{filteredRows.length}</p>
            <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
              Empleados con comisión o movimientos
            </p>
          </CardContent>
        </Card>
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="p-4">
            <CircleDollarSign className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            <p className="label-caps mt-3">COMISIONES</p>
            <p className="number-display mt-1 text-xl">
              {money.format(filteredCommission)}
            </p>
            <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
              Pago generado por esquemas
            </p>
          </CardContent>
        </Card>
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="p-4">
            <Gift className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            <p className="label-caps mt-3">BONOS</p>
            <p className="number-display mt-1 text-xl">
              {money.format(filteredBonuses)}
            </p>
            <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
              Cargados por vendedor y sucursal
            </p>
          </CardContent>
        </Card>
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="p-4">
            <ArrowLeftRight className="h-5 w-5 text-[color:var(--text-secondary)]" />
            <p className="label-caps mt-3">OTROS MOVIMIENTOS</p>
            <p
              className={`number-display mt-1 text-xl ${filteredMovements < 0 ? "text-rose-700 dark:text-rose-300" : ""}`}
            >
              {money.format(filteredMovements)}
            </p>
            <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
              Ajustes y deducciones netas
            </p>
          </CardContent>
        </Card>
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="p-4">
            <Store className="h-5 w-5 text-[color:var(--text-secondary)]" />
            <p className="label-caps mt-3">NÓMINA SELECCIONADA</p>
            <p className="number-display mt-1 text-xl">
              {money.format(filteredPayroll)}
            </p>
            <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
              {branchFilter === "ALL"
                ? `${branchColumns.length} sucursales con costo`
                : branchName}
            </p>
          </CardContent>
        </Card>
        <Card
          className={
            reconciled
              ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20"
              : "border-rose-300 bg-rose-50/60 dark:bg-rose-950/20"
          }
        >
          <CardContent className="p-4">
            <CheckCircle2
              className={`h-5 w-5 ${reconciled ? "text-emerald-700" : "text-rose-700"}`}
            />
            <p className="label-caps mt-3">CARGA POR SUCURSAL</p>
            <p className="number-display mt-1 text-xl">
              {money.format(branchCostTotal)}
            </p>
            <p className="mt-1 text-[10px] font-semibold">
              {reconciled
                ? "COINCIDE CON LA NÓMINA"
                : `DIFERENCIA ${money.format(reconciliationDifference)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-max text-[10px]">
              <TableHeader className="bg-[linear-gradient(110deg,#28231f,#3b3027)] text-white">
                <TableRow className="border-[#5a493b] hover:bg-transparent">
                  <TableHead className="min-w-56 text-white/75">
                    EMPLEADO
                  </TableHead>
                  <TableHead className="min-w-44 text-white/75">
                    PUESTO / ESQUEMA
                  </TableHead>
                  <TableHead className="min-w-32 text-right text-white/75">
                    VENTA CALCULADA
                  </TableHead>
                  <TableHead className="min-w-32 text-right text-white/75">
                    COMISIÓN
                  </TableHead>
                  <TableHead className="min-w-32 text-right text-white/75">
                    BONOS
                  </TableHead>
                  <TableHead className="min-w-36 text-right text-white/75">
                    OTROS MOVIMIENTOS
                  </TableHead>
                  {visibleBranchColumns.map((branch) => (
                    <TableHead
                      key={branch.id}
                      className="min-w-36 text-right text-white/75"
                    >
                      {branch.name}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-36 text-right text-white/75">
                    {branchFilter === "ALL"
                      ? "TOTAL NÓMINA"
                      : "COSTO SELECCIONADO"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((row) => (
                  <TableRow
                    key={row.line.employee.id}
                    className="[contain-intrinsic-size:58px] [content-visibility:auto]"
                  >
                    <TableCell>
                      <p className="font-semibold">{row.line.employee.name}</p>
                      <p className="mt-0.5 text-[9px] text-[color:var(--text-muted)]">
                        ID {row.line.employee.id.toLocaleUpperCase("es-MX")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">
                        {row.line.employee.position}
                      </p>
                      <p className="mt-0.5 text-[9px] text-[color:var(--text-muted)]">
                        {row.line.schemeName}
                      </p>
                    </TableCell>
                    <TableCell className="number-display text-right">
                      {money.format(
                        branchFilter === "ALL"
                          ? row.line.sales
                          : (row.branchSales[branchFilter] ?? 0),
                      )}
                    </TableCell>
                    <TableCell className="number-display text-right text-emerald-700 dark:text-emerald-300">
                      {money.format(
                        scopedAmount(
                          row,
                          row.branchCommissionCosts,
                          row.line.commission,
                        ),
                      )}
                    </TableCell>
                    <TableCell className="number-display text-right text-amber-700 dark:text-amber-300">
                      {money.format(
                        scopedAmount(
                          row,
                          row.branchBonusCosts,
                          row.line.bonuses,
                        ),
                      )}
                    </TableCell>
                    <TableCell
                      className={`number-display text-right ${
                        scopedAmount(
                          row,
                          row.branchMovementCosts,
                          row.movementNet,
                        ) < 0
                          ? "text-rose-700 dark:text-rose-300"
                          : scopedAmount(
                                row,
                                row.branchMovementCosts,
                                row.movementNet,
                              ) > 0
                            ? "text-emerald-700 dark:text-emerald-300"
                            : ""
                      }`}
                    >
                      {money.format(
                        scopedAmount(
                          row,
                          row.branchMovementCosts,
                          row.movementNet,
                        ),
                      )}
                    </TableCell>
                    {visibleBranchColumns.map((branch) => (
                      <TableCell
                        key={branch.id}
                        className="bg-[color:var(--accent-hover)]/15 text-right"
                      >
                        <p className="number-display font-semibold">
                          {money.format(row.branchCosts[branch.id] ?? 0)}
                        </p>
                        <p className="mt-0.5 text-[8px] text-[color:var(--text-muted)]">
                          Venta {money.format(row.branchSales[branch.id] ?? 0)}
                        </p>
                      </TableCell>
                    ))}
                    <TableCell className="number-display text-right text-xs font-semibold">
                      {money.format(
                        scopedAmount(row, row.branchCosts, row.line.total),
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!pagedRows.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={7 + visibleBranchColumns.length}
                      className="py-10 text-center text-sm text-[color:var(--text-muted)]"
                    >
                      No hay registros para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="text-right font-semibold">
                    TOTALES CONCILIADOS
                  </TableCell>
                  <TableCell className="number-display text-right">
                    {money.format(
                      filteredRows.reduce(
                        (sum, row) =>
                          sum +
                          (branchFilter === "ALL"
                            ? row.line.sales
                            : (row.branchSales[branchFilter] ?? 0)),
                        0,
                      ),
                    )}
                  </TableCell>
                  <TableCell className="number-display text-right">
                    {money.format(filteredCommission)}
                  </TableCell>
                  <TableCell className="number-display text-right">
                    {money.format(filteredBonuses)}
                  </TableCell>
                  <TableCell className="number-display text-right">
                    {money.format(filteredMovements)}
                  </TableCell>
                  {visibleBranchColumns.map((branch) => (
                    <TableCell
                      key={branch.id}
                      className="number-display text-right"
                    >
                      {money.format(
                        filteredRows.reduce(
                          (sum, row) => sum + (row.branchCosts[branch.id] ?? 0),
                          0,
                        ),
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="number-display text-right text-xs">
                    {money.format(filteredPayroll)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 px-4 py-3 text-xs lg:flex-row lg:items-center lg:justify-between">
            <p>
              Mostrando{" "}
              <strong>
                {visibleStart}–{visibleEnd}
              </strong>{" "}
              de <strong>{filteredRows.length}</strong> empleados · página{" "}
              <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                Filas
              </Label>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger
                  className="h-8 w-[88px] rounded-lg text-[10px] font-semibold"
                  aria-label="Filas del reporte de costo por página"
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
                className="h-8 px-2.5 text-[10px]"
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
                className="h-8 px-2.5 text-[10px]"
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
        </CardContent>
      </Card>

      <CommissionBonusBreakdown
        rows={filteredBonusBreakdownRows}
        expectedTotal={filteredBonuses}
        periodStart={periodStart}
        periodEnd={periodEnd}
        selectionLabel={
          branchFilter === "ALL" ? "EMPRESA COMPLETA" : `SUCURSAL ${branchName}`
        }
        filterKey={`${search}|${positionFilter}|${branchFilter}`}
      />
    </section>
  );
}

function CommissionBonusBreakdown({
  rows,
  expectedTotal,
  periodStart,
  periodEnd,
  selectionLabel,
  filterKey,
}: {
  rows: CommissionBonusCostRow[];
  expectedTotal: number;
  periodStart: string;
  periodEnd: string;
  selectionLabel: string;
  filterKey: string;
}) {
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);
  const effectivePageSize =
    pageSize === "ALL" ? Math.max(rows.length, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / effectivePageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = rows.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );
  const visibleStart =
    rows.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const visibleEnd = Math.min(currentPage * effectivePageSize, rows.length);
  const detailedTotal = rows.reduce((sum, row) => sum + row.amount, 0);
  const difference = detailedTotal - expectedTotal;
  const reconciled = Math.abs(difference) < 0.01;
  const employeeCount = new Set(rows.map((row) => row.employeeId)).size;

  const exportConfig = {
    title: "Desglose de bonos por vendedor y sucursal",
    subtitle: `${periodStart} — ${periodEnd} · ${selectionLabel}`,
    filename: `desglose-bonos-comisiones-${periodStart}`,
    sheetName: "Bonos por sucursal",
    orientation: "landscape" as const,
    rows,
    metadata: [
      { label: "Periodo", value: `${periodStart} — ${periodEnd}` },
      { label: "Alcance", value: selectionLabel },
      { label: "Registros", value: String(rows.length) },
    ],
    metrics: [
      {
        label: "Personal con bono",
        value: String(employeeCount),
        detail: "Empleados en la selección",
      },
      {
        label: "Bonos",
        value: money.format(detailedTotal),
        detail: "Costo distribuido",
      },
      {
        label: "Conciliación",
        value: reconciled ? "CUADRADA" : money.format(difference),
        detail: "Contra el total de bonos de nómina",
      },
    ],
    analysis: [
      `El detalle distribuye ${money.format(detailedTotal)} de bonos entre ${employeeCount} empleados y sus sucursales de costo.`,
      `La diferencia contra el total de bonos incluido en nómina es ${money.format(difference)}.`,
      "Cuando un bono tiene varias sucursales, el importe se divide en partes iguales y conserva el último centavo en la última asignación.",
    ],
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: CommissionBonusCostRow) => row.employeeName,
        width: 25,
      },
      {
        header: "PUESTO",
        accessor: (row: CommissionBonusCostRow) => row.position,
        width: 22,
      },
      {
        header: "BONO",
        accessor: (row: CommissionBonusCostRow) => row.concept,
        width: 28,
      },
      {
        header: "ORIGEN",
        accessor: (row: CommissionBonusCostRow) => row.source,
        width: 15,
      },
      {
        header: "SUCURSAL DE COSTO",
        accessor: (row: CommissionBonusCostRow) => row.branchName,
        width: 22,
      },
      {
        header: "% CARGA",
        accessor: (row: CommissionBonusCostRow) => row.allocationShare,
        format: "percent" as const,
        width: 13,
      },
      {
        header: "IMPORTE",
        accessor: (row: CommissionBonusCostRow) => row.amount,
        format: "currency" as const,
        width: 16,
      },
    ],
  };

  useEffect(() => setPage(1), [filterKey, pageSize]);

  return (
    <div className="space-y-3 pt-2" aria-labelledby="bonus-breakdown-title">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="label-caps">DESGLOSE AUDITABLE DE BONOS</p>
            <Badge
              variant="outline"
              className={
                reconciled
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
              }
            >
              {reconciled ? "CUADRADO" : "REVISAR DIFERENCIA"}
            </Badge>
          </div>
          <h3 id="bonus-breakdown-title" className="mt-1 text-lg font-semibold">
            Bonos por vendedor y sucursal de costo
          </h3>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Cada fila identifica el bono, su origen y la sucursal donde se cargó
            el importe dentro de la nómina seleccionada.
          </p>
        </div>
        <ReportExportButtons config={exportConfig} disabled={!rows.length} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="p-4">
            <p className="label-caps">PERSONAL CON BONO</p>
            <p className="number-display mt-1 text-xl">{employeeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-[color:var(--border-color)]">
          <CardContent className="p-4">
            <p className="label-caps">TOTAL BONOS</p>
            <p className="number-display mt-1 text-xl">
              {money.format(detailedTotal)}
            </p>
          </CardContent>
        </Card>
        <Card
          className={
            reconciled
              ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20"
              : "border-rose-300 bg-rose-50/60 dark:bg-rose-950/20"
          }
        >
          <CardContent className="p-4">
            <p className="label-caps">CONTRA NÓMINA</p>
            <p className="number-display mt-1 text-xl">
              {money.format(expectedTotal)}
            </p>
            <p className="mt-1 text-[10px] font-semibold">
              {reconciled ? "SIN DIFERENCIAS" : money.format(difference)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[940px] text-[10px]">
              <TableHeader className="bg-[linear-gradient(110deg,#28231f,#3b3027)] text-white">
                <TableRow className="border-[#5a493b] hover:bg-transparent">
                  <TableHead className="text-white/75">EMPLEADO</TableHead>
                  <TableHead className="text-white/75">PUESTO</TableHead>
                  <TableHead className="text-white/75">BONO / ORIGEN</TableHead>
                  <TableHead className="text-white/75">
                    SUCURSAL DE COSTO
                  </TableHead>
                  <TableHead className="text-right text-white/75">
                    % CARGA
                  </TableHead>
                  <TableHead className="text-right text-white/75">
                    IMPORTE
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="[contain-intrinsic-size:52px] [content-visibility:auto]"
                  >
                    <TableCell className="font-semibold">
                      {row.employeeName}
                    </TableCell>
                    <TableCell>{row.position}</TableCell>
                    <TableCell>
                      <p className="font-semibold">{row.concept}</p>
                      <p className="mt-0.5 text-[8px] text-[color:var(--text-muted)]">
                        {row.source}
                      </p>
                    </TableCell>
                    <TableCell>{row.branchName}</TableCell>
                    <TableCell className="number-display text-right">
                      {(row.allocationShare * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="number-display text-right font-semibold text-amber-700 dark:text-amber-300">
                      {money.format(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {!pagedRows.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-[color:var(--text-muted)]"
                    >
                      No existen bonos para la selección actual.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-semibold">
                    TOTAL BONOS CONCILIADO
                  </TableCell>
                  <TableCell className="number-display text-right text-xs">
                    {money.format(detailedTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 px-4 py-3 text-xs lg:flex-row lg:items-center lg:justify-between">
            <p>
              Mostrando{" "}
              <strong>
                {visibleStart}–{visibleEnd}
              </strong>{" "}
              de <strong>{rows.length}</strong> cargos de bono · página{" "}
              <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                Filas
              </Label>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger
                  className="h-8 w-[88px] rounded-lg text-[10px] font-semibold"
                  aria-label="Filas del desglose de bonos por página"
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
                className="h-8 px-2.5 text-[10px]"
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
                className="h-8 px-2.5 text-[10px]"
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
        </CardContent>
      </Card>
    </div>
  );
}
