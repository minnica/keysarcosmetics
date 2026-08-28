import type {
  DemoBranchCommissionScheme,
  DemoKioskMonthlySale,
  DemoKioskTarget,
} from "./payroll-demo-context";

export interface BranchCommissionResolution {
  scheme: DemoBranchCommissionScheme | null;
  salesBase: number;
  branchSales: number;
  rate: number;
  commission: number;
  managerId: string | null;
  combined: boolean;
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year ?? 0, monthNumber ?? 1, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}

export function resolveBranchCommission({
  branchId,
  month,
  schemes,
  sales,
  fallbackTarget,
}: {
  branchId: string;
  month: string;
  schemes: DemoBranchCommissionScheme[];
  sales: DemoKioskMonthlySale[];
  fallbackTarget?: DemoKioskTarget | undefined;
}): BranchCommissionResolution {
  const cutoff = monthEnd(month);
  const scheme = schemes
    .filter((item) => item.active && item.branchIds.includes(branchId) && item.effectiveFrom <= cutoff)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  const branchSales = sales.find((item) => item.branchId === branchId && item.month === month)?.sales ?? 0;

  if (!scheme) {
    const rate = fallbackTarget && branchSales >= fallbackTarget.monthlyTarget ? fallbackTarget.commissionRate : 0;
    return {
      scheme: null,
      salesBase: branchSales,
      branchSales,
      rate,
      commission: branchSales * rate,
      managerId: fallbackTarget?.managerId ?? null,
      combined: false,
    };
  }

  const combined = scheme.scope === "ALL_COMBINED" || scheme.branchIds.length > 1;
  const salesBase = combined
    ? sales.filter((item) => item.month === month && scheme.branchIds.includes(item.branchId)).reduce((sum, item) => sum + item.sales, 0)
    : branchSales;
  const tier = scheme.tiers.find((item) => salesBase >= item.from && (item.to === null || salesBase <= item.to));
  const rate = tier?.rate ?? 0;

  return {
    scheme,
    salesBase,
    branchSales,
    rate,
    commission: branchSales * rate,
    managerId: scheme.managerId ?? fallbackTarget?.managerId ?? null,
    combined,
  };
}
