"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { schedulerDesignProposals } from "@scheduler/design-proposals";
import type {
  DesignCabinSalesReport,
  DesignCabinSalesReportFilters,
} from "../../../design/contracts";
import { ReportsHeader } from "./ReportsHeader";
import {
  exportCabinSalesReport,
  type CabinSalesExportFormat,
} from "./cabin-sales-report-export";

interface BranchItem {
  id: string;
  name: string;
}

interface CabinSalesReportWorkspaceProps {
  branches: BranchItem[];
  fixedBranch?: BranchItem;
  userName: string;
  canExport: boolean;
}

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("es-MX");
const dateTime = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

function dateInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function purchaseLabel(kind: "NONE" | "FULL" | "LAYAWAY") {
  if (kind === "FULL") return "Liquidada";
  if (kind === "LAYAWAY") return "Apartado";
  return "No compró";
}

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  RESERVED: "Reservada",
  CONFIRMED: "Confirmada",
  ARRIVED: "Llegó",
  WAITING: "En espera",
  ATTENDED: "Atendida",
  NO_SHOW: "No asistió",
  CANCELED: "Cancelada",
};

export function CabinSalesReportWorkspace({
  branches,
  fixedBranch,
  userName,
  canExport,
}: CabinSalesReportWorkspaceProps) {
  const [dateFrom, setDateFrom] = useState(() => dateInput(-30));
  const [dateTo, setDateTo] = useState(() => dateInput());
  const [branchId, setBranchId] = useState(fixedBranch?.id ?? "ALL");
  const [cabinResourceId, setCabinResourceId] = useState("ALL");
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState<DesignCabinSalesReportFilters>(() => ({
    dateFrom: dateInput(-30),
    dateTo: dateInput(),
    branchIds: fixedBranch ? [fixedBranch.id] : branches.map((branch) => branch.id),
  }));
  const [report, setReport] = useState<DesignCabinSalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<CabinSalesExportFormat | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void schedulerDesignProposals
      .cabinSalesReport(applied)
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "No fue posible cargar el reporte.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applied]);

  const cabinOptions = report?.byCabin ?? [];
  const maxCabinSale = Math.max(
    1,
    ...(report?.byCabin.map((item) => item.saleAmount) ?? [1]),
  );
  const trendPoints = useMemo(() => {
    const values = report?.byDay ?? [];
    if (!values.length) return "";
    const max = Math.max(1, ...values.map((item) => item.saleAmount));
    return values
      .map((item, index) => {
        const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
        const y = 88 - (item.saleAmount / max) * 70;
        return `${x},${y}`;
      })
      .join(" ");
  }, [report?.byDay]);

  function applyFilters() {
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      toast.error("Selecciona un rango de fechas válido.");
      return;
    }
    setApplied({
      dateFrom,
      dateTo,
      branchIds: fixedBranch
        ? [fixedBranch.id]
        : branchId === "ALL"
          ? branches.map((branch) => branch.id)
          : [branchId],
      ...(cabinResourceId !== "ALL" ? { cabinResourceId } : {}),
      ...(query.trim() ? { query: query.trim() } : {}),
    });
  }

  async function download(format: CabinSalesExportFormat) {
    if (!report) return;
    setExporting(format);
    try {
      await exportCabinSalesReport(report, format);
      toast.success(
        `Reporte ${format === "xlsx" ? "Excel" : "PDF"} generado con el conjunto filtrado.`,
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "No fue posible generar la descarga.",
      );
    } finally {
      setExporting(null);
    }
  }

  const cards = report
    ? [
        {
          label: "Monto vendido",
          value: money.format(report.summary.saleAmount),
          detail: `${report.summary.fullSales} liquidadas · ${report.summary.layaways} apartados`,
          icon: ShoppingBag,
        },
        {
          label: "Monto recibido",
          value: money.format(report.summary.depositAmount),
          detail: "Liquidaciones y anticipos",
          icon: WalletCards,
        },
        {
          label: "Saldo pendiente",
          value: money.format(report.summary.balanceAmount),
          detail: "Pendiente de apartados",
          icon: TrendingUp,
        },
        {
          label: "Compradores",
          value: number.format(report.summary.buyers),
          detail: `${number.format(report.summary.visitors)} visitantes`,
          icon: UsersRound,
        },
        {
          label: "Conversión",
          value: `${number.format(report.summary.conversionRate)}%`,
          detail: `${number.format(report.summary.appointments)} citas`,
          icon: BarChart3,
        },
      ]
    : [];

  return (
    <div className="report-workspace min-h-screen bg-[#f4f1ed] text-[#263649]">
      <ReportsHeader active="sales" userName={userName} />
      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-caps">Ventas y operación de cabinas</p>
            <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3.2rem)]">
              Reporte de ventas por cabina
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Venta, anticipo, saldo, especialista y contexto completo de cada
              cita atendida. Esta propuesta usa datos ficticios y no sustituye
              la venta canónica del POS.
            </p>
          </div>
          {canExport ? (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!report || Boolean(exporting)}
                onClick={() => void download("xlsx")}
                variant="outline"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {exporting === "xlsx" ? "Generando…" : "Excel"}
              </Button>
              <Button
                disabled={!report || Boolean(exporting)}
                onClick={() => void download("pdf")}
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting === "pdf" ? "Generando…" : "PDF"}
              </Button>
            </div>
          ) : null}
        </div>

        <section className="reservation-control-panel">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <Label htmlFor="cabin-sales-from">Desde</Label>
              <Input
                id="cabin-sales-from"
                className="mt-1.5"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cabin-sales-to">Hasta</Label>
              <Input
                id="cabin-sales-to"
                className="mt-1.5"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
            <div>
              <Label>Sucursal</Label>
              {fixedBranch ? (
                <div className="mt-1.5 flex h-10 items-center rounded-md border bg-[#f8f5f1] px-3 text-sm font-medium">
                  {fixedBranch.name}
                </div>
              ) : (
                <Select
                  value={branchId}
                  onValueChange={(value) => {
                    setBranchId(value);
                    setCabinResourceId("ALL");
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas las autorizadas</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Cabina</Label>
              <Select
                value={cabinResourceId}
                onValueChange={setCabinResourceId}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las cabinas</SelectItem>
                  {cabinOptions.map((cabin) => (
                    <SelectItem key={cabin.key} value={cabin.key}>
                      {cabin.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cabin-sales-search">Buscar</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="cabin-sales-search"
                  className="pl-9"
                  placeholder="Cliente, servicio, vendedor…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyFilters();
                  }}
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={applyFilters}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Aplicar
              </Button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error}
          </section>
        ) : null}
        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Construyendo indicadores, gráficas y detalle…
          </section>
        ) : null}

        {report && !loading ? (
          <>
            <section
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
              aria-label="Indicadores de ventas por cabina"
            >
              {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <article
                    className={
                      index === 0
                        ? "report-metric report-metric-featured"
                        : "report-metric"
                    }
                    key={card.label}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={index === 0 ? "label-caps !text-white/60" : "label-caps"}>
                        {card.label}
                      </p>
                      <span className={index === 0 ? "report-metric-icon !bg-white/10 !text-white" : "report-metric-icon"}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="number-display mt-5 text-[1.75rem] leading-none tracking-[-0.04em]">
                      {card.value}
                    </p>
                    <p className={index === 0 ? "mt-4 text-xs text-white/55" : "mt-4 text-xs text-slate-400"}>
                      {card.detail}
                    </p>
                  </article>
                );
              })}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <p className="label-caps">Comparativo</p>
                  <h2 className="mt-1 text-xl font-semibold">Venta por cabina</h2>
                </div>
                <div className="space-y-4">
                  {report.byCabin.length ? (
                    report.byCabin.map((item) => (
                      <div key={item.key}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{item.label}</span>
                          <span>{money.format(item.saleAmount)}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-[#eee8e1]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#9a7658,#d2ad8b)]"
                            style={{
                              width: `${Math.max(4, (item.saleAmount / maxCabinSale) * 100)}%`,
                            }}
                            title={`${item.buyers} compradores; ${money.format(item.depositAmount)} recibido`}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.visitors} visitantes · {money.format(item.depositAmount)} recibido
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Sin cabinas para el filtro actual.</p>
                  )}
                </div>
              </article>

              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <p className="label-caps">Evolución</p>
                  <h2 className="mt-1 text-xl font-semibold">Venta diaria</h2>
                </div>
                {report.byDay.length ? (
                  <div>
                    <svg
                      aria-label="Gráfica de monto vendido por día"
                      className="h-[210px] w-full overflow-visible"
                      role="img"
                      viewBox="0 0 100 100"
                    >
                      <line x1="0" x2="100" y1="88" y2="88" stroke="#ded6ce" strokeWidth="0.7" />
                      <polyline
                        fill="none"
                        points={trendPoints}
                        stroke="#9a7658"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                      />
                      {trendPoints.split(" ").map((point, index) => {
                        const [x, y] = point.split(",");
                        const item = report.byDay[index]!;
                        return (
                          <circle key={item.key} cx={x} cy={y} fill="#263649" r="2.2">
                            <title>{`${item.label}: ${money.format(item.saleAmount)}`}</title>
                          </circle>
                        );
                      })}
                    </svg>
                    <div className="flex justify-between gap-3 text-xs text-slate-400">
                      <span>{report.byDay[0]?.label}</span>
                      <span>{report.byDay.at(-1)?.label}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin evolución para el filtro actual.</p>
                )}
              </article>
            </section>

            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="label-caps">Detalle auditable</p>
                  <h2 className="mt-1 text-xl font-semibold">Citas, visitantes y venta</h2>
                </div>
                <p className="text-xs text-slate-400">
                  {report.rows.length} filas · generado {dateTime.format(new Date(report.generatedAt))}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[1900px] w-full text-left text-sm">
                  <thead className="bg-[#f8f5f1] text-xs uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Cita / fechas</th>
                      <th className="px-4 py-3">Sucursal / cabina</th>
                      <th className="px-4 py-3">Cliente / visitante</th>
                      <th className="px-4 py-3">Servicios</th>
                      <th className="px-4 py-3">Vendedor</th>
                      <th className="px-4 py-3">Especialista</th>
                      <th className="px-4 py-3">Resultado</th>
                      <th className="px-4 py-3 text-right">Venta</th>
                      <th className="px-4 py-3 text-right">Recibido</th>
                      <th className="px-4 py-3 text-right">Saldo</th>
                      <th className="px-4 py-3">Estado / origen</th>
                      <th className="px-4 py-3">Comentarios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.rows.map((row) => (
                      <tr key={`${row.appointmentId}:${row.visitorId}`} className="align-top hover:bg-[#fbfaf8]">
                        <td className="px-4 py-4">
                          <p className="font-medium">{dateTime.format(new Date(row.appointmentStartsAt))}</p>
                          <p className="mt-1 text-xs text-slate-400">Creada: {dateTime.format(new Date(row.appointmentCreatedAt))}</p>
                          <p className="text-xs text-slate-400">Confirmada: {row.confirmedAt ? dateTime.format(new Date(row.confirmedAt)) : "Sin registro"}</p>
                          <p className="mt-1 max-w-[180px] truncate font-mono text-[10px] text-slate-400" title={row.appointmentId}>{row.appointmentId}</p>
                        </td>
                        <td className="px-4 py-4"><p className="font-medium">{row.branchName}</p><p className="text-slate-500">{row.cabinName} · {row.cabinCapacity} personas</p></td>
                        <td className="px-4 py-4"><p className="font-medium">{row.customerName}</p><p className="text-slate-500">{row.visitorName}</p></td>
                        <td className="px-4 py-4">{row.serviceNames.join(", ")}</td>
                        <td className="px-4 py-4">{row.sellerName}</td>
                        <td className="px-4 py-4">{row.specialistName}</td>
                        <td className="px-4 py-4"><span className="inline-flex rounded-full bg-[#eee8e1] px-2.5 py-1 text-xs font-medium">{purchaseLabel(row.purchaseKind)}</span></td>
                        <td className="px-4 py-4 text-right font-medium">{money.format(row.saleAmount)}</td>
                        <td className="px-4 py-4 text-right">{money.format(row.depositAmount)}</td>
                        <td className="px-4 py-4 text-right">{money.format(row.balanceAmount)}</td>
                        <td className="px-4 py-4"><p className="font-medium">{statusLabels[row.status] ?? row.status}</p><p className="text-xs text-slate-400">{row.origin}</p></td>
                        <td className="max-w-[260px] whitespace-normal px-4 py-4 text-slate-600">{row.notes || "—"}</td>
                      </tr>
                    ))}
                    {!report.rows.length ? (
                      <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={12}>No hay atenciones de cabina que coincidan con los filtros.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
