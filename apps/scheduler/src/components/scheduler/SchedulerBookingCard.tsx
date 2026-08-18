'use client'

import { cn } from '@cosmetics/ui'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CalendarClock,
  CreditCard,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  SquarePen,
  Trash2,
  User,
  Wallet,
} from 'lucide-react'
import { bookingStatuses, type Booking, type BookingStatus } from '@/lib/mock-scheduler-data'
import { formatMoney, getProfessionalName, getServiceByName } from './scheduler-utils'

interface SchedulerBookingCardProps {
  booking: Booking
  selectedDate: Date
  onEdit: (booking: Booking) => void
  onDelete: (bookingId: string) => void
  onStatusChange: (bookingId: string, status: BookingStatus) => void
  onTogglePaid: (bookingId: string) => void
  onOpenDetail: (booking: Booking, view: 'payment' | 'record') => void
}

export function SchedulerBookingCard({
  booking,
  selectedDate,
  onEdit,
  onDelete,
  onStatusChange,
  onTogglePaid,
  onOpenDetail,
}: SchedulerBookingCardProps) {
  const statusMeta = bookingStatuses[booking.status]
  const professionalName = getProfessionalName(booking.professionalId)
  const service = getServiceByName(booking.serviceName)
  const statusOrder: BookingStatus[] = ['reserved', 'confirmed', 'arrived', 'no-show', 'pending', 'waiting']

  return (
    <div className="space-y-3 text-[12px] text-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            className="truncate text-left text-[1rem] font-semibold text-[var(--scheduler-ink-strong)] underline decoration-[rgba(54,65,82,0.32)] underline-offset-2"
            type="button"
          >
            {booking.customerName}
          </button>
          <p className="mt-2 truncate text-[0.98rem] font-semibold uppercase tracking-[0.01em] text-slate-700">
            {booking.serviceName}
          </p>
          <p className="mt-1 text-[0.96rem] text-slate-700">{formatMoney(service?.price ?? 0)}</p>
          <p className="mt-0.5 text-[0.88rem] capitalize text-slate-600">
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} - {booking.start} a {booking.end} hrs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(236,209,200,0.95)] bg-white text-rose-500 shadow-sm transition hover:bg-rose-50"
            onClick={() => onDelete(booking.id)}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex items-center gap-2 rounded-xl border border-[rgba(236,209,200,0.95)] bg-white px-3 py-2 text-[var(--scheduler-accent-strong)] shadow-sm transition hover:bg-[rgba(245,237,228,0.85)]"
            onClick={() => onEdit(booking)}
            type="button"
          >
            <SquarePen className="h-3.5 w-3.5" />
            <span className="text-[0.9rem] font-medium">Editar</span>
          </button>
        </div>
      </div>

      <div className="space-y-2.5 border-t border-[rgba(236,209,200,0.88)] pt-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(236,209,200,0.95)] bg-white text-slate-500">
            <User className="h-3.5 w-3.5" />
          </div>
          <p className="text-[0.9rem] text-slate-700">
            Se atendera con: <span className="font-semibold text-[var(--scheduler-ink-strong)]">{professionalName}</span>
          </p>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(236,209,200,0.95)] bg-white text-slate-500">
            <Phone className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.9rem]">
              <span>{booking.phone || 'Sin informacion'}</span>
              <span className="text-slate-300">|</span>
              <button
                className="inline-flex items-center gap-1 text-[var(--scheduler-ink-strong)] underline underline-offset-2"
                type="button"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Hablar por WhatsApp
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(236,209,200,0.95)] bg-white text-slate-500">
            <Mail className="h-3.5 w-3.5" />
          </div>
          <p className={cn('text-[0.9rem]', booking.notes ? 'text-slate-700' : 'italic text-slate-400')}>
            {booking.notes || 'Sin informacion'}
          </p>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(236,209,200,0.95)] bg-white text-slate-500">
            <CreditCard className="h-3.5 w-3.5" />
          </div>
          <p className="text-[0.9rem] text-slate-700">{booking.paymentLabel || 'Sin informacion'}</p>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(236,209,200,0.95)] bg-white text-slate-500">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <p className={cn('text-[0.9rem]', booking.sessionLabel ? 'text-slate-700' : 'italic text-slate-400')}>
            {booking.sessionLabel || 'Sin informacion'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[rgba(236,209,200,0.88)] pt-3">
        <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[0.9rem] text-sky-500">
          <span className={cn('h-4.5 w-4.5 rounded-full border-2 border-sky-300', statusMeta.dotClassName)} />
          <span className="font-medium">{statusMeta.label}</span>
        </div>
        {statusOrder.map((status) => (
          <button
            key={status}
            className={cn(
              'h-5 w-5 rounded-full border border-white shadow-sm',
              bookingStatuses[status].dotClassName,
              status === booking.status ? 'ring-2 ring-offset-2 ring-[rgba(195,165,131,0.5)]' : '',
            )}
            onClick={() => onStatusChange(booking.id, status)}
            title={bookingStatuses[status].label}
            type="button"
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(236,209,200,0.88)] pt-3">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(236,209,200,0.95)] bg-white px-3 py-2 text-[0.9rem] text-[var(--scheduler-accent-strong)] shadow-sm transition hover:bg-[rgba(245,237,228,0.85)]"
          onClick={() => onOpenDetail(booking, 'payment')}
          type="button"
        >
          <Wallet className="h-3.5 w-3.5" />
          {booking.paymentLabel === 'No pagado' ? 'Registrar pago' : 'Ver pago'}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(236,209,200,0.95)] bg-white px-3 py-2 text-[0.9rem] text-[var(--scheduler-accent-strong)] shadow-sm transition hover:bg-[rgba(245,237,228,0.85)]"
          onClick={() => onOpenDetail(booking, 'record')}
          type="button"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          Ficha
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(236,209,200,0.95)] bg-white px-3 py-2 text-[0.9rem] text-[var(--scheduler-accent-strong)] shadow-sm transition hover:bg-[rgba(245,237,228,0.85)]"
          onClick={() => onTogglePaid(booking.id)}
          type="button"
        >
          <CreditCard className="h-3.5 w-3.5" />
          {booking.paymentLabel === 'No pagado' ? 'Marcar pagada' : 'Marcar impaga'}
        </button>
      </div>
    </div>
  )
}
