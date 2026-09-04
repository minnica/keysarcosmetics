"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@cosmetics/ui";
import {
  ArrowLeftRight,
  BarChart2,
  Calculator,
  ChevronDown,
  CircleDollarSign,
  FileText,
  HandCoins,
  Landmark,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
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
  UserRoundCheck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { usePayrollDemo } from "./payroll-demo-context";

type SectionId = "people" | "payroll" | "operations" | "settings" | "reports";
type NavItem = { href: string; label: string; icon: React.ElementType };
type NavSection = { id: SectionId; label: string; items: NavItem[] };

const SESSION_IDLE_LIMIT_MS = 3 * 60 * 1000;

const sections: NavSection[] = [
  { id: "people", label: "Personal", items: [{ href: "/empleados", label: "Empleados", icon: UsersRound }] },
  {
    id: "payroll",
    label: "Nómina",
    items: [
      { href: "/", label: "Consolidado", icon: LayoutDashboard },
      { href: "/nomina-salario-fijo", label: "Salario fijo", icon: WalletCards },
      { href: "/nomina-especialistas", label: "Especialistas", icon: UserRoundCheck },
      { href: "/nomina-comisiones", label: "Comisiones", icon: CircleDollarSign },
      { href: "/nomina-comision-kiosco", label: "Comisión de kiosco", icon: Store },
      { href: "/nomina-honorarios", label: "Honorarios", icon: ReceiptText },
      { href: "/dispersion-nomina", label: "Dispersión de nómina", icon: Landmark },
    ],
  },
  {
    id: "operations",
    label: "Operación",
    items: [
      { href: "/calculo-comisiones", label: "Cálculo de comisiones", icon: Calculator },
      { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
      { href: "/prestamos-adelantos", label: "Préstamos", icon: HandCoins },
    ],
  },
  {
    id: "settings",
    label: "Configuración",
    items: [
      { href: "/configuracion", label: "Periodos y conceptos", icon: TrendingUp },
      { href: "/esquemas", label: "Esquemas de comisión", icon: Layers3 },
      { href: "/esquemas-sucursal", label: "Esquemas por sucursal", icon: Network },
      { href: "/bonos-multas", label: "Bonos y multas", icon: Sparkles },
      { href: "/viaticos", label: "Viáticos", icon: PlaneTakeoff },
      { href: "/accesos", label: "Roles y accesos", icon: ShieldCheck },
    ],
  },
  {
    id: "reports",
    label: "Reportes",
    items: [
      { href: "/reportes/desglose-sucursal", label: "Desglose por sucursal", icon: BarChart2 },
      { href: "/recibos", label: "Recibos", icon: FileText },
      { href: "/recibos-kiosco", label: "Recibos gerenciales", icon: ReceiptText },
    ],
  },
];

function isRouteActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function getActiveSection(pathname: string): SectionId | null {
  return sections.find((section) => section.items.some((item) => isRouteActive(pathname, item.href)))?.id ?? null;
}

function TopNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, endSession } = usePayrollDemo();
  const navigationRef = useRef<HTMLElement>(null);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const activeSection = getActiveSection(pathname);
  const activeEmployee = state.employees.find((employee) => employee.id === state.activeEmployeeId);
  const activeRole = state.roles.find((role) => role.id === activeEmployee?.roleId);
  const canViewPersonalPortal = activeRole?.permissions.includes("portal.view") ?? false;
  const canManageViatics = activeRole?.id === "role-admin" && activeRole.permissions.includes("viatics.master");
  const canViewKioskReceipts = Boolean(activeEmployee?.category === "MANAGEMENT" && activeEmployee.position.includes("GERENTE") && activeRole?.permissions.includes("receipts.view"));
  const currentPage = sections.flatMap((section) => section.items).find((item) => isRouteActive(pathname, item.href))?.label ?? "Nómina";
  const visibleSections = sections.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      (item.href !== "/viaticos" || canManageViatics) &&
      (item.href !== "/recibos-kiosco" || canViewKioskReceipts),
    ),
  }));

  useEffect(() => {
    setOpenSection(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (navigationRef.current && !navigationRef.current.contains(event.target as Node)) {
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
    <header ref={navigationRef} className="sticky top-0 z-50 border-b border-[#b98d62]/35 bg-[linear-gradient(105deg,#171411_0%,#211b17_56%,#32251b_100%)] text-[#f6ecdf] shadow-[0_10px_30px_rgba(37,27,20,0.14)]">
      <div className="flex min-h-[68px] w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 lg:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 rounded-xl pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c]" aria-label="Ir al consolidado">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7b589]/40 bg-white/[0.06] shadow-inner transition-colors group-hover:bg-white/[0.1]">
            <Image src="/logo.svg" alt="Keysar Cosmetics" width={32} height={28} className="h-7 w-8 object-contain brightness-0 invert" />
          </span>
          <span className="hidden leading-none sm:block">
            <span className="block font-brand text-[15px] uppercase tracking-[0.19em] text-[#f0e4d3]">Keysar</span>
            <span className="mt-1.5 block text-[7px] font-semibold uppercase tracking-[0.16em] text-[#cda57e]">Cosmetics · Payroll</span>
          </span>
        </Link>

        <div className="hidden h-7 w-px shrink-0 bg-white/10" aria-hidden="true" />

        <nav className="order-last hidden h-10 w-full flex-none items-center justify-center gap-1 border-t border-white/10 pt-2 md:flex" aria-label="Navegación principal">
          {visibleSections.map((section) => {
            const expanded = openSection === section.id;
            const selected = activeSection === section.id;
            return (
              <div key={section.id} className="relative">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-haspopup="menu"
                  onClick={() => setOpenSection((current) => current === section.id ? null : section.id)}
                  className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-semibold uppercase tracking-[0.11em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c] ${selected || expanded ? "border-[#caa177]/55 bg-[#c59b70]/16 text-[#f8e4ca] shadow-inner" : "border-transparent text-[#d8c9ba] hover:border-white/10 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  {section.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
                {expanded && (
                  <div role="menu" className="absolute left-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-2xl border border-[#b98d62]/35 bg-[#1d1916]/[0.98] p-2 shadow-[0_22px_55px_rgba(16,12,9,0.38)] backdrop-blur-xl">
                    <div className="border-b border-white/10 px-3 pb-2 pt-1">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#cba27c]">{section.label}</p>
                      <p className="mt-0.5 text-[10px] text-[#9e9288]">{section.items.length} accesos disponibles</p>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isRouteActive(pathname, item.href);
                        return (
                          <Link key={item.href} href={item.href} role="menuitem" aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c] ${active ? "bg-[linear-gradient(90deg,#7b5738,#4b3525)] text-white" : "text-[#e2d8ce] hover:bg-white/[0.07] hover:text-white"}`}>
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${active ? "border-[#e1bd91]/45 bg-[#e1bd91]/15 text-[#f2d2aa]" : "border-white/10 bg-white/[0.04] text-[#cba27c]"}`}><Icon className="h-4 w-4" /></span>
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
          <button type="button" onClick={() => setTheme(!dark)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#d7c7b8] transition-colors hover:border-[#caa177]/45 hover:bg-[#caa177]/10 hover:text-white" aria-label={dark ? "Usar tema claro" : "Usar tema oscuro"} title={dark ? "Tema claro" : "Tema oscuro"}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          {canViewPersonalPortal && activeEmployee && (
            <Link href="/mi-nomina" aria-current={pathname.startsWith("/mi-nomina") ? "page" : undefined} className={`flex h-10 max-w-[190px] items-center gap-2 rounded-xl border px-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c] ${pathname.startsWith("/mi-nomina") ? "border-[#ddb88a]/65 bg-[#9d744d]/25" : "border-white/10 bg-white/[0.04] hover:border-[#caa177]/45 hover:bg-white/[0.07]"}`}>
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#dcb88b]/30 bg-[#dcb88b]/10"><UserCircle2 className="h-4 w-4 text-[#eccca6]" /><span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#211b17] bg-emerald-400" /></span>
              <span className="min-w-0 leading-tight"><span className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-[#cba27c]">Mi perfil</span><span className="block truncate text-[10px] font-medium text-[#f3e8dc]">{activeEmployee.name}</span></span>
            </Link>
          )}
          <button type="button" onClick={closeSession} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7c9ba]/20 bg-[#b66f63]/10 text-[#e8c5bc] transition-colors hover:border-[#e7c9ba]/45 hover:bg-[#b66f63]/20 hover:text-white" aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut className="h-4 w-4" /></button>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 md:hidden">
          <div className="hidden min-w-0 text-right"><p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#b99c81]">Sección actual</p><p className="max-w-32 truncate text-[11px] font-semibold text-white">{currentPage}</p></div>
          <button type="button" onClick={() => setMobileOpen((current) => !current)} aria-expanded={mobileOpen} aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d1aa82]/30 bg-white/[0.06] text-[#f0dcc5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b28c]">{mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
        </div>
      </div>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full max-h-[calc(100vh-68px)] overflow-y-auto border-t border-white/10 bg-[#181512]/[0.99] p-3 shadow-2xl md:hidden">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {visibleSections.map((section) => {
              const expanded = openSection === section.id || activeSection === section.id;
              return (
                <section key={section.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]">
                  <button type="button" aria-expanded={expanded} onClick={() => setOpenSection((current) => current === section.id ? null : section.id)} className={`flex w-full items-center justify-between px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.13em] ${activeSection === section.id ? "text-[#efc99e]" : "text-[#ddd0c3]"}`}><span>{section.label}</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>
                  {expanded && <div className="space-y-0.5 border-t border-white/10 p-1.5">{section.items.map((item) => { const Icon = item.icon; const active = isRouteActive(pathname, item.href); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ${active ? "bg-[#8a6342]/45 text-white" : "text-[#d8cec4] hover:bg-white/[0.06]"}`}><Icon className="h-3.5 w-3.5 text-[#cba27c]" />{item.label}</Link>; })}</div>}
                </section>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            {canViewPersonalPortal && activeEmployee && <Link href="/mi-nomina" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#caa177]/30 bg-[#caa177]/10 px-3 py-2.5"><UserCircle2 className="h-4 w-4 shrink-0 text-[#e7c395]" /><span className="min-w-0"><span className="block text-[8px] uppercase tracking-[0.13em] text-[#cba27c]">Mi perfil</span><span className="block truncate text-[10px] text-white">{activeEmployee.name}</span></span></Link>}
            <button type="button" onClick={() => setTheme(!dark)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-[#e2d4c6]" aria-label={dark ? "Usar tema claro" : "Usar tema oscuro"}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            <button type="button" onClick={closeSession} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#b66f63]/35 text-[#e8bdb3]" aria-label="Cerrar sesión"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </header>
  );
}

function SessionTimeoutGuard() {
  const router = useRouter();
  const { isAuthenticated, endSession } = usePayrollDemo();
  const lastActivityRef = useRef(Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    let timeoutId: number | null = null;

    function expireSession() {
      if (expiredRef.current) return;
      expiredRef.current = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      endSession();
      router.replace("/login");
      toast.warning("Sesión cerrada por 3 minutos sin actividad. Vuelve a ingresar.");
    }

    function scheduleExpiration() {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = SESSION_IDLE_LIMIT_MS - elapsed;
      if (remaining <= 0) {
        expireSession();
        return;
      }
      timeoutId = window.setTimeout(() => {
        if (Date.now() - lastActivityRef.current >= SESSION_IDLE_LIMIT_MS) {
          expireSession();
        } else {
          scheduleExpiration();
        }
      }, remaining);
    }

    function registerActivity() {
      if (expiredRef.current) return;
      lastActivityRef.current = Date.now();
      scheduleExpiration();
    }

    function registerPointerMovement() {
      if (Date.now() - lastActivityRef.current >= 1000) registerActivity();
    }

    function checkElapsedTime() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivityRef.current >= SESSION_IDLE_LIMIT_MS) {
        expireSession();
      } else {
        scheduleExpiration();
      }
    }

    expiredRef.current = false;
    lastActivityRef.current = Date.now();
    scheduleExpiration();
    window.addEventListener("pointerdown", registerActivity, { passive: true });
    window.addEventListener("mousemove", registerPointerMovement, { passive: true });
    window.addEventListener("keydown", registerActivity);
    window.addEventListener("scroll", registerActivity, { passive: true, capture: true });
    window.addEventListener("touchstart", registerActivity, { passive: true });
    document.addEventListener("visibilitychange", checkElapsedTime);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("pointerdown", registerActivity);
      window.removeEventListener("mousemove", registerPointerMovement);
      window.removeEventListener("keydown", registerActivity);
      window.removeEventListener("scroll", registerActivity, true);
      window.removeEventListener("touchstart", registerActivity);
      document.removeEventListener("visibilitychange", checkElapsedTime);
    };
  }, [endSession, isAuthenticated, router]);

  return null;
}

export function PayrollShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden">
      <SessionTimeoutGuard />
      <TopNavigation />
      <main className="min-w-0 w-full max-w-none p-4 md:p-6 xl:px-8 xl:py-7">{children}</main>
    </div>
  );
}
