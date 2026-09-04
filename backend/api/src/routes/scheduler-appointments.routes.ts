import { Prisma, type SchedulerAppointmentStatus } from "@prisma/client";
import {
  SCHEDULER_APPOINTMENT_STATUSES,
  type SchedulerAppointmentDto,
  type SchedulerAppointmentServiceWriteDto,
  type SchedulerAvailabilityDto,
  type SchedulerScheduleBlockDto,
} from "@cosmetics/types";
import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import {
  consumeSchedulerAuthorization,
  hasSchedulerBranchAccess,
  requireSchedulerCapability,
  schedulerRequestAuditContext,
} from "../services/scheduler-access";
import {
  assertSchedulerStatusTransition,
  parseSchedulerInstant,
  resolveSchedulerDailyWindows,
  schedulerIntervalsOverlap,
  schedulerLocalDateKey,
  schedulerLocalDateRangeUtc,
  schedulerLocalMinute,
  schedulerLocalMinuteToUtc,
  schedulerMembershipAllowsService,
  schedulerWindowContains,
  SchedulerAppointmentError,
  SCHEDULER_OCCUPYING_STATUSES,
  SCHEDULER_SLOT_MINUTES,
  stableSchedulerRequestHash,
  type AvailabilityExceptionLike,
  type AvailabilityRuleLike,
  type MinuteInterval,
} from "../services/scheduler-appointments";

const router: ExpressRouter = Router();
const identifier = z.string().trim().min(1).max(191);
const uuid = z.string().uuid();
const instant = z.string().datetime({ offset: true });
const idempotencyKey = z.string().trim().min(8).max(160);
const serviceWriteSchema = z
  .object({
    serviceProfileId: identifier,
    professionalProfileIds: z.array(identifier).min(1).max(10),
    resourceIds: z.array(identifier).max(20).optional(),
    startsAt: instant.optional(),
    capacityUnits: z.number().int().min(1).max(1000).optional(),
    membershipId: uuid.nullable().optional(),
  })
  .strict();
const overrideSchema = z
  .object({
    authorizationToken: z.string().min(32).max(128),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
const createSchema = z
  .object({
    branchId: identifier,
    customerId: identifier,
    startsAt: instant,
    status: z.enum(["PENDING", "RESERVED", "CONFIRMED"]).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    services: z.array(serviceWriteSchema).min(1).max(20),
    override: overrideSchema.optional(),
  })
  .strict();
const updateSchema = createSchema.extend({
  expectedVersion: z.number().int().positive(),
});
const moveSchema = z
  .object({
    startsAt: instant,
    expectedVersion: z.number().int().positive(),
    services: z.array(serviceWriteSchema).min(1).max(20).optional(),
    override: overrideSchema.optional(),
  })
  .strict();
const statusSchema = z
  .object({
    status: z.enum(SCHEDULER_APPOINTMENT_STATUSES),
    expectedVersion: z.number().int().positive(),
    reason: z.string().trim().max(500).nullable().optional(),
  })
  .strict();
const cancelSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
const blockBaseSchema = z.object({
    branchId: identifier,
    professionalProfileId: identifier.nullable().optional(),
    resourceId: identifier.nullable().optional(),
    startsAt: instant,
    endsAt: instant,
    reason: z.string().trim().min(3).max(500),
    expectedVersion: z.number().int().positive().optional(),
  }).strict();
const validateBlockOwners = (
  value: z.infer<typeof blockBaseSchema>,
  context: z.RefinementCtx,
) => {
    if (value.professionalProfileId && value.resourceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Un bloqueo sólo puede pertenecer a un profesional o recurso",
      });
    }
  };

const appointmentInclude = {
  branchProfile: { include: { branch: { select: { id: true, nombre: true } } } },
  customer: { select: { id: true, displayName: true } },
  services: {
    orderBy: { sequence: "asc" as const },
    include: {
      participants: { orderBy: { role: "asc" as const } },
      resources: { orderBy: { resourceNameSnapshot: "asc" as const } },
      membershipBenefit: true,
    },
  },
  stateHistory: { orderBy: { version: "asc" as const } },
} satisfies Prisma.SchedulerAppointmentInclude;

type AppointmentPayload = Prisma.SchedulerAppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;
type Tx = Prisma.TransactionClient;

function appointmentDto(row: AppointmentPayload): SchedulerAppointmentDto {
  return {
    id: row.id,
    branchId: row.branchProfile.branch.id,
    branchProfileId: row.branchProfileId,
    branchName: row.branchProfile.branch.nombre,
    customerId: row.customerId,
    customerName: row.customer.displayName,
    status: row.status,
    origin: row.origin,
    timezone: row.timezone,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    notes: row.notes,
    cancellationReason: row.cancellationReason,
    version: row.version,
    services: row.services.map((service) => ({
      id: service.id,
      sequence: service.sequence,
      serviceProfileId: service.serviceProfileId,
      serviceName: service.serviceNameSnapshot,
      serviceVersion: service.serviceVersionSnapshot,
      durationMinutes: service.durationMinutesSnapshot,
      preparationMinutes: service.preparationMinutesSnapshot,
      cleanupMinutes: service.cleanupMinutesSnapshot,
      capacityUnits: service.capacityUnits,
      startsAt: service.startsAt.toISOString(),
      endsAt: service.endsAt.toISOString(),
      occupiesFrom: service.occupiesFrom.toISOString(),
      occupiesUntil: service.occupiesUntil.toISOString(),
      professionals: service.participants.map((participant) => ({
        professionalProfileId: participant.professionalProfileId,
        name: participant.professionalNameSnapshot,
        role: participant.role,
      })),
      resources: service.resources.map((resource) => ({
        resourceId: resource.resourceId,
        name: resource.resourceNameSnapshot,
        units: resource.units,
        exclusive: resource.exclusiveSnapshot,
      })),
      membership: service.membershipBenefit
        ? {
            membershipId: service.membershipBenefit.membershipId,
            name: service.membershipBenefit.membershipNameSnapshot,
            status: service.membershipBenefit.status,
          }
        : null,
    })),
    stateHistory: row.stateHistory.map((history) => ({
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      reason: history.reason,
      version: history.version,
      actorUserId: history.actorUserId,
      createdAt: history.creadoEn.toISOString(),
    })),
    createdAt: row.creadoEn.toISOString(),
    updatedAt: row.actualizadoEn.toISOString(),
  };
}

function blockDto(row: {
  id: string;
  branchProfileId: string;
  branchProfile: { branchId: string };
  professionalProfileId: string | null;
  resourceId: string | null;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  reason: string;
  status: "ACTIVE" | "CANCELED";
  version: number;
  creadoEn: Date;
  canceledAt: Date | null;
}): SchedulerScheduleBlockDto {
  return {
    id: row.id,
    branchId: row.branchProfile.branchId,
    branchProfileId: row.branchProfileId,
    professionalProfileId: row.professionalProfileId,
    resourceId: row.resourceId,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    timezone: row.timezone,
    reason: row.reason,
    status: row.status,
    version: row.version,
    createdAt: row.creadoEn.toISOString(),
    canceledAt: row.canceledAt?.toISOString() ?? null,
  };
}

function activeAt(
  row: { active: boolean; effectiveFrom: Date; effectiveTo: Date | null },
  at: Date,
): boolean {
  return row.active && row.effectiveFrom <= at && (!row.effectiveTo || row.effectiveTo > at);
}

function uniqueIds(values: string[]): string[] {
  return [...new Set(values)];
}

interface MaterializedService {
  serviceProfileId: string;
  serviceName: string;
  serviceVersion: number;
  mode: "INDIVIDUAL" | "CLASS";
  serviceCapacity: number;
  catalogItemId: string;
  startsAt: Date;
  endsAt: Date;
  occupiesFrom: Date;
  occupiesUntil: Date;
  durationMinutes: number;
  preparationMinutes: number;
  cleanupMinutes: number;
  capacityUnits: number;
  professionals: Array<{ id: string; name: string; employeeId: string }>;
  resources: Array<{
    id: string;
    name: string;
    units: number;
    capacity: number;
    exclusive: boolean;
  }>;
  membershipId: string | null;
  membershipName: string | null;
}

async function resolveBranchProfile(tx: Tx, branchId: string, at: Date) {
  const profile = await tx.schedulerBranchProfile.findFirst({
    where: { branchId },
    include: { branch: true, commerce: true },
  });
  if (
    !profile ||
    !profile.branch.activa ||
    !profile.bookingEnabled ||
    !activeAt(profile, at) ||
    !activeAt(profile.commerce, at)
  ) {
    throw new SchedulerAppointmentError(
      "La sucursal no está habilitada para recibir citas",
      409,
      "BRANCH_CLOSED",
    );
  }
  return profile;
}

async function resolveBranchProfileForDate(
  tx: Tx,
  branchId: string,
  localDate: string,
) {
  const profile = await tx.schedulerBranchProfile.findFirst({
    where: { branchId },
    include: { branch: true, commerce: true },
  });
  if (
    !profile ||
    !profile.branch.activa ||
    !profile.bookingEnabled ||
    !profile.active ||
    !profile.commerce.active
  ) {
    throw new SchedulerAppointmentError(
      "La sucursal no está habilitada para recibir citas",
      409,
      "BRANCH_CLOSED",
    );
  }
  const range = schedulerLocalDateRangeUtc(localDate, profile.timezone);
  if (
    profile.effectiveFrom >= range.end ||
    (profile.effectiveTo && profile.effectiveTo <= range.start) ||
    profile.commerce.effectiveFrom >= range.end ||
    (profile.commerce.effectiveTo &&
      profile.commerce.effectiveTo <= range.start)
  ) {
    throw new SchedulerAppointmentError(
      "La sucursal no está vigente en la fecha solicitada",
      409,
      "BRANCH_CLOSED",
    );
  }
  return { profile, range };
}

async function materializeServices(input: {
  tx: Tx;
  branchProfileId: string;
  appointmentStartsAt: Date;
  services: SchedulerAppointmentServiceWriteDto[];
  selfProfessionalEmployeeId: string | null;
}): Promise<MaterializedService[]> {
  const serviceIds = uniqueIds(input.services.map((service) => service.serviceProfileId));
  if (serviceIds.length !== input.services.length) {
    throw new SchedulerAppointmentError("Cada servicio sólo puede aparecer una vez por cita");
  }
  const profiles = await input.tx.schedulerServiceProfile.findMany({
    where: { id: { in: serviceIds } },
    include: {
      catalogItem: { select: { id: true, name: true, active: true, kind: true } },
      branchAssignments: true,
      professionalAssignments: {
        include: {
          professionalProfile: {
            include: { employee: { select: { id: true, nombreCompleto: true, activo: true } } },
          },
        },
      },
      resourceRequirements: { include: { resource: true } },
    },
  });
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  let cursor = input.appointmentStartsAt;
  const result: MaterializedService[] = [];
  for (const requested of input.services) {
    const profile = byId.get(requested.serviceProfileId);
    const startsAt = requested.startsAt
      ? parseSchedulerInstant(requested.startsAt, "startsAt del servicio")
      : cursor;
    if (
      !profile ||
      !profile.catalogItem.active ||
      profile.catalogItem.kind !== "SERVICE" ||
      !activeAt(profile, startsAt) ||
      !profile.branchAssignments.some(
        (assignment) =>
          assignment.branchProfileId === input.branchProfileId && activeAt(assignment, startsAt),
      )
    ) {
      throw new SchedulerAppointmentError(
        "El servicio no está activo en la sucursal solicitada",
        409,
        "SERVICE_NOT_AVAILABLE",
        { serviceProfileId: requested.serviceProfileId },
      );
    }
    const professionalIds = uniqueIds(requested.professionalProfileIds);
    if (professionalIds.length !== requested.professionalProfileIds.length) {
      throw new SchedulerAppointmentError("Un especialista no puede repetirse dentro del servicio");
    }
    const professionals = professionalIds.map((professionalId) => {
      const assignment = profile.professionalAssignments.find(
        (candidate) =>
          candidate.professionalProfileId === professionalId &&
          candidate.branchProfileId === input.branchProfileId &&
          activeAt(candidate, startsAt) &&
          activeAt(candidate.professionalProfile, startsAt) &&
          candidate.professionalProfile.employee.activo,
      );
      if (!assignment) {
        throw new SchedulerAppointmentError(
          "El especialista no puede realizar el servicio en esta sucursal",
          409,
          "PROFESSIONAL_UNAVAILABLE",
          { professionalProfileId: professionalId },
        );
      }
      if (
        input.selfProfessionalEmployeeId &&
        assignment.professionalProfile.employeeId !== input.selfProfessionalEmployeeId
      ) {
        throw new SchedulerAppointmentError("La sesión sólo puede operar la agenda profesional propia", 403);
      }
      return {
        id: assignment.professionalProfileId,
        name: assignment.professionalProfile.employee.nombreCompleto,
        employeeId: assignment.professionalProfile.employeeId,
      };
    });
    const activeRequirements = profile.resourceRequirements.filter(
      (requirement) => activeAt(requirement, startsAt),
    );
    const requiredResourceIds = activeRequirements.map((requirement) => requirement.resourceId).sort();
    if (requested.resourceIds) {
      const supplied = uniqueIds(requested.resourceIds).sort();
      if (
        supplied.length !== requiredResourceIds.length ||
        supplied.some((resourceId, index) => resourceId !== requiredResourceIds[index])
      ) {
        throw new SchedulerAppointmentError(
          "Los recursos se derivan de la configuración vigente del servicio",
          409,
          "RESOURCE_UNAVAILABLE",
          { requiredResourceIds },
        );
      }
    }
    const resources = activeRequirements.map((requirement) => {
      if (
        requirement.resource.branchProfileId !== input.branchProfileId ||
        !activeAt(requirement.resource, startsAt) ||
        requirement.requiredUnits > requirement.resource.capacity
      ) {
        throw new SchedulerAppointmentError(
          "Un recurso requerido no está disponible en la sucursal",
          409,
          "RESOURCE_UNAVAILABLE",
          { resourceId: requirement.resourceId },
        );
      }
      return {
        id: requirement.resourceId,
        name: requirement.resource.name,
        units: requirement.requiredUnits,
        capacity: requirement.resource.capacity,
        exclusive: requirement.exclusive || requirement.resource.exclusive,
      };
    });
    const capacityUnits = requested.capacityUnits ?? 1;
    if (profile.mode === "INDIVIDUAL" && capacityUnits !== 1) {
      throw new SchedulerAppointmentError("Un servicio individual ocupa exactamente un lugar");
    }
    if (capacityUnits > profile.capacity) {
      throw new SchedulerAppointmentError("La capacidad solicitada excede la del servicio", 409, "SERVICE_CAPACITY_EXHAUSTED");
    }
    const endsAt = new Date(startsAt.getTime() + profile.durationMinutes * 60_000);
    const occupiesFrom = new Date(startsAt.getTime() - profile.preparationMinutes * 60_000);
    const occupiesUntil = new Date(endsAt.getTime() + profile.cleanupMinutes * 60_000);
    result.push({
      serviceProfileId: profile.id,
      serviceName: profile.catalogItem.name,
      serviceVersion: profile.version,
      mode: profile.mode,
      serviceCapacity: profile.capacity,
      catalogItemId: profile.catalogItemId,
      startsAt,
      endsAt,
      occupiesFrom,
      occupiesUntil,
      durationMinutes: profile.durationMinutes,
      preparationMinutes: profile.preparationMinutes,
      cleanupMinutes: profile.cleanupMinutes,
      capacityUnits,
      professionals,
      resources,
      membershipId: requested.membershipId ?? null,
      membershipName: null,
    });
    cursor = endsAt;
  }
  const firstStart = Math.min(
    ...result.map((service) => service.startsAt.getTime()),
  );
  if (firstStart !== input.appointmentStartsAt.getTime()) {
    throw new SchedulerAppointmentError(
      "startsAt debe coincidir con el inicio del primer servicio de la cita",
    );
  }
  return result;
}

function exceptionDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function assertMemberships(
  tx: Tx,
  customerId: string,
  services: MaterializedService[],
  excludeAppointmentId?: string,
) {
  const grouped = new Map<string, MaterializedService[]>();
  for (const service of services.filter((candidate) => candidate.membershipId)) {
    const membershipId = service.membershipId!;
    grouped.set(membershipId, [...(grouped.get(membershipId) ?? []), service]);
  }
  for (const [membershipId, requestedServices] of grouped) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "PosClientMembership" WHERE "id" = ${membershipId}::uuid FOR UPDATE`,
    );
    const membership = await tx.posClientMembership.findUnique({
      where: { id: membershipId },
      include: { terms: true },
    });
    const reserved = await tx.schedulerAppointmentMembershipBenefit.count({
      where: {
        membershipId,
        status: { in: ["RESERVED", "CONSUMED"] },
        ...(excludeAppointmentId
          ? { appointmentService: { appointmentId: { not: excludeAppointmentId } } }
          : {}),
      },
    });
    if (
      !membership ||
      membership.customerId !== customerId ||
      membership.status !== "ACTIVE" ||
      membership.usedSessions + reserved + requestedServices.length >
        membership.totalSessions ||
      requestedServices.some(
        (service) =>
          !schedulerMembershipAllowsService(
            membership.terms.conditions,
            service.serviceProfileId,
            service.catalogItemId,
          ),
      )
    ) {
      throw new SchedulerAppointmentError(
        "La membresía no tiene una sesión elegible disponible",
        409,
        "MEMBERSHIP_NOT_ELIGIBLE",
        { membershipId },
      );
    }
    for (const service of requestedServices) {
      service.membershipName = membership.membershipNameSnapshot;
    }
  }
}

interface ScheduleConstraints {
  localDate: string;
  rules: Array<{
    professionalProfileId: string | null;
    resourceId: string | null;
    kind: "WORKING" | "BREAK";
    weekday: AvailabilityRuleLike["weekday"];
    startMinute: number;
    endMinute: number;
  }>;
  exceptions: Array<{
    professionalProfileId: string | null;
    resourceId: string | null;
    kind: "AVAILABLE" | "UNAVAILABLE";
    date: Date;
    startMinute: number | null;
    endMinute: number | null;
  }>;
  blocks: Array<{
    id: string;
    professionalProfileId: string | null;
    resourceId: string | null;
    startsAt: Date;
    endsAt: Date;
  }>;
  existing: Array<{
    serviceProfileId: string;
    startsAt: Date;
    endsAt: Date;
    occupiesFrom: Date;
    occupiesUntil: Date;
    capacityUnits: number;
    participants: Array<{ professionalProfileId: string }>;
    resources: Array<{
      resourceId: string;
      units: number;
      exclusiveSnapshot: boolean;
    }>;
  }>;
}

async function loadScheduleConstraints(input: {
  tx: Tx;
  branchProfileId: string;
  localDate: string;
  earliest: Date;
  latest: Date;
  professionalIds: string[];
  resourceIds: string[];
  excludeAppointmentId?: string;
}): Promise<ScheduleConstraints> {
  const [rules, exceptions, blocks, existing] = await Promise.all([
    input.tx.schedulerAvailabilityRule.findMany({
      where: {
        branchProfileId: input.branchProfileId,
        active: true,
        effectiveFrom: { lte: input.latest },
        AND: [
          {
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gt: input.earliest } },
            ],
          },
          {
            OR: [
              { professionalProfileId: null, resourceId: null },
              { professionalProfileId: { in: input.professionalIds } },
              { resourceId: { in: input.resourceIds } },
            ],
          },
        ],
      },
    }),
    input.tx.schedulerAvailabilityException.findMany({
      where: {
        branchProfileId: input.branchProfileId,
        active: true,
        date: new Date(`${input.localDate}T00:00:00.000Z`),
        effectiveFrom: { lte: input.latest },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gt: input.earliest } },
        ],
      },
    }),
    input.tx.schedulerScheduleBlock.findMany({
      where: {
        branchProfileId: input.branchProfileId,
        status: "ACTIVE",
        startsAt: { lt: input.latest },
        endsAt: { gt: input.earliest },
      },
      select: {
        id: true,
        professionalProfileId: true,
        resourceId: true,
        startsAt: true,
        endsAt: true,
      },
    }),
    input.tx.schedulerAppointmentService.findMany({
      where: {
        occupiesFrom: { lt: input.latest },
        occupiesUntil: { gt: input.earliest },
        appointment: {
          branchProfileId: input.branchProfileId,
          status: { in: SCHEDULER_OCCUPYING_STATUSES },
          ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
        },
      },
      include: { participants: true, resources: true },
    }),
  ]);
  return { localDate: input.localDate, rules, exceptions, blocks, existing };
}

function assertScheduleWithConstraints(input: {
  timezone: string;
  services: MaterializedService[];
  constraints: ScheduleConstraints;
  allowOverride: boolean;
}) {
  const { localDate, rules, exceptions, blocks, existing } = input.constraints;
  const occupiedServices = [...existing];
  const ownerRules = (
    professionalProfileId: string | null,
    resourceId: string | null,
  ): AvailabilityRuleLike[] =>
    rules
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
      }));
  const ownerExceptions = (
    professionalProfileId: string | null,
    resourceId: string | null,
  ): AvailabilityExceptionLike[] =>
    exceptions
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
      }));
  const branchWindows = resolveSchedulerDailyWindows({
    date: localDate,
    rules: ownerRules(null, null),
    exceptions: ownerExceptions(null, null),
  });

  for (const service of input.services) {
    const startMinute = schedulerLocalMinute(service.occupiesFrom, input.timezone);
    const endMinute =
      schedulerLocalDateKey(service.occupiesUntil, input.timezone) === localDate
        ? schedulerLocalMinute(service.occupiesUntil, input.timezone)
        : 1440;
    const fail = (message: string, code: string, details?: Record<string, unknown>) => {
      if (!input.allowOverride) throw new SchedulerAppointmentError(message, 409, code, details);
    };
    if (!schedulerWindowContains(branchWindows, startMinute, endMinute)) {
      fail("El horario solicitado queda fuera de la jornada de la sucursal", "BRANCH_CLOSED");
    }
    for (const professional of service.professionals) {
      const windows = resolveSchedulerDailyWindows({
        date: localDate,
        rules: ownerRules(professional.id, null),
        exceptions: ownerExceptions(professional.id, null),
        inherited: branchWindows,
      });
      if (!schedulerWindowContains(windows, startMinute, endMinute)) {
        fail("El especialista no está disponible en ese horario", "PROFESSIONAL_UNAVAILABLE", {
          professionalProfileId: professional.id,
        });
      }
    }
    for (const resource of service.resources) {
      const windows = resolveSchedulerDailyWindows({
        date: localDate,
        rules: ownerRules(null, resource.id),
        exceptions: ownerExceptions(null, resource.id),
        inherited: branchWindows,
      });
      if (!schedulerWindowContains(windows, startMinute, endMinute)) {
        fail("Un recurso requerido no está disponible en ese horario", "RESOURCE_UNAVAILABLE", {
          resourceId: resource.id,
        });
      }
    }
    const matchingBlocks = blocks.filter(
      (block) =>
        schedulerIntervalsOverlap(service.occupiesFrom, service.occupiesUntil, block.startsAt, block.endsAt) &&
        ((!block.professionalProfileId && !block.resourceId) ||
          (block.professionalProfileId && service.professionals.some((item) => item.id === block.professionalProfileId)) ||
          (block.resourceId && service.resources.some((item) => item.id === block.resourceId))),
    );
    if (matchingBlocks.length > 0) {
      fail("El horario solicitado contiene un bloqueo administrativo", "SCHEDULE_BLOCKED", {
        blockIds: matchingBlocks.map((block) => block.id),
      });
    }
    const overlaps = occupiedServices.filter((candidate) =>
      schedulerIntervalsOverlap(service.occupiesFrom, service.occupiesUntil, candidate.occupiesFrom, candidate.occupiesUntil),
    );
    for (const professional of service.professionals) {
      const professionalConflicts = overlaps.filter((candidate) =>
        candidate.participants.some((participant) => participant.professionalProfileId === professional.id),
      );
      const compatibleClass = professionalConflicts.every(
        (candidate) =>
          service.mode === "CLASS" &&
          candidate.serviceProfileId === service.serviceProfileId &&
          candidate.startsAt.getTime() === service.startsAt.getTime() &&
          candidate.endsAt.getTime() === service.endsAt.getTime(),
      );
      const usedCapacity = professionalConflicts.reduce((total, candidate) => total + candidate.capacityUnits, 0);
      if (
        professionalConflicts.length > 0 &&
        (!compatibleClass || usedCapacity + service.capacityUnits > service.serviceCapacity)
      ) {
        fail(
          compatibleClass ? "Se agotó la capacidad simultánea del servicio" : "El especialista ya tiene una cita en ese horario",
          compatibleClass ? "SERVICE_CAPACITY_EXHAUSTED" : "PROFESSIONAL_BUSY",
          { professionalProfileId: professional.id },
        );
      }
    }
    for (const resource of service.resources) {
      const allocations = overlaps.flatMap((candidate) =>
        candidate.resources.filter((allocation) => allocation.resourceId === resource.id),
      );
      const units = allocations.reduce((total, allocation) => total + allocation.units, 0);
      if (
        allocations.length > 0 &&
        (resource.exclusive || allocations.some((allocation) => allocation.exclusiveSnapshot) || units + resource.units > resource.capacity)
      ) {
        fail("Se agotó la capacidad del recurso requerido", "RESOURCE_BUSY", { resourceId: resource.id });
      }
    }
    occupiedServices.push({
      serviceProfileId: service.serviceProfileId,
      startsAt: service.startsAt,
      endsAt: service.endsAt,
      occupiesFrom: service.occupiesFrom,
      occupiesUntil: service.occupiesUntil,
      capacityUnits: service.capacityUnits,
      participants: service.professionals.map((professional) => ({
        professionalProfileId: professional.id,
      })),
      resources: service.resources.map((resource) => ({
        resourceId: resource.id,
        units: resource.units,
        exclusiveSnapshot: resource.exclusive,
      })),
    });
  }
}

async function assertScheduleAvailable(input: {
  tx: Tx;
  branchProfileId: string;
  timezone: string;
  services: MaterializedService[];
  excludeAppointmentId?: string;
  allowOverride: boolean;
}) {
  const earliest = new Date(
    Math.min(...input.services.map((service) => service.occupiesFrom.getTime())),
  );
  const latest = new Date(
    Math.max(...input.services.map((service) => service.occupiesUntil.getTime())),
  );
  const localDates = uniqueIds(
    input.services.flatMap((service) => [
      schedulerLocalDateKey(service.occupiesFrom, input.timezone),
      schedulerLocalDateKey(
        new Date(service.occupiesUntil.getTime() - 1),
        input.timezone,
      ),
    ]),
  );
  if (localDates.length !== 1) {
    throw new SchedulerAppointmentError(
      "Cada cita debe permanecer dentro de un mismo día local",
      409,
      "BRANCH_CLOSED",
    );
  }
  const constraints = await loadScheduleConstraints({
    tx: input.tx,
    branchProfileId: input.branchProfileId,
    localDate: localDates[0]!,
    earliest,
    latest,
    professionalIds: uniqueIds(
      input.services.flatMap((service) =>
        service.professionals.map((professional) => professional.id),
      ),
    ),
    resourceIds: uniqueIds(
      input.services.flatMap((service) =>
        service.resources.map((resource) => resource.id),
      ),
    ),
    excludeAppointmentId: input.excludeAppointmentId,
  });
  assertScheduleWithConstraints({
    timezone: input.timezone,
    services: input.services,
    constraints,
    allowOverride: input.allowOverride,
  });
}

async function lockSchedule(tx: Tx, branchProfileId: string, services: MaterializedService[]) {
  const keys = uniqueIds(
    services.flatMap((service) => {
      const dateBuckets = uniqueIds([
        service.occupiesFrom.toISOString().slice(0, 10),
        new Date(service.occupiesUntil.getTime() - 1)
          .toISOString()
          .slice(0, 10),
      ]);
      return dateBuckets.flatMap((dateBucket) => [
        `scheduler-branch:${branchProfileId}:${dateBucket}`,
        ...service.professionals.map(
          (professional) =>
            `scheduler-professional:${professional.id}:${dateBucket}`,
        ),
        ...service.resources.map(
          (resource) => `scheduler-resource:${resource.id}:${dateBucket}`,
        ),
      ]);
    }),
  ).sort();
  for (const key of keys) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
}

async function consumeOverride(
  req: Request,
  input: { branchId: string; token: string },
  tx?: Tx,
) {
  const authorization = await consumeSchedulerAuthorization({
    token: input.token,
    purpose: "AVAILABILITY_OVERRIDE",
    actorUserId: req.schedulerAccess!.userId,
    screenKey: "scheduler/agenda",
    branchId: input.branchId,
    tx,
  });
  if (!authorization) {
    throw new SchedulerAppointmentError("La autorización de excepción es inválida o venció", 403, "INVALID_OVERRIDE_AUTHORIZATION");
  }
  // La autorización se consume antes del commit de la cita por diseño; un intento fallido no puede reutilizarla.
}

async function replaceAppointmentServices(tx: Tx, appointmentId: string, services: MaterializedService[]) {
  const existingServices = await tx.schedulerAppointmentService.findMany({
    where: { appointmentId },
    select: { id: true },
  });
  const existingIds = existingServices.map((service) => service.id);
  if (existingIds.length > 0) {
    await tx.schedulerAppointmentMembershipBenefit.deleteMany({ where: { appointmentServiceId: { in: existingIds } } });
    await tx.schedulerAppointmentResource.deleteMany({ where: { appointmentServiceId: { in: existingIds } } });
    await tx.schedulerAppointmentParticipant.deleteMany({ where: { appointmentServiceId: { in: existingIds } } });
    await tx.schedulerAppointmentService.deleteMany({ where: { id: { in: existingIds } } });
  }
  for (const [sequence, service] of services.entries()) {
    await tx.schedulerAppointmentService.create({
      data: {
        appointmentId,
        serviceProfileId: service.serviceProfileId,
        sequence,
        serviceNameSnapshot: service.serviceName,
        serviceVersionSnapshot: service.serviceVersion,
        durationMinutesSnapshot: service.durationMinutes,
        preparationMinutesSnapshot: service.preparationMinutes,
        cleanupMinutesSnapshot: service.cleanupMinutes,
        capacityUnits: service.capacityUnits,
        startsAt: service.startsAt,
        endsAt: service.endsAt,
        occupiesFrom: service.occupiesFrom,
        occupiesUntil: service.occupiesUntil,
        participants: {
          create: service.professionals.map((professional, index) => ({
            professionalProfileId: professional.id,
            professionalNameSnapshot: professional.name,
            role: index === 0 ? "PRIMARY" : "SUPPORT",
          })),
        },
        resources: {
          create: service.resources.map((resource) => ({
            resourceId: resource.id,
            resourceNameSnapshot: resource.name,
            units: resource.units,
            exclusiveSnapshot: resource.exclusive,
          })),
        },
        ...(service.membershipId
          ? {
              membershipBenefit: {
                create: {
                  membershipId: service.membershipId,
                  membershipNameSnapshot: service.membershipName ?? "Membresía",
                },
              },
            }
          : {}),
      },
    });
  }
}

async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt < 2 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) continue;
      throw error;
    }
  }
  throw new SchedulerAppointmentError("No fue posible confirmar la operación concurrente", 409, "CONCURRENT_WRITE");
}

function sendError(res: Response, error: unknown) {
  if (error instanceof SchedulerAppointmentError) {
    res.status(error.status).json({
      success: false,
      message: error.message,
      data: { code: error.code, ...(error.details ?? {}) },
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({ success: false, message: "La operación ya fue registrada", data: { code: "CONFLICT" } });
    return;
  }
  console.error("[scheduler.appointments]", error);
  res.status(500).json({ success: false, message: "No fue posible completar la operación de agenda", data: null });
}

function requireBranch(req: Request, branchId: string) {
  if (!hasSchedulerBranchAccess(req.schedulerAccess!, branchId)) {
    throw new SchedulerAppointmentError("La sucursal no está dentro del alcance de la sesión", 403);
  }
}

async function validateBlockOwner(input: {
  tx: Tx;
  req: Request;
  branchProfileId: string;
  professionalProfileId?: string | null;
  resourceId?: string | null;
  at: Date;
}) {
  if (input.professionalProfileId) {
    const assignment = await input.tx.schedulerProfessionalBranchAssignment.findFirst({
      where: {
        branchProfileId: input.branchProfileId,
        professionalProfileId: input.professionalProfileId,
      },
      include: { professionalProfile: true },
    });
    if (
      !assignment ||
      !activeAt(assignment, input.at) ||
      !activeAt(assignment.professionalProfile, input.at)
    ) {
      throw new SchedulerAppointmentError(
        "El profesional no pertenece a la sucursal en esa fecha",
        409,
        "PROFESSIONAL_UNAVAILABLE",
      );
    }
    if (
      input.req.schedulerAccess!.selfProfessionalOnly &&
      assignment.professionalProfile.employeeId !==
        input.req.schedulerAccess!.professionalEmployeeId
    ) {
      throw new SchedulerAppointmentError(
        "La sesión sólo puede bloquear la agenda profesional propia",
        403,
      );
    }
  } else if (input.req.schedulerAccess!.selfProfessionalOnly) {
    throw new SchedulerAppointmentError(
      "La sesión profesional debe indicar su propio perfil",
      403,
    );
  }
  if (input.resourceId) {
    const resource = await input.tx.schedulerResource.findUnique({
      where: { id: input.resourceId },
    });
    if (
      !resource ||
      resource.branchProfileId !== input.branchProfileId ||
      !activeAt(resource, input.at)
    ) {
      throw new SchedulerAppointmentError(
        "El recurso no pertenece a la sucursal en esa fecha",
        409,
        "RESOURCE_UNAVAILABLE",
      );
    }
  }
}

router.get(
  "/availability",
  requireSchedulerCapability("scheduler/agenda", "READ"),
  async (req, res) => {
    const parsed = z
      .object({
        branchId: identifier,
        serviceProfileId: identifier,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        professionalProfileId: identifier.optional(),
        resourceId: identifier.optional(),
      })
      .safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Filtros de disponibilidad inválidos", data: parsed.error.flatten().fieldErrors });
      return;
    }
    try {
      requireBranch(req, parsed.data.branchId);
      const { profile, range } = await resolveBranchProfileForDate(
        prisma,
        parsed.data.branchId,
        parsed.data.date,
      );
      const serviceProfile = await prisma.schedulerServiceProfile.findUnique({
        where: { id: parsed.data.serviceProfileId },
        include: {
          professionalAssignments: {
            where: { branchProfileId: profile.id, active: true },
            include: { professionalProfile: { include: { employee: true } } },
          },
        },
      });
      if (!serviceProfile) throw new SchedulerAppointmentError("Servicio no encontrado", 404);
      let candidates = serviceProfile.professionalAssignments;
      if (parsed.data.professionalProfileId) {
        candidates = candidates.filter((item) => item.professionalProfileId === parsed.data.professionalProfileId);
      }
      if (req.schedulerAccess!.selfProfessionalOnly) {
        candidates = candidates.filter(
          (item) => item.professionalProfile.employeeId === req.schedulerAccess!.professionalEmployeeId,
        );
      }
      const templateStart = schedulerLocalMinuteToUtc(
        parsed.data.date,
        720,
        profile.timezone,
      );
      const templates: Array<{
        assignment: (typeof candidates)[number];
        service: MaterializedService;
      }> = [];
      for (const assignment of candidates) {
        try {
          const [service] = await materializeServices({
            tx: prisma,
            branchProfileId: profile.id,
            appointmentStartsAt: templateStart,
            services: [
              {
                serviceProfileId: parsed.data.serviceProfileId,
                professionalProfileIds: [assignment.professionalProfileId],
              },
            ],
            selfProfessionalEmployeeId: req.schedulerAccess!
              .selfProfessionalOnly
              ? req.schedulerAccess!.professionalEmployeeId
              : null,
          });
          if (
            service &&
            (!parsed.data.resourceId ||
              service.resources.some(
                (resource) => resource.id === parsed.data.resourceId,
              ))
          ) {
            templates.push({ assignment, service });
          }
        } catch (error) {
          if (!(error instanceof SchedulerAppointmentError)) throw error;
        }
      }
      const constraints = await loadScheduleConstraints({
        tx: prisma,
        branchProfileId: profile.id,
        localDate: parsed.data.date,
        earliest: range.start,
        latest: range.end,
        professionalIds: templates.map(
          ({ assignment }) => assignment.professionalProfileId,
        ),
        resourceIds: uniqueIds(
          templates.flatMap(({ service }) =>
            service.resources.map((resource) => resource.id),
          ),
        ),
      });
      const slots: SchedulerAvailabilityDto["slots"] = [];
      for (const { assignment, service: template } of templates) {
        for (let minute = 0; minute < 1440; minute += SCHEDULER_SLOT_MINUTES) {
          const startsAt = schedulerLocalMinuteToUtc(parsed.data.date, minute, profile.timezone);
          if (startsAt < range.start || startsAt >= range.end) continue;
          try {
            const delta = startsAt.getTime() - template.startsAt.getTime();
            const service: MaterializedService = {
              ...template,
              startsAt,
              endsAt: new Date(template.endsAt.getTime() + delta),
              occupiesFrom: new Date(template.occupiesFrom.getTime() + delta),
              occupiesUntil: new Date(template.occupiesUntil.getTime() + delta),
            };
            assertScheduleWithConstraints({
              timezone: profile.timezone,
              services: [service],
              constraints,
              allowOverride: false,
            });
            const usedCapacity = constraints.existing
              .filter(
                (existing) =>
                  existing.serviceProfileId === service.serviceProfileId &&
                  existing.startsAt.getTime() === service.startsAt.getTime() &&
                  existing.endsAt.getTime() === service.endsAt.getTime() &&
                  existing.participants.some(
                    (participant) =>
                      participant.professionalProfileId ===
                      assignment.professionalProfileId,
                  ),
              )
              .reduce(
                (total, existing) => total + existing.capacityUnits,
                0,
              );
            const resourceCapacity = service.resources.map((resource) => {
              const allocations = constraints.existing
                .filter((existing) =>
                  schedulerIntervalsOverlap(
                    service.occupiesFrom,
                    service.occupiesUntil,
                    existing.occupiesFrom,
                    existing.occupiesUntil,
                  ),
                )
                .flatMap((existing) =>
                  existing.resources.filter(
                    (allocation) => allocation.resourceId === resource.id,
                  ),
                );
              if (
                resource.exclusive ||
                allocations.some(
                  (allocation) => allocation.exclusiveSnapshot,
                )
              ) {
                return allocations.length === 0 ? 1 : 0;
              }
              const usedUnits = allocations.reduce(
                (total, allocation) => total + allocation.units,
                0,
              );
              return Math.floor(
                Math.max(0, resource.capacity - usedUnits) / resource.units,
              );
            });
            slots.push({
              startsAt: service.startsAt.toISOString(),
              endsAt: service.endsAt.toISOString(),
              professionalProfileId: assignment.professionalProfileId,
              professionalName: assignment.professionalProfile.employee.nombreCompleto,
              resourceIds: service.resources.map((resource) => resource.id),
              remainingCapacity: Math.min(
                service.serviceCapacity - usedCapacity,
                ...(resourceCapacity.length > 0
                  ? resourceCapacity
                  : [Number.POSITIVE_INFINITY]),
              ),
            });
          } catch (error) {
            if (!(error instanceof SchedulerAppointmentError)) throw error;
          }
        }
      }
      const data: SchedulerAvailabilityDto = {
        branchId: parsed.data.branchId,
        serviceProfileId: parsed.data.serviceProfileId,
        date: parsed.data.date,
        timezone: profile.timezone,
        intervalMinutes: 15,
        slots,
      };
      res.json({ success: true, message: "OK", data });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.get(
  "/appointments",
  requireSchedulerCapability("scheduler/agenda", "READ"),
  async (req, res) => {
    const parsed = z.object({
      branchId: identifier.optional(),
      from: instant,
      to: instant,
      professionalProfileId: identifier.optional(),
      customerId: identifier.optional(),
      status: z.enum(SCHEDULER_APPOINTMENT_STATUSES).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
    }).safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Filtros de citas inválidos", data: parsed.error.flatten().fieldErrors });
      return;
    }
    try {
      const from = parseSchedulerInstant(parsed.data.from, "from");
      const to = parseSchedulerInstant(parsed.data.to, "to");
      if (to <= from) throw new SchedulerAppointmentError("El rango de consulta es inválido");
      if (parsed.data.branchId) requireBranch(req, parsed.data.branchId);
      const branchIds = parsed.data.branchId
        ? [parsed.data.branchId]
        : req.schedulerAccess!.authorizedBranches.map((branch) => branch.id);
      const where: Prisma.SchedulerAppointmentWhereInput = {
        branchProfile: { branchId: { in: branchIds } },
        startsAt: { lt: to },
        endsAt: { gt: from },
        ...(parsed.data.customerId ? { customerId: parsed.data.customerId } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.professionalProfileId
          ? { services: { some: { participants: { some: { professionalProfileId: parsed.data.professionalProfileId } } } } }
          : {}),
        ...(req.schedulerAccess!.selfProfessionalOnly
          ? {
              services: {
                some: {
                  participants: {
                    some: { professionalProfile: { employeeId: req.schedulerAccess!.professionalEmployeeId ?? "__none__" } },
                  },
                },
              },
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        prisma.schedulerAppointment.findMany({
          where,
          include: appointmentInclude,
          orderBy: [{ startsAt: "asc" }, { id: "asc" }],
          skip: (parsed.data.page - 1) * parsed.data.pageSize,
          take: parsed.data.pageSize,
        }),
        prisma.schedulerAppointment.count({ where }),
      ]);
      res.json({
        success: true,
        message: "OK",
        data: { items: items.map(appointmentDto), page: parsed.data.page, pageSize: parsed.data.pageSize, total },
      });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.get(
  "/appointments/:id",
  requireSchedulerCapability("scheduler/agenda", "READ"),
  async (req, res) => {
    try {
      const row = await prisma.schedulerAppointment.findFirst({
        where: {
          id: req.params["id"],
          branchProfile: { branchId: { in: req.schedulerAccess!.authorizedBranches.map((branch) => branch.id) } },
          ...(req.schedulerAccess!.selfProfessionalOnly
            ? { services: { some: { participants: { some: { professionalProfile: { employeeId: req.schedulerAccess!.professionalEmployeeId ?? "__none__" } } } } } }
            : {}),
        },
        include: appointmentInclude,
      });
      if (!row) throw new SchedulerAppointmentError("Cita no encontrada", 404);
      res.json({ success: true, message: "OK", data: appointmentDto(row) });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.post(
  "/appointments",
  requireSchedulerCapability("scheduler/agenda", "WRITE"),
  async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    const keyParsed = idempotencyKey.safeParse(req.get("Idempotency-Key"));
    if (!parsed.success || !keyParsed.success) {
      res.status(400).json({
        success: false,
        message: "La cita y un Idempotency-Key válido son obligatorios",
        data: !parsed.success
          ? parsed.error.flatten()
          : !keyParsed.success
            ? keyParsed.error.flatten()
            : null,
      });
      return;
    }
    try {
      requireBranch(req, parsed.data.branchId);
      const hash = stableSchedulerRequestHash(parsed.data);
      const operation = "CREATE_APPOINTMENT";
      const existingKey = await prisma.schedulerIdempotencyKey.findUnique({
        where: { actorUserId_operation_idempotencyKey: { actorUserId: req.schedulerAccess!.userId, operation, idempotencyKey: keyParsed.data } },
      });
      if (existingKey) {
        if (existingKey.requestHash !== hash) throw new SchedulerAppointmentError("El Idempotency-Key ya se usó con otra solicitud", 409, "IDEMPOTENCY_CONFLICT");
        res.status(200).json({ success: true, message: "Cita ya registrada", data: existingKey.response });
        return;
      }
      const data = await withSerializableRetry(() =>
        prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`scheduler-idempotency:${req.schedulerAccess!.userId}:${operation}:${keyParsed.data}`}, 0))`;
          const concurrentReplay = await tx.schedulerIdempotencyKey.findUnique({
            where: {
              actorUserId_operation_idempotencyKey: {
                actorUserId: req.schedulerAccess!.userId,
                operation,
                idempotencyKey: keyParsed.data,
              },
            },
          });
          if (concurrentReplay) {
            if (concurrentReplay.requestHash !== hash) {
              throw new SchedulerAppointmentError(
                "El Idempotency-Key ya se usó con otra solicitud",
                409,
                "IDEMPOTENCY_CONFLICT",
              );
            }
            return concurrentReplay.response as unknown as SchedulerAppointmentDto;
          }
          if (parsed.data.override) {
            await consumeOverride(
              req,
              {
                branchId: parsed.data.branchId,
                token: parsed.data.override.authorizationToken,
              },
              tx,
            );
          }
          const startsAt = parseSchedulerInstant(parsed.data.startsAt, "startsAt");
          const branch = await resolveBranchProfile(tx, parsed.data.branchId, startsAt);
          const customer = await tx.customer.findFirst({ where: { id: parsed.data.customerId, active: true, deletedAt: null } });
          if (!customer) throw new SchedulerAppointmentError("Cliente no encontrado o inactivo", 404);
          const services = await materializeServices({
            tx,
            branchProfileId: branch.id,
            appointmentStartsAt: startsAt,
            services: parsed.data.services,
            selfProfessionalEmployeeId: req.schedulerAccess!.selfProfessionalOnly ? req.schedulerAccess!.professionalEmployeeId : null,
          });
          await lockSchedule(tx, branch.id, services);
          await assertMemberships(tx, customer.id, services);
          await assertScheduleAvailable({ tx, branchProfileId: branch.id, timezone: branch.timezone, services, allowOverride: Boolean(parsed.data.override) });
          const appointmentStartsAt = new Date(Math.min(...services.map((service) => service.startsAt.getTime())));
          const appointmentEndsAt = new Date(Math.max(...services.map((service) => service.endsAt.getTime())));
          const row = await tx.schedulerAppointment.create({
            data: {
              branchProfileId: branch.id,
              customerId: customer.id,
              status: parsed.data.status ?? "RESERVED",
              timezone: branch.timezone,
              startsAt: appointmentStartsAt,
              endsAt: appointmentEndsAt,
              notes: parsed.data.notes ?? null,
              createdByUserId: req.schedulerAccess!.userId,
              updatedByUserId: req.schedulerAccess!.userId,
            },
          });
          await replaceAppointmentServices(tx, row.id, services);
          await tx.schedulerAppointmentStateHistory.create({
            data: { appointmentId: row.id, fromStatus: null, toStatus: row.status, version: 1, actorUserId: req.schedulerAccess!.userId },
          });
          const created = await tx.schedulerAppointment.findUniqueOrThrow({ where: { id: row.id }, include: appointmentInclude });
          const response = appointmentDto(created);
          await tx.schedulerIdempotencyKey.create({
            data: { actorUserId: req.schedulerAccess!.userId, operation, idempotencyKey: keyParsed.data, requestHash: hash, appointmentId: row.id, response: response as unknown as Prisma.InputJsonValue },
          });
          await tx.auditLog.create({
            data: {
              application: "SCHEDULER",
              action: parsed.data.override ? "SCHEDULER_APPOINTMENT_CREATED_WITH_OVERRIDE" : "SCHEDULER_APPOINTMENT_CREATED",
              outcome: "SUCCESS",
              actorUserId: req.schedulerAccess!.userId,
              branchId: parsed.data.branchId,
              targetType: "SchedulerAppointment",
              targetId: row.id,
              metadata: { version: 1, serviceCount: services.length, ...(parsed.data.override ? { overrideReason: parsed.data.override.reason } : {}) },
              ...schedulerRequestAuditContext(req),
            },
          });
          return response;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
      );
      res.status(201).json({ success: true, message: "Cita creada", data });
    } catch (error) {
      sendError(res, error);
    }
  },
);

async function updateSchedule(req: Request, appointmentId: string, body: z.infer<typeof updateSchema>) {
  requireBranch(req, body.branchId);
  return withSerializableRetry(() =>
    prisma.$transaction(async (tx) => {
      const current = await tx.schedulerAppointment.findFirst({
        where: {
          id: appointmentId,
          ...(req.schedulerAccess!.selfProfessionalOnly
            ? {
                services: {
                  some: {
                    participants: {
                      some: {
                        professionalProfile: {
                          employeeId:
                            req.schedulerAccess!.professionalEmployeeId ??
                            "__none__",
                        },
                      },
                    },
                  },
                },
              }
            : {}),
        },
        include: appointmentInclude,
      });
      if (!current || !hasSchedulerBranchAccess(req.schedulerAccess!, current.branchProfile.branchId)) {
        throw new SchedulerAppointmentError("Cita no encontrada", 404);
      }
      if (current.version !== body.expectedVersion) {
        throw new SchedulerAppointmentError("La cita cambió; vuelve a cargarla", 409, "VERSION_CONFLICT", { currentVersion: current.version });
      }
      if (
        !["PENDING", "RESERVED", "CONFIRMED"].includes(current.status)
      ) {
        throw new SchedulerAppointmentError(
          "Sólo una cita pendiente, reservada o confirmada puede reprogramarse",
          409,
          "INVALID_STATUS_TRANSITION",
        );
      }
      if (body.override) {
        await consumeOverride(
          req,
          {
            branchId: body.branchId,
            token: body.override.authorizationToken,
          },
          tx,
        );
      }
      const startsAt = parseSchedulerInstant(body.startsAt, "startsAt");
      const branch = await resolveBranchProfile(tx, body.branchId, startsAt);
      const customer = await tx.customer.findFirst({ where: { id: body.customerId, active: true, deletedAt: null } });
      if (!customer) throw new SchedulerAppointmentError("Cliente no encontrado o inactivo", 404);
      const services = await materializeServices({
        tx,
        branchProfileId: branch.id,
        appointmentStartsAt: startsAt,
        services: body.services,
        selfProfessionalEmployeeId: req.schedulerAccess!.selfProfessionalOnly ? req.schedulerAccess!.professionalEmployeeId : null,
      });
      await lockSchedule(tx, branch.id, services);
      await assertMemberships(tx, customer.id, services, current.id);
      await assertScheduleAvailable({ tx, branchProfileId: branch.id, timezone: branch.timezone, services, excludeAppointmentId: current.id, allowOverride: Boolean(body.override) });
      const nextVersion = current.version + 1;
      const nextStatus = body.status ?? current.status;
      if (nextStatus !== current.status) {
        assertSchedulerStatusTransition(current.status, nextStatus);
      }
      await tx.schedulerAppointment.update({
        where: { id: current.id },
        data: {
          branchProfileId: branch.id,
          customerId: customer.id,
          status: nextStatus,
          timezone: branch.timezone,
          startsAt: new Date(Math.min(...services.map((service) => service.startsAt.getTime()))),
          endsAt: new Date(Math.max(...services.map((service) => service.endsAt.getTime()))),
          notes: body.notes ?? null,
          version: nextVersion,
          updatedByUserId: req.schedulerAccess!.userId,
        },
      });
      await replaceAppointmentServices(tx, current.id, services);
      if (nextStatus !== current.status) {
        await tx.schedulerAppointmentStateHistory.create({
          data: { appointmentId: current.id, fromStatus: current.status, toStatus: nextStatus, version: nextVersion, actorUserId: req.schedulerAccess!.userId },
        });
      }
      await tx.auditLog.create({
        data: {
          application: "SCHEDULER",
          action: body.override ? "SCHEDULER_APPOINTMENT_UPDATED_WITH_OVERRIDE" : "SCHEDULER_APPOINTMENT_UPDATED",
          outcome: "SUCCESS",
          actorUserId: req.schedulerAccess!.userId,
          branchId: body.branchId,
          targetType: "SchedulerAppointment",
          targetId: current.id,
          metadata: { previousVersion: current.version, version: nextVersion, ...(body.override ? { overrideReason: body.override.reason } : {}) },
          ...schedulerRequestAuditContext(req),
        },
      });
      return appointmentDto(await tx.schedulerAppointment.findUniqueOrThrow({ where: { id: current.id }, include: appointmentInclude }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  );
}

router.put(
  "/appointments/:id",
  requireSchedulerCapability("scheduler/agenda", "WRITE"),
  async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Datos de cita inválidos", data: parsed.error.flatten().fieldErrors });
      return;
    }
    try {
      const data = await updateSchedule(req, req.params["id"]!, parsed.data);
      res.json({ success: true, message: "Cita actualizada", data });
    } catch (error) {
      sendError(res, error);
    }
  },
);

router.post(
  "/appointments/:id/move",
  requireSchedulerCapability("scheduler/agenda", "WRITE"),
  async (req, res) => {
    const parsed = moveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Datos de movimiento inválidos", data: parsed.error.flatten().fieldErrors });
      return;
    }
    try {
      const current = await prisma.schedulerAppointment.findUnique({ where: { id: req.params["id"] }, include: appointmentInclude });
      if (!current) throw new SchedulerAppointmentError("Cita no encontrada", 404);
      const originalStart = current.startsAt.getTime();
      const services: SchedulerAppointmentServiceWriteDto[] = parsed.data.services ?? current.services.map((service) => ({
        serviceProfileId: service.serviceProfileId,
        professionalProfileIds: service.participants.map((participant) => participant.professionalProfileId),
        resourceIds: service.resources.map((resource) => resource.resourceId),
        startsAt: new Date(parseSchedulerInstant(parsed.data.startsAt, "startsAt").getTime() + (service.startsAt.getTime() - originalStart)).toISOString(),
        capacityUnits: service.capacityUnits,
        membershipId: service.membershipBenefit?.membershipId ?? null,
      }));
      const data = await updateSchedule(req, current.id, {
        branchId: current.branchProfile.branch.id,
        customerId: current.customerId,
        startsAt: parsed.data.startsAt,
        status: ["PENDING", "RESERVED", "CONFIRMED"].includes(current.status)
          ? (current.status as "PENDING" | "RESERVED" | "CONFIRMED")
          : undefined,
        notes: current.notes,
        services,
        expectedVersion: parsed.data.expectedVersion,
        override: parsed.data.override,
      });
      res.json({ success: true, message: "Cita movida", data });
    } catch (error) {
      sendError(res, error);
    }
  },
);

async function changeStatus(req: Request, appointmentId: string, nextStatus: SchedulerAppointmentStatus, expectedVersion: number, reason?: string | null) {
  return withSerializableRetry(() => prisma.$transaction(async (tx) => {
    const current = await tx.schedulerAppointment.findFirst({
      where: {
        id: appointmentId,
        ...(req.schedulerAccess!.selfProfessionalOnly
          ? {
              services: {
                some: {
                  participants: {
                    some: {
                      professionalProfile: {
                        employeeId:
                          req.schedulerAccess!.professionalEmployeeId ??
                          "__none__",
                      },
                    },
                  },
                },
              },
            }
          : {}),
      },
      include: {
        branchProfile: true,
        services: { include: { membershipBenefit: true } },
      },
    });
    if (!current || !hasSchedulerBranchAccess(req.schedulerAccess!, current.branchProfile.branchId)) throw new SchedulerAppointmentError("Cita no encontrada", 404);
    if (current.version !== expectedVersion) throw new SchedulerAppointmentError("La cita cambió; vuelve a cargarla", 409, "VERSION_CONFLICT", { currentVersion: current.version });
    assertSchedulerStatusTransition(current.status, nextStatus);
    if (current.status === nextStatus) return appointmentDto(await tx.schedulerAppointment.findUniqueOrThrow({ where: { id: current.id }, include: appointmentInclude }));
    if (nextStatus === "CANCELED" && (!reason || reason.trim().length < 3)) throw new SchedulerAppointmentError("Cancelar requiere un motivo");
    const nextVersion = current.version + 1;
    await tx.schedulerAppointment.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        cancellationReason: nextStatus === "CANCELED" ? reason : null,
        version: nextVersion,
        updatedByUserId: req.schedulerAccess!.userId,
      },
    });
    if (nextStatus === "CANCELED") {
      await tx.schedulerAppointmentMembershipBenefit.updateMany({
        where: { appointmentService: { appointmentId: current.id }, status: "RESERVED" },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
    }
    if (nextStatus === "ATTENDED") {
      await tx.schedulerAppointmentMembershipBenefit.updateMany({
        where: { appointmentService: { appointmentId: current.id }, status: "RESERVED" },
        data: { status: "CONSUMED", consumedAt: new Date() },
      });
    }
    await tx.schedulerAppointmentStateHistory.create({
      data: { appointmentId: current.id, fromStatus: current.status, toStatus: nextStatus, reason: reason ?? null, version: nextVersion, actorUserId: req.schedulerAccess!.userId },
    });
    await tx.auditLog.create({
      data: {
        application: "SCHEDULER",
        action: nextStatus === "CANCELED" ? "SCHEDULER_APPOINTMENT_CANCELED" : "SCHEDULER_APPOINTMENT_STATUS_CHANGED",
        outcome: "SUCCESS",
        actorUserId: req.schedulerAccess!.userId,
        branchId: current.branchProfile.branchId,
        targetType: "SchedulerAppointment",
        targetId: current.id,
        metadata: { fromStatus: current.status, toStatus: nextStatus, version: nextVersion },
        ...schedulerRequestAuditContext(req),
      },
    });
    return appointmentDto(await tx.schedulerAppointment.findUniqueOrThrow({ where: { id: current.id }, include: appointmentInclude }));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

router.post(
  "/appointments/:id/status",
  requireSchedulerCapability("scheduler/agenda", "WRITE"),
  async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Cambio de estado inválido", data: parsed.error.flatten().fieldErrors });
      return;
    }
    try {
      const data = await changeStatus(req, req.params["id"]!, parsed.data.status, parsed.data.expectedVersion, parsed.data.reason);
      res.json({ success: true, message: "Estado actualizado", data });
    } catch (error) { sendError(res, error); }
  },
);

router.post(
  "/appointments/:id/cancel",
  requireSchedulerCapability("scheduler/agenda", "WRITE"),
  async (req, res) => {
    const parsed = cancelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "La cancelación requiere versión y motivo", data: parsed.error.flatten().fieldErrors });
      return;
    }
    try {
      const data = await changeStatus(req, req.params["id"]!, "CANCELED", parsed.data.expectedVersion, parsed.data.reason);
      res.json({ success: true, message: "Cita cancelada", data });
    } catch (error) { sendError(res, error); }
  },
);

router.get(
  "/blocks",
  requireSchedulerCapability("scheduler/agenda", "READ"),
  async (req, res) => {
    const parsed = z.object({ branchId: identifier, from: instant, to: instant }).safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Filtros de bloqueos inválidos", data: parsed.error.flatten().fieldErrors });
      return;
    }
    try {
      requireBranch(req, parsed.data.branchId);
      const rows = await prisma.schedulerScheduleBlock.findMany({
        where: {
          branchProfile: { branchId: parsed.data.branchId },
          startsAt: { lt: parseSchedulerInstant(parsed.data.to, "to") },
          endsAt: { gt: parseSchedulerInstant(parsed.data.from, "from") },
          ...(req.schedulerAccess!.selfProfessionalOnly
            ? {
                OR: [
                  {
                    professionalProfile: {
                      employeeId:
                        req.schedulerAccess!.professionalEmployeeId ??
                        "__none__",
                    },
                  },
                  { professionalProfileId: null, resourceId: null },
                ],
              }
            : {}),
        },
        include: { branchProfile: { select: { branchId: true } } },
        orderBy: { startsAt: "asc" },
      });
      res.json({ success: true, message: "OK", data: rows.map(blockDto) });
    } catch (error) { sendError(res, error); }
  },
);

router.post(
  "/blocks",
  requireSchedulerCapability("scheduler/agenda", "WRITE"),
  async (req, res) => {
    const parsed = blockBaseSchema
      .omit({ expectedVersion: true })
      .superRefine(validateBlockOwners)
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Datos de bloqueo inválidos", data: parsed.error.flatten().fieldErrors });
      return;
    }
    try {
      requireBranch(req, parsed.data.branchId);
      const startsAt = parseSchedulerInstant(parsed.data.startsAt, "startsAt");
      const endsAt = parseSchedulerInstant(parsed.data.endsAt, "endsAt");
      if (endsAt <= startsAt) throw new SchedulerAppointmentError("El fin del bloqueo debe ser posterior al inicio");
      const branch = await resolveBranchProfile(prisma, parsed.data.branchId, startsAt);
      await validateBlockOwner({
        tx: prisma,
        req,
        branchProfileId: branch.id,
        professionalProfileId: parsed.data.professionalProfileId,
        resourceId: parsed.data.resourceId,
        at: startsAt,
      });
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx.schedulerScheduleBlock.create({
          data: {
            branchProfileId: branch.id,
            professionalProfileId:
              parsed.data.professionalProfileId ?? null,
            resourceId: parsed.data.resourceId ?? null,
            startsAt,
            endsAt,
            timezone: branch.timezone,
            reason: parsed.data.reason,
            createdByUserId: req.schedulerAccess!.userId,
          },
          include: { branchProfile: { select: { branchId: true } } },
        });
        await tx.auditLog.create({
          data: {
            application: "SCHEDULER",
            action: "SCHEDULER_BLOCK_CREATED",
            outcome: "SUCCESS",
            actorUserId: req.schedulerAccess!.userId,
            branchId: parsed.data.branchId,
            targetType: "SchedulerScheduleBlock",
            targetId: created.id,
            metadata: {
              professionalProfileId:
                parsed.data.professionalProfileId ?? null,
              resourceId: parsed.data.resourceId ?? null,
            },
            ...schedulerRequestAuditContext(req),
          },
        });
        return created;
      });
      res.status(201).json({ success: true, message: "Bloqueo creado", data: blockDto(row) });
    } catch (error) { sendError(res, error); }
  },
);

router.put(
  "/blocks/:id",
  requireSchedulerCapability("scheduler/agenda", "WRITE"),
  async (req, res) => {
    const parsed = blockBaseSchema
      .required({ expectedVersion: true })
      .superRefine(validateBlockOwners)
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Datos de bloqueo inválidos", data: parsed.error.flatten().fieldErrors });
      return;
    }
    try {
      requireBranch(req, parsed.data.branchId);
      const current = await prisma.schedulerScheduleBlock.findUnique({
        where: { id: req.params["id"] },
        include: { branchProfile: true, professionalProfile: true },
      });
      if (
        !current ||
        !hasSchedulerBranchAccess(
          req.schedulerAccess!,
          current.branchProfile.branchId,
        ) ||
        (req.schedulerAccess!.selfProfessionalOnly &&
          current.professionalProfile?.employeeId !==
            req.schedulerAccess!.professionalEmployeeId)
      )
        throw new SchedulerAppointmentError("Bloqueo no encontrado", 404);
      if (current.status !== "ACTIVE") throw new SchedulerAppointmentError("Un bloqueo cancelado no puede editarse", 409);
      if (current.version !== parsed.data.expectedVersion) throw new SchedulerAppointmentError("El bloqueo cambió; vuelve a cargarlo", 409, "VERSION_CONFLICT", { currentVersion: current.version });
      const startsAt = parseSchedulerInstant(parsed.data.startsAt, "startsAt");
      const endsAt = parseSchedulerInstant(parsed.data.endsAt, "endsAt");
      if (endsAt <= startsAt)
        throw new SchedulerAppointmentError(
          "El fin del bloqueo debe ser posterior al inicio",
        );
      const branch = await resolveBranchProfile(
        prisma,
        parsed.data.branchId,
        startsAt,
      );
      await validateBlockOwner({
        tx: prisma,
        req,
        branchProfileId: branch.id,
        professionalProfileId: parsed.data.professionalProfileId,
        resourceId: parsed.data.resourceId,
        at: startsAt,
      });
      const row = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedulerScheduleBlock.updateMany({
          where: {
            id: current.id,
            version: parsed.data.expectedVersion,
            status: "ACTIVE",
          },
          data: {
            branchProfileId: branch.id,
            professionalProfileId:
              parsed.data.professionalProfileId ?? null,
            resourceId: parsed.data.resourceId ?? null,
            startsAt,
            endsAt,
            timezone: branch.timezone,
            reason: parsed.data.reason,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new SchedulerAppointmentError(
            "El bloqueo cambió; vuelve a cargarlo",
            409,
            "VERSION_CONFLICT",
          );
        }
        const saved = await tx.schedulerScheduleBlock.findUniqueOrThrow({
          where: { id: current.id },
          include: { branchProfile: { select: { branchId: true } } },
        });
        await tx.auditLog.create({
          data: {
            application: "SCHEDULER",
            action: "SCHEDULER_BLOCK_UPDATED",
            outcome: "SUCCESS",
            actorUserId: req.schedulerAccess!.userId,
            branchId: parsed.data.branchId,
            targetType: "SchedulerScheduleBlock",
            targetId: saved.id,
            metadata: {
              previousVersion: current.version,
              version: saved.version,
            },
            ...schedulerRequestAuditContext(req),
          },
        });
        return saved;
      });
      res.json({ success: true, message: "Bloqueo actualizado", data: blockDto(row) });
    } catch (error) { sendError(res, error); }
  },
);

router.post(
  "/blocks/:id/cancel",
  requireSchedulerCapability("scheduler/agenda", "WRITE"),
  async (req, res) => {
    const parsed = cancelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Cancelación de bloqueo inválida", data: parsed.error.flatten().fieldErrors });
      return;
    }
    try {
      const current = await prisma.schedulerScheduleBlock.findUnique({
        where: { id: req.params["id"] },
        include: { branchProfile: true, professionalProfile: true },
      });
      if (
        !current ||
        !hasSchedulerBranchAccess(
          req.schedulerAccess!,
          current.branchProfile.branchId,
        ) ||
        (req.schedulerAccess!.selfProfessionalOnly &&
          current.professionalProfile?.employeeId !==
            req.schedulerAccess!.professionalEmployeeId)
      )
        throw new SchedulerAppointmentError("Bloqueo no encontrado", 404);
      if (current.status !== "ACTIVE")
        throw new SchedulerAppointmentError(
          "El bloqueo ya está cancelado",
          409,
          "INVALID_STATUS_TRANSITION",
        );
      if (current.version !== parsed.data.expectedVersion)
        throw new SchedulerAppointmentError(
          "El bloqueo cambió; vuelve a cargarlo",
          409,
          "VERSION_CONFLICT",
          { currentVersion: current.version },
        );
      const row = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedulerScheduleBlock.updateMany({
          where: {
            id: current.id,
            version: parsed.data.expectedVersion,
            status: "ACTIVE",
          },
          data: {
            status: "CANCELED",
            canceledAt: new Date(),
            canceledByUserId: req.schedulerAccess!.userId,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new SchedulerAppointmentError(
            "El bloqueo cambió; vuelve a cargarlo",
            409,
            "VERSION_CONFLICT",
          );
        }
        const saved = await tx.schedulerScheduleBlock.findUniqueOrThrow({
          where: { id: current.id },
          include: { branchProfile: { select: { branchId: true } } },
        });
        await tx.auditLog.create({
          data: {
            application: "SCHEDULER",
            action: "SCHEDULER_BLOCK_CANCELED",
            outcome: "SUCCESS",
            actorUserId: req.schedulerAccess!.userId,
            branchId: current.branchProfile.branchId,
            targetType: "SchedulerScheduleBlock",
            targetId: saved.id,
            metadata: {
              previousVersion: current.version,
              version: saved.version,
              reason: parsed.data.reason,
            },
            ...schedulerRequestAuditContext(req),
          },
        });
        return saved;
      });
      res.json({ success: true, message: "Bloqueo cancelado", data: blockDto(row) });
    } catch (error) { sendError(res, error); }
  },
);

export default router;
