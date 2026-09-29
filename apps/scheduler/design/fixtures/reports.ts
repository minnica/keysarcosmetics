export const schedulerReportKeys = [
  "APPOINTMENTS",
  "OCCUPANCY",
  "CANCELLATIONS",
  "NO_SHOW",
  "CUSTOMERS",
  "SERVICES",
  "PROFESSIONALS",
  "COMMISSIONS",
  "SURVEYS",
  "COMMUNICATIONS",
  "SALES",
  "PAYMENTS",
] as const;
export type SchedulerReportKey = (typeof schedulerReportKeys)[number];
type ReportCell = string | number | boolean | null;
interface SchedulerReportDatasetDto {
  key: SchedulerReportKey;
  dateFrom: string;
  dateTo: string;
  interval: "[dateFrom, dateTo + 1 day)";
  source: "CANONICAL" | "LEGACY";
  sourceAuthority: "SCHEDULER" | "POS" | "ENVELOPE_LEGACY";
  sourceAuthorities: Array<"SCHEDULER" | "POS" | "ENVELOPE_LEGACY">;
  generatedAt: string;
  branchIds: string[];
  timeZones: Record<string, string>;
  filters: {
    professionalProfileId: string | null;
    serviceProfileId: string | null;
    status: string | null;
    channel: string | null;
    searchApplied: boolean;
  };
  summary: Record<string, ReportCell>;
  columns: string[];
  rows: Array<Record<string, ReportCell>>;
  page: number;
  pageSize: number;
  total: number;
  notes: string[];
}

const rowsByKey: Record<SchedulerReportKey, SchedulerReportDatasetDto["rows"]> =
  {
    APPOINTMENTS: [
      {
        appointment_id: "appointment-1",
        branch_id: "branch-rv7",
        Fecha: "2026-09-03",
        Sucursal: "Polanco",
        Cliente: "Adriana Castañeda",
        Servicios: "Facial hidratante",
        Profesionales: "Sofía Méndez",
        Estado: "ATTENDED",
        Origen: "SCHEDULER",
        Venta: "1850.00",
        Cobrado: "1850.00",
      },
      {
        appointment_id: "appointment-2",
        branch_id: "branch-rv7",
        Fecha: "2026-09-04",
        Sucursal: "Polanco",
        Cliente: "Mariana Estrada",
        Servicios: "Limpieza profunda",
        Profesionales: "Sofía Méndez",
        Estado: "CONFIRMED",
        Origen: "ONLINE",
        Venta: "0.00",
        Cobrado: "0.00",
      },
    ],
    OCCUPANCY: [
      {
        branch_id: "branch-rv7",
        Fecha: "2026-09-03",
        Sucursal: "Polanco",
        Profesional: "Sofía Méndez",
        "Minutos disponibles": 480,
        "Minutos reservados": 285,
        "Minutos atendidos": 180,
        "Ocupación reservada": "59.38",
        "Ocupación atendida": "37.50",
      },
    ],
    CANCELLATIONS: [
      {
        appointment_id: "appointment-3",
        branch_id: "branch-rv7",
        Fecha: "2026-09-02",
        Sucursal: "Polanco",
        Cliente: "Lucía Velasco",
        Estado: "CANCELED",
        Venta: "0.00",
      },
    ],
    NO_SHOW: [],
    CUSTOMERS: [
      {
        customer_id: "customer-1",
        Cliente: "Adriana Castañeda",
        Procedencia: "Recomendación",
        Citas: 4,
        Atendidas: 4,
        Canceladas: 0,
        "No show": 0,
        Venta: "7200.00",
      },
    ],
    SERVICES: [
      {
        service_profile_id: "service-1",
        Servicio: "Facial hidratante",
        Citas: 18,
        Atendidas: 15,
        Canceladas: 2,
        "No show": 1,
        Venta: "31500.00",
      },
    ],
    PROFESSIONALS: [
      {
        professional_profile_id: "professional-1",
        Profesional: "Sofía Méndez",
        Citas: 34,
        Atendidas: 29,
        Canceladas: 3,
        "No show": 2,
        Venta: "59200.00",
      },
    ],
    COMMISSIONS: [
      {
        policy_id: "policy-1",
        Política: "facial-attended",
        Objetivo: "PROFESSIONAL",
        Nombre: "Sofía Méndez",
        Citas: 29,
        Atendidas: 29,
        "Venta atribuible": "59200.00",
        "Comisión estimada": "2960.00",
        Autoridad: "PAYROLL",
      },
    ],
    SURVEYS: [
      {
        response_id: "response-1",
        branch_id: "branch-rv7",
        Fecha: "2026-09-03",
        Sucursal: "Polanco",
        Encuesta: "Experiencia de visita",
        Cliente: "Adriana Castañeda",
        Respuestas: 6,
        Calificación: "4.80",
        Enviada: "2026-09-03T18:00:00.000Z",
      },
    ],
    COMMUNICATIONS: [
      {
        outbox_id: "message-1",
        branch_id: "branch-rv7",
        Fecha: "2026-09-03",
        Sucursal: "Polanco",
        Cliente: "Adriana Castañeda",
        Plantilla: "Confirmación de cita",
        Canal: "WHATSAPP",
        Estado: "DELIVERED",
        Intentos: 1,
        Programado: "2026-09-03T15:00:00.000Z",
        Enviado: "2026-09-03T15:00:02.000Z",
        Entregado: "2026-09-03T15:00:08.000Z",
        Leído: null,
      },
    ],
    SALES: [
      {
        ticket_id: "ticket-1",
        branch_id: "branch-rv7",
        Fecha: "2026-09-03",
        Folio: "POL-1048",
        Sucursal: "Polanco",
        Cliente: "Adriana Castañeda",
        Vendedores: "Sofía Méndez",
        Estado: "COMPLETED",
        Venta: "1850.00",
        Cobrado: "1850.00",
        Saldo: "0.00",
        Fuente: "POS",
      },
    ],
    PAYMENTS: [
      {
        payment_id: "payment-1",
        branch_id: "branch-rv7",
        Fecha: "2026-09-03",
        "Folio ticket": "POL-1048",
        Sucursal: "Polanco",
        Movimiento: "SALE",
        "Forma de pago": "Tarjeta",
        Importe: "1850.00",
        Fuente: "POS",
      },
    ],
  };

const summaryByKey: Partial<
  Record<SchedulerReportKey, Record<string, ReportCell>>
> = {
  APPOINTMENTS: {
    Citas: 3,
    Atendidas: 1,
    Canceladas: 1,
    "No show": 0,
    Venta: "1850.00",
  },
  OCCUPANCY: {
    "Minutos disponibles": 480,
    "Minutos reservados": 285,
    "Minutos atendidos": 180,
    "Ocupación reservada": "59.38",
    "Ocupación atendida": "37.50",
  },
  CUSTOMERS: { Registros: 1, Citas: 4, Atendidas: 4, Venta: "7200.00" },
  SERVICES: { Registros: 1, Citas: 18, Atendidas: 15, Venta: "31500.00" },
  PROFESSIONALS: { Registros: 1, Citas: 34, Atendidas: 29, Venta: "59200.00" },
  SURVEYS: { Respuestas: 1, "Calificación promedio": "4.80" },
  COMMUNICATIONS: {
    Mensajes: 1,
    Enviados: 1,
    Entregados: 1,
    Leídos: 0,
    Fallidos: 0,
  },
  SALES: {
    Tickets: 1,
    "Venta bruta histórica": "1850.00",
    "Venta vigente": "1850.00",
    Cobrado: "1850.00",
    Saldo: "0.00",
  },
  PAYMENTS: { Pagos: 1, Neto: "1850.00" },
  COMMISSIONS: { Políticas: 1, "Comisión estimada": "2960.00" },
};

export function schedulerReportRv7Fixture(
  key: SchedulerReportKey,
): SchedulerReportDatasetDto {
  const rows = rowsByKey[key];
  return {
    key,
    dateFrom: "2026-08-07",
    dateTo: "2026-09-06",
    interval: "[dateFrom, dateTo + 1 day)",
    source: "CANONICAL",
    sourceAuthority: ["SALES", "PAYMENTS"].includes(key) ? "POS" : "SCHEDULER",
    sourceAuthorities: ["SALES", "PAYMENTS"].includes(key)
      ? ["POS"]
      : ["SCHEDULER"],
    generatedAt: "2026-09-06T18:00:00.000Z",
    branchIds: ["branch-rv7"],
    timeZones: { "branch-rv7": "America/Mexico_City" },
    filters: {
      professionalProfileId: null,
      serviceProfileId: null,
      status: null,
      channel: null,
      searchApplied: false,
    },
    summary: summaryByKey[key] ?? {},
    columns: Object.keys(rows[0] ?? {}),
    rows,
    page: 1,
    pageSize: rows.length,
    total: rows.length,
    notes: ["Fixture determinista RV7; no contiene datos operativos."],
  };
}
