'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Clock3, Pencil, Save, ShoppingBag, Trash2, Utensils, X } from 'lucide-react'
import type { EstatusCita, RegistroCita, TipoAtencionCita, TipoCompraCita } from '@cosmetics/types'
import type { ColumnDef, DateRange } from '@cosmetics/ui'
import {
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  DataTable,
  DatePicker,
  DateRangePicker,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@cosmetics/ui'
import { RefreshingDataIndicator } from '@/components/RefreshingDataIndicator'
import { TableLoadingSkeleton } from '@/components/layout/DataLoadingSkeleton'
import { useAppointmentCatalogs, useAppointments, useSucursales } from '@/hooks'
import { currentFortnightRange } from '@/lib/date-periods'
import { useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

const purchaseTypes = ['PAGO_NETO', 'COMPRA_CON_APARTADO', 'PAGO_DE_APARTADO'] as const
const attentionTypes = ['FACIAL', 'FACIAL_DOBLE'] as const
const appointmentStatuses = ['ATENDIDA', 'NO_LLEGO', 'CANCELADA'] as const

const appointmentSchema = z.object({
  fecha: z.string().min(1, 'Selecciona una fecha'),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Selecciona una hora válida'),
  tipoAtencion: z.enum(attentionTypes),
  estatus: z.enum(appointmentStatuses),
  nombreCliente: z.string().trim().min(2, 'Escribe el nombre de la clienta').max(160),
  sucursalId: z.string().min(1, 'Selecciona una sucursal'),
  vendedorId: z.string().min(1, 'Selecciona un vendedor'),
  facialistaId: z.string().min(1, 'Selecciona una facialista'),
  compro: z.boolean(),
  tipoCompra: z.union([z.enum(purchaseTypes), z.literal('')]),
  montoCompra: z.coerce.number().finite().min(0),
  bonoSalidaTarde: z.boolean(),
  bonoComida: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.compro && !data.tipoCompra) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tipoCompra'], message: 'Selecciona el tipo de compra' })
  }
  if (data.compro && data.montoCompra <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['montoCompra'], message: 'El monto debe ser mayor a cero' })
  }
  if (data.estatus !== 'ATENDIDA' && data.compro) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['estatus'], message: 'Una cita no atendida no puede registrar compra' })
  }
})

type AppointmentForm = z.infer<typeof appointmentSchema>

const copy = {
  es: {
    title: 'Registro de citas',
    description: 'Captura cada cita y su resultado operativo.',
    service: 'Datos de la atención',
    serviceHelp: 'Identifica a la clienta, el equipo que la atendió y la sucursal.',
    date: 'Fecha', time: 'Hora', client: 'Nombre de la clienta', branch: 'Sucursal', seller: 'Vendedor', facialist: 'Facialista',
    attentionType: 'Tipo de atención', facial: 'Facial', facialDouble: 'Facial doble', status: 'Estatus', attended: 'Atendida', noShow: 'No llegó', cancelled: 'Cancelada',
    searchSeller: 'Buscar vendedor...', searchFacialist: 'Buscar facialista...',
    purchase: 'Resultado de compra', purchaseHelp: 'Las opciones de compra solo se solicitan cuando la clienta sí compró.',
    boughtQuestion: '¿La clienta compró?', no: 'No compró', yes: 'Sí compró',
    concept: 'Concepto de compra', amount: 'Monto', net: 'Pago neto', withDeposit: 'Compra con apartado', depositPayment: 'Pago de apartado',
    bonuses: 'Bonos aplicables', late: 'Bono salida tarde', meal: 'Bono de comida',
    total: 'Total del registro', save: 'Guardar cita', saved: 'Cita registrada correctamente', edit: 'Editar', editing: 'Editando cita', update: 'Guardar cambios', updated: 'Cita actualizada correctamente', cancelEdit: 'Cancelar edición',
    recent: 'Citas registradas', recentHelp: 'Consulta los registros del rango seleccionado.',
    noRecords: 'Sin citas registradas en este período.', search: 'Buscar citas...', loading: 'Cargando citas',
    registeredBy: 'Registró', purchaseColumn: 'Compra', bonusColumn: 'Bonos', none: 'Sin compra', noBonus: 'Sin bono',
    records: 'Registros', appointments: 'Citas', withPurchase: 'Con compra', totalSales: 'Total',
    notAttendedHelp: 'La compra y los bonos no aplican para una cita cancelada o cuando la clienta no llegó.',
    delete: 'Eliminar', deleteTitle: '¿Eliminar esta cita?', deleteDescription: 'Se eliminará permanentemente el registro de', deleteConfirm: 'Eliminar cita', deleted: 'Cita eliminada correctamente', deleting: 'Eliminando...',
  },
  en: {
    title: 'Appointment records',
    description: 'Capture every appointment and its operational result.',
    service: 'Appointment details',
    serviceHelp: 'Identify the client, the team that assisted her, and the branch.',
    date: 'Date', time: 'Time', client: 'Client name', branch: 'Branch', seller: 'Seller', facialist: 'Facialist',
    attentionType: 'Appointment type', facial: 'Facial', facialDouble: 'Double facial', status: 'Status', attended: 'Completed', noShow: 'No show', cancelled: 'Cancelled',
    searchSeller: 'Search seller...', searchFacialist: 'Search facialist...',
    purchase: 'Purchase result', purchaseHelp: 'Purchase details are only requested when the client made a purchase.',
    boughtQuestion: 'Did the client buy?', no: 'No purchase', yes: 'Purchased',
    concept: 'Purchase type', amount: 'Amount', net: 'Net payment', withDeposit: 'Purchase with deposit', depositPayment: 'Deposit payment',
    bonuses: 'Applicable bonuses', late: 'Late departure bonus', meal: 'Meal bonus',
    total: 'Record total', save: 'Save appointment', saved: 'Appointment saved successfully', edit: 'Edit', editing: 'Editing appointment', update: 'Save changes', updated: 'Appointment updated successfully', cancelEdit: 'Cancel editing',
    recent: 'Saved appointments', recentHelp: 'Review records within the selected range.',
    noRecords: 'No appointments in this period.', search: 'Search appointments...', loading: 'Loading appointments',
    registeredBy: 'Recorded by', purchaseColumn: 'Purchase', bonusColumn: 'Bonuses', none: 'No purchase', noBonus: 'No bonus',
    records: 'Records', appointments: 'Appointments', withPurchase: 'With purchase', totalSales: 'Total',
    notAttendedHelp: 'Purchases and bonuses do not apply to cancelled or no-show appointments.',
    delete: 'Delete', deleteTitle: 'Delete this appointment?', deleteDescription: 'The appointment record for', deleteConfirm: 'Delete appointment', deleted: 'Appointment deleted successfully', deleting: 'Deleting...',
  },
} as const

export default function AppointmentsPage() {
  const { locale, t, dataTableLabels } = useI18n()
  const text = copy[locale]
  const { user } = useSession()
  const { sucursales } = useSucursales()
  const { employees, loading: catalogsLoading, error: catalogsError } = useAppointmentCatalogs()
  const [range, setRange] = useState<DateRange>(() => currentFortnightRange())
  const [editing, setEditing] = useState<RegistroCita | null>(null)
  const [recordToDelete, setRecordToDelete] = useState<RegistroCita | null>(null)
  const [deleting, setDeleting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const appointmentFilters = useMemo(() => ({ fechaInicio: range.from, fechaFin: range.to }), [range.from, range.to])
  const { records, loading, loaded, error, add, update, remove } = useAppointments(appointmentFilters)

  const form = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      fecha: todayISO(), hora: '', tipoAtencion: 'FACIAL', estatus: 'ATENDIDA', nombreCliente: '', sucursalId: '', vendedorId: '', facialistaId: '',
      compro: false, tipoCompra: '', montoCompra: 0, bonoSalidaTarde: false, bonoComida: false,
    },
  })
  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = form
  const bought = watch('compro')
  const status = watch('estatus')
  const attended = status === 'ATENDIDA'
  const amount = watch('montoCompra') || 0
  const lateBonus = watch('bonoSalidaTarde')
  const mealBonus = watch('bonoComida')

  const visibleBranches = useMemo(() => {
    const merged = new Map(sucursales.map((branch) => [branch.id, branch]))
    if (user?.sucursal && !merged.has(user.sucursal.id)) merged.set(user.sucursal.id, user.sucursal)
    return [...merged.values()]
  }, [sucursales, user?.sucursal])

  const sellers = useMemo(() => {
    const matched = employees.filter((employee) => (employee.position?.nombre ?? employee.puesto).trim().toUpperCase().includes('VENDEDOR'))
    return matched.length > 0 ? matched : employees
  }, [employees])
  const facialists = useMemo(() => {
    const matched = employees.filter((employee) => (employee.position?.nombre ?? employee.puesto).trim().toUpperCase().includes('FACIALISTA'))
    return matched.length > 0 ? matched : employees
  }, [employees])

  useEffect(() => {
    if (!form.getValues('sucursalId') && visibleBranches.length === 1 && visibleBranches[0]) {
      setValue('sucursalId', visibleBranches[0].id, { shouldValidate: true })
    }
  }, [form, setValue, visibleBranches])

  useEffect(() => {
    if (!form.getValues('facialistaId') && user?.empleadoId && facialists.some((employee) => employee.id === user.empleadoId)) {
      setValue('facialistaId', user.empleadoId, { shouldValidate: true })
    }
  }, [facialists, form, setValue, user?.empleadoId])

  const employeeOption = (employee: { id: string; nombreCompleto: string }) => ({ value: employee.id, label: employee.nombreCompleto })
  const conceptLabels: Record<TipoCompraCita, string> = {
    PAGO_NETO: text.net,
    COMPRA_CON_APARTADO: text.withDeposit,
    PAGO_DE_APARTADO: text.depositPayment,
  }
  const attentionLabels: Record<TipoAtencionCita, string> = { FACIAL: text.facial, FACIAL_DOBLE: text.facialDouble }
  const statusLabels: Record<EstatusCita, string> = { ATENDIDA: text.attended, NO_LLEGO: text.noShow, CANCELADA: text.cancelled }

  const summary = useMemo(() => records.reduce((acc, record) => ({
    withPurchase: acc.withPurchase + (record.tipoCompra ? 1 : 0),
    total: acc.total + record.total,
  }), { withPurchase: 0, total: 0 }), [records])

  const columns = useMemo<ColumnDef<RegistroCita>[]>(() => [
    { accessorKey: 'fecha', header: text.date.toUpperCase(), cell: ({ row }) => formatDate(row.original.fecha, 'dd/MM/yyyy', locale) },
    { accessorKey: 'hora', header: text.time.toUpperCase(), cell: ({ row }) => row.original.hora ?? '—' },
    { accessorKey: 'tipoAtencion', header: text.attentionType.toUpperCase(), cell: ({ row }) => attentionLabels[row.original.tipoAtencion] },
    {
      accessorKey: 'estatus',
      header: text.status.toUpperCase(),
      cell: ({ row }) => <Badge variant={row.original.estatus === 'ATENDIDA' ? 'outline' : row.original.estatus === 'NO_LLEGO' ? 'destructive' : 'secondary'}>{statusLabels[row.original.estatus].toUpperCase()}</Badge>,
    },
    { accessorKey: 'nombreCliente', header: text.client.toUpperCase() },
    { accessorKey: 'sucursalNombre', header: text.branch.toUpperCase() },
    { accessorKey: 'vendedorNombre', header: text.seller.toUpperCase() },
    { accessorKey: 'facialistaNombre', header: text.facialist.toUpperCase() },
    {
      id: 'purchase',
      accessorFn: (row) => row.tipoCompra ? `${conceptLabels[row.tipoCompra]} ${row.total}` : text.none,
      header: text.purchaseColumn.toUpperCase(),
      cell: ({ row }) => row.original.tipoCompra ? (
        <div><div>{conceptLabels[row.original.tipoCompra]}</div><div className="number-display text-xs">{formatCurrency(row.original.total)}</div></div>
      ) : <Badge variant="secondary">{text.none.toUpperCase()}</Badge>,
    },
    {
      id: 'bonuses',
      accessorFn: (row) => [row.bonoSalidaTarde ? text.late : '', row.bonoComida ? text.meal : ''].filter(Boolean).join(' ') || text.noBonus,
      header: text.bonusColumn.toUpperCase(),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.bonoSalidaTarde && <Badge variant="outline">{text.late.toUpperCase()}</Badge>}
          {row.original.bonoComida && <Badge variant="outline">{text.meal.toUpperCase()}</Badge>}
          {!row.original.bonoSalidaTarde && !row.original.bonoComida && <span className="text-xs text-[color:var(--text-muted)]">{text.noBonus}</span>}
        </div>
      ),
    },
    { accessorKey: 'creadoPorNombre', header: text.registeredBy.toUpperCase() },
    {
      id: 'actions',
      header: t.common.actions.toUpperCase(),
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label={`${text.edit}: ${row.original.nombreCliente}`} title={text.edit} onClick={() => openEdit(row.original)} className="h-9 w-9 cursor-pointer">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`${text.delete}: ${row.original.nombreCliente}`} title={text.delete} onClick={() => setRecordToDelete(row.original)} className="h-9 w-9 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      meta: { align: 'right' },
    },
  ], [attentionLabels, conceptLabels, locale, statusLabels, t.common.actions, text])

  async function onSubmit(data: AppointmentForm) {
    try {
      const input = {
        fecha: data.fecha,
        hora: data.hora,
        tipoAtencion: data.tipoAtencion,
        estatus: data.estatus,
        nombreCliente: data.nombreCliente.trim(),
        sucursalId: data.sucursalId,
        vendedorId: data.vendedorId,
        facialistaId: data.facialistaId,
        tipoCompra: data.estatus === 'ATENDIDA' && data.compro ? data.tipoCompra as TipoCompraCita : null,
        montoCompra: data.estatus === 'ATENDIDA' && data.compro ? data.montoCompra : 0,
        bonoSalidaTarde: data.estatus === 'ATENDIDA' && data.bonoSalidaTarde,
        bonoComida: data.estatus === 'ATENDIDA' && data.bonoComida,
      }
      if (editing) {
        await update(editing.id, input)
        toast.success(text.updated)
      } else {
        await add(input)
        toast.success(text.saved)
      }
      setEditing(null)
      reset({
        fecha: data.fecha, hora: '', tipoAtencion: data.tipoAtencion, estatus: 'ATENDIDA', nombreCliente: '', sucursalId: data.sucursalId, vendedorId: '', facialistaId: data.facialistaId,
        compro: false, tipoCompra: '', montoCompra: 0, bonoSalidaTarde: false, bonoComida: false,
      })
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : editing ? 'No se pudo actualizar la cita' : 'No se pudo registrar la cita')
    }
  }

  function openEdit(record: RegistroCita) {
    setEditing(record)
    reset({
      fecha: record.fecha,
      hora: record.hora ?? '',
      tipoAtencion: record.tipoAtencion,
      estatus: record.estatus,
      nombreCliente: record.nombreCliente,
      sucursalId: record.sucursalId,
      vendedorId: record.vendedorId,
      facialistaId: record.facialistaId,
      compro: record.tipoCompra !== null,
      tipoCompra: record.tipoCompra ?? '',
      montoCompra: record.montoCompra,
      bonoSalidaTarde: record.bonoSalidaTarde,
      bonoComida: record.bonoComida,
    })
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function cancelEdit() {
    setEditing(null)
    reset({
      fecha: todayISO(), hora: '', tipoAtencion: 'FACIAL', estatus: 'ATENDIDA', nombreCliente: '',
      sucursalId: visibleBranches.length === 1 ? visibleBranches[0]?.id ?? '' : '',
      vendedorId: '', facialistaId: user?.empleadoId && facialists.some((employee) => employee.id === user.empleadoId) ? user.empleadoId : '',
      compro: false, tipoCompra: '', montoCompra: 0, bonoSalidaTarde: false, bonoComida: false,
    })
  }

  async function handleDelete() {
    if (!recordToDelete) return
    setDeleting(true)
    try {
      await remove(recordToDelete.id)
      if (editing?.id === recordToDelete.id) cancelEdit()
      toast.success(text.deleted)
      setRecordToDelete(null)
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la cita')
    } finally {
      setDeleting(false)
    }
  }

  function selectPurchase(value: boolean) {
    setValue('compro', value, { shouldValidate: true })
    if (!value) {
      setValue('tipoCompra', '', { shouldValidate: true })
      setValue('montoCompra', 0, { shouldValidate: true })
    }
  }

  function selectStatus(value: EstatusCita) {
    setValue('estatus', value, { shouldValidate: true })
    if (value !== 'ATENDIDA') {
      setValue('compro', false)
      setValue('tipoCompra', '')
      setValue('montoCompra', 0)
      setValue('bonoSalidaTarde', false)
      setValue('bonoComida', false)
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="page-title uppercase">{text.title}</h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">{text.description}</p>
      </div>

      {editing && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--color-gold)] bg-[color:var(--accent-hover)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Pencil className="h-4 w-4 shrink-0" />
            <div className="min-w-0"><div className="text-xs font-semibold uppercase tracking-[0.12em]">{text.editing}</div><div className="truncate text-sm">{editing.nombreCliente} · {formatDate(editing.fecha, 'dd/MM/yyyy', locale)} {editing.hora ?? ''}</div></div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={cancelEdit} className="cursor-pointer"><X className="mr-2 h-4 w-4" />{text.cancelEdit}</Button>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="scroll-mt-4 space-y-5">
        <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
          <CardHeader>
            <CardTitle className="section-heading uppercase">{text.service}</CardTitle>
            <CardDescription>{text.serviceHelp}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="appointment-date" className="uppercase">{text.date}</Label>
              <Controller name="fecha" control={control} render={({ field }) => <DatePicker id="appointment-date" value={field.value} onChange={field.onChange} />} />
              {errors.fecha && <p className="text-xs text-red-500">{errors.fecha.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment-time" className="uppercase">{text.time}</Label>
              <Input id="appointment-time" type="time" step="60" aria-invalid={Boolean(errors.hora)} aria-describedby={errors.hora ? 'appointment-time-error' : undefined} className="tabular-nums" {...register('hora')} />
              {errors.hora && <p id="appointment-time-error" className="text-xs text-red-500">{errors.hora.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-name" className="uppercase">{text.client}</Label>
              <Input id="client-name" autoComplete="off" className="uppercase" {...register('nombreCliente')} />
              {errors.nombreCliente && <p className="text-xs text-red-500">{errors.nombreCliente.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="uppercase">{text.attentionType}</Label>
              <Controller name="tipoAtencion" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{attentionTypes.map((type) => <SelectItem key={type} value={type}>{attentionLabels[type]}</SelectItem>)}</SelectContent></Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label className="uppercase">{text.status}</Label>
              <Controller name="estatus" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => selectStatus(value as EstatusCita)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{appointmentStatuses.map((appointmentStatus) => <SelectItem key={appointmentStatus} value={appointmentStatus}>{statusLabels[appointmentStatus]}</SelectItem>)}</SelectContent></Select>
              )} />
              {errors.estatus && <p className="text-xs text-red-500">{errors.estatus.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="uppercase">{text.branch}</Label>
              <Controller name="sucursalId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder={text.branch} /></SelectTrigger><SelectContent>{visibleBranches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.nombre}</SelectItem>)}</SelectContent></Select>
              )} />
              {errors.sucursalId && <p className="text-xs text-red-500">{errors.sucursalId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="uppercase">{text.seller}</Label>
              <Controller name="vendedorId" control={control} render={({ field }) => <Combobox options={sellers.map(employeeOption)} value={field.value} onValueChange={field.onChange} placeholder={text.seller} searchPlaceholder={text.searchSeller} emptyMessage={text.searchSeller} disabled={catalogsLoading} />} />
              {errors.vendedorId && <p className="text-xs text-red-500">{errors.vendedorId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="uppercase">{text.facialist}</Label>
              <Controller name="facialistaId" control={control} render={({ field }) => <Combobox options={facialists.map(employeeOption)} value={field.value} onValueChange={field.onChange} placeholder={text.facialist} searchPlaceholder={text.searchFacialist} emptyMessage={text.searchFacialist} disabled={catalogsLoading} />} />
              {errors.facialistaId && <p className="text-xs text-red-500">{errors.facialistaId.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
          <CardHeader>
            <CardTitle className="section-heading uppercase">{text.purchase}</CardTitle>
            <CardDescription>{text.purchaseHelp}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {attended ? (
              <>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium uppercase">{text.boughtQuestion}</legend>
              <div className="grid max-w-xl grid-cols-2 gap-2 rounded-xl bg-[color:var(--bg-primary)] p-1.5">
                <button type="button" aria-pressed={!bought} onClick={() => selectPurchase(false)} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)] ${!bought ? 'bg-[var(--bg-card)] text-[color:var(--text-primary)] shadow-sm' : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'}`}><X className="h-4 w-4" />{text.no}</button>
                <button type="button" aria-pressed={bought} onClick={() => selectPurchase(true)} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)] ${bought ? 'bg-[var(--color-green-olive)] text-white shadow-sm' : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'}`}><Check className="h-4 w-4" />{text.yes}</button>
              </div>
            </fieldset>

            {bought && (
              <div className="grid gap-5 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] p-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)]">
                <div className="space-y-2">
                  <Label className="uppercase">{text.concept}</Label>
                  <Controller name="tipoCompra" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder={text.concept} /></SelectTrigger><SelectContent>{purchaseTypes.map((type) => <SelectItem key={type} value={type}>{conceptLabels[type]}</SelectItem>)}</SelectContent></Select>
                  )} />
                  {errors.tipoCompra && <p className="text-xs text-red-500">{errors.tipoCompra.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase-amount" className="uppercase">{text.amount}</Label>
                  <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--text-muted)]">$</span><Input id="purchase-amount" type="number" min="0" step="0.01" inputMode="decimal" className="pl-7 text-right tabular-nums" {...register('montoCompra')} /></div>
                  {errors.montoCompra && <p className="text-xs text-red-500">{errors.montoCompra.message}</p>}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium uppercase">{text.bonuses}</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:max-w-2xl">
                <button type="button" aria-pressed={lateBonus} onClick={() => setValue('bonoSalidaTarde', !lateBonus)} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)] ${lateBonus ? 'border-[color:var(--color-gold)] bg-[color:var(--accent-hover)]' : 'border-[color:var(--border-color)] hover:bg-[color:var(--bg-primary)]'}`}><Clock3 className="h-4 w-4" /><span className="flex-1">{text.late}</span>{lateBonus && <Check className="h-4 w-4" />}</button>
                <button type="button" aria-pressed={mealBonus} onClick={() => setValue('bonoComida', !mealBonus)} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)] ${mealBonus ? 'border-[color:var(--color-gold)] bg-[color:var(--accent-hover)]' : 'border-[color:var(--border-color)] hover:bg-[color:var(--bg-primary)]'}`}><Utensils className="h-4 w-4" /><span className="flex-1">{text.meal}</span>{mealBonus && <Check className="h-4 w-4" />}</button>
              </div>
            </div>
              </>
            ) : (
              <div role="status" className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] p-5 text-sm text-[color:var(--text-muted)]">
                {text.notAttendedHelp}
              </div>
            )}

            <div className="flex flex-col gap-4 border-t border-[color:var(--border-color)] pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div><div className="label-caps">{text.total}</div><div className="number-display mt-1 text-2xl">{formatCurrency(attended && bought ? Number(amount) : 0)}</div></div>
              <Button type="submit" disabled={isSubmitting || catalogsLoading} className="min-h-11 cursor-pointer sm:min-w-48"><Save className="mr-2 h-4 w-4" />{isSubmitting ? t.common.saving : editing ? text.update : text.save}</Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {(catalogsError || error) && <p role="alert" className="text-sm text-red-500">{catalogsError ?? error}</p>}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="section-heading uppercase">{text.recent}</h2><p className="mt-1 text-sm text-[color:var(--text-muted)]">{text.recentHelp}</p></div>
          <DateRangePicker value={range} onChange={setRange} fromLabel={t.common.from} toLabel={t.common.to} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[{ label: text.appointments, value: String(records.length), icon: ShoppingBag }, { label: text.withPurchase, value: String(summary.withPurchase), icon: Check }, { label: text.totalSales, value: formatCurrency(summary.total), icon: ShoppingBag }].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm"><CardContent className="flex items-center justify-between p-4"><div><div className="label-caps">{label}</div><div className="number-display mt-1 text-xl">{value}</div></div><Icon className="h-5 w-5 text-[color:var(--color-gold)]" /></CardContent></Card>
          ))}
        </div>
        {loading && loaded && <RefreshingDataIndicator label={t.common.refreshingData} />}
        {loading && !loaded ? <TableLoadingSkeleton columns={13} rows={6} label={text.loading} /> : <DataTable columns={columns} data={records} emptyMessage={text.noRecords} searchPlaceholder={text.search} pageSize={20} labels={dataTableLabels} />}
      </section>

      <AlertDialog open={Boolean(recordToDelete)} onOpenChange={(open) => { if (!open && !deleting) setRecordToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.deleteDescription} <span className="font-semibold text-[color:var(--text-primary)]">{recordToDelete?.nombreCliente}</span>. {t.common.deleteCannotUndo}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleDelete() }} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">{deleting ? text.deleting : text.deleteConfirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
