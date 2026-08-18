"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import {
  ArrowUpRight,
  BarChart3,
  CakeSlice,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock,
  CreditCard,
  Mail,
  Megaphone,
  MessageCircle,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import {
  reportPeriodOptions,
  reportSummaries,
  todayBirthdayClients,
  type ReportPeriodKey,
  type ReportSeriesPoint,
  type ReportSummary,
} from "@/lib/mock-report-data";
import { ReportsHeader } from "./ReportsHeader";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-MX");

interface MetricCardProps {
  label: string;
  value: string;
  change: number;
  comparisonLabel: string;
  icon: ReactNode;
  featured?: boolean;
  onDetails?: () => void;
}

function MetricCard({
  label,
  value,
  change,
  comparisonLabel,
  icon,
  featured,
  onDetails,
}: MetricCardProps) {
  return (
    <article className={featured ? "report-metric report-metric-featured" : "report-metric"}>
      <div className="flex items-start justify-between gap-3">
        <p className={featured ? "label-caps !text-white/55" : "label-caps"}>
          {label}
        </p>
        <span className={featured ? "report-metric-icon !bg-white/10 !text-white" : "report-metric-icon"}>
          {icon}
        </span>
      </div>
      <p className="number-display mt-4 text-[2rem] leading-none tracking-[-0.04em]">
        {value}
      </p>
      {featured && onDetails ? (
        <button
          className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-white/85 underline decoration-white/30 underline-offset-4 transition hover:text-white"
          type="button"
          onClick={onDetails}
        >
          Ver detalles
          <ArrowUpRight className="h-4 w-4" />
        </button>
      ) : (
        <div className="mt-5">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
            <TrendingUp className="h-4 w-4" />
            {change.toFixed(1)}%
          </p>
          <p className="mt-1.5 text-xs text-slate-400">{comparisonLabel}</p>
        </div>
      )}
    </article>
  );
}

function OccupancyChart({ series }: { series: ReportSeriesPoint[] }) {
  const visibleSeries = series.filter((point) => point.label);

  return (
    <div className="mt-6 space-y-3.5" aria-label="Gráfica de factor de ocupación">
      {visibleSeries.map((point) => (
        <div key={point.label} className="grid grid-cols-[42px_1fr_42px] items-center gap-3">
          <span className="text-xs font-medium text-slate-400">{point.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#eee8e2]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#c3a583,#d9bd9e)] transition-[width] duration-500"
              style={{ width: `${point.occupancy}%` }}
            />
          </div>
          <span className="number-display text-right text-xs text-slate-600">
            {point.occupancy}%
          </span>
        </div>
      ))}
    </div>
  );
}

function SalesChart({ series }: { series: ReportSeriesPoint[] }) {
  const visibleSeries = series.filter((point) => point.label);
  const maxSales = Math.max(...visibleSeries.map((point) => point.sales), 1);

  return (
    <div className="mt-6 space-y-3.5" aria-label="Gráfica de ventas facturadas">
      {visibleSeries.map((point) => (
        <div key={point.label} className="grid grid-cols-[42px_1fr_68px] items-center gap-3">
          <span className="text-xs font-medium text-slate-400">{point.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#e7f3ee]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#648672,#8bb09b)] transition-[width] duration-500"
              style={{ width: `${Math.max(5, (point.sales / maxSales) * 100)}%` }}
            />
          </div>
          <span className="number-display text-right text-[0.68rem] text-slate-600">
            {currencyFormatter.format(point.sales)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BookingTrendChart({ series }: { series: ReportSeriesPoint[] }) {
  const visibleSeries = series.filter((point) => point.label);
  const maxBookings = Math.max(...visibleSeries.map((point) => point.bookings), 1);
  const width = 560;
  const height = 160;
  const points = visibleSeries
    .map((point, index) => {
      const x = visibleSeries.length === 1 ? width / 2 : (index / (visibleSeries.length - 1)) * width;
      const y = height - (point.bookings / maxBookings) * (height - 28) - 8;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mt-6">
      <svg
        className="h-[170px] w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Tendencia de reservas"
        preserveAspectRatio="none"
      >
        {[32, 72, 112, 152].map((y) => (
          <line key={y} x1="0" x2={width} y1={y} y2={y} stroke="#ece6e0" strokeWidth="1" />
        ))}
        <defs>
          <linearGradient id="booking-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#c3a583" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#c3a583" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#booking-area)" />
        <polyline
          points={points}
          fill="none"
          stroke="#ad8b67"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        {visibleSeries.map((point, index) => {
          const x = visibleSeries.length === 1 ? width / 2 : (index / (visibleSeries.length - 1)) * width;
          const y = height - (point.bookings / maxBookings) * (height - 28) - 8;
          return <circle key={point.label} cx={x} cy={y} r="5" fill="#fff" stroke="#ad8b67" strokeWidth="3" />;
        })}
      </svg>
      <div className="grid grid-flow-col auto-cols-fr gap-2 text-center text-[0.68rem] font-medium text-slate-400">
        {visibleSeries.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({ summary }: { summary: ReportSummary }) {
  const statuses = [
    { label: "Confirmadas", value: summary.confirmed, color: "#648672" },
    { label: "Pendientes", value: summary.pending, color: "#d0a968" },
    { label: "Canceladas", value: summary.canceled, color: "#bd7b77" },
    { label: "No asistieron", value: summary.noShows, color: "#8793a1" },
  ];

  return (
    <div className="grid gap-3 border-t border-[#eee7e0] px-5 py-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
      {statuses.map((status) => (
        <div key={status.label} className="flex items-center gap-3 rounded-2xl bg-[#faf8f5] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
          <div>
            <p className="number-display text-lg text-[#263649]">{numberFormatter.format(status.value)}</p>
            <p className="text-xs text-slate-400">{status.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportCard({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`report-card ${className}`}>
      <p className="label-caps">{eyebrow}</p>
      <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">{title}</h2>
      {children}
    </article>
  );
}

function DashboardPanels({ summary }: { summary: ReportSummary }) {
  const totalStatuses = summary.confirmed + summary.pending + summary.canceled + summary.noShows;
  const confirmedShare = Math.round((summary.confirmed / totalStatuses) * 100);

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <ReportCard eyebrow="Comportamiento" title="Ritmo de reservas" className="xl:col-span-8">
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            Evolución de reservas durante el periodo seleccionado.
          </p>
          <p className="number-display text-sm text-[#648672]">+{summary.bookingsChange.toFixed(1)}%</p>
        </div>
        <BookingTrendChart series={summary.series} />
      </ReportCard>

      <article className="report-insight-card xl:col-span-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#dfc7a8]">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Lectura rápida</p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">
          El sábado concentra la mayor oportunidad de la agenda.
        </h2>
        <p className="mt-4 text-sm leading-6 text-white/55">
          Protege los horarios de mayor demanda y refuerza disponibilidad entre 16:00 y 19:00.
        </p>
        <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5">
          <Clock className="h-5 w-5 text-[#dfc7a8]" />
          <span className="text-sm text-white/75">Pico estimado: 17:30 h</span>
        </div>
      </article>

      <ReportCard eyebrow="Capacidad" title="Factor de ocupación" className="xl:col-span-4">
        <OccupancyChart series={summary.series} />
      </ReportCard>

      <ReportCard eyebrow="Origen" title="Origen de las reservas" className="xl:col-span-4">
        <div className="mt-7 flex flex-col items-center">
          <div
            className="report-donut"
            style={{
              background: `conic-gradient(#648672 0 ${summary.agendaShare}%, #c3a583 ${summary.agendaShare}% 100%)`,
            }}
          >
            <div className="report-donut-center">
              <span className="number-display text-2xl text-[#263649]">{summary.bookings}</span>
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-slate-400">reservas</span>
            </div>
          </div>
          <div className="mt-6 grid w-full grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#f2f7f4] px-4 py-3">
              <p className="number-display text-lg text-[#648672]">{summary.agendaShare}%</p>
              <p className="text-xs text-slate-400">Desde agenda</p>
            </div>
            <div className="rounded-2xl bg-[#f8f2eb] px-4 py-3">
              <p className="number-display text-lg text-[#ad8b67]">{summary.onlineShare}%</p>
              <p className="text-xs text-slate-400">Reservas online</p>
            </div>
          </div>
        </div>
      </ReportCard>

      <ReportCard eyebrow="Facturación" title="Ventas facturadas" className="xl:col-span-4">
        <SalesChart series={summary.series} />
      </ReportCard>

      <ReportCard eyebrow="Conversión" title="Estado de las reservas" className="xl:col-span-6">
        <div className="mt-8 flex items-center gap-6">
          <div
            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#648672 0 ${confirmedShare}%, #ece7e1 ${confirmedShare}% 100%)`,
            }}
          >
            <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white">
              <span className="number-display text-xl text-[#263649]">{confirmedShare}%</span>
              <span className="text-[0.6rem] uppercase tracking-wider text-slate-400">confirmadas</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            {[
              ["Confirmadas", summary.confirmed, "bg-[#648672]"],
              ["Pendientes", summary.pending, "bg-[#d0a968]"],
              ["Canceladas / no show", summary.canceled + summary.noShows, "bg-[#bd7b77]"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-500">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
                  <span className="truncate">{label}</span>
                </span>
                <span className="number-display text-[#263649]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </ReportCard>

      <ReportCard eyebrow="Ingreso" title="Ticket promedio" className="xl:col-span-6">
        <div className="mt-7 flex items-center justify-between gap-5 rounded-[24px] bg-[linear-gradient(135deg,#f4eee7,#faf8f5)] p-5">
          <div>
            <p className="number-display text-[2.25rem] leading-none tracking-[-0.04em] text-[#263649]">
              {currencyFormatter.format(summary.averageTicket)}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
              Promedio facturado por cada reserva atendida durante este periodo.
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-white text-[#ad8b67] shadow-sm">
            <CreditCard className="h-7 w-7" />
          </div>
        </div>
      </ReportCard>
    </div>
  );
}

function FollowUpCards({ summary }: { summary: ReportSummary }) {
  const onlinePayments = Math.round(
    summary.billedSales * (summary.onlineShare / 100),
  );
  const showMockMessage = (message: string) => {
    toast.info(message, {
      description: "Este flujo se conectará cuando integremos el backend de Scheduler.",
      duration: 5000,
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <article className="report-card xl:col-span-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps">Clientes</p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
              Cumpleaños de hoy
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {todayBirthdayClients.length} oportunidades para crear una experiencia especial.
            </p>
          </div>
          <span className="report-action-icon bg-[#f8f1f3] text-[#b97d89]">
            <CakeSlice className="h-6 w-6" />
          </span>
        </div>

        <div className="mt-5 divide-y divide-[#eee7e0]">
          {todayBirthdayClients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5eee8] text-sm font-semibold text-[#ad8b67]">
                  {client.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#263649]">
                    {client.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {client.contact} · {client.branch} · {client.visits} visitas
                  </p>
                </div>
              </div>
              <Button
                aria-label={`Preparar felicitación para ${client.name}`}
                className="h-10 w-10 shrink-0 rounded-2xl border-[#dfd6ce] bg-white text-[#648672] hover:bg-[#f2f7f4] hover:text-[#526f5e]"
                onClick={() =>
                  showMockMessage(`Felicitación para ${client.name}`)
                }
                size="icon"
                type="button"
                variant="outline"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </article>

      <article className="report-card flex flex-col xl:col-span-3">
        <span className="report-action-icon bg-[#f1f5f3] text-[#648672]">
          <Mail className="h-6 w-6" />
        </span>
        <p className="label-caps mt-6">Automatización</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
          Recordatorios por email
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          36 recordatorios programados y 94% entregados correctamente.
        </p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e7efeb]">
          <div className="h-full w-[94%] rounded-full bg-[#648672]" />
        </div>
        <Button
          className="mt-auto h-11 rounded-2xl border-[#dfd6ce] bg-white text-[#263649] hover:bg-[#f8f5f1]"
          onClick={() => showMockMessage("Configuración de recordatorios por email")}
          type="button"
          variant="outline"
        >
          Configurar recordatorios
        </Button>
      </article>

      <article className="report-card flex flex-col xl:col-span-3">
        <span className="report-action-icon bg-[#f7f1ea] text-[#ad8b67]">
          <CreditCard className="h-6 w-6" />
        </span>
        <p className="label-caps mt-6">Cobros</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
          Pagos en línea
        </h2>
        <p className="number-display mt-5 text-[1.9rem] tracking-[-0.04em] text-[#263649]">
          {currencyFormatter.format(onlinePayments)}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          {summary.onlineShare}% de las reservas del periodo se originaron en línea.
        </p>
        <Button
          className="mt-auto h-11 rounded-2xl bg-[#263649] text-white hover:bg-[#1d2b3a]"
          onClick={() => showMockMessage("Detalle de pagos en línea")}
          type="button"
        >
          Ver detalle
        </Button>
      </article>

      <article className="report-card xl:col-span-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(15rem,1.3fr)_repeat(4,minmax(8rem,0.7fr))] lg:items-center">
          <div className="flex items-start gap-4">
            <span className="report-action-icon shrink-0 bg-[#f3eef8] text-[#7460a4]">
              <Megaphone className="h-6 w-6" />
            </span>
            <div>
              <p className="label-caps">Marketing</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
                Campañas de email
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Rendimiento de las campañas enviadas durante el periodo.
              </p>
            </div>
          </div>
          {[
            ["Campañas enviadas", "3"],
            ["Destinatarios", "1,248"],
            ["Tasa de apertura", "68%"],
            ["Clics", "22%"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-[#faf8f5] px-4 py-4">
              <p className="number-display text-xl text-[#263649]">{value}</p>
              <p className="mt-1 text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

export function ReportsWorkspace() {
  const [period, setPeriod] = useState<ReportPeriodKey>("last-week");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const summary = useMemo(() => reportSummaries[period], [period]);

  return (
    <div className="report-workspace min-h-screen bg-[#f4f1ed] text-[#263649]">
      <ReportsHeader active="summary" />
      <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <section className="report-hero">
          <div>
            <p className="label-caps">Reportes / Resumen</p>
            <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3.25rem)] text-[#263649]">
              El pulso de tu negocio
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Una lectura clara de reservas, ocupación y ventas para tomar mejores decisiones.
            </p>
          </div>

          <div className="report-period-control">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400" htmlFor="report-period">
              Periodo de tiempo
            </label>
            <Select value={period} onValueChange={(value) => setPeriod(value as ReportPeriodKey)}>
              <SelectTrigger id="report-period" className="mt-2 h-12 rounded-2xl border-[#e6ddd5] bg-white px-4 text-sm text-[#263649] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-[#e6ddd5] bg-white p-1.5 shadow-[0_18px_44px_rgba(38,54,73,0.12)]">
                {reportPeriodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-xl px-3 py-2.5">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-slate-400">{summary.rangeLabel}</p>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            featured
            label="Total de reservas"
            value={numberFormatter.format(summary.bookings)}
            change={summary.bookingsChange}
            comparisonLabel={summary.comparisonLabel}
            icon={<CalendarCheck className="h-5 w-5" />}
            onDetails={() => setDetailsOpen(true)}
          />
          <MetricCard
            label="Factor de ocupación"
            value={`${summary.occupancy.toFixed(1)}%`}
            change={summary.occupancyChange}
            comparisonLabel={summary.comparisonLabel}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <MetricCard
            label="Nuevos clientes"
            value={numberFormatter.format(summary.newClients)}
            change={summary.newClientsChange}
            comparisonLabel={summary.comparisonLabel}
            icon={<UserPlus className="h-5 w-5" />}
          />
          <MetricCard
            label="Ventas facturadas"
            value={currencyFormatter.format(summary.billedSales)}
            change={summary.salesChange}
            comparisonLabel={summary.comparisonLabel}
            icon={<CircleDollarSign className="h-5 w-5" />}
          />
        </section>

        <section className="mt-4 overflow-hidden rounded-[24px] border border-[#e9e1da] bg-white shadow-[0_12px_34px_rgba(38,54,73,0.05)]">
          <button
            className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
            type="button"
            onClick={() => setDetailsOpen((current) => !current)}
            aria-expanded={detailsOpen}
          >
            <span>
              <span className="block text-base font-semibold text-[#263649] sm:text-lg">
                Ver detalle de reservas
              </span>
              <span className="mt-1 block text-xs text-slate-400">
                Distribución por estado en {summary.label.toLowerCase()}
              </span>
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f6f2ed] text-slate-500">
              {detailsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </span>
          </button>
          {detailsOpen ? <DetailPanel summary={summary} /> : null}
        </section>

        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-caps">Lectura ejecutiva</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#263649]">Indicadores del periodo</h2>
            </div>
            <p className="text-xs text-slate-400">Actualizado hoy a las 12:40</p>
          </div>
          <DashboardPanels summary={summary} />
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <p className="label-caps">Seguimiento y fidelización</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#263649]">
              Acciones que requieren atención
            </h2>
          </div>
          <FollowUpCards summary={summary} />
        </section>
      </main>
    </div>
  );
}
