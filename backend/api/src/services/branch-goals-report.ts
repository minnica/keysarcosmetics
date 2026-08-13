export interface BranchGoalBranch {
  id: string;
  nombre: string;
  metaMensual: number;
}

export interface BranchGoalSaleRow {
  fecha: string;
  sucursalId: string;
  sucursalNombre: string;
  metaMensual: number;
  total: number;
}

export interface BranchGoalPeriodAmount {
  sucursalId: string;
  sucursalNombre: string;
  total: number;
}

export interface BranchGoalPeriodRow {
  id: string;
  startDate: string;
  endDate: string;
  weekNumber: number | null;
  porSucursal: BranchGoalPeriodAmount[];
  total: number;
}

export interface BranchGoalsReport {
  referenceDate: string;
  monthStart: string;
  monthEnd: string;
  weeksInMonth: number;
  daysRemainingInMonth: number;
  daysRemainingInCurrentWeek: number;
  currentWeekNumber: number | null;
  branches: BranchGoalBranch[];
  monthlyRows: BranchGoalPeriodRow[];
  weeklyRows: BranchGoalPeriodRow[];
}

const DAY_MS = 86_400_000;

function parseISODate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Fecha inválida: ${value}`);
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

function periodAmounts(
  branches: BranchGoalBranch[],
  totals: Map<string, number>,
): BranchGoalPeriodAmount[] {
  return branches.map((branch) => ({
    sucursalId: branch.id,
    sucursalNombre: branch.nombre,
    total: totals.get(branch.id) ?? 0,
  }));
}

function periodTotal(amounts: BranchGoalPeriodAmount[]): number {
  return amounts.reduce((sum, amount) => sum + amount.total, 0);
}

export function mexicoCityDateISO(reference = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values["year"]}-${values["month"]}-${values["day"]}`;
}

export function buildBranchGoalsReport(
  referenceDate: string,
  catalogBranches: BranchGoalBranch[],
  salesRows: BranchGoalSaleRow[],
): BranchGoalsReport {
  const reference = parseISODate(referenceDate);
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));

  const branchMap = new Map(
    catalogBranches.map((branch) => [branch.id, branch] as const),
  );
  salesRows.forEach((row) => {
    if (!branchMap.has(row.sucursalId)) {
      branchMap.set(row.sucursalId, {
        id: row.sucursalId,
        nombre: row.sucursalNombre,
        metaMensual: row.metaMensual,
      });
    }
  });
  const branches = [...branchMap.values()].sort((left, right) =>
    left.nombre.localeCompare(right.nombre, "es"),
  );

  const totalsByDate = new Map<string, Map<string, number>>();
  salesRows.forEach((row) => {
    const dayTotals = totalsByDate.get(row.fecha) ?? new Map<string, number>();
    dayTotals.set(
      row.sucursalId,
      (dayTotals.get(row.sucursalId) ?? 0) + row.total,
    );
    totalsByDate.set(row.fecha, dayTotals);
  });

  const monthlyRows: BranchGoalPeriodRow[] = [];
  for (let day = monthStart; day <= reference; day = addDays(day, 1)) {
    const date = toISODate(day);
    const porSucursal = periodAmounts(
      branches,
      totalsByDate.get(date) ?? new Map<string, number>(),
    );
    monthlyRows.push({
      id: date,
      startDate: date,
      endDate: date,
      weekNumber: null,
      porSucursal,
      total: periodTotal(porSucursal),
    });
  }

  const daysUntilFirstMonday = (8 - monthStart.getUTCDay()) % 7;
  const firstMonday = addDays(monthStart, daysUntilFirstMonday);
  const weekStarts: Date[] = [];
  for (
    let weekStart = firstMonday;
    weekStart <= monthEnd;
    weekStart = addDays(weekStart, 7)
  ) {
    weekStarts.push(weekStart);
  }

  const weeklyRows = weekStarts
    .filter((weekStart) => weekStart <= reference)
    .map((weekStart, index): BranchGoalPeriodRow => {
      const weekEnd = addDays(weekStart, 6);
      const totals = new Map<string, number>();
      const salesEnd = weekEnd < reference ? weekEnd : reference;

      for (let day = weekStart; day <= salesEnd; day = addDays(day, 1)) {
        const dayTotals = totalsByDate.get(toISODate(day));
        dayTotals?.forEach((amount, branchId) => {
          totals.set(branchId, (totals.get(branchId) ?? 0) + amount);
        });
      }

      const porSucursal = periodAmounts(branches, totals);
      return {
        id: `week-${index + 1}`,
        startDate: toISODate(weekStart),
        endDate: toISODate(weekEnd),
        weekNumber: index + 1,
        porSucursal,
        total: periodTotal(porSucursal),
      };
    });

  const currentWeek = weeklyRows.find(
    (row) =>
      parseISODate(row.startDate) <= reference &&
      reference <= parseISODate(row.endDate),
  );

  return {
    referenceDate,
    monthStart: toISODate(monthStart),
    monthEnd: toISODate(monthEnd),
    weeksInMonth: weekStarts.length,
    daysRemainingInMonth: daysBetween(reference, monthEnd),
    daysRemainingInCurrentWeek: currentWeek
      ? daysBetween(reference, parseISODate(currentWeek.endDate))
      : 0,
    currentWeekNumber: currentWeek?.weekNumber ?? null,
    branches,
    monthlyRows,
    weeklyRows,
  };
}
