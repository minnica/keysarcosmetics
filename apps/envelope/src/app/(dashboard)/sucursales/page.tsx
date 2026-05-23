'use client'
// Pantalla de gestión de sucursales
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

import { useSucursales } from '@/hooks'
import type { Sucursal } from '@/lib/mock-data'

const schema = z.object({ nombre: z.string().min(1, 'El nombre es requerido').max(60) })
type FormData = z.infer<typeof schema>

export default function SucursalesPage() {
  const { sucursales, loading, error, add, update, remove } = useSucursales()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Sucursal | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '' },
  })

  function openNew() {
    setEditing(null)
    reset({ nombre: '' })
    setModalOpen(true)
  }

  function openEdit(s: Sucursal) {
    setEditing(s)
    reset({ nombre: s.nombre })
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    if (editing) {
      await update({ ...editing, nombre: data.nombre })
    } else {
      await add(data.nombre)
    }
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Sucursales</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Administra las sucursales de la empresa</p>
        </div>
        <Button onClick={openNew}>
          <PlusCircle className="h-4 w-4 mr-1.5" /> Nueva sucursal
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando sucursales...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sucursal</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sucursales.length === 0 && (
              <TableRow><TableCell colSpan={2} className="text-center" style={{ color: 'var(--text-muted)' }}>Sin sucursales registradas</TableCell></TableRow>
            )}
            {sucursales.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nombre}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
            <DialogTitle>{editing ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
          </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre de sucursal</Label>
            <Input id="nombre" placeholder="Ej. Sucursal Centro" {...register('nombre')} />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear sucursal'}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
