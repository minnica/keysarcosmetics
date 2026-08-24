"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@cosmetics/ui";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  FileCheck2,
  Globe2,
  History,
  LogOut,
  Mail,
  MapPinned,
  MessageCircle,
  MessageSquareText,
  Palette,
  Send,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  canAccessSchedulerScreen,
  type SchedulerScreenId,
} from "@/lib/scheduler-access";
import type { AdministrationSectionId } from "@/components/SchedulerPrimaryNav";

const ADMIN_SECTION_CHANGE_EVENT = "scheduler-administration-section-change";
const SETTINGS_SECTION_CHANGE_EVENT = "scheduler-settings-section-change";

type SettingsSectionId =
  | "company"
  | "website"
  | "agenda"
  | "payments"
  | "reminders"
  | "records"
  | "emails"
  | "integrations"
  | "notifications"
  | "clients"
  | "surveys"
  | "authorizations";

type NavigationSection = "reports" | "administration" | "settings";

interface NavigationItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  screenId?: SchedulerScreenId;
  adminSection?: AdministrationSectionId;
  settingsSection?: SettingsSectionId;
  pending?: boolean;
}

const primaryItems: NavigationItem[] = [
  { label: "Agenda", href: "/", icon: CalendarDays, screenId: "agenda" },
  { label: "Clientes", icon: UserRound, screenId: "clients", pending: true },
  { label: "Servicios", icon: Sparkles, screenId: "services", pending: true },
];

const reportItems: NavigationItem[] = [
  { label: "Resumen", href: "/reportes", icon: BarChart3, screenId: "reports.summary" },
  {
    label: "Reservas · General",
    href: "/reportes/reservas",
    icon: CalendarDays,
    screenId: "reports.reservations",
  },
  { label: "Historial", href: "/reportes/reservas/historial", icon: History, screenId: "reports.reservations" },
  { label: "Métricas", href: "/reportes/reservas/metricas", icon: BarChart3, screenId: "reports.reservations" },
  { label: "Locales", href: "/reportes/reservas/locales", icon: MapPinned, screenId: "reports.reservations" },
  { label: "Servicios", href: "/reportes/reservas/servicios", icon: Sparkles, screenId: "reports.reservations" },
  { label: "Mensajería móvil", href: "/reportes/reservas/mensajeria-movil", icon: Send, screenId: "reports.reservations" },
  { label: "Servicios por local", href: "/reportes/reservas/servicios-por-local/opatra-mexico", icon: Building2, screenId: "reports.reservations" },
  { label: "Prestadores por local", href: "/reportes/reservas/prestadores-por-local/opatra-mexico", icon: UsersRound, screenId: "reports.reservations" },
  { label: "Ventas", icon: WalletCards, screenId: "reports.sales", pending: true },
];

const administrationItems: NavigationItem[] = [
  { label: "Comercios", icon: Globe2, adminSection: "locals", screenId: "administration.locals" },
  {
    label: "Profesionales",
    icon: UsersRound,
    adminSection: "professionals",
    screenId: "administration.professionals",
  },
  { label: "Servicios", icon: Sparkles, adminSection: "services", screenId: "administration.services" },
  {
    label: "Comisiones",
    icon: WalletCards,
    adminSection: "commissions",
    screenId: "administration.commissions",
  },
  {
    label: "Recursos",
    icon: SlidersHorizontal,
    adminSection: "resources",
    screenId: "administration.resources",
  },
  { label: "Encuestas", icon: FileText, adminSection: "surveys", screenId: "administration.surveys" },
  {
    label: "Consentimientos",
    icon: Check,
    adminSection: "consents",
    screenId: "administration.consents",
  },
  {
    label: "WhatsApp",
    icon: MessageCircle,
    adminSection: "whatsapp",
    screenId: "administration.whatsapp",
  },
  {
    label: "Gift cards",
    icon: WalletCards,
    adminSection: "gift-cards",
    screenId: "administration.gift-cards",
  },
  {
    label: "Colores de status",
    icon: Palette,
    adminSection: "status-colors",
    screenId: "administration.status-colors",
  },
];

const settingsItems: NavigationItem[] = [
  { label: "Empresa", icon: Building2, settingsSection: "company" },
  { label: "Sitio web", icon: Globe2, settingsSection: "website" },
  { label: "Agenda", icon: CalendarDays, settingsSection: "agenda" },
  { label: "Pagos Keysar", icon: WalletCards, settingsSection: "payments" },
  { label: "Recordatorios", icon: Bell, settingsSection: "reminders" },
  { label: "Fichas médicas", icon: ClipboardList, settingsSection: "records" },
  { label: "E-mails", icon: Mail, settingsSection: "emails" },
  { label: "Integraciones", icon: SlidersHorizontal, settingsSection: "integrations" },
  { label: "Notificaciones", icon: Bell, settingsSection: "notifications" },
  { label: "Clientes", icon: UsersRound, settingsSection: "clients" },
  { label: "Encuestas", icon: MessageSquareText, settingsSection: "surveys" },
  { label: "Códigos de autorización", icon: FileCheck2, settingsSection: "authorizations" },
];

function NavigationGroup({
  label,
  items,
  pathname,
  activeAdminSection,
  activeSettingsSection,
  collapsible = false,
  expanded = true,
  sidebarCollapsed,
  onToggle,
  onNavigate,
}: {
  label: string;
  items: NavigationItem[];
  pathname: string;
  activeAdminSection: AdministrationSectionId;
  activeSettingsSection: SettingsSectionId;
  collapsible?: boolean;
  expanded?: boolean;
  sidebarCollapsed: boolean;
  onToggle?: () => void;
  onNavigate: (item: NavigationItem, event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  const visibleItems = items.filter(
    (item) => !item.screenId || canAccessSchedulerScreen(item.screenId),
  );

  if (visibleItems.length === 0) return null;

  return (
    <SidebarGroup>
      {collapsible ? (
        <SidebarGroupLabel asChild>
          <button
            aria-controls={`scheduler-sidebar-${label.toLowerCase()}`}
            aria-expanded={expanded}
            className="group/disclosure w-full cursor-pointer justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--scheduler-accent-strong)] transition-colors duration-200 hover:bg-[var(--scheduler-accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--scheduler-accent)] motion-reduce:transition-none"
            onClick={onToggle}
            type="button"
          >
            <span className="truncate">{label}</span>
            <span aria-hidden="true" className="flex items-center gap-1.5">
              <span className="min-w-4 text-center text-[0.62rem] tabular-nums">
                {visibleItems.length}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
              />
            </span>
          </button>
        </SidebarGroupLabel>
      ) : (
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--scheduler-accent-strong)]">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent
        hidden={collapsible && !sidebarCollapsed && !expanded}
        id={collapsible ? `scheduler-sidebar-${label.toLowerCase()}` : undefined}
      >
        <SidebarMenu>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const href = item.adminSection
              ? `/administracion?section=${item.adminSection}`
              : item.settingsSection
                ? `/configuraciones?section=${item.settingsSection}`
              : item.href;
            const active = item.adminSection
              ? pathname === "/administracion" && activeAdminSection === item.adminSection
              : item.settingsSection
                ? pathname === "/configuraciones" && activeSettingsSection === item.settingsSection
              : item.href === "/"
                ? pathname === "/"
                : pathname === item.href;

            return (
              <SidebarMenuItem key={`${label}-${item.label}`}>
                {href && !item.pending ? (
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.label}
                    className={active ? "scheduler-sidebar-nav-active" : "scheduler-sidebar-nav-item"}
                  >
                    <Link
                      aria-current={active ? "page" : undefined}
                      data-settings-section={item.settingsSection}
                      href={href}
                      onClick={(event) => onNavigate(item, event)}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 group-data-[collapsible=icon]:!h-5 group-data-[collapsible=icon]:!w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    aria-disabled="true"
                    className="scheduler-sidebar-nav-item cursor-not-allowed opacity-55"
                    disabled
                    tooltip={`${item.label} · Próximamente`}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 group-data-[collapsible=icon]:!h-5 group-data-[collapsible=icon]:!w-5" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-[0.55rem] font-semibold uppercase tracking-wider text-slate-400 group-data-[collapsible=icon]:hidden">
                      Próximo
                    </span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function SchedulerAppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const [activeAdminSection, setActiveAdminSection] =
    useState<AdministrationSectionId>("locals");
  const [activeSettingsSection, setActiveSettingsSection] =
    useState<SettingsSectionId>("company");
  const activeNavigationSection: NavigationSection | null = pathname.startsWith("/reportes")
    ? "reports"
    : pathname === "/administracion"
      ? "administration"
      : pathname === "/configuraciones"
        ? "settings"
        : null;
  const [expandedSection, setExpandedSection] =
    useState<NavigationSection | null>(activeNavigationSection);

  useEffect(() => {
    function syncAdminSection(event?: Event) {
      const customSection = (event as CustomEvent<AdministrationSectionId> | undefined)?.detail;
      const section =
        customSection ??
        (new URLSearchParams(window.location.search).get("section") as AdministrationSectionId | null);
      if (section) setActiveAdminSection(section);
    }

    function syncSettingsSection(event?: Event) {
      const customSection = (event as CustomEvent<SettingsSectionId> | undefined)?.detail;
      const section =
        customSection ??
        (new URLSearchParams(window.location.search).get("section") as SettingsSectionId | null);
      if (section) setActiveSettingsSection(section);
    }

    syncAdminSection();
    syncSettingsSection();
    window.addEventListener(ADMIN_SECTION_CHANGE_EVENT, syncAdminSection);
    window.addEventListener("popstate", syncAdminSection);
    window.addEventListener("popstate", syncSettingsSection);
    return () => {
      window.removeEventListener(ADMIN_SECTION_CHANGE_EVENT, syncAdminSection);
      window.removeEventListener("popstate", syncAdminSection);
      window.removeEventListener("popstate", syncSettingsSection);
    };
  }, [pathname]);

  useEffect(() => {
    setExpandedSection(activeNavigationSection);
  }, [activeNavigationSection]);

  function handleNavigate(
    item: NavigationItem,
    event: ReactMouseEvent<HTMLAnchorElement>,
  ) {
    if (item.adminSection) {
      setActiveAdminSection(item.adminSection);
      window.dispatchEvent(
        new CustomEvent<AdministrationSectionId>(ADMIN_SECTION_CHANGE_EVENT, {
          detail: item.adminSection,
        }),
      );
    }
    if (item.settingsSection) {
      const navigationAccepted = window.dispatchEvent(
        new CustomEvent<SettingsSectionId>(SETTINGS_SECTION_CHANGE_EVENT, {
          cancelable: true,
          detail: item.settingsSection,
        }),
      );
      if (!navigationAccepted) {
        event.preventDefault();
        return;
      }
      setActiveSettingsSection(item.settingsSection);
    }
    setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-[var(--border-color)] p-0">
        <div className="hidden h-20 flex-col items-center justify-center gap-1 group-data-[collapsible=icon]:flex">
          <img
            alt="Keysar Cosmetics"
            className="h-7 w-7 object-contain"
            height={28}
            src="/logo.svg"
            width={28}
          />
          <SidebarTrigger
            aria-label="Expandir navegación principal"
            className="text-slate-500 hover:bg-[var(--scheduler-accent-soft)] hover:text-[var(--scheduler-ink-strong)]"
          />
        </div>

        <div className="relative flex flex-col items-center gap-1 px-3 pb-2 pt-3 group-data-[collapsible=icon]:hidden">
          <Link
            aria-label="Ir a la agenda"
            className="flex flex-col items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--scheduler-accent)]"
            href="/"
            onClick={() => setOpenMobile(false)}
          >
            <img
              alt=""
              aria-hidden="true"
              className="h-auto max-w-[52px] object-contain"
              height={52}
              src="/logo.svg"
              width={52}
            />
            <span className="page-title text-[1.18rem] font-bold uppercase tracking-[0.1em] text-[var(--scheduler-ink-strong)]">
              Keysar Cosmetics
            </span>
          </Link>
          {isMobile ? (
            <button
              aria-label="Cerrar navegación principal"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-[var(--scheduler-accent-soft)] hover:text-[var(--scheduler-ink-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--scheduler-accent)]"
              onClick={() => setOpenMobile(false)}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            <SidebarTrigger
              aria-label="Colapsar navegación principal"
              className="absolute right-2 top-2 text-slate-500 hover:bg-[var(--scheduler-accent-soft)] hover:text-[var(--scheduler-ink-strong)]"
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2 group-data-[collapsible=icon]:!overflow-y-auto">
        <NavigationGroup
          activeAdminSection={activeAdminSection}
          activeSettingsSection={activeSettingsSection}
          items={primaryItems}
          label="Principal"
          onNavigate={handleNavigate}
          pathname={pathname}
          sidebarCollapsed={sidebarState === "collapsed"}
        />
        <SidebarSeparator className="my-1 hidden bg-[var(--border-color)] group-data-[collapsible=icon]:block" />
        <NavigationGroup
          activeAdminSection={activeAdminSection}
          activeSettingsSection={activeSettingsSection}
          collapsible
          expanded={expandedSection === "reports"}
          items={reportItems}
          label="Reportes"
          onNavigate={handleNavigate}
          onToggle={() => setExpandedSection(expandedSection === "reports" ? null : "reports")}
          pathname={pathname}
          sidebarCollapsed={sidebarState === "collapsed"}
        />
        <SidebarSeparator className="my-1 hidden bg-[var(--border-color)] group-data-[collapsible=icon]:block" />
        <NavigationGroup
          activeAdminSection={activeAdminSection}
          activeSettingsSection={activeSettingsSection}
          collapsible
          expanded={expandedSection === "administration"}
          items={administrationItems}
          label="Administración"
          onNavigate={handleNavigate}
          onToggle={() => setExpandedSection(expandedSection === "administration" ? null : "administration")}
          pathname={pathname}
          sidebarCollapsed={sidebarState === "collapsed"}
        />
        <SidebarSeparator className="my-1 hidden bg-[var(--border-color)] group-data-[collapsible=icon]:block" />
        <NavigationGroup
          activeAdminSection={activeAdminSection}
          activeSettingsSection={activeSettingsSection}
          collapsible
          expanded={expandedSection === "settings"}
          items={settingsItems}
          label="Configuraciones"
          onNavigate={handleNavigate}
          onToggle={() => setExpandedSection(expandedSection === "settings" ? null : "settings")}
          pathname={pathname}
          sidebarCollapsed={sidebarState === "collapsed"}
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--border-color)] p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Cerrar sesión"
              className="cursor-pointer justify-center rounded-lg bg-[#ecd1c8] text-[#1a1a1a] transition-colors hover:bg-[#e4c2b7] hover:text-[#1a1a1a]"
            >
              <Link href="/login" onClick={() => setOpenMobile(false)}>
                <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>Cerrar sesión</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
