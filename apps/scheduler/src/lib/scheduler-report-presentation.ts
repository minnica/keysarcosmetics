import type {
  SchedulerReportCell,
  SchedulerReportDatasetDto,
  SchedulerReportKey,
} from "@cosmetics/types";

export type SchedulerReportView =
  | "summary"
  | "sales"
  | "reservations"
  | "history"
  | "performance"
  | "locations"
  | "messaging"
  | "metrics"
  | "services"
  | "services-by-location"
  | "providers-by-location"
  | "surveys"
  | "reminders";

export type SchedulerReportBundle = Partial<
  Record<SchedulerReportKey, SchedulerReportDatasetDto>
>;

export interface SchedulerReportViewDefinition {
  eyebrow: string;
  title: string;
  description: string;
  keys: SchedulerReportKey[];
  primaryKey: SchedulerReportKey;
}

export const schedulerReportViews: Record<
  SchedulerReportView,
  SchedulerReportViewDefinition
> = {
  summary: {
    eyebrow: "Reportes / Resumen",
    title: "Resumen de operación",
    description:
      "Lectura consolidada de clientes, servicios, equipo, encuestas y comunicaciones dentro del alcance autorizado.",
    keys: [
      "CUSTOMERS",
      "SERVICES",
      "PROFESSIONALS",
      "SURVEYS",
      "COMMUNICATIONS",
    ],
    primaryKey: "CUSTOMERS",
  },
  sales: {
    eyebrow: "Reportes / Ventas",
    title: "Ventas y pagos",
    description:
      "Tickets y cobros canónicos de POS, junto con la estimación versionada de comisiones de Scheduler.",
    keys: ["SALES", "PAYMENTS", "COMMISSIONS"],
    primaryKey: "SALES",
  },
  reservations: {
    eyebrow: "Reportes / Reservas",
    title: "Reporte de reservas",
    description:
      "Comportamiento de la agenda, estados y ocupación calculados con horarios y bloqueos vigentes.",
    keys: ["APPOINTMENTS", "OCCUPANCY", "CANCELLATIONS", "NO_SHOW"],
    primaryKey: "APPOINTMENTS",
  },
  history: {
    eyebrow: "Reportes / Reservas / Historial",
    title: "Historial de reservas",
    description:
      "Detalle completo de citas canónicas, con búsqueda y filtros aplicados por el servidor.",
    keys: ["APPOINTMENTS"],
    primaryKey: "APPOINTMENTS",
  },
  performance: {
    eyebrow: "Reportes / Reservas / Rendimiento",
    title: "Rendimiento",
    description:
      "Reservas, asistencia, venta vinculada y ocupación por profesional y servicio.",
    keys: ["PROFESSIONALS", "SERVICES", "OCCUPANCY"],
    primaryKey: "PROFESSIONALS",
  },
  locations: {
    eyebrow: "Reportes / Reservas / Locales",
    title: "Reservas por local",
    description:
      "Comparativo por sucursal construido con IDs canónicos y sin mezclar registros legados.",
    keys: ["APPOINTMENTS", "OCCUPANCY"],
    primaryKey: "APPOINTMENTS",
  },
  messaging: {
    eyebrow: "Reportes / Reservas / Mensajería móvil",
    title: "Mensajería móvil",
    description:
      "Seguimiento de mensajes encolados, enviados, entregados y leídos; enviar no equivale a entregar.",
    keys: ["COMMUNICATIONS"],
    primaryKey: "COMMUNICATIONS",
  },
  metrics: {
    eyebrow: "Reportes / Reservas / Métricas",
    title: "Métricas de reservas",
    description:
      "Estados y ocupación observados en el periodo, sin extrapolar series ausentes.",
    keys: ["APPOINTMENTS", "OCCUPANCY"],
    primaryKey: "OCCUPANCY",
  },
  services: {
    eyebrow: "Reportes / Reservas / Servicios",
    title: "Servicios reservados",
    description:
      "Demanda, asistencia y venta vinculada por identidad canónica de servicio.",
    keys: ["SERVICES"],
    primaryKey: "SERVICES",
  },
  "services-by-location": {
    eyebrow: "Reportes / Reservas / Local",
    title: "Servicios por local",
    description:
      "Detalle de servicios limitado a la sucursal identificada en la URL.",
    keys: ["SERVICES"],
    primaryKey: "SERVICES",
  },
  "providers-by-location": {
    eyebrow: "Reportes / Reservas / Local",
    title: "Prestadores por local",
    description:
      "Rendimiento de profesionales limitado a la sucursal identificada en la URL.",
    keys: ["PROFESSIONALS", "OCCUPANCY"],
    primaryKey: "PROFESSIONALS",
  },
  surveys: {
    eyebrow: "Clientes / Reporte de encuestas",
    title: "Reporte de encuestas",
    description:
      "Respuestas agregadas y calificaciones; los comentarios libres y datos médicos no forman parte del dataset.",
    keys: ["SURVEYS"],
    primaryKey: "SURVEYS",
  },
  reminders: {
    eyebrow: "Clientes / Recordatorios",
    title: "Recordatorios",
    description:
      "Estado real del outbox por canal. Esta pantalla consulta resultados y no activa automatizaciones.",
    keys: ["COMMUNICATIONS"],
    primaryKey: "COMMUNICATIONS",
  },
};

export function reportCellNumber(
  value: SchedulerReportCell | undefined,
): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function reportCellText(value: SchedulerReportCell | undefined): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

export function reportSummaryValue(
  dataset: SchedulerReportDatasetDto | undefined,
  key: string,
): number {
  return reportCellNumber(dataset?.summary[key]);
}

export function groupReportRows(
  rows: SchedulerReportDatasetDto["rows"],
  labelColumn: string,
  valueColumn?: string,
): Array<{ label: string; value: number }> {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    const label = reportCellText(row[labelColumn]);
    const value = valueColumn ? reportCellNumber(row[valueColumn]) : 1;
    grouped.set(label, (grouped.get(label) ?? 0) + value);
  }
  return [...grouped.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
}

export function reportTrend(
  dataset: SchedulerReportDatasetDto | undefined,
  valueColumn?: string,
): Array<{ label: string; value: number }> {
  if (!dataset) return [];
  return groupReportRows(dataset.rows, "Fecha", valueColumn)
    .filter((point) => point.label !== "—")
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function mergeSchedulerReportPages(
  first: SchedulerReportDatasetDto,
  pages: SchedulerReportDatasetDto[],
): SchedulerReportDatasetDto {
  const rows = [first, ...pages].flatMap((dataset) => dataset.rows);
  return {
    ...first,
    rows,
    page: 1,
    pageSize: rows.length,
  };
}

export function reportMetricCards(
  view: SchedulerReportView,
  bundle: SchedulerReportBundle,
): Array<{ label: string; value: number; kind?: "money" | "percent" }> {
  if (view === "sales") {
    return [
      { label: "Tickets", value: reportSummaryValue(bundle.SALES, "Tickets") },
      {
        label: "Venta vigente",
        value: reportSummaryValue(bundle.SALES, "Venta vigente"),
        kind: "money",
      },
      {
        label: "Cobrado",
        value: reportSummaryValue(bundle.SALES, "Cobrado"),
        kind: "money",
      },
      {
        label: "Pagos netos",
        value: reportSummaryValue(bundle.PAYMENTS, "Neto"),
        kind: "money",
      },
    ];
  }
  if (["surveys"].includes(view)) {
    return [
      {
        label: "Respuestas",
        value: reportSummaryValue(bundle.SURVEYS, "Respuestas"),
      },
      {
        label: "Calificación promedio",
        value: reportSummaryValue(bundle.SURVEYS, "Calificación promedio"),
      },
    ];
  }
  if (["messaging", "reminders"].includes(view)) {
    return [
      {
        label: "Mensajes",
        value: reportSummaryValue(bundle.COMMUNICATIONS, "Mensajes"),
      },
      {
        label: "Enviados",
        value: reportSummaryValue(bundle.COMMUNICATIONS, "Enviados"),
      },
      {
        label: "Entregados",
        value: reportSummaryValue(bundle.COMMUNICATIONS, "Entregados"),
      },
      {
        label: "Fallidos",
        value: reportSummaryValue(bundle.COMMUNICATIONS, "Fallidos"),
      },
    ];
  }
  if (view === "summary") {
    return [
      {
        label: "Clientes con citas",
        value: reportSummaryValue(bundle.CUSTOMERS, "Registros"),
      },
      {
        label: "Servicios",
        value: reportSummaryValue(bundle.SERVICES, "Registros"),
      },
      {
        label: "Profesionales",
        value: reportSummaryValue(bundle.PROFESSIONALS, "Registros"),
      },
      {
        label: "Respuestas de encuesta",
        value: reportSummaryValue(bundle.SURVEYS, "Respuestas"),
      },
    ];
  }
  const appointments = bundle.APPOINTMENTS;
  const occupancy = bundle.OCCUPANCY;
  return [
    { label: "Reservas", value: reportSummaryValue(appointments, "Citas") },
    {
      label: "Atendidas",
      value: reportSummaryValue(appointments, "Atendidas"),
    },
    {
      label: "Canceladas",
      value: reportSummaryValue(appointments, "Canceladas"),
    },
    {
      label: "Ocupación",
      value: reportSummaryValue(occupancy, "Ocupación reservada"),
      kind: "percent",
    },
  ];
}
