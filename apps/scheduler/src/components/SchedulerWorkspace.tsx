'use client'

import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
  toast,
} from '@cosmetics/ui'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarPlus2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeftRight,
  CircleHelp,
  Clock3,
  Copy,
  Filter,
  Globe,
  LayoutGrid,
  MapPinned,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  UserRoundPlus,
  Wallet,
} from 'lucide-react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  bookingStatusOptions,
  bookingStatuses,
  schedulerBranches,
  schedulerDayBlocks,
  schedulerDayBookings,
  schedulerLegendItems,
  schedulerProfessionals,
  schedulerReferenceDate,
  schedulerServices,
  schedulerTimeSlots,
  schedulerWeekBookings,
  type Booking,
  type BookingStatus,
  type Professional,
  type SchedulerView,
} from '@/lib/mock-scheduler-data'

const hourOptions = Array.from({ length: 14 }, (_value, index) => {
  const hour = 8 + index
  return hour.toString().padStart(2, '0')
})

const minuteOptions = ['00', '15', '30', '45']

function getMinutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function getAppointmentStyle(start: string, end: string): { top: string; height: string } {
  const startMinutes = getMinutesFromTime(start)
  const endMinutes = getMinutesFromTime(end)
  const baseMinutes = 10 * 60
  const pixelsPerMinute = 78 / 60
  return {
    top: `${(startMinutes - baseMinutes) * pixelsPerMinute}px`,
    height: `${Math.max((endMinutes - startMinutes) * pixelsPerMinute - 10, 34)}px`,
  }
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function getLegendIcon(icon: (typeof schedulerLegendItems)[number]['icon']) {
  const className = 'h-4 w-4'

  switch (icon) {
    case 'globe':
      return <Globe className={className} />
    case 'calendar-plus':
      return <CalendarPlus2 className={className} />
    case 'user-search':
      return <Filter className={className} />
    case 'house':
      return <MapPinned className={className} />
    case 'video':
      return <Smartphone className={className} />
    case 'package':
      return <Sparkles className={className} />
    case 'dollar':
      return <Wallet className={className} />
    case 'link':
      return <Copy className={className} />
    case 'wallet':
      return <Wallet className={className} />
    case 'scan':
      return <Search className={className} />
  }
}

function BookingDetailCard({ booking }: { booking: Booking }) {
  const statusMeta = bookingStatuses[booking.status]

  return (
    <div className="space-y-4 text-sm text-slate-700">
      <div className="space-y-1">
        <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">{booking.customerName}</p>
        <p className="text-sm text-slate-500">{booking.serviceName}</p>
      </div>
      <div className="grid gap-3">
        <Badge className={cn('w-fit rounded-full border px-3 py-1 text-xs font-semibold', statusMeta.badgeClassName)}>
          {statusMeta.label}
        </Badge>
        {booking.sessionLabel ? (
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            <span>{booking.sessionLabel}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-slate-400" />
          <span>{booking.start} - {booking.end}</span>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-slate-400" />
          <span>{booking.paymentLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-slate-400" />
          <span>{booking.phone || 'Sin teléfono registrado'}</span>
        </div>
      </div>
    </div>
  )
}

function NewBookingDialog({
  open,
  onOpenChange,
  selectedDate,
  professionals,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  professionals: Professional[]
}) {
  const [status, setStatus] = useState<BookingStatus>('reserved')
  const [hour, setHour] = useState('11')
  const [minute, setMinute] = useState('00')
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? '')
  const [serviceId, setServiceId] = useState(schedulerServices[0]?.id ?? '')

  function handleSave() {
    toast.success('Reserva mock creada', {
      description: 'La experiencia visual ya está lista para la siguiente fase de interacción real.',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scheduler-dialog max-h-[92vh] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-[1120px]">
        <div className="overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_34px_90px_rgba(15,23,42,0.18)]">
          <DialogHeader className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.95)_100%)] px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <DialogTitle className="text-3xl font-semibold tracking-[-0.04em] text-slate-800">
                  Nueva reserva
                </DialogTitle>
                <p className="mt-1 text-sm text-slate-500">Flujo simplificado, visualmente listo para iterar con negocio.</p>
              </div>
              <Select value={status} onValueChange={(value) => setStatus(value as BookingStatus)}>
                <SelectTrigger className="h-12 w-[210px] rounded-2xl border-slate-200 bg-white text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(bookingStatuses).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          <div className="space-y-5 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_20%)] px-5 py-5 md:px-6 md:py-6">
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
              <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Fecha</label>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg capitalize text-slate-700 shadow-sm">
                    {format(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Hora</label>
                    <Select value={hour} onValueChange={setHour}>
                      <SelectTrigger className="h-14 rounded-2xl border-slate-200 text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="pb-4 text-2xl text-slate-400">:</span>
                  <div className="space-y-2">
                    <label className="sr-only">Minuto</label>
                    <Select value={minute} onValueChange={setMinute}>
                      <SelectTrigger className="h-14 rounded-2xl border-slate-200 text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {minuteOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" className="mb-1 rounded-2xl text-base text-slate-700 underline-offset-4 hover:bg-transparent hover:underline">
                    Repetir
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Cliente</label>
                    <Input className="h-14 rounded-2xl border-slate-200 text-lg" placeholder="Busca por nombre, apellido, teléfono o email" />
                  </div>
                  <div className="flex items-end">
                    <Button className="h-14 rounded-2xl bg-[var(--scheduler-accent)] px-5 text-base hover:bg-[var(--scheduler-accent-strong)]">
                      <UserRoundPlus className="mr-2 h-5 w-5" />
                      Nuevo cliente
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Profesional</label>
                    <Select value={professionalId} onValueChange={setProfessionalId}>
                      <SelectTrigger className="h-14 rounded-2xl border-slate-200 text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id}>
                            {professional.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" className="h-14 rounded-2xl border-[var(--scheduler-accent)] px-4 text-[var(--scheduler-accent)]">
                      <Copy className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Servicios</label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger className="h-14 rounded-2xl border-slate-200 text-lg">
                      <SelectValue placeholder="Busca un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedulerServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-800">Información adicional</h3>
                <Sparkles className="h-5 w-5 text-[var(--scheduler-accent)]" />
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Precio</label>
                  <Input className="h-14 rounded-2xl border-slate-200 text-lg" placeholder="$0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Pagado</label>
                  <div className="flex h-14 items-center gap-6 rounded-2xl border border-slate-200 px-4">
                    <label className="flex items-center gap-2 text-base text-slate-700">
                      <input className="h-4 w-4 accent-[var(--scheduler-accent)]" name="paid" type="radio" />
                      Sí
                    </label>
                    <label className="flex items-center gap-2 text-base text-slate-700">
                      <input className="h-4 w-4 accent-[var(--scheduler-accent)]" defaultChecked name="paid" type="radio" />
                      No
                    </label>
                  </div>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Notas compartidas con el cliente</label>
                  <Textarea className="min-h-32 rounded-2xl border-slate-200" />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Nota interna</label>
                  <Textarea className="min-h-32 rounded-2xl border-slate-200" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
              <Button variant="outline" className="h-14 rounded-2xl border-slate-200 px-6 text-base">
                Cancelar
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button disabled className="h-14 rounded-2xl bg-slate-100 px-6 text-base text-slate-400 hover:bg-slate-100">
                  Agregar otra reserva
                </Button>
                <Button
                  className="h-14 rounded-2xl bg-[linear-gradient(135deg,var(--scheduler-accent)_0%,#7c52f5_100%)] px-6 text-base hover:opacity-95"
                  onClick={handleSave}
                >
                  <CalendarPlus2 className="mr-2 h-5 w-5" />
                  Guardar reserva
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SchedulerWorkspace() {
  const [selectedDate, setSelectedDate] = useState(schedulerReferenceDate)
  const [monthCursor, setMonthCursor] = useState(startOfMonth(schedulerReferenceDate))
  const [currentView, setCurrentView] = useState<SchedulerView>('day')
  const [selectedBranch, setSelectedBranch] = useState(schedulerBranches[0]?.id ?? 'opatra')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'active'>('active')
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<string[]>(
    schedulerProfessionals.slice(0, 5).map((professional) => professional.id),
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const visibleProfessionals = useMemo(() => {
    const selectedSet = new Set(selectedProfessionalIds)
    const result = schedulerProfessionals.filter((professional) => selectedSet.has(professional.id))
    return result.length > 0 ? result : schedulerProfessionals.slice(0, 1)
  }, [selectedProfessionalIds])

  const visibleBookings = useMemo(() => {
    return schedulerDayBookings.filter((booking) => {
      const matchesProfessional = visibleProfessionals.some((professional) => professional.id === booking.professionalId)
      const matchesStatus = statusFilter === 'active'
        ? booking.status !== 'no-show'
        : booking.status === statusFilter
      return matchesProfessional && matchesStatus
    })
  }, [statusFilter, visibleProfessionals])

  const visibleBlocks = useMemo(() => {
    return schedulerDayBlocks.filter((block) =>
      visibleProfessionals.some((professional) => professional.id === block.professionalId),
    )
  }, [visibleProfessionals])

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { locale: es, weekStartsOn: 1 })
    const end = endOfWeek(selectedDate, { locale: es, weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [selectedDate])

  function handleDateStep(direction: 'prev' | 'next') {
    const amount = direction === 'prev' ? -1 : 1
    setSelectedDate((current) => addDays(current, currentView === 'day' ? amount : amount * 7))
  }

  function toggleProfessional(professionalId: string) {
    setSelectedProfessionalIds((current) => {
      if (current.includes(professionalId)) {
        return current.length === 1 ? current : current.filter((id) => id !== professionalId)
      }
      return [...current, professionalId]
    })
  }

  function handleRefresh() {
    toast.success('Agenda actualizada', {
      description: 'Los datos mock se refrescaron para simular el comportamiento de tiempo real.',
    })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(195,165,131,0.14),transparent_20%),linear-gradient(180deg,#f3f5fa_0%,#eef3f8_100%)]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(90deg,#172230_0%,#1d2937_100%)] text-white shadow-[0_20px_50px_rgba(8,14,24,0.22)]">
        <div className="flex min-h-[92px] items-center justify-between gap-6 px-5 sm:px-6 xl:px-8">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-white/5 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(195,165,131,0.28),rgba(236,209,200,0.12))] ring-1 ring-white/10">
                <img alt="Keysar Cosmetics" className="h-8 w-8 object-contain" src="/logo.svg" />
              </div>
              <div>
                <p className="text-[1.55rem] font-semibold tracking-[-0.04em] text-white">Keysar Scheduler</p>
                <p className="text-[0.72rem] uppercase tracking-[0.34em] text-white/45">Agenda interna</p>
              </div>
            </div>
            <nav className="hidden items-center gap-2 xl:flex">
              {['Agenda', 'Clientes', 'Servicios', 'Reportes'].map((item, index) => (
                <button
                  key={item}
                  className={cn(
                    'rounded-full px-5 py-3 text-[0.95rem] font-medium transition',
                    index === 0
                      ? 'bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'text-white/60 hover:bg-white/6 hover:text-white',
                  )}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <button className="scheduler-header-button" type="button">
              <Search className="h-5 w-5" />
            </button>
            <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              Reservas Online
            </div>
            <button className="scheduler-header-button" type="button">
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
              ER
            </div>
          </div>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-92px)] grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.94)_100%)] px-5 py-6 backdrop-blur xl:sticky xl:top-[92px] xl:h-[calc(100vh-92px)] xl:overflow-y-auto">
          <div className="mb-6 flex items-center gap-3">
            <button className="scheduler-icon-toggle" type="button">
              <CalendarDays className="h-5 w-5" />
            </button>
            <button className="scheduler-icon-toggle scheduler-icon-toggle-active" type="button">
              <LayoutGrid className="h-5 w-5" />
            </button>
            <div className="ml-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white text-slate-500 shadow-[0_14px_30px_rgba(15,23,42,0.1)]">
              <ChevronLeft className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-5">
            <div className="scheduler-sidebar-card">
              <label className="scheduler-label">Sucursal</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="scheduler-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schedulerBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="scheduler-sidebar-card">
              <div className="mb-3 flex items-center justify-between">
                <label className="scheduler-label !mb-0">Profesional</label>
                <Badge className="rounded-full border-0 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {visibleProfessionals.length} activos
                </Badge>
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  className="w-full border-0 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
                  placeholder="Buscar profesional"
                />
              </div>

              <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
                {schedulerProfessionals.map((professional) => {
                  const isSelected = selectedProfessionalIds.includes(professional.id)
                  return (
                    <button
                      key={professional.id}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition-all duration-200',
                        isSelected
                          ? 'border-[rgba(143,99,255,0.22)] bg-[linear-gradient(135deg,rgba(143,99,255,0.08),rgba(255,255,255,0.95))] shadow-[0_12px_28px_rgba(143,99,255,0.08)]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                      )}
                      onClick={() => toggleProfessional(professional.id)}
                      type="button"
                    >
                      {professional.avatar ? (
                        <img alt={professional.name} className="h-12 w-12 rounded-2xl object-cover" src={professional.avatar} />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-300 text-sm font-semibold text-white">
                          {professional.shortName}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.98rem] font-semibold tracking-[-0.02em] text-slate-800">{professional.name}</p>
                        <p className="text-sm text-slate-400">Disponible hoy</p>
                      </div>
                      <div className={cn('h-3 w-3 rounded-full', isSelected ? 'bg-[var(--scheduler-accent)]' : 'bg-slate-200')} />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="scheduler-sidebar-card">
              <label className="scheduler-label">Estado de la reserva</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BookingStatus | 'active')}>
                <SelectTrigger className="scheduler-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bookingStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button className="scheduler-search-button" type="button">
              <Search className="h-5 w-5" />
              Búsqueda rápida de hora
            </button>

            <Card className="overflow-hidden rounded-[30px] border-white/80 bg-white/85 shadow-[0_22px_48px_rgba(15,23,42,0.09)]">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100" onClick={() => setMonthCursor((current) => subMonths(current, 1))} type="button">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="text-center">
                    <p className="text-lg font-semibold capitalize text-slate-800">{format(monthCursor, 'MMMM', { locale: es })}</p>
                    <p className="text-xs uppercase tracking-[0.26em] text-slate-400">{format(monthCursor, 'yyyy', { locale: es })}</p>
                  </div>
                  <button className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100" onClick={() => setMonthCursor((current) => addMonths(current, 1))} type="button">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Calendar
                  className="mx-auto"
                  locale={es}
                  mode="single"
                  month={monthCursor}
                  onMonthChange={setMonthCursor}
                  onSelect={(date) => {
                    if (date) setSelectedDate(date)
                  }}
                  selected={selectedDate}
                />
              </CardContent>
            </Card>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col px-4 py-5 sm:px-6 xl:px-8">
          <div className="mb-5 rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.7)_100%)] px-5 py-5 shadow-[0_22px_46px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-[22px] border border-slate-200 bg-white p-1.5 shadow-sm">
                    <button
                      className={cn('rounded-2xl px-5 py-2.5 text-sm font-semibold transition', currentView === 'day' ? 'bg-slate-900 text-white' : 'text-slate-500')}
                      onClick={() => setCurrentView('day')}
                      type="button"
                    >
                      Día
                    </button>
                    <button
                      className={cn('rounded-2xl px-5 py-2.5 text-sm font-semibold transition', currentView === 'week' ? 'bg-slate-900 text-white' : 'text-slate-500')}
                      onClick={() => setCurrentView('week')}
                      type="button"
                    >
                      Semana
                    </button>
                  </div>
                  <button className="rounded-[18px] border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm" onClick={() => setSelectedDate(schedulerReferenceDate)} type="button">
                    Hoy
                  </button>
                  <div className="flex items-center gap-1 rounded-[18px] border border-transparent bg-transparent">
                    <button className="rounded-full p-2.5 text-slate-500 transition hover:bg-white" onClick={() => handleDateStep('prev')} type="button">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <button className="rounded-full p-2.5 text-slate-500 transition hover:bg-white" onClick={() => handleDateStep('next')} type="button">
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h1 className="text-[clamp(2.4rem,4vw,3.5rem)] font-semibold tracking-[-0.06em] text-slate-800">
                    {currentView === 'day'
                      ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                      : `${format(weekDays[0] ?? selectedDate, "EEEE, d 'de' MMMM", { locale: es })} - ${format(weekDays[6] ?? selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}`}
                  </h1>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100/80 px-4 py-2 text-sm font-medium text-slate-500">
                    <MapPinned className="h-4 w-4" />
                    {schedulerBranches.find((branch) => branch.id === selectedBranch)?.name}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="scheduler-toolbar-button scheduler-toolbar-button-large" type="button">
                      <CircleHelp className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[680px] rounded-[28px] border-slate-200 bg-white p-5 shadow-[0_22px_56px_rgba(15,23,42,0.16)]">
                    <div className="mb-4">
                      <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Leyenda</p>
                      <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-800">Estados y origen</h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {schedulerLegendItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                            {getLegendIcon(item.icon)}
                          </div>
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <p className="text-sm italic text-slate-400">Actualizado hace 0 min</p>
                <div className="hidden h-6 w-px bg-slate-200 md:block" />
                <button className="scheduler-toolbar-button" onClick={handleRefresh} type="button">
                  <RefreshCcw className="h-4 w-4" />
                </button>
                <button className="scheduler-toolbar-button" type="button">
                  <ChevronsLeftRight className="h-4 w-4" />
                </button>
                <button className="scheduler-toolbar-button" type="button">
                  <Filter className="h-4 w-4" />
                </button>
                <button className="scheduler-toolbar-button" type="button">
                  <Copy className="h-4 w-4" />
                </button>
                <Button
                  className="h-14 rounded-[22px] bg-[linear-gradient(135deg,var(--scheduler-accent)_0%,#7c52f5_100%)] px-6 text-lg font-medium shadow-[0_18px_36px_rgba(124,82,245,0.28)] hover:opacity-95"
                  onClick={() => setIsDialogOpen(true)}
                >
                  Nuevo
                  <Plus className="ml-3 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden rounded-[34px] border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.76)_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur">
            <CardContent className="p-0">
              {currentView === 'day' ? (
                <div className="scheduler-grid-wrapper overflow-x-auto">
                  <div className="scheduler-grid" style={{ gridTemplateColumns: `96px repeat(${visibleProfessionals.length}, var(--scheduler-column-width))` }}>
                    <div className="scheduler-grid-corner" />
                    {visibleProfessionals.map((professional) => (
                      <div key={professional.id} className="scheduler-column-header">
                        {professional.avatar ? (
                          <img alt={professional.name} className="h-11 w-11 rounded-2xl object-cover ring-2 ring-white" src={professional.avatar} />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-300 text-sm font-semibold text-white">
                            {professional.shortName}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-800">{professional.name}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Cabina lista</p>
                        </div>
                      </div>
                    ))}

                    {schedulerTimeSlots.map((slot) => (
                      <div key={slot} className="contents">
                        <div className="scheduler-time-cell">{slot}</div>
                        {visibleProfessionals.map((professional) => (
                          <div key={`${slot}-${professional.id}`} className="scheduler-body-cell" />
                        ))}
                      </div>
                    ))}

                    {visibleBlocks.map((block) => {
                      const professionalIndex = visibleProfessionals.findIndex((professional) => professional.id === block.professionalId)
                      if (professionalIndex === -1) return null
                      const style = getAppointmentStyle(block.start, block.end)

                      return (
                        <div
                          key={block.id}
                          className={cn(
                            'scheduler-appointment pointer-events-none',
                            block.variant === 'unavailable' ? 'scheduler-appointment-unavailable' : 'scheduler-appointment-blocked',
                          )}
                          style={{
                            ...style,
                            left: `calc(96px + ${professionalIndex} * var(--scheduler-column-width) + 10px)`,
                            width: 'calc(var(--scheduler-column-width) - 20px)',
                          }}
                        >
                          <p className="truncate text-[0.88rem] font-semibold">{block.label}</p>
                          <p className="text-[0.7rem] uppercase tracking-[0.16em]">{block.start} - {block.end}</p>
                        </div>
                      )
                    })}

                    {visibleBookings.map((booking) => {
                      const professionalIndex = visibleProfessionals.findIndex((professional) => professional.id === booking.professionalId)
                      if (professionalIndex === -1) return null
                      const style = getAppointmentStyle(booking.start, booking.end)
                      const statusMeta = bookingStatuses[booking.status]

                      return (
                        <Popover key={booking.id}>
                          <PopoverTrigger asChild>
                            <button
                              className={cn('scheduler-appointment scheduler-appointment-booking text-left transition hover:-translate-y-0.5', statusMeta.cardClassName)}
                              style={{
                                ...style,
                                left: `calc(96px + ${professionalIndex} * var(--scheduler-column-width) + 10px)`,
                                width: 'calc(var(--scheduler-column-width) - 20px)',
                              }}
                              type="button"
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <span className={cn('h-2.5 w-2.5 rounded-full', statusMeta.dotClassName)} />
                                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] opacity-70">
                                  {booking.start}
                                </span>
                              </div>
                              <p className="truncate text-[1rem] font-semibold tracking-[-0.02em]">{booking.customerName}</p>
                              <p className="mt-1 truncate text-[0.78rem] uppercase tracking-[0.14em] opacity-75">{booking.serviceName}</p>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[340px] rounded-[24px] border-white bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
                            <BookingDetailCard booking={booking} />
                          </PopoverContent>
                        </Popover>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="scheduler-grid-wrapper overflow-x-auto">
                  <div className="scheduler-grid" style={{ gridTemplateColumns: '96px repeat(7, var(--scheduler-column-width))' }}>
                    <div className="scheduler-grid-corner flex items-center justify-center">
                      <Badge className="rounded-full bg-slate-100 px-4 py-1 text-slate-500">
                        {visibleProfessionals[0]?.name ?? 'Profesional'}
                      </Badge>
                    </div>
                    {weekDays.map((day) => (
                      <div key={day.toISOString()} className="scheduler-column-header">
                        <div>
                          <p className="text-base font-semibold capitalize text-slate-800">{format(day, 'EEEE dd/MM', { locale: es })}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            {isSameDay(day, selectedDate) ? 'Fecha activa' : 'Disponible'}
                          </p>
                        </div>
                      </div>
                    ))}
                    {schedulerTimeSlots.map((slot) => (
                      <div key={`week-${slot}`} className="contents">
                        <div className="scheduler-time-cell">{slot}</div>
                        {weekDays.map((day) => (
                          <div key={`${slot}-${day.toISOString()}`} className="scheduler-body-cell" />
                        ))}
                      </div>
                    ))}
                    {schedulerWeekBookings.map((booking) => {
                      const style = getAppointmentStyle(booking.start, booking.end)
                      return (
                        <div
                          key={booking.id}
                          className="scheduler-appointment scheduler-appointment-blocked text-left"
                          style={{
                            ...style,
                            left: `calc(96px + ${booking.dayOffset} * var(--scheduler-column-width) + 10px)`,
                            width: 'calc(var(--scheduler-column-width) - 20px)',
                          }}
                        >
                          <p className="truncate text-sm font-semibold">{booking.customerName}</p>
                          <p className="text-xs uppercase tracking-[0.12em]">{booking.start} - {booking.end}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-[30px] border-white/80 bg-white/78 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Resumen del día</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-800">
                      {visibleBookings.length} reservas visibles
                    </h2>
                  </div>
                  <Badge className="rounded-full bg-[var(--scheduler-accent)]/10 px-3 py-1 text-[var(--scheduler-accent)]">
                    Fase visual
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="scheduler-stat-card">
                    <p className="text-sm text-slate-500">Ingreso estimado</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-800">{formatMoney(18600)}</p>
                  </div>
                  <div className="scheduler-stat-card">
                    <p className="text-sm text-slate-500">Pagadas</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-800">5</p>
                  </div>
                  <div className="scheduler-stat-card">
                    <p className="text-sm text-slate-500">En espera</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-800">2</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[30px] border-white/80 bg-white/78 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <CardContent className="p-6">
                <div className="mb-5">
                  <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Siguiente fase</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-800">Qué sigue</h2>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    Conectar citas, clientes y servicios a modelos Prisma compartidos.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    Implementar interacción real de alta/edición desde celdas y modal.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    Validar traslapes, disponibilidad y bloqueo de horarios.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <NewBookingDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        professionals={schedulerProfessionals}
        selectedDate={selectedDate}
      />
    </div>
  )
}
