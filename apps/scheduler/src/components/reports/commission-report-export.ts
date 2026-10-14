import type {
  DesignCommissionReport,
  DesignCommissionReportRow,
} from "../../../design/contracts";

export type CommissionReportExportFormat = "xlsx" | "pdf";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function filename(report: DesignCommissionReport, extension: string) {
  return `comisiones-${report.filters.dateFrom}-${report.filters.dateTo}.${extension}`;
}

function totals(rows: DesignCommissionReportRow[]) {
  return {
    branches: new Set(rows.map((row) => row.branchId)).size,
    employees: new Set(rows.map((row) => row.employeeId)).size,
    attended: rows.reduce((total, row) => total + row.attendedAppointments, 0),
    sales: rows.reduce((total, row) => total + row.salesAmount, 0),
    commission: rows.reduce((total, row) => total + row.totalCommission, 0),
  };
}

async function exportXlsx(
  report: DesignCommissionReport,
  rows: DesignCommissionReportRow[],
) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const selectedTotals = totals(rows);
  const summary = XLSX.utils.aoa_to_sheet([
    ["Reporte", "Comisiones estimadas"],
    ["Periodo", report.filters.dateFrom, report.filters.dateTo],
    ["Generado", new Date(report.generatedAt)],
    ["Alcance", `${rows.length} filas seleccionadas`],
    [],
    ["Indicador", "Valor"],
    ["Sucursales", selectedTotals.branches],
    ["Empleados", selectedTotals.employees],
    ["Citas atendidas", selectedTotals.attended],
    ["Venta atribuible", selectedTotals.sales],
    ["Comisión estimada", selectedTotals.commission],
  ]);
  const detail = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      Esquema: row.schemeName,
      Sucursal: row.branchName,
      Empleado: row.employeeName,
      "Citas atendidas": row.attendedAppointments,
      "Venta atribuible": row.salesAmount,
      "Comisión por asistencia": row.appointmentCommission,
      "Comisión por venta": row.salesCommission,
      "Comisión total": row.totalCommission,
    })),
  );
  detail["!cols"] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    { wch: 20 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, summary, "Resumen");
  XLSX.utils.book_append_sheet(workbook, detail, "Selección");
  XLSX.writeFile(workbook, filename(report, "xlsx"), { compression: true });
}

async function exportPdf(
  report: DesignCommissionReport,
  rows: DesignCommissionReportRow[],
) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({ orientation: "landscape" });
  const selectedTotals = totals(rows);
  document.setTextColor(38, 54, 73);
  document.setFontSize(17);
  document.text("Keysar · Comisiones estimadas", 14, 17);
  document.setFontSize(9);
  document.text(
    `${report.filters.dateFrom} — ${report.filters.dateTo} · ${rows.length} filas seleccionadas`,
    14,
    24,
  );
  autoTable(document, {
    startY: 30,
    head: [["Sucursales", "Empleados", "Citas atendidas", "Venta", "Comisión"]],
    body: [
      [
        selectedTotals.branches,
        selectedTotals.employees,
        selectedTotals.attended,
        money.format(selectedTotals.sales),
        money.format(selectedTotals.commission),
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [38, 54, 73] },
  });
  autoTable(document, {
    startY: 58,
    head: [
      [
        "Esquema",
        "Sucursal",
        "Empleado",
        "Atendidas",
        "Venta",
        "Por cita",
        "Por venta",
        "Total",
      ],
    ],
    body: rows.map((row) => [
      row.schemeName,
      row.branchName,
      row.employeeName,
      row.attendedAppointments,
      money.format(row.salesAmount),
      money.format(row.appointmentCommission),
      money.format(row.salesCommission),
      money.format(row.totalCommission),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [171, 132, 96] },
    alternateRowStyles: { fillColor: [248, 245, 241] },
  });
  document.save(filename(report, "pdf"));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function printCommissionReport(
  report: DesignCommissionReport,
  rows: DesignCommissionReportRow[],
) {
  const target = window.open("", "_blank", "noopener,noreferrer");
  if (!target) throw new Error("El navegador bloqueó la ventana de impresión.");
  const selectedTotals = totals(rows);
  const detail = rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.schemeName)}</td><td>${escapeHtml(row.branchName)}</td><td>${escapeHtml(row.employeeName)}</td><td>${row.attendedAppointments}</td><td>${escapeHtml(money.format(row.salesAmount))}</td><td>${escapeHtml(money.format(row.appointmentCommission))}</td><td>${escapeHtml(money.format(row.salesCommission))}</td><td>${escapeHtml(money.format(row.totalCommission))}</td></tr>`,
    )
    .join("");
  target.document.write(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comisiones estimadas</title><style>body{font:12px Arial;color:#263649;margin:24px}h1{font-size:22px}.summary{display:flex;gap:12px;margin:18px 0}.kpi{border:1px solid #ddd;border-radius:8px;padding:10px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f4f1ed}@media print{body{margin:10mm}}</style></head><body><h1>Comisiones estimadas</h1><p>Periodo ${escapeHtml(report.filters.dateFrom)} — ${escapeHtml(report.filters.dateTo)} · ${rows.length} filas seleccionadas</p><div class="summary"><div class="kpi">Sucursales<br><strong>${selectedTotals.branches}</strong></div><div class="kpi">Empleados<br><strong>${selectedTotals.employees}</strong></div><div class="kpi">Citas atendidas<br><strong>${selectedTotals.attended}</strong></div><div class="kpi">Venta<br><strong>${escapeHtml(money.format(selectedTotals.sales))}</strong></div><div class="kpi">Comisión<br><strong>${escapeHtml(money.format(selectedTotals.commission))}</strong></div></div><table><thead><tr><th>Esquema</th><th>Sucursal</th><th>Empleado</th><th>Atendidas</th><th>Venta</th><th>Por cita</th><th>Por venta</th><th>Total</th></tr></thead><tbody>${detail || '<tr><td colspan="8">Sin filas seleccionadas.</td></tr>'}</tbody></table><script>window.addEventListener('load',()=>window.print())</script></body></html>`,
  );
  target.document.close();
}

export async function exportCommissionReport(
  report: DesignCommissionReport,
  rows: DesignCommissionReportRow[],
  format: CommissionReportExportFormat,
) {
  if (format === "xlsx") return exportXlsx(report, rows);
  return exportPdf(report, rows);
}
