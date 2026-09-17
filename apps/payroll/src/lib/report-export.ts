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

export type ReportMetadataItem = {
  label: string;
  value: string;
};

export type ReportMetric = {
  label: string;
  value: string;
  detail?: string;
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
  metadata?: ReportMetadataItem[];
  metrics?: ReportMetric[];
  analysis?: string[];
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

function reportMetadata<T>(config: ReportExportConfig<T>): ReportMetadataItem[] {
  if (config.metadata?.length) return config.metadata;
  return [{ label: "Alcance", value: config.subtitle || "Reporte general" }];
}

function reportMetrics<T>(config: ReportExportConfig<T>): ReportMetric[] {
  if (config.metrics?.length) return config.metrics;
  return [
    {
      label: "Registros",
      value: new Intl.NumberFormat("es-MX").format(config.rows.length),
      detail: "Renglones incluidos en el reporte",
    },
  ];
}

function reportAnalysis<T>(config: ReportExportConfig<T>): string[] {
  if (config.analysis?.length) return config.analysis;
  return [
    `El reporte incluye ${new Intl.NumberFormat("es-MX").format(config.rows.length)} registros correspondientes exclusivamente a la selección indicada.`,
  ];
}

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
    return new Intl.NumberFormat("es-MX", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(value);
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
    return { t: "n", v: value, z: "0.00%" };
  if (column.format === "number" && typeof value === "number")
    return { t: "n", v: value, z: "#,##0" };
  return { t: "s", v: uppercase(String(value)) };
}

export async function exportReportToExcel<T>(
  config: ReportExportConfig<T>,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const metadata = reportMetadata(config);
  const metrics = reportMetrics(config);
  const analysis = reportAnalysis(config);
  const titleRows = [
    ["KEYSAR COSMETICS · PAYROLL"],
    [uppercase(config.title)],
    ...(config.subtitle ? [[config.subtitle]] : []),
    [],
    ["DATOS DEL REPORTE"],
    ...metadata.map((item) => [uppercase(item.label), item.value]),
    [],
    ["RESUMEN EJECUTIVO"],
    ["INDICADOR", "VALOR", "DETALLE"],
    ...metrics.map((item) => [
      uppercase(item.label),
      item.value,
      item.detail ?? "",
    ]),
    [],
    ["ANÁLISIS"],
    ...analysis.map((item) => [item]),
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
  sheet["!cols"] = config.columns.map((column, index) => ({
    wch: Math.min(
      Math.max(column.header.length, column.width ?? (index === 0 ? 18 : 12)),
      38,
    ),
  }));
  sheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: Math.max(config.columns.length - 1, 0) },
    },
    {
      s: { r: 1, c: 0 },
      e: { r: 1, c: Math.max(config.columns.length - 1, 0) },
    },
  ];
  if (config.subtitle) {
    sheet["!merges"].push({
      s: { r: 2, c: 0 },
      e: { r: 2, c: Math.max(config.columns.length - 1, 0) },
    });
  }
  sheet["!rows"] = [
    { hpt: 18 },
    { hpt: 26 },
    ...(config.subtitle ? [{ hpt: 18 }] : []),
  ];
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
      ["KEYSAR COSMETICS · PAYROLL"],
      [uppercase(summary.title)],
      ...(config.subtitle ? [[config.subtitle]] : []),
      ...metadata.map((item) => [uppercase(item.label), item.value]),
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
    summarySheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      ...(config.subtitle
        ? [{ s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }]
        : []),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      sanitizeSheetName(summary.sheetName ?? "Por puesto"),
    );
  }
  XLSX.writeFile(workbook, `${sanitizeFilename(config.filename)}.xlsx`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printTableHtml<T>(config: ReportExportConfig<T>): string {
  const body = config.rows
    .map(
      (row) =>
        `<tr>${config.columns
          .map((column) => {
            const numeric =
              column.format === "currency" ||
              column.format === "number" ||
              column.format === "percent";
            return `<td class="${numeric ? "numeric" : "text"}">${escapeHtml(
              formatForDisplay(column, column.accessor(row)),
            )}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  const footer = config.footerRow
    ? `<tfoot><tr>${config.columns
        .map((column) => {
          const numeric =
            column.format === "currency" ||
            column.format === "number" ||
            column.format === "percent";
          return `<td class="${numeric ? "numeric" : "text"}">${escapeHtml(
            formatForDisplay(column, column.accessor(config.footerRow as T)),
          )}</td>`;
        })
        .join("")}</tr></tfoot>`
    : "";
  const totalWidth = config.columns.reduce(
    (sum, column) => sum + (column.width ?? 12),
    0,
  );
  return `<table class="report-table"><colgroup>${config.columns
    .map(
      (column) =>
        `<col style="width:${(((column.width ?? 12) / totalWidth) * 100).toFixed(3)}%">`,
    )
    .join("")}</colgroup><thead><tr>${config.columns
    .map((column) => `<th>${escapeHtml(uppercase(column.header))}</th>`)
    .join("")}</tr></thead><tbody>${body}</tbody>${footer}</table>`;
}

export function printReport<T>(config: ReportExportConfig<T>): void {
  const metadata = reportMetadata(config);
  const metrics = reportMetrics(config);
  const analysis = reportAnalysis(config);
  const orientation =
    config.orientation ??
    (config.columns.length >= 7 ? "landscape" : "portrait");
  const paper = config.columns.length > 12 ? "A3" : "A4";
  const compactFont =
    config.columns.length > 18
      ? "5.5pt"
      : config.columns.length > 12
        ? "6.5pt"
        : config.columns.length > 8
          ? "7.5pt"
          : "8.5pt";
  const summary = config.summarySection
    ? `<section class="summary-section"><h2>${escapeHtml(
        uppercase(config.summarySection.title),
      )}</h2><table class="summary-table"><thead><tr><th>${escapeHtml(
        uppercase(config.summarySection.labelHeader),
      )}</th><th>${escapeHtml(
        uppercase(config.summarySection.valueHeader),
      )}</th></tr></thead><tbody>${config.summarySection.rows
        .map(
          (row) =>
            `<tr><td>${escapeHtml(uppercase(row.label))}</td><td class="numeric">${escapeHtml(
              new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
              }).format(row.value),
            )}</td></tr>`,
        )
        .join("")}<tr class="total"><td>${escapeHtml(
        uppercase(config.summarySection.totalLabel),
      )}</td><td class="numeric">${escapeHtml(
        new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(config.summarySection.total),
      )}</td></tr></tbody></table></section>`
    : "";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(
    config.title,
  )}</title><style>
    @page { size: ${paper} ${orientation}; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; color: #241f1a; font-family: Arial, Helvetica, sans-serif; }
    body { font-size: 9pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .brand { color: #8a6744; font-size: 7pt; font-weight: 700; letter-spacing: .18em; }
    h1 { margin: 4px 0 3px; font-size: 18pt; line-height: 1.12; }
    .subtitle { margin: 0; color: #655b52; font-size: 8.5pt; }
    .metadata { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; margin: 12px 0 8px; }
    .meta, .metric { border: 1px solid #d8c9ba; border-radius: 5px; padding: 6px 8px; min-width: 0; }
    .label { display: block; color: #80664d; font-size: 6.5pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .value { display: block; margin-top: 3px; font-size: 8.5pt; font-weight: 700; overflow-wrap: anywhere; }
    .dashboard { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; margin: 7px 0; }
    .metric { background: #f5efe8; }
    .metric .value { font-size: 11pt; }
    .detail { display: block; margin-top: 2px; color: #756a60; font-size: 6.5pt; overflow-wrap: anywhere; }
    .analysis { margin: 7px 0 10px; border-left: 3px solid #8a6744; background: #faf7f3; padding: 6px 9px; }
    .analysis h2, .summary-section h2 { margin: 0 0 4px; font-size: 8pt; letter-spacing: .08em; }
    .analysis ul { margin: 0; padding-left: 15px; }
    .analysis li { margin: 2px 0; line-height: 1.25; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .report-table { font-size: ${compactFont}; }
    th, td { border: 1px solid #ddd3c9; padding: 3px 4px; vertical-align: middle; overflow-wrap: anywhere; word-break: normal; }
    th { background: #352c25; color: #fff; font-size: .92em; text-align: center; line-height: 1.12; }
    td { text-align: center; line-height: 1.15; }
    td.numeric { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    tbody tr:nth-child(even) { background: #faf8f5; }
    tfoot td, tr.total td { background: #e9f0ec; font-weight: 700; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .summary-section { margin-top: 12px; break-inside: avoid; }
    .summary-table { width: min(100%, 520px); font-size: 8pt; }
    .summary-table th:first-child, .summary-table td:first-child { text-align: left; }
    .footer { margin-top: 8px; padding-top: 5px; border-top: 1px solid #d8c9ba; color: #756a60; font-size: 6.5pt; text-align: right; }
    @media screen { body { padding: 18px; } }
  </style></head><body><header><div class="brand">KEYSAR COSMETICS · PAYROLL</div><h1>${escapeHtml(
    uppercase(config.title),
  )}</h1>${config.subtitle ? `<p class="subtitle">${escapeHtml(config.subtitle)}</p>` : ""}</header>
  <section class="metadata">${metadata
    .map(
      (item) =>
        `<div class="meta"><span class="label">${escapeHtml(item.label)}</span><span class="value">${escapeHtml(item.value)}</span></div>`,
    )
    .join("")}</section>
  <section class="dashboard">${metrics
    .map(
      (item) =>
        `<div class="metric"><span class="label">${escapeHtml(item.label)}</span><span class="value">${escapeHtml(item.value)}</span>${item.detail ? `<span class="detail">${escapeHtml(item.detail)}</span>` : ""}</div>`,
    )
    .join("")}</section>
  <section class="analysis"><h2>ANÁLISIS DEL REPORTE</h2><ul>${analysis
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul></section>${printTableHtml(config)}${summary}<footer class="footer">Reporte generado para la selección indicada · ${escapeHtml(
    new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date()),
  )}</footer></body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.border = "0";
  frame.style.opacity = "0";
  document.body.appendChild(frame);
  const frameDocument = frame.contentDocument;
  if (!frameDocument || !frame.contentWindow) {
    frame.remove();
    throw new Error("No se pudo preparar la impresión del reporte.");
  }
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  const cleanup = () => window.setTimeout(() => frame.remove(), 250);
  frame.contentWindow.onafterprint = cleanup;
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(cleanup, 60_000);
  }, 150);
}

export async function exportReportToPdf<T>(
  config: ReportExportConfig<T>,
): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const columnCount = config.columns.length;
  const metadata = reportMetadata(config);
  const metrics = reportMetrics(config);
  const analysis = reportAnalysis(config);
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
            : "center",
        overflow: "linebreak",
      },
    ]),
  ) as NonNullable<UserOptions["columnStyles"]>;

  function drawPageHeader(pageNumber: number) {
    doc.setTextColor(138, 103, 68);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("KEYSAR COSMETICS · PAYROLL", horizontalMargin, pageNumber === 1 ? 18 : 14);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(pageNumber === 1 ? 14 : 8);
    doc.text(uppercase(config.title), horizontalMargin, pageNumber === 1 ? 34 : 26, {
      maxWidth: usableWidth,
    });
    if (config.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(pageNumber === 1 ? 8 : 6.5);
      doc.setTextColor(95, 88, 82);
      doc.text(config.subtitle, horizontalMargin, pageNumber === 1 ? 47 : 35, {
        maxWidth: usableWidth,
      });
    }
  }

  drawPageHeader(1);

  autoTable(doc, {
    startY: config.subtitle ? 58 : 45,
    body: metadata.map((item) => [uppercase(item.label), item.value]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 3,
      valign: "middle",
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: Math.min(110, usableWidth * 0.23), fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
    margin: { top: 42, left: horizontalMargin, right: horizontalMargin, bottom: 30 },
    tableWidth: usableWidth,
  });
  let reportStartY =
    ((doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 58) + 8;

  autoTable(doc, {
    startY: reportStartY,
    head: [metrics.map((item) => uppercase(item.label))],
    body: [metrics.map((item) => item.value)],
    foot: [metrics.map((item) => item.detail ?? "")],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 3,
      halign: "center",
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: { fillColor: [100, 134, 114], textColor: 255 },
    bodyStyles: {
      fillColor: [247, 242, 236],
      fontStyle: "bold",
      fontSize: 9,
    },
    footStyles: {
      fillColor: [247, 242, 236],
      textColor: [95, 88, 82],
      fontSize: 6,
    },
    margin: { top: 42, left: horizontalMargin, right: horizontalMargin, bottom: 30 },
    tableWidth: usableWidth,
  });
  reportStartY =
    ((doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? reportStartY) + 8;

  autoTable(doc, {
    startY: reportStartY,
    head: [["ANÁLISIS DEL REPORTE"]],
    body: analysis.map((item) => [`• ${item}`]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
    },
    headStyles: { fillColor: [58, 48, 40], textColor: 255 },
    margin: { top: 42, left: horizontalMargin, right: horizontalMargin, bottom: 30 },
    tableWidth: usableWidth,
  });
  reportStartY =
    ((doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? reportStartY) + 10;

  const options: UserOptions = {
    startY: reportStartY,
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
      halign: "center",
    },
    footStyles: {
      fillColor: [236, 240, 238],
      textColor: 20,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [249, 250, 249] },
    margin: {
      top: 42,
      left: horizontalMargin,
      right: horizontalMargin,
      bottom: 30,
    },
    tableWidth: usableWidth,
    columnStyles,
    showHead: "everyPage",
    rowPageBreak: "avoid",
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
    const summaryStartY = finalY + 18;
    if (summaryStartY > doc.internal.pageSize.getHeight() - 100) doc.addPage();
    const y =
      summaryStartY > doc.internal.pageSize.getHeight() - 100
        ? 42
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
      margin: {
        top: 42,
        left: horizontalMargin,
        right: horizontalMargin,
        bottom: 30,
      },
    });
  }
  const pageCount = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    if (pageNumber > 1) drawPageHeader(pageNumber);
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
      `PÁGINA ${pageNumber} DE ${pageCount}`,
      pageWidth - horizontalMargin,
      pageHeight - 10,
      { align: "right" },
    );
  }
  doc.save(`${sanitizeFilename(config.filename)}.pdf`);
}
