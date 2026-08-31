import { Activity, BarChart3, CalendarRange, DatabaseZap } from "lucide-react";
import {
  reservationMetricDefinitions,
  reservationStatusOptions,
  type ReservationChartPoint,
  type ReservationMetricDefinition,
  type ReservationReportStatus,
} from "@/lib/mock-reservation-report-data";

interface ReservationMetricsProps {
  activeStatuses: ReservationReportStatus[];
  totalBookings: number;
}

interface ComputedMetric extends ReservationMetricDefinition {
  numerator: number;
  percentage: number;
  isActive: boolean;
}

function EmptyMetricState({ message }: { message: string }) {
  return (
    <div className="reservation-metric-empty">
      <span className="reservation-metric-empty-icon">
        <DatabaseZap className="h-5 w-5" />
      </span>
      <p className="font-semibold text-[#536276]">Sin datos para mostrar</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">{message}</p>
    </div>
  );
}

function ServicePercentageChart({
  color,
  data,
}: {
  color: string;
  data: ReservationChartPoint[];
}) {
  if (data.length === 0) {
    return (
      <EmptyMetricState message="El total está disponible, pero todavía no existe un desglose por servicio para este periodo." />
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {data.map((point) => (
        <div key={point.label} className="grid gap-2">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="truncate font-medium text-[#536276]">{point.label}</span>
            <span className="number-display shrink-0 text-[#263649]">{point.value}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#f0ebe6]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                width: `${point.value}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricServiceCard({
  metric,
  totalBookings,
}: {
  metric: ComputedMetric;
  totalBookings: number;
}) {
  const visibleServices = metric.isActive ? metric.servicePercentages : [];

  return (
    <article className="report-card reservation-metric-service-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-caps">Proporción del periodo</p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.025em] text-[#263649]">
            {metric.label}
          </h2>
          <p className="mt-2 text-xs leading-5 text-slate-400">{metric.description}</p>
        </div>
        <span
          className="reservation-metric-accent-icon"
          style={{ backgroundColor: `${metric.color}18`, color: metric.color }}
        >
          <Activity className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-[#eee7e1] pb-5">
        <span className="number-display text-[2.6rem] leading-none tracking-[-0.055em] text-[#263649]">
          {metric.percentage.toFixed(0)}%
        </span>
        <span className="mb-1.5 rounded-full bg-[#f7f3ef] px-3 py-1.5 text-xs font-semibold text-slate-500">
          {metric.numerator} de {totalBookings} reservas
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#263649]">Porcentaje por servicio</p>
          <p className="mt-1 text-xs text-slate-400">Comparación sobre las reservas de cada servicio.</p>
        </div>
        <BarChart3 className="h-4 w-4 shrink-0 text-[#ad8b67]" />
      </div>
      <ServicePercentageChart color={metric.color} data={visibleServices} />
    </article>
  );
}

function DailyPercentageChart({
  color,
  data,
}: {
  color: string;
  data: ReservationChartPoint[];
}) {
  const width = 640;
  const height = 210;
  const chartLeft = 38;
  const chartRight = 12;
  const chartTop = 16;
  const chartBottom = 38;
  const chartWidth = width - chartLeft - chartRight;
  const chartHeight = height - chartTop - chartBottom;
  const points = data.map((point, index) => ({
    ...point,
    x: chartLeft + (index / Math.max(data.length - 1, 1)) * chartWidth,
    y: chartTop + ((100 - point.value) / 100) * chartHeight,
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const allZero = data.every((point) => point.value === 0);
  const gradientId = `reservation-metric-${color.replace("#", "")}`;

  return (
    <div className="mt-5">
      <svg
        aria-label="Porcentaje de reservas por día"
        className="h-[230px] w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[100, 75, 50, 25, 0].map((tick) => {
          const y = chartTop + ((100 - tick) / 100) * chartHeight;
          return (
            <g key={tick}>
              <line
                stroke="#ece6e0"
                strokeWidth="1"
                x1={chartLeft}
                x2={width - chartRight}
                y1={y}
                y2={y}
              />
              <text fill="#9aa3ad" fontSize="10" textAnchor="end" x={chartLeft - 9} y={y + 3}>
                {tick}%
              </text>
            </g>
          );
        })}
        {!allZero ? (
          <polygon
            fill={`url(#${gradientId})`}
            points={`${chartLeft},${chartTop + chartHeight} ${polyline} ${width - chartRight},${chartTop + chartHeight}`}
          />
        ) : null}
        <polyline
          fill="none"
          points={polyline}
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.5"
        />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} fill="white" r="4.5" stroke={color} strokeWidth="3" />
            <text
              fill="#8d97a2"
              fontSize="9.5"
              textAnchor="middle"
              x={point.x}
              y={height - 10}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      {allZero ? (
        <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#f8f5f1] px-3 py-2.5 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          Sin actividad registrada en los días seleccionados.
        </div>
      ) : null}
    </div>
  );
}

function MetricDailyCard({ metric }: { metric: ComputedMetric }) {
  const dailyData = metric.isActive
    ? metric.dailyPercentages
    : metric.dailyPercentages.map((point) => ({ ...point, value: 0 }));

  return (
    <article className="report-card reservation-metric-daily-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps">Evolución diaria</p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-[#263649]">
            {metric.dailyLabel}
          </h3>
        </div>
        <span
          className="reservation-metric-accent-icon"
          style={{ backgroundColor: `${metric.color}18`, color: metric.color }}
        >
          <CalendarRange className="h-5 w-5" />
        </span>
      </div>
      <DailyPercentageChart color={metric.color} data={dailyData} />
    </article>
  );
}

function MetricPair({
  metrics,
  totalBookings,
}: {
  metrics: ComputedMetric[];
  totalBookings: number;
}) {
  return (
    <>
      <section className="grid gap-5 xl:grid-cols-2">
        {metrics.map((metric) => (
          <MetricServiceCard key={metric.status} metric={metric} totalBookings={totalBookings} />
        ))}
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        {metrics.map((metric) => (
          <MetricDailyCard key={metric.status} metric={metric} />
        ))}
      </section>
    </>
  );
}

export function ReservationMetrics({
  activeStatuses,
  totalBookings,
}: ReservationMetricsProps) {
  const metrics: ComputedMetric[] = reservationMetricDefinitions.map((metric) => {
    const statusCount =
      reservationStatusOptions.find((option) => option.value === metric.status)?.count ?? 0;
    const isActive = activeStatuses.includes(metric.status);
    const numerator = isActive ? statusCount : 0;
    return {
      ...metric,
      numerator,
      isActive,
      percentage: totalBookings > 0 ? (numerator / totalBookings) * 100 : 0,
    };
  });

  return (
    <div className="space-y-5">
      <section className="report-card reservation-metrics-intro">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label-caps">Reservas / Métricas</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[#263649]">
              Conversión y comportamiento de reservas
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Compara confirmaciones, asistencias, cancelaciones y ausencias sobre el total filtrado.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#f2f7f4] px-4 py-2 text-xs font-semibold text-[#526f5e] sm:self-auto">
            <Activity className="h-4 w-4" />
            {totalBookings} reservas analizadas
          </span>
        </div>
      </section>

      <MetricPair metrics={metrics.slice(0, 2)} totalBookings={totalBookings} />

      <div className="reservation-metrics-divider">
        <span>Incidencias de la agenda</span>
      </div>

      <MetricPair metrics={metrics.slice(2)} totalBookings={totalBookings} />
    </div>
  );
}
