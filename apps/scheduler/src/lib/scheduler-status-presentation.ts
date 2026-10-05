import type { BookingStatusLabels } from "./scheduler-presentation";

const fallbackSchedulerStatusColor = "#94a3b8";

const defaultSchedulerStatusLabels: BookingStatusLabels = {
  pending: "Pendiente",
  reserved: "Reservado",
  confirmed: "Confirmado",
  arrived: "Llegó",
  waiting: "En espera",
  attended: "Atendido",
  "no-show": "No asistió",
  canceled: "Cancelado",
};

export interface SchedulerStatusColorTokens {
  accent: string;
  surface: string;
  border: string;
  foreground: string;
}

export function getSchedulerStatusColorTokens(
  configuredColor: string,
): SchedulerStatusColorTokens {
  const accent = /^#[0-9a-f]{6}$/i.test(configuredColor)
    ? configuredColor
    : fallbackSchedulerStatusColor;

  return {
    accent,
    surface: `color-mix(in srgb, ${accent} 12%, white)`,
    border: `color-mix(in srgb, ${accent} 32%, white)`,
    foreground: `color-mix(in srgb, ${accent} 74%, #263649)`,
  };
}

export function buildSchedulerStatusLabels(
  overrides: Partial<BookingStatusLabels> = {},
): BookingStatusLabels {
  return { ...defaultSchedulerStatusLabels, ...overrides };
}
