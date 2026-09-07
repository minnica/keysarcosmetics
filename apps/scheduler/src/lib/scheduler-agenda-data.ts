import type {
  SchedulerAppointmentDto,
  SchedulerAppointmentListRequest,
  SchedulerAppointmentPageDto,
} from "@cosmetics/types";

export interface SchedulerAgendaRange {
  firstDate: Date;
  lastDate: Date;
  visibleDateKeys: string[];
  from: string;
  to: string;
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addLocalDays(value: Date, amount: number): Date {
  const result = startOfLocalDay(value);
  result.setDate(result.getDate() + amount);
  return result;
}

export function schedulerLocalDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function buildSchedulerAgendaRange(
  selectedDate: Date,
  view: "day" | "week",
): SchedulerAgendaRange {
  const selected = startOfLocalDay(selectedDate);
  const mondayOffset = (selected.getDay() + 6) % 7;
  const firstDate =
    view === "week" ? addLocalDays(selected, -mondayOffset) : selected;
  const lastDate = addLocalDays(firstDate, view === "week" ? 6 : 0);
  const visibleDateKeys = Array.from(
    { length: view === "week" ? 7 : 1 },
    (_, index) => schedulerLocalDateKey(addLocalDays(firstDate, index)),
  );

  // API instants are UTC while the grid is grouped by the branch IANA zone.
  // A one-day guard at each side safely covers every current UTC offset; the
  // presentation adapter then filters the extra rows by canonical localDate.
  const guardedFrom = addLocalDays(firstDate, -1);
  const guardedTo = addLocalDays(lastDate, 2);
  return {
    firstDate,
    lastDate,
    visibleDateKeys,
    from: new Date(
      `${schedulerLocalDateKey(guardedFrom)}T00:00:00.000Z`,
    ).toISOString(),
    to: new Date(
      `${schedulerLocalDateKey(guardedTo)}T00:00:00.000Z`,
    ).toISOString(),
  };
}

export async function loadAllSchedulerAppointments(
  loadPage: (
    request: SchedulerAppointmentListRequest,
  ) => Promise<SchedulerAppointmentPageDto>,
  request: Omit<SchedulerAppointmentListRequest, "page" | "pageSize">,
): Promise<SchedulerAppointmentDto[]> {
  const pageSize = 100;
  const first = await loadPage({ ...request, page: 1, pageSize });
  const pageCount = Math.ceil(first.total / pageSize);
  if (pageCount <= 1) return first.items;
  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      loadPage({ ...request, page: index + 2, pageSize }),
    ),
  );
  return [first, ...remaining].flatMap((page) => page.items);
}

function formatterParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

export function schedulerLocalDateTimeToInstant(
  dateKey: string,
  time: string,
  timezone: string,
): string | null {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  const rollsToNextDay = hour === 24 && minute === 0;
  if (
    hour! < 0 ||
    hour! > 24 ||
    minute! < 0 ||
    minute! > 59 ||
    (hour === 24 && minute !== 0)
  )
    return null;
  const requested = new Date(
    Date.UTC(year!, month! - 1, day!, rollsToNextDay ? 0 : hour!, minute!),
  );
  if (rollsToNextDay) requested.setUTCDate(requested.getUTCDate() + 1);
  const requestedDate = `${requested.getUTCFullYear()}-${String(requested.getUTCMonth() + 1).padStart(2, "0")}-${String(requested.getUTCDate()).padStart(2, "0")}`;
  const requestedTime = `${String(requested.getUTCHours()).padStart(2, "0")}:${String(requested.getUTCMinutes()).padStart(2, "0")}`;
  try {
    const observed = formatterParts(requested, timezone);
    const [observedYear, observedMonth, observedDay] = observed.date
      .split("-")
      .map(Number);
    const [observedHour, observedMinute] = observed.time.split(":").map(Number);
    const observedAsUtc = Date.UTC(
      observedYear!,
      observedMonth! - 1,
      observedDay!,
      observedHour!,
      observedMinute!,
    );
    const candidate = new Date(
      requested.getTime() - (observedAsUtc - requested.getTime()),
    );
    const verified = formatterParts(candidate, timezone);
    return verified.date === requestedDate && verified.time === requestedTime
      ? candidate.toISOString()
      : null;
  } catch {
    return null;
  }
}
