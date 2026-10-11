import type {
  DesignCustomerRecoveryCase,
  DesignCustomerRecoveryPurchaseReport,
} from "../../../design/contracts";

type RecoveryExportFormat = "xlsx" | "pdf";

const reasonLabels = {
  NEVER_ATTENDED: "Nunca asistió",
  MEMBERSHIP_ENDED: "Membresía terminada",
  TREATMENT_ENDED: "Tratamiento terminado",
} as const;

const statusLabels = {
  PENDING: "Por recuperar",
  RECOVERED: "Recuperado",
  LOST: "Cliente perdido",
} as const;

const activityLabels = {
  AWAITING_APPOINTMENT: "Sin próxima cita",
  SCHEDULED: "Cita programada",
  RESCHEDULED: "Reagendó",
  CANCELED: "Canceló",
  NO_SHOW: "No asistió",
  ATTENDED: "Asistió",
  PURCHASED: "Compró",
  LAYAWAY: "Realizó apartado",
} as const;

const columns = [
  "Cliente",
  "Teléfono",
  "Sucursal",
  "Motivo",
  "Fecha de detección",
  "Última cita",
  "Asistencias",
  "Grupo asignado",
  "Persona asignada",
  "Actividad de Agenda",
  "Vendedor de cartera",
  "Status",
  "Agente de recuperación",
  "Última gestión",
] as const;

function rowValues(
  item: DesignCustomerRecoveryCase,
  canViewCustomerPhone: boolean,
) {
  return [
    item.customerName,
    canViewCustomerPhone ? item.phone ?? "Sin teléfono" : "Confidencial",
    item.branchName,
    reasonLabels[item.reason],
    item.eligibilityAt.slice(0, 10),
    item.lastAppointmentAt?.slice(0, 10) ?? "Sin visita previa",
    item.attendedCount,
    item.assignedTeamName ?? "Sin grupo",
    item.assignedAgentName ?? "Sin persona asignada",
    activityLabels[item.activityStatus],
    item.portfolioOwnerName,
    statusLabels[item.status],
    item.history[0]?.recoveryAgentName ?? "Sin agente asignado",
    item.history[0]?.notes ?? "Sin gestión registrada",
  ];
}

function fileName(extension: string) {
  return `recuperacion-clientes-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export async function exportCustomerRecoverySelection(
  rows: DesignCustomerRecoveryCase[],
  format: RecoveryExportFormat,
  canViewCustomerPhone: boolean,
) {
  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Recuperación de clientes"],
      ["Registros seleccionados", rows.length],
      [],
      [...columns],
      ...rows.map((row) => rowValues(row, canViewCustomerPhone)),
    ]);
    sheet["!cols"] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 28 },
      { wch: 28 },
      { wch: 22 },
      { wch: 24 },
      { wch: 18 },
      { wch: 28 },
      { wch: 42 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "Clientes seleccionados");
    XLSX.writeFile(workbook, fileName("xlsx"), { compression: true });
    return;
  }

  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({ orientation: "landscape" });
  document.setTextColor(38, 54, 73);
  document.setFontSize(17);
  document.text("Keysar · Recuperación de clientes", 14, 18);
  document.setFontSize(9);
  document.text(`${rows.length} registros seleccionados`, 14, 25);
  autoTable(document, {
    startY: 31,
    head: [[...columns]],
    body: rows.map((row) => rowValues(row, canViewCustomerPhone)),
    styles: { fontSize: 6.5, cellPadding: 1.7 },
    headStyles: { fillColor: [38, 54, 73] },
    alternateRowStyles: { fillColor: [248, 245, 241] },
  });
  document.save(fileName("pdf"));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function printCustomerRecoverySelection(
  rows: DesignCustomerRecoveryCase[],
  canViewCustomerPhone: boolean,
) {
  const target = window.open("", "_blank", "noopener,noreferrer");
  if (!target) throw new Error("Permite ventanas emergentes para imprimir.");
  const body = rows
    .map(
      (item) =>
        `<tr>${rowValues(item, canViewCustomerPhone)
          .map((value) => `<td>${escapeHtml(value)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  target.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recuperación de clientes</title><style>@page{size:landscape;margin:10mm}body{font:11px Arial;color:#263649}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 18px;color:#64748b}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d9dce1;padding:6px;text-align:left;vertical-align:top}th{background:#263649;color:#fff}tr:nth-child(even){background:#f8f5f1}</style></head><body><h1>Recuperación de clientes</h1><p>${rows.length} registros seleccionados</p><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table><script>window.addEventListener('load',()=>window.print())</script></body></html>`);
  target.document.close();
}

export interface RecoveryPerformanceExportRow {
  name: string;
  role: string;
  actions: number;
  recovered: number;
  pending: number;
  lost: number;
  recoveryRate: number;
  saleAmount: number;
  lastActionAt: string;
}

export async function exportRecoveryPerformanceReport(
  rows: RecoveryPerformanceExportRow[],
  dimensionLabel: string,
  format: RecoveryExportFormat,
) {
  const headings = [
    dimensionLabel,
    "Tipo",
    "Cartera",
    "Recuperados",
    "Pendientes",
    "Perdidos",
    "Conversión",
    "Venta recuperada",
    "Última actividad",
  ];
  const body = rows.map((row) => [
    row.name,
    row.role,
    row.actions,
    row.recovered,
    row.pending,
    row.lost,
    `${row.recoveryRate}%`,
    row.saleAmount,
    row.lastActionAt.slice(0, 10),
  ]);
  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Rendimiento de recuperación", dimensionLabel],
      [],
      headings,
      ...body,
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Rendimiento");
    XLSX.writeFile(
      workbook,
      `rendimiento-recuperacion-${dimensionLabel.toLocaleLowerCase("es-MX").replaceAll(" ", "-")}.xlsx`,
      { compression: true },
    );
    return;
  }
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({ orientation: "landscape" });
  document.setTextColor(38, 54, 73);
  document.setFontSize(17);
  document.text("Rendimiento de recuperación", 14, 18);
  document.setFontSize(9);
  document.text(`Agrupado por ${dimensionLabel}`, 14, 25);
  autoTable(document, {
    startY: 31,
    head: [headings],
    body,
    styles: { fontSize: 7, cellPadding: 1.8 },
    headStyles: { fillColor: [38, 54, 73] },
  });
  document.save(
    `rendimiento-recuperacion-${dimensionLabel.toLocaleLowerCase("es-MX").replaceAll(" ", "-")}.pdf`,
  );
}

export async function exportRecoveryPurchaseReport(
  report: DesignCustomerRecoveryPurchaseReport,
  format: RecoveryExportFormat,
) {
  const headings = [
    "Cliente",
    "Primera cita",
    "Sucursal",
    "Grupo",
    "Persona asignada",
    "Vendedor",
    "Especialista",
    "Resultado",
    "Venta",
    "Recibido",
    "Saldo",
  ];
  const body = report.rows.map((row) => [
    row.customerName,
    row.appointmentStartsAt.slice(0, 10),
    row.branchName,
    row.assignedTeamName,
    row.assignedAgentName,
    row.portfolioOwnerName,
    row.specialistName,
    row.purchaseKind === "LAYAWAY" ? "Apartado" : "Compra",
    row.saleAmount,
    row.depositAmount,
    row.balanceAmount,
  ]);
  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const summary = XLSX.utils.aoa_to_sheet([
      ["Compras de clientes recuperados"],
      ["Clientes compradores", report.summary.customers],
      ["Venta", report.summary.saleAmount],
      ["Recibido", report.summary.depositAmount],
      ["Saldo", report.summary.balanceAmount],
      ["Ticket promedio", report.summary.averageTicket],
    ]);
    const detail = XLSX.utils.aoa_to_sheet([headings, ...body]);
    XLSX.utils.book_append_sheet(workbook, summary, "Resumen");
    XLSX.utils.book_append_sheet(workbook, detail, "Primera compra");
    XLSX.writeFile(workbook, "compras-clientes-recuperados.xlsx", {
      compression: true,
    });
    return;
  }
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({ orientation: "landscape" });
  document.setTextColor(38, 54, 73);
  document.setFontSize(17);
  document.text("Compras de clientes recuperados", 14, 18);
  document.setFontSize(9);
  document.text(
    `${report.summary.customers} compradores · Venta ${report.summary.saleAmount} · Recibido ${report.summary.depositAmount}`,
    14,
    25,
  );
  autoTable(document, {
    startY: 31,
    head: [headings],
    body,
    styles: { fontSize: 6.2, cellPadding: 1.5 },
    headStyles: { fillColor: [38, 54, 73] },
  });
  document.save("compras-clientes-recuperados.pdf");
}
