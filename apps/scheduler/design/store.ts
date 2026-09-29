import {
  SCHEDULER_CAPABILITIES,
  SCHEDULER_SCREEN_KEYS,
  SCHEDULER_WEEKDAYS,
  type SchedulerAppointmentDto,
  type SchedulerAppointmentCreateDto,
  type SchedulerBootstrapDto,
  type SchedulerCustomerDetailDto,
  type SchedulerCustomerFieldDefinitionDto,
  type SchedulerOperationalCatalogDto,
  type SchedulerScheduleBlockDto,
  type SchedulerAdministrationCatalogDto,
} from "@cosmetics/types";
import {
  schedulerAdministrationCandidatesFixture,
  schedulerOperationalCatalogRv4Fixture,
  schedulerAdministrationCatalogRv4Fixture,
  schedulerPosReferencesRv4Fixture,
} from "./fixtures/administration";
import {
  schedulerSurveysRv6Fixture,
  schedulerConsentTemplatesRv6Fixture,
  schedulerMessageTemplatesRv6Fixture,
  schedulerMessageOutboxRv6Fixture,
} from "./fixtures/engagement";
import { schedulerSettingsRv5Documents } from "./fixtures/settings";
import { schedulerLocalDateTimeToInstant } from "../src/lib/scheduler-agenda-data";

export const designOrigin = "https://scheduler-design.invalid";
export type DesignRole = "master" | "specialist" | "read-only";
export type DesignScenario = "normal" | "empty" | "slow" | "error" | "conflict";
export type DesignRow = Record<string, unknown>;
export interface DesignControls {
  role: DesignRole;
  scenario: DesignScenario;
  date: string;
}
export interface DesignMovement {
  id: string;
  actor: string;
  action: string;
  targetId: string;
  createdAt: string;
}

export function designToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function designId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
export function designInstant(date: string, minute: number): string {
  const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  const value = schedulerLocalDateTimeToInstant(
    date,
    time,
    "America/Mexico_City",
  );
  if (!value) throw new Error("Fecha u horario de diseño inválido.");
  return value;
}

export function createDesignState(
  controls: DesignControls = {
    role: "master",
    scenario: "normal",
    date: designToday(),
  },
) {
  const catalog: SchedulerOperationalCatalogDto = structuredClone(
    schedulerOperationalCatalogRv4Fixture as SchedulerOperationalCatalogDto,
  );
  // Horarios y relaciones completos permiten probar cualquier día en la demo.
  catalog.professionals.forEach((professional) => {
    professional.branchProfileIds = catalog.branches.map((branch) => branch.id);
  });
  catalog.services.forEach((service) => {
    service.branchProfileIds = catalog.branches.map((branch) => branch.id);
    service.preparationMinutes = 0;
    service.cleanupMinutes = 0;
  });
  catalog.professionalServices = catalog.branches.flatMap((branch) =>
    catalog.professionals.flatMap((professional) =>
      catalog.services.map((service) => ({
        professionalProfileId: professional.id,
        serviceProfileId: service.id,
        branchProfileId: branch.id,
        active: true,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveTo: null,
      })),
    ),
  );
  catalog.availabilityRules = catalog.branches.flatMap((branch) =>
    [
      { ownerType: "BRANCH" as const, ownerId: branch.id },
      ...catalog.professionals.map((professional) => ({
        ownerType: "PROFESSIONAL" as const,
        ownerId: professional.id,
      })),
      ...catalog.resources
        .filter((resource) => resource.branchProfileId === branch.id)
        .map((resource) => ({
          ownerType: "RESOURCE" as const,
          ownerId: resource.id,
        })),
    ].flatMap((owner) =>
      SCHEDULER_WEEKDAYS.map((weekday) => ({
        id: `design-rule-${branch.id}-${owner.ownerId}-${weekday}`,
        branchProfileId: branch.id,
        ...owner,
        weekday,
        kind: "WORKING" as const,
        startMinute: 8 * 60,
        endMinute: 20 * 60,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveTo: null,
      })),
    ),
  );
  const sources = [
    {
      id: "source-referral",
      name: "Recomendación",
      active: true,
      companyOwnedByDefault: false,
    },
    {
      id: "source-social",
      name: "Redes sociales",
      active: true,
      companyOwnedByDefault: false,
    },
  ];
  const customers: SchedulerCustomerDetailDto[] = [
    "María Camila Celis",
    "Ana Torres Ruiz",
    "Lucía Velasco Pérez",
  ].map((name, index) => ({
    id: `design-customer-${index + 1}`,
    displayName: name,
    preferredName: null,
    phone: `555000000${index + 1}`,
    email: `cliente${index + 1}@example.test`,
    source: sources[index % sources.length]!,
    active: true,
    version: 1,
    aliases: [],
    currentPortfolios: [
      {
        id: `design-portfolio-${index + 1}`,
        branchId: catalog.branches[0]!.branchId,
        branchName: catalog.branches[0]!.branchName,
        employeeId: catalog.professionals[0]!.employeeId,
        ownerName: catalog.professionals[0]!.name,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveTo: null,
      },
    ],
    notes: null,
    profile: {
      preferredLocale: "es-MX",
      contactPreference: "WHATSAPP",
      notes: null,
      version: 1,
    },
    emails: [],
    customFields: [],
    mergeHistory: [],
  }));
  const fields: SchedulerCustomerFieldDefinitionDto[] = [
    {
      id: "design-field-birthday",
      commerceId: catalog.commerces[0]!.id,
      key: "birthDate",
      label: "Fecha de nacimiento",
      type: "DATE",
      options: null,
      required: false,
      active: true,
      version: 1,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
    },
    {
      id: "design-field-type",
      commerceId: catalog.commerces[0]!.id,
      key: "customerType",
      label: "Tipo de cliente",
      type: "SELECT",
      options: ["Nuevo", "Frecuente", "VIP"],
      required: false,
      active: true,
      version: 1,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
    },
  ];
  const state = {
    controls: { ...controls },
    catalog,
    customers,
    fields,
    sources,
    candidates: structuredClone(schedulerAdministrationCandidatesFixture),
    administration: structuredClone(
      schedulerAdministrationCatalogRv4Fixture as SchedulerAdministrationCatalogDto,
    ),
    posReferences: structuredClone(schedulerPosReferencesRv4Fixture),
    appointments: [] as SchedulerAppointmentDto[],
    blocks: [] as SchedulerScheduleBlockDto[],
    settings: structuredClone(schedulerSettingsRv5Documents),
    settingLayers: {} as Record<
      string,
      { document: DesignRow; version: number }
    >,
    surveys: structuredClone(schedulerSurveysRv6Fixture) as DesignRow[],
    consentTemplates: structuredClone(
      schedulerConsentTemplatesRv6Fixture,
    ) as DesignRow[],
    consentRecords: [] as DesignRow[],
    documents: [] as DesignRow[],
    messageTemplates: structuredClone(
      schedulerMessageTemplatesRv6Fixture,
    ) as DesignRow[],
    messageOutbox: structuredClone(
      schedulerMessageOutboxRv6Fixture,
    ) as DesignRow[],
    contactChannels: {} as Record<string, DesignRow[]>,
    medicalRecords: {} as Record<string, DesignRow>,
    authorizations: new Map<
      string,
      { role: DesignRole; purpose: string; targetId: string; expiresAt: number }
    >(),
    idempotency: new Map<string, { payload: string; result: unknown }>(),
    movements: [] as DesignMovement[],
  };
  if (controls.scenario !== "empty") {
    for (let index = 0; index < 3; index += 1) {
      const appointment = buildDesignAppointment(state, {
        branchId: catalog.branches[0]!.branchId,
        customerId: customers[index]!.id,
        startsAt: designInstant(controls.date, (9 + index * 3) * 60),
        services: [
          {
            serviceProfileId: catalog.services[0]!.id,
            professionalProfileIds: [
              catalog.professionals[index % catalog.professionals.length]!.id,
            ],
            resourceIds: [],
          },
        ],
      });
      appointment.status = ["CONFIRMED", "ATTENDED", "CANCELED"][
        index
      ] as SchedulerAppointmentDto["status"];
      state.appointments.push(appointment);
    }
  }
  return state;
}
export type DesignState = ReturnType<typeof createDesignState>;
export const designStore = { state: createDesignState() };

export function buildDesignAppointment(
  state: Pick<DesignState, "catalog" | "customers">,
  input: SchedulerAppointmentCreateDto,
  existing?: SchedulerAppointmentDto,
): SchedulerAppointmentDto {
  const branch = state.catalog.branches.find(
    (item) => item.branchId === input.branchId,
  );
  const customer = state.customers.find((item) => item.id === input.customerId);
  if (!branch || !customer || !input.services.length)
    throw new Error("Selecciona sucursal, cliente y servicio.");
  const services = input.services.map((line, index) => {
    const service = state.catalog.services.find(
      (item) => item.id === line.serviceProfileId,
    );
    if (!service || !service.active) throw new Error("Servicio no disponible.");
    const startsAt = line.startsAt ?? input.startsAt;
    const endsAt = new Date(
      new Date(startsAt).getTime() + service.durationMinutes * 60_000,
    ).toISOString();
    return {
      id: existing?.services[index]?.id ?? designId("design-service"),
      sequence: index + 1,
      serviceProfileId: service.id,
      serviceName: service.name,
      serviceVersion: service.version,
      durationMinutes: service.durationMinutes,
      preparationMinutes: service.preparationMinutes,
      cleanupMinutes: service.cleanupMinutes,
      capacityUnits: line.capacityUnits ?? 1,
      startsAt,
      endsAt,
      occupiesFrom: startsAt,
      occupiesUntil: endsAt,
      professionals: line.professionalProfileIds.map((id, order) => ({
        professionalProfileId: id,
        name:
          state.catalog.professionals.find((item) => item.id === id)?.name ??
          "Profesional demo",
        role: order === 0 ? ("PRIMARY" as const) : ("SUPPORT" as const),
      })),
      resources: (line.resourceIds ?? []).map((id) => ({
        resourceId: id,
        name:
          state.catalog.resources.find((item) => item.id === id)?.name ??
          "Recurso demo",
        units: 1,
        exclusive: true,
      })),
      membership: null,
    };
  });
  return {
    id: existing?.id ?? designId("design-appointment"),
    branchId: branch.branchId,
    branchProfileId: branch.id,
    branchName: branch.branchName,
    customerId: customer.id,
    customerName: customer.displayName,
    status: input.status ?? "RESERVED",
    origin: "SCHEDULER",
    timezone: branch.timezone,
    startsAt: input.startsAt,
    endsAt: services.at(-1)!.endsAt,
    notes: input.notes ?? null,
    cancellationReason: null,
    version: (existing?.version ?? 0) + 1,
    services,
    stateHistory: existing?.stateHistory ?? [],
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function designBootstrap(state: DesignState): SchedulerBootstrapDto {
  const { role } = state.controls;
  const master = role === "master";
  const professional = state.catalog.professionals[0]!;
  const branches = state.catalog.branches.filter(
    (_, index) => master || index === 0,
  );
  return {
    user: {
      id: `design-${role}`,
      name: {
        master: "PO · Master demo",
        specialist: "Especialista demo",
        "read-only": "Consulta demo",
      }[role],
      email: `${role}@example.test`,
      role: master ? "SUPER_ADMIN" : "CAPTURISTA",
      employeeId: professional.employeeId,
      positionId: `design-position-${role}`,
      positionName: role,
    },
    canManageAccess: master,
    selfProfessionalOnly: role === "specialist",
    professionalEmployeeId:
      role === "specialist" ? professional.employeeId : null,
    permissions: SCHEDULER_SCREEN_KEYS.filter(
      (key) =>
        master ||
        (!key.includes("/administration/") && !key.includes("/settings/")),
    ).map((screenKey) => ({
      screenKey,
      capabilities: master
        ? [...SCHEDULER_CAPABILITIES]
        : role === "read-only"
          ? ["READ"]
          : ["READ", "WRITE"],
    })),
    authorizedBranches: branches.map((branch) => ({
      id: branch.branchId,
      name: branch.branchName,
      active: branch.active,
    })),
    authorizedBranchIds: branches.map((branch) => branch.branchId),
    branchScope: master ? "ALL_ACTIVE" : "ASSIGNED",
    secondaryAuthorizationConfigured: true,
    mockModeEnabled: true,
  };
}
