function atUtcHour(dayStart: string, hour: number): string {
  const value = new Date(dayStart);
  value.setUTCHours(hour, 0, 0, 0);
  return value.toISOString();
}

function firstVisibleUtcDay(guardedFrom: string): string {
  const value = new Date(guardedFrom);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString();
}

interface SchedulerAgendaCatalogFixtureInput {
  branches: Array<{ id: string; branchId: string }>;
  professionals: object[];
  resources: object[];
  availabilityRules: Array<{
    branchProfileId?: string;
    ownerType?: string;
    ownerId?: string;
  }>;
  availabilityExceptions: Array<{
    branchProfileId?: string;
    ownerType?: string;
    ownerId?: string;
  }>;
  [key: string]: unknown;
}

export function schedulerAgendaCatalogFixture(
  catalog: SchedulerAgendaCatalogFixtureInput,
) {
  const branch = catalog.branches[0];
  if (!branch) throw new Error("El catálogo E2E no contiene una sucursal autorizada.");
  const effectiveFrom = "2026-01-01T00:00:00.000Z";
  const weekdays = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];
  const professional = (id: string, name: string) => ({
    id,
    employeeId: `employee-${id}`,
    name,
    employeeActive: true,
    biography: null,
    acceptsOnline: true,
    active: true,
    effectiveFrom,
    effectiveTo: null,
    version: 1,
    branchProfileIds: [branch.id],
    specialtyIds: [],
  });

  return {
    ...catalog,
    professionals: [
      ...catalog.professionals,
      professional("professional-rv1-1", "Renata Castillo"),
      professional("professional-rv1-2", "Camila Torres"),
    ],
    resources: [
      ...catalog.resources,
      {
        id: "resource-rv1",
        branchProfileId: branch.id,
        name: "Cabina facial 1",
        kind: "ROOM",
        capacity: 1,
        exclusive: true,
        acceptsOnline: true,
        active: true,
        effectiveFrom,
        effectiveTo: null,
        version: 1,
      },
    ],
    availabilityRules: [
      ...catalog.availabilityRules.filter(
        (rule) =>
          rule.branchProfileId !== branch.id ||
          rule.ownerType !== "BRANCH" ||
          rule.ownerId !== branch.id,
      ),
      ...weekdays.map((weekday, index) => ({
        id: `rule-rv2-${index}`,
        branchProfileId: branch.id,
        ownerType: "BRANCH",
        ownerId: branch.id,
        kind: "WORKING",
        weekday,
        startMinute: 8 * 60,
        endMinute: 22 * 60,
        effectiveFrom,
        effectiveTo: null,
      })),
    ],
    availabilityExceptions: catalog.availabilityExceptions.filter(
      (exception) =>
        exception.branchProfileId !== branch.id ||
        exception.ownerType !== "BRANCH" ||
        exception.ownerId !== branch.id,
    ),
  };
}

function service(
  id: string,
  sequence: number,
  startsAt: string,
  endsAt: string,
  professionalProfileId: string,
) {
  return {
    id,
    sequence,
    serviceProfileId: `service-profile-${sequence}`,
    serviceName: sequence === 1 ? "Facial premium" : "Masaje de seguimiento",
    serviceVersion: sequence + 3,
    durationMinutes: 60,
    preparationMinutes: 10,
    cleanupMinutes: 5,
    capacityUnits: 1,
    startsAt,
    endsAt,
    occupiesFrom: startsAt,
    occupiesUntil: endsAt,
    professionals: [
      {
        professionalProfileId,
        name: sequence === 1 ? "Renata Castillo" : "Camila Torres",
        role: sequence === 1 ? ("PRIMARY" as const) : ("SUPPORT" as const),
      },
    ],
    resources:
      sequence === 1
        ? [
            {
              resourceId: "resource-rv1",
              name: "Cabina facial 1",
              units: 1,
              exclusive: true,
            },
          ]
        : [],
    membership:
      sequence === 1
        ? {
            membershipId: "membership-rv1",
            name: "Plan facial",
            status: "RESERVED" as const,
          }
        : null,
  };
}

export function schedulerAgendaAppointmentsFixture({
  branchId,
  from,
}: {
  branchId: string;
  from: string;
}) {
  const visibleDay = firstVisibleUtcDay(from);
  const startsAt = atUtcHour(visibleDay, 16);
  const middleAt = atUtcHour(visibleDay, 17);
  const endsAt = atUtcHour(visibleDay, 18);
  const base = {
    id: "appointment-rv1-attended",
    branchId,
    branchProfileId: "branch-profile-rv1",
    branchName: "Sucursal autorizada",
    customerId: "customer-rv1",
    customerName: "María Camila Celis",
    status: "ATTENDED",
    origin: "SCHEDULER",
    timezone: "America/Mexico_City",
    startsAt,
    endsAt,
    notes: null,
    cancellationReason: null,
    version: 7,
    services: [
      service(
        "appointment-service-rv1-1",
        1,
        startsAt,
        middleAt,
        "professional-rv1-1",
      ),
      service(
        "appointment-service-rv1-2",
        2,
        middleAt,
        endsAt,
        "professional-rv1-2",
      ),
    ],
    stateHistory: [
      {
        fromStatus: "ARRIVED",
        toStatus: "ATTENDED",
        reason: null,
        version: 7,
        actorUserId: "fixture-actor",
        createdAt: endsAt,
      },
    ],
    createdAt: startsAt,
    updatedAt: endsAt,
  };
  return {
    items: [
      base,
      {
        ...base,
        id: "appointment-rv1-arrived",
        customerId: "customer-rv1-2",
        customerName: "Yumi Hirasawa",
        status: "ARRIVED",
        startsAt: atUtcHour(visibleDay, 19),
        endsAt: atUtcHour(visibleDay, 20),
        services: [
          service(
            "appointment-service-rv1-3",
            1,
            atUtcHour(visibleDay, 19),
            atUtcHour(visibleDay, 20),
            "professional-rv1-1",
          ),
        ],
        stateHistory: [],
      },
    ],
    page: 1,
    pageSize: 100,
    total: 2,
  };
}

export function schedulerAgendaBlocksFixture({
  branchId,
  from,
}: {
  branchId: string;
  from: string;
}) {
  const visibleDay = firstVisibleUtcDay(from);
  return [
    {
      id: "block-rv1",
      branchId,
      branchProfileId: "branch-profile-rv1",
      professionalProfileId: "professional-rv1-1",
      resourceId: "resource-rv1",
      startsAt: atUtcHour(visibleDay, 21),
      endsAt: atUtcHour(visibleDay, 22),
      timezone: "America/Mexico_City",
      reason: "Mantenimiento de cabina",
      status: "ACTIVE",
      version: 3,
      createdAt: atUtcHour(visibleDay, 12),
      canceledAt: null,
    },
  ];
}
