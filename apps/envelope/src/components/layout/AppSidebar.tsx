'use client'
// Sidebar colapsable con identidad de marca Keysar Cosmetics
// Toggle dark/light autonomo — persiste en localStorage con clave 'keysar-theme'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ShoppingCart, Users, Building2, CreditCard,
  LayoutDashboard, BarChart2, CalendarDays, UserCheck,
  CalendarRange, TrendingUp, PanelLeftClose, PanelLeftOpen,
  Sun, Moon,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const FORMULARIOS: NavItem[] = [
  { label: 'Ventas',           href: '/ventas',        icon: ShoppingCart },
  { label: 'Empleados',        href: '/empleados',     icon: Users },
  { label: 'Sucursales',       href: '/sucursales',    icon: Building2 },
  { label: 'Metodos de pago',  href: '/metodos-pago',  icon: CreditCard },
]

const REPORTES: NavItem[] = [
  { label: 'Dashboard',               href: '/',                                 icon: LayoutDashboard },
  { label: 'Detalle metodo de pago',  href: '/reportes/detalle-metodo-pago',     icon: BarChart2 },
  { label: 'Metodo de pago por dia',  href: '/reportes/metodo-pago-por-dia',     icon: CalendarDays },
  { label: 'Ventas por vendedor',     href: '/reportes/ventas-por-vendedor',     icon: UserCheck },
  { label: 'Ventas vendedor por dia', href: '/reportes/ventas-por-vendedor-dia', icon: CalendarRange },
  { label: 'Total general',           href: '/reportes/total-general',           icon: TrendingUp },
]

// Toggle de tema (autonomo)
function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('keysar-theme')
    setDark(saved === 'dark')
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('keysar-theme', next ? 'dark' : 'light')
  }

  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <button
          onClick={toggle}
          title={dark ? 'Modo claro' : 'Modo oscuro'}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer hover:bg-[var(--accent-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)', fontSize: '0.69rem' }}>
        <Sun className="h-3 w-3" />
        <span className="uppercase tracking-wider">Claro</span>
      </div>
      <button
        onClick={toggle}
        role="switch"
        aria-checked={dark}
        title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--accent)]'
        )}
        style={{ backgroundColor: dark ? 'var(--accent)' : 'var(--border-color)' }}
      >
        <span className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          dark ? 'translate-x-4' : 'translate-x-0'
        )} />
      </button>
      <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)', fontSize: '0.69rem' }}>
        <span className="uppercase tracking-wider">Oscuro</span>
        <Moon className="h-3 w-3" />
      </div>
    </div>
  )
}

// NavLink con colores de marca
interface NavLinkProps { item: NavItem; collapsed: boolean }

function NavLink({ item, collapsed }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === item.href
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center rounded-[10px] px-3 py-2 text-sm transition-colors duration-150 cursor-pointer',
        collapsed ? 'justify-center gap-0' : 'gap-3',
        !isActive && 'hover:bg-[var(--accent-hover)]'
      )}
      style={
        isActive
          ? { backgroundColor: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-text)' }
          : { color: 'var(--text-primary)' }
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

// NavSection con separador de marca
interface NavSectionProps { title: string; items: NavItem[]; collapsed: boolean }

function NavSection({ title, items, collapsed }: NavSectionProps) {
  return (
    <div>
      {!collapsed && (
        <p
          className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-gold)', opacity: 0.75 }}
        >
          {title}
        </p>
      )}
      {collapsed && (
        <div className="my-2 mx-2 border-t" style={{ borderColor: 'var(--border-color)' }} />
      )}
      <nav className="space-y-0.5">
        {items.map(item => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>
    </div>
  )
}

// AppSidebar principal
interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-14' : 'w-64'
      )}
      style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-color)' }}
    >
      {/* Header: Logo + boton toggle */}
      <div
        className="flex h-16 shrink-0 items-center justify-between border-b px-3"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {collapsed ? (
          <div className="mx-auto flex items-center justify-center w-8 h-8">
            <img
              src="/logo.svg"
              alt="Keysar"
              className="object-contain"
              style={{ width: '28px', height: '28px' }}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center min-w-0 pr-2">
            <img
              src="/logo.svg"
              alt="Keysar Cosmetics"
              className="object-contain"
              style={{ maxWidth: '140px', height: 'auto', maxHeight: '44px' }}
            />
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          className="shrink-0 rounded-md p-1.5 transition-colors cursor-pointer hover:bg-[var(--accent-hover)]"
          style={{ color: 'var(--text-muted)' }}
        >
          <ToggleIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Toggle dark / light */}
      <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* Navegacion */}
      <nav
        className={cn(
          'flex-1 space-y-5 overflow-y-auto overflow-x-hidden',
          collapsed ? 'px-1 py-3' : 'p-4'
        )}
      >
        <NavSection title="Formularios" items={FORMULARIOS} collapsed={collapsed} />
        <NavSection title="Reportes"    items={REPORTES}    collapsed={collapsed} />
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t p-4" style={{ borderColor: 'var(--border-color)' }}>
          <p
            className="text-[10px] text-center tracking-wider uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Envelope v1.0
          </p>
        </div>
      )}
    </aside>
  )
}
