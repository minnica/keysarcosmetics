export type SchedulerView = "day" | "week";
export type BookingStatus =
  | "reserved"
  | "confirmed"
  | "arrived"
  | "attended"
  | "no-show"
  | "pending"
  | "waiting"
  | "canceled";
export type BookingChannel = "web" | "marketplace" | "charly" | "walk-in";
export type BookingPurchaseType = "cash" | "layaway" | "settlement";

export type BookingStatusColors = Record<BookingStatus, string>;

export interface CommerceOption {
  id: string;
  name: string;
}

export interface BranchOption {
  id: string;
  commerceId: string;
  name: string;
}

export interface Professional {
  id: string;
  commerceIds: string[];
  branchIds: string[];
  name: string;
  shortName: string;
  avatar: string;
  accent: string;
}

export interface AttendingSpecialist {
  id: string;
  name: string;
  branchIds: string[];
}

export interface BookingServiceRecord {
  id: string;
  specialistId: string;
  specialistName: string;
  sharePercentage: number;
  allocatedAmount: number;
}

export interface Booking {
  id: string;
  clientId?: string;
  branchId?: string;
  date?: string;
  customerName: string;
  serviceName: string;
  professionalId: string;
  start: string;
  end: string;
  status: BookingStatus;
  phone: string;
  customerEmail?: string;
  notes?: string;
  paymentLabel: string;
  purchased?: boolean;
  purchaseType?: BookingPurchaseType;
  purchaseAmount?: number;
  tentativePurchaseAmount?: number;
  serviceRecords?: BookingServiceRecord[];
  sessionLabel?: string;
}

export interface AvailabilityBlock {
  id: string;
  branchId?: string;
  date?: string;
  professionalId: string;
  start: string;
  end: string;
  label: string;
  variant: "unavailable" | "blocked";
}

export interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

export interface SchedulerLegendItem {
  id: string;
  label: string;
  icon:
    | "globe"
    | "calendar-plus"
    | "user-search"
    | "house"
    | "video"
    | "package"
    | "dollar"
    | "link"
    | "wallet"
    | "scan";
}

export const bookingStatusOptions: Array<{
  value: BookingStatus | "active";
  label: string;
}> = [
  { value: "active", label: "Reservas activas" },
  { value: "reserved", label: "Reservado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "arrived", label: "Llegó" },
  { value: "attended", label: "Atendido" },
  { value: "no-show", label: "No asistió" },
  { value: "pending", label: "Pendiente" },
  { value: "waiting", label: "En espera" },
  { value: "canceled", label: "Cancelado" },
];

export const bookingStatuses: Record<
  BookingStatus,
  {
    label: string;
    badgeClassName: string;
    cardClassName: string;
    dotClassName: string;
  }
> = {
  reserved: {
    label: "Reservado",
    badgeClassName: "bg-sky-100 text-sky-700 border-sky-200",
    cardClassName: "bg-sky-50 border-sky-200 text-slate-700",
    dotClassName: "bg-sky-400",
  },
  confirmed: {
    label: "Confirmado",
    badgeClassName: "bg-amber-100 text-amber-800 border-amber-200",
    cardClassName: "bg-amber-50 border-amber-200 text-amber-900",
    dotClassName: "bg-amber-400",
  },
  arrived: {
    label: "Llegó",
    badgeClassName: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    cardClassName: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800",
    dotClassName: "bg-fuchsia-300",
  },
  attended: {
    label: "Atendido",
    badgeClassName: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cardClassName: "bg-emerald-50 border-emerald-200 text-emerald-800",
    dotClassName: "bg-emerald-400",
  },
  "no-show": {
    label: "No asistió",
    badgeClassName: "bg-rose-100 text-rose-700 border-rose-200",
    cardClassName: "bg-rose-50 border-rose-200 text-rose-800",
    dotClassName: "bg-rose-300",
  },
  pending: {
    label: "Pendiente",
    badgeClassName: "bg-red-100 text-red-700 border-red-200",
    cardClassName: "bg-red-50 border-red-200 text-red-800",
    dotClassName: "bg-red-400",
  },
  waiting: {
    label: "En espera",
    badgeClassName: "bg-lime-100 text-lime-800 border-lime-200",
    cardClassName: "bg-lime-50 border-lime-200 text-lime-900",
    dotClassName: "bg-lime-400",
  },
  canceled: {
    label: "Cancelado",
    badgeClassName: "bg-slate-100 text-slate-600 border-slate-200",
    cardClassName: "bg-slate-50 border-slate-200 text-slate-600",
    dotClassName: "bg-slate-400",
  },
};

export const defaultBookingStatusColors: BookingStatusColors = {
  reserved: "#38bdf8",
  confirmed: "#fbbf24",
  arrived: "#e879f9",
  attended: "#34d399",
  "no-show": "#fb7185",
  pending: "#f87171",
  waiting: "#a3e635",
  canceled: "#94a3b8",
};

export const schedulerLegendItems: SchedulerLegendItem[] = [
  { id: "web", label: "Realizada desde sitio web", icon: "globe" },
  {
    id: "market",
    label: "Generada por AgendaPro Market",
    icon: "calendar-plus",
  },
  { id: "charly", label: "Generada por Charly", icon: "user-search" },
  { id: "home", label: "Reserva a domicilio", icon: "house" },
  { id: "video", label: "Reserva por videollamada", icon: "video" },
  {
    id: "no-pref",
    label: "Sin preferencia de especialista",
    icon: "user-search",
  },
  { id: "plan", label: "Plan reservado", icon: "package" },
  { id: "payment", label: "Agregar pago", icon: "dollar" },
  { id: "link", label: "Copiar enlace", icon: "link" },
  { id: "pos", label: "Pagada con POS", icon: "wallet" },
  { id: "scan", label: "Reserva en escaneo rápido", icon: "scan" },
];
