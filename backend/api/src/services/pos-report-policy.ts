import type { PosReportCell } from "@cosmetics/types";
import { resolveRequestedBranchIds } from "./pos-scope";

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

/** El reporte usa la unión exacta ya resuelta por la política central. */
export function resolvePosReportBranchScope(input: {
  authorizedBranchIds: string[];
  requestedBranchIds: string[];
}): string[] {
  return resolveRequestedBranchIds(input);
}
