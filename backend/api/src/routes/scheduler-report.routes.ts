import { Prisma, type SchedulerAppointmentStatus } from "@prisma/client";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { z } from "zod";
import {
  SCHEDULER_APPOINTMENT_STATUSES,
  SCHEDULER_MESSAGE_CHANNELS,
  SCHEDULER_REPORT_KEYS,
  type SchedulerReportCell,
  type SchedulerReportDatasetDto,
  type SchedulerReportKey,
} from "@cosmetics/types";
import { prisma } from "../prisma/client";
import {
  consumeSchedulerAuthorization,
  hasSchedulerCapability,
  resolveSchedulerAccessForRequest,
  schedulerRequestAuditContext,
} from "../services/scheduler-access";
import {
  intersectSchedulerWindows,
  resolveSchedulerDailyWindows,
  schedulerLocalDateKey,
  schedulerLocalDateRangeUtc,
  schedulerLocalMinute,
} from "../services/scheduler-appointments";
import {
  calculateSchedulerCommission,
  resolveSchedulerReportPeriod,
  schedulerReportDates,
  schedulerReportIntervalMinutes,
  schedulerReportOverlapMinutes,
  schedulerReportPage,
  schedulerReportPercentage,
  schedulerReportRating,
  schedulerReportScreen,
  schedulerReportSearchMetadata,
  subtractSchedulerReportIntervals,
} from "../services/scheduler-reporting";

const router: ExpressRouter = Router();
const reportKeySchema = z.enum(SCHEDULER_REPORT_KEYS);
const querySchema = z
  .object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    branchIds: z.string().optional(),
    professionalProfileId: z.string().trim().min(1).optional(),
    serviceProfileId: z.string().trim().min(1).optional(),
    status: z.enum(SCHEDULER_APPOINTMENT_STATUSES).optional(),
    channel: z.enum(SCHEDULER_MESSAGE_CHANNELS).optional(),
    source: z.enum(["CANONICAL", "LEGACY"]).default("CANONICAL"),
    search: z.string().trim().max(160).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(50),
  })
  .strict();

type ReportRow = Record<string, SchedulerReportCell>;
type ParsedQuery = z.infer<typeof querySchema>;
type BranchProfile = {
  id: string;
  branchId: string;
  commerceId: string;
  timezone: string;
  branch: { id: string; nombre: string };
};
type ReportContext = {
  query: ParsedQuery;
  branchIds: string[];
  profiles: BranchProfile[];
  ownProfessionalProfileId: string | null;
};
type ReportResult = {
  rows: ReportRow[];
  summary: Record<string, SchedulerReportCell>;
  authority: SchedulerReportDatasetDto["sourceAuthority"];
  notes?: string[];
};

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };

const money = (value: Prisma.Decimal | null | undefined) =>
  value?.toFixed(2) ?? "0.00";
const decimal = (value: Prisma.Decimal | null | undefined) =>
  Number(value?.toString() ?? 0);
const unique = (values: string[]) => [...new Set(values)];
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");
const dateOnly = (value: Date) => value.toISOString().slice(0, 10);

function requestedBranches(value?: string): string[] {
  return unique(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function rowMatches(row: ReportRow, search?: string): boolean {
  if (!search) return true;
  const needle = normalize(search);
  return Object.values(row).some(
    (value) => value != null && normalize(String(value)).includes(needle),
  );
}

function canonicalRanges(
  profiles: BranchProfile[],
  dateFrom: string,
  dateTo: string,
) {
  return profiles.map((profile) => ({
    branchProfileId: profile.id,
    startsAt: {
      gte: schedulerLocalDateRangeUtc(dateFrom, profile.timezone).start,
      lt: schedulerLocalDateRangeUtc(dateTo, profile.timezone).end,
    },
  }));
}

async function reportContext(
  req: Request,
  query: ParsedQuery,
): Promise<ReportContext> {
  const access = req.schedulerAccess!;
  const authorized = access.authorizedBranches.map((branch) => branch.id);
  const requested = requestedBranches(query.branchIds);
  if (requested.some((id) => !authorized.includes(id))) {
    throw Object.assign(
      new Error("No tienes acceso a una sucursal solicitada"),
      { status: 403 },
    );
  }
  const branchIds = requested.length ? requested : authorized;
  if (branchIds.length === 0) {
    throw Object.assign(
      new Error("La sesión no tiene sucursales autorizadas"),
      { status: 403 },
    );
  }
  const profiles = await prisma.schedulerBranchProfile.findMany({
    where: { branchId: { in: branchIds } },
    select: {
      id: true,
      branchId: true,
      commerceId: true,
      timezone: true,
      branch: { select: { id: true, nombre: true } },
    },
  });
  const ownProfessional = access.selfProfessionalOnly
    ? await prisma.schedulerProfessionalProfile.findUnique({
        where: { employeeId: access.professionalEmployeeId ?? "__none__" },
        select: { id: true },
      })
    : null;
  if (access.selfProfessionalOnly && !ownProfessional) {
    throw Object.assign(
      new Error(
        "Tu identidad no está configurada como profesional de Scheduler",
      ),
      { status: 403 },
    );
  }
  if (
    access.selfProfessionalOnly &&
    query.professionalProfileId &&
    query.professionalProfileId !== ownProfessional?.id
  ) {
    throw Object.assign(new Error("No puedes consultar otro profesional"), {
      status: 403,
    });
  }
  return {
    query,
    branchIds,
    profiles,
    ownProfessionalProfileId: ownProfessional?.id ?? null,
  };
}

function professionalFilter(context: ReportContext): string | undefined {
  return (
    context.ownProfessionalProfileId ?? context.query.professionalProfileId
  );
}

async function canonicalAppointments(
  context: ReportContext,
  fixedStatus?: SchedulerAppointmentStatus,
) {
  const ranges = canonicalRanges(
    context.profiles,
    context.query.dateFrom,
    context.query.dateTo,
  );
  if (!ranges.length) return [];
  const professionalProfileId = professionalFilter(context);
  const status = fixedStatus ?? context.query.status;
  return prisma.schedulerAppointment.findMany({
    where: {
      OR: ranges,
      ...(status ? { status } : {}),
      AND: [
        ...(context.query.serviceProfileId
          ? [
              {
                services: {
                  some: { serviceProfileId: context.query.serviceProfileId },
                },
              },
            ]
          : []),
        ...(professionalProfileId
          ? [
              {
                services: {
                  some: { participants: { some: { professionalProfileId } } },
                },
              },
            ]
          : []),
      ],
    },
    include: {
      branchProfile: {
        include: { branch: { select: { id: true, nombre: true } } },
      },
      customer: {
        select: {
          id: true,
          displayName: true,
          source: { select: { name: true } },
        },
      },
      services: {
        orderBy: { sequence: "asc" },
        include: {
          serviceProfile: { select: { catalogItemId: true } },
          participants: { orderBy: { role: "asc" } },
        },
      },
      posAppointments: {
        include: {
          ticket: {
            select: { id: true, folio: true, total: true, amountPaid: true },
          },
        },
      },
    },
    orderBy: [{ startsAt: "desc" }, { id: "asc" }],
  });
}

function canonicalAppointmentRows(
  appointments: Awaited<ReturnType<typeof canonicalAppointments>>,
  search?: string,
): ReportRow[] {
  return appointments
    .map<ReportRow>((appointment) => {
      const ticketMap = new Map(
        appointment.posAppointments.map((item) => [
          item.ticket.id,
          item.ticket,
        ]),
      );
      const tickets = [...ticketMap.values()];
      const sales = tickets.reduce(
        (sum, ticket) => sum.plus(ticket.total),
        new Prisma.Decimal(0),
      );
      const paid = tickets.reduce(
        (sum, ticket) => sum.plus(ticket.amountPaid),
        new Prisma.Decimal(0),
      );
      const professionalIds = unique(
        appointment.services.flatMap((service) =>
          service.participants.map((item) => item.professionalProfileId),
        ),
      );
      return {
        appointment_id: appointment.id,
        branch_id: appointment.branchProfile.branch.id,
        Fecha: schedulerLocalDateKey(
          appointment.startsAt,
          appointment.timezone,
        ),
        Inicio: appointment.startsAt.toISOString(),
        Fin: appointment.endsAt.toISOString(),
        "Zona horaria": appointment.timezone,
        Sucursal: appointment.branchProfile.branch.nombre,
        Cliente: appointment.customer.displayName,
        Procedencia: appointment.customer.source?.name ?? null,
        Servicios: appointment.services
          .map((service) => service.serviceNameSnapshot)
          .join(" / "),
        Profesionales: unique(
          appointment.services.flatMap((service) =>
            service.participants.map((item) => item.professionalNameSnapshot),
          ),
        ).join(" / "),
        professional_profile_ids: professionalIds.join(","),
        Estado: appointment.status,
        Origen: appointment.origin,
        Fuente: "SCHEDULER_CANONICAL",
        "Tickets POS":
          tickets.map((ticket) => ticket.folio).join(" / ") || null,
        Venta: sales.toFixed(2),
        Cobrado: paid.toFixed(2),
      };
    })
    .filter((row) => rowMatches(row, search));
}

async function legacyAppointmentRows(
  context: ReportContext,
  fixedStatus?: "ATENDIDA" | "NO_LLEGO" | "CANCELADA",
) {
  if (context.query.serviceProfileId) {
    throw Object.assign(
      new Error("El legado no tiene una identidad canónica de servicio"),
      { status: 400 },
    );
  }
  if (
    !fixedStatus &&
    context.query.status &&
    !["ATTENDED", "NO_SHOW", "CANCELED"].includes(context.query.status)
  ) {
    throw Object.assign(
      new Error("El estado solicitado no existe en RegistroCita"),
      { status: 400 },
    );
  }
  const requestedProfessionalId = professionalFilter(context);
  const requestedProfessional = requestedProfessionalId
    ? await prisma.schedulerProfessionalProfile.findUnique({
        where: { id: requestedProfessionalId },
        select: { employeeId: true },
      })
    : null;
  if (requestedProfessionalId && !requestedProfessional) {
    throw Object.assign(new Error("El profesional solicitado no existe"), {
      status: 400,
    });
  }
  const status =
    fixedStatus ??
    (context.query.status === "ATTENDED"
      ? "ATENDIDA"
      : context.query.status === "NO_SHOW"
        ? "NO_LLEGO"
        : context.query.status === "CANCELED"
          ? "CANCELADA"
          : undefined);
  const records = await prisma.registroCita.findMany({
    where: {
      sucursalId: { in: context.branchIds },
      fecha: {
        gte: new Date(`${context.query.dateFrom}T00:00:00.000Z`),
        lt: new Date(
          `${resolveSchedulerReportPeriod(context.query.dateFrom, context.query.dateTo).dateToExclusive}T00:00:00.000Z`,
        ),
      },
      ...(status ? { estatus: status } : {}),
      ...(requestedProfessional
        ? { facialistaId: requestedProfessional.employeeId }
        : {}),
    },
    include: {
      sucursal: { select: { id: true, nombre: true } },
      facialista: { select: { id: true, nombreCompleto: true } },
      vendedor: { select: { nombreCompleto: true } },
      subcategoria: { select: { nombre: true } },
    },
    orderBy: [{ fecha: "desc" }, { hora: "desc" }],
  });
  return records
    .map<ReportRow>((record) => ({
      appointment_id: record.id,
      branch_id: record.sucursal.id,
      Fecha: dateOnly(record.fecha),
      Inicio: record.hora,
      Fin: null,
      "Zona horaria": "America/Mexico_City",
      Sucursal: record.sucursal.nombre,
      Cliente: record.nombreCliente,
      Procedencia: null,
      Servicios: record.subcategoria.nombre,
      Profesionales: record.facialista.nombreCompleto,
      professional_profile_ids: null,
      Estado: record.estatus,
      Origen: "REGISTRO_CITA",
      Fuente: "ENVELOPE_LEGACY",
      "Tickets POS": null,
      Venta: money(record.montoCompra),
      Cobrado: money(
        record.tipoCompra === "COMPRA_CON_APARTADO"
          ? record.montoApartado
          : record.montoCompra,
      ),
    }))
    .filter((row) => rowMatches(row, context.query.search));
}

async function appointmentReport(
  context: ReportContext,
  key: SchedulerReportKey,
): Promise<ReportResult> {
  const canonicalStatus =
    key === "CANCELLATIONS"
      ? "CANCELED"
      : key === "NO_SHOW"
        ? "NO_SHOW"
        : undefined;
  const legacyStatus =
    key === "CANCELLATIONS"
      ? "CANCELADA"
      : key === "NO_SHOW"
        ? "NO_LLEGO"
        : undefined;
  const rows =
    context.query.source === "LEGACY"
      ? await legacyAppointmentRows(context, legacyStatus)
      : canonicalAppointmentRows(
          await canonicalAppointments(context, canonicalStatus),
          context.query.search,
        );
  const totalSales = rows.reduce(
    (sum, row) => sum + Number(row["Venta"] ?? 0),
    0,
  );
  const counts = new Map<string, number>();
  rows.forEach((row) =>
    counts.set(
      String(row["Estado"]),
      (counts.get(String(row["Estado"])) ?? 0) + 1,
    ),
  );
  return {
    rows,
    summary: {
      Citas: rows.length,
      Atendidas: (counts.get("ATTENDED") ?? 0) + (counts.get("ATENDIDA") ?? 0),
      Canceladas:
        (counts.get("CANCELED") ?? 0) + (counts.get("CANCELADA") ?? 0),
      "No show": (counts.get("NO_SHOW") ?? 0) + (counts.get("NO_LLEGO") ?? 0),
      Venta: totalSales.toFixed(2),
    },
    authority:
      context.query.source === "LEGACY" ? "ENVELOPE_LEGACY" : "SCHEDULER",
    notes:
      context.query.source === "LEGACY"
        ? [
            "El legado se consulta de forma separada; no se infieren coincidencias por nombre con citas canónicas.",
          ]
        : [
            "SchedulerAppointment es la fuente canónica; RegistroCita no participa en estos totales.",
          ],
  };
}

function localBlockInterval(
  startsAt: Date,
  endsAt: Date,
  date: string,
  timezone: string,
) {
  const startDate = schedulerLocalDateKey(startsAt, timezone);
  const endDate = schedulerLocalDateKey(endsAt, timezone);
  return {
    startMinute:
      startDate < date ? 0 : schedulerLocalMinute(startsAt, timezone),
    endMinute: endDate > date ? 1440 : schedulerLocalMinute(endsAt, timezone),
  };
}

async function occupancyReport(context: ReportContext): Promise<ReportResult> {
  if (context.query.source === "LEGACY") {
    throw Object.assign(
      new Error(
        "El legado no contiene minutos suficientes para calcular ocupación",
      ),
      { status: 400 },
    );
  }
  const selectedProfessionalId = professionalFilter(context);
  const ranges = canonicalRanges(
    context.profiles,
    context.query.dateFrom,
    context.query.dateTo,
  );
  const earliest = context.profiles
    .map(
      (profile) =>
        schedulerLocalDateRangeUtc(context.query.dateFrom, profile.timezone)
          .start,
    )
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const latest = context.profiles
    .map(
      (profile) =>
        schedulerLocalDateRangeUtc(context.query.dateTo, profile.timezone).end,
    )
    .sort((a, b) => b.getTime() - a.getTime())[0];
  if (!earliest || !latest)
    return {
      rows: [],
      summary: {
        "Minutos disponibles": 0,
        "Minutos reservados": 0,
        Ocupación: "0.00",
      },
      authority: "SCHEDULER",
    };
  const assignments =
    await prisma.schedulerProfessionalBranchAssignment.findMany({
      where: {
        branchProfileId: { in: context.profiles.map((profile) => profile.id) },
        OR: [
          { active: true },
          { effectiveTo: { not: null } },
          { deactivatedAt: { not: null } },
        ],
        effectiveFrom: { lt: latest },
        AND: [
          { OR: [{ effectiveTo: null }, { effectiveTo: { gt: earliest } }] },
        ],
        ...(selectedProfessionalId
          ? { professionalProfileId: selectedProfessionalId }
          : {}),
      },
      include: {
        professionalProfile: {
          include: { employee: { select: { nombreCompleto: true } } },
        },
      },
    });
  const professionalIds = unique(
    assignments.map((item) => item.professionalProfileId),
  );
  const [rules, exceptions, blocks, services] = await Promise.all([
    prisma.schedulerAvailabilityRule.findMany({
      where: {
        branchProfileId: { in: context.profiles.map((profile) => profile.id) },
        AND: [
          {
            OR: [{ active: true }, { effectiveTo: { not: null } }],
          },
          {
            OR: [
              { professionalProfileId: null, resourceId: null },
              { professionalProfileId: { in: professionalIds } },
            ],
          },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gt: earliest } }] },
        ],
        effectiveFrom: { lt: latest },
      },
    }),
    prisma.schedulerAvailabilityException.findMany({
      where: {
        branchProfileId: { in: context.profiles.map((profile) => profile.id) },
        AND: [
          { OR: [{ active: true }, { effectiveTo: { not: null } }] },
          {
            OR: [
              { professionalProfileId: null, resourceId: null },
              { professionalProfileId: { in: professionalIds } },
            ],
          },
        ],
        date: {
          gte: new Date(`${context.query.dateFrom}T00:00:00.000Z`),
          lte: new Date(`${context.query.dateTo}T00:00:00.000Z`),
        },
        effectiveFrom: { lt: latest },
      },
    }),
    prisma.schedulerScheduleBlock.findMany({
      where: {
        branchProfileId: { in: context.profiles.map((profile) => profile.id) },
        status: "ACTIVE",
        startsAt: { lt: latest },
        endsAt: { gt: earliest },
        OR: [
          { professionalProfileId: null, resourceId: null },
          { professionalProfileId: { in: professionalIds } },
        ],
      },
    }),
    ranges.length
      ? prisma.schedulerAppointmentService.findMany({
          where: {
            appointment: { OR: ranges, status: { not: "CANCELED" } },
            ...(context.query.serviceProfileId
              ? { serviceProfileId: context.query.serviceProfileId }
              : {}),
            participants: {
              some: { professionalProfileId: { in: professionalIds } },
            },
          },
          include: {
            appointment: { select: { status: true, timezone: true } },
            participants: true,
          },
        })
      : Promise.resolve([]),
  ]);
  const rows: ReportRow[] = [];
  for (const assignment of assignments) {
    const profile = context.profiles.find(
      (item) => item.id === assignment.branchProfileId,
    );
    if (!profile) continue;
    for (const date of schedulerReportDates(
      context.query.dateFrom,
      context.query.dateTo,
    )) {
      const range = schedulerLocalDateRangeUtc(date, profile.timezone);
      const activeAtDay = (value: {
        effectiveFrom: Date;
        effectiveTo: Date | null;
        deactivatedAt?: Date | null;
      }) => {
        const effectiveTo = value.effectiveTo ?? value.deactivatedAt;
        return (
          value.effectiveFrom < range.end &&
          (!effectiveTo || effectiveTo > range.start)
        );
      };
      if (!activeAtDay(assignment)) continue;
      const ownerRules = (professionalProfileId: string | null) =>
        rules
          .filter(
            (rule) =>
              rule.branchProfileId === profile.id &&
              rule.professionalProfileId === professionalProfileId &&
              rule.resourceId === null &&
              activeAtDay(rule),
          )
          .map((rule) => ({
            kind: rule.kind,
            weekday: rule.weekday,
            startMinute: rule.startMinute,
            endMinute: rule.endMinute,
          }));
      const ownerExceptions = (professionalProfileId: string | null) =>
        exceptions
          .filter(
            (exception) =>
              exception.branchProfileId === profile.id &&
              exception.professionalProfileId === professionalProfileId &&
              exception.resourceId === null &&
              activeAtDay(exception),
          )
          .map((exception) => ({
            kind: exception.kind,
            date: dateOnly(exception.date),
            startMinute: exception.startMinute,
            endMinute: exception.endMinute,
          }));
      const branchWindows = resolveSchedulerDailyWindows({
        date,
        rules: ownerRules(null),
        exceptions: ownerExceptions(null),
      });
      const professionalWindows = intersectSchedulerWindows(
        branchWindows,
        resolveSchedulerDailyWindows({
          date,
          rules: ownerRules(assignment.professionalProfileId),
          exceptions: ownerExceptions(assignment.professionalProfileId),
          inherited: branchWindows,
        }),
      );
      const dayBlocks = blocks
        .filter(
          (block) =>
            block.branchProfileId === profile.id &&
            (!block.professionalProfileId ||
              block.professionalProfileId ===
                assignment.professionalProfileId) &&
            block.startsAt < range.end &&
            block.endsAt > range.start,
        )
        .map((block) =>
          localBlockInterval(
            block.startsAt,
            block.endsAt,
            date,
            profile.timezone,
          ),
        );
      const availableWindows = subtractSchedulerReportIntervals(
        professionalWindows,
        dayBlocks,
      );
      const professionalServices = services.filter(
        (service) =>
          service.participants.some(
            (participant) =>
              participant.professionalProfileId ===
              assignment.professionalProfileId,
          ) &&
          service.occupiesFrom < range.end &&
          service.occupiesUntil > range.start,
      );
      const bookedIntervals = professionalServices.map((service) =>
        localBlockInterval(
          service.occupiesFrom,
          service.occupiesUntil,
          date,
          profile.timezone,
        ),
      );
      const attendedIntervals = professionalServices
        .filter((service) => service.appointment.status === "ATTENDED")
        .map((service) =>
          localBlockInterval(
            service.occupiesFrom,
            service.occupiesUntil,
            date,
            profile.timezone,
          ),
        );
      const availableMinutes = schedulerReportIntervalMinutes(availableWindows);
      const bookedMinutes = schedulerReportOverlapMinutes(
        availableWindows,
        bookedIntervals,
      );
      const attendedMinutes = schedulerReportOverlapMinutes(
        availableWindows,
        attendedIntervals,
      );
      rows.push({
        branch_id: profile.branchId,
        professional_profile_id: assignment.professionalProfileId,
        Fecha: date,
        Sucursal: profile.branch.nombre,
        Profesional: assignment.professionalProfile.employee.nombreCompleto,
        "Minutos disponibles": availableMinutes,
        "Minutos reservados": bookedMinutes,
        "Minutos atendidos": attendedMinutes,
        "Ocupación reservada": schedulerReportPercentage(
          bookedMinutes,
          availableMinutes,
        ),
        "Ocupación atendida": schedulerReportPercentage(
          attendedMinutes,
          availableMinutes,
        ),
      });
    }
  }
  const filtered = rows.filter((row) => rowMatches(row, context.query.search));
  const available = filtered.reduce(
    (sum, row) => sum + Number(row["Minutos disponibles"]),
    0,
  );
  const booked = filtered.reduce(
    (sum, row) => sum + Number(row["Minutos reservados"]),
    0,
  );
  const attended = filtered.reduce(
    (sum, row) => sum + Number(row["Minutos atendidos"]),
    0,
  );
  return {
    rows: filtered,
    summary: {
      "Minutos disponibles": available,
      "Minutos reservados": booked,
      "Minutos atendidos": attended,
      "Ocupación reservada": schedulerReportPercentage(booked, available),
      "Ocupación atendida": schedulerReportPercentage(attended, available),
    },
    authority: "SCHEDULER",
    notes: [
      "La disponibilidad es la intersección de horarios vigentes de sucursal y profesional, menos excepciones y bloqueos; los intervalos se tratan como [inicio, fin).",
    ],
  };
}

async function aggregateAppointmentReport(
  context: ReportContext,
  key: "CUSTOMERS" | "SERVICES" | "PROFESSIONALS",
): Promise<ReportResult> {
  if (context.query.source === "LEGACY") {
    throw Object.assign(
      new Error(`El reporte ${key} requiere identidades canónicas`),
      { status: 400 },
    );
  }
  const appointments = await canonicalAppointments(context);
  const groups = new Map<
    string,
    {
      row: ReportRow;
      appointments: Set<string>;
      attended: number;
      canceled: number;
      noShow: number;
      sales: Prisma.Decimal;
    }
  >();
  const add = (
    id: string,
    base: ReportRow,
    appointment: (typeof appointments)[number],
  ) => {
    const current = groups.get(id) ?? {
      row: base,
      appointments: new Set<string>(),
      attended: 0,
      canceled: 0,
      noShow: 0,
      sales: new Prisma.Decimal(0),
    };
    if (!current.appointments.has(appointment.id)) {
      current.appointments.add(appointment.id);
      current.attended += appointment.status === "ATTENDED" ? 1 : 0;
      current.canceled += appointment.status === "CANCELED" ? 1 : 0;
      current.noShow += appointment.status === "NO_SHOW" ? 1 : 0;
      const tickets = new Map(
        appointment.posAppointments.map((item) => [
          item.ticket.id,
          item.ticket.total,
        ]),
      );
      current.sales = [...tickets.values()].reduce(
        (sum, value) => sum.plus(value),
        current.sales,
      );
    }
    groups.set(id, current);
  };
  for (const appointment of appointments) {
    if (key === "CUSTOMERS") {
      add(
        appointment.customer.id,
        {
          customer_id: appointment.customer.id,
          Cliente: appointment.customer.displayName,
          Procedencia: appointment.customer.source?.name ?? null,
        },
        appointment,
      );
    } else if (key === "SERVICES") {
      for (const service of appointment.services)
        add(
          service.serviceProfileId,
          {
            service_profile_id: service.serviceProfileId,
            Servicio: service.serviceNameSnapshot,
          },
          appointment,
        );
    } else {
      const participants = new Map(
        appointment.services
          .flatMap((service) => service.participants)
          .map((item) => [item.professionalProfileId, item]),
      );
      for (const participant of participants.values())
        add(
          participant.professionalProfileId,
          {
            professional_profile_id: participant.professionalProfileId,
            Profesional: participant.professionalNameSnapshot,
          },
          appointment,
        );
    }
  }
  const rows = [...groups.values()]
    .map<ReportRow>((item) => ({
      ...item.row,
      Citas: item.appointments.size,
      Atendidas: item.attended,
      Canceladas: item.canceled,
      "No show": item.noShow,
      Venta: item.sales.toFixed(2),
    }))
    .filter((row) => rowMatches(row, context.query.search))
    .sort((left, right) => Number(right["Citas"]) - Number(left["Citas"]));
  return {
    rows,
    summary: {
      Registros: rows.length,
      Citas: appointments.length,
      Atendidas: appointments.filter(
        (appointment) => appointment.status === "ATTENDED",
      ).length,
      Venta: [
        ...new Map(
          appointments
            .flatMap((appointment) => appointment.posAppointments)
            .map((item) => [item.ticket.id, item.ticket.total]),
        ).values(),
      ]
        .reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0))
        .toFixed(2),
    },
    authority: "SCHEDULER",
  };
}

async function salesReport(
  context: ReportContext,
  payments: boolean,
): Promise<ReportResult> {
  if (context.query.source === "LEGACY") {
    throw Object.assign(
      new Error("Ventas y pagos se derivan exclusivamente del POS canónico"),
      { status: 400 },
    );
  }
  const professionalId = professionalFilter(context);
  const employee = professionalId
    ? await prisma.schedulerProfessionalProfile.findUnique({
        where: { id: professionalId },
        select: { employeeId: true },
      })
    : null;
  if (professionalId && !employee) {
    throw Object.assign(new Error("El profesional solicitado no existe"), {
      status: 400,
    });
  }
  const ticketWhere: Prisma.PosTicketWhereInput = {
    branchId: { in: context.branchIds },
    businessDate: {
      gte: new Date(`${context.query.dateFrom}T00:00:00.000Z`),
      lte: new Date(`${context.query.dateTo}T00:00:00.000Z`),
    },
    ...(employee
      ? { sellers: { some: { employeeId: employee.employeeId } } }
      : {}),
  };
  if (!payments) {
    const tickets = await prisma.posTicket.findMany({
      where: ticketWhere,
      include: {
        branch: true,
        sellers: true,
        appointments: { select: { schedulerAppointmentId: true } },
      },
      orderBy: [{ businessDate: "desc" }, { creadoEn: "desc" }],
    });
    const rows = tickets
      .map<ReportRow>((ticket) => ({
        ticket_id: ticket.id,
        branch_id: ticket.branchId,
        Fecha: dateOnly(ticket.businessDate),
        Folio: ticket.folio,
        Sucursal: ticket.branch.nombre,
        Cliente: ticket.customerNameSnapshot,
        Vendedores: ticket.sellers
          .map((seller) => seller.sellerNameSnapshot)
          .join(" / "),
        Estado: ticket.status,
        Venta: ticket.total.toFixed(2),
        Cobrado: ticket.amountPaid.toFixed(2),
        Saldo: ticket.pendingAmount.toFixed(2),
        "Cita Scheduler":
          ticket.appointments.find((item) => item.schedulerAppointmentId)
            ?.schedulerAppointmentId ?? null,
        Fuente: "POS",
      }))
      .filter((row) => rowMatches(row, context.query.search));
    return {
      rows,
      summary: {
        Tickets: rows.length,
        "Venta bruta histórica": rows
          .reduce((sum, row) => sum + Number(row["Venta"]), 0)
          .toFixed(2),
        "Venta vigente": rows
          .filter((row) =>
            ["COMPLETED", "LAYAWAY"].includes(String(row["Estado"])),
          )
          .reduce((sum, row) => sum + Number(row["Venta"]), 0)
          .toFixed(2),
        Cobrado: rows
          .reduce((sum, row) => sum + Number(row["Cobrado"]), 0)
          .toFixed(2),
        Saldo: rows
          .reduce((sum, row) => sum + Number(row["Saldo"]), 0)
          .toFixed(2),
      },
      authority: "POS",
    };
  }
  const paymentRows = await prisma.posPayment.findMany({
    where: {
      operation: { ticket: ticketWhere },
      ...(context.query.search
        ? {
            OR: [
              {
                methodNameSnapshot: {
                  contains: context.query.search,
                  mode: "insensitive",
                },
              },
              {
                reference: {
                  contains: context.query.search,
                  mode: "insensitive",
                },
              },
              {
                operation: {
                  folio: {
                    contains: context.query.search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      operation: { include: { ticket: { include: { branch: true } } } },
    },
    orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
  });
  const rows = paymentRows.map<ReportRow>((payment) => {
    const amount =
      payment.operation.kind === "REFUND"
        ? payment.amount.negated()
        : payment.amount;
    return {
      payment_id: payment.id,
      branch_id: payment.operation.ticket.branchId,
      Fecha: dateOnly(payment.operation.businessDate),
      "Folio ticket": payment.operation.ticket.folio,
      "Folio movimiento": payment.operation.folio,
      Sucursal: payment.operation.ticket.branch.nombre,
      Movimiento: payment.operation.kind,
      "Forma de pago": payment.methodNameSnapshot,
      Banco: payment.bankNameSnapshot,
      Red: payment.cardNetworkNameSnapshot,
      Plazo: payment.installmentMonths,
      Importe: amount.toFixed(2),
      Fuente: "POS",
    };
  });
  return {
    rows,
    summary: {
      Pagos: rows.length,
      Neto: rows
        .reduce((sum, row) => sum + Number(row["Importe"]), 0)
        .toFixed(2),
    },
    authority: "POS",
  };
}

async function communicationsReport(
  context: ReportContext,
): Promise<ReportResult> {
  if (context.query.source === "LEGACY")
    throw Object.assign(new Error("Comunicaciones no admite fuente legado"), {
      status: 400,
    });
  const ranges = canonicalRanges(
    context.profiles,
    context.query.dateFrom,
    context.query.dateTo,
  );
  const professionalProfileId = professionalFilter(context);
  const rowsDb = await prisma.schedulerMessageOutbox.findMany({
    where: {
      branchProfileId: { in: context.profiles.map((profile) => profile.id) },
      scheduledAt: {
        gte: ranges
          .map((item) => item.startsAt.gte)
          .sort((a, b) => a.getTime() - b.getTime())[0],
        lt: ranges
          .map((item) => item.startsAt.lt)
          .sort((a, b) => b.getTime() - a.getTime())[0],
      },
      ...(context.query.channel ? { channel: context.query.channel } : {}),
      ...(professionalProfileId
        ? {
            appointment: {
              services: {
                some: { participants: { some: { professionalProfileId } } },
              },
            },
          }
        : {}),
    },
    include: {
      branchProfile: { include: { branch: true } },
      customer: { select: { displayName: true } },
      templateVersion: { include: { template: { select: { name: true } } } },
    },
    orderBy: [{ scheduledAt: "desc" }, { id: "desc" }],
  });
  const rows = rowsDb
    .map<ReportRow>((item) => ({
      outbox_id: item.id,
      branch_id: item.branchProfile.branchId,
      Fecha: schedulerLocalDateKey(
        item.scheduledAt,
        item.branchProfile.timezone,
      ),
      Sucursal: item.branchProfile.branch.nombre,
      Cliente: item.customer.displayName,
      Plantilla: item.templateVersion.template.name,
      Canal: item.channel,
      Estado: item.status,
      Intentos: item.attempts,
      Programado: item.scheduledAt.toISOString(),
      Enviado: item.sentAt?.toISOString() ?? null,
      Entregado: item.deliveredAt?.toISOString() ?? null,
      Leído: item.readAt?.toISOString() ?? null,
    }))
    .filter(
      (row) =>
        String(row["Fecha"]) >= context.query.dateFrom &&
        String(row["Fecha"]) <= context.query.dateTo &&
        rowMatches(row, context.query.search),
    );
  return {
    rows,
    summary: {
      Mensajes: rows.length,
      Enviados: rows.filter((row) =>
        ["SENT", "DELIVERED", "READ"].includes(String(row["Estado"])),
      ).length,
      Entregados: rows.filter((row) =>
        ["DELIVERED", "READ"].includes(String(row["Estado"])),
      ).length,
      Leídos: rows.filter((row) => row["Estado"] === "READ").length,
      Fallidos: rows.filter((row) => row["Estado"] === "FAILED").length,
    },
    authority: "SCHEDULER",
    notes: [
      "Los destinos cifrados y los errores internos del proveedor no forman parte del dataset.",
    ],
  };
}

async function surveysReport(context: ReportContext): Promise<ReportResult> {
  if (context.query.source === "LEGACY")
    throw Object.assign(new Error("Encuestas no admite fuente legado"), {
      status: 400,
    });
  const ranges = canonicalRanges(
    context.profiles,
    context.query.dateFrom,
    context.query.dateTo,
  );
  const professionalProfileId = professionalFilter(context);
  const responses = ranges.length
    ? await prisma.schedulerSurveyResponse.findMany({
        where: {
          submittedAt: {
            gte: ranges
              .map((item) => item.startsAt.gte)
              .sort((a, b) => a.getTime() - b.getTime())[0],
            lt: ranges
              .map((item) => item.startsAt.lt)
              .sort((a, b) => b.getTime() - a.getTime())[0],
          },
          appointment: {
            branchProfileId: {
              in: context.profiles.map((profile) => profile.id),
            },
            AND: [
              ...(context.query.serviceProfileId
                ? [
                    {
                      services: {
                        some: {
                          serviceProfileId: context.query.serviceProfileId,
                        },
                      },
                    },
                  ]
                : []),
              ...(professionalProfileId
                ? [
                    {
                      services: {
                        some: {
                          participants: { some: { professionalProfileId } },
                        },
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        include: {
          customer: { select: { displayName: true } },
          appointment: {
            include: { branchProfile: { include: { branch: true } } },
          },
          token: {
            include: {
              surveyVersion: {
                include: { survey: { select: { name: true } } },
              },
            },
          },
          answers: { orderBy: { creadoEn: "asc" } },
        },
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      })
    : [];
  const rows = responses
    .map<ReportRow>((response) => {
      const ratings = response.answers
        .filter((answer) => answer.typeSnapshot === "RATING")
        .map((answer) => schedulerReportRating(answer.value))
        .filter((value): value is number => value != null);
      return {
        response_id: response.id,
        branch_id: response.appointment?.branchProfile.branchId ?? null,
        Fecha: response.appointment
          ? schedulerLocalDateKey(
              response.submittedAt,
              response.appointment.timezone,
            )
          : dateOnly(response.submittedAt),
        Sucursal: response.appointment?.branchProfile.branch.nombre ?? null,
        Encuesta: response.token.surveyVersion.survey.name,
        Cliente: response.customer.displayName,
        Respuestas: response.answers.length,
        Calificación: ratings.length
          ? (
              ratings.reduce((sum, value) => sum + value, 0) / ratings.length
            ).toFixed(2)
          : null,
        Enviada: response.submittedAt.toISOString(),
      };
    })
    .filter(
      (row) =>
        String(row["Fecha"]) >= context.query.dateFrom &&
        String(row["Fecha"]) <= context.query.dateTo &&
        rowMatches(row, context.query.search),
    );
  const ratings = rows
    .map((row) => Number(row["Calificación"]))
    .filter(Number.isFinite);
  return {
    rows,
    summary: {
      Respuestas: rows.length,
      "Calificación promedio": ratings.length
        ? (
            ratings.reduce((sum, value) => sum + value, 0) / ratings.length
          ).toFixed(2)
        : null,
    },
    authority: "SCHEDULER",
    notes: [
      "Comentarios libres y respuestas médicas no se incluyen en el reporte agregado.",
    ],
  };
}

async function commissionsReport(
  context: ReportContext,
): Promise<ReportResult> {
  if (context.query.source === "LEGACY")
    throw Object.assign(new Error("Comisiones no admite fuente legado"), {
      status: 400,
    });
  const appointments = await canonicalAppointments(context);
  const commerceIds = unique(
    context.profiles.map((profile) => profile.commerceId),
  );
  const policies = await prisma.schedulerCommissionPolicy.findMany({
    where: {
      commerceId: { in: commerceIds },
      active: true,
      ...(professionalFilter(context)
        ? {
            OR: [
              { targetType: "DEFAULT" },
              { professionalProfileId: professionalFilter(context) },
            ],
          }
        : {}),
    },
    include: {
      professionalProfile: {
        include: { employee: { select: { nombreCompleto: true } } },
      },
      catalogItem: { select: { name: true } },
      versions: {
        include: {
          rules: { include: { tiers: { orderBy: { sortOrder: "asc" } } } },
        },
        orderBy: { version: "desc" },
      },
    },
    orderBy: [{ commerceId: "asc" }, { identityKey: "asc" }],
  });
  const branchSales = await prisma.posTicket.groupBy({
    by: ["branchId"],
    where: {
      branchId: { in: context.branchIds },
      businessDate: {
        gte: new Date(`${context.query.dateFrom}T00:00:00.000Z`),
        lte: new Date(`${context.query.dateTo}T00:00:00.000Z`),
      },
      status: { in: ["COMPLETED", "LAYAWAY"] },
    },
    _sum: { total: true },
  });
  const branchSalesTotal = branchSales.reduce(
    (sum, item) => sum + decimal(item._sum.total),
    0,
  );
  const rows: ReportRow[] = [];
  for (const policy of policies) {
    const targetAppointments = appointments.filter((appointment) => {
      if (policy.targetType === "PROFESSIONAL")
        return appointment.services.some((service) =>
          service.participants.some(
            (participant) =>
              participant.professionalProfileId ===
              policy.professionalProfileId,
          ),
        );
      if (policy.targetType === "CATALOG_ITEM")
        return appointment.services.some(
          (service) =>
            service.serviceProfile.catalogItemId === policy.catalogItemId,
        );
      return true;
    });
    for (const version of policy.versions) {
      const relevantAppointments = targetAppointments.filter(
        (appointment) =>
          version.active &&
          appointment.startsAt >= version.effectiveFrom &&
          (!version.effectiveTo || appointment.startsAt < version.effectiveTo),
      );
      if (!relevantAppointments.length) continue;
      const ticketMap = new Map(
        relevantAppointments
          .flatMap((appointment) => appointment.posAppointments)
          .map((item) => [item.ticket.id, item.ticket.total]),
      );
      const salesAmount = [...ticketMap.values()].reduce(
        (sum, value) => sum + decimal(value),
        0,
      );
      const eligibleAppointments = relevantAppointments.filter(
        (appointment) => appointment.status !== "CANCELED",
      );
      const estimated = calculateSchedulerCommission({
        appointmentCount: eligibleAppointments.length,
        attendedCount: relevantAppointments.filter(
          (appointment) => appointment.status === "ATTENDED",
        ).length,
        salesAmount,
        branchSalesAmount: branchSalesTotal,
        rules: version.rules.map((rule) => ({
          mode: rule.mode,
          amount: rule.amount ? decimal(rule.amount) : null,
          percentage: rule.percentage ? decimal(rule.percentage) : null,
          tiers: rule.tiers.map((tier) => ({
            fromAmount: decimal(tier.fromAmount),
            toAmount: tier.toAmount ? decimal(tier.toAmount) : null,
            percentage: decimal(tier.percentage),
          })),
        })),
      });
      rows.push({
        policy_id: policy.id,
        policy_version_id: version.id,
        Política: policy.identityKey,
        Objetivo: policy.targetType,
        Nombre:
          policy.professionalProfile?.employee.nombreCompleto ??
          policy.catalogItem?.name ??
          "Regla por defecto",
        Versión: version.version,
        VigenteDesde: version.effectiveFrom.toISOString(),
        VigenteHasta: version.effectiveTo?.toISOString() ?? null,
        Periodicidad: version.period,
        Citas: eligibleAppointments.length,
        Atendidas: relevantAppointments.filter(
          (appointment) => appointment.status === "ATTENDED",
        ).length,
        "Venta atribuible": salesAmount.toFixed(2),
        "Venta sucursal": branchSalesTotal.toFixed(2),
        "Comisión estimada": estimated.toFixed(2),
        Autoridad: "PAYROLL",
      });
    }
  }
  const filtered = rows.filter((row) => rowMatches(row, context.query.search));
  return {
    rows: filtered,
    summary: {
      Políticas: filtered.length,
      "Comisión estimada": filtered
        .reduce((sum, row) => sum + Number(row["Comisión estimada"]), 0)
        .toFixed(2),
    },
    authority: "SCHEDULER",
    notes: [
      "El resultado combina políticas versionadas de Scheduler con tickets canónicos de POS; Nómina conserva la autoridad de cálculo final y pago.",
      "Las ventas sólo se atribuyen mediante vínculos canónicos SchedulerAppointment → PosAppointment → PosTicket.",
    ],
  };
}

async function buildResult(
  context: ReportContext,
  key: SchedulerReportKey,
): Promise<ReportResult> {
  if (["APPOINTMENTS", "CANCELLATIONS", "NO_SHOW"].includes(key))
    return appointmentReport(context, key);
  if (key === "OCCUPANCY") return occupancyReport(context);
  if (["CUSTOMERS", "SERVICES", "PROFESSIONALS"].includes(key))
    return aggregateAppointmentReport(
      context,
      key as "CUSTOMERS" | "SERVICES" | "PROFESSIONALS",
    );
  if (key === "SALES") return salesReport(context, false);
  if (key === "PAYMENTS") return salesReport(context, true);
  if (key === "COMMUNICATIONS") return communicationsReport(context);
  if (key === "SURVEYS") return surveysReport(context);
  return commissionsReport(context);
}

async function createDataset(
  req: Request,
  key: SchedulerReportKey,
  exportAll: boolean,
): Promise<SchedulerReportDatasetDto> {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success)
    throw Object.assign(new Error("Consulta de reporte inválida"), {
      status: 400,
      details: parsed.error.flatten().fieldErrors,
    });
  try {
    resolveSchedulerReportPeriod(parsed.data.dateFrom, parsed.data.dateTo);
  } catch (error) {
    throw Object.assign(
      error instanceof Error ? error : new Error("Periodo inválido"),
      { status: 400 },
    );
  }
  if (
    parsed.data.source === "LEGACY" &&
    !["APPOINTMENTS", "CANCELLATIONS", "NO_SHOW"].includes(key)
  ) {
    throw Object.assign(
      new Error("La fuente legado sólo está disponible para reportes de citas"),
      { status: 400 },
    );
  }
  if (
    (key === "CANCELLATIONS" &&
      parsed.data.status &&
      parsed.data.status !== "CANCELED") ||
    (key === "NO_SHOW" &&
      parsed.data.status &&
      parsed.data.status !== "NO_SHOW")
  ) {
    throw Object.assign(
      new Error("El estado solicitado contradice el reporte"),
      { status: 400 },
    );
  }
  if (
    parsed.data.status &&
    !["APPOINTMENTS", "CANCELLATIONS", "NO_SHOW"].includes(key)
  ) {
    throw Object.assign(
      new Error("El filtro de estado sólo aplica a reportes de citas"),
      { status: 400 },
    );
  }
  if (parsed.data.channel && key !== "COMMUNICATIONS") {
    throw Object.assign(
      new Error("El filtro de canal sólo aplica al reporte de comunicaciones"),
      { status: 400 },
    );
  }
  const context = await reportContext(req, parsed.data);
  const result = await buildResult(context, key);
  const total = result.rows.length;
  const pageSize = Math.min(parsed.data.pageSize, 100);
  const rows = schedulerReportPage(
    result.rows,
    parsed.data.page,
    pageSize,
    exportAll,
  );
  const posReport = key === "SALES" || key === "PAYMENTS";
  const includesLinkedPos =
    [
      "APPOINTMENTS",
      "CUSTOMERS",
      "SERVICES",
      "PROFESSIONALS",
      "COMMISSIONS",
    ].includes(key) && parsed.data.source === "CANONICAL";
  const sourceAuthorities: SchedulerReportDatasetDto["sourceAuthorities"] = [
    result.authority,
    ...(includesLinkedPos && result.authority !== "POS"
      ? ["POS" as const]
      : []),
  ];
  return {
    key,
    dateFrom: parsed.data.dateFrom,
    dateTo: parsed.data.dateTo,
    interval: "[dateFrom, dateTo + 1 day)",
    source: posReport ? "CANONICAL" : parsed.data.source,
    sourceAuthority: result.authority,
    sourceAuthorities,
    generatedAt: new Date().toISOString(),
    branchIds: context.branchIds,
    timeZones: Object.fromEntries(
      context.branchIds.map((branchId) => [
        branchId,
        context.profiles.find((profile) => profile.branchId === branchId)
          ?.timezone ?? "America/Mexico_City",
      ]),
    ),
    filters: {
      professionalProfileId: professionalFilter(context) ?? null,
      serviceProfileId: parsed.data.serviceProfileId ?? null,
      status: parsed.data.status ?? null,
      channel: parsed.data.channel ?? null,
      searchApplied: Boolean(parsed.data.search),
    },
    summary: result.summary,
    columns: Object.keys(result.rows[0] ?? {}),
    rows,
    page: exportAll ? 1 : parsed.data.page,
    pageSize: exportAll ? total : pageSize,
    total,
    notes: result.notes ?? [],
  };
}

async function authorize(
  req: Request,
  key: SchedulerReportKey,
  capability: "READ" | "EXPORT",
) {
  const access = await resolveSchedulerAccessForRequest(req);
  if (!access)
    throw Object.assign(new Error("No autenticado"), { status: 401 });
  const screenKey = schedulerReportScreen(key);
  if (!hasSchedulerCapability(access, screenKey, capability)) {
    throw Object.assign(
      new Error("No tienes la capacidad requerida para este reporte"),
      { status: 403 },
    );
  }
  req.schedulerAccess = access;
}

async function auditExport(
  req: Request,
  dataset: SchedulerReportDatasetDto,
  database: Pick<Prisma.TransactionClient, "auditLog"> = prisma,
) {
  const metadata = {
    key: dataset.key,
    format: "DATASET_FOR_PDF_XLSX",
    dateFrom: dataset.dateFrom,
    dateTo: dataset.dateTo,
    interval: dataset.interval,
    branchIds: dataset.branchIds,
    timeZones: dataset.timeZones,
    source: dataset.source,
    sourceAuthority: dataset.sourceAuthority,
    sourceAuthorities: dataset.sourceAuthorities,
    rowCount: dataset.rows.length,
    filters: {
      professionalProfileId: dataset.filters.professionalProfileId,
      serviceProfileId: dataset.filters.serviceProfileId,
      status: dataset.filters.status,
      channel: dataset.filters.channel,
      ...schedulerReportSearchMetadata(querySchema.parse(req.query).search),
    },
  } satisfies Prisma.InputJsonObject;
  await database.auditLog.create({
    data: {
      application: "SCHEDULER",
      action: "SCHEDULER_REPORT_EXPORT",
      outcome: "SUCCESS",
      actorUserId: req.schedulerAccess!.userId,
      branchId: dataset.branchIds.length === 1 ? dataset.branchIds[0] : null,
      targetType: "SchedulerReport",
      targetId: dataset.key,
      metadata,
      ...schedulerRequestAuditContext(req),
    },
  });
}

router.get(
  "/reports/:key",
  asyncRoute(async (req, res) => {
    const key = reportKeySchema.safeParse(req.params["key"]);
    if (!key.success)
      return res
        .status(404)
        .json({ success: false, message: "Reporte no encontrado", data: null });
    await authorize(req, key.data, "READ");
    res.json({
      success: true,
      message: "OK",
      data: await createDataset(req, key.data, false),
    });
  }),
);

router.get(
  "/exports/:key",
  asyncRoute(async (req, res) => {
    const key = reportKeySchema.safeParse(req.params["key"]);
    if (!key.success)
      return res
        .status(404)
        .json({ success: false, message: "Dataset no encontrado", data: null });
    await authorize(req, key.data, "EXPORT");
    const dataset = await createDataset(req, key.data, true);
    if (key.data === "CUSTOMERS") {
      const token = req.get("x-scheduler-authorization");
      if (!token)
        throw Object.assign(
          new Error(
            "La exportación de clientes requiere autorización secundaria",
          ),
          { status: 403 },
        );
      await prisma.$transaction(async (tx) => {
        const consumed = await consumeSchedulerAuthorization({
          token,
          purpose: "SENSITIVE_EXPORT",
          actorUserId: req.schedulerAccess!.userId,
          screenKey: "scheduler/clients",
          targetType: "SchedulerReport",
          targetId: key.data,
          tx,
        });
        if (!consumed)
          throw Object.assign(
            new Error(
              "La autorización secundaria no es válida o ya fue utilizada",
            ),
            { status: 403 },
          );
        await auditExport(req, dataset, tx);
      });
    } else {
      await auditExport(req, dataset);
    }
    res.json({ success: true, message: "Dataset autorizado", data: dataset });
  }),
);

router.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof Error && "status" in error) {
      const value = error as Error & { status: number; details?: unknown };
      return res.status(value.status).json({
        success: false,
        message: value.message,
        data: value.details ?? null,
      });
    }
    next(error);
  },
);

export default router;
