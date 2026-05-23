'use client'
// Sidebar de la app Envelope — usa el Sidebar canónico de shadcn desde @cosmetics/ui
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart, Users, Building2, CreditCard,
  LayoutDashboard, BarChart2, CalendarDays, UserCheck,
  CalendarRange, TrendingUp, Sun, Moon, X,
} from 'lucide-react'
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
} from '@cosmetics/ui'

// ── Navegación ────────────────────────────────────────────────────────────────
interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const FORMULARIOS: NavItem[] = [
  { label: 'Ventas',          href: '/ventas',       icon: ShoppingCart },
  { label: 'Empleados',       href: '/empleados',    icon: Users },
  { label: 'Sucursales',      href: '/sucursales',   icon: Building2 },
  { label: 'Metodos de pago', href: '/metodos-pago', icon: CreditCard },
]

const REPORTES: NavItem[] = [
  { label: 'Dashboard',               href: '/',                                 icon: LayoutDashboard },
  { label: 'Detalle metodo de pago',  href: '/reportes/detalle-metodo-pago',     icon: BarChart2 },
  { label: 'Metodo de pago por dia',  href: '/reportes/metodo-pago-por-dia',     icon: CalendarDays },
  { label: 'Ventas por vendedor',     href: '/reportes/ventas-por-vendedor',     icon: UserCheck },
  { label: 'Ventas vendedor por dia', href: '/reportes/ventas-por-vendedor-dia', icon: CalendarRange },
  { label: 'Total general',           href: '/reportes/total-general',           icon: TrendingUp },
]

// ── Toggle de tema (dark / light) ─────────────────────────────────────────────
function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(localStorage.getItem('keysar-theme') === 'dark')
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('keysar-theme', next ? 'dark' : 'light')
  }

  return (
    <div className="flex items-center justify-between px-2 py-1">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        <Sun className="h-3 w-3" />
        <span>Claro</span>
      </div>
      <button
        onClick={toggle}
        role="switch"
        aria-checked={dark}
        title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        style={{ backgroundColor: dark ? 'var(--accent)' : 'var(--border-color)' }}
      >
        <span
          className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          style={{ transform: dark ? 'translateX(1rem)' : 'translateX(0)' }}
        />
      </button>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        <span>Oscuro</span>
        <Moon className="h-3 w-3" />
      </div>
    </div>
  )
}

// ── AppSidebar ────────────────────────────────────────────────────────────────
export function AppSidebar() {
  const pathname = usePathname()
  // Fix 2 + 3: isMobile para botón X de cierre; setOpenMobile para auto-close al navegar
  const { isMobile, setOpenMobile } = useSidebar()

  function handleNavClick() {
    // Fix 3: cerrar el Sheet en mobile al seleccionar cualquier opción de navegación
    setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
      {/*
        Header: logo + control de colapso/cierre
        - Desktop expanded : logo a la izquierda + SidebarTrigger a la derecha   (Fix 1)
        - Desktop collapsed: solo SidebarTrigger centrado                         (Fix 1)
        - Mobile Sheet    : logo a la izquierda + botón X a la derecha            (Fix 2)
      */}
      <SidebarHeader
        className="h-16 flex-row items-center justify-between border-b px-3 group-data-[collapsible=icon]:justify-center"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {/* Logo: oculto cuando el sidebar está colapsado en desktop */}
        <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
          <img
            src="/logo.svg"
            alt="Keysar Cosmetics"
            className="object-contain"
            style={{ maxWidth: '140px', height: 'auto', maxHeight: '44px' }}
          />
        </div>

        {/* Fix 1 + 2: botón diferente según contexto */}
        {isMobile ? (
          // Mobile: X explícita para cerrar el Sheet (universalmente entendida)
          <button
            onClick={() => setOpenMobile(false)}
            aria-label="Cerrar menú"
            className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-[var(--accent-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          // Desktop: SidebarTrigger visible para colapsar/expandir
          <SidebarTrigger
            className="shrink-0 text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]"
          />
        )}
      </SidebarHeader>

      {/* Navegación */}
      <SidebarContent className="py-2">
        {/* Grupo Formularios */}
        <SidebarGroup>
          <SidebarGroupLabel
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'rgba(195, 165, 131, 0.75)' }}
          >
            Formularios
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {FORMULARIOS.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      // Fix 3: cerrar sidebar mobile al navegar
                      onClick={handleNavClick}
                      className={
                        isActive
                          ? '!bg-[var(--sidebar-active-bg)] !text-[var(--sidebar-active-text)] hover:!bg-[var(--sidebar-active-bg)] hover:!text-[var(--sidebar-active-text)]'
                          : undefined
                      }
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Grupo Reportes */}
        <SidebarGroup>
          <SidebarGroupLabel
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'rgba(195, 165, 131, 0.75)' }}
          >
            Reportes
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {REPORTES.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      // Fix 3: cerrar sidebar mobile al navegar
                      onClick={handleNavClick}
                      className={
                        isActive
                          ? '!bg-[var(--sidebar-active-bg)] !text-[var(--sidebar-active-text)] hover:!bg-[var(--sidebar-active-bg)] hover:!text-[var(--sidebar-active-text)]'
                          : undefined
                      }
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: toggle de tema + versión */}
      <SidebarFooter className="border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="group-data-[collapsible=icon]:hidden">
          <ThemeToggle />
          <p
            className="mt-1 text-center text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Envelope v1.0
          </p>
        </div>
      </SidebarFooter>

      {/* Rail — handle secundario para colapsar/expandir en desktop (complementa el trigger del header) */}
      <SidebarRail />
    </Sidebar>
  )
}
