'use client'

import { useMemo, type CSSProperties } from 'react'
import { Badge, Card, CardContent, Dialog, DialogContent, DialogTrigger, Popover, PopoverContent, PopoverTrigger, cn } from '@cosmetics/ui'
import { Ban, CalendarDays, Plus } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
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
  addMinutesToTime,
  getAppointmentStyle,
  getClientPurchaseAccount,
  getClientPaymentHistory,
  getCurrentTimeLineStyle,
  getMinutesFromTime,
  getSchedulerCardTop,
  getSingleCellAppointmentStyle,
  type EmptySlotAction,
} from './scheduler-utils'
import {
  getCommerceCalendarRange,
  isOutsideCommerceOperatingHours,
  type CommerceOperatingHours,
} from '@/lib/commerce-operating-hours'
import { SchedulerBookingCard } from './SchedulerBookingCard'
import { SchedulerAvatar } from './SchedulerAvatar'

interface SchedulerAgendaGridProps {
  currentView: SchedulerView
  slotMinutes: number
  visibleProfessionals: Professional[]
  visibleBookings: Booking[]
  statusColors: BookingStatusColors
  allBookings: Booking[]
  visibleBlocks: AvailabilityBlock[]
  selectedDate: Date
  commerceOperatingHours: CommerceOperatingHours
  commerceName: string
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
  slotMinutes,
  visibleProfessionals,
  visibleBookings,
  statusColors,
  allBookings,
  visibleBlocks,
  selectedDate,
  commerceOperatingHours,
  commerceName,
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
  const dayCalendarRange = useMemo(
    () => getCommerceCalendarRange(commerceOperatingHours, [selectedDate], slotMinutes),
    [commerceOperatingHours, selectedDate, slotMinutes],
  )
  const weekCalendarRange = useMemo(
    () => getCommerceCalendarRange(commerceOperatingHours, weekDays, slotMinutes),
    [commerceOperatingHours, slotMinutes, weekDays],
  )
  const dayBaseMinutes = dayCalendarRange?.startMinutes ?? 0
  const dayClosingMinutes = dayCalendarRange?.endMinutes ?? 0
  const dayTimeSlots = dayCalendarRange?.slots ?? []
  const weekBaseMinutes = weekCalendarRange?.startMinutes ?? 0
  const weekClosingMinutes = weekCalendarRange?.endMinutes ?? 0
  const weekTimeSlots = weekCalendarRange?.slots ?? []
  const activeCalendarRange = currentView === 'day' ? dayCalendarRange : weekCalendarRange
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
        if (
          getMinutesFromTime(booking.end) <= dayBaseMinutes ||
          getMinutesFromTime(booking.start) >= dayClosingMinutes
        ) return null
        const columnIndex = professionalIndexMap.get(booking.professionalId)
        if (columnIndex == null) return null
        const left = 96 + columnIndex * dayColumnWidth + 12
        const width = dayColumnWidth - 24

        return {
          booking,
          style: {
            ...getAppointmentStyle(
              booking.start,
              booking.end,
              dayBaseMinutes,
              dayClosingMinutes,
              slotMinutes,
            ),
            left: `${left}px`,
            width: `${width}px`,
          },
        }
      })

    return overlays.filter((value): value is DayOverlayBooking => value !== null)
  }, [dayBaseMinutes, dayClosingMinutes, dayColumnWidth, professionalIndexMap, slotMinutes, visibleBookings])

  const dayBlocks = useMemo(() => {
    const overlays: Array<DayOverlayBlock | null> = visibleBlocks.map((block) => {
        if (
          getMinutesFromTime(block.end) <= dayBaseMinutes ||
          getMinutesFromTime(block.start) >= dayClosingMinutes
        ) return null
        const columnIndex = professionalIndexMap.get(block.professionalId)
        if (columnIndex == null) return null
        const left = 96 + columnIndex * dayColumnWidth + 12
        const width = dayColumnWidth - 24

        return {
          block,
          style: {
            ...getAppointmentStyle(
              block.start,
              block.end,
              dayBaseMinutes,
              dayClosingMinutes,
              slotMinutes,
            ),
            left: `${left}px`,
            width: `${width}px`,
          },
        }
      })

    return overlays.filter((value): value is DayOverlayBlock => value !== null)
  }, [dayBaseMinutes, dayClosingMinutes, dayColumnWidth, professionalIndexMap, slotMinutes, visibleBlocks])

  const occupiedDaySlots = useMemo(() => {
    const occupied = new Set<string>()

    dayTimeSlots.forEach((slot) => {
      const slotStart = getMinutesFromTime(slot)
      const slotEnd = slotStart + slotMinutes

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
  }, [dayTimeSlots, slotMinutes, visibleBlocks, visibleBookings, visibleProfessionals])

  const slotActionOverlay = useMemo(() => {
    if (!emptySlotAction) return null

    const columnIndex = professionalIndexMap.get(emptySlotAction.professionalId)
    if (columnIndex == null) return null

    const startMinutes = getMinutesFromTime(emptySlotAction.startTime)
    const startCellIndex = Math.max(
      0,
      Math.floor((startMinutes - dayBaseMinutes) / slotMinutes),
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
  }, [dayBaseMinutes, dayColumnWidth, emptySlotAction, professionalIndexMap, slotMinutes])

  const now = new Date()
  const currentTimeLabel = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
  const currentTimeMinutes = getMinutesFromTime(currentTimeLabel)
  const showCurrentTimeLine =
    currentView === 'day' &&
    isSameDay(selectedDate, now) &&
    currentTimeMinutes >= dayBaseMinutes &&
    currentTimeMinutes <= dayClosingMinutes

  return (
    <Card className="overflow-hidden rounded-[34px] border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.76)_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur">
      <CardContent className="p-0">
        {!activeCalendarRange ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
            <CalendarDays className="h-9 w-9 text-slate-300" />
            <div>
              <p className="font-semibold text-slate-700">Comercio cerrado</p>
              <p className="mt-1 text-sm text-slate-500">
                No hay horarios de servicio definidos para {currentView === 'day' ? 'este día' : 'esta semana'}.
              </p>
            </div>
          </div>
        ) : currentView === 'day' ? (
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

              {dayTimeSlots.map((slot) => (
                <div key={slot} className="contents">
                  <div className="scheduler-time-cell">{slot}</div>
                  {visibleProfessionals.map((professional) => {
                    const isOccupied = occupiedDaySlots.has(`${slot}-${professional.id}`)

                    return (
                      <div
                        key={`${slot}-${professional.id}`}
                        className={cn(
                          'scheduler-body-cell',
                          isOccupied
                            ? 'scheduler-body-cell-occupied'
                            : 'scheduler-body-cell-interactive',
                        )}
                      >
                        {isOccupied ? null : (
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
                        commerceName={commerceName}
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
                  style={getCurrentTimeLineStyle(currentTimeLabel, dayBaseMinutes, slotMinutes)}
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

              {weekTimeSlots.map((slot) => (
                <div key={`week-${slot}`} className="contents">
                  <div className="scheduler-time-cell">{slot}</div>
                  {weekDays.map((day) => (
                    <div
                      key={`${slot}-${day.toISOString()}`}
                      className={cn(
                        'scheduler-body-cell',
                        isOutsideCommerceOperatingHours(
                          commerceOperatingHours,
                          day,
                          slot,
                          addMinutesToTime(slot, slotMinutes),
                        )
                          ? 'scheduler-body-cell-commerce-closed'
                          : '',
                      )}
                    />
                  ))}
                </div>
              ))}

              {schedulerWeekBookings.map((booking) => {
                const bookingStartMinutes = getMinutesFromTime(booking.start)
                if (
                  bookingStartMinutes < weekBaseMinutes ||
                  bookingStartMinutes >= weekClosingMinutes
                ) return null
                const style = getSingleCellAppointmentStyle(
                  booking.start,
                  weekBaseMinutes,
                  weekClosingMinutes,
                  slotMinutes,
                )

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
