export type ReservationReportStatus =
  | "reserved"
  | "confirmed"
  | "attended"
  | "no-show"
  | "canceled"
  | "pending";

export interface ReservationStatusOption {
  value: ReservationReportStatus;
  label: string;
  count: number;
  color: string;
}

export interface ReservationChartPoint {
  label: string;
  value: number;
}

export interface ServiceRankingItem extends ReservationChartPoint {
  color: string;
}

export type ReservationPaymentStatus = "paid" | "pending" | "unpaid";

export interface ReservationHistoryRecord {
  id: string;
  performedAt: string;
  createdAt: string;
  branch: string;
  client: string;
  service: string;
  provider: string;
  status: ReservationReportStatus;
  paymentStatus: ReservationPaymentStatus;
  amount: number;
}

export interface ReservationMetricDefinition {
  status: Extract<
    ReservationReportStatus,
    "confirmed" | "attended" | "canceled" | "no-show"
  >;
  label: string;
  dailyLabel: string;
  description: string;
  color: string;
  servicePercentages: ReservationChartPoint[];
  dailyPercentages: ReservationChartPoint[];
}

export const reservationStatusOptions: ReservationStatusOption[] = [
  { value: "reserved", label: "Reservada", count: 18, color: "#c3a583" },
  { value: "confirmed", label: "Confirmada", count: 96, color: "#648672" },
  { value: "attended", label: "Asistió", count: 121, color: "#466a76" },
  { value: "no-show", label: "No asistió", count: 12, color: "#bd7b77" },
  { value: "canceled", label: "Cancelada", count: 15, color: "#8793a1" },
  { value: "pending", label: "Pendiente", count: 19, color: "#d0a968" },
];

export const reservationReportSections = [
  "General",
  "Reservas",
  "Locales",
  "Servicios",
  "Mensajería móvil",
  "Servicios por local",
  "Prestadores por local",
  "Recursos por local",
  "Servicios por prestador",
] as const;

export const serviceRanking: ServiceRankingItem[] = [
  { label: "Hydrafacial Signature", value: 42, color: "#648672" },
  { label: "Facial Opatra Glow", value: 36, color: "#c3a583" },
  { label: "Dermapen + activos", value: 31, color: "#7460a4" },
  { label: "Bio lifting facial", value: 27, color: "#b97d89" },
  { label: "Limpieza profunda", value: 24, color: "#466a76" },
  { label: "Masaje facial", value: 19, color: "#d0a968" },
  { label: "Otros servicios", value: 102, color: "#d9d3cd" },
];

export const reservationsByWeekday: ReservationChartPoint[] = [
  { label: "Lun", value: 31 },
  { label: "Mar", value: 37 },
  { label: "Mié", value: 42 },
  { label: "Jue", value: 39 },
  { label: "Vie", value: 48 },
  { label: "Sáb", value: 56 },
  { label: "Dom", value: 28 },
];

export const reservationsByHour: ReservationChartPoint[] = [
  { label: "09h", value: 8 },
  { label: "10h", value: 17 },
  { label: "11h", value: 26 },
  { label: "12h", value: 34 },
  { label: "13h", value: 29 },
  { label: "14h", value: 22 },
  { label: "15h", value: 31 },
  { label: "16h", value: 39 },
  { label: "17h", value: 44 },
  { label: "18h", value: 36 },
  { label: "19h", value: 20 },
  { label: "20h", value: 7 },
];

export const reservationReportTotals = {
  bookings: 281,
  revenue: 217190,
  attended: 121,
  averageTicket: 773,
};

export const reservationMetricDefinitions: ReservationMetricDefinition[] = [
  {
    status: "confirmed",
    label: "Confirmadas / Reservas",
    dailyLabel: "% Confirmado / Reservado por día",
    description: "Reservas que recibieron confirmación del cliente.",
    color: "#648672",
    servicePercentages: [
      { label: "Hydrafacial Signature", value: 92 },
      { label: "Facial Opatra Glow", value: 84 },
      { label: "Dermapen + activos", value: 76 },
      { label: "Bio lifting facial", value: 68 },
      { label: "Limpieza profunda", value: 61 },
    ],
    dailyPercentages: [
      { label: "03 Ago", value: 71 },
      { label: "04 Ago", value: 75 },
      { label: "05 Ago", value: 73 },
      { label: "06 Ago", value: 81 },
      { label: "07 Ago", value: 79 },
      { label: "08 Ago", value: 86 },
      { label: "09 Ago", value: 78 },
    ],
  },
  {
    status: "attended",
    label: "Asiste / Reservas",
    dailyLabel: "% Asiste / Reservado por día",
    description: "Reservas registradas como asistencia completada.",
    color: "#466a76",
    servicePercentages: [],
    dailyPercentages: [
      { label: "03 Ago", value: 34 },
      { label: "04 Ago", value: 41 },
      { label: "05 Ago", value: 38 },
      { label: "06 Ago", value: 46 },
      { label: "07 Ago", value: 51 },
      { label: "08 Ago", value: 55 },
      { label: "09 Ago", value: 43 },
    ],
  },
  {
    status: "canceled",
    label: "Canceladas / Reservas",
    dailyLabel: "% Cancelado / Reservado por día",
    description: "Reservas canceladas dentro del periodo seleccionado.",
    color: "#8793a1",
    servicePercentages: [],
    dailyPercentages: [
      { label: "03 Ago", value: 0 },
      { label: "04 Ago", value: 0 },
      { label: "05 Ago", value: 0 },
      { label: "06 Ago", value: 0 },
      { label: "07 Ago", value: 0 },
      { label: "08 Ago", value: 0 },
      { label: "09 Ago", value: 0 },
    ],
  },
  {
    status: "no-show",
    label: "No asiste / Reservas",
    dailyLabel: "% No asiste / Reservado por día",
    description: "Reservas en las que el cliente no se presentó.",
    color: "#bd7b77",
    servicePercentages: [],
    dailyPercentages: [
      { label: "03 Ago", value: 0 },
      { label: "04 Ago", value: 0 },
      { label: "05 Ago", value: 0 },
      { label: "06 Ago", value: 0 },
      { label: "07 Ago", value: 0 },
      { label: "08 Ago", value: 0 },
      { label: "09 Ago", value: 0 },
    ],
  },
];

const historyBlueprints: Array<
  Omit<ReservationHistoryRecord, "id" | "performedAt" | "createdAt">
> = [
  { branch: "OPATRA", client: "Gabriela Beltrán", service: "Facial de cortesía", provider: "Cabina Opatra 1", status: "confirmed", paymentStatus: "unpaid", amount: 0 },
  { branch: "Mitikah", client: "Abel Cruz Martínez", service: "Membresía corporal · 5 sesiones", provider: "Cabina Doble", status: "confirmed", paymentStatus: "pending", amount: 7500 },
  { branch: "OPATRA", client: "Izchel Loyo Navarrete", service: "Bio lifting Instagram", provider: "Mitikah VIP", status: "attended", paymentStatus: "paid", amount: 1450 },
  { branch: "Mitikah", client: "María de Fátima Hidalgo", service: "Membresía Eternal Age", provider: "Masaryk", status: "reserved", paymentStatus: "pending", amount: 9800 },
  { branch: "OPATRA", client: "Janet Urbina Abadía", service: "Facial Signature", provider: "Cabina Opatra 2", status: "attended", paymentStatus: "paid", amount: 1850 },
  { branch: "Mitikah", client: "Liliana Rosas", service: "Hydrafacial Signature", provider: "Mitikah VIP", status: "confirmed", paymentStatus: "unpaid", amount: 2200 },
  { branch: "OPATRA", client: "Valeria Montes", service: "Dermapen + activos", provider: "Cabina Opatra 1", status: "no-show", paymentStatus: "unpaid", amount: 1650 },
  { branch: "Mitikah", client: "Camila Torres", service: "Limpieza profunda", provider: "Cabina Individual", status: "attended", paymentStatus: "paid", amount: 1250 },
  { branch: "OPATRA", client: "Renata Silva", service: "Facial Opatra Glow", provider: "Cabina Opatra 2", status: "canceled", paymentStatus: "unpaid", amount: 1800 },
  { branch: "Mitikah", client: "Andrea Rada", service: "Masaje facial", provider: "Cabina Doble", status: "pending", paymentStatus: "pending", amount: 950 },
];

export const reservationHistory: ReservationHistoryRecord[] = Array.from(
  { length: 42 },
  (_, index) => {
    const source = historyBlueprints[index % historyBlueprints.length]!;
    const day = 9 - Math.floor(index / 7);
    const hour = 19 - (index % 6);
    const performedAt = `2026-08-${String(Math.max(3, day)).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00`;
    const createdDay = Math.max(1, day - 2 - (index % 3));
    return {
      ...source,
      id: `reservation-history-${index + 1}`,
      performedAt,
      createdAt: `2026-08-${String(createdDay).padStart(2, "0")}T10:30:00`,
    };
  },
);
