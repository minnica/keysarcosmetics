'use client'

import type { JSX } from 'react'
import {
  CalendarPlus2,
  Copy,
  Filter,
  Globe,
  MapPinned,
  Search,
  Smartphone,
  Sparkles,
  Wallet,
} from 'lucide-react'
import {
  type AvailabilityBlock,
  type Booking,
  type BookingPurchaseType,
  type BookingStatus,
  schedulerLegendItems,
  schedulerProfessionals,
  schedulerReferenceDateKey,
  schedulerServices,
  type Professional,
} from '@/lib/mock-scheduler-data'

export const schedulerOpeningHour = 0
export const schedulerClosingHour = 24

export const startHourOptions = Array.from({ length: schedulerClosingHour - schedulerOpeningHour }, (_value, index) => {
  const hour = schedulerOpeningHour + index
  return hour.toString().padStart(2, '0')
})

export const endHourOptions = Array.from({ length: schedulerClosingHour - schedulerOpeningHour + 1 }, (_value, index) => {
  const hour = schedulerOpeningHour + index
  return hour.toString().padStart(2, '0')
})

export const minuteOptions = ['00', '15', '30', '45']
export const schedulerHeaderOffset = 124
export const schedulerRowHeight = 78
export const schedulerSlotMinutes = 60
export const schedulerCardTopInset = 12
export const schedulerCardBottomInset = 12
export const schedulerCardHeight = schedulerRowHeight - schedulerCardTopInset - schedulerCardBottomInset
export const schedulerBaseMinutes = schedulerOpeningHour * 60
export const schedulerClosingMinutes = schedulerClosingHour * 60

export function getSchedulerCardTop(startCellIndex: number): number {
  return schedulerHeaderOffset + startCellIndex * schedulerRowHeight + schedulerCardTopInset
}

export interface BookingDraft {
  bookingId?: string
  clientId: string | null
  customerName: string
  customerEmail: string
  serviceId: string
  professionalId: string
  date: Date
  hour: string
  minute: string
  status: BookingStatus
  phone: string
  paymentLabel: string
  notes: string
  internalNote: string
}

export interface EmptySlotAction {
  professionalId: string
  startTime: string
}

export type ClientVisitCategory = 'attended' | 'no-show' | 'scheduled'

export interface ClientVisitHistoryEntry {
  bookingId: string
  date: string
  start: string
  end: string
  serviceName: string
  professionalName: string
  status: BookingStatus
  category: ClientVisitCategory
}

export interface BlockDraft {
  blockId?: string
  professionalId: string
  date: Date
  startHour: string
  startMinute: string
  endHour: string
  endMinute: string
  label?: string
  variant?: AvailabilityBlock['variant']
}

export function getMinutesFromTime(value: string): number {
  const [rawHours = '0', rawMinutes = '0'] = value.split(':')
  const hours = Number(rawHours)
  const minutes = Number(rawMinutes)
  return hours * 60 + minutes
}

export function getAppointmentStyle(
  start: string,
  end: string,
  baseMinutes = schedulerBaseMinutes,
  closingMinutes = schedulerClosingMinutes,
): { top: string; height: string } {
  const startMinutes = getMinutesFromTime(start)
  const endMinutes = getMinutesFromTime(end)
  const slotCount = Math.ceil((closingMinutes - baseMinutes) / schedulerSlotMinutes)
  const startCellIndex = Math.max(
    0,
    Math.min(
      Math.floor((startMinutes - baseMinutes) / schedulerSlotMinutes),
      slotCount,
    ),
  )
  const endCellIndex = Math.max(
    startCellIndex + 1,
    Math.min(
      Math.ceil((endMinutes - baseMinutes) / schedulerSlotMinutes),
      slotCount,
    ),
  )
  const rowSpan = endCellIndex - startCellIndex

  return {
    top: `${getSchedulerCardTop(startCellIndex)}px`,
    height: `${Math.max(rowSpan * schedulerRowHeight - schedulerCardTopInset - schedulerCardBottomInset, 34)}px`,
  }
}

export function getSingleCellAppointmentStyle(
  start: string,
  baseMinutes = schedulerBaseMinutes,
  closingMinutes = schedulerClosingMinutes,
): { top: string; height: string } {
  const startMinutes = getMinutesFromTime(start)
  const slotCount = Math.ceil((closingMinutes - baseMinutes) / schedulerSlotMinutes)
  const startCellIndex = Math.max(
    0,
    Math.min(
      Math.floor((startMinutes - baseMinutes) / schedulerSlotMinutes),
      slotCount,
    ),
  )

  return {
    top: `${getSchedulerCardTop(startCellIndex)}px`,
    height: `${schedulerCardHeight}px`,
  }
}

export function getCurrentTimeLineStyle(
  value: string,
  baseMinutes = schedulerBaseMinutes,
): { top: string } {
  const currentMinutes = getMinutesFromTime(value)
  const pixelsPerMinute = schedulerRowHeight / 60

  return {
    top: `${schedulerHeaderOffset + (currentMinutes - baseMinutes) * pixelsPerMinute}px`,
  }
}

export function addMinutesToTime(value: string, minutesToAdd: number): string {
  const totalMinutes = getMinutesFromTime(value) + minutesToAdd
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const startMinutesA = getMinutesFromTime(startA)
  const endMinutesA = getMinutesFromTime(endA)
  const startMinutesB = getMinutesFromTime(startB)
  const endMinutesB = getMinutesFromTime(endB)

  return startMinutesA < endMinutesB && endMinutesA > startMinutesB
}

export function getClientVisitHistory(
  bookings: Booking[],
  clientBooking: Booking,
): ClientVisitHistoryEntry[] {
  const normalizedPhone = clientBooking.phone.replace(/\D/g, '')

  return bookings
    .filter((booking) => {
      if (clientBooking.clientId && booking.clientId) {
        return booking.clientId === clientBooking.clientId
      }

      return Boolean(normalizedPhone) && booking.phone.replace(/\D/g, '') === normalizedPhone
    })
    .map((booking): ClientVisitHistoryEntry => ({
      bookingId: booking.id,
      date: booking.date ?? schedulerReferenceDateKey,
      start: booking.start,
      end: booking.end,
      serviceName: booking.serviceName,
      professionalName: getProfessionalName(booking.professionalId),
      status: booking.status,
      category:
        booking.status === 'arrived'
          ? 'attended'
          : booking.status === 'no-show'
            ? 'no-show'
            : 'scheduled',
    }))
    .sort((left, right) => {
      const dateComparison = right.date.localeCompare(left.date)
      return dateComparison || right.start.localeCompare(left.start)
    })
}

export function getAvailableBookingStartTimes({
  bookings,
  availabilityBlocks,
  dateKey,
  professionalId,
  durationMinutes,
  editingBookingId,
  allowBlockedTimes = false,
}: {
  bookings: Booking[]
  availabilityBlocks: AvailabilityBlock[]
  dateKey: string
  professionalId: string
  durationMinutes: number
  editingBookingId?: string
  allowBlockedTimes?: boolean
}): string[] {
  if (!professionalId || durationMinutes <= 0) return []

  const occupiedBookings = bookings.filter((booking) => {
    const bookingDateKey = booking.date ?? schedulerReferenceDateKey
    return (
      booking.id !== editingBookingId &&
      booking.status !== 'canceled' &&
      bookingDateKey === dateKey &&
      booking.professionalId === professionalId
    )
  })
  const occupiedBlocks = availabilityBlocks.filter((block) => {
    const blockDateKey = block.date ?? schedulerReferenceDateKey
    return blockDateKey === dateKey && block.professionalId === professionalId
  })

  const candidates: string[] = []
  for (
    let startMinutes = schedulerBaseMinutes;
    startMinutes + durationMinutes <= schedulerClosingMinutes;
    startMinutes += 15
  ) {
    const hours = Math.floor(startMinutes / 60).toString().padStart(2, '0')
    const minutes = (startMinutes % 60).toString().padStart(2, '0')
    const start = `${hours}:${minutes}`
    const end = addMinutesToTime(start, durationMinutes)
    const overlapsBooking = occupiedBookings.some((booking) =>
      timesOverlap(booking.start, booking.end, start, end),
    )
    const overlapsBlock = occupiedBlocks.some((block) =>
      timesOverlap(block.start, block.end, start, end),
    )

    if (!overlapsBooking && (allowBlockedTimes || !overlapsBlock)) candidates.push(start)
  }

  return candidates
}

export function createDraft(
  selectedDate: Date,
  professionals: Professional[],
  professionalId?: string,
  startTime = '11:00',
): BookingDraft {
  const [hour = '11', minute = '00'] = startTime.split(':')

  return {
    clientId: null,
    customerName: '',
    customerEmail: '',
    serviceId: schedulerServices[0]?.id ?? '',
    professionalId: professionalId ?? professionals[0]?.id ?? '',
    date: selectedDate,
    hour,
    minute,
    status: 'reserved',
    phone: '',
    paymentLabel: 'No pagado',
    notes: '',
    internalNote: '',
  }
}

export function createDraftFromBooking(booking: Booking, selectedDate: Date): BookingDraft {
  const [hour = '11', minute = '00'] = booking.start.split(':')
  const matchedService = getServiceByName(booking.serviceName)
  const bookingDate = new Date(`${booking.date ?? schedulerReferenceDateKey}T12:00:00`)

  return {
    bookingId: booking.id,
    clientId: booking.clientId ?? null,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail ?? '',
    serviceId: matchedService?.id ?? schedulerServices[0]?.id ?? '',
    professionalId: booking.professionalId,
    date: Number.isNaN(bookingDate.getTime()) ? selectedDate : bookingDate,
    hour,
    minute,
    status: booking.status as BookingStatus,
    phone: booking.phone,
    paymentLabel: booking.paymentLabel,
    notes: booking.notes ?? '',
    internalNote: '',
  }
}

export function createBlockDraft(
  selectedDate: Date,
  professionals: Professional[],
  professionalId?: string,
  startTime = '11:00',
  endTime = addMinutesToTime(startTime, 60),
): BlockDraft {
  const [startHour = '11', startMinute = '00'] = startTime.split(':')
  const safeEndTime =
    getMinutesFromTime(endTime) > schedulerClosingMinutes ? `${schedulerClosingHour.toString().padStart(2, '0')}:00` : endTime
  const [endHour = '12', endMinute = '00'] = safeEndTime.split(':')

  return {
    professionalId: professionalId ?? professionals[0]?.id ?? '',
    date: selectedDate,
    startHour,
    startMinute,
    endHour,
    endMinute,
  }
}

export function createBlockDraftFromBlock(block: AvailabilityBlock, selectedDate: Date): BlockDraft {
  const [startHour = '11', startMinute = '00'] = block.start.split(':')
  const [endHour = '12', endMinute = '00'] = block.end.split(':')
  const blockDate = new Date(`${block.date ?? schedulerReferenceDateKey}T12:00:00`)

  return {
    blockId: block.id,
    professionalId: block.professionalId,
    date: Number.isNaN(blockDate.getTime()) ? selectedDate : blockDate,
    startHour,
    startMinute,
    endHour,
    endMinute,
    label: block.label,
    variant: block.variant,
  }
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

export interface ClientPurchaseAccount {
  previousVisits: number
  settledPurchases: number
  settledAmount: number
  outstandingBalance: number
}

export interface ClientPaymentHistoryEntry {
  bookingId: string
  date: string
  purchaseType: BookingPurchaseType
  amount: number
  tentativeAmount?: number
  label: string
}

function normalizeAccountPhone(value: string): string {
  return value.replace(/\D/g, '').slice(-10)
}

function belongsToClient(candidate: Booking, clientBooking: Booking): boolean {
  if (candidate.clientId && clientBooking.clientId) {
    return candidate.clientId === clientBooking.clientId
  }

  const candidatePhone = normalizeAccountPhone(candidate.phone)
  const clientPhone = normalizeAccountPhone(clientBooking.phone)
  return candidatePhone.length === 10 && candidatePhone === clientPhone
}

export function getClientPurchaseAccount(
  bookings: Booking[],
  clientBooking: Booking,
  excludedBookingId?: string,
): ClientPurchaseAccount {
  const currentBookingDateTime = `${clientBooking.date ?? schedulerReferenceDateKey}T${clientBooking.start}`
  const previousVisits = bookings.filter((booking) => {
    if (booking.id === clientBooking.id || !belongsToClient(booking, clientBooking)) return false

    const bookingDateTime = `${booking.date ?? schedulerReferenceDateKey}T${booking.start}`
    return bookingDateTime < currentBookingDateTime
  }).length
  const purchaseRecords = bookings.filter(
    (booking) =>
      booking.id !== excludedBookingId &&
      Boolean(booking.purchaseType) &&
      (booking.purchaseAmount ?? 0) > 0 &&
      belongsToClient(booking, clientBooking),
  )
  const layawayBalances: number[] = []
  const layawayTotals: number[] = []
  let settledPurchases = 0
  let settledAmount = 0
  let settlementPayments = 0

  purchaseRecords.forEach((booking) => {
    if (booking.purchaseType === 'cash' && (booking.purchaseAmount ?? 0) > 0) {
      settledPurchases += 1
      settledAmount += booking.purchaseAmount ?? 0
      return
    }

    if (booking.purchaseType === 'settlement') {
      settlementPayments += booking.purchaseAmount ?? 0
      return
    }

    if (booking.purchaseType === 'layaway') {
      const tentativeAmount = booking.tentativePurchaseAmount ?? 0
      const initialPayment = booking.purchaseAmount ?? 0
      layawayBalances.push(Math.max(0, tentativeAmount - initialPayment))
      layawayTotals.push(tentativeAmount)
    }
  })

  let outstandingBalance = 0
  layawayBalances.forEach((balance, index) => {
    const appliedPayment = Math.min(balance, settlementPayments)
    const remainingBalance = Math.max(0, balance - appliedPayment)
    settlementPayments -= appliedPayment

    if (remainingBalance === 0) {
      settledPurchases += 1
      settledAmount += layawayTotals[index] ?? 0
    } else {
      outstandingBalance += remainingBalance
    }
  })

  return { previousVisits, settledPurchases, settledAmount, outstandingBalance }
}

export function getClientPaymentHistory(
  bookings: Booking[],
  clientBooking: Booking,
): ClientPaymentHistoryEntry[] {
  return bookings
    .filter(
      (booking) =>
        Boolean(booking.purchaseType) &&
        (booking.purchaseAmount ?? 0) > 0 &&
        belongsToClient(booking, clientBooking),
    )
    .map((booking) => ({
      bookingId: booking.id,
      date: booking.date ?? schedulerReferenceDateKey,
      purchaseType: booking.purchaseType as BookingPurchaseType,
      amount: booking.purchaseAmount ?? 0,
      ...(booking.tentativePurchaseAmount
        ? { tentativeAmount: booking.tentativePurchaseAmount }
        : {}),
      label: booking.paymentLabel,
    }))
    .sort((left, right) => right.date.localeCompare(left.date))
}

export function getLegendIcon(icon: (typeof schedulerLegendItems)[number]['icon']): JSX.Element {
  const className = 'h-4 w-4'

  switch (icon) {
    case 'globe':
      return <Globe className={className} />
    case 'calendar-plus':
      return <CalendarPlus2 className={className} />
    case 'user-search':
      return <Filter className={className} />
    case 'house':
      return <MapPinned className={className} />
    case 'video':
      return <Smartphone className={className} />
    case 'package':
      return <Sparkles className={className} />
    case 'dollar':
      return <Wallet className={className} />
    case 'link':
      return <Copy className={className} />
    case 'wallet':
      return <Wallet className={className} />
    case 'scan':
      return <Search className={className} />
  }
}

export function getProfessionalName(professionalId: string): string {
  return (
    schedulerProfessionals.find((professional) => professional.id === professionalId)?.name ??
    'Sin especialista asignado'
  )
}

export function bookingRequiresMultipleSpecialists(booking: Booking): boolean {
  const resourceName = getProfessionalName(booking.professionalId).toLocaleUpperCase('es-MX')
  const serviceName = booking.serviceName.toLocaleUpperCase('es-MX')
  return resourceName.includes('DOBLE') || serviceName.includes('DOBLE')
}

export function getServiceByName(serviceName: string) {
  return schedulerServices.find((service) => service.name === serviceName)
}

export function getProfessionalInitials(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join('')
    .toUpperCase()
}
