'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  ColumnDef,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { StatusBadge } from '@/components/payroll/status-badge'
import { movements, type MovementKind, type PayrollMovement } from '@/lib/mock-data'
import { formatCurrency, formatDate, sumBy } from '@/lib/format'

const KIND_LABEL: Record<MovementKind, string> = {
  BONUS: 'Bono',
  ADJUSTMENT_POSITIVE: 'Ajuste +',
  ADJUSTMENT_NEGATIVE: 'Ajuste -',
  FINE: 'Multa',
  PER_DIEM: 'Viaticos',
  SUPPLIES: 'Insumos',
}

export default function MovimientosPage() {
  const [shareCount, setShareCount] = useState('1')
  const [movementKind, setMovementKind] = useState<MovementKind>('BONUS')

  const approvedTotal = sumBy(movements.filter((movement) => movement.status === 'APPROVED'), (movement) => movement.amount)
  const pendingTotal = sumBy(movements.filter((movement) => movement.status === 'PENDING'), (movement) => Math.abs(movement.amount))
  const attachments = movements.filter((movement) => movement.attachmentRequired).length

  const columns: ColumnDef<PayrollMovement>[] = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: 'employeeName',
      header: 'Empleado',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold">{row.original.employeeName}</p>
          <p className="text-xs text-[color:var(--text-muted)]">{row.original.branch}</p>
        </div>
      ),
    },
    {
      accessorKey: 'kind',
      header: 'Tipo',
      cell: ({ row }) => <span className="text-xs font-bold uppercase tracking-[0.12em]">{KIND_LABEL[row.original.kind]}</span>,
    },
    {
      accessorKey: 'concept',
      header: 'Concepto',
    },
    {
      accessorKey: 'amount',
      header: 'Monto',
      cell: ({ row }) => <div className="number-display text-right font-black">{formatCurrency(row.original.amount)}</div>,
    },
    {
      accessorKey: 'sharedWith',
      header: 'Compartido',
      cell: ({ row }) => `${row.original.sharedWith} persona${row.original.sharedWith > 1 ? 's' : ''}`,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass rounded-[2.4rem] p-6 md:p-8">
        <p className="label-caps">MOVIMIENTOS DE NOMINA</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">Bonos, ajustes y evidencias.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">
              Captura mock de bonos compartidos, multas, viaticos e insumos con estatus de aprobacion.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="cursor-pointer rounded-full bg-[#342b25] px-5 text-[#fffaf3] hover:bg-[#4b3d35]">Nuevo movimiento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>Nuevo movimiento demo</DialogTitle>
                <DialogDescription>Formulario visual sin persistencia. Sirve para validar campos y flujo.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Empleado</Label>
                  <Input placeholder="Buscar empleado activo" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={movementKind} onValueChange={(value) => setMovementKind(value as MovementKind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(KIND_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Personas a dividir</Label>
                  <Select value={shareCount} onValueChange={setShareCount}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['1', '2', '3', '4', '5'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(movementKind === 'PER_DIEM' || movementKind === 'SUPPLIES') ? (
                  <div className="md:col-span-2 rounded-2xl border border-dashed border-[#a87949]/40 bg-[#d2b48c]/10 p-4 text-sm text-[color:var(--text-muted)]">
                    Este tipo solicitara comprobante/foto en la version conectada.
                  </div>
                ) : null}
                <div className="space-y-2 md:col-span-2">
                  <Label>Notas</Label>
                  <Textarea placeholder="Motivo, autorizacion o detalle del movimiento" />
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="mt-2 cursor-pointer rounded-full bg-[#a87949] text-[#fffaf3] hover:bg-[#8f6238]">Guardar movimiento mock</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar movimiento</AlertDialogTitle>
                    <AlertDialogDescription>En produccion este paso guardara auditoria y enviara el movimiento a aprobacion.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => toast.success('Movimiento mock guardado')}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Aprobado" value={formatCurrency(approvedTotal)} detail="Entra a la corrida" tone="sage" />
        <MetricCard label="Pendiente" value={formatCurrency(pendingTotal)} detail="Requiere autorizacion" tone="gold" />
        <MetricCard label="Con evidencia" value={`${attachments}`} detail="Viaticos e insumos" tone="blue" />
      </div>

      <SectionCard eyebrow="Listado" title="MOVIMIENTOS CAPTURADOS" description="El estatus puede mostrarse con iconos en produccion; en demo se usan badges para claridad.">
        <DataTable columns={columns} data={movements} searchPlaceholder="Buscar movimiento" emptyMessage="Sin movimientos" pageSize={10} />
      </SectionCard>
    </div>
  )
}
