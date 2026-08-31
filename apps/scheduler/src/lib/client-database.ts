import {
  normalizeClientPhone,
  normalizeClientText,
  type SchedulerClient,
} from "./mock-client-data";
import type { Booking } from "./mock-scheduler-data";

export const emptyClientFilters = {
  branch: "",
  professional: "",
  service: "",
  status: "",
  gender: "",
  upcomingBirthdayDays: "",
  birthdayFrom: "",
  birthdayTo: "",
  createdFrom: "",
  createdTo: "",
  hasBooked: "",
  inactiveDays: "",
};
export type ClientFilters = typeof emptyClientFilters;
export type ClientSortKey =
  | "fullName"
  | "lastName"
  | "email"
  | "phone"
  | "officialId";

function matchesDateRange(
  value: string | undefined,
  from: string,
  to: string,
  recurring = false,
) {
  if (!from && !to) return true;
  if (!value) return false;
  const date = recurring ? value.slice(5, 10) : value.slice(0, 10);
  const start = recurring ? from.slice(5, 10) : from;
  const end = recurring ? to.slice(5, 10) : to;
  if (recurring && start && end && start > end)
    return date >= start || date <= end;
  return (!start || date >= start) && (!end || date <= end);
}

const dayInMilliseconds = 24 * 60 * 60 * 1000;

function dateAtUtcMidnight(value: string | Date) {
  if (typeof value !== "string") {
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
    );
  }
  const [year = 1970, month = 1, day = 1] = value
    .slice(0, 10)
    .split("-")
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function daysUntilNextBirthday(
  birthDate: string | undefined,
  referenceDate: Date = new Date(),
) {
  if (!birthDate) return null;
  const [, month = 1, day = 1] = birthDate.slice(0, 10).split("-").map(Number);
  const today = dateAtUtcMidnight(referenceDate);
  let nextBirthday = new Date(Date.UTC(today.getUTCFullYear(), month - 1, day));
  if (nextBirthday < today) {
    nextBirthday = new Date(
      Date.UTC(today.getUTCFullYear() + 1, month - 1, day),
    );
  }
  return Math.round(
    (nextBirthday.getTime() - today.getTime()) / dayInMilliseconds,
  );
}

export function daysSinceClientActivity(
  client: SchedulerClient,
  referenceDate: Date = new Date(),
) {
  const lastActivity = client.history.reduce<string | null>(
    (latest, entry) => (!latest || entry.date > latest ? entry.date : latest),
    null,
  );
  if (!lastActivity) return null;
  return Math.floor(
    (dateAtUtcMidnight(referenceDate).getTime() -
      dateAtUtcMidnight(lastActivity).getTime()) /
      dayInMilliseconds,
  );
}

export function filterClientDatabase(
  clients: SchedulerClient[],
  query: string,
  filters: ClientFilters,
  bookings: Booking[],
  referenceDate: Date = new Date(),
) {
  const text = normalizeClientText(query);
  const phone = normalizeClientPhone(query);
  const phoneSearch = phone.length > 0 && /^[\d\s()+.-]+$/.test(query.trim());

  return clients.filter((client) => {
    const matchesQuery =
      !text ||
      [
        client.fullName,
        client.lastName ?? "",
        ...client.aliases,
        client.email,
        ...client.alternateEmails,
        client.officialId ?? "",
      ].some((value) => normalizeClientText(value).includes(text)) ||
      (phoneSearch && client.normalizedPhone.includes(phone));
    if (!matchesQuery) return false;

    const clientBookings = bookings.filter(
      (booking) =>
        booking.clientId === client.id ||
        client.history.some((entry) => entry.bookingId === booking.id),
    );
    const hasBooked = client.history.length > 0 || clientBookings.length > 0;
    if (filters.hasBooked && hasBooked !== (filters.hasBooked === "yes"))
      return false;

    if (filters.upcomingBirthdayDays) {
      const daysUntilBirthday = daysUntilNextBirthday(
        client.birthDate,
        referenceDate,
      );
      if (
        daysUntilBirthday === null ||
        daysUntilBirthday > Number(filters.upcomingBirthdayDays)
      )
        return false;
    }

    if (filters.inactiveDays) {
      const inactiveDays = daysSinceClientActivity(client, referenceDate);
      if (inactiveDays !== null && inactiveDays < Number(filters.inactiveDays))
        return false;
    }

    // Reservation filters must match the same booking, not unrelated visits.
    if (filters.professional || filters.service || filters.status) {
      if (
        !clientBookings.some(
          (booking) =>
            (!filters.branch ||
              booking.branchId === filters.branch ||
              client.history.some(
                (entry) =>
                  entry.bookingId === booking.id &&
                  entry.branchId === filters.branch,
              )) &&
            (!filters.professional ||
              booking.professionalId === filters.professional) &&
            (!filters.service || booking.serviceName === filters.service) &&
            (!filters.status ||
              (filters.status === "active"
                ? booking.status !== "canceled" && booking.status !== "no-show"
                : booking.status === filters.status)),
        )
      )
        return false;
    } else if (
      filters.branch &&
      !client.history.some((entry) => entry.branchId === filters.branch) &&
      !clientBookings.some((booking) => booking.branchId === filters.branch)
    )
      return false;

    return (
      (!filters.gender || client.gender === filters.gender) &&
      matchesDateRange(
        client.birthDate,
        filters.birthdayFrom,
        filters.birthdayTo,
        true,
      ) &&
      matchesDateRange(client.createdAt, filters.createdFrom, filters.createdTo)
    );
  });
}

export function sortClientDatabase(
  clients: SchedulerClient[],
  sort: { key: ClientSortKey; direction: "asc" | "desc" } | null,
) {
  if (!sort) return clients;
  return [...clients].sort(
    (left, right) =>
      (left[sort.key] ?? "").localeCompare(right[sort.key] ?? "", "es-MX", {
        sensitivity: "base",
        numeric: true,
      }) * (sort.direction === "asc" ? 1 : -1),
  );
}
