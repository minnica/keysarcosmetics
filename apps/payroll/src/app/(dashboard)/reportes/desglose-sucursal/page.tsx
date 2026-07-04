'use client'

import { ColumnDef, DataTable } from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { branchBreakdown, type BranchBreakdown } from '@/lib/mock-data'
import { formatCurrency, formatPercent, sumBy } from '@/lib/format'

export default function DesgloseSucursalPage() {
  const totalCost = sumBy(branchBreakdown, (branch) => branch.totalCost)
  const columns: ColumnDef<BranchBreakdown>[] = [
    { accessorKey: 'branch', header: 'Sucursal', cell: ({ row }) => <span className="font-semibold text-[color:var(--text-strong)]">{row.original.branch}</span> },
    { accessorKey: 'sales', header: 'Ventas', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.sales)}</div> },
    { accessorKey: 'commissions', header: 'Comisiones', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.commissions)}</div> },
    { accessorKey: 'bonus', header: 'Bonos', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.bonus)}</div> },
    { accessorKey: 'adjustments', header: 'Ajustes', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.adjustments)}</div> },
    { accessorKey: 'totalCost', header: 'Costo nomina', cell: ({ row }) => <div className="number-display text-right font-black">{formatCurrency(row.original.totalCost)}</div> },
    { accessorKey: 'payrollWeight', header: 'Peso', cell: ({ row }) => <div className="text-right">{formatPercent(row.original.payrollWeight)}</div> },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass rounded-xl p-6 md:p-8">
        <p className="label-caps">REPORTE POR SUCURSAL</p>
        <h1 className="page-title mt-4">Costo de nomina por punto de venta.</h1>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Costo total" value={formatCurrency(totalCost)} tone="gold" />
        <MetricCard label="Mayor peso" value="OPATRA" tone="rose" />
        <MetricCard label="Sucursales" value={`${branchBreakdown.length}`} tone="blue" />
      </div>

      <SectionCard eyebrow="Breakdown" title="COSTO POR PUNTO DE VENTA">
        <DataTable columns={columns} data={branchBreakdown} searchPlaceholder="Buscar sucursal" emptyMessage="Sin desglose" pageSize={10} />
      </SectionCard>

      <SectionCard eyebrow="Visual" title="DISTRIBUCION DE COSTO">
        <div className="space-y-4">
          {branchBreakdown.map((branch) => (
            <div key={branch.branch} className="grid gap-2 md:grid-cols-[12rem_1fr_7rem] md:items-center">
              <p className="text-[0.98rem] font-semibold text-[color:var(--text-strong)]">{branch.branch}</p>
              <div className="h-4 overflow-hidden rounded-full bg-[#080706]">
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
