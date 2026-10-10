export function getSchedulerAppointmentAttendeeIndex(
  pointerX: number,
  cardLeft: number,
  cardWidth: number,
  attendeeCount: number,
): number {
  if (attendeeCount <= 1 || cardWidth <= 0) return 0;

  const relativeX = Math.min(cardWidth, Math.max(0, pointerX - cardLeft));

  return Math.min(
    attendeeCount - 1,
    Math.floor((relativeX / cardWidth) * attendeeCount),
  );
}
