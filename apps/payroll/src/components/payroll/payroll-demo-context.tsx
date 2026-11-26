"use client";

import type { PilotSnapshot } from "@cosmetics/types";
import { applyLoanAtClose, loanCharges, type PayrollCharge } from "./payroll-deductions";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type EmployeeCategory =
  | "SELLER"
  | "SPECIALIST"
  | "MANAGEMENT"
  | "CALL_CENTER"
  | "CONTRACTOR";
export type PayrollModule =
  | "CONSOLIDATED"
  | "FIXED"
  | "SPECIALIST"
  | "COMMISSION"
  | "KIOSK_COMMISSION"
  | "CONTRACTOR"
  | "SETTLEMENT"
  | "CHRISTMAS_BONUS"
  | `CUSTOM_${string}`;
export type PayrollModuleConcept =
  | "SALARY"
  | "COMMISSION"
  | "BONUS"
  | "FINE"
  | "ADJUSTMENT_PLUS"
  | "ADJUSTMENT_MINUS"
  | "LOAN"
  | "ADVANCE"
  | "VIATICS"
  | "SETTLEMENT"
  | "CHRISTMAS_BONUS";
export type PayrollPeriodFrequency = "WEEKLY" | "BIWEEKLY" | "SPECIAL";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PayrollStatus = "DRAFT" | "APPROVED" | "PAID";
export type MovementType = "BONUS" | "FINE";
export type MovementMode = "FIXED" | "SCALE";
export type BonusCondition = "SALES" | "BONUS_COUNT";
export type PersonalizedBonusAggregation = "INDIVIDUAL" | "GROUP";
export type MovementStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";
export type PayrollAdjustmentType =
  | "PLUS"
  | "MINUS"
  | "FINE"
  | "BONUS"
  | "LOAN"
  | "LOAN_PAYMENT"
  | "BASE_SALARY";
export type PayrollAdjustmentStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "CANCELLED";
export type PayrollReportTarget =
  | "PAYROLL"
  | "CONSOLIDATED"
  | "BRANCH_COST"
  | "RECEIPT"
  | "PERSONAL_PORTAL";
export type ViaticsEffect = "ADD" | "DEDUCT";
export type ViaticsStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PayrollCostAllocationMode = "EQUAL" | "SALES_SHARE";

export interface DemoBranch {
  id: string;
  name: string;
  city: string;
  active: boolean;
  source: "POS" | "PAYROLL";
  externalPosId: string | null;
  registeredAt: string;
  deactivatedAt: string | null;
  lastSyncedAt: string | null;
}

export function branchAppliesToPeriod(
  branch: Pick<DemoBranch, "registeredAt" | "active" | "deactivatedAt">,
  periodStart: string,
  periodEnd: string,
) {
  return (
    branch.registeredAt <= periodEnd &&
    (branch.active ||
      Boolean(branch.deactivatedAt && branch.deactivatedAt >= periodStart))
  );
}

export interface DemoPosBranchInput {
  externalPosId: string;
  name: string;
  city: string;
  active: boolean;
}

export interface DemoKioskTarget {
  branchId: string;
  managerId: string | null;
  monthlyTarget: number;
  commissionRate: number;
  updatedAt: string;
}

export interface DemoKioskMonthlySale {
  id: string;
  branchId: string;
  managerId: string | null;
  month: string;
  sales: number;
  transactions: number;
}

export interface DemoEmployee {
  id: string;
  name: string;
  birthDate?: string | null;
  hrEmployeeId?: string | null;
  hrSource?: string | null;
  hrSyncedAt?: string | null;
  username?: string;
  accessPassword?: string;
  mustChangeCredentials?: boolean;
  credentialsUpdatedAt?: string | null;
  firstName?: string;
  paternalSurname?: string;
  maternalSurname?: string;
  position: string;
  category: EmployeeCategory;
  branchId: string;
  primaryBranchIds?: string[];
  costBranchIds: string[];
  monthlySalary: number;
  showSalaryInPayroll?: boolean;
  showCommissionInPayroll?: boolean;
  salaryPayrollModuleId: Exclude<PayrollModule, "CONSOLIDATED"> | null;
  commissionPayrollModuleId: Exclude<PayrollModule, "CONSOLIDATED"> | null;
  schemeId: string | null;
  bank: string;
  account: string;
  clabe?: string;
  roleId: string;
  active: boolean;
  hireDate: string;
  terminationDate: string | null;
  observedPayrollPeriods?: { start: string; finish: string }[] | null;
  socialCostRate: number;
  isrCostRate: number;
  ivaRate: number;
  isrRetentionRate: number;
  ivaRetentionRate: number;
  viaticsEnabled?: boolean;
  allowedViaticsConceptIds?: string[];
  secondaryAccessKey?: string | null;
  secondaryAccessKeyUpdatedAt?: string | null;
  secondaryAccessKeyUpdatedBy?: string | null;
}

export function canViewConfidentialPayroll(state: Pick<DemoState, "activeEmployeeId" | "employees">) {
  const roleId = state.employees.find(e => e.id === state.activeEmployeeId && (e.active || e.id === "pilot-operator"))?.roleId;
  return isConfidentialPayrollRole(roleId);
}

function isConfidentialPayrollRole(roleId: string | undefined) {
  return roleId === "role-admin" || roleId === "role-general-admin";
}

export function employeeShowsSalaryInPayroll(employee: DemoEmployee, privileged = false) {
  if (privileged) return true;
  return employee.showSalaryInPayroll ?? employee.category !== "MANAGEMENT";
}

export function employeeShowsCommissionInPayroll(employee: DemoEmployee, privileged = false) {
  if (privileged) return true;
  return employee.showCommissionInPayroll ?? employee.category !== "MANAGEMENT";
}

export function employeeAppliesToPeriod(
  employee: Pick<DemoEmployee, "hireDate" | "terminationDate" | "observedPayrollPeriods">,
  periodStart: string,
  periodEnd: string,
) {
  return (
    (!employee.observedPayrollPeriods || employee.observedPayrollPeriods.some(p => p.start <= periodEnd && p.finish >= periodStart)) &&
    employee.hireDate <= periodEnd &&
    (!employee.terminationDate || employee.terminationDate >= periodStart)
  );
}

export interface DemoPayrollModuleDefinition {
  id: PayrollModule;
  name: string;
  description: string;
  concepts: PayrollModuleConcept[];
  positionIds: string[];
  active: boolean;
  custom: boolean;
  createdAt: string;
  deactivatedAt?: string | null;
}

export function payrollModuleAppliesToPeriod(
  module: Pick<
    DemoPayrollModuleDefinition,
    "createdAt" | "active" | "deactivatedAt"
  >,
  periodStart: string,
  periodEnd: string,
) {
  return (
    module.createdAt <= periodEnd &&
    (module.active ||
      Boolean(module.deactivatedAt && module.deactivatedAt >= periodStart))
  );
}

export interface DemoPosition {
  id: string;
  name: string;
  category: EmployeeCategory;
  salaryPayrollModuleId: Exclude<PayrollModule, "CONSOLIDATED"> | null;
  commissionPayrollModuleId: Exclude<PayrollModule, "CONSOLIDATED"> | null;
  defaultRoleId: string;
  active: boolean;
  createdAt: string;
}

export interface CommissionTier {
  id: string;
  from: number;
  to: number | null;
  rate: number;
}

export type BranchCommissionScope =
  | "SINGLE_BRANCH"
  | "SELECTED_BRANCHES"
  | "ALL_COMBINED";

export interface DemoBranchManagerHistory {
  id: string;
  managerId: string | null;
  managerName: string;
  effectiveFrom: string;
  changedAt: string;
}

export interface DemoBranchCommissionScheme {
  id: string;
  name: string;
  scope: BranchCommissionScope;
  branchIds: string[];
  managerId: string | null;
  effectiveFrom: string;
  active: boolean;
  tiers: CommissionTier[];
  createdAt: string;
  updatedAt: string;
  managerHistory: DemoBranchManagerHistory[];
}

export interface DemoScheme {
  id: string;
  name: string;
  active: boolean;
  commissionMode?: "FIXED" | "SCALE";
  effectiveFrom?: string;
  createdAt?: string;
  deactivatedAt?: string | null;
  version?: number;
  previousVersionId?: string | null;
  salaryPlan?: DemoSchemeSalaryPlan | null;
  tiers: CommissionTier[];
}

export type DemoSalaryPlanDuration = "INDEFINITE" | "MONTHS";

export interface DemoSchemeSalaryPlan {
  monthlySalary: number;
  payrollModule: "FIXED" | "SPECIALIST";
  duration: DemoSalaryPlanDuration;
  durationMonths: number | null;
  nextSchemeId: string | null;
}

export function schemeAppliesToPeriod(
  scheme: DemoScheme,
  periodStart: string,
  periodEnd: string,
) {
  const started = (scheme.effectiveFrom ?? "0000-01-01") <= periodEnd;
  const remainsAvailable =
    scheme.active ||
    Boolean(scheme.deactivatedAt && scheme.deactivatedAt >= periodStart);
  return started && remainsAvailable;
}

export interface DemoSchemeAssignment {
  effectiveTo?: string | null;
  id: string;
  employeeId: string;
  schemeId: string;
  effectiveFrom: string;
  createdAt: string;
}

export interface DemoSalaryAssignment {
  id: string;
  employeeId: string;
  monthlySalary: number;
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED"> | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceSchemeId: string | null;
  reason: string;
  createdAt: string;
}

export interface DemoCommissionAssignment {
  id: string;
  employeeId: string;
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED"> | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  reason: string;
  createdAt: string;
}

export interface DemoSale {
  id: string;
  employeeId: string;
  branchId: string;
  date: string;
  amount: number;
}

export interface DemoMovement {
  id: string;
  catalogId: string | null;
  employeeId: string;
  costBranchIds: string[];
  type: MovementType;
  mode: MovementMode;
  concept: string;
  comments: string;
  amount: number;
  threshold: number | null;
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED">;
  periodStart: string;
  status: MovementStatus;
  appliedAt: string;
  createdAt: string;
}

export interface DemoBonusFineConcept {
  id: string;
  type: MovementType;
  name: string;
  mode: MovementMode;
  defaultAmount: number;
  threshold: number | null;
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED">;
  validFrom: string;
  validUntil: string | null;
  temporary?: boolean;
  condition?: BonusCondition | null;
  salesScale?: boolean;
  salesTiers?: BonusSalesTier[];
  eligibleEmployeeIds?: string[] | null;
  personalized?: boolean;
  salesAggregation?: PersonalizedBonusAggregation;
  active: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

export interface BonusSalesTier {
  id: string;
  from: number;
  to: number | null;
  amount: number;
}

export interface DemoPayrollAdjustment {
  id: string;
  type: PayrollAdjustmentType;
  employeeId: string;
  participantIds: string[];
  branchId: string;
  costBranchIds: string[];
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED">;
  payrollRunId: string;
  payrollDate: string;
  periodStart: string;
  reportTargets: PayrollReportTarget[];
  concept: string;
  amount: number;
  comments: string;
  status: PayrollAdjustmentStatus;
  createdAt: string;
}

export interface DemoDoublePayDay {
  id: string;
  employeeId: string;
  payrollModule: "FIXED" | "SPECIALIST";
  date: string;
  reason: string;
  multiplier: 2;
  createdAt: string;
  createdByEmployeeId: string;
}

export interface DemoLoanHistory {
  id: string;
  date: string;
  action: string;
  by: string;
}

export interface DemoLoan {
  id: string;
  employeeId: string;
  requestType?: "LOAN" | "ADVANCE";
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED">;
  payrollRunId: string;
  requestedAt: string;
  requestedAmount?: number;
  amount: number;
  installments: number;
  paidInstallments: number;
  appliedPeriodStarts?: string[];
  sourceSchedule?: PilotSnapshot["loans"][number]["installments"];
  sourceBalance?: number;
  pilotPayments?: Record<number, string>;
  firstPeriod: string;
  status: ApprovalStatus;
  notes: string;
  history: DemoLoanHistory[];
}

export interface DemoFinancialRequestPolicy {
  advanceCommissionLimitRate: number;
  maxMonthlyAdvances: number;
  maxLoanInstallments: number;
  maxQuarterlyLoans: number;
}

export interface DemoReceiptConfiguration {
  title: string;
  subtitle: string;
  showSales: boolean;
  showScheme: boolean;
  includeBaseSalaryInReceipt: boolean;
  showTemporaryBonusProgress: boolean;
  showBankAccount: boolean;
}

export interface DemoNotificationTemplate {
  id: string;
  moduleId: string;
  moduleLabel: string;
  eventLabel: string;
  title: string;
  message: string;
  audience: Array<"EMPLOYEE" | "MANAGER" | "MASTER">;
  approved: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface DemoRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface DemoPayrollRun {
  id: string;
  module: PayrollModule;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  mode: "WITH_VAT" | "WITHOUT_VAT";
  status: PayrollStatus;
  createdAt: string;
  closureReason?: "MANUAL" | "ALL_RECEIPTS_AUTHORIZED" | null;
  closedAt?: string | null;
  closedByEmployeeId?: string | null;
  reopenedAt?: string | null;
  reopenedByEmployeeId?: string | null;
  reopenReason?: string | null;
  revision?: number;
}

export interface DemoPayrollPeriodConfig {
  id: string;
  module: PayrollModule;
  frequency: PayrollPeriodFrequency;
  periodStart: string;
  periodEnd: string;
  cutoffDate: string;
  active: boolean;
  label: string;
  updatedAt: string;
}

export interface DemoPayrollTaxAssignment {
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED">;
  employeeId: string;
  socialCostEnabled: boolean;
  socialCostMode: "PERCENTAGE" | "FIXED";
  socialCostValue: number;
  isrCostEnabled: boolean;
  isrCostMode: "PERCENTAGE" | "FIXED";
  isrCostValue: number;
}

export interface DemoPeriodTaxInclusion {
  payrollModule?: Exclude<PayrollModule, "CONSOLIDATED"> | null;
  periodStart: string;
  periodEnd: string;
  includeSocialCost: boolean;
  includeIsr: boolean;
  includeWorkerTax: boolean;
  workerTaxRate: number;
  updatedAt: string;
  updatedByEmployeeId: string;
}

export interface DemoNegativeBalanceBreakdown {
  fines: number;
  loans: number;
  advances: number;
  otherDeductions: number;
}

export interface DemoNegativeBalance {
  employeeId: string;
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED">;
  amount: number;
  originPeriodStart: string;
  breakdown?: DemoNegativeBalanceBreakdown;
  updatedAt: string;
}

export type SpecialPayrollStatus = "DRAFT" | "APPROVED" | "PAID";

export interface DemoSettlementConcept {
  id: string;
  key:
    | "PENDING_SALARY"
    | "PROPORTIONAL_CHRISTMAS_BONUS"
    | "PROPORTIONAL_VACATION"
    | "VACATION_PREMIUM"
    | "PENDING_VARIABLE_PAY"
    | "SENIORITY_PREMIUM"
    | "CONSTITUTIONAL_INDEMNITY"
    | "TWENTY_DAYS_PER_YEAR"
    | "OTHER_AGREEMENT";
  label: string;
  amount: number;
  enabled: boolean;
  legalNote: string;
}

export interface DemoTerminationSettlement {
  id: string;
  employeeId: string;
  kind: "FINIQUITO" | "LIQUIDACION";
  applies: boolean;
  status: SpecialPayrollStatus;
  hireDate: string;
  terminationDate: string;
  paymentDate: string;
  costBranchIds: string[];
  concepts: DemoSettlementConcept[];
  includeSocialCost: boolean;
  socialCostRate: number;
  includeIsr: boolean;
  isrRate: number;
  agreementNotes: string;
  caseClosed: boolean;
  outcome: "PENDING" | "WON" | "SETTLED";
  closedAt: string | null;
  receiptPreparedAt: string | null;
  archivedAt?: string | null;
  updatedAt: string;
}

export interface DemoChristmasBonusPaymentPeriod {
  id: string;
  year: number;
  name: string;
  paymentDate: string;
  percentage: number;
  active: boolean;
}

export interface DemoChristmasBonus {
  id: string;
  employeeId: string;
  year: number;
  applies: boolean;
  status: SpecialPayrollStatus;
  daysGranted: number;
  grossAmount: number;
  paymentDate: string;
  costBranchIds: string[];
  includeSocialCost: boolean;
  socialCostRate: number;
  includeIsr: boolean;
  isrRate: number;
  paidPeriodIds: string[];
  notes: string;
  updatedAt: string;
}

export function christmasBonusPaidAmountForRange(
  bonus: DemoChristmasBonus,
  periods: DemoChristmasBonusPaymentPeriod[],
  periodStart: string,
  periodEnd: string,
) {
  if (!bonus.applies) return 0;
  const paidPeriodIds = new Set(bonus.paidPeriodIds);
  return periods
    .filter(
      (period) =>
        period.year === bonus.year &&
        period.active &&
        paidPeriodIds.has(period.id) &&
        period.paymentDate >= periodStart &&
        period.paymentDate <= periodEnd,
    )
    .reduce((sum, period) => sum + bonus.grossAmount * period.percentage, 0);
}

export function terminationSettlementTotal(
  settlement: DemoTerminationSettlement,
) {
  return settlement.concepts
    .filter((concept) => concept.enabled)
    .reduce((sum, concept) => sum + concept.amount, 0);
}

export function periodTaxInclusionForRange(
  inclusions: DemoPeriodTaxInclusion[],
  periodStart: string,
  periodEnd: string,
) {
  return inclusions
    .filter(
      (inclusion) =>
        !inclusion.payrollModule &&
        inclusion.periodStart <= periodEnd &&
        inclusion.periodEnd >= periodStart,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function moduleTaxInclusionForRange(
  inclusions: DemoPeriodTaxInclusion[],
  periodStart: string,
  periodEnd: string,
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED">,
) {
  return inclusions
    .filter(
      (inclusion) =>
        inclusion.payrollModule === payrollModule &&
        inclusion.periodStart <= periodEnd &&
        inclusion.periodEnd >= periodStart,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function effectiveTaxInclusionForRange(
  inclusions: DemoPeriodTaxInclusion[],
  periodStart: string,
  periodEnd: string,
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED">,
) {
  const global = periodTaxInclusionForRange(inclusions, periodStart, periodEnd);
  const moduleOverride = moduleTaxInclusionForRange(
    inclusions,
    periodStart,
    periodEnd,
    payrollModule,
  );
  return {
    includeSocialCost:
      (global?.includeSocialCost ?? true) ||
      (moduleOverride?.includeSocialCost ?? false),
    includeIsr:
      (global?.includeIsr ?? true) || (moduleOverride?.includeIsr ?? false),
    includeWorkerTax: global?.includeWorkerTax ?? false,
    workerTaxRate: Math.min(Math.max(global?.workerTaxRate ?? 0.03, 0), 1),
    global,
    moduleOverride,
  };
}

export interface DemoEmployeeDecision {
  employeeId: string;
  periodStart: string;
  status: "PENDING" | "AUTHORIZED" | "CLARIFICATION";
  note: string;
  updatedAt: string;
}

export interface DemoDisbursementPayment {
  id: string;
  payrollModule: PayrollModule;
  periodStart: string;
  periodEnd: string;
  employeeId: string;
  paidAt: string;
  paidByEmployeeId: string;
}

function invalidateAuthorizedDecisions(
  decisions: DemoEmployeeDecision[],
  employeeIds: Iterable<string>,
  periodStart: string | null | undefined,
  note: string,
) {
  if (!periodStart) return decisions;
  const affectedEmployeeIds = new Set(employeeIds);
  if (affectedEmployeeIds.size === 0) return decisions;
  let changed = false;
  const next = decisions.map((decision) => {
    if (
      decision.periodStart !== periodStart ||
      decision.status !== "AUTHORIZED" ||
      !affectedEmployeeIds.has(decision.employeeId)
    )
      return decision;
    changed = true;
    return {
      ...decision,
      status: "PENDING" as const,
      note,
      updatedAt: new Date().toISOString(),
    };
  });
  return changed ? next : decisions;
}

export interface DemoKioskReceiptDecision {
  managerId: string;
  month: string;
  status: "PENDING" | "AUTHORIZED" | "CLARIFICATION";
  note: string;
  updatedAt: string;
}

export interface DemoViaticsConcept {
  id: string;
  name: string;
  effect: ViaticsEffect;
  maxAmount: number;
  active: boolean;
}

export interface DemoViaticsEntry {
  id: string;
  employeeId: string;
  conceptId: string;
  branchId: string;
  requestedAt: string;
  amount: number;
  comments: string;
  receiptName: string;
  status: ViaticsStatus;
  payrollRunId: string | null;
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED"> | null;
  periodStart: string | null;
  createdAt: string;
}

export type DemoListSortMode = "DEFAULT" | "ALPHABETICAL" | "AMOUNT_DESC";

export function sortByListMode<T>(
  rows: readonly T[],
  mode: DemoListSortMode,
  label: (row: T) => string,
  amount: (row: T) => number,
): T[] {
  if (mode === "DEFAULT") return [...rows];
  return [...rows].sort((left, right) => {
    if (mode === "AMOUNT_DESC") {
      const amountDifference = amount(right) - amount(left);
      if (amountDifference !== 0) return amountDifference;
    }
    return label(left).localeCompare(label(right), "es-MX", {
      sensitivity: "base",
    });
  });
}

export interface DemoState {
  lastUpdatedAt: string | null;
  branches: DemoBranch[];
  positions: DemoPosition[];
  payrollModules: DemoPayrollModuleDefinition[];
  kioskTargets: DemoKioskTarget[];
  kioskMonthlySales: DemoKioskMonthlySale[];
  branchCommissionSchemes: DemoBranchCommissionScheme[];
  employees: DemoEmployee[];
  schemes: DemoScheme[];
  schemeAssignments: DemoSchemeAssignment[];
  salaryAssignments: DemoSalaryAssignment[];
  commissionAssignments: DemoCommissionAssignment[];
  sales: DemoSale[];
  bonusFineConcepts: DemoBonusFineConcept[];
  movements: DemoMovement[];
  adjustments: DemoPayrollAdjustment[];
  loans: DemoLoan[];
  financialRequestPolicy: DemoFinancialRequestPolicy;
  receiptConfiguration: DemoReceiptConfiguration;
  notificationTemplates: DemoNotificationTemplate[];
  roles: DemoRole[];
  runs: DemoPayrollRun[];
  periodConfigs: DemoPayrollPeriodConfig[];
  taxAssignments: DemoPayrollTaxAssignment[];
  periodTaxInclusions: DemoPeriodTaxInclusion[];
  doublePayDays: DemoDoublePayDay[];
  negativeBalances: DemoNegativeBalance[];
  terminationSettlements: DemoTerminationSettlement[];
  christmasBonuses: DemoChristmasBonus[];
  christmasBonusPaymentPeriods: DemoChristmasBonusPaymentPeriod[];
  decisions: DemoEmployeeDecision[];
  disbursementPayments: DemoDisbursementPayment[];
  kioskReceiptDecisions: DemoKioskReceiptDecision[];
  viaticsConcepts: DemoViaticsConcept[];
  viaticsEntries: DemoViaticsEntry[];
  calculationMode: DemoPayrollRun["mode"];
  commissionModeOverrides: Record<string, DemoPayrollRun["mode"]>;
  payrollCostAllocationModes: Record<string, PayrollCostAllocationMode>;
  activeEmployeeId: string;
}

export interface PeriodOption {
  value: string;
  start: string;
  end: string;
  label: string;
}

export interface EmployeePayrollLine {
  employee: DemoEmployee;
  workedDays: number;
  periodDays: number;
  grossSales: number;
  salesWithoutVat: number;
  sales: number;
  rate: number;
  commission: number;
  fixedSalary: number;
  doublePayDays: DemoDoublePayDay[];
  doublePayDayCount: number;
  doublePayAmount: number;
  carriedNegativeBalance: number;
  carriedNegativeBalanceBreakdown: DemoNegativeBalanceBreakdown;
  newNegativeBalance: number;
  newNegativeBalanceBreakdown: DemoNegativeBalanceBreakdown;
  bonuses: number;
  fines: number;
  loanDeduction: number;
  deductionDetails: PayrollCharge[];
  loanDeductionBreakdown: Pick<
    DemoNegativeBalanceBreakdown,
    "loans" | "advances"
  >;
  externalAdditions: number;
  externalDeductions: number;
  viaticsAdditions: number;
  viaticsDeductions: number;
  settlementPayment: number;
  christmasBonusPayment: number;
  baseSalaryOverride: number | null;
  payrollBeforeDeductions: number;
  totalDeductions: number;
  workerTax: number;
  total: number;
  socialCost: number;
  isrCost: number;
  totalCost: number;
  invoiceSubtotal: number;
  ivaAmount: number;
  isrRetention: number;
  ivaRetention: number;
  invoicePayable: number;
  schemeName: string;
  calculationMode: DemoPayrollRun["mode"];
  includedInModule: boolean;
}

const emptyNegativeBalanceBreakdown = (): DemoNegativeBalanceBreakdown => ({
  fines: 0,
  loans: 0,
  advances: 0,
  otherDeductions: 0,
});

function negativeBalanceBreakdownFor(
  balance: DemoNegativeBalance,
): DemoNegativeBalanceBreakdown {
  return balance.breakdown
    ? { ...balance.breakdown }
    : {
        ...emptyNegativeBalanceBreakdown(),
        otherDeductions: balance.amount,
      };
}

function addNegativeBalanceBreakdowns(
  left: DemoNegativeBalanceBreakdown,
  right: DemoNegativeBalanceBreakdown,
): DemoNegativeBalanceBreakdown {
  return {
    fines: left.fines + right.fines,
    loans: left.loans + right.loans,
    advances: left.advances + right.advances,
    otherDeductions: left.otherDeductions + right.otherDeductions,
  };
}

function negativeBalanceBreakdownTotal(
  breakdown: DemoNegativeBalanceBreakdown,
) {
  return (
    breakdown.fines +
    breakdown.loans +
    breakdown.advances +
    breakdown.otherDeductions
  );
}

function unpaidNegativeBalanceBreakdown(
  components: Array<{
    source: keyof DemoNegativeBalanceBreakdown;
    amount: number;
  }>,
  availableAmount: number,
) {
  let available = Math.max(availableAmount, 0);
  const pending = emptyNegativeBalanceBreakdown();
  components.forEach(({ source, amount }) => {
    const charge = Math.max(amount, 0);
    const covered = Math.min(charge, available);
    available -= covered;
    pending[source] += charge - covered;
  });
  return pending;
}

function reconcileNegativeBalancesForClosure(
  existingBalances: DemoNegativeBalance[],
  payrollModule: Exclude<PayrollModule, "CONSOLIDATED">,
  periodStart: string,
  balances: Array<{
    employeeId: string;
    amount: number;
    carriedAmount: number;
    breakdown: DemoNegativeBalanceBreakdown;
  }>,
) {
  const inputByEmployee = new Map(
    balances.map((balance) => [balance.employeeId, balance]),
  );
  const retained = existingBalances.filter((balance) => {
    const input = inputByEmployee.get(balance.employeeId);
    if (!input) return true;
    const belongsToThisClosure =
      balance.payrollModule === payrollModule &&
      balance.originPeriodStart === periodStart;
    if (belongsToThisClosure) return false;
    return !(
      input.carriedAmount > 0.005 && balance.originPeriodStart <= periodStart
    );
  });
  const updatedAt = new Date().toISOString();
  return [
    ...retained,
    ...balances
      .filter((balance) => balance.amount > 0.005)
      .map((balance) => ({
        employeeId: balance.employeeId,
        payrollModule,
        amount: balance.amount,
        originPeriodStart: periodStart,
        breakdown: balance.breakdown,
        updatedAt,
      })),
  ];
}

export const permissionCatalog = [
  "dashboard.view",
  "payroll.create",
  "payroll.approve",
  "loans.manage",
  "loans.approve",
  "settings.manage",
  "reports.view",
  "receipts.view",
  "portal.view",
  "movements.master",
  "viatics.master",
  "notifications.manage",
  "security.second_key.manage",
] as const;

export const modulePermissionCatalog = [
  {
    permission: "module.control_center",
    label: "Centro de control",
    section: "Dirección",
    paths: ["/centro-control"],
  },
  {
    permission: "module.payroll_summary",
    label: "Resumen de nómina",
    section: "Dirección",
    paths: ["/resumen-nomina"],
  },
  {
    permission: "module.employees",
    label: "Empleados",
    section: "Personal",
    paths: ["/empleados"],
  },
  {
    permission: "module.consolidated",
    label: "Consolidado",
    section: "Nómina",
    paths: ["/", "/gastos", "/conciliacion"],
  },
  {
    permission: "module.fixed_payroll",
    label: "Salario fijo",
    section: "Nómina",
    paths: ["/nomina-salario-fijo"],
  },
  {
    permission: "module.specialist_payroll",
    label: "Especialistas",
    section: "Nómina",
    paths: ["/nomina-especialistas"],
  },
  {
    permission: "module.commission_payroll",
    label: "Comisiones",
    section: "Nómina",
    paths: ["/nomina-comisiones"],
  },
  {
    permission: "module.kiosk_payroll",
    label: "Comisión de kiosco",
    section: "Nómina",
    paths: ["/nomina-comision-kiosco"],
  },
  {
    permission: "module.contractor_payroll",
    label: "Honorarios",
    section: "Nómina",
    paths: ["/nomina-honorarios"],
  },
  {
    permission: "module.disbursement",
    label: "Dispersión de nómina",
    section: "Nómina",
    paths: ["/dispersion-nomina"],
  },
  {
    permission: "module.settlements",
    label: "Liquidaciones y finiquitos",
    section: "Nómina",
    paths: ["/liquidaciones-finiquitos"],
  },
  {
    permission: "module.christmas_bonus",
    label: "Aguinaldos",
    section: "Nómina",
    paths: ["/aguinaldos"],
  },
  {
    permission: "module.commission_calculation",
    label: "Cálculo de comisiones",
    section: "Operación",
    paths: ["/calculo-comisiones"],
  },
  {
    permission: "module.movements",
    label: "Movimientos",
    section: "Operación",
    paths: ["/movimientos"],
  },
  {
    permission: "module.loans",
    label: "Préstamos y adelantos",
    section: "Operación",
    paths: ["/prestamos-adelantos"],
  },
  {
    permission: "module.bonus_fine_operations",
    label: "Bonos y multas",
    section: "Operación",
    paths: ["/operacion-bonos-multas", "/bonos", "/multas"],
  },
  {
    permission: "module.period_settings",
    label: "Periodos y conceptos",
    section: "Configuración",
    paths: ["/configuracion"],
  },
  {
    permission: "module.payroll_modules",
    label: "Módulos de nómina",
    section: "Configuración",
    paths: ["/modulos-nomina"],
  },
  {
    permission: "module.branches",
    label: "Sucursales",
    section: "Configuración",
    paths: ["/sucursales"],
  },
  {
    permission: "module.positions",
    label: "Puestos",
    section: "Configuración",
    paths: ["/puestos"],
  },
  {
    permission: "module.schemes",
    label: "Esquemas de comisión",
    section: "Configuración",
    paths: ["/esquemas"],
  },
  {
    permission: "module.branch_schemes",
    label: "Esquemas por sucursal",
    section: "Configuración",
    paths: ["/esquemas-sucursal"],
  },
  {
    permission: "module.bonuses_fines",
    label: "Bonos y multas",
    section: "Configuración",
    paths: ["/bonos-multas"],
  },
  {
    permission: "module.viaticos",
    label: "Viáticos",
    section: "Configuración",
    paths: ["/viaticos"],
  },
  {
    permission: "module.notifications",
    label: "Notificaciones",
    section: "Configuración",
    paths: ["/notificaciones"],
  },
  {
    permission: "module.receipt_settings",
    label: "Configuración de recibos",
    section: "Configuración",
    paths: ["/configuracion-recibos"],
  },
  {
    permission: "module.access_control",
    label: "Roles y accesos",
    section: "Configuración",
    paths: ["/accesos"],
  },
  {
    permission: "module.position_reports",
    label: "Gastos por puesto",
    section: "Reportes",
    paths: ["/reportes/gastos-por-puesto"],
  },
  {
    permission: "module.branch_reports",
    label: "Desglose por sucursal",
    section: "Reportes",
    paths: ["/reportes/desglose-sucursal"],
  },
  {
    permission: "module.movement_reports",
    label: "Reporte de movimientos",
    section: "Reportes",
    paths: ["/reportes/movimientos"],
  },
  {
    permission: "module.loan_reports",
    label: "Reporte de préstamos",
    section: "Reportes",
    paths: ["/reportes/prestamos"],
  },
  {
    permission: "module.bonus_reports",
    label: "Reporte de bonos",
    section: "Reportes",
    paths: ["/reportes/bonos"],
  },
  {
    permission: "module.fine_reports",
    label: "Reporte de multas",
    section: "Reportes",
    paths: ["/reportes/multas"],
  },
  {
    permission: "module.receipts",
    label: "Recibos",
    section: "Reportes",
    paths: ["/recibos"],
  },
  {
    permission: "module.manager_receipts",
    label: "Recibos gerenciales",
    section: "Reportes",
    paths: ["/recibos-kiosco"],
  },
  {
    permission: "module.settlement_reports",
    label: "Reporte de liquidaciones",
    section: "Reportes",
    paths: ["/reportes/liquidaciones"],
  },
] as const;

export const modulePermissionActions = [
  "view",
  "create",
  "edit",
  "delete",
] as const;

export type ModulePermissionAction = (typeof modulePermissionActions)[number];

export function moduleActionPermission(
  modulePermission: string,
  action: ModulePermissionAction,
) {
  return action === "view"
    ? modulePermission
    : `${modulePermission}.action.${action}`;
}

export function modulePermissionBundle(modulePermission: string) {
  return modulePermissionActions.map((action) =>
    moduleActionPermission(modulePermission, action),
  );
}

export function customPayrollModulePermission(moduleId: string) {
  return `module.payroll.custom:${moduleId}`;
}

export function roleHasPermission(
  role: DemoRole | undefined,
  permission: string,
) {
  return (
    role?.id === "role-admin" || role?.permissions.includes(permission) === true
  );
}

export function roleHasModuleActionPermission(
  role: DemoRole | undefined,
  modulePermission: string,
  action: ModulePermissionAction,
) {
  return (
    role?.id === "role-admin" ||
    (role?.permissions.includes(modulePermission) === true &&
      (action === "view" ||
        role.permissions.includes(
          moduleActionPermission(modulePermission, action),
        )))
  );
}

export function requiredModulePermission(pathname: string) {
  if (pathname.startsWith("/nomina-personalizada/")) {
    const moduleId = decodeURIComponent(
      pathname.slice("/nomina-personalizada/".length).split("/")[0] ?? "",
    );
    return moduleId ? customPayrollModulePermission(moduleId) : null;
  }

  return (
    modulePermissionCatalog.find(({ paths }) =>
      paths.some((path) =>
        path === "/"
          ? pathname === "/"
          : pathname === path || pathname.startsWith(`${path}/`),
      ),
    )?.permission ?? null
  );
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function periodForDate(date: Date): PeriodOption {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstHalf = date.getDate() <= 15;
  const start = new Date(year, month, firstHalf ? 1 : 16);
  const end = new Date(
    year,
    month,
    firstHalf ? 15 : new Date(year, month + 1, 0).getDate(),
  );
  const formatter = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  });
  return {
    value: isoDate(start),
    start: isoDate(start),
    end: isoDate(end),
    label: `${firstHalf ? "1.ª" : "2.ª"} quincena · ${start.getDate()}–${end.getDate()} de ${formatter.format(start)}`,
  };
}

export function buildPeriodOptions(monthCount = 12): PeriodOption[] {
  const now = new Date();
  const options: PeriodOption[] = [];
  for (let offset = 0; offset < monthCount; offset += 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    options.push(
      periodForDate(new Date(month.getFullYear(), month.getMonth(), 16)),
    );
    options.push(
      periodForDate(new Date(month.getFullYear(), month.getMonth(), 1)),
    );
  }
  for (let offset = 1; offset <= 3; offset += 1) {
    const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    options.push(
      periodForDate(new Date(month.getFullYear(), month.getMonth(), 1)),
    );
    options.push(
      periodForDate(new Date(month.getFullYear(), month.getMonth(), 16)),
    );
  }
  return options;
}

export const payrollModuleLabels: Record<string, string> = {
  CONSOLIDATED: "CONSOLIDADO",
  FIXED: "SALARIO FIJO",
  SPECIALIST: "ESPECIALISTAS",
  COMMISSION: "VENDEDORES",
  KIOSK_COMMISSION: "COMISIÓN DE KIOSCO",
  CONTRACTOR: "HONORARIOS",
  SETTLEMENT: "LIQUIDACIONES Y FINIQUITOS",
  CHRISTMAS_BONUS: "AGUINALDOS",
};

export function payrollModuleLabel(
  state: Pick<DemoState, "payrollModules">,
  module: PayrollModule,
) {
  return (
    state.payrollModules.find((item) => item.id === module)?.name ??
    payrollModuleLabels[module] ??
    module.replaceAll("_", " ")
  );
}

export function employeeSalaryPayrollModule(
  employee: DemoEmployee,
): Exclude<PayrollModule, "CONSOLIDATED"> | null {
  if (employee.salaryPayrollModuleId !== undefined)
    return employee.salaryPayrollModuleId;
  if (employee.monthlySalary <= 0) return null;
  if (employee.category === "SPECIALIST") return "SPECIALIST";
  if (employee.category === "CONTRACTOR") return "CONTRACTOR";
  return "FIXED";
}

export function employeeSalaryPayrollModuleForPeriod(
  state: Pick<DemoState, "salaryAssignments">,
  employee: DemoEmployee,
  periodStart: string,
  periodEnd: string,
): Exclude<PayrollModule, "CONSOLIDATED"> | null {
  const employeeHistory = state.salaryAssignments.filter(
    (assignment) => assignment.employeeId === employee.id,
  );
  if (employeeHistory.length === 0)
    return employeeSalaryPayrollModule(employee);
  return (
    employeeHistory
      .filter(
        (assignment) =>
          assignment.effectiveFrom <= periodEnd &&
          (!assignment.effectiveTo || assignment.effectiveTo >= periodStart),
      )
      .sort((left, right) =>
        right.effectiveFrom.localeCompare(left.effectiveFrom),
      )[0]?.payrollModule ?? null
  );
}

export function employeeCommissionPayrollModule(
  employee: DemoEmployee,
): Exclude<PayrollModule, "CONSOLIDATED"> | null {
  if (employee.commissionPayrollModuleId !== undefined)
    return employee.commissionPayrollModuleId;
  if (!employee.schemeId) return null;
  return employee.category === "CONTRACTOR" ? "CONTRACTOR" : "COMMISSION";
}

export function employeeCommissionPayrollModulesForPeriod(
  state: Pick<DemoState, "commissionAssignments">,
  employee: DemoEmployee,
  periodStart: string,
  periodEnd: string,
): Exclude<PayrollModule, "CONSOLIDATED">[] {
  const employeeHistory = state.commissionAssignments.filter(
    (assignment) => assignment.employeeId === employee.id,
  );
  if (employeeHistory.length === 0) {
    const fallback = employeeCommissionPayrollModule(employee);
    return fallback ? [fallback] : [];
  }
  return Array.from(
    new Set(
      employeeHistory
        .filter(
          (assignment) =>
            assignment.effectiveFrom <= periodEnd &&
            (!assignment.effectiveTo || assignment.effectiveTo >= periodStart),
        )
        .map((assignment) => assignment.payrollModule)
        .filter(
          (module): module is Exclude<PayrollModule, "CONSOLIDATED"> =>
            module !== null,
        ),
    ),
  );
}

export function employeeCommissionPayrollModuleForPeriod(
  state: Pick<DemoState, "commissionAssignments">,
  employee: DemoEmployee,
  periodStart: string,
  periodEnd: string,
): Exclude<PayrollModule, "CONSOLIDATED"> | null {
  const employeeHistory = state.commissionAssignments.filter(
    (assignment) => assignment.employeeId === employee.id,
  );
  if (employeeHistory.length === 0)
    return employeeCommissionPayrollModule(employee);
  return (
    employeeHistory
      .filter(
        (assignment) =>
          assignment.effectiveFrom <= periodEnd &&
          (!assignment.effectiveTo || assignment.effectiveTo >= periodStart),
      )
      .sort((left, right) =>
        right.effectiveFrom.localeCompare(left.effectiveFrom),
      )[0]?.payrollModule ?? null
  );
}

export function payrollModuleForCategory(
  category: EmployeeCategory,
): PayrollModule {
  if (category === "SPECIALIST") return "SPECIALIST";
  if (category === "SELLER") return "COMMISSION";
  if (category === "CONTRACTOR") return "CONTRACTOR";
  return "FIXED";
}

export interface TemporaryBonusStanding {
  concept: DemoBonusFineConcept;
  employee: DemoEmployee;
  value: number;
  target: number;
  remaining: number;
  achieved: boolean;
  awardAmount: number;
  tier: BonusSalesTier | null;
  rank: number;
}

export interface PersonalizedBonusProgress {
  concept: DemoBonusFineConcept;
  employee: DemoEmployee;
  aggregation: PersonalizedBonusAggregation;
  sales: number;
  target: number;
  remaining: number;
  achieved: boolean;
  awardAmount: number;
  tier: BonusSalesTier | null;
  participantCount: number;
  periodStart: string;
  periodEnd: string;
}

export function bonusFineConceptAllowsEmployee(
  concept: DemoBonusFineConcept,
  employeeId: string,
) {
  return (
    !concept.eligibleEmployeeIds ||
    concept.eligibleEmployeeIds.includes(employeeId)
  );
}

export function employeeCanReceiveConcept(
  employee: DemoEmployee,
  concept: DemoBonusFineConcept,
) {
  return bonusFineConceptAllowsEmployee(concept, employee.id);
}

export function employeeSalesForRange(
  state: DemoState,
  employeeId: string,
  start: string,
  end: string,
) {
  return state.sales
    .filter(
      (sale) =>
        sale.employeeId === employeeId &&
        sale.date >= start &&
        sale.date <= end,
    )
    .reduce((sum, sale) => sum + sale.amount, 0);
}

export function resolveBonusConceptAward(
  concept: DemoBonusFineConcept,
  sales: number,
) {
  const tiers = [...(concept.salesTiers ?? [])].sort(
    (left, right) => left.from - right.from,
  );
  if (concept.salesScale && tiers.length > 0) {
    const tier =
      [...tiers]
        .reverse()
        .find(
          (item) =>
            sales >= item.from && (item.to === null || sales <= item.to),
        ) ?? null;
    return {
      amount: tier?.amount ?? 0,
      threshold: tiers[0]?.from ?? 0,
      tier,
    };
  }
  const threshold = Math.max(concept.threshold ?? 0, 0);
  return {
    amount: sales >= threshold ? concept.defaultAmount : 0,
    threshold,
    tier: null,
  };
}

export function temporaryBonusStandings(
  state: DemoState,
  concept: DemoBonusFineConcept,
): TemporaryBonusStanding[] {
  if (!concept.temporary || !concept.validUntil) return [];
  const defaultTarget = Math.max(concept.threshold ?? 0, 1);
  const condition = concept.condition ?? "SALES";
  const standings = state.employees
    .filter(
      (employee) =>
        employee.hireDate <= concept.validUntil! &&
        (!employee.terminationDate ||
          employee.terminationDate >= concept.validFrom) &&
        employeeCanReceiveConcept(employee, concept),
    )
    .map((employee) => {
      const value =
        condition === "SALES"
          ? employeeSalesForRange(
              state,
              employee.id,
              concept.validFrom,
              concept.validUntil!,
            )
          : state.movements.filter(
              (movement) =>
                movement.employeeId === employee.id &&
                movement.type === "BONUS" &&
                movement.catalogId !== concept.id &&
                movement.status === "APPROVED" &&
                movement.appliedAt >= concept.validFrom &&
                movement.appliedAt <= concept.validUntil!,
            ).length +
            state.adjustments.filter(
              (adjustment) =>
                adjustment.participantIds.includes(employee.id) &&
                adjustment.type === "BONUS" &&
                adjustment.status === "APPROVED" &&
                adjustment.payrollDate >= concept.validFrom &&
                adjustment.payrollDate <= concept.validUntil!,
            ).length;
      const award =
        condition === "SALES"
          ? resolveBonusConceptAward(concept, value)
          : {
              amount: value >= defaultTarget ? concept.defaultAmount : 0,
              threshold: defaultTarget,
              tier: null,
            };
      const target = award.threshold;
      return {
        concept,
        employee,
        value,
        target,
        remaining: Math.max(target - value, 0),
        achieved: award.amount > 0,
        awardAmount: award.amount,
        tier: award.tier,
        rank: 0,
      };
    })
    .sort(
      (left, right) =>
        Number(right.achieved) - Number(left.achieved) ||
        right.value - left.value ||
        left.employee.name.localeCompare(right.employee.name, "es-MX"),
    );
  return standings.map((standing, index) => ({
    ...standing,
    rank: index + 1,
  }));
}

export function temporaryBonusAwardsForPeriod(
  state: DemoState,
  periodStart: string,
  periodEnd: string,
) {
  return state.bonusFineConcepts.flatMap((concept) => {
    if (
      concept.type !== "BONUS" ||
      !concept.temporary ||
      !concept.validUntil ||
      concept.validUntil < periodStart ||
      concept.validUntil > periodEnd
    )
      return [];
    return temporaryBonusStandings(state, concept)
      .filter((standing) => standing.achieved)
      .filter(
        (standing) =>
          !state.movements.some(
            (movement) =>
              movement.catalogId === concept.id &&
              movement.employeeId === standing.employee.id &&
              movement.status === "APPROVED",
          ),
      )
      .map((standing) => ({
        id: `temporary-${concept.id}-${standing.employee.id}`,
        concept,
        employee: standing.employee,
        amount: standing.awardAmount,
        standing,
        appliedAt: concept.validUntil!,
        costBranchIds: Array.from(
          new Set(
            standing.employee.costBranchIds.length
              ? standing.employee.costBranchIds
              : [standing.employee.branchId],
          ),
        ).filter((branchId) =>
          state.branches.some((branch) => branch.id === branchId),
        ),
      }));
  });
}

export function personalizedBonusProgressForPeriod(
  state: DemoState,
  concept: DemoBonusFineConcept,
  periodStart: string,
  periodEnd: string,
): PersonalizedBonusProgress[] {
  if (
    concept.type !== "BONUS" ||
    !concept.personalized ||
    !concept.active ||
    concept.deletedAt ||
    concept.validFrom > periodEnd ||
    (concept.validUntil && concept.validUntil < periodStart)
  )
    return [];

  const evaluationStart =
    concept.validFrom > periodStart ? concept.validFrom : periodStart;
  const evaluationEnd =
    concept.validUntil && concept.validUntil < periodEnd
      ? concept.validUntil
      : periodEnd;
  const participantIds = Array.from(new Set(concept.eligibleEmployeeIds ?? []));
  const participants = participantIds
    .map((employeeId) =>
      state.employees.find((employee) => employee.id === employeeId),
    )
    .filter(
      (employee): employee is DemoEmployee =>
        Boolean(employee) &&
        employee!.hireDate <= evaluationEnd &&
        (!employee!.terminationDate ||
          employee!.terminationDate >= evaluationStart),
    );
  if (participants.length === 0) return [];

  const aggregation = concept.salesAggregation ?? "INDIVIDUAL";
  const salesByEmployee = new Map(
    participants.map((employee) => [
      employee.id,
      employeeSalesForRange(state, employee.id, evaluationStart, evaluationEnd),
    ]),
  );
  const groupSales = Array.from(salesByEmployee.values()).reduce(
    (sum, sales) => sum + sales,
    0,
  );

  return participants.map((employee) => {
    const sales =
      aggregation === "GROUP"
        ? groupSales
        : (salesByEmployee.get(employee.id) ?? 0);
    const award = resolveBonusConceptAward(concept, sales);
    const nextTier = [...(concept.salesTiers ?? [])]
      .sort((left, right) => left.from - right.from)
      .find((tier) => sales < tier.from);
    const attainedTarget =
      award.tier?.from ?? nextTier?.from ?? award.threshold;
    return {
      concept,
      employee,
      aggregation,
      sales,
      target: attainedTarget,
      remaining: Math.max(attainedTarget - sales, 0),
      achieved: award.amount > 0,
      awardAmount: award.amount,
      tier: award.tier,
      participantCount: participants.length,
      periodStart: evaluationStart,
      periodEnd: evaluationEnd,
    };
  });
}

export function personalizedBonusAwardsForPeriod(
  state: DemoState,
  periodStart: string,
  periodEnd: string,
) {
  return state.bonusFineConcepts.flatMap((concept) =>
    personalizedBonusProgressForPeriod(state, concept, periodStart, periodEnd)
      .filter((progress) => progress.achieved)
      .filter(
        (progress) =>
          !state.movements.some(
            (movement) =>
              movement.catalogId === concept.id &&
              movement.employeeId === progress.employee.id &&
              movement.status === "APPROVED" &&
              movement.periodStart >= periodStart &&
              movement.periodStart <= periodEnd,
          ),
      )
      .map((progress) => {
        const saleBranchIds = Array.from(
          new Set(
            state.sales
              .filter(
                (sale) =>
                  sale.employeeId === progress.employee.id &&
                  sale.date >= progress.periodStart &&
                  sale.date <= progress.periodEnd,
              )
              .map((sale) => sale.branchId),
          ),
        ).filter((branchId) =>
          state.branches.some((branch) => branch.id === branchId),
        );
        const fallbackBranchIds = Array.from(
          new Set(
            progress.employee.costBranchIds.length
              ? progress.employee.costBranchIds
              : [progress.employee.branchId],
          ),
        ).filter((branchId) =>
          state.branches.some((branch) => branch.id === branchId),
        );
        return {
          id: `personalized-${concept.id}-${progress.employee.id}-${periodStart}`,
          concept,
          employee: progress.employee,
          amount: progress.awardAmount,
          progress,
          appliedAt: progress.periodEnd,
          costBranchIds:
            saleBranchIds.length > 0 ? saleBranchIds : fallbackBranchIds,
        };
      }),
  );
}

export function periodFromFrequency(
  frequency: PayrollPeriodFrequency,
  referenceDate: string,
  specialStart?: string,
  specialEnd?: string,
): PeriodOption {
  if (frequency === "SPECIAL" && specialStart && specialEnd) {
    return {
      value: specialStart,
      start: specialStart,
      end: specialEnd,
      label: `Nómina especial · ${specialStart} — ${specialEnd}`,
    };
  }
  const reference = new Date(`${referenceDate}T12:00:00`);
  if (frequency === "WEEKLY") {
    const weekday = reference.getDay();
    const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
    const monday = new Date(reference);
    monday.setDate(reference.getDate() + offsetToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      value: isoDate(monday),
      start: isoDate(monday),
      end: isoDate(sunday),
      label: `Semana · lunes ${monday.getDate()} a domingo ${sunday.getDate()}`,
    };
  }
  return periodForDate(reference);
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return isoDate(parsed);
}

function addMonths(date: string, months: number) {
  const parsed = new Date(`${date}T12:00:00`);
  const originalDay = parsed.getDate();
  parsed.setDate(1);
  parsed.setMonth(parsed.getMonth() + months);
  const lastDay = new Date(
    parsed.getFullYear(),
    parsed.getMonth() + 1,
    0,
  ).getDate();
  parsed.setDate(Math.min(originalDay, lastDay));
  return isoDate(parsed);
}

function mergeSalaryAssignments(
  existing: DemoSalaryAssignment[],
  additions: DemoSalaryAssignment[],
) {
  return [...additions]
    .sort((left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom),
    )
    .reduce<DemoSalaryAssignment[]>((result, addition) => {
      const withoutSameStart = result.filter(
        (item) =>
          !(
            item.employeeId === addition.employeeId &&
            item.effectiveFrom === addition.effectiveFrom
          ),
      );
      const closedPrevious = withoutSameStart.map((item) =>
        item.employeeId === addition.employeeId &&
        item.effectiveFrom < addition.effectiveFrom &&
        (!item.effectiveTo || item.effectiveTo >= addition.effectiveFrom)
          ? { ...item, effectiveTo: addDays(addition.effectiveFrom, -1) }
          : item,
      );
      return [...closedPrevious, addition];
    }, existing);
}

function mergeCommissionAssignments(
  existing: DemoCommissionAssignment[],
  additions: DemoCommissionAssignment[],
) {
  return [...additions]
    .sort((left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom),
    )
    .reduce<DemoCommissionAssignment[]>((result, addition) => {
      const withoutSameStart = result.filter(
        (item) =>
          !(
            item.employeeId === addition.employeeId &&
            item.effectiveFrom === addition.effectiveFrom
          ),
      );
      const closedPrevious = withoutSameStart.map((item) =>
        item.employeeId === addition.employeeId &&
        item.effectiveFrom < addition.effectiveFrom &&
        (!item.effectiveTo || item.effectiveTo >= addition.effectiveFrom)
          ? { ...item, effectiveTo: addDays(addition.effectiveFrom, -1) }
          : item,
      );
      return [...closedPrevious, addition];
    }, existing);
}

function buildAutomatedSchemePath(
  schemes: DemoScheme[],
  employeeId: string,
  startingSchemeId: string,
  effectiveFrom: string,
) {
  const schemeAssignments: DemoSchemeAssignment[] = [];
  const salaryAssignments: DemoSalaryAssignment[] = [];
  const visited = new Set<string>();
  const managesSalary = Boolean(
    schemes.find((scheme) => scheme.id === startingSchemeId)?.salaryPlan,
  );
  let schemeId: string | null = startingSchemeId;
  let startsAt = effectiveFrom;

  for (let step = 0; step < 12 && schemeId; step += 1) {
    if (visited.has(schemeId)) break;
    visited.add(schemeId);
    const scheme = schemes.find((item) => item.id === schemeId);
    if (!scheme) break;

    schemeAssignments.push({
      id: id("scheme-assignment"),
      employeeId,
      schemeId,
      effectiveFrom: startsAt,
      createdAt: new Date().toISOString(),
    });

    const salaryPlan = scheme.salaryPlan;
    if (managesSalary) {
      const nextStartsAt =
        salaryPlan?.duration === "MONTHS" && salaryPlan.durationMonths
          ? addMonths(startsAt, salaryPlan.durationMonths)
          : null;
      salaryAssignments.push({
        id: id("salary-assignment"),
        employeeId,
        monthlySalary: salaryPlan?.monthlySalary ?? 0,
        payrollModule: salaryPlan?.payrollModule ?? null,
        effectiveFrom: startsAt,
        effectiveTo: nextStartsAt ? addDays(nextStartsAt, -1) : null,
        sourceSchemeId: scheme.id,
        reason: salaryPlan
          ? `SUELDO PROGRAMADO · ${scheme.name}`
          : `FIN DE SUELDO PROGRAMADO · ${scheme.name}`,
        createdAt: new Date().toISOString(),
      });
      if (
        salaryPlan?.duration === "MONTHS" &&
        nextStartsAt &&
        (!salaryPlan.nextSchemeId ||
          !schemes.some((item) => item.id === salaryPlan.nextSchemeId))
      ) {
        salaryAssignments.push({
          id: id("salary-assignment"),
          employeeId,
          monthlySalary: 0,
          payrollModule: null,
          effectiveFrom: nextStartsAt,
          effectiveTo: null,
          sourceSchemeId: scheme.id,
          reason: `VENCIMIENTO DE SUELDO · ${scheme.name}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (
      salaryPlan?.duration !== "MONTHS" ||
      !salaryPlan.durationMonths ||
      !salaryPlan.nextSchemeId
    )
      break;
    startsAt = addMonths(startsAt, salaryPlan.durationMonths);
    schemeId = salaryPlan.nextSchemeId;
  }

  return { schemeAssignments, salaryAssignments };
}

export function pilotConfiguration(start: string): Pick<DemoState, "payrollModules" | "financialRequestPolicy" | "receiptConfiguration" | "roles"> {
  return {
    payrollModules: [
      {
        id: "CONSOLIDATED",
        name: "CONSOLIDADO",
        description:
          "Integra una sola vez todos los conceptos asignados a cada empleado.",
        concepts: [
          "SALARY",
          "COMMISSION",
          "BONUS",
          "FINE",
          "ADJUSTMENT_PLUS",
          "ADJUSTMENT_MINUS",
          "LOAN",
          "ADVANCE",
          "VIATICS",
        ],
        positionIds: [],
        active: true,
        custom: false,
        createdAt: start,
      },
      {
        id: "FIXED",
        name: "SALARIO FIJO",
        description:
          "Sueldo registrado, prorrateo por días trabajados y multas aprobadas del periodo.",
        concepts: ["SALARY", "FINE"],
        positionIds: [],
        active: true,
        custom: false,
        createdAt: start,
      },
      {
        id: "SPECIALIST",
        name: "ESPECIALISTAS",
        description:
          "Sueldo de especialistas y los conceptos configurados para ese módulo.",
        concepts: [
          "SALARY",
          "FINE",
          "ADJUSTMENT_PLUS",
          "ADJUSTMENT_MINUS",
          "LOAN",
          "ADVANCE",
          "VIATICS",
        ],
        positionIds: [],
        active: true,
        custom: false,
        createdAt: start,
      },
      {
        id: "COMMISSION",
        name: "COMISIONES",
        description: "Comisiones y movimientos; nunca incorpora sueldo base.",
        concepts: [
          "COMMISSION",
          "BONUS",
          "FINE",
          "ADJUSTMENT_PLUS",
          "ADJUSTMENT_MINUS",
          "LOAN",
          "ADVANCE",
          "VIATICS",
        ],
        positionIds: [],
        active: true,
        custom: false,
        createdAt: start,
      },
      {
        id: "CONTRACTOR",
        name: "HONORARIOS",
        description:
          "Comisión, factura y retenciones del personal por honorarios.",
        concepts: [
          "COMMISSION",
          "BONUS",
          "FINE",
          "ADJUSTMENT_PLUS",
          "ADJUSTMENT_MINUS",
          "LOAN",
          "ADVANCE",
          "VIATICS",
        ],
        positionIds: [],
        active: true,
        custom: false,
        createdAt: start,
      },
      {
        id: "SETTLEMENT",
        name: "LIQUIDACIONES Y FINIQUITOS",
        description:
          "Bajas de personal, acuerdos y prestaciones pendientes con costo dirigido por sucursal.",
        concepts: ["SETTLEMENT", "FINE"],
        positionIds: [],
        active: true,
        custom: false,
        createdAt: start,
      },
      {
        id: "CHRISTMAS_BONUS",
        name: "AGUINALDOS",
        description:
          "Aguinaldo anual por días otorgados, proporcionalidad y cargas configurables.",
        concepts: ["CHRISTMAS_BONUS", "FINE"],
        positionIds: [],
        active: true,
        custom: false,
        createdAt: start,
      },
    ],
    financialRequestPolicy: {
      advanceCommissionLimitRate: 0.5,
      maxMonthlyAdvances: 2,
      maxLoanInstallments: 6,
      maxQuarterlyLoans: 2,
    },
    receiptConfiguration: {
      title: "RECIBO DE COMISIONES",
      subtitle: "Comisiones, bonos y movimientos netos del periodo",
      showSales: true,
      showScheme: true,
      includeBaseSalaryInReceipt: false,
      showTemporaryBonusProgress: true,
      showBankAccount: true,
    },
    roles: [
      {
        id: "role-admin",
        name: "USUARIO MASTER",
        permissions: [
          ...permissionCatalog,
          ...modulePermissionCatalog.flatMap(({ permission }) =>
            modulePermissionBundle(permission),
          ),
        ],
      },
      {
        id: "role-general-admin",
        name: "ADMINISTRADOR GENERAL",
        permissions: ["dashboard.view", "reports.view", "receipts.view", "portal.view", ...modulePermissionCatalog.map(m => m.permission)],
      },
      {
        id: "role-manager",
        name: "GERENCIA",
        permissions: [
          "dashboard.view",
          "payroll.approve",
          "loans.approve",
          "reports.view",
          "receipts.view",
          "portal.view",
          "module.consolidated",
          "module.commission_payroll",
          "module.kiosk_payroll",
          "module.commission_calculation",
          "module.loans",
          "module.position_reports",
          "module.branch_reports",
          "module.receipts",
          "module.manager_receipts",
        ],
      },
      {
        id: "role-employee",
        name: "EMPLEADO",
        permissions: ["receipts.view", "portal.view"],
      },
    ],
  };
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function connectBranchToPayrollDependencies(
  current: DemoState,
  branch: DemoBranch,
) {
  const branches = current.branches.some((item) => item.id === branch.id)
    ? current.branches.map((item) => (item.id === branch.id ? branch : item))
    : [...current.branches, branch];
  if (!branch.active) return { ...current, branches };

  const kioskTargets = current.kioskTargets.some(
    (target) => target.branchId === branch.id,
  )
    ? current.kioskTargets
    : [
        ...current.kioskTargets,
        {
          branchId: branch.id,
          managerId: null,
          monthlyTarget: 0,
          commissionRate: 0,
          updatedAt: new Date().toISOString(),
        },
      ];
  const branchCommissionSchemes = current.branchCommissionSchemes.map(
    (scheme) =>
      scheme.scope === "ALL_COMBINED" && !scheme.branchIds.includes(branch.id)
        ? {
            ...scheme,
            branchIds: [...scheme.branchIds, branch.id],
            updatedAt: new Date().toISOString(),
          }
        : scheme,
  );

  return {
    ...current,
    branches,
    kioskTargets,
    branchCommissionSchemes,
  };
}

interface DemoPayrollContextValue {
  state: DemoState;
  privilegedPayroll: boolean;
  monthlyFixedCost: number;
  payrollLinesForTotals: DemoPayrollContextValue["payrollLines"];
  isAuthenticated: boolean;
  periodOptions: PeriodOption[];
  currentPeriod: PeriodOption;
  listSortMode: DemoListSortMode;
  setListSortMode: (mode: DemoListSortMode) => void;
  refreshSystem: () => void;
  startSession: (employeeId: string) => void;
  endSession: () => void;
  setActiveEmployee: (employeeId: string) => void;
  addBranch: (branch: Pick<DemoBranch, "name" | "city">) => void;
  updateBranch: (
    branchId: string,
    branch: Pick<DemoBranch, "name" | "city">,
  ) => void;
  toggleBranch: (branchId: string) => void;
  syncPosBranch: (branch: DemoPosBranchInput) => void;
  addPosition: (
    position: Omit<DemoPosition, "id" | "createdAt" | "active">,
  ) => void;
  updatePosition: (
    positionId: string,
    position: Pick<
      DemoPosition,
      | "name"
      | "category"
      | "salaryPayrollModuleId"
      | "commissionPayrollModuleId"
      | "defaultRoleId"
    >,
  ) => void;
  togglePosition: (positionId: string) => void;
  addPayrollModule: (
    module: Pick<
      DemoPayrollModuleDefinition,
      "name" | "description" | "concepts" | "positionIds"
    >,
  ) => void;
  updatePayrollModule: (
    moduleId: PayrollModule,
    module: Pick<
      DemoPayrollModuleDefinition,
      "name" | "description" | "concepts" | "positionIds"
    >,
  ) => void;
  togglePayrollModule: (moduleId: PayrollModule) => void;
  addEmployee: (employee: Omit<DemoEmployee, "id">) => void;
  updateEmployeeProfile: (
    employeeId: string,
    input: Pick<
      DemoEmployee,
      | "name"
      | "birthDate"
      | "position"
      | "category"
      | "branchId"
      | "primaryBranchIds"
      | "costBranchIds"
      | "monthlySalary"
      | "showSalaryInPayroll"
      | "showCommissionInPayroll"
      | "salaryPayrollModuleId"
      | "commissionPayrollModuleId"
      | "roleId"
      | "bank"
      | "account"
      | "clabe"
      | "socialCostRate"
      | "isrCostRate"
      | "ivaRate"
      | "isrRetentionRate"
      | "ivaRetentionRate"
    >,
  ) => void;
  setEmployeePayrollVisibility: (
    employeeId: string,
    visibility: Pick<
      DemoEmployee,
      "showSalaryInPayroll" | "showCommissionInPayroll"
    >,
  ) => void;
  updateEmployeeEmployment: (
    employeeId: string,
    hireDate: string,
    terminationDate: string | null,
  ) => void;
  addScheme: (
    name: string,
    tiers: Omit<CommissionTier, "id">[],
    effectiveFrom?: string,
    salaryPlan?: DemoSchemeSalaryPlan | null,
  ) => void;
  updateScheme: (
    schemeId: string,
    name: string,
    tiers: Omit<CommissionTier, "id">[],
    effectiveFrom?: string,
    salaryPlan?: DemoSchemeSalaryPlan | null,
  ) => void;
  deleteScheme: (schemeId: string) => void;
  assignScheme: (
    employeeId: string,
    schemeId: string | null,
    effectiveFrom?: string,
  ) => void;
  updateSchemeAssignment: (
    assignmentId: string,
    schemeId: string,
    effectiveFrom: string,
  ) => void;
  addMovement: (movement: Omit<DemoMovement, "id" | "createdAt">) => void;
  updateMovement: (
    movementId: string,
    patch: Omit<DemoMovement, "id" | "createdAt" | "status">,
  ) => void;
  deleteMovement: (movementId: string) => void;
  setMovementStatus: (movementId: string, status: MovementStatus) => void;
  addBonusFineConcept: (
    concept: Omit<DemoBonusFineConcept, "id" | "createdAt">,
  ) => void;
  updateBonusFineConcept: (
    conceptId: string,
    patch: Omit<DemoBonusFineConcept, "id" | "createdAt">,
  ) => void;
  setBonusFineConceptActive: (conceptId: string, active: boolean) => void;
  deleteBonusFineConcept: (conceptId: string) => void;
  addPayrollAdjustment: (
    adjustment: Omit<DemoPayrollAdjustment, "id" | "createdAt">,
  ) => void;
  updatePayrollAdjustment: (
    adjustmentId: string,
    patch: Omit<DemoPayrollAdjustment, "id" | "createdAt" | "status">,
  ) => void;
  setPayrollAdjustmentStatus: (
    adjustmentId: string,
    status: PayrollAdjustmentStatus,
  ) => void;
  addLoan: (
    loan: Omit<DemoLoan, "id" | "history" | "paidInstallments">,
  ) => void;
  updateLoan: (
    loanId: string,
    patch: Pick<
      DemoLoan,
      | "requestedAt"
      | "amount"
      | "installments"
      | "firstPeriod"
      | "payrollModule"
      | "payrollRunId"
      | "notes"
    >,
  ) => void;
  deleteLoan: (loanId: string) => void;
  setLoanStatus: (loanId: string, status: ApprovalStatus) => void;
  updateFinancialRequestPolicy: (policy: DemoFinancialRequestPolicy) => void;
  updateReceiptConfiguration: (configuration: DemoReceiptConfiguration) => void;
  setNotificationModuleApproval: (moduleId: string, approved: boolean) => void;
  updateNotificationTemplate: (
    templateId: string,
    input: Pick<DemoNotificationTemplate, "title" | "message">,
  ) => void;
  createRun: (
    module: PayrollModule,
    periodStart: string,
    periodEnd: string,
    mode: DemoPayrollRun["mode"],
    payDate: string,
  ) => void;
  setRunStatus: (runId: string, status: PayrollStatus) => void;
  closeCommissionRun: (runId: string) => void;
  reopenCommissionRun: (
    runId: string,
    masterCode: string,
    reason: string,
  ) => void;
  resetCommissionApprovals: (
    periodStart: string,
    employeeIds: string[],
    reason: string,
  ) => void;
  reopenEmployeeReceipt: (
    employeeId: string,
    periodStart: string,
    masterCode: string,
    reason: string,
  ) => void;
  markDisbursementPaymentPaid: (
    payrollModule: PayrollModule,
    periodStart: string,
    periodEnd: string,
    employeeId: string,
  ) => void;
  closeRunAndOpenNextPeriod: (
    runId: string,
    nextPeriod: {
      start: string;
      end: string;
      payDate: string;
      label: string;
    },
    balances: Array<{
      employeeId: string;
      amount: number;
      carriedAmount: number;
      breakdown: DemoNegativeBalanceBreakdown;
    }>,
  ) => void;
  setCalculationMode: (mode: DemoPayrollRun["mode"]) => void;
  setCommissionModeOverride: (
    employeeId: string,
    periodStart: string,
    mode: DemoPayrollRun["mode"] | null,
  ) => void;
  setPayrollCostAllocationModes: (
    periodStart: string,
    modes: Record<string, PayrollCostAllocationMode>,
  ) => void;
  updateKioskTarget: (
    branchId: string,
    monthlyTarget: number,
    commissionRate: number,
    managerId: string | null,
  ) => void;
  addBranchCommissionScheme: (
    scheme: Omit<
      DemoBranchCommissionScheme,
      "id" | "createdAt" | "updatedAt" | "tiers" | "managerHistory"
    > & { tiers: Omit<CommissionTier, "id">[] },
  ) => void;
  updateBranchCommissionScheme: (
    schemeId: string,
    scheme: Omit<
      DemoBranchCommissionScheme,
      "id" | "createdAt" | "updatedAt" | "tiers" | "managerHistory"
    > & { tiers: Omit<CommissionTier, "id">[] },
  ) => void;
  deleteBranchCommissionScheme: (schemeId: string) => void;
  updatePeriodConfig: (
    module: PayrollModule,
    input: Omit<DemoPayrollPeriodConfig, "id" | "module" | "updatedAt">,
  ) => void;
  updateEmployeeCosts: (
    employeeId: string,
    socialCostRate: number,
    isrCostRate: number,
  ) => void;
  setPayrollTaxAssignments: (
    module: Exclude<PayrollModule, "CONSOLIDATED">,
    assignments: Array<Omit<DemoPayrollTaxAssignment, "payrollModule">>,
  ) => void;
  setPeriodTaxInclusion: (
    periodStart: string,
    periodEnd: string,
    patch: Partial<
      Pick<
        DemoPeriodTaxInclusion,
        | "includeSocialCost"
        | "includeIsr"
        | "includeWorkerTax"
        | "workerTaxRate"
      >
    >,
  ) => void;
  setModuleTaxInclusion: (
    module: Exclude<PayrollModule, "CONSOLIDATED">,
    periodStart: string,
    periodEnd: string,
    patch: Partial<
      Pick<DemoPeriodTaxInclusion, "includeSocialCost" | "includeIsr">
    >,
  ) => void;
  addDoublePayDay: (
    entry: Pick<
      DemoDoublePayDay,
      "employeeId" | "payrollModule" | "date" | "reason"
    >,
  ) => void;
  deleteDoublePayDay: (entryId: string) => void;
  upsertTerminationSettlement: (settlement: DemoTerminationSettlement) => void;
  approveTerminationSettlement: (settlement: DemoTerminationSettlement) => void;
  archiveTerminationSettlement: (settlement: DemoTerminationSettlement) => void;
  upsertChristmasBonus: (bonus: DemoChristmasBonus) => void;
  replaceChristmasBonusPaymentPeriods: (
    year: number,
    periods: DemoChristmasBonusPaymentPeriod[],
  ) => void;
  setEmployeeViatics: (
    employeeId: string,
    enabled: boolean,
    conceptIds: string[],
  ) => void;
  addViaticsConcept: (concept: Omit<DemoViaticsConcept, "id">) => void;
  updateViaticsConcept: (
    conceptId: string,
    patch: Omit<DemoViaticsConcept, "id">,
  ) => void;
  deleteViaticsConcept: (conceptId: string) => void;
  addViaticsEntry: (
    entry: Omit<
      DemoViaticsEntry,
      | "id"
      | "createdAt"
      | "status"
      | "payrollRunId"
      | "payrollModule"
      | "periodStart"
    >,
  ) => void;
  updateViaticsEntry: (
    entryId: string,
    patch: Pick<
      DemoViaticsEntry,
      | "conceptId"
      | "branchId"
      | "requestedAt"
      | "amount"
      | "comments"
      | "receiptName"
    >,
  ) => void;
  deleteViaticsEntry: (entryId: string) => void;
  setViaticsEntryStatus: (
    entryId: string,
    status: ViaticsStatus,
    payrollRunId?: string,
  ) => void;
  addRole: (name: string) => void;
  togglePermission: (roleId: string, permission: string) => void;
  setPermissions: (
    roleId: string,
    permissions: string[],
    enabled: boolean,
  ) => void;
  assignRole: (employeeId: string, roleId: string) => void;
  setEmployeeCostBranches: (employeeId: string, branchIds: string[]) => void;
  setEmployeeSecondaryAccessKey: (
    employeeId: string,
    key: string,
    updatedBy: string,
  ) => void;
  updateEmployeeCredentials: (
    employeeId: string,
    password: string,
    accessCode: string,
  ) => void;
  setDecision: (
    employeeId: string,
    periodStart: string,
    status: DemoEmployeeDecision["status"],
    note: string,
  ) => void;
  setKioskReceiptDecision: (
    managerId: string,
    month: string,
    status: DemoKioskReceiptDecision["status"],
    note: string,
  ) => void;
  resetDemo: () => void;
  payrollLines: (
    periodStart: string,
    mode?: DemoPayrollRun["mode"],
    periodEnd?: string,
    payrollModule?: PayrollModule,
  ) => EmployeePayrollLine[];
}

const DemoPayrollContext = createContext<DemoPayrollContextValue | null>(null);

export function PayrollDemoProvider({children, state, setState, original, periodOptions, currentPeriod, onLogout}: {
  children: React.ReactNode; state: DemoState; setState: React.Dispatch<React.SetStateAction<DemoState>>;
  original: DemoState; periodOptions: PeriodOption[]; currentPeriod: PeriodOption; onLogout: () => void;
}) {
  const isAuthenticated = true;
  const [listSortMode,setListSortMode] = useState<DemoListSortMode>("DEFAULT");
  const update = useCallback((recipe: (current: DemoState) => DemoState) => {
    setState((current) => {
      const next = recipe(current);
      return Object.is(next, current)
        ? current
        : { ...next, lastUpdatedAt: new Date().toISOString() };
    });
  }, [setState]);

  const switchProfile = useCallback((employeeId: string) => {
    update(current => {
      const target = current.employees.find(e => e.id === employeeId);
      if (!target || (isConfidentialPayrollRole(target.roleId) && !canViewConfidentialPayroll(current))) return current;
      return { ...current, activeEmployeeId: employeeId };
    });
  }, [update]);

  const payrollLines = useCallback(
    (
      periodStart: string,
      mode: DemoPayrollRun["mode"] = "WITH_VAT",
      periodEnd?: string,
      payrollModule: PayrollModule = "CONSOLIDATED",
    ) => {
      const configuredEnd =
        periodEnd ??
        periodOptions.find((item) => item.start === periodStart)?.end ??
        currentPeriod.end;
      const startDate = new Date(`${periodStart}T12:00:00`);
      const endDate = new Date(`${configuredEnd}T12:00:00`);
      const periodDays = Math.max(
        1,
        Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
      );
      const moduleDefinition = state.payrollModules.find(
        (module) => module.id === payrollModule,
      );
      const includesConcept = (concept: PayrollModuleConcept) =>
        concept === "FINE" ||
        payrollModule === "CONSOLIDATED" ||
        Boolean(moduleDefinition?.concepts.includes(concept));
      const lines = state.employees
        .filter((employee) => {
          const hasSettlementPayment = state.terminationSettlements.some(
            (settlement) =>
              settlement.employeeId === employee.id &&
              settlement.applies &&
              !settlement.archivedAt &&
              settlement.status !== "DRAFT" &&
              settlement.paymentDate >= periodStart &&
              settlement.paymentDate <= configuredEnd &&
              (payrollModule === "CONSOLIDATED" ||
                payrollModule === "SETTLEMENT"),
          );
          const hasChristmasBonusPayment = state.christmasBonuses.some(
            (bonus) =>
              bonus.employeeId === employee.id &&
              christmasBonusPaidAmountForRange(
                bonus,
                state.christmasBonusPaymentPeriods,
                periodStart,
                configuredEnd,
              ) > 0 &&
              (payrollModule === "CONSOLIDATED" ||
                payrollModule === "CHRISTMAS_BONUS"),
          );
          return (
            employeeAppliesToPeriod(employee, periodStart, configuredEnd) ||
            hasSettlementPayment ||
            hasChristmasBonusPayment
          );
        })
        .map((employee) => {
          const employmentStart =
            employee.hireDate > periodStart ? employee.hireDate : periodStart;
          const employmentEnd =
            employee.terminationDate && employee.terminationDate < configuredEnd
              ? employee.terminationDate
              : configuredEnd;
          const workedDays = Math.max(
            0,
            Math.round(
              (new Date(`${employmentEnd}T12:00:00`).getTime() -
                new Date(`${employmentStart}T12:00:00`).getTime()) /
                86_400_000,
            ) + 1,
          );
          const employeeSales = state.sales.filter(
            (sale) =>
              sale.employeeId === employee.id &&
              sale.date >= employmentStart &&
              sale.date <= employmentEnd,
          );
          const grossSales = employeeSales.reduce(
            (sum, sale) => sum + sale.amount,
            0,
          );
          const commissionModulesInPeriod = new Set(
            employeeCommissionPayrollModulesForPeriod(
              state,
              employee,
              periodStart,
              configuredEnd,
            ),
          );
          const employeeCommissionModule =
            employeeCommissionPayrollModuleForPeriod(
              state,
              employee,
              periodStart,
              configuredEnd,
            );
          const applicableAssignment = state.schemeAssignments
            .filter(
              (assignment) =>
                assignment.employeeId === employee.id &&
                assignment.effectiveFrom <= configuredEnd && (!assignment.effectiveTo || assignment.effectiveTo >= periodStart),
            )
            .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
          const scheme = state.schemes.find(
            (item) =>
              item.id ===
                (applicableAssignment?.schemeId ?? (state.schemeAssignments.some(a => a.employeeId === employee.id) ? null : employee.schemeId)) &&
              schemeAppliesToPeriod(item, periodStart, configuredEnd),
          );
          const hasCommissionActivity =
            commissionModulesInPeriod.size > 0 &&
            (grossSales > 0 || Boolean(scheme));
          const overlappingPeriods = periodOptions.filter(
            (period) =>
              period.start <= employmentEnd && period.end >= employmentStart,
          );
          const calculationPeriods =
            overlappingPeriods.length > 0
              ? overlappingPeriods
              : [
                  {
                    value: periodStart,
                    start: periodStart,
                    end: configuredEnd,
                    label: periodStart,
                  },
                ];
          const commissionSegments = calculationPeriods.map((period) => {
            const segmentStart =
              period.start > employmentStart ? period.start : employmentStart;
            const segmentEnd =
              period.end < employmentEnd ? period.end : employmentEnd;
            const segmentGrossSales = employeeSales
              .filter(
                (sale) => sale.date >= segmentStart && sale.date <= segmentEnd,
              )
              .reduce((sum, sale) => sum + sale.amount, 0);
            const closedCommissionRun = state.runs.find(
              (run) =>
                run.module === "COMMISSION" &&
                run.periodStart === period.start &&
                run.periodEnd === period.end &&
                run.status !== "DRAFT",
            );
            const segmentMode =
              employeeCommissionModule !== null || hasCommissionActivity
                ? (state.commissionModeOverrides[
                    `${period.start}:${employee.id}`
                  ] ??
                  state.commissionModeOverrides[employee.id] ??
                  (closedCommissionRun &&
                  (payrollModule === "COMMISSION" ||
                    payrollModule === "CONSOLIDATED")
                    ? closedCommissionRun.mode
                    : mode))
                : mode;
            const segmentSales =
              segmentMode === "WITHOUT_VAT"
                ? segmentGrossSales / 1.16
                : segmentGrossSales;
            const segmentTier = scheme?.tiers.find(
              (item) =>
                segmentSales >= item.from &&
                (item.to === null || segmentSales <= item.to),
            );
            return {
              grossSales: segmentGrossSales,
              sales: segmentSales,
              mode: segmentMode,
              commission: segmentSales * (segmentTier?.rate ?? 0),
            };
          });
          const activeSegmentModes = commissionSegments
            .filter((segment) => segment.grossSales > 0)
            .map((segment) => segment.mode);
          const calculationMode =
            activeSegmentModes.length > 0 &&
            activeSegmentModes.every(
              (segmentMode) => segmentMode === activeSegmentModes[0],
            )
              ? activeSegmentModes[0]!
              : mode;
          const sales = commissionSegments.reduce(
            (sum, segment) => sum + segment.sales,
            0,
          );
          const calculatedCommission = commissionSegments.reduce(
            (sum, segment) => sum + segment.commission,
            0,
          );
          const rate = sales > 0 ? calculatedCommission / sales : 0;
          const employeeSalaryHistory = state.salaryAssignments.filter(
            (assignment) => assignment.employeeId === employee.id,
          );
          const salaryAt = (date: string) => {
            const assignment = employeeSalaryHistory
              .filter(
                (item) =>
                  item.effectiveFrom <= date &&
                  (!item.effectiveTo || item.effectiveTo >= date),
              )
              .sort((left, right) =>
                right.effectiveFrom.localeCompare(left.effectiveFrom),
              )[0];
            if (assignment)
              return {
                monthlySalary: assignment.monthlySalary,
                payrollModule: assignment.payrollModule,
              };
            return employeeSalaryHistory.length > 0
              ? { monthlySalary: 0, payrollModule: null }
              : {
                  monthlySalary: employee.monthlySalary,
                  payrollModule: employeeSalaryPayrollModule(employee),
                };
          };
          const applicableSalary = salaryAt(configuredEnd);
          const salaryModuleId = applicableSalary.payrollModule;
          const salaryModulesInPeriod = new Set(
            employeeSalaryHistory
              .filter(
                (assignment) =>
                  assignment.effectiveFrom <= configuredEnd &&
                  (!assignment.effectiveTo ||
                    assignment.effectiveTo >= periodStart),
              )
              .map((assignment) => assignment.payrollModule),
          );
          if (employeeSalaryHistory.length === 0)
            salaryModulesInPeriod.add(employeeSalaryPayrollModule(employee));
          const commissionModuleId = employeeCommissionModule;
          const salaryAssignedHere =
            payrollModule === "CONSOLIDATED" ||
            salaryModulesInPeriod.has(payrollModule);
          const commissionAssignedHere =
            commissionModulesInPeriod.size > 0 &&
            (payrollModule === "CONSOLIDATED" ||
              commissionModulesInPeriod.has(payrollModule));
          const commission =
            commissionAssignedHere && includesConcept("COMMISSION")
              ? calculatedCommission
              : 0;
          const periodMovements = state.movements.filter(
            (movement) =>
              movement.employeeId === employee.id &&
              movement.periodStart >= periodStart &&
              movement.periodStart <= configuredEnd &&
              movement.status === "APPROVED" &&
              (payrollModule === "CONSOLIDATED" ||
                movement.payrollModule === payrollModule ||
                (payrollModule === "COMMISSION" && movement.type === "BONUS")),
          );
          const movementBonuses = periodMovements
            .filter(
              (movement) =>
                includesConcept("BONUS") &&
                movement.type === "BONUS" &&
                (movement.mode === "FIXED" ||
                  sales >= (movement.threshold ?? 0)),
            )
            .reduce((sum, movement) => sum + movement.amount, 0);
          const temporaryBonuses = includesConcept("BONUS")
            ? temporaryBonusAwardsForPeriod(state, periodStart, configuredEnd)
                .filter(
                  (award) =>
                    award.employee.id === employee.id &&
                    (payrollModule === "CONSOLIDATED" ||
                      award.concept.payrollModule === payrollModule ||
                      payrollModule === "COMMISSION"),
                )
                .reduce((sum, award) => sum + award.amount, 0)
            : 0;
          const personalizedBonuses = includesConcept("BONUS")
            ? personalizedBonusAwardsForPeriod(
                state,
                periodStart,
                configuredEnd,
              )
                .filter(
                  (award) =>
                    award.employee.id === employee.id &&
                    (payrollModule === "CONSOLIDATED" ||
                      award.concept.payrollModule === payrollModule ||
                      payrollModule === "COMMISSION"),
                )
                .reduce((sum, award) => sum + award.amount, 0)
            : 0;
          const bonuses =
            movementBonuses + temporaryBonuses + personalizedBonuses;
          const fines = periodMovements
            .filter(
              (movement) => includesConcept("FINE") && movement.type === "FINE",
            )
            .reduce((sum, movement) => sum + movement.amount, 0);
          const deductionDetails: PayrollCharge[] = periodMovements
            .filter(m => includesConcept("FINE") && m.type === "FINE")
            .map(m => ({ source: m.concept, reference: m.id, date: m.appliedAt ?? m.periodStart, amount: m.amount }));
          const loanDeductionBreakdown = { loans: 0, advances: 0 };
          for (const loan of state.loans) {
            const advance = loan.requestType === "ADVANCE";
            if (loan.employeeId !== employee.id || (payrollModule !== "CONSOLIDATED" && loan.payrollModule !== payrollModule) || !includesConcept(advance ? "ADVANCE" : "LOAN")) continue;
            for (const charge of loanCharges(loan, periodStart, configuredEnd)) {
              loanDeductionBreakdown[advance ? "advances" : "loans"] += charge.amount;
              deductionDetails.push({ source: `${advance ? "Adelanto" : "Préstamo"} · ${charge.source}${charge.index >= 0 ? " " + (charge.index + 1) : ""}`,
                reference: loan.id, date: charge.date, amount: charge.amount });
            }
          }
          const loanDeduction =
            loanDeductionBreakdown.loans + loanDeductionBreakdown.advances;
          const payrollAdjustments = state.adjustments.filter(
            (adjustment) =>
              adjustment.status === "APPROVED" &&
              adjustment.participantIds.includes(employee.id) &&
              adjustment.periodStart >= periodStart &&
              adjustment.periodStart <= configuredEnd &&
              adjustment.payrollDate >= periodStart &&
              adjustment.payrollDate <= configuredEnd &&
              (payrollModule === "CONSOLIDATED" ||
                adjustment.payrollModule === payrollModule ||
                (payrollModule === "COMMISSION" &&
                  adjustment.type === "BONUS")) &&
              (adjustment.type !== "BASE_SALARY" ||
                (salaryAssignedHere && includesConcept("SALARY"))),
          );
          const adjustmentShare = (adjustment: DemoPayrollAdjustment) =>
            adjustment.amount / Math.max(adjustment.participantIds.length, 1);
          const externalAdditions = payrollAdjustments
            .filter(
              (adjustment) =>
                (adjustment.type === "PLUS" &&
                  includesConcept("ADJUSTMENT_PLUS")) ||
                (adjustment.type === "BONUS" && includesConcept("BONUS")) ||
                (adjustment.type === "LOAN" && includesConcept("LOAN")),
            )
            .reduce((sum, adjustment) => sum + adjustmentShare(adjustment), 0);
          const externalDeductionAdjustments = payrollAdjustments.filter(
            (adjustment) =>
              (adjustment.type === "MINUS" &&
                includesConcept("ADJUSTMENT_MINUS")) ||
              (adjustment.type === "FINE" && includesConcept("FINE")) ||
              (adjustment.type === "LOAN_PAYMENT" && includesConcept("LOAN")),
          );
          const externalDeductions = externalDeductionAdjustments.reduce(
            (sum, adjustment) => sum + adjustmentShare(adjustment),
            0,
          );
          const externalFineDeductions = externalDeductionAdjustments
            .filter((adjustment) => adjustment.type === "FINE")
            .reduce((sum, adjustment) => sum + adjustmentShare(adjustment), 0);
          const externalLoanDeductions = externalDeductionAdjustments
            .filter((adjustment) => adjustment.type === "LOAN_PAYMENT")
            .reduce((sum, adjustment) => sum + adjustmentShare(adjustment), 0);
          const externalOtherDeductions = externalDeductionAdjustments
            .filter((adjustment) => adjustment.type === "MINUS")
            .reduce((sum, adjustment) => sum + adjustmentShare(adjustment), 0);
          const approvedViatics = state.viaticsEntries.filter(
            (entry) =>
              entry.employeeId === employee.id &&
              entry.status === "APPROVED" &&
              entry.periodStart !== null &&
              entry.periodStart >= periodStart &&
              entry.periodStart <= configuredEnd &&
              (payrollModule === "CONSOLIDATED" ||
                entry.payrollModule === payrollModule) &&
              includesConcept("VIATICS"),
          );
          const viaticsAdditions = approvedViatics
            .filter(
              (entry) =>
                state.viaticsConcepts.find(
                  (concept) => concept.id === entry.conceptId,
                )?.effect === "ADD",
            )
            .reduce((sum, entry) => sum + entry.amount, 0);
          const viaticsDeductions = approvedViatics
            .filter(
              (entry) =>
                state.viaticsConcepts.find(
                  (concept) => concept.id === entry.conceptId,
                )?.effect === "DEDUCT",
            )
            .reduce((sum, entry) => sum + entry.amount, 0);
          const totalExternalAdditions = externalAdditions + viaticsAdditions;
          const totalExternalDeductions =
            externalDeductions + viaticsDeductions;
          const baseSalaryOverride =
            !salaryAssignedHere || !includesConcept("SALARY") || periodDays > 16
              ? null
              : (payrollAdjustments
                  .filter((adjustment) => adjustment.type === "BASE_SALARY")
                  .at(-1)?.amount ?? null);
          const isStandardFortnight =
            (startDate.getDate() === 1 && endDate.getDate() === 15) ||
            (startDate.getDate() === 16 &&
              endDate.getDate() ===
                new Date(
                  endDate.getFullYear(),
                  endDate.getMonth() + 1,
                  0,
                ).getDate());
          const isFullCalendarMonth =
            startDate.getFullYear() === endDate.getFullYear() &&
            startDate.getMonth() === endDate.getMonth() &&
            startDate.getDate() === 1 &&
            endDate.getDate() ===
              new Date(
                endDate.getFullYear(),
                endDate.getMonth() + 1,
                0,
              ).getDate();
          const monthEndDay = new Date(
            endDate.getFullYear(),
            endDate.getMonth() + 1,
            0,
          ).getDate();
          const firstHalfWorkedDays = isFullCalendarMonth
            ? Math.max(
                0,
                Math.round(
                  (new Date(
                    `${employmentEnd < `${periodStart.slice(0, 8)}15` ? employmentEnd : `${periodStart.slice(0, 8)}15`}T12:00:00`,
                  ).getTime() -
                    new Date(
                      `${employmentStart > periodStart ? employmentStart : periodStart}T12:00:00`,
                    ).getTime()) /
                    86_400_000,
                ) + 1,
              )
            : 0;
          const secondHalfStart = `${periodStart.slice(0, 8)}16`;
          const secondHalfWorkedDays = isFullCalendarMonth
            ? Math.max(
                0,
                Math.round(
                  (new Date(`${employmentEnd}T12:00:00`).getTime() -
                    new Date(
                      `${employmentStart > secondHalfStart ? employmentStart : secondHalfStart}T12:00:00`,
                    ).getTime()) /
                    86_400_000,
                ) + 1,
              )
            : 0;
          const calculatedFixedSalary =
            !salaryAssignedHere || !includesConcept("SALARY")
              ? 0
              : isFullCalendarMonth
                ? ((payrollModule === "CONSOLIDATED" ||
                  salaryAt(`${periodStart.slice(0, 8)}15`).payrollModule ===
                    payrollModule
                    ? salaryAt(`${periodStart.slice(0, 8)}15`).monthlySalary
                    : 0) /
                    2) *
                    (Math.min(firstHalfWorkedDays, 15) / 15) +
                  ((payrollModule === "CONSOLIDATED" ||
                  salaryAt(configuredEnd).payrollModule === payrollModule
                    ? salaryAt(configuredEnd).monthlySalary
                    : 0) /
                    2) *
                    (Math.min(secondHalfWorkedDays, monthEndDay - 15) /
                      (monthEndDay - 15))
                : isStandardFortnight
                  ? payrollModule === "CONSOLIDATED" ||
                    applicableSalary.payrollModule === payrollModule
                    ? (applicableSalary.monthlySalary / 2) *
                      (workedDays / periodDays)
                    : 0
                  : 0;
          const fixedSalary =
            baseSalaryOverride === null
              ? calculatedFixedSalary
              : baseSalaryOverride * (workedDays / periodDays);
          const doublePayDays = state.doublePayDays.filter(
            (entry) =>
              entry.employeeId === employee.id &&
              entry.date >= employmentStart &&
              entry.date <= employmentEnd &&
              entry.payrollModule === salaryAt(entry.date).payrollModule &&
              (payrollModule === "CONSOLIDATED" ||
                entry.payrollModule === payrollModule),
          );
          const doublePayAmount = doublePayDays.reduce(
            (sum, entry) =>
              sum +
              (salaryAt(entry.date).monthlySalary / 30) *
                Math.max(entry.multiplier - 1, 0),
            0,
          );
          const settlementRecord = state.terminationSettlements.find(
            (settlement) =>
              settlement.employeeId === employee.id &&
              settlement.applies &&
              !settlement.archivedAt &&
              settlement.status !== "DRAFT" &&
              settlement.paymentDate >= periodStart &&
              settlement.paymentDate <= configuredEnd &&
              (payrollModule === "CONSOLIDATED" ||
                payrollModule === "SETTLEMENT"),
          );
          const christmasBonusRecord = state.christmasBonuses.find(
            (bonus) =>
              bonus.employeeId === employee.id &&
              christmasBonusPaidAmountForRange(
                bonus,
                state.christmasBonusPaymentPeriods,
                periodStart,
                configuredEnd,
              ) > 0 &&
              (payrollModule === "CONSOLIDATED" ||
                payrollModule === "CHRISTMAS_BONUS"),
          );
          const settlementPayment = settlementRecord
            ? terminationSettlementTotal(settlementRecord)
            : 0;
          const christmasBonusPayment = christmasBonusRecord
            ? christmasBonusPaidAmountForRange(
                christmasBonusRecord,
                state.christmasBonusPaymentPeriods,
                periodStart,
                configuredEnd,
              )
            : 0;
          const ordinaryNet =
            fixedSalary +
            doublePayAmount +
            commission +
            bonuses +
            totalExternalAdditions -
            fines -
            loanDeduction -
            totalExternalDeductions;
          const invoiceSubtotal =
            employee.category === "CONTRACTOR"
              ? fixedSalary + commission + bonuses + totalExternalAdditions
              : 0;
          const ivaAmount = invoiceSubtotal * employee.ivaRate;
          const isrRetention = invoiceSubtotal * employee.isrRetentionRate;
          const ivaRetention = invoiceSubtotal * employee.ivaRetentionRate;
          const invoicePayable =
            employee.category === "CONTRACTOR"
              ? invoiceSubtotal +
                ivaAmount -
                isrRetention -
                ivaRetention -
                fines -
                loanDeduction -
                totalExternalDeductions
              : 0;
          const ordinaryBeforeCarry =
            employee.category === "CONTRACTOR" ? invoicePayable : ordinaryNet;
          const fallbackPayrollModule = payrollModuleForCategory(
            employee.category,
          ) as Exclude<PayrollModule, "CONSOLIDATED">;
          const carryReceiverCandidates = Array.from(
            new Set(
              [
                applicableSalary.monthlySalary > 0 ? salaryModuleId : null,
                ...commissionModulesInPeriod,
                fallbackPayrollModule,
              ].filter(
                (module): module is Exclude<PayrollModule, "CONSOLIDATED"> =>
                  Boolean(module),
              ),
            ),
          );
          const priorNegativeBalances = state.negativeBalances.filter(
            (balance) =>
              balance.employeeId === employee.id &&
              balance.originPeriodStart < periodStart,
          );
          const currentPeriodNegativeBalances = state.negativeBalances.filter(
            (balance) =>
              balance.employeeId === employee.id &&
              balance.originPeriodStart === periodStart,
          );
          const primaryCarryReceiver =
            carryReceiverCandidates[0] ??
            priorNegativeBalances[0]?.payrollModule ??
            null;
          const currentPeriodOriginModules = new Set(
            currentPeriodNegativeBalances.map(
              (balance) => balance.payrollModule,
            ),
          );
          const samePeriodCarryReceiver =
            carryReceiverCandidates.find(
              (module) => !currentPeriodOriginModules.has(module),
            ) ?? null;
          const appliedNegativeBalances =
            payrollModule === "CONSOLIDATED"
              ? priorNegativeBalances
              : [
                  ...(payrollModule === primaryCarryReceiver
                    ? priorNegativeBalances
                    : []),
                  ...(payrollModule === samePeriodCarryReceiver
                    ? currentPeriodNegativeBalances
                    : []),
                ];
          const carriedNegativeBalance = appliedNegativeBalances.reduce(
            (sum, balance) => sum + balance.amount,
            0,
          );
          const carriedNegativeBalanceBreakdown =
            appliedNegativeBalances.reduce(
              (breakdown, balance) =>
                addNegativeBalanceBreakdowns(
                  breakdown,
                  negativeBalanceBreakdownFor(balance),
                ),
              emptyNegativeBalanceBreakdown(),
            );
          const ordinaryBeforeDeductions =
            employee.category === "CONTRACTOR"
              ? invoiceSubtotal + ivaAmount - isrRetention - ivaRetention
              : fixedSalary +
                doublePayAmount +
                commission +
                bonuses +
                totalExternalAdditions;
          const payrollBeforeDeductions =
            ordinaryBeforeDeductions +
            settlementPayment +
            christmasBonusPayment;
          const deductionsBeforeWorkerTax =
            fines +
            loanDeduction +
            totalExternalDeductions +
            carriedNegativeBalance;
          const ordinaryBalanceAdjustedTotal =
            ordinaryBeforeCarry - carriedNegativeBalance;
          const ordinaryTotal = Math.max(ordinaryBalanceAdjustedTotal, 0);
          const uncoveredDeductions = Math.max(
            -ordinaryBalanceAdjustedTotal,
            0,
          );
          const totalBeforeClamp =
            ordinaryTotal +
            settlementPayment +
            christmasBonusPayment -
            uncoveredDeductions;
          const totalBeforeWorkerTax = Math.max(totalBeforeClamp, 0);
          const newNegativeBalanceBreakdown = unpaidNegativeBalanceBreakdown(
            [
              {
                source: "fines",
                amount: carriedNegativeBalanceBreakdown.fines,
              },
              {
                source: "loans",
                amount: carriedNegativeBalanceBreakdown.loans,
              },
              {
                source: "advances",
                amount: carriedNegativeBalanceBreakdown.advances,
              },
              {
                source: "otherDeductions",
                amount: carriedNegativeBalanceBreakdown.otherDeductions,
              },
              {
                source: "loans",
                amount: loanDeductionBreakdown.loans + externalLoanDeductions,
              },
              {
                source: "advances",
                amount: loanDeductionBreakdown.advances,
              },
              {
                source: "fines",
                amount: fines + externalFineDeductions,
              },
              {
                source: "otherDeductions",
                amount: externalOtherDeductions + viaticsDeductions,
              },
            ],
            payrollBeforeDeductions,
          );
          const newNegativeBalance = negativeBalanceBreakdownTotal(
            newNegativeBalanceBreakdown,
          );
          const employeePayrollModule =
            payrollModule === "CONSOLIDATED"
              ? (commissionModuleId ?? salaryModuleId ?? fallbackPayrollModule)
              : payrollModule;
          const taxAssignment = state.taxAssignments.find(
            (assignment) =>
              assignment.payrollModule === employeePayrollModule &&
              assignment.employeeId === employee.id,
          );
          const ordinaryTaxInclusion = effectiveTaxInclusionForRange(
            state.periodTaxInclusions,
            periodStart,
            configuredEnd,
            employeePayrollModule,
          );
          const workerTax = ordinaryTaxInclusion.includeWorkerTax
            ? totalBeforeWorkerTax * ordinaryTaxInclusion.workerTaxRate
            : 0;
          const total = Math.max(totalBeforeWorkerTax - workerTax, 0);
          const totalDeductions = deductionsBeforeWorkerTax + workerTax;
          for (const adjustment of externalDeductionAdjustments) {
            deductionDetails.push({ source: adjustment.concept, reference: adjustment.id, date: adjustment.payrollDate, amount: adjustmentShare(adjustment) });
          }
          for (const entry of approvedViatics) {
            const concept = state.viaticsConcepts.find(c => c.id === entry.conceptId);
            if (concept?.effect === "DEDUCT") deductionDetails.push({ source: concept.name, reference: entry.id, date: entry.requestedAt, amount: entry.amount });
          }
          for (const balance of appliedNegativeBalances) {
            if (balance.amount > 0) deductionDetails.push({ source: "Saldo trasladado · " + payrollModuleLabel(state, balance.payrollModule),
              reference: "", date: balance.originPeriodStart, amount: balance.amount });
          }
          if (workerTax > 0) deductionDetails.push({ source: "Impuesto del trabajador", reference: "", date: periodStart, amount: workerTax });

          const settlementTaxInclusion = effectiveTaxInclusionForRange(
            state.periodTaxInclusions,
            periodStart,
            configuredEnd,
            "SETTLEMENT",
          );
          const christmasTaxInclusion = effectiveTaxInclusionForRange(
            state.periodTaxInclusions,
            periodStart,
            configuredEnd,
            "CHRISTMAS_BONUS",
          );
          const taxableBase = Math.max(ordinaryTotal, 0);
          const ordinarySocialCost =
            !ordinaryTaxInclusion.includeSocialCost ||
            taxAssignment?.socialCostEnabled === false
              ? 0
              : taxAssignment?.socialCostMode === "FIXED"
                ? taxAssignment.socialCostValue
                : taxableBase *
                  (taxAssignment?.socialCostValue ?? employee.socialCostRate);
          const ordinaryIsrCost =
            !ordinaryTaxInclusion.includeIsr ||
            taxAssignment?.isrCostEnabled === false
              ? 0
              : taxAssignment?.isrCostMode === "FIXED"
                ? taxAssignment.isrCostValue
                : taxableBase *
                  (taxAssignment?.isrCostValue ?? employee.isrCostRate);
          const specialSocialCost =
            (settlementTaxInclusion.includeSocialCost &&
            settlementRecord?.includeSocialCost
              ? settlementPayment * settlementRecord.socialCostRate
              : 0) +
            ((christmasTaxInclusion.includeSocialCost ||
              christmasBonusRecord?.includeSocialCost === true) &&
            christmasBonusRecord
              ? christmasBonusPayment * christmasBonusRecord.socialCostRate
              : 0);
          const specialIsrCost =
            (settlementTaxInclusion.includeIsr && settlementRecord?.includeIsr
              ? settlementPayment * settlementRecord.isrRate
              : 0) +
            ((christmasTaxInclusion.includeIsr ||
              christmasBonusRecord?.includeIsr === true) &&
            christmasBonusRecord
              ? christmasBonusPayment * christmasBonusRecord.isrRate
              : 0);
          const socialCost = ordinarySocialCost + specialSocialCost;
          const isrCost = ordinaryIsrCost + specialIsrCost;
          const includedInModule =
            payrollModule === "CONSOLIDATED" ||
            salaryModuleId === payrollModule ||
            commissionModulesInPeriod.has(payrollModule) ||
            (payrollModule === "COMMISSION" &&
              (commission > 0 || bonuses > 0)) ||
            periodMovements.length > 0 ||
            doublePayDays.length > 0 ||
            carriedNegativeBalance > 0 ||
            payrollAdjustments.length > 0 ||
            approvedViatics.length > 0 ||
            settlementPayment > 0 ||
            christmasBonusPayment > 0 ||
            state.loans.some(
              (loan) =>
                loan.employeeId === employee.id &&
                loan.payrollModule === payrollModule &&
                loan.status === "APPROVED",
            );
          return {
            employee,
            workedDays,
            periodDays,
            grossSales,
            salesWithoutVat: grossSales / 1.16,
            sales,
            rate,
            commission,
            fixedSalary,
            doublePayDays,
            doublePayDayCount: doublePayDays.length,
            doublePayAmount,
            carriedNegativeBalance,
            carriedNegativeBalanceBreakdown,
            newNegativeBalance,
            newNegativeBalanceBreakdown,
            bonuses,
            fines,
            loanDeduction,
            deductionDetails,
            loanDeductionBreakdown,
            externalAdditions: totalExternalAdditions,
            externalDeductions: totalExternalDeductions,
            viaticsAdditions,
            viaticsDeductions,
            settlementPayment,
            christmasBonusPayment,
            baseSalaryOverride,
            payrollBeforeDeductions,
            totalDeductions,
            workerTax,
            total,
            socialCost,
            isrCost,
            totalCost: total + workerTax + socialCost + isrCost,
            invoiceSubtotal,
            ivaAmount,
            isrRetention,
            ivaRetention,
            invoicePayable,
            schemeName: scheme?.name ?? "SIN ESQUEMA",
            calculationMode,
            includedInModule,
          };
        })
        .filter((line) => line.includedInModule);
      return sortByListMode(
        lines,
        listSortMode,
        (line) => line.employee.name,
        (line) => line.total,
      );
    },
    [currentPeriod, listSortMode, periodOptions, state],
  );

  const privilegedPayroll = canViewConfidentialPayroll(state);
  const confidentialIds = useMemo(() => new Set(privilegedPayroll ? [] : state.employees
    .filter(e => !employeeShowsSalaryInPayroll(e)).map(e => e.id)), [privilegedPayroll, state.employees]);
  const visibleState = useMemo(() => {
    if (!confidentialIds.size) return state;
    const visible = (item: { employeeId: string }) => !confidentialIds.has(item.employeeId);
    return {
      ...state,
      employees: state.employees.map(e => confidentialIds.has(e.id) ? { ...e, monthlySalary: 0 } : e),
      salaryAssignments: state.salaryAssignments.filter(visible),
      terminationSettlements: state.terminationSettlements.filter(visible),
      christmasBonuses: state.christmasBonuses.filter(visible),
      doublePayDays: state.doublePayDays.filter(visible),
      adjustments: state.adjustments.filter(a => a.type !== "BASE_SALARY" || a.participantIds.every(id => !confidentialIds.has(id))),
    };
  }, [state, confidentialIds]);
  const visiblePayrollLines = useCallback<DemoPayrollContextValue["payrollLines"]>((...args) => {
    const lines = payrollLines(...args);
    return confidentialIds.size ? lines.filter(line => !confidentialIds.has(line.employee.id)) : lines;
  }, [payrollLines, confidentialIds]);

  const value = useMemo<DemoPayrollContextValue>(
    () => ({
      state: visibleState,
      privilegedPayroll,
      monthlyFixedCost: state.employees
    .filter(
      (employee) =>
        employee.active &&
        employee.category !== "SELLER" &&
        employee.category !== "CONTRACTOR",
    )
    .reduce((sum, employee) => sum + employee.monthlySalary, 0),
      payrollLinesForTotals: payrollLines,
      isAuthenticated,
      periodOptions,
      currentPeriod,
      listSortMode,
      setListSortMode,
      refreshSystem: () => update((current) => ({ ...current })),
      startSession: switchProfile,
      endSession: () => {
        setListSortMode("DEFAULT");
        onLogout();
      },
      setActiveEmployee: switchProfile,
      addBranch: (branch) =>
        update((current) =>
          connectBranchToPayrollDependencies(current, {
            id: id("branch"),
            name: branch.name.trim().toLocaleUpperCase("es-MX"),
            city: branch.city.trim().toLocaleUpperCase("es-MX"),
            active: true,
            source: "PAYROLL",
            externalPosId: null,
            registeredAt: isoDate(new Date()),
            deactivatedAt: null,
            lastSyncedAt: null,
          }),
        ),
      updateBranch: (branchId, branch) =>
        update((current) => ({
          ...current,
          branches: current.branches.map((item) =>
            item.id === branchId
              ? {
                  ...item,
                  name: branch.name.trim().toLocaleUpperCase("es-MX"),
                  city: branch.city.trim().toLocaleUpperCase("es-MX"),
                }
              : item,
          ),
        })),
      toggleBranch: (branchId) =>
        update((current) => {
          const branch = current.branches.find((item) => item.id === branchId);
          if (!branch) return current;
          const nextBranch = {
            ...branch,
            active: !branch.active,
            deactivatedAt: branch.active ? isoDate(new Date()) : null,
          };
          const nextState = {
            ...current,
            branches: current.branches.map((item) =>
              item.id === branchId ? nextBranch : item,
            ),
          };
          return nextBranch.active
            ? connectBranchToPayrollDependencies(nextState, nextBranch)
            : nextState;
        }),
      syncPosBranch: (incoming) =>
        update((current) => {
          const normalizedName = incoming.name
            .trim()
            .toLocaleUpperCase("es-MX");
          const normalizedCity = incoming.city
            .trim()
            .toLocaleUpperCase("es-MX");
          const syncedAt = new Date().toISOString();
          const match = current.branches.find(
            (branch) =>
              branch.externalPosId === incoming.externalPosId ||
              branch.name === normalizedName,
          );
          if (!match) {
            return connectBranchToPayrollDependencies(current, {
              id: id("branch"),
              name: normalizedName,
              city: normalizedCity,
              active: incoming.active,
              source: "POS",
              externalPosId: incoming.externalPosId,
              registeredAt: isoDate(new Date()),
              deactivatedAt: incoming.active ? null : isoDate(new Date()),
              lastSyncedAt: syncedAt,
            });
          }
          const nextBranch = {
            ...match,
            name: normalizedName,
            city: normalizedCity,
            active: incoming.active,
            source: "POS" as const,
            externalPosId: incoming.externalPosId,
            deactivatedAt: incoming.active
              ? null
              : (match.deactivatedAt ?? isoDate(new Date())),
            lastSyncedAt: syncedAt,
          };
          const nextState = {
            ...current,
            branches: current.branches.map((branch) =>
              branch.id === match.id ? nextBranch : branch,
            ),
          };
          return nextBranch.active
            ? connectBranchToPayrollDependencies(nextState, nextBranch)
            : nextState;
        }),
      addPosition: (position) =>
        update((current) => ({
          ...current,
          positions: [
            ...current.positions,
            {
              ...position,
              id: id("position"),
              name: position.name.trim().toLocaleUpperCase("es-MX"),
              active: true,
              createdAt: isoDate(new Date()),
            },
          ],
        })),
      updatePosition: (positionId, position) =>
        update((current) => {
          const previous = current.positions.find(
            (item) => item.id === positionId,
          );
          if (!previous) return current;
          const normalizedName = position.name
            .trim()
            .toLocaleUpperCase("es-MX");
          return {
            ...current,
            positions: current.positions.map((item) =>
              item.id === positionId
                ? { ...item, ...position, name: normalizedName }
                : item,
            ),
            employees: current.employees.map((employee) =>
              employee.position === previous.name
                ? {
                    ...employee,
                    position: normalizedName,
                  }
                : employee,
            ),
          };
        }),
      togglePosition: (positionId) =>
        update((current) => ({
          ...current,
          positions: current.positions.map((position) =>
            position.id === positionId
              ? { ...position, active: !position.active }
              : position,
          ),
        })),
      addPayrollModule: (module) =>
        update((current) => {
          const moduleId = `CUSTOM_${Date.now()}` as const;
          const selectedPositions = new Set(module.positionIds);
          const concepts = module.concepts.includes("FINE")
            ? module.concepts
            : [...module.concepts, "FINE" as const];
          const salaryEnabled = concepts.includes("SALARY");
          const commissionEnabled = concepts.includes("COMMISSION");
          const employees = current.employees.map((employee) => {
            const position = current.positions.find(
              (item) => item.name === employee.position,
            );
            if (!position || !selectedPositions.has(position.id))
              return employee;
            return {
              ...employee,
              salaryPayrollModuleId:
                salaryEnabled && employee.monthlySalary > 0
                  ? moduleId
                  : employee.salaryPayrollModuleId,
              commissionPayrollModuleId:
                commissionEnabled && employee.schemeId
                  ? moduleId
                  : employee.commissionPayrollModuleId,
            };
          });
          const salaryAdditions = employees.flatMap<DemoSalaryAssignment>(
            (employee, index) =>
              employee.salaryPayrollModuleId !==
              current.employees[index]?.salaryPayrollModuleId
                ? [
                    {
                      id: id("salary-assignment"),
                      employeeId: employee.id,
                      monthlySalary: employee.monthlySalary,
                      payrollModule: employee.salaryPayrollModuleId,
                      effectiveFrom: currentPeriod.start,
                      effectiveTo: null,
                      sourceSchemeId: null,
                      reason: "ASIGNACIÓN DESDE MÓDULO DE NÓMINA",
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : [],
          );
          const commissionAdditions =
            employees.flatMap<DemoCommissionAssignment>((employee, index) =>
              employee.commissionPayrollModuleId !==
              current.employees[index]?.commissionPayrollModuleId
                ? [
                    {
                      id: id("commission-assignment"),
                      employeeId: employee.id,
                      payrollModule: employee.commissionPayrollModuleId,
                      effectiveFrom: currentPeriod.start,
                      effectiveTo: null,
                      reason: "ASIGNACIÓN DESDE MÓDULO DE NÓMINA",
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : [],
            );
          return {
            ...current,
            payrollModules: [
              ...current.payrollModules,
              {
                ...module,
                concepts,
                id: moduleId,
                name: module.name.trim().toLocaleUpperCase("es-MX"),
                description: module.description.trim(),
                active: true,
                custom: true,
                createdAt: isoDate(new Date()),
                deactivatedAt: null,
              },
            ],
            employees,
            salaryAssignments: mergeSalaryAssignments(
              current.salaryAssignments,
              salaryAdditions,
            ),
            commissionAssignments: mergeCommissionAssignments(
              current.commissionAssignments,
              commissionAdditions,
            ),
            periodConfigs: [
              ...current.periodConfigs,
              {
                id: `period-${moduleId.toLocaleLowerCase()}`,
                module: moduleId,
                frequency: "BIWEEKLY",
                periodStart: currentPeriod.start,
                periodEnd: currentPeriod.end,
                cutoffDate: currentPeriod.end,
                active: true,
                label: currentPeriod.label,
                updatedAt: new Date().toISOString(),
              },
            ],
            runs: [
              ...current.runs,
              {
                id: `run-${moduleId.toLocaleLowerCase()}`,
                module: moduleId,
                periodStart: currentPeriod.start,
                periodEnd: currentPeriod.end,
                payDate: addDays(currentPeriod.end, 3),
                mode: current.calculationMode,
                status: "DRAFT",
                createdAt: isoDate(new Date()),
              },
            ],
          };
        }),
      updatePayrollModule: (moduleId, module) =>
        update((current) => {
          if (moduleId === "CONSOLIDATED") return current;
          const assignmentModuleId: Exclude<PayrollModule, "CONSOLIDATED"> =
            moduleId;
          const selectedPositions = new Set(module.positionIds);
          const concepts = module.concepts.includes("FINE")
            ? module.concepts
            : [...module.concepts, "FINE" as const];
          const salaryEnabled = concepts.includes("SALARY");
          const commissionEnabled = concepts.includes("COMMISSION");
          const employees = current.employees.map((employee) => {
            const position = current.positions.find(
              (item) => item.name === employee.position,
            );
            const selected = Boolean(
              position && selectedPositions.has(position.id),
            );
            const fallbackSalary =
              employee.monthlySalary <= 0
                ? null
                : employee.category === "SPECIALIST"
                  ? ("SPECIALIST" as const)
                  : employee.category === "CONTRACTOR"
                    ? ("CONTRACTOR" as const)
                    : ("FIXED" as const);
            const fallbackCommission = !employee.schemeId
              ? null
              : employee.category === "CONTRACTOR"
                ? ("CONTRACTOR" as const)
                : ("COMMISSION" as const);
            return {
              ...employee,
              salaryPayrollModuleId:
                selected && salaryEnabled && employee.monthlySalary > 0
                  ? assignmentModuleId
                  : employee.salaryPayrollModuleId === assignmentModuleId
                    ? fallbackSalary
                    : employee.salaryPayrollModuleId,
              commissionPayrollModuleId:
                selected && commissionEnabled && employee.schemeId
                  ? assignmentModuleId
                  : employee.commissionPayrollModuleId === assignmentModuleId
                    ? fallbackCommission
                    : employee.commissionPayrollModuleId,
            };
          });
          const salaryAdditions = employees.flatMap<DemoSalaryAssignment>(
            (employee, index) =>
              employee.salaryPayrollModuleId !==
              current.employees[index]?.salaryPayrollModuleId
                ? [
                    {
                      id: id("salary-assignment"),
                      employeeId: employee.id,
                      monthlySalary: employee.monthlySalary,
                      payrollModule: employee.salaryPayrollModuleId,
                      effectiveFrom: currentPeriod.start,
                      effectiveTo: null,
                      sourceSchemeId: null,
                      reason: "CAMBIO DESDE MÓDULO DE NÓMINA",
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : [],
          );
          const commissionAdditions =
            employees.flatMap<DemoCommissionAssignment>((employee, index) =>
              employee.commissionPayrollModuleId !==
              current.employees[index]?.commissionPayrollModuleId
                ? [
                    {
                      id: id("commission-assignment"),
                      employeeId: employee.id,
                      payrollModule: employee.commissionPayrollModuleId,
                      effectiveFrom: currentPeriod.start,
                      effectiveTo: null,
                      reason: "CAMBIO DESDE MÓDULO DE NÓMINA",
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : [],
            );
          return {
            ...current,
            payrollModules: current.payrollModules.map((item) =>
              item.id === moduleId
                ? {
                    ...item,
                    ...module,
                    concepts,
                    name: module.name.trim().toLocaleUpperCase("es-MX"),
                    description: module.description.trim(),
                  }
                : item,
            ),
            employees,
            salaryAssignments: mergeSalaryAssignments(
              current.salaryAssignments,
              salaryAdditions,
            ),
            commissionAssignments: mergeCommissionAssignments(
              current.commissionAssignments,
              commissionAdditions,
            ),
          };
        }),
      togglePayrollModule: (moduleId) =>
        update((current) => {
          const target = current.payrollModules.find(
            (module) => module.id === moduleId && module.custom,
          );
          if (!target) return current;

          const assignmentModuleId = moduleId as Exclude<
            PayrollModule,
            "CONSOLIDATED"
          >;
          const activating = !target.active;
          const effectiveFrom = addDays(currentPeriod.end, 1);
          const selectedPositions = new Set(target.positionIds);
          const salaryEnabled = target.concepts.includes("SALARY");
          const commissionEnabled = target.concepts.includes("COMMISSION");
          const employees = current.employees.map((employee) => {
            const position = current.positions.find(
              (item) => item.name === employee.position,
            );
            const selected = Boolean(
              position && selectedPositions.has(position.id),
            );
            const fallbackSalary =
              employee.monthlySalary <= 0
                ? null
                : employee.category === "SPECIALIST"
                  ? ("SPECIALIST" as const)
                  : employee.category === "CONTRACTOR"
                    ? ("CONTRACTOR" as const)
                    : ("FIXED" as const);
            const fallbackCommission = !employee.schemeId
              ? null
              : employee.category === "CONTRACTOR"
                ? ("CONTRACTOR" as const)
                : ("COMMISSION" as const);

            return {
              ...employee,
              salaryPayrollModuleId: activating
                ? selected && salaryEnabled && employee.monthlySalary > 0
                  ? assignmentModuleId
                  : employee.salaryPayrollModuleId
                : employee.salaryPayrollModuleId === assignmentModuleId
                  ? fallbackSalary
                  : employee.salaryPayrollModuleId,
              commissionPayrollModuleId: activating
                ? selected && commissionEnabled && employee.schemeId
                  ? assignmentModuleId
                  : employee.commissionPayrollModuleId
                : employee.commissionPayrollModuleId === assignmentModuleId
                  ? fallbackCommission
                  : employee.commissionPayrollModuleId,
            };
          });
          const salaryAdditions = employees.flatMap<DemoSalaryAssignment>(
            (employee, index) =>
              employee.salaryPayrollModuleId !==
              current.employees[index]?.salaryPayrollModuleId
                ? [
                    {
                      id: id("salary-assignment"),
                      employeeId: employee.id,
                      monthlySalary: employee.monthlySalary,
                      payrollModule: employee.salaryPayrollModuleId,
                      effectiveFrom,
                      effectiveTo: null,
                      sourceSchemeId: null,
                      reason: activating
                        ? "REACTIVACIÓN DE MÓDULO DE NÓMINA"
                        : "BAJA FUTURA DE MÓDULO DE NÓMINA",
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : [],
          );
          const commissionAdditions =
            employees.flatMap<DemoCommissionAssignment>((employee, index) =>
              employee.commissionPayrollModuleId !==
              current.employees[index]?.commissionPayrollModuleId
                ? [
                    {
                      id: id("commission-assignment"),
                      employeeId: employee.id,
                      payrollModule: employee.commissionPayrollModuleId,
                      effectiveFrom,
                      effectiveTo: null,
                      reason: activating
                        ? "REACTIVACIÓN DE MÓDULO DE NÓMINA"
                        : "BAJA FUTURA DE MÓDULO DE NÓMINA",
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : [],
            );

          return {
            ...current,
            payrollModules: current.payrollModules.map((module) =>
              module.id === moduleId
                ? {
                    ...module,
                    active: activating,
                    deactivatedAt: activating ? null : currentPeriod.end,
                  }
                : module,
            ),
            periodConfigs: current.periodConfigs.map((config) =>
              config.module === moduleId
                ? {
                    ...config,
                    active: activating,
                    updatedAt: new Date().toISOString(),
                  }
                : config,
            ),
            employees,
            salaryAssignments: mergeSalaryAssignments(
              current.salaryAssignments,
              salaryAdditions,
            ),
            commissionAssignments: mergeCommissionAssignments(
              current.commissionAssignments,
              commissionAdditions,
            ),
          };
        }),
      addEmployee: (employee) =>
        update((current) => {
          const employeeId = id("employee");
          return {
            ...current,
            employees: [
              ...current.employees,
              {
                ...employee,
                id: employeeId,
                name: employee.name.toLocaleUpperCase("es-MX"),
                position: employee.position.toLocaleUpperCase("es-MX"),
                bank: employee.bank.toLocaleUpperCase("es-MX"),
                costBranchIds: employee.costBranchIds.filter((branchId) =>
                  current.branches.some((branch) => branch.id === branchId),
                ),
              },
            ],
            salaryAssignments:
              employee.monthlySalary > 0
                ? [
                    ...current.salaryAssignments,
                    {
                      id: id("salary-assignment"),
                      employeeId,
                      monthlySalary: employee.monthlySalary,
                      payrollModule: employee.salaryPayrollModuleId,
                      effectiveFrom: employee.hireDate,
                      effectiveTo: null,
                      sourceSchemeId: null,
                      reason: "SUELDO INICIAL DEL EXPEDIENTE",
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : current.salaryAssignments,
            commissionAssignments: [
              ...current.commissionAssignments,
              {
                id: id("commission-assignment"),
                employeeId,
                payrollModule: employee.commissionPayrollModuleId,
                effectiveFrom: employee.hireDate,
                effectiveTo: null,
                reason: employee.commissionPayrollModuleId
                  ? "ALTA CON COMISIÓN"
                  : "ALTA SIN COMISIÓN",
                createdAt: new Date().toISOString(),
              },
            ],
          };
        }),
      updateEmployeeProfile: (employeeId, input) =>
        update((current) => {
          const previous = current.employees.find(
            (employee) => employee.id === employeeId,
          );
          if (!previous) return current;
          if (!canViewConfidentialPayroll(current)) {
            if (!employeeShowsSalaryInPayroll(previous) || (previous.roleId !== input.roleId && isConfidentialPayrollRole(input.roleId))) return current;
            input = { ...input, showSalaryInPayroll: employeeShowsSalaryInPayroll(previous), showCommissionInPayroll: employeeShowsCommissionInPayroll(previous) };
          }
          const normalizedName = input.name.toLocaleUpperCase("es-MX");
          const movedOutOfManagement =
            previous.category === "MANAGEMENT" &&
            input.category !== "MANAGEMENT";
          const renamedManager =
            previous.category === "MANAGEMENT" &&
            previous.name !== normalizedName;
          const effectiveFrom = isoDate(new Date());
          const salaryEffectiveFrom = currentPeriod.start;
          const salaryChanged =
            previous.monthlySalary !== input.monthlySalary ||
            previous.salaryPayrollModuleId !== input.salaryPayrollModuleId;
          const commissionChanged =
            previous.commissionPayrollModuleId !==
            input.commissionPayrollModuleId;
          const salaryAssignments = salaryChanged
            ? mergeSalaryAssignments(current.salaryAssignments, [
                {
                  id: id("salary-assignment"),
                  employeeId,
                  monthlySalary: input.monthlySalary,
                  payrollModule:
                    input.monthlySalary > 0
                      ? input.salaryPayrollModuleId
                      : null,
                  effectiveFrom: salaryEffectiveFrom,
                  effectiveTo: null,
                  sourceSchemeId: null,
                  reason: "CAMBIO MANUAL DE SUELDO",
                  createdAt: new Date().toISOString(),
                },
              ])
            : current.salaryAssignments;
          const commissionAssignments = commissionChanged
            ? mergeCommissionAssignments(current.commissionAssignments, [
                {
                  id: id("commission-assignment"),
                  employeeId,
                  payrollModule: input.commissionPayrollModuleId,
                  effectiveFrom: currentPeriod.start,
                  effectiveTo: null,
                  reason: input.commissionPayrollModuleId
                    ? "ACTIVACIÓN MANUAL DE COMISIONES"
                    : "BAJA MANUAL DE COMISIONES",
                  createdAt: new Date().toISOString(),
                },
              ])
            : current.commissionAssignments;
          return {
            ...current,
            salaryAssignments,
            commissionAssignments,
            employees: current.employees.map((employee) =>
              employee.id === employeeId
                ? {
                    ...employee,
                    ...input,
                    name: normalizedName,
                    position: input.position.toLocaleUpperCase("es-MX"),
                    bank: input.bank.toLocaleUpperCase("es-MX"),
                  }
                : employee,
            ),
            kioskTargets: movedOutOfManagement
              ? current.kioskTargets.map((target) =>
                  target.managerId === employeeId
                    ? {
                        ...target,
                        managerId: null,
                        updatedAt: new Date().toISOString(),
                      }
                    : target,
                )
              : current.kioskTargets,
            branchCommissionSchemes: current.branchCommissionSchemes.map(
              (scheme) => {
                if (
                  scheme.managerId !== employeeId ||
                  (!movedOutOfManagement && !renamedManager)
                )
                  return scheme;
                const managerId = movedOutOfManagement ? null : employeeId;
                const managerName = movedOutOfManagement
                  ? "SIN GERENTE"
                  : normalizedName;
                return {
                  ...scheme,
                  managerId,
                  managerHistory: [
                    ...scheme.managerHistory,
                    {
                      id: id("manager-history"),
                      managerId,
                      managerName,
                      effectiveFrom,
                      changedAt: new Date().toISOString(),
                    },
                  ],
                  updatedAt: new Date().toISOString(),
                };
              },
            ),
          };
        }),
      setEmployeePayrollVisibility: (employeeId, visibility) =>
        update((current) => !canViewConfidentialPayroll(current) ? current : ({
          ...current,
          employees: current.employees.map((employee) =>
            employee.id === employeeId
              ? { ...employee, ...visibility }
              : employee,
          ),
        })),
      updateEmployeeEmployment: (employeeId, hireDate, terminationDate) =>
        update((current) => ({
          ...current,
          employees: current.employees.map((employee) =>
            employee.id === employeeId
              ? {
                  ...employee,
                  hireDate,
                  terminationDate,
                  observedPayrollPeriods: null,
                  active: hireDate <= isoDate(new Date()) && !terminationDate,
                }
              : employee,
          ),
        })),
      addScheme: (
        name,
        tiers,
        effectiveFrom = currentPeriod.start,
        salaryPlan = null,
      ) =>
        update((current) => ({
          ...current,
          schemes: [
            ...current.schemes,
            {
              id: id("scheme"),
              name: name.toLocaleUpperCase("es-MX"),
              active: true,
              effectiveFrom,
              createdAt: isoDate(new Date()),
              deactivatedAt: null,
              version: 1,
              previousVersionId: null,
              salaryPlan,
              commissionMode: tiers.length === 1 ? "FIXED" : "SCALE",
              tiers: tiers.map((tier) => ({ ...tier, id: id("tier") })),
            },
          ],
        })),
      updateScheme: (
        schemeId,
        name,
        tiers,
        effectiveFrom = currentPeriod.start,
        salaryPlan = null,
      ) =>
        update((current) => {
          const previous = current.schemes.find(
            (scheme) => scheme.id === schemeId,
          );
          if (!previous) return current;

          const historicalSchemeId = id("scheme-history");
          const historicalScheme: DemoScheme = {
            ...previous,
            id: historicalSchemeId,
            active: false,
            deactivatedAt: addDays(effectiveFrom, -1),
          };
          const nextScheme: DemoScheme = {
            ...previous,
            name: name.toLocaleUpperCase("es-MX"),
            active: true,
            effectiveFrom,
            deactivatedAt: null,
            version: (previous.version ?? 1) + 1,
            previousVersionId: historicalSchemeId,
            salaryPlan,
            commissionMode: tiers.length === 1 ? "FIXED" : "SCALE",
            tiers: tiers.map((tier) => ({ ...tier, id: id("tier") })),
          };
          const versionedSchemes = [
            ...current.schemes.map((scheme) =>
              scheme.id === schemeId ? nextScheme : scheme,
            ),
            historicalScheme,
          ];
          const affectedEmployeeIds = current.employees
            .filter((employee) => {
              const assignment = current.schemeAssignments
                .filter(
                  (item) =>
                    item.employeeId === employee.id &&
                    item.effectiveFrom <= effectiveFrom,
                )
                .sort((left, right) =>
                  right.effectiveFrom.localeCompare(left.effectiveFrom),
                )[0];
              return (
                assignment?.schemeId === schemeId ||
                (!assignment && employee.schemeId === schemeId)
              );
            })
            .map((employee) => employee.id);
          const remappedAssignments = current.schemeAssignments.map(
            (assignment) =>
              assignment.schemeId === schemeId &&
              assignment.effectiveFrom < effectiveFrom
                ? { ...assignment, schemeId: historicalSchemeId }
                : assignment,
          );
          const generatedPaths = affectedEmployeeIds.map((employeeId) =>
            buildAutomatedSchemePath(
              versionedSchemes,
              employeeId,
              schemeId,
              effectiveFrom,
            ),
          );
          const assignmentMap = new Map<string, DemoSchemeAssignment>();
          [
            ...remappedAssignments,
            ...generatedPaths.flatMap((path) => path.schemeAssignments),
          ].forEach((assignment) =>
            assignmentMap.set(
              `${assignment.employeeId}:${assignment.effectiveFrom}`,
              assignment,
            ),
          );
          const salaryAdditions = generatedPaths.flatMap(
            (path) => path.salaryAssignments,
          );
          const salaryBase =
            salaryAdditions.length > 0
              ? current.salaryAssignments.filter(
                  (assignment) =>
                    !(
                      affectedEmployeeIds.includes(assignment.employeeId) &&
                      assignment.effectiveFrom >= effectiveFrom
                    ),
                )
              : current.salaryAssignments;
          return {
            ...current,
            schemes: versionedSchemes,
            schemeAssignments: Array.from(assignmentMap.values()),
            salaryAssignments: mergeSalaryAssignments(
              salaryBase,
              salaryAdditions,
            ),
          };
        }),
      deleteScheme: (schemeId) =>
        update((current) => ({
          ...current,
          schemes: current.schemes.map((scheme) =>
            scheme.id === schemeId
              ? {
                  ...scheme,
                  active: false,
                  deactivatedAt: currentPeriod.end,
                }
              : scheme,
          ),
        })),
      assignScheme: (
        employeeId,
        schemeId,
        effectiveFrom = currentPeriod.start,
      ) =>
        update((current) => {
          if (!schemeId) return current;
          const path = buildAutomatedSchemePath(
            current.schemes,
            employeeId,
            schemeId,
            effectiveFrom,
          );
          const firstSalary = path.salaryAssignments[0];
          const schemeAssignments = [
            ...current.schemeAssignments.filter(
              (assignment) =>
                assignment.employeeId !== employeeId ||
                assignment.effectiveFrom < effectiveFrom,
            ),
            ...path.schemeAssignments,
          ];
          const salaryBase =
            path.salaryAssignments.length > 0
              ? current.salaryAssignments.filter(
                  (assignment) =>
                    assignment.employeeId !== employeeId ||
                    assignment.effectiveFrom < effectiveFrom,
                )
              : current.salaryAssignments;
          return {
            ...current,
            employees: current.employees.map((employee) =>
              employee.id === employeeId
                ? {
                    ...employee,
                    schemeId,
                    commissionPayrollModuleId:
                      employee.commissionPayrollModuleId ?? "COMMISSION",
                    monthlySalary:
                      firstSalary && effectiveFrom <= currentPeriod.end
                        ? firstSalary.monthlySalary
                        : employee.monthlySalary,
                    salaryPayrollModuleId:
                      firstSalary && effectiveFrom <= currentPeriod.end
                        ? firstSalary.payrollModule
                        : employee.salaryPayrollModuleId,
                  }
                : employee,
            ),
            schemeAssignments,
            commissionAssignments:
              current.employees.find((employee) => employee.id === employeeId)
                ?.commissionPayrollModuleId == null
                ? mergeCommissionAssignments(current.commissionAssignments, [
                    {
                      id: id("commission-assignment"),
                      employeeId,
                      payrollModule: "COMMISSION",
                      effectiveFrom,
                      effectiveTo: null,
                      reason: "ACTIVACIÓN POR ASIGNACIÓN DE ESQUEMA",
                      createdAt: new Date().toISOString(),
                    },
                  ])
                : current.commissionAssignments,
            salaryAssignments: mergeSalaryAssignments(
              salaryBase,
              path.salaryAssignments,
            ),
          };
        }),
      updateSchemeAssignment: (assignmentId, schemeId, effectiveFrom) =>
        update((current) => ({
          ...current,
          schemeAssignments: current.schemeAssignments.map((assignment) =>
            assignment.id === assignmentId
              ? { ...assignment, schemeId, effectiveFrom }
              : assignment,
          ),
        })),
      addMovement: (movement) =>
        update((current) => {
          const run = current.runs.find(
            (item) =>
              item.module === movement.payrollModule &&
              item.periodStart === movement.periodStart,
          );
          if (run && run.status !== "DRAFT") return current;
          return {
            ...current,
            movements: [
              ...current.movements,
              {
                ...movement,
                id: id("movement"),
                createdAt: isoDate(new Date()),
              },
            ],
            decisions:
              movement.status === "APPROVED"
                ? invalidateAuthorizedDecisions(
                    current.decisions,
                    [movement.employeeId],
                    movement.periodStart,
                    "MOVIMIENTO AGREGADO · REQUIERE NUEVA CONFIRMACIÓN",
                  )
                : current.decisions,
          };
        }),
      updateMovement: (movementId, patch) =>
        update((current) => {
          const selected = current.movements.find(
            (movement) => movement.id === movementId,
          );
          const run = selected
            ? current.runs.find(
                (item) =>
                  item.module === selected.payrollModule &&
                  item.periodStart === selected.periodStart,
              )
            : undefined;
          if (!selected || (run && run.status !== "DRAFT")) return current;
          return {
            ...current,
            movements: current.movements.map((movement) =>
              movement.id === movementId
                ? { ...movement, ...patch, status: "DRAFT" }
                : movement,
            ),
            decisions:
              selected.status === "APPROVED"
                ? invalidateAuthorizedDecisions(
                    current.decisions,
                    [selected.employeeId],
                    selected.periodStart,
                    "MOVIMIENTO EDITADO · REQUIERE NUEVA CONFIRMACIÓN",
                  )
                : current.decisions,
          };
        }),
      deleteMovement: (movementId) =>
        update((current) => {
          const selected = current.movements.find(
            (movement) => movement.id === movementId,
          );
          const run = selected
            ? current.runs.find(
                (item) =>
                  item.module === selected.payrollModule &&
                  item.periodStart === selected.periodStart,
              )
            : undefined;
          if (!selected || (run && run.status !== "DRAFT")) return current;
          return {
            ...current,
            movements: current.movements.filter(
              (movement) => movement.id !== movementId,
            ),
            decisions:
              selected.status === "APPROVED"
                ? invalidateAuthorizedDecisions(
                    current.decisions,
                    [selected.employeeId],
                    selected.periodStart,
                    "MOVIMIENTO ELIMINADO · REQUIERE NUEVA CONFIRMACIÓN",
                  )
                : current.decisions,
          };
        }),
      setMovementStatus: (movementId, status) =>
        update((current) => {
          const selected = current.movements.find(
            (movement) => movement.id === movementId,
          );
          const run = selected
            ? current.runs.find(
                (item) =>
                  item.module === selected.payrollModule &&
                  item.periodStart === selected.periodStart,
              )
            : undefined;
          if (!selected || (run && run.status !== "DRAFT")) return current;
          const affectsPayroll =
            selected.status !== status &&
            (selected.status === "APPROVED" || status === "APPROVED");
          return {
            ...current,
            movements: current.movements.map((movement) =>
              movement.id === movementId ? { ...movement, status } : movement,
            ),
            decisions: affectsPayroll
              ? invalidateAuthorizedDecisions(
                  current.decisions,
                  [selected.employeeId],
                  selected.periodStart,
                  "MOVIMIENTO ACTUALIZADO · REQUIERE NUEVA CONFIRMACIÓN",
                )
              : current.decisions,
          };
        }),
      addBonusFineConcept: (concept) =>
        update((current) => ({
          ...current,
          bonusFineConcepts: [
            ...current.bonusFineConcepts,
            {
              ...concept,
              id: id("bonus-fine-concept"),
              name: concept.name.toLocaleUpperCase("es-MX"),
              createdAt: isoDate(new Date()),
            },
          ],
        })),
      updateBonusFineConcept: (conceptId, patch) =>
        update((current) => ({
          ...current,
          bonusFineConcepts: current.bonusFineConcepts.map((concept) =>
            concept.id === conceptId
              ? {
                  ...concept,
                  ...patch,
                  name: patch.name.toLocaleUpperCase("es-MX"),
                }
              : concept,
          ),
        })),
      setBonusFineConceptActive: (conceptId, active) =>
        update((current) => ({
          ...current,
          bonusFineConcepts: current.bonusFineConcepts.map((concept) =>
            concept.id === conceptId ? { ...concept, active } : concept,
          ),
        })),
      deleteBonusFineConcept: (conceptId) =>
        update((current) => {
          const concept = current.bonusFineConcepts.find(
            (item) => item.id === conceptId,
          );
          if (!concept) return current;

          const hasLinkedMovement = current.movements.some(
            (movement) => movement.catalogId === conceptId,
          );
          const hasLinkedAdjustment = current.adjustments.some(
            (adjustment) =>
              adjustment.type === concept.type &&
              adjustment.concept.trim().toLocaleUpperCase("es-MX") ===
                concept.name.trim().toLocaleUpperCase("es-MX"),
          );
          const hasClosedAutomaticAward = Boolean(
            concept.temporary &&
            concept.validUntil &&
            concept.validUntil <= isoDate(new Date()) &&
            temporaryBonusStandings(current, concept).some(
              (standing) => standing.achieved,
            ),
          );
          const hasHistory =
            hasLinkedMovement || hasLinkedAdjustment || hasClosedAutomaticAward;

          return {
            ...current,
            bonusFineConcepts: hasHistory
              ? current.bonusFineConcepts.map((item) =>
                  item.id === conceptId
                    ? {
                        ...item,
                        active: false,
                        deletedAt: isoDate(new Date()),
                      }
                    : item,
                )
              : current.bonusFineConcepts.filter(
                  (item) => item.id !== conceptId,
                ),
          };
        }),
      addPayrollAdjustment: (adjustment) =>
        update((current) => {
          const run = current.runs.find(
            (item) => item.id === adjustment.payrollRunId,
          );
          if (run && run.status !== "DRAFT") return current;
          return {
            ...current,
            adjustments: [
              ...current.adjustments,
              {
                ...adjustment,
                id: id("adjustment"),
                createdAt: isoDate(new Date()),
              },
            ],
            decisions:
              adjustment.status === "APPROVED"
                ? invalidateAuthorizedDecisions(
                    current.decisions,
                    adjustment.participantIds,
                    adjustment.periodStart,
                    "AJUSTE AGREGADO · REQUIERE NUEVA CONFIRMACIÓN",
                  )
                : current.decisions,
          };
        }),
      updatePayrollAdjustment: (adjustmentId, patch) =>
        update((current) => {
          const adjustment = current.adjustments.find(
            (item) => item.id === adjustmentId,
          );
          const run = adjustment
            ? current.runs.find((item) => item.id === adjustment.payrollRunId)
            : undefined;
          if (run && run.status !== "DRAFT") return current;
          return {
            ...current,
            adjustments: current.adjustments.map((item) =>
              item.id === adjustmentId
                ? {
                    ...item,
                    ...patch,
                    status: "DRAFT",
                  }
                : item,
            ),
            decisions:
              adjustment?.status === "APPROVED"
                ? invalidateAuthorizedDecisions(
                    current.decisions,
                    adjustment.participantIds,
                    adjustment.periodStart,
                    "AJUSTE EDITADO · REQUIERE NUEVA CONFIRMACIÓN",
                  )
                : current.decisions,
          };
        }),
      setPayrollAdjustmentStatus: (adjustmentId, status) =>
        update((current) => {
          const adjustment = current.adjustments.find(
            (item) => item.id === adjustmentId,
          );
          const run = adjustment
            ? current.runs.find((item) => item.id === adjustment.payrollRunId)
            : undefined;
          if (run && run.status !== "DRAFT") return current;
          if (!adjustment) return current;
          const affectsPayroll =
            adjustment.status !== status &&
            (adjustment.status === "APPROVED" || status === "APPROVED");
          return {
            ...current,
            adjustments: current.adjustments.map((item) =>
              item.id === adjustmentId ? { ...item, status } : item,
            ),
            decisions: affectsPayroll
              ? invalidateAuthorizedDecisions(
                  current.decisions,
                  adjustment.participantIds,
                  adjustment.periodStart,
                  "AJUSTE ACTUALIZADO · REQUIERE NUEVA CONFIRMACIÓN",
                )
              : current.decisions,
          };
        }),
      addLoan: (loan) =>
        update((current) => {
          const run = current.runs.find(
            (item) => item.id === loan.payrollRunId,
          );
          if (run && run.status !== "DRAFT") return current;
          const requester = loan.notes.startsWith("SOLICITUD DESDE MI PERFIL")
            ? (current.employees.find(
                (employee) => employee.id === loan.employeeId,
              )?.name ?? "PORTAL PERSONAL")
            : "ADMINISTRACIÓN";
          return {
            ...current,
            loans: [
              ...current.loans,
              {
                ...loan,
                id: id("loan"),
                requestedAmount: loan.amount,
                paidInstallments: 0,
                history: [
                  {
                    id: id("history"),
                    date: isoDate(new Date()),
                    action:
                      loan.requestType === "ADVANCE"
                        ? "ADELANTO SOLICITADO"
                        : "PRÉSTAMO SOLICITADO",
                    by: requester,
                  },
                ],
              },
            ],
            decisions:
              loan.status === "APPROVED"
                ? invalidateAuthorizedDecisions(
                    current.decisions,
                    [loan.employeeId],
                    loan.firstPeriod,
                    "PRÉSTAMO O ADELANTO ACTUALIZADO · REQUIERE NUEVA CONFIRMACIÓN",
                  )
                : current.decisions,
          };
        }),
      updateLoan: (loanId, patch) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          if (activeEmployee?.roleId !== "role-admin") return current;
          const selected = current.loans.find((loan) => loan.id === loanId);
          const run = selected
            ? current.runs.find((item) => item.id === selected.payrollRunId)
            : undefined;
          if (
            !selected ||
            selected.status !== "PENDING" ||
            (run && run.status !== "DRAFT")
          )
            return current;
          const amountChanged =
            Math.abs(selected.amount - patch.amount) > 0.005;
          return {
            ...current,
            loans: current.loans.map((loan) =>
              loan.id === loanId
                ? {
                    ...loan,
                    ...patch,
                    history: [
                      ...loan.history,
                      {
                        id: id("history"),
                        date: isoDate(new Date()),
                        action: amountChanged
                          ? `MONTO AJUSTADO DE ${selected.amount.toLocaleString("es-MX", { style: "currency", currency: "MXN" })} A ${patch.amount.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}`
                          : "SOLICITUD EDITADA",
                        by: activeEmployee.name,
                      },
                    ],
                  }
                : loan,
            ),
          };
        }),
      deleteLoan: (loanId) =>
        update((current) => {
          const selected = current.loans.find((loan) => loan.id === loanId);
          const run = selected
            ? current.runs.find((item) => item.id === selected.payrollRunId)
            : undefined;
          if (!selected || (run && run.status !== "DRAFT")) return current;
          return {
            ...current,
            loans: current.loans.filter((loan) => loan.id !== loanId),
            decisions:
              selected.status === "APPROVED"
                ? invalidateAuthorizedDecisions(
                    current.decisions,
                    [selected.employeeId],
                    selected.firstPeriod,
                    "PRÉSTAMO O ADELANTO ELIMINADO · REQUIERE NUEVA CONFIRMACIÓN",
                  )
                : current.decisions,
          };
        }),
      setLoanStatus: (loanId, status) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          if (activeEmployee?.roleId !== "role-admin") return current;
          const selected = current.loans.find((loan) => loan.id === loanId);
          const run = selected
            ? current.runs.find((item) => item.id === selected.payrollRunId)
            : undefined;
          if (!selected || (run && run.status !== "DRAFT")) return current;
          const affectsPayroll =
            selected.status !== status &&
            (selected.status === "APPROVED" || status === "APPROVED");
          return {
            ...current,
            loans: current.loans.map((loan) =>
              loan.id === loanId
                ? {
                    ...loan,
                    status,
                    history: [
                      ...loan.history,
                      {
                        id: id("history"),
                        date: isoDate(new Date()),
                        action:
                          status === "APPROVED"
                            ? `${loan.requestType === "ADVANCE" ? "ADELANTO" : "PRÉSTAMO"} AUTORIZADO`
                            : status === "REJECTED"
                              ? "SOLICITUD RECHAZADA"
                              : "SOLICITUD REABIERTA",
                        by: activeEmployee.name,
                      },
                    ],
                  }
                : loan,
            ),
            decisions: affectsPayroll
              ? invalidateAuthorizedDecisions(
                  current.decisions,
                  [selected.employeeId],
                  selected.firstPeriod,
                  "PRÉSTAMO O ADELANTO ACTUALIZADO · REQUIERE NUEVA CONFIRMACIÓN",
                )
              : current.decisions,
          };
        }),
      updateFinancialRequestPolicy: (policy) =>
        update((current) => ({
          ...current,
          financialRequestPolicy: policy,
        })),
      updateReceiptConfiguration: (configuration) =>
        update((current) => ({
          ...current,
          receiptConfiguration: {
            ...configuration,
            title: configuration.title.trim().toLocaleUpperCase("es-MX"),
            subtitle: configuration.subtitle.trim(),
          },
        })),
      setNotificationModuleApproval: (moduleId, approved) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          const activeRole = current.roles.find(
            (role) => role.id === activeEmployee?.roleId,
          );
          if (!roleHasPermission(activeRole, "notifications.manage")) {
            return current;
          }
          const updatedAt = new Date().toISOString();
          return {
            ...current,
            notificationTemplates: current.notificationTemplates.map(
              (template) =>
                template.moduleId === moduleId
                  ? {
                      ...template,
                      approved,
                      updatedAt,
                      updatedBy: activeEmployee?.name ?? "USUARIO MASTER",
                    }
                  : template,
            ),
          };
        }),
      updateNotificationTemplate: (templateId, input) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          const activeRole = current.roles.find(
            (role) => role.id === activeEmployee?.roleId,
          );
          if (!roleHasPermission(activeRole, "notifications.manage")) {
            return current;
          }
          const selected = current.notificationTemplates.find(
            (template) => template.id === templateId,
          );
          if (!selected) return current;
          const updatedAt = new Date().toISOString();
          return {
            ...current,
            notificationTemplates: current.notificationTemplates.map(
              (template) =>
                template.moduleId === selected.moduleId
                  ? {
                      ...template,
                      ...(template.id === templateId
                        ? {
                            title: input.title.trim(),
                            message: input.message.trim(),
                            updatedAt,
                            updatedBy: activeEmployee?.name ?? "USUARIO MASTER",
                          }
                        : {}),
                      approved: false,
                    }
                  : template,
            ),
          };
        }),
      createRun: (module, periodStart, periodEnd, mode, payDate) =>
        update((current) => {
          const existing = current.runs.find(
            (run) => run.module === module && run.periodStart === periodStart,
          );
          if (existing && existing.status !== "DRAFT") return current;
          if (existing)
            return {
              ...current,
              runs: current.runs.map((run) =>
                run.id === existing.id
                  ? { ...run, periodEnd, mode, payDate }
                  : run,
              ),
            };
          return {
            ...current,
            runs: [
              ...current.runs,
              {
                id: id("run"),
                module,
                periodStart,
                periodEnd,
                payDate,
                mode,
                status: "DRAFT",
                createdAt: isoDate(new Date()),
              },
            ],
          };
        }),
      setRunStatus: (runId, status) =>
        update((current) => ({
          ...current,
          runs: current.runs.map((run) =>
            run.id === runId ? { ...run, status } : run,
          ),
        })),
      closeCommissionRun: (runId) => {
        const commissionRun = state.runs.find((run) => run.id === runId);
        const closureBalances = commissionRun
          ? payrollLines(
              commissionRun.periodStart,
              commissionRun.mode,
              commissionRun.periodEnd,
              "COMMISSION",
            ).map((line) => ({
              employeeId: line.employee.id,
              amount: line.newNegativeBalance,
              carriedAmount: line.carriedNegativeBalance,
              breakdown: line.newNegativeBalanceBreakdown,
            }))
          : [];
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          const activeRole = current.roles.find(
            (role) => role.id === activeEmployee?.roleId,
          );
          const selectedRun = current.runs.find((run) => run.id === runId);
          if (
            !activeEmployee ||
            !selectedRun ||
            selectedRun.module !== "COMMISSION" ||
            selectedRun.status !== "DRAFT" ||
            !roleHasPermission(activeRole, "payroll.approve")
          )
            return current;
          const negativeBalances = reconcileNegativeBalancesForClosure(
            current.negativeBalances,
            "COMMISSION",
            selectedRun.periodStart,
            closureBalances,
          );
          return {
            ...current,
            negativeBalances,
            runs: current.runs.map((run) =>
              run.id === runId
                ? {
                    ...run,
                    status: "APPROVED" as const,
                    closureReason: "MANUAL" as const,
                    closedAt: new Date().toISOString(),
                    closedByEmployeeId: activeEmployee.id,
                  }
                : run,
            ),
            loans: current.loans.map(loan => applyLoanAtClose(loan, "COMMISSION", selectedRun.periodStart, selectedRun.periodEnd, activeEmployee.name)),
          };
        });
      },
      reopenCommissionRun: (runId, masterCode, reason) =>
        update((current) => {
          const authorizingMaster = current.employees.find(
            (employee) =>
              employee.active &&
              employee.roleId === "role-admin" &&
              employee.secondaryAccessKey === masterCode,
          );
          if (!authorizingMaster) return current;
          const selectedRun = current.runs.find((run) => run.id === runId);
          if (
            !selectedRun ||
            selectedRun.module !== "COMMISSION" ||
            selectedRun.status === "DRAFT"
          )
            return current;
          return {
            ...current,
            runs: current.runs.map((run) =>
              run.id === runId
                ? {
                    ...run,
                    status: "DRAFT" as const,
                    reopenedAt: new Date().toISOString(),
                    reopenedByEmployeeId: authorizingMaster.id,
                    reopenReason: reason.trim(),
                    revision: (run.revision ?? 0) + 1,
                  }
                : run,
            ),
          };
        }),
      resetCommissionApprovals: (periodStart, employeeIds, reason) =>
        update((current) => {
          const selectedIds = new Set(employeeIds);
          const run = current.runs.find(
            (item) =>
              item.module === "COMMISSION" && item.periodStart === periodStart,
          );
          if (!run || run.status !== "DRAFT" || selectedIds.size === 0)
            return current;
          return {
            ...current,
            decisions: current.decisions.map((decision) =>
              decision.periodStart === periodStart &&
              selectedIds.has(decision.employeeId) &&
              decision.status === "AUTHORIZED"
                ? {
                    ...decision,
                    status: "PENDING" as const,
                    note: reason.trim(),
                    updatedAt: new Date().toISOString(),
                  }
                : decision,
            ),
          };
        }),
      reopenEmployeeReceipt: (employeeId, periodStart, masterCode, reason) =>
        update((current) => {
          const authorizingMaster = current.employees.find(
            (employee) =>
              employee.active &&
              employee.roleId === "role-admin" &&
              employee.secondaryAccessKey === masterCode,
          );
          const authorizedDecision = current.decisions.find(
            (decision) =>
              decision.employeeId === employeeId &&
              decision.periodStart === periodStart &&
              decision.status === "AUTHORIZED",
          );
          if (!authorizingMaster || !authorizedDecision) return current;
          const reopenedAt = new Date().toISOString();
          const reopenReason =
            reason.trim() || "RECIBO REABIERTO PARA CORRECCIÓN";
          return {
            ...current,
            decisions: current.decisions.map((decision) =>
              decision.employeeId === employeeId &&
              decision.periodStart === periodStart
                ? {
                    ...decision,
                    status: "PENDING" as const,
                    note: reopenReason,
                    updatedAt: reopenedAt,
                  }
                : decision,
            ),
            runs: current.runs.map((run) =>
              (run.module === "COMMISSION" || run.module === "CONSOLIDATED") &&
              run.periodStart <= periodStart &&
              run.periodEnd >= periodStart
                ? {
                    ...run,
                    status: "DRAFT" as const,
                    reopenedAt,
                    reopenedByEmployeeId: authorizingMaster.id,
                    reopenReason,
                    revision: (run.revision ?? 0) + 1,
                  }
                : run,
            ),
            disbursementPayments: current.disbursementPayments.filter(
              (payment) =>
                !(
                  payment.employeeId === employeeId &&
                  (payment.payrollModule === "COMMISSION" ||
                    payment.payrollModule === "CONSOLIDATED") &&
                  payment.periodStart <= periodStart &&
                  payment.periodEnd >= periodStart
                ),
            ),
          };
        }),
      markDisbursementPaymentPaid: (
        payrollModule,
        periodStart,
        periodEnd,
        employeeId,
      ) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          const activeRole = current.roles.find(
            (role) => role.id === activeEmployee?.roleId,
          );
          if (
            !activeEmployee ||
            !roleHasPermission(activeRole, "payroll.approve") ||
            current.disbursementPayments.some(
              (payment) =>
                payment.payrollModule === payrollModule &&
                payment.periodStart === periodStart &&
                payment.periodEnd === periodEnd &&
                payment.employeeId === employeeId,
            )
          )
            return current;
          return {
            ...current,
            disbursementPayments: [
              ...current.disbursementPayments,
              {
                id: id("disbursement-payment"),
                payrollModule,
                periodStart,
                periodEnd,
                employeeId,
                paidAt: new Date().toISOString(),
                paidByEmployeeId: activeEmployee.id,
              },
            ],
          };
        }),
      closeRunAndOpenNextPeriod: (runId, nextPeriod, balances) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          const activeRole = current.roles.find(
            (role) => role.id === activeEmployee?.roleId,
          );
          const run = current.runs.find((item) => item.id === runId);
          if (
            !run ||
            run.status !== "DRAFT" ||
            run.module === "CONSOLIDATED" ||
            !roleHasPermission(activeRole, "payroll.approve")
          )
            return current;
          const payrollModule = run.module as Exclude<
            PayrollModule,
            "CONSOLIDATED"
          >;
          const negativeBalances = reconcileNegativeBalancesForClosure(
            current.negativeBalances,
            payrollModule,
            run.periodStart,
            balances,
          );
          const nextRun = current.runs.find(
            (item) =>
              item.module === run.module &&
              item.periodStart === nextPeriod.start &&
              item.periodEnd === nextPeriod.end,
          );
          const runs = current.runs.map((item) =>
            item.id === runId ? { ...item, status: "APPROVED" as const } : item,
          );
          if (!nextRun)
            runs.push({
              id: id("run"),
              module: run.module,
              periodStart: nextPeriod.start,
              periodEnd: nextPeriod.end,
              payDate: nextPeriod.payDate,
              mode: run.mode,
              status: "DRAFT",
              createdAt: isoDate(new Date()),
            });
          return {
            ...current,
            runs,
            negativeBalances,
            loans: current.loans.map(loan => applyLoanAtClose(loan, run.module, run.periodStart, run.periodEnd, activeEmployee?.name ?? "Operador")),
            periodConfigs: current.periodConfigs.map((config) =>
              config.module === run.module
                ? {
                    ...config,
                    periodStart: nextPeriod.start,
                    periodEnd: nextPeriod.end,
                    cutoffDate: nextPeriod.end,
                    label: nextPeriod.label,
                    updatedAt: new Date().toISOString(),
                  }
                : config,
            ),
          };
        }),
      setCalculationMode: (mode) =>
        update((current) => {
          if (current.calculationMode === mode) return current;
          const affectedPeriods = new Set(
            current.runs
              .filter((run) => {
                const activeConfig = current.periodConfigs.find(
                  (config) => config.module === run.module,
                );
                return (
                  run.status === "DRAFT" &&
                  Boolean(activeConfig) &&
                  run.periodStart === activeConfig?.periodStart &&
                  run.periodEnd === activeConfig?.periodEnd
                );
              })
              .map((run) => run.periodStart),
          );
          const updatedAt = new Date().toISOString();
          return {
            ...current,
            calculationMode: mode,
            runs: current.runs.map((run) => {
              const activeConfig = current.periodConfigs.find(
                (config) => config.module === run.module,
              );
              return run.status === "DRAFT" &&
                activeConfig &&
                run.periodStart === activeConfig.periodStart &&
                run.periodEnd === activeConfig.periodEnd
                ? { ...run, mode }
                : run;
            }),
            decisions: current.decisions.map((decision) =>
              affectedPeriods.has(decision.periodStart) &&
              decision.status === "AUTHORIZED"
                ? {
                    ...decision,
                    status: "PENDING" as const,
                    note: "BASE GLOBAL DE IVA ACTUALIZADA · REQUIERE NUEVA CONFIRMACIÓN",
                    updatedAt,
                  }
                : decision,
            ),
          };
        }),
      setCommissionModeOverride: (employeeId, periodStart, mode) =>
        update((current) => {
          const run = current.runs.find(
            (item) =>
              item.module === "COMMISSION" && item.periodStart === periodStart,
          );
          if (run && run.status !== "DRAFT") return current;
          const commissionModeOverrides = {
            ...current.commissionModeOverrides,
          };
          const overrideKey = `${periodStart}:${employeeId}`;
          if (mode) commissionModeOverrides[overrideKey] = mode;
          else delete commissionModeOverrides[overrideKey];
          return {
            ...current,
            commissionModeOverrides,
            decisions: current.decisions.map((decision) =>
              decision.employeeId === employeeId &&
              decision.periodStart === periodStart &&
              decision.status === "AUTHORIZED"
                ? {
                    ...decision,
                    status: "PENDING" as const,
                    note: "BASE DE VENTA CORREGIDA · REQUIERE NUEVA CONFIRMACIÓN",
                    updatedAt: new Date().toISOString(),
                  }
                : decision,
            ),
          };
        }),
      setPayrollCostAllocationModes: (periodStart, modes) =>
        update((current) => {
          const locked = current.runs.some(
            (run) =>
              run.module === "COMMISSION" &&
              run.periodStart === periodStart &&
              run.status !== "DRAFT",
          );
          if (locked) return current;
          return {
            ...current,
            payrollCostAllocationModes: Object.entries(modes).reduce(
              (next, [employeeId, allocationMode]) => ({
                ...next,
                [`${periodStart}:${employeeId}`]: allocationMode,
              }),
              { ...current.payrollCostAllocationModes },
            ),
          };
        }),
      updateKioskTarget: (branchId, monthlyTarget, commissionRate, managerId) =>
        update((current) => ({
          ...current,
          kioskTargets: current.kioskTargets.map((target) =>
            target.branchId === branchId
              ? {
                  ...target,
                  monthlyTarget,
                  commissionRate,
                  managerId,
                  updatedAt: new Date().toISOString(),
                }
              : target,
          ),
          kioskMonthlySales: current.kioskMonthlySales.map((sale) =>
            sale.branchId === branchId ? { ...sale, managerId } : sale,
          ),
        })),
      addBranchCommissionScheme: (scheme) =>
        update((current) => ({
          ...current,
          branchCommissionSchemes: [
            ...current.branchCommissionSchemes,
            {
              ...scheme,
              id: id("branch-scheme"),
              name: scheme.name.toLocaleUpperCase("es-MX"),
              branchIds:
                scheme.scope === "ALL_COMBINED"
                  ? current.branches
                      .filter((branch) => branch.active)
                      .map((branch) => branch.id)
                  : scheme.branchIds,
              tiers: scheme.tiers.map((tier) => ({
                ...tier,
                id: id("branch-tier"),
              })),
              createdAt: isoDate(new Date()),
              updatedAt: new Date().toISOString(),
              managerHistory: [
                {
                  id: id("manager-history"),
                  managerId: scheme.managerId,
                  managerName:
                    current.employees.find(
                      (employee) => employee.id === scheme.managerId,
                    )?.name ?? "SIN GERENTE",
                  effectiveFrom: scheme.effectiveFrom,
                  changedAt: new Date().toISOString(),
                },
              ],
            },
          ],
        })),
      updateBranchCommissionScheme: (schemeId, scheme) =>
        update((current) => ({
          ...current,
          branchCommissionSchemes: current.branchCommissionSchemes.map(
            (currentScheme) => {
              if (currentScheme.id !== schemeId) return currentScheme;
              const managerChanged =
                currentScheme.managerId !== scheme.managerId;
              const managerHistory = managerChanged
                ? [
                    ...currentScheme.managerHistory,
                    {
                      id: id("manager-history"),
                      managerId: scheme.managerId,
                      managerName:
                        current.employees.find(
                          (employee) => employee.id === scheme.managerId,
                        )?.name ?? "SIN GERENTE",
                      effectiveFrom: scheme.effectiveFrom,
                      changedAt: new Date().toISOString(),
                    },
                  ]
                : currentScheme.managerHistory;
              return {
                ...currentScheme,
                ...scheme,
                name: scheme.name.toLocaleUpperCase("es-MX"),
                branchIds:
                  scheme.scope === "ALL_COMBINED"
                    ? current.branches
                        .filter((branch) => branch.active)
                        .map((branch) => branch.id)
                    : scheme.branchIds,
                tiers: scheme.tiers.map((tier) => ({
                  ...tier,
                  id: id("branch-tier"),
                })),
                managerHistory,
                updatedAt: new Date().toISOString(),
              };
            },
          ),
        })),
      deleteBranchCommissionScheme: (schemeId) =>
        update((current) => ({
          ...current,
          branchCommissionSchemes: current.branchCommissionSchemes.filter(
            (scheme) => scheme.id !== schemeId,
          ),
        })),
      updatePeriodConfig: (module, input) =>
        update((current) => ({
          ...current,
          periodConfigs: current.periodConfigs.map((config) =>
            config.module === module
              ? {
                  ...config,
                  ...input,
                  updatedAt: new Date().toISOString(),
                }
              : config,
          ),
        })),
      updateEmployeeCosts: (employeeId, socialCostRate, isrCostRate) =>
        update((current) => ({
          ...current,
          employees: current.employees.map((employee) =>
            employee.id === employeeId
              ? {
                  ...employee,
                  socialCostRate,
                  isrCostRate,
                }
              : employee,
          ),
        })),
      setPayrollTaxAssignments: (module, assignments) =>
        update((current) => ({
          ...current,
          taxAssignments: [
            ...current.taxAssignments.filter(
              (assignment) => assignment.payrollModule !== module,
            ),
            ...assignments.map((assignment) => ({
              ...assignment,
              payrollModule: module,
            })),
          ],
        })),
      setPeriodTaxInclusion: (periodStart, periodEnd, patch) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          if (activeEmployee?.roleId !== "role-admin") return current;
          const existing = periodTaxInclusionForRange(
            current.periodTaxInclusions,
            periodStart,
            periodEnd,
          );
          const nextInclusion: DemoPeriodTaxInclusion = {
            payrollModule: null,
            periodStart,
            periodEnd,
            includeSocialCost: existing?.includeSocialCost ?? true,
            includeIsr: existing?.includeIsr ?? true,
            includeWorkerTax: existing?.includeWorkerTax ?? false,
            workerTaxRate: existing?.workerTaxRate ?? 0.03,
            ...patch,
            updatedAt: new Date().toISOString(),
            updatedByEmployeeId: activeEmployee.id,
          };
          return {
            ...current,
            periodTaxInclusions: [
              ...current.periodTaxInclusions.filter(
                (inclusion) =>
                  Boolean(inclusion.payrollModule) ||
                  inclusion.periodStart !== periodStart ||
                  inclusion.periodEnd !== periodEnd,
              ),
              nextInclusion,
            ],
          };
        }),
      setModuleTaxInclusion: (module, periodStart, periodEnd, patch) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          if (activeEmployee?.roleId !== "role-admin") return current;
          const existing = moduleTaxInclusionForRange(
            current.periodTaxInclusions,
            periodStart,
            periodEnd,
            module,
          );
          const nextInclusion: DemoPeriodTaxInclusion = {
            payrollModule: module,
            periodStart,
            periodEnd,
            includeSocialCost: existing?.includeSocialCost ?? false,
            includeIsr: existing?.includeIsr ?? false,
            includeWorkerTax: existing?.includeWorkerTax ?? false,
            workerTaxRate: existing?.workerTaxRate ?? 0.03,
            ...patch,
            updatedAt: new Date().toISOString(),
            updatedByEmployeeId: activeEmployee.id,
          };
          return {
            ...current,
            periodTaxInclusions: [
              ...current.periodTaxInclusions.filter(
                (inclusion) =>
                  inclusion.payrollModule !== module ||
                  inclusion.periodStart !== periodStart ||
                  inclusion.periodEnd !== periodEnd,
              ),
              nextInclusion,
            ],
          };
        }),
      addDoublePayDay: (entry) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          const activeRole = current.roles.find(
            (role) => role.id === activeEmployee?.roleId,
          );
          const employee = current.employees.find(
            (item) => item.id === entry.employeeId,
          );
          const salaryAssignment = current.salaryAssignments
            .filter(
              (item) =>
                item.employeeId === entry.employeeId &&
                item.effectiveFrom <= entry.date &&
                (!item.effectiveTo || item.effectiveTo >= entry.date),
            )
            .sort((left, right) =>
              right.effectiveFrom.localeCompare(left.effectiveFrom),
            )[0];
          const salaryAmount = salaryAssignment
            ? salaryAssignment.monthlySalary
            : (employee?.monthlySalary ?? 0);
          const salaryModule = salaryAssignment
            ? salaryAssignment.payrollModule
            : employee
              ? employeeSalaryPayrollModule(employee)
              : null;
          if (
            !activeEmployee ||
            !roleHasPermission(activeRole, "payroll.create") ||
            !employee ||
            salaryAmount <= 0 ||
            salaryModule !== entry.payrollModule ||
            entry.date < employee.hireDate ||
            (employee.terminationDate &&
              entry.date > employee.terminationDate) ||
            current.doublePayDays.some(
              (item) =>
                item.employeeId === entry.employeeId &&
                item.payrollModule === entry.payrollModule &&
                item.date === entry.date,
            )
          )
            return current;
          return {
            ...current,
            doublePayDays: [
              ...current.doublePayDays,
              {
                ...entry,
                id: id("double-pay-day"),
                reason:
                  entry.reason.trim().toLocaleUpperCase("es-MX") ||
                  "DÍA FESTIVO / FERIADO",
                multiplier: 2,
                createdAt: new Date().toISOString(),
                createdByEmployeeId: activeEmployee.id,
              },
            ],
          };
        }),
      deleteDoublePayDay: (entryId) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          const activeRole = current.roles.find(
            (role) => role.id === activeEmployee?.roleId,
          );
          if (!roleHasPermission(activeRole, "payroll.create")) return current;
          return {
            ...current,
            doublePayDays: current.doublePayDays.filter(
              (entry) => entry.id !== entryId,
            ),
          };
        }),
      upsertTerminationSettlement: (settlement) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          if (activeEmployee?.roleId !== "role-admin") return current;
          const existing = current.terminationSettlements.find(
            (item) => item.id === settlement.id,
          );
          const protectedSettlement =
            existing && existing.status !== "DRAFT"
              ? { ...settlement, kind: existing.kind }
              : settlement;
          return {
            ...current,
            terminationSettlements: existing
              ? current.terminationSettlements.map((item) =>
                  item.id === settlement.id
                    ? {
                        ...protectedSettlement,
                        updatedAt: new Date().toISOString(),
                      }
                    : item,
                )
              : [
                  ...current.terminationSettlements,
                  {
                    ...protectedSettlement,
                    updatedAt: new Date().toISOString(),
                  },
                ],
          };
        }),
      approveTerminationSettlement: (settlement) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          const activeRole = current.roles.find(
            (role) => role.id === activeEmployee?.roleId,
          );
          if (!roleHasPermission(activeRole, "payroll.approve")) return current;
          const existing = current.terminationSettlements.find(
            (item) => item.id === settlement.id,
          );
          if (existing && existing.status !== "DRAFT") return current;
          const approvedSettlement = {
            ...settlement,
            status: "APPROVED" as const,
            updatedAt: new Date().toISOString(),
          };
          return {
            ...current,
            terminationSettlements: existing
              ? current.terminationSettlements.map((item) =>
                  item.id === settlement.id ? approvedSettlement : item,
                )
              : [...current.terminationSettlements, approvedSettlement],
          };
        }),
      archiveTerminationSettlement: (settlement) =>
        update((current) => {
          const activeEmployee = current.employees.find(
            (employee) => employee.id === current.activeEmployeeId,
          );
          if (activeEmployee?.roleId !== "role-admin") return current;
          return {
            ...current,
            terminationSettlements: current.terminationSettlements.some(
              (item) => item.id === settlement.id,
            )
              ? current.terminationSettlements.map((item) =>
                  item.id === settlement.id
                    ? {
                        ...item,
                        archivedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      }
                    : item,
                )
              : [
                  ...current.terminationSettlements,
                  {
                    ...settlement,
                    archivedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
          };
        }),
      upsertChristmasBonus: (bonus) =>
        update((current) => {
          const existing = current.christmasBonuses.find(
            (item) => item.id === bonus.id,
          );
          let nextBonus = {
            ...bonus,
            updatedAt: new Date().toISOString(),
          };
          if (existing?.paidPeriodIds.length) {
            const paidPeriodIds = Array.from(
              new Set([...existing.paidPeriodIds, ...bonus.paidPeriodIds]),
            );
            if (paidPeriodIds.length === existing.paidPeriodIds.length) {
              return current;
            }
            nextBonus = {
              ...existing,
              paidPeriodIds,
              paymentDate: bonus.paymentDate,
              status: bonus.status,
              updatedAt: new Date().toISOString(),
            };
          }
          return {
            ...current,
            christmasBonuses: existing
              ? current.christmasBonuses.map((item) =>
                  item.id === bonus.id ? nextBonus : item,
                )
              : [...current.christmasBonuses, nextBonus],
          };
        }),
      replaceChristmasBonusPaymentPeriods: (year, periods) =>
        update((current) => ({
          ...current,
          christmasBonusPaymentPeriods: [
            ...current.christmasBonusPaymentPeriods.filter(
              (period) => period.year !== year,
            ),
            ...periods.map((period) => ({
              ...period,
              year,
              percentage: Math.min(Math.max(period.percentage, 0), 1),
            })),
          ],
        })),
      setEmployeeViatics: (employeeId, enabled, conceptIds) =>
        update((current) => ({
          ...current,
          employees: current.employees.map((employee) =>
            employee.id === employeeId
              ? {
                  ...employee,
                  viaticsEnabled: enabled,
                  allowedViaticsConceptIds: enabled ? conceptIds : [],
                }
              : employee,
          ),
        })),
      addViaticsConcept: (concept) =>
        update((current) => ({
          ...current,
          viaticsConcepts: [
            ...current.viaticsConcepts,
            { ...concept, id: id("viatics-concept") },
          ],
        })),
      updateViaticsConcept: (conceptId, patch) =>
        update((current) => ({
          ...current,
          viaticsConcepts: current.viaticsConcepts.map((concept) =>
            concept.id === conceptId ? { ...concept, ...patch } : concept,
          ),
        })),
      deleteViaticsConcept: (conceptId) =>
        update((current) => ({
          ...current,
          viaticsConcepts: current.viaticsConcepts.filter(
            (concept) => concept.id !== conceptId,
          ),
          employees: current.employees.map((employee) => ({
            ...employee,
            allowedViaticsConceptIds: (
              employee.allowedViaticsConceptIds ?? []
            ).filter((idValue) => idValue !== conceptId),
          })),
        })),
      addViaticsEntry: (entry) =>
        update((current) => ({
          ...current,
          viaticsEntries: [
            ...current.viaticsEntries,
            {
              ...entry,
              id: id("viatics"),
              status: "PENDING",
              payrollRunId: null,
              payrollModule: null,
              periodStart: null,
              createdAt: isoDate(new Date()),
            },
          ],
        })),
      updateViaticsEntry: (entryId, patch) =>
        update((current) => {
          const selected = current.viaticsEntries.find(
            (entry) => entry.id === entryId,
          );
          const run = selected?.payrollRunId
            ? current.runs.find((item) => item.id === selected.payrollRunId)
            : undefined;
          if (run && run.status !== "DRAFT") return current;
          return {
            ...current,
            viaticsEntries: current.viaticsEntries.map((entry) =>
              entry.id === entryId
                ? {
                    ...entry,
                    ...patch,
                    status: "PENDING",
                    payrollRunId: null,
                    payrollModule: null,
                    periodStart: null,
                  }
                : entry,
            ),
            decisions:
              selected?.status === "APPROVED"
                ? invalidateAuthorizedDecisions(
                    current.decisions,
                    [selected.employeeId],
                    selected.periodStart,
                    "VIÁTICO ACTUALIZADO · REQUIERE NUEVA CONFIRMACIÓN",
                  )
                : current.decisions,
          };
        }),
      deleteViaticsEntry: (entryId) =>
        update((current) => {
          const selected = current.viaticsEntries.find(
            (entry) => entry.id === entryId,
          );
          const run = selected?.payrollRunId
            ? current.runs.find((item) => item.id === selected.payrollRunId)
            : undefined;
          if (!selected || (run && run.status !== "DRAFT")) return current;
          return {
            ...current,
            viaticsEntries: current.viaticsEntries.filter(
              (entry) => entry.id !== entryId,
            ),
            decisions:
              selected.status === "APPROVED"
                ? invalidateAuthorizedDecisions(
                    current.decisions,
                    [selected.employeeId],
                    selected.periodStart,
                    "VIÁTICO ELIMINADO · REQUIERE NUEVA CONFIRMACIÓN",
                  )
                : current.decisions,
          };
        }),
      setViaticsEntryStatus: (entryId, status, payrollRunId) =>
        update((current) => {
          const run = payrollRunId
            ? current.runs.find((item) => item.id === payrollRunId)
            : undefined;
          const selected = current.viaticsEntries.find(
            (entry) => entry.id === entryId,
          );
          const currentRun = selected?.payrollRunId
            ? current.runs.find((item) => item.id === selected.payrollRunId)
            : undefined;
          if (
            !selected ||
            (run && run.status !== "DRAFT") ||
            (currentRun && currentRun.status !== "DRAFT")
          )
            return current;
          const affectsPayroll =
            selected.status !== status &&
            (selected.status === "APPROVED" || status === "APPROVED");
          const affectedPeriod =
            status === "APPROVED"
              ? (run?.periodStart ?? selected.periodStart)
              : selected.periodStart;
          return {
            ...current,
            viaticsEntries: current.viaticsEntries.map((entry) =>
              entry.id === entryId
                ? {
                    ...entry,
                    status,
                    payrollRunId:
                      status === "APPROVED"
                        ? (run?.id ?? entry.payrollRunId)
                        : null,
                    payrollModule:
                      status === "APPROVED" && run?.module !== "CONSOLIDATED"
                        ? (run?.module ?? entry.payrollModule)
                        : null,
                    periodStart:
                      status === "APPROVED"
                        ? (run?.periodStart ?? entry.periodStart)
                        : null,
                  }
                : entry,
            ),
            decisions: affectsPayroll
              ? invalidateAuthorizedDecisions(
                  current.decisions,
                  [selected.employeeId],
                  affectedPeriod,
                  "VIÁTICO ACTUALIZADO · REQUIERE NUEVA CONFIRMACIÓN",
                )
              : current.decisions,
          };
        }),
      addRole: (name) =>
        update((current) => ({
          ...current,
          roles: [
            ...current.roles,
            {
              id: id("role"),
              name: name.toLocaleUpperCase("es-MX"),
              permissions: ["receipts.view"],
            },
          ],
        })),
      togglePermission: (roleId, permission) =>
        update((current) => ({
          ...current,
          roles: current.roles.map((role) => {
            if (role.id !== roleId) return role;
            if (role.id === "role-admin") {
              const customModulePermissions = current.payrollModules
                .filter((module) => module.custom && module.active)
                .flatMap((module) =>
                  modulePermissionBundle(
                    customPayrollModulePermission(module.id),
                  ),
                );
              return {
                ...role,
                permissions: Array.from(
                  new Set([
                    ...role.permissions,
                    ...permissionCatalog,
                    ...modulePermissionCatalog.flatMap(
                      ({ permission: modulePermission }) =>
                        modulePermissionBundle(modulePermission),
                    ),
                    ...customModulePermissions,
                  ]),
                ),
              };
            }

            const actionMarker = ".action.";
            const actionIndex = permission.indexOf(actionMarker);
            const isActionPermission = actionIndex >= 0;
            const basePermission = isActionPermission
              ? permission.slice(0, actionIndex)
              : permission;
            const currentlyEnabled = role.permissions.includes(permission);

            if (!isActionPermission && currentlyEnabled) {
              return {
                ...role,
                permissions: role.permissions.filter(
                  (item) =>
                    item !== basePermission &&
                    !item.startsWith(`${basePermission}${actionMarker}`),
                ),
              };
            }

            if (currentlyEnabled) {
              return {
                ...role,
                permissions: role.permissions.filter(
                  (item) => item !== permission,
                ),
              };
            }

            return {
              ...role,
              permissions: Array.from(
                new Set([
                  ...role.permissions,
                  ...(isActionPermission ? [basePermission] : []),
                  permission,
                ]),
              ),
            };
          }),
        })),
      setPermissions: (roleId, permissions, enabled) =>
        update((current) => ({
          ...current,
          roles: current.roles.map((role) => {
            if (role.id !== roleId) return role;
            const customModulePermissions = current.payrollModules
              .filter((module) => module.custom && module.active)
              .flatMap((module) =>
                modulePermissionBundle(
                  customPayrollModulePermission(module.id),
                ),
              );
            if (role.id === "role-admin") {
              return {
                ...role,
                permissions: Array.from(
                  new Set([
                    ...role.permissions,
                    ...permissionCatalog,
                    ...modulePermissionCatalog.flatMap(
                      ({ permission: modulePermission }) =>
                        modulePermissionBundle(modulePermission),
                    ),
                    ...customModulePermissions,
                  ]),
                ),
              };
            }

            const actionMarker = ".action.";
            const permissionSet = new Set(role.permissions);
            if (enabled) {
              permissions.forEach((permission) => {
                const actionIndex = permission.indexOf(actionMarker);
                if (actionIndex >= 0) {
                  permissionSet.add(permission.slice(0, actionIndex));
                }
                permissionSet.add(permission);
              });
            } else {
              permissions.forEach((permission) => {
                permissionSet.delete(permission);
                if (!permission.includes(actionMarker)) {
                  Array.from(permissionSet).forEach((assignedPermission) => {
                    if (
                      assignedPermission.startsWith(
                        `${permission}${actionMarker}`,
                      )
                    ) {
                      permissionSet.delete(assignedPermission);
                    }
                  });
                }
              });
            }

            return { ...role, permissions: Array.from(permissionSet) };
          }),
        })),
      assignRole: (employeeId, roleId) =>
        update((current) => !canViewConfidentialPayroll(current) && isConfidentialPayrollRole(roleId) ? current : ({
          ...current,
          employees: current.employees.map((employee) =>
            employee.id === employeeId ? { ...employee, roleId } : employee,
          ),
        })),
      setEmployeeCostBranches: (employeeId, branchIds) =>
        update((current) => {
          const validBranchIds = Array.from(new Set(branchIds)).filter(
            (branchId) =>
              current.branches.some((branch) => branch.id === branchId),
          );
          if (validBranchIds.length === 0) return current;
          return {
            ...current,
            employees: current.employees.map((employee) =>
              employee.id === employeeId
                ? { ...employee, costBranchIds: validBranchIds }
                : employee,
            ),
          };
        }),
      setEmployeeSecondaryAccessKey: (employeeId, key, updatedBy) =>
        update((current) => ({
          ...current,
          employees: current.employees.map((employee) =>
            employee.id === employeeId
              ? {
                  ...employee,
                  secondaryAccessKey: key,
                  secondaryAccessKeyUpdatedAt: new Date().toISOString(),
                  secondaryAccessKeyUpdatedBy: updatedBy,
                }
              : employee,
          ),
        })),
      updateEmployeeCredentials: (employeeId, password, accessCode) =>
        update((current) => ({
          ...current,
          employees: current.employees.map((employee) =>
            employee.id === employeeId
              ? {
                  ...employee,
                  accessPassword: password,
                  mustChangeCredentials: false,
                  credentialsUpdatedAt: new Date().toISOString(),
                  secondaryAccessKey: accessCode,
                  secondaryAccessKeyUpdatedAt: new Date().toISOString(),
                  secondaryAccessKeyUpdatedBy: employee.name,
                }
              : employee,
          ),
        })),
      setDecision: (employeeId, periodStart, status, note) => {
        const commissionRunForClosure = state.runs.find(
          (run) =>
            run.module === "COMMISSION" && run.periodStart === periodStart,
        );
        const closureBalances = commissionRunForClosure
          ? payrollLines(
              commissionRunForClosure.periodStart,
              commissionRunForClosure.mode,
              commissionRunForClosure.periodEnd,
              "COMMISSION",
            ).map((line) => ({
              employeeId: line.employee.id,
              amount: line.newNegativeBalance,
              carriedAmount: line.carriedNegativeBalance,
              breakdown: line.newNegativeBalanceBreakdown,
            }))
          : [];
        update((current) => {
          const decisions = [
            ...current.decisions.filter(
              (decision) =>
                !(
                  decision.employeeId === employeeId &&
                  decision.periodStart === periodStart
                ),
            ),
            {
              employeeId,
              periodStart,
              status,
              note,
              updatedAt: new Date().toISOString(),
            },
          ];
          const commissionRun = current.runs.find(
            (run) =>
              run.module === "COMMISSION" && run.periodStart === periodStart,
          );
          const eligibleSellerIds = current.employees
            .filter(
              (employee) =>
                employee.category === "SELLER" &&
                employeeAppliesToPeriod(
                  employee,
                  periodStart,
                  commissionRun?.periodEnd ?? periodStart,
                ) &&
                employeeCommissionPayrollModule(employee) === "COMMISSION",
            )
            .map((employee) => employee.id);
          const authorizedIds = new Set(
            decisions
              .filter(
                (decision) =>
                  decision.periodStart === periodStart &&
                  decision.status === "AUTHORIZED",
              )
              .map((decision) => decision.employeeId),
          );
          const allReceiptsAuthorized =
            eligibleSellerIds.length > 0 &&
            eligibleSellerIds.every((sellerId) => authorizedIds.has(sellerId));
          const closesCommissionRun = Boolean(
            commissionRun?.status === "DRAFT" && allReceiptsAuthorized,
          );
          const negativeBalances = closesCommissionRun
            ? reconcileNegativeBalancesForClosure(
                current.negativeBalances,
                "COMMISSION",
                periodStart,
                closureBalances,
              )
            : current.negativeBalances;
          const closingEmployee = current.employees.find(
            (employee) => employee.id === employeeId,
          );
          return {
            ...current,
            decisions,
            negativeBalances,
            runs: current.runs.map((run) =>
              run.id === commissionRun?.id && closesCommissionRun
                ? {
                    ...run,
                    status: "APPROVED" as const,
                    closureReason: "ALL_RECEIPTS_AUTHORIZED" as const,
                    closedAt: new Date().toISOString(),
                    closedByEmployeeId: employeeId,
                  }
                : run,
            ),
            loans: closesCommissionRun
              ? current.loans.map(loan => applyLoanAtClose(loan, "COMMISSION", periodStart, commissionRun!.periodEnd, closingEmployee?.name ?? "Operador"))
              : current.loans,
          };
        });
      },
      setKioskReceiptDecision: (managerId, month, status, note) =>
        update((current) => ({
          ...current,
          kioskReceiptDecisions: [
            ...current.kioskReceiptDecisions.filter(
              (decision) =>
                !(decision.managerId === managerId && decision.month === month),
            ),
            {
              managerId,
              month,
              status,
              note,
              updatedAt: new Date().toISOString(),
            },
          ],
        })),
      resetDemo: () => {
        setState({
          ...original,
          lastUpdatedAt: new Date().toISOString(),
        });
      },
      payrollLines: visiblePayrollLines,
    }),
    [
      currentPeriod,
      original,
      onLogout,
      setState,
      isAuthenticated,
      listSortMode,
      privilegedPayroll,
      visiblePayrollLines,
      visibleState,
      switchProfile,
      payrollLines,
      periodOptions,
      state,
      update,
    ],
  );

  return (
    <DemoPayrollContext.Provider value={value}>
      {children}
    </DemoPayrollContext.Provider>
  );
}

export function usePayrollDemo() {
  const value = useContext(DemoPayrollContext);
  if (!value)
    throw new Error(
      "usePayrollDemo debe usarse dentro de PayrollDemoProvider.",
    );
  return value;
}
