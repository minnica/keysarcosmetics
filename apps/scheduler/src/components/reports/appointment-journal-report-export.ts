import type { DesignAppointmentJournalReport } from "../../../design/contracts";

const kindLabels = {
  SELLER_COMMENT: "Comentario del vendedor",
  POST_SALE_COMMENT: "Comentario postventa",
  CANCELLATION_REASON: "Motivo de cancelación",
  RESCHEDULE_REASON: "Motivo de reagenda",
} as const;

export function displayFollowUpDate(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function followUpRows(report: DesignAppointmentJournalReport) {
  return report.followUps.map((row) => ({
    Cliente: row.customerName,
    Sucursal: row.branchName,
    "Fecha de cita": displayFollowUpDate(row.appointmentStartsAt),
    "Fecha de registro": displayFollowUpDate(row.occurredAt),
    Estado:
      row.status === "NO_SHOW"
        ? "No asistió"
        : row.automatic
          ? "Cancelada automáticamente"
          : "Cancelada",
    Motivo: row.reason ?? "",
    "Próxima cita": row.nextAppointmentAt
      ? displayFollowUpDate(row.nextAppointmentAt)
      : row.hasNextAppointment
        ? "Con próxima cita"
        : "Sin próxima cita",
  }));
}

function detailRows(report: DesignAppointmentJournalReport) {
  return report.rows.map((row) => ({
    "ID cita": row.appointmentId,
    Cliente: row.customerName,
    "Fecha de cita": new Date(row.appointmentStartsAt),
    Sucursal: row.branchName,
    Servicios: row.serviceNames.join(", "),
    Estado: row.appointmentStatus,
    "Tipo de registro": kindLabels[row.kind],
    Categoría: row.categoryLabel ?? "",
    Comentario: row.comment,
    "Fecha tentativa": row.tentativeDate ?? "",
    "Registrado por": row.actorName,
    Rol: row.actorRole,
    "Fecha de registro": new Date(row.createdAt),
  }));
}

export async function exportAppointmentJournalXlsx(
  report: DesignAppointmentJournalReport,
) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["Reporte", "Seguimiento de citas y comentarios"],
    ["Periodo", report.filters.dateFrom, report.filters.dateTo],
    ["Registros", report.summary.entries],
    ["Citas", report.summary.appointments],
    ["Comentarios vendedor", report.summary.sellerComments],
    ["Comentarios postventa", report.summary.postSaleComments],
    ["Cancelaciones", report.summary.cancellations],
    ["Reagendas", report.summary.reschedules],
  ]);
  const detail = XLSX.utils.json_to_sheet(detailRows(report));
  detail["!cols"] = [
    { wch: 36 },
    { wch: 24 },
    { wch: 20 },
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 24 },
    { wch: 20 },
    { wch: 58 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, summary, "Resumen");
  XLSX.utils.book_append_sheet(workbook, detail, "Comentarios y motivos");
  const exceptions = XLSX.utils.json_to_sheet(followUpRows(report));
  exceptions["!cols"] = [24, 18, 24, 24, 32, 58, 25].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(
    workbook,
    exceptions,
    "Canceladas e inasistencias",
  );
  XLSX.writeFile(
    workbook,
    `seguimiento-citas-${report.filters.dateFrom}-${report.filters.dateTo}.xlsx`,
    { compression: true },
  );
}

export async function exportAppointmentJournalPdf(
  report: DesignAppointmentJournalReport,
) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({ orientation: "landscape" });
  document.setTextColor(38, 54, 73);
  document.setFontSize(16);
  document.text("Keysar · Seguimiento de citas", 14, 16);
  document.setFontSize(9);
  document.text(
    `${report.filters.dateFrom} — ${report.filters.dateTo} · ${report.summary.entries} registros`,
    14,
    23,
  );
  autoTable(document, {
    startY: 29,
    head: [
      [
        "Cliente",
        "Cita",
        "Sucursal",
        "Servicios",
        "Tipo",
        "Categoría",
        "Comentario / motivo",
        "Tentativa",
        "Autor",
        "Registro",
      ],
    ],
    body: report.rows.map((row) => [
      row.customerName,
      new Date(row.appointmentStartsAt).toLocaleString("es-MX"),
      row.branchName,
      row.serviceNames.join(", "),
      kindLabels[row.kind],
      row.categoryLabel ?? "—",
      row.comment,
      row.tentativeDate ?? "—",
      `${row.actorName} · ${row.actorRole}`,
      new Date(row.createdAt).toLocaleString("es-MX"),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [38, 54, 73] },
  });
  if (report.followUps.length) {
    document.addPage();
    document.setFontSize(16);
    document.text("Cancelaciones e inasistencias", 14, 16);
    const exceptions = followUpRows(report);
    autoTable(document, {
      startY: 23,
      head: [Object.keys(exceptions[0]!)],
      body: exceptions.map((row) => Object.values(row)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [38, 54, 73] },
    });
  }
  document.save(
    `seguimiento-citas-${report.filters.dateFrom}-${report.filters.dateTo}.pdf`,
  );
}

export function printAppointmentJournalReport(
  report: DesignAppointmentJournalReport,
) {
  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  const rows = report.rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.customerName)}</td><td>${escapeHtml(new Date(row.appointmentStartsAt).toLocaleString("es-MX"))}</td><td>${escapeHtml(row.branchName)}</td><td>${escapeHtml(kindLabels[row.kind])}</td><td>${escapeHtml(row.categoryLabel ?? "—")}</td><td>${escapeHtml(row.comment)}</td><td>${escapeHtml(row.actorName)}</td><td>${escapeHtml(new Date(row.createdAt).toLocaleString("es-MX"))}</td></tr>`,
    )
    .join("");
  const exceptions = followUpRows(report);
  const printWindow = window.open("about:blank", "_blank");
  if (!printWindow)
    throw new Error("El navegador bloqueó la ventana de impresión.");
  printWindow.opener = null;
  printWindow.document.write(
    `<!doctype html><html><head><title>Seguimiento de citas</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#263649}h1{font-size:22px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:7px;text-align:left;vertical-align:top}th{background:#263649;color:white}</style></head><body><h1>Keysar · Seguimiento de citas</h1><p>${report.filters.dateFrom} — ${report.filters.dateTo} · ${report.summary.entries} registros</p><table><thead><tr><th>Cliente</th><th>Cita</th><th>Sucursal</th><th>Tipo</th><th>Categoría</th><th>Comentario</th><th>Autor</th><th>Registro</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
  );
  printWindow.document.close();
  if (exceptions.length) {
    const doc = printWindow.document;
    const title = doc.createElement("h2");
    title.textContent = "Cancelaciones e inasistencias";
    const table = doc.createElement("table");
    const heading = table.createTHead().insertRow();
    for (const column of Object.keys(exceptions[0]!)) {
      const cell = doc.createElement("th");
      cell.textContent = column;
      heading.append(cell);
    }
    const body = table.createTBody();
    for (const record of exceptions) {
      const row = body.insertRow();
      for (const value of Object.values(record))
        row.insertCell().textContent = value;
    }
    doc.body.append(title, table);
  }
  printWindow.focus();
  printWindow.print();
}
