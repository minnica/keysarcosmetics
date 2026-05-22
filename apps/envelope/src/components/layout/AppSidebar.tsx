'use client'
// Sidebar colapsable de la aplicación envelope
// Estado (abierto/cerrado) persistido en localStorage
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ShoppingCart, Users, Building2, CreditCard,
  LayoutDashboard, BarChart2, CalendarDays, UserCheck,
  CalendarRange, TrendingUp, Package2, PanelLeftClose, PanelLeftOpen,
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
  { label: 'Métodos de pago',  href: '/metodos-pago',  icon: CreditCard },
]

const REPORTES: NavItem[] = [
  { label: 'Dashboard',               href: '/',                                 icon: LayoutDashboard },
  { label: 'Detalle método de pago',  href: '/reportes/detalle-metodo-pago',     icon: BarChart2 },
  { label: 'Método de pago por día',  href: '/reportes/metodo-pago-por-dia',     icon: CalendarDays },
  { label: 'Ventas por vendedor',     href: '/reportes/ventas-por-vendedor',     icon: UserCheck },
  { label: 'Ventas vendedor por día', href: '/reportes/ventas-por-vendedor-dia', icon: CalendarRange },
  { label: 'Total general',           href: '/reportes/total-general',           icon: TrendingUp },
]

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
        'flex items-center rounded-lg px-3 py-2 text-sm transition-colors',
        collapsed ? 'justify-center gap-0' : 'gap-3',
        isActive
          ? 'bg-rose-50 text-rose-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-rose-600' : 'text-gray-400')} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

interface NavSectionProps { title: string; items: NavItem[]; collapsed: boolean }

function NavSection({ title, items, collapsed }: NavSectionProps) {
  return (
    <div>
      {/* El título de sección solo se muestra expandido */}
      {!collapsed && (
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </p>
      )}
      {/* Separador visual en modo colapsado */}
      {collapsed && <div className="my-2 border-t border-gray-100" />}
      <nav className="space-y-0.5">
        {items.map(item => <NavLink key={item.href} item={item} collapsed={collapsed} />)}
      </nav>
    </div>
  )
}

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-gray-200 bg-white',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-14' : 'w-64'
      )}
    >
      {/* ── Header con logo y botón de toggle ── */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-3">
        {/* Logo: completo cuando expandido, solo ícono cuando colapsado */}
        {collapsed ? (
          <Package2 className="mx-auto h-5 w-5 text-rose-600" />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Package2 className="h-5 w-5 text-rose-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight truncate">Cosmetics</p>
              <p className="text-xs text-gray-400">Sobre de ventas</p>
            </div>
          </div>
        )}

        {/* Botón de toggle — siempre en el header, nunca absoluto */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <ToggleIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ── Navegación ── */}
      <nav
        className={cn(
          'flex-1 space-y-4 overflow-y-auto overflow-x-hidden',
          collapsed ? 'px-1 py-3' : 'p-4'
        )}
      >
        <NavSection title="Formularios" items={FORMULARIOS} collapsed={collapsed} />
        <NavSection title="Reportes"    items={REPORTES}    collapsed={collapsed} />
      </nav>

      {/* ── Footer ── */}
      {!collapsed && (
        <div className="border-t border-gray-200 p-4">
          <p className="text-xs text-gray-400 text-center">Envelope v1.0</p>
        </div>
      )}
    </aside>
  )
}
