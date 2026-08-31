"use client";

import Link from "next/link";
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
  ArrowDownToLine,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Info,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  reservationHistory,
  type ReservationHistoryRecord,
  type ReservationPaymentStatus,
  type ReservationReportStatus,
} from "@/lib/mock-reservation-report-data";
import { ReportsHeader } from "./ReportsHeader";

export type ReservationReportView = "general" | "history" | "performance";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("es-MX");
const periodLabels: Record<string, string> = {
  "last-7": "23 ago – 29 ago 2026",
  "last-30": "31 jul – 29 ago 2026",
  "this-month": "1 ago – 29 ago 2026",
  "last-month": "1 jul – 30 jul 2026",
};
const previousPeriodLabels: Record<string, string> = {
  "last-7": "16 ago – 22 ago 2026",
  "last-30": "1 jul – 30 jul 2026",
  "this-month": "2 jul – 30 jul 2026",
  "last-month": "1 jun – 30 jun 2026",
};
const historyStatusLabels: Record<ReservationReportStatus, string> = {
  reserved: "Reservada",
  confirmed: "Confirmada",
  attended: "Asistió",
  "no-show": "No asistió",
  canceled: "Cancelada",
  pending: "Pendiente",
};
const paymentLabels: Record<ReservationPaymentStatus, string> = {
  paid: "Pagada",
  pending: "Pendiente",
  unpaid: "No pagada",
};

const hourLabels = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];
const hourSeries = [
  {
    label: "Lunes",
    color: "#648672",
    values: [0, 20, 10, 14, 13, 11, 14, 10, 19, 15, 0, 0],
  },
  {
    label: "Martes",
    color: "#c05e60",
    values: [0, 19, 21, 16, 17, 15, 14, 18, 21, 13, 1, 0],
  },
  {
    label: "Miércoles",
    color: "#d7a247",
    values: [0, 21, 21, 24, 17, 14, 13, 20, 15, 10, 0, 0],
  },
  {
    label: "Jueves",
    color: "#b97d89",
    values: [0, 19, 20, 23, 18, 16, 23, 20, 20, 21, 0, 0],
  },
  {
    label: "Viernes",
    color: "#5e86bd",
    values: [0, 28, 27, 33, 34, 23, 22, 31, 30, 26, 11, 0],
  },
  {
    label: "Sábado",
    color: "#9a78c6",
    values: [0, 38, 35, 33, 32, 33, 40, 43, 35, 31, 23, 0],
  },
  {
    label: "Domingo",
    color: "#42a8b4",
    values: [0, 26, 23, 21, 30, 30, 30, 27, 25, 18, 8, 0],
  },
];
const evolutionSeries = [
  {
    label: "Reservas",
    color: "#466a76",
    values: [
      42, 48, 35, 51, 39, 58, 44, 62, 37, 47, 53, 68, 45, 57, 64, 49, 72, 56,
    ],
  },
  {
    label: "Ingresos estimados",
    color: "#648672",
    values: [
      27, 19, 31, 24, 37, 22, 30, 43, 34, 26, 40, 29, 45, 34, 23, 48, 30, 39,
    ],
  },
];
const statusBreakdown = [
  { label: "Asistió", value: 181, color: "#9a78c6" },
  { label: "Pendiente", value: 46, color: "#d88387" },
  { label: "No asistió", value: 31, color: "#e7a78f" },
  { label: "Confirmada", value: 18, color: "#e6b958" },
  { label: "Cancelada", value: 4, color: "#d99aa0" },
  { label: "En espera", value: 1, color: "#98bd71" },
];
const serviceLeaders = [
  {
    name: "Membresía 7 sesiones Celestial Renewal System",
    value: 232,
    share: "15.69%",
    change: 0.4,
  },
  {
    name: "Membresía 14 sesiones Celestial Renewal System",
    value: 210,
    share: "14.2%",
    change: 21.4,
  },
  { name: "Facial de cortesía", value: 174, share: "11.76%", change: 62.6 },
];
const professionalLeaders = [
  { name: "Masaryk Cab Doble", value: 286, share: "19.34%", change: 15.8 },
  { name: "Mitikah VIP C-Doble", value: 266, share: "17.99%", change: 28.5 },
  { name: "Masaryk", value: 197, share: "13.32%", change: 23.9 },
];
const activeClients = [
  { name: "Ruth Masías / Abel", reservations: 12 },
  { name: "Thelma Grappin / Keysar", reservations: 11 },
  { name: "María de Lourdes Rico", reservations: 10 },
];
const performanceRows = [
  {
    name: "Masaryk Cab Doble",
    reservations: 286,
    reservationChange: 15.8,
    occupancy: 65.4,
    revenue: 381093,
    revenueChange: -35.1,
    commission: 6200,
    newClients: 81,
    newChange: -1,
    recurring: 81,
    recurringChange: 21,
  },
  {
    name: "Mitikah VIP C-Doble",
    reservations: 266,
    reservationChange: 28.5,
    occupancy: 67.8,
    revenue: 548015,
    revenueChange: -21,
    commission: 5750,
    newClients: 72,
    newChange: 6,
    recurring: 80,
    recurringChange: 19,
  },
  {
    name: "Masaryk",
    reservations: 197,
    reservationChange: 23.9,
    occupancy: 36.6,
    revenue: 464941,
    revenueChange: 43.5,
    commission: 4675,
    newClients: 66,
    newChange: 5,
    recurring: 89,
    recurringChange: 18,
  },
  {
    name: "Opatra Cabina 1",
    reservations: 194,
    reservationChange: 6,
    occupancy: 51.3,
    revenue: 367025,
    revenueChange: -50.5,
    commission: 4850,
    newClients: 47,
    newChange: 2,
    recurring: 106,
    recurringChange: 1,
  },
  {
    name: "Mitikah VIP B-Doble",
    reservations: 189,
    reservationChange: 20.4,
    occupancy: 52.9,
    revenue: 274468,
    revenueChange: -33.7,
    commission: 3910,
    newClients: 56,
    newChange: 12,
    recurring: 49,
    recurringChange: -4,
  },
  {
    name: "Opatra Cabina 2",
    reservations: 183,
    reservationChange: -6.6,
    occupancy: 49.3,
    revenue: 510360,
    revenueChange: 9.5,
    commission: 4525,
    newClients: 43,
    newChange: -13,
    recurring: 97,
    recurringChange: 3,
  },
  {
    name: "Mitikah VIP Individual",
    reservations: 177,
    reservationChange: 19.6,
    occupancy: 37.8,
    revenue: 367517,
    revenueChange: -30.7,
    commission: 4150,
    newClients: 82,
    newChange: 16,
    recurring: 62,
    recurringChange: 6,
  },
];

function ReportTabs({ view }: { view: ReservationReportView }) {
  const tabs: Array<{
    href: string;
    label: string;
    value: ReservationReportView;
  }> = [
    { href: "/reportes/reservas", label: "General", value: "general" },
    {
      href: "/reportes/reservas/historial",
      label: "Historial",
      value: "history",
    },
    {
      href: "/reportes/reservas/rendimiento",
      label: "Rendimiento",
      value: "performance",
    },
  ];
  return (
    <nav
      aria-label="Secciones del reporte"
      className="flex gap-2 border-b border-[#d8c5b5]"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          aria-current={view === tab.value ? "page" : undefined}
          className={
            view === tab.value
              ? "reservation-tab reservation-tab-active"
              : "reservation-tab"
          }
          href={tab.href}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function PeriodFilters({
  compare = true,
  performance = false,
  period,
  setPeriod,
  showExport = false,
}: {
  compare?: boolean;
  performance?: boolean;
  period: string;
  setPeriod: (value: string) => void;
  showExport?: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <section className="reservation-control-panel">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:flex">
          <label className="block min-w-0 xl:w-64">
            <span className="reservation-control-label">Periodo</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="reservation-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7">Últimos 7 días</SelectItem>
                <SelectItem value="last-30">Últimos 30 días</SelectItem>
                <SelectItem value="this-month">Este mes</SelectItem>
                <SelectItem value="last-month">Mes anterior</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {compare ? (
            <label className="block min-w-0 xl:w-60">
              <span className="reservation-control-label">Comparar con</span>
              <Select defaultValue="previous">
                <SelectTrigger className="reservation-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous">Periodo anterior</SelectItem>
                  <SelectItem value="last-year">
                    Mismo periodo del año anterior
                  </SelectItem>
                  <SelectItem value="none">Sin comparación</SelectItem>
                </SelectContent>
              </Select>
            </label>
          ) : null}
          {performance ? (
            <label className="block min-w-0 xl:w-60">
              <span className="reservation-control-label">Ver por</span>
              <Select defaultValue="professionals">
                <SelectTrigger className="reservation-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professionals">Especialistas</SelectItem>
                  <SelectItem value="locations">Locales</SelectItem>
                  <SelectItem value="services">Servicios</SelectItem>
                </SelectContent>
              </Select>
            </label>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="reservation-outline-button"
            onClick={() => setFiltersOpen((value) => !value)}
            type="button"
            variant="outline"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Más filtros
            <ChevronDown
              className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </Button>
          {showExport ? (
            <Button
              className="reservation-outline-button"
              onClick={() =>
                toast.success("Reporte preparado", {
                  description:
                    "La exportación está lista para conectarse con los datos reales.",
                })
              }
              type="button"
              variant="outline"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Exportar
            </Button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <CalendarDays className="h-3.5 w-3.5 text-[#ad8b67]" />
        Mostrando{" "}
        <strong className="font-semibold text-[#263649]">
          {periodLabels[period]}
        </strong>
        {compare ? (
          <span>· comparado con {previousPeriodLabels[period]}</span>
        ) : null}
      </p>
      {filtersOpen ? <ExtraFilters /> : null}
    </section>
  );
}

function ExtraFilters() {
  return (
    <div className="mt-4 grid gap-3 border-t border-[#ebe2da] pt-4 sm:grid-cols-2 lg:grid-cols-3">
      <FilterSelect
        label="Local"
        options={[
          "Todos los locales",
          "OPATRA Masaryk",
          "Keysar Mitikah",
          "Keysar Polanco",
        ]}
      />
      <FilterSelect
        label="Especialista"
        options={[
          "Todos los especialistas",
          "Masaryk Cab Doble",
          "Mitikah VIP",
          "Opatra Cabina 1",
        ]}
      />
      <FilterSelect
        label="Origen"
        options={[
          "Todos los orígenes",
          "Agenda",
          "Marketplace",
          "Reservas online",
        ]}
      />
    </div>
  );
}
function FilterSelect({
  label,
  options,
}: {
  label: string;
  options: [string, ...string[]];
}) {
  return (
    <label className="block">
      <span className="reservation-control-label">{label}</span>
      <Select defaultValue={options[0]}>
        <SelectTrigger className="reservation-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function MetricCard({
  label,
  value,
  previous,
  change,
  good = true,
  icon,
}: {
  label: string;
  value: string;
  previous: string;
  change: string;
  good?: boolean;
  icon: ReactNode;
}) {
  return (
    <article className="reservation-kpi-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#263649]">{label}</p>
          <p className="number-display mt-4 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-[#263649]">
            {value}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f0eb] text-[#ad8b67]">
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-400">Anterior: {previous}</span>
        <span
          className={good ? "reservation-trend-up" : "reservation-trend-down"}
        >
          {good ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {change}
        </span>
      </div>
    </article>
  );
}

function LineChart({
  labels,
  max,
  series,
}: {
  labels: string[];
  max: number;
  series: Array<{ label: string; color: string; values: number[] }>;
}) {
  const width = 920,
    height = 290,
    left = 18,
    top = 14,
    bottom = 22,
    usableWidth = width - left * 2,
    usableHeight = height - top - bottom;
  const pointsFor = (values: number[]) =>
    values
      .map(
        (value, index) =>
          `${left + (index / Math.max(values.length - 1, 1)) * usableWidth},${top + usableHeight - (value / max) * usableHeight}`,
      )
      .join(" ");
  return (
    <div className="mt-5 min-w-[38rem]">
      <svg
        aria-label="Gráfica de evolución"
        className="h-auto w-full"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 1, 2, 3, 4].map((line) => {
          const y = top + (line / 4) * usableHeight;
          return (
            <line
              key={line}
              stroke="#e9e2dc"
              strokeDasharray="3 5"
              x1={left}
              x2={width - left}
              y1={y}
              y2={y}
            />
          );
        })}
        {labels.map((label, index) => {
          const x =
            left + (index / Math.max(labels.length - 1, 1)) * usableWidth;
          return (
            <g key={label}>
              <line
                stroke="#f0ebe6"
                strokeDasharray="3 5"
                x1={x}
                x2={x}
                y1={top}
                y2={height - bottom}
              />
              <text
                fill="#8a95a2"
                fontSize="10"
                textAnchor="middle"
                x={x}
                y={height - 2}
              >
                {label}
              </text>
            </g>
          );
        })}
        {series.map((item) => (
          <polyline
            key={item.label}
            fill="none"
            points={pointsFor(item.values)}
            stroke={item.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
        {series.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DonutChart() {
  const total = statusBreakdown.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const gradient = statusBreakdown
    .map((item) => {
      const start = cursor;
      cursor += (item.value / total) * 100;
      return `${item.color} ${start}% ${cursor}%`;
    })
    .join(", ");
  return (
    <div className="mt-6 flex flex-col items-center">
      <div
        className="flex h-56 w-56 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-[0_8px_25px_rgba(38,54,73,0.08)]">
          <strong className="number-display text-2xl text-[#263649]">
            {total}
          </strong>
          <span className="text-[0.65rem] uppercase tracking-[0.13em] text-slate-400">
            reservas
          </span>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {statusBreakdown.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RankingCard({
  title,
  items,
}: {
  title: string;
  items: typeof serviceLeaders;
}) {
  const max = Math.max(...items.map((item) => item.value));
  return (
    <article className="reservation-report-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#263649]">{title}</h2>
        <button
          className="text-xs font-semibold text-[#8c6d52] underline underline-offset-4"
          type="button"
        >
          Ver todos
        </button>
      </div>
      <div className="mt-5 space-y-5">
        {items.map((item) => (
          <div key={item.name}>
            <div className="flex items-end justify-between gap-3 text-xs">
              <span className="font-medium leading-5 text-[#263649]">
                {item.name}
              </span>
              <span className="shrink-0 text-slate-400">
                ({item.share}){" "}
                <strong className="number-display text-sm text-[#263649]">
                  {item.value}
                </strong>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ece9e6]">
              <div
                className="h-full rounded-full bg-[#648672]"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[0.68rem] font-semibold text-[#4f9f79]">
              <ArrowUpRight className="h-3 w-3" />+{item.change}%
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function GeneralReport({
  period,
  setPeriod,
}: {
  period: string;
  setPeriod: (value: string) => void;
}) {
  const factor =
    period === "last-7" ? 0.27 : period === "last-month" ? 0.91 : 1;
  return (
    <>
      <PeriodFilters period={period} setPeriod={setPeriod} />
      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <MetricCard
          change="14.1%"
          icon={<CalendarDays className="h-5 w-5" />}
          label="Reservas totales"
          previous={numberFormatter.format(Math.round(1296 * factor))}
          value={numberFormatter.format(Math.round(1479 * factor))}
        />
        <MetricCard
          change="6.3%"
          icon={<UsersRound className="h-5 w-5" />}
          label="Ocupación"
          previous="32.61%"
          value="38.91%"
        />
        <MetricCard
          change="1.6%"
          icon={<Info className="h-5 w-5" />}
          label="Tasa de inasistencias"
          previous="12.83%"
          value="11.19%"
        />
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,0.9fr)]">
        <article className="reservation-report-card overflow-hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#263649]">
              Reservas por hora
            </h2>
            <Info className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <LineChart labels={hourLabels} max={50} series={hourSeries} />
          </div>
        </article>
        <article className="reservation-report-card">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#263649]">
              Origen de las reservas
            </h2>
            <Info className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-7 flex h-[245px] items-end justify-center gap-8 border-b border-l border-[#dcd5cf] px-6">
            <div className="flex h-full flex-col items-center justify-end gap-2">
              <span className="number-display text-xs text-slate-400">
                1,008
              </span>
              <div
                className="w-14 rounded-t-lg bg-[#c3a583]"
                style={{ height: "66%" }}
              />
              <span className="pb-3 text-xs text-slate-500">Anterior</span>
            </div>
            <div className="flex h-full flex-col items-center justify-end gap-2">
              <span className="number-display text-xs text-slate-400">
                1,198
              </span>
              <div
                className="w-14 rounded-t-lg bg-[#648672]"
                style={{ height: "79%" }}
              />
              <span className="pb-3 text-xs text-slate-500">Agenda</span>
            </div>
          </div>
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f4efe9] px-3 py-2.5 text-xs font-semibold text-[#8c6d52]"
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            Potencia tus reservas online
          </button>
        </article>
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,2fr)]">
        <article className="reservation-report-card">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#263649]">
              Reservas por estado
            </h2>
            <Info className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <DonutChart />
        </article>
        <article className="reservation-report-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#263649]">
                Evolución de reservas e ingresos
              </h2>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500">
              Recaudación estimada:{" "}
              <strong className="number-display text-[#648672]">
                {currencyFormatter.format(2883218)}
              </strong>
            </p>
          </div>
          <div className="overflow-x-auto">
            <LineChart
              labels={[
                "31 jul",
                "4 ago",
                "8 ago",
                "12 ago",
                "16 ago",
                "20 ago",
                "24 ago",
                "29 ago",
              ]}
              max={80}
              series={evolutionSeries}
            />
          </div>
        </article>
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <RankingCard items={serviceLeaders} title="Top 3 servicios" />
        <RankingCard items={professionalLeaders} title="Top 3 especialistas" />
        <article className="reservation-report-card">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#263649]">
              Clientes más activos
            </h2>
            <Info className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-4 divide-y divide-[#ebe3dc]">
            {activeClients.map((client) => (
              <div
                key={client.name}
                className="flex items-center justify-between gap-3 py-3 text-xs"
              >
                <span className="font-medium text-[#263649] underline decoration-[#cbb49e] underline-offset-4">
                  {client.name}
                </span>
                <span>
                  <strong className="number-display text-base text-[#263649]">
                    {client.reservations}
                  </strong>{" "}
                  <span className="text-slate-400">reservas</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#e9e1da] p-3">
              <p className="text-xs text-slate-500">Clientes nuevos</p>
              <p className="number-display mt-1 text-xl font-semibold text-[#263649]">
                420
              </p>
              <span className="reservation-trend-up">
                <ArrowUpRight className="h-3 w-3" />
                2.2%
              </span>
            </div>
            <div className="rounded-xl border border-[#e9e1da] p-3">
              <p className="text-xs text-slate-500">Recurrentes</p>
              <p className="number-display mt-1 text-xl font-semibold text-[#263649]">
                475
              </p>
              <span className="reservation-trend-up">
                <ArrowUpRight className="h-3 w-3" />
                11.0%
              </span>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

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
function HistoryReport({
  period,
  setPeriod,
}: {
  period: string;
  setPeriod: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const records = useMemo(
    () =>
      reservationHistory.filter((record) =>
        [record.client, record.service, record.provider, record.branch].some(
          (value) => value.toLowerCase().includes(query.toLowerCase()),
        ),
      ),
    [query],
  );
  return (
    <>
      <PeriodFilters
        compare={false}
        period={period}
        setPeriod={setPeriod}
        showExport
      />
      <section className="reservation-table-card mt-4">
        <div className="flex flex-col gap-4 border-b border-[#e7dfd8] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-xl border border-[#e2d8cf] bg-white pl-10 pr-4 text-sm text-[#263649] outline-none transition focus:border-[#ad8b67] focus:ring-2 focus:ring-[#c3a583]/20"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente, servicio o especialista..."
              value={query}
            />
          </label>
          <button
            className="flex items-center gap-2 self-end text-xs font-semibold text-[#735b47] underline underline-offset-4"
            onClick={() =>
              toast.info("Selector de columnas", {
                description:
                  "La configuración quedará disponible al conectar el reporte.",
              })
            }
            type="button"
          >
            <Settings2 className="h-4 w-4" />
            Editar columnas
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="reservation-data-table min-w-[78rem]">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Especialista</th>
                <th>Local</th>
                <th>Estado de la reserva</th>
                <th>Estado de pago</th>
                <th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 12).map((record) => (
                <HistoryRow key={record.id} record={record} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7dfd8] px-5 py-4 text-xs text-slate-500">
          <span>
            Mostrando {Math.min(12, records.length)} de {records.length}{" "}
            reservas
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-[#e2d8cf] px-3 py-2 disabled:opacity-40"
              disabled
              type="button"
            >
              Anterior
            </button>
            <button
              className="rounded-lg border border-[#e2d8cf] px-3 py-2"
              type="button"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
function HistoryRow({ record }: { record: ReservationHistoryRecord }) {
  return (
    <tr>
      <td className="number-display whitespace-nowrap font-medium text-[#263649]">
        {formatHistoryDate(record.performedAt)}
      </td>
      <td className="font-medium text-[#263649]">{record.client}</td>
      <td>{record.service}</td>
      <td>{record.provider}</td>
      <td>{record.branch}</td>
      <td>
        <span
          className={`reservation-history-badge reservation-history-badge-${record.status}`}
        >
          {historyStatusLabels[record.status]}
        </span>
      </td>
      <td>
        <span
          className={`reservation-payment-badge reservation-payment-badge-${record.paymentStatus}`}
        >
          {paymentLabels[record.paymentStatus]}
        </span>
      </td>
      <td className="number-display whitespace-nowrap text-right font-medium text-[#263649]">
        {record.amount ? currencyFormatter.format(record.amount) : "—"}
      </td>
    </tr>
  );
}
function TrendValue({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  return (
    <span
      className={
        value >= 0 ? "reservation-inline-up" : "reservation-inline-down"
      }
    >
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}
function PerformanceReport({
  period,
  setPeriod,
}: {
  period: string;
  setPeriod: (value: string) => void;
}) {
  return (
    <>
      <PeriodFilters
        performance
        period={period}
        setPeriod={setPeriod}
        showExport
      />
      <section className="reservation-table-card mt-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#e7dfd8] px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-[#263649]">
              Rendimiento por especialista
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Comparativo de productividad, ocupación e ingresos estimados.
            </p>
          </div>
          <CircleDollarSign className="h-5 w-5 text-[#ad8b67]" />
        </div>
        <div className="overflow-x-auto">
          <table className="reservation-data-table min-w-[88rem]">
            <thead>
              <tr>
                <th>Especialista</th>
                <th>Reservas</th>
                <th>
                  Ocupación <Info className="inline h-3.5 w-3.5" />
                </th>
                <th>Recaudación estimada</th>
                <th>Comisión estimada</th>
                <th>Clientes nuevos</th>
                <th>Clientes recurrentes</th>
              </tr>
            </thead>
            <tbody>
              {performanceRows.map((row) => (
                <tr key={row.name}>
                  <td className="max-w-56 font-medium uppercase text-[#263649]">
                    {row.name}
                  </td>
                  <td>
                    <span className="number-display font-medium text-[#263649]">
                      {row.reservations}
                    </span>{" "}
                    <TrendValue suffix="%" value={row.reservationChange} />
                  </td>
                  <td className="number-display font-medium text-[#263649]">
                    {row.occupancy}%
                  </td>
                  <td>
                    <span className="number-display font-medium text-[#263649]">
                      {currencyFormatter.format(row.revenue)}
                    </span>{" "}
                    <TrendValue suffix="%" value={row.revenueChange} />
                  </td>
                  <td className="number-display font-medium text-[#263649]">
                    {currencyFormatter.format(row.commission)}
                  </td>
                  <td>
                    <span className="number-display font-medium text-[#263649]">
                      {row.newClients}
                    </span>{" "}
                    <TrendValue value={row.newChange} />
                  </td>
                  <td>
                    <span className="number-display font-medium text-[#263649]">
                      {row.recurring}
                    </span>{" "}
                    <TrendValue value={row.recurringChange} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function ReservationReportWorkspace({
  view = "general",
}: {
  view?: ReservationReportView;
}) {
  const [period, setPeriod] = useState("last-30");
  return (
    <div className="report-workspace min-h-screen bg-[#f4f1ed] text-[#263649]">
      <ReportsHeader active="reservations" />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps">Reportes / Reservas</p>
            <h1 className="page-title mt-2 text-[clamp(2rem,4vw,3.2rem)] text-[#263649]">
              Reporte de reservas
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Consulta el comportamiento de tu agenda, el historial de citas y
              el rendimiento de tu equipo.
            </p>
          </div>
          <button
            className="self-start text-xs font-semibold text-[#8c6d52] underline underline-offset-4 sm:self-end"
            onClick={() =>
              toast.info("Guía de reportes", {
                description: "La guía se habilitará con la integración final.",
              })
            }
            type="button"
          >
            Ver guía de esta sección
          </button>
        </div>
        <ReportTabs view={view} />
        <div>
          {view === "history" ? (
            <HistoryReport period={period} setPeriod={setPeriod} />
          ) : view === "performance" ? (
            <PerformanceReport period={period} setPeriod={setPeriod} />
          ) : (
            <GeneralReport period={period} setPeriod={setPeriod} />
          )}
        </div>
      </main>
    </div>
  );
}
