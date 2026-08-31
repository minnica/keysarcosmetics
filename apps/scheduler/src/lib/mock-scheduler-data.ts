export type SchedulerView = 'day' | 'week'
export type BookingStatus = 'reserved' | 'confirmed' | 'arrived' | 'no-show' | 'pending' | 'waiting' | 'canceled'
export type BookingChannel = 'web' | 'marketplace' | 'charly' | 'walk-in'
export type BookingPurchaseType = 'cash' | 'layaway' | 'settlement'

export const schedulerStatusColorStorageKey = 'scheduler-status-colors-by-commerce'

export const defaultBookingStatusColors: Record<BookingStatus, string> = {
  reserved: '#38bdf8',
  confirmed: '#fbbf24',
  arrived: '#e879f9',
  'no-show': '#fb7185',
  pending: '#f87171',
  waiting: '#a3e635',
  canceled: '#94a3b8',
}

export type BookingStatusColors = Record<BookingStatus, string>

export function getBookingStatusColors(commerceId: string): BookingStatusColors {
  if (typeof window === 'undefined') return { ...defaultBookingStatusColors }

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(schedulerStatusColorStorageKey) ?? '{}',
    ) as Record<string, Partial<BookingStatusColors>>

    return {
      ...defaultBookingStatusColors,
      ...(saved[commerceId] ?? {}),
    }
  } catch {
    return { ...defaultBookingStatusColors }
  }
}

export interface CommerceOption {
  id: string
  name: string
}

export interface BranchOption {
  id: string
  commerceId: string
  name: string
}

export interface Professional {
  id: string
  commerceIds: string[]
  branchIds: string[]
  name: string
  shortName: string
  avatar: string
  accent: string
}

export interface AttendingSpecialist {
  id: string
  name: string
  branchIds: string[]
}

export interface BookingServiceRecord {
  id: string
  specialistId: string
  specialistName: string
  sharePercentage: number
  allocatedAmount: number
}

export interface Booking {
  id: string
  clientId?: string
  branchId?: string
  date?: string
  customerName: string
  serviceName: string
  professionalId: string
  start: string
  end: string
  status: BookingStatus
  phone: string
  customerEmail?: string
  notes?: string
  paymentLabel: string
  purchased?: boolean
  purchaseType?: BookingPurchaseType
  purchaseAmount?: number
  tentativePurchaseAmount?: number
  serviceRecords?: BookingServiceRecord[]
  sessionLabel?: string
}

export interface AvailabilityBlock {
  id: string
  branchId?: string
  date?: string
  professionalId: string
  start: string
  end: string
  label: string
  variant: 'unavailable' | 'blocked'
}

export interface ServiceOption {
  id: string
  name: string
  durationMinutes: number
  price: number
}

export interface SchedulerLegendItem {
  id: string
  label: string
  icon: 'globe' | 'calendar-plus' | 'user-search' | 'house' | 'video' | 'package' | 'dollar' | 'link' | 'wallet' | 'scan'
}

export const schedulerReferenceDate = new Date('2026-06-30T11:00:00')
export const schedulerReferenceDateKey = '2026-06-30'

export const schedulerCommerces: CommerceOption[] = [
  { id: 'opatra-mexico', name: 'OPATRA MEXICO' },
  { id: 'keysar-cosmetics', name: 'KEYSAR COSMETICS' },
]

export const schedulerBranches: BranchOption[] = [
  { id: 'galerias-insurgentes', commerceId: 'opatra-mexico', name: 'GALERÍAS INSURGENTES' },
  { id: 'mitikah', commerceId: 'opatra-mexico', name: 'MITIKAH' },
  { id: 'masaryk', commerceId: 'opatra-mexico', name: 'MASARYK' },
  { id: 'keysar-reforma', commerceId: 'keysar-cosmetics', name: 'REFORMA' },
  { id: 'keysar-polanco', commerceId: 'keysar-cosmetics', name: 'POLANCO' },
]

export const bookingStatusOptions: Array<{ value: BookingStatus | 'active'; label: string }> = [
  { value: 'active', label: 'Reservas activas' },
  { value: 'reserved', label: 'Reservado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'arrived', label: 'Asistió' },
  { value: 'no-show', label: 'No asistio' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'waiting', label: 'En espera' },
  { value: 'canceled', label: 'Cancelado' },
]

export const bookingStatuses: Record<
  BookingStatus,
  { label: string; badgeClassName: string; cardClassName: string; dotClassName: string }
> = {
  reserved: {
    label: 'Reservado',
    badgeClassName: 'bg-sky-100 text-sky-700 border-sky-200',
    cardClassName: 'bg-sky-50 border-sky-200 text-slate-700',
    dotClassName: 'bg-sky-400',
  },
  confirmed: {
    label: 'Confirmado',
    badgeClassName: 'bg-amber-100 text-amber-800 border-amber-200',
    cardClassName: 'bg-amber-50 border-amber-200 text-amber-900',
    dotClassName: 'bg-amber-400',
  },
  arrived: {
    label: 'Asistió',
    badgeClassName: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    cardClassName: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800',
    dotClassName: 'bg-fuchsia-300',
  },
  'no-show': {
    label: 'No asistio',
    badgeClassName: 'bg-rose-100 text-rose-700 border-rose-200',
    cardClassName: 'bg-rose-50 border-rose-200 text-rose-800',
    dotClassName: 'bg-rose-300',
  },
  pending: {
    label: 'Pendiente',
    badgeClassName: 'bg-red-100 text-red-700 border-red-200',
    cardClassName: 'bg-red-50 border-red-200 text-red-800',
    dotClassName: 'bg-red-400',
  },
  waiting: {
    label: 'En espera',
    badgeClassName: 'bg-lime-100 text-lime-800 border-lime-200',
    cardClassName: 'bg-lime-50 border-lime-200 text-lime-900',
    dotClassName: 'bg-lime-400',
  },
  canceled: {
    label: 'Cancelado',
    badgeClassName: 'bg-slate-100 text-slate-600 border-slate-200',
    cardClassName: 'bg-slate-50 border-slate-200 text-slate-600',
    dotClassName: 'bg-slate-400',
  },
}

export const schedulerProfessionals: Professional[] = [
  {
    id: 'mitikah-1',
    commerceIds: ['opatra-mexico'],
    branchIds: ['mitikah'],
    name: 'MITIKAH 1',
    shortName: 'M1',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80',
    accent: '#7c8f7a',
  },
  {
    id: 'mitikah-vip-b',
    commerceIds: ['opatra-mexico'],
    branchIds: ['mitikah'],
    name: 'MITIKAH VIP B-DOBLE',
    shortName: 'MB',
    avatar: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=96&q=80',
    accent: '#d1a964',
  },
  {
    id: 'mitikah-vip-ind',
    commerceIds: ['opatra-mexico'],
    branchIds: ['mitikah'],
    name: 'MITIKAH VIP INDIVIDUAL',
    shortName: 'MI',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&q=80',
    accent: '#8fc8de',
  },
  {
    id: 'mitikah-vip-c',
    commerceIds: ['opatra-mexico'],
    branchIds: ['mitikah'],
    name: 'MITIKAH VIP C-DOBLE',
    shortName: 'MC',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80',
    accent: '#d7b779',
  },
  {
    id: 'opatra-cabina-1',
    commerceIds: ['opatra-mexico'],
    branchIds: ['galerias-insurgentes'],
    name: 'OPATRA CABINA 1',
    shortName: 'OC1',
    avatar: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=96&q=80',
    accent: '#90be6d',
  },
  {
    id: 'opatra-cabina-2',
    commerceIds: ['opatra-mexico'],
    branchIds: ['galerias-insurgentes'],
    name: 'OPATRA CABINA 2',
    shortName: 'OC2',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=96&q=80',
    accent: '#f4978e',
  },
  {
    id: 'masaryk-cabina-doble',
    commerceIds: ['opatra-mexico'],
    branchIds: ['masaryk'],
    name: 'MASARYK CAB DOBLE',
    shortName: 'MC',
    avatar: '',
    accent: '#b6a6ca',
  },
  {
    id: 'masaryk-cabina-1',
    commerceIds: ['opatra-mexico'],
    branchIds: ['masaryk'],
    name: 'MASARYK',
    shortName: 'M',
    avatar: '',
    accent: '#c9b7a5',
  },
  {
    id: 'pending-1',
    commerceIds: ['opatra-mexico'],
    branchIds: ['galerias-insurgentes'],
    name: 'CITAS PENDIENTES 1',
    shortName: 'CP',
    avatar: '',
    accent: '#c5bccf',
  },
  {
    id: 'pending-2',
    commerceIds: ['opatra-mexico'],
    branchIds: ['galerias-insurgentes'],
    name: 'CITAS PENDIENTES 2',
    shortName: 'CP',
    avatar: '',
    accent: '#d0c7d9',
  },
  {
    id: 'patricia-delgado',
    commerceIds: ['opatra-mexico', 'keysar-cosmetics'],
    branchIds: ['mitikah', 'keysar-reforma', 'keysar-polanco'],
    name: 'PATRICIA DELGADO',
    shortName: 'PD',
    avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=96&q=80',
    accent: '#8bb09b',
  },
]

export const schedulerAttendingSpecialists: AttendingSpecialist[] = [
  {
    id: 'attending-patricia',
    name: 'Patricia Delgado',
    branchIds: ['galerias-insurgentes', 'mitikah', 'keysar-reforma'],
  },
  {
    id: 'attending-mariana',
    name: 'Mariana Ortega',
    branchIds: ['galerias-insurgentes', 'keysar-reforma', 'keysar-polanco'],
  },
  {
    id: 'attending-valeria',
    name: 'Valeria Hernández',
    branchIds: ['galerias-insurgentes', 'mitikah'],
  },
  {
    id: 'attending-renata',
    name: 'Renata Castillo',
    branchIds: ['mitikah', 'masaryk'],
  },
  {
    id: 'attending-camila',
    name: 'Camila Torres',
    branchIds: ['masaryk', 'keysar-polanco'],
  },
]

export const schedulerServices: ServiceOption[] = [
  { id: 'svc-1', name: 'FACIAL VIP CORTESIA', durationMinutes: 60, price: 0 },
  { id: 'svc-2', name: 'FACIAL + 10 MIN OXYCURA', durationMinutes: 60, price: 2200 },
  { id: 'svc-3', name: 'MEMBRESIA 7 SESIONES', durationMinutes: 60, price: 16500 },
  { id: 'svc-4', name: 'FACIAL ANTI ACNE', durationMinutes: 45, price: 1700 },
  { id: 'svc-5', name: 'CORPORAL DOBLE INSTAGRAM', durationMinutes: 90, price: 3500 },
  { id: 'svc-6', name: 'FACIAL PREMIUM', durationMinutes: 60, price: 2900 },
  { id: 'svc-7', name: 'KEYSAR LEAD (SR)', durationMinutes: 60, price: 1850 },
  { id: 'svc-8', name: 'DOBLE FACIAL', durationMinutes: 120, price: 4200 },
]

export const schedulerTimeSlots = Array.from({ length: 24 }, (_value, index) => {
  const hour = index
  return `${hour.toString().padStart(2, '0')}:00`
})

export const schedulerDayBookings: Booking[] = [
  {
    id: 'history-booking-patricia-layaway',
    clientId: 'client-patricia-delgado',
    branchId: 'galerias-insurgentes',
    date: '2026-05-12',
    customerName: 'Patricia Delgado',
    serviceName: 'FACIAL PREMIUM',
    professionalId: 'opatra-cabina-1',
    start: '11:00',
    end: '12:00',
    status: 'arrived',
    phone: '+52 55 5100 0280',
    customerEmail: 'patricia@example.com',
    paymentLabel: 'Apartado · $5,000 de $30,000',
    purchased: true,
    purchaseType: 'layaway',
    purchaseAmount: 5000,
    tentativePurchaseAmount: 30000,
    serviceRecords: [
      {
        id: 'service-record-patricia-first-visit',
        specialistId: 'attending-patricia',
        specialistName: 'Patricia Delgado',
        sharePercentage: 100,
        allocatedAmount: 5000,
      },
    ],
  },
  {
    id: 'booking-1',
    clientId: 'client-patricia-delgado',
    customerName: 'Patricia Delgado',
    serviceName: 'FACIAL VIP CORTESIA',
    professionalId: 'opatra-cabina-1',
    start: '11:00',
    end: '12:00',
    status: 'arrived',
    phone: '+52 55 5100 0280',
    customerEmail: 'patricia@example.com',
    notes: 'Ejemplo de segunda visita con un apartado pendiente por liquidar.',
    paymentLabel: 'Saldo histórico pendiente',
  },
  {
    id: 'booking-2',
    customerName: 'Juan Manuel Garcia / Marcos Marcial',
    serviceName: 'MEMBRESIA 7 SESIONES',
    professionalId: 'mitikah-vip-ind',
    start: '12:00',
    end: '13:00',
    status: 'waiting',
    phone: '+52 55 2501 8821',
    paymentLabel: 'Pagado con membresia',
    sessionLabel: 'Sesion 2 de 7',
  },
  {
    id: 'booking-3',
    customerName: 'Isabel Chasarol / Elluz',
    serviceName: 'FACIAL PREMIUM',
    professionalId: 'opatra-cabina-1',
    start: '13:00',
    end: '14:00',
    status: 'confirmed',
    phone: '+52 55 2876 1184',
    paymentLabel: 'Pago pendiente',
  },
  {
    id: 'booking-4',
    customerName: 'Jose Luis Vite Rivera',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'opatra-cabina-1',
    start: '14:00',
    end: '15:00',
    status: 'confirmed',
    phone: '+52 55 1234 9087',
    paymentLabel: 'Reserva abonada',
  },
  {
    id: 'booking-5',
    customerName: 'Jocy Moreno',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'mitikah-vip-b',
    start: '14:00',
    end: '15:00',
    status: 'confirmed',
    phone: '+52 55 8100 1099',
    paymentLabel: 'Reserva pagada',
  },
  {
    id: 'booking-6',
    customerName: 'Martha Yolanda Ortega Gil / Ramiro',
    serviceName: 'DOBLE FACIAL',
    professionalId: 'opatra-cabina-2',
    start: '11:00',
    end: '13:00',
    status: 'confirmed',
    phone: '+52 55 7922 8754',
    paymentLabel: 'Pago pendiente',
  },
  {
    id: 'booking-7',
    clientId: 'client-maria-camila',
    customerName: 'Maria Camila Celis',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'mitikah-vip-ind',
    start: '18:00',
    end: '19:00',
    status: 'confirmed',
    phone: '+52 55 3001 9044',
    customerEmail: 'maria.camila@example.com',
    paymentLabel: 'Reserva pagada',
  },
  {
    id: 'booking-8',
    clientId: 'client-adriana-acosta',
    customerName: 'Adriana Acosta',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'masaryk-cabina-doble',
    start: '17:00',
    end: '18:00',
    status: 'no-show',
    phone: '+52 55 7001 4477',
    customerEmail: 'adriana@example.com',
    paymentLabel: 'No pagado',
  },
  {
    id: 'booking-9',
    customerName: 'Rosa Dominguez',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'masaryk-cabina-doble',
    start: '19:00',
    end: '20:00',
    status: 'confirmed',
    phone: '+52 55 2211 3355',
    paymentLabel: 'Reserva abonada',
  },
  {
    id: 'booking-10',
    customerName: 'Adriana Rincon Lopez / Daniel Molina',
    serviceName: 'DOBLE FACIAL',
    professionalId: 'mitikah-vip-c',
    start: '11:00',
    end: '13:00',
    status: 'confirmed',
    phone: '+52 55 6310 4498',
    paymentLabel: 'Reserva abonada',
  },
  {
    id: 'booking-11',
    customerName: 'Ana Karen Vaca Robles',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'mitikah-vip-ind',
    start: '11:00',
    end: '12:00',
    status: 'no-show',
    phone: '+52 55 6300 9981',
    paymentLabel: 'No pagado',
  },
  {
    id: 'booking-12',
    customerName: 'Martha Ducker / Carlos Politicas',
    serviceName: 'FACIAL PREMIUM',
    professionalId: 'opatra-cabina-1',
    start: '15:00',
    end: '16:00',
    status: 'confirmed',
    phone: '+52 55 6322 0014',
    paymentLabel: 'Reserva abonada',
  },
  {
    id: 'booking-13',
    customerName: 'Maria Rosa Riverol / Loreto Politicas',
    serviceName: 'FACIAL PREMIUM',
    professionalId: 'opatra-cabina-2',
    start: '13:00',
    end: '14:00',
    status: 'confirmed',
    phone: '+52 55 7811 0092',
    paymentLabel: 'Reserva abonada',
  },
  {
    id: 'booking-14',
    clientId: 'client-yumi-hirasawa',
    customerName: 'Yumi Hirasawa',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'opatra-cabina-2',
    start: '17:00',
    end: '18:00',
    status: 'confirmed',
    phone: '+52 55 7712 3389',
    customerEmail: 'yumi@example.com',
    paymentLabel: 'Pago pendiente',
  },
  {
    id: 'booking-15',
    customerName: 'Ruth Valverde / Saul',
    serviceName: 'MEMBRESIA 7 SESIONES',
    professionalId: 'masaryk-cabina-doble',
    start: '13:00',
    end: '14:00',
    status: 'confirmed',
    phone: '+52 55 6622 3318',
    paymentLabel: 'Pagado con membresia',
    sessionLabel: 'Sesion 4 de 7',
  },
  {
    id: 'booking-16',
    customerName: 'Erika Monzon',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'masaryk-cabina-1',
    start: '11:00',
    end: '12:00',
    status: 'no-show',
    phone: '+52 55 6211 3997',
    paymentLabel: 'No pagado',
  },
  {
    id: 'booking-17',
    customerName: 'Llamada pendiente / seguimiento',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'pending-1',
    start: '12:00',
    end: '13:00',
    status: 'pending',
    phone: '+52 55 7100 1110',
    paymentLabel: 'Pendiente de confirmar',
  },
  {
    id: 'booking-18',
    customerName: 'Reserva web por asignar',
    serviceName: 'FACIAL PREMIUM',
    professionalId: 'pending-2',
    start: '16:00',
    end: '17:00',
    status: 'pending',
    phone: '+52 55 7220 4488',
    paymentLabel: 'Pendiente de confirmar',
  },
]

export const schedulerDayBlocks: AvailabilityBlock[] = [
  {
    id: 'block-1',
    professionalId: 'mitikah-1',
    start: '10:00',
    end: '11:00',
    label: 'Especialista no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-2',
    professionalId: 'mitikah-vip-b',
    start: '10:00',
    end: '11:00',
    label: 'Especialista no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-3',
    professionalId: 'mitikah-vip-ind',
    start: '10:00',
    end: '11:00',
    label: 'Especialista no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-3b',
    professionalId: 'mitikah-vip-c',
    start: '10:00',
    end: '11:00',
    label: 'Especialista no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-4',
    professionalId: 'opatra-cabina-1',
    start: '10:00',
    end: '11:00',
    label: 'Especialista no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-5',
    professionalId: 'opatra-cabina-2',
    start: '10:00',
    end: '11:00',
    label: 'Especialista no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-6',
    professionalId: 'masaryk-cabina-doble',
    start: '10:00',
    end: '11:00',
    label: 'Especialista no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-6b',
    professionalId: 'masaryk-cabina-1',
    start: '10:00',
    end: '11:00',
    label: 'Especialista no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-6c',
    professionalId: 'pending-1',
    start: '10:00',
    end: '11:00',
    label: 'Especialista no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-6d',
    professionalId: 'pending-2',
    start: '10:00',
    end: '11:00',
    label: 'Especialista no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-7',
    professionalId: 'mitikah-1',
    start: '20:00',
    end: '21:00',
    label: 'No reservar',
    variant: 'blocked',
  },
]

export const schedulerWeekBookings: Array<Booking & { dayOffset: number }> = [
  {
    id: 'week-1',
    customerName: 'Hora bloqueada',
    serviceName: 'Sabado alta demanda',
    professionalId: 'mitikah-1',
    start: '11:00',
    end: '21:00',
    status: 'pending',
    phone: '',
    paymentLabel: 'Bloqueo interno',
    dayOffset: 5,
  },
  {
    id: 'week-2',
    customerName: 'Hora bloqueada',
    serviceName: 'Domingo mantenimiento',
    professionalId: 'mitikah-1',
    start: '11:00',
    end: '21:00',
    status: 'pending',
    phone: '',
    paymentLabel: 'Bloqueo interno',
    dayOffset: 6,
  },
]

export const schedulerLegendItems: SchedulerLegendItem[] = [
  { id: 'web', label: 'Realizada desde sitio web', icon: 'globe' },
  { id: 'market', label: 'Generada por AgendaPro Market', icon: 'calendar-plus' },
  { id: 'charly', label: 'Generada por Charly', icon: 'user-search' },
  { id: 'home', label: 'Reserva a domicilio', icon: 'house' },
  { id: 'video', label: 'Reserva por videollamada', icon: 'video' },
  { id: 'no-pref', label: 'Sin preferencia de especialista', icon: 'user-search' },
  { id: 'plan', label: 'Plan reservado', icon: 'package' },
  { id: 'payment', label: 'Agregar pago', icon: 'dollar' },
  { id: 'link', label: 'Copiar link', icon: 'link' },
  { id: 'pos', label: 'Pagada con POS', icon: 'wallet' },
  { id: 'scan', label: 'Reserva en escaneo rapido', icon: 'scan' },
]
