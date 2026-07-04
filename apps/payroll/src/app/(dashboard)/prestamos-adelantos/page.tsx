'use client'

import { Button, ColumnDef, DataTable, toast } from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { StatusBadge } from '@/components/payroll/status-badge'
import { loans, type LoanAdvance } from '@/lib/mock-data'
import { formatCurrency, formatDate, sumBy } from '@/lib/format'

export default function PrestamosAdelantosPage() {
  const columns: ColumnDef<LoanAdvance>[] = [
    { accessorKey: 'requestedAt', header: 'Solicitud', cell: ({ row }) => formatDate(row.original.requestedAt) },
    {
      accessorKey: 'employeeName',
      header: 'Empleado',
      cell: ({ row }) => <span className="font-semibold text-[color:var(--text-strong)]">{row.original.employeeName}</span>,
    },
    { accessorKey: 'nature', header: 'Naturaleza' },
    { accessorKey: 'requestedAmount', header: 'Monto solicitado', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.requestedAmount)}</div> },
    { accessorKey: 'payments', header: 'Pagos', cell: ({ row }) => <div className="text-right">{row.original.payments}</div> },
    { accessorKey: 'paymentAmount', header: 'Monto a descontar', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.paymentAmount)}</div> },
    { accessorKey: 'paidAmount', header: 'Pagado', cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.paidAmount)}</div> },
    { accessorKey: 'balance', header: 'Saldo', cell: ({ row }) => <div className="number-display text-right font-black">{formatCurrency(row.original.balance)}</div> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass rounded-xl p-6 md:p-8">
        <p className="label-caps">PRESTAMOS Y ADELANTOS</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">Amortizacion sin perder historico.</h1>
          </div>
          <Button className="payroll-button-primary cursor-pointer rounded-full" onClick={() => toast.info('Solicitud mock abierta.')}>
            Nueva solicitud
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Prestado" value={formatCurrency(sumBy(loans, (loan) => loan.requestedAmount))} tone="gold" />
        <MetricCard label="Cobrado" value={formatCurrency(sumBy(loans, (loan) => loan.paidAmount))} tone="sage" />
        <MetricCard label="Saldo" value={formatCurrency(sumBy(loans, (loan) => loan.balance))} tone="rose" />
      </div>

      <SectionCard eyebrow="Control" title="AMORTIZACION">
        <DataTable columns={columns} data={loans} searchPlaceholder="Buscar empleado o naturaleza" emptyMessage="Sin prestamos" pageSize={10} />
      </SectionCard>
    </div>
  )
}
