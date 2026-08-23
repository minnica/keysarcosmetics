'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@cosmetics/ui'
import { KeyRound, ShieldCheck, X } from 'lucide-react'
import type { Booking } from '@/lib/mock-scheduler-data'

interface SchedulerFinancialAccessDialogProps {
  open: boolean
  booking: Booking | null
  purpose?: 'financial' | 'record' | 'history'
  onOpenChange: (open: boolean) => void
  onAuthorize: (booking: Booking, personalCode: string) => string | null
}

export function SchedulerFinancialAccessDialog({
  open,
  booking,
  purpose = 'financial',
  onOpenChange,
  onAuthorize,
}: SchedulerFinancialAccessDialogProps) {
  const [personalCode, setPersonalCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setPersonalCode('')
    setError('')
  }, [open, booking])

  if (!booking) return null

  const title =
    purpose === 'history'
      ? 'Autorizar historial de visitas'
      : purpose === 'record'
        ? 'Autorizar ficha del cliente'
        : 'Autorizar historial financiero'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!booking) return
    const authorizationError = onAuthorize(booking, personalCode)
    if (authorizationError) {
      setError(authorizationError)
      return
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scheduler-dialog border-0 bg-transparent p-0 shadow-none sm:max-w-[440px]">
        <div className="scheduler-modal-shell overflow-hidden rounded-2xl">
          <DialogHeader className="border-b border-[rgba(236,209,200,0.88)] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[1.35rem] font-semibold tracking-[-0.025em] text-[var(--scheduler-ink-strong)]">
                  {title}
                </DialogTitle>
                <p className="mt-1 truncate text-[0.88rem] text-slate-500">{booking.customerName}</p>
              </div>
              <button
                aria-label="Cerrar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(236,209,200,0.95)] bg-white text-slate-500 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <form className="space-y-4 bg-white px-5 py-5" onSubmit={handleSubmit}>
            <div className="flex items-start gap-3 rounded-xl bg-slate-100 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--scheduler-accent-strong)]" />
              <p className="text-[0.84rem] leading-5 text-slate-600">
                El código identifica al usuario, valida que el cliente esté asignado a su perfil y registra esta consulta.
              </p>
            </div>

            <div>
              <label className="scheduler-modal-label" htmlFor="financial-personal-code">
                Código personal
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  aria-describedby={error ? 'financial-code-error' : undefined}
                  aria-invalid={Boolean(error)}
                  autoComplete="off"
                  autoFocus
                  className="scheduler-modal-input pl-10 tracking-[0.2em]"
                  id="financial-personal-code"
                  inputMode="numeric"
                  maxLength={8}
                  onChange={(event) => {
                    setPersonalCode(event.target.value.replace(/\D/g, ''))
                    setError('')
                  }}
                  placeholder="••••"
                  type="password"
                  value={personalCode}
                />
              </div>
              {error ? (
                <p className="mt-2 text-[0.84rem] font-medium text-rose-600" id="financial-code-error" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-[rgba(236,209,200,0.72)] pt-4">
              <Button className="scheduler-modal-secondary" onClick={() => onOpenChange(false)} type="button">
                Cancelar
              </Button>
              <Button className="scheduler-modal-cta" disabled={!personalCode} type="submit">
                Autorizar consulta
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
