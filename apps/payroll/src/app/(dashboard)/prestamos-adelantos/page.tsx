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
      cell: ({ row }) => <span className="font-semibold">{row.original.employeeName}</span>,
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
      <section className="payroll-glass rounded-[2.4rem] p-6 md:p-8">
        <p className="label-caps">PRESTAMOS Y ADELANTOS</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">Amortizacion sin perder historico.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              Flujo mock para programar descuentos por periodo y conservar casos pagados, pendientes o perdidos.
            </p>
          </div>
          <Button className="cursor-pointer rounded-full bg-[#342b25] text-[#fffaf3] hover:bg-[#4b3d35]" onClick={() => toast.info('Solicitud mock abierta.')}>
            Nueva solicitud
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Prestado" value={formatCurrency(sumBy(loans, (loan) => loan.requestedAmount))} detail="Total historico mock" tone="gold" />
        <MetricCard label="Cobrado" value={formatCurrency(sumBy(loans, (loan) => loan.paidAmount))} detail="Pagos aplicados" tone="sage" />
        <MetricCard label="Saldo" value={formatCurrency(sumBy(loans, (loan) => loan.balance))} detail="Pendiente o perdido" tone="rose" />
      </div>

      <SectionCard eyebrow="Control" title="AMORTIZACION" description="Los pagos se conectaran a corridas futuras para descontarse automaticamente.">
        <DataTable columns={columns} data={loans} searchPlaceholder="Buscar empleado o naturaleza" emptyMessage="Sin prestamos" pageSize={10} />
      </SectionCard>
    </div>
  )
}
