import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { Prisma } from "@prisma/client";
import {
  agendaWebhookSchema,
  posAgendaAvailabilityQuerySchema,
  posAgendaConflictQuerySchema,
  posAgendaCorrectionSchema,
  posAgendaMembershipReservationSchema,
  posAgendaRetrySchema,
  posMutationHeadersSchema,
} from "../contracts/pos.contracts";
import {
  posAuthMiddleware,
  requireAnyPosPermission,
  requirePosPermission,
} from "../middlewares/pos-auth.middleware";
import { prisma } from "../prisma/client";
import {
  AgendaAdapterError,
  verifyAgendaWebhookSignature,
} from "../services/agenda-adapter";
import {
  agendaConflictDto,
  PosAgendaError,
  processAgendaSyncEvents,
  processAgendaWebhook,
  refreshAgendaAvailability,
  reserveMembershipNextSession,
  resolveAgendaAttendanceCorrection,
} from "../services/pos-agenda";
import {
  findScopedMembership,
  PosMembershipError,
  requireMembershipAuthorization,
  type PosMembershipContext,
} from "../services/pos-memberships";
import { PosOperationError } from "../services/pos-operations";

const router: ExpressRouter = Router();
const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };

const membershipContext = (req: Request): PosMembershipContext => ({
  credentialId: req.posUser!.credentialId,
  terminalId: req.posUser!.terminalId,
  sessionId: req.posUser!.sessionId,
  employeeId: req.posUser!.employeeId,
  isMaster: req.posUser!.isMaster,
  authorizedBranchIds: req.posUser!.authorizedBranchIds,
});

router.post(
  "/agenda/webhooks",
  asyncRoute(async (req, res) => {
    const signature = Array.isArray(req.headers["x-agenda-signature"])
      ? req.headers["x-agenda-signature"][0]
      : req.headers["x-agenda-signature"];
    const timestamp = Array.isArray(req.headers["x-agenda-timestamp"])
      ? req.headers["x-agenda-timestamp"][0]
      : req.headers["x-agenda-timestamp"];
    if (
      !req.rawBody ||
      !verifyAgendaWebhookSignature({
        rawBody: req.rawBody,
        signature,
        timestamp,
        secret: process.env["AGENDA_WEBHOOK_SECRET"],
      })
    )
      return res.status(401).json({
        success: false,
        message: "Firma de Agenda inválida",
        data: null,
      });
    const parsed = agendaWebhookSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Webhook de Agenda inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    const result = await processAgendaWebhook(parsed.data);
    return res.status(202).json({
      success: true,
      message:
        result.outcome === "CONFLICT"
          ? "Evento retenido para conciliación"
          : "Evento aceptado",
      data: result,
    });
  }),
);

router.use("/agenda", posAuthMiddleware);

router.get(
  "/agenda/availability",
  requireAnyPosPermission(
    "APPOINTMENTS_VIEW",
    "APPOINTMENTS_MANAGE",
    "SALE_CREATE",
  ),
  asyncRoute(async (req, res) => {
    const parsed = posAgendaAvailabilityQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Consulta de disponibilidad inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    if (!req.posUser!.authorizedBranchIds.includes(parsed.data.branchId))
      return res.status(403).json({
        success: false,
        message: "Sucursal no autorizada",
        data: null,
      });
    const items = await refreshAgendaAvailability(parsed.data);
    return res.json({
      success: true,
      message: "Disponibilidad revalidada",
      data: items,
    });
  }),
);

router.post(
  "/agenda/membership-reservations",
  requirePosPermission("MEMBERSHIPS_MANAGE"),
  asyncRoute(async (req, res) => {
    const parsed = posAgendaMembershipReservationSchema.safeParse(req.body);
    const headers = posMutationHeadersSchema.safeParse({
      "idempotency-key": req.headers["idempotency-key"],
    });
    const tokenHeader = req.headers["x-pos-personal-authorization"];
    const personalToken =
      typeof tokenHeader === "string" ? tokenHeader : tokenHeader?.[0];
    if (!parsed.success || !headers.success || !personalToken)
      return res.status(400).json({
        success: false,
        message: "Reservación de membresía inválida",
        data: null,
      });
    const scoped = await prisma.$transaction(async (tx) => {
      await requireMembershipAuthorization(
        tx,
        personalToken,
        membershipContext(req),
      );
      return findScopedMembership(
        tx,
        parsed.data.membershipId,
        membershipContext(req),
      );
    });
    if (!scoped)
      return res.status(404).json({
        success: false,
        message: "Membresía no encontrada",
        data: null,
      });
    const appointment = await reserveMembershipNextSession({
      operationKey: headers.data["idempotency-key"],
      membershipId: parsed.data.membershipId,
      agendaSlotId: parsed.data.agendaSlotId,
      sellerId: parsed.data.sellerId,
      credentialId: req.posUser!.credentialId,
      authorizedBranchIds: req.posUser!.authorizedBranchIds,
    });
    return res.status(201).json({
      success: true,
      message: "Próxima sesión reservada en Agenda",
      data: {
        id: appointment.id,
        kind: appointment.kind,
        status: appointment.status,
        serviceItemId: appointment.serviceItemId,
        serviceName: appointment.serviceNameSnapshot,
        branchId: appointment.branchId,
        branchName: appointment.branch.nombre,
        sellerId: appointment.sellerId,
        scheduledAt: appointment.scheduledAt?.toISOString() ?? null,
        agendaSlotId: appointment.agendaSlotId,
        agendaReservationId: appointment.agendaReservationId,
        externalReservationId: appointment.externalReservationId,
        externalAppointmentId: appointment.externalAppointmentId,
        agendaResourceName: appointment.agendaResource?.nameSnapshot ?? null,
        agendaVersion: appointment.agendaVersion,
        membershipId: appointment.membershipId,
        courtesyReason: null,
      },
    });
  }),
);

router.get(
  "/agenda/conflicts",
  requirePosPermission("APPOINTMENTS_MANAGE"),
  asyncRoute(async (req, res) => {
    const parsed = posAgendaConflictQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return res
        .status(400)
        .json({ success: false, message: "Consulta inválida", data: null });
    const branchScope = req.posUser!.authorizedBranchIds;
    const where: Prisma.AgendaSyncEventWhereInput = {
      status: parsed.data.status ?? { in: ["PENDING", "FAILED", "CONFLICT"] },
      ...(!req.posUser!.isMaster
        ? {
            OR: [
              { reservation: { branchId: { in: branchScope } } },
              { appointment: { branchId: { in: branchScope } } },
              {
                customer: {
                  portfolios: {
                    some: { effectiveTo: null, branchId: { in: branchScope } },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.agendaSyncEvent.findMany({
        where,
        orderBy: { creadoEn: "asc" },
        skip: (parsed.data.page - 1) * parsed.data.pageSize,
        take: parsed.data.pageSize,
      }),
      prisma.agendaSyncEvent.count({ where }),
    ]);
    return res.json({
      success: true,
      message: "OK",
      data: {
        items: items.map((item) =>
          agendaConflictDto(item as Parameters<typeof agendaConflictDto>[0]),
        ),
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total,
      },
    });
  }),
);

router.post(
  "/agenda/conflicts/retry",
  requirePosPermission("APPOINTMENTS_MANAGE"),
  asyncRoute(async (req, res) => {
    const parsed = posAgendaRetrySchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ success: false, message: "Reintento inválido", data: null });
    if (!parsed.data.eventId && !req.posUser!.isMaster)
      return res.status(403).json({
        success: false,
        message: "El reintento masivo requiere alcance master",
        data: null,
      });
    if (parsed.data.eventId) {
      const event = await prisma.agendaSyncEvent.findFirst({
        where: {
          id: parsed.data.eventId,
          ...(!req.posUser!.isMaster
            ? {
                OR: [
                  {
                    reservation: {
                      branchId: { in: req.posUser!.authorizedBranchIds },
                    },
                  },
                  {
                    appointment: {
                      branchId: { in: req.posUser!.authorizedBranchIds },
                    },
                  },
                  {
                    customer: {
                      portfolios: {
                        some: {
                          effectiveTo: null,
                          branchId: {
                            in: req.posUser!.authorizedBranchIds,
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        include: { reservation: true, appointment: true },
      });
      if (!event)
        return res.status(404).json({
          success: false,
          message: "Conflicto no encontrado",
          data: null,
        });
    }
    const result = await processAgendaSyncEvents({
      eventId: parsed.data.eventId,
      limit: 50,
    });
    return res.json({
      success: true,
      message: "Cola de Agenda procesada",
      data: result,
    });
  }),
);

router.post(
  "/agenda/attendance-corrections",
  requirePosPermission("APPOINTMENTS_MANAGE"),
  asyncRoute(async (req, res) => {
    const parsed = posAgendaCorrectionSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Corrección inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    const result = await resolveAgendaAttendanceCorrection({
      ...parsed.data,
      credentialId: req.posUser!.credentialId,
      terminalId: req.posUser!.terminalId,
      sessionId: req.posUser!.sessionId,
      authorizedBranchIds: req.posUser!.authorizedBranchIds,
    });
    return res.json({
      success: true,
      message: "Asistencia compensada sin reescribir historial",
      data: result,
    });
  }),
);

router.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof PosAgendaError)
      return res.status(error.status).json({
        success: false,
        message: error.message,
        data: { code: error.code },
      });
    if (error instanceof AgendaAdapterError)
      return res.status(error.status).json({
        success: false,
        message: error.message,
        data: { code: error.code },
      });
    if (
      error instanceof PosMembershipError ||
      error instanceof PosOperationError
    )
      return res.status(error.status).json({
        success: false,
        message: error.message,
        data: null,
      });
    return next(error);
  },
);

export default router;
