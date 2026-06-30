'use client'
// Pantalla de gestión de bancos
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  DataTable,
  toast,
} from '@cosmetics/ui'
import type { ColumnDef } from '@cosmetics/ui'
import { useBanks } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import type { Bank } from '@cosmetics/types'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido').max(60),
})
type FormData = z.infer<typeof schema>

export default function BancosPage() {
  const { banks, loading, error, add, update, remove } = useBanks()
  const { t, dataTableLabels } = useI18n()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Bank | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '' },
  })

  const nombreField = register('nombre')

  function openNew() {
    setEditing(null)
    reset({ nombre: '' })
    setModalOpen(true)
  }

  function openEdit(b: Bank) {
    setEditing(b)
    reset({ nombre: b.nombre })
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    const nombre = data.nombre.trim().toUpperCase()
    if (editing) {
      await update({ ...editing, nombre })
      toast.success(t.catalogs.bankUpdated)
    } else {
      await add(nombre)
      toast.success(t.catalogs.bankCreated)
    }
    setModalOpen(false)
  }

  const columns: ColumnDef<Bank>[] = [
    {
      accessorKey: 'nombre',
      header: t.common.bank,
      cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">{t.common.actions}</div>,
      cell: ({ row }) => {
        const b = row.original
        return (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.catalogs.deleteBankTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.common.deleteCannotUndo} {t.catalogs.deleteBankDescription} <strong>{b.nombre}</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => remove(b.id)}
                  >
                    {t.common.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title font-semibold uppercase">{t.catalogs.banksTitle}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {t.catalogs.banksDescription}
          </p>
        </div>
        <Button onClick={openNew}>
          <PlusCircle className="h-4 w-4 mr-1.5" /> {t.catalogs.newBank}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.catalogs.loadingBanks}</p>
      ) : (
        <DataTable
          columns={columns}
          data={banks}
          emptyMessage={t.catalogs.noBanks}
          searchPlaceholder={t.catalogs.searchBank}
          labels={dataTableLabels}
        />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t.catalogs.editBank : t.catalogs.newBank}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">{t.catalogs.bankName}</Label>
              <Input
                id="nombre"
                placeholder="Ej. BBVA"
                {...nombreField}
                onChange={(event) => {
                  event.target.value = event.target.value.toUpperCase()
                  void nombreField.onChange(event)
                }}
              />
              {errors.nombre && (
                <p className="text-xs text-red-500">{errors.nombre.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t.common.saving : editing ? t.common.saveChanges : t.catalogs.createBank}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
