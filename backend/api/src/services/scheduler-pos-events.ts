import { createHash } from "node:crypto";
import { Prisma, type SchedulerAppointmentStatus } from "@prisma/client";
import { SchedulerAppointmentError } from "./scheduler-appointments";

type Transaction = Prisma.TransactionClient;

const eventType = (
  status: SchedulerAppointmentStatus,
): "ATTENDED" | "CANCELED" | "NO_SHOW" | null => {
  if (status === "ATTENDED") return "ATTENDED";
  if (status === "CANCELED") return "CANCELED";
  if (status === "NO_SHOW") return "NO_SHOW";
  return null;
};

const payloadHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function propagateSchedulerAppointmentStatusToPos(
  tx: Transaction,
  input: {
    schedulerAppointmentId: string;
    status: SchedulerAppointmentStatus;
    version: number;
  },
) {
  const type = eventType(input.status);
  if (!type) return;
  const appointments = await tx.posAppointment.findMany({
    where: { schedulerAppointmentId: input.schedulerAppointmentId },
  });
  for (const appointment of appointments) {
    const providerEventId = `scheduler:${input.schedulerAppointmentId}:${input.version}:${appointment.id}`;
    const existingEvent = await tx.agendaSyncEvent.findUnique({
      where: { providerEventId },
    });
    if (existingEvent) continue;
    const event = await tx.agendaSyncEvent.create({
      data: {
        providerEventId,
        type,
        direction: "INBOUND",
        status: "PROCESSING",
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        sourceVersion: input.version,
        payloadHash: payloadHash({
          schedulerAppointmentId: input.schedulerAppointmentId,
          posAppointmentId: appointment.id,
          status: input.status,
          version: input.version,
        }),
        normalizedPayload: {
          source: "SCHEDULER_INTERNAL",
          schedulerAppointmentId: input.schedulerAppointmentId,
          status: input.status,
          version: input.version,
        },
      },
    });

    if (type === "ATTENDED" && appointment.membershipId) {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "PosClientMembership" WHERE "id" = ${appointment.membershipId}::uuid FOR UPDATE`,
      );
      const [membership, attendance] = await Promise.all([
        tx.posClientMembership.findUnique({
          where: { id: appointment.membershipId },
        }),
        tx.posMembershipAttendance.findUnique({
          where: { appointmentId: appointment.id },
        }),
      ]);
      if (!attendance) {
        if (
          !membership ||
          membership.status !== "ACTIVE" ||
          membership.usedSessions >= membership.totalSessions
        ) {
          throw new SchedulerAppointmentError(
            "La membresía no admite otro consumo interno",
            409,
            "MEMBERSHIP_NOT_ELIGIBLE",
          );
        }
        const latest = await tx.posMembershipAttendance.aggregate({
          where: { membershipId: membership.id },
          _max: { sessionNumber: true },
        });
        const nextUsed = membership.usedSessions + 1;
        const exhausted = nextUsed === membership.totalSessions;
        await tx.posMembershipAttendance.create({
          data: {
            membershipId: membership.id,
            appointmentId: appointment.id,
            sessionNumber: (latest._max.sessionNumber ?? 0) + 1,
            branchId: appointment.branchId,
            recordedByCredentialId: null,
            agendaSyncEventId: event.id,
            signatureStatus: "PENDING",
          },
        });
        if (exhausted) {
          await tx.posMembershipStatusChange.create({
            data: {
              membershipId: membership.id,
              fromStatus: "ACTIVE",
              toStatus: "EXHAUSTED",
              reason: "Scheduler confirmó la última asistencia",
              actorCredentialId: appointment.createdByCredentialId,
              sourceType: "AgendaSyncEvent",
              sourceId: event.id,
            },
          });
        }
        await tx.posClientMembership.update({
          where: { id: membership.id },
          data: {
            usedSessions: nextUsed,
            status: exhausted ? "EXHAUSTED" : "ACTIVE",
            exhaustedAt: exhausted ? new Date() : null,
          },
        });
      }
    }

    await tx.posAppointment.update({
      where: { id: appointment.id },
      data: {
        status:
          type === "ATTENDED"
            ? "COMPLETED"
            : type === "NO_SHOW"
              ? "NO_SHOW"
              : "CANCELED",
        agendaVersion: input.version,
      },
    });
    if (type === "CANCELED" && appointment.agendaReservationId) {
      await tx.agendaReservation.updateMany({
        where: { id: appointment.agendaReservationId },
        data: { status: "CANCELED" },
      });
    }
    await tx.agendaSyncEvent.update({
      where: { id: event.id },
      data: { status: "SUCCEEDED", resolvedAt: new Date() },
    });
  }
}
