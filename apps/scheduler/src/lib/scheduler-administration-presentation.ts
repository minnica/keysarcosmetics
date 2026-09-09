import type {
  SchedulerAvailabilityRuleDto,
  SchedulerAvailabilityOwnerType,
  SchedulerWeekday,
} from "@cosmetics/types";

export const schedulerWeekdayOptions: ReadonlyArray<{
  value: SchedulerWeekday;
  label: string;
}> = [
  { value: "MONDAY", label: "Lunes" },
  { value: "TUESDAY", label: "Martes" },
  { value: "WEDNESDAY", label: "Miércoles" },
  { value: "THURSDAY", label: "Jueves" },
  { value: "FRIDAY", label: "Viernes" },
  { value: "SATURDAY", label: "Sábado" },
  { value: "SUNDAY", label: "Domingo" },
];

export interface SchedulerAvailabilityDayDraft {
  weekday: SchedulerWeekday;
  enabled: boolean;
  start: string;
  end: string;
  breakEnabled: boolean;
  breakStart: string;
  breakEnd: string;
}

export function schedulerMinutesToTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(1440, Math.trunc(minutes)));
  const hours = Math.floor(normalized / 60);
  const remainder = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function schedulerTimeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
    return Number.NaN;
  }
  if (hours === 24 && minutes !== 0) return Number.NaN;
  return hours * 60 + minutes;
}

export function buildSchedulerAvailabilityDraft(
  rules: readonly SchedulerAvailabilityRuleDto[],
  ownerType: SchedulerAvailabilityOwnerType,
  ownerId: string,
  branchProfileId?: string,
): SchedulerAvailabilityDayDraft[] {
  const activeRules = rules.filter(
    (rule) =>
      rule.ownerType === ownerType &&
      rule.ownerId === ownerId &&
      (!branchProfileId || rule.branchProfileId === branchProfileId) &&
      rule.effectiveTo === null,
  );

  return schedulerWeekdayOptions.map(({ value }) => {
    const working = activeRules.find(
      (rule) => rule.weekday === value && rule.kind === "WORKING",
    );
    const breakRule = activeRules.find(
      (rule) => rule.weekday === value && rule.kind === "BREAK",
    );
    return {
      weekday: value,
      enabled: Boolean(working),
      start: schedulerMinutesToTime(working?.startMinute ?? 540),
      end: schedulerMinutesToTime(working?.endMinute ?? 1080),
      breakEnabled: Boolean(breakRule),
      breakStart: schedulerMinutesToTime(breakRule?.startMinute ?? 840),
      breakEnd: schedulerMinutesToTime(breakRule?.endMinute ?? 900),
    };
  });
}

export function buildSchedulerAvailabilityRules(
  days: readonly SchedulerAvailabilityDayDraft[],
): Array<{
  kind: "WORKING" | "BREAK";
  weekday: SchedulerWeekday;
  startMinute: number;
  endMinute: number;
}> {
  const result: Array<{
    kind: "WORKING" | "BREAK";
    weekday: SchedulerWeekday;
    startMinute: number;
    endMinute: number;
  }> = [];

  for (const day of days) {
    if (!day.enabled) continue;
    const startMinute = schedulerTimeToMinutes(day.start);
    const endMinute = schedulerTimeToMinutes(day.end);
    if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute)) {
      throw new Error(
        `El horario de ${day.weekday} no tiene un formato válido.`,
      );
    }
    if (startMinute >= endMinute) {
      throw new Error(
        `La apertura de ${day.weekday} debe ser anterior al cierre.`,
      );
    }
    result.push({
      kind: "WORKING",
      weekday: day.weekday,
      startMinute,
      endMinute,
    });

    if (!day.breakEnabled) continue;
    const breakStart = schedulerTimeToMinutes(day.breakStart);
    const breakEnd = schedulerTimeToMinutes(day.breakEnd);
    if (!Number.isFinite(breakStart) || !Number.isFinite(breakEnd)) {
      throw new Error(
        `El descanso de ${day.weekday} no tiene un formato válido.`,
      );
    }
    if (
      breakStart >= breakEnd ||
      breakStart < startMinute ||
      breakEnd > endMinute
    ) {
      throw new Error(
        `El descanso de ${day.weekday} debe quedar dentro del horario de trabajo.`,
      );
    }
    result.push({
      kind: "BREAK",
      weekday: day.weekday,
      startMinute: breakStart,
      endMinute: breakEnd,
    });
  }
  return result;
}

export function schedulerAdministrationInvalidations(): string[] {
  return ["operational-catalog", "administration-catalog", "agenda"];
}

export function toggleSchedulerRelation(
  values: readonly string[],
  value: string,
): string[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}
