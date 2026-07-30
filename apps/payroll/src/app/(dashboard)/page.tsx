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
import { formatCurrency, formatDate, formatPercent, sumBy } from '@/lib/format'

export default function DashboardPage() {
  const [mode, setMode] = useState(currentRun.mode)
  const [range, setRange] = useState({ from: currentRun.from, to: currentRun.to })
  const netAdjustments = sumBy(currentRun.lines, (line) => line.bonus + line.payrollAdjustmentPositive + line.perDiem - line.fine - line.payrollAdjustmentNegative)
  const deductions = sumBy(currentRun.lines, (line) => line.fine + line.loanPayment + line.payrollAdjustmentNegative)

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
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.salesWithVat)}</div>,
    },
    {
      accessorKey: 'salesWithoutVat',
      header: 'Ventas sin IVA',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.salesWithoutVat)}</div>,
    },
    {
      accessorKey: 'scheme',
      header: 'Esquema',
      cell: ({ row }) => <span className="text-[0.86rem] font-semibold uppercase tracking-[0.08em]">{row.original.scheme}</span>,
    },
    {
      accessorKey: 'individualRate',
      header: 'Porcentaje',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatPercent(row.original.individualRate)}</div>,
    },
    {
      accessorKey: 'commission',
      header: 'Comision',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.commission)}</div>,
    },
    {
      accessorKey: 'bonus',
      header: 'Bono',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.bonus)}</div>,
    },
    {
      accessorKey: 'fine',
      header: 'Multa',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.fine)}</div>,
    },
    {
      accessorKey: 'salaryBase',
      header: 'Sueldo base',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.salaryBase)}</div>,
    },
    {
      accessorKey: 'loanPayment',
      header: 'Pago prestamo',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.loanPayment)}</div>,
    },
    {
      accessorKey: 'payrollAdjustmentPositive',
      header: 'Ajuste nomina +',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.payrollAdjustmentPositive)}</div>,
    },
    {
      accessorKey: 'payrollAdjustmentNegative',
      header: 'Ajuste nomina -',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.payrollAdjustmentNegative)}</div>,
    },
    {
      accessorKey: 'perDiem',
      header: 'Viaticos',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.perDiem)}</div>,
    },
    {
      accessorKey: 'totalPayment',
      header: 'Total pago',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="number-display text-right text-base font-black">{formatCurrency(row.original.totalPayment)}</div>,
    },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass relative overflow-hidden rounded-brand p-5 md:p-6">
        <div className="relative grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-end">
          <div>
            <p className="label-caps">CORRIDA DE NOMINA</p>
            <h1 className="page-title mt-4 max-w-4xl">Nomina clara antes de aprobar el pago.</h1>
          </div>
          <div className="payroll-login-card rounded-brand p-5 text-[color:var(--text-primary)]">
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
        <MetricCard label="Ajustes netos" value={formatCurrency(netAdjustments)} tone="rose" />
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
          <SelectTrigger className="h-10 rounded-md border border-[color:var(--border-color)] bg-[var(--input-bg)] text-[color:var(--text-primary)]">
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
        title="DETALLE DE PAGO POR EMPLEADO"
      >
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
            <p className="label-caps">Ventas sin IVA</p>
            <p className="number-display mt-2 text-[1.05rem] font-black text-[color:var(--text-strong)]">{formatCurrency(payrollTotals.salesWithoutVat)}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
            <p className="label-caps">Deducciones</p>
            <p className="number-display mt-2 text-[1.05rem] font-black text-[color:var(--text-strong)]">{formatCurrency(deductions)}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
            <p className="label-caps">Pago prestamo</p>
            <p className="number-display mt-2 text-[1.05rem] font-black text-[color:var(--text-strong)]">{formatCurrency(payrollTotals.loanPayments)}</p>
          </div>
        </div>
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
