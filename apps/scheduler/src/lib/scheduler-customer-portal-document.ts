import type { SchedulerCustomerPortalDocumentDto } from "@cosmetics/types";

function safeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export async function downloadCustomerPortalDocument(input: {
  customerName: string;
  document: SchedulerCustomerPortalDocumentDto;
}): Promise<void> {
  const [{ jsPDF }] = await Promise.all([import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const width = 210 - margin * 2;
  const status =
    input.document.status === "SIGNED"
      ? "Firmado"
      : input.document.status === "PENDING_SIGNATURE"
        ? "Pendiente de firma"
        : "Disponible";

  pdf.setFillColor(24, 34, 48);
  pdf.rect(0, 0, 210, 44, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("KEYSAR COSMETICS", margin, 21);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Portal de clientes - documento de solo lectura", margin, 30);

  pdf.setTextColor(38, 54, 73);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(input.document.name, margin, 62, { maxWidth: width });

  pdf.setDrawColor(222, 213, 204);
  pdf.setFillColor(249, 247, 244);
  pdf.roundedRect(margin, 76, width, 50, 4, 4, "FD");
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("CLIENTA", margin + 8, 88);
  pdf.text("ESTADO", margin + 8, 103);
  pdf.text("VERSION", margin + 95, 103);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(input.customerName, margin + 8, 95);
  pdf.text(status, margin + 8, 111);
  pdf.text(String(input.document.version), margin + 95, 111);

  if (
    input.document.status === "SIGNED" &&
    input.document.signerDisplayName &&
    input.document.signedAt
  ) {
    pdf.setFontSize(9);
    pdf.setTextColor(47, 125, 97);
    pdf.text(
      `Firmado por ${input.document.signerDisplayName} el ${new Intl.DateTimeFormat(
        "es-MX",
        { dateStyle: "medium", timeStyle: "short" },
      ).format(new Date(input.document.signedAt))}`,
      margin + 8,
      120,
    );
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(82, 94, 108);
  const body =
    input.document.kind === "CONSENT"
      ? "Este comprobante identifica la version del consentimiento disponible en el portal. La firma se registra de forma separada y auditable; este archivo no sustituye el documento clinico original."
      : input.document.kind === "RECOMMENDATION"
        ? "Recomendaciones posteriores disponibles para consulta de la clienta. Sigue exclusivamente las indicaciones personalizadas entregadas por tu especialista."
        : "Comprobante disponible para consulta en el portal de clientes.";
  pdf.text(pdf.splitTextToSize(body, width), margin, 146);

  pdf.setDrawColor(195, 165, 131);
  pdf.line(margin, 260, 210 - margin, 260);
  pdf.setFontSize(8);
  pdf.setTextColor(112, 121, 132);
  pdf.text(
    `Actualizado: ${new Intl.DateTimeFormat("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(input.document.updatedAt))}`,
    margin,
    268,
  );
  pdf.text("Generado desde el entorno de diseno - datos ficticios", margin, 275);
  pdf.save(`${safeFileName(input.document.name) || "documento"}.pdf`);
}
