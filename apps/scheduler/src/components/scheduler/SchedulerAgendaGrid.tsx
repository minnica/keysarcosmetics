'use client'

import { useMemo, type CSSProperties } from 'react'
import { Badge, Card, CardContent, Dialog, DialogContent, DialogTrigger, Popover, PopoverContent, PopoverTrigger, cn } from '@cosmetics/ui'
import { Ban, CalendarDays, Plus } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  schedulerTimeSlots,
  schedulerWeekBookings,
  bookingStatuses,
  type AvailabilityBlock,
  type Booking,
  type BookingStatus,
  type BookingStatusColors,
  type Professional,
  type SchedulerView,
} from '@/lib/mock-scheduler-data'
import {
  getSchedulerClientAccessKey,
  type SchedulerFinancialAuditEvent,
  type SchedulerFinancialProfile,
} from '@/lib/scheduler-access'
import {
  getAppointmentStyle,
  getClientPurchaseAccount,
  getClientPaymentHistory,
  getCurrentTimeLineStyle,
  getMinutesFromTime,
  getSchedulerCardTop,
  getSingleCellAppointmentStyle,
  schedulerBaseMinutes,
  schedulerClosingMinutes,
  schedulerSlotMinutes,
  type EmptySlotAction,
} from './scheduler-utils'
import { SchedulerBookingCard } from './SchedulerBookingCard'
import { SchedulerAvatar } from './SchedulerAvatar'

interface SchedulerAgendaGridProps {
  currentView: SchedulerView
  visibleProfessionals: Professional[]
  visibleBookings: Booking[]
  statusColors: BookingStatusColors
  allBookings: Booking[]
  visibleBlocks: AvailabilityBlock[]
  selectedDate: Date
  weekDays: Date[]
  emptySlotAction: EmptySlotAction | null
  onOpenSlotAction: (professionalId: string, startTime: string) => void
  onCloseSlotAction: () => void
  onOpenNewBooking: (professionalId?: string, startTime?: string) => void
  onMockBlock: (professionalId: string, startTime: string) => void
  onEditBlock: (block: AvailabilityBlock) => void
  onEditBooking: (booking: Booking) => void
  onDeleteBooking: (bookingId: string) => void
  onUpdateBookingStatus: (bookingId: string, status: BookingStatus) => void
  onPurchaseDecision: (booking: Booking, purchased: boolean) => void
  onOpenBookingDetail: (booking: Booking, view: 'payment' | 'record') => void
  onOpenClientHistory: (booking: Booking) => void
  financialAccessByClient: Record<string, SchedulerFinancialProfile>
  financialAuditEvents: SchedulerFinancialAuditEvent[]
  onRequestFinancialAccess: (booking: Booking) => void
  onRevokeFinancialAccess: (booking: Booking) => void
  onUpdatePaymentHistory: (
    clientBooking: Booking,
    paymentBookingId: string,
    amount: number,
    tentativeAmount?: number,
  ) => void
  onDeletePaymentHistory: (clientBooking: Booking, paymentBookingId: string) => void
}

interface DayOverlayBooking {
  booking: Booking
  style: CSSProperties
}

interface DayOverlayBlock {
  block: AvailabilityBlock
  style: CSSProperties
}

interface SlotActionOverlay {
  professionalId: string
  startTime: string
  style: CSSProperties
}

export function SchedulerAgendaGrid({
  currentView,
  visibleProfessionals,
  visibleBookings,
  statusColors,
  allBookings,
  visibleBlocks,
  selectedDate,
  weekDays,
  emptySlotAction,
  onOpenSlotAction,
  onCloseSlotAction,
  onOpenNewBooking,
  onMockBlock,
  onEditBlock,
  onEditBooking,
  onDeleteBooking,
  onUpdateBookingStatus,
  onPurchaseDecision,
  onOpenBookingDetail,
  onOpenClientHistory,
  financialAccessByClient,
  financialAuditEvents,
  onRequestFinancialAccess,
  onRevokeFinancialAccess,
  onUpdatePaymentHistory,
  onDeletePaymentHistory,
}: SchedulerAgendaGridProps) {
  const professionalCount = Math.max(visibleProfessionals.length, 1)
  const dayColumnWidth =
    professionalCount <= 2
      ? 330
      : professionalCount === 3
        ? 270
      : professionalCount === 4
          ? 230
          : professionalCount === 5
            ? 205
            : professionalCount === 6
              ? 184
              : 172
  const dayGridMinWidth = 96 + professionalCount * dayColumnWidth
  const dayGridStyle: CSSProperties & Record<'--scheduler-column-width', string> = {
    gridTemplateColumns: `96px repeat(${professionalCount}, var(--scheduler-column-width))`,
    minWidth: `${dayGridMinWidth}px`,
    width: '100%',
    '--scheduler-column-width': `${dayColumnWidth}px`,
  }

  const professionalIndexMap = useMemo(() => {
    return new Map(visibleProfessionals.map((professional, index) => [professional.id, index]))
  }, [visibleProfessionals])

  const dayAppointments = useMemo(() => {
    const overlays: Array<DayOverlayBooking | null> = visibleBookings.map((booking) => {
        const columnIndex = professionalIndexMap.get(booking.professionalId)
        if (columnIndex == null) return null
        const left = 96 + columnIndex * dayColumnWidth + 12
        const width = dayColumnWidth - 24

        return {
          booking,
          style: {
            ...getAppointmentStyle(booking.start, booking.end),
            left: `${left}px`,
            width: `${width}px`,
          },
        }
      })

    return overlays.filter((value): value is DayOverlayBooking => value !== null)
  }, [dayColumnWidth, professionalIndexMap, visibleBookings])

  const dayBlocks = useMemo(() => {
    const overlays: Array<DayOverlayBlock | null> = visibleBlocks.map((block) => {
        const columnIndex = professionalIndexMap.get(block.professionalId)
        if (columnIndex == null) return null
        const left = 96 + columnIndex * dayColumnWidth + 12
        const width = dayColumnWidth - 24

        return {
          block,
          style: {
            ...getAppointmentStyle(block.start, block.end),
            left: `${left}px`,
            width: `${width}px`,
          },
        }
      })

    return overlays.filter((value): value is DayOverlayBlock => value !== null)
  }, [dayColumnWidth, professionalIndexMap, visibleBlocks])

  const occupiedDaySlots = useMemo(() => {
    const occupied = new Set<string>()

    schedulerTimeSlots.forEach((slot) => {
      const slotStart = getMinutesFromTime(slot)
      const slotEnd = slotStart + schedulerSlotMinutes

      visibleProfessionals.forEach((professional) => {
        const bookingOccupiesSlot = visibleBookings.some(
          (booking) =>
            booking.professionalId === professional.id &&
            getMinutesFromTime(booking.start) < slotEnd &&
            getMinutesFromTime(booking.end) > slotStart,
        )
        const blockOccupiesSlot = visibleBlocks.some(
          (block) =>
            block.professionalId === professional.id &&
            getMinutesFromTime(block.start) < slotEnd &&
            getMinutesFromTime(block.end) > slotStart,
        )

        if (bookingOccupiesSlot || blockOccupiesSlot) {
          occupied.add(`${slot}-${professional.id}`)
        }
      })
    })

    return occupied
  }, [visibleBlocks, visibleBookings, visibleProfessionals])

  const slotActionOverlay = useMemo(() => {
    if (!emptySlotAction) return null

    const columnIndex = professionalIndexMap.get(emptySlotAction.professionalId)
    if (columnIndex == null) return null

    const startMinutes = getMinutesFromTime(emptySlotAction.startTime)
    const startCellIndex = Math.max(
      0,
      Math.floor((startMinutes - schedulerBaseMinutes) / schedulerSlotMinutes),
    )
    const top = getSchedulerCardTop(startCellIndex)

    return {
      professionalId: emptySlotAction.professionalId,
      startTime: emptySlotAction.startTime,
      style: {
        top: `${top}px`,
        left: `${96 + columnIndex * dayColumnWidth + 8}px`,
        width: `${Math.min(dayColumnWidth - 16, 260)}px`,
      },
    } satisfies SlotActionOverlay
  }, [dayColumnWidth, emptySlotAction, professionalIndexMap])

  const now = new Date()
  const currentTimeLabel = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
  const currentTimeMinutes = getMinutesFromTime(currentTimeLabel)
  const showCurrentTimeLine =
    currentView === 'day' &&
    isSameDay(selectedDate, now) &&
    currentTimeMinutes >= schedulerBaseMinutes &&
    currentTimeMinutes <= schedulerClosingMinutes

  return (
    <Card className="overflow-hidden rounded-[34px] border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.76)_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur">
      <CardContent className="p-0">
        {currentView === 'day' ? (
          <div className="scheduler-grid-wrapper scheduler-grid-wrapper-day overflow-x-auto">
            <div className="scheduler-grid scheduler-grid-day" style={dayGridStyle}>
              <div className="scheduler-grid-corner" />
              {visibleProfessionals.map((professional) => (
                <div key={professional.id} className="scheduler-column-header">
                  <SchedulerAvatar
                    accent={professional.accent}
                    avatar={professional.avatar}
                    name={professional.name}
                    shortName={professional.shortName}
                    size="header"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[0.88rem] font-semibold tracking-[-0.02em] text-slate-800">{professional.name}</p>
                    <p className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-400">Cabina lista</p>
                  </div>
                </div>
              ))}

              {schedulerTimeSlots.map((slot) => (
                <div key={slot} className="contents">
                  <div className="scheduler-time-cell">{slot}</div>
                  {visibleProfessionals.map((professional) => {
                    const isClosingSlot = getMinutesFromTime(slot) >= schedulerClosingMinutes
                    const isOccupied = occupiedDaySlots.has(`${slot}-${professional.id}`)

                    return (
                      <div
                        key={`${slot}-${professional.id}`}
                        className={cn(
                          'scheduler-body-cell',
                          isClosingSlot
                            ? 'scheduler-body-cell-closing'
                            : isOccupied
                              ? 'scheduler-body-cell-occupied'
                              : 'scheduler-body-cell-interactive',
                        )}
                      >
                        {isClosingSlot || isOccupied ? null : (
                          <button
                            aria-label={`Abrir acciones para ${professional.name} a las ${slot}`}
                            className="scheduler-cell-hitbox"
                            type="button"
                            onClick={() => onOpenSlotAction(professional.id, slot)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

              {dayBlocks.map(({ block, style }) => (
                <button
                  key={block.id}
                  aria-label={`Editar disponibilidad de ${block.start} a ${block.end}`}
                  className={cn(
                    'scheduler-appointment scheduler-appointment-contained cursor-pointer text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.1)]',
                    block.variant === 'blocked'
                      ? 'scheduler-appointment-blocked'
                      : 'scheduler-appointment-unavailable',
                  )}
                  style={style}
                  type="button"
                  onClick={() => onEditBlock(block)}
                >
                  <p className="truncate text-[0.9rem] font-semibold">{block.label}</p>
                  <p className="text-[0.72rem] uppercase tracking-[0.16em]">
                    {block.start} - {block.end}
                  </p>
                </button>
              ))}

              {dayAppointments.map(({ booking, style }) => {
                return (
                  <Dialog key={booking.id}>
                    <DialogTrigger asChild>
                      <button
                        className="scheduler-appointment scheduler-appointment-contained scheduler-appointment-booking text-left transition hover:-translate-y-0.5"
                        style={{
                          ...style,
                          backgroundColor: `color-mix(in srgb, ${statusColors[booking.status]} 8%, white)`,
                          borderColor: `color-mix(in srgb, ${statusColors[booking.status]} 25%, white)`,
                          color: `color-mix(in srgb, ${statusColors[booking.status]} 70%, #364152)`,
                        }}
                        type="button"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: statusColors[booking.status] }}
                          />
                          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] opacity-70">
                            {booking.start}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[0.96rem] font-semibold tracking-[-0.02em]">
                          {booking.customerName}
                        </p>
                        <p className="mt-1 truncate text-[0.74rem] uppercase tracking-[0.12em] opacity-75">
                          {booking.serviceName}
                        </p>
                      </button>
                    </DialogTrigger>
                    <DialogContent
                      className="w-[min(560px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto rounded-[20px] border p-3.5 shadow-[0_18px_42px_rgba(79,61,43,0.14)]"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${statusColors[booking.status]} 8%, white)`,
                        borderColor: `color-mix(in srgb, ${statusColors[booking.status]} 25%, white)`,
                      }}
                    >
                      <SchedulerBookingCard
                        booking={booking}
                        clientAccount={getClientPurchaseAccount(allBookings, booking)}
                        paymentHistory={financialAccessByClient[getSchedulerClientAccessKey(booking.clientId, booking.phone)]
                          ? getClientPaymentHistory(allBookings, booking)
                          : []}
                        {...(financialAccessByClient[getSchedulerClientAccessKey(booking.clientId, booking.phone)]
                          ? { financialProfile: financialAccessByClient[getSchedulerClientAccessKey(booking.clientId, booking.phone)] }
                          : {})}
                        financialAuditEvents={financialAuditEvents.filter(
                          (event) => event.clientKey === getSchedulerClientAccessKey(booking.clientId, booking.phone),
                        )}
                        selectedDate={selectedDate}
                        statusColors={statusColors}
                        onDelete={onDeleteBooking}
                        onEdit={onEditBooking}
                        onOpenDetail={onOpenBookingDetail}
                        onOpenClientHistory={onOpenClientHistory}
                        onStatusChange={onUpdateBookingStatus}
                        onPurchaseDecision={onPurchaseDecision}
                        onRequestFinancialAccess={onRequestFinancialAccess}
                        onRevokeFinancialAccess={onRevokeFinancialAccess}
                        onUpdatePaymentHistory={(paymentBookingId, amount, tentativeAmount) =>
                          onUpdatePaymentHistory(booking, paymentBookingId, amount, tentativeAmount)}
                        onDeletePaymentHistory={(paymentBookingId) =>
                          onDeletePaymentHistory(booking, paymentBookingId)}
                      />
                    </DialogContent>
                  </Dialog>
                )
              })}

              {slotActionOverlay ? (
                <div className="scheduler-slot-action" style={slotActionOverlay.style}>
                  <div className="scheduler-slot-action-header">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--scheduler-ink-strong)] transition hover:bg-[rgba(195,165,131,0.14)]"
                      type="button"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <span className="text-[0.96rem] font-medium text-slate-500">Agregar</span>
                    <button
                      className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={onCloseSlotAction}
                      type="button"
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                    </button>
                  </div>

                  <button
                    className="scheduler-slot-action-item"
                    onClick={() =>
                      onOpenNewBooking(slotActionOverlay.professionalId, slotActionOverlay.startTime)
                    }
                    type="button"
                  >
                    <CalendarDays className="h-5 w-5" />
                    <span>Reserva</span>
                  </button>

                  <button
                    className="scheduler-slot-action-item"
                    onClick={() =>
                      onMockBlock(slotActionOverlay.professionalId, slotActionOverlay.startTime)
                    }
                    type="button"
                  >
                    <Ban className="h-5 w-5" />
                    <span>Bloquear horario</span>
                  </button>
                </div>
              ) : null}

              {showCurrentTimeLine ? (
                <div
                  className="scheduler-current-time-line"
                  style={getCurrentTimeLineStyle(currentTimeLabel)}
                >
                  <span className="scheduler-current-time-pill">{currentTimeLabel}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="scheduler-grid-wrapper overflow-x-auto">
            <div
              className="scheduler-grid"
              style={{
                gridTemplateColumns: '96px repeat(7, var(--scheduler-column-width))',
                minWidth: '1776px',
                width: '100%',
              }}
            >
              <div className="scheduler-grid-corner flex items-center justify-center">
                <Badge className="rounded-full bg-slate-100 px-4 py-1 text-slate-500">
                  {visibleProfessionals[0]?.name ?? 'Profesional'}
                </Badge>
              </div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="scheduler-column-header">
                  <div>
                    <p className="text-base font-semibold capitalize text-slate-800">
                      {format(day, 'EEEE dd/MM', { locale: es })}
                    </p>
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
                const style = getSingleCellAppointmentStyle(booking.start)

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
                    <p className="text-xs uppercase tracking-[0.12em]">
                      {booking.start} - {booking.end}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
