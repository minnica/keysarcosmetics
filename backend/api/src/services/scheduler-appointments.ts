import { createHash } from "node:crypto";
import type {
  SchedulerAppointmentStatus,
  SchedulerAvailabilityConflictCode,
  SchedulerWeekday,
} from "@cosmetics/types";

export const SCHEDULER_SLOT_MINUTES = 15 as const;

export const SCHEDULER_OCCUPYING_STATUSES: SchedulerAppointmentStatus[] = [
  "PENDING",
  "RESERVED",
  "CONFIRMED",
  "ARRIVED",
  "WAITING",
];

const transitions: Record<
  SchedulerAppointmentStatus,
  SchedulerAppointmentStatus[]
> = {
  PENDING: ["RESERVED", "CONFIRMED", "CANCELED"],
  RESERVED: ["CONFIRMED", "ARRIVED", "NO_SHOW", "CANCELED"],
  CONFIRMED: ["ARRIVED", "NO_SHOW", "CANCELED"],
  ARRIVED: ["WAITING", "ATTENDED", "CANCELED"],
  WAITING: ["ATTENDED", "NO_SHOW", "CANCELED"],
  ATTENDED: [],
  NO_SHOW: [],
  CANCELED: [],
};

export class SchedulerAppointmentError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code:
      | SchedulerAvailabilityConflictCode
      | string = "INVALID_APPOINTMENT",
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export interface MinuteInterval {
  startMinute: number;
  endMinute: number;
}

export interface AvailabilityRuleLike extends MinuteInterval {
  kind: "WORKING" | "BREAK";
  weekday: SchedulerWeekday;
}

export interface AvailabilityExceptionLike {
  kind: "AVAILABLE" | "UNAVAILABLE";
  date: string;
  startMinute: number | null;
  endMinute: number | null;
}

export interface SchedulerClassScheduleLike {
  serviceProfileId: string;
  professionalProfileId: string;
  weekday: SchedulerWeekday;
  startMinute: number;
  endMinute: number;
  capacity: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export function schedulerClassCapacity(input: {
  schedules: SchedulerClassScheduleLike[];
  serviceProfileId: string;
  professionalProfileIds: string[];
  weekday: SchedulerWeekday;
  startMinute: number;
  endMinute: number;
  defaultCapacity: number;
  at: Date;
}): number | null {
  const matches = input.professionalProfileIds.map((professionalProfileId) =>
    input.schedules.find(
      (schedule) =>
        schedule.serviceProfileId === input.serviceProfileId &&
        schedule.professionalProfileId === professionalProfileId &&
        schedule.weekday === input.weekday &&
        schedule.startMinute === input.startMinute &&
        schedule.endMinute === input.endMinute &&
        schedule.effectiveFrom <= input.at &&
        (!schedule.effectiveTo || schedule.effectiveTo > input.at),
    ),
  );
  if (matches.length === 0 || matches.some((match) => !match)) return null;
  return Math.min(
    input.defaultCapacity,
    ...matches.map((match) => match!.capacity),
  );
}

export function schedulerIntervalsOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function assertSchedulerStatusTransition(
  from: SchedulerAppointmentStatus,
  to: SchedulerAppointmentStatus,
): void {
  if (from === to) return;
  if (!transitions[from].includes(to)) {
    throw new SchedulerAppointmentError(
      `No se puede cambiar una cita de ${from} a ${to}`,
      409,
      "INVALID_STATUS_TRANSITION",
      { currentStatus: from, requestedStatus: to },
    );
  }
}

export function parseSchedulerInstant(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new SchedulerAppointmentError(`${field} no es una fecha válida`);
  }
  return date;
}

export function stableSchedulerRequestHash(value: unknown): string {
  const normalize = (current: unknown): unknown => {
    if (Array.isArray(current)) return current.map(normalize);
    if (current && typeof current === "object") {
      return Object.fromEntries(
        Object.entries(current as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => [key, normalize(child)]),
      );
    }
    return current;
  };
  return createHash("sha256")
    .update(JSON.stringify(normalize(value)))
    .digest("hex");
}

export function schedulerWeekday(date: string): SchedulerWeekday {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new SchedulerAppointmentError("La fecha local no es válida");
  }
  return [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ][parsed.getUTCDay()] as SchedulerWeekday;
}

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

export function schedulerLocalDateKey(date: Date, timezone: string): string {
  const parts = localParts(date, timezone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function schedulerLocalMinute(date: Date, timezone: string): number {
  const parts = localParts(date, timezone);
  return parts.hour * 60 + parts.minute;
}

export function schedulerLocalMinuteToUtc(
  date: string,
  minute: number,
  timezone: string,
): Date {
  if (!Number.isInteger(minute) || minute < 0 || minute > 1440) {
    throw new SchedulerAppointmentError(
      "El minuto local debe estar entre 0 y 1440",
    );
  }
  schedulerWeekday(date);
  const base = new Date(`${date}T00:00:00.000Z`);
  const localDate = new Date(base.getTime() + minute * 60_000);
  const expected = {
    year: localDate.getUTCFullYear(),
    month: localDate.getUTCMonth() + 1,
    day: localDate.getUTCDate(),
    hour: localDate.getUTCHours(),
    minute: localDate.getUTCMinutes(),
  };
  let candidate = new Date(
    Date.UTC(
      expected.year,
      expected.month - 1,
      expected.day,
      expected.hour,
      expected.minute,
    ),
  );
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const actual = localParts(candidate, timezone);
    const expectedTimestamp = Date.UTC(
      expected.year,
      expected.month - 1,
      expected.day,
      expected.hour,
      expected.minute,
    );
    const actualTimestamp = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    const delta = expectedTimestamp - actualTimestamp;
    if (delta === 0) break;
    candidate = new Date(candidate.getTime() + delta);
  }
  const final = localParts(candidate, timezone);
  if (
    final.year !== expected.year ||
    final.month !== expected.month ||
    final.day !== expected.day ||
    final.hour !== expected.hour ||
    final.minute !== expected.minute
  ) {
    throw new SchedulerAppointmentError(
      "La hora local no existe en la zona horaria configurada",
      409,
      "LOCAL_TIME_GAP",
    );
  }
  return candidate;
}

export function schedulerLocalDateRangeUtc(date: string, timezone: string) {
  return {
    start: schedulerLocalMinuteToUtc(date, 0, timezone),
    end: schedulerLocalMinuteToUtc(date, 1440, timezone),
  };
}

function mergeIntervals(intervals: MinuteInterval[]): MinuteInterval[] {
  const sorted = intervals
    .filter(
      (interval) =>
        interval.startMinute >= 0 &&
        interval.endMinute <= 1440 &&
        interval.startMinute < interval.endMinute,
    )
    .sort((left, right) => left.startMinute - right.startMinute);
  const result: MinuteInterval[] = [];
  for (const interval of sorted) {
    const previous = result[result.length - 1];
    if (!previous || interval.startMinute > previous.endMinute) {
      result.push({ ...interval });
    } else {
      previous.endMinute = Math.max(previous.endMinute, interval.endMinute);
    }
  }
  return result;
}

function subtractIntervals(
  sources: MinuteInterval[],
  exclusions: MinuteInterval[],
): MinuteInterval[] {
  let result = mergeIntervals(sources);
  for (const exclusion of mergeIntervals(exclusions)) {
    result = result.flatMap((source) => {
      if (
        exclusion.endMinute <= source.startMinute ||
        exclusion.startMinute >= source.endMinute
      ) {
        return [source];
      }
      const pieces: MinuteInterval[] = [];
      if (exclusion.startMinute > source.startMinute) {
        pieces.push({
          startMinute: source.startMinute,
          endMinute: exclusion.startMinute,
        });
      }
      if (exclusion.endMinute < source.endMinute) {
        pieces.push({
          startMinute: exclusion.endMinute,
          endMinute: source.endMinute,
        });
      }
      return pieces;
    });
  }
  return result;
}

export function intersectSchedulerWindows(
  left: MinuteInterval[],
  right: MinuteInterval[],
): MinuteInterval[] {
  const intersections: MinuteInterval[] = [];
  for (const first of left) {
    for (const second of right) {
      const startMinute = Math.max(first.startMinute, second.startMinute);
      const endMinute = Math.min(first.endMinute, second.endMinute);
      if (startMinute < endMinute)
        intersections.push({ startMinute, endMinute });
    }
  }
  return mergeIntervals(intersections);
}

export function resolveSchedulerDailyWindows(input: {
  date: string;
  rules: AvailabilityRuleLike[];
  exceptions: AvailabilityExceptionLike[];
  inherited?: MinuteInterval[];
}): MinuteInterval[] {
  const weekday = schedulerWeekday(input.date);
  const dailyRules = input.rules.filter((rule) => rule.weekday === weekday);
  const working = dailyRules
    .filter((rule) => rule.kind === "WORKING")
    .map(({ startMinute, endMinute }) => ({ startMinute, endMinute }));
  const breaks = dailyRules
    .filter((rule) => rule.kind === "BREAK")
    .map(({ startMinute, endMinute }) => ({ startMinute, endMinute }));
  let windows =
    working.length > 0 ? mergeIntervals(working) : [...(input.inherited ?? [])];
  windows = subtractIntervals(windows, breaks);

  const dailyExceptions = input.exceptions.filter(
    (exception) => exception.date === input.date,
  );
  const available = dailyExceptions
    .filter((exception) => exception.kind === "AVAILABLE")
    .map((exception) => ({
      startMinute: exception.startMinute ?? 0,
      endMinute: exception.endMinute ?? 1440,
    }));
  const unavailable = dailyExceptions
    .filter((exception) => exception.kind === "UNAVAILABLE")
    .map((exception) => ({
      startMinute: exception.startMinute ?? 0,
      endMinute: exception.endMinute ?? 1440,
    }));
  if (available.length > 0)
    windows = mergeIntervals([...windows, ...available]);
  return subtractIntervals(windows, unavailable);
}

export function schedulerWindowContains(
  windows: MinuteInterval[],
  startMinute: number,
  endMinute: number,
): boolean {
  return windows.some(
    (window) =>
      startMinute >= window.startMinute && endMinute <= window.endMinute,
  );
}

export function schedulerMembershipAllowsService(
  conditions: unknown,
  serviceProfileId: string,
  catalogItemId: string,
): boolean {
  if (
    !conditions ||
    typeof conditions !== "object" ||
    Array.isArray(conditions)
  ) {
    return true;
  }
  const record = conditions as Record<string, unknown>;
  const profileIds = record["schedulerServiceProfileIds"];
  const itemIds = record["serviceItemIds"];
  if (Array.isArray(profileIds)) {
    return profileIds.some((value) => value === serviceProfileId);
  }
  if (Array.isArray(itemIds)) {
    return itemIds.some((value) => value === catalogItemId);
  }
  return true;
}
