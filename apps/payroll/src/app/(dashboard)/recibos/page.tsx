"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, MessageCircle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  ColumnDef,
  DataTable,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@cosmetics/ui";
import { LivePayrollControls } from "@/components/payroll/live-payroll-controls";
import { MetricCard } from "@/components/payroll/metric-card";
import { SectionCard } from "@/components/payroll/section-card";
import { StatusBadge } from "@/components/payroll/status-badge";
import { useLivePayrollPreview } from "@/hooks/use-live-payroll-preview";
import { api, apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, formatPercent, sumBy } from "@/lib/format";
import { suggestedPayrollDate } from "@/lib/payroll-periods";
import { mapPayrollRun, mapPayrollRunLine } from "@/lib/payroll-run-mappers";
import type {
  PayrollReceipt,
  PayrollRunLine,
  ReceiptStatus,
} from "@/lib/types";

type ApiResponse<T> = { success: boolean; data: T; message: string };

interface ReceiptPreview {
  id: string;
  employeeName: string;
  totalPayment: number;
  phone: string | null;
  runLine: PayrollRunLine;
}

interface ReceiptDocument {
  id: string;
  employeeName: string;
  runLine: PayrollRunLine;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  provisional: boolean;
}

interface RawReceipt {
  id: string;
  status: ReceiptStatus;
  sentAt?: string | null;
  confirmedAt?: string | null;
  payrollRunLine: unknown;
}

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

function issuedReceiptDocument(receipt: PayrollReceipt): ReceiptDocument {
  return {
    id: receipt.id,
    employeeName: receipt.employeeName,
    runLine: receipt.runLine,
    periodStart: receipt.run.from,
    periodEnd: receipt.run.to,
    payDate: receipt.run.payDate,
    provisional: false,
  };
}

async function downloadReceiptPdf(receipt: ReceiptDocument) {
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
  doc.text(
    receipt.provisional ? "VISTA PREVIA DE RECIBO" : "RECIBO DE NÓMINA",
    40,
    58,
  );
  doc.setTextColor(24, 24, 24);
  doc.setFontSize(15);
  doc.text(line.employeeName, 40, 115);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${line.position} · ${line.branch}`, 40, 132);
  doc.text(
    `Periodo: ${formatDate(receipt.periodStart)} al ${formatDate(receipt.periodEnd)} · Pago: ${formatDate(receipt.payDate)}`,
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
  doc.text(
    receipt.provisional
      ? "Vista provisional calculada con los datos vigentes; no acredita pago."
      : "Documento generado desde la corrida aprobada y pagada.",
    572,
    744,
    { align: "right" },
  );
  doc.save(
    `${receipt.provisional ? "vista-previa" : "recibo"}-${normalizeFileName(receipt.employeeName)}-${receipt.periodStart}-${receipt.periodEnd}.pdf`,
  );
}

function mapReceipt(raw: RawReceipt): PayrollReceipt {
  const runLineRecord = raw.payrollRunLine as Record<string, unknown>;
  const line = mapPayrollRunLine(runLineRecord);
  const run = mapPayrollRun(runLineRecord.payrollRun);
  return {
    id: raw.id,
    employeeName: line.employeeName,
    period: `${run.from} A ${run.to}`,
    totalPayment: line.totalPayment,
    status: raw.status,
    phone: line.phoneNumber,
    sentAt: raw.sentAt ?? null,
    confirmedAt: raw.confirmedAt ?? null,
    runLine: line,
    run,
  };
}

export default function RecibosPage() {
  const live = useLivePayrollPreview();
  const [issuedReceipts, setIssuedReceipts] = useState<PayrollReceipt[]>([]);
  const [issuedLoading, setIssuedLoading] = useState(true);
  const [issuedError, setIssuedError] = useState<string | null>(null);

  const loadIssuedReceipts = useCallback(async () => {
    setIssuedLoading(true);
    setIssuedError(null);
    try {
      const response = await api.get<ApiResponse<RawReceipt[]>>(
        "/api/payroll/receipts",
        {
          params: {
            periodStart: live.selectedPeriod.from,
            periodEnd: live.selectedPeriod.to,
          },
        },
      );
      setIssuedReceipts(response.data.data.map(mapReceipt));
    } catch (cause) {
      setIssuedReceipts([]);
      setIssuedError(
        apiErrorMessage(cause, "No se pudieron cargar los recibos emitidos."),
      );
    } finally {
      setIssuedLoading(false);
    }
  }, [live.selectedPeriod.from, live.selectedPeriod.to]);

  useEffect(() => {
    void loadIssuedReceipts();
  }, [loadIssuedReceipts]);

  const previews = useMemo<ReceiptPreview[]>(
    () =>
      (live.preview?.lines ?? []).map((line) => ({
        id: `preview-${line.employeeId}`,
        employeeName: line.employeeName,
        totalPayment: line.totalPayment,
        phone: line.phoneNumber,
        runLine: line,
      })),
    [live.preview?.lines],
  );

  async function downloadPreview(receipt: ReceiptPreview) {
    try {
      await downloadReceiptPdf({
        id: receipt.id,
        employeeName: receipt.employeeName,
        runLine: receipt.runLine,
        periodStart: live.selectedPeriod.from,
        periodEnd: live.selectedPeriod.to,
        payDate: suggestedPayrollDate(live.selectedPeriod.to),
        provisional: true,
      });
      toast.success(`Vista previa generada para ${receipt.employeeName}.`);
    } catch (cause) {
      toast.error(
        apiErrorMessage(cause, "No se pudo generar la vista previa."),
      );
    }
  }

  async function downloadIssued(receipt: PayrollReceipt) {
    try {
      await downloadReceiptPdf(issuedReceiptDocument(receipt));
      toast.success(`Recibo generado para ${receipt.employeeName}.`);
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "No se pudo generar el recibo."));
    }
  }

  async function send(receipt: PayrollReceipt) {
    const url = whatsappUrl(receipt);
    if (!url) {
      toast.warning("El empleado no tiene teléfono registrado.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    try {
      await downloadReceiptPdf(issuedReceiptDocument(receipt));
      await api.patch(`/api/payroll/receipts/${receipt.id}/status`, {
        status: "SENT",
      });
      await loadIssuedReceipts();
      toast.success(
        "Se descargó el PDF y se abrió WhatsApp para adjuntarlo manualmente.",
      );
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "No se pudo preparar el envío."));
    }
  }

  async function confirm(receipt: PayrollReceipt) {
    try {
      await api.patch(`/api/payroll/receipts/${receipt.id}/status`, {
        status: "CONFIRMED",
      });
      await loadIssuedReceipts();
      toast.success("Recepción confirmada.");
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    }
  }

  const previewColumns: ColumnDef<ReceiptPreview>[] = [
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
      id: "period",
      accessorFn: () => `${live.selectedPeriod.from} ${live.selectedPeriod.to}`,
      header: "PERIODO",
      cell: () =>
        `${formatDate(live.selectedPeriod.from)} – ${formatDate(live.selectedPeriod.to)}`,
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
      id: "status",
      accessorFn: () => "VISTA PREVIA",
      header: "ESTATUS",
      cell: () => (
        <span className="text-xs font-medium uppercase text-[var(--text-muted)]">
          Vista previa
        </span>
      ),
    },
    {
      id: "actions",
      header: "ACCIONES",
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Descargar vista previa de ${row.original.employeeName}`}
            onClick={() => void downloadPreview(row.original)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const issuedColumns: ColumnDef<PayrollReceipt>[] = [
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
            onClick={() => void downloadIssued(row.original)}
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
          Vista previa con datos vigentes y seguimiento de recibos ya emitidos.
        </p>
      </header>
      <LivePayrollControls
        options={live.options}
        periodValue={live.periodValue}
        onPeriodChange={live.setPeriodValue}
        mode={live.mode}
        onModeChange={live.setMode}
        refreshing={live.refreshing}
        generatedAt={live.preview?.generatedAt}
        onRefresh={() => void live.refresh()}
      />
      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Vista actual</TabsTrigger>
          <TabsTrigger value="issued">Emitidos</TabsTrigger>
        </TabsList>
        <TabsContent value="current" className="space-y-6">
          {live.loading ? (
            <Card>
              <CardContent
                className="p-8 text-sm text-[var(--text-muted)]"
                role="status"
              >
                Calculando las vistas previas vigentes…
              </CardContent>
            </Card>
          ) : live.error ? (
            <Card>
              <CardContent className="p-8 text-sm text-red-600" role="alert">
                {live.error}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Vistas disponibles"
                  value={`${previews.length}`}
                  tone="gold"
                />
                <MetricCard
                  label="Con teléfono"
                  value={`${previews.filter((item) => item.phone).length}`}
                  tone="sage"
                />
                <MetricCard
                  label="Total provisional"
                  value={formatCurrency(
                    sumBy(previews, (item) => item.totalPayment),
                  )}
                  tone="blue"
                />
              </div>
              <SectionCard
                eyebrow="Cálculo vigente"
                title="VISTAS PREVIAS POR EMPLEADO"
              >
                <DataTable
                  columns={previewColumns}
                  data={previews}
                  searchPlaceholder="Buscar empleado"
                  emptyMessage="Sin datos vigentes para esta quincena."
                  pageSize={10}
                />
              </SectionCard>
              <p className="text-xs text-[var(--text-muted)]">
                Estas vistas son provisionales, no acreditan pago y no cambian
                el estatus de la corrida. Los recibos oficiales siguen
                emitiéndose al marcar una corrida como pagada.
              </p>
            </>
          )}
        </TabsContent>
        <TabsContent value="issued" className="space-y-6">
          {issuedLoading ? (
            <Card>
              <CardContent
                className="p-8 text-sm text-[var(--text-muted)]"
                role="status"
              >
                Cargando recibos emitidos…
              </CardContent>
            </Card>
          ) : issuedError ? (
            <Card>
              <CardContent className="p-8 text-sm text-red-600" role="alert">
                {issuedError}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Emitidos"
                  value={`${issuedReceipts.length}`}
                  tone="gold"
                />
                <MetricCard
                  label="Confirmados"
                  value={`${issuedReceipts.filter((item) => item.status === "CONFIRMED").length}`}
                  tone="sage"
                />
                <MetricCard
                  label="Total emitido"
                  value={formatCurrency(
                    sumBy(issuedReceipts, (item) => item.totalPayment),
                  )}
                  tone="blue"
                />
              </div>
              <SectionCard eyebrow="Corrida pagada" title="RECIBOS EMITIDOS">
                <DataTable
                  columns={issuedColumns}
                  data={issuedReceipts}
                  searchPlaceholder="Buscar recibo o empleado"
                  emptyMessage="Esta quincena todavía no tiene recibos emitidos."
                  pageSize={10}
                />
              </SectionCard>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
