'use client'

import { Button, ColumnDef, DataTable, toast } from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { StatusBadge } from '@/components/payroll/status-badge'
import { receipts, type PayrollReceipt } from '@/lib/mock-data'
import { formatCurrency, formatDate, sumBy } from '@/lib/format'

export default function RecibosPage() {
  const columns: ColumnDef<PayrollReceipt>[] = [
    {
      accessorKey: 'employeeName',
      header: 'Empleado',
      cell: ({ row }) => <span className="font-semibold text-[color:var(--text-strong)]">{row.original.employeeName}</span>,
    },
    { accessorKey: 'period', header: 'Periodo' },
    {
      accessorKey: 'totalPayment',
      header: 'Total pago',
      cell: ({ row }) => <div className="number-display text-right font-black">{formatCurrency(row.original.totalPayment)}</div>,
    },
    { accessorKey: 'sentTo', header: 'Envio', cell: ({ row }) => <span className="font-mono text-[0.9rem]">{row.original.sentTo}</span> },
    {
      accessorKey: 'confirmedAt',
      header: 'Confirmado',
      cell: ({ row }) => row.original.confirmedAt ? formatDate(row.original.confirmedAt) : 'Pendiente',
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: 'actions',
      header: 'Acciones',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          className="payroll-button-secondary h-8 cursor-pointer rounded-full"
          onClick={() => toast.success(`Recibo mock preparado para ${row.original.employeeName}`)}
        >
          Ver recibo
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass rounded-xl p-6 md:p-8">
        <p className="label-caps">RECIBOS</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">Confirmacion lista para WhatsApp.</h1>
          </div>
          <Button className="payroll-button-primary cursor-pointer rounded-full" onClick={() => toast.info('Envio masivo mock preparado.')}>
            Enviar seleccion
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Generados" value={`${receipts.length}`} tone="gold" />
        <MetricCard label="Confirmados" value={`${receipts.filter((receipt) => receipt.status === 'CONFIRMED').length}`} tone="sage" />
        <MetricCard label="Total emitido" value={formatCurrency(sumBy(receipts, (receipt) => receipt.totalPayment))} tone="blue" />
      </div>

      <SectionCard eyebrow="Listado" title="RECIBOS POR EMPLEADO">
        <DataTable columns={columns} data={receipts} searchPlaceholder="Buscar recibo o empleado" emptyMessage="Sin recibos" pageSize={10} />
      </SectionCard>
    </div>
  )
}
