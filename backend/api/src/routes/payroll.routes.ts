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
import type { PayrollScreenKey } from "@cosmetics/types";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  PAYROLL_ACCESS_SCREEN_ORDER,
  requireAnyPayrollScreenAccess,
} from "../lib/access";
import { prisma } from "../prisma/client";
import {
  approvePayrollRun,
  cancelPayrollRun,
  createPayrollRun,
  getLivePayrollPreview,
  getPayrollRun,
  getMonthlyPayrollSummary,
  getPayrollOverview,
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
import {
  materializeRecurringExpenses,
  nextRecurringExpenseOccurrence,
  previousUtcDate,
  recurrenceCycleKey,
} from "../services/payroll-recurring-expense";

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
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
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

function currentPayrollDate(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
}

function normalizeText(value: string): string {
  return value.trim().toLocaleUpperCase("es-MX");
}

function currentUserId(req: Request): string {
  if (!req.user?.id) throw new Error("No autenticado.");
  return req.user.id;
}

function audit(
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  metadata?: Prisma.InputJsonValue,
) {
  return prisma.payrollAuditEvent.create({
    data: {
      userId,
      entityType,
      entityId,
      action,
      ...(metadata ? { metadata } : {}),
    },
  });
}

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const monthString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const positiveMoney = z.coerce.number().positive().max(999_999_999_999);
const nullableId = z.string().min(1).nullable().optional();

const PAYROLL_OPERATION_SCREEN_KEYS = PAYROLL_ACCESS_SCREEN_ORDER.filter(
  (screenKey) => screenKey !== "payroll/accesos",
);

const CATALOG_SCREEN_BY_KIND = {
  BONUS: "payroll/bonos",
  FINE: "payroll/multas",
  PER_DIEM: "payroll/viaticos",
} as const satisfies Record<string, PayrollScreenKey>;

function payrollScreensForRequest(req: Request): readonly PayrollScreenKey[] {
  const path = req.path;

  if (path === "/bootstrap") return PAYROLL_OPERATION_SCREEN_KEYS;

  if (path.startsWith("/catalog-items")) {
    const rawKind =
      typeof req.query["kind"] === "string"
        ? req.query["kind"]
        : typeof req.body?.kind === "string"
          ? req.body.kind
          : null;
    const catalogScreen = rawKind
      ? CATALOG_SCREEN_BY_KIND[rawKind as keyof typeof CATALOG_SCREEN_BY_KIND]
      : null;
    return catalogScreen
      ? [catalogScreen, "payroll/movimientos"]
      : [
          "payroll/bonos",
          "payroll/multas",
          "payroll/viaticos",
          "payroll/movimientos",
        ];
  }

  if (path.startsWith("/schemes") || path.startsWith("/assignments")) {
    return req.method === "GET"
      ? ["payroll/esquemas", "payroll/resumen"]
      : ["payroll/esquemas"];
  }

  if (path.startsWith("/movements") || path.startsWith("/attachments")) {
    return ["payroll/movimientos"];
  }

  if (
    path.startsWith("/expenses") ||
    path.startsWith("/expense-categories") ||
    path.startsWith("/expense-recurrences")
  ) {
    return ["payroll/gastos"];
  }

  if (path.startsWith("/loans")) return ["payroll/prestamos-adelantos"];
  if (path.startsWith("/runs")) return ["payroll/resumen"];
  if (path === "/reports/monthly-summary") return ["payroll/resumen"];

  if (path === "/reports/payroll-overview") {
    const screenByType = {
      FIXED_SALARY: "payroll/nomina-salario-fijo",
      SPECIALIST: "payroll/nomina-especialistas",
      COMMISSION: "payroll/nomina-comisiones",
    } as const satisfies Record<string, PayrollScreenKey>;
    const payrollType =
      typeof req.query["payrollType"] === "string"
        ? req.query["payrollType"]
        : "";
    const screen = screenByType[payrollType as keyof typeof screenByType];
    return screen ? [screen] : Object.values(screenByType);
  }

  if (path === "/reports/live-preview") {
    return ["payroll/reportes/desglose-sucursal", "payroll/recibos"];
  }
  if (path === "/reports/branch-breakdown") {
    return ["payroll/reportes/desglose-sucursal"];
  }
  if (path.startsWith("/receipts")) return ["payroll/recibos"];

  return PAYROLL_OPERATION_SCREEN_KEYS;
}

router.use(authMiddleware);
router.use((req, res, next) => {
  void requireAnyPayrollScreenAccess(payrollScreensForRequest(req))(
    req,
    res,
    next,
  );
});

router.get(
  "/bootstrap",
  asyncRoute(async (_req, res) => {
    const [employees, branches] = await Promise.all([
      prisma.empleado.findMany({
        orderBy: [{ activo: "desc" }, { nombreCompleto: "asc" }],
        include: {
          bank: { select: { id: true, nombre: true } },
          position: { select: { id: true, nombre: true } },
          sucursal: { select: { id: true, nombre: true } },
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
        branchId: employee.sucursal?.id ?? null,
        branchName: employee.todasSucursales
          ? "TODAS"
          : (employee.sucursal?.nombre ?? "SIN SUCURSAL ASIGNADA"),
        allBranches: employee.todasSucursales,
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

router.patch(
  "/schemes/:id/reactivate",
  asyncRoute(async (req, res) => {
    const scheme = await prisma.commissionScheme.update({
      where: { id: req.params["id"] },
      data: { active: true },
      include: {
        versions: {
          orderBy: { effectiveFrom: "desc" },
          include: { tiers: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
    ok(res, scheme, "Esquema reactivado.");
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
const recurringExpenseSchema = expenseSchema.extend({
  frequency: z.enum(["BIWEEKLY", "MONTHLY"]),
});
const expenseCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

async function requireExpenseCategory(value: string) {
  const category = normalizeText(value);
  const existing = await prisma.payrollExpenseCategory.findFirst({
    where: { name: category, active: true },
    select: { id: true, name: true },
  });
  if (!existing)
    throw new Error(
      "Selecciona una categoría de gasto activa antes de guardar.",
    );
  return existing;
}

router.get(
  "/expense-categories",
  asyncRoute(async (_req, res) => {
    const categories = await prisma.payrollExpenseCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    ok(res, categories);
  }),
);

router.post(
  "/expense-categories",
  asyncRoute(async (req, res) => {
    const { name: rawName } = expenseCategorySchema.parse(req.body);
    const name = normalizeText(rawName);
    const existing = await prisma.payrollExpenseCategory.findUnique({
      where: { name },
    });
    if (existing?.active)
      throw new Error("Ya existe una categoría de gasto con ese nombre.");
    const category = existing
      ? await prisma.payrollExpenseCategory.update({
          where: { id: existing.id },
          data: { active: true },
        })
      : await prisma.payrollExpenseCategory.create({
          data: { name, createdById: currentUserId(req) },
        });
    await audit(
      currentUserId(req),
      "PayrollExpenseCategory",
      category.id,
      existing ? "REACTIVATED" : "CREATED",
    );
    ok(res, category, "Categoría de gasto guardada.", existing ? 200 : 201);
  }),
);

router.put(
  "/expense-categories/:id",
  asyncRoute(async (req, res) => {
    const { name: rawName } = expenseCategorySchema.parse(req.body);
    const name = normalizeText(rawName);
    const current = await prisma.payrollExpenseCategory.findUniqueOrThrow({
      where: { id: req.params["id"] },
    });
    if (!current.active)
      throw new Error("La categoría de gasto ya no está activa.");
    const duplicate = await prisma.payrollExpenseCategory.findFirst({
      where: { name, id: { not: current.id } },
      select: { id: true },
    });
    if (duplicate)
      throw new Error("Ya existe una categoría de gasto con ese nombre.");
    const category = await prisma.$transaction(async (tx) => {
      const updated = await tx.payrollExpenseCategory.update({
        where: { id: current.id },
        data: { name },
      });
      await tx.payrollExpense.updateMany({
        where: {
          categoryId: current.id,
          payrollRunId: null,
          deletedAt: null,
        },
        data: { category: name },
      });
      return updated;
    });
    await audit(
      currentUserId(req),
      "PayrollExpenseCategory",
      category.id,
      "UPDATED",
      { previousName: current.name, name },
    );
    ok(res, category, "Categoría de gasto actualizada.");
  }),
);

router.delete(
  "/expense-categories/:id",
  asyncRoute(async (req, res) => {
    const current = await prisma.payrollExpenseCategory.findUniqueOrThrow({
      where: { id: req.params["id"] },
    });
    const activeRecurrence =
      await prisma.payrollExpenseRecurrenceVersion.findFirst({
        where: {
          categoryId: current.id,
          effectiveTo: null,
          recurrence: { active: true },
        },
        select: { id: true },
      });
    if (activeRecurrence)
      throw new Error(
        "Finaliza o cambia las recurrencias activas de esta categoría antes de eliminarla.",
      );
    const category = await prisma.payrollExpenseCategory.update({
      where: { id: current.id },
      data: { active: false },
    });
    await audit(
      currentUserId(req),
      "PayrollExpenseCategory",
      category.id,
      "DEACTIVATED",
    );
    ok(res, category, "Categoría de gasto eliminada sin alterar históricos.");
  }),
);

router.get(
  "/expense-recurrences",
  asyncRoute(async (_req, res) => {
    const recurrences = await prisma.payrollExpenseRecurrence.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      include: {
        versions: {
          where: { effectiveTo: null },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          include: {
            branch: { select: { id: true, nombre: true } },
            categoryRecord: { select: { id: true, name: true } },
          },
        },
      },
    });
    ok(
      res,
      recurrences.flatMap((recurrence) => {
        const version = recurrence.versions[0];
        if (!version || version.frequency === "ONE_TIME") return [];
        const today = currentPayrollDate();
        return [
          {
            id: recurrence.id,
            active: recurrence.active,
            startsAt: version.effectiveFrom,
            nextDate: nextRecurringExpenseOccurrence(
              {
                frequency: version.frequency,
                anchorDate: version.anchorDate,
                effectiveFrom: version.effectiveFrom,
                effectiveTo: version.effectiveTo,
              },
              today,
            ),
            version: {
              ...version,
              category: version.categoryRecord?.name ?? version.category,
              branch: version.branch,
            },
          },
        ];
      }),
    );
  }),
);

router.post(
  "/expense-recurrences",
  asyncRoute(async (req, res) => {
    const input = recurringExpenseSchema.parse(req.body);
    const userId = currentUserId(req);
    const effectiveFrom = parseDate(input.date);
    const category = await requireExpenseCategory(input.category);
    const recurrence = await prisma.payrollExpenseRecurrence.create({
      data: {
        createdById: userId,
        versions: {
          create: {
            anchorDate: effectiveFrom,
            effectiveFrom,
            kind: input.kind,
            concept: normalizeText(input.concept),
            category: category.name,
            categoryId: category.id,
            branchId: input.branchId ?? null,
            costCenter: normalizeText(input.costCenter),
            amount: input.amount,
            frequency: input.frequency,
            notes: normalizeText(input.notes),
            createdById: userId,
          },
        },
      },
    });
    if (effectiveFrom <= currentPayrollDate())
      await materializeRecurringExpenses(effectiveFrom, effectiveFrom);
    await audit(userId, "PayrollExpenseRecurrence", recurrence.id, "CREATED");
    ok(res, recurrence, "Gasto recurrente guardado.", 201);
  }),
);

router.post(
  "/expense-recurrences/:id/versions",
  asyncRoute(async (req, res) => {
    const input = recurringExpenseSchema.parse(req.body);
    const userId = currentUserId(req);
    const effectiveFrom = parseDate(input.date);
    const category = await requireExpenseCategory(input.category);
    const recurrence = await prisma.payrollExpenseRecurrence.findUniqueOrThrow({
      where: { id: req.params["id"] },
      include: {
        versions: {
          where: { effectiveTo: null },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
    });
    const current = recurrence.versions[0];
    if (!recurrence.active || !current)
      throw new Error("El gasto recurrente ya no está activo.");
    if (effectiveFrom <= current.effectiveFrom)
      throw new Error("La nueva vigencia debe ser posterior a la vigente.");
    if (
      recurrenceCycleKey(input.frequency, effectiveFrom) <=
      recurrenceCycleKey(input.frequency, current.effectiveFrom)
    )
      throw new Error(
        input.frequency === "MONTHLY"
          ? "La nueva versión debe iniciar en un mes posterior."
          : "La nueva versión debe iniciar en una quincena posterior.",
      );
    const frozenOccurrence = await prisma.payrollExpense.findFirst({
      where: {
        recurrenceId: recurrence.id,
        date: { gte: effectiveFrom },
        payrollRunId: { not: null },
      },
    });
    if (frozenOccurrence)
      throw new Error(
        "La vigencia seleccionada ya tiene una ocurrencia incluida en una corrida aprobada.",
      );

    const version = await prisma.$transaction(async (tx) => {
      await tx.payrollExpenseRecurrenceVersion.update({
        where: { id: current.id },
        data: { effectiveTo: previousUtcDate(effectiveFrom) },
      });
      await tx.payrollExpense.updateMany({
        where: {
          recurrenceId: recurrence.id,
          generated: true,
          payrollRunId: null,
          date: { gte: effectiveFrom },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      return tx.payrollExpenseRecurrenceVersion.create({
        data: {
          recurrenceId: recurrence.id,
          anchorDate:
            current.frequency === input.frequency
              ? current.anchorDate
              : effectiveFrom,
          effectiveFrom,
          kind: input.kind,
          concept: normalizeText(input.concept),
          category: category.name,
          categoryId: category.id,
          branchId: input.branchId ?? null,
          costCenter: normalizeText(input.costCenter),
          amount: input.amount,
          frequency: input.frequency,
          notes: normalizeText(input.notes),
          createdById: userId,
        },
      });
    });
    if (effectiveFrom <= currentPayrollDate())
      await materializeRecurringExpenses(effectiveFrom, effectiveFrom);
    await audit(
      userId,
      "PayrollExpenseRecurrence",
      recurrence.id,
      "VERSIONED",
      {
        versionId: version.id,
        effectiveFrom: isoDate(effectiveFrom),
      },
    );
    ok(res, version, "Nueva vigencia del gasto recurrente guardada.");
  }),
);

router.post(
  "/expense-recurrences/:id/end",
  asyncRoute(async (req, res) => {
    const { effectiveFrom: effectiveFromValue } = z
      .object({ effectiveFrom: dateString })
      .parse(req.body);
    const effectiveFrom = parseDate(effectiveFromValue);
    const userId = currentUserId(req);
    const recurrence = await prisma.payrollExpenseRecurrence.findUniqueOrThrow({
      where: { id: req.params["id"] },
      include: {
        versions: {
          where: { effectiveTo: null },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
    });
    const current = recurrence.versions[0];
    if (!recurrence.active || !current)
      throw new Error("El gasto recurrente ya está finalizado.");
    const frozenOccurrence = await prisma.payrollExpense.findFirst({
      where: {
        recurrenceId: recurrence.id,
        date: { gte: effectiveFrom },
        payrollRunId: { not: null },
      },
    });
    if (frozenOccurrence)
      throw new Error(
        "No puede finalizarse desde una fecha que ya pertenece a una corrida aprobada.",
      );
    const effectiveTo = previousUtcDate(effectiveFrom);
    await prisma.$transaction([
      prisma.payrollExpenseRecurrence.update({
        where: { id: recurrence.id },
        data: { active: false, endedAt: effectiveTo },
      }),
      prisma.payrollExpenseRecurrenceVersion.update({
        where: { id: current.id },
        data: { effectiveTo },
      }),
      prisma.payrollExpense.updateMany({
        where: {
          recurrenceId: recurrence.id,
          generated: true,
          payrollRunId: null,
          date: { gte: effectiveFrom },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      }),
    ]);
    await audit(userId, "PayrollExpenseRecurrence", recurrence.id, "ENDED", {
      effectiveFrom: effectiveFromValue,
    });
    ok(res, recurrence, "Gasto recurrente finalizado.");
  }),
);

router.get(
  "/expenses",
  asyncRoute(async (req, res) => {
    const from =
      typeof req.query["from"] === "string"
        ? parseDate(req.query["from"])
        : (() => {
            const date = currentPayrollDate();
            date.setUTCDate(date.getUTCDate() - 365);
            return date;
          })();
    const to =
      typeof req.query["to"] === "string"
        ? endExclusive(parseDate(req.query["to"]))
        : endExclusive(currentPayrollDate());
    await materializeRecurringExpenses(from, previousUtcDate(to));
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
    if (input.frequency !== "ONE_TIME")
      throw new Error(
        "Los gastos quincenales o mensuales deben guardarse como recurrencias.",
      );
    const category = await requireExpenseCategory(input.category);
    const expense = await prisma.payrollExpense.create({
      data: {
        ...input,
        date: parseDate(input.date),
        concept: normalizeText(input.concept),
        category: category.name,
        categoryId: category.id,
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
    const category = await requireExpenseCategory(input.category);
    const current = await prisma.payrollExpense.findUniqueOrThrow({
      where: { id: req.params["id"] },
    });
    if (current.recurrenceId)
      throw new Error(
        "Edita la serie recurrente para crear una nueva vigencia.",
      );
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
        category: category.name,
        categoryId: category.id,
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
    if (current.recurrenceId)
      throw new Error(
        "Finaliza la serie recurrente en lugar de borrar una ocurrencia.",
      );
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
      res.status(404).json({
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

const payrollOverviewQuery = z.object({
  payrollType: z.enum(["FIXED_SALARY", "SPECIALIST", "COMMISSION"]),
  view: z.enum(["FORTNIGHT", "MONTHLY"]),
  periodStart: dateString,
  periodEnd: dateString,
  mode: z.enum(["WITH_VAT", "WITHOUT_VAT"]).default("WITH_VAT"),
});

router.get(
  "/reports/live-preview",
  asyncRoute(async (req, res) => {
    const query = z
      .object({
        periodStart: dateString,
        periodEnd: dateString,
        mode: z.enum(["WITH_VAT", "WITHOUT_VAT"]).default("WITH_VAT"),
      })
      .parse(req.query);
    ok(
      res,
      await getLivePayrollPreview({
        periodStart: parseDate(query.periodStart),
        periodEnd: parseDate(query.periodEnd),
        mode: query.mode,
      }),
    );
  }),
);

router.get(
  "/reports/payroll-overview",
  asyncRoute(async (req, res) => {
    const query = payrollOverviewQuery.parse(req.query);
    ok(
      res,
      await getPayrollOverview({
        ...query,
        periodStart: parseDate(query.periodStart),
        periodEnd: parseDate(query.periodEnd),
      }),
    );
  }),
);

router.get(
  "/reports/monthly-summary",
  asyncRoute(async (req, res) => {
    const month = monthString.parse(req.query["month"]);
    ok(res, await getMonthlyPayrollSummary(month));
  }),
);

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
    const query = z
      .object({
        runId: z.string().min(1).optional(),
        periodStart: dateString.optional(),
        periodEnd: dateString.optional(),
      })
      .refine(
        (value) =>
          (!value.periodStart && !value.periodEnd) ||
          Boolean(value.periodStart && value.periodEnd),
        { message: "Envía el inicio y fin del periodo." },
      )
      .parse(req.query);
    const receipts = await prisma.payrollReceipt.findMany({
      where: query.runId
        ? { payrollRunLine: { payrollRunId: query.runId } }
        : query.periodStart && query.periodEnd
          ? {
              payrollRunLine: {
                payrollRun: {
                  periodStart: parseDate(query.periodStart),
                  periodEnd: parseDate(query.periodEnd),
                },
              },
            }
          : undefined,
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
      res.status(400).json({
        success: false,
        data: error.flatten().fieldErrors,
        message: "Revisa los datos capturados.",
      });
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(400).json({
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
      res.status(409).json({
        success: false,
        data: null,
        message: "Ya existe un registro con esos datos.",
      });
      return;
    }
    console.error("[payroll]", error);
    res.status(400).json({
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
