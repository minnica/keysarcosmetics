'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  MultiCombobox,
} from '@cosmetics/ui'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Banknote, CalendarClock, CircleDollarSign, CreditCard, Phone, User, UsersRound, WalletCards, X } from 'lucide-react'
import {
  type AttendingSpecialist,
  type Booking,
  type BookingPurchaseType,
} from '@/lib/mock-scheduler-data'
import {
  formatMoney,
  getProfessionalName,
  getServiceByName,
  type ClientPurchaseAccount,
} from './scheduler-utils'

interface SchedulerDetailDialogProps {
  open: boolean
  view: 'payment' | 'attendance' | 'record'
  booking: Booking | null
  attendingSpecialists: AttendingSpecialist[]
  clientAccount: ClientPurchaseAccount
  financialHistoryAuthorized: boolean
  requiresMultipleSpecialists: boolean
  selectedDate: Date
  onOpenChange: (open: boolean) => void
  onSaveAttendance: (bookingId: string, attendingSpecialistIds?: string[]) => void
  onSavePayment: (
    bookingId: string,
    purchaseType: BookingPurchaseType,
    amount: number,
    tentativeAmount?: number,
    attendingSpecialistIds?: string[],
  ) => void
}

export function SchedulerDetailDialog({
  open,
  view,
  booking,
  attendingSpecialists,
  clientAccount,
  financialHistoryAuthorized,
  requiresMultipleSpecialists,
  selectedDate,
  onOpenChange,
  onSaveAttendance,
  onSavePayment,
}: SchedulerDetailDialogProps) {
  const clientOutstandingBalance = clientAccount.outstandingBalance
  const canSettleFromHistory =
    financialHistoryAuthorized &&
    clientAccount.previousVisits > 0 &&
    clientOutstandingBalance > 0
  const [purchaseType, setPurchaseType] = useState<BookingPurchaseType>('cash')
  const [amount, setAmount] = useState('')
  const [tentativeAmount, setTentativeAmount] = useState('')
  const [amountError, setAmountError] = useState('')
  const [paymentStep, setPaymentStep] = useState<'payment' | 'specialist'>('payment')
  const [selectedSpecialistIds, setSelectedSpecialistIds] = useState<string[]>([])
  const [specialistError, setSpecialistError] = useState('')

  useEffect(() => {
    if (!open || !booking || view === 'record') return

    setPurchaseType(
      booking.purchaseType ??
        (booking.purchased === false && clientOutstandingBalance > 0 ? 'settlement' : 'cash'),
    )
    setAmount(booking.purchaseAmount ? String(booking.purchaseAmount) : '')
    setTentativeAmount(
      booking.tentativePurchaseAmount ? String(booking.tentativePurchaseAmount) : '',
    )
    setPaymentStep(view === 'attendance' ? 'specialist' : 'payment')
    setSelectedSpecialistIds(
      booking.serviceRecords?.map((record) => record.specialistId) ?? [],
    )
    setAmountError('')
    setSpecialistError('')
  }, [booking, clientOutstandingBalance, open, view])

  if (!booking) return null

  const service = getServiceByName(booking.serviceName)
  const professionalName = getProfessionalName(booking.professionalId)

  function validatePayment(): { amount: number; tentativeAmount?: number } | null {
    const parsedAmount = Number(amount.replace(',', '.'))
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAmountError('Ingresa un monto mayor a $0.')
      return null
    }

    if (purchaseType === 'layaway') {
      const parsedTentativeAmount = Number(tentativeAmount.replace(',', '.'))
      if (!Number.isFinite(parsedTentativeAmount) || parsedTentativeAmount <= 0) {
        setAmountError('Ingresa el valor de la compra tentativa.')
        return null
      }
      if (parsedAmount > parsedTentativeAmount) {
        setAmountError('El pago de apartado no puede superar la compra tentativa.')
        return null
      }
      return { amount: parsedAmount, tentativeAmount: parsedTentativeAmount }
    }

    if (purchaseType === 'settlement') {
      if (!financialHistoryAuthorized) {
        setAmountError('Autoriza el historial financiero desde la card antes de liquidar.')
        return null
      }
      if (clientAccount.previousVisits < 1) {
        setAmountError('La liquidación está disponible a partir de la segunda visita.')
        return null
      }
      if (clientOutstandingBalance <= 0) {
        setAmountError('El historial de la clienta no tiene saldo pendiente.')
        return null
      }
      if (parsedAmount > clientOutstandingBalance) {
        setAmountError('La liquidación no puede superar el saldo por pagar.')
        return null
      }
    }

    return { amount: parsedAmount }
  }

  function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validatePayment()) return

    setAmountError('')
    setPaymentStep('specialist')
  }

  function handleSpecialistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!booking) return

    const minimumSpecialists = requiresMultipleSpecialists ? 2 : 1
    if (selectedSpecialistIds.length < minimumSpecialists) {
      setSpecialistError(
        requiresMultipleSpecialists
          ? 'Selecciona al menos dos especialistas para este servicio.'
          : 'Selecciona al menos un especialista.',
      )
      return
    }

    if (view === 'attendance') {
      onSaveAttendance(booking.id, selectedSpecialistIds)
    } else {
      const payment = validatePayment()
      if (!payment) {
        setPaymentStep('payment')
        return
      }

      onSavePayment(
        booking.id,
        purchaseType,
        payment.amount,
        payment.tentativeAmount,
        selectedSpecialistIds,
      )
    }
    onOpenChange(false)
  }

  const numericAmount = Number(amount.replace(',', '.')) || 0
  const numericTentativeAmount = Number(tentativeAmount.replace(',', '.')) || 0
  const resultingBalance = purchaseType === 'layaway'
    ? Math.max(0, numericTentativeAmount - numericAmount)
    : purchaseType === 'settlement'
      ? Math.max(0, clientOutstandingBalance - numericAmount)
      : 0
  const selectedSpecialistCount = selectedSpecialistIds.length
  const dividedAmount = selectedSpecialistCount > 0
    ? numericAmount / selectedSpecialistCount
    : 0
  const dividedPercentage = selectedSpecialistCount > 0
    ? 100 / selectedSpecialistCount
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={view === 'record'
          ? 'scheduler-dialog border-0 bg-transparent p-0 shadow-none sm:max-w-[680px]'
          : 'scheduler-dialog border-0 bg-transparent p-0 shadow-none sm:max-w-[540px]'}
      >
        <div className="scheduler-modal-shell overflow-hidden rounded-2xl">
          <DialogHeader className="border-b border-[rgba(236,209,200,0.88)] px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[1.55rem] font-semibold tracking-[-0.025em] text-[var(--scheduler-ink-strong)]">
                  {view === 'record'
                    ? 'Ficha de reserva'
                    : view === 'payment' && paymentStep === 'payment'
                      ? 'Registrar pago'
                      : '¿Qué especialistas atendieron?'}
                </DialogTitle>
                {view === 'record' ? (
                  <p className="mt-1 text-[0.92rem] text-slate-500">{booking.customerName}</p>
                ) : null}
              </div>
              <button
                aria-label="Cerrar"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(236,209,200,0.95)] bg-white text-slate-500 transition hover:bg-[rgba(245,237,228,0.85)] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(195,165,131,0.55)]"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          {view !== 'record' ? (
            view === 'payment' && paymentStep === 'payment' ? (
              <form className="space-y-5 bg-white px-5 py-5 md:px-6" onSubmit={handlePaymentSubmit}>
              <fieldset>
                <legend className="scheduler-modal-label">Tipo de compra</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de compra">
                  <button
                    aria-checked={purchaseType === 'cash'}
                    className={purchaseType === 'cash'
                      ? 'flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--scheduler-ink-strong)] px-4 text-[0.95rem] font-medium text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2'
                      : 'flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[rgba(236,209,200,0.95)] bg-white px-4 text-[0.95rem] font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(195,165,131,0.55)]'}
                    onClick={() => setPurchaseType('cash')}
                    role="radio"
                    type="button"
                  >
                    <Banknote className="h-4 w-4" />
                    Contado
                  </button>
                  <button
                    aria-checked={purchaseType === 'layaway'}
                    className={purchaseType === 'layaway'
                      ? 'flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--scheduler-ink-strong)] px-4 text-[0.95rem] font-medium text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2'
                      : 'flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[rgba(236,209,200,0.95)] bg-white px-4 text-[0.95rem] font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(195,165,131,0.55)]'}
                    onClick={() => setPurchaseType('layaway')}
                    role="radio"
                    type="button"
                  >
                    <WalletCards className="h-4 w-4" />
                    Apartado
                  </button>
                  <button
                    aria-checked={purchaseType === 'settlement'}
                    className={purchaseType === 'settlement'
                      ? 'flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--scheduler-ink-strong)] px-3 text-[0.9rem] font-medium text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2'
                      : 'flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[rgba(236,209,200,0.95)] bg-white px-3 text-[0.9rem] font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(195,165,131,0.55)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'}
                    disabled={!canSettleFromHistory}
                    onClick={() => setPurchaseType('settlement')}
                    role="radio"
                    type="button"
                  >
                    <CircleDollarSign className="h-4 w-4" />
                    Liquidación
                  </button>
                </div>
                {!canSettleFromHistory ? (
                  <p className="mt-2 text-[0.8rem] text-slate-500">
                    {!financialHistoryAuthorized
                      ? 'Autoriza el historial financiero desde la card para consultar o liquidar deuda.'
                      : clientAccount.previousVisits < 1
                        ? 'Liquidación se habilita a partir de la segunda visita.'
                        : 'La clienta tiene historial, pero no registra saldo pendiente.'}
                  </p>
                ) : null}
              </fieldset>

              {canSettleFromHistory ? (
                <div className="flex items-center justify-between gap-4 rounded-xl bg-[rgba(245,237,228,0.72)] px-4 py-3">
                  <div>
                    <p className="text-[0.82rem] font-medium text-slate-600">Saldo recuperado del historial</p>
                    <p className="mt-0.5 text-[0.76rem] text-slate-500">
                      {clientAccount.previousVisits}{' '}
                      {clientAccount.previousVisits === 1 ? 'visita previa' : 'visitas previas'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[1rem] font-semibold tabular-nums text-amber-700">
                    {formatMoney(clientOutstandingBalance)}
                  </span>
                </div>
              ) : null}

              {purchaseType === 'settlement' ? (
                <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-[0.92rem]">
                  <span className="font-medium text-slate-600">Saldo actual</span>
                  <span className="font-semibold tabular-nums text-[var(--scheduler-ink-strong)]">
                    {formatMoney(clientOutstandingBalance)}
                  </span>
                </div>
              ) : null}

              <div className={purchaseType === 'layaway' ? 'grid gap-4 sm:grid-cols-2' : ''}>
                {purchaseType === 'layaway' ? (
                  <div>
                    <label className="scheduler-modal-label" htmlFor="scheduler-tentative-amount">
                      Compra tentativa
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-semibold text-slate-500">$</span>
                      <Input
                        aria-describedby={amountError ? 'scheduler-payment-error' : undefined}
                        aria-invalid={Boolean(amountError)}
                        className="scheduler-modal-input pl-8 text-lg font-semibold tabular-nums"
                        id="scheduler-tentative-amount"
                        inputMode="decimal"
                        min="0.01"
                        onChange={(event) => {
                          setTentativeAmount(event.target.value)
                          if (amountError) setAmountError('')
                        }}
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={tentativeAmount}
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="scheduler-modal-label" htmlFor="scheduler-payment-amount">
                    {purchaseType === 'layaway'
                      ? 'Pago de apartado'
                      : purchaseType === 'settlement'
                        ? 'Monto a liquidar'
                        : 'Monto de compra'}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-semibold text-slate-500">$</span>
                    <Input
                      aria-describedby={amountError ? 'scheduler-payment-error' : undefined}
                      aria-invalid={Boolean(amountError)}
                      autoFocus={purchaseType !== 'layaway'}
                      className="scheduler-modal-input pl-8 text-lg font-semibold tabular-nums"
                      id="scheduler-payment-amount"
                      inputMode="decimal"
                      max={purchaseType === 'settlement' ? clientOutstandingBalance : undefined}
                      min="0.01"
                      onChange={(event) => {
                        setAmount(event.target.value)
                        if (amountError) setAmountError('')
                      }}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={amount}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[rgba(245,237,228,0.72)] px-4 py-3 text-[0.92rem]">
                <span className="font-medium text-slate-600">
                  {purchaseType === 'layaway'
                    ? 'Saldo generado'
                    : purchaseType === 'settlement'
                      ? 'Saldo restante'
                      : 'Saldo generado'}
                </span>
                <span className="font-semibold tabular-nums text-[var(--scheduler-ink-strong)]">
                  {formatMoney(resultingBalance)}
                </span>
              </div>

              <div>
                {amountError ? (
                  <p className="mt-2 text-[0.85rem] font-medium text-rose-600" id="scheduler-payment-error">
                    {amountError}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 border-t border-[rgba(236,209,200,0.72)] pt-4">
                <Button className="scheduler-modal-secondary" onClick={() => onOpenChange(false)} type="button">
                  Cancelar
                </Button>
                <Button className="scheduler-modal-cta" type="submit">
                  Guardar pago
                </Button>
              </div>
            </form>
            ) : (
              <form className="space-y-5 bg-white px-5 py-5 md:px-6" onSubmit={handleSpecialistSubmit}>
                <div className="flex items-start gap-3 rounded-xl bg-[rgba(245,237,228,0.72)] px-4 py-3">
                  <UsersRound className="mt-0.5 h-5 w-5 shrink-0 text-[var(--scheduler-accent-strong)]" />
                  <div>
                    <p className="text-[0.94rem] font-semibold text-[var(--scheduler-ink-strong)]">
                      {requiresMultipleSpecialists
                        ? 'Este servicio requiere varios especialistas'
                        : 'Selecciona los especialistas'}
                    </p>
                    <p className="mt-0.5 text-[0.82rem] leading-5 text-slate-600">
                      {requiresMultipleSpecialists
                        ? view === 'attendance'
                          ? 'Selecciona al menos dos. Se generará un registro para cada especialista.'
                          : 'Selecciona al menos dos. El importe se dividirá en partes iguales y se generará un registro para cada especialista.'
                        : view === 'attendance'
                          ? 'Puedes seleccionar una o varias personas para cerrar la atención.'
                          : 'Puedes seleccionar una o varias personas. La participación se dividirá entre todas.'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="scheduler-modal-label" htmlFor="attending-specialists">
                    Especialistas que atendieron
                  </label>
                  <MultiCombobox
                    id="attending-specialists"
                    options={attendingSpecialists.map((specialist) => ({
                      value: specialist.id,
                      label: specialist.name,
                    }))}
                    value={selectedSpecialistIds}
                    onValueChange={(specialistIds) => {
                      setSelectedSpecialistIds(specialistIds)
                      setSpecialistError('')
                    }}
                    placeholder="Seleccionar especialistas"
                    searchPlaceholder="Buscar especialista..."
                    emptyMessage="No se encontraron especialistas"
                    selectedCountLabel="especialistas seleccionados"
                    className="h-12 rounded-xl border-[rgba(236,209,200,0.95)] bg-white px-4 text-[0.92rem] text-slate-700 hover:bg-slate-50"
                  />
                  <p className="mt-2 text-[0.78rem] text-slate-500">
                    Escribe un nombre para buscar. Puedes seleccionar varias personas.
                  </p>
                </div>

                {selectedSpecialistCount > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-4 py-3 text-[0.86rem]">
                    <span className="font-medium text-slate-600">
                      {selectedSpecialistCount}{' '}
                      {selectedSpecialistCount === 1 ? 'especialista' : 'especialistas'}
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--scheduler-ink-strong)]">
                      {selectedSpecialistCount === 1 ? '100%' : `≈ ${dividedPercentage.toFixed(2)}%`}
                      {view === 'payment' ? ` · ${formatMoney(dividedAmount)} por persona` : ' de participación'}
                    </span>
                  </div>
                ) : null}

                {specialistError ? (
                  <p className="text-[0.85rem] font-medium text-rose-600" role="alert">
                    {specialistError}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2 border-t border-[rgba(236,209,200,0.72)] pt-4">
                  {view === 'payment' ? (
                    <Button
                      className="scheduler-modal-secondary"
                      onClick={() => setPaymentStep('payment')}
                      type="button"
                    >
                      Volver al pago
                    </Button>
                  ) : (
                    <Button
                      className="scheduler-modal-secondary"
                      onClick={() => onOpenChange(false)}
                      type="button"
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button className="scheduler-modal-cta" type="submit">
                    {selectedSpecialistCount > 1
                      ? `Confirmar ${selectedSpecialistCount} registros`
                      : 'Confirmar registro'}
                  </Button>
                </div>
              </form>
            )
          ) : (
            <div className="space-y-4 bg-[linear-gradient(180deg,rgba(243,240,233,0.4)_0%,rgba(255,255,255,0.22)_100%)] px-4 py-4 md:px-6 md:py-5">
              <div className="scheduler-modal-section rounded-2xl p-4 md:p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                    <p className="text-[0.78rem] font-medium text-slate-500">Servicio</p>
                    <p className="mt-1 text-[1rem] font-semibold text-[var(--scheduler-ink-strong)]">{booking.serviceName}</p>
                  </div>
                  <div className="rounded-xl border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                    <p className="text-[0.78rem] font-medium text-slate-500">Importe</p>
                    <p className="mt-1 text-[1rem] font-semibold text-[var(--scheduler-ink-strong)]">{formatMoney(service?.price ?? 0)}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 rounded-xl border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-[0.78rem] font-medium text-slate-500">Horario</p>
                      <p className="mt-1 text-[0.96rem] text-[var(--scheduler-ink-strong)] capitalize">
                        {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} · {booking.start} a {booking.end}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                    <User className="mt-0.5 h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-[0.78rem] font-medium text-slate-500">Recurso de agenda</p>
                      <p className="mt-1 text-[0.96rem] text-[var(--scheduler-ink-strong)]">{professionalName}</p>
                    </div>
                  </div>

                  {booking.serviceRecords?.length ? (
                    <div className="flex items-start gap-3 rounded-xl border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                      <UsersRound className="mt-0.5 h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-[0.78rem] font-medium text-slate-500">Especialistas</p>
                        <div className="mt-1 space-y-1 text-[0.96rem] text-[var(--scheduler-ink-strong)]">
                          {booking.serviceRecords.map((record) => (
                            <p key={record.id}>
                              {record.specialistName} · {record.sharePercentage}%
                              {booking.purchased === false || !financialHistoryAuthorized
                                ? ''
                                : ` · ${formatMoney(record.allocatedAmount)}`}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-3 rounded-xl border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                    <Phone className="mt-0.5 h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-[0.78rem] font-medium text-slate-500">Teléfono</p>
                      <p className="mt-1 text-[0.96rem] text-[var(--scheduler-ink-strong)]">{booking.phone || 'Sin información'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                    <CreditCard className="mt-0.5 h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-[0.78rem] font-medium text-slate-500">Referencia de pago</p>
                      <p className="mt-1 text-[0.96rem] text-[var(--scheduler-ink-strong)]">
                        {financialHistoryAuthorized
                          ? booking.paymentLabel
                          : 'Historial financiero protegido'}
                      </p>
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
