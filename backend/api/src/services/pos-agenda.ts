import { Prisma, type AgendaReservationMode } from "@prisma/client";
import type {
  PosAgendaConflictDto,
  PosAgendaSlotDto,
  PosTicketAppointmentInputDto,
  PosTicketCreateRequestDto,
} from "@cosmetics/types";
import { prisma } from "../prisma/client";
import {
  AgendaAdapterError,
  agendaAdapterFromEnvironment,
  agendaPayloadHash,
  type AgendaAdapter,
} from "./agenda-adapter";
import { consumeOperationAuthorization } from "./pos-operations";

type Transaction = Prisma.TransactionClient;

export class PosAgendaError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "AGENDA_ERROR",
  ) {
    super(message);
  }
}

const safeError = (error: unknown) => {
  if (error instanceof AgendaAdapterError || error instanceof PosAgendaError)
    return { code: error.code, message: error.message.slice(0, 500) };
  return {
    code: "AGENDA_INTERNAL_ERROR",
    message: "No fue posible completar la operación con Agenda",
  };
};

const localTime = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

const localDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const isAgendaSlotEligible = (
  slot: {
    status: "AVAILABLE" | "CANCELED" | "BOOKED" | "BLOCKED";
    capacity: number;
    reservedCount: number;
  },
  seats = 1,
) =>
  slot.status === "AVAILABLE" &&
  seats > 0 &&
  slot.capacity - slot.reservedCount >= seats;

const assertStableExternalClientId = (
  current: string | null,
  received: string,
) => {
  if (current && current !== received)
    throw new PosAgendaError(
      "Agenda devolvió una identidad distinta para un cliente vinculado",
      409,
      "EXTERNAL_CLIENT_ID_CONFLICT",
    );
};

export async function refreshAgendaAvailability(input: {
  branchId: string;
  from: string;
  to: string;
  serviceItemId?: string;
  seats: number;
  adapter?: AgendaAdapter;
}): Promise<PosAgendaSlotDto[]> {
  const branch = await prisma.sucursal.findFirst({
    where: { id: input.branchId, activa: true },
    include: { posProfile: { select: { code: true } } },
  });
  if (!branch)
    throw new PosAgendaError("Sucursal no encontrada", 404, "BRANCH_NOT_FOUND");
  if (!branch.posProfile?.code)
    throw new PosAgendaError(
      "La sucursal no tiene un código POS para Agenda",
      409,
      "BRANCH_NOT_MAPPED",
    );
  const slots = await (
    input.adapter ?? agendaAdapterFromEnvironment()
  ).listAvailability({
    branchCode: branch.posProfile.code,
    from: input.from,
    to: input.to,
    serviceItemId: input.serviceItemId,
    seats: input.seats,
  });
  const rangeStart = new Date(input.from);
  const rangeEnd = new Date(input.to);
  if (
    new Set(slots.map((slot) => slot.externalSlotId)).size !== slots.length ||
    slots.some(
      (slot) =>
        new Date(slot.startsAt) < rangeStart ||
        new Date(slot.endsAt) > rangeEnd,
    )
  )
    throw new PosAgendaError(
      "Agenda devolvió disponibilidad fuera del rango solicitado",
      502,
      "AGENDA_INVALID_RESPONSE",
    );
  const stored = await prisma.$transaction(async (tx) => {
    await tx.agendaSlot.updateMany({
      where: {
        resource: { branchId: branch.id },
        startsAt: { gte: rangeStart, lt: rangeEnd },
        externalSlotId: { notIn: slots.map((slot) => slot.externalSlotId) },
      },
      data: { status: "BLOCKED" },
    });
    const values = [];
    for (const slot of slots) {
      const resource = await tx.agendaResource.upsert({
        where: { externalResourceId: slot.externalResourceId },
        create: {
          branchId: branch.id,
          externalResourceId: slot.externalResourceId,
          externalCalendarId: slot.externalCalendarId,
          nameSnapshot: slot.resourceName,
          type: slot.resourceType,
          version: slot.version,
        },
        update: {
          externalCalendarId: slot.externalCalendarId,
          nameSnapshot: slot.resourceName,
          type: slot.resourceType,
          active: true,
          version: slot.version,
        },
      });
      if (resource.branchId !== branch.id)
        throw new PosAgendaError(
          "Agenda reutilizó un recurso en otra sucursal",
          409,
          "RESOURCE_BRANCH_CONFLICT",
        );
      const storedSlot = await tx.agendaSlot.upsert({
        where: { externalSlotId: slot.externalSlotId },
        create: {
          resourceId: resource.id,
          externalSlotId: slot.externalSlotId,
          startsAt: new Date(slot.startsAt),
          endsAt: new Date(slot.endsAt),
          capacity: slot.capacity,
          reservedCount: slot.reservedCount,
          status: slot.status,
          sourceVersion: slot.version,
        },
        update: {
          startsAt: new Date(slot.startsAt),
          endsAt: new Date(slot.endsAt),
          capacity: slot.capacity,
          reservedCount: slot.reservedCount,
          status: slot.status,
          sourceVersion: slot.version,
        },
        include: { resource: true },
      });
      if (storedSlot.resourceId !== resource.id)
        throw new PosAgendaError(
          "Agenda reutilizó un slot en otro recurso",
          409,
          "SLOT_RESOURCE_CONFLICT",
        );
      values.push(storedSlot);
    }
    return values;
  });
  return stored
    .filter((slot) => isAgendaSlotEligible(slot, input.seats))
    .map((slot) => ({
      id: slot.id,
      externalSystem: "AGENDA_CRM",
      externalCalendarId: slot.resource.externalCalendarId,
      externalSlotId: slot.externalSlotId,
      branchId: branch.id,
      branchName: branch.nombre,
      date: localDate(slot.startsAt),
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      startTime: localTime(slot.startsAt),
      endTime: localTime(slot.endsAt),
      resourceId: slot.resourceId,
      resourceName: slot.resource.nameSnapshot,
      resourceType: slot.resource.type,
      capacity: slot.capacity,
      reservedCount: slot.reservedCount,
      availableSeats: slot.capacity - slot.reservedCount,
      status: slot.status,
      version: slot.sourceVersion,
      updatedAt: slot.actualizadoEn.toISOString(),
    }));
}

interface AppointmentGroup {
  mode: AgendaReservationMode;
  entries: Array<{ index: number; appointment: PosTicketAppointmentInputDto }>;
}

export function groupAgendaAppointments(
  appointments: PosTicketAppointmentInputDto[],
): AppointmentGroup[] {
  const reservable = appointments
    .map((appointment, index) => ({ index, appointment }))
    .filter(({ appointment }) => appointment.kind !== "NO_APPOINTMENT");
  const groups: AppointmentGroup[] = [];
  for (let cursor = 0; cursor < reservable.length; cursor += 1) {
    const entry = reservable[cursor]!;
    const mode = entry.appointment.agendaReservationMode ?? "SINGLE";
    if (mode === "SINGLE") {
      groups.push({ mode, entries: [entry] });
      continue;
    }
    const next = reservable[cursor + 1];
    if (
      entry.appointment.kind !== "COURTESY" ||
      !next ||
      next.appointment.kind !== "COURTESY" ||
      (next.appointment.agendaReservationMode ?? "SINGLE") !== mode
    )
      throw new PosAgendaError(
        "Una cortesía doble requiere exactamente dos servicios contiguos",
        400,
        "INVALID_DOUBLE_RESERVATION",
      );
    groups.push({ mode, entries: [entry, next] });
    cursor += 1;
  }
  return groups;
}

export interface PreparedAgendaTicket {
  externalClientId: string;
  clientSyncEventId: string;
  appointments: Array<{
    index: number;
    reservationId: string;
    externalReservationId: string;
    externalAppointmentId: string;
    slotId: string;
    resourceId: string;
    version: number;
    capacity: number;
    startsAt: Date;
    endsAt: Date;
  }>;
}

const stringArray = (value: Prisma.JsonValue | null): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const positiveIntegerArray = (value: Prisma.JsonValue | null): number[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is number =>
          typeof item === "number" && Number.isInteger(item) && item > 0,
      )
    : [];

async function compensateReservations(
  records: Array<{
    id: string;
    idempotencyKey: string;
    externalReservationIdsSnapshot: Prisma.JsonValue | null;
  }>,
  adapter: AgendaAdapter,
  reason: string,
) {
  for (const record of records) {
    const externalIds = stringArray(record.externalReservationIdsSnapshot);
    let canceled = true;
    let cancellationFailure: ReturnType<typeof safeError> | null = null;
    for (const [index, externalId] of externalIds.entries()) {
      try {
        await adapter.cancelReservation(
          externalId,
          reason,
          `${record.idempotencyKey}:cancel:${index + 1}`,
        );
      } catch (error) {
        canceled = false;
        cancellationFailure ??= safeError(error);
      }
    }
    await prisma.$transaction(async (tx) => {
      await tx.agendaReservation.update({
        where: { id: record.id },
        data: { status: canceled ? "CANCELED" : "CANCEL_PENDING" },
      });
      if (externalIds.length === 0) return;
      const existingEvent = await tx.agendaSyncEvent.findFirst({
        where: {
          reservationId: record.id,
          type: "RESERVATION_CANCEL",
          direction: "OUTBOUND",
        },
        orderBy: { creadoEn: "desc" },
      });
      const eventData = {
        status: canceled ? ("SUCCEEDED" as const) : ("FAILED" as const),
        retryCount: canceled ? 0 : 1,
        nextAttemptAt: canceled ? null : new Date(Date.now() + 60_000),
        resolvedAt: canceled ? new Date() : null,
        lastErrorCode: cancellationFailure?.code ?? null,
        lastErrorMessage: cancellationFailure?.message ?? null,
      };
      if (existingEvent) {
        await tx.agendaSyncEvent.update({
          where: { id: existingEvent.id },
          data: eventData,
        });
      } else {
        await tx.agendaSyncEvent.create({
          data: {
            type: "RESERVATION_CANCEL",
            direction: "OUTBOUND",
            reservationId: record.id,
            payloadHash: agendaPayloadHash({
              reservationId: record.id,
              reason,
            }),
            normalizedPayload: { reservationId: record.id },
            ...eventData,
          },
        });
      }
    });
  }
}

export async function prepareAgendaTicketSaga(input: {
  operationKey: string;
  ticket: PosTicketCreateRequestDto;
  authorizedBranchIds: string[];
  adapter?: AgendaAdapter;
}): Promise<PreparedAgendaTicket | null> {
  const groups = groupAgendaAppointments(input.ticket.appointments ?? []);
  if (groups.length === 0) return null;
  const adapter = input.adapter ?? agendaAdapterFromEnvironment();
  const existingCustomer = input.ticket.customer.id
    ? await prisma.customer.findFirst({
        where: { id: input.ticket.customer.id, active: true, deletedAt: null },
      })
    : null;
  const customerInput = existingCustomer
    ? {
        localClientKey: existingCustomer.id,
        externalClientId: existingCustomer.externalClientId,
        displayName: existingCustomer.displayName,
        phone: existingCustomer.phone,
        email: existingCustomer.email,
      }
    : input.ticket.customer.create
      ? {
          localClientKey: `pending:${input.operationKey}`,
          externalClientId: null,
          displayName: input.ticket.customer.create.displayName,
          phone: input.ticket.customer.create.phone ?? null,
          email: input.ticket.customer.create.email ?? null,
        }
      : null;
  if (!customerInput)
    throw new PosAgendaError(
      "Cliente no encontrado",
      404,
      "CUSTOMER_NOT_FOUND",
    );

  const clientEvent = await prisma.agendaSyncEvent.create({
    data: {
      type: "CLIENT_UPSERT",
      direction: "OUTBOUND",
      status: "PROCESSING",
      customerId: existingCustomer?.id ?? null,
      payloadHash: agendaPayloadHash(customerInput),
      normalizedPayload: { localClientKey: customerInput.localClientKey },
    },
  });
  let externalClientId: string;
  try {
    externalClientId = (
      await adapter.upsertClient(
        customerInput,
        `${input.operationKey}:customer`,
      )
    ).externalClientId;
    assertStableExternalClientId(
      existingCustomer?.externalClientId ?? null,
      externalClientId,
    );
    await prisma.$transaction([
      prisma.agendaSyncEvent.update({
        where: { id: clientEvent.id },
        data: { status: "SUCCEEDED", resolvedAt: new Date() },
      }),
      ...(existingCustomer
        ? [
            prisma.customer.update({
              where: { id: existingCustomer.id },
              data: { externalClientId, version: { increment: 1 } },
            }),
          ]
        : []),
    ]);
  } catch (error) {
    const identityConflict =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    const failure = identityConflict
      ? {
          code: "EXTERNAL_CLIENT_ID_CONFLICT",
          message: "La identidad de Agenda ya pertenece a otro cliente",
        }
      : safeError(error);
    await prisma.agendaSyncEvent.update({
      where: { id: clientEvent.id },
      data: {
        status: "FAILED",
        retryCount: { increment: 1 },
        nextAttemptAt: new Date(Date.now() + 60_000),
        lastErrorCode: failure.code,
        lastErrorMessage: failure.message,
      },
    });
    throw new PosAgendaError(
      failure.message,
      identityConflict
        ? 409
        : error instanceof AgendaAdapterError
          ? error.status
          : 502,
      failure.code,
    );
  }

  const prepared: PreparedAgendaTicket["appointments"] = [];
  const reservedRecords: Array<{
    id: string;
    idempotencyKey: string;
    externalReservationIdsSnapshot: Prisma.JsonValue | null;
  }> = [];
  try {
    for (const [groupIndex, group] of groups.entries()) {
      const slotIds = group.entries.map(
        ({ appointment }) => appointment.agendaSlotId!,
      );
      const priorReservation = await prisma.agendaReservation.findUnique({
        where: {
          operationKey_groupOrdinal: {
            operationKey: input.operationKey,
            groupOrdinal: groupIndex + 1,
          },
        },
      });
      if (
        priorReservation &&
        !["INTENT", "FAILED", "REMOTE_RESERVED"].includes(
          priorReservation.status,
        )
      )
        throw new PosAgendaError(
          "La operación de Agenda ya alcanzó un estado terminal",
          409,
          "AGENDA_IDEMPOTENCY_CONFLICT",
        );
      const remoteAlreadyReserved =
        priorReservation?.status === "REMOTE_RESERVED";
      const slots = await prisma.agendaSlot.findMany({
        where: { id: { in: slotIds } },
        include: {
          resource: { include: { branch: { include: { posProfile: true } } } },
        },
      });
      const slotById = new Map(slots.map((slot) => [slot.id, slot]));
      const ordered = slotIds.map((slotId) => slotById.get(slotId));
      if (ordered.some((slot) => !slot))
        throw new PosAgendaError(
          "El slot ya no existe; actualiza disponibilidad",
          409,
          "SLOT_NOT_FOUND",
        );
      const concrete = ordered.map((slot) => slot!);
      const first = concrete[0]!;
      if (
        !input.authorizedBranchIds.includes(first.resource.branchId) ||
        concrete.some(
          (slot, index) =>
            slot.resource.branchId !== first.resource.branchId ||
            slot.resourceId !== first.resourceId ||
            slot.resource.branchId !==
              group.entries[index]!.appointment.branchId ||
            (!remoteAlreadyReserved && !isAgendaSlotEligible(slot)) ||
            new Date(
              group.entries[index]!.appointment.scheduledAt!,
            ).getTime() !== slot.startsAt.getTime(),
        )
      )
        throw new PosAgendaError(
          "El slot no es elegible o está fuera de alcance",
          409,
          "SLOT_NOT_ELIGIBLE",
        );
      if (!first.resource.branch.posProfile?.code)
        throw new PosAgendaError(
          "La sucursal no está mapeada con Agenda",
          409,
          "BRANCH_NOT_MAPPED",
        );
      if (group.mode === "SIMULTANEOUS_DOUBLE") {
        if (
          first.resource.type !== "DOUBLE" ||
          concrete.some((slot) => slot.id !== first.id) ||
          (!remoteAlreadyReserved && !isAgendaSlotEligible(first, 2))
        )
          throw new PosAgendaError(
            "La cortesía simultánea requiere dos lugares de cabina DOUBLE",
            409,
            "DOUBLE_CAPACITY_CONFLICT",
          );
      }
      if (
        group.mode === "CONSECUTIVE" &&
        concrete[0]!.endsAt.getTime() !== concrete[1]!.startsAt.getTime()
      )
        throw new PosAgendaError(
          "La cortesía requiere dos slots consecutivos de la misma cabina",
          409,
          "NON_CONSECUTIVE_SLOTS",
        );

      const reservationKey = `${input.operationKey}:agenda:${groupIndex + 1}`;
      let reservation = await prisma.agendaReservation.upsert({
        where: {
          operationKey_groupOrdinal: {
            operationKey: input.operationKey,
            groupOrdinal: groupIndex + 1,
          },
        },
        create: {
          operationKey: input.operationKey,
          groupOrdinal: groupIndex + 1,
          idempotencyKey: reservationKey,
          mode: group.mode,
          seats: group.mode === "SIMULTANEOUS_DOUBLE" ? 2 : 1,
          branchId: first.resource.branchId,
          customerId: existingCustomer?.id ?? null,
          resourceId: first.resourceId,
          primarySlotId: first.id,
          slotIdsSnapshot: slotIds,
          externalClientId,
          expectedVersion: Math.max(
            ...concrete.map((slot) => slot.sourceVersion),
          ),
        },
        update: {},
      });
      if (
        reservation.mode !== group.mode ||
        reservation.seats !== (group.mode === "SIMULTANEOUS_DOUBLE" ? 2 : 1) ||
        reservation.branchId !== first.resource.branchId ||
        reservation.resourceId !== first.resourceId ||
        reservation.primarySlotId !== first.id ||
        reservation.externalClientId !== externalClientId ||
        JSON.stringify(stringArray(reservation.slotIdsSnapshot)) !==
          JSON.stringify(slotIds) ||
        (!remoteAlreadyReserved &&
          reservation.expectedVersion !==
            Math.max(...concrete.map((slot) => slot.sourceVersion)))
      )
        throw new PosAgendaError(
          "La llave de idempotencia ya se usó con otra reservación",
          409,
          "AGENDA_IDEMPOTENCY_CONFLICT",
        );
      let externalReservationIds = stringArray(
        reservation.externalReservationIdsSnapshot,
      );
      let externalAppointmentIds = stringArray(
        reservation.externalAppointmentIdsSnapshot,
      );
      let externalVersions = positiveIntegerArray(
        reservation.externalVersionsSnapshot,
      );
      let remoteVersion =
        reservation.remoteVersion ?? reservation.expectedVersion;
      if (
        reservation.status !== "REMOTE_RESERVED" &&
        reservation.status !== "CONFIRMED"
      ) {
        externalReservationIds = [];
        externalAppointmentIds = [];
        externalVersions = [];
        const legs =
          group.mode === "CONSECUTIVE"
            ? group.entries.map((entry, index) => ({
                entries: [entry],
                slots: [concrete[index]!],
              }))
            : [
                {
                  entries: group.entries,
                  slots:
                    group.mode === "SIMULTANEOUS_DOUBLE" ? [first] : concrete,
                },
              ];
        for (const [legIndex, leg] of legs.entries()) {
          try {
            const result = await adapter.reserveLeg({
              idempotencyKey: `${reservationKey}:leg:${legIndex + 1}`,
              externalClientId,
              branchCode: first.resource.branch.posProfile.code,
              slots: leg.slots.map((slot) => ({
                externalSlotId: slot.externalSlotId,
                expectedVersion: slot.sourceVersion,
                seats: group.mode === "SIMULTANEOUS_DOUBLE" ? 2 : 1,
              })),
              services: leg.entries.map(({ appointment }) => ({
                name: appointment.serviceName,
                localServiceId: appointment.serviceItemId ?? null,
              })),
              source: group.entries.some(
                ({ appointment }) => appointment.kind === "COURTESY",
              )
                ? "COURTESY"
                : group.entries.some(
                      ({ appointment }) => appointment.membershipId,
                    )
                  ? "MEMBERSHIP"
                  : "NEXT_SESSION",
            });
            externalReservationIds.push(result.externalReservationId);
            externalAppointmentIds.push(...result.externalAppointmentIds);
            externalVersions.push(
              ...result.externalAppointmentIds.map(() => result.version),
            );
            remoteVersion = Math.max(remoteVersion, result.version);
            reservation = await prisma.agendaReservation.update({
              where: { id: reservation.id },
              data: {
                externalReservationId: externalReservationIds[0]!,
                externalReservationIdsSnapshot: externalReservationIds,
                externalAppointmentIdsSnapshot: externalAppointmentIds,
                externalVersionsSnapshot: externalVersions,
                remoteVersion,
              },
            });
          } catch (error) {
            await compensateReservations(
              [reservation],
              adapter,
              "Reservación doble incompleta",
            );
            throw error;
          }
        }
        reservation = await prisma.agendaReservation.update({
          where: { id: reservation.id },
          data: {
            status: "REMOTE_RESERVED",
            externalReservationId: externalReservationIds[0]!,
            externalReservationIdsSnapshot: externalReservationIds,
            externalAppointmentIdsSnapshot: externalAppointmentIds,
            externalVersionsSnapshot: externalVersions,
            remoteVersion,
            failureCode: null,
            failureMessage: null,
          },
        });
        await prisma.agendaSyncEvent.create({
          data: {
            type: "RESERVATION_CREATE",
            direction: "OUTBOUND",
            status: "SUCCEEDED",
            reservationId: reservation.id,
            payloadHash: agendaPayloadHash({ reservationKey, slotIds }),
            normalizedPayload: { slotIds, mode: group.mode },
            resolvedAt: new Date(),
          },
        });
      }
      reservedRecords.push(reservation);
      const expectedReservationCount =
        group.mode === "CONSECUTIVE" ? group.entries.length : 1;
      if (
        externalReservationIds.length !== expectedReservationCount ||
        externalAppointmentIds.length !== group.entries.length
      )
        throw new PosAgendaError(
          "Agenda devolvió una reservación parcial",
          502,
          "AGENDA_PARTIAL_RESERVATION",
        );
      group.entries.forEach((entry, index) => {
        const slot = concrete[index] ?? first;
        prepared.push({
          index: entry.index,
          reservationId: reservation.id,
          externalReservationId:
            group.mode === "CONSECUTIVE"
              ? externalReservationIds[index]!
              : reservation.externalReservationId!,
          externalAppointmentId: externalAppointmentIds[index]!,
          slotId: slot.id,
          resourceId: slot.resourceId,
          version: externalVersions[index] ?? remoteVersion,
          capacity: slot.capacity,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
        });
      });
    }
    return {
      externalClientId,
      clientSyncEventId: clientEvent.id,
      appointments: prepared,
    };
  } catch (error) {
    const failure = safeError(error);
    await compensateReservations(
      reservedRecords,
      adapter,
      "El ticket local no pudo prepararse",
    );
    await prisma.agendaReservation.updateMany({
      where: { operationKey: input.operationKey, status: "INTENT" },
      data: {
        status: "FAILED",
        failureCode: failure.code,
        failureMessage: failure.message,
      },
    });
    throw error instanceof PosAgendaError
      ? error
      : new PosAgendaError(
          failure.message,
          error instanceof AgendaAdapterError ? error.status : 502,
          failure.code,
        );
  }
}

export async function compensatePreparedAgendaTicket(
  operationKey: string,
  reason: string,
  adapter: AgendaAdapter = agendaAdapterFromEnvironment(),
) {
  const reservations = await prisma.agendaReservation.findMany({
    where: { operationKey, status: "REMOTE_RESERVED" },
  });
  await prisma.agendaReservation.updateMany({
    where: { id: { in: reservations.map((reservation) => reservation.id) } },
    data: {
      status: "CANCEL_PENDING",
      failureCode: "LOCAL_COMMIT_FAILED",
      failureMessage: reason.slice(0, 500),
    },
  });
  await compensateReservations(reservations, adapter, reason);
}

export async function reserveMembershipNextSession(input: {
  operationKey: string;
  membershipId: string;
  agendaSlotId: string;
  sellerId?: string;
  credentialId: string;
  authorizedBranchIds: string[];
  adapter?: AgendaAdapter;
}) {
  const [membership, slot, priorReservation] = await Promise.all([
    prisma.posClientMembership.findUnique({
      where: { id: input.membershipId },
      include: { customer: true },
    }),
    prisma.agendaSlot.findUnique({
      where: { id: input.agendaSlotId },
      include: {
        resource: {
          include: { branch: { include: { posProfile: true } } },
        },
      },
    }),
    prisma.agendaReservation.findUnique({
      where: {
        operationKey_groupOrdinal: {
          operationKey: input.operationKey,
          groupOrdinal: 1,
        },
      },
      include: {
        appointments: {
          include: {
            branch: { select: { nombre: true } },
            agendaResource: { select: { nameSnapshot: true } },
          },
        },
      },
    }),
  ]);
  const replayedAppointment = priorReservation?.appointments[0];
  if (priorReservation?.status === "CONFIRMED" && replayedAppointment) {
    if (
      replayedAppointment.membershipId !== input.membershipId ||
      priorReservation.primarySlotId !== input.agendaSlotId ||
      replayedAppointment.sellerId !==
        (input.sellerId ?? membership?.currentSellerId ?? null) ||
      !input.authorizedBranchIds.includes(replayedAppointment.branchId)
    )
      throw new PosAgendaError(
        "La llave de idempotencia ya se usó con otra próxima sesión",
        409,
        "AGENDA_IDEMPOTENCY_CONFLICT",
      );
    return replayedAppointment;
  }
  if (
    priorReservation &&
    !["INTENT", "FAILED", "REMOTE_RESERVED"].includes(priorReservation.status)
  )
    throw new PosAgendaError(
      "La operación de Agenda ya alcanzó un estado terminal",
      409,
      "AGENDA_IDEMPOTENCY_CONFLICT",
    );
  const remoteAlreadyReserved = priorReservation?.status === "REMOTE_RESERVED";
  if (
    !membership ||
    membership.status !== "ACTIVE" ||
    membership.usedSessions >= membership.totalSessions
  )
    throw new PosAgendaError(
      "La membresía no tiene una sesión disponible",
      409,
      "MEMBERSHIP_NOT_ELIGIBLE",
    );
  if (
    !slot ||
    !input.authorizedBranchIds.includes(slot.resource.branchId) ||
    (!remoteAlreadyReserved && !isAgendaSlotEligible(slot))
  )
    throw new PosAgendaError(
      "El slot no está disponible o autorizado",
      409,
      "SLOT_NOT_ELIGIBLE",
    );
  const branchCode = slot.resource.branch.posProfile?.code;
  if (!branchCode)
    throw new PosAgendaError(
      "La sucursal no está mapeada con Agenda",
      409,
      "BRANCH_NOT_MAPPED",
    );
  const adapter = input.adapter ?? agendaAdapterFromEnvironment();
  const client = {
    localClientKey: membership.customer.id,
    externalClientId: membership.customer.externalClientId,
    displayName: membership.customer.displayName,
    phone: membership.customer.phone,
    email: membership.customer.email,
  };
  const clientEvent = await prisma.agendaSyncEvent.create({
    data: {
      type: "CLIENT_UPSERT",
      direction: "OUTBOUND",
      status: "PROCESSING",
      customerId: membership.customer.id,
      payloadHash: agendaPayloadHash(client),
      normalizedPayload: { localClientKey: membership.customer.id },
    },
  });
  let externalClientId: string;
  try {
    externalClientId = (
      await adapter.upsertClient(client, `${input.operationKey}:customer`)
    ).externalClientId;
    assertStableExternalClientId(
      membership.customer.externalClientId,
      externalClientId,
    );
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: membership.customer.id },
        data: { externalClientId, version: { increment: 1 } },
      }),
      prisma.agendaSyncEvent.update({
        where: { id: clientEvent.id },
        data: { status: "SUCCEEDED", resolvedAt: new Date() },
      }),
    ]);
  } catch (error) {
    const identityConflict =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    const failure = identityConflict
      ? {
          code: "EXTERNAL_CLIENT_ID_CONFLICT",
          message: "La identidad de Agenda ya pertenece a otro cliente",
        }
      : safeError(error);
    await prisma.agendaSyncEvent.update({
      where: { id: clientEvent.id },
      data: {
        status: "FAILED",
        retryCount: { increment: 1 },
        nextAttemptAt: new Date(Date.now() + 60_000),
        lastErrorCode: failure.code,
        lastErrorMessage: failure.message,
      },
    });
    throw identityConflict
      ? new PosAgendaError(failure.message, 409, failure.code)
      : error;
  }
  const reservationKey = `${input.operationKey}:agenda:1`;
  let reservation = await prisma.agendaReservation.upsert({
    where: {
      operationKey_groupOrdinal: {
        operationKey: input.operationKey,
        groupOrdinal: 1,
      },
    },
    create: {
      operationKey: input.operationKey,
      groupOrdinal: 1,
      idempotencyKey: reservationKey,
      mode: "SINGLE",
      seats: 1,
      branchId: slot.resource.branchId,
      customerId: membership.customerId,
      ticketId: membership.ticketId,
      resourceId: slot.resourceId,
      primarySlotId: slot.id,
      slotIdsSnapshot: [slot.id],
      externalClientId,
      expectedVersion: slot.sourceVersion,
    },
    update: {},
  });
  if (
    reservation.mode !== "SINGLE" ||
    reservation.branchId !== slot.resource.branchId ||
    reservation.customerId !== membership.customerId ||
    reservation.ticketId !== membership.ticketId ||
    reservation.resourceId !== slot.resourceId ||
    reservation.primarySlotId !== slot.id ||
    reservation.externalClientId !== externalClientId ||
    JSON.stringify(stringArray(reservation.slotIdsSnapshot)) !==
      JSON.stringify([slot.id]) ||
    (!remoteAlreadyReserved &&
      reservation.expectedVersion !== slot.sourceVersion)
  )
    throw new PosAgendaError(
      "La llave de idempotencia ya se usó con otra próxima sesión",
      409,
      "AGENDA_IDEMPOTENCY_CONFLICT",
    );
  let externalReservationIds = stringArray(
    reservation.externalReservationIdsSnapshot,
  );
  let externalAppointmentIds = stringArray(
    reservation.externalAppointmentIdsSnapshot,
  );
  let externalVersions = positiveIntegerArray(
    reservation.externalVersionsSnapshot,
  );
  let remoteVersion = reservation.remoteVersion ?? reservation.expectedVersion;
  try {
    if (
      reservation.status !== "REMOTE_RESERVED" &&
      reservation.status !== "CONFIRMED"
    ) {
      const remote = await adapter.reserveLeg({
        idempotencyKey: `${reservationKey}:leg:1`,
        externalClientId,
        branchCode,
        slots: [
          {
            externalSlotId: slot.externalSlotId,
            expectedVersion: slot.sourceVersion,
            seats: 1,
          },
        ],
        services: [
          {
            name: membership.membershipNameSnapshot,
            localServiceId: membership.membershipItemId,
          },
        ],
        source: "MEMBERSHIP",
      });
      externalReservationIds = [remote.externalReservationId];
      externalAppointmentIds = remote.externalAppointmentIds;
      externalVersions = remote.externalAppointmentIds.map(
        () => remote.version,
      );
      remoteVersion = remote.version;
      reservation = await prisma.$transaction(async (tx) => {
        const updated = await tx.agendaReservation.update({
          where: { id: reservation.id },
          data: {
            status: "REMOTE_RESERVED",
            externalReservationId: remote.externalReservationId,
            externalReservationIdsSnapshot: externalReservationIds,
            externalAppointmentIdsSnapshot: externalAppointmentIds,
            externalVersionsSnapshot: externalVersions,
            remoteVersion,
          },
        });
        await tx.agendaSyncEvent.create({
          data: {
            type: "RESERVATION_CREATE",
            direction: "OUTBOUND",
            status: "SUCCEEDED",
            reservationId: reservation.id,
            payloadHash: agendaPayloadHash({ reservationKey, slotId: slot.id }),
            normalizedPayload: { slotIds: [slot.id], mode: "SINGLE" },
            resolvedAt: new Date(),
          },
        });
        return updated;
      });
    }
    const appointment = await prisma.$transaction(async (tx) => {
      const existing = await tx.posAppointment.findUnique({
        where: { externalAppointmentId: externalAppointmentIds[0]! },
        include: {
          branch: { select: { nombre: true } },
          agendaResource: { select: { nameSnapshot: true } },
        },
      });
      if (existing) return existing;
      const created = await tx.posAppointment.create({
        data: {
          ticketId: membership.ticketId,
          customerId: membership.customerId,
          kind: "NEXT_SESSION",
          status: "SCHEDULED",
          serviceItemId: membership.membershipItemId,
          serviceNameSnapshot: membership.membershipNameSnapshot,
          branchId: slot.resource.branchId,
          sellerId: input.sellerId ?? membership.currentSellerId,
          scheduledAt: slot.startsAt,
          externalReservationId: reservation.externalReservationId,
          externalAppointmentId: externalAppointmentIds[0]!,
          agendaResourceId: slot.resourceId,
          agendaSlotId: slot.id,
          agendaReservationId: reservation.id,
          agendaVersion: externalVersions[0] ?? remoteVersion,
          capacitySnapshot: slot.capacity,
          startsAtSnapshot: slot.startsAt,
          endsAtSnapshot: slot.endsAt,
          membershipId: membership.id,
          createdByCredentialId: input.credentialId,
        },
        include: {
          branch: { select: { nombre: true } },
          agendaResource: { select: { nameSnapshot: true } },
        },
      });
      await tx.agendaReservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMED" },
      });
      return created;
    });
    return appointment;
  } catch (error) {
    await compensateReservations(
      [reservation],
      adapter,
      "No se creó la cita local",
    );
    throw error;
  }
}

export async function enqueueAgendaCustomerUpdate(
  tx: Transaction,
  customerId: string,
) {
  return tx.agendaSyncEvent.create({
    data: {
      type: "CLIENT_UPDATE",
      direction: "OUTBOUND",
      customerId,
      payloadHash: agendaPayloadHash({ customerId }),
      normalizedPayload: { customerId },
    },
  });
}

export async function enqueueAgendaTicketCancellation(
  tx: Transaction,
  ticketId: string,
) {
  const reservations = await tx.agendaReservation.findMany({
    where: { ticketId, status: { in: ["REMOTE_RESERVED", "CONFIRMED"] } },
  });
  for (const reservation of reservations) {
    await tx.agendaReservation.update({
      where: { id: reservation.id },
      data: { status: "CANCEL_PENDING" },
    });
    await tx.agendaSyncEvent.create({
      data: {
        type: "RESERVATION_CANCEL",
        direction: "OUTBOUND",
        reservationId: reservation.id,
        payloadHash: agendaPayloadHash({
          reservationId: reservation.id,
          ticketId,
        }),
        normalizedPayload: { ticketId },
      },
    });
  }
}

async function processAgendaSyncEvent(eventId: string, adapter: AgendaAdapter) {
  const event = await prisma.agendaSyncEvent.findUnique({
    where: { id: eventId },
    include: { customer: true, reservation: true },
  });
  if (!event || !["PENDING", "FAILED"].includes(event.status)) return null;
  const claim = await prisma.agendaSyncEvent.updateMany({
    where: { id: event.id, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PROCESSING" },
  });
  if (claim.count !== 1) return null;
  try {
    if (event.type === "CLIENT_UPDATE" && event.customer?.externalClientId) {
      await adapter.updateClient(
        {
          localClientKey: event.customer.id,
          externalClientId: event.customer.externalClientId,
          displayName: event.customer.displayName,
          phone: event.customer.phone,
          email: event.customer.email,
        },
        `agenda-event:${event.id}`,
      );
    } else if (event.type === "RESERVATION_CANCEL" && event.reservation) {
      const ids = stringArray(event.reservation.externalReservationIdsSnapshot);
      for (const [index, externalId] of ids.entries())
        await adapter.cancelReservation(
          externalId,
          "Ticket cancelado",
          `${event.reservation.idempotencyKey}:cancel:${index + 1}`,
        );
      await prisma.agendaReservation.update({
        where: { id: event.reservation.id },
        data: { status: "CANCELED" },
      });
      await prisma.posAppointment.updateMany({
        where: { agendaReservationId: event.reservation.id },
        data: { status: "CANCELED" },
      });
    } else {
      throw new PosAgendaError(
        "El evento no tiene dependencias suficientes",
        409,
        "EVENT_DEPENDENCY_MISSING",
      );
    }
    await prisma.agendaSyncEvent.update({
      where: { id: event.id },
      data: {
        status: "SUCCEEDED",
        resolvedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    return true;
  } catch (error) {
    const failure = safeError(error);
    await prisma.agendaSyncEvent.update({
      where: { id: event.id },
      data: {
        status:
          error instanceof AgendaAdapterError && !error.retryable
            ? "CONFLICT"
            : "FAILED",
        retryCount: { increment: 1 },
        nextAttemptAt: new Date(Date.now() + 60_000),
        lastErrorCode: failure.code,
        lastErrorMessage: failure.message,
      },
    });
    return false;
  }
}

export async function processAgendaSyncEvents(input: {
  eventId?: string;
  limit?: number;
  adapter?: AgendaAdapter;
}) {
  const now = new Date();
  const abandonedBefore = new Date(now.getTime() - 5 * 60_000);
  if (!input.eventId) {
    const abandonedReservations = await prisma.agendaReservation.findMany({
      where: {
        status: "REMOTE_RESERVED",
        actualizadoEn: { lt: abandonedBefore },
        appointments: { none: {} },
      },
      select: { id: true },
      take: input.limit ?? 50,
    });
    for (const reservation of abandonedReservations) {
      const claim = await prisma.agendaReservation.updateMany({
        where: { id: reservation.id, status: "REMOTE_RESERVED" },
        data: {
          status: "CANCEL_PENDING",
          failureCode: "LOCAL_CONFIRMATION_ABANDONED",
          failureMessage: "La confirmación local no concluyó",
        },
      });
      if (claim.count === 1)
        await prisma.agendaSyncEvent.create({
          data: {
            type: "RESERVATION_CANCEL",
            direction: "OUTBOUND",
            reservationId: reservation.id,
            payloadHash: agendaPayloadHash({ reservationId: reservation.id }),
            normalizedPayload: { reservationId: reservation.id },
          },
        });
    }
    const orphanedCancellations = await prisma.agendaReservation.findMany({
      where: {
        status: "CANCEL_PENDING",
        syncEvents: {
          none: {
            type: "RESERVATION_CANCEL",
            status: {
              in: ["PENDING", "PROCESSING", "FAILED", "CONFLICT"],
            },
          },
        },
      },
      select: { id: true },
      take: input.limit ?? 50,
    });
    for (const reservation of orphanedCancellations)
      await prisma.agendaSyncEvent.create({
        data: {
          type: "RESERVATION_CANCEL",
          direction: "OUTBOUND",
          reservationId: reservation.id,
          payloadHash: agendaPayloadHash({ reservationId: reservation.id }),
          normalizedPayload: { reservationId: reservation.id },
        },
      });
  }
  await prisma.agendaSyncEvent.updateMany({
    where: {
      ...(input.eventId ? { id: input.eventId } : {}),
      direction: "OUTBOUND",
      status: "PROCESSING",
      actualizadoEn: { lt: abandonedBefore },
    },
    data: {
      status: "FAILED",
      nextAttemptAt: null,
      lastErrorCode: "WORKER_LEASE_EXPIRED",
      lastErrorMessage: "El worker anterior no concluyó la operación",
    },
  });
  const events = await prisma.agendaSyncEvent.findMany({
    where: {
      ...(input.eventId ? { id: input.eventId } : {}),
      direction: "OUTBOUND",
      type: { in: ["CLIENT_UPDATE", "RESERVATION_CANCEL"] },
      status: { in: ["PENDING", "FAILED"] },
      ...(!input.eventId
        ? { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] }
        : {}),
    },
    orderBy: { creadoEn: "asc" },
    take: input.limit ?? 50,
  });
  if (events.length === 0) return { processed: 0, succeeded: 0, failed: 0 };
  const adapter = input.adapter ?? agendaAdapterFromEnvironment();
  let processed = 0;
  let succeeded = 0;
  for (const event of events) {
    const outcome = await processAgendaSyncEvent(event.id, adapter);
    if (outcome === null) continue;
    processed += 1;
    if (outcome) succeeded += 1;
  }
  return {
    processed,
    succeeded,
    failed: processed - succeeded,
  };
}

export const agendaConflictDto = (event: {
  id: string;
  type: PosAgendaConflictDto["type"];
  status: "PENDING" | "FAILED" | "CONFLICT";
  reservationId: string | null;
  appointmentId: string | null;
  customerId: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  retryCount: number;
  creadoEn: Date;
}): PosAgendaConflictDto => ({
  id: event.id,
  type: event.type,
  status: event.status,
  reservationId: event.reservationId,
  appointmentId: event.appointmentId,
  customerId: event.customerId,
  errorCode: event.lastErrorCode,
  errorMessage: event.lastErrorMessage,
  retryCount: event.retryCount,
  createdAt: event.creadoEn.toISOString(),
});

export function decideAgendaWebhookTransition(input: {
  currentStatus: "PENDING" | "SCHEDULED" | "CANCELED" | "COMPLETED" | "NO_SHOW";
  currentVersion: number | null;
  incomingType: "ATTENDED" | "CANCELED" | "NO_SHOW";
  incomingVersion: number;
}): "APPLY" | "IGNORE" | "REQUIRE_CORRECTION" {
  if ((input.currentVersion ?? 0) >= input.incomingVersion) return "IGNORE";
  if (
    (input.currentStatus === "COMPLETED" &&
      input.incomingType !== "ATTENDED") ||
    (["CANCELED", "NO_SHOW"].includes(input.currentStatus) &&
      input.incomingType === "ATTENDED")
  )
    return "REQUIRE_CORRECTION";
  return "APPLY";
}

export function agendaAttendanceCorrectionDelta(
  priorDeltas: number[],
  incomingType: "ATTENDED" | "CANCELED" | "NO_SHOW",
) {
  const currentConsumption =
    1 + priorDeltas.reduce((total, delta) => total + delta, 0);
  const desiredConsumption = incomingType === "ATTENDED" ? 1 : 0;
  const sessionDelta = desiredConsumption - currentConsumption;
  if (![-1, 0, 1].includes(sessionDelta))
    throw new PosAgendaError(
      "El historial de compensaciones de la membresía es inconsistente",
      409,
      "MEMBERSHIP_CORRECTION_CONFLICT",
    );
  return sessionDelta;
}

export async function processAgendaWebhook(input: {
  eventId: string;
  type: "ATTENDED" | "CANCELED" | "NO_SHOW";
  externalAppointmentId: string;
  version: number;
  occurredAt: string;
}) {
  const payloadHash = agendaPayloadHash(input);
  const duplicate = await prisma.agendaSyncEvent.findUnique({
    where: { providerEventId: input.eventId },
  });
  if (duplicate)
    return {
      accepted: true,
      duplicate: true,
      outcome:
        duplicate.status === "CONFLICT"
          ? ("CONFLICT" as const)
          : ("IGNORED" as const),
    };
  try {
    return await prisma.$transaction(
      async (tx) => {
        const appointment = await tx.posAppointment.findUnique({
          where: { externalAppointmentId: input.externalAppointmentId },
          include: { membershipAttendance: true },
        });
        const event = await tx.agendaSyncEvent.create({
          data: {
            providerEventId: input.eventId,
            type: input.type,
            direction: "INBOUND",
            status: "PROCESSING",
            appointmentId: appointment?.id ?? null,
            sourceVersion: input.version,
            payloadHash,
            normalizedPayload: {
              externalAppointmentId: input.externalAppointmentId,
              occurredAt: input.occurredAt,
            },
          },
        });
        if (!appointment) {
          await tx.agendaSyncEvent.update({
            where: { id: event.id },
            data: {
              status: "CONFLICT",
              lastErrorCode: "APPOINTMENT_NOT_FOUND",
              lastErrorMessage: "La cita externa no está vinculada al POS",
            },
          });
          return {
            accepted: true,
            duplicate: false,
            outcome: "CONFLICT" as const,
          };
        }
        const transition = decideAgendaWebhookTransition({
          currentStatus: appointment.status,
          currentVersion: appointment.agendaVersion,
          incomingType: input.type,
          incomingVersion: input.version,
        });
        if (transition === "IGNORE") {
          await tx.agendaSyncEvent.update({
            where: { id: event.id },
            data: { status: "IGNORED", resolvedAt: new Date() },
          });
          return {
            accepted: true,
            duplicate: false,
            outcome: "IGNORED" as const,
          };
        }
        if (transition === "REQUIRE_CORRECTION") {
          await tx.agendaSyncEvent.update({
            where: { id: event.id },
            data: {
              status: "CONFLICT",
              lastErrorCode: "ATTENDANCE_CORRECTION_REQUIRED",
              lastErrorMessage:
                "La corrección de asistencia requiere autorización master",
            },
          });
          return {
            accepted: true,
            duplicate: false,
            outcome: "CONFLICT" as const,
          };
        }
        try {
          if (input.type === "ATTENDED" && appointment.membershipId) {
            await consumeAgendaMembershipAttendance(tx, {
              appointmentId: appointment.id,
              membershipId: appointment.membershipId,
              branchId: appointment.branchId,
              agendaEventId: event.id,
              actorCredentialId: appointment.createdByCredentialId,
              version: input.version,
            });
          } else {
            await tx.posAppointment.update({
              where: { id: appointment.id },
              data: {
                status: input.type === "ATTENDED" ? "COMPLETED" : input.type,
                agendaVersion: input.version,
              },
            });
          }
        } catch (error) {
          const failure = safeError(error);
          await tx.agendaSyncEvent.update({
            where: { id: event.id },
            data: {
              status: "CONFLICT",
              lastErrorCode: failure.code,
              lastErrorMessage: failure.message,
            },
          });
          return {
            accepted: true,
            duplicate: false,
            outcome: "CONFLICT" as const,
          };
        }
        await tx.agendaSyncEvent.update({
          where: { id: event.id },
          data: { status: "SUCCEEDED", resolvedAt: new Date() },
        });
        return {
          accepted: true,
          duplicate: false,
          outcome: "APPLIED" as const,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrent = await prisma.agendaSyncEvent.findUnique({
        where: { providerEventId: input.eventId },
      });
      if (concurrent)
        return {
          accepted: true,
          duplicate: true,
          outcome:
            concurrent.status === "CONFLICT"
              ? ("CONFLICT" as const)
              : ("IGNORED" as const),
        };
    }
    throw error;
  }
}

async function consumeAgendaMembershipAttendance(
  tx: Transaction,
  input: {
    appointmentId: string;
    membershipId: string;
    branchId: string;
    agendaEventId: string;
    actorCredentialId: string;
    version: number;
  },
) {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "PosClientMembership" WHERE "id" = ${input.membershipId}::uuid FOR UPDATE`,
  );
  const [membership, existing] = await Promise.all([
    tx.posClientMembership.findUnique({ where: { id: input.membershipId } }),
    tx.posMembershipAttendance.findUnique({
      where: { appointmentId: input.appointmentId },
    }),
  ]);
  if (existing) return;
  if (
    !membership ||
    membership.status !== "ACTIVE" ||
    membership.usedSessions >= membership.totalSessions
  )
    throw new PosAgendaError(
      "La membresía no admite otro consumo",
      409,
      "MEMBERSHIP_NOT_ELIGIBLE",
    );
  const latest = await tx.posMembershipAttendance.aggregate({
    where: { membershipId: membership.id },
    _max: { sessionNumber: true },
  });
  const nextUsed = membership.usedSessions + 1;
  const exhausted = nextUsed === membership.totalSessions;
  await tx.posMembershipAttendance.create({
    data: {
      membershipId: membership.id,
      appointmentId: input.appointmentId,
      sessionNumber: (latest._max.sessionNumber ?? 0) + 1,
      branchId: input.branchId,
      recordedByCredentialId: null,
      agendaSyncEventId: input.agendaEventId,
      signatureStatus: "PENDING",
    },
  });
  if (exhausted)
    await tx.posMembershipStatusChange.create({
      data: {
        membershipId: membership.id,
        fromStatus: "ACTIVE",
        toStatus: "EXHAUSTED",
        reason: "Agenda confirmó la última asistencia",
        actorCredentialId: input.actorCredentialId,
        sourceType: "AgendaSyncEvent",
        sourceId: input.agendaEventId,
      },
    });
  await Promise.all([
    tx.posClientMembership.update({
      where: { id: membership.id },
      data: {
        usedSessions: nextUsed,
        status: exhausted ? "EXHAUSTED" : "ACTIVE",
        exhaustedAt: exhausted ? new Date() : null,
      },
    }),
    tx.posAppointment.update({
      where: { id: input.appointmentId },
      data: { status: "COMPLETED", agendaVersion: input.version },
    }),
  ]);
}

export async function resolveAgendaAttendanceCorrection(input: {
  eventId: string;
  authorizationToken: string;
  reason: string;
  credentialId: string;
  terminalId: string;
  sessionId: string;
  authorizedBranchIds: string[];
}) {
  return prisma.$transaction(
    async (tx) => {
      const event = await tx.agendaSyncEvent.findFirst({
        where: {
          id: input.eventId,
          status: "CONFLICT",
          lastErrorCode: "ATTENDANCE_CORRECTION_REQUIRED",
        },
        include: {
          appointment: {
            include: {
              membershipAttendance: { include: { corrections: true } },
            },
          },
        },
      });
      if (!event?.appointment)
        throw new PosAgendaError(
          "Conflicto de asistencia no encontrado",
          404,
          "CORRECTION_NOT_FOUND",
        );
      if (
        event.type !== "ATTENDED" &&
        event.type !== "CANCELED" &&
        event.type !== "NO_SHOW"
      )
        throw new PosAgendaError(
          "Conflicto de asistencia no encontrado",
          404,
          "CORRECTION_NOT_FOUND",
        );
      if (!input.authorizedBranchIds.includes(event.appointment.branchId))
        throw new PosAgendaError(
          "Conflicto de asistencia no encontrado",
          404,
          "CORRECTION_NOT_FOUND",
        );
      const authorization = await consumeOperationAuthorization(tx, {
        token: input.authorizationToken,
        purpose: "AGENDA_ATTENDANCE_CORRECTION",
        terminalId: input.terminalId,
        sessionId: input.sessionId,
        entityType: "AgendaSyncEvent",
        entityId: event.id,
      });
      const attendance = event.appointment.membershipAttendance;
      if (attendance) {
        const sessionDelta = agendaAttendanceCorrectionDelta(
          attendance.corrections.map((correction) => correction.sessionDelta),
          event.type,
        );
        if (sessionDelta !== 0) {
          await tx.$queryRaw(
            Prisma.sql`SELECT "id" FROM "PosClientMembership" WHERE "id" = ${attendance.membershipId}::uuid FOR UPDATE`,
          );
          const membership = await tx.posClientMembership.findUniqueOrThrow({
            where: { id: attendance.membershipId },
          });
          const nextUsedSessions = membership.usedSessions + sessionDelta;
          if (
            nextUsedSessions < 0 ||
            nextUsedSessions > membership.totalSessions ||
            (sessionDelta > 0 && membership.status !== "ACTIVE")
          )
            throw new PosAgendaError(
              "La membresía no admite esta compensación",
              409,
              "MEMBERSHIP_CORRECTION_CONFLICT",
            );
          await tx.posMembershipAttendanceCorrection.create({
            data: {
              attendanceId: attendance.id,
              agendaSyncEventId: event.id,
              sessionDelta,
              reason: input.reason,
              actorCredentialId: input.credentialId,
              authorizationId: authorization.id,
            },
          });
          const nextStatus =
            sessionDelta < 0 && membership.status === "EXHAUSTED"
              ? "ACTIVE"
              : sessionDelta > 0 &&
                  nextUsedSessions === membership.totalSessions
                ? "EXHAUSTED"
                : membership.status;
          if (nextStatus !== membership.status)
            await tx.posMembershipStatusChange.create({
              data: {
                membershipId: membership.id,
                fromStatus: membership.status,
                toStatus: nextStatus,
                reason: input.reason,
                actorCredentialId: input.credentialId,
                sourceType: "AgendaSyncEvent",
                sourceId: event.id,
              },
            });
          await tx.posClientMembership.update({
            where: { id: membership.id },
            data: {
              usedSessions: nextUsedSessions,
              status: nextStatus,
              exhaustedAt:
                nextStatus === "EXHAUSTED"
                  ? (membership.exhaustedAt ?? new Date())
                  : nextStatus === "ACTIVE"
                    ? null
                    : membership.exhaustedAt,
            },
          });
        }
      }
      if (
        !attendance &&
        event.type === "ATTENDED" &&
        event.appointment.membershipId
      ) {
        await consumeAgendaMembershipAttendance(tx, {
          appointmentId: event.appointment.id,
          membershipId: event.appointment.membershipId,
          branchId: event.appointment.branchId,
          agendaEventId: event.id,
          actorCredentialId: event.appointment.createdByCredentialId,
          version: event.sourceVersion!,
        });
      } else {
        await tx.posAppointment.update({
          where: { id: event.appointment.id },
          data: {
            status:
              event.type === "NO_SHOW"
                ? "NO_SHOW"
                : event.type === "CANCELED"
                  ? "CANCELED"
                  : "COMPLETED",
            agendaVersion: event.sourceVersion,
          },
        });
      }
      await tx.agendaSyncEvent.update({
        where: { id: event.id },
        data: {
          status: "SUCCEEDED",
          resolvedByCredentialId: input.credentialId,
          resolvedAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
      return {
        eventId: event.id,
        appointmentId: event.appointment.id,
        corrected: true,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
