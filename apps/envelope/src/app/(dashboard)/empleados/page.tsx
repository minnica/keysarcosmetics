'use client'
// Pantalla de gestión de empleados
import { useMemo, useState, type ChangeEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Pencil, Trash2, Power, RotateCcw } from 'lucide-react'
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
import { RefreshingDataIndicator } from '@/components/RefreshingDataIndicator'
import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Empleado } from '@/lib/mock-data'

function createEmpleadoSchema(messages: {
  required: string
  bankRequired: string
  positionRequired: string
  goalMin: string
}) {
  return z.object({
    nombres:        z.string().min(1, messages.required),
    apellidoPaterno: z.string().min(1, messages.required),
    apellidoMaterno: z.string().min(1, messages.required),
    bankId:         z.string().min(1, messages.bankRequired),
    numeroCuenta:   z.string().trim().optional(),
    positionId:     z.string().min(1, messages.positionRequired),
    metaIndividual: z.coerce.number().min(0, messages.goalMin),
    sueldo:         z.string().trim().optional(),
    fechaNacimiento: z.string().trim().optional(),
    numeroTelefono: z.string().trim().optional(),
  })
}

type EmpleadoForm = z.infer<ReturnType<typeof createEmpleadoSchema>>
type StatusFilter = 'all' | 'active' | 'inactive'
type SalaryFilter = 'all' | 'no-record' | 'under-15k' | '15k-to-25k' | '25k-plus'

export default function EmpleadosPage() {
  const { user, canAccess } = useSession()
  const { empleados, loading, loaded, error, add, update, remove, toggleStatus } = useEmpleados()
  const { banks, loading: banksLoading } = useBanks()
  const { positions, loading: positionsLoading } = usePositions()
  const { t, dataTableLabels } = useI18n()
  const empleadoSchema = useMemo(
    () => createEmpleadoSchema({
      required: t.employees.required,
      bankRequired: t.employees.bankRequired,
      positionRequired: t.employees.positionRequired,
      goalMin: t.employees.goalMin,
    }),
    [t],
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Empleado | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [salaryFilter, setSalaryFilter] = useState<SalaryFilter>('all')
  const canViewSalary = user?.rol === 'SUPER_ADMIN' || canAccess('empleados/sueldo')
  const isInitialLoading = loading && !loaded
  const isRefreshing = loading && loaded

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
      sueldo: '',
      fechaNacimiento: '',
      numeroTelefono: '',
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
  const positionIdByName = useMemo(
    () => new Map(positions.map((position) => [position.nombre.trim().toUpperCase(), position.id])),
    [positions],
  )

  const filteredEmpleados = useMemo(
    () =>
      empleados.filter((emp) => {
        if (statusFilter === 'active' && !emp.activo) return false
        if (statusFilter === 'inactive' && emp.activo) return false

        const empPositionId =
          emp.positionId ??
          emp.position?.id ??
          positionIdByName.get(emp.puesto.trim().toUpperCase()) ??
          null

        if (positionFilter !== 'all' && empPositionId !== positionFilter) return false

        if (canViewSalary && salaryFilter !== 'all') {
          const salary = emp.sueldo ?? null
          if (salaryFilter === 'no-record') return salary == null
          if (salary == null) return false
          if (salaryFilter === 'under-15k') return salary < 15000
          if (salaryFilter === '15k-to-25k') return salary >= 15000 && salary < 25000
          if (salaryFilter === '25k-plus') return salary >= 25000
        }

        return true
      }),
    [canViewSalary, empleados, positionFilter, positionIdByName, salaryFilter, statusFilter],
  )
  const hasActiveFilters =
    statusFilter !== 'all' || positionFilter !== 'all' || (canViewSalary && salaryFilter !== 'all')

  function clearFilters() {
    setStatusFilter('all')
    setPositionFilter('all')
    setSalaryFilter('all')
  }

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
      sueldo: '',
      fechaNacimiento: '',
      numeroTelefono: '',
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
      sueldo:          canViewSalary && emp.sueldo != null ? String(emp.sueldo) : '',
      fechaNacimiento: emp.fechaNacimiento ?? '',
      numeroTelefono:  emp.numeroTelefono ?? '',
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
      ...(canViewSalary ? { sueldo: data.sueldo?.trim() ? Number(data.sueldo) : null } : {}),
      fechaNacimiento: data.fechaNacimiento?.trim() ? data.fechaNacimiento.trim() : null,
      numeroTelefono:  data.numeroTelefono?.trim() ? data.numeroTelefono.trim() : null,
    }

    if (editing) {
      const nextEmployee = {
        ...editing,
        ...payload,
        ...(canViewSalary ? {} : { sueldo: undefined }),
      } as Partial<Empleado> & Pick<Empleado, 'id'>

      await update(nextEmployee)
      toast.success(t.employees.employeeUpdated)
    } else {
      // banco/puesto requeridos por tipo legacy — backend los sobreescribe desde bankId/positionId
      await add({ ...payload, banco: '', puesto: '', activo: true })
      toast.success(t.employees.employeeCreated)
    }

    setModalOpen(false)
  }

  // Texto a mostrar: prefiere nombre del catálogo, cae en legacy
  const displayBanco    = (emp: Empleado) => emp.bank?.nombre    ?? emp.banco
  const displayPuesto   = (emp: Empleado) => emp.position?.nombre ?? emp.puesto
  const displayDate = (value?: string | null) => (value ? formatDate(value, 'dd/MM/yyyy') : t.common.noRecord)
  const displayPhone = (value?: string | null) => (value?.trim() ? value : t.common.noRecord)
  const displaySalary = (value?: number | null) => (value != null ? formatCurrency(value) : t.common.noRecord)
  const salaryColumn: ColumnDef<Empleado> = {
    id: 'sueldo',
    accessorFn: (row) => row.sueldo ?? 0,
    header: () => <span className="uppercase">{t.employees.salary}</span>,
    cell: ({ row }) => (
      <div className="text-right">{displaySalary(row.original.sueldo)}</div>
    ),
  }

  const columns: ColumnDef<Empleado>[] = [
    {
      accessorKey: 'nombreCompleto',
      header: () => <span className="uppercase">{t.employees.fullName}</span>,
      cell: ({ row }) => <span className="font-medium">{row.original.nombreCompleto}</span>,
    },
    {
      id: 'banco',
      accessorFn: (row) => row.bank?.nombre ?? row.banco,
      header: () => <span className="uppercase">{t.common.bank}</span>,
      cell: ({ row }) => displayBanco(row.original),
    },
    {
      id: 'fechaNacimiento',
      accessorFn: (row) => row.fechaNacimiento ?? '',
      header: () => <span className="uppercase">{t.employees.birthDate}</span>,
      cell: ({ row }) => displayDate(row.original.fechaNacimiento),
    },
    {
      id: 'telefono',
      accessorFn: (row) => row.numeroTelefono ?? '',
      header: () => <span className="uppercase">{t.employees.phoneNumber}</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{displayPhone(row.original.numeroTelefono)}</span>
      ),
    },
    {
      accessorKey: 'numeroCuenta',
      header: () => <span className="uppercase">{t.employees.accountNumber}</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.numeroCuenta}</span>
      ),
    },
    {
      id: 'puesto',
      accessorFn: (row) => row.position?.nombre ?? row.puesto,
      header: () => <span className="uppercase">{t.common.position}</span>,
      cell: ({ row }) => (
        <span className="text-sm">{displayPuesto(row.original)}</span>
      ),
    },
    ...(canViewSalary ? [salaryColumn] : []),
    {
      accessorKey: 'metaIndividual',
      header: () => <span className="uppercase">{t.employees.individualGoal}</span>,
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.original.metaIndividual)}</div>
      ),
    },
    {
      id: 'estatus',
      accessorFn: (row) => row.activo,
      header: () => <span className="uppercase">{t.common.status}</span>,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        row.original.activo ? (
          <Badge className="uppercase" style={{ backgroundColor: '#648672', color: 'white', borderColor: '#648672' }}>
            {t.common.active}
          </Badge>
        ) : (
          <Badge className="bg-muted-foreground text-white border-transparent uppercase">
            {t.common.inactive}
          </Badge>
        )
      ),
    },
    {
      id: 'acciones',
      header: () => <div className="text-right uppercase">{t.common.actions}</div>,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const emp = row.original
        return (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="uppercase"
              onClick={() => openEdit(emp)}
            >
              <Pencil className="h-4 w-4" /> {t.common.edit}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={`w-[110px] uppercase ${emp.activo ? 'border-amber-400 text-amber-700 hover:bg-amber-50' : 'border-[#8bb09b] text-[#648672] hover:bg-[#648672]/10'}`}
                >
                  <Power className="h-4 w-4 shrink-0" />
                  <span className="inline-block w-[68px] text-center">
                    {emp.activo ? t.common.deactivate : t.common.activate}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {emp.activo ? t.employees.deactivateEmployeeTitle : t.employees.activateEmployeeTitle}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {emp.activo
                      ? <><strong>{emp.nombreCompleto}</strong> {t.employees.deactivateEmployeeDescription}</>
                      : <><strong>{emp.nombreCompleto}</strong> {t.employees.activateEmployeeDescription}</>
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className={emp.activo ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-[#648672] hover:bg-[#4f6a5a] text-white'}
                    onClick={() => {
                      void toggleStatus(emp.id, !emp.activo).then(() => {
                        toast.success(emp.activo ? t.employees.employeeDeactivated : t.employees.employeeActivated)
                      })
                    }}
                  >
                    {emp.activo ? t.common.deactivate : t.common.activate}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-600 uppercase">
                  <Trash2 className="h-4 w-4" /> {t.common.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.employees.deleteEmployeeTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.common.deleteCannotUndo} {t.employees.deleteEmployeeDescription} <strong>{emp.nombreCompleto}</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      void remove(emp.id)
                        .then(() => toast.success(t.employees.employeeDeleted))
                        .catch((err: { response?: { data?: { message?: string } } }) => {
                          const msg = err?.response?.data?.message ?? t.employees.deleteEmployeeFailed
                          toast.error(msg)
                        })
                    }}
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
          <h1 className="page-title font-semibold uppercase">{t.employees.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {t.employees.description}
          </p>
        </div>
        <Button onClick={openNew}>
          <UserPlus className="h-4 w-4 mr-1.5" /> {t.employees.newEmployee}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {isRefreshing ? <RefreshingDataIndicator label={t.common.refreshingData} /> : null}

      {isInitialLoading ? (
        <TableLoadingSkeleton columns={6} rows={6} showFilters label={t.employees.loadingEmployees} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between gap-3 pb-3">
              <p className="section-heading">{t.employees.filtersTitle}</p>
              <Button
                type="button"
                size="sm"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="uppercase bg-[#648672] text-white hover:bg-[#4f6a5a] disabled:bg-muted disabled:text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                {t.employees.clearFilters}
              </Button>
            </div>
            <div className={`grid grid-cols-1 gap-4 ${canViewSalary ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              <div className="space-y-1.5">
                <Label htmlFor="filter-status">{t.employees.filterStatus}</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger id="filter-status">
                    <SelectValue placeholder={t.employees.filterStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.employees.allStatuses}</SelectItem>
                    <SelectItem value="active">{t.common.active}</SelectItem>
                    <SelectItem value="inactive">{t.common.inactive}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-position">{t.employees.filterPosition}</Label>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger id="filter-position">
                    <SelectValue placeholder={t.employees.filterPosition} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.employees.allPositions}</SelectItem>
                    {positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {canViewSalary ? (
                <div className="space-y-1.5">
                  <Label htmlFor="filter-salary">{t.employees.filterSalary}</Label>
                  <Select value={salaryFilter} onValueChange={(value) => setSalaryFilter(value as SalaryFilter)}>
                    <SelectTrigger id="filter-salary">
                      <SelectValue placeholder={t.employees.filterSalary} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.employees.allSalaries}</SelectItem>
                      <SelectItem value="no-record">{t.employees.salaryNoRecord}</SelectItem>
                      <SelectItem value="under-15k">{t.employees.salaryUnder15k}</SelectItem>
                      <SelectItem value="15k-to-25k">{t.employees.salary15kTo25k}</SelectItem>
                      <SelectItem value="25k-plus">{t.employees.salary25kOrMore}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredEmpleados}
            emptyMessage={t.dataTable.empty}
            searchPlaceholder={t.employees.searchEmployee}
            labels={dataTableLabels}
          />
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t.employees.editEmployee : t.employees.newEmployee}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t.employees.fullName}</Label>
              <Input value={nombreCompleto} disabled placeholder={t.employees.fullNamePlaceholder} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(['nombres', 'apellidoPaterno', 'apellidoMaterno'] as const).map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field}>
                    {field === 'nombres' ? t.employees.firstNames : field === 'apellidoPaterno' ? t.employees.paternalLastName : t.employees.maternalLastName}
                  </Label>
                  <Input id={field} {...registerUppercase(field)} />
                  {errors[field] && <p className="text-xs text-red-500">{errors[field]?.message}</p>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Banco — Select dinámico desde useBanks() */}
              <div className="space-y-1.5">
                <Label htmlFor="bankId">{t.common.bank}</Label>
                <Controller
                  control={control}
                  name="bankId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={banksLoading}>
                      <SelectTrigger id="bankId">
                        <SelectValue placeholder={banksLoading ? t.common.loading : t.employees.selectBank} />
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
                <Label htmlFor="numeroCuenta">{t.employees.accountNumber}</Label>
                <Input id="numeroCuenta" {...registerUppercase('numeroCuenta')} />
                {errors.numeroCuenta && <p className="text-xs text-red-500">{errors.numeroCuenta.message}</p>}
              </div>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${canViewSalary ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {canViewSalary ? (
                <div className="space-y-1.5">
                  <Label htmlFor="sueldo">{t.employees.salary}</Label>
                  <Input id="sueldo" type="number" step="any" min="0" {...register('sueldo')} />
                  {errors.sueldo && <p className="text-xs text-red-500">{errors.sueldo.message}</p>}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="fechaNacimiento">{t.employees.birthDate}</Label>
                <Input id="fechaNacimiento" type="date" {...register('fechaNacimiento')} />
                {errors.fechaNacimiento && <p className="text-xs text-red-500">{errors.fechaNacimiento.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="numeroTelefono">{t.employees.phoneNumber}</Label>
                <Input id="numeroTelefono" type="tel" inputMode="tel" {...register('numeroTelefono')} />
                {errors.numeroTelefono && <p className="text-xs text-red-500">{errors.numeroTelefono.message}</p>}
              </div>
            </div>

            {/* Puesto — Select dinámico desde usePositions() */}
            <div className="space-y-1.5">
              <Label htmlFor="positionId">{t.common.position}</Label>
              <Controller
                control={control}
                name="positionId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={positionsLoading}>
                    <SelectTrigger id="positionId">
                      <SelectValue placeholder={positionsLoading ? t.common.loading : t.employees.selectPosition} />
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
              <Label htmlFor="metaIndividual">{t.employees.individualGoalMxn}</Label>
              <Input id="metaIndividual" type="number" step="any" min="0" {...register('metaIndividual')} />
              {errors.metaIndividual && <p className="text-xs text-red-500">{errors.metaIndividual.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t.common.saving : editing ? t.common.saveChanges : t.employees.createEmployee}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
