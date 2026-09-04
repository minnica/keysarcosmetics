"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Search } from "lucide-react";
import { Badge, Button, Input, Popover, PopoverContent, PopoverTrigger } from "@cosmetics/ui";
import type { DemoBranch, DemoEmployee, DemoSale, PayrollCostAllocationMode } from "./payroll-demo-context";

export function employeeCostBranchIds(employee: Pick<DemoEmployee, "branchId" | "costBranchIds">, branches: DemoBranch[]) {
  const requested = employee.costBranchIds.length > 0 ? employee.costBranchIds : [employee.branchId];
  return Array.from(new Set(requested)).filter((branchId) => branches.some((branch) => branch.id === branchId));
}

export function payrollCostAllocationMode(
  modes: Record<string, PayrollCostAllocationMode>,
  employeeId: string,
  periodStart: string,
  periodEnd: string,
): PayrollCostAllocationMode {
  const exact = modes[`${periodStart}:${employeeId}`];
  if (exact) return exact;
  const periodMatch = Object.entries(modes)
    .filter(([key]) => key.endsWith(`:${employeeId}`) && key.slice(0, 10) >= periodStart && key.slice(0, 10) <= periodEnd)
    .sort(([left], [right]) => right.localeCompare(left))[0];
  return periodMatch?.[1] ?? "EQUAL";
}

export function employeeCostAllocationShares({
  employee,
  branches,
  sales,
  periodStart,
  periodEnd,
  mode,
}: {
  employee: Pick<DemoEmployee, "id" | "branchId" | "costBranchIds">;
  branches: DemoBranch[];
  sales: DemoSale[];
  periodStart: string;
  periodEnd: string;
  mode: PayrollCostAllocationMode;
}) {
  const salesByBranch = sales
    .filter((sale) => sale.employeeId === employee.id && sale.date >= periodStart && sale.date <= periodEnd)
    .reduce<Record<string, number>>((totals, sale) => ({ ...totals, [sale.branchId]: (totals[sale.branchId] ?? 0) + sale.amount }), {});
  const saleBranchIds = Object.keys(salesByBranch).filter((branchId) => branches.some((branch) => branch.id === branchId));
  const branchIds = saleBranchIds.length > 1 ? saleBranchIds : employeeCostBranchIds(employee, branches);
  const totalSales = branchIds.reduce((sum, branchId) => sum + (salesByBranch[branchId] ?? 0), 0);
  return branchIds.map((branchId) => ({
    branchId,
    sales: salesByBranch[branchId] ?? 0,
    share: mode === "SALES_SHARE" && totalSales > 0
      ? (salesByBranch[branchId] ?? 0) / totalSales
      : 1 / Math.max(branchIds.length, 1),
  }));
}

export function CostBranchSelector({
  branches,
  selectedIds,
  onChange,
  compact = false,
}: {
  branches: DemoBranch[];
  selectedIds: string[];
  onChange: (branchIds: string[]) => void;
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const validSelectedIds = selectedIds.filter((branchId) => branches.some((branch) => branch.id === branchId));
  const allSelected = branches.length > 0 && validSelectedIds.length === branches.length;
  const label = allSelected
    ? `TODAS · ${branches.length}`
    : validSelectedIds.length === 1
      ? branches.find((branch) => branch.id === validSelectedIds[0])?.name ?? "1 SUCURSAL"
      : `${validSelectedIds.length} SUCURSALES`;
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const visibleBranches = useMemo(() => branches.filter((branch) =>
    !normalizedSearch || `${branch.name} ${branch.city}`.toLocaleLowerCase("es-MX").includes(normalizedSearch),
  ), [branches, normalizedSearch]);

  function toggleBranch(branchId: string) {
    if (validSelectedIds.includes(branchId)) {
      if (validSelectedIds.length === 1) return;
      onChange(validSelectedIds.filter((id) => id !== branchId));
      return;
    }
    onChange([...validSelectedIds, branchId]);
  }

  return (
    <Popover onOpenChange={(open) => { if (!open) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className={`w-full justify-between rounded-lg px-2.5 font-normal ${compact ? "h-8 text-[10px]" : "h-10 text-xs"}`}>
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-[#987049]" />
            <span className="truncate font-semibold">{label}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[color:var(--text-muted)]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(390px,calc(100vw-32px))] overflow-hidden rounded-2xl border-[color:var(--border-color)] p-0 shadow-xl">
        <div className="border-b border-[color:var(--border-color)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold">Distribuir costo</p>
              <p className="mt-0.5 text-[10px] leading-4 text-[color:var(--text-muted)]">Sueldo, costo social e ISR se dividen en partes iguales.</p>
            </div>
            <Badge variant="outline" className="shrink-0 text-[8px]">{validSelectedIds.length} / {branches.length}</Badge>
          </div>
          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 pl-8 text-[10px]" placeholder="BUSCAR SUCURSAL O CIUDAD" aria-label="Buscar sucursal de costo" />
          </div>
          <button type="button" onClick={() => onChange(branches.map((branch) => branch.id))} className={`mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold transition-colors ${allSelected ? "bg-[#c3a583]/15 text-[#7d5b39]" : "hover:bg-[color:var(--accent-hover)]/35"}`}>
            <span className={`flex h-4 w-4 items-center justify-center rounded border ${allSelected ? "border-[#9a744c] bg-[#9a744c] text-white" : "border-[color:var(--border-color)]"}`}>{allSelected && <Check className="h-3 w-3" />}</span>
            TODAS LAS SUCURSALES · REPARTO EQUITATIVO
          </button>
        </div>
        <div className="max-h-56 overflow-y-auto p-1.5">
          {visibleBranches.map((branch) => {
            const selected = validSelectedIds.includes(branch.id);
            return (
              <button key={branch.id} type="button" onClick={() => toggleBranch(branch.id)} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${selected ? "bg-[color:var(--accent-hover)]/55" : "hover:bg-[color:var(--accent-hover)]/25"}`}>
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-[#9a744c] bg-[#9a744c] text-white" : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"}`}>{selected && <Check className="h-3 w-3" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{branch.name}</span><span className="block truncate text-[9px] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">{branch.city}</span></span>
                <span className="text-[8px] font-semibold text-[color:var(--text-muted)]">{selected ? `${(100 / validSelectedIds.length).toFixed(0)}%` : "—"}</span>
              </button>
            );
          })}
          {visibleBranches.length === 0 && <div className="px-3 py-8 text-center text-xs text-[color:var(--text-muted)]">Sin coincidencias</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
