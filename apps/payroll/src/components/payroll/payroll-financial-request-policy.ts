import type {
  DemoFinancialRequestPolicy,
  DemoLoan,
} from "./payroll-demo-context";

export interface FinancialRequestEvaluation {
  allowed: boolean;
  message: string | null;
  advanceMaximum: number;
  periodRequestCount: number;
  periodRequestLimit: number;
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function quarterKey(date: string) {
  const [year = "", month = "1"] = date.split("-");
  return `${year}-Q${Math.ceil(Number(month) / 3)}`;
}

export function evaluateFinancialRequest({
  loans,
  policy,
  employeeId,
  requestType,
  requestedAt,
  amount,
  installments,
  commissionedAmount,
  ignoreLoanId,
}: {
  loans: DemoLoan[];
  policy: DemoFinancialRequestPolicy;
  employeeId: string;
  requestType: "LOAN" | "ADVANCE";
  requestedAt: string;
  amount: number;
  installments: number;
  commissionedAmount: number;
  ignoreLoanId?: string | undefined;
}): FinancialRequestEvaluation {
  const countedRequests = loans.filter(
    (loan) =>
      loan.id !== ignoreLoanId &&
      loan.employeeId === employeeId &&
      loan.status !== "REJECTED",
  );
  const advanceMaximum = Math.max(
    commissionedAmount * policy.advanceCommissionLimitRate,
    0,
  );

  if (requestType === "ADVANCE") {
    const periodRequestCount = countedRequests.filter(
      (loan) =>
        loan.requestType === "ADVANCE" &&
        monthKey(loan.requestedAt) === monthKey(requestedAt),
    ).length;
    if (amount > advanceMaximum) {
      return {
        allowed: false,
        message: `El adelanto supera el ${(policy.advanceCommissionLimitRate * 100).toFixed(0)}% de la comisión acumulada. El máximo disponible es ${advanceMaximum.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}.`,
        advanceMaximum,
        periodRequestCount,
        periodRequestLimit: policy.maxMonthlyAdvances,
      };
    }
    if (periodRequestCount >= policy.maxMonthlyAdvances) {
      return {
        allowed: false,
        message: `Ya alcanzaste el límite de ${policy.maxMonthlyAdvances} adelantos en este mes.`,
        advanceMaximum,
        periodRequestCount,
        periodRequestLimit: policy.maxMonthlyAdvances,
      };
    }
    return {
      allowed: true,
      message: null,
      advanceMaximum,
      periodRequestCount,
      periodRequestLimit: policy.maxMonthlyAdvances,
    };
  }

  const periodRequestCount = countedRequests.filter(
    (loan) =>
      (loan.requestType ?? "LOAN") === "LOAN" &&
      quarterKey(loan.requestedAt) === quarterKey(requestedAt),
  ).length;
  if (installments > policy.maxLoanInstallments) {
    return {
      allowed: false,
      message: `El préstamo no puede superar ${policy.maxLoanInstallments} cuotas.`,
      advanceMaximum,
      periodRequestCount,
      periodRequestLimit: policy.maxQuarterlyLoans,
    };
  }
  if (periodRequestCount >= policy.maxQuarterlyLoans) {
    return {
      allowed: false,
      message: `Ya alcanzaste el límite de ${policy.maxQuarterlyLoans} préstamos en este trimestre.`,
      advanceMaximum,
      periodRequestCount,
      periodRequestLimit: policy.maxQuarterlyLoans,
    };
  }
  return {
    allowed: true,
    message: null,
    advanceMaximum,
    periodRequestCount,
    periodRequestLimit: policy.maxQuarterlyLoans,
  };
}
