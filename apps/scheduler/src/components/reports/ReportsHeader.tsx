"use client";

import { Search } from "lucide-react";
export type ReportsPage = "summary" | "reservations" | "sales";

export function ReportsHeader({
  active,
  userName = "Keysar",
}: {
  active: ReportsPage;
  userName?: string;
}) {
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es-MX"))
    .join("");
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(90deg,#172230_0%,#1d2937_100%)] text-white shadow-[0_18px_44px_rgba(8,14,24,0.2)]">
      <div className="flex min-h-[78px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <div>
            <p className="page-title text-[1.55rem] text-white">Reportes</p>
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/45">
              {active === "reservations"
                ? "Reservas"
                : active === "sales"
                  ? "Ventas y pagos"
                  : "Resumen"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="scheduler-header-button hidden xl:flex"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-50 xl:block">
            Datos canónicos
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700">
            {initials || "KC"}
          </div>
        </div>
      </div>
    </header>
  );
}
