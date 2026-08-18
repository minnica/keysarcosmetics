'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  Calendar,
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
} from '@cosmetics/ui'
import { CalendarDays, ChevronDown, ChevronUp, Clock3, Copy, Mail, Sparkles, UserRoundPlus, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  bookingStatuses,
  schedulerServices,
  type BookingStatus,
  type Professional,
} from '@/lib/mock-scheduler-data'
import {
  formatMoney,
  minuteOptions,
  startHourOptions,
  type BookingDraft,
} from './scheduler-utils'

interface SchedulerBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  professionals: Professional[]
  draft: BookingDraft
  onDraftChange: (draft: BookingDraft) => void
  onSave: () => void
}

export function SchedulerBookingDialog({
  open,
  onOpenChange,
  professionals,
  draft,
  onDraftChange,
  onSave,
}: SchedulerBookingDialogProps) {
  const selectedService = schedulerServices.find((service) => service.id === draft.serviceId)
  const isEditing = Boolean(draft.bookingId)
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false)
  const [newClientFirstName, setNewClientFirstName] = useState('')
  const [newClientLastName, setNewClientLastName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')

  useEffect(() => {
    if (!open) {
      setIsNewClientOpen(false)
      setIsAdditionalInfoOpen(false)
      setNewClientFirstName('')
      setNewClientLastName('')
      setNewClientEmail('')
    }
  }, [open])

  function patchDraft(patch: Partial<BookingDraft>) {
    onDraftChange({ ...draft, ...patch })
  }

  function handleNewClientNameChange(firstName: string, lastName: string) {
    setNewClientFirstName(firstName)
    setNewClientLastName(lastName)
    patchDraft({
      customerName: [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
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
                    {Object.entries(bookingStatuses).map(([value, meta]) => (
                      <SelectItem key={value} className="scheduler-modal-select-item" value={value}>
                        <div className="flex items-center gap-3">
                          <span className={cn('h-3.5 w-3.5 rounded-full', meta.dotClassName)} />
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
                <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-3">
                  <div className="space-y-2">
                    <label className="scheduler-modal-label">Hora</label>
                    <Select value={draft.hour} onValueChange={(value) => patchDraft({ hour: value })}>
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[280px]">
                        {startHourOptions.map((option) => (
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
                    <Select value={draft.minute} onValueChange={(value) => patchDraft({ minute: value })}>
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[240px]">
                        {minuteOptions.map((option) => (
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
                  >
                    Repetir
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <label className="scheduler-modal-label">Cliente</label>
                    <Input
                      className="scheduler-modal-input"
                      placeholder="Busca por nombre, apellido, rut, email"
                      value={draft.customerName}
                      onChange={(event) => patchDraft({ customerName: event.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="scheduler-modal-cta px-5"
                      onClick={() => setIsNewClientOpen((current) => !current)}
                      type="button"
                    >
                      <UserRoundPlus className="mr-2 h-5 w-5" />
                      Nuevo cliente
                      {isNewClientOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {isNewClientOpen ? (
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
                      <div className="space-y-2 md:col-span-2">
                        <label className="scheduler-modal-label">Email</label>
                        <div className="scheduler-modal-input flex items-center gap-3 px-4">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <input
                            className="w-full bg-transparent text-base text-[var(--scheduler-ink-strong)] outline-none placeholder:text-[rgba(96,96,96,0.45)]"
                            placeholder="correo@cliente.com"
                            value={newClientEmail}
                            onChange={(event) => setNewClientEmail(event.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="scheduler-modal-label">Telefono</label>
                  <Input
                    className="scheduler-modal-input"
                    placeholder="+52 55 0000 0000"
                    value={draft.phone}
                    onChange={(event) => patchDraft({ phone: event.target.value })}
                  />
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <label className="scheduler-modal-label">Profesional</label>
                    <Select value={draft.professionalId} onValueChange={(value) => patchDraft({ professionalId: value })}>
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                        {professionals.map((professional) => (
                          <SelectItem key={professional.id} className="scheduler-modal-select-item" value={professional.id}>
                            {professional.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" className="scheduler-modal-secondary px-4 text-[var(--scheduler-accent)]">
                      <Copy className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="scheduler-modal-label">Servicios</label>
                  <Select value={draft.serviceId} onValueChange={(value) => patchDraft({ serviceId: value })}>
                    <SelectTrigger className="scheduler-modal-select-trigger">
                      <SelectValue placeholder="Busca un servicio" />
                    </SelectTrigger>
                    <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                      {schedulerServices.map((service) => (
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
                </div>
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
                    <div className="space-y-2">
                      <label className="scheduler-modal-label">Precio</label>
                      <Input
                        className="scheduler-modal-input"
                        placeholder="$0"
                        value={selectedService ? formatMoney(selectedService.price) : ''}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
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
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="scheduler-modal-label">Notas compartidas con el cliente</label>
                      <Textarea
                        className="scheduler-modal-textarea min-h-32"
                        value={draft.notes}
                        onChange={(event) => patchDraft({ notes: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="scheduler-modal-label">Nota interna</label>
                      <Textarea
                        className="scheduler-modal-textarea min-h-32"
                        value={draft.internalNote}
                        onChange={(event) => patchDraft({ internalNote: event.target.value })}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="scheduler-modal-footer flex flex-col gap-3 border-t border-[rgba(236,209,200,0.95)] px-4 py-4 sm:flex-row sm:justify-between md:px-6">
              <Button variant="outline" className="scheduler-modal-secondary" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button className="scheduler-modal-cta" onClick={onSave}>
                <UserRoundPlus className="mr-2 h-5 w-5" />
                {isEditing ? 'Guardar cambios' : 'Guardar reserva'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
