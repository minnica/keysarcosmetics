'use client'
// Pantalla de gestión de métodos de pago
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useMetodosPago } from '@/lib/store'
import { generateId } from '@/lib/utils'
import type { MetodoPago } from '@/lib/mock-data'

const schema = z.object({ nombre: z.string().min(1, 'El nombre es requerido').max(40) })
type FormData = z.infer<typeof schema>

export default function MetodosPagoPage() {
  const { metodosPago, add, update, remove } = useMetodosPago()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MetodoPago | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '' },
  })

  function openNew() { setEditing(null); reset({ nombre: '' }); setModalOpen(true) }
  function openEdit(m: MetodoPago) { setEditing(m); reset({ nombre: m.nombre }); setModalOpen(true) }
  function onSubmit(data: FormData) {
    editing ? update({ ...editing, nombre: data.nombre }) : add({ id: generateId(), nombre: data.nombre })
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Métodos de pago</h1>
          <p className="text-sm text-gray-500 mt-1">Catálogo de formas de pago aceptadas</p>
        </div>
        <Button onClick={openNew}>
          <PlusCircle className="h-4 w-4 mr-1.5" /> Nuevo método
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Método de pago</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metodosPago.length === 0 && (
            <TableRow><TableCell colSpan={2} className="text-center text-gray-400">Sin métodos registrados</TableCell></TableRow>
          )}
          {metodosPago.map(m => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">{m.nombre}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar método' : 'Nuevo método de pago'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre del método de pago</Label>
            <Input id="nombre" placeholder="Ej. Tarjeta de débito" {...register('nombre')} />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">{editing ? 'Guardar cambios' : 'Crear método'}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
