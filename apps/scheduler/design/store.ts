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
import type {
  DesignAppointmentAnswer,
  DesignAppointmentCabinVisit,
  DesignMovementRecord,
  DesignOperationAgentSource,
  DesignOperationPurpose,
} from "./contracts";

export const designOrigin = "https://scheduler-design.invalid";
export type DesignRole = "master" | "specialist" | "read-only";
export type DesignAccountId =
  | "full-master"
  | "full-operations"
  | "limited-polanco"
  | "read-only-legacy";
export interface DesignDemoAccount {
  id: DesignAccountId;
  email: string;
  password: string;
  authorizationCode: string;
  role: DesignRole;
  name: string;
  positionName: string;
  accessLabel: string;
}
export const designDemoAccounts: readonly DesignDemoAccount[] = [
  {
    id: "full-master",
    email: "master@example.test",
    password: "demo",
    authorizationCode: "0000",
    role: "master",
    name: "PO · Master demo",
    positionName: "Administración general",
    accessLabel: "Acceso total",
  },
  {
    id: "full-operations",
    email: "operations@example.test",
    password: "demo",
    authorizationCode: "3333",
    role: "master",
    name: "Alejandra Ruiz · Coordinación demo",
    positionName: "Coordinación operativa",
    accessLabel: "Acceso total",
  },
  {
    id: "limited-polanco",
    email: "limited@example.test",
    password: "demo",
    authorizationCode: "4444",
    role: "specialist",
    name: "Daniela Mora · Recepción demo",
    positionName: "Recepción Polanco",
    accessLabel: "Acceso limitado",
  },
] as const;
const legacyReadOnlyAccount: DesignDemoAccount = {
  id: "read-only-legacy",
  email: "read-only@example.test",
  password: "demo",
  authorizationCode: "2222",
  role: "read-only",
  name: "Consulta demo",
  positionName: "Solo consulta",
  accessLabel: "Solo lectura",
};
export type DesignScenario = "normal" | "empty" | "slow" | "error" | "conflict";
export type DesignRow = Record<string, unknown>;
export interface DesignControls {
  role: DesignRole;
  accountId?: DesignAccountId;
  scenario: DesignScenario;
  date: string;
}
export interface DesignMovement {
  id: string;
  actorId: string;
  actor: string;
  actorRole: string;
  actorSource: DesignOperationAgentSource | "SESSION";
  action: string;
  purpose: DesignOperationPurpose | "SYSTEM_WRITE";
  targetType: string;
  targetId: string;
  createdAt: string;
  metadata: Record<string, string>;
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

export function designAccountForControls(
  controls: Pick<DesignControls, "role" | "accountId">,
): DesignDemoAccount {
  return (
    designDemoAccounts.find((account) => account.id === controls.accountId) ??
    designDemoAccounts.find((account) => account.role === controls.role) ??
    (controls.role === "read-only" ? legacyReadOnlyAccount : undefined) ??
    designDemoAccounts[0]!
  );
}

export function designSessionToken(accountId: DesignAccountId): string {
  return `design-token-${accountId}`;
}

export function createDesignState(
  controls: DesignControls = {
    role: "master",
    accountId: "full-master",
    scenario: "normal",
    date: designToday(),
  },
) {
  const selectedAccount = designAccountForControls(controls);
  const normalizedControls = {
    ...controls,
    accountId: selectedAccount.id,
    role: selectedAccount.role,
  };
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
  const customerNames = [
    "María Camila Celis",
    "Ana Torres Ruiz",
    "Lucía Velasco Pérez",
    "Sofía Mendoza Lara",
  ];
  const customerBirthDates = [
    "1988-09-12",
    "1993-05-21",
    "1985-11-03",
    "1990-09-30",
  ];
  const customerTypes = ["VIP", "Frecuente", "Nuevo", "Frecuente"];
  const salesOwners = [
    "Renata Castillo",
    "Camila Torres",
    "Venta de empresa",
    "Renata Castillo",
  ];
  const customers: SchedulerCustomerDetailDto[] = customerNames.map(
    (name, index) => {
      const branch = catalog.branches[index % catalog.branches.length]!;
      const professional =
        catalog.professionals[index % catalog.professionals.length]!;
      return {
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
            branchId: branch.branchId,
            branchName: branch.branchName,
            employeeId: professional.employeeId,
            ownerName: salesOwners[index]!,
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
        customFields: [
          {
            definitionId: "design-field-birthday",
            definitionVersion: 1,
            key: "birthDate",
            label: "Fecha de nacimiento",
            type: "DATE",
            value: customerBirthDates[index]!,
          },
          {
            definitionId: "design-field-type",
            definitionVersion: 1,
            key: "customerType",
            label: "Tipo de cliente",
            type: "SELECT",
            value: customerTypes[index]!,
          },
          {
            definitionId: "design-field-sales-owner",
            definitionVersion: 1,
            key: "salesOwner",
            label: "Vendedor responsable",
            type: "SELECT",
            value: salesOwners[index]!,
          },
          {
            definitionId: "design-field-attending-specialist",
            definitionVersion: 1,
            key: "attendingSpecialist",
            label: "Especialista que atendió",
            type: "SELECT",
            value: professional.name,
          },
        ],
        mergeHistory: [],
      };
    },
  );
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
    {
      id: "design-field-sales-owner",
      commerceId: catalog.commerces[0]!.id,
      key: "salesOwner",
      label: "Vendedor responsable",
      type: "SELECT",
      options: ["Renata Castillo", "Camila Torres", "Venta de empresa"],
      required: false,
      active: true,
      version: 1,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
    },
    {
      id: "design-field-attending-specialist",
      commerceId: catalog.commerces[0]!.id,
      key: "attendingSpecialist",
      label: "Especialista que atendió",
      type: "SELECT",
      options: catalog.professionals.map((professional) => professional.name),
      required: false,
      active: true,
      version: 1,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
    },
  ];
  const now = new Date().toISOString();
  const operationAgents = [
    ...designDemoAccounts.map((account) => ({
      id: `design-agent-${account.id}`,
      externalId: `design-${account.id}`,
      name: account.name,
      role: account.positionName,
      source: "SCHEDULER" as const,
      active: true,
      code: account.authorizationCode,
      allowedPurposes: [
        "APPOINTMENT_CREATE",
        "APPOINTMENT_UPDATE",
        "APPOINTMENT_MOVE",
        "APPOINTMENT_STATUS_CHANGE",
        "APPOINTMENT_CANCEL",
        "SCHEDULE_BLOCK_CREATE",
        "SCHEDULE_BLOCK_UPDATE",
        "SCHEDULE_BLOCK_DELETE",
        "CUSTOMER_UPDATE",
        "PURCHASE_CAPTURE",
      ] as DesignOperationPurpose[],
      updatedAt: now,
    })),
    ...schedulerAdministrationCandidatesFixture.employees.map(
      (employee, index) => ({
        id: `design-agent-${employee.id}`,
        externalId: employee.id,
        name: employee.name,
        role: employee.positionName,
        source: "POS_CRM" as const,
        active: employee.active,
        code: ["1111", "2222", "5555"][index]!,
        allowedPurposes: [
          "APPOINTMENT_CREATE",
          "APPOINTMENT_UPDATE",
          "APPOINTMENT_MOVE",
          "APPOINTMENT_STATUS_CHANGE",
          "APPOINTMENT_CANCEL",
          "CUSTOMER_UPDATE",
          "PURCHASE_CAPTURE",
        ] as DesignOperationPurpose[],
        updatedAt: now,
      }),
    ),
  ];
  const state = {
    controls: normalizedControls,
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
      {
        accountId: DesignAccountId;
        purpose: string;
        targetId: string;
        expiresAt: number;
      }
    >(),
    operationAgents,
    usedAuthorizationCodes: new Set(operationAgents.map((agent) => agent.code)),
    operationAuthorizations: new Map<
      string,
      {
        agentId: string;
        purpose: DesignOperationPurpose;
        targetType: string;
        targetId: string;
        expiresAt: number;
      }
    >(),
    customerEditAccess: new Map<
      string,
      { role: DesignRole; expiresAt: number }
    >(),
    appointmentAnswers: {} as Record<string, DesignAppointmentAnswer[]>,
    appointmentCabinVisits: {} as Record<string, DesignAppointmentCabinVisit>,
    idempotency: new Map<string, { payload: string; result: unknown }>(),
    movements: [] as Array<DesignMovement | DesignMovementRecord>,
  };
  if (controls.scenario !== "empty") {
    for (let index = 0; index < 3; index += 1) {
      const customerBranchId =
        customers[index]!.currentPortfolios[0]!.branchId ??
        catalog.branches[0]!.branchId;
      const service = index === 2 ? catalog.services[1]! : catalog.services[0]!;
      const appointment = buildDesignAppointment(state, {
        branchId: customerBranchId,
        customerId: customers[index]!.id,
        startsAt: designInstant(controls.date, (9 + index * 3) * 60),
        services: [
          {
            serviceProfileId: service.id,
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
    const attendedAppointment = state.appointments[1];
    const mitikahCabin = catalog.resources.find(
      (resource) => resource.id === "resource-rv4-2-double",
    );
    if (attendedAppointment && mitikahCabin) {
      state.appointmentCabinVisits[attendedAppointment.id] = {
        appointmentId: attendedAppointment.id,
        cabinResourceId: mitikahCabin.id,
        cabinName: mitikahCabin.name,
        cabinCapacity: mitikahCabin.capacity,
        visitors: [
          {
            id: "design-visitor-primary",
            customerId: attendedAppointment.customerId,
            name: attendedAppointment.customerName,
            specialistProfileId: catalog.professionals[0]!.id,
            purchased: true,
            purchaseAmount: 1850,
            purchaseKind: "FULL",
            saleAmount: 1850,
            depositAmount: 1850,
          },
          {
            id: "design-visitor-companion",
            customerId: null,
            name: "Visitante demostración",
            specialistProfileId: catalog.professionals[1]!.id,
            purchased: true,
            purchaseAmount: 2400,
            purchaseKind: "LAYAWAY",
            saleAmount: 2400,
            depositAmount: 600,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
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
  const account = designAccountForControls(state.controls);
  const master = role === "master";
  const professional = state.catalog.professionals[0]!;
  const branches = state.catalog.branches.filter(
    (_, index) => master || index === 0,
  );
  return {
    user: {
      id: `design-${account.id}`,
      name: account.name,
      email: account.email,
      role: master ? "SUPER_ADMIN" : "CAPTURISTA",
      employeeId: professional.employeeId,
      positionId: `design-position-${account.id}`,
      positionName: account.positionName,
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
