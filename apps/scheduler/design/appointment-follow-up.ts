import type { SchedulerAppointmentDto } from "@cosmetics/types";
import type { DesignAppointmentFollowUp } from "./contracts";
import { resolveDesignVisitAttendanceStatus } from "./attendance";
import { designId, type DesignState } from "./store";

const automaticCancellationReason =
  "Confirmación enviada sin respuesta; la cita terminó sin asistencia.";
const nextBookingStatuses = new Set([
  "PENDING",
  "RESERVED",
  "CONFIRMED",
  "WAITING",
  "ARRIVED",
]);

export function expireUnansweredAppointments(state: DesignState, now: number) {
  for (const appointment of state.appointments) {
    if (
      appointment.status !== "WAITING" ||
      Date.parse(appointment.endsAt) > now
    )
      continue;
    const visit = state.appointmentCabinVisits[appointment.id];
    const attended = visit?.visitors.some((visitor) =>
      ["ARRIVED", "ATTENDED"].includes(visitor.attendanceStatus ?? ""),
    );
    const latestWaiting = appointment.stateHistory
      .filter((entry) => entry.toStatus === "WAITING")
      .at(-1);
    if (
      attended ||
      latestWaiting?.fromStatus === "ARRIVED" ||
      latestWaiting?.fromStatus === "ATTENDED"
    )
      continue;
    appointment.status = "CANCELED";
    appointment.version++;
    appointment.cancellationReason = automaticCancellationReason;
    appointment.updatedAt = new Date(now).toISOString();
    appointment.stateHistory.push({
      fromStatus: "WAITING",
      toStatus: "CANCELED",
      reason: automaticCancellationReason,
      version: appointment.version,
      actorUserId: "SYSTEM",
      createdAt: appointment.endsAt,
    });
    state.movements.unshift({
      id: designId("design-movement"),
      actorId: "SYSTEM",
      actor: "Sistema",
      actorRole: "Automático",
      actorSource: "SESSION",
      action: "Cancelación automática por falta de confirmación",
      purpose: "SYSTEM_WRITE",
      targetType: "APPOINTMENT",
      targetId: appointment.id,
      createdAt: appointment.updatedAt,
      metadata: {
        branchId: appointment.branchId,
        reason: automaticCancellationReason,
      },
    });
  }
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function buildAppointmentFollowUps(
  state: DesignState,
  allowedBranches: ReadonlySet<string>,
  now: number,
): DesignAppointmentFollowUp[] {
  const activeMembers = new Set(
    state.customerMemberships
      .filter(
        (membership) =>
          membership.status === "ACTIVE" &&
          membership.usedSessions < membership.totalSessions &&
          (!membership.expiresAt || Date.parse(membership.expiresAt) > now),
      )
      .map((membership) => membership.customerId),
  );
  const visitsByCustomer = new Map<
    string,
    Array<{
      appointment: SchedulerAppointmentDto;
      attended: boolean;
      membership: boolean;
    }>
  >();

  for (const appointment of state.appointments) {
    const attendees = state.appointmentCabinVisits[appointment.id]?.visitors;
    for (const person of attendees?.length ? attendees : [null]) {
      const customerId = person ? person.customerId : appointment.customerId;
      if (!customerId) continue;
      const history = visitsByCustomer.get(customerId) ?? [];
      history.push({
        appointment,
        attended:
          appointment.status !== "CANCELED" &&
          ["ARRIVED", "ATTENDED"].includes(
            resolveDesignVisitAttendanceStatus(
              person?.attendanceStatus,
              appointment.status,
            ),
          ),
        membership: Boolean(
          appointment.status !== "CANCELED" &&
          person?.saleCategory === "MEMBERSHIP" &&
          (person.purchaseKind === "FULL" ||
            person.settlementStatus === "PAID"),
        ),
      });
      visitsByCustomer.set(customerId, history);
    }
  }

  const followUps: DesignAppointmentFollowUp[] = [];
  for (const appointment of state.appointments) {
    if (!allowedBranches.has(appointment.branchId)) continue;
    const canceled = appointment.status === "CANCELED";
    const status = canceled ? "CANCELED" : "NO_SHOW";
    const transition = appointment.stateHistory
      .filter((entry) => entry.toStatus === status)
      .at(-1);
    const automatic = canceled && transition?.actorUserId === "SYSTEM";
    const attendees = state.appointmentCabinVisits[appointment.id]?.visitors;
    const cancellation = canceled
      ? state.appointmentJournal.find(
          (entry) =>
            entry.appointmentId === appointment.id &&
            entry.kind === "CANCELLATION_REASON",
        )
      : undefined;
    for (const person of attendees?.length ? attendees : [null]) {
      if (
        !canceled &&
        resolveDesignVisitAttendanceStatus(
          person?.attendanceStatus,
          appointment.status,
        ) !== "NO_SHOW"
      )
        continue;
      const customerId = person ? person.customerId : appointment.customerId;
      const customer = state.customers.find((item) => item.id === customerId);
      const history = (customerId && visitsByCustomer.get(customerId)) || [];
      const prior = history.filter(
        (entry) => entry.appointment.startsAt < appointment.startsAt,
      );
      const weekly =
        (!canceled || automatic) &&
        /redes sociales|instagram|facebook|tiktok/.test(
          normalize(customer?.source?.name ?? ""),
        ) &&
        (Boolean(person?.courtesyFacial) ||
          appointment.services.some(({ serviceName }) => {
            const name = normalize(serviceName);
            return (
              name.includes("facial") && /cortesia|regalo|gratis/.test(name)
            );
          })) &&
        !prior.some((entry) => entry.attended);
      const membership =
        (customerId && activeMembers.has(customerId)) ||
        prior.some((entry) => entry.membership) ||
        (customerId === appointment.customerId &&
          appointment.services.some(
            (service) =>
              service.membership && service.membership.status !== "RELEASED",
          ));
      const occurredAt = canceled
        ? (transition?.createdAt ??
          cancellation?.createdAt ??
          (appointment.cancellationReason
            ? appointment.updatedAt
            : appointment.startsAt))
        : (person?.noShowAt ?? transition?.createdAt ?? appointment.updatedAt);
      const next = history
        .map((entry) => entry.appointment)
        .filter(
          (item) =>
            item.id !== appointment.id &&
            Date.parse(item.startsAt) >=
              Math.max(now, Date.parse(appointment.startsAt)) &&
            nextBookingStatuses.has(item.status),
        )
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0];
      const attendedLater = history.some(
        (entry) =>
          entry.attended && entry.appointment.startsAt > appointment.startsAt,
      );
      const id = `${appointment.id}:${person?.id ?? "primary"}`;
      const lastContactAt = state.appointmentFollowUpContacts[id] ?? null;
      const needsFollowUp =
        !next &&
        !attendedLater &&
        (canceled || weekly || membership || appointment.services.length > 1);
      followUps.push({
        id,
        appointmentId: appointment.id,
        customerId,
        customerName: person?.name ?? appointment.customerName,
        branchId: appointment.branchId,
        branchName: appointment.branchName,
        appointmentStartsAt: appointment.startsAt,
        occurredAt,
        status,
        reason: canceled
          ? appointment.cancellationReason || cancellation?.comment || null
          : (person?.noShowReason ?? null),
        automatic,
        serviceProfileId: appointment.services[0]?.serviceProfileId ?? null,
        hasNextAppointment: Boolean(next),
        nextAppointmentAt:
          next && allowedBranches.has(next.branchId) ? next.startsAt : null,
        nextFollowUpAt:
          needsFollowUp && weekly
            ? lastContactAt
              ? new Date(
                  Date.parse(lastContactAt) + 7 * 24 * 60 * 60_000,
                ).toISOString()
              : occurredAt
            : null,
        lastContactAt,
        needsFollowUp,
        weekly,
      });
    }
  }
  return followUps.sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );
}
