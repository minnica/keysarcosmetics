"use client";

import type { CellObject } from "xlsx";
import type { UserOptions } from "jspdf-autotable";

export type ExportCellValue = string | number | null | undefined;

export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => ExportCellValue;
  width?: number;
  format?: "text" | "number" | "currency" | "percent";
};

export type ReportExportConfig<T> = {
  title: string;
  subtitle?: string;
  filename: string;
  sheetName: string;
  orientation?: "portrait" | "landscape";
  columns: ExportColumn<T>[];
  rows: T[];
  footerRow?: T;
  summarySection?: {
    title: string;
    sheetName?: string;
    labelHeader: string;
    valueHeader: string;
    rows: Array<{ label: string; value: number }>;
    totalLabel: string;
    total: number;
  };
};

function sanitizeFilename(filename: string): string {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function uppercase(value: string): string {
  return value.toLocaleUpperCase("es-MX");
}

function sanitizeSheetName(sheetName: string): string {
  return (
    sheetName
      .replace(/[\\/?*\[\]:]+/g, " ")
      .trim()
      .slice(0, 31) || "Reporte"
  );
}

function formatForDisplay<T>(
  column: ExportColumn<T>,
  value: ExportCellValue,
): string {
  if (value === null || value === undefined || value === "") return "—";

  if (column.format === "currency" && typeof value === "number") {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(value);
  }

  if (column.format === "percent" && typeof value === "number")
    return `${value.toFixed(2)}%`;
  if (column.format === "number" && typeof value === "number")
    return new Intl.NumberFormat("es-MX").format(value);
  return uppercase(String(value));
}

function toExcelCell<T>(
  column: ExportColumn<T>,
  value: ExportCellValue,
): CellObject {
  if (value === null || value === undefined || value === "")
    return { t: "s", v: "—" };
  if (column.format === "currency" && typeof value === "number")
    return { t: "n", v: value, z: "$#,##0.00" };
  if (column.format === "percent" && typeof value === "number")
    return { t: "n", v: value / 100, z: "0.00%" };
  if (column.format === "number" && typeof value === "number")
    return { t: "n", v: value, z: "#,##0" };
  return { t: "s", v: uppercase(String(value)) };
}

export async function exportReportToExcel<T>(
  config: ReportExportConfig<T>,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const titleRows = [
    [config.title],
    ...(config.subtitle ? [[config.subtitle]] : []),
  ];
  const bodyRows = config.rows.map((row) =>
    config.columns.map((column) => toExcelCell(column, column.accessor(row))),
  );
  const footerRows = config.footerRow
    ? [
        config.columns.map((column) =>
          toExcelCell(column, column.accessor(config.footerRow as T)),
        ),
      ]
    : [];
  const sheet = XLSX.utils.aoa_to_sheet([
    ...titleRows,
    [],
    config.columns.map((column) => uppercase(column.header)),
    ...bodyRows,
    ...footerRows,
  ]);

  const headerRowIndex = titleRows.length + 1;
  sheet["!cols"] = config.columns.map((column) => ({
    wch: Math.max(column.header.length, column.width ?? 12),
  }));
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: 0 },
      e: {
        r: headerRowIndex + bodyRows.length + footerRows.length,
        c: Math.max(config.columns.length - 1, 0),
      },
    }),
  };

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    sanitizeSheetName(config.sheetName),
  );
  if (config.summarySection) {
    const summary = config.summarySection;
    const summarySheet = XLSX.utils.aoa_to_sheet([
      [uppercase(summary.title)],
      [],
      [uppercase(summary.labelHeader), uppercase(summary.valueHeader)],
      ...summary.rows.map((row) => [
        uppercase(row.label),
        { t: "n", v: row.value, z: "$#,##0.00" } satisfies CellObject,
      ]),
      [
        uppercase(summary.totalLabel),
        { t: "n", v: summary.total, z: "$#,##0.00" } satisfies CellObject,
      ],
    ]);
    summarySheet["!cols"] = [{ wch: 32 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      sanitizeSheetName(summary.sheetName ?? "Por puesto"),
    );
  }
  XLSX.writeFile(workbook, `${sanitizeFilename(config.filename)}.xlsx`);
}

export async function exportReportToPdf<T>(
  config: ReportExportConfig<T>,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({
    orientation: config.orientation ?? "landscape",
    unit: "pt",
    format: "a4",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(config.title, 40, 32);
  if (config.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(config.subtitle, 40, 48);
  }

  const options: UserOptions = {
    startY: config.subtitle ? 60 : 44,
    head: [config.columns.map((column) => uppercase(column.header))],
    body: config.rows.map((row) =>
      config.columns.map((column) =>
        formatForDisplay(column, column.accessor(row)),
      ),
    ),
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [100, 134, 114],
      textColor: 255,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [236, 240, 238],
      textColor: 20,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [249, 250, 249] },
    margin: { top: 72, left: 32, right: 32, bottom: 32 },
    tableWidth: "auto",
  };

  if (config.footerRow) {
    options.foot = [
      config.columns.map((column) =>
        formatForDisplay(column, column.accessor(config.footerRow as T)),
      ),
    ];
  }

  autoTable(doc, options);
  if (config.summarySection) {
    const summary = config.summarySection;
    const finalY =
      (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ??
      (typeof options.startY === "number" ? options.startY : 44);
    const summaryStartY = finalY + 24;
    if (summaryStartY > doc.internal.pageSize.getHeight() - 100) doc.addPage();
    const y =
      summaryStartY > doc.internal.pageSize.getHeight() - 100
        ? 40
        : summaryStartY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(uppercase(summary.title), 40, y);
    autoTable(doc, {
      startY: y + 10,
      head: [[uppercase(summary.labelHeader), uppercase(summary.valueHeader)]],
      body: [
        ...summary.rows.map((row) => [
          uppercase(row.label),
          formatForDisplay(
            { header: summary.valueHeader, accessor: () => row.value, format: "currency" },
            row.value,
          ),
        ]),
        [
          uppercase(summary.totalLabel),
          formatForDisplay(
            { header: summary.valueHeader, accessor: () => summary.total, format: "currency" },
            summary.total,
          ),
        ],
      ],
      theme: "striped",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [100, 134, 114], textColor: 255 },
      columnStyles: { 1: { halign: "right" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === summary.rows.length)
          data.cell.styles.fontStyle = "bold";
      },
      margin: { left: 40, right: 40 },
    });
  }
  doc.save(`${sanitizeFilename(config.filename)}.pdf`);
}
