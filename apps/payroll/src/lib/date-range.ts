import type { DateRange } from "@cosmetics/ui";
import { formatDate } from "@/lib/format";

export const EMPTY_DATE_RANGE: DateRange = { from: "", to: "" };

export function isDateInRange(date: string, range: DateRange): boolean {
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}

export function describeDateRange(range: DateRange): string {
  if (range.from && range.to) {
    if (range.from === range.to) return `Fecha: ${formatDate(range.from)}`;
    return `Periodo: ${formatDate(range.from)} al ${formatDate(range.to)}`;
  }
  if (range.from) return `Desde: ${formatDate(range.from)}`;
  if (range.to) return `Hasta: ${formatDate(range.to)}`;
  return "Todos los registros disponibles";
}

export function dateRangeFilename(range: DateRange): string {
  if (range.from && range.to) return `${range.from}-${range.to}`;
  if (range.from) return `desde-${range.from}`;
  if (range.to) return `hasta-${range.to}`;
  return "todos";
}
