"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BadgeDollarSign,
  BarChart2,
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

const sections = [
  {
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
    label: "Operación",
    items: [
      {
        href: "/",
        label: "Resumen",
        icon: LayoutDashboard,
        status: "under-review" as const,
      },
      { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
      { href: "/gastos", label: "Gastos", icon: ReceiptText },
      { href: "/prestamos-adelantos", label: "Préstamos", icon: HandCoins },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/esquemas", label: "Esquemas", icon: TrendingUp },
      { href: "/bonos", label: "Bonos", icon: BadgeDollarSign },
      { href: "/multas", label: "Multas", icon: Gavel },
      { href: "/viaticos", label: "Viáticos", icon: Plane },
    ],
  },
  {
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
    <div className="space-y-1 px-2 py-0.5 group-data-[collapsible=icon]:hidden">
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
        Tema
      </div>
      <div
        className="flex rounded-md border border-[var(--border-color)] p-0.5"
        role="radiogroup"
        aria-label="Tema visual"
      >
        {[
          { value: false, label: "Claro", icon: Sun },
          { value: true, label: "Oscuro", icon: Moon },
        ].map((option) => {
          const selected = dark === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(option.value)}
              className={`flex h-6 flex-1 cursor-pointer items-center justify-center gap-1 rounded-[6px] text-[10px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${selected ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]"}`}
            >
              <Icon className="h-2.5 w-2.5" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PayrollSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useSession();
  const { isMobile, setOpenMobile } = useSidebar();

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
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(195,165,131,0.75)]">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const isUnderReview = item.status === "under-review";
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={
                          isUnderReview
                            ? `${item.label} (en revisión)`
                            : item.label
                        }
                        onClick={() => setOpenMobile(false)}
                        className={
                          isActive
                            ? "!bg-[var(--sidebar-active-bg)] !text-[var(--sidebar-active-text)] hover:!bg-[var(--sidebar-active-bg)] hover:!text-[var(--sidebar-active-text)]"
                            : undefined
                        }
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span
                            className={
                              isUnderReview
                                ? "text-[var(--text-muted)] line-through decoration-current"
                                : undefined
                            }
                          >
                            {item.label}
                          </span>
                          {isUnderReview ? (
                            <span className="sr-only">
                              En revisión; probablemente se eliminará.
                            </span>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter
        className="border-t p-2"
        style={{ borderColor: "var(--border-color)" }}
      >
        <ThemeToggle />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                logout();
                router.push("/login");
              }}
              tooltip="Cerrar sesión"
              className="cursor-pointer justify-center rounded-lg bg-[#ecd1c8] text-[#1a1a1a] transition-colors hover:opacity-90"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="pb-1 text-center text-[10px] uppercase tracking-wider text-[var(--text-muted)] group-data-[collapsible=icon]:hidden">
          Nómina segura
        </p>
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
