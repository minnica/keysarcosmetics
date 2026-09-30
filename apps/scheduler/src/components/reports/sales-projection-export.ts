import type { DesignSalesProjectionReport } from "../../../design/contracts";

export type SalesProjectionExportFormat = "xlsx" | "pdf";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function filename(report: DesignSalesProjectionReport, extension: string) {
  return `proyeccion-mensual-${report.filters.targetMonth}.${extension}`;
}

async function exportXlsx(report: DesignSalesProjectionReport) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Proyección mensual", report.filters.targetMonth],
      ["Ventana histórica", `${report.filters.lookbackMonths} meses`],
      ["Promedio histórico", report.summary.historicalAverage],
      ["Mes anterior", report.summary.previousMonth],
      ["Proyección", report.summary.projectedAmount],
      ["Venta real a la fecha", report.summary.actualToDate],
      ["Variación proyectada (%)", report.summary.changePercent],
      ["Confianza", report.summary.confidenceLabel],
      [],
      ["Metodología", report.methodology],
    ]),
    "Resumen",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      report.historical.map((item) => ({
        Mes: item.month,
        "Monto vendido": item.saleAmount,
        "Monto recibido": item.depositAmount,
        "Saldo pendiente": item.balanceAmount,
        Compradores: item.buyers,
      })),
    ),
    "Histórico",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      report.byBranch.map((item) => ({
        Sucursal: item.branchName,
        "Promedio histórico": item.historicalAverage,
        "Mes anterior": item.previousMonth,
        Proyección: item.projectedAmount,
        "Variación (%)": item.changePercent,
      })),
    ),
    "Por sucursal",
  );
  XLSX.writeFile(workbook, filename(report, "xlsx"), { compression: true });
}

async function exportPdf(report: DesignSalesProjectionReport) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({ orientation: "landscape" });
  document.setTextColor(38, 54, 73);
  document.setFontSize(18);
  document.text(`Keysar · Proyección ${report.filters.targetMonth}`, 14, 18);
  document.setFontSize(9);
  document.text(report.methodology, 14, 25, { maxWidth: 265 });
  autoTable(document, {
    startY: 36,
    head: [["Promedio histórico", "Mes anterior", "Proyección", "Real a la fecha", "Variación", "Confianza"]],
    body: [[
      money.format(report.summary.historicalAverage),
      money.format(report.summary.previousMonth),
      money.format(report.summary.projectedAmount),
      money.format(report.summary.actualToDate),
      `${report.summary.changePercent}%`,
      report.summary.confidenceLabel,
    ]],
    headStyles: { fillColor: [38, 54, 73] },
  });
  autoTable(document, {
    startY: 70,
    head: [["Mes", "Vendido", "Recibido", "Saldo", "Compradores"]],
    body: report.historical.map((item) => [
      item.month,
      money.format(item.saleAmount),
      money.format(item.depositAmount),
      money.format(item.balanceAmount),
      item.buyers,
    ]),
    headStyles: { fillColor: [171, 132, 96] },
  });
  autoTable(document, {
    startY: 125,
    head: [["Sucursal", "Promedio", "Mes anterior", "Proyección", "Variación"]],
    body: report.byBranch.map((item) => [
      item.branchName,
      money.format(item.historicalAverage),
      money.format(item.previousMonth),
      money.format(item.projectedAmount),
      `${item.changePercent}%`,
    ]),
    headStyles: { fillColor: [38, 54, 73] },
  });
  document.save(filename(report, "pdf"));
}

export async function exportSalesProjection(
  report: DesignSalesProjectionReport,
  format: SalesProjectionExportFormat,
) {
  return format === "xlsx" ? exportXlsx(report) : exportPdf(report);
}

export function printSalesProjection(report: DesignSalesProjectionReport) {
  const target = window.open("", "_blank", "noopener,noreferrer");
  if (!target) throw new Error("El navegador bloqueó la ventana de impresión.");
  const branchRows = report.byBranch
    .map(
      (item) => `<tr><td>${item.branchName}</td><td>${money.format(item.historicalAverage)}</td><td>${money.format(item.previousMonth)}</td><td>${money.format(item.projectedAmount)}</td><td>${item.changePercent}%</td></tr>`,
    )
    .join("");
  target.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Proyección ${report.filters.targetMonth}</title><style>body{font:13px Arial;color:#263649;margin:24px}.kpis{display:flex;gap:12px}.kpi{border:1px solid #ddd;border-radius:8px;padding:12px}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f1ed}</style></head><body><h1>Proyección mensual ${report.filters.targetMonth}</h1><p>${report.methodology}</p><div class="kpis"><div class="kpi">Promedio<br><strong>${money.format(report.summary.historicalAverage)}</strong></div><div class="kpi">Mes anterior<br><strong>${money.format(report.summary.previousMonth)}</strong></div><div class="kpi">Proyección<br><strong>${money.format(report.summary.projectedAmount)}</strong></div><div class="kpi">Confianza<br><strong>${report.summary.confidenceLabel}</strong></div></div><table><thead><tr><th>Sucursal</th><th>Promedio</th><th>Mes anterior</th><th>Proyección</th><th>Variación</th></tr></thead><tbody>${branchRows}</tbody></table><script>window.addEventListener('load',()=>window.print())</script></body></html>`);
  target.document.close();
}
