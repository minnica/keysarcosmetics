'use client'
// Sidebar de la app Envelope — usa el Sidebar canónico de shadcn desde @cosmetics/ui
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ShoppingCart, Users, Building2, CreditCard,
  LayoutDashboard, BarChart2, CalendarDays, UserCheck,
  CalendarRange, TrendingUp, Sun, Moon, X, LogOut,
  Landmark, Briefcase,
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
  { label: 'Bancos',          href: '/bancos',        icon: Landmark },
  { label: 'Puestos',         href: '/puestos',       icon: Briefcase },
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
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()

  function handleNavClick() {
    setOpenMobile(false)
  }

  function handleLogout() {
    localStorage.removeItem('auth_token')
    router.push('/login')
  }

  return (
    <Sidebar collapsible="icon">
      {/*
        Header: logo + control de colapso/cierre
        - Desktop expanded : logo a la izquierda + SidebarTrigger a la derecha   (Fix 1)
        - Desktop collapsed: solo SidebarTrigger centrado                         (Fix 1)
        - Mobile Sheet    : logo a la izquierda + botón X a la derecha            (Fix 2)
      */}
      <SidebarHeader className="p-0 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {/* Colapsado: logo + trigger para expandir */}
        <div className="hidden group-data-[collapsible=icon]:flex h-16 flex-col items-center justify-center gap-1">
          <img
            src="/logo.svg"
            alt="Keysar Cosmetics"
            className="object-contain"
            style={{ width: '24px', height: '24px' }}
          />
          <SidebarTrigger
            className="text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]"
          />
        </div>

        {/* Expandido: logo arriba + texto abajo + trigger en esquina */}
        <div className="group-data-[collapsible=icon]:hidden relative flex flex-col items-center gap-1 pt-3 pb-1 px-3">
          {isMobile ? (
            <button
              onClick={() => setOpenMobile(false)}
              aria-label="Cerrar menú"
              className="absolute top-2 right-2 rounded-md p-1.5 transition-colors hover:bg-[var(--accent-hover)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <SidebarTrigger
              className="absolute top-2 right-2 text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]"
            />
          )}
          <img
            src="/logo.svg"
            alt="Keysar Cosmetics"
            className="object-contain"
            style={{ maxWidth: '52px', height: 'auto' }}
          />
          <span
            className="font-brand font-bold text-lg tracking-widest uppercase"
            style={{ color: 'var(--text-primary)' }}
          >
            Keysar Cosmetics
          </span>
        </div>

        {/* Theme toggle — solo visible en expandido */}
        <div
          className="px-3 py-2 border-t group-data-[collapsible=icon]:hidden"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <ThemeToggle />
        </div>
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

      {/* Footer: cerrar sesión + versión */}
      <SidebarFooter className="border-t p-2" style={{ borderColor: 'var(--border-color)' }}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Cerrar sesión"
              className="justify-center cursor-pointer rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#ecd1c8', color: '#1a1a1a' }}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p
          className="text-center text-[10px] uppercase tracking-wider pb-1 group-data-[collapsible=icon]:hidden"
          style={{ color: 'var(--text-muted)' }}
        >
          Envelope v1.0
        </p>
      </SidebarFooter>

      {/* Rail — handle secundario para colapsar/expandir en desktop (complementa el trigger del header) */}
      <SidebarRail />
    </Sidebar>
  )
}
