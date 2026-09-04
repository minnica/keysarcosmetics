"use client";

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
  | "CONTRACTOR";
export type PayrollPeriodFrequency = "WEEKLY" | "BIWEEKLY" | "SPECIAL";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PayrollStatus = "DRAFT" | "APPROVED" | "PAID";
export type MovementType = "BONUS" | "FINE";
export type MovementMode = "FIXED" | "SCALE";
export type MovementStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type PayrollAdjustmentType = "PLUS" | "MINUS" | "FINE" | "BONUS" | "LOAN" | "LOAN_PAYMENT" | "BASE_SALARY";
export type PayrollAdjustmentStatus = "DRAFT" | "PENDING" | "APPROVED" | "CANCELLED";
export type PayrollReportTarget = "PAYROLL" | "CONSOLIDATED" | "BRANCH_COST" | "RECEIPT" | "PERSONAL_PORTAL";
export type ViaticsEffect = "ADD" | "DEDUCT";
export type ViaticsStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PayrollCostAllocationMode = "EQUAL" | "SALES_SHARE";

export interface DemoBranch {
  id: string;
  name: string;
  city: string;
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
  firstName?: string;
  paternalSurname?: string;
  maternalSurname?: string;
  position: string;
  category: EmployeeCategory;
  branchId: string;
  costBranchIds: string[];
  monthlySalary: number;
  schemeId: string | null;
  bank: string;
  account: string;
  clabe?: string;
  roleId: string;
  active: boolean;
  hireDate: string;
  terminationDate: string | null;
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

export interface CommissionTier {
  id: string;
  from: number;
  to: number | null;
  rate: number;
}

export type BranchCommissionScope = "SINGLE_BRANCH" | "SELECTED_BRANCHES" | "ALL_COMBINED";

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
  effectiveFrom?: string;
  createdAt?: string;
  tiers: CommissionTier[];
}

export interface DemoSchemeAssignment {
  id: string;
  employeeId: string;
  schemeId: string;
  effectiveFrom: string;
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
  employeeId: string;
  type: MovementType;
  mode: MovementMode;
  concept: string;
  amount: number;
  threshold: number | null;
  periodStart: string;
  status: MovementStatus;
  createdAt: string;
}

export interface DemoPayrollAdjustment {
  id: string;
  type: PayrollAdjustmentType;
  employeeId: string;
  participantIds: string[];
  branchId: string;
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
  amount: number;
  installments: number;
  paidInstallments: number;
  firstPeriod: string;
  status: ApprovalStatus;
  notes: string;
  history: DemoLoanHistory[];
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

export interface DemoEmployeeDecision {
  employeeId: string;
  periodStart: string;
  status: "PENDING" | "AUTHORIZED" | "CLARIFICATION";
  note: string;
  updatedAt: string;
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

export interface DemoState {
  branches: DemoBranch[];
  kioskTargets: DemoKioskTarget[];
  kioskMonthlySales: DemoKioskMonthlySale[];
  branchCommissionSchemes: DemoBranchCommissionScheme[];
  employees: DemoEmployee[];
  schemes: DemoScheme[];
  schemeAssignments: DemoSchemeAssignment[];
  sales: DemoSale[];
  movements: DemoMovement[];
  adjustments: DemoPayrollAdjustment[];
  loans: DemoLoan[];
  roles: DemoRole[];
  runs: DemoPayrollRun[];
  periodConfigs: DemoPayrollPeriodConfig[];
  decisions: DemoEmployeeDecision[];
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
  sales: number;
  rate: number;
  commission: number;
  fixedSalary: number;
  bonuses: number;
  fines: number;
  loanDeduction: number;
  externalAdditions: number;
  externalDeductions: number;
  viaticsAdditions: number;
  viaticsDeductions: number;
  baseSalaryOverride: number | null;
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
  "security.second_key.manage",
] as const;

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function periodForDate(date: Date): PeriodOption {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstHalf = date.getDate() <= 15;
  const start = new Date(year, month, firstHalf ? 1 : 16);
  const end = new Date(year, month, firstHalf ? 15 : new Date(year, month + 1, 0).getDate());
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
    options.push(periodForDate(new Date(month.getFullYear(), month.getMonth(), 16)));
    options.push(periodForDate(new Date(month.getFullYear(), month.getMonth(), 1)));
  }
  return options;
}

export const payrollModuleLabels: Record<PayrollModule, string> = {
  CONSOLIDATED: "CONSOLIDADO",
  FIXED: "SALARIO FIJO",
  SPECIALIST: "ESPECIALISTAS",
  COMMISSION: "VENDEDORES",
  CONTRACTOR: "HONORARIOS",
};

export function payrollModuleForCategory(category: EmployeeCategory): PayrollModule {
  if (category === "SPECIALIST") return "SPECIALIST";
  if (category === "SELLER") return "COMMISSION";
  if (category === "CONTRACTOR") return "CONTRACTOR";
  return "FIXED";
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

function createInitialState(): DemoState {
  const period = periodForDate(new Date());
  const branches: DemoBranch[] = [
    { id: "branch-polanco", name: "POLANCO", city: "CIUDAD DE MÉXICO" },
    { id: "branch-satelite", name: "SATÉLITE", city: "ESTADO DE MÉXICO" },
    { id: "branch-interlomas", name: "INTERLOMAS", city: "ESTADO DE MÉXICO" },
  ];
  const employees: DemoEmployee[] = [
    { id: "emp-ana", name: "ANA SOFÍA MARTÍNEZ", firstName: "ANA SOFÍA", paternalSurname: "MARTÍNEZ", maternalSurname: "CASTILLO", position: "VENDEDORA SENIOR", category: "SELLER", branchId: "branch-polanco", costBranchIds: ["branch-polanco"], monthlySalary: 0, schemeId: "scheme-elite", bank: "BBVA", account: "•••• 2841", clabe: "000000000000002841", roleId: "role-employee", active: true, hireDate: "2025-01-06", terminationDate: null, socialCostRate: 0.18, isrCostRate: 0.1, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0, viaticsEnabled: true, allowedViaticsConceptIds: ["viatic-food", "viatic-transport", "viatic-fuel"] },
    { id: "emp-daniela", name: "DANIELA RUIZ", firstName: "DANIELA", paternalSurname: "RUIZ", maternalSurname: "MORALES", position: "VENDEDORA", category: "SELLER", branchId: "branch-satelite", costBranchIds: ["branch-satelite"], monthlySalary: 0, schemeId: "scheme-growth", bank: "SANTANDER", account: "•••• 9130", clabe: "000000000000009130", roleId: "role-employee", active: true, hireDate: "2025-03-17", terminationDate: null, socialCostRate: 0.18, isrCostRate: 0.1, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0, viaticsEnabled: true, allowedViaticsConceptIds: ["viatic-food", "viatic-transport"] },
    { id: "emp-carla", name: "CARLA MENDOZA", firstName: "CARLA", paternalSurname: "MENDOZA", maternalSurname: "ROJAS", position: "FACIALISTA", category: "SPECIALIST", branchId: "branch-polanco", costBranchIds: ["branch-polanco"], monthlySalary: 18000, schemeId: null, bank: "BANORTE", account: "•••• 4472", clabe: "000000000000004472", roleId: "role-employee", active: true, hireDate: "2024-11-04", terminationDate: null, socialCostRate: 0.22, isrCostRate: 0.12, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-valeria", name: "VALERIA ORTIZ", firstName: "VALERIA", paternalSurname: "ORTIZ", maternalSurname: "NAVARRO", position: "ESPECIALISTA CORPORAL", category: "SPECIALIST", branchId: "branch-interlomas", costBranchIds: ["branch-interlomas"], monthlySalary: 19500, schemeId: null, bank: "BBVA", account: "•••• 5068", clabe: "000000000000005068", roleId: "role-employee", active: true, hireDate: "2025-02-01", terminationDate: null, socialCostRate: 0.22, isrCostRate: 0.12, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-monica", name: "MÓNICA SERRANO", firstName: "MÓNICA", paternalSurname: "SERRANO", maternalSurname: "DÍAZ", position: "GERENTE DE SUCURSAL", category: "MANAGEMENT", branchId: "branch-polanco", costBranchIds: ["branch-polanco", "branch-satelite", "branch-interlomas"], monthlySalary: 28000, schemeId: null, bank: "HSBC", account: "•••• 1085", clabe: "000000000000001085", roleId: "role-admin", active: true, hireDate: "2024-08-19", terminationDate: null, socialCostRate: 0.25, isrCostRate: 0.16, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0, secondaryAccessKey: "2580", secondaryAccessKeyUpdatedAt: "2026-09-03T09:00:00.000Z", secondaryAccessKeyUpdatedBy: "MÓNICA SERRANO" },
    { id: "emp-ricardo", name: "RICARDO LUNA", firstName: "RICARDO", paternalSurname: "LUNA", maternalSurname: "CASTRO", position: "GERENTE REGIONAL · VENDEDOR", category: "MANAGEMENT", branchId: "branch-satelite", costBranchIds: ["branch-satelite", "branch-interlomas"], monthlySalary: 36000, schemeId: "scheme-growth", bank: "BBVA", account: "•••• 7760", clabe: "000000000000007760", roleId: "role-manager", active: true, hireDate: "2024-06-03", terminationDate: null, socialCostRate: 0.25, isrCostRate: 0.18, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-paola", name: "PAOLA VEGA", firstName: "PAOLA", paternalSurname: "VEGA", maternalSurname: "SOLÍS", position: "CALL CENTER", category: "CALL_CENTER", branchId: "branch-satelite", costBranchIds: ["branch-satelite"], monthlySalary: 14500, schemeId: null, bank: "BANAMEX", account: "•••• 6219", clabe: "000000000000006219", roleId: "role-employee", active: true, hireDate: "2025-07-01", terminationDate: null, socialCostRate: 0.2, isrCostRate: 0.1, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-jorge", name: "JORGE SALAS", firstName: "JORGE", paternalSurname: "SALAS", maternalSurname: "MÉNDEZ", position: "CALL CENTER", category: "CALL_CENTER", branchId: "branch-interlomas", costBranchIds: ["branch-interlomas"], monthlySalary: 15000, schemeId: null, bank: "BANORTE", account: "•••• 3304", clabe: "000000000000003304", roleId: "role-employee", active: true, hireDate: "2025-09-16", terminationDate: null, socialCostRate: 0.2, isrCostRate: 0.1, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-lucia", name: "LUCÍA FERNÁNDEZ", firstName: "LUCÍA", paternalSurname: "FERNÁNDEZ", maternalSurname: "CORTÉS", position: "VENDEDORA POR HONORARIOS", category: "CONTRACTOR", branchId: "branch-polanco", costBranchIds: ["branch-polanco"], monthlySalary: 0, schemeId: "scheme-growth", bank: "BBVA", account: "•••• 8892", clabe: "000000000000008892", roleId: "role-employee", active: true, hireDate: "2025-04-16", terminationDate: null, socialCostRate: 0, isrCostRate: 0, ivaRate: 0.16, isrRetentionRate: 0.1, ivaRetentionRate: 0.106667 },
  ];
  const saleSeeds = [
    ["emp-ana", "branch-polanco", 48500],
    ["emp-ana", "branch-satelite", 19200],
    ["emp-daniela", "branch-satelite", 37600],
    ["emp-daniela", "branch-interlomas", 12800],
    ["emp-carla", "branch-polanco", 9400],
    ["emp-valeria", "branch-interlomas", 11200],
    ["emp-lucia", "branch-polanco", 43200],
    ["emp-ricardo", "branch-satelite", 58600],
  ] as const;
  const currentSales: DemoSale[] = saleSeeds.flatMap(([employeeId, branchId, total], index) =>
    [0.42, 0.33, 0.25].map((share, dayIndex) => ({
      id: `sale-${index}-${dayIndex}`,
      employeeId,
      branchId,
      date: addDays(period.start, Math.min(dayIndex * 3 + index, 13)),
      amount: Math.round(total * share),
    })),
  );
  const historicalFactors = [0.78, 0.86, 0.92, 0.81, 1.04, 0.96, 1.11, 0.89, 1.07, 1.16, 0.98];
  const historicalSales: DemoSale[] = Array.from({ length: 11 }, (_, offset) => {
    const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() - offset - 1, 1);
    const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const factor = historicalFactors[offset] ?? 1;
    return saleSeeds.flatMap(([employeeId, branchId, total], index) =>
      [0.54, 0.46].map((share, halfIndex) => ({
        id: `sale-history-${month}-${index}-${halfIndex}`,
        employeeId,
        branchId,
        date: `${month}-${halfIndex === 0 ? String(5 + (index % 8)).padStart(2, "0") : String(18 + (index % 9)).padStart(2, "0")}`,
        amount: Math.round(total * factor * share),
      })),
    );
  }).flat();
  const sales = [...currentSales, ...historicalSales];

  const kioskTargets: DemoKioskTarget[] = [
    { branchId: "branch-polanco", managerId: "emp-monica", monthlyTarget: 350000, commissionRate: 0.012, updatedAt: isoDate(new Date()) },
    { branchId: "branch-satelite", managerId: "emp-ricardo", monthlyTarget: 280000, commissionRate: 0.01, updatedAt: isoDate(new Date()) },
    { branchId: "branch-interlomas", managerId: null, monthlyTarget: 220000, commissionRate: 0.009, updatedAt: isoDate(new Date()) },
  ];
  const kioskFactors = [0.84, 0.93, 1.02, 1.08, 0.97, 1.15, 1.21, 0.89, 1.04, 1.12, 0.99, 1.18];
  const kioskMonthlySales: DemoKioskMonthlySale[] = kioskTargets.flatMap((target, branchIndex) =>
    Array.from({ length: 12 }, (_, offset) => {
      const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() - (11 - offset), 1);
      const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const factor = kioskFactors[(offset + branchIndex * 3) % kioskFactors.length] ?? 1;
      const salesTotal = Math.round(target.monthlyTarget * factor / 100) * 100;
      return {
        id: `kiosk-sale-${target.branchId}-${month}`,
        branchId: target.branchId,
        managerId: target.managerId,
        month,
        sales: salesTotal,
        transactions: Math.max(1, Math.round(salesTotal / (1450 + branchIndex * 120))),
      };
    }),
  );

  return {
    branches,
    kioskTargets,
    kioskMonthlySales,
    branchCommissionSchemes: [
      {
        id: "branch-scheme-network",
        name: "RED COMBINADA GERENCIAL",
        scope: "ALL_COMBINED",
        branchIds: branches.map((branch) => branch.id),
        managerId: "emp-ricardo",
        effectiveFrom: "2026-01-01",
        active: true,
        tiers: [
          { id: "branch-tier-network-1", from: 0, to: 799999.99, rate: 0.006 },
          { id: "branch-tier-network-2", from: 800000, to: 999999.99, rate: 0.009 },
          { id: "branch-tier-network-3", from: 1000000, to: null, rate: 0.012 },
        ],
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        managerHistory: [
          { id: "manager-history-network-1", managerId: "emp-monica", managerName: "MÓNICA SERRANO", effectiveFrom: "2026-01-01", changedAt: "2026-01-01" },
          { id: "manager-history-network-2", managerId: null, managerName: "SIN GERENTE", effectiveFrom: "2026-05-01", changedAt: "2026-05-01" },
          { id: "manager-history-network-3", managerId: "emp-ricardo", managerName: "RICARDO LUNA", effectiveFrom: "2026-06-01", changedAt: "2026-06-01" },
        ],
      },
    ],
    employees,
    schemes: [
      {
        id: "scheme-growth",
        name: "ESCALA CRECIMIENTO",
        active: true,
        effectiveFrom: "2025-01-01",
        createdAt: "2025-01-01",
        tiers: [
          { id: "tier-g1", from: 0, to: 29999.99, rate: 0.04 },
          { id: "tier-g2", from: 30000, to: 49999.99, rate: 0.06 },
          { id: "tier-g3", from: 50000, to: null, rate: 0.08 },
        ],
      },
      {
        id: "scheme-elite",
        name: "ESCALA ÉLITE",
        active: true,
        effectiveFrom: "2025-01-01",
        createdAt: "2025-01-01",
        tiers: [
          { id: "tier-e1", from: 0, to: 39999.99, rate: 0.05 },
          { id: "tier-e2", from: 40000, to: 64999.99, rate: 0.08 },
          { id: "tier-e3", from: 65000, to: null, rate: 0.1 },
        ],
      },
      {
        id: "scheme-basic-salary",
        name: "BÁSICO CON SUELDO",
        active: true,
        effectiveFrom: "2026-01-01",
        createdAt: "2026-01-01",
        tiers: [
          { id: "tier-bs1", from: 0, to: 39999.99, rate: 0.08 },
          { id: "tier-bs2", from: 40000, to: 79999.99, rate: 0.1 },
          { id: "tier-bs3", from: 80000, to: null, rate: 0.12 },
        ],
      },
      {
        id: "scheme-flat-20",
        name: "FLAT 20%",
        active: true,
        effectiveFrom: "2026-08-01",
        createdAt: "2026-07-25",
        tiers: [
          { id: "tier-f201", from: 0, to: 39999.99, rate: 0.2 },
          { id: "tier-f202", from: 40000, to: 59999.99, rate: 0.22 },
          { id: "tier-f203", from: 60000, to: null, rate: 0.24 },
        ],
      },
    ],
    schemeAssignments: [
      { id: "assignment-ana-initial", employeeId: "emp-ana", schemeId: "scheme-elite", effectiveFrom: "2025-01-01", createdAt: period.start },
      { id: "assignment-daniela-initial", employeeId: "emp-daniela", schemeId: "scheme-growth", effectiveFrom: "2025-01-01", createdAt: period.start },
      { id: "assignment-lucia-initial", employeeId: "emp-lucia", schemeId: "scheme-growth", effectiveFrom: "2025-01-01", createdAt: period.start },
      { id: "assignment-ricardo-dual", employeeId: "emp-ricardo", schemeId: "scheme-growth", effectiveFrom: "2026-01-01", createdAt: period.start },
    ],
    sales,
    movements: [
      { id: "move-1", employeeId: "emp-ana", type: "BONUS", mode: "SCALE", concept: "BONO META $60,000", amount: 1800, threshold: 60000, periodStart: period.start, status: "APPROVED", createdAt: period.start },
      { id: "move-2", employeeId: "emp-daniela", type: "BONUS", mode: "FIXED", concept: "BONO DE PUNTUALIDAD", amount: 750, threshold: null, periodStart: period.start, status: "PENDING", createdAt: isoDate(new Date()) },
      { id: "move-3", employeeId: "emp-carla", type: "FINE", mode: "FIXED", concept: "DESCUENTO POR INCIDENCIA", amount: 350, threshold: null, periodStart: period.start, status: "APPROVED", createdAt: addDays(period.start, 2) },
    ],
    adjustments: [
      { id: "adjustment-1", type: "PLUS", employeeId: "emp-ana", participantIds: ["emp-ana"], branchId: "branch-polanco", payrollModule: "COMMISSION", payrollRunId: "run-commission", payrollDate: addDays(period.start, 4), periodStart: period.start, reportTargets: ["PAYROLL", "CONSOLIDATED", "BRANCH_COST", "RECEIPT", "PERSONAL_PORTAL"], concept: "DIFERENCIA ACLARADA", amount: 500, comments: "AJUSTE POR DIFERENCIA DE CAJA ACLARADA", status: "APPROVED", createdAt: addDays(period.start, 4) },
      { id: "adjustment-2", type: "FINE", employeeId: "emp-daniela", participantIds: ["emp-daniela", "emp-ana"], branchId: "branch-satelite", payrollModule: "COMMISSION", payrollRunId: "run-commission", payrollDate: addDays(period.start, 6), periodStart: period.start, reportTargets: ["PAYROLL", "CONSOLIDATED", "BRANCH_COST", "RECEIPT"], concept: "INCIDENCIA OPERATIVA", amount: 600, comments: "MULTA COMPARTIDA POR INCIDENCIA OPERATIVA", status: "PENDING", createdAt: addDays(period.start, 6) },
      { id: "adjustment-3", type: "BASE_SALARY", employeeId: "emp-paola", participantIds: ["emp-paola"], branchId: "branch-satelite", payrollModule: "FIXED", payrollRunId: "run-fixed", payrollDate: period.start, periodStart: period.start, reportTargets: ["PAYROLL", "CONSOLIDATED", "BRANCH_COST", "RECEIPT", "PERSONAL_PORTAL"], concept: "SUELDO DEL PERIODO", amount: 7250, comments: "SUELDO BASE DEL PERIODO", status: "APPROVED", createdAt: period.start },
    ],
    loans: [
      {
        id: "loan-1",
        employeeId: "emp-daniela",
        payrollModule: "COMMISSION",
        payrollRunId: "run-commission",
        requestedAt: addDays(period.start, -6),
        amount: 6000,
        installments: 6,
        paidInstallments: 2,
        firstPeriod: addDays(period.start, -31),
        status: "APPROVED",
        notes: "APOYO PERSONAL",
        history: [
          { id: "lh-1", date: addDays(period.start, -6), action: "SOLICITUD CREADA", by: "DANIELA RUIZ" },
          { id: "lh-2", date: addDays(period.start, -5), action: "PRÉSTAMO AUTORIZADO", by: "MÓNICA SERRANO" },
          { id: "lh-3", date: addDays(period.start, -1), action: "CUOTA 2 APLICADA", by: "SISTEMA MOCK" },
        ],
      },
      {
        id: "loan-2",
        employeeId: "emp-paola",
        payrollModule: "FIXED",
        payrollRunId: "run-fixed",
        requestedAt: addDays(period.start, 3),
        amount: 4500,
        installments: 3,
        paidInstallments: 0,
        firstPeriod: period.start,
        status: "PENDING",
        notes: "ADELANTO DE NÓMINA",
        history: [{ id: "lh-4", date: addDays(period.start, 3), action: "SOLICITUD CREADA", by: "PAOLA VEGA" }],
      },
    ],
    roles: [
      { id: "role-admin", name: "USUARIO MASTER", permissions: [...permissionCatalog] },
      { id: "role-manager", name: "GERENCIA", permissions: ["dashboard.view", "payroll.approve", "loans.approve", "reports.view", "receipts.view", "portal.view"] },
      { id: "role-employee", name: "EMPLEADO", permissions: ["receipts.view", "portal.view"] },
    ],
    runs: (["CONSOLIDATED", "FIXED", "SPECIALIST", "COMMISSION", "CONTRACTOR"] as PayrollModule[]).map((module) => ({
      id: `run-${module.toLocaleLowerCase()}`,
      module,
      periodStart: period.start,
      periodEnd: period.end,
      payDate: addDays(period.end, 3),
      mode: "WITH_VAT" as const,
      status: "DRAFT" as const,
      createdAt: period.start,
    })),
    periodConfigs: (["CONSOLIDATED", "FIXED", "SPECIALIST", "COMMISSION", "CONTRACTOR"] as PayrollModule[]).map((module) => ({
      id: `period-${module.toLocaleLowerCase()}`,
      module,
      frequency: module === "CONTRACTOR" ? "SPECIAL" : "BIWEEKLY",
      periodStart: period.start,
      periodEnd: period.end,
      cutoffDate: period.end,
      active: true,
      label: module === "CONTRACTOR" ? `Nómina especial · ${period.start} — ${period.end}` : period.label,
      updatedAt: new Date().toISOString(),
    })),
    viaticsConcepts: [
      { id: "viatic-food", name: "ALIMENTOS", effect: "ADD", maxAmount: 700, active: true },
      { id: "viatic-transport", name: "TRANSPORTE LOCAL", effect: "ADD", maxAmount: 900, active: true },
      { id: "viatic-fuel", name: "COMBUSTIBLE", effect: "ADD", maxAmount: 1500, active: true },
      { id: "viatic-return", name: "REINTEGRO NO COMPROBADO", effect: "DEDUCT", maxAmount: 1500, active: true },
    ],
    viaticsEntries: [
      { id: "viatic-entry-1", employeeId: "emp-ana", conceptId: "viatic-fuel", branchId: "branch-satelite", requestedAt: period.start, amount: 860, comments: "TRASLADO PARA APOYO EN SUCURSAL", receiptName: "ticket-combustible.pdf", status: "APPROVED", payrollRunId: "run-commission", payrollModule: "COMMISSION", periodStart: period.start, createdAt: period.start },
      { id: "viatic-entry-2", employeeId: "emp-daniela", conceptId: "viatic-food", branchId: "branch-polanco", requestedAt: isoDate(new Date()), amount: 420, comments: "ALIMENTOS POR CAPACITACIÓN", receiptName: "comprobante-alimentos.jpg", status: "PENDING", payrollRunId: null, payrollModule: null, periodStart: null, createdAt: isoDate(new Date()) },
    ],
    decisions: [],
    kioskReceiptDecisions: [],
    calculationMode: "WITH_VAT",
    commissionModeOverrides: {},
    payrollCostAllocationModes: {},
    activeEmployeeId: "emp-ana",
  };
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface DemoPayrollContextValue {
  state: DemoState;
  isAuthenticated: boolean;
  periodOptions: PeriodOption[];
  currentPeriod: PeriodOption;
  startSession: (employeeId: string) => void;
  endSession: () => void;
  setActiveEmployee: (employeeId: string) => void;
  addEmployee: (employee: Omit<DemoEmployee, "id">) => void;
  updateEmployeeProfile: (employeeId: string, input: Pick<DemoEmployee, "name" | "position" | "category" | "branchId" | "costBranchIds" | "monthlySalary" | "roleId" | "socialCostRate" | "isrCostRate" | "ivaRate" | "isrRetentionRate" | "ivaRetentionRate">) => void;
  updateEmployeeEmployment: (employeeId: string, hireDate: string, terminationDate: string | null) => void;
  addScheme: (name: string, tiers: Omit<CommissionTier, "id">[], effectiveFrom?: string) => void;
  updateScheme: (schemeId: string, name: string, tiers: Omit<CommissionTier, "id">[], effectiveFrom?: string) => void;
  deleteScheme: (schemeId: string) => void;
  assignScheme: (employeeId: string, schemeId: string | null, effectiveFrom?: string) => void;
  updateSchemeAssignment: (assignmentId: string, schemeId: string, effectiveFrom: string) => void;
  addMovement: (movement: Omit<DemoMovement, "id" | "createdAt">) => void;
  updateMovement: (movementId: string, patch: Omit<DemoMovement, "id" | "createdAt" | "status">) => void;
  setMovementStatus: (movementId: string, status: MovementStatus) => void;
  addPayrollAdjustment: (adjustment: Omit<DemoPayrollAdjustment, "id" | "createdAt">) => void;
  updatePayrollAdjustment: (adjustmentId: string, patch: Omit<DemoPayrollAdjustment, "id" | "createdAt" | "status">) => void;
  setPayrollAdjustmentStatus: (adjustmentId: string, status: PayrollAdjustmentStatus) => void;
  addLoan: (loan: Omit<DemoLoan, "id" | "history" | "paidInstallments">) => void;
  updateLoan: (loanId: string, patch: Pick<DemoLoan, "requestedAt" | "amount" | "installments" | "firstPeriod" | "payrollModule" | "payrollRunId" | "notes">) => void;
  deleteLoan: (loanId: string) => void;
  setLoanStatus: (loanId: string, status: ApprovalStatus) => void;
  createRun: (module: PayrollModule, periodStart: string, periodEnd: string, mode: DemoPayrollRun["mode"], payDate: string) => void;
  setRunStatus: (runId: string, status: PayrollStatus) => void;
  setCalculationMode: (mode: DemoPayrollRun["mode"]) => void;
  setCommissionModeOverride: (employeeId: string, mode: DemoPayrollRun["mode"] | null) => void;
  setPayrollCostAllocationModes: (periodStart: string, modes: Record<string, PayrollCostAllocationMode>) => void;
  updateKioskTarget: (branchId: string, monthlyTarget: number, commissionRate: number, managerId: string | null) => void;
  addBranchCommissionScheme: (scheme: Omit<DemoBranchCommissionScheme, "id" | "createdAt" | "updatedAt" | "tiers" | "managerHistory"> & { tiers: Omit<CommissionTier, "id">[] }) => void;
  updateBranchCommissionScheme: (schemeId: string, scheme: Omit<DemoBranchCommissionScheme, "id" | "createdAt" | "updatedAt" | "tiers" | "managerHistory"> & { tiers: Omit<CommissionTier, "id">[] }) => void;
  deleteBranchCommissionScheme: (schemeId: string) => void;
  updatePeriodConfig: (module: PayrollModule, input: Omit<DemoPayrollPeriodConfig, "id" | "module" | "updatedAt">) => void;
  updateEmployeeCosts: (employeeId: string, socialCostRate: number, isrCostRate: number) => void;
  setEmployeeViatics: (employeeId: string, enabled: boolean, conceptIds: string[]) => void;
  addViaticsConcept: (concept: Omit<DemoViaticsConcept, "id">) => void;
  updateViaticsConcept: (conceptId: string, patch: Omit<DemoViaticsConcept, "id">) => void;
  deleteViaticsConcept: (conceptId: string) => void;
  addViaticsEntry: (entry: Omit<DemoViaticsEntry, "id" | "createdAt" | "status" | "payrollRunId" | "payrollModule" | "periodStart">) => void;
  updateViaticsEntry: (entryId: string, patch: Pick<DemoViaticsEntry, "conceptId" | "branchId" | "requestedAt" | "amount" | "comments" | "receiptName">) => void;
  deleteViaticsEntry: (entryId: string) => void;
  setViaticsEntryStatus: (entryId: string, status: ViaticsStatus, payrollRunId?: string) => void;
  addRole: (name: string) => void;
  togglePermission: (roleId: string, permission: string) => void;
  assignRole: (employeeId: string, roleId: string) => void;
  setEmployeeCostBranches: (employeeId: string, branchIds: string[]) => void;
  setEmployeeSecondaryAccessKey: (employeeId: string, key: string, updatedBy: string) => void;
  setDecision: (employeeId: string, periodStart: string, status: DemoEmployeeDecision["status"], note: string) => void;
  setKioskReceiptDecision: (managerId: string, month: string, status: DemoKioskReceiptDecision["status"], note: string) => void;
  resetDemo: () => void;
  payrollLines: (periodStart: string, mode?: DemoPayrollRun["mode"], periodEnd?: string, payrollModule?: PayrollModule) => EmployeePayrollLine[];
}

const DemoPayrollContext = createContext<DemoPayrollContextValue | null>(null);

export function PayrollDemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createInitialState());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const periodOptions = useMemo(() => buildPeriodOptions(), []);
  const currentPeriod = periodOptions[0]?.start === periodForDate(new Date()).start
    ? periodOptions[0]
    : periodForDate(new Date());

  const update = useCallback((recipe: (current: DemoState) => DemoState) => {
    setState((current) => recipe(current));
  }, []);

  const payrollLines = useCallback(
    (periodStart: string, mode: DemoPayrollRun["mode"] = "WITH_VAT", periodEnd?: string, payrollModule: PayrollModule = "CONSOLIDATED") => {
      const configuredEnd = periodEnd ?? periodOptions.find((item) => item.start === periodStart)?.end ?? currentPeriod.end;
      const startDate = new Date(`${periodStart}T12:00:00`);
      const endDate = new Date(`${configuredEnd}T12:00:00`);
      const periodDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1);
      return state.employees
        .filter((employee) => employee.hireDate <= configuredEnd && (!employee.terminationDate || employee.terminationDate >= periodStart))
        .map((employee) => {
        const employmentStart = employee.hireDate > periodStart ? employee.hireDate : periodStart;
        const employmentEnd = employee.terminationDate && employee.terminationDate < configuredEnd ? employee.terminationDate : configuredEnd;
        const workedDays = Math.max(0, Math.round((new Date(`${employmentEnd}T12:00:00`).getTime() - new Date(`${employmentStart}T12:00:00`).getTime()) / 86_400_000) + 1);
        const grossSales = state.sales
          .filter((sale) => sale.employeeId === employee.id && sale.date >= periodStart && sale.date <= configuredEnd)
          .reduce((sum, sale) => sum + sale.amount, 0);
        const calculationMode = employee.category === "SELLER" ? state.commissionModeOverrides[employee.id] ?? mode : mode;
        const sales = calculationMode === "WITHOUT_VAT" ? grossSales / 1.16 : grossSales;
        const applicableAssignment = state.schemeAssignments
          .filter((assignment) => assignment.employeeId === employee.id && assignment.effectiveFrom <= configuredEnd)
          .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
        const scheme = state.schemes.find((item) => item.id === (applicableAssignment?.schemeId ?? employee.schemeId) && item.active && (item.effectiveFrom ?? "0000-01-01") <= configuredEnd);
        const tier = scheme?.tiers.find((item) => sales >= item.from && (item.to === null || sales <= item.to));
        const rate = tier?.rate ?? 0;
        const commission = sales * rate;
        const periodMovements = state.movements.filter(
          (movement) => movement.employeeId === employee.id && movement.periodStart >= periodStart && movement.periodStart <= configuredEnd && movement.status === "APPROVED",
        );
        const bonuses = periodMovements
          .filter((movement) => movement.type === "BONUS" && (movement.mode === "FIXED" || sales >= (movement.threshold ?? 0)))
          .reduce((sum, movement) => sum + movement.amount, 0);
        const fines = periodMovements
          .filter((movement) => movement.type === "FINE")
          .reduce((sum, movement) => sum + movement.amount, 0);
        const loanDeduction = state.loans
          .filter((loan) =>
            loan.employeeId === employee.id &&
            loan.status === "APPROVED" &&
            loan.paidInstallments < loan.installments &&
            loan.firstPeriod <= periodStart &&
            (payrollModule === "CONSOLIDATED" || loan.payrollModule === payrollModule),
          )
          .reduce((sum, loan) => sum + loan.amount / loan.installments, 0);
        const payrollAdjustments = state.adjustments.filter((adjustment) =>
          adjustment.status === "APPROVED" &&
          adjustment.participantIds.includes(employee.id) &&
          adjustment.periodStart >= periodStart &&
          adjustment.periodStart <= configuredEnd &&
          adjustment.payrollDate >= periodStart &&
          adjustment.payrollDate <= configuredEnd &&
          (payrollModule === "CONSOLIDATED" || adjustment.payrollModule === payrollModule),
        );
        const adjustmentShare = (adjustment: DemoPayrollAdjustment) => adjustment.amount / Math.max(adjustment.participantIds.length, 1);
        const externalAdditions = payrollAdjustments
          .filter((adjustment) => adjustment.type === "PLUS" || adjustment.type === "BONUS" || adjustment.type === "LOAN")
          .reduce((sum, adjustment) => sum + adjustmentShare(adjustment), 0);
        const externalDeductions = payrollAdjustments
          .filter((adjustment) => adjustment.type === "MINUS" || adjustment.type === "FINE" || adjustment.type === "LOAN_PAYMENT")
          .reduce((sum, adjustment) => sum + adjustmentShare(adjustment), 0);
        const approvedViatics = state.viaticsEntries.filter((entry) =>
          entry.employeeId === employee.id &&
          entry.status === "APPROVED" &&
          entry.periodStart !== null &&
          entry.periodStart >= periodStart &&
          entry.periodStart <= configuredEnd &&
          (payrollModule === "CONSOLIDATED" || entry.payrollModule === payrollModule),
        );
        const viaticsAdditions = approvedViatics
          .filter((entry) => state.viaticsConcepts.find((concept) => concept.id === entry.conceptId)?.effect === "ADD")
          .reduce((sum, entry) => sum + entry.amount, 0);
        const viaticsDeductions = approvedViatics
          .filter((entry) => state.viaticsConcepts.find((concept) => concept.id === entry.conceptId)?.effect === "DEDUCT")
          .reduce((sum, entry) => sum + entry.amount, 0);
        const totalExternalAdditions = externalAdditions + viaticsAdditions;
        const totalExternalDeductions = externalDeductions + viaticsDeductions;
        const baseSalaryOverride = periodDays > 16 ? null : payrollAdjustments.filter((adjustment) => adjustment.type === "BASE_SALARY").at(-1)?.amount ?? null;
        const isStandardFortnight =
          (startDate.getDate() === 1 && endDate.getDate() === 15) ||
          (startDate.getDate() === 16 && endDate.getDate() === new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate());
        const isFullCalendarMonth =
          startDate.getFullYear() === endDate.getFullYear() &&
          startDate.getMonth() === endDate.getMonth() &&
          startDate.getDate() === 1 &&
          endDate.getDate() === new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
        const monthEndDay = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
        const firstHalfWorkedDays = isFullCalendarMonth
          ? Math.max(0, Math.round((new Date(`${employmentEnd < `${periodStart.slice(0, 8)}15` ? employmentEnd : `${periodStart.slice(0, 8)}15`}T12:00:00`).getTime() - new Date(`${employmentStart > periodStart ? employmentStart : periodStart}T12:00:00`).getTime()) / 86_400_000) + 1)
          : 0;
        const secondHalfStart = `${periodStart.slice(0, 8)}16`;
        const secondHalfWorkedDays = isFullCalendarMonth
          ? Math.max(0, Math.round((new Date(`${employmentEnd}T12:00:00`).getTime() - new Date(`${employmentStart > secondHalfStart ? employmentStart : secondHalfStart}T12:00:00`).getTime()) / 86_400_000) + 1)
          : 0;
        const calculatedFixedSalary = employee.category === "SELLER" || employee.category === "CONTRACTOR"
          ? 0
          : isFullCalendarMonth
            ? (employee.monthlySalary / 2) * (Math.min(firstHalfWorkedDays, 15) / 15) + (employee.monthlySalary / 2) * (Math.min(secondHalfWorkedDays, monthEndDay - 15) / (monthEndDay - 15))
            : isStandardFortnight
              ? (employee.monthlySalary / 2) * (workedDays / periodDays)
              : 0;
        const fixedSalary = baseSalaryOverride === null
          ? calculatedFixedSalary
          : baseSalaryOverride * (workedDays / periodDays);
        const ordinaryNet = fixedSalary + commission + bonuses + totalExternalAdditions - fines - loanDeduction - totalExternalDeductions;
        const invoiceSubtotal = employee.category === "CONTRACTOR" ? fixedSalary + commission + bonuses + totalExternalAdditions : 0;
        const ivaAmount = invoiceSubtotal * employee.ivaRate;
        const isrRetention = invoiceSubtotal * employee.isrRetentionRate;
        const ivaRetention = invoiceSubtotal * employee.ivaRetentionRate;
        const invoicePayable = employee.category === "CONTRACTOR"
          ? invoiceSubtotal + ivaAmount - isrRetention - ivaRetention - fines - loanDeduction - totalExternalDeductions
          : 0;
        const total = employee.category === "CONTRACTOR" ? invoicePayable : ordinaryNet;
        const socialCost = Math.max(total, 0) * employee.socialCostRate;
        const isrCost = Math.max(total, 0) * employee.isrCostRate;
        return {
          employee,
          workedDays,
          periodDays,
          sales,
          rate,
          commission,
          fixedSalary,
          bonuses,
          fines,
          loanDeduction,
          externalAdditions: totalExternalAdditions,
          externalDeductions: totalExternalDeductions,
          viaticsAdditions,
          viaticsDeductions,
          baseSalaryOverride,
          total,
          socialCost,
          isrCost,
          totalCost: total + socialCost + isrCost,
          invoiceSubtotal,
          ivaAmount,
          isrRetention,
          ivaRetention,
          invoicePayable,
          schemeName: scheme?.name ?? "SIN ESQUEMA",
          calculationMode,
        };
      });
    },
    [currentPeriod, periodOptions, state.adjustments, state.commissionModeOverrides, state.employees, state.loans, state.movements, state.sales, state.schemeAssignments, state.schemes, state.viaticsConcepts, state.viaticsEntries],
  );

  const value = useMemo<DemoPayrollContextValue>(() => ({
    state,
    isAuthenticated,
    periodOptions,
    currentPeriod,
    startSession: (employeeId) => {
      update((current) => ({ ...current, activeEmployeeId: employeeId }));
      setIsAuthenticated(true);
    },
    endSession: () => setIsAuthenticated(false),
    setActiveEmployee: (employeeId) => update((current) => ({ ...current, activeEmployeeId: employeeId })),
    addEmployee: (employee) => update((current) => ({
      ...current,
      employees: [
        ...current.employees,
        {
          ...employee,
          id: id("employee"),
          name: employee.name.toLocaleUpperCase("es-MX"),
          position: employee.position.toLocaleUpperCase("es-MX"),
          bank: employee.bank.toLocaleUpperCase("es-MX"),
          costBranchIds: employee.costBranchIds.filter((branchId) => current.branches.some((branch) => branch.id === branchId)),
        },
      ],
    })),
    updateEmployeeProfile: (employeeId, input) => update((current) => {
      const previous = current.employees.find((employee) => employee.id === employeeId);
      if (!previous) return current;
      const normalizedName = input.name.toLocaleUpperCase("es-MX");
      const movedOutOfManagement = previous.category === "MANAGEMENT" && input.category !== "MANAGEMENT";
      const renamedManager = previous.category === "MANAGEMENT" && previous.name !== normalizedName;
      const effectiveFrom = isoDate(new Date());
      return {
        ...current,
        employees: current.employees.map((employee) => employee.id === employeeId ? {
          ...employee,
          ...input,
          name: normalizedName,
          position: input.position.toLocaleUpperCase("es-MX"),
        } : employee),
        kioskTargets: movedOutOfManagement
          ? current.kioskTargets.map((target) => target.managerId === employeeId ? { ...target, managerId: null, updatedAt: new Date().toISOString() } : target)
          : current.kioskTargets,
        branchCommissionSchemes: current.branchCommissionSchemes.map((scheme) => {
          if (scheme.managerId !== employeeId || (!movedOutOfManagement && !renamedManager)) return scheme;
          const managerId = movedOutOfManagement ? null : employeeId;
          const managerName = movedOutOfManagement ? "SIN GERENTE" : normalizedName;
          return {
            ...scheme,
            managerId,
            managerHistory: [...scheme.managerHistory, { id: id("manager-history"), managerId, managerName, effectiveFrom, changedAt: new Date().toISOString() }],
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }),
    updateEmployeeEmployment: (employeeId, hireDate, terminationDate) => update((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === employeeId ? {
        ...employee,
        hireDate,
        terminationDate,
        active: hireDate <= isoDate(new Date()) && (!terminationDate || terminationDate >= isoDate(new Date())),
      } : employee),
    })),
    addScheme: (name, tiers, effectiveFrom = currentPeriod.start) => update((current) => ({
      ...current,
      schemes: [...current.schemes, { id: id("scheme"), name: name.toLocaleUpperCase("es-MX"), active: true, effectiveFrom, createdAt: isoDate(new Date()), tiers: tiers.map((tier) => ({ ...tier, id: id("tier") })) }],
    })),
    updateScheme: (schemeId, name, tiers, effectiveFrom) => update((current) => ({
      ...current,
      schemes: current.schemes.map((scheme) => scheme.id === schemeId ? { ...scheme, name: name.toLocaleUpperCase("es-MX"), effectiveFrom: effectiveFrom ?? scheme.effectiveFrom ?? currentPeriod.start, tiers: tiers.map((tier) => ({ ...tier, id: id("tier") })) } : scheme),
    })),
    deleteScheme: (schemeId) => update((current) => ({
      ...current,
      schemes: current.schemes.filter((scheme) => scheme.id !== schemeId),
      schemeAssignments: current.schemeAssignments.filter((assignment) => assignment.schemeId !== schemeId),
      employees: current.employees.map((employee) => employee.schemeId === schemeId ? { ...employee, schemeId: null } : employee),
    })),
    assignScheme: (employeeId, schemeId, effectiveFrom = currentPeriod.start) => update((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === employeeId ? { ...employee, schemeId } : employee),
      schemeAssignments: schemeId ? [...current.schemeAssignments, { id: id("scheme-assignment"), employeeId, schemeId, effectiveFrom, createdAt: isoDate(new Date()) }] : current.schemeAssignments,
    })),
    updateSchemeAssignment: (assignmentId, schemeId, effectiveFrom) => update((current) => ({
      ...current,
      schemeAssignments: current.schemeAssignments.map((assignment) => assignment.id === assignmentId ? { ...assignment, schemeId, effectiveFrom } : assignment),
    })),
    addMovement: (movement) => update((current) => ({
      ...current,
      movements: [...current.movements, { ...movement, id: id("movement"), createdAt: isoDate(new Date()) }],
    })),
    updateMovement: (movementId, patch) => update((current) => ({
      ...current,
      movements: current.movements.map((movement) => movement.id === movementId ? { ...movement, ...patch, status: "DRAFT" } : movement),
    })),
    setMovementStatus: (movementId, status) => update((current) => ({
      ...current,
      movements: current.movements.map((movement) => movement.id === movementId ? { ...movement, status } : movement),
    })),
    addPayrollAdjustment: (adjustment) => update((current) => {
      const run = current.runs.find((item) => item.id === adjustment.payrollRunId);
      if (run && run.status !== "DRAFT") return current;
      return { ...current, adjustments: [...current.adjustments, { ...adjustment, id: id("adjustment"), createdAt: isoDate(new Date()) }] };
    }),
    updatePayrollAdjustment: (adjustmentId, patch) => update((current) => {
      const adjustment = current.adjustments.find((item) => item.id === adjustmentId);
      const run = adjustment ? current.runs.find((item) => item.id === adjustment.payrollRunId) : undefined;
      if (run && run.status !== "DRAFT") return current;
      return {
        ...current,
        adjustments: current.adjustments.map((item) => item.id === adjustmentId ? {
          ...item,
          ...patch,
          status: "DRAFT",
        } : item),
      };
    }),
    setPayrollAdjustmentStatus: (adjustmentId, status) => update((current) => {
      const adjustment = current.adjustments.find((item) => item.id === adjustmentId);
      const run = adjustment ? current.runs.find((item) => item.id === adjustment.payrollRunId) : undefined;
      if (run && run.status !== "DRAFT") return current;
      return { ...current, adjustments: current.adjustments.map((item) => item.id === adjustmentId ? { ...item, status } : item) };
    }),
    addLoan: (loan) => update((current) => {
      const run = current.runs.find((item) => item.id === loan.payrollRunId);
      if (run && run.status !== "DRAFT") return current;
      const requester = loan.notes.startsWith("SOLICITUD DESDE MI PERFIL")
        ? current.employees.find((employee) => employee.id === loan.employeeId)?.name ?? "PORTAL PERSONAL"
        : "ADMINISTRACIÓN";
      return {
        ...current,
        loans: [...current.loans, {
          ...loan,
          id: id("loan"),
          paidInstallments: 0,
          history: [{
            id: id("history"),
            date: isoDate(new Date()),
            action: loan.requestType === "ADVANCE" ? "ADELANTO SOLICITADO" : "PRÉSTAMO SOLICITADO",
            by: requester,
          }],
        }],
      };
    }),
    updateLoan: (loanId, patch) => update((current) => {
      const selected = current.loans.find((loan) => loan.id === loanId);
      const run = selected ? current.runs.find((item) => item.id === selected.payrollRunId) : undefined;
      if (run && run.status !== "DRAFT") return current;
      return { ...current, loans: current.loans.map((loan) => loan.id === loanId ? {
        ...loan,
        ...patch,
        history: [...loan.history, { id: id("history"), date: isoDate(new Date()), action: "SOLICITUD EDITADA", by: "ADMINISTRACIÓN" }],
      } : loan) };
    }),
    deleteLoan: (loanId) => update((current) => {
      const selected = current.loans.find((loan) => loan.id === loanId);
      const run = selected ? current.runs.find((item) => item.id === selected.payrollRunId) : undefined;
      return run && run.status !== "DRAFT" ? current : { ...current, loans: current.loans.filter((loan) => loan.id !== loanId) };
    }),
    setLoanStatus: (loanId, status) => update((current) => {
      const selected = current.loans.find((loan) => loan.id === loanId);
      const run = selected ? current.runs.find((item) => item.id === selected.payrollRunId) : undefined;
      if (run && run.status !== "DRAFT") return current;
      return { ...current, loans: current.loans.map((loan) => loan.id === loanId ? {
        ...loan,
        status,
        history: [...loan.history, { id: id("history"), date: isoDate(new Date()), action: status === "APPROVED" ? "PRÉSTAMO AUTORIZADO" : status === "REJECTED" ? "SOLICITUD RECHAZADA" : "SOLICITUD REABIERTA", by: "ADMINISTRACIÓN" }],
      } : loan) };
    }),
    createRun: (module, periodStart, periodEnd, mode, payDate) => update((current) => {
      const existing = current.runs.find((run) => run.module === module && run.periodStart === periodStart);
      if (existing && existing.status !== "DRAFT") return current;
      if (existing) return {
        ...current,
        runs: current.runs.map((run) => run.id === existing.id ? { ...run, periodEnd, mode, payDate } : run),
      };
      return {
        ...current,
        runs: [...current.runs, { id: id("run"), module, periodStart, periodEnd, payDate, mode, status: "DRAFT", createdAt: isoDate(new Date()) }],
      };
    }),
    setRunStatus: (runId, status) => update((current) => ({
      ...current,
      runs: current.runs.map((run) => run.id === runId ? { ...run, status } : run),
    })),
    setCalculationMode: (mode) => update((current) => ({
      ...current,
      calculationMode: mode,
      runs: current.runs.map((run) => {
        const activeConfig = current.periodConfigs.find((config) => config.module === run.module);
        return run.status === "DRAFT" && activeConfig && run.periodStart === activeConfig.periodStart && run.periodEnd === activeConfig.periodEnd
          ? { ...run, mode }
          : run;
      }),
    })),
    setCommissionModeOverride: (employeeId, mode) => update((current) => {
      const commissionModeOverrides = { ...current.commissionModeOverrides };
      if (mode) commissionModeOverrides[employeeId] = mode;
      else delete commissionModeOverrides[employeeId];
      return { ...current, commissionModeOverrides };
    }),
    setPayrollCostAllocationModes: (periodStart, modes) => update((current) => {
      const locked = current.runs.some((run) => run.module === "COMMISSION" && run.periodStart === periodStart && run.status !== "DRAFT");
      if (locked) return current;
      return { ...current, payrollCostAllocationModes: Object.entries(modes).reduce((next, [employeeId, allocationMode]) => ({
        ...next,
        [`${periodStart}:${employeeId}`]: allocationMode,
      }), { ...current.payrollCostAllocationModes }),
      };
    }),
    updateKioskTarget: (branchId, monthlyTarget, commissionRate, managerId) => update((current) => ({
      ...current,
      kioskTargets: current.kioskTargets.map((target) => target.branchId === branchId ? {
        ...target,
        monthlyTarget,
        commissionRate,
        managerId,
        updatedAt: new Date().toISOString(),
      } : target),
      kioskMonthlySales: current.kioskMonthlySales.map((sale) => sale.branchId === branchId ? { ...sale, managerId } : sale),
    })),
    addBranchCommissionScheme: (scheme) => update((current) => ({
      ...current,
      branchCommissionSchemes: [...current.branchCommissionSchemes, {
        ...scheme,
        id: id("branch-scheme"),
        name: scheme.name.toLocaleUpperCase("es-MX"),
        branchIds: scheme.scope === "ALL_COMBINED" ? current.branches.map((branch) => branch.id) : scheme.branchIds,
        tiers: scheme.tiers.map((tier) => ({ ...tier, id: id("branch-tier") })),
        createdAt: isoDate(new Date()),
        updatedAt: new Date().toISOString(),
        managerHistory: [{
          id: id("manager-history"),
          managerId: scheme.managerId,
          managerName: current.employees.find((employee) => employee.id === scheme.managerId)?.name ?? "SIN GERENTE",
          effectiveFrom: scheme.effectiveFrom,
          changedAt: new Date().toISOString(),
        }],
      }],
    })),
    updateBranchCommissionScheme: (schemeId, scheme) => update((current) => ({
      ...current,
      branchCommissionSchemes: current.branchCommissionSchemes.map((currentScheme) => {
        if (currentScheme.id !== schemeId) return currentScheme;
        const managerChanged = currentScheme.managerId !== scheme.managerId;
        const managerHistory = managerChanged
          ? [...currentScheme.managerHistory, {
              id: id("manager-history"),
              managerId: scheme.managerId,
              managerName: current.employees.find((employee) => employee.id === scheme.managerId)?.name ?? "SIN GERENTE",
              effectiveFrom: scheme.effectiveFrom,
              changedAt: new Date().toISOString(),
            }]
          : currentScheme.managerHistory;
        return {
          ...currentScheme,
          ...scheme,
          name: scheme.name.toLocaleUpperCase("es-MX"),
          branchIds: scheme.scope === "ALL_COMBINED" ? current.branches.map((branch) => branch.id) : scheme.branchIds,
          tiers: scheme.tiers.map((tier) => ({ ...tier, id: id("branch-tier") })),
          managerHistory,
          updatedAt: new Date().toISOString(),
        };
      }),
    })),
    deleteBranchCommissionScheme: (schemeId) => update((current) => ({
      ...current,
      branchCommissionSchemes: current.branchCommissionSchemes.filter((scheme) => scheme.id !== schemeId),
    })),
    updatePeriodConfig: (module, input) => update((current) => ({
      ...current,
      periodConfigs: current.periodConfigs.map((config) => config.module === module ? {
        ...config,
        ...input,
        updatedAt: new Date().toISOString(),
      } : config),
    })),
    updateEmployeeCosts: (employeeId, socialCostRate, isrCostRate) => update((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === employeeId ? {
        ...employee,
        socialCostRate,
        isrCostRate,
      } : employee),
    })),
    setEmployeeViatics: (employeeId, enabled, conceptIds) => update((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === employeeId ? {
        ...employee,
        viaticsEnabled: enabled,
        allowedViaticsConceptIds: enabled ? conceptIds : [],
      } : employee),
    })),
    addViaticsConcept: (concept) => update((current) => ({
      ...current,
      viaticsConcepts: [...current.viaticsConcepts, { ...concept, id: id("viatics-concept") }],
    })),
    updateViaticsConcept: (conceptId, patch) => update((current) => ({
      ...current,
      viaticsConcepts: current.viaticsConcepts.map((concept) => concept.id === conceptId ? { ...concept, ...patch } : concept),
    })),
    deleteViaticsConcept: (conceptId) => update((current) => ({
      ...current,
      viaticsConcepts: current.viaticsConcepts.filter((concept) => concept.id !== conceptId),
      employees: current.employees.map((employee) => ({ ...employee, allowedViaticsConceptIds: (employee.allowedViaticsConceptIds ?? []).filter((idValue) => idValue !== conceptId) })),
    })),
    addViaticsEntry: (entry) => update((current) => ({
      ...current,
      viaticsEntries: [...current.viaticsEntries, { ...entry, id: id("viatics"), status: "PENDING", payrollRunId: null, payrollModule: null, periodStart: null, createdAt: isoDate(new Date()) }],
    })),
    updateViaticsEntry: (entryId, patch) => update((current) => {
      const selected = current.viaticsEntries.find((entry) => entry.id === entryId);
      const run = selected?.payrollRunId ? current.runs.find((item) => item.id === selected.payrollRunId) : undefined;
      if (run && run.status !== "DRAFT") return current;
      return { ...current, viaticsEntries: current.viaticsEntries.map((entry) => entry.id === entryId ? { ...entry, ...patch, status: "PENDING", payrollRunId: null, payrollModule: null, periodStart: null } : entry) };
    }),
    deleteViaticsEntry: (entryId) => update((current) => {
      const selected = current.viaticsEntries.find((entry) => entry.id === entryId);
      const run = selected?.payrollRunId ? current.runs.find((item) => item.id === selected.payrollRunId) : undefined;
      return run && run.status !== "DRAFT" ? current : { ...current, viaticsEntries: current.viaticsEntries.filter((entry) => entry.id !== entryId) };
    }),
    setViaticsEntryStatus: (entryId, status, payrollRunId) => update((current) => {
      const run = payrollRunId ? current.runs.find((item) => item.id === payrollRunId) : undefined;
      const selected = current.viaticsEntries.find((entry) => entry.id === entryId);
      const currentRun = selected?.payrollRunId ? current.runs.find((item) => item.id === selected.payrollRunId) : undefined;
      if ((run && run.status !== "DRAFT") || (currentRun && currentRun.status !== "DRAFT")) return current;
      return {
        ...current,
        viaticsEntries: current.viaticsEntries.map((entry) => entry.id === entryId ? {
          ...entry,
          status,
          payrollRunId: status === "APPROVED" ? run?.id ?? entry.payrollRunId : null,
          payrollModule: status === "APPROVED" && run?.module !== "CONSOLIDATED" ? run?.module ?? entry.payrollModule : null,
          periodStart: status === "APPROVED" ? run?.periodStart ?? entry.periodStart : null,
        } : entry),
      };
    }),
    addRole: (name) => update((current) => ({
      ...current,
      roles: [...current.roles, { id: id("role"), name: name.toLocaleUpperCase("es-MX"), permissions: ["receipts.view"] }],
    })),
    togglePermission: (roleId, permission) => update((current) => ({
      ...current,
      roles: current.roles.map((role) => role.id === roleId ? {
        ...role,
        permissions: role.id === "role-admin" && permission === "security.second_key.manage"
          ? role.permissions
          : role.permissions.includes(permission)
          ? role.permissions.filter((item) => item !== permission)
          : [...role.permissions, permission],
      } : role),
    })),
    assignRole: (employeeId, roleId) => update((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === employeeId ? { ...employee, roleId } : employee),
    })),
    setEmployeeCostBranches: (employeeId, branchIds) => update((current) => {
      const validBranchIds = Array.from(new Set(branchIds)).filter((branchId) => current.branches.some((branch) => branch.id === branchId));
      if (validBranchIds.length === 0) return current;
      return {
        ...current,
        employees: current.employees.map((employee) => employee.id === employeeId ? { ...employee, costBranchIds: validBranchIds } : employee),
      };
    }),
    setEmployeeSecondaryAccessKey: (employeeId, key, updatedBy) => update((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === employeeId ? {
        ...employee,
        secondaryAccessKey: key,
        secondaryAccessKeyUpdatedAt: new Date().toISOString(),
        secondaryAccessKeyUpdatedBy: updatedBy,
      } : employee),
    })),
    setDecision: (employeeId, periodStart, status, note) => update((current) => ({
      ...current,
      decisions: [
        ...current.decisions.filter((decision) => !(decision.employeeId === employeeId && decision.periodStart === periodStart)),
        { employeeId, periodStart, status, note, updatedAt: new Date().toISOString() },
      ],
    })),
    setKioskReceiptDecision: (managerId, month, status, note) => update((current) => ({
      ...current,
      kioskReceiptDecisions: [
        ...current.kioskReceiptDecisions.filter((decision) => !(decision.managerId === managerId && decision.month === month)),
        { managerId, month, status, note, updatedAt: new Date().toISOString() },
      ],
    })),
    resetDemo: () => {
      setState(createInitialState());
    },
    payrollLines,
  }), [currentPeriod, isAuthenticated, payrollLines, periodOptions, state, update]);

  return <DemoPayrollContext.Provider value={value}>{children}</DemoPayrollContext.Provider>;
}

export function usePayrollDemo() {
  const value = useContext(DemoPayrollContext);
  if (!value) throw new Error("usePayrollDemo debe usarse dentro de PayrollDemoProvider.");
  return value;
}
