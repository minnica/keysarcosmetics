export type ReportPeriodKey =
  | "today"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month";

export interface ReportSeriesPoint {
  label: string;
  bookings: number;
  occupancy: number;
  sales: number;
}

export interface ReportSummary {
  label: string;
  rangeLabel: string;
  comparisonLabel: string;
  bookings: number;
  bookingsChange: number;
  occupancy: number;
  occupancyChange: number;
  newClients: number;
  newClientsChange: number;
  billedSales: number;
  salesChange: number;
  averageTicket: number;
  onlineShare: number;
  agendaShare: number;
  confirmed: number;
  pending: number;
  canceled: number;
  noShows: number;
  series: ReportSeriesPoint[];
}

export interface BirthdayClient {
  id: string;
  name: string;
  contact: string;
  branch: string;
  visits: number;
}

export const todayBirthdayClients: BirthdayClient[] = [
  {
    id: "birthday-valeria",
    name: "Valeria Montes",
    contact: "+52 •••• 4821",
    branch: "OPATRA",
    visits: 8,
  },
  {
    id: "birthday-camila",
    name: "Camila Torres",
    contact: "+52 •••• 1736",
    branch: "Mitikah",
    visits: 5,
  },
  {
    id: "birthday-renata",
    name: "Renata Silva",
    contact: "Sin teléfono",
    branch: "OPATRA",
    visits: 3,
  },
];

export const reportPeriodOptions: Array<{
  value: ReportPeriodKey;
  label: string;
}> = [
  { value: "today", label: "Hoy" },
  { value: "this-week", label: "Esta semana" },
  { value: "last-week", label: "La semana pasada" },
  { value: "this-month", label: "Este mes" },
  { value: "last-month", label: "El mes pasado" },
];

const weeklySeries: ReportSeriesPoint[] = [
  { label: "Lun", bookings: 31, occupancy: 58, sales: 22740 },
  { label: "Mar", bookings: 37, occupancy: 66, sales: 29480 },
  { label: "Mié", bookings: 42, occupancy: 73, sales: 31890 },
  { label: "Jue", bookings: 39, occupancy: 68, sales: 27630 },
  { label: "Vie", bookings: 48, occupancy: 81, sales: 38720 },
  { label: "Sáb", bookings: 56, occupancy: 92, sales: 46890 },
  { label: "Dom", bookings: 28, occupancy: 52, sales: 19840 },
];

function scaleSeries(
  series: ReportSeriesPoint[],
  factor: number,
  labels?: string[],
): ReportSeriesPoint[] {
  const occupancyFactor = Math.pow(factor, 0.12);

  return series.map((point, index) => ({
    label: labels?.[index] ?? point.label,
    bookings: Math.max(1, Math.round(point.bookings * factor)),
    occupancy: Math.min(
      98,
      Math.max(18, Math.round(point.occupancy * occupancyFactor)),
    ),
    sales: Math.round((point.sales * factor) / 10) * 10,
  }));
}

export const reportSummaries: Record<ReportPeriodKey, ReportSummary> = {
  today: {
    label: "Hoy",
    rangeLabel: "Jueves, 13 de agosto de 2026",
    comparisonLabel: "respecto al jueves anterior",
    bookings: 42,
    bookingsChange: 8.4,
    occupancy: 72.6,
    occupancyChange: 4.8,
    newClients: 7,
    newClientsChange: 16.7,
    billedSales: 31890,
    salesChange: 11.2,
    averageTicket: 759,
    onlineShare: 24,
    agendaShare: 76,
    confirmed: 34,
    pending: 5,
    canceled: 2,
    noShows: 1,
    series: scaleSeries(weeklySeries, 0.2, ["9h", "11h", "13h", "15h", "17h", "19h", "21h"]),
  },
  "this-week": {
    label: "Esta semana",
    rangeLabel: "10–16 de agosto de 2026",
    comparisonLabel: "respecto a la semana anterior",
    bookings: 196,
    bookingsChange: 12.8,
    occupancy: 74.2,
    occupancyChange: 7.1,
    newClients: 31,
    newClientsChange: 10.7,
    billedSales: 148620,
    salesChange: 14.3,
    averageTicket: 758,
    onlineShare: 21,
    agendaShare: 79,
    confirmed: 158,
    pending: 21,
    canceled: 11,
    noShows: 6,
    series: scaleSeries(weeklySeries, 0.78),
  },
  "last-week": {
    label: "La semana pasada",
    rangeLabel: "3–9 de agosto de 2026",
    comparisonLabel: "respecto a la semana previa",
    bookings: 281,
    bookingsChange: 9.6,
    occupancy: 70,
    occupancyChange: 6.3,
    newClients: 46,
    newClientsChange: 8.5,
    billedSales: 217190,
    salesChange: 12.4,
    averageTicket: 773,
    onlineShare: 18,
    agendaShare: 82,
    confirmed: 226,
    pending: 28,
    canceled: 18,
    noShows: 9,
    series: weeklySeries,
  },
  "this-month": {
    label: "Este mes",
    rangeLabel: "1–31 de agosto de 2026",
    comparisonLabel: "respecto al mes anterior",
    bookings: 742,
    bookingsChange: 15.2,
    occupancy: 76.8,
    occupancyChange: 9.1,
    newClients: 118,
    newClientsChange: 13.4,
    billedSales: 571840,
    salesChange: 17.8,
    averageTicket: 771,
    onlineShare: 27,
    agendaShare: 73,
    confirmed: 604,
    pending: 67,
    canceled: 45,
    noShows: 26,
    series: scaleSeries(weeklySeries, 2.63, ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "", ""]),
  },
  "last-month": {
    label: "El mes pasado",
    rangeLabel: "1–31 de julio de 2026",
    comparisonLabel: "respecto a junio",
    bookings: 856,
    bookingsChange: 7.8,
    occupancy: 73.5,
    occupancyChange: 4.2,
    newClients: 132,
    newClientsChange: 6.5,
    billedSales: 642730,
    salesChange: 10.1,
    averageTicket: 751,
    onlineShare: 23,
    agendaShare: 77,
    confirmed: 701,
    pending: 72,
    canceled: 54,
    noShows: 29,
    series: scaleSeries(weeklySeries, 3.04, ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "", ""]),
  },
};
