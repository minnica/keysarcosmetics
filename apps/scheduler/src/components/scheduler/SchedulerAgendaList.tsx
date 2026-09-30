'use client'

import { Button } from '@cosmetics/ui'
import { CalendarDays, Clock3, Phone, Plus, UserRound } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  type Booking,
  type BookingStatusColors,
  type Professional,
} from '@/lib/scheduler-presentation'
import { SchedulerAvatar } from './SchedulerAvatar'
import { SchedulerStatusBadge } from './SchedulerStatusBadge'
import { getSchedulerStatusColorTokens } from '@/lib/scheduler-status-presentation'

interface SchedulerAgendaListProps {
  bookings: Booking[]
  professionals: Professional[]
  selectedDate: Date
  statusColors: BookingStatusColors
  onOpenBooking: (booking: Booking) => void
  onOpenNewBooking: () => void
  canWrite?: boolean
}

export function SchedulerAgendaList({
  bookings,
  professionals,
  selectedDate,
  statusColors,
  onOpenBooking,
  onOpenNewBooking,
  canWrite = true,
}: SchedulerAgendaListProps) {
  const orderedBookings = [...bookings].sort((left, right) =>
    left.start.localeCompare(right.start),
  )

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-[rgba(236,209,200,0.82)] bg-white shadow-[0_18px_45px_rgba(43,35,28,0.06)]">
      <div className="flex shrink-0 flex-col gap-4 border-b border-[#eee6df] bg-[linear-gradient(180deg,#fff_0%,#fcfaf8_100%)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="label-caps">Vista de lista</p>
          <h2 className="mt-1 text-xl font-semibold capitalize text-[#263649]">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {orderedBookings.length} {orderedBookings.length === 1 ? 'reserva visible' : 'reservas visibles'}
          </p>
        </div>
        <Button
          className="h-11 rounded-2xl bg-[#263649] px-5 text-white hover:bg-[#1d2b3a]"
          disabled={!canWrite}
          onClick={onOpenNewBooking}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva cita
        </Button>
      </div>

      {orderedBookings.length ? (
        <div className="min-h-0 flex-1 divide-y divide-[#eee6df] overflow-y-auto overscroll-contain">
          {orderedBookings.map((booking) => {
            const professional = professionals.find(
              (candidate) => candidate.id === booking.professionalId,
            )
            const statusColor = statusColors[booking.status]
            const statusTokens = getSchedulerStatusColorTokens(statusColor)

            return (
              <button
                className="grid w-full gap-4 px-5 py-5 text-left transition-colors hover:bg-[#fcfaf8] sm:px-6 lg:grid-cols-[110px_minmax(220px,1.2fr)_minmax(190px,1fr)_minmax(150px,.8fr)_auto] lg:items-center"
                key={booking.id}
                onClick={() => onOpenBooking(booking)}
                style={{
                  borderLeftColor: statusTokens.accent,
                  borderLeftWidth: '5px',
                }}
                type="button"
              >
                <div className="flex items-center gap-2 font-semibold text-[#263649]">
                  <Clock3 className="h-4 w-4 text-[#c3a583]" />
                  <span>{booking.start}</span>
                  <span className="text-slate-300">–</span>
                  <span className="text-slate-500">{booking.end}</span>
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#263649]">{booking.customerName}</p>
                  <p className="mt-1 truncate text-sm text-slate-400">{booking.serviceName}</p>
                </div>

                <div className="flex min-w-0 items-center gap-3">
                  {professional ? (
                    <SchedulerAvatar
                      accent={professional.accent}
                      avatar={professional.avatar}
                      name={professional.name}
                      shortName={professional.shortName}
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
                      <UserRound className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#263649]">
                      {professional?.name ?? 'Columna no disponible'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {professional?.kind === 'RESOURCE'
                        ? `Cabina${professional.capacity ? ` · ${professional.capacity} personas` : ''}`
                        : 'Especialista asignado'}
                      {professional?.branchName ? ` · ${professional.branchName}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Phone className="h-4 w-4 text-[#c3a583]" />
                  {booking.phone}
                </div>

                <SchedulerStatusBadge
                  className="w-fit"
                  color={statusColor}
                  status={booking.status}
                />
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#f5ede4] text-[#ad8b67]">
            <CalendarDays className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-[#263649]">No hay reservas con estos filtros</h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-400">
            Cambia la fecha, el estado o las columnas seleccionadas, o crea una nueva cita.
          </p>
          <Button
            className="mt-5 rounded-2xl bg-[#263649] text-white hover:bg-[#1d2b3a]"
            disabled={!canWrite}
            onClick={onOpenNewBooking}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva cita
          </Button>
        </div>
      )}
    </section>
  )
}
