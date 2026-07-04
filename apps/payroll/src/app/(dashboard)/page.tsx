'use client'

import { useState } from 'react'
import {
  Button,
  ColumnDef,
  DataTable,
  DateRangePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { StatusBadge } from '@/components/payroll/status-badge'
import { currentRun, payrollTotals, type PayrollRunLine } from '@/lib/mock-data'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'

export default function DashboardPage() {
  const [mode, setMode] = useState(currentRun.mode)
  const [range, setRange] = useState({ from: currentRun.from, to: currentRun.to })

  const columns: ColumnDef<PayrollRunLine>[] = [
    {
      accessorKey: 'employeeName',
      header: 'Empleado',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-[color:var(--text-strong)]">{row.original.employeeName}</p>
          <p className="text-[0.86rem] text-[color:var(--text-muted)]">{row.original.position} / {row.original.branch}</p>
        </div>
      ),
    },
    {
      accessorKey: 'salesWithVat',
      header: 'Ventas con IVA',
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.salesWithVat)}</div>,
    },
    {
      accessorKey: 'scheme',
      header: 'Esquema',
      cell: ({ row }) => <span className="text-[0.86rem] font-semibold uppercase tracking-[0.08em]">{row.original.scheme}</span>,
    },
    {
      accessorKey: 'individualRate',
      header: 'Porcentaje',
      cell: ({ row }) => <div className="text-right tabular-nums">{formatPercent(row.original.individualRate)}</div>,
    },
    {
      accessorKey: 'commission',
      header: 'Comision',
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.commission)}</div>,
    },
    {
      accessorKey: 'bonus',
      header: 'Bono',
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.bonus)}</div>,
    },
    {
      accessorKey: 'loanPayment',
      header: 'Pago prestamo',
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.loanPayment)}</div>,
    },
    {
      accessorKey: 'totalPayment',
      header: 'Total pago',
      cell: ({ row }) => <div className="number-display text-right text-base font-black">{formatCurrency(row.original.totalPayment)}</div>,
    },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass relative overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="absolute right-[-7rem] top-[-9rem] h-72 w-72 rounded-full bg-[#d7b488]/18 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[35%] h-56 w-56 rounded-full bg-[#9c846a]/14 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-end">
          <div>
            <p className="label-caps">CORRIDA DE NOMINA</p>
            <h1 className="page-title mt-4 max-w-4xl">Nomina clara antes de aprobar el pago.</h1>
          </div>
          <div className="payroll-login-card rounded-[2rem] p-5 text-[color:var(--text-primary)]">
              <p className="label-caps">Periodo activo</p>
              <p className="mt-3 text-[1.35rem] font-black text-[color:var(--text-strong)]">{formatDate(currentRun.from)} - {formatDate(currentRun.to)}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <StatusBadge status={currentRun.status} />
              </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ventas con IVA" value={formatCurrency(payrollTotals.salesWithVat)} tone="gold" />
        <MetricCard label="Comisiones" value={formatCurrency(payrollTotals.commissions)} tone="sage" />
        <MetricCard label="Bonos y ajustes" value={formatCurrency(payrollTotals.bonuses)} tone="rose" />
        <MetricCard label="Total a pagar" value={formatCurrency(payrollTotals.totalPayment)} tone="blue" />
      </div>

      <SectionCard
        eyebrow="Calculo"
        title="SIMULADOR DE CORRIDA"
        action={(
          <Button
            className="payroll-button-primary cursor-pointer rounded-full px-5"
            onClick={() => toast.success('Corrida mock recalculada. En backend se guardaria snapshot.')}
          >
            Recalcular demo
          </Button>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <DateRangePicker value={range} onChange={setRange} fromLabel="Desde" toLabel="Hasta" />
          <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
          <SelectTrigger className="h-10 rounded-md border border-[color:var(--border-color)] bg-[#080706] text-[color:var(--text-primary)]">
            <SelectValue />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="WITH_VAT">Calcular con IVA</SelectItem>
              <SelectItem value="WITHOUT_VAT">Calcular sin IVA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Resumen"
        title="DETALLE POR EMPLEADO"
      >
        <DataTable
          columns={columns}
          data={currentRun.lines}
          searchPlaceholder="Buscar empleado, sucursal o esquema"
          emptyMessage="Sin empleados en esta corrida"
          pageSize={10}
        />
      </SectionCard>
    </div>
  )
}
