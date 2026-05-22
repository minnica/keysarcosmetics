'use client'
// Pantalla de gestión de empleados
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useEmpleados } from '@/lib/store'
import { formatCurrency, generateId } from '@/lib/utils'
import type { Empleado, Banco, Puesto } from '@/lib/mock-data'

const BANCOS: Banco[] = ['BBVA', 'Santander', 'Banorte', 'HSBC', 'Banamex', 'Otro']
const PUESTOS: Puesto[] = ['Vendedor', 'Gerente', 'Capturista']

const empleadoSchema = z.object({
  nombres: z.string().min(1, 'Requerido'),
  apellidoPaterno: z.string().min(1, 'Requerido'),
  apellidoMaterno: z.string().min(1, 'Requerido'),
  banco: z.enum(['BBVA', 'Santander', 'Banorte', 'HSBC', 'Banamex', 'Otro']),
  numeroCuenta: z.string().min(1, 'Requerido'),
  puesto: z.enum(['Vendedor', 'Gerente', 'Capturista']),
  metaIndividual: z.coerce.number().positive('Debe ser mayor a 0'),
})

type EmpleadoForm = z.infer<typeof empleadoSchema>

export default function EmpleadosPage() {
  const { empleados, add, update, remove } = useEmpleados()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Empleado | null>(null)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<EmpleadoForm>({
    resolver: zodResolver(empleadoSchema),
    defaultValues: { nombres: '', apellidoPaterno: '', apellidoMaterno: '', banco: 'BBVA', numeroCuenta: '', puesto: 'Vendedor', metaIndividual: 0 },
  })

  // Nombre completo calculado en tiempo real
  const nombres = watch('nombres')
  const apellidoP = watch('apellidoPaterno')
  const apellidoM = watch('apellidoMaterno')
  const nombreCompleto = [nombres, apellidoP, apellidoM].filter(Boolean).join(' ')

  function openNew() {
    setEditing(null)
    reset({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', banco: 'BBVA', numeroCuenta: '', puesto: 'Vendedor', metaIndividual: 0 })
    setModalOpen(true)
  }

  function openEdit(emp: Empleado) {
    setEditing(emp)
    reset({ nombres: emp.nombres, apellidoPaterno: emp.apellidoPaterno, apellidoMaterno: emp.apellidoMaterno, banco: emp.banco, numeroCuenta: emp.numeroCuenta, puesto: emp.puesto, metaIndividual: emp.metaIndividual })
    setModalOpen(true)
  }

  function onSubmit(data: EmpleadoForm) {
    const payload: Empleado = {
      id: editing?.id ?? generateId(),
      ...data,
      nombreCompleto: [data.nombres, data.apellidoPaterno, data.apellidoMaterno].filter(Boolean).join(' '),
    }
    editing ? update(payload) : add(payload)
    setModalOpen(false)
  }

  const badgePuesto = (p: Puesto) => p === 'Gerente' ? 'default' : 'secondary' as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión del catálogo de empleados</p>
        </div>
        <Button onClick={openNew}>
          <UserPlus className="h-4 w-4 mr-1.5" /> Nuevo empleado
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre completo</TableHead>
            <TableHead>Banco</TableHead>
            <TableHead>No. cuenta</TableHead>
            <TableHead>Puesto</TableHead>
            <TableHead className="text-right">Meta individual</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empleados.map(emp => (
            <TableRow key={emp.id}>
              <TableCell className="font-medium">{emp.nombreCompleto}</TableCell>
              <TableCell>{emp.banco}</TableCell>
              <TableCell className="font-mono text-xs">{emp.numeroCuenta}</TableCell>
              <TableCell><Badge variant={badgePuesto(emp.puesto)}>{emp.puesto}</Badge></TableCell>
              <TableCell className="text-right">{formatCurrency(emp.metaIndividual)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(emp.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar empleado' : 'Nuevo empleado'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Nombre completo (calculado, deshabilitado) */}
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input value={nombreCompleto} disabled placeholder="Se construye automáticamente" />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {(['nombres', 'apellidoPaterno', 'apellidoMaterno'] as const).map(field => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={field}>{field === 'nombres' ? 'Nombre(s)' : field === 'apellidoPaterno' ? 'Apellido paterno' : 'Apellido materno'}</Label>
                <Input id={field} {...register(field)} />
                {errors[field] && <p className="text-xs text-red-500">{errors[field]?.message}</p>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="banco">Banco</Label>
              <Select id="banco" {...register('banco')}>
                {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numeroCuenta">Número de cuenta</Label>
              <Input id="numeroCuenta" {...register('numeroCuenta')} />
              {errors.numeroCuenta && <p className="text-xs text-red-500">{errors.numeroCuenta.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="puesto">Puesto</Label>
            <Select id="puesto" {...register('puesto')}>
              {PUESTOS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metaIndividual">Meta individual (MXN)</Label>
            <Input id="metaIndividual" type="number" step="100" min="0" {...register('metaIndividual')} />
            {errors.metaIndividual && <p className="text-xs text-red-500">{errors.metaIndividual.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">{editing ? 'Guardar cambios' : 'Crear empleado'}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
