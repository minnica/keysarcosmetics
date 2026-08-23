"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@cosmetics/ui";
import {
  BarChart3,
  Check,
  ChevronDown,
  FileText,
  Globe2,
  MessageCircle,
  Palette,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  canAccessSchedulerScreen,
  type SchedulerScreenId,
} from "@/lib/scheduler-access";

export type SchedulerNavArea = "agenda" | "reports" | "administration" | "settings";
export type SchedulerReportPage = "summary" | "reservations" | "sales";
export type AdministrationSectionId =
  | "locals"
  | "professionals"
  | "services"
  | "commissions"
  | "resources"
  | "surveys"
  | "consents"
  | "whatsapp"
  | "gift-cards"
  | "status-colors";

const administrationGroups: Array<{
  label: string;
  items: Array<{
    id: AdministrationSectionId;
    label: string;
    icon: ReactNode;
  }>;
}> = [
  {
    label: "Información básica",
    items: [
      { id: "locals", label: "Comercios", icon: <Globe2 className="h-4 w-4" /> },
      { id: "professionals", label: "Profesionales", icon: <UsersRound className="h-4 w-4" /> },
      { id: "services", label: "Servicios", icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    label: "Opciones avanzadas",
    items: [
      { id: "commissions", label: "Comisiones", icon: <WalletCards className="h-4 w-4" /> },
      { id: "resources", label: "Recursos", icon: <SlidersHorizontal className="h-4 w-4" /> },
      { id: "surveys", label: "Encuestas", icon: <FileText className="h-4 w-4" /> },
      { id: "consents", label: "Consentimientos", icon: <Check className="h-4 w-4" /> },
      { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> },
      { id: "gift-cards", label: "Gift cards", icon: <WalletCards className="h-4 w-4" /> },
      { id: "status-colors", label: "Colores de status", icon: <Palette className="h-4 w-4" /> },
    ],
  },
];

function getAdministrationScreenId(
  section: AdministrationSectionId,
): SchedulerScreenId {
  return `administration.${section}`;
}

function triggerClass(active: boolean, compact: boolean) {
  if (compact) return "scheduler-header-button";
  return active ? "report-nav-active" : "report-nav-link inline-flex items-center gap-1.5";
}

export function ReportsNavMenu({
  active,
  compact = false,
}: {
  active?: SchedulerReportPage | undefined;
  compact?: boolean;
}) {
  const canViewSummary = canAccessSchedulerScreen("reports.summary");
  const canViewReservations = canAccessSchedulerScreen("reports.reservations");
  const canViewSales = canAccessSchedulerScreen("reports.sales");

  if (!canViewSummary && !canViewReservations && !canViewSales) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Abrir menú de reportes"
          className={triggerClass(Boolean(active), compact)}
          type="button"
        >
          {compact ? <BarChart3 className="h-5 w-5" /> : <span>Reportes</span>}
          <ChevronDown className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className="w-64 overflow-hidden rounded-[20px] border-white/10 bg-[#1c2835] p-2 text-white shadow-[0_24px_70px_rgba(7,12,20,0.36)]"
      >
        {canViewSummary ? (
          <Link
            className={active === "summary" ? "scheduler-nav-menu-item-active" : "scheduler-nav-menu-item"}
            href="/reportes"
          >
            <span>Resumen</span>
            {active === "summary" ? <span className="h-2 w-2 rounded-full bg-[#c3a583]" /> : null}
          </Link>
        ) : null}
        {canViewReservations ? (
          <Link
            className={active === "reservations" ? "scheduler-nav-menu-item-active" : "scheduler-nav-menu-item"}
            href="/reportes/reservas"
          >
            <span>Reporte de reservas</span>
            {active === "reservations" ? <span className="h-2 w-2 rounded-full bg-[#c3a583]" /> : null}
          </Link>
        ) : null}
        {canViewSales ? (
          <button className="scheduler-nav-menu-item-disabled" disabled type="button">
            <span>Reporte de ventas</span>
            <span className="text-[0.58rem] uppercase tracking-[0.16em] text-white/30">Pronto</span>
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function AdministrationNavMenu({
  active,
  compact = false,
  onSelect,
}: {
  active?: AdministrationSectionId | undefined;
  compact?: boolean;
  onSelect?: ((section: AdministrationSectionId) => void) | undefined;
}) {
  const visibleGroups = administrationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canAccessSchedulerScreen(getAdministrationScreenId(item.id)),
      ),
    }))
    .filter((group) => group.items.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Abrir menú de administración"
          className={triggerClass(Boolean(active), compact)}
          type="button"
        >
          {compact ? <SlidersHorizontal className="h-5 w-5" /> : <span>Administración</span>}
          <ChevronDown className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className="w-[19rem] overflow-hidden rounded-[22px] border-white/10 bg-[#1c2835] p-2 text-white shadow-[0_24px_70px_rgba(7,12,20,0.36)]"
      >
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex > 0 ? "mt-2 border-t border-white/10 pt-2" : ""}>
            <p className="px-3 pb-1.5 pt-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/35">
              {group.label}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.id}
                className={active === item.id ? "scheduler-nav-menu-item-active" : "scheduler-nav-menu-item"}
                href={`/administracion?section=${item.id}`}
                onClick={() => onSelect?.(item.id)}
              >
                <span className="flex items-center gap-3">
                  <span className="text-[#c3a583]">{item.icon}</span>
                  {item.label}
                </span>
                {active === item.id ? <span className="h-2 w-2 rounded-full bg-[#c3a583]" /> : null}
              </Link>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function SchedulerPrimaryNav({
  activeArea,
  activeAdmin,
  activeReport,
  onAdministrationSelect,
}: {
  activeArea: SchedulerNavArea;
  activeAdmin?: AdministrationSectionId;
  activeReport?: SchedulerReportPage;
  onAdministrationSelect?: (section: AdministrationSectionId) => void;
}) {
  return (
    <nav className="hidden items-center gap-1 xl:flex">
      {canAccessSchedulerScreen("agenda") ? (
        <Link className={activeArea === "agenda" ? "report-nav-active" : "report-nav-link"} href="/">
          Agenda
        </Link>
      ) : null}
      {canAccessSchedulerScreen("clients") ? (
        <button className="report-nav-link" type="button">Clientes</button>
      ) : null}
      {canAccessSchedulerScreen("services") ? (
        <button className="report-nav-link" type="button">Servicios</button>
      ) : null}
      <ReportsNavMenu active={activeArea === "reports" ? activeReport : undefined} />
      <AdministrationNavMenu
        active={activeArea === "administration" ? activeAdmin : undefined}
        onSelect={onAdministrationSelect}
      />
    </nav>
  );
}
