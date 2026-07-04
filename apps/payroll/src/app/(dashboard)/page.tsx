'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
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
          <p className="font-semibold text-[color:var(--payroll-ink)]">{row.original.employeeName}</p>
          <p className="text-xs text-[color:var(--text-muted)]">{row.original.position} / {row.original.branch}</p>
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
      cell: ({ row }) => <span className="text-xs font-semibold uppercase tracking-[0.08em]">{row.original.scheme}</span>,
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
      <section className="payroll-glass relative overflow-hidden rounded-[2.4rem] p-6 md:p-8">
        <div className="absolute right-[-7rem] top-[-9rem] h-72 w-72 rounded-full bg-[#d8a99b]/30 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[35%] h-56 w-56 rounded-full bg-[#6f8f78]/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-end">
          <div>
            <p className="label-caps">CORRIDA DE NOMINA</p>
            <h1 className="page-title mt-4 max-w-4xl">Nomina clara antes de aprobar el pago.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              Demo de la corrida quincenal con ventas, esquemas, bonos, prestamos y recibos. Los datos son mock y sirven para validar la funcionalidad con cliente.
            </p>
          </div>
          <Card className="rounded-[2rem] border border-[#d2b48c]/25 bg-[#342b25] text-[#fffaf3]">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#d2b48c]">Periodo activo</p>
              <p className="mt-3 text-2xl font-black">{formatDate(currentRun.from)} - {formatDate(currentRun.to)}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <StatusBadge status={currentRun.status} />
                <span className="text-sm text-[#ead9c4]">Pago: {formatDate(currentRun.payDate)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ventas con IVA" value={formatCurrency(payrollTotals.salesWithVat)} detail="Suma desde sobres de venta" tone="gold" />
        <MetricCard label="Comisiones" value={formatCurrency(payrollTotals.commissions)} detail="Calculadas por esquema" tone="sage" />
        <MetricCard label="Bonos y ajustes" value={formatCurrency(payrollTotals.bonuses)} detail="Movimientos aprobados" tone="rose" />
        <MetricCard label="Total a pagar" value={formatCurrency(payrollTotals.totalPayment)} detail="Antes de aprobacion final" tone="blue" />
      </div>

      <SectionCard
        eyebrow="Calculo"
        title="SIMULADOR DE CORRIDA"
        description="El usuario puede cambiar periodo y modo de calculo para validar la experiencia. En integracion real esto recalculara desde backend y guardara snapshot."
        action={(
          <Button
            className="cursor-pointer rounded-full bg-[#342b25] px-5 text-[#fffaf3] hover:bg-[#4b3d35]"
            onClick={() => toast.success('Corrida mock recalculada. En backend se guardaria snapshot.')}
          >
            Recalcular demo
          </Button>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <DateRangePicker value={range} onChange={setRange} fromLabel="Desde" toLabel="Hasta" />
          <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
            <SelectTrigger className="h-9 rounded-full bg-[#fffaf3]/80">
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
        description="Tabla equivalente a SUMARY, pero convertida en flujo auditado de nomina."
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
