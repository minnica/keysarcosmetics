"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gavel,
  HandCoins,
  Sparkles,
  Trophy,
  UserRoundCheck,
  type LucideIcon,
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import {
  payrollModuleLabel,
  temporaryBonusAwardsForPeriod,
  temporaryBonusStandings,
  usePayrollDemo,
} from "./payroll-demo-context";
import { ReportExportButtons } from "./report-export-buttons";

export type OperationalReportKind = "MOVEMENTS" | "LOANS" | "BONUSES" | "FINES";

type OperationalReportRow = {
  id: string;
  date: string;
  employeeIds: string[];
  employeeNames: string;
  branchIds: string[];
  concept: string;
  detail: string;
  payrollModule: string;
  status: string;
  amount: number;
  signedAmount: number;
  approved: boolean;
};

type BranchStat = {
  id: string;
  name: string;
  records: number;
  approved: number;
  gross: number;
  impact: number;
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const reportConfig: Record<
  OperationalReportKind,
  {
    title: string;
    label: string;
    description: string;
    icon: LucideIcon;
    impactLabel: string;
  }
> = {
  MOVEMENTS: {
    title: "Reporte de movimientos",
    label: "MOVIMIENTOS",
    description:
      "Analiza ajustes de más, ajustes de menos, pagos y correcciones por persona y sucursal.",
    icon: ArrowLeftRight,
    impactLabel: "IMPACTO NETO",
  },
  LOANS: {
    title: "Reporte de préstamos y adelantos",
    label: "PRÉSTAMOS",
    description:
      "Consulta solicitudes, autorizaciones, cuotas y distribución del importe por punto de venta.",
    icon: HandCoins,
    impactLabel: "MONTO AUTORIZADO",
  },
  BONUSES: {
    title: "Reporte de bonos",
    label: "BONOS",
    description:
      "Compara bonos aplicados, cumplimiento por vendedor y costo asignado a cada sucursal.",
    icon: Sparkles,
    impactLabel: "BONOS APROBADOS",
  },
  FINES: {
    title: "Reporte de multas",
    label: "MULTAS",
    description:
      "Revisa incidencias, frecuencia por persona y descuentos distribuidos por sucursal.",
    icon: Gavel,
    impactLabel: "DESCUENTO APROBADO",
  },
};

const adjustmentTypeLabels: Record<string, string> = {
  PLUS: "AJUSTE DE MÁS",
  MINUS: "AJUSTE DE MENOS",
  LOAN_PAYMENT: "PAGO DE PRÉSTAMO",
  BASE_SALARY: "CORRECCIÓN DE SUELDO",
};

const statusLabels: Record<string, string> = {
  DRAFT: "BORRADOR",
  PENDING: "PENDIENTE",
  APPROVED: "APROBADO",
  AUTHORIZED: "AUTORIZADO",
  REJECTED: "RECHAZADO",
  CANCELLED: "CANCELADO",
};

function statusLabel(status: string) {
  return statusLabels[status] ?? status;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function ReportMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : "text-[#9a7048]";
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className={`h-5 w-5 ${toneClass}`} />
        <p className="label-caps mt-4">{label}</p>
        <p className="number-display mt-2 text-2xl">{value}</p>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">{detail}</p>
      </CardContent>
    </Card>
  );
}

function HorizontalBar({
  label,
  detail,
  value,
  max,
}: {
  label: string;
  detail: string;
  value: number;
  max: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{label}</p>
          <p className="text-[10px] text-[color:var(--text-muted)]">{detail}</p>
        </div>
        <span className="number-display text-sm">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[color:var(--accent-hover)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#c3a583] via-[#9b7957] to-[#648672]"
          style={{
            width: `${Math.max(max > 0 ? (value / max) * 100 : 0, value > 0 ? 4 : 0)}%`,
          }}
        />
      </div>
    </div>
  );
}

export function PayrollOperationalReportDemo({
  kind,
}: {
  kind: OperationalReportKind;
}) {
  const { state, currentPeriod } = usePayrollDemo();
  const config = reportConfig[kind];
  const ReportIcon = config.icon;
  const [dateFrom, setDateFrom] = useState(currentPeriod.start);
  const [dateTo, setDateTo] = useState(currentPeriod.end);
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);

  const employeeMap = useMemo(
    () => new Map(state.employees.map((employee) => [employee.id, employee])),
    [state.employees],
  );
  const branchMap = useMemo(
    () => new Map(state.branches.map((branch) => [branch.id, branch])),
    [state.branches],
  );

  const baseRows = useMemo<OperationalReportRow[]>(() => {
    const employeeBranchIds = (employeeId: string) => {
      const employee = employeeMap.get(employeeId);
      return unique(
        employee?.costBranchIds.length
          ? employee.costBranchIds
          : employee?.branchId
            ? [employee.branchId]
            : [],
      );
    };
    const employeeNames = (ids: string[]) =>
      ids
        .map((employeeId) => employeeMap.get(employeeId)?.name)
        .filter((name): name is string => Boolean(name))
        .join(", ") || "SIN EMPLEADO";

    if (kind === "MOVEMENTS") {
      return state.adjustments
        .filter((adjustment) =>
          ["PLUS", "MINUS", "LOAN_PAYMENT", "BASE_SALARY"].includes(
            adjustment.type,
          ),
        )
        .map((adjustment) => {
          const participants = unique(
            adjustment.participantIds.length
              ? adjustment.participantIds
              : [adjustment.employeeId],
          );
          const positive = ["PLUS", "BASE_SALARY"].includes(adjustment.type);
          return {
            id: adjustment.id,
            date: adjustment.payrollDate,
            employeeIds: participants,
            employeeNames: employeeNames(participants),
            branchIds: unique(
              adjustment.costBranchIds.length
                ? adjustment.costBranchIds
                : adjustment.branchId
                  ? [adjustment.branchId]
                  : employeeBranchIds(adjustment.employeeId),
            ),
            concept: adjustment.concept,
            detail: `${adjustmentTypeLabels[adjustment.type] ?? adjustment.type} · ${adjustment.comments}`,
            payrollModule: payrollModuleLabel(state, adjustment.payrollModule),
            status: adjustment.status,
            amount: adjustment.amount,
            signedAmount: positive ? adjustment.amount : -adjustment.amount,
            approved: adjustment.status === "APPROVED",
          };
        });
    }

    if (kind === "LOANS") {
      return state.loans.map((loan) => {
        const employeeIds = [loan.employeeId];
        const requestLabel =
          loan.requestType === "ADVANCE" ? "ADELANTO" : "PRÉSTAMO";
        return {
          id: loan.id,
          date: loan.requestedAt,
          employeeIds,
          employeeNames: employeeNames(employeeIds),
          branchIds: employeeBranchIds(loan.employeeId),
          concept: requestLabel,
          detail: `${loan.paidInstallments} DE ${loan.installments} CUOTAS PAGADAS · ${loan.notes}`,
          payrollModule: payrollModuleLabel(state, loan.payrollModule),
          status: loan.status,
          amount: loan.amount,
          signedAmount: loan.amount,
          approved: loan.status === "APPROVED",
        };
      });
    }

    const movementType = kind === "BONUSES" ? "BONUS" : "FINE";
    const movementRows = state.movements
      .filter((movement) => movement.type === movementType)
      .map((movement) => ({
        id: movement.id,
        date: movement.appliedAt,
        employeeIds: [movement.employeeId],
        employeeNames: employeeNames([movement.employeeId]),
        branchIds: unique(
          movement.costBranchIds.length
            ? movement.costBranchIds
            : employeeBranchIds(movement.employeeId),
        ),
        concept: movement.concept,
        detail:
          movement.mode === "SCALE"
            ? `META DESDE ${money.format(movement.threshold ?? 0)}`
            : "MONTO FIJO",
        payrollModule: payrollModuleLabel(state, movement.payrollModule),
        status: movement.status,
        amount: movement.amount,
        signedAmount:
          movement.type === "BONUS" ? movement.amount : -movement.amount,
        approved: movement.status === "APPROVED",
      }));
    if (kind !== "BONUSES") return movementRows;
    const automaticAwards = temporaryBonusAwardsForPeriod(
      state,
      "0000-01-01",
      "9999-12-31",
    ).map((award) => ({
      id: award.id,
      date: award.appliedAt,
      employeeIds: [award.employee.id],
      employeeNames: employeeNames([award.employee.id]),
      branchIds: award.costBranchIds,
      concept: award.concept.name,
      detail: `RETO TEMPORAL · POSICIÓN ${award.standing.rank} · ${award.concept.condition === "BONUS_COUNT" ? `${award.standing.value} BONOS` : money.format(award.standing.value)}`,
      payrollModule: payrollModuleLabel(state, award.concept.payrollModule),
      status: "APPROVED",
      amount: award.amount,
      signedAmount: award.amount,
      approved: true,
    }));
    return [...movementRows, ...automaticAwards];
  }, [employeeMap, kind, state]);

  const availableStatuses = useMemo(
    () => unique(baseRows.map((row) => row.status)).sort(),
    [baseRows],
  );

  const filteredRows = useMemo(
    () =>
      baseRows
        .filter((row) => row.date >= dateFrom && row.date <= dateTo)
        .filter(
          (row) =>
            employeeFilter === "ALL" ||
            row.employeeIds.includes(employeeFilter),
        )
        .filter(
          (row) =>
            branchFilter === "ALL" || row.branchIds.includes(branchFilter),
        )
        .filter((row) => statusFilter === "ALL" || row.status === statusFilter)
        .sort(
          (left, right) =>
            right.date.localeCompare(left.date) ||
            left.employeeNames.localeCompare(right.employeeNames, "es-MX"),
        ),
    [baseRows, branchFilter, dateFrom, dateTo, employeeFilter, statusFilter],
  );

  const scopedAmount = (row: OperationalReportRow) => {
    if (branchFilter === "ALL") return row.signedAmount;
    if (!row.branchIds.includes(branchFilter)) return 0;
    return row.signedAmount / Math.max(row.branchIds.length, 1);
  };

  const approvedRows = filteredRows.filter((row) => row.approved);
  const approvedGross = approvedRows.reduce(
    (sum, row) => sum + Math.abs(scopedAmount(row)),
    0,
  );
  const netImpact = approvedRows.reduce(
    (sum, row) => sum + scopedAmount(row),
    0,
  );
  const participatingBranches = new Set(
    filteredRows.flatMap((row) =>
      branchFilter === "ALL" ? row.branchIds : [branchFilter],
    ),
  ).size;

  const branchStats = useMemo<BranchStat[]>(() => {
    return state.branches
      .filter((branch) => branchFilter === "ALL" || branch.id === branchFilter)
      .map((branch) => {
        const rows = filteredRows.filter((row) =>
          row.branchIds.includes(branch.id),
        );
        const approved = rows.filter((row) => row.approved);
        return {
          id: branch.id,
          name: branch.name,
          records: rows.length,
          approved: approved.length,
          gross: approved.reduce(
            (sum, row) =>
              sum +
              Math.abs(row.signedAmount) / Math.max(row.branchIds.length, 1),
            0,
          ),
          impact: approved.reduce(
            (sum, row) =>
              sum + row.signedAmount / Math.max(row.branchIds.length, 1),
            0,
          ),
        };
      })
      .filter((branch) => branch.records > 0 || branchFilter !== "ALL")
      .sort((left, right) => right.gross - left.gross);
  }, [branchFilter, filteredRows, state.branches]);

  const conceptUniverse = useMemo(() => {
    const usedConcepts = baseRows.map((row) => row.concept);
    if (kind === "LOANS")
      return unique([...usedConcepts, "PRÉSTAMO", "ADELANTO"]);
    if (kind === "BONUSES" || kind === "FINES") {
      const type = kind === "BONUSES" ? "BONUS" : "FINE";
      return unique([
        ...usedConcepts,
        ...state.bonusFineConcepts
          .filter((concept) => concept.type === type)
          .map((concept) => concept.name),
      ]);
    }
    return unique(usedConcepts);
  }, [baseRows, kind, state.bonusFineConcepts]);

  const usageRows = filteredRows.filter(
    (row) => row.status !== "CANCELLED" && row.status !== "REJECTED",
  );
  const conceptStats = conceptUniverse
    .map((concept) => ({
      concept,
      count: usageRows.filter((row) => row.concept === concept).length,
      amount: approvedRows
        .filter((row) => row.concept === concept)
        .reduce((sum, row) => sum + Math.abs(scopedAmount(row)), 0),
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.concept.localeCompare(right.concept, "es-MX"),
    );
  const mostUsed = conceptStats[0];
  const leastUsed = [...conceptStats].sort(
    (left, right) =>
      left.count - right.count ||
      left.concept.localeCompare(right.concept, "es-MX"),
  )[0];
  const employeeStats = state.employees
    .map((employee) => {
      const rows = usageRows.filter((row) =>
        row.employeeIds.includes(employee.id),
      );
      return {
        employee,
        count: rows.length,
        amount: rows
          .filter((row) => row.approved)
          .reduce((sum, row) => sum + Math.abs(scopedAmount(row)), 0),
      };
    })
    .filter((item) => item.count > 0)
    .sort(
      (left, right) =>
        right.count - left.count ||
        right.amount - left.amount ||
        left.employee.name.localeCompare(right.employee.name, "es-MX"),
    );
  const topEmployee = employeeStats[0];
  const today = new Date().toISOString().slice(0, 10);
  const temporaryCompetitions =
    kind === "BONUSES"
      ? state.bonusFineConcepts
          .filter(
            (concept) =>
              concept.type === "BONUS" &&
              concept.temporary &&
              Boolean(concept.validUntil) &&
              concept.validUntil! >= dateFrom &&
              concept.validUntil! <= dateTo &&
              concept.validUntil! <= today,
          )
          .map((concept) => ({
            concept,
            topFive: temporaryBonusStandings(state, concept)
              .filter((standing) => standing.achieved)
              .slice(0, 5),
          }))
          .sort((left, right) =>
            right.concept.validUntil!.localeCompare(left.concept.validUntil!),
          )
      : [];
  const maxConceptCount = Math.max(
    ...conceptStats.map((item) => item.count),
    1,
  );
  const maxBranchRecords = Math.max(
    ...branchStats.map((item) => item.records),
    1,
  );

  const totalPages =
    pageSize === "ALL"
      ? 1
      : Math.max(1, Math.ceil(filteredRows.length / Number(pageSize)));
  const safePage = Math.min(page, totalPages);
  const pagedRows =
    pageSize === "ALL"
      ? filteredRows
      : filteredRows.slice(
          (safePage - 1) * Number(pageSize),
          safePage * Number(pageSize),
        );
  const startRow = filteredRows.length
    ? pageSize === "ALL"
      ? 1
      : (safePage - 1) * Number(pageSize) + 1
    : 0;
  const endRow =
    pageSize === "ALL"
      ? filteredRows.length
      : Math.min(safePage * Number(pageSize), filteredRows.length);

  const selectedBranchName =
    branchFilter === "ALL"
      ? "EMPRESA COMPLETA"
      : (branchMap.get(branchFilter)?.name ?? "SUCURSAL");
  const selectedEmployeeName =
    employeeFilter === "ALL"
      ? "TODOS LOS VENDEDORES"
      : (employeeMap.get(employeeFilter)?.name ?? "EMPLEADO");
  const exportConfig = {
    title: config.title,
    subtitle: `${dateFrom} — ${dateTo} · ${selectedBranchName} · ${selectedEmployeeName} · ${statusFilter === "ALL" ? "TODOS LOS ESTATUS" : statusLabel(statusFilter)}`,
    metadata: [
      { label: "Periodo", value: `${dateFrom} — ${dateTo}` },
      { label: "Sucursal", value: selectedBranchName },
      { label: "Empleado / vendedor", value: selectedEmployeeName },
      {
        label: "Estatus",
        value:
          statusFilter === "ALL"
            ? "TODOS LOS ESTATUS"
            : statusLabel(statusFilter),
      },
    ],
    metrics: [
      {
        label: "Registros",
        value: String(filteredRows.length),
        detail: "Selección actual",
      },
      {
        label: "Monto aprobado",
        value: money.format(approvedGross),
        detail: "Suma absoluta",
      },
      {
        label: "Impacto neto",
        value: money.format(netImpact),
        detail: "Costo asignado",
      },
      {
        label: "Sucursales",
        value: String(participatingBranches),
        detail: "Con participación",
      },
    ],
    analysis: [
      mostUsed
        ? `${mostUsed.concept} es el concepto con mayor uso (${mostUsed.count} registros).`
        : "No existen conceptos con uso en la selección.",
      leastUsed
        ? `${leastUsed.concept} es el concepto con menor uso (${leastUsed.count} registros).`
        : "No existe una base suficiente para identificar el concepto menos usado.",
      topEmployee
        ? `${topEmployee.employee.name} concentra el mayor número de registros (${topEmployee.count}).`
        : "No existen empleados con registros en el periodo.",
      temporaryCompetitions[0]?.topFive[0]
        ? `${temporaryCompetitions[0].topFive[0].employee.name} encabeza ${temporaryCompetitions[0].concept.name}, competencia temporal cerrada con Top 5 histórico.`
        : "No existen competencias temporales cerradas dentro de la selección.",
    ],
    filename: `${kind.toLocaleLowerCase("es-MX")}-${dateFrom}-${dateTo}`,
    sheetName: config.label,
    orientation: "landscape" as const,
    columns: [
      {
        header: "Fecha",
        accessor: (row: OperationalReportRow) => row.date,
        width: 13,
      },
      {
        header: "Empleado",
        accessor: (row: OperationalReportRow) => row.employeeNames,
        width: 24,
      },
      {
        header: "Sucursal",
        accessor: (row: OperationalReportRow) =>
          row.branchIds
            .map((branchId) => branchMap.get(branchId)?.name)
            .filter(Boolean)
            .join(", "),
        width: 22,
      },
      {
        header: "Concepto",
        accessor: (row: OperationalReportRow) => row.concept,
        width: 24,
      },
      {
        header: "Detalle",
        accessor: (row: OperationalReportRow) => row.detail,
        width: 30,
      },
      {
        header: "Nómina",
        accessor: (row: OperationalReportRow) => row.payrollModule,
        width: 17,
      },
      {
        header: "Estatus",
        accessor: (row: OperationalReportRow) => statusLabel(row.status),
        width: 14,
      },
      {
        header: "Importe",
        accessor: (row: OperationalReportRow) => row.amount,
        format: "currency" as const,
        width: 17,
      },
      {
        header: "Costo asignado",
        accessor: (row: OperationalReportRow) =>
          row.approved ? scopedAmount(row) : 0,
        format: "currency" as const,
        width: 19,
      },
    ],
    rows: filteredRows,
    summarySection: {
      title: "Costo por sucursal",
      sheetName: "Costo por sucursal",
      labelHeader: "Sucursal",
      valueHeader: "Impacto",
      rows: branchStats.map((branch) => ({
        label: branch.name,
        value: branch.impact,
      })),
      totalLabel: "Total seleccionado",
      total: netImpact,
    },
  };

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">REPORTE OPERATIVO</Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Análisis ejecutivo y contable
            </span>
          </div>
          <h1 className="page-title">{config.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
            {config.description}
          </p>
        </div>
        <ReportExportButtons
          config={exportConfig}
          disabled={!filteredRows.length}
        />
      </header>

      <Card className="border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" /> Periodo y alcance
          </CardTitle>
          <CardDescription>
            Los indicadores y las descargas respetan exactamente esta selección.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor={`${kind}-from`}>Desde</Label>
            <Input
              id={`${kind}-from`}
              type="date"
              max={dateTo}
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                resetPage();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${kind}-to`}>Hasta</Label>
            <Input
              id={`${kind}-to`}
              type="date"
              min={dateFrom}
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                resetPage();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Vendedor / personal</Label>
            <Select
              value={employeeFilter}
              onValueChange={(value) => {
                setEmployeeFilter(value);
                resetPage();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODOS</SelectItem>
                {state.employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sucursal / empresa</Label>
            <Select
              value={branchFilter}
              onValueChange={(value) => {
                setBranchFilter(value);
                resetPage();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">EMPRESA COMPLETA</SelectItem>
                {state.branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estatus</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                resetPage();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODOS</SelectItem>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetric
          icon={ReportIcon}
          label="REGISTROS FILTRADOS"
          value={String(filteredRows.length)}
          detail={`${approvedRows.length} aprobados · ${selectedBranchName}`}
        />
        <ReportMetric
          icon={CheckCircle2}
          label="IMPORTE APROBADO"
          value={money.format(approvedGross)}
          detail="Suma absoluta del alcance seleccionado"
          tone="green"
        />
        <ReportMetric
          icon={BarChart3}
          label={config.impactLabel}
          value={money.format(netImpact)}
          detail="Efecto contable dentro del periodo"
          tone={netImpact < 0 ? "amber" : "green"}
        />
        <ReportMetric
          icon={Building2}
          label="SUCURSALES"
          value={String(participatingBranches)}
          detail={selectedBranchName}
        />
      </div>

      {temporaryCompetitions.map(({ concept, topFive }) => (
        <Card
          key={concept.id}
          className="overflow-hidden border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-[#f1e1cf] dark:from-amber-950/25 dark:via-[color:var(--bg-card)] dark:to-[color:var(--bg-card)]"
        >
          <CardHeader className="border-b border-amber-300/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-5 w-5 text-amber-600" /> Top 5 ·{" "}
                  {concept.name}
                </CardTitle>
                <CardDescription>
                  Competencia cerrada el {concept.validUntil} · condición:{" "}
                  {concept.condition === "BONUS_COUNT"
                    ? `${concept.threshold ?? 0} bonos registrados`
                    : money.format(concept.threshold ?? 0)}
                  .
                </CardDescription>
              </div>
              <Badge className="border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                HISTORIAL CONSERVADO
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topFive.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20 text-center">POSICIÓN</TableHead>
                    <TableHead>COLABORADOR</TableHead>
                    <TableHead className="text-right">RESULTADO</TableHead>
                    <TableHead className="text-right">PREMIO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topFive.map((standing) => (
                    <TableRow key={standing.employee.id}>
                      <TableCell className="text-center">
                        <span className="number-display text-lg">
                          #{standing.rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">
                          {standing.employee.name}
                        </p>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          {standing.employee.position}
                        </p>
                      </TableCell>
                      <TableCell className="number-display text-right">
                        {concept.condition === "BONUS_COUNT"
                          ? `${standing.value} bonos`
                          : money.format(standing.value)}
                      </TableCell>
                      <TableCell className="number-display text-right text-emerald-700 dark:text-emerald-300">
                        {money.format(standing.awardAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-6 text-center text-sm text-[color:var(--text-muted)]">
                El ciclo terminó sin personas que alcanzaran la condición.
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Uso por concepto
            </CardTitle>
            <CardDescription>
              Conceptos con mayor y menor número de registros en la selección.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {conceptStats.slice(0, 8).map((item) => (
              <HorizontalBar
                key={item.concept}
                label={item.concept}
                detail={`${money.format(item.amount)} aprobado`}
                value={item.count}
                max={maxConceptCount}
              />
            ))}
            {!conceptStats.length && (
              <p className="py-8 text-center text-sm text-[color:var(--text-muted)]">
                Sin conceptos para este periodo.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Actividad por sucursal
            </CardTitle>
            <CardDescription>
              Registros y costo aprobado distribuido entre los puntos de venta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branchStats.slice(0, 8).map((branch) => (
              <HorizontalBar
                key={branch.id}
                label={branch.name}
                detail={`${money.format(branch.impact)} de impacto`}
                value={branch.records}
                max={maxBranchRecords}
              />
            ))}
            {!branchStats.length && (
              <p className="py-8 text-center text-sm text-[color:var(--text-muted)]">
                Sin sucursales con actividad.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/15">
          <CardContent className="p-5">
            <Trophy className="h-5 w-5 text-emerald-700" />
            <p className="label-caps mt-4 text-emerald-800 dark:text-emerald-200">
              MAYOR USO
            </p>
            <p className="mt-2 font-semibold">
              {mostUsed?.concept ?? "SIN DATOS"}
            </p>
            <p className="number-display mt-1 text-xl">
              {mostUsed?.count ?? 0} registros
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/15">
          <CardContent className="p-5">
            <Clock3 className="h-5 w-5 text-amber-700" />
            <p className="label-caps mt-4 text-amber-800 dark:text-amber-200">
              MENOR USO
            </p>
            <p className="mt-2 font-semibold">
              {leastUsed?.concept ?? "SIN DATOS"}
            </p>
            <p className="number-display mt-1 text-xl">
              {leastUsed?.count ?? 0} registros
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <UserRoundCheck className="h-5 w-5 text-[#9a7048]" />
            <p className="label-caps mt-4">PERSONA CON MÁS REGISTROS</p>
            <p className="mt-2 font-semibold">
              {topEmployee?.employee.name ?? "SIN DATOS"}
            </p>
            <p className="number-display mt-1 text-xl">
              {topEmployee?.count ?? 0} registros
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[color:var(--border-color)]">
          <CardTitle className="section-heading uppercase">
            Costo por sucursal
          </CardTitle>
          <CardDescription>
            Totales aprobados prorrateados entre las sucursales asignadas a cada
            registro.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SUCURSAL</TableHead>
                  <TableHead className="text-center">REGISTROS</TableHead>
                  <TableHead className="text-center">APROBADOS</TableHead>
                  <TableHead className="text-right">IMPORTE BRUTO</TableHead>
                  <TableHead className="text-right">IMPACTO CONTABLE</TableHead>
                  <TableHead className="text-right">PARTICIPACIÓN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchStats.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-semibold">
                      {branch.name}
                    </TableCell>
                    <TableCell className="text-center">
                      {branch.records}
                    </TableCell>
                    <TableCell className="text-center">
                      {branch.approved}
                    </TableCell>
                    <TableCell className="number-display text-right">
                      {money.format(branch.gross)}
                    </TableCell>
                    <TableCell className="number-display text-right">
                      {money.format(branch.impact)}
                    </TableCell>
                    <TableCell className="number-display text-right">
                      {approvedGross > 0
                        ? `${((branch.gross / approvedGross) * 100).toFixed(1)}%`
                        : "0.0%"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>TOTAL {selectedBranchName}</TableCell>
                  <TableCell className="text-center">
                    {filteredRows.length}
                  </TableCell>
                  <TableCell className="text-center">
                    {approvedRows.length}
                  </TableCell>
                  <TableCell className="number-display text-right">
                    {money.format(approvedGross)}
                  </TableCell>
                  <TableCell className="number-display text-right">
                    {money.format(netImpact)}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[color:var(--border-color)]">
          <CardTitle className="section-heading uppercase">
            Detalle del periodo seleccionado
          </CardTitle>
          <CardDescription>
            {dateFrom} — {dateTo} · {selectedBranchName} ·{" "}
            {selectedEmployeeName}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FECHA</TableHead>
                  <TableHead>EMPLEADO</TableHead>
                  <TableHead>SUCURSAL</TableHead>
                  <TableHead>CONCEPTO / DETALLE</TableHead>
                  <TableHead>NÓMINA</TableHead>
                  <TableHead>ESTATUS</TableHead>
                  <TableHead className="text-right">IMPORTE</TableHead>
                  <TableHead className="text-right">COSTO ASIGNADO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.length ? (
                  pagedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell className="font-semibold">
                        {row.employeeNames}
                      </TableCell>
                      <TableCell>
                        {row.branchIds
                          .map((branchId) => branchMap.get(branchId)?.name)
                          .filter(Boolean)
                          .join(", ") || "SIN SUCURSAL"}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{row.concept}</p>
                        <p className="max-w-md text-xs text-[color:var(--text-muted)]">
                          {row.detail}
                        </p>
                      </TableCell>
                      <TableCell>{row.payrollModule}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {statusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="number-display text-right">
                        {money.format(row.amount)}
                      </TableCell>
                      <TableCell
                        className={`number-display text-right ${row.approved && scopedAmount(row) < 0 ? "text-rose-700 dark:text-rose-300" : row.approved ? "text-emerald-700 dark:text-emerald-300" : "text-[color:var(--text-muted)]"}`}
                      >
                        {row.approved ? money.format(scopedAmount(row)) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-28 text-center text-[color:var(--text-muted)]"
                    >
                      No hay registros para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t border-[color:var(--border-color)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[color:var(--text-muted)]">
              Mostrando {startRow}–{endRow} de {filteredRows.length} registros ·
              página {safePage} de {totalPages}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Label className="label-caps">FILAS</Label>
              <Select
                value={pageSize}
                onValueChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="h-9 w-28"
                  aria-label="Filas por página"
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Siguiente <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
