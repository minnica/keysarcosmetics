'use client'
// Pantalla de gestión de empleados
import { useState, type ChangeEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Pencil, Trash2, Power } from 'lucide-react'
import {
  Button,
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
  DataTable,
  toast,
} from '@cosmetics/ui'
import type { ColumnDef } from '@cosmetics/ui'
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
  const { empleados, loading, error, add, update, remove, toggleStatus } = useEmpleados()
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
      await add({ ...payload, banco: '', puesto: '', activo: true })
      toast.success('Empleado creado')
    }

    setModalOpen(false)
  }

  // Texto a mostrar: prefiere nombre del catálogo, cae en legacy
  const displayBanco    = (emp: Empleado) => emp.bank?.nombre    ?? emp.banco
  const displayPuesto   = (emp: Empleado) => emp.position?.nombre ?? emp.puesto

  const columns: ColumnDef<Empleado>[] = [
    {
      accessorKey: 'nombreCompleto',
      header: 'Nombre completo',
      cell: ({ row }) => <span className="font-medium">{row.original.nombreCompleto}</span>,
    },
    {
      id: 'banco',
      accessorFn: (row) => row.bank?.nombre ?? row.banco,
      header: 'Banco',
      cell: ({ row }) => displayBanco(row.original),
    },
    {
      accessorKey: 'numeroCuenta',
      header: 'No. cuenta',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.numeroCuenta}</span>
      ),
    },
    {
      id: 'puesto',
      accessorFn: (row) => row.position?.nombre ?? row.puesto,
      header: 'Puesto',
      cell: ({ row }) => (
        <span className="text-sm">{displayPuesto(row.original)}</span>
      ),
    },
    {
      accessorKey: 'metaIndividual',
      header: 'Meta individual',
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.metaIndividual)}</div>
      ),
    },
    {
      id: 'estatus',
      accessorFn: (row) => row.activo,
      header: 'Estatus',
      enableGlobalFilter: false,
      cell: ({ row }) => (
        row.original.activo ? (
          <Badge style={{ backgroundColor: '#648672', color: 'white', borderColor: '#648672' }}>
            Activo
          </Badge>
        ) : (
          <Badge className="bg-muted-foreground text-white border-transparent">
            Inactivo
          </Badge>
        )
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const emp = row.original
        return (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEdit(emp)}
            >
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={`w-[110px] ${emp.activo ? 'border-amber-400 text-amber-700 hover:bg-amber-50' : 'border-[#8bb09b] text-[#648672] hover:bg-[#648672]/10'}`}
                >
                  <Power className="h-4 w-4 shrink-0" />
                  <span className="inline-block w-[68px] text-center">
                    {emp.activo ? 'Desactivar' : 'Activar'}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {emp.activo ? '¿Desactivar empleado?' : '¿Activar empleado?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {emp.activo
                      ? <>El empleado <strong>{emp.nombreCompleto}</strong> dejará de aparecer en la captura de ventas.</>
                      : <>El empleado <strong>{emp.nombreCompleto}</strong> volverá a estar disponible para captura de ventas.</>
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className={emp.activo ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-[#648672] hover:bg-[#4f6a5a] text-white'}
                    onClick={() => {
                      void toggleStatus(emp.id, !emp.activo).then(() => {
                        toast.success(emp.activo ? 'Empleado desactivado' : 'Empleado activado')
                      })
                    }}
                  >
                    {emp.activo ? 'Desactivar' : 'Activar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" /> Eliminar
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
                    onClick={() => {
                      void remove(emp.id)
                        .then(() => toast.success('Empleado eliminado'))
                        .catch((err: { response?: { data?: { message?: string } } }) => {
                          const msg = err?.response?.data?.message ?? 'No se pudo eliminar el empleado'
                          toast.error(msg)
                        })
                    }}
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
        <DataTable
          columns={columns}
          data={empleados}
          emptyMessage="Sin empleados registrados"
          searchPlaceholder="Buscar empleado..."
        />
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
