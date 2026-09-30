import type { DesignCabinSalesReport } from "../../../design/contracts";

export type CabinSalesExportFormat = "xlsx" | "pdf";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function filename(report: DesignCabinSalesReport, extension: string) {
  return `ventas-por-cabina-${report.filters.dateFrom}-${report.filters.dateTo}.${extension}`;
}

function purchaseLabel(kind: "NONE" | "FULL" | "LAYAWAY") {
  if (kind === "FULL") return "Compra liquidada";
  if (kind === "LAYAWAY") return "Apartado";
  return "No compró";
}

function settlementLabel(status: "NOT_APPLICABLE" | "OPEN" | "PAID") {
  if (status === "OPEN") return "Saldo pendiente";
  if (status === "PAID") return "Liquidada";
  return "Sin venta";
}

async function exportXlsx(report: DesignCabinSalesReport) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["Reporte", "Ventas por cabina"],
    ["Periodo", report.filters.dateFrom, report.filters.dateTo],
    ["Generado", new Date(report.generatedAt)],
    ["Fuente", "Datos ficticios del entorno de diseño"],
    [],
    ["Indicador", "Valor"],
    ["Citas", report.summary.appointments],
    ["Visitantes", report.summary.visitors],
    ["Compradores", report.summary.buyers],
    ["Ventas liquidadas", report.summary.fullSales],
    ["Apartados", report.summary.layaways],
    ["Monto vendido", report.summary.saleAmount],
    ["Monto recibido", report.summary.depositAmount],
    ["Saldo pendiente", report.summary.balanceAmount],
    ["Conversión (%)", report.summary.conversionRate],
  ]);
  summary["!cols"] = [{ wch: 24 }, { wch: 22 }, { wch: 14 }];

  const byCabin = XLSX.utils.json_to_sheet(
    report.byCabin.map((item) => ({
      Cabina: item.label,
      Citas: item.appointments,
      Visitantes: item.visitors,
      Compradores: item.buyers,
      "Monto vendido": item.saleAmount,
      "Monto recibido": item.depositAmount,
      "Saldo pendiente": item.balanceAmount,
    })),
  );
  const byDay = XLSX.utils.json_to_sheet(
    report.byDay.map((item) => ({
      Fecha: item.key,
      Citas: item.appointments,
      Visitantes: item.visitors,
      Compradores: item.buyers,
      "Monto vendido": item.saleAmount,
      "Monto recibido": item.depositAmount,
      "Saldo pendiente": item.balanceAmount,
    })),
  );
  const periodSheet = (items: DesignCabinSalesReport["byWeek"]) =>
    XLSX.utils.json_to_sheet(
      items.map((item) => ({
        Periodo: item.label,
        Citas: item.appointments,
        Visitantes: item.visitors,
        Compradores: item.buyers,
        "Monto vendido": item.saleAmount,
        "Monto recibido": item.depositAmount,
        "Saldo pendiente": item.balanceAmount,
      })),
    );
  const specialists = XLSX.utils.json_to_sheet(
    report.bySpecialist.map((item, index) => ({
      Posición: index + 1,
      Especialista: item.specialistName,
      Sucursal: item.branchName,
      Citas: item.appointments,
      Visitantes: item.visitors,
      Compradores: item.buyers,
      "Conversión (%)": item.conversionRate,
      "Monto vendido": item.saleAmount,
      "Monto recibido": item.depositAmount,
      "Saldo pendiente": item.balanceAmount,
    })),
  );
  const services = XLSX.utils.json_to_sheet(
    report.serviceAnalytics.map((item) => ({
      Servicio: item.serviceName,
      Citas: item.appointments,
      Asistencias: item.attended,
      Cancelaciones: item.canceled,
      "No asistió": item.noShow,
      "Índice asistencia (%)": item.attendanceRate,
      "Índice cancelación (%)": item.cancellationRate,
    })),
  );
  const detail = XLSX.utils.json_to_sheet(
    report.rows.map((row) => ({
      "ID cita": row.appointmentId,
      "Creación cita": new Date(row.appointmentCreatedAt),
      "Confirmación cita": row.confirmedAt ? new Date(row.confirmedAt) : "",
      Inicio: new Date(row.appointmentStartsAt),
      Fin: new Date(row.appointmentEndsAt),
      Sucursal: row.branchName,
      Cabina: row.cabinName,
      Capacidad: row.cabinCapacity,
      Cliente: row.customerName,
      Visitante: row.visitorName,
      Servicios: row.serviceNames.join(", "),
      Vendedor: row.sellerName,
      "Especialista que atendió": row.attendingSpecialistName,
      "Venta asignada a": row.saleOwnerSpecialistName,
      Resultado: purchaseLabel(row.purchaseKind),
      Liquidación: settlementLabel(row.settlementStatus),
      "Fecha de liquidación": row.settledAt ? new Date(row.settledAt) : "",
      "Monto de venta": row.saleAmount,
      "Monto recibido": row.depositAmount,
      "Saldo pendiente": row.balanceAmount,
      Comentarios: row.notes,
      Estado: row.status,
      Origen: row.origin,
      "Motivo cancelación": row.cancellationReason,
      "Última actualización": new Date(row.updatedAt),
    })),
  );
  detail["!cols"] = [
    { wch: 38 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 22 },
    { wch: 12 },
    { wch: 24 },
    { wch: 24 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 34 },
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, summary, "Resumen");
  XLSX.utils.book_append_sheet(workbook, byCabin, "Por cabina");
  XLSX.utils.book_append_sheet(workbook, byDay, "Por día");
  XLSX.utils.book_append_sheet(workbook, periodSheet(report.byWeek), "Por semana");
  XLSX.utils.book_append_sheet(workbook, periodSheet(report.byMonth), "Por mes");
  XLSX.utils.book_append_sheet(workbook, specialists, "Especialistas");
  XLSX.utils.book_append_sheet(workbook, services, "Servicios");
  XLSX.utils.book_append_sheet(workbook, detail, "Detalle");
  XLSX.writeFile(workbook, filename(report, "xlsx"), { compression: true });
}

async function exportPdf(report: DesignCabinSalesReport) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({ orientation: "landscape" });
  document.setTextColor(38, 54, 73);
  document.setFontSize(17);
  document.text("Keysar · Ventas por cabina", 14, 17);
  document.setFontSize(9);
  document.text(
    `${report.filters.dateFrom} — ${report.filters.dateTo} · ${report.rows.length} visitantes · datos ficticios`,
    14,
    24,
  );
  autoTable(document, {
    startY: 30,
    head: [["Indicador", "Valor"]],
    body: [
      ["Citas / visitantes", `${report.summary.appointments} / ${report.summary.visitors}`],
      ["Compradores / conversión", `${report.summary.buyers} / ${report.summary.conversionRate}%`],
      ["Monto vendido", money.format(report.summary.saleAmount)],
      ["Monto recibido", money.format(report.summary.depositAmount)],
      ["Saldo pendiente", money.format(report.summary.balanceAmount)],
    ],
    theme: "grid",
    headStyles: { fillColor: [38, 54, 73] },
  });
  document.addPage("a4", "landscape");
  document.setFontSize(14);
  document.text("Ranking por especialista y analítica de servicios", 14, 16);
  autoTable(document, {
    startY: 22,
    head: [["#", "Especialista", "Sucursal", "Compradores", "Conversión", "Vendido", "Recibido"]],
    body: report.bySpecialist.map((item, index) => [
      index + 1,
      item.specialistName,
      item.branchName,
      item.buyers,
      `${item.conversionRate}%`,
      money.format(item.saleAmount),
      money.format(item.depositAmount),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [38, 54, 73] },
  });
  autoTable(document, {
    startY: 90,
    head: [["Servicio", "Citas", "Asistencias", "Cancelaciones", "No asistió", "% asistencia", "% cancelación"]],
    body: report.serviceAnalytics.map((item) => [
      item.serviceName,
      item.appointments,
      item.attended,
      item.canceled,
      item.noShow,
      `${item.attendanceRate}%`,
      `${item.cancellationRate}%`,
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [171, 132, 96] },
  });
  autoTable(document, {
    startY: 72,
    head: [["Cabina", "Citas", "Visitantes", "Compradores", "Vendido", "Recibido", "Saldo"]],
    body: report.byCabin.map((item) => [
      item.label,
      item.appointments,
      item.visitors,
      item.buyers,
      money.format(item.saleAmount),
      money.format(item.depositAmount),
      money.format(item.balanceAmount),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [171, 132, 96] },
  });
  document.addPage("a4", "landscape");
  document.setFontSize(14);
  document.text("Detalle de citas y visitantes", 14, 16);
  autoTable(document, {
    startY: 22,
    head: [[
      "Cita",
      "Fecha",
      "Sucursal / cabina",
      "Cliente / visitante",
      "Servicio",
      "Vendedor / especialista de venta",
      "Resultado",
      "Liquidación",
      "Venta",
      "Recibido",
      "Saldo",
      "Estado",
      "Comentarios",
    ]],
    body: report.rows.map((row) => [
      row.appointmentId,
      new Date(row.appointmentStartsAt).toLocaleString("es-MX"),
      `${row.branchName} / ${row.cabinName}`,
      `${row.customerName} / ${row.visitorName}`,
      row.serviceNames.join(", "),
      `${row.sellerName} / ${row.saleOwnerSpecialistName}`,
      purchaseLabel(row.purchaseKind),
      settlementLabel(row.settlementStatus),
      money.format(row.saleAmount),
      money.format(row.depositAmount),
      money.format(row.balanceAmount),
      row.status,
      row.notes || "—",
    ]),
    styles: { fontSize: 5.5, cellPadding: 1.2 },
    headStyles: { fillColor: [38, 54, 73] },
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

export function printCabinSalesReport(report: DesignCabinSalesReport) {
  const target = window.open("", "_blank", "noopener,noreferrer");
  if (!target) throw new Error("El navegador bloqueó la ventana de impresión.");
  const rows = report.rows
    .map(
      (row) => `<tr><td>${escapeHtml(new Date(row.appointmentStartsAt).toLocaleString("es-MX"))}</td><td>${escapeHtml(row.branchName)}</td><td>${escapeHtml(row.cabinName)}</td><td>${escapeHtml(row.visitorName)}</td><td>${escapeHtml(row.serviceNames.join(", "))}</td><td>${escapeHtml(row.attendingSpecialistName)}</td><td>${escapeHtml(row.saleOwnerSpecialistName)}</td><td>${escapeHtml(purchaseLabel(row.purchaseKind))}</td><td>${escapeHtml(settlementLabel(row.settlementStatus))}</td><td>${escapeHtml(money.format(row.saleAmount))}</td><td>${escapeHtml(money.format(row.depositAmount))}</td><td>${escapeHtml(money.format(row.balanceAmount))}</td></tr>`,
    )
    .join("");
  target.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Compras de agenda o cabinas</title><style>body{font:12px Arial;color:#263649;margin:24px}h1{font-size:22px}section{display:flex;gap:12px;margin:18px 0}.kpi{border:1px solid #ddd;border-radius:8px;padding:10px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f4f1ed}@media print{body{margin:10mm}}</style></head><body><h1>Compras de agenda o cabinas</h1><p>Periodo ${escapeHtml(report.filters.dateFrom)} — ${escapeHtml(report.filters.dateTo)} · ${report.rows.length} filas filtradas</p><section><div class="kpi">Vendido<br><strong>${escapeHtml(money.format(report.summary.saleAmount))}</strong></div><div class="kpi">Recibido<br><strong>${escapeHtml(money.format(report.summary.depositAmount))}</strong></div><div class="kpi">Saldo<br><strong>${escapeHtml(money.format(report.summary.balanceAmount))}</strong></div><div class="kpi">Conversión<br><strong>${report.summary.conversionRate}%</strong></div></section><table><thead><tr><th>Fecha</th><th>Sucursal</th><th>Cabina</th><th>Visitante</th><th>Servicio</th><th>Atendió</th><th>Venta asignada</th><th>Resultado</th><th>Liquidación</th><th>Venta</th><th>Recibido</th><th>Saldo</th></tr></thead><tbody>${rows || '<tr><td colspan="12">Sin registros para los filtros seleccionados.</td></tr>'}</tbody></table><script>window.addEventListener('load',()=>window.print())</script></body></html>`);
  target.document.close();
}

export async function exportCabinSalesReport(
  report: DesignCabinSalesReport,
  format: CabinSalesExportFormat,
) {
  if (format === "xlsx") return exportXlsx(report);
  return exportPdf(report);
}
