export type SchedulerBookingMoveStatus =
  | "pending"
  | "reserved"
  | "confirmed"
  | "waiting"
  | "arrived"
  | "attended"
  | "no-show"
  | "canceled";

const schedulerMovableBookingStatuses = new Set<SchedulerBookingMoveStatus>([
  "pending",
  "reserved",
  "confirmed",
  "waiting",
]);

export function canMoveSchedulerBooking(
  status: SchedulerBookingMoveStatus,
  hasPurchase: boolean,
): boolean {
  return schedulerMovableBookingStatuses.has(status) && !hasPurchase;
}
