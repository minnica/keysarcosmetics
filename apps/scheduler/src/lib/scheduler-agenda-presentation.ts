import type {
  SchedulerAppointmentDto,
  SchedulerAppointmentServiceDto,
  SchedulerAppointmentStatus,
  SchedulerOperationalCatalogDto,
  SchedulerScheduleBlockDto,
} from "@cosmetics/types";

export type SchedulerAgendaColumnKind = "PROFESSIONAL" | "RESOURCE" | "QUEUE";

export interface SchedulerAgendaColumn {
  id: string;
  entityId: string | null;
  branchProfileId: string;
  kind: SchedulerAgendaColumnKind;
  label: string;
  active: boolean;
  avatarUrl: string | null;
}

export interface SchedulerAgendaParticipant {
  id: string;
  name: string;
  role: "PRIMARY" | "SUPPORT" | "RESOURCE";
  units: number | null;
  exclusive: boolean | null;
}

export interface SchedulerAgendaService {
  id: string;
  sequence: number;
  serviceProfileId: string;
  serviceName: string;
  serviceVersion: number;
  durationMinutes: number;
  preparationMinutes: number;
  cleanupMinutes: number;
  capacityUnits: number;
  startsAt: string;
  endsAt: string;
  occupiesFrom: string;
  occupiesUntil: string;
  participants: SchedulerAgendaParticipant[];
  membership: SchedulerAppointmentServiceDto["membership"];
}

export interface SchedulerAgendaContact {
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface SchedulerAgendaAppointment {
  id: string;
  branchId: string;
  branchProfileId: string;
  branchName: string;
  customerId: string;
  customerName: string;
  status: SchedulerAppointmentStatus;
  statusLabel: string;
  origin: SchedulerAppointmentDto["origin"];
  timezone: string;
  startsAt: string;
  endsAt: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  columnIds: string[];
  services: SchedulerAgendaService[];
  contact: SchedulerAgendaContact;
  totalPrice: number | null;
  version: number;
  canonical: SchedulerAppointmentDto;
}

export interface SchedulerAgendaBlock {
  id: string;
  branchId: string;
  branchProfileId: string;
  professionalProfileId: string | null;
  resourceId: string | null;
  timezone: string;
  startsAt: string;
  endsAt: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  reason: string;
  status: SchedulerScheduleBlockDto["status"];
  version: number;
  columnIds: string[];
  canonical: SchedulerScheduleBlockDto;
}

export interface SchedulerAgendaPresentation {
  columns: SchedulerAgendaColumn[];
  appointments: SchedulerAgendaAppointment[];
  blocks: SchedulerAgendaBlock[];
}

export interface SchedulerAppointmentPresentationExtras {
  contact?: Partial<SchedulerAgendaContact>;
  totalPrice?: number | null;
}

export const schedulerAppointmentStatusLabels: Record<
  SchedulerAppointmentStatus,
  string
> = {
  PENDING: "Pendiente",
  RESERVED: "Reservada",
  CONFIRMED: "Confirmada",
  ARRIVED: "Llegó",
  WAITING: "En espera",
  ATTENDED: "Atendida",
  NO_SHOW: "No asistió",
  CANCELED: "Cancelada",
};

function zonedParts(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function adaptService(
  service: SchedulerAppointmentServiceDto,
): SchedulerAgendaService {
  return {
    id: service.id,
    sequence: service.sequence,
    serviceProfileId: service.serviceProfileId,
    serviceName: service.serviceName,
    serviceVersion: service.serviceVersion,
    durationMinutes: service.durationMinutes,
    preparationMinutes: service.preparationMinutes,
    cleanupMinutes: service.cleanupMinutes,
    capacityUnits: service.capacityUnits,
    startsAt: service.startsAt,
    endsAt: service.endsAt,
    occupiesFrom: service.occupiesFrom,
    occupiesUntil: service.occupiesUntil,
    participants: [
      ...service.professionals.map((professional) => ({
        id: professional.professionalProfileId,
        name: professional.name,
        role: professional.role,
        units: null,
        exclusive: null,
      })),
      ...service.resources.map((resource) => ({
        id: resource.resourceId,
        name: resource.name,
        role: "RESOURCE" as const,
        units: resource.units,
        exclusive: resource.exclusive,
      })),
    ],
    membership: service.membership,
  };
}

export function adaptSchedulerAppointment(
  appointment: SchedulerAppointmentDto,
  extras: SchedulerAppointmentPresentationExtras = {},
): SchedulerAgendaAppointment {
  const start = zonedParts(appointment.startsAt, appointment.timezone);
  const end = zonedParts(appointment.endsAt, appointment.timezone);
  const services = appointment.services
    .slice()
    .sort((left, right) => left.sequence - right.sequence)
    .map(adaptService);
  const columnIds = new Set<string>();
  for (const service of appointment.services) {
    for (const professional of service.professionals) {
      columnIds.add(`professional:${professional.professionalProfileId}`);
    }
    for (const resource of service.resources) {
      columnIds.add(`resource:${resource.resourceId}`);
    }
  }

  return {
    id: appointment.id,
    branchId: appointment.branchId,
    branchProfileId: appointment.branchProfileId,
    branchName: appointment.branchName,
    customerId: appointment.customerId,
    customerName: appointment.customerName,
    status: appointment.status,
    statusLabel: schedulerAppointmentStatusLabels[appointment.status],
    origin: appointment.origin,
    timezone: appointment.timezone,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    localDate: start.date,
    localStart: start.time,
    localEnd: end.time,
    columnIds: [...columnIds],
    services,
    contact: {
      phone: extras.contact?.phone ?? null,
      email: extras.contact?.email ?? null,
      avatarUrl: extras.contact?.avatarUrl ?? null,
    },
    totalPrice: extras.totalPrice ?? null,
    version: appointment.version,
    canonical: appointment,
  };
}

export function adaptSchedulerBlock(
  block: SchedulerScheduleBlockDto,
): SchedulerAgendaBlock {
  const start = zonedParts(block.startsAt, block.timezone);
  const end = zonedParts(block.endsAt, block.timezone);
  const columnIds = [
    ...(block.professionalProfileId
      ? [`professional:${block.professionalProfileId}`]
      : []),
    ...(block.resourceId ? [`resource:${block.resourceId}`] : []),
  ];
  return {
    id: block.id,
    branchId: block.branchId,
    branchProfileId: block.branchProfileId,
    professionalProfileId: block.professionalProfileId,
    resourceId: block.resourceId,
    timezone: block.timezone,
    startsAt: block.startsAt,
    endsAt: block.endsAt,
    localDate: start.date,
    localStart: start.time,
    localEnd: end.time,
    reason: block.reason,
    status: block.status,
    version: block.version,
    columnIds,
    canonical: block,
  };
}

export function buildSchedulerAgendaPresentation({
  catalog,
  branchId,
  appointments,
  blocks,
  appointmentExtras = {},
}: {
  catalog: SchedulerOperationalCatalogDto;
  branchId: string;
  appointments: SchedulerAppointmentDto[];
  blocks: SchedulerScheduleBlockDto[];
  appointmentExtras?: Record<string, SchedulerAppointmentPresentationExtras>;
}): SchedulerAgendaPresentation {
  const branch = catalog.branches.find(
    (candidate) => candidate.branchId === branchId,
  );
  if (!branch) return { columns: [], appointments: [], blocks: [] };

  const columns: SchedulerAgendaColumn[] = [
    ...catalog.professionals
      .filter((professional) =>
        professional.branchProfileIds.includes(branch.id),
      )
      .map((professional) => ({
        id: `professional:${professional.id}`,
        entityId: professional.id,
        branchProfileId: branch.id,
        kind: "PROFESSIONAL" as const,
        label: professional.name,
        active: professional.active,
        avatarUrl: null,
      })),
    ...catalog.resources
      .filter((resource) => resource.branchProfileId === branch.id)
      .map((resource) => ({
        id: `resource:${resource.id}`,
        entityId: resource.id,
        branchProfileId: branch.id,
        kind: "RESOURCE" as const,
        label: resource.name,
        active: resource.active,
        avatarUrl: null,
      })),
  ];

  return {
    columns,
    appointments: appointments.map((appointment) =>
      adaptSchedulerAppointment(appointment, appointmentExtras[appointment.id]),
    ),
    blocks: blocks.map(adaptSchedulerBlock),
  };
}
