'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from '@cosmetics/ui'
import { CalendarDays, ChevronDown, ChevronUp, Clock3, Copy, Sparkles, UserRoundPlus, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  bookingStatuses,
  type AvailabilityBlock,
  type Booking,
  type BookingStatus,
  type BookingStatusColors,
  type BranchOption,
  type Professional,
  type ServiceOption,
} from '@/lib/scheduler-presentation'
import {
  findSchedulerClients,
  normalizeClientPhone,
  type SchedulerClient,
} from '@/lib/scheduler-client-presentation'
import {
  formatMoney,
  getAvailableBookingStartTimes,
  type BookingDraft,
} from './scheduler-utils'

interface SchedulerBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branches: BranchOption[]
  selectedBranch: string
  onBranchChange: (branchId: string) => void
  bookings: Booking[]
  availabilityBlocks: AvailabilityBlock[]
  clients: SchedulerClient[]
  services: ServiceOption[]
  columns?: Professional[]
  draft: BookingDraft
  statusColors: BookingStatusColors
  onDraftChange: (draft: BookingDraft) => void
  onSave: () => void
  availableStartTimes?: string[]
  availabilityLoading?: boolean
  availabilityError?: string | null
  onClientSearchQueryChange?: (query: string) => void
  allowedStatuses?: BookingStatus[]
  showCommercialFields?: boolean
  showInternalNote?: boolean
  serviceLocked?: boolean
  saving?: boolean
  canCreateClient?: boolean
}

export function SchedulerBookingDialog({
  open,
  onOpenChange,
  branches,
  selectedBranch,
  onBranchChange,
  bookings,
  availabilityBlocks,
  clients,
  services,
  columns = [],
  draft,
  statusColors,
  onDraftChange,
  onSave,
  availableStartTimes: canonicalStartTimes,
  availabilityLoading = false,
  availabilityError = null,
  onClientSearchQueryChange,
  allowedStatuses,
  showCommercialFields = true,
  showInternalNote = true,
  serviceLocked = false,
  saving = false,
  canCreateClient = true,
}: SchedulerBookingDialogProps) {
  const selectedService = services.find((service) => service.id === draft.serviceId)
  const isEditing = Boolean(draft.bookingId)
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false)
  const [newClientFirstName, setNewClientFirstName] = useState('')
  const [newClientLastName, setNewClientLastName] = useState('')
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [clientSuggestionsOpen, setClientSuggestionsOpen] = useState(false)
  const selectedDateKey = format(draft.date, 'yyyy-MM-dd')
  const localStartTimes = useMemo(
    () =>
      getAvailableBookingStartTimes({
        bookings,
        availabilityBlocks,
        dateKey: selectedDateKey,
        professionalId: draft.professionalId,
        durationMinutes: selectedService?.durationMinutes ?? 60,
        allowBlockedTimes: true,
        ...(draft.bookingId ? { editingBookingId: draft.bookingId } : {}),
      }),
    [
      availabilityBlocks,
      bookings,
      draft.bookingId,
      draft.professionalId,
      selectedDateKey,
      selectedService?.durationMinutes,
    ],
  )
  const availableStartTimes = canonicalStartTimes ?? localStartTimes
  const availableHourOptions = useMemo(
    () => [...new Set(availableStartTimes.map((time) => time.split(':')[0] ?? ''))],
    [availableStartTimes],
  )
  const availableMinuteOptions = useMemo(
    () =>
      availableStartTimes
        .filter((time) => time.startsWith(`${draft.hour}:`))
        .map((time) => time.split(':')[1] ?? '00'),
    [availableStartTimes, draft.hour],
  )
  const selectedStartTime = `${draft.hour}:${draft.minute}`
  const hasAvailableTimes = availableStartTimes.length > 0
  const selectedTimeIsAvailable = availableStartTimes.includes(selectedStartTime)
  const canSaveAtSelectedTime = draft.status === 'canceled' || selectedTimeIsAvailable
  const clientSuggestions = useMemo(
    () => findSchedulerClients(clients, clientSearchQuery),
    [clientSearchQuery, clients],
  )
  const exactPhoneMatch = useMemo(() => {
    const normalizedPhone = normalizeClientPhone(draft.phone)
    if (!normalizedPhone) return undefined
    return clients.find((client) => client.normalizedPhone === normalizedPhone)
  }, [clients, draft.phone])

  useEffect(() => {
    if (!open) {
      setIsNewClientOpen(false)
      setIsAdditionalInfoOpen(false)
      setNewClientFirstName('')
      setNewClientLastName('')
      setClientSearchQuery('')
      setClientSuggestionsOpen(false)
    } else {
      setClientSearchQuery(draft.customerName)
    }
  }, [draft.customerName, open])

  useEffect(() => {
    if (
      !open ||
      draft.status === 'canceled' ||
      !hasAvailableTimes ||
      selectedTimeIsAvailable
    ) {
      return
    }

    const [hour = '09', minute = '00'] = availableStartTimes[0]?.split(':') ?? []
    onDraftChange({ ...draft, hour, minute })
  }, [
    availableStartTimes,
    draft,
    hasAvailableTimes,
    onDraftChange,
    open,
    selectedTimeIsAvailable,
  ])

  function patchDraft(patch: Partial<BookingDraft>) {
    onDraftChange({ ...draft, ...patch })
  }

  function handleNewClientNameChange(firstName: string, lastName: string) {
    setNewClientFirstName(firstName)
    setNewClientLastName(lastName)
    patchDraft({
      clientId: null,
      customerName: [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
    })
  }

  function selectClient(client: SchedulerClient) {
    const [firstName = '', ...lastNameParts] = client.fullName.split(' ')
    setNewClientFirstName(firstName)
    setNewClientLastName(lastNameParts.join(' '))
    setClientSearchQuery(client.fullName)
    setClientSuggestionsOpen(false)
    setIsNewClientOpen(false)
    patchDraft({
      clientId: client.id,
      customerName: client.fullName,
      customerEmail: client.email,
      phone: client.phone,
    })
  }

  function handleClientSearchChange(value: string) {
    setClientSearchQuery(value)
    onClientSearchQueryChange?.(value)
    setClientSuggestionsOpen(findSchedulerClients(clients, value).length > 0)
    if (draft.clientId) {
      patchDraft({
        clientId: null,
        customerName: '',
        customerEmail: '',
        phone: '',
      })
    }
  }

  function handlePhoneChange(value: string) {
    const selectedClient = clients.find((client) => client.id === draft.clientId)
    const keepsSelectedClient =
      selectedClient &&
      selectedClient.normalizedPhone === normalizeClientPhone(value)
    patchDraft({
      clientId: keepsSelectedClient ? selectedClient.id : null,
      phone: value,
    })
  }

  function openNewClientForm() {
    const nextOpen = !isNewClientOpen
    setIsNewClientOpen(nextOpen)
    if (!nextOpen) return

    const queryHasLetters = /[a-záéíóúñü]/i.test(clientSearchQuery)
    const queryPhone = normalizeClientPhone(clientSearchQuery)
    const [firstName = '', ...lastNameParts] = queryHasLetters
      ? clientSearchQuery.trim().split(/\s+/)
      : []
    const lastName = lastNameParts.join(' ')
    setNewClientFirstName(firstName)
    setNewClientLastName(lastName)
    setClientSuggestionsOpen(false)
    patchDraft({
      clientId: null,
      customerName: queryHasLetters
        ? [firstName, lastName].filter(Boolean).join(' ')
        : '',
      phone: !queryHasLetters && queryPhone ? clientSearchQuery : draft.phone,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="scheduler-dialog max-h-[92vh] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[1020px]"
        hideCloseButton
      >
        <div className="scheduler-modal-shell grid max-h-[92vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[30px]">
          <DialogHeader className="border-b border-[rgba(236,209,200,0.88)] px-5 py-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="label-caps">Agenda</p>
                <DialogTitle className="mt-1 text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--scheduler-ink-strong)] md:text-[1.95rem]">
                  {isEditing ? 'Editar reserva' : 'Nueva reserva'}
                </DialogTitle>
                <p className="mt-1 text-[0.92rem] text-slate-500">
                  {isEditing
                    ? 'Ajusta los datos de la cita seleccionada antes de guardarla.'
                    : 'Captura rapida para agregar una nueva reserva a la agenda.'}
                </p>
              </div>
              <div className="flex items-center gap-3 self-start">
                <Select value={draft.status} onValueChange={(value) => patchDraft({ status: value as BookingStatus })}>
                  <SelectTrigger className="scheduler-modal-select-trigger h-12 w-[220px] text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="scheduler-modal-select-content">
                    {Object.entries(bookingStatuses).filter(([value]) => !allowedStatuses || allowedStatuses.includes(value as BookingStatus)).map(([value, meta]) => (
                      <SelectItem key={value} className="scheduler-modal-select-item" value={value}>
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3.5 w-3.5 rounded-full"
                            style={{ backgroundColor: statusColors[value as BookingStatus] }}
                          />
                          <span>{meta.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(236,209,200,0.95)] bg-white text-slate-500 shadow-sm transition hover:bg-[rgba(245,237,228,0.85)] hover:text-slate-700"
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="scheduler-modal-body bg-[linear-gradient(180deg,rgba(243,240,233,0.4)_0%,rgba(255,255,255,0.22)_100%)]">
            <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
              <div className="scheduler-modal-section rounded-[24px] p-4 md:p-5">
              <div className="mb-4">
                <p className="text-[0.95rem] font-medium text-slate-500">Informacion requerida</p>
              </div>
              <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
                <div className="space-y-2">
                  <label className="scheduler-modal-label">Fecha</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="scheduler-modal-input flex w-full items-center justify-between px-4 py-3 text-left capitalize"
                        type="button"
                      >
                        <span>{format(draft.date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[320px] rounded-[24px] border-[rgba(236,209,200,0.95)] bg-white p-3 shadow-[0_18px_48px_rgba(79,61,43,0.16)]">
                      <Calendar
                        className="w-full"
                        locale={es}
                        mode="single"
                        month={draft.date}
                        onMonthChange={(date) => patchDraft({ date })}
                        onSelect={(date) => {
                          if (date) patchDraft({ date })
                        }}
                        selected={draft.date}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="scheduler-booking-time-grid grid grid-cols-[1fr_auto_1fr_auto] items-end gap-3">
                  <div className="space-y-2">
                    <label className="scheduler-modal-label">Hora</label>
                    <Select
                      disabled={!hasAvailableTimes}
                      value={availableHourOptions.includes(draft.hour) ? draft.hour : ''}
                      onValueChange={(value) => {
                        const firstAvailableMinute =
                          availableStartTimes
                            .find((time) => time.startsWith(`${value}:`))
                            ?.split(':')[1] ?? '00'
                        patchDraft({ hour: value, minute: firstAvailableMinute })
                      }}
                    >
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue placeholder="Sin horarios" />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[280px]">
                        {availableHourOptions.map((option) => (
                          <SelectItem key={option} className="scheduler-modal-select-item" value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="pb-4 text-2xl text-[var(--color-gold)]">:</span>
                  <div className="space-y-2">
                    <label className="sr-only">Minuto</label>
                    <Select
                      disabled={!hasAvailableTimes}
                      value={availableMinuteOptions.includes(draft.minute) ? draft.minute : ''}
                      onValueChange={(value) => patchDraft({ minute: value })}
                    >
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[240px]">
                        {availableMinuteOptions.map((option) => (
                          <SelectItem key={option} className="scheduler-modal-select-item" value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    className="mb-1 rounded-2xl text-base text-[var(--scheduler-ink-strong)] underline-offset-4 hover:bg-transparent hover:text-[var(--scheduler-accent-strong)] hover:underline"
                    disabled
                    title="Las reservas recurrentes aún no tienen contrato operativo."
                  >
                    Repetir
                  </Button>
                </div>
              </div>
              {availabilityLoading ? (
                <p className="mt-3 text-sm font-medium text-slate-600" role="status">
                  Consultando disponibilidad real…
                </p>
              ) : availabilityError ? (
                <p className="mt-3 text-sm font-medium text-rose-700" role="alert">
                  {availabilityError}
                </p>
              ) : !hasAvailableTimes && draft.status !== 'canceled' ? (
                <p className="mt-3 text-sm font-medium text-rose-700" role="status">
                  No hay horarios disponibles para este especialista, fecha y duración de servicio.
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-500" role="status">
                  Los horarios disponibles ya consideran jornada, bloqueos, capacidad y recursos en el servidor.
                </p>
              )}

              <div className="mt-6 grid gap-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <label className="scheduler-modal-label">Cliente</label>
                    <Popover
                      open={clientSuggestionsOpen && clientSuggestions.length > 0}
                      onOpenChange={setClientSuggestionsOpen}
                    >
                      <PopoverAnchor asChild>
                        <Input
                          autoComplete="off"
                          className="scheduler-modal-input"
                          placeholder="Escribe nombre, apellido o teléfono"
                          value={clientSearchQuery}
                          onChange={(event) => handleClientSearchChange(event.target.value)}
                          onFocus={() =>
                            setClientSuggestionsOpen(clientSuggestions.length > 0)
                          }
                        />
                      </PopoverAnchor>
                      <PopoverContent
                        align="start"
                        className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-[rgba(236,209,200,0.95)] bg-white p-2 shadow-[0_8px_24px_rgba(79,61,43,0.14)]"
                        onOpenAutoFocus={(event) => event.preventDefault()}
                      >
                        <p className="px-3 py-2 text-xs font-semibold text-slate-500">
                          Clientes encontrados
                        </p>
                        <div className="space-y-1">
                          {clientSuggestions.map((client) => (
                            <button
                              key={client.id}
                              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[rgba(245,237,228,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--scheduler-accent)]"
                              onClick={() => selectClient(client)}
                              type="button"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-[var(--scheduler-ink-strong)]">
                                  {client.fullName}
                                </span>
                                <span className="block text-xs text-slate-600">{client.phone}</span>
                              </span>
                              <span className="shrink-0 text-xs text-slate-500">
                                {client.history.length} {client.history.length === 1 ? 'visita' : 'visitas'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {draft.clientId ? (
                      <p className="text-sm font-medium text-emerald-700">
                        Cliente existente vinculado a su historial.
                      </p>
                    ) : null}
                  </div>
                  {canCreateClient ? <div className="flex items-end">
                    <Button
                      className="scheduler-modal-cta px-5"
                      onClick={openNewClientForm}
                      type="button"
                    >
                      <UserRoundPlus className="mr-2 h-5 w-5" />
                      Nuevo cliente
                      {isNewClientOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </div> : null}
                </div>

                {canCreateClient && isNewClientOpen ? (
                  <div className="rounded-[22px] border border-[rgba(236,209,200,0.88)] bg-[rgba(255,255,255,0.78)] p-4">
                    <div className="mb-3">
                      <p className="text-[0.82rem] uppercase tracking-[0.16em] text-slate-400">Nuevo cliente</p>
                      <p className="mt-1 text-[0.95rem] text-slate-500">Completa los datos basicos antes de guardar la reserva.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="scheduler-modal-label">Nombre</label>
                        <Input
                          className="scheduler-modal-input"
                          placeholder="Nombre"
                          value={newClientFirstName}
                          onChange={(event) => handleNewClientNameChange(event.target.value, newClientLastName)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="scheduler-modal-label">Apellido</label>
                        <Input
                          className="scheduler-modal-input"
                          placeholder="Apellido"
                          value={newClientLastName}
                          onChange={(event) => handleNewClientNameChange(newClientFirstName, event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="scheduler-modal-label">Telefono</label>
                        <Input
                          autoComplete="off"
                          className="scheduler-modal-input"
                          inputMode="tel"
                          placeholder="+52 55 0000 0000"
                          value={draft.phone}
                          onChange={(event) => handlePhoneChange(event.target.value)}
                        />
                        {exactPhoneMatch && draft.clientId !== exactPhoneMatch.id ? (
                          <p className="text-sm font-medium text-amber-800" role="status">
                            Este teléfono ya pertenece a {exactPhoneMatch.fullName}. Selecciona ese registro antes de guardar.
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <label className="scheduler-modal-label">Email</label>
                        <Input
                          autoComplete="email"
                          className="scheduler-modal-input"
                          placeholder="correo@cliente.com"
                          type="email"
                          value={draft.customerEmail}
                          onChange={(event) =>
                            patchDraft({ clientId: null, customerEmail: event.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <label className="scheduler-modal-label">Sucursal</label>
                    <Select value={selectedBranch} onValueChange={onBranchChange}>
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} className="scheduler-modal-select-item" value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      aria-label="Duplicar reserva en otra sucursal"
                      variant="outline"
                      className="scheduler-modal-secondary px-4 text-[var(--scheduler-accent)]"
                      disabled
                      title="La duplicación entre sucursales aún no tiene contrato operativo."
                    >
                      <Copy className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="scheduler-modal-label">Servicios</label>
                  <Select disabled={serviceLocked} value={draft.serviceId} onValueChange={(value) => patchDraft({ serviceId: value })}>
                    <SelectTrigger className="scheduler-modal-select-trigger">
                      <SelectValue placeholder="Busca un servicio" />
                    </SelectTrigger>
                    <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                      {services.map((service) => (
                        <SelectItem key={service.id} className="scheduler-modal-select-item" value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedService ? (
                    <div className="scheduler-modal-chip">
                      <Clock3 className="h-4 w-4" />
                      Duracion estimada: {selectedService.durationMinutes} min
                    </div>
                  ) : null}
                  {serviceLocked ? (
                    <p className="text-sm text-slate-500">
                      Esta cita conserva varios servicios canónicos; edita aquí fecha, cliente, estado o notas sin reemplazar sus servicios.
                    </p>
                  ) : null}
                </div>

                {columns.length ? (
                  <div className="space-y-2">
                    <label className="scheduler-modal-label">Profesional o recurso</label>
                    <Select value={draft.professionalId} onValueChange={(value) => patchDraft({ professionalId: value })}>
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                        {columns.map((column) => (
                          <SelectItem key={column.id} className="scheduler-modal-select-item" value={column.id}>
                            {column.name} · {column.kind === 'RESOURCE' ? 'Recurso' : 'Profesional'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              </div>

              <div className="scheduler-modal-section overflow-hidden rounded-[24px] p-4 md:p-5">
                <button
                  className="flex w-full items-center justify-between gap-4 rounded-[20px] border border-[rgba(236,209,200,0.9)] bg-white px-4 py-3 text-left transition hover:bg-[rgba(245,237,228,0.38)]"
                  onClick={() => setIsAdditionalInfoOpen((current) => !current)}
                  type="button"
                >
                  <div className="min-w-0">
                    <p className="label-caps">Detalle</p>
                    <h3 className="mt-1 text-[1.18rem] font-semibold tracking-[-0.03em] text-[var(--scheduler-ink-strong)]">
                      Informacion adicional
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-[var(--scheduler-accent)]" />
                    {isAdditionalInfoOpen ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {isAdditionalInfoOpen ? (
                  <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
                    {showCommercialFields ? <div className="space-y-2">
                      <label className="scheduler-modal-label">Precio</label>
                      <Input
                        className="scheduler-modal-input"
                        placeholder="$0"
                        value={selectedService ? formatMoney(selectedService.price) : ''}
                        readOnly
                      />
                    </div> : null}
                    {showCommercialFields ? <div className="space-y-2">
                      <label className="scheduler-modal-label">Pagado</label>
                      <div className="flex h-14 items-center gap-6 rounded-[22px] border border-[rgba(236,209,200,0.95)] bg-white px-4">
                        <label className="flex items-center gap-2 text-base text-[var(--scheduler-ink-strong)]">
                          <input
                            checked={draft.paymentLabel !== 'No pagado'}
                            className="h-4 w-4 accent-[var(--scheduler-accent)]"
                            name="paid"
                            type="radio"
                            onChange={() => patchDraft({ paymentLabel: 'Reserva pagada' })}
                          />
                          Si
                        </label>
                        <label className="flex items-center gap-2 text-base text-[var(--scheduler-ink-strong)]">
                          <input
                            checked={draft.paymentLabel === 'No pagado'}
                            className="h-4 w-4 accent-[var(--scheduler-accent)]"
                            name="paid"
                            type="radio"
                            onChange={() => patchDraft({ paymentLabel: 'No pagado' })}
                          />
                          No
                        </label>
                      </div>
                    </div> : null}
                    <div className="space-y-2 lg:col-span-2">
                      <label className="scheduler-modal-label">
                        {showInternalNote ? 'Notas compartidas con el cliente' : 'Notas de la cita'}
                      </label>
                      <Textarea
                        className="scheduler-modal-textarea min-h-32"
                        value={draft.notes}
                        onChange={(event) => patchDraft({ notes: event.target.value })}
                      />
                    </div>
                    {showInternalNote ? <div className="space-y-2 lg:col-span-2">
                      <label className="scheduler-modal-label">Nota interna</label>
                      <Textarea
                        className="scheduler-modal-textarea min-h-32"
                        value={draft.internalNote}
                        onChange={(event) => patchDraft({ internalNote: event.target.value })}
                      />
                    </div> : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="scheduler-modal-footer flex flex-col gap-3 border-t border-[rgba(236,209,200,0.95)] px-4 py-4 sm:flex-row sm:justify-between md:px-6">
              <Button variant="outline" className="scheduler-modal-secondary" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button className="scheduler-modal-cta" disabled={!canSaveAtSelectedTime || availabilityLoading || saving} onClick={() => onSave()}>
                <UserRoundPlus className="mr-2 h-5 w-5" />
                {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Guardar reserva'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
