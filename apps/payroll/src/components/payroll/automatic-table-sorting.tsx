"use client";

import { useEffect } from "react";

type SortDirection = "asc" | "desc";

const excludedHeader =
  /^(ACCIONES?|SELECCIONAR|VER|DETALLE|OPCIONES?|EDITAR|ELIMINAR)$/i;
const summaryRow = /^(TOTAL(?:ES)?|SUMA|SUBTOTAL|RESUMEN)\b/i;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function comparableNumber(value: string): number | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const timestamp = Date.parse(`${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`);
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  const localDate = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (localDate) {
    const day = localDate[1];
    const month = localDate[2];
    const year = localDate[3];
    if (!day || !month || !year) return null;
    const timestamp = Date.parse(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    );
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (!/[$%\d]/.test(normalized)) return null;
  const negative = normalized.includes("−") || /^\s*-/.test(normalized);
  const cleaned = normalized
    .replace(/[−–—]/g, "-")
    .replace(/[^\d.,-]/g, "")
    .replace(/,/g, "");
  if (!cleaned || cleaned === "-") return null;
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) return null;
  return negative && parsed > 0 ? -parsed : parsed;
}

function rowIsSummary(row: HTMLTableRowElement) {
  return summaryRow.test(normalizeText(row.cells[0]?.innerText ?? ""));
}

function decorateTableHeaders(root: ParentNode) {
  root
    .querySelectorAll<HTMLTableCellElement>("table thead th")
    .forEach((header) => {
      if (header.dataset.autoSortable !== undefined) return;
      const label = normalizeText(header.innerText);
      const containsControl = Boolean(
        header.querySelector("button, a, input, select, textarea"),
      );
      const enabled =
        Boolean(label) && !containsControl && !excludedHeader.test(label);
      header.dataset.autoSortable = enabled ? "true" : "false";
      if (!enabled) return;
      header.tabIndex = 0;
      header.setAttribute("aria-sort", "none");
      header.title = `${label}: ordenar A–Z, Z–A, mayor a menor o menor a mayor`;
    });
}

function sortFromHeader(header: HTMLTableCellElement) {
  const table = header.closest("table");
  const headerRow = header.parentElement;
  if (!table || !headerRow) return;
  const columnIndex = Array.from(headerRow.children).indexOf(header);
  if (columnIndex < 0) return;

  const bodies = Array.from(table.tBodies);
  const candidateRows = bodies.flatMap((body) =>
    Array.from(body.rows).filter(
      (row) => row.cells.length > columnIndex && !rowIsSummary(row),
    ),
  );
  if (candidateRows.length < 2) return;

  const values = candidateRows.map((row) =>
    normalizeText(row.cells[columnIndex]?.innerText ?? ""),
  );
  const numericValues = values.map(comparableNumber);
  const numeric =
    numericValues.filter((value) => value !== null).length >=
    Math.ceil(values.length * 0.7);
  const currentDirection = header.dataset.autoSortDirection as
    | SortDirection
    | undefined;
  const direction: SortDirection = currentDirection
    ? currentDirection === "asc"
      ? "desc"
      : "asc"
    : numeric
      ? "desc"
      : "asc";

  table
    .querySelectorAll<HTMLTableCellElement>(
      'thead th[data-auto-sortable="true"]',
    )
    .forEach((item) => {
      if (item !== header) delete item.dataset.autoSortDirection;
      item.setAttribute(
        "aria-sort",
        item === header
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : "none",
      );
    });
  header.dataset.autoSortDirection = direction;

  bodies.forEach((body) => {
    const rows = Array.from(body.rows);
    const movable = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.cells.length > columnIndex && !rowIsSummary(row));
    const fixed = rows.filter(
      (row) => row.cells.length <= columnIndex || rowIsSummary(row),
    );
    movable.sort((left, right) => {
      const leftText = normalizeText(
        left.row.cells[columnIndex]?.innerText ?? "",
      );
      const rightText = normalizeText(
        right.row.cells[columnIndex]?.innerText ?? "",
      );
      const leftNumber = comparableNumber(leftText);
      const rightNumber = comparableNumber(rightText);
      const comparison =
        numeric && leftNumber !== null && rightNumber !== null
          ? leftNumber - rightNumber
          : leftText.localeCompare(rightText, "es-MX", {
              sensitivity: "base",
              numeric: true,
            });
      return (
        (direction === "asc" ? comparison : -comparison) ||
        left.index - right.index
      );
    });
    body.append(...movable.map(({ row }) => row), ...fixed);
  });
}

export function AutomaticTableSorting() {
  useEffect(() => {
    decorateTableHeaders(document);

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const header = target.closest<HTMLTableCellElement>(
        'th[data-auto-sortable="true"]',
      );
      if (header) sortFromHeader(header);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof HTMLTableCellElement)) return;
      if (target.dataset.autoSortable !== "true") return;
      event.preventDefault();
      sortFromHeader(target);
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) decorateTableHeaders(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
