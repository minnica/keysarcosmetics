import type {
  SchedulerAppointmentDto,
  SchedulerAppointmentServiceDto,
  SchedulerAppointmentStatus,
  SchedulerOperationalCatalogDto,
  SchedulerScheduleBlockDto,
} from "@cosmetics/types";
import type { CommerceOperatingHours } from "./commerce-operating-hours";
import type {
  AvailabilityBlock,
  Booking,
  BookingStatus,
  Professional,
  ServiceOption,
} from "./scheduler-presentation";

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

export const schedulerCanonicalToBookingStatus: Record<
  SchedulerAppointmentStatus,
  BookingStatus
> = {
  PENDING: "pending",
  RESERVED: "reserved",
  CONFIRMED: "confirmed",
  ARRIVED: "arrived",
  WAITING: "waiting",
  ATTENDED: "attended",
  NO_SHOW: "no-show",
  CANCELED: "canceled",
};

export const schedulerBookingToCanonicalStatus: Record<
  BookingStatus,
  SchedulerAppointmentStatus
> = {
  pending: "PENDING",
  reserved: "RESERVED",
  confirmed: "CONFIRMED",
  arrived: "ARRIVED",
  waiting: "WAITING",
  attended: "ATTENDED",
  "no-show": "NO_SHOW",
  canceled: "CANCELED",
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

const columnAccents = [
  "#c3a583",
  "#b994a8",
  "#89a7a0",
  "#95a8bd",
  "#b9a77d",
  "#aa9387",
];

function shortName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es-MX") ?? "")
    .join("");
}

export function buildSchedulerVisualColumns(
  presentation: SchedulerAgendaPresentation,
  commerceId: string,
  branchId: string,
): Professional[] {
  return presentation.columns
    .filter((column) => column.active)
    .map((column, index) => ({
      id: column.id,
      ...(column.entityId ? { entityId: column.entityId } : {}),
      kind: column.kind === "RESOURCE" ? "RESOURCE" : "PROFESSIONAL",
      commerceIds: [commerceId],
      branchIds: [branchId],
      name: column.label,
      shortName: shortName(column.label),
      avatar: column.avatarUrl ?? "",
      accent: columnAccents[index % columnAccents.length] ?? columnAccents[0]!,
    }));
}

export function buildSchedulerVisualBookings(
  presentation: SchedulerAgendaPresentation,
): Booking[] {
  return presentation.appointments.flatMap((appointment) => {
    const columnIds = appointment.columnIds.length
      ? appointment.columnIds
      : ["queue:unassigned"];
    return columnIds.map((columnId) => ({
      id: `${appointment.id}:${columnId}`,
      sourceId: appointment.id,
      version: appointment.version,
      clientId: appointment.customerId,
      branchId: appointment.branchId,
      date: appointment.localDate,
      customerName: appointment.customerName,
      serviceName: appointment.services
        .map((service) => service.serviceName)
        .join(" · "),
      professionalId: columnId,
      start: appointment.localStart,
      end: appointment.localEnd,
      status: schedulerCanonicalToBookingStatus[appointment.status],
      phone: appointment.contact.phone ?? "",
      ...(appointment.contact.email
        ? { customerEmail: appointment.contact.email }
        : {}),
      ...(appointment.canonical.notes
        ? { notes: appointment.canonical.notes }
        : {}),
      paymentLabel:
        appointment.totalPrice == null
          ? "Precio no disponible"
          : "Importe de la cita",
      totalPrice: appointment.totalPrice,
      ...(appointment.totalPrice == null
        ? {}
        : { purchaseAmount: appointment.totalPrice }),
    }));
  });
}

function blockColumnIds(
  block: SchedulerAgendaBlock,
  columns: SchedulerAgendaColumn[],
): string[] {
  return block.columnIds.length
    ? block.columnIds
    : columns.filter((column) => column.active).map((column) => column.id);
}

export function buildSchedulerVisualBlocks(
  presentation: SchedulerAgendaPresentation,
  catalog: SchedulerOperationalCatalogDto,
): AvailabilityBlock[] {
  const persisted = presentation.blocks
    .filter((block) => block.status === "ACTIVE")
    .flatMap((block) =>
      blockColumnIds(block, presentation.columns).map((columnId) => ({
        id: `${block.id}:${columnId}`,
        sourceId: block.id,
        branchId: block.branchId,
        date: block.localDate,
        professionalId: columnId,
        start: block.localStart,
        end: block.localEnd,
        label: block.reason,
        variant: "blocked" as const,
      })),
    );

  const branchProfileId = presentation.columns[0]?.branchProfileId;
  if (!branchProfileId) return persisted;
  const exceptions = catalog.availabilityExceptions
    .filter(
      (exception) =>
        exception.branchProfileId === branchProfileId &&
        exception.kind === "UNAVAILABLE" &&
        exception.effectiveTo === null,
    )
    .flatMap((exception) => {
      const columns =
        exception.ownerType === "BRANCH"
          ? presentation.columns.filter((column) => column.active)
          : presentation.columns.filter(
              (column) =>
                column.entityId === exception.ownerId &&
                column.kind === exception.ownerType,
            );
      return columns.map((column) => ({
        id: `exception:${exception.id}:${column.id}`,
        sourceId: exception.id,
        branchId:
          catalog.branches.find((branch) => branch.id === branchProfileId)
            ?.branchId ?? "",
        date: exception.date,
        professionalId: column.id,
        start: minutesToTime(exception.startMinute ?? 0),
        end: minutesToTime(exception.endMinute ?? 24 * 60),
        label: exception.reason || "No disponible",
        variant: "unavailable" as const,
      }));
    });

  return [...persisted, ...exceptions];
}

export function buildSchedulerVisualServices(
  catalog: SchedulerOperationalCatalogDto,
  branchProfileId: string,
): ServiceOption[] {
  return catalog.services
    .filter(
      (service) =>
        service.active && service.branchProfileIds.includes(branchProfileId),
    )
    .map((service) => ({
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      // The operational catalog intentionally has no commercial price.
      price: 0,
    }));
}

const weekdayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
const weekdayKeys = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function minutesToTime(value: number): string {
  const safe = Math.max(0, Math.min(24 * 60, value));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function localDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function buildSchedulerCanonicalOperatingHours(
  catalog: SchedulerOperationalCatalogDto,
  branchId: string,
  visibleDates: Date[],
): CommerceOperatingHours {
  const branch = catalog.branches.find(
    (candidate) => candidate.branchId === branchId,
  );
  const schedule = weekdayNames
    .slice(1)
    .concat(weekdayNames[0])
    .map((day) => ({ day, enabled: false, open: "00:00", close: "00:00" }));
  if (!branch) return { commerceId: "", is24Hours: false, schedule };

  for (const date of visibleDates) {
    const dayName = weekdayNames[date.getDay()]!;
    const dayKey = weekdayKeys[date.getDay()]!;
    const target = schedule.find((day) => day.day === dayName);
    if (!target) continue;
    const working = catalog.availabilityRules.filter(
      (rule) =>
        rule.branchProfileId === branch.id &&
        rule.ownerType === "BRANCH" &&
        rule.ownerId === branch.id &&
        rule.kind === "WORKING" &&
        rule.weekday === dayKey &&
        rule.effectiveTo === null,
    );
    const dateKey = localDateKey(date);
    const exceptions = catalog.availabilityExceptions.filter(
      (exception) =>
        exception.branchProfileId === branch.id &&
        exception.ownerType === "BRANCH" &&
        exception.ownerId === branch.id &&
        exception.date === dateKey &&
        exception.effectiveTo === null,
    );
    const closesAllDay = exceptions.some(
      (exception) =>
        exception.kind === "UNAVAILABLE" &&
        exception.startMinute === null &&
        exception.endMinute === null,
    );
    if (closesAllDay) continue;
    const available = exceptions.filter(
      (exception) => exception.kind === "AVAILABLE",
    );
    const windows = [
      ...working.map((rule) => [rule.startMinute, rule.endMinute] as const),
      ...available.map(
        (exception) =>
          [exception.startMinute ?? 0, exception.endMinute ?? 24 * 60] as const,
      ),
    ];
    if (!windows.length) continue;
    target.enabled = true;
    target.open = minutesToTime(Math.min(...windows.map(([start]) => start)));
    target.close = minutesToTime(Math.max(...windows.map(([, end]) => end)));
  }

  return { commerceId: branch.commerceId, is24Hours: false, schedule };
}
