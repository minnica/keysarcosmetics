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
      Especialista: row.specialistName,
      Resultado: purchaseLabel(row.purchaseKind),
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
      "Vendedor / especialista",
      "Resultado",
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
      `${row.sellerName} / ${row.specialistName}`,
      purchaseLabel(row.purchaseKind),
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

export async function exportCabinSalesReport(
  report: DesignCabinSalesReport,
  format: CabinSalesExportFormat,
) {
  if (format === "xlsx") return exportXlsx(report);
  return exportPdf(report);
}
