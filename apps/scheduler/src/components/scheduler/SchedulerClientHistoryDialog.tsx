'use client'

import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle, cn } from '@cosmetics/ui'
import { CalendarClock, CalendarDays, CheckCircle2, Clock3, UserX, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { bookingStatuses, type Booking } from '@/lib/mock-scheduler-data'
import type { ClientVisitCategory, ClientVisitHistoryEntry } from './scheduler-utils'

interface SchedulerClientHistoryDialogProps {
  open: boolean
  booking: Booking | null
  history: ClientVisitHistoryEntry[]
  onOpenChange: (open: boolean) => void
}

const categoryMeta: Record<
  ClientVisitCategory,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  attended: {
    label: 'Asistió',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700',
  },
  'no-show': {
    label: 'No asistió',
    icon: UserX,
    className: 'bg-rose-50 text-rose-700',
  },
  scheduled: {
    label: 'Solo agendada',
    icon: Clock3,
    className: 'bg-sky-50 text-sky-700',
  },
}

function formatVisitDate(value: string): string {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es })
}

export function SchedulerClientHistoryDialog({
  open,
  booking,
  history,
  onOpenChange,
}: SchedulerClientHistoryDialogProps) {
  if (!booking) return null

  const counts = history.reduce(
    (result, entry) => ({ ...result, [entry.category]: result[entry.category] + 1 }),
    { attended: 0, 'no-show': 0, scheduled: 0 } as Record<ClientVisitCategory, number>,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scheduler-dialog border-0 bg-transparent p-0 shadow-none sm:max-w-[620px]">
        <div className="scheduler-modal-shell overflow-hidden rounded-2xl">
          <DialogHeader className="border-b border-[rgba(236,209,200,0.88)] bg-white px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[1.35rem] font-semibold tracking-[-0.025em] text-[var(--scheduler-ink-strong)]">
                  Historial de citas y visitas
                </DialogTitle>
                <p className="mt-1 truncate text-[0.9rem] text-slate-500">{booking.customerName}</p>
              </div>
              <button
                aria-label="Cerrar historial"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(236,209,200,0.95)] bg-white text-slate-500 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="bg-[rgba(255,255,255,0.94)] px-5 py-5 sm:px-6">
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {(Object.keys(categoryMeta) as ClientVisitCategory[]).map((category, index) => {
                const meta = categoryMeta[category]
                const Icon = meta.icon
                return (
                  <div
                    key={category}
                    className={cn('px-3 py-3', index > 0 && 'border-l border-slate-200')}
                  >
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate text-[0.7rem] font-medium sm:text-[0.76rem]">{meta.label}</span>
                    </div>
                    <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--scheduler-ink-strong)]">
                      {counts[category]}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1">
              {history.length ? (
                history.map((entry) => {
                  const category = categoryMeta[entry.category]
                  const CategoryIcon = category.icon
                  return (
                    <div
                      key={entry.bookingId}
                      className="rounded-xl border border-[rgba(236,209,200,0.78)] bg-white px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[0.78rem] text-slate-500">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span className="capitalize">{formatVisitDate(entry.date)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{entry.start}–{entry.end}</span>
                          </div>
                          <p className="mt-1.5 truncate text-[0.92rem] font-semibold text-[var(--scheduler-ink-strong)]">
                            {entry.serviceName}
                          </p>
                          <p className="mt-0.5 truncate text-[0.78rem] text-slate-500">
                            {entry.professionalName}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold', category.className)}>
                            <CategoryIcon className="h-3.5 w-3.5" />
                            {category.label}
                          </span>
                          <Badge className={cn('border text-[0.66rem] font-medium', bookingStatuses[entry.status].badgeClassName)}>
                            {bookingStatuses[entry.status].label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
                  <CalendarClock className="h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-[0.92rem] font-semibold text-slate-700">Sin citas registradas</p>
                  <p className="mt-1 text-[0.8rem] text-slate-500">El historial aparecerá aquí después de agendar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
