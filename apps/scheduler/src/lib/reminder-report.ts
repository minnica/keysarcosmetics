import type { ReservationHistoryRecord } from "./mock-reservation-report-data";

export type ReminderChannel = "email" | "whatsapp";
export interface ReminderMessage {
  id: string;
  reservationId: string;
  channel: ReminderChannel;
  status: "sent" | "confirmed" | "not-sent";
  recipient?: string;
  reason?: string;
}

// No delivery service is connected. Do not infer actual sends from bookings.
export const demoReminderMessages: ReminderMessage[] = [];
export const defaultReminderPeriod = { from: "2026-08-05", to: "2026-09-05" };

export function filterReminderReservations(
  reservations: ReservationHistoryRecord[],
  from: string,
  to: string,
) {
  if (!from || !to || from > to) return [];
  return reservations.filter((reservation) => {
    const day = reservation.performedAt.slice(0, 10);
    return day >= from && day <= to;
  });
}

export function summarizeReminders(
  reservations: ReservationHistoryRecord[],
  messages: ReminderMessage[],
) {
  const confirmed = reservations.filter(
    (reservation) =>
      reservation.status === "confirmed" || reservation.status === "attended",
  );
  const percentage = (count: number) =>
    reservations.length ? (count / reservations.length) * 100 : 0;
  const channels = (["email", "whatsapp"] as const).map((channel) => {
    const relevant = messages.filter(
      (message) =>
        message.channel === channel &&
        reservations.some(
          (reservation) => reservation.id === message.reservationId,
        ),
    );
    const confirmedIds = new Set(
      relevant
        .filter((message) => message.status === "confirmed")
        .map((message) => message.reservationId),
    );
    return {
      channel,
      sent: relevant.filter((message) => message.status !== "not-sent").length,
      confirmed: confirmedIds.size,
      rate: percentage(confirmedIds.size),
      revenue: reservations
        .filter((reservation) => confirmedIds.has(reservation.id))
        .reduce((sum, reservation) => sum + reservation.amount, 0),
      failures: relevant
        .filter((message) => message.status === "not-sent")
        .map((message) => ({
          ...message,
          reservation: reservations.find(
            (reservation) => reservation.id === message.reservationId,
          )!,
        })),
    };
  });
  return {
    reserved: reservations.length,
    confirmed: confirmed.length,
    attended: reservations.filter(
      (reservation) => reservation.status === "attended",
    ).length,
    revenue: confirmed.reduce(
      (sum, reservation) => sum + reservation.amount,
      0,
    ),
    rate: percentage(confirmed.length),
    email: channels[0]!,
    whatsapp: channels[1]!,
  };
}
