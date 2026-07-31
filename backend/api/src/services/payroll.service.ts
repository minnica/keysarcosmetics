import { PayrollRunStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import {
  assertStandardPayrollPeriod,
  calculatePayroll,
  type CalculationEmployee,
  type PayrollWarning,
} from "./payroll-calculation";

const VAT_RATE = new Prisma.Decimal("0.16");

function endExclusive(date: Date): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
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

export async function recalculatePayrollRun(runId: string, userId: string) {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("Corrida no encontrada.");
  if (run.status !== "DRAFT")
    throw new Error("Solo las corridas en borrador pueden recalcularse.");
  assertStandardPayrollPeriod(run.periodStart, run.periodEnd);

  const range = { gte: run.periodStart, lt: endExclusive(run.periodEnd) };
  const employees = await prisma.empleado.findMany({
    include: {
      bank: { select: { nombre: true } },
      position: { select: { nombre: true } },
      sucursal: { select: { id: true, nombre: true } },
      ventas: {
        where: { fecha: range },
        include: { detalles: { select: { cantidad: true } } },
      },
      payrollMovementAllocations: {
        where: {
          movement: {
            date: range,
            status: "APPROVED",
            OR: [{ payrollRunId: null }, { payrollRunId: run.id }],
          },
        },
        include: {
          movement: { select: { kind: true } },
        },
      },
      payrollLoans: {
        where: { status: "PENDING" },
        include: {
          installments: {
            where: {
              periodStart: run.periodStart,
              periodEnd: run.periodEnd,
              OR: [{ status: "SCHEDULED" }, { payrollRunId: run.id }],
            },
          },
        },
      },
      payrollAssignments: {
        where: {
          effectiveFrom: { lte: run.periodStart },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: run.periodStart } },
          ],
        },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        include: {
          scheme: {
            include: {
              versions: {
                where: { effectiveFrom: { lte: run.periodStart } },
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
          branchId: employee.sucursal?.id ?? null,
          branchName: employee.sucursal?.nombre ?? "SIN SUCURSAL ASIGNADA",
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
            amount: sale.detalles.reduce(
              (sum, detail) => sum.plus(detail.cantidad),
              new Prisma.Decimal(0),
            ),
          })),
          movements: employee.payrollMovementAllocations.map((allocation) => ({
            kind: allocation.movement.kind,
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
      OR: [{ payrollRunId: null }, { payrollRunId: run.id }],
    },
  });
  const expenseTotal = expenses.reduce(
    (sum, expense) => sum.plus(expense.amount),
    new Prisma.Decimal(0),
  );
  const result = calculatePayroll({
    mode: run.mode,
    vatRate: run.vatRate,
    employees: calculationEmployees,
    expenseTotal,
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
