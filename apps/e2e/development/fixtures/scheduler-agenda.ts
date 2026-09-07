function atUtcHour(dayStart: string, hour: number): string {
  const value = new Date(dayStart);
  value.setUTCHours(hour, 0, 0, 0);
  return value.toISOString();
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
  const startsAt = atUtcHour(from, 16);
  const middleAt = atUtcHour(from, 17);
  const endsAt = atUtcHour(from, 18);
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
        startsAt: atUtcHour(from, 19),
        endsAt: atUtcHour(from, 20),
        services: [
          service(
            "appointment-service-rv1-3",
            1,
            atUtcHour(from, 19),
            atUtcHour(from, 20),
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
  return [
    {
      id: "block-rv1",
      branchId,
      branchProfileId: "branch-profile-rv1",
      professionalProfileId: "professional-rv1-1",
      resourceId: "resource-rv1",
      startsAt: atUtcHour(from, 21),
      endsAt: atUtcHour(from, 22),
      timezone: "America/Mexico_City",
      reason: "Mantenimiento de cabina",
      status: "ACTIVE",
      version: 3,
      createdAt: atUtcHour(from, 12),
      canceledAt: null,
    },
  ];
}
