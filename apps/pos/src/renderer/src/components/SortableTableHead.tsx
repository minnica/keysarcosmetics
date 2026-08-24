import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { TableHead } from "@cosmetics/ui";

export type TableSortDirection = "ASC" | "DESC";

interface SortableTableHeadProps {
  label: string;
  active: boolean;
  direction: TableSortDirection;
  onSort: () => void;
}

export function SortableTableHead({
  label,
  active,
  direction,
  onSort,
}: SortableTableHeadProps) {
  const Icon = active
    ? direction === "ASC"
      ? ChevronUp
      : ChevronDown
    : ArrowUpDown;

  return (
    <TableHead
      aria-sort={
        active ? (direction === "ASC" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        className={`table-sort-button${active ? " is-active" : ""}`}
        onClick={onSort}
        aria-label={`Ordenar por ${label} ${
          active && direction === "ASC" ? "descendente" : "ascendente"
        }`}
      >
        <span>{label}</span>
        <Icon size={13} aria-hidden="true" />
      </button>
    </TableHead>
  );
}

export function compareTableValues(
  left: string | number,
  right: string | number,
) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), "es-MX", {
    numeric: true,
    sensitivity: "base",
  });
}
