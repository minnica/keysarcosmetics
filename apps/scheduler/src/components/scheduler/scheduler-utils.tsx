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
  type BookingStatus,
  schedulerLegendItems,
  schedulerProfessionals,
  schedulerReferenceDateKey,
  schedulerServices,
  type Professional,
} from '@/lib/mock-scheduler-data'

export const schedulerOpeningHour = 9
export const schedulerClosingHour = 21

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
export const schedulerAppointmentVisualOffset = schedulerRowHeight / 2

export interface BookingDraft {
  bookingId?: string
  customerName: string
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

export interface BlockDraft {
  blockId?: string
  professionalId: string
  date: Date
  startHour: string
  startMinute: string
  endHour: string
  endMinute: string
}

export function getMinutesFromTime(value: string): number {
  const [rawHours = '0', rawMinutes = '0'] = value.split(':')
  const hours = Number(rawHours)
  const minutes = Number(rawMinutes)
  return hours * 60 + minutes
}

export function getAppointmentStyle(start: string, end: string): { top: string; height: string } {
  const startMinutes = getMinutesFromTime(start)
  const endMinutes = getMinutesFromTime(end)
  const startCellIndex = Math.max(
    0,
    Math.min(
      Math.floor((startMinutes - schedulerBaseMinutes) / schedulerSlotMinutes),
      schedulerClosingHour - schedulerOpeningHour,
    ),
  )
  const endCellIndex = Math.max(
    startCellIndex + 1,
    Math.min(
      Math.ceil((endMinutes - schedulerBaseMinutes) / schedulerSlotMinutes),
      schedulerClosingHour - schedulerOpeningHour + 1,
    ),
  )
  const rowSpan = endCellIndex - startCellIndex

  return {
    top: `${schedulerHeaderOffset + startCellIndex * schedulerRowHeight - schedulerAppointmentVisualOffset + schedulerCardTopInset}px`,
    height: `${Math.max(rowSpan * schedulerRowHeight - schedulerCardTopInset - schedulerCardBottomInset, 34)}px`,
  }
}

export function getSingleCellAppointmentStyle(start: string): { top: string; height: string } {
  const startMinutes = getMinutesFromTime(start)
  const startCellIndex = Math.max(
    0,
    Math.min(
      Math.floor((startMinutes - schedulerBaseMinutes) / schedulerSlotMinutes),
      schedulerClosingHour - schedulerOpeningHour,
    ),
  )

  return {
    top: `${schedulerHeaderOffset + startCellIndex * schedulerRowHeight - schedulerAppointmentVisualOffset + schedulerCardTopInset}px`,
    height: `${schedulerCardHeight}px`,
  }
}

export function getCurrentTimeLineStyle(value: string): { top: string } {
  const currentMinutes = getMinutesFromTime(value)
  const pixelsPerMinute = schedulerRowHeight / 60

  return {
    top: `${schedulerHeaderOffset + (currentMinutes - schedulerBaseMinutes) * pixelsPerMinute}px`,
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

export function createDraft(
  selectedDate: Date,
  professionals: Professional[],
  professionalId?: string,
  startTime = '11:00',
): BookingDraft {
  const [hour = '11', minute = '00'] = startTime.split(':')

  return {
    customerName: '',
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
    customerName: booking.customerName,
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
  }
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
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
    'Sin profesional asignado'
  )
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
