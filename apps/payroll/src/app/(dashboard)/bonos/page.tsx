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
  Textarea,
  toast,
} from '@cosmetics/ui'
import { MetricCard } from '@/components/payroll/metric-card'
import { SectionCard } from '@/components/payroll/section-card'
import { useBonusCatalog } from '@/components/payroll/bonus-catalog-context'
import { formatCurrency } from '@/lib/format'
import { type PayrollBonus } from '@/lib/mock-data'

type BonusFormState = {
  name: string
  amount: string
  notes: string
}

const EMPTY_FORM: BonusFormState = {
  name: '',
  amount: '0',
  notes: '',
}

function toFormState(bonus: PayrollBonus): BonusFormState {
  return {
    name: bonus.name,
    amount: String(bonus.amount),
    notes: bonus.notes,
  }
}

export default function BonosPage() {
  const { bonuses, upsertBonus, removeBonus } = useBonusCatalog()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PayrollBonus | null>(null)
  const [form, setForm] = useState<BonusFormState>(EMPTY_FORM)

  const openCreateDialog = () => {
    setEditingBonusId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (bonus: PayrollBonus) => {
    setEditingBonusId(bonus.id)
    setForm(toFormState(bonus))
    setDialogOpen(true)
  }

  const saveBonus = () => {
    const amount = Number(form.amount)

    if (!form.name.trim() || !Number.isFinite(amount)) {
      toast.error('Completa nombre y monto del bono.')
      return
    }

    upsertBonus({
      ...(editingBonusId ? { id: editingBonusId } : {}),
      name: form.name.trim(),
      amount,
      notes: form.notes.trim(),
    })

    setDialogOpen(false)
    setEditingBonusId(null)
    setForm(EMPTY_FORM)
    toast.success(editingBonusId ? 'Bono mock actualizado.' : 'Bono mock creado.')
  }

  const confirmDeleteBonus = () => {
    if (!deleteTarget) return

    removeBonus(deleteTarget.id)
    toast.success(`Bono mock eliminado: ${deleteTarget.name}`)
    setDeleteTarget(null)
  }

  const columns: ColumnDef<PayrollBonus>[] = [
    {
      accessorKey: 'name',
      header: 'BONO',
      cell: ({ row }) => <p className="font-semibold text-[color:var(--text-strong)]">{row.original.name}</p>,
    },
    {
      accessorKey: 'amount',
      header: 'Monto',
      meta: { align: 'right' },
      cell: ({ row }) => <div className="number-display w-full tabular-nums text-right font-black">{formatCurrency(row.original.amount)}</div>,
    },
    {
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" className="payroll-button-secondary h-8 cursor-pointer rounded-full px-3" onClick={() => openEditDialog(row.original)}>
            Editar
          </Button>
          <Button
            variant="outline"
            className="h-8 cursor-pointer rounded-full border-red-300 bg-red-50 px-3 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
            onClick={() => setDeleteTarget(row.original)}
          >
            Borrar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="payroll-glass rounded-xl p-6 md:p-8">
        <p className="label-caps">BONOS PREDEFINIDOS</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="page-title">Catálogo mock de bonos.</h1>
          </div>
          <Button className="payroll-button-primary cursor-pointer rounded-full px-5" onClick={openCreateDialog}>
            Nuevo bono
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard label="Bonos registrados" value={`${bonuses.length}`} tone="sage" />
        <MetricCard label="Monto agregado" value={formatCurrency(bonuses.reduce((total, bonus) => total + bonus.amount, 0))} tone="blue" />
      </div>

      <SectionCard eyebrow="Catalogo" title="BONOS REGISTRADOS">
        <DataTable columns={columns} data={bonuses} searchPlaceholder="Buscar bono" emptyMessage="Sin bonos" pageSize={10} />
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle>{editingBonusId ? 'Editar bono demo' : 'Nuevo bono demo'}</DialogTitle>
            <DialogDescription>Catálogo mock para usarlo después desde movimientos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Nombre del bono</Label>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="HIT" />
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="200" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Detalle o regla del bono" rows={3} />
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Button className="payroll-button-primary cursor-pointer rounded-full px-5" onClick={saveBonus}>
              {editingBonusId ? 'Guardar cambios mock' : 'Crear bono mock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borrar bono</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina el bono mock de <span className="font-semibold text-[color:var(--text-strong)]">{deleteTarget?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBonus}>Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
