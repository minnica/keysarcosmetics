'use client'
// Pantalla de gestión de puestos
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
import { usePositions } from '@/hooks'
import type { Position } from '@cosmetics/types'

const schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(60),
})
type FormData = z.infer<typeof schema>

export default function PuestosPage() {
  const { positions, loading, error, add, update, remove } = usePositions()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)

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

  function openEdit(p: Position) {
    setEditing(p)
    reset({ nombre: p.nombre })
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    const nombre = data.nombre.trim().toUpperCase()
    if (editing) {
      await update({ ...editing, nombre })
      toast.success('Puesto actualizado')
    } else {
      await add(nombre)
      toast.success('Puesto creado')
    }
    setModalOpen(false)
  }

  const columns: ColumnDef<Position>[] = [
    {
      accessorKey: 'nombre',
      header: 'Puesto',
      cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
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
                  <AlertDialogTitle>¿Eliminar puesto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará el puesto <strong>{p.nombre}</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => remove(p.id)}
                  >
                    Eliminar
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
          <h1 className="page-title font-semibold uppercase">Puestos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Catálogo de puestos de trabajo
          </p>
        </div>
        <Button onClick={openNew}>
          <PlusCircle className="h-4 w-4 mr-1.5" /> Nuevo puesto
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando puestos...</p>
      ) : (
        <DataTable
          columns={columns}
          data={positions}
          emptyMessage="Sin puestos registrados"
          searchPlaceholder="Buscar puesto..."
        />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar puesto' : 'Nuevo puesto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre del puesto</Label>
              <Input
                id="nombre"
                placeholder="Ej. VENDEDOR"
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
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear puesto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
