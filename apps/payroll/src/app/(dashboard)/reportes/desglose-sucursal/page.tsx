"use client";

import { ColumnDef, DataTable } from "@cosmetics/ui";
import {
  Cell,
  Pie,
  PieChart,
  type PieLabelRenderProps,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { MetricCard } from "@/components/payroll/metric-card";
import { ReportExportButtons } from "@/components/payroll/report-export-buttons";
import { SectionCard } from "@/components/payroll/section-card";
import { usePayrollData } from "@/components/payroll/payroll-data-context";
import { formatCurrency, formatDate, formatPercent, sumBy } from "@/lib/format";
import type { BranchBreakdownLine } from "@/lib/types";

interface EmployeeBreakdownRow {
  employeeId: string;
  employeeName: string;
  salesByBranch: Record<string, number>;
  salesWithVat: number;
  salesWithoutVat: number;
  commission: number;
  bonus: number;
  fine: number;
  salaryPayment: number;
  adjustmentPositive: number;
  adjustmentNegative: number;
  perDiem: number;
  supplies: number;
  loanPayment: number;
  deductions: number;
  totalCost: number;
}

const COST_COLORS = [
  "#648672",
  "#c3a583",
  "#6fc9db",
  "#b97878",
  "#8b7aa8",
  "#d39a62",
  "#8bb09b",
  "#a88662",
];

const RADIAN = Math.PI / 180;

function renderPercentageLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent = 0,
}: PieLabelRenderProps) {
  const radius =
    Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.58;
  const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
  const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      stroke="rgba(0, 0, 0, 0.38)"
      strokeWidth={2.5}
      paintOrder="stroke"
      textAnchor="middle"
      dominantBaseline="central"
      className="select-none font-sans text-xs font-bold sm:text-sm"
    >
      {formatPercent(percent)}
    </text>
  );
}

export default function DesgloseSucursalPage() {
  const data = usePayrollData();
  const branches = data.branchBreakdown.branches;
  const employeeLines = data.branchBreakdown.employeeLines;
  const run = data.selectedRun;
  const totalCost = sumBy(branches, (branch) => branch.payrollCost);
  const totalSales = sumBy(branches, (branch) => branch.salesWithVat);
  const totalEmployees = new Set(employeeLines.map((line) => line.employeeId))
    .size;
  const branchNames = Array.from(
    new Set([
      ...branches.map((branch) => branch.branchName),
      ...employeeLines.map((line) => line.branchName),
    ]),
  ).sort((left, right) => left.localeCompare(right, "es"));
  const employeeRows = Array.from(
    employeeLines.reduce((rowsByEmployee, line) => {
      const current = rowsByEmployee.get(line.employeeId) ?? {
        employeeId: line.employeeId,
        employeeName: line.employeeName,
        salesByBranch: {},
        salesWithVat: 0,
        salesWithoutVat: 0,
        commission: 0,
        bonus: 0,
        fine: 0,
        salaryPayment: 0,
        adjustmentPositive: 0,
        adjustmentNegative: 0,
        perDiem: 0,
        supplies: 0,
        loanPayment: 0,
        deductions: 0,
        totalCost: 0,
      } satisfies EmployeeBreakdownRow;

      current.salesByBranch[line.branchName] =
        (current.salesByBranch[line.branchName] ?? 0) + line.salesWithVat;
      current.salesWithoutVat += line.salesWithoutVat;
      current.commission += line.commission;
      current.bonus += line.bonus;
      current.fine += line.fine;
      current.salaryPayment += line.salaryPayment;
      current.adjustmentPositive += line.adjustmentPositive;
      current.adjustmentNegative += line.adjustmentNegative;
      current.perDiem += line.perDiem;
      current.supplies += line.supplies;
      current.loanPayment += line.loanPayment;
      current.deductions +=
        line.fine + line.adjustmentNegative + line.loanPayment;
      current.totalCost += line.totalCost;
      rowsByEmployee.set(line.employeeId, current);
      return rowsByEmployee;
    }, new Map<string, EmployeeBreakdownRow>()),
  )
    .map(([, row]) => ({
      ...row,
      salesWithVat: Object.values(row.salesByBranch).reduce(
        (total, sales) => total + sales,
        0,
      ),
    }))
    .sort((left, right) =>
      left.employeeName.localeCompare(right.employeeName, "es"),
    );
  const costDistribution = branches
    .filter((branch) => branch.payrollCost > 0)
    .sort((left, right) => right.payrollCost - left.payrollCost)
    .map((branch, index) => ({
      name: branch.branchName,
      value: branch.payrollCost,
      color: COST_COLORS[index % COST_COLORS.length],
    }));

  const branchColumns: ColumnDef<BranchBreakdownLine>[] = [
    {
      accessorKey: "branchName",
      header: "SUCURSAL",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.branchName}</span>
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
      accessorKey: "employeeCount",
      header: "EMPLEADOS",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {row.original.employeeCount}
        </div>
      ),
    },
    {
      accessorKey: "payrollCost",
      header: "COSTO NÓMINA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="number-display text-right">
          {formatCurrency(row.original.payrollCost)}
        </div>
      ),
    },
    {
      id: "weight",
      header: "PESO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatPercent(totalCost ? row.original.payrollCost / totalCost : 0)}
        </div>
      ),
    },
  ];

  const employeeColumns: ColumnDef<EmployeeBreakdownRow>[] = [
    {
      accessorKey: "employeeName",
      header: "EMPLEADO",
      cell: ({ row }) => (
        <p className="font-medium">{row.original.employeeName}</p>
      ),
    },
    ...branchNames.map(
      (branchName, index): ColumnDef<EmployeeBreakdownRow> => ({
        id: `branch-${index}`,
        accessorFn: (row) => row.salesByBranch[branchName] ?? 0,
        header: branchName,
        meta: { align: "right" },
        cell: ({ getValue }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(Number(getValue()))}
          </div>
        ),
      }),
    ),
    {
      accessorKey: "salesWithVat",
      header: "TOTAL VENTAS",
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
      accessorKey: "salaryPayment",
      header: "SUELDO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.salaryPayment)}
        </div>
      ),
    },
    {
      accessorKey: "bonus",
      header: "BONOS",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.bonus)}
        </div>
      ),
    },
    {
      id: "deductions",
      header: "DEDUCCIONES",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.deductions)}
        </div>
      ),
    },
    {
      accessorKey: "totalCost",
      header: "TOTAL COSTO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="number-display text-right">
          {formatCurrency(row.original.totalCost)}
        </div>
      ),
    },
  ];

  const exportConfig = {
    title: "Desglose de nómina por sucursal",
    subtitle: run
      ? `${formatDate(run.from)} - ${formatDate(run.to)} · ${run.mode === "WITH_VAT" ? "Con IVA" : "Sin IVA"}`
      : "Sin corrida seleccionada",
    filename: `desglose-nomina-sucursal-${run?.from ?? "sin-corrida"}`,
    sheetName: "Desglose",
    orientation: "landscape" as const,
    rows: employeeRows,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: EmployeeBreakdownRow) => row.employeeName,
        width: 30,
      },
      ...branchNames.map((branchName) => ({
        header: branchName,
        accessor: (row: EmployeeBreakdownRow) =>
          row.salesByBranch[branchName] ?? 0,
        format: "currency" as const,
      })),
      {
        header: "VENTAS CON IVA",
        accessor: (row: EmployeeBreakdownRow) => row.salesWithVat,
        format: "currency" as const,
      },
      {
        header: "VENTAS SIN IVA",
        accessor: (row: EmployeeBreakdownRow) => row.salesWithoutVat,
        format: "currency" as const,
      },
      {
        header: "COMISIÓN",
        accessor: (row: EmployeeBreakdownRow) => row.commission,
        format: "currency" as const,
      },
      {
        header: "SUELDO",
        accessor: (row: EmployeeBreakdownRow) => row.salaryPayment,
        format: "currency" as const,
      },
      {
        header: "BONOS",
        accessor: (row: EmployeeBreakdownRow) => row.bonus,
        format: "currency" as const,
      },
      {
        header: "MULTAS",
        accessor: (row: EmployeeBreakdownRow) => row.fine,
        format: "currency" as const,
      },
      {
        header: "AJUSTES +",
        accessor: (row: EmployeeBreakdownRow) => row.adjustmentPositive,
        format: "currency" as const,
      },
      {
        header: "AJUSTES -",
        accessor: (row: EmployeeBreakdownRow) => row.adjustmentNegative,
        format: "currency" as const,
      },
      {
        header: "VIÁTICOS",
        accessor: (row: EmployeeBreakdownRow) => row.perDiem,
        format: "currency" as const,
      },
      {
        header: "PRÉSTAMOS",
        accessor: (row: EmployeeBreakdownRow) => row.loanPayment,
        format: "currency" as const,
      },
      {
        header: "TOTAL COSTO",
        accessor: (row: EmployeeBreakdownRow) => row.totalCost,
        format: "currency" as const,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Reporte por sucursal</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Distribución exacta de ventas y costo para la corrida seleccionada.
          </p>
        </div>
        <ReportExportButtons
          config={exportConfig}
          disabled={!employeeLines.length}
        />
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Costo total"
          value={formatCurrency(totalCost)}
          tone="gold"
        />
        <MetricCard
          label="Ventas asignadas"
          value={formatCurrency(totalSales)}
          tone="sage"
        />
        <MetricCard label="Empleados" value={`${totalEmployees}`} tone="blue" />
      </div>
      <SectionCard
        eyebrow="Ventas con IVA asignadas en cada sucursal"
        title="EMPLEADO Y PUNTO DE VENTA"
      >
        <DataTable
          columns={employeeColumns}
          data={employeeRows}
          searchPlaceholder="Buscar empleado"
          emptyMessage="Sin desglose para la corrida seleccionada."
          pageSize={10}
        />
      </SectionCard>
      <SectionCard eyebrow="Resumen" title="COSTO POR PUNTO DE VENTA">
        <DataTable
          columns={branchColumns}
          data={branches}
          searchPlaceholder="Buscar sucursal"
          emptyMessage="Sin costos asignados."
          pageSize={10}
        />
      </SectionCard>
      <SectionCard eyebrow="Distribución" title="PESO DEL COSTO">
        {costDistribution.length ? (
          <figure
            className="space-y-6"
            aria-label="Distribución porcentual del costo de nómina por sucursal"
          >
            <figcaption className="border-b border-[var(--border-color)] pb-5">
              <p className="sr-only">
                Cada segmento representa la participación de una sucursal en el
                costo total de nómina.
              </p>
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-x-4 gap-y-4">
                {costDistribution.map((item) => (
                  <li
                    key={item.name}
                    className="flex min-w-0 gap-2 py-0.5"
                  >
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p
                        className="truncate text-xs font-medium text-[var(--text-muted)]"
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="number-display text-sm">
                          {formatCurrency(item.value)}
                        </span>
                        <span className="text-xs tabular-nums text-[var(--text-muted)]">
                          {formatPercent(totalCost ? item.value / totalCost : 0)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </figcaption>
            <div className="mx-auto h-[22rem] w-full max-w-3xl sm:h-[30rem] lg:h-[34rem]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="88%"
                    paddingAngle={2}
                    stroke="var(--bg-card)"
                    strokeWidth={2}
                    labelLine={false}
                    label={renderPercentageLabel}
                  >
                    {costDistribution.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      String(name),
                    ]}
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.5rem",
                      color: "var(--text-primary)",
                      boxShadow: "var(--card-shadow)",
                    }}
                    itemStyle={{ color: "var(--text-primary)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </figure>
        ) : (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">
            Sin costos asignados para mostrar la distribución.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
