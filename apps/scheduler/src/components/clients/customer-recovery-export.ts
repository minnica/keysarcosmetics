import type { DesignCustomerRecoveryCase } from "../../../design/contracts";

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

const columns = [
  "Cliente",
  "Teléfono",
  "Sucursal",
  "Motivo",
  "Fecha de detección",
  "Última cita",
  "Asistencias",
  "Vendedor de cartera",
  "Status",
  "Última gestión",
] as const;

function rowValues(item: DesignCustomerRecoveryCase) {
  return [
    item.customerName,
    item.phone ?? "Sin teléfono",
    item.branchName,
    reasonLabels[item.reason],
    item.eligibilityAt.slice(0, 10),
    item.lastAppointmentAt?.slice(0, 10) ?? "Sin visita previa",
    item.attendedCount,
    item.portfolioOwnerName,
    statusLabels[item.status],
    item.history[0]?.notes ?? "Sin gestión registrada",
  ];
}

function fileName(extension: string) {
  return `recuperacion-clientes-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export async function exportCustomerRecoverySelection(
  rows: DesignCustomerRecoveryCase[],
  format: RecoveryExportFormat,
) {
  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Recuperación de clientes"],
      ["Registros seleccionados", rows.length],
      [],
      [...columns],
      ...rows.map(rowValues),
    ]);
    sheet["!cols"] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 24 },
      { wch: 18 },
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
    body: rows.map(rowValues),
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
) {
  const target = window.open("", "_blank", "noopener,noreferrer");
  if (!target) throw new Error("Permite ventanas emergentes para imprimir.");
  const body = rows
    .map(
      (item) =>
        `<tr>${rowValues(item)
          .map((value) => `<td>${escapeHtml(value)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  target.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recuperación de clientes</title><style>@page{size:landscape;margin:10mm}body{font:11px Arial;color:#263649}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 18px;color:#64748b}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d9dce1;padding:6px;text-align:left;vertical-align:top}th{background:#263649;color:#fff}tr:nth-child(even){background:#f8f5f1}</style></head><body><h1>Recuperación de clientes</h1><p>${rows.length} registros seleccionados</p><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table><script>window.addEventListener('load',()=>window.print())</script></body></html>`);
  target.document.close();
}
