"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

export interface DemoBranch {
  id: string;
  name: string;
  city: string;
}

export interface DemoEmployee {
  id: string;
  name: string;
  position: string;
  category: EmployeeCategory;
  branchId: string;
  monthlySalary: number;
  schemeId: string | null;
  bank: string;
  account: string;
  roleId: string;
  active: boolean;
  socialCostRate: number;
  isrCostRate: number;
  ivaRate: number;
  isrRetentionRate: number;
  ivaRetentionRate: number;
}

export interface CommissionTier {
  id: string;
  from: number;
  to: number | null;
  rate: number;
}

export interface DemoScheme {
  id: string;
  name: string;
  active: boolean;
  tiers: CommissionTier[];
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
  status: ApprovalStatus;
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

export interface DemoState {
  branches: DemoBranch[];
  employees: DemoEmployee[];
  schemes: DemoScheme[];
  sales: DemoSale[];
  movements: DemoMovement[];
  loans: DemoLoan[];
  roles: DemoRole[];
  runs: DemoPayrollRun[];
  periodConfigs: DemoPayrollPeriodConfig[];
  decisions: DemoEmployeeDecision[];
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
  sales: number;
  rate: number;
  commission: number;
  fixedSalary: number;
  bonuses: number;
  fines: number;
  loanDeduction: number;
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
] as const;

const STORAGE_KEY = "keysar-payroll-demo-v3";

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
    { id: "emp-ana", name: "ANA SOFÍA MARTÍNEZ", position: "VENDEDORA SENIOR", category: "SELLER", branchId: "branch-polanco", monthlySalary: 0, schemeId: "scheme-elite", bank: "BBVA", account: "•••• 2841", roleId: "role-employee", active: true, socialCostRate: 0.18, isrCostRate: 0.1, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-daniela", name: "DANIELA RUIZ", position: "VENDEDORA", category: "SELLER", branchId: "branch-satelite", monthlySalary: 0, schemeId: "scheme-growth", bank: "SANTANDER", account: "•••• 9130", roleId: "role-employee", active: true, socialCostRate: 0.18, isrCostRate: 0.1, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-carla", name: "CARLA MENDOZA", position: "FACIALISTA", category: "SPECIALIST", branchId: "branch-polanco", monthlySalary: 18000, schemeId: null, bank: "BANORTE", account: "•••• 4472", roleId: "role-employee", active: true, socialCostRate: 0.22, isrCostRate: 0.12, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-valeria", name: "VALERIA ORTIZ", position: "ESPECIALISTA CORPORAL", category: "SPECIALIST", branchId: "branch-interlomas", monthlySalary: 19500, schemeId: null, bank: "BBVA", account: "•••• 5068", roleId: "role-employee", active: true, socialCostRate: 0.22, isrCostRate: 0.12, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-monica", name: "MÓNICA SERRANO", position: "GERENTE DE SUCURSAL", category: "MANAGEMENT", branchId: "branch-polanco", monthlySalary: 28000, schemeId: null, bank: "HSBC", account: "•••• 1085", roleId: "role-manager", active: true, socialCostRate: 0.25, isrCostRate: 0.16, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-ricardo", name: "RICARDO LUNA", position: "GERENTE REGIONAL", category: "MANAGEMENT", branchId: "branch-satelite", monthlySalary: 36000, schemeId: null, bank: "BBVA", account: "•••• 7760", roleId: "role-manager", active: true, socialCostRate: 0.25, isrCostRate: 0.18, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-paola", name: "PAOLA VEGA", position: "CALL CENTER", category: "CALL_CENTER", branchId: "branch-satelite", monthlySalary: 14500, schemeId: null, bank: "BANAMEX", account: "•••• 6219", roleId: "role-employee", active: true, socialCostRate: 0.2, isrCostRate: 0.1, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-jorge", name: "JORGE SALAS", position: "CALL CENTER", category: "CALL_CENTER", branchId: "branch-interlomas", monthlySalary: 15000, schemeId: null, bank: "BANORTE", account: "•••• 3304", roleId: "role-employee", active: true, socialCostRate: 0.2, isrCostRate: 0.1, ivaRate: 0, isrRetentionRate: 0, ivaRetentionRate: 0 },
    { id: "emp-lucia", name: "LUCÍA FERNÁNDEZ", position: "VENDEDORA POR HONORARIOS", category: "CONTRACTOR", branchId: "branch-polanco", monthlySalary: 0, schemeId: "scheme-growth", bank: "BBVA", account: "•••• 8892", roleId: "role-employee", active: true, socialCostRate: 0, isrCostRate: 0, ivaRate: 0.16, isrRetentionRate: 0.1, ivaRetentionRate: 0.106667 },
  ];
  const saleSeeds = [
    ["emp-ana", "branch-polanco", 48500],
    ["emp-ana", "branch-satelite", 19200],
    ["emp-daniela", "branch-satelite", 37600],
    ["emp-daniela", "branch-interlomas", 12800],
    ["emp-carla", "branch-polanco", 9400],
    ["emp-valeria", "branch-interlomas", 11200],
    ["emp-lucia", "branch-polanco", 43200],
  ] as const;
  const sales: DemoSale[] = saleSeeds.flatMap(([employeeId, branchId, total], index) =>
    [0.42, 0.33, 0.25].map((share, dayIndex) => ({
      id: `sale-${index}-${dayIndex}`,
      employeeId,
      branchId,
      date: addDays(period.start, Math.min(dayIndex * 3 + index, 13)),
      amount: Math.round(total * share),
    })),
  );

  return {
    branches,
    employees,
    schemes: [
      {
        id: "scheme-growth",
        name: "ESCALA CRECIMIENTO",
        active: true,
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
        tiers: [
          { id: "tier-e1", from: 0, to: 39999.99, rate: 0.05 },
          { id: "tier-e2", from: 40000, to: 64999.99, rate: 0.08 },
          { id: "tier-e3", from: 65000, to: null, rate: 0.1 },
        ],
      },
    ],
    sales,
    movements: [
      { id: "move-1", employeeId: "emp-ana", type: "BONUS", mode: "SCALE", concept: "BONO META $60,000", amount: 1800, threshold: 60000, periodStart: period.start, status: "APPROVED", createdAt: period.start },
      { id: "move-2", employeeId: "emp-daniela", type: "BONUS", mode: "FIXED", concept: "BONO DE PUNTUALIDAD", amount: 750, threshold: null, periodStart: period.start, status: "PENDING", createdAt: addDays(period.start, 4) },
      { id: "move-3", employeeId: "emp-carla", type: "FINE", mode: "FIXED", concept: "DESCUENTO POR INCIDENCIA", amount: 350, threshold: null, periodStart: period.start, status: "APPROVED", createdAt: addDays(period.start, 2) },
    ],
    loans: [
      {
        id: "loan-1",
        employeeId: "emp-daniela",
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
      { id: "role-admin", name: "ADMINISTRADOR DE NÓMINA", permissions: [...permissionCatalog] },
      { id: "role-manager", name: "GERENCIA", permissions: ["dashboard.view", "payroll.approve", "loans.approve", "reports.view", "receipts.view"] },
      { id: "role-employee", name: "EMPLEADO", permissions: ["receipts.view"] },
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
    decisions: [],
    activeEmployeeId: "emp-ana",
  };
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface DemoPayrollContextValue {
  state: DemoState;
  periodOptions: PeriodOption[];
  currentPeriod: PeriodOption;
  setActiveEmployee: (employeeId: string) => void;
  addScheme: (name: string, tiers: Omit<CommissionTier, "id">[]) => void;
  assignScheme: (employeeId: string, schemeId: string | null) => void;
  addMovement: (movement: Omit<DemoMovement, "id" | "createdAt">) => void;
  setMovementStatus: (movementId: string, status: ApprovalStatus) => void;
  addLoan: (loan: Omit<DemoLoan, "id" | "history" | "paidInstallments">) => void;
  updateLoan: (loanId: string, patch: Pick<DemoLoan, "amount" | "installments" | "notes">) => void;
  deleteLoan: (loanId: string) => void;
  setLoanStatus: (loanId: string, status: ApprovalStatus) => void;
  createRun: (module: PayrollModule, periodStart: string, periodEnd: string, mode: DemoPayrollRun["mode"], payDate: string) => void;
  setRunStatus: (runId: string, status: PayrollStatus) => void;
  updatePeriodConfig: (module: PayrollModule, input: Omit<DemoPayrollPeriodConfig, "id" | "module" | "updatedAt">) => void;
  updateEmployeeCosts: (employeeId: string, socialCostRate: number, isrCostRate: number) => void;
  addRole: (name: string) => void;
  togglePermission: (roleId: string, permission: string) => void;
  assignRole: (employeeId: string, roleId: string) => void;
  setDecision: (employeeId: string, periodStart: string, status: DemoEmployeeDecision["status"], note: string) => void;
  resetDemo: () => void;
  payrollLines: (periodStart: string, mode?: DemoPayrollRun["mode"], periodEnd?: string) => EmployeePayrollLine[];
}

const DemoPayrollContext = createContext<DemoPayrollContextValue | null>(null);

export function PayrollDemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const periodOptions = useMemo(() => buildPeriodOptions(), []);
  const currentPeriod = periodOptions[0]?.start === periodForDate(new Date()).start
    ? periodOptions[0]
    : periodForDate(new Date());

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setState(JSON.parse(saved) as DemoState);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const update = useCallback((recipe: (current: DemoState) => DemoState) => {
    setState((current) => recipe(current));
  }, []);

  const payrollLines = useCallback(
    (periodStart: string, mode: DemoPayrollRun["mode"] = "WITH_VAT", periodEnd?: string) => {
      const configuredEnd = periodEnd ?? periodOptions.find((item) => item.start === periodStart)?.end ?? currentPeriod.end;
      const startDate = new Date(`${periodStart}T12:00:00`);
      const endDate = new Date(`${configuredEnd}T12:00:00`);
      const periodDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1);
      return state.employees.filter((employee) => employee.active).map((employee) => {
        const grossSales = state.sales
          .filter((sale) => sale.employeeId === employee.id && sale.date >= periodStart && sale.date <= configuredEnd)
          .reduce((sum, sale) => sum + sale.amount, 0);
        const sales = mode === "WITHOUT_VAT" ? grossSales / 1.16 : grossSales;
        const scheme = state.schemes.find((item) => item.id === employee.schemeId && item.active);
        const tier = scheme?.tiers.find((item) => sales >= item.from && (item.to === null || sales <= item.to));
        const rate = tier?.rate ?? 0;
        const commission = sales * rate;
        const periodMovements = state.movements.filter(
          (movement) => movement.employeeId === employee.id && movement.periodStart === periodStart && movement.status === "APPROVED",
        );
        const bonuses = periodMovements
          .filter((movement) => movement.type === "BONUS" && (movement.mode === "FIXED" || sales >= (movement.threshold ?? 0)))
          .reduce((sum, movement) => sum + movement.amount, 0);
        const fines = periodMovements
          .filter((movement) => movement.type === "FINE")
          .reduce((sum, movement) => sum + movement.amount, 0);
        const loanDeduction = state.loans
          .filter((loan) => loan.employeeId === employee.id && loan.status === "APPROVED" && loan.paidInstallments < loan.installments)
          .reduce((sum, loan) => sum + loan.amount / loan.installments, 0);
        const isStandardFortnight =
          (startDate.getDate() === 1 && endDate.getDate() === 15) ||
          (startDate.getDate() === 16 && endDate.getDate() === new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate());
        const fixedSalary = employee.category === "SELLER" || employee.category === "CONTRACTOR"
          ? 0
          : isStandardFortnight
            ? employee.monthlySalary / 2
            : employee.monthlySalary * (periodDays / 30);
        const ordinaryNet = fixedSalary + commission + bonuses - fines - loanDeduction;
        const invoiceSubtotal = employee.category === "CONTRACTOR" ? commission + bonuses : 0;
        const ivaAmount = invoiceSubtotal * employee.ivaRate;
        const isrRetention = invoiceSubtotal * employee.isrRetentionRate;
        const ivaRetention = invoiceSubtotal * employee.ivaRetentionRate;
        const invoicePayable = employee.category === "CONTRACTOR"
          ? invoiceSubtotal + ivaAmount - isrRetention - ivaRetention - fines - loanDeduction
          : 0;
        const total = employee.category === "CONTRACTOR" ? invoicePayable : ordinaryNet;
        const socialCost = Math.max(total, 0) * employee.socialCostRate;
        const isrCost = Math.max(total, 0) * employee.isrCostRate;
        return {
          employee,
          sales: grossSales,
          rate,
          commission,
          fixedSalary,
          bonuses,
          fines,
          loanDeduction,
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
        };
      });
    },
    [currentPeriod, periodOptions, state.employees, state.loans, state.movements, state.sales, state.schemes],
  );

  const value = useMemo<DemoPayrollContextValue>(() => ({
    state,
    periodOptions,
    currentPeriod,
    setActiveEmployee: (employeeId) => update((current) => ({ ...current, activeEmployeeId: employeeId })),
    addScheme: (name, tiers) => update((current) => ({
      ...current,
      schemes: [...current.schemes, { id: id("scheme"), name: name.toLocaleUpperCase("es-MX"), active: true, tiers: tiers.map((tier) => ({ ...tier, id: id("tier") })) }],
    })),
    assignScheme: (employeeId, schemeId) => update((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === employeeId ? { ...employee, schemeId } : employee),
    })),
    addMovement: (movement) => update((current) => ({
      ...current,
      movements: [...current.movements, { ...movement, id: id("movement"), createdAt: isoDate(new Date()) }],
    })),
    setMovementStatus: (movementId, status) => update((current) => ({
      ...current,
      movements: current.movements.map((movement) => movement.id === movementId ? { ...movement, status } : movement),
    })),
    addLoan: (loan) => update((current) => ({
      ...current,
      loans: [...current.loans, {
        ...loan,
        id: id("loan"),
        paidInstallments: 0,
        history: [{ id: id("history"), date: isoDate(new Date()), action: "SOLICITUD CREADA", by: "ADMINISTRACIÓN" }],
      }],
    })),
    updateLoan: (loanId, patch) => update((current) => ({
      ...current,
      loans: current.loans.map((loan) => loan.id === loanId ? {
        ...loan,
        ...patch,
        history: [...loan.history, { id: id("history"), date: isoDate(new Date()), action: "SOLICITUD EDITADA", by: "ADMINISTRACIÓN" }],
      } : loan),
    })),
    deleteLoan: (loanId) => update((current) => ({ ...current, loans: current.loans.filter((loan) => loan.id !== loanId) })),
    setLoanStatus: (loanId, status) => update((current) => ({
      ...current,
      loans: current.loans.map((loan) => loan.id === loanId ? {
        ...loan,
        status,
        history: [...loan.history, { id: id("history"), date: isoDate(new Date()), action: status === "APPROVED" ? "PRÉSTAMO AUTORIZADO" : status === "REJECTED" ? "SOLICITUD RECHAZADA" : "SOLICITUD REABIERTA", by: "ADMINISTRACIÓN" }],
      } : loan),
    })),
    createRun: (module, periodStart, periodEnd, mode, payDate) => update((current) => {
      const existing = current.runs.find((run) => run.module === module && run.periodStart === periodStart);
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
    addRole: (name) => update((current) => ({
      ...current,
      roles: [...current.roles, { id: id("role"), name: name.toLocaleUpperCase("es-MX"), permissions: ["receipts.view"] }],
    })),
    togglePermission: (roleId, permission) => update((current) => ({
      ...current,
      roles: current.roles.map((role) => role.id === roleId ? {
        ...role,
        permissions: role.permissions.includes(permission)
          ? role.permissions.filter((item) => item !== permission)
          : [...role.permissions, permission],
      } : role),
    })),
    assignRole: (employeeId, roleId) => update((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === employeeId ? { ...employee, roleId } : employee),
    })),
    setDecision: (employeeId, periodStart, status, note) => update((current) => ({
      ...current,
      decisions: [
        ...current.decisions.filter((decision) => !(decision.employeeId === employeeId && decision.periodStart === periodStart)),
        { employeeId, periodStart, status, note, updatedAt: new Date().toISOString() },
      ],
    })),
    resetDemo: () => {
      localStorage.removeItem(STORAGE_KEY);
      setState(createInitialState());
    },
    payrollLines,
  }), [currentPeriod, payrollLines, periodOptions, state, update]);

  return <DemoPayrollContext.Provider value={value}>{children}</DemoPayrollContext.Provider>;
}

export function usePayrollDemo() {
  const value = useContext(DemoPayrollContext);
  if (!value) throw new Error("usePayrollDemo debe usarse dentro de PayrollDemoProvider.");
  return value;
}
