'use client'

import { ColumnDef, DataTable } from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { branchBreakdown, type BranchBreakdown } from '@/lib/mock-data'
import { formatCurrency, formatPercent, sumBy } from '@/lib/format'

export default function DesgloseSucursalPage() {
  const totalCost = sumBy(branchBreakdown, (branch) => branch.totalCost)
  const columns: ColumnDef<BranchBreakdown>[] = [
    { accessorKey: 'branch', header: 'Sucursal', cell: ({ row }) => <span className="font-semibold">{row.original.branch}</span> },
    { accessorKey: 'sales', header: 'Ventas', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.sales)}</div> },
    { accessorKey: 'commissions', header: 'Comisiones', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.commissions)}</div> },
    { accessorKey: 'bonus', header: 'Bonos', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.bonus)}</div> },
    { accessorKey: 'adjustments', header: 'Ajustes', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.adjustments)}</div> },
    { accessorKey: 'totalCost', header: 'Costo nomina', cell: ({ row }) => <div className="number-display text-right font-black">{formatCurrency(row.original.totalCost)}</div> },
    { accessorKey: 'payrollWeight', header: 'Peso', cell: ({ row }) => <div className="text-right">{formatPercent(row.original.payrollWeight)}</div> },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass rounded-[2.4rem] p-6 md:p-8">
        <p className="label-caps">REPORTE POR SUCURSAL</p>
        <h1 className="page-title mt-4">Costo de nomina por punto de venta.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
          Traduce el payroll breakdown del Excel a un reporte claro para direccion y administracion.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Costo total" value={formatCurrency(totalCost)} detail="Suma de sucursales" tone="gold" />
        <MetricCard label="Mayor peso" value="OPATRA" detail="51% del costo mock" tone="rose" />
        <MetricCard label="Sucursales" value={`${branchBreakdown.length}`} detail="Con costo asignado" tone="blue" />
      </div>

      <SectionCard eyebrow="Breakdown" title="COSTO POR PUNTO DE VENTA" description="En integracion real se exportara PDF/Excel desde el dataset agregado.">
        <DataTable columns={columns} data={branchBreakdown} searchPlaceholder="Buscar sucursal" emptyMessage="Sin desglose" pageSize={10} />
      </SectionCard>

      <SectionCard eyebrow="Visual" title="DISTRIBUCION DE COSTO">
        <div className="space-y-4">
          {branchBreakdown.map((branch) => (
            <div key={branch.branch} className="grid gap-2 md:grid-cols-[12rem_1fr_7rem] md:items-center">
              <p className="text-sm font-semibold">{branch.branch}</p>
              <div className="h-4 overflow-hidden rounded-full bg-[#080706]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#d7b488] via-[#c5a785] to-[#9c846a]" style={{ width: `${branch.payrollWeight * 100}%` }} />
              </div>
              <p className="number-display text-right font-black">{formatCurrency(branch.totalCost)}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
