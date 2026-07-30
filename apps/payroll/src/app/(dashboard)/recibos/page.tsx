"use client";

import { CheckCircle2, Download, MessageCircle } from "lucide-react";
import { Button, ColumnDef, DataTable, toast } from "@cosmetics/ui";
import { MetricCard } from "@/components/payroll/metric-card";
import { SectionCard } from "@/components/payroll/section-card";
import { StatusBadge } from "@/components/payroll/status-badge";
import { usePayrollData } from "@/components/payroll/payroll-data-context";
import { apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, formatPercent, sumBy } from "@/lib/format";
import type { PayrollReceipt } from "@/lib/types";

function normalizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function whatsappUrl(receipt: PayrollReceipt) {
  const phone = (receipt.phone ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(
    `Hola ${receipt.employeeName}, tu recibo de nómina del periodo ${formatDate(receipt.run.from)} al ${formatDate(receipt.run.to)} está listo. Total: ${formatCurrency(receipt.totalPayment)}.`,
  );
  return phone ? `https://wa.me/${phone}?text=${text}` : null;
}

async function downloadReceiptPdf(receipt: PayrollReceipt) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const line = receipt.runLine;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  doc.setFillColor(100, 134, 114);
  doc.rect(0, 0, 612, 82, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("KEYSAR COSMETICS", 40, 38);
  doc.setFontSize(10);
  doc.text("RECIBO DE NÓMINA", 40, 58);
  doc.setTextColor(24, 24, 24);
  doc.setFontSize(15);
  doc.text(line.employeeName, 40, 115);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${line.position} · ${line.branch}`, 40, 132);
  doc.text(
    `Periodo: ${formatDate(receipt.run.from)} al ${formatDate(receipt.run.to)} · Pago: ${formatDate(receipt.run.payDate)}`,
    40,
    149,
  );

  const rows = [
    ["Ventas con IVA", formatCurrency(line.salesWithVat)],
    ["Ventas sin IVA", formatCurrency(line.salesWithoutVat)],
    [
      `Esquema ${line.scheme}${line.schemeVersion ? ` V${line.schemeVersion}` : ""}`,
      formatPercent(line.individualRate),
    ],
    ["Sueldo base quincenal", formatCurrency(line.salaryBase)],
    ["Comisiones", formatCurrency(line.commission)],
    ["Bonos", formatCurrency(line.bonus)],
    ["Ajustes positivos", formatCurrency(line.payrollAdjustmentPositive)],
    ["Viáticos y suministros", formatCurrency(line.perDiem + line.supplies)],
    ["Multas", `-${formatCurrency(line.fine)}`],
    ["Ajustes negativos", `-${formatCurrency(line.payrollAdjustmentNegative)}`],
    ["Pago de préstamo/adelanto", `-${formatCurrency(line.loanPayment)}`],
  ];
  autoTable(doc, {
    startY: 172,
    head: [["CONCEPTO", "IMPORTE"]],
    body: rows,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 7 },
    headStyles: {
      fillColor: [238, 241, 239],
      textColor: [55, 65, 60],
      fontStyle: "bold",
    },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });
  const finalY =
    (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 440;
  doc.setFillColor(26, 26, 26);
  doc.roundedRect(40, finalY + 18, 532, 48, 5, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PAGO TOTAL", 56, finalY + 47);
  doc.setFontSize(16);
  doc.text(formatCurrency(line.totalPayment), 556, finalY + 47, {
    align: "right",
  });
  doc.setTextColor(95, 95, 95);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Folio: ${receipt.id}`, 40, 744);
  doc.text("Documento generado desde la corrida aprobada y pagada.", 572, 744, {
    align: "right",
  });
  doc.save(
    `recibo-${normalizeFileName(receipt.employeeName)}-${receipt.run.from}-${receipt.run.to}.pdf`,
  );
}

export default function RecibosPage() {
  const data = usePayrollData();

  async function download(receipt: PayrollReceipt) {
    try {
      await downloadReceiptPdf(receipt);
      toast.success(`Recibo generado para ${receipt.employeeName}.`);
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "No se pudo generar el recibo."));
    }
  }

  async function send(receipt: PayrollReceipt) {
    const url = whatsappUrl(receipt);
    if (!url) {
      toast.error("El empleado no tiene teléfono registrado.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    try {
      await downloadReceiptPdf(receipt);
      await data.setReceiptStatus(receipt.id, "SENT");
      toast.success(
        "Se descargó el PDF y se abrió WhatsApp para adjuntarlo manualmente.",
      );
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "No se pudo preparar el envío."));
    }
  }

  async function confirm(receipt: PayrollReceipt) {
    try {
      await data.setReceiptStatus(receipt.id, "CONFIRMED");
      toast.success("Recepción confirmada.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    }
  }

  const columns: ColumnDef<PayrollReceipt>[] = [
    {
      accessorKey: "employeeName",
      header: "EMPLEADO",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.employeeName}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {row.original.runLine.position}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "period",
      header: "PERIODO",
      cell: ({ row }) =>
        `${formatDate(row.original.run.from)} – ${formatDate(row.original.run.to)}`,
    },
    {
      accessorKey: "totalPayment",
      header: "TOTAL PAGO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="number-display text-right">
          {formatCurrency(row.original.totalPayment)}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "WHATSAPP",
      cell: ({ row }) =>
        row.original.phone || (
          <span className="text-[var(--text-muted)]">SIN TELÉFONO</span>
        ),
    },
    {
      accessorKey: "confirmedAt",
      header: "CONFIRMADO",
      cell: ({ row }) =>
        row.original.confirmedAt
          ? formatDate(row.original.confirmedAt.slice(0, 10))
          : "PENDIENTE",
    },
    {
      accessorKey: "status",
      header: "ESTATUS",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "ACCIONES",
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Descargar recibo de ${row.original.employeeName}`}
            onClick={() => void download(row.original)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={!row.original.phone}
            aria-label={`Enviar recibo de ${row.original.employeeName}`}
            onClick={() => void send(row.original)}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={row.original.status === "CONFIRMED"}
            aria-label={`Confirmar recibo de ${row.original.employeeName}`}
            onClick={() => void confirm(row.original)}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Recibos</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          PDF individual y seguimiento manual de WhatsApp para la corrida
          seleccionada.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Generados"
          value={`${data.receipts.length}`}
          tone="gold"
        />
        <MetricCard
          label="Confirmados"
          value={`${data.receipts.filter((item) => item.status === "CONFIRMED").length}`}
          tone="sage"
        />
        <MetricCard
          label="Total emitido"
          value={formatCurrency(
            sumBy(data.receipts, (item) => item.totalPayment),
          )}
          tone="blue"
        />
      </div>
      <SectionCard eyebrow="Corrida pagada" title="RECIBOS POR EMPLEADO">
        <DataTable
          columns={columns}
          data={data.receipts}
          searchPlaceholder="Buscar recibo o empleado"
          emptyMessage="La corrida seleccionada aún no tiene recibos. Se generan al marcarla como pagada."
          pageSize={10}
        />
      </SectionCard>
    </div>
  );
}
