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
import { useBonusCatalog } from '@/components/payroll/bonus-catalog-context'
import { formatCurrency, formatDate, sumBy } from '@/lib/format'
import { employees, movements, type MovementKind, type PayrollMovement } from '@/lib/mock-data'

const MOVEMENT_KIND_OPTIONS: Array<{ value: MovementKind; label: string }> = [
  { value: 'ADJUSTMENT_POSITIVE', label: 'Ajuste +' },
  { value: 'ADJUSTMENT_NEGATIVE', label: 'Ajuste -' },
  { value: 'FINE', label: 'Multa' },
  { value: 'BONUS', label: 'Bono' },
  { value: 'PER_DIEM', label: 'Viaticos' },
  { value: 'SUPPLIES', label: 'Insumos' },
]

type MovementFormState = {
  employeeId: string
  employeeName: string
  branch: string
  kind: MovementKind | ''
  bonusId: string
  concept: string
  amount: string
  sharedWith: string
  notes: string
}

const EMPTY_MOVEMENT_FORM: MovementFormState = {
  employeeId: '',
  employeeName: '',
  branch: '',
  kind: '',
  bonusId: '',
  concept: '',
  amount: '0',
  sharedWith: '1',
  notes: '',
}

function toMovementFromBonus(bonus?: { id: string; name: string; amount: number; notes: string } | null) {
  if (!bonus) return {}

  return {
    bonusId: bonus.id,
    concept: bonus.name,
    amount: String(bonus.amount),
    notes: bonus.notes,
  }
}

const activeEmployeeOptions = employees.filter((employee) => employee.active)
const branchOptions = Array.from(new Set(activeEmployeeOptions.map((employee) => employee.branch))).sort()

export default function MovimientosPage() {
  const { bonuses } = useBonusCatalog()
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [shareCount, setShareCount] = useState('1')
  const [movementForm, setMovementForm] = useState<MovementFormState>(EMPTY_MOVEMENT_FORM)

  const approvedTotal = sumBy(movements.filter((movement) => movement.status === 'APPROVED'), (movement) => movement.amount)
  const pendingTotal = sumBy(movements.filter((movement) => movement.status === 'PENDING'), (movement) => Math.abs(movement.amount))
  const bonusCount = bonuses.length

  const openMovementDialog = () => {
    setMovementForm((current) => ({
      ...current,
      employeeId: '',
      kind: '',
      bonusId: '',
      concept: '',
      amount: '0',
      sharedWith: '1',
      notes: '',
    }))
    setShareCount('1')
    setMovementDialogOpen(true)
  }

  const saveMovement = () => {
    const amount = Number(movementForm.amount)

    if (!movementForm.employeeId.trim() || !movementForm.branch.trim() || !movementForm.kind) {
      toast.error('Completa empleado, sucursal y tipo.')
      return
    }

    if (!Number.isFinite(amount)) {
      toast.error('Revisa monto.')
      return
    }

    if (movementForm.kind === 'BONUS' && !movementForm.bonusId) {
      toast.error('Selecciona un bono predefinido.')
      return
    }

    toast.success('Movimiento mock guardado')
    setMovementDialogOpen(false)
    setMovementForm(EMPTY_MOVEMENT_FORM)
    setShareCount('1')
  }

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
          <p className="font-semibold text-[color:var(--text-strong)]">{row.original.employeeName}</p>
          <p className="text-[0.92rem] text-[color:var(--text-muted)]">{row.original.branch}</p>
        </div>
      ),
    },
    {
      accessorKey: 'kind',
      header: 'Tipo',
      cell: ({ row }) => <span className="text-[0.92rem] font-bold uppercase tracking-[0.12em]">{MOVEMENT_KIND_OPTIONS.find((option) => option.value === row.original.kind)?.label ?? row.original.kind}</span>,
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
      <section className="payroll-glass rounded-xl p-6 md:p-8">
        <p className="label-caps">MOVIMIENTOS DE NOMINA</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">Bonos, ajustes y evidencias.</h1>
          </div>
          <Button className="payroll-button-primary cursor-pointer rounded-full px-5" onClick={openMovementDialog}>
            Nuevo movimiento
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Aprobado" value={formatCurrency(approvedTotal)} tone="sage" />
        <MetricCard label="Pendiente" value={formatCurrency(pendingTotal)} tone="gold" />
        <MetricCard label="Bonos registrados" value={`${bonusCount}`} tone="blue" />
      </div>

      <SectionCard eyebrow="Listado" title="MOVIMIENTOS CAPTURADOS">
        <DataTable columns={columns} data={movements} searchPlaceholder="Buscar movimiento" emptyMessage="Sin movimientos" pageSize={10} />
      </SectionCard>

      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle>Nuevo movimiento demo</DialogTitle>
            <DialogDescription>Formulario visual sin persistencia. Si eliges Bono, usa el catálogo predefinido.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select
                value={movementForm.employeeId}
                onValueChange={(value) => {
                  const employee = activeEmployeeOptions.find((item) => item.id === value)
                  setMovementForm((current) => ({
                    ...current,
                    employeeId: value,
                    employeeName: employee?.name ?? '',
                    branch: employee?.branch ?? current.branch,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployeeOptions.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} · {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select value={movementForm.branch} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branchOptions.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {movementForm.kind === 'BONUS' ? (
              <>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={movementForm.kind}
                    onValueChange={(value) => {
                      const kind = value as MovementKind
                      if (kind === 'BONUS') {
                        setMovementForm((current) => ({
                          ...current,
                          kind,
                          bonusId: '',
                          concept: '',
                          amount: '0',
                          sharedWith: '1',
                          notes: '',
                        }))
                        setShareCount('1')
                      } else {
                        setMovementForm((current) => ({
                          ...current,
                          kind,
                          bonusId: '',
                          concept: '',
                          amount: '0',
                          notes: '',
                        }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOVEMENT_KIND_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bono predefinido</Label>
                  <Select
                    value={movementForm.bonusId}
                    onValueChange={(value) => {
                      const bonus = bonuses.find((item) => item.id === value)
                      setMovementForm((current) => ({ ...current, bonusId: value, ...(bonus ? toMovementFromBonus(bonus) : {}) }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un bono" />
                    </SelectTrigger>
                    <SelectContent>
                      {bonuses.map((bonus) => (
                        <SelectItem key={bonus.id} value={bonus.id}>
                          {bonus.name} - {formatCurrency(bonus.amount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Concepto</Label>
                    <Input value={movementForm.concept} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Monto</Label>
                    <Input value={movementForm.amount} readOnly />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Personas a dividir</Label>
                    <Select value={shareCount} onValueChange={setShareCount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['1', '2', '3', '4', '5'].map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={movementForm.kind}
                    onValueChange={(value) => {
                      const kind = value as MovementKind
                      if (kind === 'BONUS') {
                        setMovementForm((current) => ({
                          ...current,
                          kind,
                          bonusId: '',
                          concept: '',
                          amount: '0',
                          sharedWith: '1',
                          notes: '',
                        }))
                        setShareCount('1')
                      } else {
                        setMovementForm((current) => ({
                          ...current,
                          kind,
                          bonusId: '',
                          concept: '',
                          amount: '0',
                          notes: '',
                        }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOVEMENT_KIND_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={movementForm.amount}
                    onChange={(event) => setMovementForm((current) => ({ ...current, amount: event.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Concepto</Label>
                  <Input
                    value={movementForm.concept}
                    onChange={(event) => setMovementForm((current) => ({ ...current, concept: event.target.value }))}
                    placeholder="Motivo o concepto"
                  />
                </div>
              </>
            )}
            {(movementForm.kind === 'PER_DIEM' || movementForm.kind === 'SUPPLIES') ? (
              <div className="sm:col-span-2 rounded-lg border border-dashed border-[#2c241c] bg-[#080706] p-3 text-[0.84rem] text-[color:var(--text-muted)]">
                Requiere evidencia en la version conectada.
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={movementForm.notes}
                onChange={(event) => setMovementForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Motivo, autorizacion o detalle del movimiento"
              />
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="payroll-button-secondary mt-2 cursor-pointer rounded-full">Guardar movimiento mock</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar movimiento</AlertDialogTitle>
                <AlertDialogDescription>En produccion este paso guardara auditoria y enviara el movimiento a aprobacion.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={saveMovement}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
    </div>
  )
}
