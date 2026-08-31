"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { PenLine, Trash2 } from "lucide-react";
import SignaturePadLib, {
  type Options as SignaturePadOptions,
  type PointGroup,
} from "signature_pad";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import { api } from "@/lib/api";
import { useVentas } from "@/hooks";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate, todayISO } from "@/lib/utils";

type BranchOption = { id: string; nombre: string };
type EmployeeOption = { id: string; nombreCompleto: string };
type PaymentMethodOption = { id: string; nombre: string; tipo?: string | null };

interface GenerateEnvelopeDialogProps {
  sucursales: BranchOption[];
  empleados: EmployeeOption[];
  metodosPago: PaymentMethodOption[];
}

interface SignaturePadHandle {
  clear: () => void;
  hasSignature: () => boolean;
  getCanvas: () => HTMLCanvasElement | null;
}

type SignaturePadInstance = {
  clear: () => void;
  off: () => void;
  isEmpty: () => boolean;
  toData: () => PointGroup[];
  fromData: (data: PointGroup[], options?: { clear?: boolean }) => void;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function fromCents(amount: number) {
  return amount / 100;
}

const PAYMENT_BUCKETS = [
  {
    label: "EFECTIVO",
    matches: (name: string, type?: string | null) =>
      normalize(name).includes("EFECTIVO") || normalize(type ?? "") === "EFECTIVO",
  },
  {
    label: "NETPAY TERMINAL",
    matches: (name: string, type?: string | null) => {
      const text = normalize(name);
      return text.includes("NETPAY") && !text.includes("LINK")
        || normalize(type ?? "") === "NETPAY TERMINAL";
    },
  },
  {
    label: "NETPAY LINK",
    matches: (name: string, type?: string | null) => {
      const text = normalize(name);
      return text.includes("NETPAY") && text.includes("LINK")
        || normalize(type ?? "") === "NETPAY LINK";
    },
  },
  {
    label: "MERCADO PAGO LINK",
    matches: (name: string, type?: string | null) => {
      const text = normalize(name);
      return text.includes("MERCADO") && text.includes("LINK")
        || normalize(type ?? "") === "MERCADO PAGO LINK";
    },
  },
  {
    label: "MERCADO PAGO TERMINAL",
    matches: (name: string, type?: string | null) => {
      const text = normalize(name);
      return text.includes("MERCADO") && !text.includes("LINK")
        || normalize(type ?? "") === "MERCADO PAGO TERMINAL";
    },
  },
  {
    label: "TRANSFERENCIA",
    matches: (name: string, type?: string | null) =>
      normalize(name).includes("TRANSFER") || normalize(type ?? "") === "TRANSFERENCIA",
  },
] as const;

type PaymentBucketLabel = (typeof PAYMENT_BUCKETS)[number]["label"];
type PaymentLine = { label: PaymentBucketLabel | "TOTAL VENTA"; totalCents: number };

function resolvePaymentBucket(name: string, type?: string | null) {
  return PAYMENT_BUCKETS.find((bucket) => bucket.matches(name, type))?.label ?? null;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePadInstance | null>(null);
  const hasSignatureRef = useRef(false);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const pad = padRef.current;
    if (!canvas || !pad) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    const wasEmpty = pad.isEmpty();
    const data = wasEmpty ? null : pad.toData();

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    if (data && data.length > 0) {
      pad.fromData(data, { clear: true });
      hasSignatureRef.current = true;
    } else {
      pad.clear();
      hasSignatureRef.current = false;
    }
  };

  const clear = () => {
    padRef.current?.clear();
    hasSignatureRef.current = false;
  };

  useImperativeHandle(ref, () => ({
    clear,
    hasSignature: () => hasSignatureRef.current,
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const SignaturePadCtor = SignaturePadLib as unknown as new (
      canvas: HTMLCanvasElement,
      options?: SignaturePadOptions,
    ) => SignaturePadInstance;

    const pad = new SignaturePadCtor(canvas, {
      backgroundColor: "rgba(0,0,0,0)",
      penColor: "#1f2937",
      minWidth: 1.1,
      maxWidth: 2.6,
      velocityFilterWeight: 0.6,
      throttle: 0,
      minDistance: 0,
    });
    padRef.current = pad;

    const updateSignatureState = () => {
      hasSignatureRef.current = !pad.isEmpty();
    };

    const handleBeginStroke = () => {
      hasSignatureRef.current = true;
    };

    const handleEndStroke = () => {
      updateSignatureState();
    };

    pad.addEventListener("beginStroke", handleBeginStroke);
    pad.addEventListener("endStroke", handleEndStroke);

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(canvas);

    resizeCanvas();

    return () => {
      pad.removeEventListener("beginStroke", handleBeginStroke);
      pad.removeEventListener("endStroke", handleEndStroke);
      pad.off();
      padRef.current = null;
      observer.disconnect();
    };
  }, []);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-44 w-full rounded-xl border bg-transparent"
        style={{ touchAction: "none", borderColor: "var(--border-color)" }}
      />
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Firma con el dedo o con el mouse dentro del recuadro.
      </p>
    </div>
  );
});

export function GenerateEnvelopeDialog({
  sucursales,
  empleados,
  metodosPago,
}: GenerateEnvelopeDialogProps) {
  const { user, canAccess } = useSession();
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedBranchId, setSelectedBranchId] = useState<string>(sucursales[0]?.id ?? "");
  const [generating, setGenerating] = useState(false);
  const signatureRef = useRef<SignaturePadHandle | null>(null);
  const pendingSuccessToastRef = useRef(false);

  const canGenerateEnvelope = canAccess("ventas/generar-sobre");
  const {
    registros,
    loading: loadingSales,
  } = useVentas({
    fechaInicio: selectedDate,
    fechaFin: selectedDate,
    enabled: open && canGenerateEnvelope,
    includeProtectedForEnvelope: true,
  });

  useEffect(() => {
    if (!selectedBranchId && sucursales[0]) {
      setSelectedBranchId(sucursales[0].id);
    }
  }, [selectedBranchId, sucursales]);

  const selectedBranch = useMemo(
    () => sucursales.find((branch) => branch.id === selectedBranchId) ?? null,
    [selectedBranchId, sucursales],
  );

  const selectedSales = useMemo(
    () =>
      registros.filter(
        (record) =>
          record.fecha === selectedDate && record.sucursalId === selectedBranchId,
      ),
    [registros, selectedBranchId, selectedDate],
  );
  const hasSelectedSales = selectedSales.length > 0;

  const sellerRows = useMemo(() => {
    const rows = new Map<string, { vendedorId: string; totalCents: number; notes: string[]; order: number }>();

    selectedSales.forEach((sale, index) => {
      const totalCents = sale.items.reduce((sum, item) => sum + toCents(item.cantidad), 0);
      const existing = rows.get(sale.vendedorId) ?? {
        vendedorId: sale.vendedorId,
        totalCents: 0,
        notes: [],
        order: rows.size,
      };

      existing.totalCents += totalCents;
      existing.notes.push(
        ...sale.items
          .map((item) => item.notas?.trim())
          .filter((value): value is string => Boolean(value)),
      );
      if (!rows.has(sale.vendedorId)) {
        existing.order = index;
      }

      rows.set(sale.vendedorId, existing);
    });

    return [...rows.values()]
      .sort((a, b) => a.order - b.order)
      .map((row) => ({
        vendedorId: row.vendedorId,
        nombre:
          selectedSales.find((sale) => sale.vendedorId === row.vendedorId)?.vendedorNombre
          ?? empleados.find((employee) => employee.id === row.vendedorId)?.nombreCompleto
          ?? row.vendedorId,
        totalCents: row.totalCents,
        notes: [...new Set(row.notes)],
      }));
  }, [empleados, selectedSales]);

  const paymentRows = useMemo(() => {
    const paymentMap = new Map(metodosPago.map((method) => [method.id, method]));
    const totals = new Map<string, number>();

    selectedSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const method = paymentMap.get(item.metodoPagoId);
        const bucket = resolvePaymentBucket(
          item.metodoPagoNombre ?? method?.nombre ?? "",
          method?.tipo ?? null,
        );

        if (!bucket) {
          return;
        }

        totals.set(bucket, (totals.get(bucket) ?? 0) + toCents(item.cantidad));
      });
    });

    return PAYMENT_BUCKETS.map((bucket) => ({
      label: bucket.label,
      totalCents: totals.get(bucket.label) ?? 0,
    }));
  }, [metodosPago, selectedSales]);

  const totalCents = useMemo(
    () => selectedSales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + toCents(item.cantidad), 0), 0),
    [selectedSales],
  );

  const notes = useMemo(() => {
    const values = selectedSales.flatMap((sale) =>
      sale.items
        .map((item) => item.notas?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    return [...new Set(values)].join(" · ");
  }, [selectedSales]);

  const downloadName = useMemo(() => {
    const branch = selectedBranch?.nombre ?? "sucursal";
    return `sobre-${normalize(branch).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${selectedDate}.png`;
  }, [selectedBranch?.nombre, selectedDate]);

  function resetDialogState() {
    signatureRef.current?.clear();
    setSelectedDate(todayISO());
    setSelectedBranchId(sucursales[0]?.id ?? "");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetDialogState();
    }
  }

  function handleCloseComplete() {
    if (!pendingSuccessToastRef.current) return;

    pendingSuccessToastRef.current = false;
    toast.success(t.sales.generateEnvelopeReady);
  }

  function buildEnvelopeCanvas(signatureCanvas: HTMLCanvasElement, signerName: string) {
    const width = 1060;
    const rowHeight = 52;
    const topBoxHeight = 104;
    const sellerRowsCount = Math.max(sellerRows.length, 8);
    const sellersHeight = 108 + sellerRowsCount * rowHeight;
    const paymentHeight = 92 + PAYMENT_BUCKETS.length * 44;
    const notesHeight = 180;
    const footerHeight = 128;
    const height = 48 + topBoxHeight + 28 + sellersHeight + 28 + paymentHeight + 28 + notesHeight + 28 + footerHeight + 48;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo crear el lienzo del sobre");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#2f2a27";
    ctx.lineWidth = 3;

    const boxX = 40;
    const boxW = width - 80;

    // Top box
    drawRoundedRect(ctx, boxX, 36, boxW, topBoxHeight, 24);
    ctx.stroke();
    ctx.fillStyle = "#2f2a27";
    ctx.font = "700 26px sans-serif";
    ctx.fillText("SUCURSAL:", 68, 88);
    ctx.font = "400 26px sans-serif";
    ctx.fillText(selectedBranch?.nombre ?? "—", 226, 88);
    ctx.beginPath();
    ctx.moveTo(226, 96);
    ctx.lineTo(456, 96);
    ctx.stroke();
    ctx.font = "700 26px sans-serif";
    ctx.fillText("FECHA:", width - 320, 88);
    ctx.font = "400 26px sans-serif";
    ctx.fillText(formatDate(selectedDate, "dd MMM yyyy", locale), width - 220, 88);
    ctx.beginPath();
    ctx.moveTo(width - 223, 96);
    ctx.lineTo(width - 70, 96);
    ctx.stroke();

    // Sellers box
    const sellersY = 168;
    drawRoundedRect(ctx, boxX, sellersY, boxW, sellersHeight, 28);
    ctx.stroke();
    ctx.font = "700 26px sans-serif";
    ctx.fillText("REPRESENTANTE:", 76, sellersY + 52);
    ctx.fillText("VENTA:", width - 330, sellersY + 52);

    const lineStartY = sellersY + 110;
    const leftX = 80;
    const leftLineW = 340;
    const rightX = width - 330;
    const rightLineW = 210;
    const firstSellerRow = lineStartY;

    for (let index = 0; index < sellerRowsCount; index += 1) {
      const rowY = firstSellerRow + index * rowHeight;
      const row = sellerRows[index];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftX - 18, rowY + 20);
      ctx.lineTo(leftX + leftLineW, rowY + 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rightX, rowY + 20);
      ctx.lineTo(rightX + rightLineW, rowY + 20);
      ctx.stroke();
      ctx.font = "400 24px sans-serif";
      ctx.fillStyle = "#4b5563";
      ctx.fillText(row?.nombre ?? "", leftX, rowY + 10);
      ctx.fillStyle = "#2f2a27";
      ctx.fillText(row ? formatCurrency(fromCents(row.totalCents)) : "", rightX + 10, rowY + 10);
    }

    // Payment section
    const paymentsY = sellersY + sellersHeight + 28;
    const paymentBoxHeight = paymentHeight;
    drawRoundedRect(ctx, boxX, paymentsY, boxW, paymentBoxHeight, 28);
    ctx.stroke();

    ctx.font = "700 24px sans-serif";
    ctx.fillText("EFECTIVO", 76, paymentsY + 50);
    ctx.fillText("NETPAY TERMINAL", 76, paymentsY + 94);
    ctx.fillText("NETPAY LINK", 76, paymentsY + 138);
    ctx.fillText("MERCADO PAGO TERMINAL", 76, paymentsY + 182);
    ctx.fillText("MERCADO PAGO LINK", 76, paymentsY + 226);
    ctx.fillText("TRANSFERENCIA", 76, paymentsY + 270);
    ctx.fillText("TOTAL VENTA", 76, paymentsY + 314);

    const paymentValueX = width - 320;
    const paymentLines: PaymentLine[] = [
      ...paymentRows,
      { label: "TOTAL VENTA", totalCents },
    ];
    paymentLines.forEach((payment, index) => {
      const rowY = paymentsY + 48 + index * 44;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(paymentValueX, rowY + 18);
      ctx.lineTo(paymentValueX + 210, rowY + 18);
      ctx.stroke();
      ctx.font = payment.label === "TOTAL VENTA" ? "700 24px sans-serif" : "400 24px sans-serif";
      ctx.fillText(formatCurrency(fromCents(payment.totalCents)), paymentValueX + 8, rowY + 10);
    });

    // Notes section
    const notesY = paymentsY + paymentBoxHeight + 28;
    drawRoundedRect(ctx, boxX, notesY, boxW, notesHeight, 22);
    ctx.stroke();
    ctx.font = "700 28px sans-serif";
    ctx.fillText("NOTAS", 72, notesY + 50);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(160, notesY + 52);
    ctx.lineTo(width - 72, notesY + 52);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(72, notesY + 98);
    ctx.lineTo(width - 72, notesY + 98);
    ctx.stroke();

    // Footer
    const footerY = notesY + notesHeight + 28;
    drawRoundedRect(ctx, boxX, footerY, boxW, footerHeight, 22);
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.font = "700 28px sans-serif";
    ctx.fillText("NOMBRE:", 72, footerY + 50);
    ctx.fillText("FIRMA:", 72, footerY + 94);

    ctx.font = "400 26px sans-serif";
    const userName = signerName || user?.nombre || "—";
    ctx.fillText(userName, 208, footerY + 50);
    ctx.beginPath();
    ctx.moveTo(206, footerY + 58);
    ctx.lineTo(width - 80, footerY + 58);
    ctx.stroke();

    const signatureTargetWidth = 240;
    const signatureTargetHeight = 70;
    const signatureX = 198;
    const signatureY = footerY + 58;
    ctx.drawImage(
      signatureCanvas,
      0,
      0,
      signatureCanvas.width,
      signatureCanvas.height,
      signatureX,
      signatureY - 10,
      signatureTargetWidth,
      signatureTargetHeight,
    );

    return canvas;
  }

  async function handleGenerate() {
    if (!canGenerateEnvelope) {
      toast.error(t.sales.generateEnvelopeNoPermission);
      return;
    }

    if (!selectedBranchId || !selectedBranch) {
      toast.error(t.common.branch);
      return;
    }

    if (!selectedSales.length) {
      toast.error(t.sales.generateEnvelopeNoData);
      return;
    }

    const signatureCanvas = signatureRef.current?.getCanvas();
    if (!signatureCanvas || !signatureRef.current?.hasSignature()) {
      toast.error(t.sales.generateEnvelopeNoSignature);
      return;
    }

    setGenerating(true);
    try {
      const { data } = await api.get<{
        success: boolean;
        data: { nombre: string };
      }>("/api/auth/me");
      const signerName = data.data.nombre;
      const canvas = buildEnvelopeCanvas(signatureCanvas, signerName);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/png");
      });
      if (!blob) {
        throw new Error("No se pudo generar el PNG del sobre");
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      pendingSuccessToastRef.current = true;
      handleOpenChange(false);
    } catch {
      toast.error(t.sales.generateEnvelopeError);
    } finally {
      setGenerating(false);
    }
  }

  if (!canGenerateEnvelope) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <PenLine className="mr-1.5 h-4 w-4" />
        {t.sales.generateEnvelope}
      </Button>

      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        onCloseAutoFocus={handleCloseComplete}
      >
        <DialogHeader>
          <DialogTitle className="uppercase">{t.sales.generateEnvelopeDialogTitle}</DialogTitle>
          <DialogDescription>{t.sales.generateEnvelopeDialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="envelope-date">{t.common.date}</Label>
            <Input
              id="envelope-date"
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="envelope-branch">{t.common.branch}</Label>
            <Select
              value={selectedBranchId}
              onValueChange={(value) => {
                setSelectedBranchId(value);
              }}
            >
              <SelectTrigger id="envelope-branch">
                <SelectValue placeholder={t.sales.selectBranch} />
              </SelectTrigger>
              <SelectContent>
                {sucursales.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: hasSelectedSales ? "var(--border-color)" : "#d6b66a",
            backgroundColor: hasSelectedSales ? "transparent" : "rgba(214, 182, 106, 0.08)",
            color: hasSelectedSales ? "var(--text-muted)" : "#8a6d1a",
          }}
        >
          {hasSelectedSales
            ? `${selectedSales.length} registro${selectedSales.length !== 1 ? "s" : ""} · ${formatCurrency(fromCents(totalCents))}`
            : loadingSales ? t.common.loadingData : t.sales.generateEnvelopeNoData}
        </div>

        <div className="space-y-2">
          <Label>{t.sales.generateEnvelopeSignatureLabel}</Label>
          <SignaturePad ref={signatureRef} />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              signatureRef.current?.clear();
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t.sales.generateEnvelopeClearSignature}
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating || loadingSales || !hasSelectedSales}
          >
            {generating ? t.sales.generateEnvelopeGenerating : t.sales.generateEnvelope}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
