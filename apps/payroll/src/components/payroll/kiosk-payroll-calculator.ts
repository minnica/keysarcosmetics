import {
  effectiveTaxInclusionForRange,
  type DemoBranch,
  type DemoEmployee,
  type DemoKioskTarget,
  type DemoState,
} from "./payroll-demo-context";
import {
  resolveBranchCommission,
  type BranchCommissionResolution,
} from "./branch-commission-calculator";

export interface KioskBranchPayrollRow {
  target: DemoKioskTarget;
  branch: DemoBranch | undefined;
  manager: DemoEmployee | undefined;
  resolution: BranchCommissionResolution;
  sales: number;
  transactions: number;
  achievement: number;
  commission: number;
  socialCost: number;
  isr: number;
  totalCost: number;
}

export interface KioskManagerPayrollRow {
  manager: DemoEmployee;
  branchIds: string[];
  branchNames: string[];
  schemeNames: string[];
  sales: number;
  target: number;
  transactions: number;
  rate: number;
  commission: number;
  socialCost: number;
  isr: number;
  totalCost: number;
}

export function kioskMonthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(
    Date.UTC(year ?? 0, monthNumber ?? 1, 0),
  ).getUTCDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function employeeTaxAmount({
  base,
  enabled,
  mode,
  value,
  fallbackRate,
}: {
  base: number;
  enabled: boolean;
  mode: "PERCENTAGE" | "FIXED" | undefined;
  value: number | undefined;
  fallbackRate: number;
}) {
  if (!enabled || base <= 0) return 0;
  if (mode === "FIXED") return Math.max(value ?? 0, 0);
  return base * Math.max(value ?? fallbackRate, 0);
}

export function kioskPayrollForMonth(state: DemoState, month: string) {
  const bounds = kioskMonthBounds(month);
  const taxInclusion = effectiveTaxInclusionForRange(
    state.periodTaxInclusions,
    bounds.start,
    bounds.end,
    "KIOSK_COMMISSION",
  );
  const branchById = new Map(
    state.branches.map((branch) => [branch.id, branch]),
  );
  const employeeById = new Map(
    state.employees.map((employee) => [employee.id, employee]),
  );
  const saleByBranch = new Map(
    state.kioskMonthlySales
      .filter((sale) => sale.month === month)
      .map((sale) => [sale.branchId, sale]),
  );

  const rawBranchRows = state.kioskTargets.map((target) => {
    const resolution = resolveBranchCommission({
      branchId: target.branchId,
      month,
      schemes: state.branchCommissionSchemes,
      sales: state.kioskMonthlySales,
      fallbackTarget: target,
    });
    const sale = saleByBranch.get(target.branchId);
    return {
      target,
      branch: branchById.get(target.branchId),
      manager: resolution.managerId
        ? employeeById.get(resolution.managerId)
        : undefined,
      resolution,
      sales: sale?.sales ?? 0,
      transactions: sale?.transactions ?? 0,
      achievement:
        target.monthlyTarget > 0
          ? (sale?.sales ?? 0) / target.monthlyTarget
          : 0,
      commission: resolution.commission,
    };
  });

  const managerAccumulators = new Map<
    string,
    {
      manager: DemoEmployee;
      branchIds: Set<string>;
      branchNames: Set<string>;
      schemeNames: Set<string>;
      sales: number;
      target: number;
      transactions: number;
      commission: number;
    }
  >();

  rawBranchRows.forEach((row) => {
    if (!row.manager) return;
    const current = managerAccumulators.get(row.manager.id) ?? {
      manager: row.manager,
      branchIds: new Set<string>(),
      branchNames: new Set<string>(),
      schemeNames: new Set<string>(),
      sales: 0,
      target: 0,
      transactions: 0,
      commission: 0,
    };
    current.branchIds.add(row.target.branchId);
    current.branchNames.add(row.branch?.name ?? "SIN SUCURSAL");
    current.schemeNames.add(row.resolution.scheme?.name ?? "META INDIVIDUAL");
    current.sales += row.sales;
    current.target += row.target.monthlyTarget;
    current.transactions += row.transactions;
    current.commission += row.commission;
    managerAccumulators.set(row.manager.id, current);
  });

  const managerRows = Array.from(managerAccumulators.values())
    .map((row): KioskManagerPayrollRow => {
      const assignment = state.taxAssignments.find(
        (item) =>
          item.payrollModule === "KIOSK_COMMISSION" &&
          item.employeeId === row.manager.id,
      );
      const socialCost = employeeTaxAmount({
        base: row.commission,
        enabled:
          taxInclusion.includeSocialCost &&
          assignment?.socialCostEnabled !== false,
        mode: assignment?.socialCostMode,
        value: assignment?.socialCostValue,
        fallbackRate: row.manager.socialCostRate,
      });
      const isr = employeeTaxAmount({
        base: row.commission,
        enabled:
          taxInclusion.includeIsr && assignment?.isrCostEnabled !== false,
        mode: assignment?.isrCostMode,
        value: assignment?.isrCostValue,
        fallbackRate: row.manager.isrCostRate,
      });
      return {
        manager: row.manager,
        branchIds: Array.from(row.branchIds),
        branchNames: Array.from(row.branchNames),
        schemeNames: Array.from(row.schemeNames),
        sales: row.sales,
        target: row.target,
        transactions: row.transactions,
        rate: row.sales > 0 ? row.commission / row.sales : 0,
        commission: row.commission,
        socialCost,
        isr,
        totalCost: row.commission + socialCost + isr,
      };
    })
    .sort((left, right) =>
      left.manager.name.localeCompare(right.manager.name, "es-MX"),
    );
  const managerById = new Map(managerRows.map((row) => [row.manager.id, row]));

  const branchRows: KioskBranchPayrollRow[] = rawBranchRows.map((row) => {
    const managerRow = row.manager
      ? managerById.get(row.manager.id)
      : undefined;
    const share =
      managerRow && managerRow.commission > 0
        ? row.commission / managerRow.commission
        : 0;
    const socialCost = (managerRow?.socialCost ?? 0) * share;
    const isr = (managerRow?.isr ?? 0) * share;
    return {
      ...row,
      socialCost,
      isr,
      totalCost: row.commission + socialCost + isr,
    };
  });

  return {
    bounds,
    taxInclusion,
    branchRows,
    managerRows,
    totals: managerRows.reduce(
      (total, row) => ({
        commission: total.commission + row.commission,
        socialCost: total.socialCost + row.socialCost,
        isr: total.isr + row.isr,
        totalCost: total.totalCost + row.totalCost,
      }),
      { commission: 0, socialCost: 0, isr: 0, totalCost: 0 },
    ),
  };
}
