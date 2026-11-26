import type { PilotSnapshot } from "@cosmetics/types";
import type {
  DemoEmployee,
  DemoSchemeAssignment,
  DemoState,
  PayrollModule,
} from "@/components/payroll/payroll-demo-context";
import { pilotConfiguration } from "@/components/payroll/payroll-demo-context";

const operatorId = "pilot-operator";
type Module = Exclude<PayrollModule, "CONSOLIDATED">;
const categoryFor = (position: string): DemoEmployee["category"] =>
  /FACIAL|ESPECIALISTA/i.test(position)
    ? "SPECIALIST"
    : /GEREN|DIREC/i.test(position)
      ? "MANAGEMENT"
      : /HONORARIO/i.test(position)
        ? "CONTRACTOR"
        : /CALL CENTER/i.test(position)
          ? "CALL_CENTER"
          : "SELLER";

export function buildPilotState(cut: PilotSnapshot): DemoState {
  const { openStart, closedStart, capturedAt } = cut;
  const open = cut.periods.find((p) => p.start === openStart)!;
  const config = pilotConfiguration(closedStart);
  const branches: DemoState["branches"] = cut.branches.map((b) => ({
    id: b.id,
    name: b.name,
    city: "",
    active: b.active,
    source: "PAYROLL",
    externalPosId: null,
    registeredAt: b.createdAt,
    deactivatedAt: b.endedAt,
    lastSyncedAt: capturedAt,
  }));
  const schemes: DemoState["schemes"] = cut.schemes.map((s) => ({
    id: s.id,
    name: s.name,
    active: s.active,
    effectiveFrom: s.effectiveFrom,
    version: s.version,
    tiers: s.tiers,
  }));
  const schemeAssignments: DemoSchemeAssignment[] = [];
  for (const a of cut.assignments) {
    const versions = cut.schemes.filter((s) => s.schemeId === a.schemeId);
    for (const [index, v] of versions.entries()) {
      const from =
        v.effectiveFrom > a.effectiveFrom ? v.effectiveFrom : a.effectiveFrom;
      const next = versions[index + 1];
      const until = next
        ? new Date(Date.parse(next.effectiveFrom) - 86400000)
            .toISOString()
            .slice(0, 10)
        : null;
      const end =
        until && (!a.effectiveTo || until < a.effectiveTo)
          ? until
          : a.effectiveTo;
      if (!end || end >= from)
        schemeAssignments.push({
          id: a.id + "-" + v.id,
          employeeId: a.employeeId,
          schemeId: v.id,
          effectiveFrom: from,
          effectiveTo: end,
          createdAt: from,
        });
    }
  }
  const employees: DemoEmployee[] = cut.employees.map((e) => {
    const category = categoryFor(e.position);
    const assignments = schemeAssignments.filter((a) => a.employeeId === e.id);
    const current = assignments
      .filter(
        (a) =>
          a.effectiveFrom <= openStart &&
          (!a.effectiveTo || a.effectiveTo >= openStart),
      )
      .at(-1);
    const observedPayrollPeriods = e.active
      ? null
      : cut.periods.filter((p) => {
          const here = (d: string) => d >= p.start && d <= p.finish;
          return (
            cut.lines.some(
              (l) =>
                l.employeeId === e.id &&
                cut.runs.some(
                  (r) => r.id === l.payrollRunId && r.periodStart === p.start,
                ),
            ) ||
            cut.sales.some((s) => s.employeeId === e.id && here(s.date)) ||
            cut.movements.some((m) => m.employeeId === e.id && here(m.date)) ||
            cut.loans.some(
              (l) =>
                l.employeeId === e.id &&
                l.installments.some(
                  (i) => i.start === p.start && i.status !== "CANCELED",
                ),
            )
          );
        });
    return {
      observedPayrollPeriods,
      id: e.id,
      name: e.name,
      position: e.position,
      category,
      branchId: e.branchId ?? "",
      costBranchIds: e.branchId ? [e.branchId] : [],
      monthlySalary: e.salary ?? 0,
      salaryPayrollModuleId: e.salary
        ? category === "SPECIALIST"
          ? "SPECIALIST"
          : "FIXED"
        : null,
      commissionPayrollModuleId: assignments.length ? "COMMISSION" : null,
      schemeId: current?.schemeId ?? null,
      roleId: "role-employee",
      bank: "PRUEBA",
      account: "",
      active: e.active,
      hireDate: "",
      terminationDate: null,
      socialCostRate: 0,
      isrCostRate: 0,
      ivaRate: 0,
      isrRetentionRate: 0,
      ivaRetentionRate: 0,
    };
  });
  const positions: DemoState["positions"] = [
    ...new Set(employees.map((e) => e.position)),
  ].map((name) => {
    const e = employees.find((x) => x.position === name)!;
    return {
      id: "puesto-" + name,
      name,
      category: e.category,
      salaryPayrollModuleId: e.salaryPayrollModuleId,
      commissionPayrollModuleId: e.commissionPayrollModuleId,
      defaultRoleId: "role-employee",
      active: true,
      createdAt: closedStart,
    };
  });
  const moduleFor = (employeeId: string, type?: string | null): Module => {
    if (type === "FIXED_SALARY") return "FIXED";
    if (type === "SPECIALIST") return "SPECIALIST";
    if (type === "COMMISSION" || type === "MANAGEMENT_COMMISSION")
      return "COMMISSION";
    const e = employees.find((x) => x.id === employeeId);
    return (
      e?.commissionPayrollModuleId ?? e?.salaryPayrollModuleId ?? "COMMISSION"
    );
  };
  const periodFor = (date: string) =>
    cut.periods.find((p) => date >= p.start && date <= p.finish)!.start;
  const runs: DemoState["runs"] = cut.periods.flatMap((p) =>
    config.payrollModules.map((m) => {
      const r = cut.runs.find((row) => row.periodStart === p.start);
      return {
        id: p.start + "-" + m.id,
        module: m.id,
        periodStart: p.start,
        periodEnd: p.finish,
        payDate: r?.payDate ?? p.finish,
        mode: r?.mode ?? "WITH_VAT",
        status: r?.status ?? "DRAFT",
        createdAt: capturedAt,
      };
    }),
  );
  // El operador existe únicamente para ensayar autorizaciones. Jamás participa en los importes.
  employees.push({
    id: operatorId,
    name: "OPERADOR DEL PILOTO",
    position: "OPERACIÓN DE PRUEBA",
    category: "MANAGEMENT",
    branchId: "",
    costBranchIds: [],
    monthlySalary: 0,
    salaryPayrollModuleId: null,
    commissionPayrollModuleId: null,
    schemeId: null,
    bank: "",
    account: "",
    roleId: "role-admin",
    active: false,
    hireDate: "9999-12-31",
    terminationDate: null,
    socialCostRate: 0,
    isrCostRate: 0,
    ivaRate: 0,
    isrRetentionRate: 0,
    ivaRetentionRate: 0,
    secondaryAccessKey: "0000",
  });
  const state: DemoState = {
    ...config,
    branches,
    positions,
    employees,
    schemes,
    schemeAssignments,
    salaryAssignments: [],
    commissionAssignments: [],
    sales: cut.sales,
    kioskTargets: [],
    kioskMonthlySales: [],
    branchCommissionSchemes: [],
    notificationTemplates: [],
    movements: [],
    adjustments: [],
    loans: [],
    viaticsEntries: [],
    viaticsConcepts: [],
    bonusFineConcepts: [],
    runs,
    periodConfigs: config.payrollModules.map((m) => ({
      id: m.id,
      module: m.id,
      frequency: "BIWEEKLY",
      periodStart: open.start,
      periodEnd: open.finish,
      cutoffDate: open.finish,
      active: true,
      label: open.start + " — " + open.finish,
      updatedAt: capturedAt,
    })),
    taxAssignments: [],
    periodTaxInclusions: [],
    doublePayDays: [],
    negativeBalances: [],
    terminationSettlements: [],
    christmasBonuses: [],
    christmasBonusPaymentPeriods: [],
    decisions: [],
    disbursementPayments: [],
    kioskReceiptDecisions: [],
    calculationMode:
      cut.runs.find((r) => r.periodStart === openStart)?.mode ?? "WITH_VAT",
    commissionModeOverrides: {},
    payrollCostAllocationModes: {},
    activeEmployeeId: operatorId,
    lastUpdatedAt: capturedAt,
  };
  for (const c of cut.catalog) {
    if (c.kind === "PER_DIEM")
      state.viaticsConcepts.push({
        id: c.id,
        name: c.name,
        effect: "ADD",
        maxAmount: c.defaultAmount,
        active: c.active,
      });
    else
      state.bonusFineConcepts.push({
        id: c.id,
        type: c.kind,
        name: c.name,
        mode: "FIXED",
        defaultAmount: c.defaultAmount,
        threshold: null,
        payrollModule: "COMMISSION",
        validFrom: closedStart,
        validUntil: null,
        active: c.active,
        createdAt: closedStart,
      });
  }
  for (const m of cut.movements) {
    const periodStart = periodFor(m.date),
      payrollModule = moduleFor(m.employeeId, m.payrollType),
      payrollRunId = periodStart + "-" + payrollModule;
    const costBranchIds = m.branchId ? [m.branchId] : [];
    if (m.kind === "BONUS" || m.kind === "FINE")
      state.movements.push({
        id: m.id,
        employeeId: m.employeeId,
        catalogId: m.catalogItemId,
        type: m.kind,
        mode: "FIXED",
        concept: m.concept,
        amount: m.amount,
        status: m.status,
        payrollModule,
        periodStart,
        costBranchIds,
        threshold: null,
        comments: "",
        appliedAt: m.date,
        createdAt: m.date,
      });
    else if (m.kind === "PER_DIEM") {
      const id = m.catalogItemId ?? "viatico-importado";
      if (!state.viaticsConcepts.some((c) => c.id === id))
        state.viaticsConcepts.push({
          id,
          name: "VIÁTICO",
          effect: "ADD",
          maxAmount: 0,
          active: true,
        });
      state.viaticsEntries.push({
        id: m.id,
        employeeId: m.employeeId,
        conceptId: id,
        branchId: m.branchId ?? "",
        requestedAt: m.date,
        amount: m.amount,
        comments: "",
        receiptName: "",
        status: m.status,
        payrollRunId,
        payrollModule,
        periodStart,
        createdAt: m.date,
      });
    } else
      state.adjustments.push({
        id: m.id,
        employeeId: m.employeeId,
        type: m.kind === "ADJUSTMENT_NEGATIVE" ? "MINUS" : "PLUS",
        participantIds: [m.employeeId],
        branchId: m.branchId ?? "",
        costBranchIds,
        payrollModule,
        payrollRunId,
        payrollDate: m.date,
        periodStart,
        reportTargets: ["PAYROLL", "CONSOLIDATED", "BRANCH_COST", "RECEIPT"],
        concept: m.concept,
        amount: m.amount,
        comments: "",
        status: m.status === "REJECTED" ? "CANCELLED" : m.status,
        createdAt: m.date,
      });
  }
  state.loans = cut.loans.map((l) => {
    const first = l.installments[0]?.start ?? openStart,
      payrollModule = moduleFor(l.employeeId);
    return {
      id: l.id,
      employeeId: l.employeeId,
      requestType: l.kind === "PAYROLL_ADVANCE" ? "ADVANCE" : "LOAN",
      payrollModule,
      payrollRunId: first + "-" + payrollModule,
      requestedAt: l.requestedAt,
      requestedAmount: l.requestedAmount,
      amount: l.requestedAmount,
      installments: l.installmentCount,
      sourceSchedule: l.installments,
      sourceBalance: l.balance,
      paidInstallments: l.installments.filter((i) => i.status === "PAID")
        .length,
      appliedPeriodStarts: l.installments
        .filter((i) => i.status === "PAID")
        .map((i) => i.start),
      firstPeriod: first,
      status:
        l.status === "LOST" || l.status === "CANCELED"
          ? "REJECTED"
          : "APPROVED",
      history: [],
      notes: "",
    };
  });
  return state;
}
