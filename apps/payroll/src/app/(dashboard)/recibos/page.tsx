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
import { useSession } from "@/lib/session";
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

function formatReceiptCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatReceiptDate(value: string, abbreviated = false) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: abbreviated ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)))
    .replace(/\./g, "")
    .replace(/\s+de\s+/gi, " ")
    .toLocaleUpperCase("es-MX");
}

function formatReceiptPeriod(from: string, to: string) {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  if (fromYear === toYear && fromMonth === toMonth) {
    const month = new Intl.DateTimeFormat("es-MX", {
      month: "short",
      timeZone: "UTC",
    })
      .format(new Date(Date.UTC(fromYear ?? 0, (fromMonth ?? 1) - 1, 1)))
      .replace(/\./g, "")
      .toLocaleUpperCase("es-MX");
    return `${String(fromDay).padStart(2, "0")} — ${String(toDay).padStart(2, "0")} ${month} ${toYear}`;
  }
  return `${formatReceiptDate(from, true)} — ${formatReceiptDate(to, true)}`;
}

function loadReceiptLogo(): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("No se pudo preparar el logo del recibo."));
        return;
      }
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () =>
      reject(new Error("No se pudo cargar el logo de Keysar Cosmetics."));
    image.src = "/logo.svg";
  });
}

async function downloadReceiptPdf(receipt: ReceiptDocument) {
  const [{ jsPDF }, logo] = await Promise.all([
    import("jspdf"),
    loadReceiptLogo(),
  ]);
  const line = receipt.runLine;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const ink: [number, number, number] = [28, 33, 31];
  const muted: [number, number, number] = [98, 105, 101];
  const green: [number, number, number] = [105, 145, 125];
  const rose: [number, number, number] = [192, 140, 143];
  const gold: [number, number, number] = [197, 167, 133];
  const paleGreen: [number, number, number] = [239, 244, 241];
  const rule: [number, number, number] = [211, 217, 214];

  doc.setFillColor(252, 252, 250);
  doc.rect(0, 0, 612, 792, "F");
  doc.addImage(logo, "PNG", 42, 36, 44, 33);
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("KEYSAR COSMETICS", 96, 52);
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    receipt.provisional ? "VISTA PREVIA DE RECIBO" : "RECIBO DE NÓMINA",
    96,
    68,
  );

  doc.setFillColor(...green);
  doc.roundedRect(438, 36, 132, 42, 7, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("PERIODO QUINCENAL", 504, 52, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    formatReceiptPeriod(receipt.periodStart, receipt.periodEnd),
    504,
    68,
    {
      align: "center",
    },
  );

  doc.setDrawColor(...gold);
  doc.setLineWidth(0.8);
  doc.line(42, 100, 570, 100);

  doc.setTextColor(62, 95, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("C O L A B O R A D O R", 42, 128);
  doc.setTextColor(...ink);
  let employeeFontSize = 19;
  doc.setFontSize(employeeFontSize);
  while (doc.getTextWidth(line.employeeName) > 528 && employeeFontSize > 12) {
    employeeFontSize -= 1;
    doc.setFontSize(employeeFontSize);
  }
  doc.text(line.employeeName, 42, 154);
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `DEL ${formatReceiptDate(receipt.periodStart)} — ${formatReceiptDate(receipt.periodEnd)}`,
    42,
    174,
  );

  doc.setFillColor(...paleGreen);
  doc.roundedRect(42, 198, 528, 94, 8, 8, "F");
  doc.setDrawColor(...rule);
  doc.line(218, 216, 218, 274);
  doc.line(394, 216, 394, 274);
  const metric = (label: string, value: string, x: number, maxWidth = 144) => {
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, x, 228);
    doc.setTextColor(...ink);
    let size = 15;
    doc.setFontSize(size);
    while (doc.getTextWidth(value) > maxWidth && size > 9) {
      size -= 1;
      doc.setFontSize(size);
    }
    doc.text(value, x, 257);
  };
  metric(
    "V E N T A S  C O N  I V A",
    formatReceiptCurrency(line.salesWithVat),
    60,
  );
  metric(
    "V E N T A S  S I N  I V A",
    formatReceiptCurrency(line.salesWithoutVat),
    236,
  );
  metric(
    "E S Q U E M A  /  C O M I S I Ó N",
    `${line.scheme} · ${formatPercent(line.individualRate)}`,
    412,
  );

  const sectionHeader = (
    x: number,
    color: [number, number, number],
    title: string,
    subtitle: string,
  ) => {
    doc.setFillColor(...color);
    doc.roundedRect(x, 328, 249, 38, 6, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, x + 14, 345);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(subtitle, x + 14, 358);
  };
  sectionHeader(42, green, "PERCEPCIONES", "IMPORTES QUE SUMAN AL PAGO");
  sectionHeader(322, rose, "DEDUCCIONES", "IMPORTES QUE REDUCEN EL PAGO");

  const receiptAmount = (value: number) =>
    Math.abs(value) < 0.005 ? "—" : formatReceiptCurrency(value);
  const drawRows = (
    x: number,
    width: number,
    rows: Array<[string, number]>,
  ) => {
    rows.forEach(([label, value], index) => {
      const y = 399 + index * 39;
      doc.setTextColor(...ink);
      doc.setFont(
        "helvetica",
        label === "Comisiones" || label === "Pago préstamo" ? "bold" : "normal",
      );
      doc.setFontSize(10);
      doc.text(label, x + 2, y);
      doc.setFont("helvetica", value ? "bold" : "normal");
      doc.text(receiptAmount(value), x + width - 2, y, { align: "right" });
      doc.setDrawColor(...rule);
      doc.setLineWidth(0.6);
      doc.line(x, y + 12, x + width, y + 12);
    });
  };
  drawRows(42, 249, [
    ["Sueldo base", line.salaryBase],
    ["Comisiones", line.commission],
    ["Bonos", line.bonus],
    ["Ajustes +", line.payrollAdjustmentPositive],
    ["Viáticos e insumos", line.perDiem + line.supplies],
  ]);
  drawRows(322, 248, [
    ["Pago préstamo", line.loanPayment],
    ["Multas", line.fine],
    ["Ajustes -", line.payrollAdjustmentNegative],
  ]);

  doc.setFillColor(...ink);
  doc.roundedRect(42, 610, 528, 88, 10, 10, "F");
  doc.setFillColor(...gold);
  doc.roundedRect(56, 624, 8, 60, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("P A G O  T O T A L", 80, 648);
  doc.setTextColor(190, 194, 191);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("PERCEPCIONES - DEDUCCIONES", 80, 670);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(formatReceiptCurrency(line.totalPayment), 548, 663, {
    align: "right",
  });

  doc.setDrawColor(...rule);
  doc.line(42, 730, 570, 730);
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("KEYSAR COSMETICS", 42, 746);
  doc.text(
    receipt.provisional
      ? "VISTA PROVISIONAL · NO ACREDITA PAGO"
      : `DOCUMENTO DE NÓMINA · FOLIO ${receipt.id}`,
    570,
    746,
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
  const { canWrite } = useSession();
  const hasWriteAccess = canWrite("payroll/recibos");
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
          {hasWriteAccess ? (
            <>
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
            </>
          ) : null}
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
