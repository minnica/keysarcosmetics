'use client'
// Pantalla de gestión de empleados
import { useState, type ChangeEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Pencil, Trash2 } from 'lucide-react'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  Input,
  Label,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  toast,
} from '@cosmetics/ui'
import { useEmpleados, useBanks, usePositions } from '@/hooks'
import { formatCurrency } from '@/lib/utils'
import type { Empleado } from '@/lib/mock-data'

const empleadoSchema = z.object({
  nombres:        z.string().min(1, 'Requerido'),
  apellidoPaterno: z.string().min(1, 'Requerido'),
  apellidoMaterno: z.string().min(1, 'Requerido'),
  bankId:         z.string().min(1, 'El banco es requerido'),
  numeroCuenta:   z.string().trim().optional(),
  positionId:     z.string().min(1, 'El puesto es requerido'),
  metaIndividual: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
})

type EmpleadoForm = z.infer<typeof empleadoSchema>

export default function EmpleadosPage() {
  const { empleados, loading, error, add, update, remove } = useEmpleados()
  const { banks, loading: banksLoading } = useBanks()
  const { positions, loading: positionsLoading } = usePositions()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Empleado | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EmpleadoForm>({
    resolver: zodResolver(empleadoSchema),
    defaultValues: {
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      bankId: '',
      numeroCuenta: '',
      positionId: '',
      metaIndividual: 0,
    },
  })

  // Transforma el input a mayúsculas en tiempo real para campos de texto
  function registerUppercase(
    field: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno' | 'numeroCuenta',
  ) {
    const registered = register(field)
    return {
      ...registered,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        event.target.value = event.target.value.toUpperCase()
        void registered.onChange(event)
      },
    }
  }

  const nombres   = watch('nombres')
  const apellidoP = watch('apellidoPaterno')
  const apellidoM = watch('apellidoMaterno')
  const nombreCompleto = [nombres, apellidoP, apellidoM].filter(Boolean).join(' ')

  function openNew() {
    setEditing(null)
    reset({
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      bankId: '',
      numeroCuenta: '',
      positionId: '',
      metaIndividual: 0,
    })
    setModalOpen(true)
  }

  function openEdit(emp: Empleado) {
    setEditing(emp)

    // bankId: FK directa > relación incluida > búsqueda por nombre legacy
    const resolvedBankId =
      emp.bankId ??
      emp.bank?.id ??
      banks.find((b) => b.nombre.toUpperCase() === emp.banco.toUpperCase())?.id ??
      ''

    // positionId: FK directa > relación incluida > búsqueda por nombre legacy
    const resolvedPositionId =
      emp.positionId ??
      emp.position?.id ??
      positions.find((p) => p.nombre.toUpperCase() === emp.puesto.toUpperCase())?.id ??
      ''

    reset({
      nombres:         emp.nombres,
      apellidoPaterno: emp.apellidoPaterno,
      apellidoMaterno: emp.apellidoMaterno,
      bankId:          resolvedBankId,
      numeroCuenta:    emp.numeroCuenta,
      positionId:      resolvedPositionId,
      metaIndividual:  emp.metaIndividual,
    })
    setModalOpen(true)
  }

  async function onSubmit(data: EmpleadoForm) {
    const nombreCompleto = [
      data.nombres.trim().toUpperCase(),
      data.apellidoPaterno.trim().toUpperCase(),
      data.apellidoMaterno.trim().toUpperCase(),
    ].filter(Boolean).join(' ')

    const payload = {
      nombres:         data.nombres.trim().toUpperCase(),
      apellidoPaterno: data.apellidoPaterno.trim().toUpperCase(),
      apellidoMaterno: data.apellidoMaterno.trim().toUpperCase(),
      nombreCompleto,
      numeroCuenta:    data.numeroCuenta?.trim().toUpperCase() ?? '',
      metaIndividual:  data.metaIndividual,
      bankId:          data.bankId,
      positionId:      data.positionId,
    }

    if (editing) {
      await update({ ...editing, ...payload })
      toast.success('Empleado actualizado')
    } else {
      // banco/puesto requeridos por tipo legacy — backend los sobreescribe desde bankId/positionId
      await add({ ...payload, banco: '', puesto: '' })
      toast.success('Empleado creado')
    }

    setModalOpen(false)
  }

  // GERENTE resalta distinto al resto de puestos
  const badgePuesto = (p: string) =>
    p.toUpperCase() === 'GERENTE' ? 'default' : ('secondary' as const)

  // Texto a mostrar: prefiere nombre del catálogo, cae en legacy
  const displayBanco    = (emp: Empleado) => emp.bank?.nombre    ?? emp.banco
  const displayPuesto   = (emp: Empleado) => emp.position?.nombre ?? emp.puesto

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title font-semibold uppercase">Empleados</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Gestión del catálogo de empleados
          </p>
        </div>
        <Button onClick={openNew}>
          <UserPlus className="h-4 w-4 mr-1.5" /> Nuevo empleado
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando empleados...</p>
      ) : (
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
            {empleados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center" style={{ color: 'var(--text-muted)' }}>
                  Sin empleados registrados
                </TableCell>
              </TableRow>
            )}
            {empleados.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.nombreCompleto}</TableCell>
                <TableCell>{displayBanco(emp)}</TableCell>
                <TableCell className="font-mono text-xs">{emp.numeroCuenta}</TableCell>
                <TableCell>
                  <Badge variant={badgePuesto(displayPuesto(emp))}>{displayPuesto(emp)}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(emp.metaIndividual)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(emp)}>
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
                          <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará a <strong>{emp.nombreCompleto}</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => remove(emp.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
            <DialogTitle>{editing ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input value={nombreCompleto} disabled placeholder="Se construye automáticamente" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(['nombres', 'apellidoPaterno', 'apellidoMaterno'] as const).map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field}>
                    {field === 'nombres' ? 'Nombre(s)' : field === 'apellidoPaterno' ? 'Apellido paterno' : 'Apellido materno'}
                  </Label>
                  <Input id={field} {...registerUppercase(field)} />
                  {errors[field] && <p className="text-xs text-red-500">{errors[field]?.message}</p>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Banco — Select dinámico desde useBanks() */}
              <div className="space-y-1.5">
                <Label htmlFor="bankId">Banco</Label>
                <Controller
                  control={control}
                  name="bankId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={banksLoading}>
                      <SelectTrigger id="bankId">
                        <SelectValue placeholder={banksLoading ? 'Cargando...' : 'Selecciona un banco'} />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.bankId && <p className="text-xs text-red-500">{errors.bankId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="numeroCuenta">Número de cuenta</Label>
                <Input id="numeroCuenta" {...registerUppercase('numeroCuenta')} />
                {errors.numeroCuenta && <p className="text-xs text-red-500">{errors.numeroCuenta.message}</p>}
              </div>
            </div>

            {/* Puesto — Select dinámico desde usePositions() */}
            <div className="space-y-1.5">
              <Label htmlFor="positionId">Puesto</Label>
              <Controller
                control={control}
                name="positionId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={positionsLoading}>
                    <SelectTrigger id="positionId">
                      <SelectValue placeholder={positionsLoading ? 'Cargando...' : 'Selecciona un puesto'} />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.positionId && <p className="text-xs text-red-500">{errors.positionId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="metaIndividual">Meta individual (MXN)</Label>
              <Input id="metaIndividual" type="number" step="any" min="0" {...register('metaIndividual')} />
              {errors.metaIndividual && <p className="text-xs text-red-500">{errors.metaIndividual.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear empleado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
