'use client'

import { Button } from '@cosmetics/ui'
import { CalendarDays, Clock3, Phone, Plus, UserRound } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  bookingStatuses,
  type Booking,
  type BookingStatusColors,
  type Professional,
} from '@/lib/mock-scheduler-data'
import { SchedulerAvatar } from './SchedulerAvatar'

interface SchedulerAgendaListProps {
  bookings: Booking[]
  professionals: Professional[]
  selectedDate: Date
  statusColors: BookingStatusColors
  onOpenBooking: (booking: Booking) => void
  onOpenNewBooking: () => void
}

export function SchedulerAgendaList({
  bookings,
  professionals,
  selectedDate,
  statusColors,
  onOpenBooking,
  onOpenNewBooking,
}: SchedulerAgendaListProps) {
  const orderedBookings = [...bookings].sort((left, right) =>
    left.start.localeCompare(right.start),
  )

  return (
    <section className="overflow-hidden rounded-[28px] border border-[rgba(236,209,200,0.82)] bg-white shadow-[0_18px_45px_rgba(43,35,28,0.06)]">
      <div className="flex flex-col gap-4 border-b border-[#eee6df] bg-[linear-gradient(180deg,#fff_0%,#fcfaf8_100%)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
          onClick={onOpenNewBooking}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva cita
        </Button>
      </div>

      {orderedBookings.length ? (
        <div className="divide-y divide-[#eee6df]">
          {orderedBookings.map((booking) => {
            const professional = professionals.find(
              (candidate) => candidate.id === booking.professionalId,
            )
            const status = bookingStatuses[booking.status]
            const statusColor = statusColors[booking.status]

            return (
              <button
                className="grid w-full gap-4 px-5 py-5 text-left transition-colors hover:bg-[#fcfaf8] sm:px-6 lg:grid-cols-[110px_minmax(220px,1.2fr)_minmax(190px,1fr)_minmax(150px,.8fr)_auto] lg:items-center"
                key={booking.id}
                onClick={() => onOpenBooking(booking)}
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
                      {professional?.name ?? 'Especialista no disponible'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Recurso asignado</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Phone className="h-4 w-4 text-[#c3a583]" />
                  {booking.phone}
                </div>

                <span
                  className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{
                    backgroundColor: `${statusColor}20`,
                    color: statusColor,
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
                  {status.label}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#f5ede4] text-[#ad8b67]">
            <CalendarDays className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-[#263649]">No hay reservas con estos filtros</h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-400">
            Cambia la fecha, el estado o los especialistas seleccionados, o crea una nueva cita.
          </p>
          <Button
            className="mt-5 rounded-2xl bg-[#263649] text-white hover:bg-[#1d2b3a]"
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
