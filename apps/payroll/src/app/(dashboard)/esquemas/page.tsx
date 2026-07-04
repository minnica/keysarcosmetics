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
          <p className="font-semibold">{row.original.name}</p>
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{row.original.role}</p>
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
      <section className="payroll-glass rounded-[2.4rem] p-6 md:p-8">
        <p className="label-caps">ESQUEMAS DE COMISION</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">Rangos con historial intacto.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              Mock de esquemas con vigencia para evitar que cambios futuros alteren corridas ya calculadas.
            </p>
          </div>
          <Button className="cursor-pointer rounded-full bg-[#d7b488] text-[#050404] hover:bg-[#e7c89a]" onClick={() => toast.info('En demo no se crean esquemas reales.')}>
            Nuevo esquema
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Esquemas activos" value={`${schemes.length}`} detail="Disponibles para empleados activos" tone="gold" />
        <MetricCard label="Asignaciones" value={`${schemes.reduce((total, scheme) => total + scheme.activeEmployees, 0)}`} detail="Empleados con regla vigente" tone="sage" />
        <MetricCard label="Rango maximo" value={formatPercent(0.35)} detail={`Hasta ${formatCurrency(999999)}`} tone="blue" />
      </div>

      <SectionCard eyebrow="Catalogo" title="ESQUEMAS VIGENTES" description="Cada cambio futuro debe cerrar vigencia anterior y crear una version nueva.">
        <DataTable columns={columns} data={schemes} searchPlaceholder="Buscar esquema o puesto" emptyMessage="Sin esquemas" pageSize={10} />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {schemes.map((scheme) => (
          <SectionCard key={scheme.id} eyebrow={scheme.role} title={scheme.name} description={scheme.bonusRule}>
            <div className="space-y-3">
              {scheme.tiers.map((tier, index) => (
                <div key={`${scheme.id}-${index}`} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-[#2c241c] bg-[#080706] p-3">
                  <div>
                    <p className="text-sm font-semibold">{formatCurrency(tier.from)} a {formatCurrency(tier.to)}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#080706]">
                      <div className="h-full rounded-full bg-[#d7b488]" style={{ width: `${Math.min(100, tier.rate * 260)}%` }} />
                    </div>
                  </div>
                  <p className="number-display text-xl font-black">{formatPercent(tier.rate)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  )
}
