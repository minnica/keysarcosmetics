'use client'

import { ColumnDef, DataTable } from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { branchBreakdown, payrollBreakdownLines, type BranchBreakdown, type PayrollBreakdownLine } from '@/lib/mock-data'
import { formatCurrency, formatPercent, sumBy } from '@/lib/format'

export default function DesgloseSucursalPage() {
  const totalCost = sumBy(branchBreakdown, (branch) => branch.totalCost)
  const totalBonus = sumBy(payrollBreakdownLines, (line) => line.bonus)
  const totalSales = sumBy(payrollBreakdownLines, (line) => line.totalSales)

  const branchColumns: ColumnDef<BranchBreakdown>[] = [
    { accessorKey: 'branch', header: 'Sucursal', cell: ({ row }) => <span className="font-semibold text-[color:var(--text-strong)]">{row.original.branch}</span> },
    { accessorKey: 'sales', header: 'Ventas', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.sales)}</div> },
    { accessorKey: 'commissions', header: 'Comisiones', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.commissions)}</div> },
    { accessorKey: 'bonus', header: 'Bonos', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.bonus)}</div> },
    { accessorKey: 'adjustments', header: 'Ajustes', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.adjustments)}</div> },
    { accessorKey: 'totalCost', header: 'Costo nomina', meta: { align: 'right' }, cell: ({ row }) => <div className="number-display text-right font-black">{formatCurrency(row.original.totalCost)}</div> },
    { accessorKey: 'payrollWeight', header: 'Peso', meta: { align: 'right' }, cell: ({ row }) => <div className="text-right tabular-nums">{formatPercent(row.original.payrollWeight)}</div> },
  ]

  const employeeColumns: ColumnDef<PayrollBreakdownLine>[] = [
    {
      accessorKey: 'employeeName',
      header: 'Empleado',
      cell: ({ row }) => <p className="font-semibold text-[color:var(--text-strong)]">{row.original.employeeName}</p>,
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
    { accessorKey: 'totalCost', header: 'Total costo', meta: { align: 'right' }, cell: ({ row }) => <div className="number-display text-right font-black">{formatCurrency(row.original.totalCost)}</div> },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass rounded-xl p-6 md:p-8">
        <p className="label-caps">REPORTE POR SUCURSAL</p>
        <h1 className="page-title mt-4">Costo de nomina por punto de venta.</h1>
      </section>

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
              <p className="text-[0.98rem] font-semibold text-[color:var(--text-strong)]">{branch.branch}</p>
              <div className="h-4 overflow-hidden rounded-full bg-[var(--accent-hover)]">
                <div className="h-full rounded-full bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--color-nude)] to-[color:var(--payroll-bronze)]" style={{ width: `${branch.payrollWeight * 100}%` }} />
              </div>
              <p className="number-display text-right font-black text-[color:var(--text-strong)]">{formatCurrency(branch.totalCost)}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
