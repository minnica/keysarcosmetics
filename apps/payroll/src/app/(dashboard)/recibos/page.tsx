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
      cell: ({ row }) => <span className="font-semibold">{row.original.employeeName}</span>,
    },
    { accessorKey: 'period', header: 'Periodo' },
    {
      accessorKey: 'totalPayment',
      header: 'Total pago',
      cell: ({ row }) => <div className="number-display text-right font-black">{formatCurrency(row.original.totalPayment)}</div>,
    },
    { accessorKey: 'sentTo', header: 'Envio', cell: ({ row }) => <span className="font-mono text-xs">{row.original.sentTo}</span> },
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
          className="h-8 cursor-pointer rounded-full"
          onClick={() => toast.success(`Recibo mock preparado para ${row.original.employeeName}`)}
        >
          Ver recibo
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass rounded-[2.4rem] p-6 md:p-8">
        <p className="label-caps">RECIBOS</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">Confirmacion lista para WhatsApp.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              Pantalla mock para generar, enviar y confirmar recibos derivados de la corrida.
            </p>
          </div>
          <Button className="cursor-pointer rounded-full bg-[#342b25] text-[#fffaf3] hover:bg-[#4b3d35]" onClick={() => toast.info('Envio masivo mock preparado.')}>
            Enviar seleccion
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Generados" value={`${receipts.length}`} detail="Recibos de la corrida" tone="gold" />
        <MetricCard label="Confirmados" value={`${receipts.filter((receipt) => receipt.status === 'CONFIRMED').length}`} detail="Respuesta recibida" tone="sage" />
        <MetricCard label="Total emitido" value={formatCurrency(sumBy(receipts, (receipt) => receipt.totalPayment))} detail="Monto en recibos" tone="blue" />
      </div>

      <SectionCard eyebrow="Listado" title="RECIBOS POR EMPLEADO" description="Los campos editables de recibo se reservaran para administracion en la version conectada.">
        <DataTable columns={columns} data={receipts} searchPlaceholder="Buscar recibo o empleado" emptyMessage="Sin recibos" pageSize={10} />
      </SectionCard>
    </div>
  )
}
