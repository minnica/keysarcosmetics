import { Prisma } from "@prisma/client";

const D = Prisma.Decimal;
const ZERO = new D(0);

export type PayrollWarningCode =
  | "MISSING_SALARY"
  | "MISSING_SCHEME"
  | "MISSING_TIER"
  | "MISSING_BANK"
  | "MISSING_ACCOUNT"
  | "MISSING_PHONE"
  | "NEGATIVE_PAYMENT";

export interface PayrollWarning {
  code: PayrollWarningCode;
  message: string;
  blockingApproval: boolean;
  blockingPayment: boolean;
  blockingWhatsApp: boolean;
}

export interface CalculationTier {
  fromAmount: Prisma.Decimal.Value;
  toAmount: Prisma.Decimal.Value | null;
  rate: Prisma.Decimal.Value;
}

export interface CalculationScheme {
  name: string;
  version: number;
  tiers: CalculationTier[];
}

export interface CalculationSale {
  branchId: string | null;
  branchName: string;
  amount: Prisma.Decimal.Value;
}

export interface CalculationMovement {
  kind:
    | "BONUS"
    | "ADJUSTMENT_POSITIVE"
    | "ADJUSTMENT_NEGATIVE"
    | "FINE"
    | "PER_DIEM"
    | "SUPPLIES";
  branchId: string | null;
  branchName: string;
  amount: Prisma.Decimal.Value;
  commissionable: boolean;
}

export interface CalculationEmployee {
  employeeId: string;
  employeeName: string;
  positionName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  phoneNumber: string | null;
  monthlySalary: Prisma.Decimal.Value | null;
  scheme: CalculationScheme | null;
  sales: CalculationSale[];
  movements: CalculationMovement[];
  loanPayment: Prisma.Decimal.Value;
}

export interface CalculationInput {
  mode: "WITH_VAT" | "WITHOUT_VAT";
  vatRate: Prisma.Decimal.Value;
  employees: CalculationEmployee[];
  expenseTotal: Prisma.Decimal.Value;
}

export interface CalculatedBranchLine {
  branchId: string | null;
  branchName: string;
  salesWithVat: Prisma.Decimal;
  salesWithoutVat: Prisma.Decimal;
  commission: Prisma.Decimal;
  bonus: Prisma.Decimal;
  fine: Prisma.Decimal;
  salaryPayment: Prisma.Decimal;
  adjustmentPositive: Prisma.Decimal;
  adjustmentNegative: Prisma.Decimal;
  perDiem: Prisma.Decimal;
  supplies: Prisma.Decimal;
  loanPayment: Prisma.Decimal;
  totalCost: Prisma.Decimal;
}

export interface CalculatedPayrollLine {
  employeeId: string;
  employeeName: string;
  positionName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  phoneNumber: string | null;
  schemeName: string | null;
  schemeVersion: number | null;
  individualRate: Prisma.Decimal | null;
  monthlySalary: Prisma.Decimal;
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
  warnings: PayrollWarning[];
  branchLines: CalculatedBranchLine[];
}

export interface CalculationResult {
  salesWithVat: Prisma.Decimal;
  salesWithoutVat: Prisma.Decimal;
  expenseTotal: Prisma.Decimal;
  payrollTotal: Prisma.Decimal;
  generalBalance: Prisma.Decimal;
  warnings: PayrollWarning[];
  lines: CalculatedPayrollLine[];
}

function decimal(
  value: Prisma.Decimal.Value | null | undefined,
): Prisma.Decimal {
  return value == null ? ZERO : new D(value);
}

export function money(value: Prisma.Decimal.Value): Prisma.Decimal {
  return new D(value).toDecimalPlaces(2, D.ROUND_HALF_UP);
}

function findRate(
  base: Prisma.Decimal,
  scheme: CalculationScheme | null,
): Prisma.Decimal | null {
  if (!scheme) return null;
  const tier = [...scheme.tiers]
    .sort((left, right) =>
      decimal(left.fromAmount).comparedTo(decimal(right.fromAmount)),
    )
    .find((candidate) => {
      const from = decimal(candidate.fromAmount);
      const to =
        candidate.toAmount == null ? null : decimal(candidate.toAmount);
      return (
        base.greaterThanOrEqualTo(from) &&
        (to == null || base.lessThanOrEqualTo(to))
      );
    });
  return tier ? decimal(tier.rate) : null;
}

function addToBranch(
  branches: Map<string, CalculatedBranchLine>,
  branchId: string | null,
  branchName: string,
): CalculatedBranchLine {
  const key = branchId ?? `label:${branchName}`;
  const current = branches.get(key);
  if (current) return current;
  const created: CalculatedBranchLine = {
    branchId,
    branchName,
    salesWithVat: ZERO,
    salesWithoutVat: ZERO,
    commission: ZERO,
    bonus: ZERO,
    fine: ZERO,
    salaryPayment: ZERO,
    adjustmentPositive: ZERO,
    adjustmentNegative: ZERO,
    perDiem: ZERO,
    supplies: ZERO,
    loanPayment: ZERO,
    totalCost: ZERO,
  };
  branches.set(key, created);
  return created;
}

function allocateMoney(
  total: Prisma.Decimal,
  weightedBranches: Array<{ key: string; weight: Prisma.Decimal }>,
): Map<string, Prisma.Decimal> {
  const result = new Map<string, Prisma.Decimal>();
  if (total.isZero() || weightedBranches.length === 0) return result;
  const weightTotal = weightedBranches.reduce(
    (sum, item) => sum.plus(item.weight),
    ZERO,
  );
  if (weightTotal.isZero()) return result;

  let allocated = ZERO;
  weightedBranches.forEach((item, index) => {
    const amount =
      index === weightedBranches.length - 1
        ? total.minus(allocated)
        : money(total.times(item.weight).dividedBy(weightTotal));
    result.set(item.key, amount);
    allocated = allocated.plus(amount);
  });
  return result;
}

function warning(
  code: PayrollWarningCode,
  message: string,
  options: Partial<
    Pick<
      PayrollWarning,
      "blockingApproval" | "blockingPayment" | "blockingWhatsApp"
    >
  > = {},
): PayrollWarning {
  return {
    code,
    message,
    blockingApproval: false,
    blockingPayment: false,
    blockingWhatsApp: false,
    ...options,
  };
}

export function calculatePayroll(input: CalculationInput): CalculationResult {
  const divisor = new D(1).plus(decimal(input.vatRate));
  const lines = input.employees.map((employee): CalculatedPayrollLine => {
    const warnings: PayrollWarning[] = [];
    const branches = new Map<string, CalculatedBranchLine>();

    for (const sale of employee.sales) {
      const branch = addToBranch(branches, sale.branchId, sale.branchName);
      branch.salesWithVat = branch.salesWithVat.plus(decimal(sale.amount));
      branch.salesWithoutVat = branch.salesWithoutVat.plus(
        decimal(sale.amount).dividedBy(divisor),
      );
    }

    const salesWithVatPrecise = [...branches.values()].reduce(
      (sum, branch) => sum.plus(branch.salesWithVat),
      ZERO,
    );
    const salesWithoutVatPrecise = salesWithVatPrecise.dividedBy(divisor);
    const commissionBase =
      input.mode === "WITH_VAT" ? salesWithVatPrecise : salesWithoutVatPrecise;
    const rate = commissionBase.isZero()
      ? ZERO
      : findRate(commissionBase, employee.scheme);

    if (!commissionBase.isZero() && !employee.scheme) {
      warnings.push(
        warning(
          "MISSING_SCHEME",
          "El empleado tiene ventas pero no cuenta con un esquema vigente.",
          { blockingApproval: true },
        ),
      );
    } else if (!commissionBase.isZero() && rate == null) {
      warnings.push(
        warning(
          "MISSING_TIER",
          "Las ventas no coinciden con ningún rango del esquema vigente.",
          { blockingApproval: true },
        ),
      );
    }

    const monthlySalary = decimal(employee.monthlySalary);
    if (employee.monthlySalary == null) {
      warnings.push(
        warning(
          "MISSING_SALARY",
          "El sueldo no está capturado; se considera $0.",
        ),
      );
    }
    if (!employee.bankName)
      warnings.push(
        warning("MISSING_BANK", "Falta el banco del empleado.", {
          blockingPayment: true,
        }),
      );
    if (!employee.accountNumber?.trim())
      warnings.push(
        warning("MISSING_ACCOUNT", "Falta la cuenta bancaria del empleado.", {
          blockingPayment: true,
        }),
      );
    if (!employee.phoneNumber?.trim())
      warnings.push(
        warning("MISSING_PHONE", "Falta el teléfono para WhatsApp.", {
          blockingWhatsApp: true,
        }),
      );

    const salaryPayment = money(monthlySalary.dividedBy(2));
    const commission = rate == null ? ZERO : money(commissionBase.times(rate));
    const movementTotals = {
      BONUS: ZERO,
      ADJUSTMENT_POSITIVE: ZERO,
      ADJUSTMENT_NEGATIVE: ZERO,
      FINE: ZERO,
      PER_DIEM: ZERO,
      SUPPLIES: ZERO,
    };

    for (const movement of employee.movements) {
      const amount = money(movement.amount);
      if (
        movement.commissionable ||
        movement.kind === "FINE" ||
        movement.kind === "ADJUSTMENT_NEGATIVE"
      ) {
        movementTotals[movement.kind] =
          movementTotals[movement.kind].plus(amount);
      }
      const branch = addToBranch(
        branches,
        movement.branchId,
        movement.branchName,
      );
      if (
        movement.commissionable ||
        movement.kind === "FINE" ||
        movement.kind === "ADJUSTMENT_NEGATIVE"
      ) {
        if (movement.kind === "BONUS")
          branch.bonus = branch.bonus.plus(amount);
        if (movement.kind === "FINE")
          branch.fine = branch.fine.plus(amount);
        if (movement.kind === "ADJUSTMENT_POSITIVE")
          branch.adjustmentPositive = branch.adjustmentPositive.plus(amount);
        if (movement.kind === "ADJUSTMENT_NEGATIVE")
          branch.adjustmentNegative = branch.adjustmentNegative.plus(amount);
        if (movement.kind === "PER_DIEM")
          branch.perDiem = branch.perDiem.plus(amount);
        if (movement.kind === "SUPPLIES")
          branch.supplies = branch.supplies.plus(amount);
      }
    }

    const loanPayment = money(employee.loanPayment);
    const totalPayment = money(
      salaryPayment
        .plus(commission)
        .plus(movementTotals.BONUS)
        .plus(movementTotals.ADJUSTMENT_POSITIVE)
        .plus(movementTotals.PER_DIEM)
        .plus(movementTotals.SUPPLIES)
        .minus(movementTotals.FINE)
        .minus(movementTotals.ADJUSTMENT_NEGATIVE)
        .minus(loanPayment),
    );
    if (totalPayment.isNegative()) {
      warnings.push(
        warning(
          "NEGATIVE_PAYMENT",
          "Las deducciones superan los ingresos de la quincena.",
          { blockingApproval: true },
        ),
      );
    }

    const salesBranches = [...branches.entries()]
      .filter(([, branch]) => branch.salesWithVat.greaterThan(0))
      .map(([key, branch]) => ({ key, weight: branch.salesWithVat }));
    const corporate =
      salesBranches.length === 0
        ? addToBranch(branches, null, "CORPORATIVO")
        : null;
    const weights =
      salesBranches.length > 0
        ? salesBranches
        : [{ key: "label:CORPORATIVO", weight: new D(1) }];

    for (const [key, amount] of allocateMoney(commission, weights)) {
      const branch = branches.get(key) ?? corporate;
      if (branch) branch.commission = branch.commission.plus(amount);
    }
    for (const [key, amount] of allocateMoney(salaryPayment, weights)) {
      const branch = branches.get(key) ?? corporate;
      if (branch) branch.salaryPayment = branch.salaryPayment.plus(amount);
    }
    for (const [key, amount] of allocateMoney(loanPayment, weights)) {
      const branch = branches.get(key) ?? corporate;
      if (branch) branch.loanPayment = branch.loanPayment.plus(amount);
    }

    const branchLines = [...branches.values()].map((branch) => ({
      ...branch,
      salesWithVat: money(branch.salesWithVat),
      salesWithoutVat: money(branch.salesWithoutVat),
      commission: money(branch.commission),
      bonus: money(branch.bonus),
      fine: money(branch.fine),
      salaryPayment: money(branch.salaryPayment),
      adjustmentPositive: money(branch.adjustmentPositive),
      adjustmentNegative: money(branch.adjustmentNegative),
      perDiem: money(branch.perDiem),
      supplies: money(branch.supplies),
      loanPayment: money(branch.loanPayment),
      totalCost: money(
        branch.commission
          .plus(branch.salaryPayment)
          .plus(branch.bonus)
          .plus(branch.adjustmentPositive)
          .plus(branch.perDiem)
          .plus(branch.supplies)
          .minus(branch.fine)
          .minus(branch.adjustmentNegative)
          .minus(branch.loanPayment),
      ),
    }));

    return {
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      positionName: employee.positionName,
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      phoneNumber: employee.phoneNumber,
      schemeName: employee.scheme?.name ?? null,
      schemeVersion: employee.scheme?.version ?? null,
      individualRate: rate,
      monthlySalary,
      salaryPayment,
      salesWithVat: money(salesWithVatPrecise),
      salesWithoutVat: money(salesWithoutVatPrecise),
      commission,
      bonus: money(movementTotals.BONUS),
      fine: money(movementTotals.FINE),
      adjustmentPositive: money(movementTotals.ADJUSTMENT_POSITIVE),
      adjustmentNegative: money(movementTotals.ADJUSTMENT_NEGATIVE),
      perDiem: money(movementTotals.PER_DIEM),
      supplies: money(movementTotals.SUPPLIES),
      loanPayment,
      totalPayment,
      warnings,
      branchLines,
    };
  });

  const salesWithVat = money(
    lines.reduce((sum, line) => sum.plus(line.salesWithVat), ZERO),
  );
  const salesWithoutVat = money(
    lines.reduce((sum, line) => sum.plus(line.salesWithoutVat), ZERO),
  );
  const payrollTotal = money(
    lines.reduce((sum, line) => sum.plus(line.totalPayment), ZERO),
  );
  const expenseTotal = money(input.expenseTotal);
  return {
    salesWithVat,
    salesWithoutVat,
    expenseTotal,
    payrollTotal,
    generalBalance: money(salesWithVat.minus(payrollTotal).minus(expenseTotal)),
    warnings: lines.flatMap((line) => line.warnings),
    lines,
  };
}

export function assertStandardPayrollPeriod(
  periodStart: Date,
  periodEnd: Date,
): void {
  const startDay = periodStart.getUTCDate();
  const sameMonth =
    periodStart.getUTCFullYear() === periodEnd.getUTCFullYear() &&
    periodStart.getUTCMonth() === periodEnd.getUTCMonth();
  const lastDay = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const valid =
    sameMonth &&
    ((startDay === 1 && periodEnd.getUTCDate() === 15) ||
      (startDay === 16 && periodEnd.getUTCDate() === lastDay));
  if (!valid)
    throw new Error(
      "El periodo debe ser una quincena completa: 1 al 15 o 16 al último día del mes.",
    );
}

export function nextPayrollPeriod(periodStart: Date): {
  periodStart: Date;
  periodEnd: Date;
} {
  const year = periodStart.getUTCFullYear();
  const month = periodStart.getUTCMonth();
  if (periodStart.getUTCDate() === 1) {
    return {
      periodStart: new Date(Date.UTC(year, month, 16)),
      periodEnd: new Date(Date.UTC(year, month + 1, 0)),
    };
  }
  return {
    periodStart: new Date(Date.UTC(year, month + 1, 1)),
    periodEnd: new Date(Date.UTC(year, month + 1, 15)),
  };
}

export function generateInstallmentSchedule(
  requestedAmount: Prisma.Decimal.Value,
  installmentCount: number,
  firstPeriodStart: Date,
): Array<{
  sequence: number;
  periodStart: Date;
  periodEnd: Date;
  amount: Prisma.Decimal;
}> {
  if (!Number.isInteger(installmentCount) || installmentCount < 1)
    throw new Error("El número de pagos debe ser mayor a cero.");
  const firstPeriodEnd =
    firstPeriodStart.getUTCDate() === 1
      ? new Date(
          Date.UTC(
            firstPeriodStart.getUTCFullYear(),
            firstPeriodStart.getUTCMonth(),
            15,
          ),
        )
      : new Date(
          Date.UTC(
            firstPeriodStart.getUTCFullYear(),
            firstPeriodStart.getUTCMonth() + 1,
            0,
          ),
        );
  assertStandardPayrollPeriod(firstPeriodStart, firstPeriodEnd);

  const total = money(requestedAmount);
  const regularAmount = money(total.dividedBy(installmentCount));
  const schedule = [];
  let current = { periodStart: firstPeriodStart, periodEnd: firstPeriodEnd };
  let allocated = ZERO;
  for (let index = 0; index < installmentCount; index += 1) {
    const amount =
      index === installmentCount - 1 ? total.minus(allocated) : regularAmount;
    schedule.push({ sequence: index + 1, ...current, amount });
    allocated = allocated.plus(amount);
    current = nextPayrollPeriod(current.periodStart);
  }
  return schedule;
}
