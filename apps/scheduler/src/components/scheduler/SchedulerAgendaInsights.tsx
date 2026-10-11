"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  Pin,
  PinOff,
  UsersRound,
} from "lucide-react";
import type {
  Booking,
  BookingStatusColors,
  Professional,
} from "@/lib/scheduler-presentation";
import { formatMoney } from "./scheduler-utils";

interface SchedulerAgendaInsightsProps {
  availableMinutes: number;
  bookings: Booking[];
  date: Date;
  loading?: boolean;
  onDateChange: (date: Date) => void;
  onPinnedChange: (pinned: boolean) => void;
  pinned: boolean;
  professionals: Professional[];
  statusColors: BookingStatusColors;
}

function timeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function changeLocalDate(value: Date, amount: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function occupancyPercent(
  bookings: Booking[],
  professionalIds: Set<string>,
  capacity: number,
  availableMinutes: number,
): number {
  if (!capacity || !availableMinutes) return 0;
  const occupiedMinutes = bookings.reduce((total, booking) => {
    if (!professionalIds.has(booking.professionalId)) return total;
    return total + Math.max(0, timeToMinutes(booking.end) - timeToMinutes(booking.start));
  }, 0);
  return Math.min(100, Math.round((occupiedMinutes / (capacity * availableMinutes)) * 100));
}

export function SchedulerAgendaInsights({
  availableMinutes,
  bookings,
  date,
  loading = false,
  onDateChange,
  onPinnedChange,
  pinned,
  professionals,
  statusColors,
}: SchedulerAgendaInsightsProps) {
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;
  const activeBookings = useMemo(
    () => bookings.filter((booking) => booking.status !== "canceled" && booking.status !== "no-show"),
    [bookings],
  );
  const resources = useMemo(
    () => professionals.filter((professional) => professional.kind === "RESOURCE"),
    [professionals],
  );
  const occupancyGroups = useMemo(() => {
    const source = resources.length ? resources : professionals;
    const groups = [
      { id: "individual", label: "Cabinas individuales", match: (capacity: number) => capacity <= 1, color: "#45a866" },
      { id: "double", label: "Cabinas dobles", match: (capacity: number) => capacity === 2, color: "#b58c58" },
      { id: "triple", label: "Cabinas triples", match: (capacity: number) => capacity >= 3, color: "#50a7d8" },
    ];
    return groups.map((group) => {
      const columns = source.filter((professional) => group.match(Math.max(1, professional.capacity ?? 1)));
      const capacity = columns.reduce((total, professional) => total + Math.max(1, professional.capacity ?? 1), 0);
      return {
        ...group,
        capacity,
        percent: occupancyPercent(
          activeBookings,
          new Set(columns.map((professional) => professional.id)),
          capacity,
          availableMinutes,
        ),
      };
    });
  }, [activeBookings, availableMinutes, professionals, resources]);
  const totalCapacity = occupancyGroups.reduce((total, group) => total + group.capacity, 0);
  const totalPercent = occupancyPercent(
    activeBookings,
    new Set((resources.length ? resources : professionals).map((professional) => professional.id)),
    totalCapacity,
    availableMinutes,
  );
  const estimatedRevenue = activeBookings.reduce(
    (total, booking) => total + Number(booking.purchaseAmount ?? booking.totalPrice ?? 0),
    0,
  );
  const upcoming = useMemo(
    () => [...activeBookings].sort((left, right) => left.start.localeCompare(right.start)).slice(0, 6),
    [activeBookings],
  );
  const professionalsById = useMemo(
    () => new Map(professionals.map((professional) => [professional.id, professional])),
    [professionals],
  );

  return (
    <aside
      aria-label="Ocupación y próximas citas"
      className={
        pinned
          ? "relative z-30 hidden h-full w-[360px] shrink-0 overflow-hidden border-l border-slate-200/80 bg-white xl:flex"
          : `absolute inset-y-0 right-0 z-40 hidden w-[360px] transition-transform duration-300 ease-out xl:flex ${expanded ? "translate-x-0" : "translate-x-[318px]"}`
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        aria-expanded={expanded}
        aria-label={expanded ? "Ocultar resumen operativo" : "Mostrar resumen operativo"}
        className="flex w-[42px] shrink-0 flex-col items-center justify-center gap-3 border-l border-y border-slate-200 bg-[#172230] text-white shadow-[-10px_0_30px_rgba(15,23,42,0.14)]"
        onClick={() => setHovered((current) => !current)}
        type="button"
      >
        <BarChart3 className="h-4 w-4" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-[0.18em]">
          Resumen
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto border-l border-slate-200 bg-[linear-gradient(180deg,#fff_0%,#fbfaf8_100%)] shadow-[-18px_0_50px_rgba(15,23,42,0.12)]">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a27e55]">Resumen operativo</p>
              <p className="mt-0.5 text-sm font-semibold capitalize text-slate-800">
                {format(date, "EEEE, d 'de' MMMM", { locale: es })}
              </p>
            </div>
            <button
              aria-label={pinned ? "Desfijar panel" : "Fijar panel"}
              aria-pressed={pinned}
              className={
                pinned
                  ? "flex h-8 w-8 items-center justify-center rounded-full bg-[#172230] text-white"
                  : "flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-[#b58c58] hover:text-[#8b663f]"
              }
              onClick={() => onPinnedChange(!pinned)}
              title={pinned ? "Desfijar panel" : "Fijar panel abierto"}
              type="button"
            >
              {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-[36px_1fr_36px] items-center gap-2">
            <button
              aria-label="Ver ocupación del día anterior"
              className="flex h-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-[#b58c58] hover:text-[#8b663f]"
              onClick={() => onDateChange(changeLocalDate(date, -1))}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="rounded-xl bg-[#f5efe7] px-3 py-2 text-center text-xs font-medium text-slate-600">
              Fecha del panel
            </div>
            <button
              aria-label="Ver ocupación del día siguiente"
              className="flex h-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-[#b58c58] hover:text-[#8b663f]"
              onClick={() => onDateChange(changeLocalDate(date, 1))}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-4">
          <section aria-labelledby="agenda-occupancy-title">
            <div className="flex items-center justify-between">
              <h2 id="agenda-occupancy-title" className="text-base font-semibold text-slate-800">Ocupación</h2>
              {loading ? <span className="text-[10px] text-slate-400">Actualizando…</span> : null}
            </div>
            <div className="mt-3 grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3">
              <div
                aria-label={`${totalPercent}% de ocupación`}
                className="grid h-[88px] w-[88px] place-items-center rounded-full"
                style={{ background: `conic-gradient(#45a866 ${totalPercent}%, #e9eee9 0)` }}
              >
                <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-xl font-semibold text-slate-800">
                  {totalPercent}%
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                {occupancyGroups.map((group) => (
                  <div className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-2 text-[11px]" key={group.id}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="min-w-0 leading-tight text-slate-500">{group.label}</span>
                    <strong className="text-slate-700">{group.capacity ? `${group.percent}%` : "—"}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-3 text-center">
              <div className="min-w-0 px-1">
                <UsersRound className="mx-auto h-3.5 w-3.5 text-slate-400" />
                <strong className="mt-1 block truncate text-sm text-slate-800">{activeBookings.length}</strong>
                <span className="text-[9px] uppercase tracking-wide text-slate-400">Citas</span>
              </div>
              <div className="min-w-0 px-1">
                <DollarSign className="mx-auto h-3.5 w-3.5 text-slate-400" />
                <strong className="mt-1 block truncate text-[clamp(0.65rem,1vw,0.875rem)] text-slate-800" title={formatMoney(estimatedRevenue)}>{formatMoney(estimatedRevenue)}</strong>
                <span className="text-[9px] uppercase tracking-wide text-slate-400">Ingresos</span>
              </div>
              <div className="min-w-0 px-1">
                <BarChart3 className="mx-auto h-3.5 w-3.5 text-slate-400" />
                <strong className="mt-1 block truncate text-sm text-slate-800">{totalCapacity}</strong>
                <span className="text-[9px] uppercase tracking-wide text-slate-400">Capacidad</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="agenda-upcoming-title">
            <div className="flex items-center justify-between">
              <h2 id="agenda-upcoming-title" className="text-base font-semibold text-slate-800">Próximas citas</h2>
              <Clock3 className="h-4 w-4 text-[#b58c58]" />
            </div>
            <div className="mt-3 space-y-2">
              {upcoming.length ? upcoming.map((booking) => {
                const professional = professionalsById.get(booking.professionalId);
                return (
                  <div className="grid grid-cols-[42px_8px_1fr] items-start gap-2 rounded-xl px-1 py-2 transition hover:bg-[#f7f2ec]" key={booking.id}>
                    <span className="pt-0.5 text-xs font-semibold text-slate-700">{booking.start}</span>
                    <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: statusColors[booking.status] }} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">{booking.customerName}</p>
                      <p className="truncate text-[10px] text-slate-500">{booking.serviceName}</p>
                      <p className="mt-0.5 truncate text-[9px] uppercase tracking-wide text-slate-400">{professional?.name ?? "Sin recurso"}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-7 text-center text-xs text-slate-400">
                  No hay citas activas para este día.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
