import type {
  SchedulerAvailabilityOwnerType,
  SchedulerWeekday,
} from "@cosmetics/types";

export interface SchedulerInterval {
  kind: "WORKING" | "BREAK";
  weekday: SchedulerWeekday;
  startMinute: number;
  endMinute: number;
}

export function normalizeSchedulerCatalogName(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isValidIanaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("es-MX", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function parseSchedulerEffectiveRange(input: {
  effectiveFrom?: string;
  effectiveTo?: string | null;
}): { effectiveFrom: Date; effectiveTo: Date | null } {
  const effectiveFrom = input.effectiveFrom
    ? new Date(input.effectiveFrom)
    : new Date();
  const effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;
  if (Number.isNaN(effectiveFrom.getTime())) {
    throw new Error("La fecha inicial de vigencia no es válida");
  }
  if (effectiveTo && Number.isNaN(effectiveTo.getTime())) {
    throw new Error("La fecha final de vigencia no es válida");
  }
  if (effectiveTo && effectiveTo <= effectiveFrom) {
    throw new Error("La vigencia final debe ser posterior a la inicial");
  }
  return { effectiveFrom, effectiveTo };
}

function overlaps(
  left: Pick<SchedulerInterval, "startMinute" | "endMinute">,
  right: Pick<SchedulerInterval, "startMinute" | "endMinute">,
): boolean {
  return (
    left.startMinute < right.endMinute && right.startMinute < left.endMinute
  );
}

export function validateSchedulerAvailabilityRules(
  rules: SchedulerInterval[],
): void {
  for (const rule of rules) {
    if (
      !Number.isInteger(rule.startMinute) ||
      !Number.isInteger(rule.endMinute) ||
      rule.startMinute < 0 ||
      rule.endMinute > 1440 ||
      rule.startMinute >= rule.endMinute
    ) {
      throw new Error("Cada horario debe usar minutos válidos entre 0 y 1440");
    }
  }

  const weekdays = new Set(rules.map((rule) => rule.weekday));
  for (const weekday of weekdays) {
    const dayRules = rules.filter((rule) => rule.weekday === weekday);
    const working = dayRules.filter((rule) => rule.kind === "WORKING");
    const breaks = dayRules.filter((rule) => rule.kind === "BREAK");
    for (const [index, interval] of working.entries()) {
      if (
        working
          .slice(index + 1)
          .some((candidate) => overlaps(interval, candidate))
      ) {
        throw new Error(
          `Los periodos de trabajo de ${weekday} no pueden traslaparse`,
        );
      }
    }
    for (const [index, interval] of breaks.entries()) {
      if (
        !working.some(
          (candidate) =>
            interval.startMinute >= candidate.startMinute &&
            interval.endMinute <= candidate.endMinute,
        )
      ) {
        throw new Error(
          `Cada descanso de ${weekday} debe estar dentro de un horario de trabajo`,
        );
      }
      if (
        breaks
          .slice(index + 1)
          .some((candidate) => overlaps(interval, candidate))
      ) {
        throw new Error(`Los descansos de ${weekday} no pueden traslaparse`);
      }
    }
  }
}

export function schedulerAvailabilityOwnerFields(
  ownerType: SchedulerAvailabilityOwnerType,
  ownerId: string,
): { professionalProfileId: string | null; resourceId: string | null } {
  if (ownerType === "PROFESSIONAL") {
    return { professionalProfileId: ownerId, resourceId: null };
  }
  if (ownerType === "RESOURCE") {
    return { professionalProfileId: null, resourceId: ownerId };
  }
  return { professionalProfileId: null, resourceId: null };
}

export function schedulerAvailabilityOwner(row: {
  branchProfileId: string;
  professionalProfileId: string | null;
  resourceId: string | null;
}): { ownerType: SchedulerAvailabilityOwnerType; ownerId: string } {
  if (row.professionalProfileId) {
    return { ownerType: "PROFESSIONAL", ownerId: row.professionalProfileId };
  }
  if (row.resourceId) {
    return { ownerType: "RESOURCE", ownerId: row.resourceId };
  }
  return { ownerType: "BRANCH", ownerId: row.branchProfileId };
}

export function uniqueSchedulerIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
