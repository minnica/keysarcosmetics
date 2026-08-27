"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart2,
  Calculator,
  ChevronRight,
  ChevronDown,
  CircleDollarSign,
  FileText,
  HandCoins,
  Layers3,
  LayoutDashboard,
  LogOut,
  Moon,
  Network,
  PlaneTakeoff,
  Pin,
  PinOff,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  TrendingUp,
  UserCircle2,
  UserRoundCheck,
  WalletCards,
  X,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@cosmetics/ui";
import { PayrollDemoProvider, usePayrollDemo } from "./payroll-demo-context";

type SectionId = "payroll" | "operations" | "settings" | "reports";
type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};
type NavSection = {
  id: SectionId;
  label: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    id: "payroll",
    label: "Nómina",
    items: [
      {
        href: "/",
        label: "Consolidado",
        icon: LayoutDashboard,
      },
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
      {
        href: "/nomina-honorarios",
        label: "Honorarios",
        icon: ReceiptText,
      },
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
      {
        href: "/reportes/desglose-sucursal",
        label: "Desglose por sucursal",
        icon: BarChart2,
      },
      { href: "/recibos", label: "Recibos", icon: FileText },
      { href: "/recibos-kiosco", label: "Recibos gerenciales", icon: ReceiptText },
    ],
  },
];

const SECTION_LABEL_CLASS_NAME =
  "text-[10px] font-sans font-semibold uppercase tracking-[0.14em]";

const SECTION_LABEL_STYLE: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontFamily: "'Gilroy', 'Inter', sans-serif",
  fontWeight: 600,
};

function isRouteActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function getActiveSection(pathname: string): SectionId | null {
  return (
    sections.find((section) =>
      section.items.some((item) => isRouteActive(pathname, item.href)),
    )?.id ?? null
  );
}

function PreferenceToggle({
  label,
  valueLabel,
  checked,
  icon: Icon,
  onCheckedChange,
}: {
  label: string;
  valueLabel: string;
  checked: boolean;
  icon: React.ElementType;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label}: ${valueLabel}`}
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-200 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      onClick={() => onCheckedChange(!checked)}
    >
      <Icon
        className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 text-xs font-medium text-[var(--text-primary)]">
        {label}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {valueLabel}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 motion-reduce:transition-none ${
          checked
            ? "border-[var(--accent)] bg-[var(--accent)]"
            : "border-[var(--border-color)] bg-[var(--input-disabled-bg)]"
        }`}
      >
        <span
          className={`absolute left-0 top-0.5 h-3.5 w-3.5 rounded-full border transition-[transform,background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none ${
            checked
              ? "translate-x-[17px] border-white/80 bg-white shadow-sm"
              : "translate-x-0.5 border-[var(--color-gold)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(79,74,68,0.32)]"
          }`}
        />
      </span>
    </button>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(localStorage.getItem("keysar-theme") === "dark");
  }, []);

  function setTheme(nextDark: boolean) {
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("keysar-theme", nextDark ? "dark" : "light");
  }

  return (
    <PreferenceToggle
      label="Tema"
      valueLabel={dark ? "Oscuro" : "Claro"}
      checked={dark}
      icon={dark ? Moon : Sun}
      onCheckedChange={setTheme}
    />
  );
}

function PayrollSidebar({
  pinned,
  onPinnedChange,
}: {
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = usePayrollDemo();
  const activeEmployee = state.employees.find((employee) => employee.id === state.activeEmployeeId);
  const activeRole = state.roles.find((role) => role.id === activeEmployee?.roleId);
  const canViewPersonalPortal = activeRole?.permissions.includes("portal.view") ?? false;
  const canManageViatics = activeRole?.id === "role-admin" && activeRole.permissions.includes("viatics.master");
  const canViewKioskReceipts = Boolean(activeEmployee?.category === "MANAGEMENT" && activeEmployee.position.includes("GERENTE") && activeRole?.permissions.includes("receipts.view"));
  const { isMobile, setOpen, setOpenMobile, state: sidebarState } = useSidebar();
  const activeSection = getActiveSection(pathname);
  const [expandedSection, setExpandedSection] = useState<SectionId | null>(
    activeSection,
  );

  useEffect(() => {
    setExpandedSection(activeSection);
  }, [activeSection]);

  function handleLogout() {
    router.push("/login");
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      onMouseLeave={() => {
        if (!isMobile && !pinned) setOpen(false);
      }}
    >
      <SidebarHeader
        className="border-b p-0"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="relative flex min-h-[92px] items-center gap-3 px-3.5 py-4">
          <span className="payroll-brand-mark flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <img
              src="/logo.svg"
              alt="Keysar Cosmetics"
              className="h-8 w-9 object-contain"
            />
          </span>
          <span className="min-w-0 pr-14 leading-none">
            <span className="payroll-brand-name block font-brand text-[17px] uppercase tracking-[0.19em]">Keysar</span>
            <span className="mt-2 block text-[8px] font-semibold uppercase tracking-[0.15em] text-[#b99473]">Cosmetics · Payroll</span>
          </span>
          {isMobile ? (
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border border-[#d9b38e]/25 bg-white/[0.06] text-[#d1aa87] transition-colors hover:border-[#e2be9d]/60 hover:bg-[#d5a982]/15 hover:text-[#f5dfca]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
              <button
                type="button"
                aria-pressed={pinned}
                aria-label={pinned ? "Desfijar menú lateral" : "Fijar menú lateral"}
                title={pinned ? "Desfijar menú" : "Fijar menú"}
                onClick={() => onPinnedChange(!pinned)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  pinned
                    ? "border-[#8bb79e]/65 bg-[#4c8162]/20 text-[#a8d4bb]"
                    : "border-[#d9b38e]/25 bg-white/[0.06] text-[#d1aa87] hover:border-[#e2be9d]/60 hover:bg-[#d5a982]/15 hover:text-[#f5dfca]"
                }`}
              >
                {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              <SidebarTrigger className="h-8 w-8 rounded-lg" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {sections.map((section) => {
          const visibleItems = section.items.filter((item) =>
            (item.href !== "/viaticos" || canManageViatics) &&
            (item.href !== "/recibos-kiosco" || canViewKioskReceipts),
          );
          const isExpanded = expandedSection === section.id;
          const showItems =
            (!isMobile && sidebarState === "collapsed") || isExpanded;

          return (
            <SidebarGroup key={section.id}>
              <SidebarGroupLabel asChild>
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`payroll-sidebar-section-${section.id}`}
                  onClick={() =>
                    setExpandedSection(isExpanded ? null : section.id)
                  }
                  className={`${SECTION_LABEL_CLASS_NAME} w-full cursor-pointer justify-between transition-colors duration-200 hover:bg-[var(--accent-hover)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none`}
                  style={SECTION_LABEL_STYLE}
                >
                  <span className="truncate">{section.label}</span>
                  <span
                    className="flex items-center gap-1.5"
                    aria-hidden="true"
                  >
                    <span className="min-w-4 text-center text-[10px] tabular-nums text-[var(--text-muted)]">
                      {visibleItems.length}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </button>
              </SidebarGroupLabel>
              <SidebarGroupContent
                id={`payroll-sidebar-section-${section.id}`}
                hidden={!showItems}
              >
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = isRouteActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          onClick={() => {
                            setOpenMobile(false);
                            if (!pinned) setOpen(false);
                          }}
                          className={
                            isActive
                              ? "!bg-[var(--sidebar-active-bg)] !text-[var(--sidebar-active-text)] hover:!bg-[var(--sidebar-active-bg)] hover:!text-[var(--sidebar-active-text)]"
                              : undefined
                          }
                        >
                          <Link
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
        {canViewPersonalPortal && activeEmployee && (
          <div className="mt-auto px-2 pb-2 pt-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="lg"
                  isActive={pathname.startsWith("/mi-nomina")}
                  tooltip="Mi perfil"
                  onClick={() => {
                    setOpenMobile(false);
                    if (!pinned) setOpen(false);
                  }}
                  className={`group/profile relative !h-[68px] overflow-hidden rounded-2xl border px-2.5 text-white shadow-[0_10px_28px_rgba(24,18,13,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:text-white hover:shadow-[0_14px_34px_rgba(24,18,13,0.26)] group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!rounded-xl group-data-[collapsible=icon]:!p-1 ${
                    pathname.startsWith("/mi-nomina")
                      ? "border-[#d9b77d] bg-[linear-gradient(135deg,#171513_0%,#30261f_58%,#8b6740_150%)] ring-1 ring-[#d9b77d]/35"
                      : "border-[#8f7558]/55 bg-[linear-gradient(135deg,#211e1b_0%,#372d25_65%,#6e5237_145%)] hover:border-[#d9b77d]/80"
                  }`}
                >
                  <Link href="/mi-nomina" aria-current={pathname.startsWith("/mi-nomina") ? "page" : undefined} aria-label={`Abrir mi perfil de ${activeEmployee.name}`}>
                    <span aria-hidden="true" className="pointer-events-none absolute -right-5 -top-7 h-20 w-20 rounded-full bg-[#d9b77d]/10 blur-xl" />
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e8cfaa]/35 bg-white/10 shadow-inner group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                      <UserCircle2 className="!h-5 !w-5 text-[#eed8b6]" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#29231e] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                    </span>
                    <span className="profile-copy relative min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-[#d9b77d]">Acceso personal</span>
                      <span className="mt-0.5 block font-serif text-[15px] font-semibold tracking-[0.01em] text-white">Mi perfil</span>
                      <span className="mt-0.5 block truncate text-[10px] text-[#d8cec3]">{activeEmployee.name}</span>
                    </span>
                    <span className="profile-arrow relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] transition-all duration-300 group-hover/profile:translate-x-0.5 group-hover/profile:border-[#d9b77d]/45 group-hover/profile:bg-[#d9b77d]/10 group-data-[collapsible=icon]:hidden">
                      <ChevronRight className="!h-3.5 !w-3.5 text-[#e8cfaa]" />
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter
        className="border-t p-2"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="space-y-0.5 pb-1.5 group-data-[collapsible=icon]:hidden">
          <ThemeToggle />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Cerrar sesión"
              className="cursor-pointer justify-center rounded-lg bg-[#ecd1c8] text-[#1a1a1a] transition-colors hover:opacity-90"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function PayrollShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const currentPage = sections
    .flatMap((section) => section.items)
    .find((item) => isRouteActive(pathname, item.href))?.label ?? "Nómina";

  useEffect(() => {
    const pinned = localStorage.getItem("keysar-payroll-sidebar-pinned") === "true";
    setSidebarPinned(pinned);
    setSidebarOpen(pinned);
  }, []);

  useEffect(() => {
    if (!sidebarPinned) setSidebarOpen(false);
  }, [pathname, sidebarPinned]);

  function setPinned(pinned: boolean) {
    setSidebarPinned(pinned);
    setSidebarOpen(pinned);
    localStorage.setItem("keysar-payroll-sidebar-pinned", String(pinned));
  }

  return (
    <PayrollDemoProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div
          aria-hidden="true"
          onMouseEnter={() => {
            if (!sidebarPinned) setSidebarOpen(true);
          }}
          className={`fixed inset-y-0 left-0 z-40 hidden w-3 md:block ${sidebarOpen ? "pointer-events-none" : "cursor-e-resize"}`}
        />
        <PayrollSidebar pinned={sidebarPinned} onPinnedChange={setPinned} />
        <SidebarInset className="min-w-0 overflow-x-hidden">
          <header
            className="flex h-12 shrink-0 items-center gap-3 border-b px-4 md:px-6"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--bg-card)",
            }}
          >
            <SidebarTrigger
              aria-label={sidebarOpen ? "Ocultar menú principal" : "Mostrar menú principal"}
              className="h-8 w-8 rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-card)] text-[var(--text-muted)] shadow-sm hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]"
            />
            <button
              type="button"
              aria-pressed={sidebarPinned}
              onClick={() => setPinned(!sidebarPinned)}
              className={`hidden h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors sm:flex ${
                sidebarPinned
                  ? "border-[var(--accent)] bg-[var(--accent-hover)] text-[var(--text-primary)]"
                  : "border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--accent-hover)]"
              }`}
            >
              {sidebarPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              {sidebarPinned ? "Desfijar" : "Fijar"}
            </button>
            <div className="h-5 w-px bg-[color:var(--border-color)]" aria-hidden="true" />
            <img
              src="/logo.svg"
              alt="Keysar Cosmetics"
              className="h-5 object-contain md:hidden"
              style={{ maxWidth: "90px" }}
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Keysar Cosmetics</p>
              <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{currentPage}</p>
            </div>
          </header>
          <div className="min-w-0 w-full max-w-none p-4 md:p-6 xl:px-8 xl:py-7">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </PayrollDemoProvider>
  );
}
