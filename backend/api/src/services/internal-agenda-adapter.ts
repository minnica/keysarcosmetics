import { createHash } from "node:crypto";
import { prisma } from "../prisma/client";
import {
  resolveSchedulerDailyWindows,
  schedulerIntervalsOverlap,
  schedulerLocalDateKey,
  schedulerLocalMinute,
  schedulerLocalMinuteToUtc,
  schedulerWindowContains,
  SCHEDULER_OCCUPYING_STATUSES,
  SCHEDULER_SLOT_MINUTES,
} from "./scheduler-appointments";
import {
  AgendaAdapterError,
  type AgendaAdapter,
  type AgendaExternalClientInput,
  type AgendaExternalSlot,
  type AgendaReservationLegInput,
} from "./agenda-adapter";
import { propagateSchedulerAppointmentStatusToPos } from "./scheduler-pos-events";

const INTERNAL_RESOURCE_PREFIX = "scheduler-resource:";
const INTERNAL_SLOT_PREFIX = "scheduler-slot:";
const INTERNAL_RESERVATION_PREFIX = "scheduler-intent:";
const INTERNAL_APPOINTMENT_PREFIX = "scheduler-appointment-intent:";

const activeAt = (
  row: { active: boolean; effectiveFrom: Date; effectiveTo: Date | null },
  at: Date,
) =>
  row.active &&
  row.effectiveFrom <= at &&
  (!row.effectiveTo || row.effectiveTo > at);

const stableId = (prefix: string, value: string) =>
  `${prefix}${createHash("sha256").update(value).digest("hex").slice(0, 40)}`;

export const internalAgendaResourceId = (
  branchProfileId: string,
  serviceProfileId: string,
  professionalProfileId: string,
) =>
  `${INTERNAL_RESOURCE_PREFIX}${branchProfileId}:${serviceProfileId}:${professionalProfileId}`;

export const parseInternalAgendaResourceId = (value: string) => {
  if (!value.startsWith(INTERNAL_RESOURCE_PREFIX)) return null;
  const [branchProfileId, serviceProfileId, professionalProfileId, ...extra] =
    value.slice(INTERNAL_RESOURCE_PREFIX.length).split(":");
  return branchProfileId &&
    serviceProfileId &&
    professionalProfileId &&
    extra.length === 0
    ? { branchProfileId, serviceProfileId, professionalProfileId }
    : null;
};

export const internalAgendaSlotId = (input: {
  branchProfileId: string;
  serviceProfileId: string;
  professionalProfileId: string;
  startsAt: Date;
}) =>
  `${INTERNAL_SLOT_PREFIX}${input.branchProfileId}:${input.serviceProfileId}:${input.professionalProfileId}:${input.startsAt.getTime()}`;

export const parseInternalAgendaSlotId = (value: string) => {
  if (!value.startsWith(INTERNAL_SLOT_PREFIX)) return null;
  const [
    branchProfileId,
    serviceProfileId,
    professionalProfileId,
    timestamp,
    ...extra
  ] = value.slice(INTERNAL_SLOT_PREFIX.length).split(":");
  const startsAt = new Date(Number(timestamp));
  return branchProfileId &&
    serviceProfileId &&
    professionalProfileId &&
    extra.length === 0 &&
    !Number.isNaN(startsAt.getTime())
    ? { branchProfileId, serviceProfileId, professionalProfileId, startsAt }
    : null;
};

const exceptionDate = (value: Date) => value.toISOString().slice(0, 10);

export class InternalAgendaAdapter implements AgendaAdapter {
  readonly provider = "internal" as const;

  async listAvailability(input: {
    branchCode: string;
    from: string;
    to: string;
    serviceItemId?: string;
    seats: number;
  }): Promise<AgendaExternalSlot[]> {
    const from = new Date(input.from);
    const to = new Date(input.to);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from >= to ||
      !Number.isInteger(input.seats) ||
      input.seats < 1
    ) {
      throw new AgendaAdapterError(
        "El rango de disponibilidad interna es inválido",
        "AGENDA_INVALID_REQUEST",
        400,
        false,
      );
    }
    const branch = await prisma.sucursal.findFirst({
      where: { activa: true, posProfile: { code: input.branchCode } },
      include: {
        schedulerProfile: { include: { commerce: true } },
      },
    });
    const profile = branch?.schedulerProfile;
    if (
      !branch ||
      !profile ||
      !profile.bookingEnabled ||
      !activeAt(profile, from) ||
      !activeAt(profile.commerce, from)
    ) {
      throw new AgendaAdapterError(
        "La sucursal no está habilitada en Scheduler",
        "BRANCH_NOT_MAPPED",
        409,
        false,
      );
    }

    const services = await prisma.schedulerServiceProfile.findMany({
      where: {
        active: true,
        ...(input.serviceItemId ? { catalogItemId: input.serviceItemId } : {}),
        branchAssignments: {
          some: { branchProfileId: profile.id, active: true },
        },
      },
      include: {
        catalogItem: { select: { name: true, active: true, kind: true } },
        branchAssignments: { where: { branchProfileId: profile.id } },
        professionalAssignments: {
          where: { branchProfileId: profile.id },
          include: {
            professionalProfile: { include: { employee: true } },
          },
        },
        resourceRequirements: { include: { resource: true } },
      },
    });
    if (input.serviceItemId && services.length === 0) {
      throw new AgendaAdapterError(
        "El servicio no está habilitado en Scheduler",
        "SERVICE_NOT_AVAILABLE",
        409,
        false,
      );
    }

    const [rules, exceptions, blocks, existing] = await Promise.all([
      prisma.schedulerAvailabilityRule.findMany({
        where: {
          branchProfileId: profile.id,
          active: true,
          effectiveFrom: { lt: to },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: from } }],
        },
      }),
      prisma.schedulerAvailabilityException.findMany({
        where: {
          branchProfileId: profile.id,
          active: true,
          effectiveFrom: { lt: to },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: from } }],
        },
      }),
      prisma.schedulerScheduleBlock.findMany({
        where: {
          branchProfileId: profile.id,
          status: "ACTIVE",
          startsAt: { lt: to },
          endsAt: { gt: from },
        },
      }),
      prisma.schedulerAppointmentService.findMany({
        where: {
          occupiesFrom: { lt: to },
          occupiesUntil: { gt: from },
          appointment: {
            branchProfileId: profile.id,
            status: { in: SCHEDULER_OCCUPYING_STATUSES },
          },
        },
        include: { participants: true, resources: true },
      }),
    ]);
    const slots: AgendaExternalSlot[] = [];
    const firstDate = schedulerLocalDateKey(from, profile.timezone);
    const lastDate = schedulerLocalDateKey(
      new Date(to.getTime() - 1),
      profile.timezone,
    );
    for (
      let dateCursor = new Date(`${firstDate}T00:00:00.000Z`);
      dateCursor <= new Date(`${lastDate}T00:00:00.000Z`);
      dateCursor = new Date(dateCursor.getTime() + 86_400_000)
    ) {
      const date = dateCursor.toISOString().slice(0, 10);
      const windows = (
        professionalProfileId: string | null,
        resourceId: string | null,
      ) =>
        resolveSchedulerDailyWindows({
          date,
          rules: rules
            .filter(
              (rule) =>
                rule.professionalProfileId === professionalProfileId &&
                rule.resourceId === resourceId,
            )
            .map((rule) => ({
              kind: rule.kind,
              weekday: rule.weekday,
              startMinute: rule.startMinute,
              endMinute: rule.endMinute,
            })),
          exceptions: exceptions
            .filter(
              (exception) =>
                exception.professionalProfileId === professionalProfileId &&
                exception.resourceId === resourceId,
            )
            .map((exception) => ({
              kind: exception.kind,
              date: exceptionDate(exception.date),
              startMinute: exception.startMinute,
              endMinute: exception.endMinute,
            })),
        });
      const branchWindows = windows(null, null);
      for (const service of services) {
        for (const assignment of service.professionalAssignments) {
          const professional = assignment.professionalProfile;
          for (
            let minute = 0;
            minute < 1440;
            minute += SCHEDULER_SLOT_MINUTES
          ) {
            const startsAt = schedulerLocalMinuteToUtc(
              date,
              minute,
              profile.timezone,
            );
            const endsAt = new Date(
              startsAt.getTime() + service.durationMinutes * 60_000,
            );
            const occupiesFrom = new Date(
              startsAt.getTime() - service.preparationMinutes * 60_000,
            );
            const occupiesUntil = new Date(
              endsAt.getTime() + service.cleanupMinutes * 60_000,
            );
            const endMinute =
              schedulerLocalDateKey(occupiesUntil, profile.timezone) === date
                ? schedulerLocalMinute(occupiesUntil, profile.timezone)
                : 1440;
            const requirements = service.resourceRequirements.filter(
              (requirement) => activeAt(requirement, startsAt),
            );
            if (
              startsAt < from ||
              endsAt > to ||
              !service.catalogItem.active ||
              service.catalogItem.kind !== "SERVICE" ||
              !activeAt(service, startsAt) ||
              !service.branchAssignments.some((item) =>
                activeAt(item, startsAt),
              ) ||
              !activeAt(assignment, startsAt) ||
              !activeAt(professional, startsAt) ||
              !professional.employee.activo ||
              !schedulerWindowContains(
                branchWindows,
                schedulerLocalMinute(occupiesFrom, profile.timezone),
                endMinute,
              ) ||
              !schedulerWindowContains(
                windows(professional.id, null),
                schedulerLocalMinute(occupiesFrom, profile.timezone),
                endMinute,
              ) ||
              requirements.some(
                (requirement) =>
                  !activeAt(requirement.resource, startsAt) ||
                  !schedulerWindowContains(
                    windows(null, requirement.resourceId),
                    schedulerLocalMinute(occupiesFrom, profile.timezone),
                    endMinute,
                  ),
              ) ||
              blocks.some(
                (block) =>
                  schedulerIntervalsOverlap(
                    occupiesFrom,
                    occupiesUntil,
                    block.startsAt,
                    block.endsAt,
                  ) &&
                  ((!block.professionalProfileId && !block.resourceId) ||
                    block.professionalProfileId === professional.id ||
                    requirements.some(
                      (requirement) =>
                        requirement.resourceId === block.resourceId,
                    )),
              )
            )
              continue;
            const overlaps = existing.filter((item) =>
              schedulerIntervalsOverlap(
                occupiesFrom,
                occupiesUntil,
                item.occupiesFrom,
                item.occupiesUntil,
              ),
            );
            if (
              overlaps.some((item) =>
                item.participants.some(
                  (participant) =>
                    participant.professionalProfileId === professional.id,
                ),
              )
            )
              continue;
            const serviceUsed = overlaps
              .filter(
                (item) =>
                  item.serviceProfileId === service.id &&
                  item.startsAt.getTime() === startsAt.getTime(),
              )
              .reduce((total, item) => total + item.capacityUnits, 0);
            const resourceRemaining = requirements.map((requirement) => {
              const allocations = overlaps.flatMap((item) =>
                item.resources.filter(
                  (resource) => resource.resourceId === requirement.resourceId,
                ),
              );
              if (
                requirement.exclusive ||
                requirement.resource.exclusive ||
                allocations.some((allocation) => allocation.exclusiveSnapshot)
              )
                return allocations.length === 0 ? 1 : 0;
              const used = allocations.reduce(
                (total, allocation) => total + allocation.units,
                0,
              );
              return Math.floor(
                Math.max(0, requirement.resource.capacity - used) /
                  requirement.requiredUnits,
              );
            });
            const remaining = Math.min(
              service.capacity - serviceUsed,
              ...(resourceRemaining.length
                ? resourceRemaining
                : [Number.POSITIVE_INFINITY]),
            );
            if (remaining < input.seats) continue;
            const resourceId = internalAgendaResourceId(
              profile.id,
              service.id,
              professional.id,
            );
            slots.push({
              externalSlotId: internalAgendaSlotId({
                branchProfileId: profile.id,
                serviceProfileId: service.id,
                professionalProfileId: professional.id,
                startsAt,
              }),
              externalCalendarId: `scheduler:${profile.id}`,
              externalResourceId: resourceId,
              resourceName: `${professional.employee.nombreCompleto} · ${service.catalogItem.name}`,
              resourceType: service.capacity >= 2 ? "DOUBLE" : "INDIVIDUAL",
              startsAt: startsAt.toISOString(),
              endsAt: endsAt.toISOString(),
              capacity: service.capacity,
              reservedCount: Math.max(0, service.capacity - remaining),
              status: "AVAILABLE",
              version: service.version,
            });
          }
        }
      }
    }
    if (input.serviceItemId) return slots;
    const generic = new Map<string, AgendaExternalSlot>();
    for (const slot of slots) {
      const resource = parseInternalAgendaResourceId(slot.externalResourceId);
      if (!resource) continue;
      const key = `${resource.branchProfileId}:${resource.professionalProfileId}:${slot.startsAt}`;
      const current = generic.get(key);
      if (
        !current ||
        slot.capacity > current.capacity ||
        (slot.capacity === current.capacity &&
          new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime() >
            new Date(current.endsAt).getTime() -
              new Date(current.startsAt).getTime())
      ) {
        generic.set(key, {
          ...slot,
          resourceName: slot.resourceName.split(" · ")[0] ?? slot.resourceName,
        });
      }
    }
    return [...generic.values()].sort(
      (left, right) =>
        left.startsAt.localeCompare(right.startsAt) ||
        left.resourceName.localeCompare(right.resourceName),
    );
  }

  async upsertClient(input: AgendaExternalClientInput) {
    return { externalClientId: `scheduler-client:${input.localClientKey}` };
  }

  async updateClient() {
    // Customer is shared by POS and Scheduler, so no projection is required.
  }

  async reserveLeg(input: AgendaReservationLegInput) {
    const slots = await prisma.agendaSlot.findMany({
      where: {
        externalSlotId: { in: input.slots.map((slot) => slot.externalSlotId) },
      },
      include: { resource: true },
    });
    if (slots.length !== input.slots.length) {
      throw new AgendaAdapterError(
        "El slot interno ya no existe",
        "SLOT_NOT_FOUND",
        409,
        false,
      );
    }
    for (const requested of input.slots) {
      const slot = slots.find(
        (candidate) => candidate.externalSlotId === requested.externalSlotId,
      );
      const parsed = slot
        ? parseInternalAgendaSlotId(slot.externalSlotId)
        : null;
      if (
        !slot ||
        !parsed ||
        slot.status !== "AVAILABLE" ||
        slot.sourceVersion !== requested.expectedVersion ||
        slot.capacity - slot.reservedCount < requested.seats
      ) {
        throw new AgendaAdapterError(
          "La disponibilidad interna cambió; vuelve a cargarla",
          "AGENDA_CAPACITY_CONFLICT",
          409,
          false,
        );
      }
    }
    const key = input.idempotencyKey;
    return {
      externalReservationId: stableId(INTERNAL_RESERVATION_PREFIX, key),
      externalAppointmentIds: input.services.map((_, index) =>
        stableId(INTERNAL_APPOINTMENT_PREFIX, `${key}:${index + 1}`),
      ),
      version: Math.max(...input.slots.map((slot) => slot.expectedVersion)),
    };
  }

  async cancelReservation(externalReservationId: string, reason: string) {
    // Intent identifiers do not reserve capacity. Once the POS transaction
    // commits, the durable AgendaReservation is rewritten to scheduler:<uuid>
    // and cancellation is handled by the internal synchronization path.
    if (externalReservationId.startsWith("scheduler:")) {
      const appointmentId = externalReservationId.slice("scheduler:".length);
      await prisma.$transaction(async (tx) => {
        const appointment = await tx.schedulerAppointment.findUnique({
          where: { id: appointmentId },
          include: { branchProfile: { select: { branchId: true } } },
        });
        if (!appointment || appointment.status === "CANCELED") return;
        if (["ATTENDED", "NO_SHOW"].includes(appointment.status)) {
          throw new AgendaAdapterError(
            "La cita interna ya alcanzó un estado terminal",
            "INVALID_STATUS_TRANSITION",
            409,
            false,
          );
        }
        const version = appointment.version + 1;
        await tx.schedulerAppointment.update({
          where: { id: appointment.id },
          data: {
            status: "CANCELED",
            cancellationReason: reason.slice(0, 500),
            version,
            updatedByUserId: appointment.updatedByUserId,
          },
        });
        await tx.schedulerAppointmentMembershipBenefit.updateMany({
          where: {
            appointmentService: { appointmentId: appointment.id },
            status: "RESERVED",
          },
          data: { status: "RELEASED", releasedAt: new Date() },
        });
        await tx.schedulerAppointmentStateHistory.create({
          data: {
            appointmentId: appointment.id,
            fromStatus: appointment.status,
            toStatus: "CANCELED",
            reason: reason.slice(0, 500),
            version,
            actorUserId: appointment.updatedByUserId,
          },
        });
        await propagateSchedulerAppointmentStatusToPos(tx, {
          schedulerAppointmentId: appointment.id,
          status: "CANCELED",
          version,
        });
        await tx.auditLog.create({
          data: {
            application: "SCHEDULER",
            action: "SCHEDULER_APPOINTMENT_CANCELED_FROM_POS",
            outcome: "SUCCESS",
            actorUserId: appointment.updatedByUserId,
            branchId: appointment.branchProfile.branchId,
            targetType: "SchedulerAppointment",
            targetId: appointment.id,
            metadata: { version, reason: reason.slice(0, 500) },
          },
        });
      });
      return;
    }
    if (!externalReservationId.startsWith(INTERNAL_RESERVATION_PREFIX)) {
      throw new AgendaAdapterError(
        "La reservación no pertenece al proveedor interno",
        "AGENDA_RESERVATION_PROVIDER_MISMATCH",
        409,
        false,
      );
    }
  }
}
