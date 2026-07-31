import {
  Prisma,
  type PayrollCalculationMode,
  type PayrollRunStatus,
} from "@prisma/client";

type DecimalInput = Prisma.Decimal | string | number;

export interface MonthlyPayrollRunInput {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  mode: PayrollCalculationMode;
  status: PayrollRunStatus | "ESTIMATED";
  salesWithVat: DecimalInput;
  salesWithoutVat: DecimalInput;
  expenseTotal: DecimalInput;
  payrollTotal: DecimalInput;
  generalBalance: DecimalInput;
  lines: Array<{
    employeeId: string;
    employeeName: string;
    positionName: string | null;
    salaryPayment: DecimalInput;
    salesWithVat: DecimalInput;
    salesWithoutVat: DecimalInput;
    commission: DecimalInput;
    bonus: DecimalInput;
    fine: DecimalInput;
    adjustmentPositive: DecimalInput;
    adjustmentNegative: DecimalInput;
    perDiem: DecimalInput;
    supplies: DecimalInput;
    loanPayment: DecimalInput;
    totalPayment: DecimalInput;
    branchLines: Array<{ branchName: string }>;
  }>;
}

interface MonthlyPayrollEmployeeAccumulator {
  employeeId: string;
  employeeName: string;
  positionName: string | null;
  branchNames: Set<string>;
  firstFortnightTotal: Prisma.Decimal;
  secondFortnightTotal: Prisma.Decimal;
  salaryPayment: Prisma.Decimal;
  salesWithVat: Prisma.Decimal;
  salesWithoutVat: Prisma.Decimal;
  commission: Prisma.Decimal;
  bonus: Prisma.Decimal;
  fine: Prisma.Decimal;
  adjustmentPositive: Prisma.Decimal;
  adjustmentNegative: Prisma.Decimal;
  perDiem: Prisma.Decimal;
  supplies: Prisma.Decimal;
  loanPayment: Prisma.Decimal;
  totalPayment: Prisma.Decimal;
}

const ZERO = new Prisma.Decimal(0);

function decimal(value: DecimalInput): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function emptyEmployee(
  line: MonthlyPayrollRunInput["lines"][number],
): MonthlyPayrollEmployeeAccumulator {
  return {
    employeeId: line.employeeId,
    employeeName: line.employeeName,
    positionName: line.positionName,
    branchNames: new Set<string>(),
    firstFortnightTotal: ZERO,
    secondFortnightTotal: ZERO,
    salaryPayment: ZERO,
    salesWithVat: ZERO,
    salesWithoutVat: ZERO,
    commission: ZERO,
    bonus: ZERO,
    fine: ZERO,
    adjustmentPositive: ZERO,
    adjustmentNegative: ZERO,
    perDiem: ZERO,
    supplies: ZERO,
    loanPayment: ZERO,
    totalPayment: ZERO,
  };
}

export function payrollMonthDates(month: string): {
  periodStart: Date;
  firstPeriodEnd: Date;
  secondPeriodStart: Date;
  periodEnd: Date;
} {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw new Error("El mes debe tener formato AAAA-MM.");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return {
    periodStart: new Date(Date.UTC(year, monthIndex, 1)),
    firstPeriodEnd: new Date(Date.UTC(year, monthIndex, 15)),
    secondPeriodStart: new Date(Date.UTC(year, monthIndex, 16)),
    periodEnd: new Date(Date.UTC(year, monthIndex + 1, 0)),
  };
}

export function buildMonthlyPayrollSummary(
  month: string,
  inputRuns: MonthlyPayrollRunInput[],
) {
  const dates = payrollMonthDates(month);
  const runs = inputRuns
    .filter((run) => run.status !== "CANCELED")
    .sort(
      (left, right) => left.periodStart.getTime() - right.periodStart.getTime(),
    );
  const firstRun =
    runs.find((run) => run.periodStart.getUTCDate() === 1) ?? null;
  const secondRun =
    runs.find((run) => run.periodStart.getUTCDate() === 16) ?? null;
  const employees = new Map<string, MonthlyPayrollEmployeeAccumulator>();

  for (const run of runs) {
    const isFirstFortnight = run.periodStart.getUTCDate() === 1;
    for (const line of run.lines) {
      const current = employees.get(line.employeeId) ?? emptyEmployee(line);
      current.employeeName = line.employeeName;
      current.positionName = line.positionName ?? current.positionName;
      for (const branch of line.branchLines) {
        current.branchNames.add(branch.branchName);
      }
      if (isFirstFortnight) {
        current.firstFortnightTotal = current.firstFortnightTotal.plus(
          line.totalPayment,
        );
      } else {
        current.secondFortnightTotal = current.secondFortnightTotal.plus(
          line.totalPayment,
        );
      }
      current.salaryPayment = current.salaryPayment.plus(line.salaryPayment);
      current.salesWithVat = current.salesWithVat.plus(line.salesWithVat);
      current.salesWithoutVat = current.salesWithoutVat.plus(
        line.salesWithoutVat,
      );
      current.commission = current.commission.plus(line.commission);
      current.bonus = current.bonus.plus(line.bonus);
      current.fine = current.fine.plus(line.fine);
      current.adjustmentPositive = current.adjustmentPositive.plus(
        line.adjustmentPositive,
      );
      current.adjustmentNegative = current.adjustmentNegative.plus(
        line.adjustmentNegative,
      );
      current.perDiem = current.perDiem.plus(line.perDiem);
      current.supplies = current.supplies.plus(line.supplies);
      current.loanPayment = current.loanPayment.plus(line.loanPayment);
      current.totalPayment = current.totalPayment.plus(line.totalPayment);
      employees.set(line.employeeId, current);
    }
  }

  const total = (selector: (run: MonthlyPayrollRunInput) => DecimalInput) =>
    runs.reduce((sum, run) => sum.plus(selector(run)), ZERO);
  const runReference = (run: MonthlyPayrollRunInput | null) =>
    run
      ? {
          id: run.id,
          periodStart: run.periodStart,
          periodEnd: run.periodEnd,
          mode: run.mode,
          status: run.status,
          payrollTotal: decimal(run.payrollTotal),
        }
      : null;

  return {
    month,
    periodStart: dates.periodStart,
    periodEnd: dates.periodEnd,
    complete: Boolean(firstRun && secondRun),
    includesDraft: runs.some((run) => run.status === "DRAFT"),
    isApproximate: runs.some((run) => run.status === "ESTIMATED"),
    estimatedCount: runs.filter((run) => run.status === "ESTIMATED").length,
    runCount: runs.filter((run) => run.status !== "ESTIMATED").length,
    firstFortnight: runReference(firstRun),
    secondFortnight: runReference(secondRun),
    salesWithVat: total((run) => run.salesWithVat),
    salesWithoutVat: total((run) => run.salesWithoutVat),
    expenseTotal: total((run) => run.expenseTotal),
    payrollTotal: total((run) => run.payrollTotal),
    generalBalance: total((run) => run.generalBalance),
    lines: [...employees.values()]
      .sort((left, right) =>
        left.employeeName.localeCompare(right.employeeName, "es-MX"),
      )
      .map((line) => ({
        ...line,
        branchNames: [...line.branchNames].sort((left, right) =>
          left.localeCompare(right, "es-MX"),
        ),
      })),
  };
}
