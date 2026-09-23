"use client";

import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpAZ,
  ArrowUpNarrowWide,
  ChevronsUpDown,
} from "lucide-react";
import { TableHead } from "@cosmetics/ui";

export type TableSortDirection = "asc" | "desc";
export type TableSortKind = "text" | "number";
export type TableSortState<Key extends string> = {
  key: Key;
  direction: TableSortDirection;
} | null;

type SortValue = string | number | null | undefined;

export function nextTableSort<Key extends string>(
  current: TableSortState<Key>,
  key: Key,
  kind: TableSortKind,
): TableSortState<Key> {
  if (current?.key !== key) {
    return { key, direction: kind === "number" ? "desc" : "asc" };
  }
  return {
    key,
    direction: current.direction === "asc" ? "desc" : "asc",
  };
}

export function sortTableRows<T, Key extends string>(
  rows: readonly T[],
  sort: TableSortState<Key>,
  accessors: Record<Key, (row: T) => SortValue>,
): T[] {
  if (!sort) return [...rows];
  const accessor = accessors[sort.key];
  const direction = sort.direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = accessor(left.row);
      const rightValue = accessor(right.row);
      const leftEmpty = leftValue === null || leftValue === undefined;
      const rightEmpty = rightValue === null || rightValue === undefined;
      if (leftEmpty !== rightEmpty) return leftEmpty ? 1 : -1;
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        const difference = (leftValue - rightValue) * direction;
        return difference || left.index - right.index;
      }
      const difference = String(leftValue ?? "").localeCompare(
        String(rightValue ?? ""),
        "es-MX",
        { sensitivity: "base", numeric: true },
      );
      return difference * direction || left.index - right.index;
    })
    .map(({ row }) => row);
}

export function SortableTableHead<Key extends string>({
  column,
  label,
  kind,
  sort,
  onSort,
  align = "left",
  className = "",
}: {
  column: Key;
  label: string;
  kind: TableSortKind;
  sort: TableSortState<Key>;
  onSort: (key: Key, kind: TableSortKind) => void;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const active = sort?.key === column;
  const direction = active ? sort.direction : null;
  const Icon = !active
    ? ChevronsUpDown
    : kind === "text"
      ? direction === "asc"
        ? ArrowDownAZ
        : ArrowUpAZ
      : direction === "desc"
        ? ArrowDownWideNarrow
        : ArrowUpNarrowWide;
  const alignment =
    align === "right"
      ? "justify-end text-right"
      : align === "center"
        ? "justify-center text-center"
        : "justify-start text-left";
  const ariaSort = active
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <TableHead aria-sort={ariaSort} className={className}>
      <button
        type="button"
        onClick={() => onSort(column, kind)}
        className={`flex w-full items-center gap-1.5 rounded-sm py-1 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c] ${alignment} ${active ? "text-[#f1c99e]" : ""}`}
        title={`${label}: ${kind === "text" ? "ordenar A–Z o Z–A" : "ordenar de mayor a menor o de menor a mayor"}`}
      >
        <span>{label}</span>
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${active ? "opacity-100" : "opacity-45"}`}
          aria-hidden="true"
        />
      </button>
    </TableHead>
  );
}
