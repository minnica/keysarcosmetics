import { PayrollRunStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import {
  assertStandardPayrollPeriod,
  calculatePayroll,
  money,
  type CalculationEmployee,
  type PayrollWarning,
} from "./payroll-calculation";
import {
  buildMonthlyPayrollSummary,
  payrollMonthDates,
} from "./payroll-monthly-summary";

const VAT_RATE = new Prisma.Decimal("0.16");
const PAYROLL_TIME_ZONE = "America/Mexico_City";

function endExclusive(date: Date): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function currentPayrollDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PAYROLL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
}

function jsonWarnings(value: Prisma.JsonValue | null): PayrollWarning[] {
  return Array.isArray(value) ? (value as unknown as PayrollWarning[]) : [];
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

export const payrollRunInclude = {
  lines: {
    orderBy: { employeeName: "asc" as const },
    include: {
      branchLines: { orderBy: { branchName: "asc" as const } },
      receipt: true,
    },
  },
  createdBy: { select: { id: true, nombre: true } },
  approvedBy: { select: { id: true, nombre: true } },
  paidBy: { select: { id: true, nombre: true } },
} satisfies Prisma.PayrollRunInclude;

export async function getPayrollRun(id: string) {
  return prisma.payrollRun.findUnique({
    where: { id },
    include: payrollRunInclude,
  });
}

export async function listPayrollRuns() {
  return prisma.payrollRun.findMany({
    orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { lines: true } } },
  });
}

async function calculatePayrollPeriod(input: {
  periodStart: Date;
  periodEnd: Date;
  mode: "WITH_VAT" | "WITHOUT_VAT";
  vatRate: Prisma.Decimal;
  runId?: string;
  includeAllPeriodSources?: boolean;
  activeOnly?: boolean;
}) {
  assertStandardPayrollPeriod(input.periodStart, input.periodEnd);
  const range = { gte: input.periodStart, lt: endExclusive(input.periodEnd) };
  const employees = await prisma.empleado.findMany({
    where: input.activeOnly ? { activo: true } : undefined,
    include: {
      bank: { select: { nombre: true } },
      position: { select: { nombre: true } },
      ventas: {
        where: { fecha: range },
        include: {
          sucursal: { select: { id: true, nombre: true } },
          detalles: { select: { cantidad: true } },
        },
      },
      payrollMovementAllocations: {
        where: {
          movement: {
            date: range,
            status: "APPROVED",
            ...(input.includeAllPeriodSources
              ? {}
              : input.runId
              ? {
                  OR: [{ payrollRunId: null }, { payrollRunId: input.runId }],
                }
              : { payrollRunId: null }),
          },
        },
        include: {
          branch: { select: { id: true, nombre: true } },
          movement: { select: { kind: true } },
        },
      },
      payrollLoans: {
        where: input.includeAllPeriodSources
          ? undefined
          : { status: "PENDING" },
        include: {
          installments: {
            where: {
              periodStart: input.periodStart,
              periodEnd: input.periodEnd,
              ...(input.includeAllPeriodSources
                ? { status: { not: "CANCELED" as const } }
                : input.runId
                ? {
                    OR: [
                      { status: "SCHEDULED" },
                      { payrollRunId: input.runId },
                    ],
                  }
                : { status: "SCHEDULED" }),
            },
          },
        },
      },
      payrollAssignments: {
        where: {
          effectiveFrom: { lte: input.periodStart },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: input.periodStart } },
          ],
        },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        include: {
          scheme: {
            include: {
              versions: {
                where: { effectiveFrom: { lte: input.periodStart } },
                orderBy: { effectiveFrom: "desc" },
                take: 1,
                include: { tiers: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  const calculationEmployees: CalculationEmployee[] = employees.flatMap(
    (employee) => {
      const assignment = employee.payrollAssignments[0];
      const version = assignment?.scheme.versions[0];
      const hasActivity =
        employee.ventas.length > 0 ||
        employee.payrollMovementAllocations.length > 0 ||
        employee.payrollLoans.some((loan) => loan.installments.length > 0);
      const isPayrollEligible =
        employee.activo &&
        (Boolean(assignment) || employee.sueldo?.greaterThan(0));
      if (!hasActivity && !isPayrollEligible) return [];

      return [
        {
          employeeId: employee.id,
          employeeName: employee.nombreCompleto,
          positionName: employee.position?.nombre ?? employee.puesto ?? null,
          bankName: employee.bank?.nombre ?? employee.banco ?? null,
          accountNumber: employee.numeroCuenta || null,
          phoneNumber: employee.numeroTelefono,
          monthlySalary: employee.sueldo,
          scheme:
            version && assignment
              ? {
                  name: assignment.scheme.name,
                  version: version.version,
                  tiers: version.tiers.map((tier) => ({
                    fromAmount: tier.fromAmount,
                    toAmount: tier.toAmount,
                    rate: tier.rate,
                  })),
                }
              : null,
          sales: employee.ventas.map((sale) => ({
            branchId: sale.sucursal.id,
            branchName: sale.sucursal.nombre,
            amount: sale.detalles.reduce(
              (sum, detail) => sum.plus(detail.cantidad),
              new Prisma.Decimal(0),
            ),
          })),
          movements: employee.payrollMovementAllocations.map((allocation) => ({
            kind: allocation.movement.kind,
            branchId: allocation.branch?.id ?? null,
            branchName: allocation.branch?.nombre ?? "CORPORATIVO",
            amount: allocation.amount,
            commissionable: allocation.commissionable,
          })),
          loanPayment: employee.payrollLoans
            .flatMap((loan) => loan.installments)
            .reduce(
              (sum, installment) => sum.plus(installment.amount),
              new Prisma.Decimal(0),
            ),
        },
      ];
    },
  );

  const expenses = await prisma.payrollExpense.findMany({
    where: {
      date: range,
      deletedAt: null,
      ...(input.runId
        ? {
            OR: [{ payrollRunId: null }, { payrollRunId: input.runId }],
          }
        : { payrollRunId: null }),
    },
  });
  const expenseTotal = expenses.reduce(
    (sum, expense) => sum.plus(expense.amount),
    new Prisma.Decimal(0),
  );
  return calculatePayroll({
    mode: input.mode,
    vatRate: input.vatRate,
    employees: calculationEmployees,
    expenseTotal,
  });
}

export async function getMonthlyPayrollSummary(month: string) {
  const dates = payrollMonthDates(month);
  const runs = await prisma.payrollRun.findMany({
    where: {
      status: { not: "CANCELED" },
      OR: [
        {
          periodStart: dates.periodStart,
          periodEnd: dates.firstPeriodEnd,
        },
        {
          periodStart: dates.secondPeriodStart,
          periodEnd: dates.periodEnd,
        },
      ],
    },
    orderBy: { periodStart: "asc" },
    include: {
      lines: {
        orderBy: { employeeName: "asc" },
        include: {
          branchLines: {
            orderBy: { branchName: "asc" },
            select: { branchName: true },
          },
        },
      },
    },
  });
  const mode = runs[0]?.mode ?? "WITH_VAT";
  const today = currentPayrollDate();
  const periods = [
    { periodStart: dates.periodStart, periodEnd: dates.firstPeriodEnd },
    { periodStart: dates.secondPeriodStart, periodEnd: dates.periodEnd },
  ];
  const estimates = [];
  for (const period of periods) {
    const hasRun = runs.some(
      (run) =>
        run.periodStart.getTime() === period.periodStart.getTime() &&
        run.periodEnd.getTime() === period.periodEnd.getTime(),
    );
    if (hasRun || period.periodEnd >= today) continue;
    const result = await calculatePayrollPeriod({
      ...period,
      mode,
      vatRate: VAT_RATE,
    });
    estimates.push({
      id: `estimated-${period.periodStart.toISOString().slice(0, 10)}`,
      ...period,
      mode,
      status: "ESTIMATED" as const,
      salesWithVat: result.salesWithVat,
      salesWithoutVat: result.salesWithoutVat,
      expenseTotal: result.expenseTotal,
      payrollTotal: result.payrollTotal,
      generalBalance: result.generalBalance,
      lines: result.lines.map((line) => ({
        ...line,
        branchLines: line.branchLines.map((branch) => ({
          branchName: branch.branchName,
        })),
      })),
    });
  }
  return buildMonthlyPayrollSummary(month, [...runs, ...estimates]);
}

export type PayrollOverviewType =
  | "FIXED_SALARY"
  | "SPECIALIST"
  | "COMMISSION";
export type PayrollOverviewView = "FORTNIGHT" | "MONTHLY";

type PayrollOverviewRow = {
  employeeId: string;
  fullName: string;
  position: string;
  bank: string | null;
  account: string | null;
  payroll: Prisma.Decimal;
};

export function isSpecialistPosition(position: string | null): boolean {
  const normalized = (position ?? "").trim().toLocaleUpperCase("es-MX");
  return (
    normalized.includes("FACIALISTA") || normalized.includes("ESPECIALISTA")
  );
}

function assertMonthlyPayrollPeriod(periodStart: Date, periodEnd: Date): void {
  const lastDay = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const valid =
    periodStart.getUTCDate() === 1 &&
    periodEnd.getUTCDate() === lastDay &&
    periodStart.getUTCFullYear() === periodEnd.getUTCFullYear() &&
    periodStart.getUTCMonth() === periodEnd.getUTCMonth();
  if (!valid)
    throw new Error(
      "El periodo mensual debe abarcar del día 1 al último día del mismo mes.",
    );
}

function overviewPeriods(
  view: PayrollOverviewView,
  periodStart: Date,
  periodEnd: Date,
) {
  if (view === "FORTNIGHT") {
    assertStandardPayrollPeriod(periodStart, periodEnd);
    return [{ periodStart, periodEnd }];
  }
  assertMonthlyPayrollPeriod(periodStart, periodEnd);
  const year = periodStart.getUTCFullYear();
  const month = periodStart.getUTCMonth();
  return [
    {
      periodStart: new Date(Date.UTC(year, month, 1)),
      periodEnd: new Date(Date.UTC(year, month, 15)),
    },
    {
      periodStart: new Date(Date.UTC(year, month, 16)),
      periodEnd: new Date(Date.UTC(year, month + 1, 0)),
    },
  ];
}

function buildOverviewTotals(rows: PayrollOverviewRow[]) {
  const total = money(
    rows.reduce((sum, row) => sum.plus(row.payroll), new Prisma.Decimal(0)),
  );
  const positionMap = new Map<string, Prisma.Decimal>();
  for (const row of rows) {
    positionMap.set(
      row.position,
      (positionMap.get(row.position) ?? new Prisma.Decimal(0)).plus(
        row.payroll,
      ),
    );
  }
  return {
    total,
    byPosition: [...positionMap.entries()]
      .map(([position, positionTotal]) => ({
        position,
        total: money(positionTotal),
      }))
      .sort((left, right) => left.position.localeCompare(right.position)),
  };
}

export function commissionOverviewPayment(line: {
  commission: Prisma.Decimal;
  bonus: Prisma.Decimal;
  adjustmentPositive: Prisma.Decimal;
  perDiem: Prisma.Decimal;
  supplies: Prisma.Decimal;
  fine: Prisma.Decimal;
  adjustmentNegative: Prisma.Decimal;
  loanPayment: Prisma.Decimal;
}) {
  return money(
    line.commission
      .plus(line.bonus)
      .plus(line.adjustmentPositive)
      .plus(line.perDiem)
      .plus(line.supplies)
      .minus(line.fine)
      .minus(line.adjustmentNegative)
      .minus(line.loanPayment),
  );
}

export function salaryOverviewPayment(
  monthlySalary: Prisma.Decimal.Value | null,
  view: PayrollOverviewView,
) {
  const salary = monthlySalary == null
    ? new Prisma.Decimal(0)
    : new Prisma.Decimal(monthlySalary);
  return view === "MONTHLY"
    ? money(salary)
    : money(salary.dividedBy(2));
}

export async function getPayrollOverview(input: {
  payrollType: PayrollOverviewType;
  view: PayrollOverviewView;
  periodStart: Date;
  periodEnd: Date;
  mode: "WITH_VAT" | "WITHOUT_VAT";
}) {
  const periods = overviewPeriods(input.view, input.periodStart, input.periodEnd);
  let rows: PayrollOverviewRow[];

  if (input.payrollType === "COMMISSION") {
    const calculations = await Promise.all(
      periods.map((period) =>
        calculatePayrollPeriod({
          ...period,
          mode: input.mode,
          vatRate: VAT_RATE,
          includeAllPeriodSources: true,
          activeOnly: true,
        }),
      ),
    );
    const commissionEmployeeIds = new Set(
      calculations.flatMap((calculation) =>
        calculation.lines
          .filter((line) => line.schemeName != null)
          .map((line) => line.employeeId),
      ),
    );
    const rowMap = new Map<string, PayrollOverviewRow>();
    for (const calculation of calculations) {
      for (const line of calculation.lines) {
        if (!commissionEmployeeIds.has(line.employeeId)) continue;
        const current = rowMap.get(line.employeeId) ?? {
          employeeId: line.employeeId,
          fullName: line.employeeName,
          position: line.positionName ?? "SIN PUESTO",
          bank: line.bankName,
          account: line.accountNumber,
          payroll: new Prisma.Decimal(0),
        };
        current.payroll = current.payroll.plus(commissionOverviewPayment(line));
        rowMap.set(line.employeeId, current);
      }
    }
    rows = [...rowMap.values()].map((row) => ({
      ...row,
      payroll: money(row.payroll),
    }));
  } else {
    const employees = await prisma.empleado.findMany({
      where: { activo: true },
      orderBy: { nombreCompleto: "asc" },
      include: {
        bank: { select: { nombre: true } },
        position: { select: { nombre: true } },
      },
    });
    rows = employees.flatMap((employee) => {
      const position = employee.position?.nombre ?? employee.puesto ?? "SIN PUESTO";
      const specialist = isSpecialistPosition(position);
      if (input.payrollType === "SPECIALIST" ? !specialist : specialist)
        return [];
      if (input.payrollType === "FIXED_SALARY" && !employee.sueldo?.greaterThan(0))
        return [];
      return [
        {
          employeeId: employee.id,
          fullName: employee.nombreCompleto,
          position,
          bank: (employee.bank?.nombre ?? employee.banco) || null,
          account: employee.numeroCuenta || null,
          payroll: salaryOverviewPayment(employee.sueldo, input.view),
        },
      ];
    });
  }

  rows.sort((left, right) => left.fullName.localeCompare(right.fullName));
  const totals = buildOverviewTotals(rows);
  return {
    payrollType: input.payrollType,
    view: input.view,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    mode: input.payrollType === "COMMISSION" ? input.mode : null,
    usesCurrentSalary: input.payrollType !== "COMMISSION",
    rows,
    total: totals.total,
    byPosition: totals.byPosition,
  };
}

export async function recalculatePayrollRun(runId: string, userId: string) {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("Corrida no encontrada.");
  if (run.status !== "DRAFT")
    throw new Error("Solo las corridas en borrador pueden recalcularse.");
  const result = await calculatePayrollPeriod({
    periodStart: run.periodStart,
    periodEnd: run.periodEnd,
    mode: run.mode,
    vatRate: run.vatRate,
    runId: run.id,
  });

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      salesWithVat: result.salesWithVat,
      salesWithoutVat: result.salesWithoutVat,
      expenseTotal: result.expenseTotal,
      payrollTotal: result.payrollTotal,
      generalBalance: result.generalBalance,
      warnings: result.warnings as unknown as Prisma.InputJsonValue,
      lines: {
        deleteMany: {},
        create: result.lines.map((line) => ({
          employeeId: line.employeeId,
          employeeName: line.employeeName,
          positionName: line.positionName,
          bankName: line.bankName,
          accountNumber: line.accountNumber,
          phoneNumber: line.phoneNumber,
          schemeName: line.schemeName,
          schemeVersion: line.schemeVersion,
          individualRate: line.individualRate,
          monthlySalary: line.monthlySalary,
          salaryPayment: line.salaryPayment,
          salesWithVat: line.salesWithVat,
          salesWithoutVat: line.salesWithoutVat,
          commission: line.commission,
          bonus: line.bonus,
          fine: line.fine,
          adjustmentPositive: line.adjustmentPositive,
          adjustmentNegative: line.adjustmentNegative,
          perDiem: line.perDiem,
          supplies: line.supplies,
          loanPayment: line.loanPayment,
          totalPayment: line.totalPayment,
          warnings: line.warnings as unknown as Prisma.InputJsonValue,
          branchLines: { create: line.branchLines },
        })),
      },
    },
  });
  await audit(userId, "PayrollRun", run.id, "RECALCULATED", { mode: run.mode });
  return getPayrollRun(run.id);
}

export async function createPayrollRun(
  input: {
    periodStart: Date;
    periodEnd: Date;
    payDate: Date;
    mode: "WITH_VAT" | "WITHOUT_VAT";
  },
  userId: string,
) {
  assertStandardPayrollPeriod(input.periodStart, input.periodEnd);
  if (input.payDate < input.periodEnd)
    throw new Error(
      "El día de pago no puede ser anterior al fin de la quincena.",
    );
  const overlapping = await prisma.payrollRun.findFirst({
    where: {
      status: { not: "CANCELED" },
      periodStart: { lte: input.periodEnd },
      periodEnd: { gte: input.periodStart },
    },
  });
  if (overlapping)
    throw new Error(
      "Ya existe una corrida activa que se traslapa con ese periodo.",
    );
  const run = await prisma.payrollRun.create({
    data: { ...input, vatRate: VAT_RATE, createdById: userId },
  });
  await audit(userId, "PayrollRun", run.id, "CREATED");
  return recalculatePayrollRun(run.id, userId);
}

export async function updateDraftPayrollRun(
  runId: string,
  input: { payDate?: Date; mode?: "WITH_VAT" | "WITHOUT_VAT" },
  userId: string,
) {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("Corrida no encontrada.");
  if (run.status !== "DRAFT")
    throw new Error("Solo las corridas en borrador pueden editarse.");
  if (input.payDate && input.payDate < run.periodEnd)
    throw new Error(
      "El día de pago no puede ser anterior al fin de la quincena.",
    );
  await prisma.payrollRun.update({ where: { id: run.id }, data: input });
  return recalculatePayrollRun(run.id, userId);
}

export async function approvePayrollRun(runId: string, userId: string) {
  const run = await getPayrollRun(runId);
  if (!run) throw new Error("Corrida no encontrada.");
  if (run.status !== "DRAFT")
    throw new Error("Solo una corrida en borrador puede aprobarse.");
  if (run.lines.length === 0)
    throw new Error("La corrida no contiene empleados.");
  const approvalWarnings = run.lines
    .flatMap((line) => jsonWarnings(line.warnings))
    .filter((item) => item.blockingApproval);
  if (approvalWarnings.length > 0)
    throw new Error(
      approvalWarnings[0]?.message ??
        "La corrida tiene errores que impiden aprobarla.",
    );

  const range = { gte: run.periodStart, lt: endExclusive(run.periodEnd) };
  const movements = await prisma.payrollMovement.findMany({
    where: { date: range, status: "APPROVED", payrollRunId: null },
    include: { attachments: { select: { id: true } } },
  });
  const missingEvidence = movements.find(
    (movement) =>
      (movement.kind === "PER_DIEM" || movement.kind === "SUPPLIES") &&
      movement.attachments.length === 0,
  );
  if (missingEvidence)
    throw new Error(
      `El movimiento ${missingEvidence.concept} requiere un comprobante antes de aprobar la corrida.`,
    );

  await prisma.$transaction(async (tx) => {
    await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "APPROVED",
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
    await tx.payrollMovement.updateMany({
      where: {
        id: { in: movements.map((movement) => movement.id) },
        payrollRunId: null,
      },
      data: { payrollRunId: run.id },
    });
    await tx.payrollExpense.updateMany({
      where: { date: range, deletedAt: null, payrollRunId: null },
      data: { payrollRunId: run.id },
    });
    await tx.loanAdvanceInstallment.updateMany({
      where: {
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        status: "SCHEDULED",
        payrollRunId: null,
      },
      data: { status: "RESERVED", payrollRunId: run.id },
    });
  });
  await audit(userId, "PayrollRun", run.id, "APPROVED");
  return getPayrollRun(run.id);
}

export async function payPayrollRun(runId: string, userId: string) {
  const run = await getPayrollRun(runId);
  if (!run) throw new Error("Corrida no encontrada.");
  if (run.status !== "APPROVED")
    throw new Error("Solo una corrida aprobada puede marcarse como pagada.");
  const paymentWarnings = run.lines
    .flatMap((line) => jsonWarnings(line.warnings))
    .filter((item) => item.blockingPayment);
  if (paymentWarnings.length > 0)
    throw new Error(
      paymentWarnings[0]?.message ??
        "Faltan datos bancarios para pagar la corrida.",
    );

  await prisma.$transaction(async (tx) => {
    const installments = await tx.loanAdvanceInstallment.findMany({
      where: { payrollRunId: run.id, status: "RESERVED" },
    });
    await tx.loanAdvanceInstallment.updateMany({
      where: { payrollRunId: run.id, status: "RESERVED" },
      data: { status: "PAID", paidAt: new Date() },
    });
    for (const loanId of [
      ...new Set(installments.map((item) => item.loanAdvanceId)),
    ]) {
      const loanInstallments = await tx.loanAdvanceInstallment.findMany({
        where: { loanAdvanceId: loanId },
      });
      const paidAmount = loanInstallments
        .filter(
          (item) =>
            item.status === "PAID" ||
            installments.some((paid) => paid.id === item.id),
        )
        .reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0));
      const loan = await tx.loanAdvance.findUniqueOrThrow({
        where: { id: loanId },
      });
      const balance = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        loan.requestedAmount.minus(paidAmount),
      );
      await tx.loanAdvance.update({
        where: { id: loanId },
        data: {
          paidAmount,
          balance,
          ...(balance.isZero() ? { status: "PAID" } : {}),
        },
      });
    }
    await tx.payrollReceipt.createMany({
      data: run.lines
        .filter((line) => !line.receipt)
        .map((line) => ({ payrollRunLineId: line.id })),
      skipDuplicates: true,
    });
    await tx.payrollRun.update({
      where: { id: run.id },
      data: { status: "PAID", paidById: userId, paidAt: new Date() },
    });
  });
  await audit(userId, "PayrollRun", run.id, "PAID");
  return getPayrollRun(run.id);
}

export async function cancelPayrollRun(runId: string, userId: string) {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("Corrida no encontrada.");
  if (run.status === "PAID")
    throw new Error("Una corrida pagada no puede cancelarse.");
  if (run.status === "CANCELED")
    throw new Error("La corrida ya está cancelada.");

  await prisma.$transaction([
    prisma.payrollMovement.updateMany({
      where: { payrollRunId: run.id },
      data: { payrollRunId: null },
    }),
    prisma.payrollExpense.updateMany({
      where: { payrollRunId: run.id },
      data: { payrollRunId: null },
    }),
    prisma.loanAdvanceInstallment.updateMany({
      where: { payrollRunId: run.id, status: "RESERVED" },
      data: { payrollRunId: null, status: "SCHEDULED" },
    }),
    prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: "CANCELED", canceledAt: new Date() },
    }),
  ]);
  await audit(userId, "PayrollRun", run.id, "CANCELED");
  return getPayrollRun(run.id);
}

export function requireRunStatus(
  actual: PayrollRunStatus,
  expected: PayrollRunStatus,
  message: string,
): void {
  if (actual !== expected) throw new Error(message);
}
