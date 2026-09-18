"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Gift,
  FileSignature,
  Pencil,
  Scale,
  Search,
  ShieldPlus,
  Trash2,
  UserMinus,
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
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from "@cosmetics/ui";
import {
  employeeAppliesToPeriod,
  christmasBonusPaidAmountForRange,
  periodTaxInclusionForRange,
  roleHasPermission,
  terminationSettlementTotal,
  type DemoChristmasBonus,
  type DemoChristmasBonusPaymentPeriod,
  type DemoEmployee,
  type DemoSettlementConcept,
  type DemoPeriodTaxInclusion,
  type DemoTerminationSettlement,
  type SpecialPayrollStatus,
  usePayrollDemo,
} from "./payroll-demo-context";
import { ReportExportButtons } from "./report-export-buttons";

type PageSize = "20" | "40" | "60" | "ALL";
const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const statusCopy: Record<SpecialPayrollStatus, string> = {
  DRAFT: "BORRADOR",
  APPROVED: "AUTORIZADO",
  PAID: "PAGADO",
};

function clampRate(value: number) {
  return Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);
}

function inclusiveDays(start: string, end: string) {
  const startTime = new Date(`${start}T12:00:00`).getTime();
  const endTime = new Date(`${end}T12:00:00`).getTime();
  return Math.max(0, Math.round((endTime - startTime) / 86_400_000) + 1);
}

function localId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function settlementConcepts(employee: DemoEmployee): DemoSettlementConcept[] {
  const terminationDate =
    employee.terminationDate ?? new Date().toISOString().slice(0, 10);
  const year = terminationDate.slice(0, 4);
  const yearStart = `${year}-01-01`;
  const workedThisYear = inclusiveDays(
    employee.hireDate > yearStart ? employee.hireDate : yearStart,
    terminationDate,
  );
  const yearDays = inclusiveDays(yearStart, `${year}-12-31`);
  const dailySalary = employee.monthlySalary / 30;
  const proportionalChristmas = dailySalary * 15 * (workedThisYear / yearDays);
  const proportionalVacationDays = Math.min(
    12,
    12 * (workedThisYear / yearDays),
  );
  const proportionalVacation = dailySalary * proportionalVacationDays;
  const make = (
    key: DemoSettlementConcept["key"],
    label: string,
    amount: number,
    enabled: boolean,
    legalNote: string,
  ): DemoSettlementConcept => ({
    id: localId(`settlement-${key.toLocaleLowerCase("es-MX")}`),
    key,
    label,
    amount: Math.round(amount * 100) / 100,
    enabled,
    legalNote,
  });
  return [
    make(
      "PENDING_SALARY",
      "SUELDO PENDIENTE HASTA LA FECHA DE BAJA",
      0,
      false,
      "Activar solo si existen días devengados que no estén incluidos en la nómina ordinaria.",
    ),
    make(
      "PROPORTIONAL_CHRISTMAS_BONUS",
      "AGUINALDO PROPORCIONAL",
      proportionalChristmas,
      employee.monthlySalary > 0,
      "LFT, artículo 87. Parte proporcional al tiempo laborado.",
    ),
    make(
      "PROPORTIONAL_VACATION",
      "VACACIONES PROPORCIONALES PENDIENTES",
      proportionalVacation,
      employee.monthlySalary > 0,
      "LFT, artículos 76 y 79. Confirmar días disfrutados y saldo real.",
    ),
    make(
      "VACATION_PREMIUM",
      "PRIMA VACACIONAL",
      proportionalVacation * 0.25,
      employee.monthlySalary > 0,
      "LFT, artículo 80. El porcentaje mínimo legal es 25%.",
    ),
    make(
      "PENDING_VARIABLE_PAY",
      "COMISIONES, BONOS U OTRAS PERCEPCIONES PENDIENTES",
      0,
      false,
      "Capturar únicamente importes devengados y pendientes de pago.",
    ),
    make(
      "SENIORITY_PREMIUM",
      "PRIMA DE ANTIGÜEDAD · CUANDO PROCEDA",
      0,
      false,
      "LFT, artículo 162. Validar procedencia, antigüedad y salario tope.",
    ),
    make(
      "CONSTITUTIONAL_INDEMNITY",
      "INDEMNIZACIÓN CONSTITUCIONAL · CUANDO PROCEDA",
      0,
      false,
      "No se aplica automáticamente; depende del motivo de terminación.",
    ),
    make(
      "TWENTY_DAYS_PER_YEAR",
      "20 DÍAS POR AÑO · CUANDO PROCEDA",
      0,
      false,
      "Validar el supuesto legal aplicable antes de autorizar.",
    ),
    make(
      "OTHER_AGREEMENT",
      "OTRO CONCEPTO O ACUERDO",
      0,
      false,
      "Importe editable para un acuerdo documentado.",
    ),
  ];
}

function defaultSettlement(employee: DemoEmployee): DemoTerminationSettlement {
  const terminationDate =
    employee.terminationDate ?? new Date().toISOString().slice(0, 10);
  return {
    id: `settlement-${employee.id}`,
    employeeId: employee.id,
    kind: "FINIQUITO",
    applies: true,
    status: "DRAFT",
    hireDate: employee.hireDate,
    terminationDate,
    paymentDate: terminationDate,
    costBranchIds: employee.costBranchIds.length
      ? employee.costBranchIds
      : [employee.branchId],
    concepts: settlementConcepts(employee),
    includeSocialCost: false,
    socialCostRate: employee.socialCostRate,
    includeIsr: false,
    isrRate: employee.isrCostRate,
    agreementNotes:
      "BORRADOR SUJETO A REVISIÓN DEL MOTIVO DE BAJA, CONTRATO Y SALDOS REALES.",
    caseClosed: false,
    outcome: "PENDING",
    closedAt: null,
    receiptPreparedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function defaultChristmasBonus(
  employee: DemoEmployee,
  year: number,
): DemoChristmasBonus {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const employmentStart =
    employee.hireDate > yearStart ? employee.hireDate : yearStart;
  const employmentEnd =
    employee.terminationDate && employee.terminationDate < yearEnd
      ? employee.terminationDate
      : yearEnd;
  const workedDays = inclusiveDays(employmentStart, employmentEnd);
  const daysGranted = 15;
  const grossAmount =
    employee.monthlySalary > 0
      ? (employee.monthlySalary / 30) *
        daysGranted *
        (workedDays / inclusiveDays(yearStart, yearEnd))
      : 0;
  return {
    id: `christmas-${employee.id}-${year}`,
    employeeId: employee.id,
    year,
    applies: true,
    status: "DRAFT",
    daysGranted,
    grossAmount: Math.round(grossAmount * 100) / 100,
    paymentDate: `${year}-12-15`,
    costBranchIds: employee.costBranchIds.length
      ? employee.costBranchIds
      : [employee.branchId],
    includeSocialCost: employee.socialCostRate > 0,
    socialCostRate: employee.socialCostRate,
    includeIsr: employee.isrCostRate > 0,
    isrRate: employee.isrCostRate,
    paidPeriodIds: [],
    notes: "CÁLCULO PROPORCIONAL POR DÍAS LABORADOS EN EL AÑO.",
    updatedAt: new Date().toISOString(),
  };
}

function Toggle({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-6 w-11 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a744c] disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "border-emerald-600 bg-emerald-600" : "border-[color:var(--border-color)] bg-[color:var(--accent-hover)]"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
      />
    </button>
  );
}

function StatusBadge({ status }: { status: SpecialPayrollStatus }) {
  const tone =
    status === "PAID"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
      : status === "APPROVED"
        ? "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200"
        : "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200";
  return (
    <Badge variant="outline" className={tone}>
      {statusCopy[status]}
    </Badge>
  );
}

function BranchPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { state } = usePayrollDemo();
  const branches = state.branches.filter((branch) => branch.active);
  const allSelected =
    branches.length > 0 &&
    branches.every((branch) => value.includes(branch.id));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Sucursales de costo</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[9px]"
          onClick={() =>
            onChange(allSelected ? [] : branches.map((branch) => branch.id))
          }
        >
          {allSelected ? "QUITAR TODAS" : "SELECCIONAR TODAS"}
        </Button>
      </div>
      <div className="max-h-32 overflow-y-auto rounded-xl border border-[color:var(--border-color)] p-2">
        <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {branches.map((branch) => {
            const selected = value.includes(branch.id);
            return (
              <button
                key={branch.id}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  onChange(
                    selected
                      ? value.filter((branchId) => branchId !== branch.id)
                      : [...value, branch.id],
                  )
                }
                className={`rounded-lg border px-2 py-2 text-left text-[10px] font-semibold transition-colors ${selected ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" : "border-[color:var(--border-color)] hover:bg-[color:var(--accent-hover)]"}`}
              >
                {selected ? "✓ " : ""}
                {branch.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  pageSize: PageSize;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
          Filas
        </span>
        <Select
          value={pageSize}
          onValueChange={(value) => onPageSizeChange(value as PageSize)}
        >
          <SelectTrigger
            className="h-8 w-24 text-xs"
            aria-label="Registros por página"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="40">40</SelectItem>
            <SelectItem value="60">60</SelectItem>
            <SelectItem value="ALL">TODOS</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-[color:var(--text-muted)]">
          {total} registros
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        <span className="min-w-20 text-center text-xs">
          <strong>{page}</strong> de <strong>{totalPages}</strong>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
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
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="label-caps">{label}</p>
          <p className="number-display mt-2 text-xl">{value}</p>
          <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
            {detail}
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function DashboardValue({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 xl:block xl:text-right">
      <span className="label-caps xl:hidden">{label}</span>
      <span
        className={`number-display text-xs ${emphasis ? "font-bold text-[#805b3c]" : "font-semibold"}`}
      >
        {value}
      </span>
    </div>
  );
}

function taxFlags(inclusions: DemoPeriodTaxInclusion[], paymentDate: string) {
  const inclusion = periodTaxInclusionForRange(
    inclusions,
    paymentDate,
    paymentDate,
  );
  return {
    includeSocialCost: inclusion?.includeSocialCost ?? true,
    includeIsr: inclusion?.includeIsr ?? true,
  };
}

function settlementCosts(
  settlement: DemoTerminationSettlement,
  inclusions: DemoPeriodTaxInclusion[],
) {
  const gross = settlement.applies ? terminationSettlementTotal(settlement) : 0;
  const flags = taxFlags(inclusions, settlement.paymentDate);
  const social =
    flags.includeSocialCost && settlement.includeSocialCost
      ? gross * settlement.socialCostRate
      : 0;
  const isr =
    flags.includeIsr && settlement.includeIsr ? gross * settlement.isrRate : 0;
  return { gross, social, isr, total: gross + social + isr };
}

function christmasPeriodsForYear(
  periods: DemoChristmasBonusPaymentPeriod[],
  year: number,
) {
  return periods
    .filter((period) => period.year === year && period.active)
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
}

function christmasScheduledAmount(
  bonus: DemoChristmasBonus,
  periods: DemoChristmasBonusPaymentPeriod[],
  start: string,
  end: string,
) {
  if (!bonus.applies) return 0;
  return christmasPeriodsForYear(periods, bonus.year)
    .filter(
      (period) =>
        period.paymentDate >= start && period.paymentDate <= end,
    )
    .reduce(
      (sum, period) => sum + bonus.grossAmount * period.percentage,
      0,
    );
}

function christmasPaidCosts(
  bonus: DemoChristmasBonus,
  periods: DemoChristmasBonusPaymentPeriod[],
  inclusions: DemoPeriodTaxInclusion[],
  start: string,
  end: string,
) {
  const paidPeriodIds = new Set(bonus.paidPeriodIds);
  return christmasPeriodsForYear(periods, bonus.year)
    .filter(
      (period) =>
        paidPeriodIds.has(period.id) &&
        period.paymentDate >= start &&
        period.paymentDate <= end,
    )
    .reduce(
      (totals, period) => {
        const gross = bonus.applies
          ? bonus.grossAmount * period.percentage
          : 0;
        const flags = taxFlags(inclusions, period.paymentDate);
        return {
          gross: totals.gross + gross,
          social:
            totals.social +
            (flags.includeSocialCost && bonus.includeSocialCost
              ? gross * bonus.socialCostRate
              : 0),
          isr:
            totals.isr +
            (flags.includeIsr && bonus.includeIsr
              ? gross * bonus.isrRate
              : 0),
        };
      },
      { gross: 0, social: 0, isr: 0 },
    );
}

function settlementReceiptConfig(
  settlement: DemoTerminationSettlement,
  employee: DemoEmployee,
  branches: Array<{ id: string; name: string }>,
  inclusions: DemoPeriodTaxInclusion[],
) {
  const costs = settlementCosts(settlement, inclusions);
  const rows = settlement.concepts
    .filter((concept) => concept.enabled)
    .map((concept) => ({
      concept: concept.label,
      reference: concept.legalNote,
      amount: concept.amount,
    }));
  return {
    title: `Recibo de ${settlement.kind === "LIQUIDACION" ? "liquidación" : "finiquito"}`,
    subtitle: `${employee.name} · BAJA ${settlement.terminationDate} · PAGO ${settlement.paymentDate}`,
    filename: `recibo-${settlement.kind.toLocaleLowerCase("es-MX")}-${employee.id}-${settlement.paymentDate}`,
    sheetName: "Recibo",
    orientation: "portrait" as const,
    metadata: [
      { label: "Empleado", value: employee.name },
      { label: "Puesto", value: employee.position },
      { label: "Alta", value: settlement.hireDate },
      { label: "Baja", value: settlement.terminationDate },
      {
        label: "Sucursal de costo",
        value:
          settlement.costBranchIds
            .map((branchId) => branches.find((branch) => branch.id === branchId)?.name)
            .filter(Boolean)
            .join(", ") || "SIN ASIGNAR",
      },
      {
        label: "Caso",
        value: settlement.caseClosed
          ? settlement.outcome === "WON"
            ? "CERRADO · CASO GANADO"
            : "CERRADO · LIQUIDADO"
          : "PENDIENTE",
      },
    ],
    metrics: [
      { label: "Pago bruto", value: money.format(costs.gross) },
      { label: "Costo social", value: money.format(costs.social) },
      { label: "ISR", value: money.format(costs.isr) },
      { label: "Costo total", value: money.format(costs.total) },
    ],
    analysis: [
      settlement.agreementNotes || "SIN NOTAS ADICIONALES.",
      "Documento preparado para revisión y firma antes de marcar el pago como realizado.",
    ],
    rows,
    columns: [
      {
        header: "CONCEPTO",
        accessor: (row: (typeof rows)[number]) => row.concept,
        width: 30,
      },
      {
        header: "REFERENCIA",
        accessor: (row: (typeof rows)[number]) => row.reference,
        width: 42,
      },
      {
        header: "MONTO",
        accessor: (row: (typeof rows)[number]) => row.amount,
        format: "currency" as const,
        width: 18,
      },
    ],
    signatureLines: ["Firma del empleado", "Representante de la empresa"],
  };
}

export function PayrollTerminationSettlementsDemo() {
  const {
    state,
    upsertTerminationSettlement,
    approveTerminationSettlement,
    archiveTerminationSettlement,
  } = usePayrollDemo();
  const currentYear = new Date().getFullYear();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState<PageSize>("20");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const activeRole = state.roles.find(
    (role) => role.id === activeEmployee?.roleId,
  );
  const isMaster = activeRole?.id === "role-admin";
  const canApprove = roleHasPermission(activeRole, "payroll.approve");
  const employeeMap = useMemo(
    () => new Map(state.employees.map((employee) => [employee.id, employee])),
    [state.employees],
  );
  const rows = useMemo(
    () =>
      state.employees
        .filter((employee) => Boolean(employee.terminationDate))
        .flatMap((employee) => {
          const saved = state.terminationSettlements.find(
            (item) => item.employeeId === employee.id,
          );
          if (saved?.archivedAt) return [];
          return [saved ?? defaultSettlement(employee)];
        })
        .filter((settlement) => {
          const employee = employeeMap.get(settlement.employeeId);
          const term = search.trim().toLocaleUpperCase("es-MX");
          return Boolean(
            employee &&
            settlement.terminationDate >= dateFrom &&
            settlement.terminationDate <= dateTo &&
            (branchFilter === "ALL" ||
              settlement.costBranchIds.includes(branchFilter)) &&
            (statusFilter === "ALL" || settlement.status === statusFilter) &&
            (!term ||
              `${employee.name} ${employee.position}`
                .toLocaleUpperCase("es-MX")
                .includes(term)),
          );
        })
        .sort((a, b) => b.terminationDate.localeCompare(a.terminationDate)),
    [
      branchFilter,
      dateFrom,
      dateTo,
      employeeMap,
      search,
      statusFilter,
      state.employees,
      state.terminationSettlements,
    ],
  );
  const effectiveSize =
    pageSize === "ALL" ? Math.max(rows.length, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / effectiveSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = rows.slice(
    (safePage - 1) * effectiveSize,
    safePage * effectiveSize,
  );
  const applicableRows = useMemo(
    () => rows.filter((row) => row.applies),
    [rows],
  );
  const totals = applicableRows.reduce(
    (sum, row) => {
      const costs = settlementCosts(row, state.periodTaxInclusions);
      return {
        gross: sum.gross + costs.gross,
        social: sum.social + costs.social,
        isr: sum.isr + costs.isr,
        total: sum.total + costs.total,
      };
    },
    { gross: 0, social: 0, isr: 0, total: 0 },
  );
  useEffect(
    () => setPage(1),
    [branchFilter, dateFrom, dateTo, pageSize, search, statusFilter],
  );

  const exportRows = applicableRows.map((settlement) => {
    const employee = employeeMap.get(settlement.employeeId);
    const costs = settlementCosts(settlement, state.periodTaxInclusions);
    return {
      employee: employee?.name ?? "PERSONA DEMO",
      position: employee?.position ?? "SIN PUESTO",
      hireDate: settlement.hireDate,
      terminationDate: settlement.terminationDate,
      paymentDate: settlement.paymentDate,
      kind: settlement.kind,
      status: statusCopy[settlement.status],
      caseStatus: settlement.caseClosed ? "CERRADO" : "PENDIENTE",
      outcome:
        settlement.outcome === "WON"
          ? "CASO GANADO"
          : settlement.outcome === "SETTLED"
            ? "LIQUIDADO"
            : "PENDIENTE",
      branches: settlement.costBranchIds
        .map(
          (branchId) =>
            state.branches.find((branch) => branch.id === branchId)?.name,
        )
        .filter(Boolean)
        .join(", "),
      gross: costs.gross,
      social: costs.social,
      isr: costs.isr,
      total: costs.total,
    };
  });
  const exportConfig = {
    title: "Liquidaciones y finiquitos",
    subtitle: `${dateFrom} — ${dateTo} · ${branchFilter === "ALL" ? "REPORTE GENERAL" : (state.branches.find((branch) => branch.id === branchFilter)?.name ?? "SUCURSAL")}`,
    metadata: [
      { label: "Periodo de baja", value: `${dateFrom} — ${dateTo}` },
      {
        label: "Sucursal",
        value:
          branchFilter === "ALL"
            ? "EMPRESA COMPLETA"
            : (state.branches.find((branch) => branch.id === branchFilter)
                ?.name ?? "SUCURSAL"),
      },
      { label: "Empleado", value: search || "TODOS" },
      { label: "Alcance", value: "REGISTROS DE BAJA Y COSTO ASIGNADO" },
    ],
    metrics: [
      {
        label: "Registros",
        value: String(applicableRows.length),
        detail: "Casos que sí aplican",
      },
      {
        label: "Pago bruto",
        value: money.format(totals.gross),
        detail: "Conceptos habilitados",
      },
      {
        label: "Cargas",
        value: money.format(totals.social + totals.isr),
        detail: "Social + ISR",
      },
      {
        label: "Costo total",
        value: money.format(totals.total),
        detail: "Costo por sucursal",
      },
    ],
    analysis: [
      `${applicableRows.filter((row) => row.status === "DRAFT").length} registros aplicables requieren aprobación y ${applicableRows.filter((row) => row.status === "APPROVED").length} ya están integrados y pendientes de pago.`,
      `${applicableRows.filter((row) => row.caseClosed).length} casos aplicables están cerrados y ${applicableRows.filter((row) => !row.caseClosed).length} siguen abiertos.`,
      "Los importes son editables y requieren revisión del motivo de baja y documentos laborales.",
    ],
    filename: `liquidaciones-finiquitos-${dateFrom}-${dateTo}`,
    sheetName: "Liquidaciones",
    orientation: "landscape" as const,
    rows: exportRows,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: (typeof exportRows)[number]) => row.employee,
        width: 24,
      },
      {
        header: "PUESTO",
        accessor: (row: (typeof exportRows)[number]) => row.position,
        width: 20,
      },
      {
        header: "ALTA",
        accessor: (row: (typeof exportRows)[number]) => row.hireDate,
        width: 13,
      },
      {
        header: "BAJA",
        accessor: (row: (typeof exportRows)[number]) => row.terminationDate,
        width: 13,
      },
      {
        header: "PAGO",
        accessor: (row: (typeof exportRows)[number]) => row.paymentDate,
        width: 13,
      },
      {
        header: "TIPO",
        accessor: (row: (typeof exportRows)[number]) => row.kind,
        width: 14,
      },
      {
        header: "ESTATUS",
        accessor: (row: (typeof exportRows)[number]) => row.status,
        width: 14,
      },
      {
        header: "CASO",
        accessor: (row: (typeof exportRows)[number]) => row.caseStatus,
        width: 12,
      },
      {
        header: "RESULTADO",
        accessor: (row: (typeof exportRows)[number]) => row.outcome,
        width: 15,
      },
      {
        header: "SUCURSAL",
        accessor: (row: (typeof exportRows)[number]) => row.branches,
        width: 22,
      },
      {
        header: "PAGO BRUTO",
        accessor: (row: (typeof exportRows)[number]) => row.gross,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "COSTO SOCIAL",
        accessor: (row: (typeof exportRows)[number]) => row.social,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "ISR",
        accessor: (row: (typeof exportRows)[number]) => row.isr,
        format: "currency" as const,
        width: 14,
      },
      {
        header: "COSTO TOTAL",
        accessor: (row: (typeof exportRows)[number]) => row.total,
        format: "currency" as const,
        width: 17,
      },
    ],
  };
  function save(
    settlement: DemoTerminationSettlement,
    message = "Cambios guardados en el prototipo.",
  ) {
    if (!isMaster) {
      toast.error("Sólo el usuario máster puede editar este registro.");
      return;
    }
    upsertTerminationSettlement(settlement);
    toast.success(message);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">NÓMINA ESPECIAL</Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Bajas, acuerdos y costo por sucursal
            </span>
          </div>
          <h1 className="page-title">Liquidaciones y finiquitos</h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
            Cada baja conserva su historial laboral. Los conceptos son
            editables, auditables y se autorizan antes de afectar el
            consolidado.
          </p>
        </div>
        <ReportExportButtons
          config={exportConfig}
          disabled={!applicableRows.length}
        />
      </header>
      <section className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
        <div className="flex gap-3">
          <Scale className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Plantilla legal editable</p>
            <p className="mt-1 text-xs opacity-80">
              Incluye prestaciones proporcionales y conceptos indemnizatorios
              cuando procedan. El resultado debe validarse según motivo de baja,
              contrato y asesoría laboral.
            </p>
          </div>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={UserMinus}
          label="BAJAS"
          value={String(rows.length)}
          detail={`${applicableRows.length} aplican al reporte`}
        />
        <Metric
          icon={WalletCards}
          label="PAGO BRUTO"
          value={money.format(totals.gross)}
          detail="Conceptos habilitados"
        />
        <Metric
          icon={ShieldPlus}
          label="CARGAS"
          value={money.format(totals.social + totals.isr)}
          detail="Configuración individual"
        />
        <Metric
          icon={Building2}
          label="COSTO TOTAL"
          value={money.format(totals.total)}
          detail="Asignado a sucursales"
        />
      </div>
      <Card>
        <CardHeader className="border-b border-[color:var(--border-color)]">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" /> Filtros del historial
          </CardTitle>
          <CardDescription>
            La tabla y las descargas respetan exactamente esta selección.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <Label>Desde</Label>
            <Input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sucursal de costo</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODAS</SelectItem>
                {state.branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nombre o puesto</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="BUSCAR EMPLEADO"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado del pago</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODOS</SelectItem>
                <SelectItem value="DRAFT">PENDIENTES</SelectItem>
                <SelectItem value="APPROVED">APROBADOS</SelectItem>
                <SelectItem value="PAID">PAGADOS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[color:var(--border-color)]">
          <CardTitle className="section-heading uppercase">
            Personal dado de baja
          </CardTitle>
          <CardDescription>
            El estatus autorizado o pagado es el que afecta reportes generales.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {visibleRows.length ? (
            <div className="divide-y divide-[color:var(--border-color)]">
              {visibleRows.map((settlement) => {
                const employee = employeeMap.get(settlement.employeeId);
                if (!employee) return null;
                const costs = settlementCosts(
                  settlement,
                  state.periodTaxInclusions,
                );
                const expanded = expandedId === settlement.id;
                const integrated =
                  settlement.applies &&
                  settlement.status !== "DRAFT" &&
                  costs.gross > 0;
                return (
                  <article
                    key={settlement.id}
                    className={`border-l-4 px-4 py-4 ${
                      settlement.status === "PAID"
                        ? "border-l-emerald-500 bg-emerald-50/45 dark:bg-emerald-950/10"
                        : settlement.status === "APPROVED"
                          ? "border-l-sky-500 bg-sky-50/55 dark:bg-sky-950/10"
                          : "border-l-transparent"
                    }`}
                    style={{ contentVisibility: "auto", containIntrinsicSize: "104px" }}
                  >
                    <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.25fr)_140px_145px_135px_140px_240px] xl:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {employee.name}
                          </p>
                          <StatusBadge status={settlement.status} />
                          <Badge
                            variant="outline"
                            className={
                              settlement.caseClosed
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                : "border-amber-300 bg-amber-50 text-amber-800"
                            }
                          >
                            {settlement.caseClosed
                              ? settlement.outcome === "WON"
                                ? "CASO GANADO"
                                : "LIQUIDADO"
                              : "CASO PENDIENTE"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
                          {employee.position} · ALTA {settlement.hireDate} ·
                          BAJA {settlement.terminationDate}
                        </p>
                        {integrated ? (
                          <Badge className="mt-2 border border-emerald-300 bg-emerald-100 text-emerald-900">
                            INTEGRADO · {settlement.status === "PAID" ? "PAGADO" : "APROBADO"}
                          </Badge>
                        ) : null}
                      </div>
                      <div>
                        <p className="label-caps">APLICA</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Toggle
                            checked={settlement.applies}
                            label={`Aplicar liquidación a ${employee.name}`}
                            disabled={!isMaster}
                            onCheckedChange={(applies) =>
                              save({ ...settlement, applies })
                            }
                          />
                          <span className="text-[10px] font-semibold">
                            {settlement.applies ? "SÍ" : "NO"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="label-caps">TIPO</p>
                          {settlement.status !== "DRAFT" ? (
                            <Badge variant="outline" className="text-[8px]">
                              BLOQUEADO
                            </Badge>
                          ) : null}
                        </div>
                        <Select
                          value={settlement.kind}
                          disabled={!isMaster || settlement.status !== "DRAFT"}
                          onValueChange={(kind) =>
                            save({
                              ...settlement,
                              kind: kind as DemoTerminationSettlement["kind"],
                            })
                          }
                        >
                          <SelectTrigger className="mt-1 h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FINIQUITO">FINIQUITO</SelectItem>
                            <SelectItem value="LIQUIDACION">
                              LIQUIDACIÓN
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="label-caps">PAGO BRUTO</p>
                        <p className="number-display mt-1 text-base">
                          {money.format(costs.gross)}
                        </p>
                      </div>
                      <div>
                        <p className="label-caps">COSTO TOTAL</p>
                        <p className="number-display mt-1 text-base">
                          {money.format(costs.total)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {settlement.status === "DRAFT" && canApprove ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (!settlement.applies) {
                                toast.error("Activa Aplica antes de aprobar el registro.");
                                return;
                              }
                              if (!settlement.costBranchIds.length) {
                                toast.error("Selecciona al menos una sucursal de costo.");
                                return;
                              }
                              if (costs.gross <= 0) {
                                toast.error("Agrega al menos un concepto con monto mayor a cero.");
                                return;
                              }
                              approveTerminationSettlement(settlement);
                              toast.success(
                                `Registro aprobado e integrado a la nómina y consolidado del ${settlement.paymentDate}.`,
                              );
                            }}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Aprobar
                          </Button>
                        ) : null}
                        {isMaster ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Editar liquidación o finiquito"
                              aria-label={`Editar registro de ${employee.name}`}
                              onClick={() =>
                                setExpandedId(expanded ? null : settlement.id)
                              }
                              aria-expanded={expanded}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Eliminar registro"
                              aria-label={`Eliminar registro de ${employee.name}`}
                              className="text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `¿Eliminar el registro de ${employee.name}? Se conservará archivado para auditoría y dejará de afectar nómina y reportes.`,
                                  )
                                ) {
                                  return;
                                }
                                archiveTerminationSettlement(settlement);
                                setExpandedId(null);
                                toast.success(
                                  "Registro archivado; se retiró de nómina y reportes sin borrar su trazabilidad.",
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title={expanded ? "Cerrar detalle" : "Ver detalle"}
                          aria-label={expanded ? "Cerrar detalle" : "Ver detalle"}
                          onClick={() =>
                            setExpandedId(expanded ? null : settlement.id)
                          }
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {expanded ? (
                      <div className="space-y-3">
                        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <FileSignature className="h-4 w-4 text-[#8a6744]" />
                            <div>
                              <p className="text-xs font-semibold">
                                Recibo para revisión y firma
                              </p>
                              <p className="text-[10px] text-[color:var(--text-muted)]">
                                {settlement.receiptPreparedAt
                                  ? "Recibo preparado; ya puede registrarse el pago."
                                  : "Imprime o exporta el detalle antes de registrar el pago."}
                              </p>
                            </div>
                          </div>
                          <ReportExportButtons
                            config={settlementReceiptConfig(
                              settlement,
                              employee,
                              state.branches,
                              state.periodTaxInclusions,
                            )}
                            disabled={!settlement.applies}
                            onAction={() =>
                              upsertTerminationSettlement({
                                ...settlement,
                                receiptPreparedAt:
                                  settlement.receiptPreparedAt ??
                                  new Date().toISOString(),
                              })
                            }
                          />
                        </div>
                        <SettlementEditor
                          settlement={settlement}
                          save={save}
                          updateNotes={upsertTerminationSettlement}
                          readOnly={!isMaster}
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <UserMinus className="mx-auto h-8 w-8 text-[color:var(--text-muted)]" />
              <p className="mt-3 text-sm font-semibold">
                Sin bajas en esta selección
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Los empleados aparecerán aquí al registrar una fecha de baja.
              </p>
            </div>
          )}
        </CardContent>
        <Pagination
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </div>
  );
}

function SettlementEditor({
  settlement,
  save,
  updateNotes,
  readOnly,
}: {
  settlement: DemoTerminationSettlement;
  save: (settlement: DemoTerminationSettlement, message?: string) => void;
  updateNotes: (settlement: DemoTerminationSettlement) => void;
  readOnly: boolean;
}) {
  return (
    <fieldset
      disabled={readOnly}
      aria-label={readOnly ? "Detalle de liquidación en modo consulta" : "Editor de liquidación"}
      className="mt-4 space-y-5 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/10 p-4 disabled:opacity-75"
    >
      {readOnly ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
          MODO CONSULTA · Sólo el usuario máster puede editar o eliminar este registro.
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2">
          <Label>Fecha de pago</Label>
          <Input
            type="date"
            value={settlement.paymentDate}
            onChange={(event) =>
              save({ ...settlement, paymentDate: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Estatus</Label>
          <Select
            value={settlement.status}
            onValueChange={(status) => {
              if (status === "PAID" && !settlement.receiptPreparedAt) {
                toast.error(
                  "Primero imprime o exporta el recibo para revisión y firma.",
                );
                return;
              }
              save(
                { ...settlement, status: status as SpecialPayrollStatus },
                status === "DRAFT"
                  ? "Registro en borrador."
                  : status === "PAID"
                    ? "Pago registrado; ya alimenta consolidado y reportes."
                    : `Autorizado e integrado a nómina y consolidado del ${settlement.paymentDate}; queda pendiente registrar el pago.`,
              );
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="DRAFT"
                disabled={settlement.status !== "DRAFT"}
              >
                BORRADOR
              </SelectItem>
              <SelectItem value="APPROVED">AUTORIZADO</SelectItem>
              <SelectItem
                value="PAID"
                disabled={!settlement.receiptPreparedAt}
              >
                PAGADO
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Resultado del caso</Label>
          <Select
            value={settlement.outcome}
            onValueChange={(outcome) =>
              save({
                ...settlement,
                outcome: outcome as DemoTerminationSettlement["outcome"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">PENDIENTE</SelectItem>
              <SelectItem value="WON">CASO GANADO</SelectItem>
              <SelectItem value="SETTLED">LIQUIDADO</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-xl border border-[color:var(--border-color)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold">Caso cerrado</p>
              <p className="text-[9px] text-[color:var(--text-muted)]">
                Conserva el registro en el historial.
              </p>
            </div>
            <Toggle
              checked={settlement.caseClosed}
              label="Cerrar caso de liquidación"
              onCheckedChange={(caseClosed) =>
                save(
                  {
                    ...settlement,
                    caseClosed,
                    outcome:
                      caseClosed && settlement.outcome === "PENDING"
                        ? "SETTLED"
                        : settlement.outcome,
                    closedAt: caseClosed ? new Date().toISOString() : null,
                  },
                  caseClosed
                    ? "Caso cerrado y conservado en el historial."
                    : "Caso reabierto.",
                )
              }
            />
          </div>
        </div>
        <TaxEditor
          label="Costo social"
          checked={settlement.includeSocialCost}
          rate={settlement.socialCostRate}
          onChecked={(includeSocialCost) =>
            save({ ...settlement, includeSocialCost })
          }
          onRate={(socialCostRate) => save({ ...settlement, socialCostRate })}
        />
        <TaxEditor
          label="ISR"
          checked={settlement.includeIsr}
          rate={settlement.isrRate}
          onChecked={(includeIsr) => save({ ...settlement, includeIsr })}
          onRate={(isrRate) => save({ ...settlement, isrRate })}
        />
      </div>
      <BranchPicker
        value={settlement.costBranchIds}
        onChange={(costBranchIds) => save({ ...settlement, costBranchIds })}
      />
      <div className="overflow-x-auto rounded-xl border border-[color:var(--border-color)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>APLICAR</TableHead>
              <TableHead>CONCEPTO</TableHead>
              <TableHead>REFERENCIA</TableHead>
              <TableHead className="text-right">MONTO EDITABLE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlement.concepts.map((concept) => (
              <TableRow key={concept.id}>
                <TableCell>
                  <Toggle
                    checked={concept.enabled}
                    label={`Aplicar ${concept.label}`}
                    onCheckedChange={(enabled) =>
                      save({
                        ...settlement,
                        concepts: settlement.concepts.map((item) =>
                          item.id === concept.id ? { ...item, enabled } : item,
                        ),
                      })
                    }
                  />
                </TableCell>
                <TableCell className="min-w-64 font-semibold">
                  {concept.label}
                </TableCell>
                <TableCell className="min-w-72 text-[10px] text-[color:var(--text-muted)]">
                  {concept.legalNote}
                </TableCell>
                <TableCell>
                  <Input
                    className="ml-auto w-40 text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    value={concept.amount === 0 ? "" : concept.amount}
                    onChange={(event) =>
                      save({
                        ...settlement,
                        concepts: settlement.concepts.map((item) =>
                          item.id === concept.id
                            ? {
                                ...item,
                                amount: Math.max(
                                  0,
                                  Number(event.target.value) || 0,
                                ),
                              }
                            : item,
                        ),
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2">
        <Label>Notas y acuerdo</Label>
        <Textarea
          value={settlement.agreementNotes}
          onChange={(event) =>
            updateNotes({ ...settlement, agreementNotes: event.target.value })
          }
          onBlur={() => toast.success("Notas guardadas.")}
        />
      </div>
    </fieldset>
  );
}

function TaxEditor({
  label,
  checked,
  rate,
  onChecked,
  onRate,
}: {
  label: string;
  checked: boolean;
  rate: number;
  onChecked: (checked: boolean) => void;
  onRate: (rate: number) => void;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border-color)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">{label}</p>
          <p className="text-[9px] text-[color:var(--text-muted)]">
            Aplicación individual
          </p>
        </div>
        <Toggle
          checked={checked}
          label={`Aplicar ${label}`}
          onCheckedChange={onChecked}
        />
      </div>
      <Input
        className="mt-2 h-8"
        type="number"
        min="0"
        max="100"
        step="0.1"
        value={rate === 0 ? "" : rate * 100}
        onChange={(event) =>
          onRate(clampRate(Number(event.target.value) / 100))
        }
      />
    </div>
  );
}

export function PayrollChristmasBonusDemo() {
  const { state, upsertChristmasBonus } = usePayrollDemo();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [paymentFrom, setPaymentFrom] = useState(`${currentYear}-01-01`);
  const [paymentTo, setPaymentTo] = useState(`${currentYear}-12-31`);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState<PageSize>("20");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selectedYear = Number(year);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const paymentPeriods = useMemo(
    () =>
      christmasPeriodsForYear(
        state.christmasBonusPaymentPeriods,
        selectedYear,
      ),
    [selectedYear, state.christmasBonusPaymentPeriods],
  );
  const employeeMap = useMemo(
    () => new Map(state.employees.map((employee) => [employee.id, employee])),
    [state.employees],
  );
  const rows = useMemo(
    () =>
      state.employees
        .filter(
          (employee) =>
            employee.monthlySalary > 0 &&
            employeeAppliesToPeriod(employee, yearStart, yearEnd),
        )
        .map(
          (employee) =>
            state.christmasBonuses.find(
              (item) =>
                item.employeeId === employee.id && item.year === selectedYear,
            ) ?? defaultChristmasBonus(employee, selectedYear),
        )
        .filter((bonus) => {
          const employee = employeeMap.get(bonus.employeeId);
          const term = search.trim().toLocaleUpperCase("es-MX");
          const bonusPaymentDates = paymentPeriods.length
            ? paymentPeriods.map((period) => period.paymentDate)
            : [bonus.paymentDate];
          return Boolean(
            employee &&
            bonusPaymentDates.some(
              (paymentDate) =>
                paymentDate >= paymentFrom && paymentDate <= paymentTo,
            ) &&
            (branchFilter === "ALL" ||
              bonus.costBranchIds.includes(branchFilter)) &&
            (!term ||
              `${employee.name} ${employee.position}`
                .toLocaleUpperCase("es-MX")
                .includes(term)),
          );
        })
        .sort((a, b) =>
          (employeeMap.get(a.employeeId)?.name ?? "").localeCompare(
            employeeMap.get(b.employeeId)?.name ?? "",
            "es-MX",
          ),
        ),
    [
      branchFilter,
      employeeMap,
      paymentFrom,
      paymentTo,
      paymentPeriods,
      search,
      selectedYear,
      state.christmasBonuses,
      state.employees,
      yearEnd,
      yearStart,
    ],
  );
  const effectiveSize =
    pageSize === "ALL" ? Math.max(rows.length, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / effectiveSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = rows.slice(
    (safePage - 1) * effectiveSize,
    safePage * effectiveSize,
  );
  const applicableRows = useMemo(
    () => rows.filter((row) => row.applies),
    [rows],
  );
  const scheduledGross = applicableRows.reduce(
    (sum, row) =>
      sum +
      christmasScheduledAmount(
        row,
        state.christmasBonusPaymentPeriods,
        paymentFrom,
        paymentTo,
      ),
    0,
  );
  const paidTotals = applicableRows.reduce(
    (sum, row) => {
      const costs = christmasPaidCosts(
        row,
        state.christmasBonusPaymentPeriods,
        state.periodTaxInclusions,
        paymentFrom,
        paymentTo,
      );
      return {
        gross: sum.gross + costs.gross,
        social: sum.social + costs.social,
        isr: sum.isr + costs.isr,
      };
    },
    { gross: 0, social: 0, isr: 0 },
  );
  const branchCostRows = useMemo(() => {
    const branchNames = new Map(
      state.branches.map((branch) => [branch.id, branch.name]),
    );
    const byBranch = new Map<
      string,
      {
        id: string;
        name: string;
        employeeIds: Set<string>;
        scheduled: number;
        gross: number;
        social: number;
        isr: number;
      }
    >();

    applicableRows.forEach((bonus) => {
      const scheduled = christmasScheduledAmount(
        bonus,
        state.christmasBonusPaymentPeriods,
        paymentFrom,
        paymentTo,
      );
      const paid = christmasPaidCosts(
        bonus,
        state.christmasBonusPaymentPeriods,
        state.periodTaxInclusions,
        paymentFrom,
        paymentTo,
      );
      const assignedBranchIds = bonus.costBranchIds.filter((branchId) =>
        branchNames.has(branchId),
      );
      const destinations = assignedBranchIds.length
        ? assignedBranchIds
        : ["UNASSIGNED"];
      const divisor = destinations.length;

      destinations.forEach((branchId) => {
        const current = byBranch.get(branchId) ?? {
          id: branchId,
          name: branchNames.get(branchId) ?? "SIN SUCURSAL",
          employeeIds: new Set<string>(),
          scheduled: 0,
          gross: 0,
          social: 0,
          isr: 0,
        };
        current.employeeIds.add(bonus.employeeId);
        current.scheduled += scheduled / divisor;
        current.gross += paid.gross / divisor;
        current.social += paid.social / divisor;
        current.isr += paid.isr / divisor;
        byBranch.set(branchId, current);
      });
    });

    const allBranches = Array.from(byBranch.values())
      .map((branch) => ({
        id: branch.id,
        name: branch.name,
        employeeCount: branch.employeeIds.size,
        scheduled: branch.scheduled,
        gross: branch.gross,
        social: branch.social,
        isr: branch.isr,
        total: branch.gross + branch.social + branch.isr,
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es-MX"));
    const allCost = allBranches.reduce((sum, branch) => sum + branch.total, 0);

    return allBranches
      .map((branch) => ({
        ...branch,
        percentage: allCost > 0 ? (branch.total / allCost) * 100 : 0,
      }))
      .filter(
        (branch) => branchFilter === "ALL" || branch.id === branchFilter,
      );
  }, [
    applicableRows,
    branchFilter,
    paymentFrom,
    paymentTo,
    state.branches,
    state.christmasBonusPaymentPeriods,
    state.periodTaxInclusions,
  ]);
  const topCostBranch = branchCostRows.reduce<(typeof branchCostRows)[number] | null>(
    (top, branch) => (!top || branch.total > top.total ? branch : top),
    null,
  );
  useEffect(
    () => setPage(1),
    [branchFilter, pageSize, paymentFrom, paymentTo, search, year],
  );

  function save(bonus: DemoChristmasBonus, message = "Aguinaldo actualizado.") {
    upsertChristmasBonus(bonus);
    toast.success(message);
  }
  function recalculate(
    employee: DemoEmployee,
    bonus: DemoChristmasBonus,
    daysGranted: number,
  ) {
    const base = defaultChristmasBonus(employee, bonus.year);
    return {
      ...bonus,
      daysGranted,
      grossAmount:
        Math.round(base.grossAmount * (daysGranted / 15) * 100) / 100,
    };
  }
  function markPayment(
    bonus: DemoChristmasBonus,
    period: DemoChristmasBonusPaymentPeriod,
  ) {
    const paidPeriodIds = Array.from(
      new Set([...bonus.paidPeriodIds, period.id]),
    );
    const activePeriodIds = paymentPeriods.map((item) => item.id);
    const allPaid =
      activePeriodIds.length > 0 &&
      activePeriodIds.every((periodId) => paidPeriodIds.includes(periodId));
    save(
      {
        ...bonus,
        paidPeriodIds,
        paymentDate: period.paymentDate,
        status: allPaid ? "PAID" : "APPROVED",
      },
      allPaid
        ? "Aguinaldo pagado e integrado al consolidado."
        : `${period.name} pagado e integrado al periodo correspondiente.`,
    );
  }
  const exportRows = applicableRows.map((bonus) => {
    const employee = employeeMap.get(bonus.employeeId);
    const branches = bonus.costBranchIds
      .map(
        (branchId) =>
          state.branches.find((branch) => branch.id === branchId)?.name,
      )
      .filter(Boolean)
      .join(", ");
    const rowScheduled = christmasScheduledAmount(
      bonus,
      state.christmasBonusPaymentPeriods,
      paymentFrom,
      paymentTo,
    );
    const paidCosts = christmasPaidCosts(
      bonus,
      state.christmasBonusPaymentPeriods,
      state.periodTaxInclusions,
      paymentFrom,
      paymentTo,
    );
    const scheduledDates = paymentPeriods
      .filter(
        (period) =>
          period.paymentDate >= paymentFrom &&
          period.paymentDate <= paymentTo,
      )
      .map(
        (period) =>
          `${period.paymentDate} · ${(period.percentage * 100).toFixed(0)}%`,
      )
      .join(", ");
    return {
      employee: employee?.name ?? "PERSONA DEMO",
      position: employee?.position ?? "SIN PUESTO",
      days: bonus.daysGranted,
      paymentDate: scheduledDates || bonus.paymentDate,
      branches,
      status: statusCopy[bonus.status],
      scheduled: rowScheduled,
      gross: paidCosts.gross,
      pending: Math.max(rowScheduled - paidCosts.gross, 0),
      social: paidCosts.social,
      isr: paidCosts.isr,
      total: paidCosts.gross + paidCosts.social + paidCosts.isr,
    };
  });
  const exportConfig = {
    title: `Nómina de aguinaldos ${year}`,
    subtitle: `${paymentFrom} — ${paymentTo} · ${branchFilter === "ALL" ? "REPORTE GENERAL" : (state.branches.find((branch) => branch.id === branchFilter)?.name ?? "SUCURSAL")}`,
    metadata: [
      { label: "Ejercicio", value: year },
      { label: "Fecha de pago", value: `${paymentFrom} — ${paymentTo}` },
      {
        label: "Sucursal",
        value:
          branchFilter === "ALL"
            ? "EMPRESA COMPLETA"
            : (state.branches.find((branch) => branch.id === branchFilter)
                ?.name ?? "SUCURSAL"),
      },
      { label: "Empleado", value: search || "TODOS" },
      { label: "Regla base", value: "DÍAS OTORGADOS Y PROPORCIÓN LABORADA" },
    ],
    metrics: [
      {
        label: "Personal",
        value: String(applicableRows.length),
        detail: "Personal que sí aplica",
      },
      {
        label: "Programado",
        value: money.format(scheduledGross),
        detail: "Calendario seleccionado",
      },
      {
        label: "Pagado",
        value: money.format(paidTotals.gross),
        detail: "Integrado al consolidado",
      },
      {
        label: "Cargas",
        value: money.format(paidTotals.social + paidTotals.isr),
        detail: "Social + ISR",
      },
      {
        label: "Costo total",
        value: money.format(
          paidTotals.gross + paidTotals.social + paidTotals.isr,
        ),
        detail: "Solo pagos realizados",
      },
    ],
    analysis: [
      `${applicableRows.length} empleados participan en el reporte seleccionado.`,
      `${applicableRows.filter((row) => row.status === "PAID").length} registros aplicables están pagados por completo.`,
      `${paymentPeriods.length} periodo(s) de pago activo(s) distribuyen ${(paymentPeriods.reduce((sum, period) => sum + period.percentage, 0) * 100).toFixed(0)}% del aguinaldo.`,
      topCostBranch
        ? `${topCostBranch.name} concentra el mayor costo integrado de la selección: ${money.format(topCostBranch.total)} (${topCostBranch.percentage.toFixed(1)}%).`
        : "Aún no existen pagos integrados para analizar por sucursal.",
      `${branchCostRows.length} sucursal(es) participan en la carga de costo seleccionada.`,
      "El cálculo usa salario diario, días otorgados y tiempo laborado; los importes y cargas son editables.",
    ],
    filename: `aguinaldos-${year}`,
    sheetName: "Aguinaldos",
    orientation: "landscape" as const,
    rows: exportRows,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: (typeof exportRows)[number]) => row.employee,
        width: 24,
      },
      {
        header: "PUESTO",
        accessor: (row: (typeof exportRows)[number]) => row.position,
        width: 20,
      },
      {
        header: "DÍAS",
        accessor: (row: (typeof exportRows)[number]) => row.days,
        format: "number" as const,
        width: 10,
      },
      {
        header: "PAGO",
        accessor: (row: (typeof exportRows)[number]) => row.paymentDate,
        width: 13,
      },
      {
        header: "SUCURSAL",
        accessor: (row: (typeof exportRows)[number]) => row.branches,
        width: 22,
      },
      {
        header: "ESTATUS",
        accessor: (row: (typeof exportRows)[number]) => row.status,
        width: 14,
      },
      {
        header: "PROGRAMADO",
        accessor: (row: (typeof exportRows)[number]) => row.scheduled,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "AGUINALDO PAGADO",
        accessor: (row: (typeof exportRows)[number]) => row.gross,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "PENDIENTE",
        accessor: (row: (typeof exportRows)[number]) => row.pending,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "COSTO SOCIAL",
        accessor: (row: (typeof exportRows)[number]) => row.social,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "ISR",
        accessor: (row: (typeof exportRows)[number]) => row.isr,
        format: "currency" as const,
        width: 14,
      },
      {
        header: "COSTO TOTAL",
        accessor: (row: (typeof exportRows)[number]) => row.total,
        format: "currency" as const,
        width: 17,
      },
    ],
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">NÓMINA ANUAL</Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Días otorgados, proporcionalidad y cargas
            </span>
          </div>
          <h1 className="page-title">Aguinaldos</h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
            Personal con sueldo, selección individual, costo por sucursal e
            ISR/costo social configurables para el periodo de pago.
          </p>
        </div>
        <ReportExportButtons
          config={exportConfig}
          disabled={!applicableRows.length}
        />
      </header>
      <section className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-4 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100">
        <div className="flex gap-3">
          <Gift className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Regla base visible</p>
            <p className="mt-1 text-xs opacity-80">
              El mínimo general de la LFT es 15 días y se paga proporcionalmente
              cuando no se laboró el año completo. La empresa puede otorgar más
              días.
            </p>
          </div>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={Gift}
          label="PERSONAL"
          value={String(applicableRows.length)}
          detail={`${rows.length - applicableRows.length} excluidos del reporte`}
        />
        <Metric
          icon={WalletCards}
          label="PROGRAMADO"
          value={money.format(scheduledGross)}
          detail="Calendario seleccionado"
        />
        <Metric
          icon={CheckCircle2}
          label="PAGADO"
          value={money.format(paidTotals.gross)}
          detail="Integrado al consolidado"
        />
        <Metric
          icon={ShieldPlus}
          label="CARGAS"
          value={money.format(paidTotals.social + paidTotals.isr)}
          detail="Social + ISR"
        />
        <Metric
          icon={Building2}
          label="COSTO TOTAL"
          value={money.format(
            paidTotals.gross + paidTotals.social + paidTotals.isr,
          )}
          detail="Pagado por sucursal"
        />
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[color:var(--border-color)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" /> Carga de aguinaldo por sucursal
              </CardTitle>
              <CardDescription className="mt-1">
                Compara lo programado con pagos integrados al consolidado del periodo seleccionado.
                Si una persona tiene varias sucursales, el costo se reparte en partes iguales.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <Badge variant="outline">
                {branchCostRows.length} SUCURSAL(ES)
              </Badge>
              {topCostBranch ? (
                <Badge className="border border-amber-300 bg-amber-50 text-amber-900">
                  MAYOR CARGA · {topCostBranch.name}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {branchCostRows.length ? (
            <div className="max-h-[420px] overflow-auto">
              <div className="sticky top-0 z-10 hidden grid-cols-[minmax(170px,1.4fr)_90px_repeat(5,minmax(120px,1fr))] gap-3 border-b border-[color:var(--border-color)] bg-[color:var(--bg-card)] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] xl:grid">
                <span>Sucursal / participación</span>
                <span>Personal</span>
                <span className="text-right">Programado</span>
                <span className="text-right">Integrado</span>
                <span className="text-right">Costo social</span>
                <span className="text-right">ISR</span>
                <span className="text-right">Costo total</span>
              </div>
              <div className="divide-y divide-[color:var(--border-color)]">
                {branchCostRows.map((branch) => (
                  <div
                    key={branch.id}
                    className={`grid gap-3 px-4 py-3 xl:grid-cols-[minmax(170px,1.4fr)_90px_repeat(5,minmax(120px,1fr))] xl:items-center ${
                      branch.id === "UNASSIGNED"
                        ? "bg-rose-50/70 dark:bg-rose-950/10"
                        : "bg-[color:var(--bg-card)]"
                    }`}
                    style={{ contentVisibility: "auto", containIntrinsicSize: "76px" }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold">{branch.name}</p>
                        <span className="number-display text-[10px]">
                          {branch.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--accent-hover)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#9b704d,#d3a36d)]"
                          style={{ width: `${Math.min(branch.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <DashboardValue label="PERSONAL" value={String(branch.employeeCount)} />
                    <DashboardValue label="PROGRAMADO" value={money.format(branch.scheduled)} />
                    <DashboardValue label="INTEGRADO" value={money.format(branch.gross)} />
                    <DashboardValue label="COSTO SOCIAL" value={money.format(branch.social)} />
                    <DashboardValue label="ISR" value={money.format(branch.isr)} />
                    <DashboardValue label="COSTO TOTAL" value={money.format(branch.total)} emphasis />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <Building2 className="mx-auto h-7 w-7 text-[color:var(--text-muted)]" />
              <p className="mt-3 text-sm font-semibold">Sin carga de costo en esta selección</p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Configura una sucursal y registra al menos una parcialidad para alimentar el análisis.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b border-[color:var(--border-color)]">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" /> Ejercicio y filtros
          </CardTitle>
          <CardDescription>
            Las descargas respetan ejercicio, fecha de pago, empleado y
            sucursal.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <Label>Ejercicio</Label>
            <Select
              value={year}
              onValueChange={(value) => {
                setYear(value);
                setPaymentFrom(`${value}-01-01`);
                setPaymentTo(`${value}-12-31`);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pago desde</Label>
            <Input
              type="date"
              value={paymentFrom}
              max={paymentTo}
              onChange={(event) => setPaymentFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Pago hasta</Label>
            <Input
              type="date"
              value={paymentTo}
              min={paymentFrom}
              onChange={(event) => setPaymentTo(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sucursal de costo</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODAS</SelectItem>
                {state.branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nombre o puesto</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="BUSCAR EMPLEADO"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[color:var(--border-color)]">
          <CardTitle className="section-heading uppercase">
            Cálculo por empleado
          </CardTitle>
          <CardDescription>
            Solo los pagos realizados se incorporan al consolidado y reportes
            del periodo configurado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[color:var(--border-color)]">
            {visibleRows.map((bonus) => {
              const employee = employeeMap.get(bonus.employeeId);
              if (!employee) return null;
              const expanded = expandedId === bonus.id;
              const rowScheduled = christmasScheduledAmount(
                bonus,
                state.christmasBonusPaymentPeriods,
                paymentFrom,
                paymentTo,
              );
              const paidCosts = christmasPaidCosts(
                bonus,
                state.christmasBonusPaymentPeriods,
                state.periodTaxInclusions,
                paymentFrom,
                paymentTo,
              );
              const nextPayment = paymentPeriods.find(
                (period) => !bonus.paidPeriodIds.includes(period.id),
              );
              return (
                <article
                  key={bonus.id}
                  className="px-3 py-2.5 [contain-intrinsic-size:72px] [content-visibility:auto]"
                >
                  <div className="grid gap-2 xl:grid-cols-[minmax(210px,1.25fr)_90px_88px_130px_130px_165px_92px] xl:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{employee.name}</p>
                        <StatusBadge status={bonus.status} />
                      </div>
                      <p className="mt-0.5 text-[9px] text-[color:var(--text-muted)]">
                        {employee.position} · SUELDO{" "}
                        {money.format(employee.monthlySalary)}
                      </p>
                    </div>
                    <div>
                      <p className="label-caps">APLICA</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Toggle
                          checked={bonus.applies}
                          label={`Aplicar aguinaldo a ${employee.name}`}
                          onCheckedChange={(applies) =>
                            save({ ...bonus, applies })
                          }
                        />
                        <span className="text-[10px] font-semibold">
                          {bonus.applies ? "SÍ" : "NO"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="label-caps">DÍAS</p>
                      <Input
                        className="mt-1 h-8"
                        type="number"
                        min="0"
                        step="1"
                        value={
                          bonus.daysGranted === 0 ? "" : bonus.daysGranted
                        }
                        onChange={(event) => {
                          const value = event.target.value;
                          upsertChristmasBonus(
                            recalculate(
                              employee,
                              bonus,
                              value === ""
                                ? 0
                                : Math.max(0, Number(value) || 0),
                            ),
                          );
                        }}
                        onBlur={() => toast.success("Días actualizados.")}
                      />
                    </div>
                    <div>
                      <p className="label-caps">PROGRAMADO</p>
                      <p className="number-display mt-1 text-sm">
                        {money.format(rowScheduled)}
                      </p>
                    </div>
                    <div>
                      <p className="label-caps">PAGADO</p>
                      <p className="number-display mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                        {money.format(paidCosts.gross)}
                      </p>
                      <p className="text-[8px] text-[color:var(--text-muted)]">
                        COSTO {money.format(
                          paidCosts.gross + paidCosts.social + paidCosts.isr,
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-[10px]"
                      disabled={
                        !bonus.applies ||
                        bonus.grossAmount <= 0 ||
                        !nextPayment
                      }
                      onClick={() => {
                        if (nextPayment) markPayment(bonus, nextPayment);
                      }}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      {nextPayment
                        ? `PAGAR ${(nextPayment.percentage * 100).toFixed(0)}%`
                        : "PAGADO"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expanded ? null : bonus.id)}
                      aria-expanded={expanded}
                    >
                      {expanded ? (
                        <ChevronUp className="mr-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="mr-1 h-4 w-4" />
                      )}
                      Detalle
                    </Button>
                  </div>
                  {expanded ? (
                    <ChristmasEditor
                      employee={employee}
                      bonus={bonus}
                      paymentPeriods={paymentPeriods}
                      save={save}
                      updateNotes={upsertChristmasBonus}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        </CardContent>
        <Pagination
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </div>
  );
}

function ChristmasEditor({
  employee,
  bonus,
  paymentPeriods,
  save,
  updateNotes,
}: {
  employee: DemoEmployee;
  bonus: DemoChristmasBonus;
  paymentPeriods: DemoChristmasBonusPaymentPeriod[];
  save: (bonus: DemoChristmasBonus, message?: string) => void;
  updateNotes: (bonus: DemoChristmasBonus) => void;
}) {
  return (
    <div className="mt-4 space-y-5 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/10 p-4">
      <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-3">
        <p className="label-caps">CALENDARIO DE PAGO CONFIGURADO</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {paymentPeriods.map((period) => (
            <div
              key={period.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border-color)] px-3 py-2 text-[10px]"
            >
              <span>
                <strong className="block">{period.name}</strong>
                {period.paymentDate} · {(period.percentage * 100).toFixed(0)}%
              </span>
              <Badge variant="outline">
                {bonus.paidPeriodIds.includes(period.id)
                  ? "PAGADO"
                  : "PENDIENTE"}
              </Badge>
            </div>
          ))}
          {!paymentPeriods.length ? (
            <p className="text-xs text-amber-700">
              Configura al menos un periodo de pago en Configuración.
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2 xl:col-span-1">
          <Label>Importe editable</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={bonus.grossAmount === 0 ? "" : bonus.grossAmount}
            onChange={(event) =>
              save({
                ...bonus,
                grossAmount: Math.max(0, Number(event.target.value) || 0),
              })
            }
          />
        </div>
        <TaxEditor
          label="Costo social"
          checked={bonus.includeSocialCost}
          rate={bonus.socialCostRate}
          onChecked={(includeSocialCost) =>
            save({ ...bonus, includeSocialCost })
          }
          onRate={(socialCostRate) => save({ ...bonus, socialCostRate })}
        />
        <TaxEditor
          label="ISR"
          checked={bonus.includeIsr}
          rate={bonus.isrRate}
          onChecked={(includeIsr) => save({ ...bonus, includeIsr })}
          onRate={(isrRate) => save({ ...bonus, isrRate })}
        />
      </div>
      <BranchPicker
        value={bonus.costBranchIds}
        onChange={(costBranchIds) => save({ ...bonus, costBranchIds })}
      />
      <div className="space-y-2">
        <Label>Notas para {employee.name}</Label>
        <Textarea
          value={bonus.notes}
          onChange={(event) =>
            updateNotes({ ...bonus, notes: event.target.value })
          }
          onBlur={() => toast.success("Notas guardadas.")}
        />
      </div>
    </div>
  );
}

export function PayrollSettlementReportDemo() {
  const { state } = usePayrollDemo();
  const currentYear = new Date().getFullYear();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState<PageSize>("20");
  const [page, setPage] = useState(1);
  const employeeMap = useMemo(
    () => new Map(state.employees.map((employee) => [employee.id, employee])),
    [state.employees],
  );
  const rows = useMemo(
    () =>
      state.terminationSettlements
        .filter((settlement) => {
          const employee = employeeMap.get(settlement.employeeId);
          const term = search.trim().toLocaleUpperCase("es-MX");
          return Boolean(
            employee &&
            settlement.applies &&
            !settlement.archivedAt &&
            settlement.terminationDate >= dateFrom &&
            settlement.terminationDate <= dateTo &&
            (branchFilter === "ALL" ||
              settlement.costBranchIds.includes(branchFilter)) &&
            (statusFilter === "ALL" || settlement.status === statusFilter) &&
            (!term ||
              `${employee.name} ${employee.position}`
                .toLocaleUpperCase("es-MX")
                .includes(term)),
          );
        })
        .sort((a, b) => b.terminationDate.localeCompare(a.terminationDate)),
    [
      branchFilter,
      dateFrom,
      dateTo,
      employeeMap,
      search,
      statusFilter,
      state.terminationSettlements,
    ],
  );
  const effectiveSize =
    pageSize === "ALL" ? Math.max(rows.length, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / effectiveSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = rows.slice(
    (safePage - 1) * effectiveSize,
    safePage * effectiveSize,
  );
  const totals = rows.reduce(
    (sum, row) => {
      const costs = settlementCosts(row, state.periodTaxInclusions);
      return { gross: sum.gross + costs.gross, total: sum.total + costs.total };
    },
    { gross: 0, total: 0 },
  );
  useEffect(
    () => setPage(1),
    [branchFilter, dateFrom, dateTo, pageSize, search, statusFilter],
  );
  const exportRows = rows.map((settlement) => {
    const employee = employeeMap.get(settlement.employeeId);
    const costs = settlementCosts(settlement, state.periodTaxInclusions);
    return {
      employee: employee?.name ?? "PERSONA DEMO",
      position: employee?.position ?? "SIN PUESTO",
      hireDate: settlement.hireDate,
      terminationDate: settlement.terminationDate,
      paymentDate: settlement.paymentDate,
      kind: settlement.kind,
      status: statusCopy[settlement.status],
      caseStatus: settlement.caseClosed ? "CERRADO" : "PENDIENTE",
      outcome:
        settlement.outcome === "WON"
          ? "CASO GANADO"
          : settlement.outcome === "SETTLED"
            ? "LIQUIDADO"
            : "PENDIENTE",
      branches: settlement.costBranchIds
        .map(
          (branchId) =>
            state.branches.find((branch) => branch.id === branchId)?.name,
        )
        .filter(Boolean)
        .join(", "),
      gross: costs.gross,
      total: costs.total,
    };
  });
  const exportConfig = {
    title: "Reporte histórico de liquidaciones y finiquitos",
    subtitle: `${dateFrom} — ${dateTo} · ${branchFilter === "ALL" ? "REPORTE GENERAL" : (state.branches.find((branch) => branch.id === branchFilter)?.name ?? "SUCURSAL")}`,
    metadata: [
      { label: "Periodo de baja", value: `${dateFrom} — ${dateTo}` },
      {
        label: "Sucursal",
        value:
          branchFilter === "ALL"
            ? "EMPRESA COMPLETA"
            : (state.branches.find((branch) => branch.id === branchFilter)
                ?.name ?? "SUCURSAL"),
      },
      { label: "Empleado", value: search || "TODOS" },
      { label: "Alcance", value: "HISTORIAL DE PAGOS Y BAJAS" },
    ],
    metrics: [
      {
        label: "Registros",
        value: String(rows.length),
        detail: "Historial seleccionado",
      },
      {
        label: "Pago bruto",
        value: money.format(totals.gross),
        detail: "Conceptos aplicables",
      },
      {
        label: "Costo total",
        value: money.format(totals.total),
        detail: "Con cargas",
      },
      {
        label: "Pagados",
        value: String(rows.filter((row) => row.status === "PAID").length),
        detail: "Registros cerrados",
      },
    ],
    analysis: [
      `${rows.filter((row) => row.kind === "LIQUIDACION").length} liquidaciones y ${rows.filter((row) => row.kind === "FINIQUITO").length} finiquitos.`,
      `${rows.filter((row) => row.status === "DRAFT").length} registros requieren autorización.`,
      `${rows.filter((row) => row.caseClosed).length} casos cerrados y ${rows.filter((row) => !row.caseClosed).length} abiertos.`,
      "Las fechas de alta y baja permanecen visibles para auditar antigüedad y cálculo.",
    ],
    filename: `reporte-liquidaciones-${dateFrom}-${dateTo}`,
    sheetName: "Reporte liquidaciones",
    orientation: "landscape" as const,
    rows: exportRows,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: (typeof exportRows)[number]) => row.employee,
        width: 24,
      },
      {
        header: "PUESTO",
        accessor: (row: (typeof exportRows)[number]) => row.position,
        width: 20,
      },
      {
        header: "ALTA",
        accessor: (row: (typeof exportRows)[number]) => row.hireDate,
        width: 13,
      },
      {
        header: "BAJA",
        accessor: (row: (typeof exportRows)[number]) => row.terminationDate,
        width: 13,
      },
      {
        header: "PAGO",
        accessor: (row: (typeof exportRows)[number]) => row.paymentDate,
        width: 13,
      },
      {
        header: "TIPO",
        accessor: (row: (typeof exportRows)[number]) => row.kind,
        width: 14,
      },
      {
        header: "ESTATUS",
        accessor: (row: (typeof exportRows)[number]) => row.status,
        width: 14,
      },
      {
        header: "CASO",
        accessor: (row: (typeof exportRows)[number]) => row.caseStatus,
        width: 12,
      },
      {
        header: "RESULTADO",
        accessor: (row: (typeof exportRows)[number]) => row.outcome,
        width: 15,
      },
      {
        header: "SUCURSAL",
        accessor: (row: (typeof exportRows)[number]) => row.branches,
        width: 22,
      },
      {
        header: "PAGO BRUTO",
        accessor: (row: (typeof exportRows)[number]) => row.gross,
        format: "currency" as const,
        width: 16,
      },
      {
        header: "COSTO TOTAL",
        accessor: (row: (typeof exportRows)[number]) => row.total,
        format: "currency" as const,
        width: 17,
      },
    ],
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">REPORTE EJECUTIVO</Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Historial de bajas y pagos
            </span>
          </div>
          <h1 className="page-title">Reporte de liquidaciones</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Consulta fechas de alta, baja y pago, costo por sucursal y estatus
            del acuerdo.
          </p>
        </div>
        <ReportExportButtons config={exportConfig} disabled={!rows.length} />
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={UserMinus}
          label="REGISTROS"
          value={String(rows.length)}
          detail="Bajas seleccionadas"
        />
        <Metric
          icon={WalletCards}
          label="PAGO BRUTO"
          value={money.format(totals.gross)}
          detail="Conceptos aplicables"
        />
        <Metric
          icon={Building2}
          label="COSTO TOTAL"
          value={money.format(totals.total)}
          detail="Con cargas configuradas"
        />
        <Metric
          icon={CheckCircle2}
          label="PAGADOS"
          value={String(rows.filter((row) => row.status === "PAID").length)}
          detail="Historial cerrado"
        />
      </div>
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <Label>Desde</Label>
            <Input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sucursal</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODAS</SelectItem>
                {state.branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Empleado</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="NOMBRE O PUESTO"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado del pago</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODOS</SelectItem>
                <SelectItem value="DRAFT">PENDIENTES</SelectItem>
                <SelectItem value="APPROVED">APROBADOS</SelectItem>
                <SelectItem value="PAID">PAGADOS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EMPLEADO</TableHead>
                  <TableHead>ALTA / BAJA</TableHead>
                  <TableHead>TIPO</TableHead>
                  <TableHead>SUCURSAL DE COSTO</TableHead>
                  <TableHead>ESTATUS</TableHead>
                  <TableHead>CASO</TableHead>
                  <TableHead className="text-right">PAGO</TableHead>
                  <TableHead className="text-right">COSTO TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((settlement) => {
                  const employee = employeeMap.get(settlement.employeeId);
                  const costs = settlementCosts(
                    settlement,
                    state.periodTaxInclusions,
                  );
                  return (
                    <TableRow
                      key={settlement.id}
                      className={
                        settlement.status === "PAID"
                          ? "bg-emerald-50/60 dark:bg-emerald-950/10"
                          : settlement.status === "APPROVED"
                            ? "bg-sky-50/70 dark:bg-sky-950/10"
                            : undefined
                      }
                    >
                      <TableCell>
                        <p className="font-semibold">{employee?.name}</p>
                        <p className="text-[10px] text-[color:var(--text-muted)]">
                          {employee?.position}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs">ALTA {settlement.hireDate}</p>
                        <p className="text-xs">
                          BAJA {settlement.terminationDate}
                        </p>
                      </TableCell>
                      <TableCell>{settlement.kind}</TableCell>
                      <TableCell>
                        {settlement.costBranchIds
                          .map(
                            (branchId) =>
                              state.branches.find(
                                (branch) => branch.id === branchId,
                              )?.name,
                          )
                          .filter(Boolean)
                          .join(", ")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={settlement.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {settlement.caseClosed
                            ? settlement.outcome === "WON"
                              ? "CASO GANADO"
                              : "LIQUIDADO"
                            : "PENDIENTE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="number-display text-right">
                        {money.format(costs.gross)}
                      </TableCell>
                      <TableCell className="number-display text-right font-semibold">
                        {money.format(costs.total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <Pagination
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </div>
  );
}
