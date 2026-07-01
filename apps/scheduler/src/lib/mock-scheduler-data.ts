export type SchedulerView = 'day' | 'week'
export type BookingStatus = 'reserved' | 'confirmed' | 'arrived' | 'no-show' | 'pending' | 'waiting'
export type BookingChannel = 'web' | 'marketplace' | 'charly' | 'walk-in'

export interface BranchOption {
  id: string
  name: string
}

export interface Professional {
  id: string
  branchId: string
  name: string
  shortName: string
  avatar: string
  accent: string
}

export interface Booking {
  id: string
  date?: string
  customerName: string
  serviceName: string
  professionalId: string
  start: string
  end: string
  status: BookingStatus
  phone: string
  notes?: string
  paymentLabel: string
  sessionLabel?: string
}

export interface AvailabilityBlock {
  id: string
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

export const schedulerBranches: BranchOption[] = [
  { id: 'opatra', name: 'OPATRA MEXICO' },
  { id: 'mitikah', name: 'MITIKAH' },
  { id: 'masaryk', name: 'MASARYK' },
]

export const bookingStatusOptions: Array<{ value: BookingStatus | 'active'; label: string }> = [
  { value: 'active', label: 'Reservas activas' },
  { value: 'reserved', label: 'Reservado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'arrived', label: 'Asiste' },
  { value: 'no-show', label: 'No asistio' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'waiting', label: 'En espera' },
]

export const bookingStatuses: Record<
  BookingStatus,
  { label: string; badgeClassName: string; cardClassName: string; dotClassName: string }
> = {
  reserved: {
    label: 'Reservado',
    badgeClassName: 'bg-sky-100 text-sky-700 border-sky-200',
    cardClassName: 'bg-sky-100/95 border-sky-200 text-slate-700',
    dotClassName: 'bg-sky-400',
  },
  confirmed: {
    label: 'Confirmado',
    badgeClassName: 'bg-amber-100 text-amber-800 border-amber-200',
    cardClassName: 'bg-amber-100/95 border-amber-200 text-amber-900',
    dotClassName: 'bg-amber-400',
  },
  arrived: {
    label: 'Asiste',
    badgeClassName: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    cardClassName: 'bg-fuchsia-100/95 border-fuchsia-200 text-fuchsia-800',
    dotClassName: 'bg-fuchsia-300',
  },
  'no-show': {
    label: 'No asistio',
    badgeClassName: 'bg-rose-100 text-rose-700 border-rose-200',
    cardClassName: 'bg-rose-100/95 border-rose-200 text-rose-800',
    dotClassName: 'bg-rose-300',
  },
  pending: {
    label: 'Pendiente',
    badgeClassName: 'bg-red-100 text-red-700 border-red-200',
    cardClassName: 'bg-red-100/95 border-red-200 text-red-800',
    dotClassName: 'bg-red-400',
  },
  waiting: {
    label: 'En espera',
    badgeClassName: 'bg-lime-100 text-lime-800 border-lime-200',
    cardClassName: 'bg-lime-100/95 border-lime-200 text-lime-900',
    dotClassName: 'bg-lime-400',
  },
}

export const schedulerProfessionals: Professional[] = [
  {
    id: 'mitikah-1',
    branchId: 'mitikah',
    name: 'MITIKAH 1',
    shortName: 'M1',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80',
    accent: '#7c8f7a',
  },
  {
    id: 'mitikah-vip-b',
    branchId: 'mitikah',
    name: 'MITIKAH VIP B-DOBLE',
    shortName: 'MB',
    avatar: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=96&q=80',
    accent: '#d1a964',
  },
  {
    id: 'mitikah-vip-ind',
    branchId: 'mitikah',
    name: 'MITIKAH VIP INDIVIDUAL',
    shortName: 'MI',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&q=80',
    accent: '#8fc8de',
  },
  {
    id: 'mitikah-vip-c',
    branchId: 'mitikah',
    name: 'MITIKAH VIP C-DOBLE',
    shortName: 'MC',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80',
    accent: '#d7b779',
  },
  {
    id: 'opatra-cabina-1',
    branchId: 'opatra',
    name: 'OPATRA CABINA 1',
    shortName: 'OC1',
    avatar: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=96&q=80',
    accent: '#90be6d',
  },
  {
    id: 'opatra-cabina-2',
    branchId: 'opatra',
    name: 'OPATRA CABINA 2',
    shortName: 'OC2',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=96&q=80',
    accent: '#f4978e',
  },
  {
    id: 'masaryk-cabina-doble',
    branchId: 'masaryk',
    name: 'MASARYK CAB DOBLE',
    shortName: 'MC',
    avatar: '',
    accent: '#b6a6ca',
  },
  {
    id: 'masaryk-cabina-1',
    branchId: 'masaryk',
    name: 'MASARYK',
    shortName: 'M',
    avatar: '',
    accent: '#c9b7a5',
  },
  {
    id: 'pending-1',
    branchId: 'opatra',
    name: 'CITAS PENDIENTES 1',
    shortName: 'CP',
    avatar: '',
    accent: '#c5bccf',
  },
  {
    id: 'pending-2',
    branchId: 'opatra',
    name: 'CITAS PENDIENTES 2',
    shortName: 'CP',
    avatar: '',
    accent: '#d0c7d9',
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

export const schedulerTimeSlots = Array.from({ length: 13 }, (_value, index) => {
  const hour = 9 + index
  return `${hour.toString().padStart(2, '0')}:00`
})

export const schedulerDayBookings: Booking[] = [
  {
    id: 'booking-1',
    customerName: 'Patricia Delgado',
    serviceName: 'FACIAL VIP CORTESIA',
    professionalId: 'opatra-cabina-1',
    start: '11:00',
    end: '12:00',
    status: 'waiting',
    phone: '+52 55 5100 0280',
    paymentLabel: 'No pagado',
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
    customerName: 'Maria Camila Celis',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'mitikah-vip-ind',
    start: '18:00',
    end: '19:00',
    status: 'confirmed',
    phone: '+52 55 3001 9044',
    paymentLabel: 'Reserva pagada',
  },
  {
    id: 'booking-8',
    customerName: 'Adriana Acosta',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'masaryk-cabina-doble',
    start: '17:00',
    end: '18:00',
    status: 'no-show',
    phone: '+52 55 7001 4477',
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
    customerName: 'Yumi Hirasawa',
    serviceName: 'KEYSAR LEAD (SR)',
    professionalId: 'opatra-cabina-2',
    start: '17:00',
    end: '18:00',
    status: 'confirmed',
    phone: '+52 55 7712 3389',
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
    label: 'Profesional no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-2',
    professionalId: 'mitikah-vip-b',
    start: '10:00',
    end: '11:00',
    label: 'Profesional no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-3',
    professionalId: 'mitikah-vip-ind',
    start: '10:00',
    end: '11:00',
    label: 'Profesional no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-3b',
    professionalId: 'mitikah-vip-c',
    start: '10:00',
    end: '11:00',
    label: 'Profesional no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-4',
    professionalId: 'opatra-cabina-1',
    start: '10:00',
    end: '11:00',
    label: 'Profesional no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-5',
    professionalId: 'opatra-cabina-2',
    start: '10:00',
    end: '11:00',
    label: 'Profesional no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-6',
    professionalId: 'masaryk-cabina-doble',
    start: '10:00',
    end: '11:00',
    label: 'Profesional no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-6b',
    professionalId: 'masaryk-cabina-1',
    start: '10:00',
    end: '11:00',
    label: 'Profesional no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-6c',
    professionalId: 'pending-1',
    start: '10:00',
    end: '11:00',
    label: 'Profesional no disponible',
    variant: 'unavailable',
  },
  {
    id: 'block-6d',
    professionalId: 'pending-2',
    start: '10:00',
    end: '11:00',
    label: 'Profesional no disponible',
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
  { id: 'no-pref', label: 'Sin preferencia de profesional', icon: 'user-search' },
  { id: 'plan', label: 'Plan reservado', icon: 'package' },
  { id: 'payment', label: 'Agregar pago', icon: 'dollar' },
  { id: 'link', label: 'Copiar link', icon: 'link' },
  { id: 'pos', label: 'Pagada con POS', icon: 'wallet' },
  { id: 'scan', label: 'Reserva en escaneo rapido', icon: 'scan' },
]
