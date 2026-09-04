import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { Prisma } from "@prisma/client";
import {
  posLayawayPaymentRequestSchema,
  posMutationHeadersSchema,
  posOwedProductDeliveryRequestSchema,
  posTicketCreateRequestSchema,
  posTicketEventRequestSchema,
  posTicketListQuerySchema,
  posTicketQuoteRequestSchema,
  posSaleSellerQuerySchema,
  posVoucherIssueRequestSchema,
} from "../contracts/pos.contracts";
import {
  posAuthMiddleware,
  requirePosPermission,
} from "../middlewares/pos-auth.middleware";
import { prisma } from "../prisma/client";
import { resolveRequestedBranchIds } from "../services/pos-scope";
import { executePosIdempotent } from "../services/pos-inventory";
import {
  PosTicketError,
  addLayawayPayment,
  appendTicketRevision,
  calculateAuthoritativeQuote,
  cancelOrReturnTicket,
  createTicket,
  deliverOwedProduct,
  findTicket,
  issueVoucher,
  printVoucher,
  quoteDto,
  ticketDto,
  voucherDto,
} from "../services/pos-tickets";

const router: ExpressRouter = Router();
const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
const businessDateNow = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const canViewAll = (req: Request) =>
  Boolean(
    req.posUser?.isMaster ||
    req.posUser?.permissions.some(
      (permission) =>
        permission === "SALE_VIEW_ALL" ||
        permission === "VOUCHERS_MANAGE" ||
        permission === "RECEIPTS_VIEW",
    ),
  );
const canViewSales = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.posUser?.isMaster ||
    req.posUser?.permissions.some(
      (permission) =>
        permission === "SALE_VIEW_ALL" ||
        permission === "SALE_VIEW" ||
        permission === "SALE_VIEW_OWN" ||
        permission === "SELLER_SALES_VIEW" ||
        permission === "RECEIPTS_VIEW" ||
        permission === "CUSTOMERS_VIEW" ||
        permission === "VOUCHERS_MANAGE",
    )
  )
    return next();
  return res
    .status(403)
    .json({ success: false, message: "Permiso POS insuficiente", data: null });
};

function idempotencyKey(req: Request, res: Response) {
  const parsed = posMutationHeadersSchema.safeParse({
    "idempotency-key": req.headers["idempotency-key"],
  });
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Idempotency-Key UUID requerido",
      data: parsed.error.flatten().fieldErrors,
    });
    return null;
  }
  return parsed.data["idempotency-key"];
}

async function respondIdempotent<T>(
  res: Response,
  promise: ReturnType<typeof executePosIdempotent<T>>,
) {
  const result = await promise;
  res.status(result.status).json({
    success: true,
    message: result.message,
    data: result.data,
    replayed: result.replayed,
  });
}

function saleContext(req: Request) {
  return {
    credentialId: req.posUser!.credentialId,
    terminalId: req.posUser!.terminalId,
    branchId: req.posUser!.branchId,
    businessDate: businessDateNow(),
    isMaster: req.posUser!.isMaster,
    sessionId: req.posUser!.sessionId,
  };
}

router.use(posAuthMiddleware);

router.get(
  "/sale/sellers",
  requirePosPermission("SALE_CREATE"),
  asyncRoute(async (req, res) => {
    const parsed = posSaleSellerQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return res
        .status(400)
        .json({
          success: false,
          message: "Búsqueda de vendedores inválida",
          data: parsed.error.flatten().fieldErrors,
        });
    const [openAttendances, owner] = await Promise.all([
      prisma.posAttendance.findMany({
        where: {
          branchId: req.posUser!.branchId,
          status: "OPEN",
          clockOutAt: null,
          employee: { activo: true },
        },
        select: { id: true, employeeId: true, branchId: true },
      }),
      parsed.data.customerId
        ? prisma.customerPortfolioAssignment.findFirst({
            where: {
              customerId: parsed.data.customerId,
              effectiveTo: null,
              employee: { activo: true },
            },
            orderBy: { effectiveFrom: "desc" },
            select: { employeeId: true },
          })
        : null,
    ]);
    const attendanceByEmployee = new Map(
      openAttendances.map((attendance) => [attendance.employeeId, attendance]),
    );
    const initiallyVisibleIds = [
      ...new Set([
        ...openAttendances.map((attendance) => attendance.employeeId),
        ...(owner?.employeeId ? [owner.employeeId] : []),
      ]),
    ];
    const sellers = await prisma.empleado.findMany({
      where: {
        activo: true,
        ...(parsed.data.query
          ? {
              AND: [
                {
                  OR: [
                    { todasSucursales: true },
                    { sucursalId: req.posUser!.branchId },
                    ...(owner?.employeeId ? [{ id: owner.employeeId }] : []),
                  ],
                },
                {
                  OR: [
                    {
                      nombreCompleto: {
                        contains: parsed.data.query,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      posCredentials: {
                        some: {
                          aliasNormalized: {
                            contains:
                              parsed.data.query.toLocaleLowerCase("es-MX"),
                          },
                          active: true,
                        },
                      },
                    },
                  ],
                },
              ],
            }
          : { id: { in: initiallyVisibleIds } }),
      },
      select: {
        id: true,
        nombreCompleto: true,
        positionId: true,
        posCredentials: {
          where: { active: true },
          select: { aliasNormalized: true },
          take: 1,
        },
      },
      orderBy: { nombreCompleto: "asc" },
    });
    res.json({
      success: true,
      message: "OK",
      data: sellers.map((seller) => ({
        id: seller.id,
        displayName: seller.nombreCompleto,
        alias: seller.posCredentials[0]?.aliasNormalized ?? null,
        positionId: seller.positionId,
        clockedIn: attendanceByEmployee.has(seller.id),
        attendanceId: attendanceByEmployee.get(seller.id)?.id ?? null,
        attendanceBranchId:
          attendanceByEmployee.get(seller.id)?.branchId ?? null,
        portfolioOwner: owner?.employeeId === seller.id,
      })),
    });
  }),
);

router.post(
  "/tickets/quote",
  requirePosPermission("SALE_CREATE"),
  asyncRoute(async (req, res) => {
    const parsed = posTicketQuoteRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Cotización inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    if (parsed.data.branchId !== req.posUser!.branchId)
      return res.status(403).json({
        success: false,
        message: "La sucursal no coincide con la terminal",
        data: null,
      });
    const quote = await prisma.$transaction(
      (tx) =>
        calculateAuthoritativeQuote(tx, parsed.data, req.posUser!.branchId),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      },
    );
    res.json({
      success: true,
      message: "Cotización autoritativa",
      data: quoteDto(quote),
    });
  }),
);

router.post(
  "/tickets",
  requirePosPermission("SALE_CREATE"),
  asyncRoute(async (req, res) => {
    const key = idempotencyKey(req, res);
    if (!key) return;
    const parsed = posTicketCreateRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Ticket inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: "POS_TICKET_CREATE",
        payload: parsed.data,
        execute: async (tx) => ({
          status: 201,
          message: "Ticket creado",
          data: ticketDto(
            await createTicket(tx, parsed.data, saleContext(req)),
          ),
        }),
      }),
    );
  }),
);

router.get(
  "/tickets",
  canViewSales,
  asyncRoute(async (req, res) => {
    const parsed = posTicketListQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Consulta inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    const where: Prisma.PosTicketWhereInput = {
      branchId: {
        in: resolveRequestedBranchIds({
          authorizedBranchIds: req.posUser!.authorizedBranchIds,
          requestedBranchIds: parsed.data.branchIds
            ?.split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        }),
      },
      ...(parsed.data.businessDate
        ? {
            businessDate: new Date(`${parsed.data.businessDate}T00:00:00.000Z`),
          }
        : {}),
      ...(parsed.data.customerId ? { customerId: parsed.data.customerId } : {}),
      ...(!canViewAll(req)
        ? req.posUser!.employeeId
          ? { sellers: { some: { employeeId: req.posUser!.employeeId } } }
          : { id: "__NO_OWN_SALES__" }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.posTicket.findMany({
        where,
        include: {
          branch: { select: { nombre: true } },
          customer: { select: { id: true } },
          lines: {
            include: { item: { select: { kind: true } } },
            orderBy: { creadoEn: "asc" },
          },
          sellers: { orderBy: { creadoEn: "asc" } },
          paymentOperations: {
            include: { payments: true },
            orderBy: { creadoEn: "asc" },
          },
          layaway: true,
          owedProducts: {
            include: { item: { select: { name: true } } },
            orderBy: { creadoEn: "asc" },
          },
          appointments: {
            include: { branch: { select: { nombre: true } } },
            orderBy: { creadoEn: "asc" },
          },
        },
        orderBy: { creadoEn: "desc" },
        skip: (parsed.data.page - 1) * parsed.data.pageSize,
        take: parsed.data.pageSize,
      }),
      prisma.posTicket.count({ where }),
    ]);
    res.json({
      success: true,
      message: "OK",
      data: {
        items: items.map(ticketDto),
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total,
      },
    });
  }),
);

router.get(
  "/tickets/:id",
  canViewSales,
  asyncRoute(async (req, res) => {
    const ticket = await prisma.$transaction((tx) =>
      findTicket(tx, req.params["id"]!),
    );
    const own = ticket?.sellers.some(
      (seller) => seller.employeeId === req.posUser!.employeeId,
    );
    if (
      !ticket ||
      !req.posUser!.authorizedBranchIds.includes(ticket.branchId) ||
      (!canViewAll(req) && !own)
    )
      return res
        .status(404)
        .json({ success: false, message: "Ticket no encontrado", data: null });
    res.json({ success: true, message: "OK", data: ticketDto(ticket) });
  }),
);

router.post(
  "/layaways/:id/payments",
  requirePosPermission("SALE_CREATE"),
  asyncRoute(async (req, res) => {
    const key = idempotencyKey(req, res);
    if (!key) return;
    const parsed = posLayawayPaymentRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Abono inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_LAYAWAY_PAYMENT:${req.params["id"]}`,
        payload: parsed.data,
        execute: async (tx) => ({
          status: 201,
          message: "Abono registrado",
          data: ticketDto(
            await addLayawayPayment(
              tx,
              {
                ticketId: req.params["id"]!,
                payments: parsed.data.payments,
                deliveredTicketLineIds: parsed.data.deliveredTicketLineIds,
              },
              saleContext(req),
            ),
          ),
        }),
      }),
    );
  }),
);

router.post(
  "/owed-products/:id/deliveries",
  requirePosPermission("SALE_CREATE"),
  asyncRoute(async (req, res) => {
    const key = idempotencyKey(req, res);
    if (!key) return;
    const parsed = posOwedProductDeliveryRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Entrega inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_OWED_DELIVERY:${req.params["id"]}`,
        payload: parsed.data,
        execute: async (tx) => ({
          status: 201,
          message: "Entrega registrada",
          data: await deliverOwedProduct(
            tx,
            {
              owedProductId: req.params["id"]!,
              quantity: parsed.data.quantity,
            },
            saleContext(req),
          ),
        }),
      }),
    );
  }),
);

router.post(
  "/tickets/:id/revisions",
  requirePosPermission("SALE_CREATE"),
  asyncRoute(async (req, res) => {
    const key = idempotencyKey(req, res);
    if (!key) return;
    const parsed = posTicketEventRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Revisión inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_TICKET_REVISION:${req.params["id"]}`,
        payload: parsed.data,
        execute: async (tx) => ({
          status: 201,
          message: "Revisión registrada sin alterar el original",
          data: await appendTicketRevision(
            tx,
            {
              ticketId: req.params["id"]!,
              reason: parsed.data.reason,
              authorizationToken: parsed.data.authorizationToken,
              snapshot: parsed.data as unknown as Prisma.InputJsonValue,
            },
            saleContext(req),
          ),
        }),
      }),
    );
  }),
);

router.post(
  "/tickets/:id/cancellations",
  requirePosPermission("SALE_CREATE"),
  asyncRoute(async (req, res) => {
    const key = idempotencyKey(req, res);
    if (!key) return;
    const parsed = posTicketEventRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Cancelación inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_TICKET_CANCELLATION:${req.params["id"]}`,
        payload: parsed.data,
        execute: async (tx) => ({
          status: 201,
          message: "Compensación registrada",
          data: await cancelOrReturnTicket(
            tx,
            {
              ticketId: req.params["id"]!,
              ...parsed.data,
            },
            saleContext(req),
          ),
        }),
      }),
    );
  }),
);

router.get(
  "/vouchers",
  canViewSales,
  asyncRoute(async (req, res) => {
    const parsed = posTicketListQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Consulta inválida",
        data: parsed.error.flatten().fieldErrors,
      });
    const where: Prisma.PosVoucherIssueWhereInput = {
      ticket: {
        branchId: {
          in: resolveRequestedBranchIds({
            authorizedBranchIds: req.posUser!.authorizedBranchIds,
            requestedBranchIds: parsed.data.branchIds
              ?.split(",")
              .map((id) => id.trim())
              .filter(Boolean),
          }),
        },
        ...(!canViewAll(req)
          ? req.posUser!.employeeId
            ? { sellers: { some: { employeeId: req.posUser!.employeeId } } }
            : { id: "__NO_OWN_SALES__" }
          : {}),
      },
    };
    const [items, total] = await Promise.all([
      prisma.posVoucherIssue.findMany({
        where,
        include: { _count: { select: { printEvents: true } } },
        orderBy: { creadoEn: "desc" },
        skip: (parsed.data.page - 1) * parsed.data.pageSize,
        take: parsed.data.pageSize,
      }),
      prisma.posVoucherIssue.count({ where }),
    ]);
    res.json({
      success: true,
      message: "OK",
      data: {
        items: items.map(voucherDto),
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total,
      },
    });
  }),
);

router.post(
  "/tickets/:id/vouchers",
  requirePosPermission("VOUCHERS_MANAGE"),
  asyncRoute(async (req, res) => {
    const key = idempotencyKey(req, res);
    if (!key) return;
    const parsed = posVoucherIssueRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        success: false,
        message: "Voucher inválido",
        data: parsed.error.flatten().fieldErrors,
      });
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_VOUCHER_ISSUE:${req.params["id"]}`,
        payload: parsed.data,
        execute: async (tx) => ({
          status: 201,
          message: "Voucher emitido",
          data: voucherDto(
            await issueVoucher(
              tx,
              {
                ticketId: req.params["id"]!,
                templateId: parsed.data.templateId,
              },
              saleContext(req),
            ),
          ),
        }),
      }),
    );
  }),
);

router.post(
  "/vouchers/:id/print",
  requirePosPermission("VOUCHERS_MANAGE"),
  asyncRoute(async (req, res) => {
    const key = idempotencyKey(req, res);
    if (!key) return;
    await respondIdempotent(
      res,
      executePosIdempotent({
        key,
        actorCredentialId: req.posUser!.credentialId,
        operation: `POS_VOUCHER_PRINT:${req.params["id"]}`,
        payload: { issueId: req.params["id"] },
        execute: async (tx) => ({
          status: 201,
          message: "Impresión registrada",
          data: await printVoucher(tx, req.params["id"]!, saleContext(req)),
        }),
      }),
    );
  }),
);

router.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof PosTicketError)
      return res
        .status(error.status)
        .json({ success: false, message: error.message, data: null });
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return res.status(409).json({
        success: false,
        message: "La operación ya existe",
        data: null,
      });
    next(error);
  },
);

export default router;
