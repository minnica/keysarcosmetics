import {
  CalendarRange,
  CircleDollarSign,
  Clock3,
  MapPin,
  UserRound,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import {
  reservationProviderReportTotals,
  reservationReportTotals,
  type ReservationChartPoint,
  type ReservationProvidersByLocationReport,
} from "@/lib/mock-reservation-report-data";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-MX");
const percentFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface ReservationProvidersByLocationProps {
  report: ReservationProvidersByLocationReport;
  selectedBookings: number;
}

function WeeklyProvidersChart({
  providers,
  ratio,
}: {
  providers: ReservationProvidersByLocationReport["providers"];
  ratio: number;
}) {
  const width = 960;
  const height = 310;
  const chartLeft = 48;
  const chartRight = 36;
  const chartTop = 18;
  const chartBottom = 48;
  const chartWidth = width - chartLeft - chartRight;
  const chartHeight = height - chartTop - chartBottom;
  const labels = providers[0]?.weeklyReservations.map((point) => point.label) ?? [];
  const maxValue = Math.max(
    ...providers.flatMap((provider) =>
      provider.weeklyReservations.map((point) => Math.round(point.value * ratio)),
    ),
    1,
  );
  const maxScale = Math.max(25, Math.ceil(maxValue / 25) * 25);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((value) => Math.round(maxScale * value));

  return (
    <div className="mt-7 overflow-x-auto pb-2 [scrollbar-color:#cfc4ba_transparent] [scrollbar-width:thin]">
      <svg
        aria-label="Cantidad de reservas semanales por prestador"
        className="h-[320px] min-w-[52rem] w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {ticks.map((tick) => {
          const y = chartTop + chartHeight - (tick / maxScale) * chartHeight;
          return (
            <g key={tick}>
              <line stroke="#ece6e0" x1={chartLeft} x2={width - chartRight} y1={y} y2={y} />
              <text fill="#9aa3ad" fontSize="10" textAnchor="end" x={chartLeft - 10} y={y + 3}>
                {tick}
              </text>
            </g>
          );
        })}

        {providers.map((provider) => {
          const points = provider.weeklyReservations.map((point, index) => ({
            x: chartLeft + (index / Math.max(provider.weeklyReservations.length - 1, 1)) * chartWidth,
            y: chartTop + chartHeight - (Math.round(point.value * ratio) / maxScale) * chartHeight,
          }));
          return (
            <g key={provider.id}>
              <polyline
                fill="none"
                points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                stroke={provider.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
              {points.map((point, index) => (
                <circle
                  key={`${provider.id}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  fill="white"
                  r="3.2"
                  stroke={provider.color}
                  strokeWidth="2"
                />
              ))}
            </g>
          );
        })}

        {labels.map((label, index) => (
          <text
            key={label}
            fill="#8d97a2"
            fontSize="9"
            textAnchor="middle"
            x={chartLeft + (index / Math.max(labels.length - 1, 1)) * chartWidth}
            y={height - 13}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function HourlyDemandChart({
  data,
  ratio,
}: {
  data: ReservationProvidersByLocationReport["hourlyReservations"];
  ratio: number;
}) {
  const width = 960;
  const height = 260;
  const chartLeft = 42;
  const chartRight = 36;
  const chartTop = 16;
  const chartBottom = 42;
  const chartWidth = width - chartLeft - chartRight;
  const chartHeight = height - chartTop - chartBottom;
  const thursday = data.filter((point) => point.day === "jueves");
  const scaled: ReservationChartPoint[] = thursday.map((point) => ({
    label: point.label,
    value: Math.round(point.value * ratio),
  }));
  const maxValue = Math.max(...scaled.map((point) => point.value), 1);
  const maxScale = Math.max(8, Math.ceil(maxValue / 2) * 2);
  const ticks = Array.from({ length: maxScale / 2 + 1 }, (_, index) => index * 2);
  const points = scaled.map((point, index) => ({
    x: chartLeft + (index / Math.max(scaled.length - 1, 1)) * chartWidth,
    y: chartTop + chartHeight - (point.value / maxScale) * chartHeight,
  }));

  return (
    <div className="mt-7 overflow-x-auto pb-2 [scrollbar-color:#cfc4ba_transparent] [scrollbar-width:thin]">
      <svg
        aria-label="Reservas por hora y día"
        className="h-[270px] min-w-[52rem] w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {ticks.map((tick) => {
          const y = chartTop + chartHeight - (tick / maxScale) * chartHeight;
          return (
            <g key={tick}>
              <line stroke="#ece6e0" x1={chartLeft} x2={width - chartRight} y1={y} y2={y} />
              <text fill="#9aa3ad" fontSize="10" textAnchor="end" x={chartLeft - 10} y={y + 3}>
                {tick}
              </text>
            </g>
          );
        })}
        <polyline
          fill="none"
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          stroke="#a30aa3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {points.map((point, index) => (
          <circle
            key={scaled[index]?.label}
            cx={point.x}
            cy={point.y}
            fill="white"
            r="3.5"
            stroke="#a30aa3"
            strokeWidth="2.2"
          />
        ))}
        {scaled.map((point, index) => (
          <text
            key={point.label}
            fill="#8d97a2"
            fontSize="9"
            textAnchor="middle"
            x={chartLeft + (index / Math.max(scaled.length - 1, 1)) * chartWidth}
            y={height - 12}
          >
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function ReservationProvidersByLocation({
  report,
  selectedBookings,
}: ReservationProvidersByLocationProps) {
  const ratio = selectedBookings / reservationReportTotals.bookings;
  const scaledProviders = report.providers.map((provider) => ({
    ...provider,
    bookings: Math.round(provider.bookings * ratio),
    revenue: Math.round(provider.revenue * ratio),
    occupancy: provider.occupancy * ratio,
  }));
  const scaledTotals = {
    bookings: Math.round(reservationProviderReportTotals.bookings * ratio),
    revenue: Math.round(reservationProviderReportTotals.revenue * ratio),
    occupancy: reservationProviderReportTotals.occupancy * ratio,
  };
  const topProvider = report.providers.reduce((top, provider) =>
    provider.bookings > top.bookings ? provider : top,
  );

  return (
    <div className="space-y-5">
      <section className="report-card reservation-locations-intro">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label-caps">Reservas / Prestadores por local</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[#263649]">
              {report.name}
            </h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              {report.address}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#f2f7f4] px-4 py-2 text-xs font-semibold text-[#526f5e] sm:self-auto">
            <UserRound className="h-4 w-4" />
            Mayor demanda: {topProvider.name}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="report-card !rounded-[24px] !p-5">
          <p className="label-caps">Prestadores</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="number-display text-3xl text-[#263649]">{report.providers.length}</p>
              <p className="mt-2 text-xs text-slate-400">incluidos en el local</p>
            </div>
            <span className="report-metric-icon"><UserRound className="h-5 w-5" /></span>
          </div>
        </article>
        <article className="report-card !rounded-[24px] !p-5">
          <p className="label-caps">Reservas</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="number-display text-3xl text-[#263649]">{numberFormatter.format(scaledTotals.bookings)}</p>
              <p className="mt-2 text-xs text-slate-400">53 servicios seleccionados</p>
            </div>
            <span className="report-metric-icon"><CalendarRange className="h-5 w-5" /></span>
          </div>
        </article>
        <article className="report-card !rounded-[24px] !p-5">
          <p className="label-caps">Ingresos estimados</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="number-display text-3xl text-[#263649]">{currencyFormatter.format(scaledTotals.revenue)}</p>
              <p className="mt-2 text-xs text-slate-400">según filtros aplicados</p>
            </div>
            <span className="report-metric-icon"><CircleDollarSign className="h-5 w-5" /></span>
          </div>
        </article>
      </section>

      <section className="report-card">
        <div className="mb-5">
          <p className="label-caps">Consolidado del local</p>
          <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
            Reservas {report.name} por prestador
          </h3>
        </div>
        <div className="reservation-locations-table overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prestador</TableHead>
                <TableHead className="text-right">Reservas</TableHead>
                <TableHead className="text-right">Ingresos estimados</TableHead>
                <TableHead className="text-right">Ocupación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scaledProviders.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <span className="flex min-w-[15rem] items-center gap-3 font-semibold text-[#263649]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: provider.color }} />
                      {provider.name}
                    </span>
                  </TableCell>
                  <TableCell className="number-display text-right text-[#263649]">{numberFormatter.format(provider.bookings)}</TableCell>
                  <TableCell className="number-display whitespace-nowrap text-right text-[#263649]">{currencyFormatter.format(provider.revenue)}</TableCell>
                  <TableCell className="text-right">
                    <div className="ml-auto flex w-36 items-center justify-end gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0ebe6]">
                        <div className="h-full rounded-full" style={{ backgroundColor: provider.color, width: `${Math.min(provider.occupancy, 100)}%` }} />
                      </div>
                      <span className="number-display w-14 text-right text-[#263649]">{percentFormatter.format(provider.occupancy)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold text-[#263649]">Total</TableCell>
                <TableCell className="number-display text-right text-[#263649]">{numberFormatter.format(scaledTotals.bookings)}</TableCell>
                <TableCell className="number-display text-right text-[#263649]">{currencyFormatter.format(scaledTotals.revenue)}</TableCell>
                <TableCell className="number-display text-right text-[#263649]">{percentFormatter.format(scaledTotals.occupancy)}%</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </section>

      <section className="report-card">
        <div>
          <p className="label-caps">Evolución por prestador</p>
          <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">Cantidad de reservas semanales</h3>
          <p className="mt-2 text-sm text-slate-400">Comparativo histórico de la agenda por cabina y prestador.</p>
        </div>
        <WeeklyProvidersChart providers={report.providers} ratio={ratio} />
        <div className="mt-4 grid gap-x-5 gap-y-2 border-t border-[#ebe4de] pt-5 sm:grid-cols-2 xl:grid-cols-3">
          {report.providers.map((provider) => (
            <span key={provider.id} className="inline-flex min-w-0 items-center gap-2 text-xs text-slate-500">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: provider.color }} />
              <span className="truncate">{provider.name}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="report-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">Demanda horaria</p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">Reservas por hora por día de {report.name}</h3>
            <p className="mt-2 text-sm text-slate-400">El jueves concentra actividad entre 11:00 y 19:00.</p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-[#f7eef8] px-4 py-2 text-xs font-semibold text-[#8b3b8d] sm:self-auto">
            <Clock3 className="h-4 w-4" />
            Pico 12:00–13:00
          </span>
        </div>
        <HourlyDemandChart data={report.hourlyReservations} ratio={ratio} />
        <div className="mt-4 flex flex-wrap gap-4 border-t border-[#ebe4de] pt-5">
          {["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"].map((day) => {
            const color = report.hourlyReservations.find((point) => point.day === day)?.color ?? "#cbd2d9";
            return (
              <span key={day} className="inline-flex items-center gap-2 text-xs capitalize text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {day}
              </span>
            );
          })}
        </div>
      </section>
    </div>
  );
}
