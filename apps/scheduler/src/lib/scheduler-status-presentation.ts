const fallbackSchedulerStatusColor = "#94a3b8";

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
