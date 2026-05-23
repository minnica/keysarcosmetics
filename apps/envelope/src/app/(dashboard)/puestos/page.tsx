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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cosmetics/ui'
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
    } else {
      await add(nombre)
    }
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Puestos</h1>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Puesto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center" style={{ color: 'var(--text-muted)' }}>
                  Sin puestos registrados
                </TableCell>
              </TableRow>
            )}
            {positions.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
