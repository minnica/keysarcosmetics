'use client'

import { useState } from 'react'
import { PlusCircle, Save } from 'lucide-react'
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
import { ReportExportButtons } from '@/components/payroll/report-export-buttons'
import { SectionCard } from '@/components/payroll/section-card'
import { StatusBadge } from '@/components/payroll/status-badge'
import { usePayrollMockData } from '@/components/payroll/bonus-catalog-context'
import { formatCurrency, formatDate, formatStatus, normalizeUppercase, sumBy, uppercaseInput } from '@/lib/format'
import { employees, movements as initialMovements, type MovementKind, type PayrollCatalogItem, type PayrollMovement } from '@/lib/mock-data'

const MOVEMENT_KIND_OPTIONS: Array<{ value: MovementKind; label: string }> = [
  { value: 'ADJUSTMENT_POSITIVE', label: 'Ajuste +' },
  { value: 'ADJUSTMENT_NEGATIVE', label: 'Ajuste -' },
  { value: 'FINE', label: 'Multa' },
  { value: 'BONUS', label: 'Bono' },
  { value: 'PER_DIEM', label: 'Viáticos' },
  { value: 'SUPPLIES', label: 'Insumos' },
]

type MovementFormState = {
  employeeId: string
  employeeName: string
  branch: string
  kind: MovementKind | ''
  catalogId: string
  concept: string
  amount: string
  notes: string
}

const EMPTY_MOVEMENT_FORM: MovementFormState = {
  employeeId: '', employeeName: '', branch: '', kind: '', catalogId: '', concept: '', amount: '0', notes: '',
}

const activeEmployeeOptions = employees.filter((employee) => employee.active)
const branchOptions = Array.from(new Set(activeEmployeeOptions.map((employee) => employee.branch))).sort()

export default function MovimientosPage() {
  const { bonuses, fines, perDiems } = usePayrollMockData()
  const [movementRows, setMovementRows] = useState(initialMovements)
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [shareCount, setShareCount] = useState('1')
  const [movementForm, setMovementForm] = useState<MovementFormState>(EMPTY_MOVEMENT_FORM)

  const catalogConfig = movementForm.kind === 'BONUS'
    ? { label: 'Bono predefinido', items: bonuses }
    : movementForm.kind === 'FINE'
      ? { label: 'Multa predefinida', items: fines }
      : movementForm.kind === 'PER_DIEM'
        ? { label: 'Viático predefinido', items: perDiems }
        : null

  const approvedTotal = sumBy(movementRows.filter((movement) => movement.status === 'APPROVED'), (movement) => movement.amount)
  const pendingTotal = sumBy(movementRows.filter((movement) => movement.status === 'PENDING'), (movement) => Math.abs(movement.amount))

  function setMovementKind(kind: MovementKind) {
    setMovementForm((current) => ({ ...current, kind, catalogId: '', concept: '', amount: '0', notes: '' }))
    setShareCount('1')
  }

  function selectCatalogItem(item?: PayrollCatalogItem) {
    if (!item) return
    setMovementForm((current) => ({ ...current, catalogId: item.id, concept: normalizeUppercase(item.name), amount: String(item.amount), notes: normalizeUppercase(item.notes) }))
  }

  function openMovementDialog() {
    setMovementForm(EMPTY_MOVEMENT_FORM)
    setShareCount('1')
    setMovementDialogOpen(true)
  }

  function saveMovement() {
    const amount = Number(movementForm.amount)
    if (!movementForm.employeeId || !movementForm.branch || !movementForm.kind || !movementForm.concept.trim()) {
      toast.error('Completa empleado, sucursal, tipo y concepto.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ingresa un monto mayor a cero.')
      return
    }
    if (catalogConfig && !movementForm.catalogId) {
      toast.error(`Selecciona ${catalogConfig.label.toLowerCase()}.`)
      return
    }

    const signedAmount = movementForm.kind === 'FINE' || movementForm.kind === 'ADJUSTMENT_NEGATIVE' ? -Math.abs(amount) : Math.abs(amount)
    const nextMovement: PayrollMovement = {
      id: `movement-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
      date: new Date().toISOString().slice(0, 10),
      employeeName: normalizeUppercase(movementForm.employeeName),
      branch: normalizeUppercase(movementForm.branch),
      kind: movementForm.kind,
      concept: normalizeUppercase(movementForm.concept),
      amount: signedAmount,
      status: 'PENDING',
      notes: normalizeUppercase(movementForm.notes),
      sharedWith: Number(shareCount),
      attachmentRequired: movementForm.kind === 'PER_DIEM' || movementForm.kind === 'SUPPLIES',
      commissionable: movementForm.kind === 'BONUS',
    }
    setMovementRows((current) => [nextMovement, ...current])
    setMovementDialogOpen(false)
    setMovementForm(EMPTY_MOVEMENT_FORM)
    setShareCount('1')
    toast.success('Movimiento mock guardado.')
  }

  const columns: ColumnDef<PayrollMovement>[] = [
    { accessorKey: 'date', header: 'FECHA', cell: ({ row }) => formatDate(row.original.date) },
    {
      accessorKey: 'employeeName', header: 'EMPLEADO', cell: ({ row }) => (
        <div><p className="font-medium">{row.original.employeeName}</p><p className="text-sm text-[color:var(--text-muted)]">{row.original.branch}</p></div>
      ),
    },
    { accessorKey: 'kind', header: 'TIPO', cell: ({ row }) => <span className="font-medium">{MOVEMENT_KIND_OPTIONS.find((option) => option.value === row.original.kind)?.label ?? row.original.kind}</span> },
    { accessorKey: 'concept', header: 'CONCEPTO' },
    { accessorKey: 'amount', header: 'MONTO', meta: { align: 'right' }, cell: ({ row }) => <div className="number-display text-right">{formatCurrency(row.original.amount)}</div> },
    { accessorKey: 'sharedWith', header: 'COMPARTIDO', cell: ({ row }) => `${row.original.sharedWith} persona${row.original.sharedWith > 1 ? 's' : ''}` },
    { accessorKey: 'status', header: 'ESTATUS', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ]

  const exportConfig = {
    title: 'Movimientos de nómina',
    subtitle: 'Datos mock capturados en la sesión actual',
    filename: 'movimientos-nomina',
    sheetName: 'Movimientos',
    orientation: 'landscape' as const,
    rows: movementRows,
    columns: [
      { header: 'FECHA', accessor: (row: PayrollMovement) => formatDate(row.date), width: 12 },
      { header: 'EMPLEADO', accessor: (row: PayrollMovement) => row.employeeName, width: 32 },
      { header: 'SUCURSAL', accessor: (row: PayrollMovement) => row.branch, width: 22 },
      { header: 'TIPO', accessor: (row: PayrollMovement) => MOVEMENT_KIND_OPTIONS.find((option) => option.value === row.kind)?.label ?? row.kind, width: 18 },
      { header: 'CONCEPTO', accessor: (row: PayrollMovement) => row.concept, width: 24 },
      { header: 'MONTO', accessor: (row: PayrollMovement) => row.amount, format: 'currency' as const, width: 14 },
      { header: 'ESTATUS', accessor: (row: PayrollMovement) => formatStatus(row.status), width: 12 },
    ],
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Movimientos de nómina</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Bonos, ajustes y evidencias.</p>
        </div>
        <div className="flex flex-wrap gap-2"><ReportExportButtons config={exportConfig} disabled={movementRows.length === 0} /><Button onClick={openMovementDialog}><PlusCircle className="mr-1.5 h-4 w-4" />Nuevo movimiento</Button></div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Aprobado" value={formatCurrency(approvedTotal)} tone="sage" />
        <MetricCard label="Pendiente" value={formatCurrency(pendingTotal)} tone="gold" />
        <MetricCard label="Catálogos disponibles" value={`${bonuses.length + fines.length + perDiems.length}`} tone="blue" />
      </div>

      <SectionCard eyebrow="Listado" title="MOVIMIENTOS CAPTURADOS">
        <DataTable columns={columns} data={movementRows} searchPlaceholder="Buscar movimiento" emptyMessage="Sin movimientos" pageSize={10} />
      </SectionCard>

      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nuevo movimiento</DialogTitle><DialogDescription>Los bonos, multas y viáticos se seleccionan desde sus catálogos mock.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select value={movementForm.employeeId} onValueChange={(value) => { const employee = activeEmployeeOptions.find((item) => item.id === value); setMovementForm((current) => ({ ...current, employeeId: value, employeeName: employee?.name ?? '', branch: employee?.branch ?? '' })) }}>
                <SelectTrigger><SelectValue placeholder="Selecciona un empleado" /></SelectTrigger>
                <SelectContent>{activeEmployeeOptions.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name} · {employee.position}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select value={movementForm.branch} disabled><SelectTrigger><SelectValue placeholder="Selecciona una sucursal" /></SelectTrigger><SelectContent>{branchOptions.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={movementForm.kind} onValueChange={(value) => setMovementKind(value as MovementKind)}><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger><SelectContent>{MOVEMENT_KIND_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
            </div>
            {catalogConfig ? (
              <div className="space-y-2">
                <Label>{catalogConfig.label}</Label>
                <Select value={movementForm.catalogId} onValueChange={(value) => selectCatalogItem(catalogConfig.items.find((item) => item.id === value))}><SelectTrigger><SelectValue placeholder={`Selecciona ${catalogConfig.label.toLowerCase()}`} /></SelectTrigger><SelectContent>{catalogConfig.items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {formatCurrency(item.amount)}</SelectItem>)}</SelectContent></Select>
              </div>
            ) : (
              <div className="space-y-2"><Label>Monto</Label><Input type="number" min="0" step="0.01" value={movementForm.amount} onChange={(event) => setMovementForm((current) => ({ ...current, amount: event.target.value }))} /></div>
            )}
            <div className="space-y-2"><Label>Concepto</Label><Input readOnly={Boolean(catalogConfig)} value={movementForm.concept} onChange={(event) => setMovementForm((current) => ({ ...current, concept: uppercaseInput(event.target.value) }))} placeholder="Motivo o concepto" /></div>
            {catalogConfig ? <div className="space-y-2"><Label>Monto</Label><Input value={movementForm.amount === '0' ? '' : formatCurrency(Number(movementForm.amount))} readOnly /></div> : null}
            <div className="space-y-2 sm:col-span-2"><Label>Personas a dividir</Label><Select value={shareCount} onValueChange={setShareCount}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['1', '2', '3', '4', '5'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            {(movementForm.kind === 'PER_DIEM' || movementForm.kind === 'SUPPLIES') ? <div className="sm:col-span-2 rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--input-disabled-bg)] p-3 text-sm text-[color:var(--text-muted)]">Este movimiento requiere evidencia en la versión conectada.</div> : null}
            <div className="space-y-2 sm:col-span-2"><Label>Notas</Label><Textarea value={movementForm.notes} onChange={(event) => setMovementForm((current) => ({ ...current, notes: uppercaseInput(event.target.value) }))} placeholder="Motivo, autorización o detalle" /></div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button className="mt-2"><Save className="mr-1.5 h-4 w-4" />Guardar movimiento mock</Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar movimiento</AlertDialogTitle><AlertDialogDescription>El movimiento quedará pendiente de aprobación en esta sesión mock.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={saveMovement}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
    </div>
  )
}
