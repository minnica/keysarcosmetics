import type { SchedulerAestheticVisitRecordDto } from "@cosmetics/types";

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function textValue(value: string | number | boolean | null): string {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return value === null || value === "" ? "Sin registro" : String(value);
}

export async function downloadAestheticRecordPdf(
  record: SchedulerAestheticVisitRecordDto,
  customerName: string,
): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setTextColor(27, 42, 57);
  pdf.setFontSize(18);
  pdf.text("Expediente estético por visita", 14, 18);
  pdf.setFontSize(10);
  pdf.setTextColor(91, 103, 117);
  pdf.text(`${customerName} · ${dateLabel(record.appointmentAt)}`, 14, 25);
  pdf.text(
    `${record.branchName} · ${record.serviceName} · ${record.specialistName}`,
    14,
    31,
  );
  autoTable(pdf, {
    startY: 38,
    head: [["Categoría", "Campo", "Valor"]],
    body: record.categories.flatMap((category) =>
      category.fields.map((field) => [
        category.name,
        field.label,
        textValue(field.value),
      ]),
    ),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.4 },
    headStyles: { fillColor: [42, 58, 75] },
  });
  const finalY =
    (pdf as typeof pdf & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 48;
  const lines = [
    ["Productos", record.products.join(", ") || "Sin registro"],
    ["Técnicas", record.techniques.join(", ") || "Sin registro"],
    ["Recomendaciones", record.recommendations || "Sin registro"],
    [
      "Evidencia fotográfica",
      record.photos.length
        ? record.photos
            .map((photo) => `${photo.kind}: ${photo.fileName} (${photo.area})`)
            .join(" · ")
        : "Sin fotografías",
    ],
  ];
  autoTable(pdf, {
    startY: finalY + 7,
    body: lines,
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 2.2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 42 } },
  });
  const signatureY = Math.min(
    275,
    ((pdf as typeof pdf & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? finalY + 35) + 12,
  );
  pdf.setDrawColor(195, 165, 131);
  pdf.line(14, signatureY, 92, signatureY);
  pdf.setFontSize(9);
  pdf.setTextColor(61, 72, 84);
  pdf.text(
    record.status === "SIGNED"
      ? `Firmado por ${record.signedBy} · ${dateLabel(record.signedAt!)}`
      : "Borrador pendiente de firma",
    14,
    signatureY + 5,
  );
  pdf.text(
    `Plantilla ${record.templateName} v${record.templateVersion} · Registro v${record.version}`,
    14,
    signatureY + 10,
  );
  pdf.save(`expediente-estetico-${record.appointmentAt.slice(0, 10)}.pdf`);
}
