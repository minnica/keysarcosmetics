export type PayrollRunStatus = "DRAFT" | "APPROVED" | "PAID" | "CANCELED";
export type PayrollCalculationMode = "WITH_VAT" | "WITHOUT_VAT";
export type MovementStatus = "PENDING" | "APPROVED" | "REJECTED";
export type MovementKind =
  | "BONUS"
  | "ADJUSTMENT_POSITIVE"
  | "ADJUSTMENT_NEGATIVE"
  | "FINE"
  | "PER_DIEM"
  | "SUPPLIES";
export type CatalogKind = "BONUS" | "FINE" | "PER_DIEM";
export type ExpenseKind = "FIXED" | "VARIABLE";
export type ExpenseFrequency = "ONE_TIME" | "BIWEEKLY" | "MONTHLY";
export type LoanKind = "LOAN" | "PAYROLL_ADVANCE";
export type LoanStatus = "PENDING" | "PAID" | "LOST" | "CANCELED";
export type InstallmentStatus = "SCHEDULED" | "RESERVED" | "PAID" | "CANCELED";
export type ReceiptStatus = "GENERATED" | "SENT" | "CONFIRMED";

export interface PayrollEmployee {
  id: string;
  name: string;
  active: boolean;
  position: string;
  bank: string;
  account: string;
  salary: number | null;
  phone: string | null;
}

export interface PayrollBranch {
  id: string;
  nombre: string;
  activa: boolean;
}

export interface PayrollCatalogItem {
  id: string;
  kind: CatalogKind;
  name: string;
  amount: number;
  notes: string;
  active: boolean;
}

export interface CommissionRange {
  id?: string;
  from: number;
  to: number | null;
  rate: number;
}
export interface CommissionSchemeVersion {
  id: string;
  version: number;
  effectiveFrom: string;
  tiers: CommissionRange[];
}
export interface CommissionScheme {
  id: string;
  name: string;
  active: boolean;
  versions: CommissionSchemeVersion[];
  ranges: CommissionRange[];
}
export interface SchemeAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeActive: boolean;
  schemeId: string;
  schemeName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface MovementAllocation {
  id?: string;
  employeeId: string;
  employeeName: string;
  branchId: string | null;
  branchName: string;
  amount: number;
  commissionable: boolean;
}
export interface PayrollAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
export interface PayrollMovement {
  id: string;
  date: string;
  kind: MovementKind;
  catalogItemId: string | null;
  concept: string;
  totalAmount: number;
  amount: number;
  status: MovementStatus;
  notes: string;
  payrollRunId: string | null;
  allocations: MovementAllocation[];
  employeeName: string;
  branch: string;
  sharedWith: number;
  attachments: PayrollAttachment[];
}

export interface PayrollExpense {
  id: string;
  date: string;
  kind: ExpenseKind;
  concept: string;
  category: string;
  branchId: string | null;
  branch: string;
  amount: number;
  frequency: ExpenseFrequency;
  notes: string;
  payrollRunId: string | null;
}

export interface LoanInstallment {
  id: string;
  sequence: number;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: InstallmentStatus;
}
export interface LoanAdvance {
  id: string;
  requestedAt: string;
  employeeId: string;
  employeeName: string;
  employeeActive: boolean;
  kind: LoanKind;
  nature: string;
  requestedAmount: number;
  installmentCount: number;
  payments: number;
  installmentAmount: number;
  paymentAmount: number;
  paidAmount: number;
  balance: number;
  status: LoanStatus;
  notes: string;
  installments: LoanInstallment[];
  nextPeriod: string;
}

export interface PayrollWarning {
  code: string;
  message: string;
  blockingApproval: boolean;
  blockingPayment: boolean;
  blockingWhatsApp: boolean;
}
export interface PayrollRunBranchLine {
  id: string;
  branchId: string | null;
  branchName: string;
  salesWithVat: number;
  salesWithoutVat: number;
  commission: number;
  bonus: number;
  fine: number;
  salaryPayment: number;
  adjustmentPositive: number;
  adjustmentNegative: number;
  perDiem: number;
  supplies: number;
  loanPayment: number;
  totalCost: number;
}
export interface PayrollRunLine {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  branch: string;
  bankName: string | null;
  accountNumber: string | null;
  phoneNumber: string | null;
  scheme: string;
  schemeVersion: number | null;
  individualRate: number;
  monthlySalary: number;
  salaryBase: number;
  salesWithVat: number;
  salesWithoutVat: number;
  commission: number;
  bonus: number;
  fine: number;
  payrollAdjustmentPositive: number;
  payrollAdjustmentNegative: number;
  perDiem: number;
  supplies: number;
  loanPayment: number;
  totalPayment: number;
  warnings: PayrollWarning[];
  branchLines: PayrollRunBranchLine[];
}
export interface PayrollRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  from: string;
  to: string;
  payDate: string;
  mode: PayrollCalculationMode;
  status: PayrollRunStatus;
  salesWithVat: number;
  salesWithoutVat: number;
  expenseTotal: number;
  payrollTotal: number;
  generalBalance: number;
  warnings: PayrollWarning[];
  lines: PayrollRunLine[];
}
export interface PayrollRunSummary extends Omit<
  PayrollRun,
  "lines" | "warnings"
> {
  lineCount: number;
}

export interface PayrollReceipt {
  id: string;
  employeeName: string;
  period: string;
  totalPayment: number;
  status: ReceiptStatus;
  phone: string | null;
  sentAt: string | null;
  confirmedAt: string | null;
  runLine: PayrollRunLine;
  run: PayrollRun;
}

export interface BranchBreakdownLine {
  branchName: string;
  salesWithVat: number;
  salesWithoutVat: number;
  payrollCost: number;
  employeeCount: number;
}
export interface EmployeeBranchBreakdown extends PayrollRunBranchLine {
  employeeId: string;
  employeeName: string;
}
