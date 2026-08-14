import type {
  PayrollCalculationMode,
  PayrollLivePreview,
  PayrollRun,
  PayrollRunStatus,
  PayrollRunLine,
  PayrollWarning,
} from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

function recordValue(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function dateValue(value: unknown) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function warningsValue(value: unknown): PayrollWarning[] {
  return Array.isArray(value) ? (value as PayrollWarning[]) : [];
}

export function mapPayrollRunLine(raw: unknown): PayrollRunLine {
  const source = recordValue(raw);
  const employeeId = stringValue(source.employeeId);
  const branchLines = arrayValue(source.branchLines).map((value, index) => {
    const branch = recordValue(value);
    return {
      id: stringValue(branch.id, `live-branch-${employeeId}-${index}`),
      branchId: typeof branch.branchId === "string" ? branch.branchId : null,
      branchName: stringValue(branch.branchName),
      salesWithVat: numberValue(branch.salesWithVat),
      salesWithoutVat: numberValue(branch.salesWithoutVat),
      commission: numberValue(branch.commission),
      bonus: numberValue(branch.bonus),
      fine: numberValue(branch.fine),
      salaryPayment: numberValue(branch.salaryPayment),
      adjustmentPositive: numberValue(branch.adjustmentPositive),
      adjustmentNegative: numberValue(branch.adjustmentNegative),
      perDiem: numberValue(branch.perDiem),
      supplies: numberValue(branch.supplies),
      loanPayment: numberValue(branch.loanPayment),
      totalCost: numberValue(branch.totalCost),
    };
  });

  return {
    id: stringValue(source.id, `live-line-${employeeId}`),
    employeeId,
    employeeName: stringValue(source.employeeName),
    position: stringValue(source.positionName, "SIN PUESTO"),
    branch:
      branchLines
        .filter((branch) => branch.salesWithVat > 0)
        .map((branch) => branch.branchName)
        .join(", ") ||
      branchLines[0]?.branchName ||
      "CORPORATIVO",
    bankName: typeof source.bankName === "string" ? source.bankName : null,
    accountNumber:
      typeof source.accountNumber === "string" ? source.accountNumber : null,
    phoneNumber:
      typeof source.phoneNumber === "string" ? source.phoneNumber : null,
    scheme: stringValue(source.schemeName, "SIN ESQUEMA"),
    schemeVersion:
      typeof source.schemeVersion === "number" ? source.schemeVersion : null,
    individualRate: numberValue(source.individualRate),
    monthlySalary: numberValue(source.monthlySalary),
    salaryBase: numberValue(source.salaryPayment),
    salesWithVat: numberValue(source.salesWithVat),
    salesWithoutVat: numberValue(source.salesWithoutVat),
    commission: numberValue(source.commission),
    bonus: numberValue(source.bonus),
    fine: numberValue(source.fine),
    payrollAdjustmentPositive: numberValue(source.adjustmentPositive),
    payrollAdjustmentNegative: numberValue(source.adjustmentNegative),
    perDiem: numberValue(source.perDiem),
    supplies: numberValue(source.supplies),
    loanPayment: numberValue(source.loanPayment),
    totalPayment: numberValue(source.totalPayment),
    warnings: warningsValue(source.warnings),
    branchLines,
  };
}

export function mapPayrollRun(raw: unknown): PayrollRun {
  const source = recordValue(raw);
  const periodStart = dateValue(source.periodStart);
  const periodEnd = dateValue(source.periodEnd);
  return {
    id: stringValue(source.id),
    periodStart,
    periodEnd,
    from: periodStart,
    to: periodEnd,
    payDate: dateValue(source.payDate),
    mode: source.mode as PayrollCalculationMode,
    status: source.status as PayrollRunStatus,
    salesWithVat: numberValue(source.salesWithVat),
    salesWithoutVat: numberValue(source.salesWithoutVat),
    expenseTotal: numberValue(source.expenseTotal),
    payrollTotal: numberValue(source.payrollTotal),
    generalBalance: numberValue(source.generalBalance),
    warnings: warningsValue(source.warnings),
    lines: arrayValue(source.lines).map(mapPayrollRunLine),
  };
}

export function mapPayrollLivePreview(raw: unknown): PayrollLivePreview {
  const source = recordValue(raw);
  return {
    generatedAt: stringValue(source.generatedAt),
    periodStart: dateValue(source.periodStart),
    periodEnd: dateValue(source.periodEnd),
    mode: source.mode as PayrollCalculationMode,
    salesWithVat: numberValue(source.salesWithVat),
    salesWithoutVat: numberValue(source.salesWithoutVat),
    expenseTotal: numberValue(source.expenseTotal),
    payrollTotal: numberValue(source.payrollTotal),
    generalBalance: numberValue(source.generalBalance),
    warnings: warningsValue(source.warnings),
    lines: arrayValue(source.lines).map(mapPayrollRunLine),
  };
}
