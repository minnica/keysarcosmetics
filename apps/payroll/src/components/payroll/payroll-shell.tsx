"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BadgeDollarSign,
  BarChart2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Gavel,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Moon,
  Plane,
  ReceiptText,
  Sun,
  TrendingUp,
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
import { PayrollDataProvider } from "./payroll-data-context";
import { useSession } from "@/lib/session";

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
    ],
  },
  {
    id: "operations",
    label: "Operación",
    items: [
      {
        href: "/",
        label: "Resumen",
        icon: LayoutDashboard,
      },
      { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
      { href: "/gastos", label: "Gastos", icon: ReceiptText },
      { href: "/prestamos-adelantos", label: "Préstamos", icon: HandCoins },
    ],
  },
  {
    id: "settings",
    label: "Configuración",
    items: [
      { href: "/esquemas", label: "Esquemas", icon: TrendingUp },
      { href: "/bonos", label: "Bonos", icon: BadgeDollarSign },
      { href: "/multas", label: "Multas", icon: Gavel },
      { href: "/viaticos", label: "Viáticos", icon: Plane },
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
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
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

function PayrollSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useSession();
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const activeSection = getActiveSection(pathname);
  const [expandedSection, setExpandedSection] = useState<SectionId | null>(
    activeSection,
  );

  useEffect(() => {
    setExpandedSection(activeSection);
  }, [activeSection]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className="border-b p-0"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="hidden h-16 flex-col items-center justify-center gap-1 group-data-[collapsible=icon]:flex">
          <img
            src="/logo.svg"
            alt="Keysar Cosmetics"
            className="h-6 w-6 object-contain"
          />
          <SidebarTrigger className="text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]" />
        </div>
        <div className="relative flex flex-col items-center gap-1 px-3 pb-1 pt-3 group-data-[collapsible=icon]:hidden">
          {isMobile ? (
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              aria-label="Cerrar menú"
              className="absolute right-2 top-2 cursor-pointer rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <SidebarTrigger className="absolute right-2 top-2 text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]" />
          )}
          <img
            src="/logo.svg"
            alt="Keysar Cosmetics"
            className="h-auto max-w-[52px] object-contain"
          />
          <span className="font-brand text-lg uppercase tracking-widest text-[var(--text-primary)]">
            Keysar Cosmetics
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {sections.map((section) => {
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
                      {section.items.length}
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
                  {section.items.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          onClick={() => setOpenMobile(false)}
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
  return (
    <PayrollDataProvider>
      <SidebarProvider>
        <PayrollSidebar />
        <SidebarInset className="min-w-0 overflow-x-hidden">
          <header
            className="flex h-12 shrink-0 items-center gap-3 border-b px-4 md:hidden"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--bg-card)",
            }}
          >
            <SidebarTrigger className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
            <img
              src="/logo.svg"
              alt="Keysar Cosmetics"
              className="h-6 object-contain"
              style={{ maxWidth: "100px" }}
            />
          </header>
          <div className="min-w-0 p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </PayrollDataProvider>
  );
}
