'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@cosmetics/ui'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarClock, CreditCard, Phone, User, Wallet, X } from 'lucide-react'
import { type Booking } from '@/lib/mock-scheduler-data'
import { formatMoney, getProfessionalName, getServiceByName } from './scheduler-utils'

interface SchedulerDetailDialogProps {
  open: boolean
  view: 'payment' | 'record'
  booking: Booking | null
  selectedDate: Date
  onOpenChange: (open: boolean) => void
}

export function SchedulerDetailDialog({
  open,
  view,
  booking,
  selectedDate,
  onOpenChange,
}: SchedulerDetailDialogProps) {
  if (!booking) return null

  const service = getServiceByName(booking.serviceName)
  const professionalName = getProfessionalName(booking.professionalId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scheduler-dialog border-0 bg-transparent p-0 shadow-none sm:max-w-[680px]">
        <div className="scheduler-modal-shell overflow-hidden rounded-[30px]">
          <DialogHeader className="border-b border-[rgba(236,209,200,0.88)] px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="label-caps">{view === 'payment' ? 'Pago' : 'Ficha'}</p>
                <DialogTitle className="mt-1 text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--scheduler-ink-strong)]">
                  {view === 'payment' ? 'Detalle de pago' : 'Ficha de reserva'}
                </DialogTitle>
                <p className="mt-1 text-[0.92rem] text-slate-500">{booking.customerName}</p>
              </div>
              <button
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(236,209,200,0.95)] bg-white text-slate-500 shadow-sm transition hover:bg-[rgba(245,237,228,0.85)] hover:text-slate-700"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-4 bg-[linear-gradient(180deg,rgba(243,240,233,0.4)_0%,rgba(255,255,255,0.22)_100%)] px-4 py-4 md:px-6 md:py-5">
            <div className="scheduler-modal-section rounded-[24px] p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                  <p className="text-[0.78rem] uppercase tracking-[0.18em] text-slate-400">Servicio</p>
                  <p className="mt-1 text-[1rem] font-semibold text-[var(--scheduler-ink-strong)]">{booking.serviceName}</p>
                </div>
                <div className="rounded-[20px] border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                  <p className="text-[0.78rem] uppercase tracking-[0.18em] text-slate-400">Importe</p>
                  <p className="mt-1 text-[1rem] font-semibold text-[var(--scheduler-ink-strong)]">{formatMoney(service?.price ?? 0)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3 rounded-[20px] border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                  <CalendarClock className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[0.78rem] uppercase tracking-[0.18em] text-slate-400">Horario</p>
                    <p className="mt-1 text-[0.96rem] text-[var(--scheduler-ink-strong)] capitalize">
                      {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} - {booking.start} a {booking.end}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[20px] border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                  <User className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[0.78rem] uppercase tracking-[0.18em] text-slate-400">Profesional</p>
                    <p className="mt-1 text-[0.96rem] text-[var(--scheduler-ink-strong)]">{professionalName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[20px] border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                  <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[0.78rem] uppercase tracking-[0.18em] text-slate-400">Telefono</p>
                    <p className="mt-1 text-[0.96rem] text-[var(--scheduler-ink-strong)]">{booking.phone || 'Sin informacion'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[20px] border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                  {view === 'payment' ? (
                    <Wallet className="mt-0.5 h-4 w-4 text-slate-400" />
                  ) : (
                    <CreditCard className="mt-0.5 h-4 w-4 text-slate-400" />
                  )}
                  <div>
                    <p className="text-[0.78rem] uppercase tracking-[0.18em] text-slate-400">
                      {view === 'payment' ? 'Estado de pago' : 'Referencia de pago'}
                    </p>
                    <p className="mt-1 text-[0.96rem] text-[var(--scheduler-ink-strong)]">{booking.paymentLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="scheduler-modal-secondary" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
