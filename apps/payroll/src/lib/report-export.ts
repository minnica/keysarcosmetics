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
      .replace(/[\\/?*[\]:]+/g, " ")
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
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const columnCount = config.columns.length;
  const orientation =
    columnCount >= 7 ? "landscape" : (config.orientation ?? "portrait");
  const paperFormat = columnCount > 12 ? "a3" : "a4";
  const doc = new jsPDF({
    orientation,
    unit: "pt",
    format: paperFormat,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const horizontalMargin = columnCount > 12 ? 24 : 32;
  const usableWidth = pageWidth - horizontalMargin * 2;
  const compactFontSize =
    columnCount > 18 ? 5.5 : columnCount > 12 ? 6.5 : columnCount > 8 ? 7 : 8;
  const compactPadding = columnCount > 12 ? 2 : 3.5;
  const columnWeights = config.columns.map((column) => {
    const requestedWidth = column.width ?? Math.max(column.header.length, 10);
    if (column.format === "currency") return Math.max(requestedWidth, 21);
    if (column.format === "number" || column.format === "percent")
      return Math.max(requestedWidth, 13);
    return Math.max(requestedWidth, 8);
  });
  const totalWeight = columnWeights.reduce((sum, width) => sum + width, 0);
  const columnStyles = Object.fromEntries(
    config.columns.map((column, index) => [
      index,
      {
        cellWidth: (usableWidth * (columnWeights[index] ?? 1)) / totalWeight,
        halign:
          column.format === "currency" ||
          column.format === "number" ||
          column.format === "percent"
            ? "right"
            : "left",
        overflow:
          column.format === "currency" ||
          column.format === "number" ||
          column.format === "percent"
            ? "hidden"
            : "linebreak",
      },
    ]),
  ) as NonNullable<UserOptions["columnStyles"]>;

  function drawPageHeaderAndFooter(pageNumber: number) {
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pageNumber === 1 ? 14 : 9);
    doc.text(config.title, horizontalMargin, pageNumber === 1 ? 30 : 24);
    if (config.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(pageNumber === 1 ? 9 : 7);
      doc.text(config.subtitle, horizontalMargin, pageNumber === 1 ? 45 : 36, {
        maxWidth: usableWidth,
      });
    }
    doc.setDrawColor(205, 191, 177);
    doc.line(
      horizontalMargin,
      pageHeight - 22,
      pageWidth - horizontalMargin,
      pageHeight - 22,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(95, 88, 82);
    doc.text(
      `PÁGINA ${pageNumber}`,
      pageWidth - horizontalMargin,
      pageHeight - 10,
      { align: "right" },
    );
  }

  drawPageHeaderAndFooter(1);

  const options: UserOptions = {
    startY: config.subtitle ? 58 : 44,
    head: [config.columns.map((column) => uppercase(column.header))],
    body: config.rows.map((row) =>
      config.columns.map((column) =>
        formatForDisplay(column, column.accessor(row)),
      ),
    ),
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: compactFontSize,
      cellPadding: compactPadding,
      overflow: "linebreak",
      valign: "middle",
      lineColor: [226, 217, 208],
      lineWidth: 0.35,
    },
    headStyles: {
      fillColor: [58, 48, 40],
      textColor: 255,
      fontStyle: "bold",
      fontSize: Math.max(compactFontSize - 0.25, 5.25),
      valign: "middle",
    },
    footStyles: {
      fillColor: [236, 240, 238],
      textColor: 20,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [249, 250, 249] },
    margin: {
      top: config.subtitle ? 48 : 36,
      left: horizontalMargin,
      right: horizontalMargin,
      bottom: 30,
    },
    tableWidth: usableWidth,
    columnStyles,
    showHead: "everyPage",
    rowPageBreak: "avoid",
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawPageHeaderAndFooter(data.pageNumber);
    },
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
        ?.finalY ?? (typeof options.startY === "number" ? options.startY : 44);
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
            {
              header: summary.valueHeader,
              accessor: () => row.value,
              format: "currency",
            },
            row.value,
          ),
        ]),
        [
          uppercase(summary.totalLabel),
          formatForDisplay(
            {
              header: summary.valueHeader,
              accessor: () => summary.total,
              format: "currency",
            },
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
