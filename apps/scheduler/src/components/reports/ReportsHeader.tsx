"use client";

import Link from "next/link";
import { Search, Settings } from "lucide-react";
import {
  AdministrationNavMenu,
  ReportsNavMenu,
  SchedulerPrimaryNav,
  type SchedulerReportPage,
} from "@/components/SchedulerPrimaryNav";

export type ReportsPage = SchedulerReportPage;

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

          <SchedulerPrimaryNav activeArea="reports" activeReport={active} />

        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="xl:hidden">
            <div className="flex items-center gap-2">
              <ReportsNavMenu active={active} compact />
              <AdministrationNavMenu compact />
            </div>
          </div>
          <button
            type="button"
            className="scheduler-header-button hidden xl:flex"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-50 xl:block">
            Reservas online
          </div>
          <button
            type="button"
            className="scheduler-header-button hidden xl:flex"
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
