import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authMiddleware } from "../middlewares/auth.middleware";
import { prisma } from "../prisma/client";
import {
  approvePayrollRun,
  cancelPayrollRun,
  createPayrollRun,
  getPayrollRun,
  listPayrollRuns,
  payPayrollRun,
  recalculatePayrollRun,
  updateDraftPayrollRun,
} from "../services/payroll.service";
import {
  assertStandardPayrollPeriod,
  generateInstallmentSchedule,
  money,
  nextPayrollPeriod,
} from "../services/payroll-calculation";
import {
  getPayrollAttachmentUrl,
  isPayrollStorageConfigured,
  MAX_PAYROLL_ATTACHMENT_BYTES,
  removePayrollAttachment,
  uploadPayrollAttachment,
} from "../services/payroll-storage";

const router: ExpressRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PAYROLL_ATTACHMENT_BYTES },
});

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;
const asyncRoute =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };

function ok(res: Response, data: unknown, message = "OK", status = 200): void {
  res.status(status).json({ success: true, data, message });
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("La fecha no es válida.");
  }
  return date;
}

function endExclusive(date: Date): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeText(value: string): string {
  return value.trim().toLocaleUpperCase("es-MX");
}

function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.rol !== "SUPER_ADMIN") {
    res
      .status(403)
      .json({
        success: false,
        data: null,
        message: "Payroll está disponible únicamente para SUPER_ADMIN.",
      });
    return;
  }
  next();
}

function currentUserId(req: Request): string {
  if (!req.user?.id) throw new Error("No autenticado.");
  return req.user.id;
}

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const positiveMoney = z.coerce.number().positive().max(999_999_999_999);
const nullableId = z.string().min(1).nullable().optional();

router.use(authMiddleware, requireSuperAdmin);

router.get(
  "/bootstrap",
  asyncRoute(async (_req, res) => {
    const [employees, branches] = await Promise.all([
      prisma.empleado.findMany({
        orderBy: [{ activo: "desc" }, { nombreCompleto: "asc" }],
        include: {
          bank: { select: { id: true, nombre: true } },
          position: { select: { id: true, nombre: true } },
        },
      }),
      prisma.sucursal.findMany({
        orderBy: [{ activa: "desc" }, { nombre: "asc" }],
      }),
    ]);
    ok(res, {
      employees: employees.map((employee) => ({
        id: employee.id,
        name: employee.nombreCompleto,
        active: employee.activo,
        position: employee.position?.nombre ?? employee.puesto,
        bank: employee.bank?.nombre ?? employee.banco,
        account: employee.numeroCuenta,
        salary: employee.sueldo,
        phone: employee.numeroTelefono,
      })),
      branches,
      storageConfigured: isPayrollStorageConfigured(),
    });
  }),
);

// ─── Catálogos de movimientos ────────────────────────────────────────────────

const catalogSchema = z.object({
  kind: z.enum(["BONUS", "FINE", "PER_DIEM"]),
  name: z.string().trim().min(1).max(120),
  defaultAmount: positiveMoney,
  notes: z.string().trim().max(1000).optional().default(""),
});

router.get(
  "/catalog-items",
  asyncRoute(async (req, res) => {
    const kind = z
      .enum(["BONUS", "FINE", "PER_DIEM"])
      .optional()
      .parse(req.query["kind"]);
    const items = await prisma.payrollCatalogItem.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ kind: "asc" }, { active: "desc" }, { name: "asc" }],
    });
    ok(res, items);
  }),
);

router.post(
  "/catalog-items",
  asyncRoute(async (req, res) => {
    const input = catalogSchema.parse(req.body);
    const name = normalizeText(input.name);
    const existing = await prisma.payrollCatalogItem.findUnique({
      where: { kind_name: { kind: input.kind, name } },
    });
    const item = existing
      ? await prisma.payrollCatalogItem.update({
          where: { id: existing.id },
          data: {
            defaultAmount: input.defaultAmount,
            notes: normalizeText(input.notes),
            active: true,
          },
        })
      : await prisma.payrollCatalogItem.create({
          data: {
            kind: input.kind,
            name,
            defaultAmount: input.defaultAmount,
            notes: normalizeText(input.notes),
            createdById: currentUserId(req),
          },
        });
    ok(
      res,
      item,
      existing ? "Catálogo reactivado." : "Catálogo creado.",
      existing ? 200 : 201,
    );
  }),
);

router.put(
  "/catalog-items/:id",
  asyncRoute(async (req, res) => {
    const input = catalogSchema.parse(req.body);
    const item = await prisma.payrollCatalogItem.update({
      where: { id: req.params["id"] },
      data: {
        kind: input.kind,
        name: normalizeText(input.name),
        defaultAmount: input.defaultAmount,
        notes: normalizeText(input.notes),
      },
    });
    ok(res, item, "Catálogo actualizado.");
  }),
);

router.delete(
  "/catalog-items/:id",
  asyncRoute(async (req, res) => {
    const item = await prisma.payrollCatalogItem.update({
      where: { id: req.params["id"] },
      data: { active: false },
    });
    ok(res, item, "Catálogo desactivado.");
  }),
);

// ─── Esquemas y asignaciones ─────────────────────────────────────────────────

const tierSchema = z.object({
  fromAmount: z.coerce.number().min(0),
  toAmount: z.coerce.number().min(0).nullable(),
  rate: z.coerce.number().min(0).max(1),
});
const schemeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  effectiveFrom: dateString,
  tiers: z.array(tierSchema).min(1).max(12),
});

function validateTiers(tiers: z.infer<typeof tierSchema>[]): void {
  const ordered = [...tiers].sort(
    (left, right) => left.fromAmount - right.fromAmount,
  );
  if (ordered[0]?.fromAmount !== 0)
    throw new Error("El primer rango debe iniciar en 0.");
  if (ordered.at(-1)?.toAmount != null)
    throw new Error("El último rango debe quedar sin límite superior.");
  ordered.forEach((tier, index) => {
    if (tier.toAmount != null && tier.toAmount < tier.fromAmount)
      throw new Error("Cada límite Hasta debe ser mayor o igual a Desde.");
    const next = ordered[index + 1];
    if (
      next &&
      tier.toAmount != null &&
      !money(tier.toAmount).plus(0.01).equals(money(next.fromAmount))
    ) {
      throw new Error("Los rangos deben ser continuos y no traslaparse.");
    }
  });
}

function assertQuincenaStart(date: Date): void {
  if (![1, 16].includes(date.getUTCDate()))
    throw new Error("La vigencia debe iniciar el día 1 o 16 del mes.");
}

router.get(
  "/schemes",
  asyncRoute(async (_req, res) => {
    const [schemes, assignments] = await Promise.all([
      prisma.commissionScheme.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
        include: {
          versions: {
            orderBy: { effectiveFrom: "desc" },
            include: { tiers: { orderBy: { sortOrder: "asc" } } },
          },
        },
      }),
      prisma.employeeCommissionAssignment.findMany({
        orderBy: [{ effectiveFrom: "desc" }],
        include: {
          employee: {
            select: {
              id: true,
              nombreCompleto: true,
              activo: true,
              puesto: true,
              position: { select: { nombre: true } },
            },
          },
          scheme: { select: { id: true, name: true, active: true } },
        },
      }),
    ]);
    ok(res, { schemes, assignments });
  }),
);

router.post(
  "/schemes",
  asyncRoute(async (req, res) => {
    const input = schemeSchema.parse(req.body);
    validateTiers(input.tiers);
    const effectiveFrom = parseDate(input.effectiveFrom);
    assertQuincenaStart(effectiveFrom);
    const scheme = await prisma.commissionScheme.create({
      data: {
        name: normalizeText(input.name),
        versions: {
          create: {
            version: 1,
            effectiveFrom,
            createdById: currentUserId(req),
            tiers: {
              create: input.tiers
                .sort((a, b) => a.fromAmount - b.fromAmount)
                .map((tier, index) => ({ ...tier, sortOrder: index })),
            },
          },
        },
      },
      include: { versions: { include: { tiers: true } } },
    });
    ok(res, scheme, "Esquema creado.", 201);
  }),
);

router.put(
  "/schemes/:id",
  asyncRoute(async (req, res) => {
    const input = schemeSchema.parse(req.body);
    validateTiers(input.tiers);
    const effectiveFrom = parseDate(input.effectiveFrom);
    assertQuincenaStart(effectiveFrom);
    const now = new Date();
    const next = nextPayrollPeriod(
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() <= 15 ? 1 : 16,
        ),
      ),
    );
    if (effectiveFrom < next.periodStart)
      throw new Error(
        `La nueva versión debe iniciar a partir de ${isoDate(next.periodStart)}.`,
      );
    const current = await prisma.commissionScheme.findUniqueOrThrow({
      where: { id: req.params["id"] },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    const updated = await prisma.commissionScheme.update({
      where: { id: current.id },
      data: {
        name: normalizeText(input.name),
        versions: {
          create: {
            version: (current.versions[0]?.version ?? 0) + 1,
            effectiveFrom,
            createdById: currentUserId(req),
            tiers: {
              create: input.tiers
                .sort((a, b) => a.fromAmount - b.fromAmount)
                .map((tier, index) => ({ ...tier, sortOrder: index })),
            },
          },
        },
      },
      include: {
        versions: {
          orderBy: { effectiveFrom: "desc" },
          include: { tiers: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
    ok(res, updated, "Nueva versión del esquema programada.");
  }),
);

router.delete(
  "/schemes/:id",
  asyncRoute(async (req, res) => {
    const scheme = await prisma.commissionScheme.update({
      where: { id: req.params["id"] },
      data: { active: false },
    });
    ok(res, scheme, "Esquema desactivado.");
  }),
);

const assignmentSchema = z.object({
  employeeId: z.string().min(1),
  schemeId: z.string().min(1),
  effectiveFrom: dateString,
});

router.post(
  "/assignments",
  asyncRoute(async (req, res) => {
    const input = assignmentSchema.parse(req.body);
    const effectiveFrom = parseDate(input.effectiveFrom);
    assertQuincenaStart(effectiveFrom);
    const applicableScheme = await prisma.commissionScheme.findFirst({
      where: {
        id: input.schemeId,
        active: true,
        versions: { some: { effectiveFrom: { lte: effectiveFrom } } },
      },
      select: { id: true },
    });
    if (!applicableScheme) {
      throw new Error(
        "El esquema no tiene una versión vigente para la fecha de asignación.",
      );
    }
    const existing = await prisma.employeeCommissionAssignment.findFirst({
      where: { employeeId: input.employeeId, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    });
    if (existing) {
      const now = new Date();
      const next = nextPayrollPeriod(
        new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() <= 15 ? 1 : 16,
          ),
        ),
      );
      if (effectiveFrom < next.periodStart)
        throw new Error(
          `El cambio debe iniciar a partir de ${isoDate(next.periodStart)}.`,
        );
    }
    const assignment = await prisma.$transaction(async (tx) => {
      if (existing) {
        const effectiveTo = new Date(effectiveFrom);
        effectiveTo.setUTCDate(effectiveTo.getUTCDate() - 1);
        await tx.employeeCommissionAssignment.update({
          where: { id: existing.id },
          data: { effectiveTo },
        });
      }
      return tx.employeeCommissionAssignment.create({
        data: { ...input, effectiveFrom, createdById: currentUserId(req) },
        include: { employee: true, scheme: true },
      });
    });
    ok(res, assignment, "Asignación guardada.", 201);
  }),
);

router.delete(
  "/assignments/:id",
  asyncRoute(async (req, res) => {
    const assignment =
      await prisma.employeeCommissionAssignment.findUniqueOrThrow({
        where: { id: req.params["id"] },
      });
    const today = new Date();
    if (assignment.effectiveFrom > today) {
      await prisma.employeeCommissionAssignment.delete({
        where: { id: assignment.id },
      });
      ok(res, null, "Asignación futura eliminada.");
      return;
    }
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const updated = await prisma.employeeCommissionAssignment.update({
      where: { id: assignment.id },
      data: { effectiveTo: end },
    });
    ok(res, updated, "Asignación cerrada sin borrar su histórico.");
  }),
);

// ─── Movimientos y comprobantes ──────────────────────────────────────────────

const allocationSchema = z.object({
  employeeId: z.string().min(1),
  branchId: nullableId,
  amount: positiveMoney,
  commissionable: z.boolean().default(true),
});
const movementSchema = z.object({
  date: dateString,
  kind: z.enum([
    "BONUS",
    "ADJUSTMENT_POSITIVE",
    "ADJUSTMENT_NEGATIVE",
    "FINE",
    "PER_DIEM",
    "SUPPLIES",
  ]),
  catalogItemId: nullableId,
  concept: z.string().trim().min(1).max(160),
  totalAmount: positiveMoney,
  notes: z.string().trim().max(1500).optional().default(""),
  allocations: z.array(allocationSchema).min(1).max(5),
});

function validateAllocations(input: z.infer<typeof movementSchema>): void {
  if (
    new Set(input.allocations.map((item) => item.employeeId)).size !==
    input.allocations.length
  ) {
    throw new Error("Cada participante solo puede aparecer una vez.");
  }
  const sum = input.allocations.reduce(
    (total, item) => total.plus(item.amount),
    new Prisma.Decimal(0),
  );
  if (!money(sum).equals(money(input.totalAmount)))
    throw new Error(
      "La suma de participantes debe coincidir con el monto total.",
    );
}

router.get(
  "/movements",
  asyncRoute(async (req, res) => {
    const from =
      typeof req.query["from"] === "string"
        ? parseDate(req.query["from"])
        : new Date(Date.now() - 90 * 86_400_000);
    const to =
      typeof req.query["to"] === "string"
        ? endExclusive(parseDate(req.query["to"]))
        : endExclusive(new Date());
    const movements = await prisma.payrollMovement.findMany({
      where: { date: { gte: from, lt: to } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        allocations: {
          include: {
            employee: { select: { id: true, nombreCompleto: true } },
            branch: { select: { id: true, nombre: true } },
          },
        },
        attachments: true,
      },
    });
    ok(res, movements);
  }),
);

router.post(
  "/movements",
  asyncRoute(async (req, res) => {
    const input = movementSchema.parse(req.body);
    validateAllocations(input);
    const movement = await prisma.payrollMovement.create({
      data: {
        date: parseDate(input.date),
        kind: input.kind,
        catalogItemId: input.catalogItemId ?? null,
        concept: normalizeText(input.concept),
        totalAmount: input.totalAmount,
        notes: normalizeText(input.notes),
        createdById: currentUserId(req),
        allocations: {
          create: input.allocations.map((allocation) => ({
            ...allocation,
            branchId: allocation.branchId ?? null,
          })),
        },
      },
      include: { allocations: true, attachments: true },
    });
    ok(res, movement, "Movimiento creado y pendiente de aprobación.", 201);
  }),
);

router.put(
  "/movements/:id",
  asyncRoute(async (req, res) => {
    const input = movementSchema.parse(req.body);
    validateAllocations(input);
    const current = await prisma.payrollMovement.findUniqueOrThrow({
      where: { id: req.params["id"] },
    });
    if (current.status !== "PENDING" || current.payrollRunId)
      throw new Error(
        "Solo puede editarse un movimiento pendiente y no asignado.",
      );
    const movement = await prisma.payrollMovement.update({
      where: { id: current.id },
      data: {
        date: parseDate(input.date),
        kind: input.kind,
        catalogItemId: input.catalogItemId ?? null,
        concept: normalizeText(input.concept),
        totalAmount: input.totalAmount,
        notes: normalizeText(input.notes),
        allocations: {
          deleteMany: {},
          create: input.allocations.map((allocation) => ({
            ...allocation,
            branchId: allocation.branchId ?? null,
          })),
        },
      },
      include: { allocations: true, attachments: true },
    });
    ok(res, movement, "Movimiento actualizado.");
  }),
);

router.patch(
  "/movements/:id/status",
  asyncRoute(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(["APPROVED", "REJECTED"]) })
      .parse(req.body);
    const current = await prisma.payrollMovement.findUniqueOrThrow({
      where: { id: req.params["id"] },
      include: { attachments: true },
    });
    if (current.payrollRunId)
      throw new Error("El movimiento ya pertenece a una corrida.");
    if (
      status === "APPROVED" &&
      (current.kind === "PER_DIEM" || current.kind === "SUPPLIES") &&
      current.attachments.length === 0
    ) {
      throw new Error(
        "Este movimiento requiere un comprobante antes de aprobarse.",
      );
    }
    const movement = await prisma.payrollMovement.update({
      where: { id: current.id },
      data: {
        status,
        reviewedById: currentUserId(req),
        reviewedAt: new Date(),
      },
    });
    ok(
      res,
      movement,
      status === "APPROVED" ? "Movimiento aprobado." : "Movimiento rechazado.",
    );
  }),
);

router.post(
  "/movements/:id/attachments",
  upload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) throw new Error("Selecciona un archivo.");
    const movement = await prisma.payrollMovement.findUniqueOrThrow({
      where: { id: req.params["id"] },
    });
    if (movement.payrollRunId)
      throw new Error(
        "No pueden agregarse archivos a un movimiento ya incluido en una corrida.",
      );
    const uploaded = await uploadPayrollAttachment(movement.id, req.file);
    try {
      const attachment = await prisma.payrollAttachment.create({
        data: {
          movementId: movement.id,
          storagePath: uploaded.path,
          fileName: normalizeText(req.file.originalname),
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
        },
      });
      ok(res, attachment, "Comprobante guardado.", 201);
    } catch (error) {
      await removePayrollAttachment(uploaded.path);
      throw error;
    }
  }),
);

router.get(
  "/attachments/:id/url",
  asyncRoute(async (req, res) => {
    const attachment = await prisma.payrollAttachment.findUniqueOrThrow({
      where: { id: req.params["id"] },
    });
    ok(res, { url: await getPayrollAttachmentUrl(attachment.storagePath) });
  }),
);

router.delete(
  "/attachments/:id",
  asyncRoute(async (req, res) => {
    const attachment = await prisma.payrollAttachment.findUniqueOrThrow({
      where: { id: req.params["id"] },
      include: { movement: true },
    });
    if (attachment.movement.payrollRunId)
      throw new Error(
        "El comprobante pertenece a una corrida y no puede borrarse.",
      );
    await removePayrollAttachment(attachment.storagePath);
    await prisma.payrollAttachment.delete({ where: { id: attachment.id } });
    ok(res, null, "Comprobante eliminado.");
  }),
);

// ─── Gastos ──────────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  date: dateString,
  kind: z.enum(["FIXED", "VARIABLE"]),
  concept: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(120),
  branchId: nullableId,
  costCenter: z.string().trim().min(1).max(120),
  amount: positiveMoney,
  frequency: z.enum(["ONE_TIME", "BIWEEKLY", "MONTHLY"]),
  notes: z.string().trim().max(1500).optional().default(""),
});

router.get(
  "/expenses",
  asyncRoute(async (req, res) => {
    const from =
      typeof req.query["from"] === "string"
        ? parseDate(req.query["from"])
        : new Date(Date.now() - 365 * 86_400_000);
    const to =
      typeof req.query["to"] === "string"
        ? endExclusive(parseDate(req.query["to"]))
        : endExclusive(new Date());
    const expenses = await prisma.payrollExpense.findMany({
      where: { date: { gte: from, lt: to }, deletedAt: null },
      include: { branch: { select: { id: true, nombre: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    ok(res, expenses);
  }),
);

router.post(
  "/expenses",
  asyncRoute(async (req, res) => {
    const input = expenseSchema.parse(req.body);
    const expense = await prisma.payrollExpense.create({
      data: {
        ...input,
        date: parseDate(input.date),
        concept: normalizeText(input.concept),
        category: normalizeText(input.category),
        costCenter: normalizeText(input.costCenter),
        notes: normalizeText(input.notes),
        branchId: input.branchId ?? null,
        createdById: currentUserId(req),
      },
    });
    ok(res, expense, "Gasto guardado.", 201);
  }),
);

router.put(
  "/expenses/:id",
  asyncRoute(async (req, res) => {
    const input = expenseSchema.parse(req.body);
    const current = await prisma.payrollExpense.findUniqueOrThrow({
      where: { id: req.params["id"] },
    });
    if (current.payrollRunId)
      throw new Error(
        "Un gasto incluido en una corrida aprobada no puede editarse.",
      );
    const expense = await prisma.payrollExpense.update({
      where: { id: current.id },
      data: {
        ...input,
        date: parseDate(input.date),
        concept: normalizeText(input.concept),
        category: normalizeText(input.category),
        costCenter: normalizeText(input.costCenter),
        notes: normalizeText(input.notes),
        branchId: input.branchId ?? null,
      },
    });
    ok(res, expense, "Gasto actualizado.");
  }),
);

router.delete(
  "/expenses/:id",
  asyncRoute(async (req, res) => {
    const current = await prisma.payrollExpense.findUniqueOrThrow({
      where: { id: req.params["id"] },
    });
    if (current.payrollRunId)
      throw new Error(
        "Un gasto incluido en una corrida aprobada no puede borrarse.",
      );
    const expense = await prisma.payrollExpense.update({
      where: { id: current.id },
      data: { deletedAt: new Date() },
    });
    ok(res, expense, "Gasto eliminado sin perder su auditoría.");
  }),
);

// ─── Préstamos y adelantos ───────────────────────────────────────────────────

const loanSchema = z.object({
  requestedAt: dateString,
  employeeId: z.string().min(1),
  kind: z.enum(["LOAN", "PAYROLL_ADVANCE"]),
  requestedAmount: positiveMoney,
  installmentCount: z.coerce.number().int().min(1).max(120),
  firstPeriodStart: dateString,
  notes: z.string().trim().max(1500).optional().default(""),
});

router.get(
  "/loans",
  asyncRoute(async (_req, res) => {
    const loans = await prisma.loanAdvance.findMany({
      orderBy: [{ requestedAt: "desc" }, { createdAt: "desc" }],
      include: {
        employee: {
          select: {
            id: true,
            nombreCompleto: true,
            activo: true,
            puesto: true,
            position: { select: { nombre: true } },
          },
        },
        installments: { orderBy: { sequence: "asc" } },
      },
    });
    ok(res, loans);
  }),
);

async function createLoan(input: z.infer<typeof loanSchema>, userId: string) {
  const schedule = generateInstallmentSchedule(
    input.requestedAmount,
    input.installmentCount,
    parseDate(input.firstPeriodStart),
  );
  return prisma.loanAdvance.create({
    data: {
      requestedAt: parseDate(input.requestedAt),
      employeeId: input.employeeId,
      kind: input.kind,
      requestedAmount: input.requestedAmount,
      installmentCount: input.installmentCount,
      installmentAmount: schedule[0]?.amount ?? input.requestedAmount,
      balance: input.requestedAmount,
      notes: normalizeText(input.notes),
      createdById: userId,
      installments: { create: schedule },
    },
    include: { employee: true, installments: { orderBy: { sequence: "asc" } } },
  });
}

router.post(
  "/loans",
  asyncRoute(async (req, res) => {
    const loan = await createLoan(
      loanSchema.parse(req.body),
      currentUserId(req),
    );
    ok(res, loan, "Préstamo o adelanto creado.", 201);
  }),
);

router.put(
  "/loans/:id",
  asyncRoute(async (req, res) => {
    const input = loanSchema.parse(req.body);
    const current = await prisma.loanAdvance.findUniqueOrThrow({
      where: { id: req.params["id"] },
      include: { installments: true },
    });
    if (current.installments.some((item) => item.status !== "SCHEDULED"))
      throw new Error(
        "El préstamo ya tiene cuotas reservadas o pagadas y no puede editarse.",
      );
    const schedule = generateInstallmentSchedule(
      input.requestedAmount,
      input.installmentCount,
      parseDate(input.firstPeriodStart),
    );
    const loan = await prisma.loanAdvance.update({
      where: { id: current.id },
      data: {
        requestedAt: parseDate(input.requestedAt),
        employeeId: input.employeeId,
        kind: input.kind,
        requestedAmount: input.requestedAmount,
        installmentCount: input.installmentCount,
        installmentAmount: schedule[0]?.amount ?? input.requestedAmount,
        balance: input.requestedAmount,
        notes: normalizeText(input.notes),
        installments: { deleteMany: {}, create: schedule },
      },
      include: {
        employee: true,
        installments: { orderBy: { sequence: "asc" } },
      },
    });
    ok(res, loan, "Préstamo o adelanto actualizado.");
  }),
);

router.delete(
  "/loans/:id",
  asyncRoute(async (req, res) => {
    const current = await prisma.loanAdvance.findUniqueOrThrow({
      where: { id: req.params["id"] },
      include: { installments: true },
    });
    if (
      current.installments.some(
        (item) => item.status === "PAID" || item.status === "RESERVED",
      )
    ) {
      throw new Error(
        "No puede cancelarse un préstamo con cuotas reservadas o pagadas.",
      );
    }
    const loan = await prisma.$transaction(async (tx) => {
      await tx.loanAdvanceInstallment.updateMany({
        where: { loanAdvanceId: current.id },
        data: { status: "CANCELED" },
      });
      return tx.loanAdvance.update({
        where: { id: current.id },
        data: { status: "CANCELED" },
      });
    });
    ok(res, loan, "Préstamo o adelanto cancelado.");
  }),
);

router.patch(
  "/loans/:id/status",
  asyncRoute(async (req, res) => {
    const { status } = z.object({ status: z.enum(["LOST"]) }).parse(req.body);
    const current = await prisma.loanAdvance.findUniqueOrThrow({
      where: { id: req.params["id"] },
    });
    if (current.status !== "PENDING")
      throw new Error(
        "Solo un préstamo pendiente puede marcarse como perdido.",
      );
    const loan = await prisma.$transaction(async (tx) => {
      await tx.loanAdvanceInstallment.updateMany({
        where: { loanAdvanceId: current.id, status: "SCHEDULED" },
        data: { status: "CANCELED" },
      });
      return tx.loanAdvance.update({
        where: { id: current.id },
        data: { status },
      });
    });
    ok(res, loan, "Préstamo marcado como perdido; se conserva el histórico.");
  }),
);

// ─── Corridas ────────────────────────────────────────────────────────────────

const runSchema = z.object({
  periodStart: dateString,
  periodEnd: dateString,
  payDate: dateString,
  mode: z.enum(["WITH_VAT", "WITHOUT_VAT"]),
});

router.get(
  "/runs",
  asyncRoute(async (_req, res) => ok(res, await listPayrollRuns())),
);

router.get(
  "/runs/:id",
  asyncRoute(async (req, res) => {
    const run = await getPayrollRun(req.params["id"]!);
    if (!run) {
      res
        .status(404)
        .json({
          success: false,
          data: null,
          message: "Corrida no encontrada.",
        });
      return;
    }
    ok(res, run);
  }),
);

router.post(
  "/runs",
  asyncRoute(async (req, res) => {
    const input = runSchema.parse(req.body);
    const run = await createPayrollRun(
      {
        periodStart: parseDate(input.periodStart),
        periodEnd: parseDate(input.periodEnd),
        payDate: parseDate(input.payDate),
        mode: input.mode,
      },
      currentUserId(req),
    );
    ok(res, run, "Corrida creada y calculada.", 201);
  }),
);

router.put(
  "/runs/:id",
  asyncRoute(async (req, res) => {
    const input = runSchema
      .pick({ payDate: true, mode: true })
      .partial()
      .parse(req.body);
    const run = await updateDraftPayrollRun(
      req.params["id"]!,
      {
        ...(input.payDate ? { payDate: parseDate(input.payDate) } : {}),
        ...(input.mode ? { mode: input.mode } : {}),
      },
      currentUserId(req),
    );
    ok(res, run, "Corrida recalculada.");
  }),
);

router.post(
  "/runs/:id/recalculate",
  asyncRoute(async (req, res) => {
    ok(
      res,
      await recalculatePayrollRun(req.params["id"]!, currentUserId(req)),
      "Corrida recalculada.",
    );
  }),
);

router.post(
  "/runs/:id/approve",
  asyncRoute(async (req, res) => {
    ok(
      res,
      await approvePayrollRun(req.params["id"]!, currentUserId(req)),
      "Corrida aprobada y congelada.",
    );
  }),
);

router.post(
  "/runs/:id/pay",
  asyncRoute(async (req, res) => {
    ok(
      res,
      await payPayrollRun(req.params["id"]!, currentUserId(req)),
      "Corrida pagada y recibos generados.",
    );
  }),
);

router.post(
  "/runs/:id/cancel",
  asyncRoute(async (req, res) => {
    ok(
      res,
      await cancelPayrollRun(req.params["id"]!, currentUserId(req)),
      "Corrida cancelada.",
    );
  }),
);

// ─── Reporte por sucursal y recibos ─────────────────────────────────────────

router.get(
  "/reports/branch-breakdown",
  asyncRoute(async (req, res) => {
    const runId = z.string().min(1).parse(req.query["runId"]);
    const run = await prisma.payrollRun.findUniqueOrThrow({
      where: { id: runId },
      include: {
        lines: {
          orderBy: { employeeName: "asc" },
          include: { branchLines: { orderBy: { branchName: "asc" } } },
        },
      },
    });
    const branchMap = new Map<
      string,
      {
        branchName: string;
        salesWithVat: Prisma.Decimal;
        salesWithoutVat: Prisma.Decimal;
        payrollCost: Prisma.Decimal;
        employeeCount: number;
      }
    >();
    for (const line of run.lines) {
      for (const branch of line.branchLines) {
        const current = branchMap.get(branch.branchName) ?? {
          branchName: branch.branchName,
          salesWithVat: new Prisma.Decimal(0),
          salesWithoutVat: new Prisma.Decimal(0),
          payrollCost: new Prisma.Decimal(0),
          employeeCount: 0,
        };
        current.salesWithVat = current.salesWithVat.plus(branch.salesWithVat);
        current.salesWithoutVat = current.salesWithoutVat.plus(
          branch.salesWithoutVat,
        );
        current.payrollCost = current.payrollCost.plus(branch.totalCost);
        current.employeeCount += 1;
        branchMap.set(branch.branchName, current);
      }
    }
    ok(res, {
      run: {
        id: run.id,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        status: run.status,
      },
      employeeLines: run.lines.flatMap((line) =>
        line.branchLines.map((branch) => ({
          employeeId: line.employeeId,
          employeeName: line.employeeName,
          ...branch,
        })),
      ),
      branches: [...branchMap.values()].sort((left, right) =>
        left.branchName.localeCompare(right.branchName),
      ),
    });
  }),
);

router.get(
  "/receipts",
  asyncRoute(async (req, res) => {
    const runId =
      typeof req.query["runId"] === "string" ? req.query["runId"] : undefined;
    const receipts = await prisma.payrollReceipt.findMany({
    where: runId ? { payrollRunLine: { payrollRunId: runId } } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      payrollRunLine: {
        include: {
          payrollRun: true,
          branchLines: { orderBy: { branchName: "asc" } },
        },
      },
    },
  });
    ok(res, receipts);
  }),
);

router.patch(
  "/receipts/:id/status",
  asyncRoute(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(["SENT", "CONFIRMED"]) })
      .parse(req.body);
    const current = await prisma.payrollReceipt.findUniqueOrThrow({
      where: { id: req.params["id"] },
    });
    if (status === "SENT" && current.status === "CONFIRMED")
      throw new Error("Un recibo confirmado no puede regresar a enviado.");
    const now = new Date();
    const userId = currentUserId(req);
    const receipt = await prisma.payrollReceipt.update({
      where: { id: current.id },
      data:
        status === "SENT"
          ? {
              status,
              sentAt: current.sentAt ?? now,
              sentById: current.sentById ?? userId,
            }
          : { status, confirmedAt: now, confirmedById: userId },
    });
    ok(
      res,
      receipt,
      status === "SENT" ? "Recibo marcado como enviado." : "Recibo confirmado.",
    );
  }),
);

// Error envelope exclusivo del router Payroll.
router.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          success: false,
          data: error.flatten().fieldErrors,
          message: "Revisa los datos capturados.",
        });
      return;
    }
    if (error instanceof multer.MulterError) {
      res
        .status(400)
        .json({
          success: false,
          data: null,
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "El archivo no puede superar 10 MB."
              : error.message,
        });
      return;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res
        .status(409)
        .json({
          success: false,
          data: null,
          message: "Ya existe un registro con esos datos.",
        });
      return;
    }
    console.error("[payroll]", error);
    res
      .status(400)
      .json({
        success: false,
        data: null,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo completar la operación.",
      });
  },
);

export default router;
