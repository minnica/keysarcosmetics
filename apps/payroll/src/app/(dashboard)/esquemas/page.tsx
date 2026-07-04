'use client'

import { ColumnDef, DataTable, Button, toast } from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { schemes, type CommissionScheme } from '@/lib/mock-data'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'

export default function EsquemasPage() {
  const columns: ColumnDef<CommissionScheme>[] = [
    {
      accessorKey: 'name',
      header: 'Esquema',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-[color:var(--text-strong)]">{row.original.name}</p>
          <p className="text-[0.92rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{row.original.role}</p>
        </div>
      ),
    },
    {
      accessorKey: 'flatRate',
      header: 'Flat %',
      cell: ({ row }) => <div className="text-right tabular-nums">{formatPercent(row.original.flatRate)}</div>,
    },
    {
      accessorKey: 'bonusRule',
      header: 'Regla bonos',
    },
    {
      accessorKey: 'activeEmployees',
      header: 'Empleados',
      cell: ({ row }) => <div className="text-right tabular-nums">{row.original.activeEmployees}</div>,
    },
    {
      accessorKey: 'effectiveFrom',
      header: 'Vigente desde',
      cell: ({ row }) => formatDate(row.original.effectiveFrom),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass rounded-xl p-6 md:p-8">
        <p className="label-caps">ESQUEMAS DE COMISION</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">Rangos con historial intacto.</h1>
          </div>
          <Button className="payroll-button-primary cursor-pointer rounded-full" onClick={() => toast.info('En demo no se crean esquemas reales.')}>
            Nuevo esquema
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Esquemas activos" value={`${schemes.length}`} tone="gold" />
        <MetricCard label="Asignaciones" value={`${schemes.reduce((total, scheme) => total + scheme.activeEmployees, 0)}`} tone="sage" />
        <MetricCard label="Rango maximo" value={formatPercent(0.35)} tone="blue" />
      </div>

      <SectionCard eyebrow="Catalogo" title="ESQUEMAS VIGENTES">
        <DataTable columns={columns} data={schemes} searchPlaceholder="Buscar esquema o puesto" emptyMessage="Sin esquemas" pageSize={10} />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {schemes.map((scheme) => (
          <SectionCard key={scheme.id} eyebrow={scheme.role} title={scheme.name}>
            <div className="space-y-3">
              {scheme.tiers.map((tier, index) => (
                <div key={`${scheme.id}-${index}`} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-[#2c241c] bg-[#080706] p-3">
                  <div>
                    <p className="text-[0.88rem] font-semibold text-[color:var(--text-strong)]">{formatCurrency(tier.from)} a {formatCurrency(tier.to)}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#080706]">
                      <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${Math.min(100, tier.rate * 260)}%` }} />
                    </div>
                  </div>
                  <p className="number-display text-xl font-black text-[color:var(--text-strong)]">{formatPercent(tier.rate)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  )
}
