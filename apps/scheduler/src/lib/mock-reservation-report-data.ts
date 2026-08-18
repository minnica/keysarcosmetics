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

export interface ReservationLocationReport {
  id: string;
  name: string;
  address: string;
  bookings: number;
  revenue: number;
  occupancy: number;
  change: number;
  color: string;
  weeklyReservations: ReservationChartPoint[];
}

export interface ReservationServiceReport {
  id: string;
  name: string;
  category: string;
  bookings: number;
  revenue: number;
  color: string;
}

export interface ReservationServicesByLocationReport {
  id: string;
  name: string;
  address: string;
  services: ReservationServiceReport[];
}

export interface ReservationProviderReport {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
  occupancy: number;
  color: string;
  weeklyReservations: ReservationChartPoint[];
}

export interface ReservationProvidersByLocationReport {
  id: string;
  name: string;
  address: string;
  providers: ReservationProviderReport[];
  hourlyReservations: Array<ReservationChartPoint & { day: string; color: string }>;
}

export type ReservationMobileMessageStatus =
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface ReservationMobileMessageRecord {
  id: string;
  client: string;
  branch: string;
  reservationAt: string;
  channel: "WhatsApp" | "SMS";
  messageAt: string;
  status: ReservationMobileMessageStatus;
  confirmed: boolean;
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

export const reservationLocationReports: ReservationLocationReport[] = [
  {
    id: "opatra-masaryk",
    name: "OPATRA Masaryk",
    address: "Polanco · Miguel Hidalgo",
    bookings: 112,
    revenue: 89600,
    occupancy: 69.4,
    change: 8.6,
    color: "#648672",
    weeklyReservations: [
      { label: "08 Jun", value: 83 },
      { label: "15 Jun", value: 91 },
      { label: "22 Jun", value: 88 },
      { label: "29 Jun", value: 96 },
      { label: "06 Jul", value: 92 },
      { label: "13 Jul", value: 101 },
      { label: "20 Jul", value: 98 },
      { label: "27 Jul", value: 105 },
      { label: "03 Ago", value: 103 },
      { label: "10 Ago", value: 109 },
      { label: "17 Ago", value: 104 },
      { label: "24 Ago", value: 112 },
    ],
  },
  {
    id: "mitikah",
    name: "Keysar Mitikah",
    address: "Xoco · Benito Juárez",
    bookings: 96,
    revenue: 74240,
    occupancy: 62.1,
    change: 4.2,
    color: "#466a76",
    weeklyReservations: [
      { label: "08 Jun", value: 69 },
      { label: "15 Jun", value: 74 },
      { label: "22 Jun", value: 71 },
      { label: "29 Jun", value: 79 },
      { label: "06 Jul", value: 76 },
      { label: "13 Jul", value: 84 },
      { label: "20 Jul", value: 82 },
      { label: "27 Jul", value: 88 },
      { label: "03 Ago", value: 85 },
      { label: "10 Ago", value: 92 },
      { label: "17 Ago", value: 89 },
      { label: "24 Ago", value: 96 },
    ],
  },
  {
    id: "polanco",
    name: "Keysar Polanco",
    address: "Granada · Miguel Hidalgo",
    bookings: 73,
    revenue: 53350,
    occupancy: 54.8,
    change: -2.1,
    color: "#c3a583",
    weeklyReservations: [
      { label: "08 Jun", value: 58 },
      { label: "15 Jun", value: 62 },
      { label: "22 Jun", value: 60 },
      { label: "29 Jun", value: 66 },
      { label: "06 Jul", value: 64 },
      { label: "13 Jul", value: 68 },
      { label: "20 Jul", value: 67 },
      { label: "27 Jul", value: 72 },
      { label: "03 Ago", value: 70 },
      { label: "10 Ago", value: 76 },
      { label: "17 Ago", value: 74 },
      { label: "24 Ago", value: 73 },
    ],
  },
];

export const reservationServiceReports: ReservationServiceReport[] = [
  { id: "service-01", name: "Acné Neuronova Instagram", category: "Instagram", bookings: 0, revenue: 0, color: "#648672" },
  { id: "service-02", name: "BIO LIFTING FACIAL INSTAGRAM", category: "Instagram", bookings: 5, revenue: 3995, color: "#466a76" },
  { id: "service-03", name: "Corporal doble Instagram", category: "Corporales", bookings: 0, revenue: 0, color: "#c3a583" },
  { id: "service-04", name: "Corporal especial Keysar", category: "Corporales", bookings: 0, revenue: 0, color: "#c3a583" },
  { id: "service-05", name: "CORPORAL INSTAGRAM", category: "Corporales", bookings: 0, revenue: 0, color: "#c3a583" },
  { id: "service-06", name: "CORTESIAS LEAD", category: "Cortesías", bookings: 0, revenue: 0, color: "#9aa4ae" },
  { id: "service-07", name: "DRENAJE LINFATICO", category: "Corporales", bookings: 0, revenue: 0, color: "#c3a583" },
  { id: "service-08", name: "FACIAL + 10 MIN OXYCURA", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-09", name: "FACIAL 2X1 INSTAGRAM", category: "Instagram", bookings: 0, revenue: 0, color: "#648672" },
  { id: "service-10", name: "FACIAL ANTI ACNE", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-11", name: "FACIAL CRYOSKIN", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-12", name: "FACIAL DE CORTESIA", category: "Cortesías", bookings: 4, revenue: 0, color: "#9aa4ae" },
  { id: "service-13", name: "FACIAL DE CUMPLEAÑOS", category: "Cortesías", bookings: 0, revenue: 0, color: "#9aa4ae" },
  { id: "service-14", name: "FACIAL DOBLE INSTAGRAM", category: "Instagram", bookings: 2, revenue: 2998, color: "#648672" },
  { id: "service-15", name: "Facial especial Keysar", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-16", name: "FACIAL ETERNAL AGE", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-17", name: "Facial express Instagram", category: "Instagram", bookings: 0, revenue: 0, color: "#648672" },
  { id: "service-18", name: "FACIAL HYDRATING REGIMEN SET", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-19", name: "FACIAL OXYCURA", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-20", name: "FACIAL PEEL OFF", category: "Faciales", bookings: 1, revenue: 0, color: "#7460a4" },
  { id: "service-21", name: "FACIAL + REDUCTIVO INSTAGRAM", category: "Instagram", bookings: 0, revenue: 0, color: "#648672" },
  { id: "service-22", name: "FACIAL REFLEXOLOGIA", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-23", name: "FACIAL RITUAL EYE VIP", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-24", name: "Facial sumer scape doble", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-25", name: "Facial sumer scape individual", category: "Faciales", bookings: 0, revenue: 0, color: "#7460a4" },
  { id: "service-26", name: "FACIAL VIP CORTESÍA", category: "Cortesías", bookings: 3, revenue: 3800, color: "#9aa4ae" },
  { id: "service-27", name: "FACIAL VIP INSTAGRAM", category: "Instagram", bookings: 4, revenue: 3196, color: "#648672" },
  { id: "service-28", name: "MASAJE CORPORAL CORTESÍA", category: "Cortesías", bookings: 1, revenue: 0, color: "#9aa4ae" },
  { id: "service-29", name: "MASAJE CORPORAL REDUCTIVO", category: "Masajes", bookings: 0, revenue: 0, color: "#d0a968" },
  { id: "service-30", name: "MASAJE CORPORAL RELAJANTE", category: "Masajes", bookings: 0, revenue: 0, color: "#d0a968" },
  { id: "service-31", name: "MASAJE DESCONTRACTURANTE", category: "Masajes", bookings: 1, revenue: 0, color: "#d0a968" },
  { id: "service-32", name: "Masaje descontracturante Doble", category: "Masajes", bookings: 0, revenue: 0, color: "#d0a968" },
  { id: "service-33", name: "MASAJE PIERNAS CANSADAS", category: "Masajes", bookings: 0, revenue: 0, color: "#d0a968" },
  { id: "service-34", name: "MEBRESIA OXYCURA 5 SESIONES", category: "Membresías", bookings: 0, revenue: 0, color: "#b97d89" },
  { id: "service-35", name: "MEMBRESIA 14 SESIONES CELESTIAL RENEWAL SYSTEM", category: "Membresías", bookings: 4, revenue: 8571, color: "#b97d89" },
  { id: "service-36", name: "MEMBRESIA 5 SESIONES CORPORAL", category: "Membresías", bookings: 4, revenue: 5800, color: "#b97d89" },
  { id: "service-37", name: "MEMBRESIA 7 SESIONES CELESTIAL RENEWAL SYSTEM", category: "Membresías", bookings: 7, revenue: 10714, color: "#b97d89" },
  { id: "service-38", name: "MEMBRESIA CRYOSKIN 14 SESIONES.", category: "Membresías", bookings: 0, revenue: 0, color: "#b97d89" },
  { id: "service-39", name: "MEMBRESIA CRYOSKIN 7 SESIONES.", category: "Membresías", bookings: 0, revenue: 0, color: "#b97d89" },
  { id: "service-40", name: "MEMBRESIA ETERNAL AGE 7 SESIONES", category: "Membresías", bookings: 1, revenue: 4000, color: "#b97d89" },
  { id: "service-41", name: "MEMBRESIA EYE RITUAL", category: "Membresías", bookings: 0, revenue: 0, color: "#b97d89" },
  { id: "service-42", name: "MEMBRESIA NEURONOVA", category: "Membresías", bookings: 1, revenue: 4286, color: "#b97d89" },
  { id: "service-43", name: "MEMBRESIA PEEL OFF", category: "Membresías", bookings: 0, revenue: 0, color: "#b97d89" },
  { id: "service-44", name: "MEMBRESIA PURE GOLDEN GLOW 5 SESIONES", category: "Membresías", bookings: 0, revenue: 0, color: "#b97d89" },
  { id: "service-45", name: "MEMBRESIA PURE GOLDEN GLOW (LAMINAS DE ORO )", category: "Membresías", bookings: 0, revenue: 0, color: "#b97d89" },
  { id: "service-46", name: "MEMBRESIAS 16 SESIONES DIVINE NECK AND CHEST SYSTEM", category: "Membresías", bookings: 0, revenue: 0, color: "#b97d89" },
  { id: "service-47", name: "MEMBRESIAS 8 SESIONES DIVINE NECK AND CHEST SYSTEM", category: "Membresías", bookings: 0, revenue: 0, color: "#b97d89" },
  { id: "service-48", name: "MOMENTS 2X1 INSTAGRAM", category: "Instagram", bookings: 0, revenue: 0, color: "#648672" },
  { id: "service-49", name: "OXYCURA FACIAL INSTAGRAM", category: "Instagram", bookings: 0, revenue: 0, color: "#648672" },
  { id: "service-50", name: "RECUPERACION", category: "Terapias", bookings: 0, revenue: 0, color: "#809a72" },
  { id: "service-51", name: "TERAPIA DE REFLEXOLOGIA", category: "Terapias", bookings: 0, revenue: 0, color: "#809a72" },
  { id: "service-52", name: "VIP + BEAUTY BAG INSTAGRAM", category: "Instagram", bookings: 1, revenue: 799, color: "#648672" },
  { id: "service-53", name: "WOW BIO-LIFTING INSTAGRAM", category: "Instagram", bookings: 1, revenue: 799, color: "#648672" },
];

export const reservationServiceReportTotals = {
  bookings: 40,
  revenue: 48959,
};

const opatraMexicoServiceOrder = [
  "service-30", "service-35", "service-37", "service-46", "service-47",
  "service-36", "service-29", "service-07", "service-20", "service-43",
  "service-12", "service-50", "service-13", "service-45", "service-22",
  "service-51", "service-26", "service-31", "service-33", "service-44",
  "service-18", "service-19", "service-23", "service-11", "service-02",
  "service-27", "service-49", "service-05", "service-28", "service-21",
  "service-03", "service-10", "service-08", "service-16", "service-38",
  "service-39", "service-42", "service-40", "service-34", "service-41",
  "service-32", "service-17", "service-14", "service-53", "service-24",
  "service-25", "service-06", "service-01", "service-48", "service-09",
  "service-52", "service-15", "service-04",
] as const;

export const reservationServicesByLocationReports: ReservationServicesByLocationReport[] = [
  {
    id: "opatra-mexico",
    name: "OPATRA MEXICO",
    address: "Polanco · Miguel Hidalgo",
    services: opatraMexicoServiceOrder.map((serviceId) => {
      const service = reservationServiceReports.find((item) => item.id === serviceId);
      if (!service) throw new Error(`Servicio no encontrado: ${serviceId}`);
      return service;
    }),
  },
];

const providerWeekLabels = [
  "08 Jun", "15 Jun", "22 Jun", "01 Jul", "13 Jul", "20 Jul",
  "01 Ago", "10 Ago", "17 Ago", "24 Ago", "01 Sep", "07 Sep",
  "14 Sep", "21 Sep", "01 Oct", "08 Oct", "15 Oct", "22 Oct",
] as const;

function buildProviderWeek(values: number[]): ReservationChartPoint[] {
  return providerWeekLabels.map((label, index) => ({
    label,
    value: values[index] ?? 0,
  }));
}

export const reservationProvidersByLocationReports: ReservationProvidersByLocationReport[] = [
  {
    id: "opatra-mexico",
    name: "OPATRA MEXICO",
    address: "Polanco · Miguel Hidalgo",
    providers: [
      { id: "pending-mitikah", name: "CITAS PENDIENTE MITIKAH", bookings: 0, revenue: 0, occupancy: 0, color: "#d56a89", weeklyReservations: buildProviderWeek([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) },
      { id: "pending-opatra", name: "CITAS PENDIENTES OPATRA", bookings: 0, revenue: 0, occupancy: 0, color: "#b64b45", weeklyReservations: buildProviderWeek([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) },
      { id: "masaryk", name: "MASARYK", bookings: 5, revenue: 8540, occupancy: 46.67, color: "#75a815", weeklyReservations: buildProviderWeek([8, 56, 68, 79, 61, 88, 103, 95, 96, 31, 23, 20, 1, 0, 0, 0, 0, 0]) },
      { id: "masaryk-double", name: "MASARYK CAB DOBLE", bookings: 5, revenue: 2942, occupancy: 40.74, color: "#a30aa3", weeklyReservations: buildProviderWeek([18, 70, 80, 61, 111, 94, 88, 134, 58, 16, 15, 12, 0, 17, 0, 0, 0, 0]) },
      { id: "mitikah-1", name: "MITIKAH 1", bookings: 0, revenue: 0, occupancy: 0, color: "#356bd5", weeklyReservations: buildProviderWeek([0, 3, 0, 0, 5, 0, 0, 4, 18, 6, 0, 0, 0, 4, 0, 0, 0, 0]) },
      { id: "mitikah-vip-b-double", name: "MITIKAH VIP B-DOBLE", bookings: 3, revenue: 8429, occupancy: 37.5, color: "#df4218", weeklyReservations: buildProviderWeek([39, 33, 36, 66, 48, 36, 73, 25, 36, 72, 31, 5, 0, 0, 0, 0, 0, 0]) },
      { id: "mitikah-vip-c-double", name: "MITIKAH VIP C-DOBLE", bookings: 6, revenue: 5940, occupancy: 36.67, color: "#f28c00", weeklyReservations: buildProviderWeek([30, 95, 65, 60, 75, 121, 78, 70, 73, 61, 24, 3, 0, 0, 0, 0, 0, 0]) },
      { id: "mitikah-vip-individual", name: "MITIKAH VIP INDIVIDUAL", bookings: 7, revenue: 5593, occupancy: 58.33, color: "#168b28", weeklyReservations: buildProviderWeek([5, 65, 63, 52, 52, 51, 79, 73, 57, 58, 29, 34, 0, 7, 0, 0, 0, 0]) },
      { id: "opatra-cabin-1", name: "OPATRA CABINA 1", bookings: 7, revenue: 7228, occupancy: 75.93, color: "#0da0c4", weeklyReservations: buildProviderWeek([3, 117, 85, 90, 111, 56, 131, 54, 93, 66, 81, 58, 15, 4, 0, 0, 0, 0]) },
      { id: "opatra-cabin-2", name: "OPATRA CABINA 2", bookings: 8, revenue: 14029, occupancy: 88.89, color: "#31699a", weeklyReservations: buildProviderWeek([10, 127, 63, 80, 85, 70, 55, 62, 85, 63, 31, 13, 0, 0, 0, 0, 0, 0]) },
    ],
    hourlyReservations: [
      { day: "domingo", label: "12 am", value: 0, color: "#356bd5" },
      { day: "lunes", label: "12 am", value: 0, color: "#df4218" },
      { day: "martes", label: "12 am", value: 0, color: "#f28c00" },
      { day: "miércoles", label: "12 am", value: 0, color: "#168b28" },
      ...[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 7, 7, 5, 1, 4, 4, 5, 3, 0, 0, 0, 0].map((value, index) => ({
        day: "jueves",
        label: index === 0 ? "12 am" : index < 12 ? `${index} am` : index === 12 ? "12 pm" : `${index - 12} pm`,
        value,
        color: "#a30aa3",
      })),
      { day: "viernes", label: "12 am", value: 0, color: "#0da0c4" },
      { day: "sábado", label: "12 am", value: 0, color: "#d56a89" },
    ],
  },
];

export const reservationProviderReportTotals = {
  bookings: 41,
  revenue: 52699,
  occupancy: 37.54,
};

export const reservationMobileMessagingTotals = {
  periodReservations: 63,
  messagesSent: 2,
  confirmedByWhatsApp: 1,
  conversationsUsed: 1,
  conversationsLimit: 100,
};

export const reservationMobileMessages: ReservationMobileMessageRecord[] = [
  {
    id: "mobile-message-01",
    client: "Graciela Carrillo / Ramiro",
    branch: "OPATRA Masaryk",
    reservationAt: "2026-08-09T11:00:00",
    channel: "WhatsApp",
    messageAt: "2026-08-09T08:03:00",
    status: "read",
    confirmed: true,
  },
  {
    id: "mobile-message-02",
    client: "Valeria Montes",
    branch: "Keysar Mitikah",
    reservationAt: "2026-08-08T17:30:00",
    channel: "WhatsApp",
    messageAt: "2026-08-08T09:15:00",
    status: "delivered",
    confirmed: false,
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
