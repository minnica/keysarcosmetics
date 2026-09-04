import type { PosReportCell } from "@cosmetics/types";

export type PosReportRow = Record<string, PosReportCell>;

const protectedColumn = /costo|utilidad|margen|valor inventario/i;

/** Defensa final para impedir que una consulta agregue costos por accidente. */
export function redactPosReportCosts(
  row: PosReportRow,
  costsAllowed: boolean,
): PosReportRow {
  if (costsAllowed) return row;
  return Object.fromEntries(
    Object.entries(row).filter(([column]) => !protectedColumn.test(column)),
  );
}

/** REPORTS_VIEW no amplía por sí solo la sucursal fija de la terminal. */
export function resolvePosReportBranchScope(input: {
  isMaster: boolean;
  terminalBranchId: string;
  requestedBranchIds: string[];
  activeBranchIds: string[];
}): string[] {
  if (!input.isMaster) return [input.terminalBranchId];
  if (input.requestedBranchIds.length === 0) return input.activeBranchIds;
  const active = new Set(input.activeBranchIds);
  if (input.requestedBranchIds.some((branchId) => !active.has(branchId))) {
    throw new Error("La consulta incluye sucursales inválidas");
  }
  return [...new Set(input.requestedBranchIds)];
}
