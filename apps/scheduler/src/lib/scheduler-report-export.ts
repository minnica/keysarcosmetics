import type { SchedulerReportDatasetDto } from "@cosmetics/types";
import { reportCellText } from "./scheduler-report-presentation";

export type SchedulerReportExportFormat = "csv" | "xlsx" | "pdf";

function filename(dataset: SchedulerReportDatasetDto, extension: string) {
  return `scheduler-${dataset.key.toLowerCase()}-${dataset.dateFrom}-${dataset.dateTo}.${extension}`;
}

function downloadBlob(contents: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function csv(dataset: SchedulerReportDatasetDto) {
  const quote = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const contents = [
    dataset.columns.map(quote).join(","),
    ...dataset.rows.map((row) =>
      dataset.columns.map((column) => quote(row[column])).join(","),
    ),
  ].join("\n");
  downloadBlob(
    `\ufeff${contents}`,
    "text/csv;charset=utf-8",
    filename(dataset, "csv"),
  );
}

async function xlsx(dataset: SchedulerReportDatasetDto) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["Reporte", dataset.key],
    ["Periodo", `${dataset.dateFrom} — ${dataset.dateTo}`],
    ["Fuente", dataset.sourceAuthority],
    ["Filas", dataset.rows.length],
    [],
    ["Indicador", "Valor"],
    ...Object.entries(dataset.summary),
  ]);
  const detail = XLSX.utils.aoa_to_sheet([
    dataset.columns,
    ...dataset.rows.map((row) =>
      dataset.columns.map((column) => row[column] ?? ""),
    ),
  ]);
  XLSX.utils.book_append_sheet(workbook, summary, "Resumen");
  XLSX.utils.book_append_sheet(workbook, detail, "Detalle");
  XLSX.writeFile(workbook, filename(dataset, "xlsx"), { compression: true });
}

async function pdf(dataset: SchedulerReportDatasetDto) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const landscape = dataset.columns.length > 6;
  const document = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
  });
  document.setTextColor(38, 54, 73);
  document.setFontSize(16);
  document.text(`Keysar · ${dataset.key}`, 14, 18);
  document.setFontSize(9);
  document.text(
    `${dataset.dateFrom} — ${dataset.dateTo} · ${dataset.sourceAuthority} · ${dataset.rows.length} filas`,
    14,
    25,
  );
  autoTable(document, {
    startY: 31,
    head: [dataset.columns],
    body: dataset.rows.map((row) =>
      dataset.columns.map((column) => reportCellText(row[column])),
    ),
    styles: {
      fontSize: dataset.columns.length > 8 ? 5.5 : 7,
      cellPadding: 1.5,
    },
    headStyles: { fillColor: [38, 54, 73] },
    alternateRowStyles: { fillColor: [248, 245, 241] },
  });
  document.save(filename(dataset, "pdf"));
}

export async function exportSchedulerReport(
  dataset: SchedulerReportDatasetDto,
  format: SchedulerReportExportFormat,
) {
  if (format === "csv") return csv(dataset);
  if (format === "xlsx") return xlsx(dataset);
  return pdf(dataset);
}
