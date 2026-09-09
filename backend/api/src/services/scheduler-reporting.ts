import { createHash } from "node:crypto";
import type {
  SchedulerReportCell,
  SchedulerReportKey,
  SchedulerScreenKey,
} from "@cosmetics/types";
import type { MinuteInterval } from "./scheduler-appointments";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function addSchedulerCalendarDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

export function schedulerReportDates(
  dateFrom: string,
  dateTo: string,
): string[] {
  const dates: string[] = [];
  for (
    let value = dateFrom;
    value <= dateTo;
    value = addSchedulerCalendarDays(value, 1)
  ) {
    dates.push(value);
  }
  return dates;
}

export function resolveSchedulerReportPeriod(dateFrom: string, dateTo: string) {
  if (!validDate(dateFrom) || !validDate(dateTo) || dateFrom > dateTo) {
    throw new Error("El periodo del reporte es inválido");
  }
  const dates = schedulerReportDates(dateFrom, dateTo);
  if (dates.length > 366) throw new Error("El periodo máximo es de 366 días");
  return {
    dateFrom,
    dateTo,
    dates,
    dateToExclusive: addSchedulerCalendarDays(dateTo, 1),
  };
}

export function schedulerReportScreen(
  key: SchedulerReportKey,
): SchedulerScreenKey {
  if (["APPOINTMENTS", "OCCUPANCY", "CANCELLATIONS", "NO_SHOW"].includes(key)) {
    return "scheduler/reports/reservations";
  }
  if (["SALES", "PAYMENTS", "COMMISSIONS"].includes(key)) {
    return "scheduler/reports/sales";
  }
  return "scheduler/reports/summary";
}

export function mergeSchedulerReportIntervals(
  intervals: MinuteInterval[],
): MinuteInterval[] {
  const sorted = intervals
    .map((interval) => ({
      startMinute: Math.max(0, interval.startMinute),
      endMinute: Math.min(1440, interval.endMinute),
    }))
    .filter((interval) => interval.startMinute < interval.endMinute)
    .sort((left, right) => left.startMinute - right.startMinute);
  const merged: MinuteInterval[] = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (!previous || interval.startMinute > previous.endMinute)
      merged.push({ ...interval });
    else previous.endMinute = Math.max(previous.endMinute, interval.endMinute);
  }
  return merged;
}

export function subtractSchedulerReportIntervals(
  sources: MinuteInterval[],
  exclusions: MinuteInterval[],
): MinuteInterval[] {
  let result = mergeSchedulerReportIntervals(sources);
  for (const exclusion of mergeSchedulerReportIntervals(exclusions)) {
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

export function schedulerReportIntervalMinutes(
  intervals: MinuteInterval[],
): number {
  return mergeSchedulerReportIntervals(intervals).reduce(
    (total, interval) => total + interval.endMinute - interval.startMinute,
    0,
  );
}

export function schedulerReportOverlapMinutes(
  windows: MinuteInterval[],
  occupied: MinuteInterval[],
): number {
  const intersections: MinuteInterval[] = [];
  for (const window of windows) {
    for (const interval of occupied) {
      const startMinute = Math.max(window.startMinute, interval.startMinute);
      const endMinute = Math.min(window.endMinute, interval.endMinute);
      if (startMinute < endMinute)
        intersections.push({ startMinute, endMinute });
    }
  }
  return schedulerReportIntervalMinutes(intersections);
}

export function schedulerReportPercentage(
  numerator: number,
  denominator: number,
): string {
  return denominator > 0
    ? ((numerator / denominator) * 100).toFixed(2)
    : "0.00";
}

export function schedulerReportSearchMetadata(
  search?: string,
): Record<string, SchedulerReportCell> {
  return {
    searchApplied: Boolean(search),
    searchHash: search
      ? createHash("sha256").update(search).digest("hex")
      : null,
  };
}

export function schedulerReportPage<T>(
  rows: T[],
  page: number,
  pageSize: number,
  exportAll: boolean,
): T[] {
  if (exportAll) return rows;
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function schedulerReportRating(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return schedulerReportRating(record["rating"] ?? record["value"]);
  }
  return null;
}

export function calculateSchedulerCommission(input: {
  appointmentCount: number;
  attendedCount: number;
  salesAmount: number;
  branchSalesAmount: number;
  rules: Array<{
    mode:
      | "APPOINTMENT"
      | "ATTENDED_APPOINTMENT"
      | "SALES_PERCENTAGE"
      | "BRANCH_SALES_TIER";
    amount: number | null;
    percentage: number | null;
    tiers: Array<{
      fromAmount: number;
      toAmount: number | null;
      percentage: number;
    }>;
  }>;
}): number {
  return input.rules.reduce((total, rule) => {
    if (rule.mode === "APPOINTMENT")
      return total + input.appointmentCount * (rule.amount ?? 0);
    if (rule.mode === "ATTENDED_APPOINTMENT")
      return total + input.attendedCount * (rule.amount ?? 0);
    if (rule.mode === "SALES_PERCENTAGE") {
      return total + input.salesAmount * ((rule.percentage ?? 0) / 100);
    }
    const tier = rule.tiers.find(
      (candidate) =>
        input.branchSalesAmount >= candidate.fromAmount &&
        (candidate.toAmount == null ||
          input.branchSalesAmount < candidate.toAmount),
    );
    return total + input.salesAmount * ((tier?.percentage ?? 0) / 100);
  }, 0);
}
