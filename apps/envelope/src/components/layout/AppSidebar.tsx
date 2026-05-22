'use client'
// Sidebar persistente de la aplicación envelope
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ShoppingCart, Users, Building2, CreditCard,
  LayoutDashboard, BarChart2, CalendarDays, UserCheck,
  CalendarRange, TrendingUp, Package2,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const FORMULARIOS: NavItem[] = [
  { label: 'Ventas', href: '/ventas', icon: ShoppingCart },
  { label: 'Empleados', href: '/empleados', icon: Users },
  { label: 'Sucursales', href: '/sucursales', icon: Building2 },
  { label: 'Métodos de pago', href: '/metodos-pago', icon: CreditCard },
]

const REPORTES: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Detalle método de pago', href: '/reportes/detalle-metodo-pago', icon: BarChart2 },
  { label: 'Método de pago por día', href: '/reportes/metodo-pago-por-dia', icon: CalendarDays },
  { label: 'Ventas por vendedor', href: '/reportes/ventas-por-vendedor', icon: UserCheck },
  { label: 'Ventas vendedor por día', href: '/reportes/ventas-por-vendedor-dia', icon: CalendarRange },
  { label: 'Total general', href: '/reportes/total-general', icon: TrendingUp },
]

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  // Activo exacto para / y para el resto prefijo
  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-rose-50 text-rose-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-rose-600' : 'text-gray-400')} />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <nav className="space-y-0.5">
        {items.map(item => <NavLink key={item.href} item={item} />)}
      </nav>
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5">
        <Package2 className="h-6 w-6 text-rose-600" />
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Cosmetics</p>
          <p className="text-xs text-gray-400">Sobre de ventas</p>
        </div>
      </div>
      {/* Navegación */}
      <nav className="flex-1 space-y-5 overflow-y-auto p-4">
        <NavSection title="Formularios" items={FORMULARIOS} />
        <NavSection title="Reportes" items={REPORTES} />
      </nav>
      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <p className="text-xs text-gray-400 text-center">Envelope v1.0</p>
      </div>
    </aside>
  )
}
