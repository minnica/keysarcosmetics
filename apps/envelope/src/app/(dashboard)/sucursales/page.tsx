'use client'
// Pantalla de gestión de sucursales
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, Pencil, Power } from 'lucide-react'

import {
  Button,
  Badge,
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

import { useAllSucursales } from '@/hooks'
import { RefreshingDataIndicator } from '@/components/RefreshingDataIndicator'
import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { useI18n } from '@/lib/i18n'
import type { Sucursal } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'
import { actionButtonStyles } from '@/lib/action-button-styles'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido').max(60),
  metaMensual: z.coerce
    .number()
    .finite('Ingresa un monto válido')
    .min(0, 'Debe ser mayor o igual a 0')
    .max(999_999_999_999.99, 'El monto es demasiado grande'),
})
type FormData = z.infer<typeof schema>

export default function SucursalesPage() {
  const { sucursales, loading, loaded, error, add, update, toggleStatus } = useAllSucursales()
  const { t, dataTableLabels } = useI18n()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Sucursal | null>(null)
  const isInitialLoading = loading && !loaded
  const isRefreshing = loading && loaded

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', metaMensual: 0 },
  })

  const nombreField = register('nombre')

  function openNew() {
    setEditing(null)
    reset({ nombre: '', metaMensual: 0 })
    setModalOpen(true)
  }

  function openEdit(s: Sucursal) {
    setEditing(s)
    reset({ nombre: s.nombre, metaMensual: s.metaMensual })
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    const nombre = data.nombre.trim().toUpperCase()
    if (editing) {
      await update({ id: editing.id, nombre, metaMensual: data.metaMensual })
      toast.success(t.catalogs.branchUpdated)
    } else {
      await add({ nombre, metaMensual: data.metaMensual })
      toast.success(t.catalogs.branchCreated)
    }
    setModalOpen(false)
  }

  const columns: ColumnDef<Sucursal>[] = [
    {
      accessorKey: 'nombre',
      header: t.common.branch.toUpperCase(),
      cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
    },
    {
      accessorKey: 'metaMensual',
      header: t.catalogs.branchMonthlyGoal.toUpperCase(),
      cell: ({ row }) => (
        <span className="number-display">{formatCurrency(row.original.metaMensual)}</span>
      ),
    },
    {
      id: 'estatus',
      accessorFn: (row) => row.activa ? t.common.active : t.common.inactive,
      header: t.common.status.toUpperCase(),
      cell: ({ row }) => row.original.activa ? (
        <Badge
          className="uppercase"
          style={{ backgroundColor: '#648672', color: 'white', borderColor: '#648672' }}
        >
          {t.common.active}
        </Badge>
      ) : (
        <Badge className="border-transparent bg-muted-foreground text-white uppercase">
          {t.common.inactive}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right uppercase">{t.common.actions}</div>,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className={`${actionButtonStyles.neutral} uppercase`}
              onClick={() => openEdit(s)}
              aria-label={`${t.common.edit} ${s.nombre}`}
              title={`${t.common.edit} ${s.nombre}`}
            >
              <Pencil className="h-4 w-4" />
              <span>{t.common.edit}</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={`min-w-[112px] uppercase ${s.activa
                    ? actionButtonStyles.warning
                    : actionButtonStyles.success}`}
                  aria-label={`${s.activa ? t.common.deactivate : t.common.activate} ${s.nombre}`}
                  title={`${s.activa ? t.common.deactivate : t.common.activate} ${s.nombre}`}
                >
                  <Power className="h-4 w-4 shrink-0" />
                  <span>{s.activa ? t.common.deactivate : t.common.activate}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {s.activa ? t.catalogs.deactivateBranchTitle : t.catalogs.activateBranchTitle}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{s.nombre}</strong>{' '}
                    {s.activa
                      ? t.catalogs.deactivateBranchDescription
                      : t.catalogs.activateBranchDescription}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className={s.activa
                      ? actionButtonStyles.warningSolid
                      : actionButtonStyles.successSolid}
                    onClick={() => {
                      void toggleStatus(s.id, !s.activa).then(() => {
                        toast.success(s.activa
                          ? t.catalogs.branchDeactivated
                          : t.catalogs.branchActivated)
                      })
                    }}
                  >
                    {s.activa ? t.common.deactivate : t.common.activate}
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{t.catalogs.branchesTitle}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t.catalogs.branchesDescription}</p>
        </div>
        <Button onClick={openNew}>
          <PlusCircle className="h-4 w-4 mr-1.5" /> {t.catalogs.newBranch}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {isRefreshing ? <RefreshingDataIndicator label={t.common.refreshingData} /> : null}

      {isInitialLoading ? (
        <TableLoadingSkeleton columns={4} label={t.catalogs.loadingBranches} />
      ) : (
        <DataTable
          columns={columns}
          data={sucursales}
          emptyMessage={t.catalogs.noBranches}
          searchPlaceholder={t.catalogs.searchBranch}
          labels={dataTableLabels}
        />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t.catalogs.editBranch : t.catalogs.newBranch}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">{t.catalogs.branchName}</Label>
              <Input
                id="nombre"
                placeholder="Ej. SUCURSAL CENTRO"
                aria-invalid={Boolean(errors.nombre)}
                {...nombreField}
                onChange={(event) => {
                  event.target.value = event.target.value.toUpperCase()
                  void nombreField.onChange(event)
                }}
              />
              {errors.nombre && <p className="text-xs text-red-500" role="alert">{errors.nombre.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="metaMensual">{t.catalogs.branchMonthlyGoalMxn}</Label>
              <Input
                id="metaMensual"
                type="number"
                inputMode="decimal"
                min="0"
                max="999999999999.99"
                step="0.01"
                aria-invalid={Boolean(errors.metaMensual)}
                {...register('metaMensual')}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t.catalogs.branchMonthlyGoalHelp}
              </p>
              {errors.metaMensual && (
                <p className="text-xs text-red-500" role="alert">{errors.metaMensual.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{t.common.cancel}</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t.common.saving : editing ? t.common.saveChanges : t.catalogs.createBranch}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
