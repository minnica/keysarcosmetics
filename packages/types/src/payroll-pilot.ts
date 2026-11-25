export type PilotMode = "WITH_VAT" | "WITHOUT_VAT";
export interface PilotPeriod {
  start: string;
  finish: string;
}
export interface PilotEmployee {
  id: string;
  name: string;
  salary: number | null;
  active: boolean;
  branchId: string | null;
  position: string;
}
export interface PilotScheme {
  id: string;
  schemeId: string;
  name: string;
  active: boolean;
  effectiveFrom: string;
  version: number;
  tiers: { id: string; from: number; to: number | null; rate: number }[];
}
export interface PilotMovement {
  id: string;
  employeeId: string;
  branchId: string | null;
  amount: number;
  commissionable: boolean;
  kind:
    | "BONUS"
    | "FINE"
    | "ADJUSTMENT_POSITIVE"
    | "ADJUSTMENT_NEGATIVE"
    | "SUPPLIES"
    | "PER_DIEM";
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  payrollType: string | null;
  catalogItemId: string | null;
  concept: string;
}
export interface PilotReferenceLine {
  employeeId: string;
  salaryPayment: number;
  commission: number;
  bonus: number;
  fine: number;
  adjustmentPositive: number;
  adjustmentNegative: number;
  perDiem: number;
  supplies: number;
  loanPayment: number;
  totalPayment: number;
  receiptStatus: string | null;
  branches: { branchId: string | null; branchName: string; cost: number }[];
}
export interface PilotSnapshot {
  format: 1;
  capturedAt: string;
  openStart: string;
  closedStart: string;
  periods: PilotPeriod[];
  branches: {
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    endedAt: string | null;
  }[];
  employees: PilotEmployee[];
  sales: {
    id: string;
    employeeId: string;
    branchId: string;
    date: string;
    amount: number;
  }[];
  schemes: PilotScheme[];
  assignments: {
    id: string;
    employeeId: string;
    schemeId: string;
    effectiveFrom: string;
    effectiveTo: string | null;
  }[];
  catalog: {
    id: string;
    kind: "BONUS" | "FINE" | "PER_DIEM";
    name: string;
    defaultAmount: number;
    active: boolean;
  }[];
  movements: PilotMovement[];
  loans: {
    id: string;
    employeeId: string;
    kind: "LOAN" | "PAYROLL_ADVANCE";
    requestedAt: string;
    requestedAmount: number;
    installmentCount: number;
    paidAmount: number;
    balance: number;
    status: string;
    installments: {
      start: string;
      end: string;
      amount: number;
      status: "PAID" | "RESERVED" | "SCHEDULED" | "CANCELED";
    }[];
  }[];
  runs: {
    id: string;
    periodStart: string;
    periodEnd: string;
    payDate: string;
    mode: PilotMode;
    status: "DRAFT" | "APPROVED" | "PAID";
  }[];
  lines: (PilotReferenceLine & { payrollRunId: string })[];
}
export interface PilotReference {
  period: string;
  mode: PilotMode;
  source: "PAID" | "APPROVED" | "DRAFT" | "CALCULATED";
  lines: PilotReferenceLine[];
}
export interface PilotCut {
  id: string;
  revision: number;
  original: PilotSnapshot;
  references: PilotReference[];
  changes: Record<string, unknown>;
}
