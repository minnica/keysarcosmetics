import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  posAttendanceClockInSchema,
  posBusinessDayCloseSchema,
  posBusinessDayCountInputSchema,
  posCashExpenseCorrectionSchema,
  posCashExpenseVoidSchema,
  posCashExpenseWriteSchema,
  posExpenseTypeWriteSchema,
  posMutationHeadersSchema,
  posOperationQuerySchema,
} from "../contracts/pos.contracts";
import {
  posAuthMiddleware,
  requirePosPermission,
} from "../middlewares/pos-auth.middleware";
import { prisma } from "../prisma/client";
import { executePosIdempotent } from "../services/pos-inventory";
import {
  POS_DUMMY_BCRYPT_HASH,
  fingerprintSecret,
  verifyPosSecret,
} from "../services/pos-security";
import {
  PosOperationError,
  attendanceDto,
  attendanceInclude,
  businessDayDto,
  businessDayInclude,
  cashExpenseDto,
  cashExpenseInclude,
  consumeOperationAuthorization,
  createBusinessDayCount,
  currentBusinessDate,
  expenseSnapshot,
  inventoryCountDto,
  nextCashExpenseFolio,
  registerAttendanceIfMissing,
} from "../services/pos-operations";
import { enqueuePosNotification } from "../services/pos-notifications";

const router: ExpressRouter = Router();
const decimal = (value: string | number | Prisma.Decimal) => new Prisma.Decimal(value);

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch((error: unknown) => {
      if (error instanceof PosOperationError || (error instanceof Error && "status" in error)) {
        const status = Number((error as { status?: number }).status ?? 400);
        res.status(status).json({ success: false, message: error.message, data: null });
        return;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        res.status(409).json({ success: false, message: "La operación ya fue registrada por otra terminal", data: null });
        return;
      }
      next(error);
    });
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

const auditAllowed = (req: Request) =>
  Boolean(req.posUser?.isMaster || req.posUser?.permissions.includes("INVENTORY_AUDIT"));
const costsAllowed = (req: Request) =>
  Boolean(req.posUser?.isMaster || req.posUser?.permissions.includes("REPORTS_COSTS"));
const reportsAllowed = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.posUser?.isMaster ||
    req.posUser?.permissions.some((permission) =>
      ["DASHBOARD_VIEW", "REPORTS_VIEW", "BUSINESS_DAY_CLOSE"].includes(permission),
    )
  ) return next();
  return res.status(403).json({ success: false, message: "Permiso POS insuficiente", data: null });
};

async function openDayForBranch(tx: Prisma.TransactionClient, branchId: string, date: string) {
  const day = await tx.posBusinessDay.findUnique({
    where: { branchId_businessDate: { branchId, businessDate: new Date(`${date}T00:00:00.000Z`) } },
  });
  if (!day || day.status !== "OPEN") {
    throw new PosOperationError("La sucursal no tiene una jornada abierta para la fecha actual", 409);
  }
  return day;
}

router.use(posAuthMiddleware);

router.get("/business-days/current", asyncRoute(async (req, res) => {
  const businessDate = currentBusinessDate();
  const day = await prisma.posBusinessDay.findUnique({
    where: {
      branchId_businessDate: {
        branchId: req.posUser!.branchId,
        businessDate: new Date(`${businessDate}T00:00:00.000Z`),
      },
    },
    include: businessDayInclude,
  });
  res.json({ success: true, message: "OK", data: day ? businessDayDto(day) : null });
}));

router.post(
  "/business-days/open",
  requirePosPermission("BUSINESS_DAY_OPEN"),
  asyncRoute(async (req, res) => {
    const key = idempotencyKey(req, res);
    if (!key) return;
    const parsed = posBusinessDayCountInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Apertura inválida", data: parsed.error.flatten().fieldErrors });
    }
    const businessDate = currentBusinessDate();
    await respondIdempotent(res, executePosIdempotent({
      key,
      actorCredentialId: req.posUser!.credentialId,
      operation: `BUSINESS_DAY_OPEN:${req.posUser!.branchId}:${businessDate}`,
      payload: parsed.data,
      execute: async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pos-day:${req.posUser!.branchId}:${businessDate}`}))`;
        const existing = await tx.posBusinessDay.findUnique({
          where: { branchId_businessDate: { branchId: req.posUser!.branchId, businessDate: new Date(`${businessDate}T00:00:00.000Z`) } },
        });
        if (existing) throw new PosOperationError("La jornada de esta sucursal y fecha ya existe", 409);
        let openingCountId: string | null = null;
        let openingAuthorizationId: string | null = null;
        if (parsed.data.skipped) {
          const authorization = await consumeOperationAuthorization(tx, {
            token: parsed.data.authorizationToken!,
            purpose: "BUSINESS_DAY_OPEN_SKIP",
            terminalId: req.posUser!.terminalId,
            entityType: "Sucursal",
            entityId: req.posUser!.branchId,
          });
          openingAuthorizationId = authorization.id;
        } else {
          const count = await createBusinessDayCount(tx, {
            kind: "OPENING",
            businessDate,
            branchId: req.posUser!.branchId,
            locationId: parsed.data.locationId!,
            notes: parsed.data.notes,
            lines: parsed.data.lines!,
            credentialId: req.posUser!.credentialId,
            terminalId: req.posUser!.terminalId,
          });
          openingCountId = count.id;
        }
        const day = await tx.posBusinessDay.create({
          data: {
            branchId: req.posUser!.branchId,
            businessDate: new Date(`${businessDate}T00:00:00.000Z`),
            openingCountId,
            openingSkipped: parsed.data.skipped,
            openingAuthorizationId,
            openedByCredentialId: req.posUser!.credentialId,
            openedTerminalId: req.posUser!.terminalId,
          },
          include: businessDayInclude,
        });
        await registerAttendanceIfMissing(tx, {
          businessDayId: day.id,
          businessDate,
          branchId: day.branchId,
          employeeId: req.posUser!.employeeId,
          credentialId: req.posUser!.credentialId,
          terminalId: req.posUser!.terminalId,
        });
        await tx.auditLog.create({
          data: {
            action: parsed.data.skipped ? "POS_BUSINESS_DAY_OPEN_SKIP" : "POS_BUSINESS_DAY_OPEN",
            outcome: "SUCCESS",
            actorCredentialId: req.posUser!.credentialId,
            terminalId: req.posUser!.terminalId,
            branchId: req.posUser!.branchId,
            targetType: "PosBusinessDay",
            targetId: day.id,
          },
        });
        return { status: 201, message: "Jornada abierta", data: businessDayDto(day) };
      },
    }));
  }),
);

router.post(
  "/business-days/:id/closing-count",
  requirePosPermission("BUSINESS_DAY_CLOSE"),
  asyncRoute(async (req, res) => {
    const key = idempotencyKey(req, res);
    if (!key) return;
    const parsed = posBusinessDayCountInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Conteo final inválido", data: parsed.error.flatten().fieldErrors });
    }
    await respondIdempotent(res, executePosIdempotent({
      key,
      actorCredentialId: req.posUser!.credentialId,
      operation: `BUSINESS_DAY_CLOSING_COUNT:${req.params["id"]}`,
      payload: parsed.data,
      execute: async (tx) => {
        const day = await tx.posBusinessDay.findUnique({ where: { id: req.params["id"]! } });
        if (!day || day.branchId !== req.posUser!.branchId) throw new PosOperationError("Jornada no encontrada", 404);
        if (day.status !== "OPEN" || day.closingCountId || day.closingSkipped) {
          throw new PosOperationError("La jornada ya tiene conteo final o está cerrada", 409);
        }
        let closingCountId: string | null = null;
        let closingAuthorizationId: string | null = null;
        if (parsed.data.skipped) {
          const authorization = await consumeOperationAuthorization(tx, {
            token: parsed.data.authorizationToken!,
            purpose: "BUSINESS_DAY_CLOSE_SKIP",
            terminalId: req.posUser!.terminalId,
            entityType: "PosBusinessDay",
            entityId: day.id,
          });
          closingAuthorizationId = authorization.id;
        } else {
          const count = await createBusinessDayCount(tx, {
            kind: "CLOSING",
            businessDate: day.businessDate.toISOString().slice(0, 10),
            branchId: day.branchId,
            locationId: parsed.data.locationId!,
            notes: parsed.data.notes,
            lines: parsed.data.lines!,
            credentialId: req.posUser!.credentialId,
            terminalId: req.posUser!.terminalId,
          });
          closingCountId = count.id;
        }
        const updated = await tx.posBusinessDay.update({
          where: { id: day.id },
          data: { closingCountId, closingSkipped: parsed.data.skipped, closingAuthorizationId },
          include: businessDayInclude,
        });
        return { status: 201, message: "Conteo final registrado", data: businessDayDto(updated) };
      },
    }));
  }),
);

router.post(
  "/business-days/:id/close",
  requirePosPermission("BUSINESS_DAY_CLOSE"),
  asyncRoute(async (req, res) => {
    const key = idempotencyKey(req, res);
    if (!key) return;
    const parsed = posBusinessDayCloseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Cierre inválido", data: parsed.error.flatten().fieldErrors });
    await respondIdempotent(res, executePosIdempotent({
      key,
      actorCredentialId: req.posUser!.credentialId,
      operation: `BUSINESS_DAY_CLOSE:${req.params["id"]}`,
      payload: parsed.data,
      execute: async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pos-day-close:${req.params["id"]}`}))`;
        const day = await tx.posBusinessDay.findUnique({ where: { id: req.params["id"]! } });
        if (!day || day.branchId !== req.posUser!.branchId) throw new PosOperationError("Jornada no encontrada", 404);
        if (day.status !== "OPEN") throw new PosOperationError("La jornada ya fue cerrada", 409);
        if (!day.closingCountId && !day.closingSkipped) throw new PosOperationError("El conteo final es obligatorio antes del cierre", 409);
        const authorization = await consumeOperationAuthorization(tx, {
          token: parsed.data.authorizationToken,
          purpose: "BUSINESS_DAY_CLOSE",
          terminalId: req.posUser!.terminalId,
          entityType: "PosBusinessDay",
          entityId: day.id,
        });
        const [tickets, cashMovements] = await Promise.all([
          tx.posTicket.findMany({
            where: { branchId: day.branchId, businessDate: day.businessDate, status: { in: ["COMPLETED", "LAYAWAY"] } },
            select: { total: true, amountPaid: true, discountTotal: true },
          }),
          tx.posCashMovement.findMany({
            where: { businessDate: day.businessDate, expense: { branchId: day.branchId } },
            select: { amount: true },
          }),
        ]);
        const salesTotal = tickets.reduce((sum, ticket) => sum.plus(ticket.total), decimal(0));
        const collectedTotal = tickets.reduce((sum, ticket) => sum.plus(ticket.amountPaid), decimal(0));
        const discountTotal = tickets.reduce((sum, ticket) => sum.plus(ticket.discountTotal), decimal(0));
        const expenseTotal = cashMovements.reduce((sum, movement) => sum.plus(movement.amount), decimal(0));
        const closedAt = new Date();
        const closeSummary = {
          ticketCount: tickets.length,
          salesTotal: salesTotal.toFixed(2),
          collectedTotal: collectedTotal.toFixed(2),
          discountTotal: discountTotal.toFixed(2),
          expenseTotal: expenseTotal.toFixed(2),
          netCashFlow: collectedTotal.minus(expenseTotal).toFixed(2),
          closedAt: closedAt.toISOString(),
        };
        await tx.posAttendance.updateMany({
          where: { businessDayId: day.id, status: "OPEN" },
          data: {
            status: "CLOSED",
            clockOutAt: closedAt,
            closeReason: "CLOSE_DAY",
            closedByCredentialId: req.posUser!.credentialId,
          },
        });
        const updated = await tx.posBusinessDay.update({
          where: { id: day.id },
          data: {
            status: "CLOSED",
            closeAuthorizationId: authorization.id,
            closedByCredentialId: req.posUser!.credentialId,
            closedTerminalId: req.posUser!.terminalId,
            closedAt,
            closeSummary,
          },
          include: businessDayInclude,
        });
        await tx.auditLog.create({
          data: {
            action: "POS_BUSINESS_DAY_CLOSE",
            outcome: "SUCCESS",
            actorCredentialId: req.posUser!.credentialId,
            terminalId: req.posUser!.terminalId,
            branchId: day.branchId,
            targetType: "PosBusinessDay",
            targetId: day.id,
            metadata: closeSummary,
          },
        });
        await enqueuePosNotification(tx, {
          kind: "CLOSE_DAY",
          title: `Cierre de día · ${day.businessDate.toISOString().slice(0, 10)}`,
          message: `${closeSummary.ticketCount} tickets · cobrado ${closeSummary.collectedTotal} MXN · gastos ${closeSummary.expenseTotal} MXN`,
          branchId: day.branchId,
          audiencePermission: "BUSINESS_DAY_CLOSE",
          createdByCredentialId: req.posUser!.credentialId,
          sourceType: "PosBusinessDay",
          sourceId: day.id,
        });
        return { status: 200, message: "Jornada cerrada de forma inmutable", data: businessDayDto(updated) };
      },
    }));
  }),
);

router.get("/attendance", requirePosPermission("BUSINESS_DAY_OPEN"), asyncRoute(async (req, res) => {
  const parsed = posOperationQuerySchema.pick({ businessDate: true, page: true, pageSize: true }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Consulta inválida", data: parsed.error.flatten().fieldErrors });
  const date = parsed.data.businessDate ?? currentBusinessDate();
  const where = { branchId: req.posUser!.branchId, businessDate: new Date(`${date}T00:00:00.000Z`) };
  const [items, total] = await Promise.all([
    prisma.posAttendance.findMany({ where, include: attendanceInclude, orderBy: { clockInAt: "desc" }, skip: (parsed.data.page - 1) * parsed.data.pageSize, take: parsed.data.pageSize }),
    prisma.posAttendance.count({ where }),
  ]);
  res.json({ success: true, message: "OK", data: { items: items.map(attendanceDto), page: parsed.data.page, pageSize: parsed.data.pageSize, total } });
}));

router.post("/attendance/clock-in", requirePosPermission("BUSINESS_DAY_OPEN"), asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res);
  if (!key) return;
  const parsed = posAttendanceClockInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Código inválido", data: parsed.error.flatten().fieldErrors });
  await respondIdempotent(res, executePosIdempotent({
    key,
    actorCredentialId: req.posUser!.credentialId,
    operation: `ATTENDANCE_CLOCK_IN:${req.posUser!.branchId}`,
    payload: { fingerprint: fingerprintSecret(parsed.data.pin, "pin") },
    execute: async (tx) => {
      const credential = await tx.posCredential.findUnique({
        where: { pinFingerprint: fingerprintSecret(parsed.data.pin, "pin") },
        include: { employee: true, masterProfile: true },
      });
      const matches = await verifyPosSecret(parsed.data.pin, credential?.pinHash ?? POS_DUMMY_BCRYPT_HASH);
      if (!credential?.active || !credential.employee?.activo || credential.masterProfile?.active || !matches) {
        throw new PosOperationError("Código de vendedor incorrecto o inactivo", 403);
      }
      if (!credential.employee.todasSucursales && credential.employee.sucursalId !== req.posUser!.branchId) {
        throw new PosOperationError("El vendedor no pertenece a esta sucursal", 403);
      }
      const date = currentBusinessDate();
      const day = await openDayForBranch(tx, req.posUser!.branchId, date);
      const attendance = await registerAttendanceIfMissing(tx, {
        businessDayId: day.id,
        businessDate: date,
        branchId: day.branchId,
        employeeId: credential.employee.id,
        credentialId: credential.id,
        terminalId: req.posUser!.terminalId,
      });
      if (!attendance) throw new PosOperationError("La credencial no pertenece a un vendedor", 409);
      await enqueuePosNotification(tx, {
        kind: "CLOCK_IN",
        title: `Clock In · ${credential.employee.nombreCompleto}`,
        message: `Entrada registrada en ${date}`,
        branchId: req.posUser!.branchId,
        audiencePermission: "BUSINESS_DAY_OPEN",
        createdByCredentialId: credential.id,
        sourceType: "PosAttendance",
        sourceId: attendance.id,
      });
      return { status: 201, message: "Entrada registrada", data: attendanceDto(attendance) };
    },
  }));
}));

router.post("/attendance/:id/clock-out", requirePosPermission("BUSINESS_DAY_OPEN"), asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res);
  if (!key) return;
  await respondIdempotent(res, executePosIdempotent({
    key,
    actorCredentialId: req.posUser!.credentialId,
    operation: `ATTENDANCE_CLOCK_OUT:${req.params["id"]}`,
    payload: { id: req.params["id"] },
    execute: async (tx) => {
      const attendance = await tx.posAttendance.findUnique({ where: { id: req.params["id"]! } });
      if (!attendance || attendance.branchId !== req.posUser!.branchId) throw new PosOperationError("Asistencia no encontrada", 404);
      if (attendance.status !== "OPEN") throw new PosOperationError("La asistencia ya fue cerrada", 409);
      const updated = await tx.posAttendance.update({
        where: { id: attendance.id },
        data: { status: "CLOSED", clockOutAt: new Date(), closeReason: "MANUAL", closedByCredentialId: req.posUser!.credentialId },
        include: attendanceInclude,
      });
      return { status: 200, message: "Salida registrada", data: attendanceDto(updated) };
    },
  }));
}));

router.get("/expense-types", requirePosPermission("CASH_MANAGE"), asyncRoute(async (_req, res) => {
  const types = await prisma.posExpenseType.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  res.json({ success: true, message: "OK", data: types.map((type) => ({ id: type.id, name: type.name, active: type.active })) });
}));

router.post("/expense-types", requirePosPermission("SETTINGS_MANAGE"), asyncRoute(async (req, res) => {
  const parsed = posExpenseTypeWriteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Tipo de gasto inválido", data: parsed.error.flatten().fieldErrors });
  const type = await prisma.posExpenseType.create({ data: { ...parsed.data, createdByCredentialId: req.posUser!.credentialId } });
  res.status(201).json({ success: true, message: "Tipo de gasto creado", data: { id: type.id, name: type.name, active: type.active } });
}));

router.put("/expense-types/:id", requirePosPermission("SETTINGS_MANAGE"), asyncRoute(async (req, res) => {
  const parsed = posExpenseTypeWriteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Tipo de gasto inválido", data: parsed.error.flatten().fieldErrors });
  const type = await prisma.posExpenseType.update({ where: { id: req.params["id"]! }, data: parsed.data });
  res.json({ success: true, message: "Tipo de gasto actualizado", data: { id: type.id, name: type.name, active: type.active } });
}));

router.delete("/expense-types/:id", requirePosPermission("SETTINGS_MANAGE"), asyncRoute(async (req, res) => {
  const used = await prisma.posCashExpense.count({ where: { expenseTypeId: req.params["id"]! } });
  const type = await prisma.posExpenseType.update({
    where: { id: req.params["id"]! },
    data: used ? { active: false } : { active: false, deletedAt: new Date() },
  });
  res.json({ success: true, message: used ? "Tipo inactivado; el historial se conservó" : "Tipo retirado", data: { id: type.id } });
}));

router.get("/expenses", requirePosPermission("CASH_MANAGE"), asyncRoute(async (req, res) => {
  const parsed = posOperationQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Consulta inválida", data: parsed.error.flatten().fieldErrors });
  const canViewAll = req.posUser!.isMaster || req.posUser!.permissions.includes("REPORTS_VIEW");
  const where: Prisma.PosCashExpenseWhereInput = {
    branchId: canViewAll && parsed.data.branchId ? parsed.data.branchId : req.posUser!.branchId,
    ...(!canViewAll || !parsed.data.businessDate ? { businessDate: new Date(`${parsed.data.businessDate ?? currentBusinessDate()}T00:00:00.000Z`) } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.posCashExpense.findMany({ where, include: cashExpenseInclude, orderBy: { creadoEn: "desc" }, skip: (parsed.data.page - 1) * parsed.data.pageSize, take: parsed.data.pageSize }),
    prisma.posCashExpense.count({ where }),
  ]);
  res.json({ success: true, message: "OK", data: { items: items.map(cashExpenseDto), page: parsed.data.page, pageSize: parsed.data.pageSize, total } });
}));

router.post("/expenses", requirePosPermission("CASH_MANAGE"), asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res);
  if (!key) return;
  const parsed = posCashExpenseWriteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Gasto inválido", data: parsed.error.flatten().fieldErrors });
  await respondIdempotent(res, executePosIdempotent({
    key,
    actorCredentialId: req.posUser!.credentialId,
    operation: "CASH_EXPENSE_CREATE",
    payload: parsed.data,
    execute: async (tx) => {
      const date = currentBusinessDate();
      const day = await openDayForBranch(tx, req.posUser!.branchId, date);
      const type = await tx.posExpenseType.findFirst({ where: { id: parsed.data.expenseTypeId, active: true, deletedAt: null } });
      if (!type) throw new PosOperationError("Tipo de gasto inactivo o inexistente");
      const employeeId = parsed.data.employeeId ?? req.posUser!.employeeId;
      if (employeeId && employeeId !== req.posUser!.employeeId && !req.posUser!.isMaster) throw new PosOperationError("No puedes registrar gastos para otro empleado", 403);
      const employee = employeeId ? await tx.empleado.findFirst({ where: { id: employeeId, activo: true } }) : null;
      const expense = await tx.posCashExpense.create({
        data: {
          folio: await nextCashExpenseFolio(tx),
          businessDayId: day.id,
          businessDate: day.businessDate,
          branchId: day.branchId,
          terminalId: req.posUser!.terminalId,
          employeeId,
          employeeNameSnapshot: employee?.nombreCompleto ?? req.posUser!.displayName,
          expenseTypeId: type.id,
          expenseTypeSnapshot: type.name,
          amount: decimal(parsed.data.amount),
          concept: parsed.data.concept,
          comment: parsed.data.comment,
          createdByCredentialId: req.posUser!.credentialId,
        },
        include: cashExpenseInclude,
      });
      await tx.posCashMovement.create({
        data: {
          expenseId: expense.id,
          kind: "EXPENSE",
          amount: expense.amount,
          businessDate: day.businessDate,
          actorCredentialId: req.posUser!.credentialId,
          snapshot: expenseSnapshot(expense),
        },
      });
      await enqueuePosNotification(tx, {
        kind: "CASH_EXPENSE",
        title: `Gasto registrado · ${expense.folio}`,
        message: `${expense.expenseTypeSnapshot} · ${expense.amount.toFixed(2)} MXN`,
        branchId: expense.branchId,
        audiencePermission: "CASH_MANAGE",
        createdByCredentialId: req.posUser!.credentialId,
        sourceType: "PosCashExpense",
        sourceId: expense.id,
      });
      return { status: 201, message: "Gasto registrado", data: cashExpenseDto(expense) };
    },
  }));
}));

router.put("/expenses/:id", requirePosPermission("CASH_MANAGE"), asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res);
  if (!key) return;
  const parsed = posCashExpenseCorrectionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Corrección inválida", data: parsed.error.flatten().fieldErrors });
  await respondIdempotent(res, executePosIdempotent({
    key,
    actorCredentialId: req.posUser!.credentialId,
    operation: `CASH_EXPENSE_CORRECT:${req.params["id"]}`,
    payload: parsed.data,
    execute: async (tx) => {
      const original = await tx.posCashExpense.findUnique({ where: { id: req.params["id"]! } });
      if (!original || original.branchId !== req.posUser!.branchId) throw new PosOperationError("Gasto no encontrado", 404);
      if (original.status !== "ACTIVE") throw new PosOperationError("El gasto ya fue anulado o corregido", 409);
      const authorization = await consumeOperationAuthorization(tx, { token: parsed.data.authorizationToken, purpose: "CASH_EXPENSE_EDIT", terminalId: req.posUser!.terminalId, entityType: "PosCashExpense", entityId: original.id });
      const date = currentBusinessDate();
      const currentDay = await openDayForBranch(tx, original.branchId, date);
      const type = await tx.posExpenseType.findFirst({ where: { id: parsed.data.expenseTypeId, deletedAt: null } });
      if (!type) throw new PosOperationError("Tipo de gasto inexistente");
      const employeeId = parsed.data.employeeId ?? original.employeeId;
      const employee = employeeId ? await tx.empleado.findUnique({ where: { id: employeeId } }) : null;
      await tx.posCashExpense.update({ where: { id: original.id }, data: { status: "VOIDED", voidedAt: new Date(), voidedByCredentialId: req.posUser!.credentialId, voidAuthorizationId: authorization.id } });
      await tx.posCashMovement.create({ data: { expenseId: original.id, kind: "VOID", amount: original.amount.negated(), businessDate: currentDay.businessDate, actorCredentialId: req.posUser!.credentialId, authorizationId: authorization.id, reason: parsed.data.reason, snapshot: expenseSnapshot(original) } });
      const replacement = await tx.posCashExpense.create({
        data: {
          folio: await nextCashExpenseFolio(tx), businessDayId: currentDay.id, businessDate: currentDay.businessDate,
          branchId: original.branchId, terminalId: req.posUser!.terminalId, employeeId,
          employeeNameSnapshot: employee?.nombreCompleto ?? original.employeeNameSnapshot,
          expenseTypeId: type.id, expenseTypeSnapshot: type.name, amount: decimal(parsed.data.amount),
          concept: parsed.data.concept, comment: parsed.data.comment, correctsExpenseId: original.id,
          createdByCredentialId: req.posUser!.credentialId,
        },
        include: cashExpenseInclude,
      });
      await tx.posCashMovement.create({ data: { expenseId: replacement.id, kind: "CORRECTION", amount: replacement.amount, businessDate: currentDay.businessDate, actorCredentialId: req.posUser!.credentialId, authorizationId: authorization.id, reason: parsed.data.reason, snapshot: expenseSnapshot(replacement) } });
      return { status: 200, message: original.businessDate.getTime() === currentDay.businessDate.getTime() ? "Gasto corregido con trazabilidad" : "Corrección aplicada en la jornada actual sin reabrir el histórico", data: cashExpenseDto(replacement) };
    },
  }));
}));

router.post("/expenses/:id/void", requirePosPermission("CASH_MANAGE"), asyncRoute(async (req, res) => {
  const key = idempotencyKey(req, res);
  if (!key) return;
  const parsed = posCashExpenseVoidSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Anulación inválida", data: parsed.error.flatten().fieldErrors });
  await respondIdempotent(res, executePosIdempotent({
    key,
    actorCredentialId: req.posUser!.credentialId,
    operation: `CASH_EXPENSE_VOID:${req.params["id"]}`,
    payload: parsed.data,
    execute: async (tx) => {
      const expense = await tx.posCashExpense.findUnique({ where: { id: req.params["id"]! }, include: cashExpenseInclude });
      if (!expense || expense.branchId !== req.posUser!.branchId) throw new PosOperationError("Gasto no encontrado", 404);
      if (expense.status !== "ACTIVE") throw new PosOperationError("El gasto ya fue anulado", 409);
      const authorization = await consumeOperationAuthorization(tx, { token: parsed.data.authorizationToken, purpose: "CASH_EXPENSE_VOID", terminalId: req.posUser!.terminalId, entityType: "PosCashExpense", entityId: expense.id });
      const currentDay = await openDayForBranch(tx, expense.branchId, currentBusinessDate());
      const updated = await tx.posCashExpense.update({ where: { id: expense.id }, data: { status: "VOIDED", voidedAt: new Date(), voidedByCredentialId: req.posUser!.credentialId, voidAuthorizationId: authorization.id }, include: cashExpenseInclude });
      await tx.posCashMovement.create({ data: { expenseId: expense.id, kind: "VOID", amount: expense.amount.negated(), businessDate: currentDay.businessDate, actorCredentialId: req.posUser!.credentialId, authorizationId: authorization.id, reason: parsed.data.reason, snapshot: expenseSnapshot(expense) } });
      return { status: 200, message: expense.businessDate.getTime() === currentDay.businessDate.getTime() ? "Gasto anulado" : "Anulación compensada en la jornada actual", data: cashExpenseDto(updated) };
    },
  }));
}));

async function operationalSummary(req: Request) {
  const parsed = z.object({ businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), branchId: z.string().min(1).optional() }).strict().parse(req.query);
  const date = parsed.businessDate ?? currentBusinessDate();
  // REPORTS_VIEW autoriza el módulo, pero sólo una identidad master puede
  // ampliar el alcance más allá de la sucursal fija de la terminal.
  const branchId = req.posUser!.isMaster ? parsed.branchId ?? null : req.posUser!.branchId;
  const dateValue = new Date(`${date}T00:00:00.000Z`);
  const branchWhere = branchId ? { branchId } : {};
  const [days, tickets, operations, movements, cashMovements, attendances] = await Promise.all([
    prisma.posBusinessDay.findMany({ where: { ...branchWhere, businessDate: dateValue }, include: { branch: true, openingCount: { include: { lines: true } }, closingCount: { include: { lines: true } } } }),
    prisma.posTicket.findMany({ where: { ...branchWhere, businessDate: dateValue, status: { in: ["COMPLETED", "LAYAWAY"] } }, include: { sellers: true, lines: true } }),
    prisma.posPaymentOperation.findMany({ where: { businessDate: dateValue, ticket: branchWhere }, include: { payments: true } }),
    prisma.inventoryMovement.count({ where: { businessDate: dateValue, lines: { some: branchId ? { OR: [{ fromLocation: { branchId } }, { toLocation: { branchId } }] } : {} } } }),
    prisma.posCashMovement.findMany({ where: { businessDate: dateValue, expense: branchWhere }, select: { amount: true } }),
    prisma.posAttendance.count({ where: { ...branchWhere, businessDate: dateValue, status: "OPEN" } }),
  ]);
  const salesTotal = tickets.reduce((sum, ticket) => sum.plus(ticket.total), decimal(0));
  const discountTotal = tickets.reduce((sum, ticket) => sum.plus(ticket.discountTotal), decimal(0));
  const signedOperation = (kind: string) => ["REFUND", "CANCELED"].includes(kind) ? -1 : 1;
  const collectedTotal = operations.reduce((sum, operation) => sum.plus(operation.amount.times(signedOperation(operation.kind))), decimal(0));
  const expenseTotal = cashMovements.reduce((sum, movement) => sum.plus(movement.amount), decimal(0));
  const sellerMap = new Map<string, { name: string; amount: Prisma.Decimal }>();
  const productMap = new Map<string, { itemId: string | null; name: string; quantity: Prisma.Decimal; amount: Prisma.Decimal }>();
  for (const ticket of tickets) {
    for (const seller of ticket.sellers) {
      const current = sellerMap.get(seller.employeeId) ?? { name: seller.sellerNameSnapshot, amount: decimal(0) };
      current.amount = current.amount.plus(seller.shareAmount);
      sellerMap.set(seller.employeeId, current);
    }
    for (const line of ticket.lines) {
      const key = line.itemId ?? `${line.skuSnapshot}:${line.itemNameSnapshot}`;
      const current = productMap.get(key) ?? { itemId: line.itemId, name: line.itemNameSnapshot, quantity: decimal(0), amount: decimal(0) };
      current.quantity = current.quantity.plus(line.quantity);
      current.amount = current.amount.plus(line.total);
      productMap.set(key, current);
    }
  }
  const paymentMap = new Map<string, { name: string; amount: Prisma.Decimal }>();
  for (const operation of operations) for (const payment of operation.payments) {
    const current = paymentMap.get(payment.paymentMethodId) ?? { name: payment.methodNameSnapshot, amount: decimal(0) };
    current.amount = current.amount.plus(payment.amount.times(signedOperation(operation.kind)));
    paymentMap.set(payment.paymentMethodId, current);
  }
  const singleDay = branchId ? days[0] ?? null : null;
  const status = days.some((day) => day.status === "OPEN") ? "OPEN" : days.length ? "CLOSED" : "NOT_OPENED";
  return {
    businessDate: date,
    branchId,
    branchName: branchId ? days[0]?.branch.nombre ?? "Sucursal" : "Todas las sucursales",
    businessDayStatus: status,
    salesTotal: salesTotal.toFixed(2),
    collectedTotal: collectedTotal.toFixed(2),
    discountTotal: discountTotal.toFixed(2),
    expenseTotal: expenseTotal.toFixed(2),
    netCashFlow: collectedTotal.minus(expenseTotal).toFixed(2),
    ticketCount: tickets.length,
    sellerCount: sellerMap.size,
    unitsSold: [...productMap.values()].reduce((sum, product) => sum.plus(product.quantity), decimal(0)).toFixed(2),
    inventoryMovementCount: movements,
    attendanceOpenCount: attendances,
    paymentMethods: [...paymentMap].map(([methodId, value]) => ({ methodId, name: value.name, amount: value.amount.toFixed(2) })).sort((a, b) => b.amount.localeCompare(a.amount)),
    sellers: [...sellerMap].map(([employeeId, value]) => ({ employeeId, name: value.name, amount: value.amount.toFixed(2) })).sort((a, b) => Number(b.amount) - Number(a.amount)),
    products: [...productMap.values()].map((value) => ({ ...value, quantity: value.quantity.toFixed(2), amount: value.amount.toFixed(2) })).sort((a, b) => Number(b.amount) - Number(a.amount)),
    ...(singleDay && auditAllowed(req) ? { inventoryAudit: { opening: singleDay.openingCount ? inventoryCountDto(singleDay.openingCount, true, costsAllowed(req)) : null, closing: singleDay.closingCount ? inventoryCountDto(singleDay.closingCount, true, costsAllowed(req)) : null } } : {}),
  };
}

router.get("/dashboard", reportsAllowed, asyncRoute(async (req, res) => {
  res.json({ success: true, message: "OK", data: await operationalSummary(req) });
}));

router.get("/reports/x-report", requirePosPermission("REPORTS_VIEW"), asyncRoute(async (req, res) => {
  res.json({ success: true, message: "OK", data: await operationalSummary(req) });
}));

export default router;
