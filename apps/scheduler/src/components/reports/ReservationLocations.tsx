import {
  Building2,
  CalendarRange,
  CircleDollarSign,
  MapPin,
  TrendingDown,
  TrendingUp,
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
  reservationLocationReports,
  reservationReportTotals,
  type ReservationLocationReport,
} from "@/lib/mock-reservation-report-data";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-MX");

interface ReservationLocationsProps {
  selectedBookings: number;
}

interface ScaledLocation extends ReservationLocationReport {
  scaledBookings: number;
  scaledRevenue: number;
  scaledOccupancy: number;
  scaledWeeklyReservations: Array<{ label: string; value: number }>;
}

function buildScaledLocations(selectedBookings: number): ScaledLocation[] {
  const ratio = selectedBookings / reservationReportTotals.bookings;

  return reservationLocationReports.map((location) => ({
    ...location,
    scaledBookings: Math.round(location.bookings * ratio),
    scaledRevenue: Math.round(location.revenue * ratio),
    scaledOccupancy: location.occupancy * ratio,
    scaledWeeklyReservations: location.weeklyReservations.map((point) => ({
      ...point,
      value: Math.round(point.value * ratio),
    })),
  }));
}

function LocationSummaryTable({ locations }: { locations: ScaledLocation[] }) {
  const totals = locations.reduce(
    (summary, location) => ({
      bookings: summary.bookings + location.scaledBookings,
      revenue: summary.revenue + location.scaledRevenue,
    }),
    { bookings: 0, revenue: 0 },
  );
  const averageOccupancy =
    locations.length > 0
      ? locations.reduce((sum, location) => sum + location.scaledOccupancy, 0) /
        locations.length
      : 0;

  return (
    <div className="reservation-locations-table overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sucursal</TableHead>
            <TableHead className="text-right">Reservas</TableHead>
            <TableHead className="text-right">Recaudación</TableHead>
            <TableHead className="text-right">Ocupación</TableHead>
            <TableHead className="text-right">Tendencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((location) => {
            const positiveChange = location.change >= 0;
            return (
              <TableRow key={location.id}>
                <TableCell>
                  <div className="flex min-w-[15rem] items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${location.color}16`, color: location.color }}
                    >
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-semibold text-[#263649]">{location.name}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {location.address}
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="number-display text-right text-[#263649]">
                  {numberFormatter.format(location.scaledBookings)}
                </TableCell>
                <TableCell className="number-display whitespace-nowrap text-right text-[#263649]">
                  {currencyFormatter.format(location.scaledRevenue)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="ml-auto flex w-32 items-center justify-end gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0ebe6]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: location.color,
                          width: `${Math.min(location.scaledOccupancy, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="number-display w-11 text-right text-[#263649]">
                      {location.scaledOccupancy.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      positiveChange
                        ? "reservation-location-trend reservation-location-trend-up"
                        : "reservation-location-trend reservation-location-trend-down"
                    }
                  >
                    {positiveChange ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {Math.abs(location.change).toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold text-[#263649]">Total consolidado</TableCell>
            <TableCell className="number-display text-right text-[#263649]">
              {numberFormatter.format(totals.bookings)}
            </TableCell>
            <TableCell className="number-display text-right text-[#263649]">
              {currencyFormatter.format(totals.revenue)}
            </TableCell>
            <TableCell className="number-display text-right text-[#263649]">
              {averageOccupancy.toFixed(1)}%
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function WeeklyLocationsChart({ locations }: { locations: ScaledLocation[] }) {
  const width = 920;
  const height = 280;
  const chartLeft = 48;
  const chartRight = 18;
  const chartTop = 18;
  const chartBottom = 48;
  const chartWidth = width - chartLeft - chartRight;
  const chartHeight = height - chartTop - chartBottom;
  const maxValue = Math.max(
    ...locations.flatMap((location) =>
      location.scaledWeeklyReservations.map((point) => point.value),
    ),
    1,
  );
  const maxScale = Math.max(25, Math.ceil(maxValue / 25) * 25);
  const labels = locations[0]?.scaledWeeklyReservations.map((point) => point.label) ?? [];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxScale * ratio));

  return (
    <div className="mt-7">
      <div className="reservation-location-chart-scroll overflow-x-auto pb-2">
        <svg
          aria-label="Cantidad de reservas semanales por local"
          className="h-[290px] min-w-[52rem] w-full"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {ticks.map((tick) => {
            const y = chartTop + chartHeight - (tick / maxScale) * chartHeight;
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
                <text fill="#9aa3ad" fontSize="10" textAnchor="end" x={chartLeft - 10} y={y + 3}>
                  {tick}
                </text>
              </g>
            );
          })}

          {locations.map((location) => {
            const points = location.scaledWeeklyReservations.map((point, index) => ({
              x: chartLeft +
                (index / Math.max(location.scaledWeeklyReservations.length - 1, 1)) * chartWidth,
              y: chartTop + chartHeight - (point.value / maxScale) * chartHeight,
            }));
            const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

            return (
              <g key={location.id}>
                <polyline
                  fill="none"
                  points={polyline}
                  stroke={location.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3.5"
                />
                {points.map((point, index) => (
                  <circle
                    key={`${location.id}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    fill="white"
                    r="4"
                    stroke={location.color}
                    strokeWidth="2.5"
                  />
                ))}
              </g>
            );
          })}

          {labels.map((label, index) => {
            const x = chartLeft + (index / Math.max(labels.length - 1, 1)) * chartWidth;
            return (
              <text
                key={label}
                fill="#8d97a2"
                fontSize="9.5"
                textAnchor="middle"
                x={x}
                y={height - 13}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function ReservationLocations({ selectedBookings }: ReservationLocationsProps) {
  const locations = buildScaledLocations(selectedBookings);
  const topLocation = locations.reduce<ScaledLocation | null>(
    (top, location) =>
      top === null || location.scaledBookings > top.scaledBookings ? location : top,
    null,
  );

  return (
    <div className="space-y-5">
      <section className="report-card reservation-locations-intro">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label-caps">Reservas / Locales</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[#263649]">
              Rendimiento por sucursal
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Compara volumen, ingresos, ocupación y evolución semanal de todos tus locales.
            </p>
          </div>
          {topLocation ? (
            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#f2f7f4] px-4 py-2 text-xs font-semibold text-[#526f5e] sm:self-auto">
              <TrendingUp className="h-4 w-4" />
              Líder: {topLocation.name}
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="report-card !rounded-[24px] !p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-caps">Locales activos</p>
              <p className="number-display mt-3 text-3xl text-[#263649]">{locations.length}</p>
              <p className="mt-2 text-xs text-slate-400">incluidos en el reporte</p>
            </div>
            <span className="report-metric-icon"><Building2 className="h-5 w-5" /></span>
          </div>
        </article>
        <article className="report-card !rounded-[24px] !p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-caps">Reservas analizadas</p>
              <p className="number-display mt-3 text-3xl text-[#263649]">
                {numberFormatter.format(selectedBookings)}
              </p>
              <p className="mt-2 text-xs text-slate-400">según filtros aplicados</p>
            </div>
            <span className="report-metric-icon"><CalendarRange className="h-5 w-5" /></span>
          </div>
        </article>
        <article className="report-card !rounded-[24px] !p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-caps">Ingreso consolidado</p>
              <p className="number-display mt-3 text-3xl text-[#263649]">
                {currencyFormatter.format(
                  locations.reduce((sum, location) => sum + location.scaledRevenue, 0),
                )}
              </p>
              <p className="mt-2 text-xs text-slate-400">recaudación estimada</p>
            </div>
            <span className="report-metric-icon"><CircleDollarSign className="h-5 w-5" /></span>
          </div>
        </article>
      </section>

      <section className="report-card">
        <div className="mb-5">
          <p className="label-caps">Consolidado</p>
          <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
            Reservas por local
          </h3>
        </div>
        <LocationSummaryTable locations={locations} />
      </section>

      <section className="report-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">Evolución por sucursal</p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
              Cantidad de reservas semanales
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Comparativo de las últimas doce semanas disponibles.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {locations.map((location) => (
              <span key={location.id} className="inline-flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: location.color }} />
                {location.name}
              </span>
            ))}
          </div>
        </div>
        <WeeklyLocationsChart locations={locations} />
      </section>
    </div>
  );
}
