"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  ListChecks,
  PlusCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  ColumnDef,
  DataTable,
  DatePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import { ReportExportButtons } from "@/components/payroll/report-export-buttons";
import { SectionCard } from "@/components/payroll/section-card";
import { StatusBadge } from "@/components/payroll/status-badge";
import { FortnightSelect } from "@/components/payroll/fortnight-select";
import { usePayrollData } from "@/components/payroll/payroll-data-context";
import { apiErrorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatStatus,
  sumBy,
} from "@/lib/format";
import type {
  CommissionScheme,
  MonthlyPayrollLine,
  MonthlyPayrollRunReference,
  PayrollCalculationMode,
  PayrollRunLine,
  SchemeAssignment,
} from "@/lib/types";

type SummaryView = "FORTNIGHT" | "MONTHLY";

type PayrollPeriodOption = {
  value: string;
  from: string;
  to: string;
  month: string;
  label: string;
  shortLabel: string;
};

type AttentionIssue = {
  code: string;
  label: string;
};

type AttentionLine = {
  id: string;
  employeeName: string;
  pendingCount: number;
  issues: AttentionIssue[];
};

const ATTENTION_LABELS: Record<string, string> = {
  MISSING_SCHEME: "ESQUEMA",
  MISSING_TIER: "RANGO DE COMISIÓN",
  MISSING_SALARY: "SUELDO",
  MISSING_BANK: "BANCO",
  MISSING_ACCOUNT: "CUENTA BANCARIA",
  MISSING_PHONE: "TELÉFONO",
  NEGATIVE_PAYMENT: "PAGO NEGATIVO",
  MISSING_BRANCH: "SUCURSAL",
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, 1)));
  return label.charAt(0).toLocaleUpperCase("es-MX") + label.slice(1);
}

function currentFortnight() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDay = now.getDate() <= 15 ? 1 : 16;
  const endDay = startDay === 1 ? 15 : new Date(year, month + 1, 0).getDate();
  const date = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const pay = new Date(year, month, endDay + 7);
  return {
    from: date(startDay),
    to: date(endDay),
    payDate: `${pay.getFullYear()}-${String(pay.getMonth() + 1).padStart(2, "0")}-${String(pay.getDate()).padStart(2, "0")}`,
  };
}

function payrollPeriodOptions(monthCount = 12): PayrollPeriodOption[] {
  const now = new Date();
  const options: PayrollPeriodOption[] = [];

  for (let offset = 0; offset < monthCount; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const monthNumber = date.getMonth() + 1;
    const month = `${year}-${String(monthNumber).padStart(2, "0")}`;
    const monthName = new Intl.DateTimeFormat("es-MX", {
      month: "long",
    }).format(date);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const isoDate = (day: number) => `${month}-${String(day).padStart(2, "0")}`;

    options.push(
      {
        value: isoDate(16),
        from: isoDate(16),
        to: isoDate(lastDay),
        month,
        label: `${monthName} ${year} · 2ª quincena · 16–${lastDay}`,
        shortLabel: `2ª quincena · días 16–${lastDay}`,
      },
      {
        value: isoDate(1),
        from: isoDate(1),
        to: isoDate(15),
        month,
        label: `${monthName} ${year} · 1ª quincena · 1–15`,
        shortLabel: "1ª quincena · días 1–15",
      },
    );
  }

  return options;
}

function suggestedPayDate(periodEnd: string) {
  const date = new Date(`${periodEnd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}

function commissionPaymentTotal(line: PayrollRunLine) {
  return (
    line.commission +
    line.bonus +
    line.payrollAdjustmentPositive +
    line.perDiem +
    line.supplies -
    line.fine -
    line.payrollAdjustmentNegative -
    line.loanPayment
  );
}

function hasApplicableSchemeAssignment(
  employeeId: string,
  periodStart: string,
  assignments: SchemeAssignment[],
  schemes: CommissionScheme[],
) {
  return assignments.some((assignment) => {
    if (
      assignment.employeeId !== employeeId ||
      assignment.effectiveFrom > periodStart ||
      (assignment.effectiveTo != null && assignment.effectiveTo < periodStart)
    ) {
      return false;
    }

    const scheme = schemes.find((item) => item.id === assignment.schemeId);
    return Boolean(
      scheme?.versions.some((version) => version.effectiveFrom <= periodStart),
    );
  });
}

export default function DashboardPage() {
  const data = usePayrollData();
  const { canWrite } = useSession();
  const hasWriteAccess = canWrite("payroll/resumen");
  const defaults = useMemo(currentFortnight, []);
  const periodOptions = useMemo(payrollPeriodOptions, []);
  const initialMonth = useMemo(currentMonth, []);
  const [summaryView, setSummaryView] = useState<SummaryView>("FORTNIGHT");
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [attentionExpanded, setAttentionExpanded] = useState(false);
  const [range, setRange] = useState({ from: defaults.from, to: defaults.to });
  const [payDate, setPayDate] = useState(defaults.payDate);
  const [mode, setMode] = useState<PayrollCalculationMode>("WITH_VAT");
  const [working, setWorking] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const autoRecalculationKey = useRef<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "pay" | "cancel" | null
  >(null);
  const run = data.selectedRun;
  const selectedPeriodRun = data.runs.find(
    (item) =>
      item.status !== "CANCELED" &&
      item.from === range.from &&
      item.to === range.to,
  );
  const editingSelectedDraft =
    selectedPeriodRun?.status === "DRAFT" && selectedPeriodRun.id === run?.id;
  const selectedExistingFinalRun = Boolean(
    selectedPeriodRun && selectedPeriodRun.status !== "DRAFT",
  );
  const monthOptions = useMemo(
    () =>
      [
        ...new Set([initialMonth, ...periodOptions.map((item) => item.month)]),
      ].sort((left, right) => right.localeCompare(left)),
    [initialMonth, periodOptions],
  );
  const staleSchemeConfigurationKey = useMemo(() => {
    if (!run || run.status !== "DRAFT") return null;

    const employeeIds = run.lines
      .filter(
        (line) =>
          line.warnings.some((warning) => warning.code === "MISSING_SCHEME") &&
          hasApplicableSchemeAssignment(
            line.employeeId,
            run.from,
            data.assignments,
            data.schemes,
          ),
      )
      .map((line) => line.employeeId)
      .sort();

    return employeeIds.length > 0
      ? `${run.id}:${employeeIds.join(",")}`
      : null;
  }, [data.assignments, data.schemes, run]);

  useEffect(() => {
    if (summaryView !== "MONTHLY") return;
    void data.loadMonthlySummary(selectedMonth);
  }, [data.loadMonthlySummary, data.runs, selectedMonth, summaryView]);

  useEffect(() => {
    if (!run) return;
    setRange({ from: run.from, to: run.to });
    setMode(run.mode);
    setPayDate(run.payDate);
  }, [run?.from, run?.id, run?.mode, run?.payDate, run?.to]);

  useEffect(() => {
    setAttentionExpanded(false);
  }, [run?.id]);

  useEffect(() => {
    if (
      !staleSchemeConfigurationKey ||
      !hasWriteAccess ||
      data.refreshing ||
      autoRecalculationKey.current === staleSchemeConfigurationKey
    ) {
      return;
    }

    autoRecalculationKey.current = staleSchemeConfigurationKey;
    setWorking(true);
    setRecalculating(true);
    void data
      .runAction("recalculate")
      .then(() => {
        toast.success(
          "Corrida actualizada con las asignaciones de esquema vigentes.",
        );
      })
      .catch((cause) => {
        toast.error(
          apiErrorMessage(
            cause,
            "No se pudo actualizar la corrida con el esquema asignado.",
          ),
        );
      })
      .finally(() => {
        setWorking(false);
        setRecalculating(false);
      });
  }, [data, data.refreshing, hasWriteAccess, staleSchemeConfigurationKey]);

  function selectPayrollPeriod(value: string) {
    const option = periodOptions.find((item) => item.value === value);
    if (!option) return;

    setRange({ from: option.from, to: option.to });
    const existingRun = data.runs.find(
      (item) =>
        item.status !== "CANCELED" &&
        item.from === option.from &&
        item.to === option.to,
    );
    if (existingRun) {
      void data.selectRun(existingRun.id);
      return;
    }

    data.clearRunSelection();
    setPayDate(suggestedPayDate(option.to));
  }

  async function createRun() {
    setWorking(true);
    try {
      await data.createRun({
        periodStart: range.from,
        periodEnd: range.to,
        payDate,
        mode,
      });
      toast.success("Corrida creada y calculada con datos reales.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  async function updateRun() {
    setWorking(true);
    try {
      await data.updateRun({ payDate, mode });
      toast.success("Corrida actualizada y recalculada.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  async function recalculateRun() {
    setWorking(true);
    setRecalculating(true);
    try {
      await data.runAction("recalculate");
      toast.success("Corrida recalculada con los datos vigentes.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "No se pudo recalcular la corrida."));
    } finally {
      setWorking(false);
      setRecalculating(false);
    }
  }

  async function executeAction() {
    if (!confirmAction) return;
    setWorking(true);
    try {
      await data.runAction(confirmAction);
      toast.success(
        confirmAction === "approve"
          ? "Corrida aprobada y congelada."
          : confirmAction === "pay"
            ? "Corrida pagada y recibos generados."
            : "Corrida cancelada.",
      );
      setConfirmAction(null);
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  const columns: ColumnDef<PayrollRunLine>[] = [
    {
      accessorKey: "employeeName",
      header: "EMPLEADO",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.employeeName}</p>
          <p className="text-sm text-[color:var(--text-muted)]">
            {row.original.position} / {row.original.branch}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "salesWithVat",
      header: "VENTAS CON IVA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.salesWithVat)}
        </div>
      ),
    },
    {
      accessorKey: "salesWithoutVat",
      header: "VENTAS SIN IVA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.salesWithoutVat)}
        </div>
      ),
    },
    {
      accessorKey: "scheme",
      header: "ESQUEMA",
      cell: ({ row }) => (
        <span>
          {row.original.scheme}
          {row.original.schemeVersion ? ` V${row.original.schemeVersion}` : ""}
        </span>
      ),
    },
    {
      accessorKey: "individualRate",
      header: "PORCENTAJE",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatPercent(row.original.individualRate)}
        </div>
      ),
    },
    {
      accessorKey: "commission",
      header: "COMISIÓN",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.commission)}
        </div>
      ),
    },
    {
      accessorKey: "bonus",
      header: "BONO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.bonus)}</div>
      ),
    },
    {
      accessorKey: "fine",
      header: "MULTA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.fine)}</div>
      ),
    },
    {
      accessorKey: "loanPayment",
      header: "PRÉSTAMO / ADELANTO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.loanPayment)}
        </div>
      ),
    },
    {
      accessorKey: "payrollAdjustmentPositive",
      header: "AJUSTE +",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.payrollAdjustmentPositive)}
        </div>
      ),
    },
    {
      accessorKey: "payrollAdjustmentNegative",
      header: "AJUSTE -",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.payrollAdjustmentNegative)}
        </div>
      ),
    },
    {
      accessorKey: "perDiem",
      header: "VIÁTICOS",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.perDiem)}</div>
      ),
    },
    {
      id: "totalPayment",
      accessorFn: commissionPaymentTotal,
      header: "TOTAL PAGO",
      meta: { align: "right" },
      cell: ({ getValue }) => (
        <div className="number-display text-right text-base">
          {formatCurrency(Number(getValue()))}
        </div>
      ),
    },
  ];

  const monthlyColumns: ColumnDef<MonthlyPayrollLine>[] = [
    {
      id: "employee",
      accessorFn: (row) =>
        [row.employeeName, row.positionName, ...row.branchNames]
          .filter(Boolean)
          .join(" "),
      header: "EMPLEADO",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.employeeName}</p>
          <p className="text-sm text-[color:var(--text-muted)]">
            {[row.original.positionName, row.original.branchNames.join(", ")]
              .filter(Boolean)
              .join(" / ")}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "firstFortnightTotal",
      header: "1–15",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.firstFortnightTotal)}
        </div>
      ),
    },
    {
      accessorKey: "secondFortnightTotal",
      header: "16–FIN",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.secondFortnightTotal)}
        </div>
      ),
    },
    {
      accessorKey: "salesWithVat",
      header: "VENTAS CON IVA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.salesWithVat)}
        </div>
      ),
    },
    {
      accessorKey: "commission",
      header: "COMISIÓN",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.commission)}
        </div>
      ),
    },
    {
      id: "extras",
      accessorFn: (row) =>
        row.bonus + row.adjustmentPositive + row.perDiem + row.supplies,
      header: "EXTRAS",
      meta: { align: "right" },
      cell: ({ getValue }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(Number(getValue()))}
        </div>
      ),
    },
    {
      id: "deductions",
      accessorFn: (row) => row.fine + row.adjustmentNegative + row.loanPayment,
      header: "DEDUCCIONES",
      meta: { align: "right" },
      cell: ({ getValue }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(Number(getValue()))}
        </div>
      ),
    },
    {
      accessorKey: "totalPayment",
      header: "TOTAL MENSUAL",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="number-display text-right text-base">
          {formatCurrency(row.original.totalPayment)}
        </div>
      ),
    },
  ];

  if (data.loading)
    return (
      <Card>
        <CardContent className="p-8 text-sm text-[var(--text-muted)]">
          Preparando datos de nómina…
        </CardContent>
      </Card>
    );
  if (data.error)
    return (
      <Card>
        <CardContent className="space-y-4 p-8">
          <p className="text-sm text-red-600">{data.error}</p>
          <Button onClick={() => void data.refreshAll()}>Reintentar</Button>
        </CardContent>
      </Card>
    );

  const lines = run?.lines ?? [];
  const deductions = sumBy(
    lines,
    (line) => line.fine + line.loanPayment + line.payrollAdjustmentNegative,
  );
  const adjustments = sumBy(
    lines,
    (line) =>
      line.bonus +
      line.payrollAdjustmentPositive +
      line.perDiem +
      line.supplies -
      line.fine -
      line.payrollAdjustmentNegative,
  );
  const attentionLines = lines
    .map((line) => {
      const issues: AttentionIssue[] = line.warnings.map((item) => ({
        code: item.code,
        label: ATTENTION_LABELS[item.code] ?? item.code.replaceAll("_", " "),
      }));
      const employee = data.employees.find(
        (candidate) => candidate.id === line.employeeId,
      );
      const missingBranch = employee?.branchId === null && !employee.allBranches;
      if (missingBranch) {
        issues.push({ code: "MISSING_BRANCH", label: "SUCURSAL" });
      }
      return {
        id: line.id,
        employeeName: line.employeeName,
        pendingCount: issues.length,
        issues,
      };
    })
    .filter((line) => line.pendingCount > 0);
  const attentionIssueCounts = [
    ...new Set(
      attentionLines.flatMap((line) => line.issues.map((issue) => issue.code)),
    ),
  ]
    .map((code) => {
      const issues = attentionLines.flatMap((line) => line.issues);
      return {
        code,
        label: issues.find((issue) => issue.code === code)?.label ?? code,
        count: issues.filter((issue) => issue.code === code).length,
      };
    })
    .sort((left, right) => right.count - left.count);
  const totalAttentionIssues = sumBy(
    attentionLines,
    (line) => line.pendingCount,
  );
  const attentionColumns: ColumnDef<AttentionLine>[] = [
    {
      accessorKey: "employeeName",
      header: "EMPLEADO",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.employeeName}</span>
      ),
    },
    {
      accessorKey: "pendingCount",
      header: "PENDIENTES",
      meta: { align: "center" },
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary">{row.original.pendingCount}</Badge>
        </div>
      ),
    },
    {
      id: "issues",
      accessorFn: (row) => row.issues.map((issue) => issue.label).join(" "),
      header: "DATOS POR COMPLETAR",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {row.original.issues.map((issue) => (
            <Badge
              key={issue.code}
              variant="outline"
              className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50"
            >
              {issue.label}
            </Badge>
          ))}
        </div>
      ),
    },
  ];
  const exportConfig = {
    title: "Resumen de nómina",
    subtitle: run
      ? `${formatDate(run.from)} - ${formatDate(run.to)} · ${run.mode === "WITH_VAT" ? "Con IVA" : "Sin IVA"}`
      : "",
    filename: `resumen-nomina-${run?.from ?? "sin-corrida"}`,
    sheetName: "Nómina",
    orientation: "landscape" as const,
    rows: lines,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: PayrollRunLine) => row.employeeName,
        width: 30,
      },
      {
        header: "SUCURSAL",
        accessor: (row: PayrollRunLine) => row.branch,
        width: 24,
      },
      {
        header: "VENTAS CON IVA",
        accessor: (row: PayrollRunLine) => row.salesWithVat,
        format: "currency" as const,
      },
      {
        header: "VENTAS SIN IVA",
        accessor: (row: PayrollRunLine) => row.salesWithoutVat,
        format: "currency" as const,
      },
      { header: "ESQUEMA", accessor: (row: PayrollRunLine) => row.scheme },
      {
        header: "PORCENTAJE",
        accessor: (row: PayrollRunLine) => row.individualRate * 100,
        format: "percent" as const,
      },
      {
        header: "COMISIÓN",
        accessor: (row: PayrollRunLine) => row.commission,
        format: "currency" as const,
      },
      {
        header: "BONO",
        accessor: (row: PayrollRunLine) => row.bonus,
        format: "currency" as const,
      },
      {
        header: "DEDUCCIONES",
        accessor: (row: PayrollRunLine) =>
          row.fine + row.loanPayment + row.payrollAdjustmentNegative,
        format: "currency" as const,
      },
    ],
  };
  const monthlySummary = data.monthlySummary;
  const monthlyLines = monthlySummary?.lines ?? [];
  const monthlyDeductions = sumBy(
    monthlyLines,
    (line) => line.fine + line.adjustmentNegative + line.loanPayment,
  );
  const monthlyExtras = sumBy(
    monthlyLines,
    (line) =>
      line.bonus + line.adjustmentPositive + line.perDiem + line.supplies,
  );
  const monthlyExportConfig = {
    title: monthlySummary?.isApproximate
      ? "Resumen mensual de nómina aproximada"
      : "Resumen mensual de nómina calculada",
    subtitle: `${formatMonth(selectedMonth)} · ${monthlySummary?.runCount ?? 0} ${(monthlySummary?.runCount ?? 0) === 1 ? "corrida" : "corridas"} y ${monthlySummary?.estimatedCount ?? 0} ${(monthlySummary?.estimatedCount ?? 0) === 1 ? "estimación" : "estimaciones"}`,
    filename: `resumen-nomina-mensual-${selectedMonth}`,
    sheetName: "Nómina mensual",
    orientation: "landscape" as const,
    rows: monthlyLines,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: MonthlyPayrollLine) => row.employeeName,
        width: 30,
      },
      {
        header: "SUCURSAL",
        accessor: (row: MonthlyPayrollLine) => row.branchNames.join(", "),
        width: 24,
      },
      {
        header: "VENTAS CON IVA",
        accessor: (row: MonthlyPayrollLine) => row.salesWithVat,
        format: "currency" as const,
      },
      {
        header: "COMISIÓN",
        accessor: (row: MonthlyPayrollLine) => row.commission,
        format: "currency" as const,
      },
      {
        header: "EXTRAS",
        accessor: (row: MonthlyPayrollLine) =>
          row.bonus + row.adjustmentPositive + row.perDiem + row.supplies,
        format: "currency" as const,
      },
      {
        header: "DEDUCCIONES",
        accessor: (row: MonthlyPayrollLine) =>
          row.fine + row.adjustmentNegative + row.loanPayment,
        format: "currency" as const,
      },
    ],
  };

  function monthlyRunRow(
    label: string,
    item: MonthlyPayrollRunReference | null,
  ) {
    return (
      <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {item ? (
            item.status === "ESTIMATED" ? (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50"
              >
                ESTIMADA
              </Badge>
            ) : (
              <StatusBadge status={item.status} />
            )
          ) : (
            <Badge variant="outline">FALTANTE</Badge>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <p className="text-sm text-[color:var(--text-muted)]">
            {item
              ? `${formatDate(item.periodStart)} – ${formatDate(item.periodEnd)} · ${item.mode === "WITH_VAT" ? "Con IVA" : "Sin IVA"}`
              : "Sin corrida calculada"}
          </p>
          <p className="number-display min-w-28 text-right">
            {formatCurrency(item?.payrollTotal ?? 0)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="page-title">Corridas de nómina</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Consulta corridas quincenales y su consolidado mensual calculado.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
          <div
            className="flex rounded-md border border-[color:var(--border-color)] p-1"
            role="group"
            aria-label="Vista del resumen"
          >
            <Button
              type="button"
              size="sm"
              variant={summaryView === "FORTNIGHT" ? "default" : "ghost"}
              className="flex-1 sm:flex-none"
              aria-pressed={summaryView === "FORTNIGHT"}
              onClick={() => setSummaryView("FORTNIGHT")}
            >
              <ListChecks className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Quincenal
            </Button>
            <Button
              type="button"
              size="sm"
              variant={summaryView === "MONTHLY" ? "default" : "ghost"}
              className="flex-1 sm:flex-none"
              aria-pressed={summaryView === "MONTHLY"}
              onClick={() => setSummaryView("MONTHLY")}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Mensual
            </Button>
          </div>
          {summaryView === "MONTHLY" && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue aria-label="Mes consolidado" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      {summaryView === "MONTHLY" ? (
        <>
          {data.monthlySummaryLoading ? (
            <Card>
              <CardContent
                className="p-8 text-sm text-[var(--text-muted)]"
                role="status"
              >
                Consolidando las corridas de {formatMonth(selectedMonth)}…
              </CardContent>
            </Card>
          ) : data.monthlySummaryError ? (
            <Card>
              <CardContent className="space-y-4 p-8">
                <p className="text-sm text-red-600">
                  {data.monthlySummaryError}
                </p>
                <Button
                  variant="outline"
                  onClick={() => void data.loadMonthlySummary(selectedMonth)}
                >
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          ) : monthlySummary ? (
            <>
              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-[color:var(--text-muted)]">
                          Mi nómina mensual{" "}
                          {monthlySummary.isApproximate
                            ? "aproximada"
                            : "calculada"}{" "}
                          es de
                        </p>
                        <Badge
                          variant={
                            monthlySummary.complete &&
                            !monthlySummary.isApproximate
                              ? "default"
                              : "outline"
                          }
                        >
                          {monthlySummary.isApproximate
                            ? "CÁLCULO APROXIMADO"
                            : `${monthlySummary.runCount} DE 2 QUINCENAS`}
                        </Badge>
                      </div>
                      <p className="number-display mt-2 text-3xl md:text-4xl">
                        {formatCurrency(monthlySummary.payrollTotal)}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                        {formatMonth(selectedMonth)}
                      </p>
                    </div>
                    <ReportExportButtons
                      config={monthlyExportConfig}
                      disabled={!monthlyLines.length}
                    />
                  </div>

                  <div className="mt-6 grid gap-x-8 gap-y-5 border-t border-[color:var(--border-color)] pt-5 sm:grid-cols-3">
                    {[
                      ["Ventas con IVA", monthlySummary.salesWithVat],
                      ["Gastos", monthlySummary.expenseTotal],
                      ["Balance general", monthlySummary.generalBalance],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">
                          {label}
                        </p>
                        <p className="number-display mt-1.5 text-xl">
                          {formatCurrency(Number(value))}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 divide-y divide-[color:var(--border-color)] border-t border-[color:var(--border-color)]">
                    {monthlyRunRow(
                      "Primera quincena",
                      monthlySummary.firstFortnight,
                    )}
                    {monthlyRunRow(
                      "Segunda quincena",
                      monthlySummary.secondFortnight,
                    )}
                  </div>
                </CardContent>
              </Card>

              {(!monthlySummary.complete ||
                monthlySummary.includesDraft ||
                monthlySummary.isApproximate) && (
                <Card className="border-amber-300 bg-amber-50/80 dark:border-amber-700 dark:bg-amber-950/30">
                  <CardContent className="flex gap-3 p-4 text-sm text-amber-950 dark:text-amber-50">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <p>
                      {!monthlySummary.complete
                        ? `Este cálculo incluye ${monthlySummary.runCount + monthlySummary.estimatedCount} de 2 quincenas. La quincena vigente se incorporará cuando termine o al crear su corrida.`
                        : ""}
                      {!monthlySummary.complete &&
                      (monthlySummary.includesDraft ||
                        monthlySummary.isApproximate)
                        ? " "
                        : ""}
                      {monthlySummary.isApproximate
                        ? `Incluye ${monthlySummary.estimatedCount} ${monthlySummary.estimatedCount === 1 ? "quincena estimada" : "quincenas estimadas"} con los datos históricos y la configuración disponible. No sustituye una corrida; crea la corrida histórica para validar y congelar el resultado.`
                        : ""}
                      {monthlySummary.isApproximate &&
                      monthlySummary.includesDraft
                        ? " "
                        : ""}
                      {monthlySummary.includesDraft
                        ? "Incluye una corrida en borrador; el monto puede cambiar al recalcularla."
                        : ""}
                    </p>
                  </CardContent>
                </Card>
              )}

              <SectionCard
                title="DETALLE MENSUAL POR EMPLEADO"
                action={
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <p>
                      <span className="text-[var(--text-muted)]">Extras </span>
                      <span className="number-display">
                        {formatCurrency(monthlyExtras)}
                      </span>
                    </p>
                    <p>
                      <span className="text-[var(--text-muted)]">
                        Deducciones{" "}
                      </span>
                      <span className="number-display">
                        {formatCurrency(monthlyDeductions)}
                      </span>
                    </p>
                  </div>
                }
              >
                <DataTable
                  columns={monthlyColumns}
                  data={monthlyLines}
                  searchPlaceholder="Buscar empleado, puesto o sucursal"
                  emptyMessage="Sin empleados en las corridas calculadas del mes"
                  pageSize={10}
                />
              </SectionCard>
            </>
          ) : null}
        </>
      ) : (
        <>
          {run ? (
            <Card>
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--text-muted)]">
                      Periodo seleccionado
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <p className="number-display text-xl">
                        {formatDate(run.from)} - {formatDate(run.to)}
                      </p>
                      <StatusBadge status={run.status} />
                    </div>
                  </div>
                  <ReportExportButtons
                    config={exportConfig}
                    disabled={!lines.length}
                  />
                </div>
                <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-[color:var(--border-color)] pt-5 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Ventas con IVA", run.salesWithVat],
                    ["Nómina total", run.payrollTotal],
                    ["Gastos", run.expenseTotal],
                    ["Balance general", run.generalBalance],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">
                        {label}
                      </p>
                      <p className="number-display mt-1.5 text-xl">
                        {formatCurrency(Number(value))}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="font-medium">
                  {data.runs.length > 0
                    ? "Periodo sin corrida"
                    : "Aún no hay corridas"}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {data.runs.length > 0
                    ? "Configura esta quincena para calcularla."
                    : "Configura la primera quincena para comenzar."}
                </p>
              </CardContent>
            </Card>
          )}

          <SectionCard
            title={
              !hasWriteAccess
                ? "SELECCIONAR PERIODO"
                : editingSelectedDraft
                ? "CONFIGURAR BORRADOR"
                : selectedExistingFinalRun
                  ? "PERIODO YA CALCULADO"
                  : "NUEVA CORRIDA"
            }
          >
            <Card>
              <CardContent
                className={`grid gap-4 p-5 lg:items-end ${
                  hasWriteAccess
                    ? "lg:grid-cols-[minmax(0,1fr)_13rem_13rem_auto]"
                    : "lg:grid-cols-1"
                }`}
              >
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Quincena</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {hasWriteAccess
                        ? "Consulta o crea una corrida de los últimos 12 meses."
                        : "Consulta una corrida de los últimos 12 meses."}
                    </p>
                  </div>
                  <FortnightSelect
                    options={periodOptions}
                    value={range.from}
                    onValueChange={selectPayrollPeriod}
                    className="w-full lg:w-auto lg:min-w-[15rem]"
                    getStatusLabel={(option) => {
                      const existingRun = data.runs.find(
                        (item) =>
                          item.status !== "CANCELED" &&
                          item.from === option.from &&
                          item.to === option.to,
                      );
                      return existingRun
                        ? formatStatus(existingRun.status)
                        : undefined;
                    }}
                  />
                </div>
                {hasWriteAccess ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Día de pago</p>
                      <DatePicker
                        value={payDate}
                        onChange={setPayDate}
                        disabled={selectedExistingFinalRun}
                      />
                    </div>
                    <Select
                      value={mode}
                      disabled={selectedExistingFinalRun}
                      onValueChange={(value) =>
                        setMode(value as PayrollCalculationMode)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WITH_VAT">Calcular con IVA</SelectItem>
                        <SelectItem value="WITHOUT_VAT">
                          Calcular sin IVA
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={
                        working || data.refreshing || selectedExistingFinalRun
                      }
                      onClick={() =>
                        void (editingSelectedDraft ? updateRun() : createRun())
                      }
                    >
                      {editingSelectedDraft ? (
                        <RefreshCw className="mr-1.5 h-4 w-4" />
                      ) : (
                        <PlusCircle className="mr-1.5 h-4 w-4" />
                      )}
                      {working
                        ? "Procesando…"
                        : selectedExistingFinalRun
                          ? "Periodo ya calculado"
                          : editingSelectedDraft
                            ? "Guardar y recalcular"
                            : "Crear corrida"}
                    </Button>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </SectionCard>

          {run && (
            <>
              {attentionLines.length > 0 && (
                <div className="space-y-4">
                  <Card className="border-amber-300 bg-amber-50/80 dark:border-amber-700 dark:bg-amber-950/30">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-3">
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 shrink-0 text-amber-800 dark:text-amber-200"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="font-semibold text-amber-950 dark:text-amber-50">
                              Revisa la configuración de {attentionLines.length}{" "}
                              {attentionLines.length === 1
                                ? "empleado"
                                : "empleados"}
                            </p>
                            <p className="mt-1 text-sm text-amber-950/75 dark:text-amber-50/75">
                              {totalAttentionIssues} datos pendientes. Los datos
                              de empleado se corrigen en Envelope; esquema y
                              rango, en Esquemas.
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 border-amber-300 bg-transparent text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-50 dark:hover:bg-amber-900/40"
                          aria-expanded={attentionExpanded}
                          aria-controls="payroll-attention-detail"
                          onClick={() => setAttentionExpanded((open) => !open)}
                        >
                          {attentionExpanded ? (
                            <ChevronUp
                              className="mr-1.5 h-4 w-4"
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronDown
                              className="mr-1.5 h-4 w-4"
                              aria-hidden="true"
                            />
                          )}
                          {attentionExpanded
                            ? "Ocultar detalle"
                            : "Ver detalle por empleado"}
                        </Button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-amber-200 pt-4 dark:border-amber-800">
                        {attentionIssueCounts.map((issue) => (
                          <Badge
                            key={issue.code}
                            variant="outline"
                            className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50"
                          >
                            {issue.label} · {issue.count}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {attentionExpanded && (
                    <div id="payroll-attention-detail">
                      <DataTable
                        columns={attentionColumns}
                        data={attentionLines}
                        searchPlaceholder="Buscar empleado o dato pendiente"
                        emptyMessage="Sin datos pendientes"
                        pageSize={10}
                      />
                    </div>
                  )}
                </div>
              )}
              <SectionCard
                title="DETALLE POR EMPLEADO"
                action={
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <p>
                      <span className="text-[var(--text-muted)]">
                        Ventas sin IVA{" "}
                      </span>
                      <span className="number-display">
                        {formatCurrency(run.salesWithoutVat)}
                      </span>
                    </p>
                    <p>
                      <span className="text-[var(--text-muted)]">
                        Deducciones{" "}
                      </span>
                      <span className="number-display">
                        {formatCurrency(deductions)}
                      </span>
                    </p>
                    <p>
                      <span className="text-[var(--text-muted)]">
                        Ajustes netos{" "}
                      </span>
                      <span className="number-display">
                        {formatCurrency(adjustments)}
                      </span>
                    </p>
                  </div>
                }
              >
                <DataTable
                  columns={columns}
                  data={lines}
                  searchPlaceholder="Buscar empleado, sucursal o esquema"
                  emptyMessage="Sin empleados en esta corrida"
                  pageSize={10}
                />
              </SectionCard>
              {hasWriteAccess ? <div className="space-y-2">
                {recalculating && (
                  <p
                    className="text-right text-sm text-[var(--text-muted)]"
                    role="status"
                    aria-live="polite"
                  >
                    Recalculando la corrida con los datos vigentes. Puede tardar
                    hasta dos minutos.
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  {run.status === "DRAFT" && (
                    <>
                      <Button
                        variant="outline"
                        disabled={working}
                        aria-busy={recalculating}
                        onClick={() => void recalculateRun()}
                      >
                        <RefreshCw
                          aria-hidden="true"
                          className={`mr-1.5 h-4 w-4 ${recalculating ? "animate-spin" : ""}`}
                        />
                        {recalculating ? "Recalculando..." : "Recalcular"}
                      </Button>
                      <Button
                        disabled={working}
                        onClick={() => setConfirmAction("approve")}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Aprobar corrida
                      </Button>
                      <Button
                        variant="outline"
                        disabled={working}
                        onClick={() => setConfirmAction("cancel")}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" />
                        Cancelar corrida
                      </Button>
                    </>
                  )}
                  {run.status === "APPROVED" && (
                    <>
                      <Button
                        disabled={working}
                        onClick={() => setConfirmAction("pay")}
                      >
                        <CircleDollarSign className="mr-1.5 h-4 w-4" />
                        Marcar pagada
                      </Button>
                      <Button
                        variant="outline"
                        disabled={working}
                        onClick={() => setConfirmAction("cancel")}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" />
                        Cancelar corrida
                      </Button>
                    </>
                  )}
                </div>
              </div> : null}
            </>
          )}
        </>
      )}

      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approve"
                ? "Aprobar corrida"
                : confirmAction === "pay"
                  ? "Marcar corrida como pagada"
                  : "Cancelar corrida"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve"
                ? "Se congelarán los cálculos y se reservarán movimientos, gastos y cuotas."
                : confirmAction === "pay"
                  ? "Se aplicarán las cuotas y se generarán los recibos. Esta acción no se puede revertir."
                  : "Se liberarán las reservas y se conservará el registro cancelado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmAction === "cancel"
                  ? "bg-red-600 hover:bg-red-700"
                  : undefined
              }
              disabled={working}
              onClick={() => void executeAction()}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
