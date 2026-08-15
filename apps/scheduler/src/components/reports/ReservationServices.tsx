"use client";

import { useMemo, useState } from "react";
import { BarChart3, Layers3, Search, Sparkles } from "lucide-react";
import {
  Input,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import {
  reservationReportTotals,
  reservationServiceReportTotals,
  reservationServiceReports,
  type ReservationServiceReport,
} from "@/lib/mock-reservation-report-data";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-MX");

interface ReservationServicesProps {
  selectedBookings: number;
  locationName?: string;
  servicesData?: ReservationServiceReport[];
  reportTotals?: {
    bookings: number;
    revenue: number;
  };
}

interface ScaledService extends ReservationServiceReport {
  scaledBookings: number;
  scaledRevenue: number;
  share: number;
  averageTicket: number;
}

function scaleServices(
  selectedBookings: number,
  servicesData: ReservationServiceReport[],
  reportTotals: { bookings: number; revenue: number },
): ScaledService[] {
  const ratio = selectedBookings / reservationReportTotals.bookings;
  const rawBookings = servicesData.map((service) => service.bookings * ratio);
  const scaledBookings = rawBookings.map(Math.floor);
  const targetBookings = Math.round(reportTotals.bookings * ratio);
  const missingBookings = targetBookings - scaledBookings.reduce((sum, value) => sum + value, 0);
  const remainderOrder = rawBookings
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let index = 0; index < missingBookings; index += 1) {
    const target = remainderOrder[index % remainderOrder.length];
    if (target) scaledBookings[target.index] = (scaledBookings[target.index] ?? 0) + 1;
  }

  const scaledRevenue = servicesData.map((service) => Math.round(service.revenue * ratio));

  return servicesData.map((service, index) => {
    const bookings = scaledBookings[index] ?? 0;
    const revenue = scaledRevenue[index] ?? 0;
    return {
      ...service,
      scaledBookings: bookings,
      scaledRevenue: revenue,
      share: targetBookings > 0 ? (bookings / targetBookings) * 100 : 0,
      averageTicket: bookings > 0 ? revenue / bookings : 0,
    };
  });
}

function buildServiceDonut(services: ScaledService[]) {
  const active = services.filter((service) => service.scaledBookings > 0);
  const total = active.reduce((sum, service) => sum + service.scaledBookings, 0);
  if (total === 0) return "conic-gradient(#ebe5df 0 100%)";

  let cursor = 0;
  const segments = active.map((service) => {
    const start = cursor;
    cursor += (service.scaledBookings / total) * 100;
    return `${service.color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function ServicesTable({
  services,
  reportBookings,
  reportRevenue,
  useReportTotals,
}: {
  services: ScaledService[];
  reportBookings: number;
  reportRevenue: number;
  useReportTotals: boolean;
}) {
  const visibleBookings = services.reduce((sum, service) => sum + service.scaledBookings, 0);
  const visibleRevenue = services.reduce((sum, service) => sum + service.scaledRevenue, 0);
  const totalShare = services.reduce((sum, service) => sum + service.share, 0);
  const totalBookings = useReportTotals ? reportBookings : visibleBookings;
  const totalRevenue = useReportTotals ? reportRevenue : visibleRevenue;

  return (
    <div className="reservation-services-table overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Servicio</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Reservas</TableHead>
            <TableHead className="text-right">Participación</TableHead>
            <TableHead className="text-right">Recaudación</TableHead>
            <TableHead className="text-right">Ticket promedio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length > 0 ? (
            services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>
                  <div className="flex min-w-[14rem] items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: service.color }} />
                    <span className="font-semibold text-[#263649]">{service.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="reservation-service-category">{service.category}</span>
                </TableCell>
                <TableCell className="number-display text-right text-[#263649]">
                  {numberFormatter.format(service.scaledBookings)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="ml-auto flex w-32 items-center justify-end gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0ebe6]">
                      <div
                        className="h-full rounded-full"
                        style={{ backgroundColor: service.color, width: `${Math.min(service.share, 100)}%` }}
                      />
                    </div>
                    <span className="number-display w-11 text-right text-[#263649]">
                      {service.share.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="number-display whitespace-nowrap text-right text-[#263649]">
                  {currencyFormatter.format(service.scaledRevenue)}
                </TableCell>
                <TableCell className="number-display whitespace-nowrap text-right text-[#263649]">
                  {service.scaledBookings > 0
                    ? currencyFormatter.format(service.averageTicket)
                    : "—"}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-32 text-center text-slate-400" colSpan={6}>
                No hay servicios que coincidan con la búsqueda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold text-[#263649]" colSpan={2}>Total visible</TableCell>
            <TableCell className="number-display text-right text-[#263649]">
              {numberFormatter.format(totalBookings)}
            </TableCell>
            <TableCell className="number-display text-right text-[#263649]">{totalShare.toFixed(1)}%</TableCell>
            <TableCell className="number-display text-right text-[#263649]">
              {currencyFormatter.format(totalRevenue)}
            </TableCell>
            <TableCell className="number-display text-right text-[#263649]">
              {totalBookings > 0 ? currencyFormatter.format(totalRevenue / totalBookings) : "—"}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function ServiceRanking({ services, selectedBookings }: { services: ScaledService[]; selectedBookings: number }) {
  const rankedServices = [...services]
    .filter((service) => service.scaledBookings > 0)
    .sort((a, b) => b.scaledBookings - a.scaledBookings);
  const primaryServices = rankedServices.slice(0, 5);
  const remainingServices = rankedServices.slice(5);
  const otherBookings = remainingServices.reduce(
    (sum, service) => sum + service.scaledBookings,
    0,
  );
  const otherRevenue = remainingServices.reduce(
    (sum, service) => sum + service.scaledRevenue,
    0,
  );
  const chartServices: ScaledService[] = [
    ...primaryServices,
    ...(otherBookings > 0
      ? [{
          id: "service-others-summary",
          name: "Otros servicios",
          category: "Otros",
          bookings: otherBookings,
          revenue: otherRevenue,
          color: "#d9d3cd",
          scaledBookings: otherBookings,
          scaledRevenue: otherRevenue,
          share: selectedBookings > 0 ? (otherBookings / selectedBookings) * 100 : 0,
          averageTicket: otherBookings > 0 ? otherRevenue / otherBookings : 0,
        }]
      : []),
  ];
  const donutBackground = buildServiceDonut(chartServices);

  return (
    <section className="reservation-service-insights grid gap-5 xl:grid-cols-2">
      <article className="report-card reservation-service-insight-card">
        <p className="label-caps">Distribución</p>
        <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
          Participación por servicio
        </h3>
        <p className="mt-2 text-sm text-slate-400">Top cinco y participación agrupada del resto.</p>
        <div className="reservation-service-distribution-grid mt-6">
          <div
            className="flex h-44 w-44 shrink-0 items-center justify-center rounded-full"
            style={{ background: donutBackground }}
          >
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-[0_10px_26px_rgba(38,54,73,0.1)]">
              <span className="number-display text-[1.7rem] text-[#263649]">{selectedBookings}</span>
              <span className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">reservas</span>
            </div>
          </div>
          <div className="reservation-service-legend w-full space-y-2.5">
            {chartServices.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-slate-500">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: service.color }} />
                  <span className="truncate" title={service.name}>{service.name}</span>
                </span>
                <span className="number-display shrink-0 text-[#263649]">{service.share.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="report-card reservation-service-insight-card">
        <p className="label-caps">Ranking</p>
        <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
          Servicios más utilizados
        </h3>
        <p className="mt-2 text-sm text-slate-400">Ordenados por número de reservas del periodo.</p>
        <div className="mt-6 space-y-4">
          {rankedServices.slice(0, 5).map((service, index) => {
            const maxBookings = rankedServices[0]?.scaledBookings ?? 1;
            return (
              <div key={service.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3">
                <span className="number-display text-xs text-slate-300">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-[#536276]">{service.name}</span>
                    <span className="number-display shrink-0 text-[#263649]">{service.scaledBookings}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#f0ebe6]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${service.color}, ${service.color}b8)`,
                        width: `${maxBookings > 0 ? (service.scaledBookings / maxBookings) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="number-display min-w-[4.5rem] text-right text-xs text-[#526f5e]">
                  {currencyFormatter.format(service.scaledRevenue)}
                </span>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}

export function ReservationServices({
  selectedBookings,
  locationName,
  servicesData = reservationServiceReports,
  reportTotals = reservationServiceReportTotals,
}: ReservationServicesProps) {
  const [search, setSearch] = useState("");
  const [serviceScope, setServiceScope] = useState<"active" | "all">(
    locationName ? "all" : "active",
  );
  const services = useMemo(
    () => scaleServices(selectedBookings, servicesData, reportTotals),
    [reportTotals, selectedBookings, servicesData],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const filteredServices = services.filter((service) => {
    const matchesScope = serviceScope === "all" || service.scaledBookings > 0;
    const matchesSearch = `${service.name} ${service.category}`
      .toLocaleLowerCase("es-MX")
      .includes(normalizedSearch);
    return matchesScope && matchesSearch;
  });
  const categories = new Set(services.map((service) => service.category)).size;
  const reportRatio = selectedBookings / reservationReportTotals.bookings;
  const serviceBookings = Math.round(reportTotals.bookings * reportRatio);
  const totalRevenue = Math.round(reportTotals.revenue * reportRatio);
  const activeServices = services.filter((service) => service.scaledBookings > 0).length;
  const topService = [...services].sort((a, b) => b.scaledBookings - a.scaledBookings)[0];

  return (
    <div className="space-y-5">
      <section className="report-card reservation-services-intro">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label-caps">
              Reservas / {locationName ? "Servicios por local" : "Servicios"}
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[#263649]">
              {locationName ? `Servicios de ${locationName}` : "Rendimiento del catálogo"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {locationName
                ? "Analiza la demanda y recaudación del catálogo asignado a esta sucursal."
                : "Descubre qué tratamientos concentran la demanda y cuánto ingreso generan."}
            </p>
          </div>
          {topService ? (
            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#f2f7f4] px-4 py-2 text-xs font-semibold text-[#526f5e] sm:self-auto">
              <Sparkles className="h-4 w-4" />
              Favorito: {topService.name}
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="report-card !rounded-[24px] !p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-caps">Servicios reservados</p>
              <p className="number-display mt-3 text-3xl text-[#263649]">{activeServices}</p>
              <p className="mt-2 text-xs text-slate-400">de {services.length} en el catálogo</p>
            </div>
            <span className="report-metric-icon"><Layers3 className="h-5 w-5" /></span>
          </div>
        </article>
        <article className="report-card !rounded-[24px] !p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-caps">Categorías</p>
              <p className="number-display mt-3 text-3xl text-[#263649]">{categories}</p>
              <p className="mt-2 text-xs text-slate-400">familias de tratamientos</p>
            </div>
            <span className="report-metric-icon"><BarChart3 className="h-5 w-5" /></span>
          </div>
        </article>
        <article className="report-card !rounded-[24px] !p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-caps">Ticket promedio</p>
              <p className="number-display mt-3 text-3xl text-[#263649]">
                {serviceBookings > 0 ? currencyFormatter.format(totalRevenue / serviceBookings) : "—"}
              </p>
              <p className="mt-2 text-xs text-slate-400">por reserva del periodo</p>
            </div>
            <span className="report-metric-icon"><Sparkles className="h-5 w-5" /></span>
          </div>
        </article>
      </section>

      <ServiceRanking selectedBookings={serviceBookings} services={services} />

      <section className="report-card">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">Consolidado</p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
              {locationName
                ? `Reservas de ${locationName} por servicio`
                : "Reservas por servicio"}
            </h3>
          </div>
          <div className="flex w-full flex-col gap-3 sm:max-w-xl sm:flex-row sm:items-center sm:justify-end">
            <div className="reservation-service-scope" aria-label="Visibilidad de servicios">
              <button
                aria-pressed={serviceScope === "active"}
                className={serviceScope === "active" ? "reservation-service-scope-active" : ""}
                onClick={() => setServiceScope("active")}
                type="button"
              >
                Con reservas ({activeServices})
              </button>
              <button
                aria-pressed={serviceScope === "all"}
                className={serviceScope === "all" ? "reservation-service-scope-active" : ""}
                onClick={() => setServiceScope("all")}
                type="button"
              >
                Todos ({services.length})
              </button>
            </div>
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Buscar servicio"
                className="h-11 rounded-2xl border-[#e6ddd5] bg-[#faf8f5] pl-10 text-[#263649]"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar servicio..."
                value={search}
              />
            </div>
          </div>
        </div>
        <ServicesTable
          reportBookings={serviceBookings}
          reportRevenue={totalRevenue}
          services={filteredServices}
          useReportTotals={normalizedSearch.length === 0}
        />
      </section>
    </div>
  );
}
