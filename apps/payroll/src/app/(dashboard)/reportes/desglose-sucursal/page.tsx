"use client";

import { ColumnDef, DataTable, ProgressKeysar } from "@cosmetics/ui";
import { MetricCard } from "@/components/payroll/metric-card";
import { ReportExportButtons } from "@/components/payroll/report-export-buttons";
import { SectionCard } from "@/components/payroll/section-card";
import { usePayrollData } from "@/components/payroll/payroll-data-context";
import { formatCurrency, formatDate, formatPercent, sumBy } from "@/lib/format";
import type { BranchBreakdownLine, EmployeeBranchBreakdown } from "@/lib/types";

export default function DesgloseSucursalPage() {
  const data = usePayrollData();
  const branches = data.branchBreakdown.branches;
  const employeeLines = data.branchBreakdown.employeeLines;
  const run = data.selectedRun;
  const totalCost = sumBy(branches, (branch) => branch.payrollCost);
  const totalSales = sumBy(branches, (branch) => branch.salesWithVat);
  const totalEmployees = new Set(employeeLines.map((line) => line.employeeId))
    .size;

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

  const employeeColumns: ColumnDef<EmployeeBranchBreakdown>[] = [
    {
      accessorKey: "employeeName",
      header: "EMPLEADO",
      cell: ({ row }) => (
        <p className="font-medium">{row.original.employeeName}</p>
      ),
    },
    { accessorKey: "branchName", header: "SUCURSAL" },
    {
      accessorKey: "salesWithVat",
      header: "VENTAS",
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
          {formatCurrency(
            row.original.fine +
              row.original.adjustmentNegative +
              row.original.loanPayment,
          )}
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
    rows: employeeLines,
    columns: [
      {
        header: "EMPLEADO",
        accessor: (row: EmployeeBranchBreakdown) => row.employeeName,
        width: 30,
      },
      {
        header: "SUCURSAL",
        accessor: (row: EmployeeBranchBreakdown) => row.branchName,
        width: 24,
      },
      {
        header: "VENTAS CON IVA",
        accessor: (row: EmployeeBranchBreakdown) => row.salesWithVat,
        format: "currency" as const,
      },
      {
        header: "VENTAS SIN IVA",
        accessor: (row: EmployeeBranchBreakdown) => row.salesWithoutVat,
        format: "currency" as const,
      },
      {
        header: "COMISIÓN",
        accessor: (row: EmployeeBranchBreakdown) => row.commission,
        format: "currency" as const,
      },
      {
        header: "SUELDO",
        accessor: (row: EmployeeBranchBreakdown) => row.salaryPayment,
        format: "currency" as const,
      },
      {
        header: "BONOS",
        accessor: (row: EmployeeBranchBreakdown) => row.bonus,
        format: "currency" as const,
      },
      {
        header: "MULTAS",
        accessor: (row: EmployeeBranchBreakdown) => row.fine,
        format: "currency" as const,
      },
      {
        header: "AJUSTES +",
        accessor: (row: EmployeeBranchBreakdown) => row.adjustmentPositive,
        format: "currency" as const,
      },
      {
        header: "AJUSTES -",
        accessor: (row: EmployeeBranchBreakdown) => row.adjustmentNegative,
        format: "currency" as const,
      },
      {
        header: "VIÁTICOS",
        accessor: (row: EmployeeBranchBreakdown) => row.perDiem,
        format: "currency" as const,
      },
      {
        header: "PRÉSTAMOS",
        accessor: (row: EmployeeBranchBreakdown) => row.loanPayment,
        format: "currency" as const,
      },
      {
        header: "TOTAL COSTO",
        accessor: (row: EmployeeBranchBreakdown) => row.totalCost,
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
      <SectionCard eyebrow="Detalle" title="EMPLEADO Y PUNTO DE VENTA">
        <DataTable
          columns={employeeColumns}
          data={employeeLines}
          searchPlaceholder="Buscar empleado o sucursal"
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
        <div className="space-y-4">
          {branches.map((branch) => (
            <div
              key={branch.branchName}
              className="grid gap-2 md:grid-cols-[12rem_1fr_8rem] md:items-center"
            >
              <p className="font-medium">{branch.branchName}</p>
              <ProgressKeysar
                value={totalCost ? (branch.payrollCost / totalCost) * 100 : 0}
              />
              <p className="number-display text-right">
                {formatCurrency(branch.payrollCost)}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
