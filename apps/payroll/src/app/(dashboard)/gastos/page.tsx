'use client'

import { useState } from 'react'
import { PlusCircle, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ColumnDef,
  DataTable,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { usePayrollMockData } from '@/components/payroll/bonus-catalog-context'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { formatCurrency, formatDate, sumBy, uppercaseInput } from '@/lib/format'
import type { ExpenseFrequency, ExpenseKind, PayrollExpense } from '@/lib/mock-data'

type ExpenseForm = {
  date: string
  kind: ExpenseKind
  concept: string
  category: string
  branch: string
  amount: string
  frequency: ExpenseFrequency
  notes: string
}

const EMPTY_FORM: ExpenseForm = {
  date: '',
  kind: 'VARIABLE',
  concept: '',
  category: '',
  branch: '',
  amount: '0',
  frequency: 'ONE_TIME',
  notes: '',
}

const FREQUENCY_LABELS: Record<ExpenseFrequency, string> = {
  ONE_TIME: 'Una vez',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
}

export default function GastosPage() {
  const { expenses, addExpense, removeExpense } = usePayrollMockData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PayrollExpense | null>(null)
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM)
  const fixedTotal = sumBy(expenses.filter((expense) => expense.kind === 'FIXED'), (expense) => expense.amount)
  const variableTotal = sumBy(expenses.filter((expense) => expense.kind === 'VARIABLE'), (expense) => expense.amount)

  function openDialog() {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function saveExpense() {
    const amount = Number(form.amount)
    if (!form.date || !form.concept.trim() || !form.category.trim() || !form.branch.trim()) {
      toast.error('Completa fecha, concepto, categoría y sucursal.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ingresa un monto mayor a cero.')
      return
    }

    addExpense({ ...form, concept: form.concept.trim(), category: form.category.trim(), branch: form.branch.trim(), notes: form.notes.trim(), amount })
    setDialogOpen(false)
    setForm(EMPTY_FORM)
    toast.success('Gasto mock agregado al balance general.')
  }

  const columns: ColumnDef<PayrollExpense>[] = [
    { accessorKey: 'date', header: 'FECHA', cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: 'kind', header: 'TIPO', cell: ({ row }) => row.original.kind === 'FIXED' ? 'Fijo' : 'Variable' },
    {
      accessorKey: 'concept',
      header: 'CONCEPTO',
      cell: ({ row }) => <div><p className="font-medium">{row.original.concept}</p><p className="text-sm text-[color:var(--text-muted)]">{row.original.category}</p></div>,
    },
    { accessorKey: 'branch', header: 'SUCURSAL' },
    { accessorKey: 'frequency', header: 'FRECUENCIA', cell: ({ row }) => FREQUENCY_LABELS[row.original.frequency] },
    { accessorKey: 'amount', header: 'MONTO', meta: { align: 'right' }, cell: ({ row }) => <div className="number-display text-right">{formatCurrency(row.original.amount)}</div> },
    {
      id: 'actions',
      header: 'ACCIONES',
      meta: { align: 'right' },
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => <Button size="icon" variant="ghost" aria-label={`Borrar ${row.original.concept}`} onClick={() => setDeleteTarget(row.original)}><Trash2 className="h-4 w-4 text-red-500" /></Button>,
    },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Control de gastos</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Gastos fijos y variables del periodo.</p>
        </div>
        <Button onClick={openDialog}><PlusCircle className="mr-1.5 h-4 w-4" />Agregar gasto</Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Gastos fijos" value={formatCurrency(fixedTotal)} tone="gold" />
        <MetricCard label="Gastos variables" value={formatCurrency(variableTotal)} tone="rose" />
        <MetricCard label="Total descontado" value={formatCurrency(fixedTotal + variableTotal)} tone="blue" />
      </div>

      <SectionCard eyebrow="Balance" title="GASTOS REGISTRADOS">
        <DataTable columns={columns} data={expenses} searchPlaceholder="Buscar concepto, categoría o sucursal" emptyMessage="Sin gastos registrados" pageSize={10} />
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar gasto</DialogTitle>
            <DialogDescription>El monto se descuenta inmediatamente del balance general mock.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Fecha</Label>
              <DatePicker value={form.date} onChange={(value) => setForm((current) => ({ ...current, date: value }))} placeholder="Selecciona una fecha" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de gasto</Label>
              <Select value={form.kind} onValueChange={(value) => setForm((current) => ({ ...current, kind: value as ExpenseKind, frequency: value === 'FIXED' ? 'MONTHLY' : 'ONE_TIME' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="FIXED">Gasto fijo</SelectItem><SelectItem value="VARIABLE">Gasto variable</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={form.frequency} onValueChange={(value) => setForm((current) => ({ ...current, frequency: value as ExpenseFrequency }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(FREQUENCY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Concepto</Label>
              <Input value={form.concept} onChange={(event) => setForm((current) => ({ ...current, concept: uppercaseInput(event.target.value) }))} placeholder="Renta, logística, mantenimiento…" />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: uppercaseInput(event.target.value) }))} placeholder="Operación" />
            </div>
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Input value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: uppercaseInput(event.target.value) }))} placeholder="Corporativo" />
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notas</Label>
              <Textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: uppercaseInput(event.target.value) }))} placeholder="Detalle opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveExpense}>Guardar gasto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Borrar gasto</AlertDialogTitle><AlertDialogDescription>El gasto {deleteTarget?.concept} dejará de descontarse del balance general mock.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (deleteTarget) removeExpense(deleteTarget.id); setDeleteTarget(null); toast.success('Gasto mock eliminado del balance.') }}>Borrar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
