"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  DataTable,
  DateRangePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  type ColumnDef,
  type DateRange,
} from "@cosmetics/ui";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Download,
  Filter,
  ListFilter,
  Search,
  Sparkles,
} from "lucide-react";
import {
  reservationReportSections,
  reservationHistory,
  reservationMobileMessagingTotals,
  reservationProvidersByLocationReports,
  reservationReportTotals,
  reservationServiceReportTotals,
  reservationServiceReports,
  reservationServicesByLocationReports,
  reservationStatusOptions,
  reservationsByHour,
  reservationsByWeekday,
  serviceRanking,
  type ReservationChartPoint,
  type ReservationHistoryRecord,
  type ReservationPaymentStatus,
  type ReservationReportStatus,
  type ServiceRankingItem,
} from "@/lib/mock-reservation-report-data";
import { ReservationMetrics } from "./ReservationMetrics";
import { ReservationLocations } from "./ReservationLocations";
import { ReservationServices } from "./ReservationServices";
import { ReservationMobileMessaging } from "./ReservationMobileMessaging";
import { ReservationProvidersByLocation } from "./ReservationProvidersByLocation";
import { ReportsHeader } from "./ReportsHeader";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-MX");

function buildDonutGradient(items: ServiceRankingItem[]) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const segments = items.map((item) => {
    const start = cursor;
    cursor += (item.value / total) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function WeekdayChart({ data }: { data: ReservationChartPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <div
      className="mt-7 grid h-64 grid-cols-7 items-end gap-2 sm:gap-3"
      aria-label="Reservas por día de la semana"
    >
      {data.map((point) => (
        <div key={point.label} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
          <span className="number-display text-[0.68rem] text-slate-500">
            {point.value}
          </span>
          <div className="flex h-[190px] w-full items-end overflow-hidden rounded-xl bg-[#f0ebe6]">
            <div
              className="w-full rounded-xl bg-[linear-gradient(180deg,#c3a583,#ad8b67)] transition-[height] duration-500"
              style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-[0.68rem] font-medium text-slate-400">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

function HourlyChart({ data }: { data: ReservationChartPoint[] }) {
  const width = 900;
  const height = 220;
  const max = Math.max(...data.map((point) => point.value), 1);
  const points = data
    .map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (point.value / max) * (height - 34) - 12;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mt-6">
      <svg
        aria-label="Reservas por hora del día"
        className="h-[230px] w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[44, 88, 132, 176].map((y) => (
          <line key={y} x1="0" x2={width} y1={y} y2={y} stroke="#ece6e0" strokeWidth="1" />
        ))}
        <defs>
          <linearGradient id="reservation-hour-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#648672" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#648672" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#reservation-hour-area)" />
        <polyline
          fill="none"
          points={points}
          stroke="#648672"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - (point.value / max) * (height - 34) - 12;
          return (
            <circle
              key={point.label}
              cx={x}
              cy={y}
              fill="#fff"
              r="5"
              stroke="#648672"
              strokeWidth="3"
            />
          );
        })}
      </svg>
      <div className="grid grid-flow-col auto-cols-fr gap-1 text-center text-[0.62rem] font-medium text-slate-400">
        {data.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

type ReservationReportView =
  | "general"
  | "history"
  | "metrics"
  | "locations"
  | "services"
  | "mobile-messaging"
  | "services-by-location"
  | "providers-by-location";

function ReportBreakdownNav({ view }: { view: ReservationReportView }) {
  const [reservationsOpen, setReservationsOpen] = useState(
    view === "history" || view === "metrics",
  );
  const [servicesByLocationOpen, setServicesByLocationOpen] = useState(
    view === "services-by-location",
  );
  const [providersByLocationOpen, setProvidersByLocationOpen] = useState(
    view === "providers-by-location",
  );

  return (
    <aside className="reservation-report-nav">
      <div className="mb-4 flex items-center gap-2 px-2">
        <ListFilter className="h-4 w-4 text-[#ad8b67]" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Desgloses
        </p>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        <Link
          className={
            view === "general"
              ? "reservation-report-nav-item reservation-report-nav-item-active"
              : "reservation-report-nav-item"
          }
          href="/reportes/reservas"
        >
          <span>General</span>
          {view === "general" ? (
            <span className="h-2 w-2 rounded-full bg-[#648672]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-300" />
          )}
        </Link>

        <div className="reservation-report-nav-group">
          <button
            aria-expanded={reservationsOpen}
            className={
              view === "history" || view === "metrics"
                ? "reservation-report-nav-item reservation-report-nav-item-active"
                : "reservation-report-nav-item"
            }
            onClick={() => setReservationsOpen((current) => !current)}
            type="button"
          >
            <span>Reservas</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${reservationsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {reservationsOpen ? (
            <div className="reservation-report-subnav">
              <Link
                className={
                  view === "history"
                    ? "reservation-report-subnav-item reservation-report-subnav-item-active"
                    : "reservation-report-subnav-item"
                }
                href="/reportes/reservas/historial"
              >
                Historial
              </Link>
              <Link
                className={
                  view === "metrics"
                    ? "reservation-report-subnav-item reservation-report-subnav-item-active"
                    : "reservation-report-subnav-item"
                }
                href="/reportes/reservas/metricas"
              >
                Métricas
              </Link>
            </div>
          ) : null}
        </div>

        <Link
          className={
            view === "locations"
              ? "reservation-report-nav-item reservation-report-nav-item-active"
              : "reservation-report-nav-item"
          }
          href="/reportes/reservas/locales"
        >
          <span>Locales</span>
          {view === "locations" ? (
            <span className="h-2 w-2 rounded-full bg-[#648672]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-300" />
          )}
        </Link>

        <Link
          className={
            view === "services"
              ? "reservation-report-nav-item reservation-report-nav-item-active"
              : "reservation-report-nav-item"
          }
          href="/reportes/reservas/servicios"
        >
          <span>Servicios</span>
          {view === "services" ? (
            <span className="h-2 w-2 rounded-full bg-[#648672]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-300" />
          )}
        </Link>

        <Link
          className={
            view === "mobile-messaging"
              ? "reservation-report-nav-item reservation-report-nav-item-active"
              : "reservation-report-nav-item"
          }
          href="/reportes/reservas/mensajeria-movil"
        >
          <span>Mensajería móvil</span>
          {view === "mobile-messaging" ? (
            <span className="h-2 w-2 rounded-full bg-[#648672]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-300" />
          )}
        </Link>

        <div className="reservation-report-nav-group">
          <button
            aria-expanded={servicesByLocationOpen}
            className={
              view === "services-by-location"
                ? "reservation-report-nav-item reservation-report-nav-item-active"
                : "reservation-report-nav-item"
            }
            onClick={() => setServicesByLocationOpen((current) => !current)}
            type="button"
          >
            <span>Servicios por local</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${servicesByLocationOpen ? "rotate-180" : ""}`}
            />
          </button>
          {servicesByLocationOpen ? (
            <div className="reservation-report-subnav">
              <Link
                className={
                  view === "services-by-location"
                    ? "reservation-report-subnav-item reservation-report-subnav-item-active"
                    : "reservation-report-subnav-item"
                }
                href="/reportes/reservas/servicios-por-local/opatra-mexico"
              >
                OPATRA MEXICO
              </Link>
            </div>
          ) : null}
        </div>

        <div className="reservation-report-nav-group">
          <button
            aria-expanded={providersByLocationOpen}
            className={
              view === "providers-by-location"
                ? "reservation-report-nav-item reservation-report-nav-item-active"
                : "reservation-report-nav-item"
            }
            onClick={() => setProvidersByLocationOpen((current) => !current)}
            type="button"
          >
            <span>Prestadores por local</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${providersByLocationOpen ? "rotate-180" : ""}`}
            />
          </button>
          {providersByLocationOpen ? (
            <div className="reservation-report-subnav">
              <Link
                className="reservation-report-subnav-item reservation-report-subnav-item-active"
                href="/reportes/reservas/prestadores-por-local/opatra-mexico"
              >
                OPATRA MEXICO
              </Link>
            </div>
          ) : null}
        </div>

        {reservationReportSections.slice(7).map((section) => (
          <button
            key={section}
            className="reservation-report-nav-item"
            onClick={() =>
              toast.info(`${section} estará disponible en la siguiente fase`, {
                description: "Este desglose todavía se encuentra en construcción.",
              })
            }
            type="button"
          >
            <span>{section}</span>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </button>
        ))}
      </nav>
      {view === "services" || view === "services-by-location" || view === "providers-by-location" ? (
        <div className="reservation-report-nav-summary">
          <p className="label-caps">
            {view === "services-by-location" || view === "providers-by-location" ? "OPATRA MEXICO" : "Catálogo actual"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <span className="number-display block text-lg text-[#263649]">
                {view === "providers-by-location" ? 41 : reservationServiceReportTotals.bookings}
              </span>
              <span className="text-[0.65rem] text-slate-400">reservas</span>
            </div>
            <div>
              <span className="number-display block text-lg text-[#263649]">
                {view === "providers-by-location" ? reservationProvidersByLocationReports[0]!.providers.length : reservationServiceReports.length}
              </span>
              <span className="text-[0.65rem] text-slate-400">
                {view === "providers-by-location" ? "prestadores" : "servicios"}
              </span>
            </div>
          </div>
          <div className="mt-3 border-t border-[#e8dfd8] pt-3">
            <span className="number-display block text-sm text-[#526f5e]">
              {view === "providers-by-location" ? "$52,699" : "$48,959"}
            </span>
            <span className="text-[0.65rem] text-slate-400">recaudación reportada</span>
          </div>
        </div>
      ) : view === "mobile-messaging" ? (
        <div className="reservation-report-nav-summary">
          <p className="label-caps">Canal WhatsApp</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <span className="number-display block text-lg text-[#263649]">
                {reservationMobileMessagingTotals.messagesSent}
              </span>
              <span className="text-[0.65rem] text-slate-400">enviados</span>
            </div>
            <div>
              <span className="number-display block text-lg text-[#263649]">
                {reservationMobileMessagingTotals.confirmedByWhatsApp}
              </span>
              <span className="text-[0.65rem] text-slate-400">confirmado</span>
            </div>
          </div>
          <div className="mt-3 border-t border-[#e8dfd8] pt-3">
            <span className="number-display block text-sm text-[#526f5e]">1 / 100</span>
            <span className="text-[0.65rem] text-slate-400">conversaciones utilizadas</span>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function CompactMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="report-card !rounded-[24px] !p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps">{label}</p>
          <p className="number-display mt-3 text-[1.75rem] leading-none tracking-[-0.04em] text-[#263649]">
            {value}
          </p>
          <p className="mt-3 text-xs text-slate-400">{note}</p>
        </div>
        <span className="report-metric-icon">{icon}</span>
      </div>
    </article>
  );
}

const statusLabels: Record<ReservationReportStatus, string> = {
  reserved: "Reservada",
  confirmed: "Confirmada",
  attended: "Asistió",
  "no-show": "No asistió",
  canceled: "Cancelada",
  pending: "Pendiente",
};

const paymentLabels: Record<ReservationPaymentStatus, string> = {
  paid: "Pagada",
  pending: "Pago pendiente",
  unpaid: "No pagada",
};

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

const historyColumns: ColumnDef<ReservationHistoryRecord>[] = [
  {
    accessorKey: "performedAt",
    header: "Fecha de realización",
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-medium text-[#263649]">
        {formatHistoryDate(row.original.performedAt)}
      </span>
    ),
  },
  { accessorKey: "branch", header: "Local" },
  { accessorKey: "client", header: "Cliente" },
  { accessorKey: "service", header: "Servicio" },
  { accessorKey: "provider", header: "Prestador" },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <span className={`reservation-history-badge reservation-history-badge-${row.original.status}`}>
        {statusLabels[row.original.status]}
      </span>
    ),
  },
  {
    accessorKey: "paymentStatus",
    header: "Estado de pago",
    cell: ({ row }) => (
      <span className={`reservation-payment-badge reservation-payment-badge-${row.original.paymentStatus}`}>
        {paymentLabels[row.original.paymentStatus]}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Monto",
    cell: ({ row }) => (
      <span className="number-display whitespace-nowrap text-[#263649]">
        {row.original.amount > 0
          ? currencyFormatter.format(row.original.amount)
          : "—"}
      </span>
    ),
  },
];

function ReservationHistory({ records }: { records: ReservationHistoryRecord[] }) {
  return (
    <section className="report-card reservation-history-card">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Reservas / Historial</p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[#263649]">
            Historial de reservas
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Se muestran hasta 50 reservas del periodo y estados seleccionados.
          </p>
        </div>
        <Button
          className="h-11 rounded-2xl border-[#dfd6ce] bg-white px-5 text-[#263649] hover:bg-[#f8f5f1]"
          onClick={() =>
            toast.info("Descarga preparada en modo visual", {
              description: "La exportación XLSX se conectará junto con la API.",
            })
          }
          type="button"
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          Descargar historial
        </Button>
      </div>

      <div className="reservation-history-table">
        <DataTable
          columns={historyColumns}
          data={records.slice(0, 50)}
          emptyMessage="No hay reservas para los filtros seleccionados."
          pageSize={10}
          searchPlaceholder="Buscar cliente, servicio, local o prestador..."
        />
      </div>
    </section>
  );
}

export function ReservationReportWorkspace({
  view = "general",
}: {
  view?: ReservationReportView;
}) {
  const allStatuses = reservationStatusOptions.map((option) => option.value);
  const [draftRange, setDraftRange] = useState<DateRange>({
    from: "2026-08-03",
    to: "2026-08-09",
  });
  const [draftStatuses, setDraftStatuses] =
    useState<ReservationReportStatus[]>(allStatuses);
  const [appliedStatuses, setAppliedStatuses] =
    useState<ReservationReportStatus[]>(allStatuses);
  const [dateBasis, setDateBasis] = useState("service-date");
  const [appliedDateBasis, setAppliedDateBasis] = useState("service-date");
  const [appliedRange, setAppliedRange] = useState<DateRange>(draftRange);

  const selectedCount = useMemo(
    () =>
      reservationStatusOptions
        .filter((option) => appliedStatuses.includes(option.value))
        .reduce((sum, option) => sum + option.count, 0),
    [appliedStatuses],
  );
  const filterRatio = selectedCount / reservationReportTotals.bookings;
  const filteredRevenue = Math.round(reservationReportTotals.revenue * filterRatio);
  const attendedCount = appliedStatuses.includes("attended")
    ? reservationReportTotals.attended
    : 0;
  const attendanceRate = selectedCount > 0 ? (attendedCount / selectedCount) * 100 : 0;
  const scaledWeekdays = reservationsByWeekday.map((point) => ({
    ...point,
    value: Math.max(0, Math.round(point.value * filterRatio)),
  }));
  const scaledHours = reservationsByHour.map((point) => ({
    ...point,
    value: Math.max(0, Math.round(point.value * filterRatio)),
  }));
  const donutBackground = buildDonutGradient(serviceRanking);
  const filteredHistory = useMemo(
    () =>
      reservationHistory.filter((record) => {
        if (!appliedStatuses.includes(record.status)) return false;
        const sourceDate =
          appliedDateBasis === "created-date"
            ? record.createdAt
            : record.performedAt;
        const isoDate = sourceDate.slice(0, 10);
        return isoDate >= appliedRange.from && isoDate <= appliedRange.to;
      }),
    [appliedDateBasis, appliedRange, appliedStatuses],
  );

  const toggleStatus = (status: ReservationReportStatus) => {
    setDraftStatuses((current) => {
      if (current.includes(status)) {
        return current.length === 1
          ? current
          : current.filter((value) => value !== status);
      }
      return [...current, status];
    });
  };

  const applyFilters = () => {
    setAppliedStatuses(draftStatuses);
    setAppliedDateBasis(dateBasis);
    setAppliedRange(draftRange);
    toast.success("Reporte actualizado", {
      description: `${draftRange.from} al ${draftRange.to} · ${draftStatuses.length} estados`,
    });
  };

  return (
    <div className="report-workspace min-h-screen bg-[#f4f1ed] text-[#263649]">
      <ReportsHeader active="reservations" />
      <main className="mx-auto max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-caps">
              Reportes / Reservas / {view === "history" ? "Historial" : view === "metrics" ? "Métricas" : view === "locations" ? "Locales" : view === "services" ? "Servicios" : view === "mobile-messaging" ? "Mensajería móvil" : view === "services-by-location" ? "Servicios por local" : view === "providers-by-location" ? "Prestadores por local" : "General"}
            </p>
            <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3.25rem)] text-[#263649]">
              Reporte de reservas
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Analiza volumen, recaudación, servicios y horarios para entender el comportamiento de tu agenda.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#e6ddd5] bg-white px-4 py-2 text-xs text-slate-500 lg:self-auto">
            <Sparkles className="h-4 w-4 text-[#ad8b67]" />
            Datos mock de la agenda
          </div>
        </section>

        <section className="reservation-filter-card mt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(18rem,1fr)_minmax(18rem,1fr)_auto] lg:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Periodo de análisis
              </p>
              <DateRangePicker
                className="h-12 w-full rounded-2xl border-[#e6ddd5] bg-white px-4 text-sm text-[#263649] shadow-none"
                onChange={setDraftRange}
                value={draftRange}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Considerar fecha de
              </p>
              <Select value={dateBasis} onValueChange={setDateBasis}>
                <SelectTrigger className="h-12 rounded-2xl border-[#e6ddd5] bg-white px-4 text-sm text-[#263649] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-[#e6ddd5] bg-white p-1.5">
                  <SelectItem className="rounded-xl px-3 py-2.5" value="service-date">
                    Realización de la reserva
                  </SelectItem>
                  <SelectItem className="rounded-xl px-3 py-2.5" value="created-date">
                    Creación de la reserva
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-12 rounded-2xl bg-[#648672] px-7 text-white hover:bg-[#526f5e]"
              onClick={applyFilters}
              type="button"
            >
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
          </div>

          <div className="mt-5 border-t border-[#ebe4de] pt-5">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#ad8b67]" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Estado de la reserva
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {reservationStatusOptions.map((status) => {
                const selected = draftStatuses.includes(status.value);
                return (
                  <button
                    key={status.value}
                    aria-pressed={selected}
                    className={selected ? "reservation-status-chip reservation-status-chip-active" : "reservation-status-chip"}
                    onClick={() => toggleStatus(status.value)}
                    type="button"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.label}
                    <span className="number-display text-[0.65rem] opacity-55">{status.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <ReportBreakdownNav view={view} />

          <div className="min-w-0 space-y-5">
            {view === "history" ? (
              <ReservationHistory records={filteredHistory} />
            ) : view === "metrics" ? (
              <ReservationMetrics
                activeStatuses={appliedStatuses}
                totalBookings={selectedCount}
              />
            ) : view === "locations" ? (
              <ReservationLocations selectedBookings={selectedCount} />
            ) : view === "services" ? (
              <ReservationServices selectedBookings={selectedCount} />
            ) : view === "mobile-messaging" ? (
              <ReservationMobileMessaging selectedBookings={selectedCount} />
            ) : view === "services-by-location" ? (
              <ReservationServices
                locationName={reservationServicesByLocationReports[0]!.name}
                reportTotals={reservationServiceReportTotals}
                selectedBookings={selectedCount}
                servicesData={reservationServicesByLocationReports[0]!.services}
              />
            ) : view === "providers-by-location" ? (
              <ReservationProvidersByLocation
                report={reservationProvidersByLocationReports[0]!}
                selectedBookings={selectedCount}
              />
            ) : (
              <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <CompactMetric
                icon={<CalendarDays className="h-5 w-5" />}
                label="Reservas"
                note="según los estados aplicados"
                value={numberFormatter.format(selectedCount)}
              />
              <CompactMetric
                icon={<CircleDollarSign className="h-5 w-5" />}
                label="Recaudación"
                note="ingreso asociado estimado"
                value={currencyFormatter.format(filteredRevenue)}
              />
              <CompactMetric
                icon={<BarChart3 className="h-5 w-5" />}
                label="Tasa de asistencia"
                note="reservas marcadas como asistidas"
                value={`${attendanceRate.toFixed(1)}%`}
              />
              <CompactMetric
                icon={<ArrowUpRight className="h-5 w-5" />}
                label="Ticket promedio"
                note="por reserva atendida"
                value={currencyFormatter.format(reservationReportTotals.averageTicket)}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <article className="report-card">
                <p className="label-caps">Preferencias</p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
                  Ranking de servicios utilizados
                </h2>
                <div className="mt-7 grid gap-7 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
                  <div
                    className="mx-auto flex h-48 w-48 items-center justify-center rounded-full"
                    style={{ background: donutBackground }}
                  >
                    <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(38,54,73,0.08)]">
                      <span className="number-display text-2xl text-[#263649]">{selectedCount}</span>
                      <span className="text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">reservas</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {serviceRanking.map((service) => (
                      <div key={service.label} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-2 text-slate-500">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: service.color }} />
                          <span className="truncate">{service.label}</span>
                        </span>
                        <span className="number-display text-[#263649]">
                          {Math.round(service.value * filterRatio)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="report-card">
                <p className="label-caps">Distribución</p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
                  Reservas por día de la semana
                </h2>
                <WeekdayChart data={scaledWeekdays} />
              </article>
            </section>

            <article className="report-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="label-caps">Demanda horaria</p>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#263649]">
                    Reservas por hora del día
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    La mayor concentración ocurre entre 16:00 y 18:00.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 self-start rounded-full bg-[#f2f7f4] px-3 py-2 text-xs font-semibold text-[#648672] sm:self-auto">
                  <Clock className="h-4 w-4" />
                  Pico 17:00 h
                </span>
              </div>
              <HourlyChart data={scaledHours} />
            </article>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
