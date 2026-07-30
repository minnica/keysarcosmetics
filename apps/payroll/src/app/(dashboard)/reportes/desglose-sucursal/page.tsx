'use client'

import { ColumnDef, DataTable, ProgressKeysar } from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { ReportExportButtons } from '@/components/payroll/report-export-buttons'
import { SectionCard } from '@/components/payroll/section-card'
import { branchBreakdown, payrollBreakdownLines, type BranchBreakdown, type PayrollBreakdownLine } from '@/lib/mock-data'
import { formatCurrency, formatPercent, sumBy } from '@/lib/format'

export default function DesgloseSucursalPage() {
  const totalCost = sumBy(branchBreakdown, (branch) => branch.totalCost)
  const totalBonus = sumBy(payrollBreakdownLines, (line) => line.bonus)
  const totalSales = sumBy(payrollBreakdownLines, (line) => line.totalSales)

  const branchColumns: ColumnDef<BranchBreakdown>[] = [
    { accessorKey: 'branch', header: 'Sucursal', cell: ({ row }) => <span className="font-medium">{row.original.branch}</span> },
    { accessorKey: 'sales', header: 'Ventas', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.sales)}</div> },
    { accessorKey: 'commissions', header: 'Comisiones', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.commissions)}</div> },
    { accessorKey: 'bonus', header: 'Bonos', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.bonus)}</div> },
    { accessorKey: 'adjustments', header: 'Ajustes', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.adjustments)}</div> },
    { accessorKey: 'totalCost', header: 'Costo nomina', meta: { align: 'right' }, cell: ({ row }) => <div className="number-display text-right">{formatCurrency(row.original.totalCost)}</div> },
    { accessorKey: 'payrollWeight', header: 'Peso', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatPercent(row.original.payrollWeight)}</div> },
  ]

  const employeeColumns: ColumnDef<PayrollBreakdownLine>[] = [
    {
      accessorKey: 'employeeName',
      header: 'Empleado',
      cell: ({ row }) => <p className="font-medium">{row.original.employeeName}</p>,
    },
    { accessorKey: 'totalSales', header: 'Total ventas', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.totalSales)}</div> },
    { accessorKey: 'deltaSales', header: 'Delta', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.deltaSales)}</div> },
    { accessorKey: 'galeriasInsurgentesSales', header: 'Galerias insurgentes', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.galeriasInsurgentesSales)}</div> },
    { accessorKey: 'masarykSales', header: 'Masaryk', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.masarykSales)}</div> },
    { accessorKey: 'mitikahSales', header: 'Mitikah', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.mitikahSales)}</div> },
    { accessorKey: 'mitikahVipSales', header: 'Mitikah VIP', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.mitikahVipSales)}</div> },
    { accessorKey: 'opatraSales', header: 'Opatra', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.opatraSales)}</div> },
    { accessorKey: 'rate', header: '%', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatPercent(row.original.rate)}</div> },
    { accessorKey: 'commission', header: 'Comision', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.commission)}</div> },
    { accessorKey: 'bonus', header: 'Bono', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.bonus)}</div> },
    { accessorKey: 'fine', header: 'Multa', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.fine)}</div> },
    { accessorKey: 'loanPayment', header: 'Pago prestamo', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.loanPayment)}</div> },
    { accessorKey: 'payrollAdjustmentPositive', header: 'Ajuste +', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.payrollAdjustmentPositive)}</div> },
    { accessorKey: 'payrollAdjustmentNegative', header: 'Ajuste -', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.payrollAdjustmentNegative)}</div> },
    { accessorKey: 'perDiem', header: 'Viaticos', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.perDiem)}</div> },
    { accessorKey: 'totalCost', header: 'Total costo', meta: { align: 'right' }, cell: ({ row }) => <div className="number-display text-right">{formatCurrency(row.original.totalCost)}</div> },
  ]

  const exportConfig = {
    title: 'Desglose de nómina por sucursal',
    subtitle: 'Detalle mock por empleado y punto de venta',
    filename: 'desglose-nomina-sucursal',
    sheetName: 'Desglose',
    orientation: 'landscape' as const,
    rows: payrollBreakdownLines,
    columns: [
      { header: 'EMPLEADO', accessor: (row: PayrollBreakdownLine) => row.employeeName, width: 32 },
      { header: 'TOTAL VENTAS', accessor: (row: PayrollBreakdownLine) => row.totalSales, format: 'currency' as const },
      { header: 'DELTA', accessor: (row: PayrollBreakdownLine) => row.deltaSales, format: 'currency' as const },
      { header: 'GALERÍAS INSURGENTES', accessor: (row: PayrollBreakdownLine) => row.galeriasInsurgentesSales, format: 'currency' as const },
      { header: 'MASARYK', accessor: (row: PayrollBreakdownLine) => row.masarykSales, format: 'currency' as const },
      { header: 'MITIKAH', accessor: (row: PayrollBreakdownLine) => row.mitikahSales, format: 'currency' as const },
      { header: 'MITIKAH VIP', accessor: (row: PayrollBreakdownLine) => row.mitikahVipSales, format: 'currency' as const },
      { header: 'OPATRA', accessor: (row: PayrollBreakdownLine) => row.opatraSales, format: 'currency' as const },
      { header: 'PORCENTAJE', accessor: (row: PayrollBreakdownLine) => row.rate * 100, format: 'percent' as const },
      { header: 'COMISIÓN', accessor: (row: PayrollBreakdownLine) => row.commission, format: 'currency' as const },
      { header: 'BONO', accessor: (row: PayrollBreakdownLine) => row.bonus, format: 'currency' as const },
      { header: 'MULTA', accessor: (row: PayrollBreakdownLine) => row.fine, format: 'currency' as const },
      { header: 'PRÉSTAMO', accessor: (row: PayrollBreakdownLine) => row.loanPayment, format: 'currency' as const },
      { header: 'AJUSTE +', accessor: (row: PayrollBreakdownLine) => row.payrollAdjustmentPositive, format: 'currency' as const },
      { header: 'AJUSTE -', accessor: (row: PayrollBreakdownLine) => row.payrollAdjustmentNegative, format: 'currency' as const },
      { header: 'VIÁTICOS', accessor: (row: PayrollBreakdownLine) => row.perDiem, format: 'currency' as const },
      { header: 'TOTAL COSTO', accessor: (row: PayrollBreakdownLine) => row.totalCost, format: 'currency' as const },
    ],
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Reporte por sucursal</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Costo de nómina por punto de venta.</p>
        </div>
        <ReportExportButtons config={exportConfig} disabled={payrollBreakdownLines.length === 0} />
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Costo total" value={formatCurrency(totalCost)} tone="gold" />
        <MetricCard label="Ventas asignadas" value={formatCurrency(totalSales)} tone="sage" />
        <MetricCard label="Bonos asignados" value={formatCurrency(totalBonus)} tone="blue" />
      </div>

      <SectionCard eyebrow="Breakdown" title="DETALLE POR EMPLEADO Y PUNTO DE VENTA">
        <DataTable columns={employeeColumns} data={payrollBreakdownLines} searchPlaceholder="Buscar empleado" emptyMessage="Sin desglose" pageSize={10} />
      </SectionCard>

      <SectionCard eyebrow="Resumen" title="COSTO POR PUNTO DE VENTA">
        <DataTable columns={branchColumns} data={branchBreakdown} searchPlaceholder="Buscar sucursal" emptyMessage="Sin desglose" pageSize={10} />
      </SectionCard>

      <SectionCard eyebrow="Visual" title="DISTRIBUCION DE COSTO">
        <div className="space-y-4">
          {branchBreakdown.map((branch) => (
            <div key={branch.branch} className="grid gap-2 md:grid-cols-[12rem_1fr_7rem] md:items-center">
              <p className="font-medium">{branch.branch}</p>
              <ProgressKeysar value={branch.payrollWeight * 100} />
              <p className="number-display text-right">{formatCurrency(branch.totalCost)}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
