"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import {
  AlertTriangle,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  Landmark,
  LockKeyhole,
  ShieldPlus,
  UsersRound,
} from "lucide-react";
import {
  type PayrollModule,
  usePayrollDemo,
} from "./payroll-demo-context";
import { kioskPayrollForMonth } from "./kiosk-payroll-calculator";
import { ReportExportButtons } from "./report-export-buttons";
import {
  nextTableSort,
  sortTableRows,
  SortableTableHead,
  type TableSortKind,
  type TableSortState,
} from "./sortable-table-head";
import type { ReportExportConfig } from "@/lib/report-export";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

const modules = [
  "CONSOLIDATED",
  "FIXED",
  "SPECIALIST",
  "COMMISSION",
  "KIOSK_COMMISSION",
  "CONTRACTOR",
] as const;
type DisbursementModule = (typeof modules)[number];

const moduleCopy: Record<
  DisbursementModule,
  { label: string; detail: string }
> = {
  CONSOLIDATED: {
    label: "TODAS LAS NÓMINAS",
    detail: "PRE-CÁLCULO TOTAL DEL PERIODO",
  },
  FIXED: { label: "SALARIO FIJO", detail: "GERENCIA Y CALL CENTER" },
  SPECIALIST: { label: "ESPECIALISTAS", detail: "FACIALISTAS Y ESPECIALISTAS" },
  COMMISSION: { label: "COMISIONES", detail: "VENTA Y ESQUEMA APLICADO" },
  KIOSK_COMMISSION: {
    label: "COMISIÓN DE KIOSCO",
    detail: "CIERRE MENSUAL GERENCIAL",
  },
  CONTRACTOR: { label: "HONORARIOS", detail: "SERVICIOS FACTURADOS" },
};

interface DisbursementRun {
  id: string;
  module: DisbursementModule;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  mode: "WITH_VAT" | "WITHOUT_VAT";
  status: "DRAFT" | "APPROVED" | "PAID";
}

interface DisbursementRow {
  id: string;
  paternalSurname: string;
  maternalSurname: string;
  firstName: string;
  position: string;
  bank: string;
  clabe: string;
  payment: number;
  isr: number;
  socialCost: number;
  total: number;
  branch: string;
}

interface DisbursementTotals {
  payment: number;
  isr: number;
  socialCost: number;
  total: number;
}

interface OpenPayrollWarning {
  id: string;
  label: string;
  periodStart: string;
  periodEnd: string;
}

type DisbursementSortKey =
  | "paternalSurname"
  | "maternalSurname"
  | "firstName"
  | "position"
  | "bank"
  | "payment"
  | "isr"
  | "socialCost"
  | "total";

function fallbackName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1)
    return {
      firstName: parts[0] ?? "—",
      paternalSurname: "—",
      maternalSurname: "—",
    };
  return {
    firstName: parts.slice(0, -1).join(" "),
    paternalSurname: parts.at(-1) ?? "—",
    maternalSurname: "—",
  };
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(
    Date.UTC(year ?? 0, monthNumber ?? 1, 0),
  ).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sumDisbursementRows(rows: DisbursementRow[]): DisbursementTotals {
  return rows.reduce(
    (result, row) => ({
      payment: result.payment + row.payment,
      isr: result.isr + row.isr,
      socialCost: result.socialCost + row.socialCost,
      total: result.total + row.total,
    }),
    { payment: 0, isr: 0, socialCost: 0, total: 0 },
  );
}

function runStatusLabel(status: DisbursementRun["status"]) {
  if (status === "PAID") return "PAGADA";
  if (status === "APPROVED") return "CERRADA PARA PAGO";
  return "EN PREPARACIÓN";
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
    <Card className="border-[color:var(--border-color)]">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div>
          <p className="label-caps">{label}</p>
          <p className="number-display mt-1 text-xl">{value}</p>
          <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
            {detail}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#c7a17a]/30 bg-[#c7a17a]/10 text-[#946a43]">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function DisbursementTaxToggle({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${checked ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" : "border-[color:var(--border-color)] bg-[color:var(--input-disabled-bg)] text-[color:var(--text-muted)]"}`}
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

export function PayrollDisbursementDemo() {
  const {
    state,
    payrollLines,
    periodOptions,
    currentPeriod,
    setModuleTaxInclusion,
  } = usePayrollDemo();
  const [module, setModule] = useState<DisbursementModule>("CONSOLIDATED");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);
  const [tableSort, setTableSort] =
    useState<TableSortState<DisbursementSortKey>>(null);

  useEffect(() => {
    document.body.classList.add("payroll-dispersion-print");
    return () => document.body.classList.remove("payroll-dispersion-print");
  }, []);

  const availableRuns = useMemo<DisbursementRun[]>(() => {
    if (module === "KIOSK_COMMISSION") {
      const currentMonth = currentPeriod.start.slice(0, 7);
      return Array.from(
        new Set(state.kioskMonthlySales.map((sale) => sale.month)),
      )
        .sort((a, b) => b.localeCompare(a))
        .map((month) => {
          const periodEnd = monthEnd(month);
          return {
            id: `run-kiosk-${month}`,
            module,
            periodStart: `${month}-01`,
            periodEnd,
            payDate: addDays(periodEnd, 3),
            mode: "WITH_VAT",
            status: month < currentMonth ? "PAID" : "DRAFT",
          };
        });
    }
    const moduleRuns = state.runs.filter(
      (item) => item.module === module,
    ) as DisbursementRun[];
    const knownPeriods = new Set(
      moduleRuns.map((item) => `${item.periodStart}:${item.periodEnd}`),
    );
    const demoHistory = periodOptions
      .filter(
        (period) =>
          period.end < currentPeriod.start &&
          !knownPeriods.has(`${period.start}:${period.end}`),
      )
      .slice(0, 6)
      .map<DisbursementRun>((period) => ({
        id: `history-${module.toLocaleLowerCase()}-${period.start}`,
        module,
        periodStart: period.start,
        periodEnd: period.end,
        payDate: addDays(period.end, 3),
        mode: "WITH_VAT",
        status: "PAID",
      }));
    return [...moduleRuns, ...demoHistory].sort((a, b) =>
      b.periodEnd.localeCompare(a.periodEnd),
    );
  }, [
    currentPeriod.start,
    module,
    periodOptions,
    state.kioskMonthlySales,
    state.runs,
  ]);
  const run =
    availableRuns.find((item) => item.id === selectedRunId) ?? availableRuns[0];
  const kioskPayroll =
    module === "KIOSK_COMMISSION" && run
      ? kioskPayrollForMonth(state, run.periodStart.slice(0, 7))
      : null;
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const isMaster = activeEmployee?.roleId === "role-admin";
  const globalIncludeSocialCost =
    kioskPayroll?.taxInclusion.global?.includeSocialCost ?? true;
  const globalIncludeIsr =
    kioskPayroll?.taxInclusion.global?.includeIsr ?? true;

  const availablePeriodCounts = useMemo(() => {
    return Object.fromEntries(
      modules.map((item) => {
        if (item === "KIOSK_COMMISSION") {
          const kioskPeriods = Array.from(
            new Set(state.kioskMonthlySales.map((sale) => sale.month)),
          ).length;
          return [item, kioskPeriods];
        }

        const moduleRuns = state.runs.filter(
          (runItem) => runItem.module === item,
        );
        const knownPeriods = new Set(
          moduleRuns.map(
            (runItem) => `${runItem.periodStart}:${runItem.periodEnd}`,
          ),
        );
        const historicalPeriods = periodOptions
          .filter(
            (period) =>
              period.end < currentPeriod.start &&
              !knownPeriods.has(`${period.start}:${period.end}`),
          )
          .slice(0, 6).length;

        return [item, moduleRuns.length + historicalPeriods];
      }),
    ) as Record<DisbursementModule, number>;
  }, [currentPeriod.start, periodOptions, state.kioskMonthlySales, state.runs]);

  const dispersionPreview = useMemo<{
    rows: DisbursementRow[];
    consolidatedRows: DisbursementRow[];
    kioskRows: DisbursementRow[];
  }>(() => {
    if (!run) return { rows: [], consolidatedRows: [], kioskRows: [] };

    const mapKioskRows = (month: string, keepEmployeeId = false) =>
      kioskPayrollForMonth(state, month)
        .managerRows.filter(
          (row) =>
            row.commission > 0 ||
            row.isr > 0 ||
            row.socialCost > 0 ||
            row.totalCost > 0,
        )
        .map<DisbursementRow>((row) => {
          const fallback = fallbackName(row.manager.name);
          return {
            id: keepEmployeeId
              ? row.manager.id
              : `kiosk-${month}-${row.manager.id}`,
            paternalSurname:
              row.manager.paternalSurname ?? fallback.paternalSurname,
            maternalSurname:
              row.manager.maternalSurname ?? fallback.maternalSurname,
            firstName: row.manager.firstName ?? fallback.firstName,
            position: row.manager.position,
            bank: row.manager.bank,
            clabe:
              row.manager.clabe ??
              `CLABE DEMO ${row.manager.account.replace(/\D/g, "").padStart(18, "0")}`,
            payment: row.commission,
            isr: row.isr,
            socialCost: row.socialCost,
            total: row.totalCost,
            branch: row.branchNames.join(" · "),
          };
        });

    if (module === "KIOSK_COMMISSION") {
      const kioskRows = mapKioskRows(run.periodStart.slice(0, 7));
      return { rows: kioskRows, consolidatedRows: [], kioskRows };
    }

    const consolidatedRows = payrollLines(
      run.periodStart,
      run.mode,
      run.periodEnd,
      module,
    ).map<DisbursementRow>((line) => {
      const fallback = fallbackName(line.employee.name);
      const branch =
        state.branches.find((item) => item.id === line.employee.branchId)
          ?.name ?? "SIN SUCURSAL";
      return {
        id: line.employee.id,
        paternalSurname:
          line.employee.paternalSurname ?? fallback.paternalSurname,
        maternalSurname:
          line.employee.maternalSurname ?? fallback.maternalSurname,
        firstName: line.employee.firstName ?? fallback.firstName,
        position: line.employee.position,
        bank: line.employee.bank,
        clabe:
          line.employee.clabe ??
          `CLABE DEMO ${line.employee.account.replace(/\D/g, "").padStart(18, "0")}`,
        payment: line.total,
        isr: line.isrCost,
        socialCost: line.socialCost,
        total: line.totalCost,
        branch,
      };
    });

    const includesMonthlyKiosk =
      module === "CONSOLIDATED" &&
      run.periodStart.slice(0, 7) === run.periodEnd.slice(0, 7) &&
      run.periodEnd === monthEnd(run.periodEnd.slice(0, 7));
    const kioskRows = includesMonthlyKiosk
      ? mapKioskRows(run.periodEnd.slice(0, 7), true)
      : [];

    if (kioskRows.length === 0) {
      return { rows: consolidatedRows, consolidatedRows, kioskRows };
    }

    const combinedRows = new Map(
      consolidatedRows.map((row) => [row.id, row] as const),
    );
    kioskRows.forEach((kioskRow) => {
      const existing = combinedRows.get(kioskRow.id);
      if (!existing) {
        combinedRows.set(kioskRow.id, kioskRow);
        return;
      }
      combinedRows.set(kioskRow.id, {
        ...existing,
        payment: existing.payment + kioskRow.payment,
        isr: existing.isr + kioskRow.isr,
        socialCost: existing.socialCost + kioskRow.socialCost,
        total: existing.total + kioskRow.total,
        branch: Array.from(
          new Set(
            `${existing.branch} · ${kioskRow.branch}`
              .split(" · ")
              .filter(Boolean),
          ),
        ).join(" · "),
      });
    });

    return {
      rows: Array.from(combinedRows.values()),
      consolidatedRows,
      kioskRows,
    };
  }, [module, payrollLines, run, state]);

  const rawRows = dispersionPreview.rows;

  const rows = useMemo(
    () =>
      sortTableRows(rawRows, tableSort, {
        paternalSurname: (row) => row.paternalSurname,
        maternalSurname: (row) => row.maternalSurname,
        firstName: (row) => row.firstName,
        position: (row) => `${row.position} ${row.branch}`,
        bank: (row) => `${row.bank} ${row.clabe}`,
        payment: (row) => row.payment,
        isr: (row) => row.isr,
        socialCost: (row) => row.socialCost,
        total: (row) => row.total,
      }),
    [rawRows, tableSort],
  );

  function changeTableSort(
    key: DisbursementSortKey,
    kind: TableSortKind,
  ) {
    setTableSort((current) => nextTableSort(current, key, kind));
    setPage(1);
  }

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

  const totals = useMemo(() => sumDisbursementRows(rows), [rows]);
  const consolidatedSourceTotals = useMemo(
    () => sumDisbursementRows(dispersionPreview.consolidatedRows),
    [dispersionPreview.consolidatedRows],
  );
  const kioskSourceTotals = useMemo(
    () => sumDisbursementRows(dispersionPreview.kioskRows),
    [dispersionPreview.kioskRows],
  );
  const expectedConsolidatedTotal =
    consolidatedSourceTotals.total + kioskSourceTotals.total;
  const reconciliationDifference = totals.total - expectedConsolidatedTotal;
  const isReconciled = Math.abs(reconciliationDifference) < 0.01;

  const openPayrollWarnings = useMemo<OpenPayrollWarning[]>(() => {
    if (!run) return [];

    if (module !== "CONSOLIDATED") {
      return run.status === "DRAFT"
        ? [
            {
              id: run.id,
              label: moduleCopy[module].label,
              periodStart: run.periodStart,
              periodEnd: run.periodEnd,
            },
          ]
        : [];
    }

    const sourceModules: DisbursementModule[] = [
      "FIXED",
      "SPECIALIST",
      "COMMISSION",
      "CONTRACTOR",
    ];
    const warnings = sourceModules.flatMap<OpenPayrollWarning>(
      (sourceModule) => {
        const sourceRun = state.runs.find(
          (item) =>
            item.module === sourceModule &&
            item.periodStart === run.periodStart &&
            item.periodEnd === run.periodEnd,
        );
        const isCurrentUnclosedRun =
          (!sourceRun && run.periodEnd >= currentPeriod.start) ||
          sourceRun?.status === "DRAFT";
        return isCurrentUnclosedRun
          ? [
              {
                id: sourceRun?.id ?? `${sourceModule}-${run.periodStart}`,
                label: moduleCopy[sourceModule].label,
                periodStart: run.periodStart,
                periodEnd: run.periodEnd,
              },
            ]
          : [];
      },
    );

    if (dispersionPreview.kioskRows.length > 0) {
      const kioskMonth = run.periodEnd.slice(0, 7);
      const currentMonth = currentPeriod.start.slice(0, 7);
      if (kioskMonth >= currentMonth) {
        warnings.push({
          id: `run-kiosk-${kioskMonth}`,
          label: moduleCopy.KIOSK_COMMISSION.label,
          periodStart: `${kioskMonth}-01`,
          periodEnd: monthEnd(kioskMonth),
        });
      }
    }

    if (warnings.length === 0 && run.status === "DRAFT") {
      warnings.push({
        id: run.id,
        label: moduleCopy.CONSOLIDATED.label,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
      });
    }

    return warnings;
  }, [currentPeriod.start, dispersionPreview.kioskRows.length, module, run, state.runs]);

  const footerRow: DisbursementRow = {
    id: "total",
    paternalSurname: "TOTAL",
    maternalSurname: "",
    firstName: "",
    position: "",
    bank: "",
    clabe: "",
    payment: totals.payment,
    isr: totals.isr,
    socialCost: totals.socialCost,
    total: totals.total,
    branch: "",
  };

  const exportConfig: ReportExportConfig<DisbursementRow> = {
    title: `DISPERSIÓN DE NÓMINA · ${moduleCopy[module].label}`,
    subtitle: run
      ? `PERIODO ${run.periodStart} — ${run.periodEnd} · CORRIDA ${runStatusLabel(run.status)} · DATOS DEMOSTRATIVOS`
      : "SIN PERIODO DISPONIBLE",
    metadata: [
      {
        label: "Periodo",
        value: run ? `${run.periodStart} — ${run.periodEnd}` : "SIN PERIODO",
      },
      { label: "Tipo de nómina", value: moduleCopy[module].label },
      {
        label: "Alcance",
        value:
          module === "CONSOLIDATED"
            ? "EMPRESA COMPLETA · TODO EL PERSONAL INCLUIDO"
            : "REPORTE GENERAL · PERSONAL INCLUIDO",
      },
      {
        label: "Estado",
        value: run ? runStatusLabel(run.status) : "NO DISPONIBLE",
      },
      {
        label: "Tipo de cálculo",
        value:
          openPayrollWarnings.length > 0
            ? "PRE-CÁLCULO VIVO · INCLUYE NÓMINAS ABIERTAS"
            : "CÁLCULO CERRADO DEL PERIODO",
      },
      ...(openPayrollWarnings.length > 0
        ? [
            {
              label: "Nóminas abiertas",
              value: openPayrollWarnings
                .map((warning) => warning.label)
                .join(" · "),
            },
          ]
        : []),
    ],
    metrics: [
      {
        label: "Personal",
        value: String(rows.length),
        detail: "Registros para dispersión",
      },
      {
        label: "Neto precalculado",
        value: money.format(totals.payment),
        detail: "Incluye corridas abiertas y no pagadas",
      },
      {
        label: "Cargas",
        value: money.format(totals.isr + totals.socialCost),
        detail: "ISR + costo social",
      },
      {
        label: "Costo total",
        value: money.format(totals.total),
        detail: "Pago + cargas",
      },
    ],
    analysis: [
      module === "CONSOLIDATED"
        ? "El precálculo consolida una sola fila por empleado e incluye las nóminas del periodo aunque todavía no estén cerradas o pagadas."
        : `La dispersión corresponde a ${moduleCopy[module].label.toLocaleLowerCase("es-MX")} y conserva a todo el personal asignado a esa nómina.`,
      ...(module === "CONSOLIDATED"
        ? [
            `Conciliación: nómina consolidada ${money.format(consolidatedSourceTotals.total)} + comisión de kiosco ${money.format(kioskSourceTotals.total)} = ${money.format(expectedConsolidatedTotal)}.`,
          ]
        : []),
      ...(openPayrollWarnings.length > 0
        ? [
            `Pendientes de cierre: ${openPayrollWarnings
              .map(
                (warning) =>
                  `${warning.label} (${warning.periodStart} — ${warning.periodEnd})`,
              )
              .join("; ")}.`,
          ]
        : []),
      run
        ? `La corrida ${run.id.toLocaleUpperCase("es-MX")} está ${runStatusLabel(run.status).toLocaleLowerCase("es-MX")}.`
        : "No existe un periodo disponible para consultar.",
      "El personal se ordena por apellido paterno, apellido materno y nombre para control bancario.",
    ],
    filename: `dispersion-${module.toLocaleLowerCase()}-${run?.periodStart ?? "sin-periodo"}`,
    sheetName: `Dispersión ${moduleCopy[module].label}`,
    orientation: "landscape",
    columns: [
      {
        header: "Apellido paterno",
        accessor: (row) => row.paternalSurname,
        width: 18,
      },
      {
        header: "Apellido materno",
        accessor: (row) => row.maternalSurname,
        width: 18,
      },
      { header: "Nombre(s)", accessor: (row) => row.firstName, width: 22 },
      { header: "Puesto", accessor: (row) => row.position, width: 25 },
      { header: "Banco", accessor: (row) => row.bank, width: 14 },
      {
        header: "CLABE interbancaria",
        accessor: (row) => row.clabe,
        width: 23,
      },
      {
        header: "Neto a cobrar",
        accessor: (row) => row.payment,
        format: "currency",
        width: 17,
      },
      {
        header: "ISR",
        accessor: (row) => row.isr,
        format: "currency",
        width: 15,
      },
      {
        header: "Costo social",
        accessor: (row) => row.socialCost,
        format: "currency",
        width: 17,
      },
      {
        header: "Costo total",
        accessor: (row) => row.total,
        format: "currency",
        width: 17,
      },
    ],
    rows,
    footerRow,
  };

  return (
    <div className="payroll-dispersion-page space-y-6">
      <header className="flex flex-col gap-4 border-b border-[color:var(--border-color)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">CONTROL DE DISPERSIÓN</Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Datos exclusivamente frontend
            </span>
          </div>
          <h1 className="page-title">Dispersión de nómina</h1>
          <p className="mt-2 max-w-3xl text-sm text-[color:var(--text-muted)]">
            Consulta a todo el personal incluido y su neto final. El periodo
            actual se muestra como vista previa; impresión, PDF y Excel se
            habilitan al cerrar o pagar la corrida.
          </p>
        </div>
        <div className="payroll-dispersion-controls">
          <ReportExportButtons
            config={exportConfig}
            disabled={!run || run.status === "DRAFT" || rows.length === 0}
          />
        </div>
      </header>

      <section
        className="payroll-dispersion-controls rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-3 shadow-sm"
        aria-label="Tipos de nómina"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {modules.map((item) => {
            const active = module === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setModule(item);
                  setSelectedRunId("");
                  setPage(1);
                }}
                aria-pressed={active}
                className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all ${active ? "border-[#9b704d] bg-[linear-gradient(120deg,#332820,#60442f)] text-white shadow-lg" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)] hover:border-[#b58a64]"}`}
              >
                <span>
                  <span
                    className={`block text-[10px] font-semibold tracking-[0.1em] ${active ? "text-[#f1cfaa]" : "text-[color:var(--text-secondary)]"}`}
                  >
                    {moduleCopy[item].label}
                  </span>
                  <span
                    className={`mt-0.5 block text-[8px] tracking-[0.08em] ${active ? "text-white/60" : "text-[color:var(--text-muted)]"}`}
                  >
                    {moduleCopy[item].detail}
                  </span>
                </span>
                <span
                  className={`flex h-7 min-w-7 items-center justify-center rounded-lg border px-1.5 text-[9px] font-semibold ${active ? "border-white/20 bg-white/10" : "border-[color:var(--border-color)]"}`}
                >
                  {availablePeriodCounts[item]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {run && openPayrollWarnings.length > 0 && (
        <section
          role="alert"
          aria-live="polite"
          className="rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-rose-950 shadow-sm dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Precálculo con nóminas todavía abiertas
              </p>
              <p className="mt-1 text-xs text-rose-800 dark:text-rose-200">
                Estos importes ya se suman al total del periodo aunque la
                nómina aún no esté cerrada ni marcada como pagada.
              </p>
              <ul className="mt-3 grid gap-2 lg:grid-cols-2">
                {openPayrollWarnings.map((warning) => (
                  <li
                    key={warning.id}
                    className="rounded-xl border border-rose-200 bg-white/70 px-3 py-2 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
                  >
                    {warning.label} · {warning.periodStart} — {warning.periodEnd}
                    <span className="ml-1 font-normal">no está cerrada.</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {!run ? (
        <Card className="overflow-hidden border-amber-300/70">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">
              No existe un periodo disponible de{" "}
              {moduleCopy[module].label.toLocaleLowerCase("es-MX")}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[color:var(--text-muted)]">
              En cuanto exista una corrida, este formato se alimentará
              automáticamente. Los periodos cerrados o pagados habilitan
              impresión, PDF y Excel.
            </p>
            <Badge
              variant="outline"
              className="mt-5 border-amber-300 text-amber-800 dark:text-amber-200"
            >
              SIN INFORMACIÓN PARA DISPERSIÓN
            </Badge>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="payroll-dispersion-controls grid gap-4 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(280px,.6fr)] lg:items-end">
            <div>
              <p className="label-caps">HISTORIAL DE DISPERSIÓN</p>
              <h2 className="mt-1 text-base font-semibold">
                Periodo a consultar
              </h2>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                El periodo seleccionado controla la información de pantalla,
                impresión, PDF y Excel.
              </p>
            </div>
            <div className="space-y-2">
              <Select
                value={run.id}
                onValueChange={(value) => {
                  setSelectedRunId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Periodo de dispersión">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRuns.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.periodStart} — {item.periodEnd} ·{" "}
                      {runStatusLabel(item.status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[color:var(--text-muted)]">
                {availableRuns.length} periodos disponibles · los cerrados o
                pagados se pueden exportar.
              </p>
            </div>
          </section>
          {module === "KIOSK_COMMISSION" && kioskPayroll && (
            <section className="payroll-dispersion-controls rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="label-caps">CARGAS DE COMISIÓN POR KIOSCO</p>
                  <h2 className="mt-1 text-base font-semibold">
                    ISR y costo social del periodo mensual
                  </h2>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    Con la regla general apagada, estos controles modifican
                    únicamente kiosco, sus recibos gerenciales, reportes y esta
                    dispersión.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DisbursementTaxToggle
                    label={
                      globalIncludeSocialCost
                        ? "Costo social · global"
                        : "Costo social · kiosco"
                    }
                    checked={kioskPayroll.taxInclusion.includeSocialCost}
                    disabled={!isMaster || globalIncludeSocialCost}
                    onCheckedChange={(includeSocialCost) =>
                      setModuleTaxInclusion(
                        "KIOSK_COMMISSION",
                        kioskPayroll.bounds.start,
                        kioskPayroll.bounds.end,
                        { includeSocialCost },
                      )
                    }
                  />
                  <DisbursementTaxToggle
                    label={globalIncludeIsr ? "ISR · global" : "ISR · kiosco"}
                    checked={kioskPayroll.taxInclusion.includeIsr}
                    disabled={!isMaster || globalIncludeIsr}
                    onCheckedChange={(includeIsr) =>
                      setModuleTaxInclusion(
                        "KIOSK_COMMISSION",
                        kioskPayroll.bounds.start,
                        kioskPayroll.bounds.end,
                        { includeIsr },
                      )
                    }
                  />
                </div>
              </div>
            </section>
          )}
          <section id="payroll-dispersion-report" className="space-y-5">
            <Card className="overflow-hidden border-[#a47b56]/40 bg-card text-white">
              <CardContent className="p-5">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-[#e8c89f]" />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Formato de dispersión
                      </p>
                    </div>
                    <h2 className="mt-3 font-brand text-2xl tracking-wide">
                      {moduleCopy[module].label}
                    </h2>
                    <p className="mt-1 text-xs text-white/65">
                      {run.periodStart} — {run.periodEnd} · pago {run.payDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        run.status === "DRAFT"
                          ? "border border-amber-300/30 bg-amber-400/10 text-amber-100"
                          : "border border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                      }
                    >
                      {run.status === "DRAFT" ? (
                        <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {runStatusLabel(run.status)}
                    </Badge>
                    <Badge className="border border-white/15 bg-white/5 text-white">
                      FOLIO {run.id.toLocaleUpperCase("es-MX")}
                    </Badge>
                    {run.status === "DRAFT" && (
                      <Badge className="border border-amber-300/30 bg-amber-400/10 text-amber-100">
                        VISTA PREVIA · NO EXPORTABLE
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                icon={UsersRound}
                label="PERSONAL"
                value={String(rows.length)}
                detail="REGISTROS PARA DISPERSIÓN"
              />
              <Metric
                icon={CircleDollarSign}
                label="NETO PRECALCULADO"
                value={money.format(totals.payment)}
                detail="INCLUYE ABIERTAS Y NO PAGADAS"
              />
              <Metric
                icon={ShieldPlus}
                label="CARGAS"
                value={money.format(totals.isr + totals.socialCost)}
                detail="ISR + COSTO SOCIAL"
              />
              <Metric
                icon={Building2}
                label="COSTO TOTAL"
                value={money.format(totals.total)}
                detail="PAGO + CARGAS"
              />
            </div>

            {module === "CONSOLIDATED" && (
              <div
                className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${isReconciled ? "border-emerald-300/70 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100" : "border-rose-300/70 bg-rose-50/70 text-rose-950 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-100"}`}
              >
                <div className="flex items-start gap-3">
                  <Calculator className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      Conciliación del precálculo
                    </p>
                    <p className="mt-1 text-xs opacity-80">
                      Consolidado vivo {money.format(consolidatedSourceTotals.total)}
                      {" + "}comisión de kiosco {money.format(kioskSourceTotals.total)}
                      {" = "}{money.format(expectedConsolidatedTotal)}.
                    </p>
                    <p className="mt-1 text-[10px] opacity-70">
                      Kiosco se integra una sola vez al cierre mensual y se suma
                      sobre la fila existente del gerente.
                    </p>
                  </div>
                </div>
                <Badge
                  className={
                    isReconciled
                      ? "border border-emerald-400/40 bg-emerald-600 text-white"
                      : "border border-rose-400/40 bg-rose-600 text-white"
                  }
                >
                  {isReconciled
                    ? "CUADRADO"
                    : `DIFERENCIA ${money.format(reconciliationDifference)}`}
                </Badge>
              </div>
            )}

            <Card className="overflow-hidden border-[color:var(--border-color)]">
              <CardHeader className="border-b border-[color:var(--border-color)] pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-[color:var(--text-secondary)]" />
                      <CardTitle className="section-heading uppercase">
                        Personal ordenado para dispersión
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Orden alfabético por apellido paterno, apellido materno y
                      nombre. Las CLABE mostradas son ficticias.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{rows.length} REGISTROS</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="hidden xl:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead column="paternalSurname" label="APELLIDO PATERNO" kind="text" sort={tableSort} onSort={changeTableSort} />
                        <SortableTableHead column="maternalSurname" label="APELLIDO MATERNO" kind="text" sort={tableSort} onSort={changeTableSort} />
                        <SortableTableHead column="firstName" label="NOMBRE(S)" kind="text" sort={tableSort} onSort={changeTableSort} />
                        <SortableTableHead column="position" label="PUESTO" kind="text" sort={tableSort} onSort={changeTableSort} />
                        <SortableTableHead column="bank" label="BANCO / CLABE" kind="text" sort={tableSort} onSort={changeTableSort} />
                        <SortableTableHead column="payment" label="NETO A COBRAR" kind="number" sort={tableSort} onSort={changeTableSort} align="right" />
                        <SortableTableHead column="isr" label="ISR" kind="number" sort={tableSort} onSort={changeTableSort} align="right" />
                        <SortableTableHead column="socialCost" label="COSTO SOCIAL" kind="number" sort={tableSort} onSort={changeTableSort} align="right" />
                        <SortableTableHead column="total" label="COSTO TOTAL" kind="number" sort={tableSort} onSort={changeTableSort} align="right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-semibold">
                            {row.paternalSurname}
                          </TableCell>
                          <TableCell>{row.maternalSurname}</TableCell>
                          <TableCell>{row.firstName}</TableCell>
                          <TableCell>
                            <p className="font-medium">{row.position}</p>
                            <p className="text-[9px] text-[color:var(--text-muted)]">
                              {row.branch}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-[10px] font-semibold">
                              {row.bank}
                            </p>
                            <p className="number-display whitespace-nowrap text-[10px] tracking-[0.04em]">
                              {row.clabe}
                            </p>
                          </TableCell>
                          <TableCell className="number-display text-right">
                            {money.format(row.payment)}
                          </TableCell>
                          <TableCell className="number-display text-right">
                            {money.format(row.isr)}
                          </TableCell>
                          <TableCell className="number-display text-right">
                            {money.format(row.socialCost)}
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
                          colSpan={5}
                          className="text-right font-semibold"
                        >
                          TOTAL {moduleCopy[module].label}
                        </TableCell>
                        <TableCell className="number-display text-right">
                          {money.format(totals.payment)}
                        </TableCell>
                        <TableCell className="number-display text-right">
                          {money.format(totals.isr)}
                        </TableCell>
                        <TableCell className="number-display text-right">
                          {money.format(totals.socialCost)}
                        </TableCell>
                        <TableCell className="number-display text-right text-base">
                          {money.format(totals.total)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
                <div className="divide-y divide-[color:var(--border-color)] xl:hidden">
                  {pagedRows.map((row, index) => (
                    <article key={row.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-secondary)]">
                            {String(
                              (currentPage - 1) * effectivePageSize + index + 1,
                            ).padStart(2, "0")}{" "}
                            · {row.paternalSurname} {row.maternalSurname}
                          </p>
                          <p className="mt-1 font-semibold">{row.firstName}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            {row.position} · {row.branch}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="label-caps">NETO A COBRAR</p>
                          <p className="number-display mt-1 text-base">
                            {money.format(row.payment)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/25 p-3 sm:grid-cols-2">
                        <div>
                          <p className="label-caps">BANCO / CLABE</p>
                          <p className="mt-1 text-xs font-semibold">
                            {row.bank} · {row.clabe}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="label-caps">COSTO</p>
                            <p className="number-display mt-1 text-xs">
                              {money.format(row.total)}
                            </p>
                          </div>
                          <div>
                            <p className="label-caps">ISR</p>
                            <p className="number-display mt-1 text-xs">
                              {money.format(row.isr)}
                            </p>
                          </div>
                          <div>
                            <p className="label-caps">SOCIAL</p>
                            <p className="number-display mt-1 text-xs">
                              {money.format(row.socialCost)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {rows.length > 0 && (
                  <div className="payroll-dispersion-controls flex flex-col gap-2 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/10 px-4 py-2.5 text-[10px] sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      Mostrando{" "}
                      <strong>
                        {visibleStart}–{visibleEnd}
                      </strong>{" "}
                      de <strong>{rows.length}</strong> registros · página{" "}
                      {currentPage} de {totalPages}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                        Filas
                      </span>
                      <Select
                        value={pageSize}
                        onValueChange={(value) => {
                          setPageSize(value);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger
                          className="h-7 w-[82px] rounded-lg text-[9px] font-semibold"
                          aria-label="Registros de dispersión por página"
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
                      <button
                        type="button"
                        className="inline-flex h-7 items-center rounded-lg border border-[color:var(--border-color)] px-2 text-[9px] font-semibold disabled:opacity-40"
                        disabled={currentPage <= 1}
                        onClick={() =>
                          setPage((value) => Math.max(1, value - 1))
                        }
                      >
                        <ChevronLeft className="mr-1 h-3 w-3" />
                        Anterior
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center rounded-lg border border-[color:var(--border-color)] px-2 text-[9px] font-semibold disabled:opacity-40"
                        disabled={currentPage >= totalPages}
                        onClick={() =>
                          setPage((value) => Math.min(totalPages, value + 1))
                        }
                      >
                        Siguiente
                        <ChevronRight className="ml-1 h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {run.status === "DRAFT" ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/70 bg-amber-50/70 p-4 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                  <div>
                    <p className="text-sm font-semibold">
                      Vista previa del periodo
                    </p>
                    <p className="mt-0.5 text-xs opacity-75">
                      Los importes se actualizan con la nómina. Cierra la
                      corrida para habilitar impresión, PDF y Excel.
                    </p>
                  </div>
                </div>
                <p className="number-display text-lg">
                  {money.format(totals.payment)}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50/70 p-4 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                  <div>
                    <p className="text-sm font-semibold">
                      Formato conciliado para dispersión
                    </p>
                    <p className="mt-0.5 text-xs opacity-75">
                      El neto del archivo coincide con la nómina seleccionada.
                      Este prototipo no realiza transferencias bancarias.
                    </p>
                  </div>
                </div>
                <p className="number-display text-lg">
                  {money.format(totals.payment)}
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
