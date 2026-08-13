"use client";

import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@cosmetics/ui";
import { ChevronDown, Search, Settings } from "lucide-react";

export type ReportsPage = "summary" | "reservations" | "sales";

function ReportMenuLink({
  active,
  children,
  href,
}: {
  active: boolean;
  children: string;
  href: string;
}) {
  return (
    <Link
      className={
        active
          ? "flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold"
          : "flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
      }
      href={href}
    >
      {children}
      {active ? <span className="h-2 w-2 rounded-full bg-[#c3a583]" /> : null}
    </Link>
  );
}

function ReportsMenu({ active }: { active: ReportsPage }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="report-nav-active"
          type="button"
          aria-label="Abrir menú de reportes"
        >
          Reportes
          <ChevronDown className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className="w-64 overflow-hidden rounded-[20px] border-white/10 bg-[#1c2835] p-2 text-white shadow-[0_24px_70px_rgba(7,12,20,0.36)]"
      >
        <ReportMenuLink active={active === "summary"} href="/reportes">
          Resumen
        </ReportMenuLink>
        <ReportMenuLink
          active={active === "reservations"}
          href="/reportes/reservas"
        >
          Reporte de reservas
        </ReportMenuLink>
        <button
          className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm text-white/45"
          disabled
          type="button"
        >
          Reporte de ventas
          <span className="text-[0.58rem] uppercase tracking-[0.16em] text-white/30">
            Pronto
          </span>
        </button>
        <div className="my-1 border-t border-white/10 xl:hidden" />
        <Link
          className="flex items-center rounded-2xl px-4 py-3 text-sm text-white/70 xl:hidden"
          href="/"
        >
          Ir a Agenda
        </Link>
        <Link
          className="flex items-center rounded-2xl px-4 py-3 text-sm text-white/70 xl:hidden"
          href="/administracion"
        >
          Ir a Administración
        </Link>
      </PopoverContent>
    </Popover>
  );
}

export function ReportsHeader({ active }: { active: ReportsPage }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(90deg,#172230_0%,#1d2937_100%)] text-white shadow-[0_18px_44px_rgba(8,14,24,0.2)]">
      <div className="flex min-h-[78px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            className="flex min-w-0 items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 px-3 py-2 sm:px-4"
            href="/"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(195,165,131,0.28),rgba(236,209,200,0.12))] ring-1 ring-white/10">
              <img
                alt="Keysar Cosmetics"
                className="h-7 w-7 object-contain"
                src="/logo.svg"
              />
            </span>
            <span className="hidden sm:block">
              <span className="admin-brand-title block">Keysar Scheduler</span>
              <span className="block text-[0.62rem] uppercase tracking-[0.28em] text-white/45">
                Agenda interna
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            <Link className="report-nav-link" href="/">
              Agenda
            </Link>
            <button className="report-nav-link" type="button">
              Clientes
            </button>
            <button className="report-nav-link" type="button">
              Servicios
            </button>
            <ReportsMenu active={active} />
            <Link className="report-nav-link" href="/administracion">
              Administración
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="xl:hidden">
            <ReportsMenu active={active} />
          </div>
          <button
            type="button"
            className="scheduler-header-button hidden sm:flex"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-50 lg:block">
            Reservas online
          </div>
          <button
            type="button"
            className="scheduler-header-button hidden sm:flex"
            aria-label="Configuración"
          >
            <Settings className="h-5 w-5" />
          </button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700">
            ER
          </div>
        </div>
      </div>
    </header>
  );
}
