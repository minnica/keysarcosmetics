"use client";
// Reporte: Ventas de un vendedor específico desglosadas por día
import { useState } from "react";
import {
  Label,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@cosmetics/ui";
import {
  DateRangePicker,
  type DateRange,
} from "@cosmetics/ui";
import { Badge } from "@cosmetics/ui";
;
import { useReportes } from "@/hooks";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate, todayISO } from "@/lib/utils";

function firstDayOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function VentasPorVendedorDiaPage() {
  const { registros, empleados, sucursales, metodosPago, loading, error } =
    useReportes();
  const { locale, t } = useI18n();
  const [vendedorId, setVendedorId] = useState("");
  const [range, setRange] = useState<DateRange>({
    from: firstDayOfMonth(),
    to: todayISO(),
  });

  const vendedorEfectivo = vendedorId || (empleados[0]?.id ?? "");

  const sucursalNombre = (id: string) =>
    sucursales.find((s) => s.id === id)?.nombre ?? id;
  const metodoPagoNombre = (id: string) =>
    metodosPago.find((m) => m.id === id)?.nombre ?? id;

  const filtered = registros.filter(
    (r) =>
      r.vendedorId === vendedorEfectivo &&
      r.fecha >= range.from &&
      r.fecha <= range.to,
  );

  interface FilaTabla {
    fecha: string;
    sucursalId: string;
    cantidad: number;
    metodoPagoId: string;
    notas?: string;
  }

  const filas: FilaTabla[] = filtered.flatMap((r) =>
    r.items.map((item) => ({
      fecha: r.fecha,
      sucursalId: r.sucursalId,
      cantidad: item.cantidad,
      metodoPagoId: item.metodoPagoId,
      ...(item.notas !== undefined ? { notas: item.notas } : {}),
    })),
  );

  const grandTotal = filas.reduce((s, f) => s + f.cantidad, 0);
  const vendedor = empleados.find((e) => e.id === vendedorEfectivo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title font-semibold uppercase">{t.reports.salesBySellerDayTitle}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {t.reports.salesBySellerDayDescription}
        </p>
      </div>

      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1.5">
          <Label>{t.reports.seller}</Label>
          <Select value={vendedorEfectivo} onValueChange={setVendedorId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {empleados.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nombreCompleto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t.common.period}</Label>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.loadingData}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {vendedor && (
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {t.reports.monthlyGoal}: {formatCurrency(vendedor.metaIndividual)}
        </div>
      )}

      {!loading && filas.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t.reports.noSalesSellerPeriod}
        </p>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.date}</TableHead>
              <TableHead>{t.common.branch}</TableHead>
              <TableHead className="text-right">{t.common.total}</TableHead>
              <TableHead>{t.common.paymentMethod}</TableHead>
              <TableHead>{t.reports.notes}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila, idx) => (
              <TableRow key={idx}>
                <TableCell>{formatDate(fila.fecha, 'dd/MM/yyyy', locale)}</TableCell>
                <TableCell>{sucursalNombre(fila.sucursalId)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(fila.cantidad)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {metodoPagoNombre(fila.metodoPagoId)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {fila.notas ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="text-right uppercase text-xs">
                {t.common.grandTotal}
              </TableCell>
              <TableCell className="text-right font-bold text-base">
                {formatCurrency(grandTotal)}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
        </div>
      )}
    </div>
  );
}
