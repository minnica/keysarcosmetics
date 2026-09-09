import type {
  SchedulerClassSchedulesWriteDto,
  SchedulerCommissionPolicyWriteDto,
  SchedulerCommissionTargetType,
  SchedulerSettingScope,
} from "@cosmetics/types";

const moneyPattern = /^\d{1,12}(?:\.\d{1,2})?$/;
const percentagePattern = /^\d{1,3}(?:\.\d{1,4})?$/;
const secretKeyPattern =
  /(?:secret|token|password|credential|api[_-]?key|private[_-]?key|webhook[_-]?secret)/i;

export const schedulerSettingPrecedence = [
  "COMMERCE",
  "BRANCH",
  "USER",
] as const;

export function schedulerCommissionIdentityKey(input: {
  commerceId: string;
  targetType: SchedulerCommissionTargetType;
  targetId?: string | null;
}): string {
  if (input.targetType === "DEFAULT") {
    if (input.targetId)
      throw new Error("La comisión por defecto no acepta objetivo");
    return `${input.commerceId}:DEFAULT`;
  }
  if (!input.targetId) throw new Error("La comisión requiere un objetivo");
  return `${input.commerceId}:${input.targetType}:${input.targetId}`;
}

function parseNonNegativeMoney(
  value: string | null | undefined,
  label: string,
) {
  if (value == null || !moneyPattern.test(value) || Number(value) < 0) {
    throw new Error(`${label} debe ser un decimal no negativo`);
  }
  return Number(value);
}

function parsePercentage(value: string | null | undefined, label: string) {
  if (value == null || !percentagePattern.test(value)) {
    throw new Error(`${label} debe ser un decimal no negativo`);
  }
  const percentage = Number(value);
  if (percentage > 100) throw new Error(`${label} debe estar entre 0 y 100`);
  return percentage;
}

export function validateSchedulerCommissionPolicy(
  input: SchedulerCommissionPolicyWriteDto,
): void {
  schedulerCommissionIdentityKey(input);
  if (input.rules.length === 0) {
    throw new Error("Una política activa requiere al menos una regla");
  }
  const modes = new Set(input.rules.map((rule) => rule.mode));
  if (modes.size !== input.rules.length) {
    throw new Error("Las modalidades de comisión no deben repetirse");
  }

  for (const rule of input.rules) {
    if (rule.mode === "APPOINTMENT" || rule.mode === "ATTENDED_APPOINTMENT") {
      parseNonNegativeMoney(rule.amount, "El monto de comisión");
      if (rule.percentage != null || rule.tiers?.length) {
        throw new Error("La comisión fija no acepta porcentaje ni niveles");
      }
      continue;
    }
    if (rule.mode === "SALES_PERCENTAGE") {
      parsePercentage(rule.percentage, "El porcentaje de comisión");
      if (rule.amount != null || rule.tiers?.length) {
        throw new Error("La comisión porcentual no acepta monto ni niveles");
      }
      continue;
    }

    if (rule.amount != null || rule.percentage != null || !rule.tiers?.length) {
      throw new Error("La comisión escalonada requiere niveles exclusivamente");
    }
    rule.tiers.forEach((tier, index) => {
      const from = parseNonNegativeMoney(
        tier.fromAmount,
        "El inicio del nivel",
      );
      const to =
        tier.toAmount == null
          ? null
          : parseNonNegativeMoney(tier.toAmount, "El fin del nivel");
      parsePercentage(tier.percentage, "El porcentaje del nivel");
      if (index === 0 && from !== 0) {
        throw new Error("Los niveles deben iniciar en cero");
      }
      if (to != null && to <= from) {
        throw new Error("Cada nivel debe terminar después de su inicio");
      }
      const previous = rule.tiers?.[index - 1];
      if (
        previous &&
        (previous.toAmount == null || Number(previous.toAmount) !== from)
      ) {
        throw new Error("Los niveles deben ser continuos y no traslaparse");
      }
      if (index < (rule.tiers?.length ?? 0) - 1 && to == null) {
        throw new Error("Sólo el último nivel puede quedar sin límite");
      }
      if (index === (rule.tiers?.length ?? 0) - 1 && to != null) {
        throw new Error("El último nivel debe quedar sin límite");
      }
    });
  }
}

export function validateSchedulerClassSchedules(
  input: SchedulerClassSchedulesWriteDto,
): void {
  for (const schedule of input.schedules) {
    if (
      !Number.isInteger(schedule.startMinute) ||
      !Number.isInteger(schedule.endMinute) ||
      schedule.startMinute < 0 ||
      schedule.endMinute > 1440 ||
      schedule.startMinute >= schedule.endMinute
    ) {
      throw new Error("Cada clase debe tener un horario válido");
    }
    if (!Number.isInteger(schedule.capacity) || schedule.capacity < 1) {
      throw new Error("La capacidad de cada clase debe ser positiva");
    }
  }
  input.schedules.forEach((schedule, index) => {
    const overlaps = input.schedules
      .slice(index + 1)
      .some(
        (candidate) =>
          candidate.branchProfileId === schedule.branchProfileId &&
          candidate.professionalProfileId === schedule.professionalProfileId &&
          candidate.weekday === schedule.weekday &&
          schedule.startMinute < candidate.endMinute &&
          candidate.startMinute < schedule.endMinute,
      );
    if (overlaps) {
      throw new Error(
        "Un profesional no puede impartir dos clases traslapadas",
      );
    }
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function assertSchedulerSettingHasNoSecrets(
  value: Record<string, unknown>,
  path = "settings",
): void {
  const visit = (current: unknown, currentPath: string): void => {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
      return;
    }
    if (!isPlainObject(current)) return;
    for (const [key, child] of Object.entries(current)) {
      const childPath = `${currentPath}.${key}`;
      if (secretKeyPattern.test(key)) {
        throw new Error(
          `La propiedad ${childPath} parece contener un secreto y debe vivir en infraestructura`,
        );
      }
      visit(child, childPath);
    }
  };
  visit(value, path);
}

export function mergeSchedulerSettingDocuments(
  ...documents: Array<Record<string, unknown>>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const document of documents) {
    for (const [key, value] of Object.entries(document)) {
      if (isPlainObject(value) && isPlainObject(result[key])) {
        result[key] = mergeSchedulerSettingDocuments(
          result[key] as Record<string, unknown>,
          value,
        );
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

export function schedulerSettingScopeFields(input: {
  scope: SchedulerSettingScope;
  commerceId: string;
  branchProfileId?: string | null;
  userId: string;
}): {
  scopeReferenceId: string;
  commerceId: string | null;
  branchProfileId: string | null;
  userId: string | null;
} {
  if (input.scope === "COMMERCE") {
    if (input.branchProfileId)
      throw new Error("El alcance comercio no acepta sucursal");
    return {
      scopeReferenceId: input.commerceId,
      commerceId: input.commerceId,
      branchProfileId: null,
      userId: null,
    };
  }
  if (input.scope === "BRANCH") {
    if (!input.branchProfileId)
      throw new Error("El alcance sucursal requiere sucursal");
    return {
      scopeReferenceId: input.branchProfileId,
      commerceId: null,
      branchProfileId: input.branchProfileId,
      userId: null,
    };
  }
  if (input.branchProfileId)
    throw new Error("El alcance usuario no acepta sucursal");
  return {
    scopeReferenceId: `${input.commerceId}:${input.userId}`,
    commerceId: input.commerceId,
    branchProfileId: null,
    userId: input.userId,
  };
}
