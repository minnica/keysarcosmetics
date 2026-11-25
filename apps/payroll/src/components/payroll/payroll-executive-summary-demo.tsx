"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarRange,
  CircleDollarSign,
  Layers3,
  TrendingUp,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
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
  employeeCommissionPayrollModuleForPeriod,
  employeeSalaryPayrollModuleForPeriod,
  payrollModuleForCategory,
  payrollModuleLabel,
  type EmployeePayrollLine,
  type PayrollModule,
  usePayrollDemo,
} from "./payroll-demo-context";
import { employeeMixedCostAllocationShares } from "./payroll-cost-branch-selector";
import { kioskPayrollForMonth } from "./kiosk-payroll-calculator";
import { ReportExportButtons } from "./report-export-buttons";

type RangeMode = "MONTH" | "QUARTER" | "SEMESTER" | "YEAR" | "CUSTOM";

type SummaryMonthRow = {
  id: string;
  label: string;
  start: string;
  end: string;
  sales: number;
  payroll: number;
  workerTax: number;
  social: number;
  isr: number;
  totalCost: number;
  share: number;
  costToSales: number | null;
};

type ContributionRow = {
  id: string;
  name: string;
  amount: number;
  share: number;
  detail: string;
  status?: "ACTIVE" | "INACTIVE" | "NEW" | "NOT_APPLICABLE";
};

type BranchContributionRow = ContributionRow & {
  sales: number;
  costToSales: number | null;
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const preciseMoney = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const compactMoney = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const longDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthBounds(month: string) {
  const [yearText = "1970", monthText = "01"] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  return {
    start: isoDate(new Date(Date.UTC(year, monthIndex, 1))),
    end: isoDate(new Date(Date.UTC(year, monthIndex + 1, 0))),
  };
}

function rangeForMode(mode: Exclude<RangeMode, "CUSTOM">, anchor: string) {
  const date = new Date(`${anchor}T12:00:00Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  let startMonth = month;
  let endMonth = month;
  if (mode === "QUARTER") {
    startMonth = Math.floor(month / 3) * 3;
    endMonth = startMonth + 2;
  }
  if (mode === "SEMESTER") {
    startMonth = month < 6 ? 0 : 6;
    endMonth = startMonth + 5;
  }
  if (mode === "YEAR") {
    startMonth = 0;
    endMonth = 11;
  }
  return {
    start: isoDate(new Date(Date.UTC(year, startMonth, 1))),
    end: isoDate(new Date(Date.UTC(year, endMonth + 1, 0))),
  };
}

function monthsInRange(start: string, end: string) {
  const months: string[] = [];
  const cursor = new Date(`${start.slice(0, 7)}-01T12:00:00Z`);
  const last = new Date(`${end.slice(0, 7)}-01T12:00:00Z`);
  while (cursor <= last) {
    months.push(isoDate(cursor).slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function monthLabel(month: string) {
  return monthFormatter
    .format(new Date(`${month}-01T12:00:00Z`))
    .replace(".", "")
    .toLocaleUpperCase("es-MX");
}

function rangeLabel(start: string, end: string) {
  return `${longDateFormatter.format(new Date(`${start}T12:00:00Z`))} — ${longDateFormatter.format(new Date(`${end}T12:00:00Z`))}`;
}

function addAmount(map: Map<string, number>, id: string, amount: number) {
  map.set(id, (map.get(id) ?? 0) + amount);
}

function lineModuleWeights(
  line: EmployeePayrollLine,
  state: Parameters<typeof employeeSalaryPayrollModuleForPeriod>[0] &
    Parameters<typeof employeeCommissionPayrollModuleForPeriod>[0],
  start: string,
  end: string,
) {
  const weights = new Map<PayrollModule, number>();
  const salaryModule = employeeSalaryPayrollModuleForPeriod(
    state,
    line.employee,
    start,
    end,
  );
  const commissionModule = employeeCommissionPayrollModuleForPeriod(
    state,
    line.employee,
    start,
    end,
  );
  const addWeight = (module: PayrollModule | null, amount: number) => {
    if (!module || amount <= 0) return;
    weights.set(module, (weights.get(module) ?? 0) + amount);
  };
  addWeight(salaryModule, line.fixedSalary + line.doublePayAmount);
  addWeight(commissionModule, line.commission + line.bonuses);
  addWeight("SETTLEMENT", line.settlementPayment);
  addWeight("CHRISTMAS_BONUS", line.christmasBonusPayment);

  const represented = Array.from(weights.values()).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const otherPositive = Math.max(line.payrollBeforeDeductions - represented, 0);
  const fallbackModule =
    commissionModule ??
    salaryModule ??
    (payrollModuleForCategory(line.employee.category) as Exclude<
      PayrollModule,
      "CONSOLIDATED"
    >);
  addWeight(fallbackModule, otherPositive);
  if (weights.size === 0) addWeight(fallbackModule, 1);
  return weights;
}

function metricCardClass(tone: "default" | "accent" = "default") {
  return tone === "accent"
    ? "border-[#b78354]/35 bg-[linear-gradient(135deg,rgba(157,107,66,0.13),rgba(255,255,255,0.78))] dark:bg-[linear-gradient(135deg,rgba(157,107,66,0.2),rgba(29,24,20,0.92))]"
    : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]";
}

export function PayrollExecutiveSummaryDemo() {
  const { state, payrollLines, currentPeriod } = usePayrollDemo();
  const [rangeMode, setRangeMode] = useState<RangeMode>("YEAR");
  const [anchorDate, setAnchorDate] = useState(currentPeriod.end);
  const [customStart, setCustomStart] = useState(currentPeriod.start);
  const [customEnd, setCustomEnd] = useState(currentPeriod.end);
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");

  const selectedRange = useMemo(() => {
    if (rangeMode !== "CUSTOM") return rangeForMode(rangeMode, anchorDate);
    return customStart <= customEnd
      ? { start: customStart, end: customEnd }
      : { start: customEnd, end: customStart };
  }, [anchorDate, customEnd, customStart, rangeMode]);

  const analysis = useMemo(() => {
    const moduleTotals = new Map<string, number>();
    const branchTotals = new Map<string, number>();
    const branchSales = new Map<string, number>();
    let partialKioskMonths = 0;

    const rows = monthsInRange(selectedRange.start, selectedRange.end).map(
      (month): SummaryMonthRow => {
        const fullBounds = monthBounds(month);
        const start =
          selectedRange.start > fullBounds.start
            ? selectedRange.start
            : fullBounds.start;
        const end =
          selectedRange.end < fullBounds.end
            ? selectedRange.end
            : fullBounds.end;
        const lines = payrollLines(
          start,
          state.calculationMode,
          end,
          "CONSOLIDATED",
        ).filter(
          (line) =>
            employeeFilter === "ALL" ||
            line.employee.id === employeeFilter,
        );
        const monthTotal = {
          sales: 0,
          payroll: 0,
          workerTax: 0,
          social: 0,
          isr: 0,
          totalCost: 0,
        };

        state.sales
          .filter(
            (sale) =>
              sale.date >= start &&
              sale.date <= end &&
              (branchFilter === "ALL" || sale.branchId === branchFilter) &&
              (employeeFilter === "ALL" ||
                sale.employeeId === employeeFilter),
          )
          .forEach((sale) => {
            monthTotal.sales += sale.amount;
            addAmount(branchSales, sale.branchId, sale.amount);
          });

        lines.forEach((line) => {
          const fixedAmount = line.fixedSalary + line.doublePayAmount;
          const allocations = employeeMixedCostAllocationShares({
            employee: line.employee,
            branches: state.branches,
            sales: state.sales,
            periodStart: start,
            periodEnd: end,
            fixedAmount,
            variableAmount: Math.max(line.total - fixedAmount, 0),
          });
          const selectedAllocations =
            branchFilter === "ALL"
              ? allocations
              : allocations.filter(
                  (allocation) => allocation.branchId === branchFilter,
                );
          const selectedShare = selectedAllocations.reduce(
            (sum, allocation) => sum + allocation.share,
            0,
          );
          if (selectedShare <= 0) return;

          monthTotal.payroll += line.total * selectedShare;
          monthTotal.workerTax += line.workerTax * selectedShare;
          monthTotal.social += line.socialCost * selectedShare;
          monthTotal.isr += line.isrCost * selectedShare;
          monthTotal.totalCost += line.totalCost * selectedShare;

          const moduleWeights = lineModuleWeights(line, state, start, end);
          const weightTotal = Array.from(moduleWeights.values()).reduce(
            (sum, amount) => sum + amount,
            0,
          );
          moduleWeights.forEach((weight, moduleId) => {
            addAmount(
              moduleTotals,
              moduleId,
              line.totalCost * selectedShare * (weight / weightTotal),
            );
          });
          selectedAllocations.forEach((allocation) => {
            addAmount(
              branchTotals,
              allocation.branchId,
              line.totalCost * allocation.share,
            );
          });
        });

        const completeMonth =
          start === fullBounds.start && end === fullBounds.end;
        if (completeMonth) {
          const kiosk = kioskPayrollForMonth(state, month);
          kiosk.branchRows
            .filter(
              (row) =>
                (branchFilter === "ALL" ||
                  row.target.branchId === branchFilter) &&
                (employeeFilter === "ALL" ||
                  row.manager?.id === employeeFilter),
            )
            .forEach((row) => {
              monthTotal.payroll += row.netPayment;
              monthTotal.workerTax += row.workerTax;
              monthTotal.social += row.socialCost;
              monthTotal.isr += row.isr;
              monthTotal.totalCost += row.totalCost;
              addAmount(moduleTotals, "KIOSK_COMMISSION", row.totalCost);
              addAmount(branchTotals, row.target.branchId, row.totalCost);
            });
        } else {
          partialKioskMonths += 1;
        }

        return {
          id: month,
          label: monthLabel(month),
          start,
          end,
          ...monthTotal,
          share: 0,
          costToSales:
            monthTotal.sales > 0
              ? monthTotal.totalCost / monthTotal.sales
              : null,
        };
      },
    );

    const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);
    rows.forEach((row) => {
      row.share = totalCost > 0 ? row.totalCost / totalCost : 0;
    });
    return {
      rows,
      moduleTotals,
      branchTotals,
      branchSales,
      partialKioskMonths,
    };
  }, [
    branchFilter,
    employeeFilter,
    payrollLines,
    selectedRange.end,
    selectedRange.start,
    state,
  ]);

  const totals = useMemo(
    () =>
      analysis.rows.reduce(
        (sum, row) => ({
          sales: sum.sales + row.sales,
          payroll: sum.payroll + row.payroll,
          workerTax: sum.workerTax + row.workerTax,
          social: sum.social + row.social,
          isr: sum.isr + row.isr,
          totalCost: sum.totalCost + row.totalCost,
        }),
        {
          sales: 0,
          payroll: 0,
          workerTax: 0,
          social: 0,
          isr: 0,
          totalCost: 0,
        },
      ),
    [analysis.rows],
  );

  const moduleRows = useMemo<ContributionRow[]>(
    () =>
      state.payrollModules
        .filter((module) => module.id !== "CONSOLIDATED")
        .map((module) => {
          const amount = analysis.moduleTotals.get(module.id) ?? 0;
          const createdInRange =
            module.createdAt >= selectedRange.start &&
            module.createdAt <= selectedRange.end;
          const notApplicable = module.createdAt > selectedRange.end;
          const status: ContributionRow["status"] = notApplicable
            ? "NOT_APPLICABLE"
            : createdInRange
              ? "NEW"
              : module.active
                ? "ACTIVE"
                : "INACTIVE";
          return {
            id: module.id,
            name: module.name,
            amount,
            share: totals.totalCost > 0 ? amount / totals.totalCost : 0,
            detail: module.custom
              ? "Nómina personalizada"
              : "Nómina del catálogo general",
            status,
          };
        })
        .sort(
          (left, right) =>
            right.amount - left.amount ||
            left.name.localeCompare(right.name, "es-MX"),
        ),
    [
      analysis.moduleTotals,
      selectedRange.end,
      selectedRange.start,
      state.payrollModules,
      totals.totalCost,
    ],
  );

  const branchRows = useMemo<BranchContributionRow[]>(
    () =>
      state.branches
        .filter(
          (branch) => branchFilter === "ALL" || branch.id === branchFilter,
        )
        .map((branch) => {
          const amount = analysis.branchTotals.get(branch.id) ?? 0;
          const sales = analysis.branchSales.get(branch.id) ?? 0;
          return {
            id: branch.id,
            name: branch.name,
            amount,
            share: totals.totalCost > 0 ? amount / totals.totalCost : 0,
            detail: branch.active ? branch.city : `${branch.city} · HISTÓRICO`,
            sales,
            costToSales: sales > 0 ? amount / sales : null,
          };
        })
        .sort(
          (left, right) =>
            right.amount - left.amount ||
            left.name.localeCompare(right.name, "es-MX"),
        ),
    [
      analysis.branchSales,
      analysis.branchTotals,
      branchFilter,
      state.branches,
      totals.totalCost,
    ],
  );

  const selectedBranch = state.branches.find(
    (branch) => branch.id === branchFilter,
  );
  const selectedEmployee = state.employees.find(
    (employee) => employee.id === employeeFilter,
  );
  const scopeLabel = selectedBranch?.name ?? "EMPRESA COMPLETA";
  const employeeLabel = selectedEmployee?.name ?? "TODO EL PERSONAL";
  const averageMonthly =
    analysis.rows.length > 0 ? totals.totalCost / analysis.rows.length : 0;
  const charges = totals.workerTax + totals.social + totals.isr;
  const costToSales =
    totals.sales > 0 ? totals.totalCost / totals.sales : null;

  const exportConfig = {
    title: "Resumen ejecutivo de nómina",
    subtitle: `${rangeLabel(selectedRange.start, selectedRange.end)} · ${scopeLabel} · ${employeeLabel}`,
    filename: `resumen-nomina-${selectedRange.start}-${selectedRange.end}`,
    sheetName: "Resumen de nómina",
    orientation: "landscape" as const,
    metadata: [
      { label: "Periodo", value: rangeLabel(selectedRange.start, selectedRange.end) },
      { label: "Sucursal", value: scopeLabel },
      { label: "Empleado / vendedor", value: employeeLabel },
      {
        label: "Vista",
        value:
          rangeMode === "MONTH"
            ? "MENSUAL"
            : rangeMode === "QUARTER"
              ? "TRIMESTRAL"
              : rangeMode === "SEMESTER"
                ? "SEMESTRAL"
                : rangeMode === "YEAR"
                  ? "ANUAL"
                  : "PERSONALIZADA",
      },
    ],
    metrics: [
      { label: "Ventas reportadas", value: preciseMoney.format(totals.sales) },
      { label: "Gasto general", value: preciseMoney.format(totals.totalCost) },
      {
        label: "Gasto / venta",
        value: costToSales === null ? "—" : `${(costToSales * 100).toFixed(1)}%`,
      },
      { label: "Cargas", value: preciseMoney.format(charges) },
    ],
    columns: [
      { header: "Periodo", accessor: (row: SummaryMonthRow) => row.label, width: 22 },
      { header: "Desde", accessor: (row: SummaryMonthRow) => row.start, width: 14 },
      { header: "Hasta", accessor: (row: SummaryMonthRow) => row.end, width: 14 },
      { header: "Ventas reportadas", accessor: (row: SummaryMonthRow) => row.sales, format: "currency" as const, width: 20 },
      { header: "Neto de nómina", accessor: (row: SummaryMonthRow) => row.payroll, format: "currency" as const, width: 18 },
      { header: "Impuesto trabajador", accessor: (row: SummaryMonthRow) => row.workerTax, format: "currency" as const, width: 18 },
      { header: "Costo social", accessor: (row: SummaryMonthRow) => row.social, format: "currency" as const, width: 18 },
      { header: "ISR", accessor: (row: SummaryMonthRow) => row.isr, format: "currency" as const, width: 18 },
      { header: "Gasto general", accessor: (row: SummaryMonthRow) => row.totalCost, format: "currency" as const, width: 20 },
      { header: "Gasto / venta", accessor: (row: SummaryMonthRow) => row.costToSales, format: "percent" as const, width: 16 },
      { header: "% del total", accessor: (row: SummaryMonthRow) => row.share, format: "percent" as const, width: 14 },
    ],
    rows: analysis.rows,
    analysis: [
      `El gasto general corresponde a neto de nómina, impuesto del trabajador, costo social e ISR dentro del periodo seleccionado.`,
      `Las ventas se suman por vendedor y sucursal desde los registros del punto de venta incluidos en la selección. El indicador gasto / venta divide el gasto integral entre esas ventas.`,
      `Los porcentajes se calculan contra ${preciseMoney.format(totals.totalCost)}, que representa el 100% de la selección.`,
      ...(analysis.partialKioskMonths > 0
        ? [
            "La comisión de kiosco no se incluye en meses parciales porque su fuente tiene cierre mensual y no permite un prorrateo verificable.",
          ]
        : []),
    ],
    summarySection: {
      title: "Gasto por tipo de nómina",
      sheetName: "Nóminas",
      labelHeader: "Nómina",
      valueHeader: "Gasto",
      rows: moduleRows.map((row) => ({ label: row.name, value: row.amount })),
      totalLabel: "Gasto general",
      total: totals.totalCost,
    },
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-[#b88b62]/30 bg-[linear-gradient(135deg,#2b211b,#493526)] px-5 py-5 text-white shadow-[0_20px_55px_rgba(43,33,27,0.18)] md:px-7 md:py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e4bb8e]">
              <BarChart3 className="h-4 w-4" /> Dirección
            </div>
            <h1 className="mt-2 font-serif text-3xl leading-tight md:text-4xl">
              Resumen de nómina
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Gasto integral por periodo, nómina y sucursal con conciliación al
              mismo cálculo del consolidado.
            </p>
          </div>
          <ReportExportButtons config={exportConfig} appearance="on-dark" />
        </div>

        <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e8c7a4]">
              Vista
            </Label>
            <Select
              value={rangeMode}
              onValueChange={(value) => setRangeMode(value as RangeMode)}
            >
              <SelectTrigger
                style={{
                  backgroundColor: "rgba(33, 26, 22, 0.88)",
                  color: "#fff8ee",
                }}
                className="h-10 border-white/25 shadow-none [&>span]:text-[#fff8ee] [&_svg]:text-[#f2d8ba]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTH">MENSUAL</SelectItem>
                <SelectItem value="QUARTER">TRIMESTRAL</SelectItem>
                <SelectItem value="SEMESTER">SEMESTRAL</SelectItem>
                <SelectItem value="YEAR">ANUAL</SelectItem>
                <SelectItem value="CUSTOM">PERSONALIZADA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {rangeMode === "CUSTOM" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="summary-start" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e8c7a4]">
                  Desde
                </Label>
                <Input id="summary-start" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="h-10 border-white/20 bg-white/[0.07] text-white [color-scheme:dark]" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="summary-end" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e8c7a4]">
                  Hasta
                </Label>
                <Input id="summary-end" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="h-10 border-white/20 bg-white/[0.07] text-white [color-scheme:dark]" />
              </div>
            </>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="summary-anchor" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e8c7a4]">
                Fecha de referencia
              </Label>
              <Input id="summary-anchor" type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} className="h-10 border-white/20 bg-white/[0.07] text-white [color-scheme:dark]" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e8c7a4]">
              Sucursal
            </Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger
                style={{
                  backgroundColor: "rgba(33, 26, 22, 0.88)",
                  color: "#fff8ee",
                }}
                className="h-10 border-white/25 shadow-none [&>span]:text-[#fff8ee] [&_svg]:text-[#f2d8ba]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODAS LAS SUCURSALES</SelectItem>
                {state.branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}{!branch.active ? " · HISTÓRICA" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e8c7a4]">
              Empleado / vendedor
            </Label>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger
                style={{
                  backgroundColor: "rgba(33, 26, 22, 0.88)",
                  color: "#fff8ee",
                }}
                className="h-10 border-white/25 shadow-none [&>span]:text-[#fff8ee] [&_svg]:text-[#f2d8ba]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">TODO EL PERSONAL</SelectItem>
                {[...state.employees]
                  .sort((left, right) => left.name.localeCompare(right.name, "es-MX"))
                  .map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} · {employee.position}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[11px] text-white/55">
          <CalendarRange className="h-3.5 w-3.5" />
          {rangeLabel(selectedRange.start, selectedRange.end)} · {scopeLabel} · {employeeLabel}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores del resumen">
        <Card className={metricCardClass()}>
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a66f3e]">Ventas reportadas</p><p className="mt-2 text-2xl font-semibold tabular-nums">{preciseMoney.format(totals.sales)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Suma por vendedor y sucursal</p></div>
            <span className="rounded-xl border border-[#bd9169]/25 bg-[#bd9169]/10 p-2 text-[#9b6b42]"><TrendingUp className="h-5 w-5" /></span>
          </CardContent>
        </Card>
        <Card className={metricCardClass("accent")}>
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a66f3e]">Gasto general</p><p className="mt-2 text-2xl font-semibold tabular-nums">{preciseMoney.format(totals.totalCost)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">100% de la selección</p></div>
            <span className="rounded-xl border border-[#bd9169]/25 bg-[#bd9169]/10 p-2 text-[#9b6b42]"><CircleDollarSign className="h-5 w-5" /></span>
          </CardContent>
        </Card>
        <Card className={metricCardClass()}>
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a66f3e]">Gasto / venta</p><p className="mt-2 text-2xl font-semibold tabular-nums">{costToSales === null ? "—" : `${(costToSales * 100).toFixed(1)}%`}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Costo integral sobre ventas</p></div>
            <span className="rounded-xl border border-[#bd9169]/25 bg-[#bd9169]/10 p-2 text-[#9b6b42]"><WalletCards className="h-5 w-5" /></span>
          </CardContent>
        </Card>
        <Card className={metricCardClass()}>
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a66f3e]">Cargas</p><p className="mt-2 text-2xl font-semibold tabular-nums">{preciseMoney.format(charges)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">Trabajador + social + ISR</p></div>
            <span className="rounded-xl border border-[#bd9169]/25 bg-[#bd9169]/10 p-2 text-[#9b6b42]"><Layers3 className="h-5 w-5" /></span>
          </CardContent>
        </Card>
        <Card className={metricCardClass()}>
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a66f3e]">Promedio mensual</p><p className="mt-2 text-2xl font-semibold tabular-nums">{preciseMoney.format(averageMonthly)}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{analysis.rows.length} meses incluidos</p></div>
            <span className="rounded-xl border border-[#bd9169]/25 bg-[#bd9169]/10 p-2 text-[#9b6b42]"><TrendingUp className="h-5 w-5" /></span>
          </CardContent>
        </Card>
      </section>

      {analysis.partialKioskMonths > 0 && (
        <div className="rounded-xl border border-amber-300/55 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200">
          La comisión de kiosco se excluye de los meses parciales porque su fuente se registra por cierre mensual completo.
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Card className="overflow-hidden border-[color:var(--border-color)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-[#a66f3e]" /> Ventas frente a gasto</CardTitle>
            <CardDescription>Comparativo mensual con la misma selección de sucursal y vendedor.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {analysis.rows.some((row) => row.totalCost > 0) ? (
              <div className="h-[290px] w-full" role="img" aria-label="Gráfica mensual comparativa de ventas reportadas y gasto general de nómina">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analysis.rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.25} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(value) => compactMoney.format(Number(value))} tick={{ fontSize: 10 }} width={66} />
                    <Tooltip formatter={(value) => preciseMoney.format(Number(value))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="sales" name="Ventas reportadas" fill="#b87d49" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="totalCost" name="Gasto general" fill="#4f7d70" radius={[5, 5, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[290px] items-center justify-center rounded-2xl border border-dashed border-[color:var(--border-color)] text-sm text-[color:var(--text-muted)]">No existen importes para la selección.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[color:var(--border-color)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Layers3 className="h-5 w-5 text-[#a66f3e]" /> % por nómina</CardTitle>
            <CardDescription>Aportación de cada nómina sobre el 100% del gasto.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[330px] space-y-3 overflow-y-auto pt-2">
            {moduleRows.map((row) => (
              <div key={row.id} className="space-y-1.5">
                <div className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0"><p className="truncate font-semibold">{row.name}</p><p className="text-[10px] text-[color:var(--text-muted)]">{money.format(row.amount)}</p></div>
                  <span className="shrink-0 font-semibold tabular-nums">{(row.share * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#eadfd3] dark:bg-white/10"><div className="h-full rounded-full bg-[linear-gradient(90deg,#c08a59,#5f8a7d)]" style={{ width: `${Math.max(row.share * 100, row.amount > 0 ? 1.5 : 0)}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden border-[color:var(--border-color)]">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 text-[#a66f3e]" /> Venta y gasto por sucursal</CardTitle><CardDescription>Compara venta, costo/venta y aportación de cada sucursal al gasto total.</CardDescription></CardHeader>
          <CardContent className="space-y-3 pt-2">
            {branchRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                <div className="min-w-0"><p className="truncate text-xs font-semibold">{row.name}</p><p className="truncate text-[10px] text-[color:var(--text-muted)]">{row.detail} · VENTA {money.format(row.sales)} · GASTO {money.format(row.amount)}</p></div>
                <div className="text-right"><p className="text-xs font-semibold tabular-nums">{row.costToSales === null ? "—" : `${(row.costToSales * 100).toFixed(1)}%`} GASTO/VENTA</p><p className="text-[10px] font-semibold text-[#98704b]">{(row.share * 100).toFixed(1)}% DEL GASTO TOTAL</p></div>
                <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-[#eadfd3] dark:bg-white/10"><div className="h-full rounded-full bg-[#6f9184]" style={{ width: `${Math.max(row.share * 100, row.amount > 0 ? 1.5 : 0)}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-[color:var(--border-color)]">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><UserRound className="h-5 w-5 text-[#a66f3e]" /> Nóminas incluidas</CardTitle><CardDescription>Incluye módulos nuevos, activos e inactivos sin reescribir periodos anteriores.</CardDescription></CardHeader>
          <CardContent className="max-h-[330px] overflow-y-auto p-0">
            <div className="divide-y divide-[color:var(--border-color)]">
              {moduleRows.map((row) => (
                <div key={`module-${row.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0"><p className="truncate text-xs font-semibold">{row.name}</p><p className="text-[10px] text-[color:var(--text-muted)]">{row.detail}</p></div>
                  <div className="flex shrink-0 items-center gap-3"><Badge variant="outline" className={row.status === "ACTIVE" ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : row.status === "NEW" ? "border-sky-300 text-sky-700 dark:text-sky-300" : "border-stone-300 text-stone-600 dark:text-stone-300"}>{row.status === "ACTIVE" ? "ACTIVA" : row.status === "NEW" ? "NUEVA" : row.status === "INACTIVE" ? "INACTIVA" : "NO VIGENTE"}</Badge><span className="w-24 text-right text-xs font-semibold tabular-nums">{money.format(row.amount)}</span></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="pb-3"><CardTitle className="text-lg">Detalle mensual conciliado</CardTitle><CardDescription>Los renglones y porcentajes cambian con la fecha, sucursal y empleado seleccionados.</CardDescription></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader className="bg-[#29231f] text-white"><TableRow className="hover:bg-transparent"><TableHead className="text-white/80">PERIODO</TableHead><TableHead className="text-right text-white/80">VENTAS</TableHead><TableHead className="text-right text-white/80">NETO</TableHead><TableHead className="text-right text-white/80">IMP. TRAB.</TableHead><TableHead className="text-right text-white/80">SOCIAL</TableHead><TableHead className="text-right text-white/80">ISR</TableHead><TableHead className="text-right text-white/80">GASTO GENERAL</TableHead><TableHead className="text-right text-white/80">GASTO / VENTA</TableHead><TableHead className="text-right text-white/80">% DEL TOTAL</TableHead></TableRow></TableHeader>
              <TableBody>
                {analysis.rows.map((row) => (
                  <TableRow key={row.id}><TableCell><p className="text-xs font-semibold">{row.label}</p><p className="text-[10px] text-[color:var(--text-muted)]">{row.start} — {row.end}</p></TableCell><TableCell className="text-right text-xs tabular-nums">{preciseMoney.format(row.sales)}</TableCell><TableCell className="text-right text-xs tabular-nums">{preciseMoney.format(row.payroll)}</TableCell><TableCell className="text-right text-xs tabular-nums">{preciseMoney.format(row.workerTax)}</TableCell><TableCell className="text-right text-xs tabular-nums">{preciseMoney.format(row.social)}</TableCell><TableCell className="text-right text-xs tabular-nums">{preciseMoney.format(row.isr)}</TableCell><TableCell className="text-right text-xs font-semibold tabular-nums">{preciseMoney.format(row.totalCost)}</TableCell><TableCell className="text-right text-xs font-semibold tabular-nums">{row.costToSales === null ? "—" : `${(row.costToSales * 100).toFixed(1)}%`}</TableCell><TableCell className="text-right text-xs font-semibold tabular-nums text-[#98704b]">{(row.share * 100).toFixed(1)}%</TableCell></TableRow>
                ))}
              </TableBody>
              <TableFooter><TableRow><TableCell>TOTAL</TableCell><TableCell className="text-right">{preciseMoney.format(totals.sales)}</TableCell><TableCell className="text-right">{preciseMoney.format(totals.payroll)}</TableCell><TableCell className="text-right">{preciseMoney.format(totals.workerTax)}</TableCell><TableCell className="text-right">{preciseMoney.format(totals.social)}</TableCell><TableCell className="text-right">{preciseMoney.format(totals.isr)}</TableCell><TableCell className="text-right">{preciseMoney.format(totals.totalCost)}</TableCell><TableCell className="text-right">{costToSales === null ? "—" : `${(costToSales * 100).toFixed(1)}%`}</TableCell><TableCell className="text-right">100.0%</TableCell></TableRow></TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
