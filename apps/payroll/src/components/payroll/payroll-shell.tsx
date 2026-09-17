"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart2,
  BellRing,
  BriefcaseBusiness,
  Calculator,
  ChevronDown,
  CircleDollarSign,
  Delete,
  EyeOff,
  FileText,
  Gift,
  Gavel,
  HandCoins,
  Landmark,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  MonitorCheck,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Network,
  PlaneTakeoff,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  TrendingUp,
  UserCircle2,
  UserMinus,
  KeyRound,
  UserRoundCheck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
} from "@cosmetics/ui";
import {
  requiredModulePermission,
  roleHasPermission,
  usePayrollDemo,
} from "./payroll-demo-context";

type SectionId =
  | "direction"
  | "people"
  | "payroll"
  | "operations"
  | "settings"
  | "reports";
type NavItem = { href: string; label: string; icon: React.ElementType };
type NavSection = { id: SectionId; label: string; items: NavItem[] };

const PRIVACY_IDLE_LIMIT_MS = 3 * 60 * 1000;
const SESSION_IDLE_LIMIT_MS = 5 * 60 * 1000;

const sections: NavSection[] = [
  {
    id: "direction",
    label: "Dirección",
    items: [
      {
        href: "/centro-control",
        label: "Centro de control",
        icon: MonitorCheck,
      },
    ],
  },
  {
    id: "people",
    label: "Personal",
    items: [{ href: "/empleados", label: "Empleados", icon: UsersRound }],
  },
  {
    id: "payroll",
    label: "Nómina",
    items: [
      { href: "/", label: "Consolidado", icon: LayoutDashboard },
      {
        href: "/nomina-salario-fijo",
        label: "Salario fijo",
        icon: WalletCards,
      },
      {
        href: "/nomina-especialistas",
        label: "Especialistas",
        icon: UserRoundCheck,
      },
      {
        href: "/nomina-comisiones",
        label: "Comisiones",
        icon: CircleDollarSign,
      },
      {
        href: "/nomina-comision-kiosco",
        label: "Comisión de kiosco",
        icon: Store,
      },
      { href: "/nomina-honorarios", label: "Honorarios", icon: ReceiptText },
      {
        href: "/dispersion-nomina",
        label: "Dispersión de nómina",
        icon: Landmark,
      },
      {
        href: "/liquidaciones-finiquitos",
        label: "Liquidaciones y finiquitos",
        icon: UserMinus,
      },
      { href: "/aguinaldos", label: "Aguinaldos", icon: Gift },
    ],
  },
  {
    id: "operations",
    label: "Operación",
    items: [
      {
        href: "/calculo-comisiones",
        label: "Cálculo de comisiones",
        icon: Calculator,
      },
      { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
      {
        href: "/operacion-bonos-multas",
        label: "Bonos y multas",
        icon: Sparkles,
      },
      { href: "/prestamos-adelantos", label: "Préstamos", icon: HandCoins },
    ],
  },
  {
    id: "settings",
    label: "Configuración",
    items: [
      {
        href: "/configuracion",
        label: "Periodos y conceptos",
        icon: TrendingUp,
      },
      { href: "/modulos-nomina", label: "Módulos de nómina", icon: Layers3 },
      { href: "/sucursales", label: "Sucursales", icon: Store },
      { href: "/puestos", label: "Puestos", icon: BriefcaseBusiness },
      { href: "/esquemas", label: "Esquemas de comisión", icon: Layers3 },
      {
        href: "/esquemas-sucursal",
        label: "Esquemas por sucursal",
        icon: Network,
      },
      { href: "/bonos-multas", label: "Bonos y multas", icon: Sparkles },
      { href: "/viaticos", label: "Viáticos", icon: PlaneTakeoff },
      { href: "/notificaciones", label: "Notificaciones", icon: BellRing },
      { href: "/accesos", label: "Roles y accesos", icon: ShieldCheck },
    ],
  },
  {
    id: "reports",
    label: "Reportes",
    items: [
      {
        href: "/reportes/gastos-por-puesto",
        label: "Gastos por puesto",
        icon: BriefcaseBusiness,
      },
      {
        href: "/reportes/desglose-sucursal",
        label: "Desglose por sucursal",
        icon: BarChart2,
      },
      {
        href: "/reportes/movimientos",
        label: "Movimientos",
        icon: ArrowLeftRight,
      },
      {
        href: "/reportes/prestamos",
        label: "Préstamos",
        icon: HandCoins,
      },
      { href: "/reportes/bonos", label: "Bonos", icon: Sparkles },
      { href: "/reportes/multas", label: "Multas", icon: Gavel },
      {
        href: "/reportes/liquidaciones",
        label: "Liquidaciones",
        icon: UserMinus,
      },
      { href: "/recibos", label: "Recibos", icon: FileText },
      {
        href: "/recibos-kiosco",
        label: "Recibos gerenciales",
        icon: ReceiptText,
      },
    ],
  },
];

function isRouteActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function MasterClarificationBell({ mobile = false }: { mobile?: boolean }) {
  const { state } = usePayrollDemo();
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const activeRole = state.roles.find(
    (role) => role.id === activeEmployee?.roleId,
  );

  if (activeRole?.id !== "role-admin") return null;

  const notifications = [
    ...state.decisions
      .filter((decision) => decision.status === "CLARIFICATION")
      .map((decision) => ({
        id: `receipt-${decision.employeeId}-${decision.periodStart}`,
        employeeName:
          state.employees.find(
            (employee) => employee.id === decision.employeeId,
          )?.name ?? "EMPLEADO",
        title: "Aclaración de recibo",
        detail: decision.note || "Solicitud sin detalle",
        period: decision.periodStart,
        updatedAt: decision.updatedAt,
        href: `/recibos#aclaracion-${decision.employeeId}-${decision.periodStart}`,
      })),
    ...state.kioskReceiptDecisions
      .filter((decision) => decision.status === "CLARIFICATION")
      .map((decision) => ({
        id: `kiosk-${decision.managerId}-${decision.month}`,
        employeeName:
          state.employees.find((employee) => employee.id === decision.managerId)
            ?.name ?? "GERENCIA",
        title: "Aclaración gerencial",
        detail: decision.note || "Solicitud sin detalle",
        period: decision.month,
        updatedAt: decision.updatedAt,
        href: `/recibos#aclaracion-gerencial-${decision.managerId}-${decision.month}`,
      })),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`relative flex shrink-0 items-center justify-center border text-[#efd9bf] transition-colors hover:border-[#caa177]/55 hover:bg-[#caa177]/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c] ${mobile ? "h-10 w-10 rounded-xl border-white/10" : "h-9 w-9 rounded-lg border-white/10 bg-white/[0.04]"}`}
          aria-label={`${notifications.length} aclaraciones pendientes`}
          title="Aclaraciones pendientes"
        >
          <BellRing className="h-4 w-4" />
          {notifications.length > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border border-[#211b17] bg-rose-500 px-1 text-[8px] font-bold leading-none text-white">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border-[#b98d62]/35 bg-[#211b17] p-0 text-[#f6ecdf] shadow-2xl"
      >
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm font-semibold">Aclaraciones pendientes</p>
          <p className="mt-0.5 text-[10px] text-[#b8a99a]">
            Exclusivo para usuario máster · {notifications.length} abiertas
          </p>
        </div>
        {notifications.length ? (
          <div className="max-h-80 divide-y divide-white/10 overflow-y-auto">
            {notifications.slice(0, 8).map((notification) => (
              <Link
                key={notification.id}
                href={notification.href}
                className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4b28c]"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#d4b28c]/25 bg-[#d4b28c]/10 text-[#efc99e]">
                  <MessageSquareText className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d7ab7f]">
                    {notification.title} · {notification.period}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-medium text-white">
                    {notification.employeeName}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-[#b8a99a]">
                    {notification.detail}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <BellRing className="mx-auto h-6 w-6 text-[#8f8175]" />
            <p className="mt-2 text-xs font-medium">
              Sin aclaraciones abiertas
            </p>
            <p className="mt-1 text-[10px] text-[#9f9185]">
              Las nuevas solicitudes aparecerán aquí.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TopNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, endSession } = usePayrollDemo();
  const navigationRef = useRef<HTMLElement>(null);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const activeRole = state.roles.find(
    (role) => role.id === activeEmployee?.roleId,
  );
  const isMaster = activeRole?.id === "role-admin";
  const canViewPersonalPortal = roleHasPermission(activeRole, "portal.view");
  const navigationSections = sections.map((section) => {
    const items =
      section.id === "payroll"
        ? [
            ...section.items,
            ...state.payrollModules
              .filter((module) => module.custom && module.active)
              .map((module) => ({
                href: `/nomina-personalizada/${encodeURIComponent(module.id)}`,
                label: module.name,
                icon: Layers3,
              })),
          ]
        : section.items;

    return {
      ...section,
      items: items.map((item) => ({
        ...item,
        permission: requiredModulePermission(item.href),
      })),
    };
  });
  const activeSection = pathname.startsWith("/nomina-personalizada/")
    ? "payroll"
    : (navigationSections.find((section) =>
        section.items.some((item) => isRouteActive(pathname, item.href)),
      )?.id ?? null);
  const currentPage =
    navigationSections
      .flatMap((section) => section.items)
      .find((item) => isRouteActive(pathname, item.href))?.label ?? "Nómina";
  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          isMaster ||
          (item.permission !== null &&
            roleHasPermission(activeRole, item.permission)),
      ),
    }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    setOpenSection(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        navigationRef.current &&
        !navigationRef.current.contains(event.target as Node)
      ) {
        setOpenSection(null);
        setMobileOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenSection(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function setTheme(nextDark: boolean) {
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
  }

  function closeSession() {
    endSession();
    router.replace("/login");
  }

  return (
    <header
      ref={navigationRef}
      className="sticky top-0 z-50 border-b border-[#b98d62]/35 bg-[linear-gradient(105deg,#171411_0%,#211b17_56%,#32251b_100%)] text-[#f6ecdf] shadow-[0_10px_30px_rgba(37,27,20,0.14)]"
    >
      <div className="flex min-h-[68px] w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 lg:px-6">
        <Link
          href={isMaster ? "/" : "/mi-nomina"}
          className="group flex shrink-0 items-center gap-2.5 rounded-xl pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c]"
          aria-label={isMaster ? "Ir al consolidado" : "Ir a mi perfil"}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7b589]/40 bg-white/[0.06] shadow-inner transition-colors group-hover:bg-white/[0.1]">
            <Image
              src="/logo.svg"
              alt="Keysar Cosmetics"
              width={32}
              height={28}
              className="h-7 w-8 object-contain brightness-0 invert"
            />
          </span>
          <span className="hidden leading-none sm:block">
            <span className="block font-brand text-[15px] uppercase tracking-[0.19em] text-[#f0e4d3]">
              Keysar
            </span>
            <span className="mt-1.5 block text-[7px] font-semibold uppercase tracking-[0.16em] text-[#cda57e]">
              Cosmetics · Payroll
            </span>
          </span>
        </Link>

        <div
          className="hidden h-7 w-px shrink-0 bg-white/10"
          aria-hidden="true"
        />

        <nav
          className="order-last hidden h-10 w-full flex-none items-center justify-center gap-1 border-t border-white/10 pt-2 md:flex"
          aria-label="Navegación principal"
        >
          {visibleSections.map((section) => {
            const expanded = openSection === section.id;
            const selected = activeSection === section.id;
            return (
              <div key={section.id} className="relative">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-haspopup="menu"
                  onClick={() =>
                    setOpenSection((current) =>
                      current === section.id ? null : section.id,
                    )
                  }
                  className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-semibold uppercase tracking-[0.11em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c] ${selected || expanded ? "border-[#caa177]/55 bg-[#c59b70]/16 text-[#f8e4ca] shadow-inner" : "border-transparent text-[#d8c9ba] hover:border-white/10 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  {section.label}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                {expanded && (
                  <div
                    role="menu"
                    className="absolute left-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-2xl border border-[#b98d62]/35 bg-[#1d1916]/[0.98] p-2 shadow-[0_22px_55px_rgba(16,12,9,0.38)] backdrop-blur-xl"
                  >
                    <div className="border-b border-white/10 px-3 pb-2 pt-1">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#cba27c]">
                        {section.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#9e9288]">
                        {section.items.length} accesos disponibles
                      </p>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isRouteActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            aria-current={active ? "page" : undefined}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c] ${active ? "bg-[linear-gradient(90deg,#7b5738,#4b3525)] text-white" : "text-[#e2d8ce] hover:bg-white/[0.07] hover:text-white"}`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${active ? "border-[#e1bd91]/45 bg-[#e1bd91]/15 text-[#f2d2aa]" : "border-white/10 bg-white/[0.04] text-[#cba27c]"}`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-1.5 md:flex">
          <MasterClarificationBell />
          <button
            type="button"
            onClick={() => setTheme(!dark)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#d7c7b8] transition-colors hover:border-[#caa177]/45 hover:bg-[#caa177]/10 hover:text-white"
            aria-label={dark ? "Usar tema claro" : "Usar tema oscuro"}
            title={dark ? "Tema claro" : "Tema oscuro"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {canViewPersonalPortal && activeEmployee && (
            <Link
              href="/mi-nomina"
              aria-current={
                pathname.startsWith("/mi-nomina") ? "page" : undefined
              }
              className={`flex h-10 max-w-[190px] items-center gap-2 rounded-xl border px-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c] ${pathname.startsWith("/mi-nomina") ? "border-[#ddb88a]/65 bg-[#9d744d]/25" : "border-white/10 bg-white/[0.04] hover:border-[#caa177]/45 hover:bg-white/[0.07]"}`}
            >
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#dcb88b]/30 bg-[#dcb88b]/10">
                <UserCircle2 className="h-4 w-4 text-[#eccca6]" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#211b17] bg-emerald-400" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-[#cba27c]">
                  Mi perfil
                </span>
                <span className="block truncate text-[10px] font-medium text-[#f3e8dc]">
                  {activeEmployee.name}
                </span>
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={closeSession}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7c9ba]/20 bg-[#b66f63]/10 text-[#e8c5bc] transition-colors hover:border-[#e7c9ba]/45 hover:bg-[#b66f63]/20 hover:text-white"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 md:hidden">
          <div className="hidden min-w-0 text-right">
            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#b99c81]">
              Sección actual
            </p>
            <p className="max-w-32 truncate text-[11px] font-semibold text-white">
              {currentPage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d1aa82]/30 bg-white/[0.06] text-[#f0dcc5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c]"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full max-h-[calc(100vh-68px)] overflow-y-auto border-t border-white/10 bg-[#181512]/[0.99] p-3 shadow-2xl md:hidden">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {visibleSections.map((section) => {
              const expanded =
                openSection === section.id || activeSection === section.id;
              return (
                <section
                  key={section.id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]"
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() =>
                      setOpenSection((current) =>
                        current === section.id ? null : section.id,
                      )
                    }
                    className={`flex w-full items-center justify-between px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.13em] ${activeSection === section.id ? "text-[#efc99e]" : "text-[#ddd0c3]"}`}
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {expanded && (
                    <div className="space-y-0.5 border-t border-white/10 p-1.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isRouteActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ${active ? "bg-[#8a6342]/45 text-white" : "text-[#d8cec4] hover:bg-white/[0.06]"}`}
                          >
                            <Icon className="h-3.5 w-3.5 text-[#cba27c]" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            {canViewPersonalPortal && activeEmployee && (
              <Link
                href="/mi-nomina"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#caa177]/30 bg-[#caa177]/10 px-3 py-2.5"
              >
                <UserCircle2 className="h-4 w-4 shrink-0 text-[#e7c395]" />
                <span className="min-w-0">
                  <span className="block text-[8px] uppercase tracking-[0.13em] text-[#cba27c]">
                    Mi perfil
                  </span>
                  <span className="block truncate text-[10px] text-white">
                    {activeEmployee.name}
                  </span>
                </span>
              </Link>
            )}
            <MasterClarificationBell mobile />
            <button
              type="button"
              onClick={() => setTheme(!dark)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-[#e2d4c6]"
              aria-label={dark ? "Usar tema claro" : "Usar tema oscuro"}
            >
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={closeSession}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#b66f63]/35 text-[#e8bdb3]"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function PayrollSecurityGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, isAuthenticated, endSession } = usePayrollDemo();
  const [privacyLocked, setPrivacyLocked] = useState(false);
  const [privacyReason, setPrivacyReason] = useState<"MANUAL" | "INACTIVITY">(
    "MANUAL",
  );
  const [privateCode, setPrivateCode] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [securityCycle, setSecurityCycle] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const expiredRef = useRef(false);
  const privacyLockedRef = useRef(false);
  const masterEmployee = state.employees.find(
    (employee) =>
      employee.roleId === "role-admin" && employee.secondaryAccessKey,
  );
  const masterPrivateCode = masterEmployee?.secondaryAccessKey ?? null;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    let privacyTimeoutId: number | null = null;
    let sessionTimeoutId: number | null = null;

    function clearTimers() {
      if (privacyTimeoutId !== null) window.clearTimeout(privacyTimeoutId);
      if (sessionTimeoutId !== null) window.clearTimeout(sessionTimeoutId);
    }

    function expireSession() {
      if (expiredRef.current) return;
      expiredRef.current = true;
      clearTimers();
      endSession();
      router.replace("/login");
      toast.warning(
        "Sesión cerrada por 5 minutos sin actividad. Vuelve a ingresar.",
      );
    }

    function lockSensitiveInformation() {
      if (privacyLockedRef.current || expiredRef.current) return;
      privacyLockedRef.current = true;
      setPrivacyReason("INACTIVITY");
      setPrivateCode("");
      setUnlockError("");
      setPrivacyLocked(true);
      if (privacyTimeoutId !== null) window.clearTimeout(privacyTimeoutId);
      toast.warning(
        "Información protegida por 3 minutos sin actividad. Ingresa el código privado master para continuar.",
      );
    }

    function scheduleSecurityTimers() {
      clearTimers();
      const elapsed = Date.now() - lastActivityRef.current;
      const sessionRemaining = SESSION_IDLE_LIMIT_MS - elapsed;
      if (sessionRemaining <= 0) {
        expireSession();
        return;
      }
      sessionTimeoutId = window.setTimeout(() => {
        if (Date.now() - lastActivityRef.current >= SESSION_IDLE_LIMIT_MS) {
          expireSession();
        } else {
          scheduleSecurityTimers();
        }
      }, sessionRemaining);

      if (privacyLockedRef.current) return;
      const privacyRemaining = PRIVACY_IDLE_LIMIT_MS - elapsed;
      if (privacyRemaining <= 0) {
        lockSensitiveInformation();
        return;
      }
      privacyTimeoutId = window.setTimeout(() => {
        if (Date.now() - lastActivityRef.current >= PRIVACY_IDLE_LIMIT_MS) {
          lockSensitiveInformation();
        } else {
          scheduleSecurityTimers();
        }
      }, privacyRemaining);
    }

    function registerActivity() {
      if (expiredRef.current || privacyLockedRef.current) return;
      lastActivityRef.current = Date.now();
      scheduleSecurityTimers();
    }

    function registerPointerMovement() {
      if (Date.now() - lastActivityRef.current >= 1000) registerActivity();
    }

    function checkElapsedTime() {
      if (document.visibilityState !== "visible") return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= SESSION_IDLE_LIMIT_MS) {
        expireSession();
      } else if (
        elapsed >= PRIVACY_IDLE_LIMIT_MS &&
        !privacyLockedRef.current
      ) {
        lockSensitiveInformation();
      } else {
        scheduleSecurityTimers();
      }
    }

    expiredRef.current = false;
    privacyLockedRef.current = false;
    lastActivityRef.current = Date.now();
    setPrivacyLocked(false);
    setPrivateCode("");
    setUnlockError("");
    scheduleSecurityTimers();
    window.addEventListener("pointerdown", registerActivity, { passive: true });
    window.addEventListener("mousemove", registerPointerMovement, {
      passive: true,
    });
    window.addEventListener("keydown", registerActivity);
    window.addEventListener("scroll", registerActivity, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchstart", registerActivity, { passive: true });
    document.addEventListener("visibilitychange", checkElapsedTime);

    return () => {
      clearTimers();
      window.removeEventListener("pointerdown", registerActivity);
      window.removeEventListener("mousemove", registerPointerMovement);
      window.removeEventListener("keydown", registerActivity);
      window.removeEventListener("scroll", registerActivity, true);
      window.removeEventListener("touchstart", registerActivity);
      document.removeEventListener("visibilitychange", checkElapsedTime);
    };
  }, [endSession, isAuthenticated, router, securityCycle]);

  function lockManually() {
    privacyLockedRef.current = true;
    setPrivacyReason("MANUAL");
    setPrivateCode("");
    setUnlockError("");
    setPrivacyLocked(true);
  }

  function addPrivateCodeDigit(digit: string) {
    setPrivateCode((current) =>
      current.length < 4 ? `${current}${digit}` : current,
    );
    setUnlockError("");
  }

  function unlockInformation() {
    if (!masterPrivateCode || privateCode !== masterPrivateCode) {
      setUnlockError(
        masterPrivateCode
          ? "Código privado master incorrecto. Intenta nuevamente."
          : "No existe un código privado master configurado.",
      );
      setPrivateCode("");
      return;
    }
    privacyLockedRef.current = false;
    setPrivacyLocked(false);
    setPrivateCode("");
    setUnlockError("");
    setSecurityCycle((current) => current + 1);
    toast.success("Información desbloqueada por autorización master.");
  }

  return (
    <>
      <div
        className={`min-h-screen transition duration-200 ${privacyLocked ? "pointer-events-none select-none blur-xl" : ""}`}
        aria-hidden={privacyLocked}
      >
        {children}
      </div>

      {privacyLocked && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#17120f]/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-lock-title"
          aria-describedby="privacy-lock-description"
          onKeyDown={(event) => {
            if (/^\d$/.test(event.key)) addPrivateCodeDigit(event.key);
            if (event.key === "Backspace")
              setPrivateCode((current) => current.slice(0, -1));
            if (event.key === "Enter" && privateCode.length === 4)
              unlockInformation();
          }}
        >
          <section className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#241c17] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d1a779]/30 bg-[#d1a779]/10 text-[#edcfaa]">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d2a77c]">
                  Protección de nómina
                </p>
                <h2
                  id="privacy-lock-title"
                  className="mt-1 text-lg font-semibold"
                >
                  Información bloqueada
                </h2>
                <p
                  id="privacy-lock-description"
                  className="mt-1 text-xs leading-5 text-white/60"
                >
                  {privacyReason === "INACTIVITY"
                    ? "Se activó la privacidad después de 3 minutos sin actividad."
                    : "La privacidad se activó manualmente para ocultar datos sensibles."}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="master-privacy-code"
                  className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Código privado master
                </Label>
                <span className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[#d2a77c]">
                  No autocompletable
                </span>
              </div>
              <Input
                id="master-privacy-code"
                name="master-privacy-verification"
                type="password"
                value={privateCode}
                readOnly
                autoFocus
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                className="mt-3 h-11 border-white/15 bg-black/20 text-center text-lg tracking-[0.5em] text-white"
                aria-label="Código privado master capturado con teclado seguro"
              />
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => addPrivateCodeDigit(digit)}
                    className="h-9 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold transition-colors hover:border-[#d2a77c]/55 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2a77c]"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPrivateCode("")}
                  className="h-9 rounded-xl border border-white/10 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/60 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2a77c]"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => addPrivateCodeDigit("0")}
                  className="h-9 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold hover:border-[#d2a77c]/55 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2a77c]"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPrivateCode((current) => current.slice(0, -1))
                  }
                  className="flex h-9 items-center justify-center rounded-xl border border-white/10 text-white/60 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2a77c]"
                  aria-label="Borrar último dígito"
                >
                  <Delete className="h-4 w-4" />
                </button>
              </div>
              {unlockError && (
                <p
                  className="mt-3 text-xs font-medium text-rose-300"
                  role="alert"
                >
                  {unlockError}
                </p>
              )}
            </div>

            <Button
              type="button"
              className="mt-4 h-11 w-full bg-[#8a603d] text-white hover:bg-[#704a2e]"
              disabled={privateCode.length !== 4}
              onClick={unlockInformation}
            >
              <KeyRound className="mr-2 h-4 w-4" /> Desbloquear información
            </Button>
            <p className="mt-3 text-center text-[10px] leading-4 text-white/45">
              Si la inactividad llega a 5 minutos, la sesión se cerrará por
              completo.
            </p>
          </section>
        </div>
      )}

      <Button
        type="button"
        onClick={lockManually}
        disabled={privacyLocked}
        className="fixed bottom-5 right-5 z-[80] h-11 rounded-full bg-[#35281f] px-4 text-white shadow-[0_16px_45px_rgba(30,20,14,0.35)] hover:bg-[#4a3527] disabled:bg-[#35281f] disabled:text-white/70 disabled:opacity-100"
        aria-label={
          privacyLocked
            ? "La información está bloqueada"
            : "Activar privacidad y ocultar información sensible"
        }
      >
        {privacyLocked ? (
          <LockKeyhole className="mr-2 h-4 w-4" />
        ) : (
          <EyeOff className="mr-2 h-4 w-4" />
        )}
        {privacyLocked ? "Bloqueado" : "Privacidad"}
      </Button>
    </>
  );
}

function ConfidentialContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, isAuthenticated } = usePayrollDemo();
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const activeRole = state.roles.find(
    (role) => role.id === activeEmployee?.roleId,
  );
  const isMaster = activeRole?.id === "role-admin";
  const personalPortalRoute = pathname.startsWith("/mi-nomina");
  const requiredPermission = requiredModulePermission(pathname);
  const unauthorizedRoute =
    isAuthenticated &&
    !isMaster &&
    (personalPortalRoute
      ? !roleHasPermission(activeRole, "portal.view")
      : !requiredPermission ||
        !roleHasPermission(activeRole, requiredPermission));

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center text-xs font-semibold uppercase tracking-[0.13em] text-[color:var(--text-muted)]">
        Protegiendo información de nómina…
      </div>
    );
  }

  if (unauthorizedRoute) {
    return (
      <section className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-[#b98d62]/35 bg-[color:var(--bg-card)] p-7 text-center shadow-[0_18px_55px_rgba(52,43,35,0.10)]">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#b99568]/35 bg-[#b99568]/10 text-[#8a6744]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a744c]">
            Acceso controlado
          </p>
          <h1 className="mt-2 text-xl font-semibold text-[color:var(--text-primary)]">
            Este módulo requiere autorización
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--text-muted)]">
            Tu rol no tiene habilitado este módulo. Solicita al usuario máster
            que lo autorice desde Roles y accesos.
          </p>
          {roleHasPermission(activeRole, "portal.view") && (
            <Link
              href="/mi-nomina"
              className="mt-5 inline-flex h-9 items-center justify-center rounded-lg border border-[#9a744c]/40 bg-[#6f4c30] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#563923] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99568]"
            >
              Volver a mi perfil
            </Link>
          )}
        </div>
      </section>
    );
  }
  return children;
}

export function PayrollShell({ children }: { children: React.ReactNode }) {
  return (
    <PayrollSecurityGuard>
      <div className="min-h-screen min-w-0 overflow-x-hidden">
        <TopNavigation />
        <main className="min-w-0 w-full max-w-none p-4 md:p-6 xl:px-8 xl:py-7">
          <ConfidentialContent>{children}</ConfidentialContent>
        </main>
      </div>
    </PayrollSecurityGuard>
  );
}
