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
import { useI18n, type Locale } from '@/lib/i18n'

type PreferenceOption<T extends string> = {
  value: T
  label: string
  icon?: React.ElementType
}

// ── Navegación ────────────────────────────────────────────────────────────────
interface NavItem {
  labelKey: keyof ReturnType<typeof useI18n>['t']['sidebar']
  href: string
  icon: React.ElementType
}

const FORMULARIOS: NavItem[] = [
  { labelKey: 'sales',          href: '/ventas',       icon: ShoppingCart },
  { labelKey: 'employees',      href: '/empleados',    icon: Users },
  { labelKey: 'branches',       href: '/sucursales',   icon: Building2 },
  { labelKey: 'paymentMethods', href: '/metodos-pago', icon: CreditCard },
  { labelKey: 'banks',          href: '/bancos',        icon: Landmark },
  { labelKey: 'positions',      href: '/puestos',       icon: Briefcase },
]

const REPORTES: NavItem[] = [
  { labelKey: 'dashboard',            href: '/',                                 icon: LayoutDashboard },
  { labelKey: 'paymentMethodDetail',  href: '/reportes/detalle-metodo-pago',     icon: BarChart2 },
  { labelKey: 'paymentMethodByDay',   href: '/reportes/metodo-pago-por-dia',     icon: CalendarDays },
  { labelKey: 'salesBySeller',        href: '/reportes/ventas-por-vendedor',     icon: UserCheck },
  { labelKey: 'salesBySellerDay',     href: '/reportes/ventas-por-vendedor-dia', icon: CalendarRange },
  { labelKey: 'totalGeneral',         href: '/reportes/total-general',           icon: TrendingUp },
]

function PreferenceSegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: PreferenceOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div className="space-y-1 px-2 py-0.5">
      <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="flex rounded-md border p-0.5" style={{ borderColor: 'var(--border-color)' }} role="radiogroup">
        {options.map((option) => {
          const Icon = option.icon
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={[
                'flex h-6 flex-1 cursor-pointer items-center justify-center gap-1 rounded-[6px] text-[10px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                selected
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]',
              ].join(' ')}
              onClick={() => onChange(option.value)}
            >
              {Icon ? <Icon className="h-2.5 w-2.5" /> : null}
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Toggle de tema (dark / light) ─────────────────────────────────────────────
function ThemeToggle() {
  const { t } = useI18n()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(localStorage.getItem('keysar-theme') === 'dark')
  }, [])

  function setTheme(theme: 'light' | 'dark') {
    const nextDark = theme === 'dark'
    setDark(nextDark)
    document.documentElement.classList.toggle('dark', nextDark)
    localStorage.setItem('keysar-theme', theme)
  }

  return (
    <PreferenceSegmentedControl
      label={t.sidebar.theme}
      value={dark ? 'dark' : 'light'}
      onChange={setTheme}
      options={[
        { value: 'light', label: t.sidebar.light, icon: Sun },
        { value: 'dark', label: t.sidebar.dark, icon: Moon },
      ]}
    />
  )
}

function LanguageToggle() {
  const { locale, setLocale, t } = useI18n()

  return (
    <PreferenceSegmentedControl<Locale>
      label={t.sidebar.language}
      value={locale}
      onChange={setLocale}
      options={[
        { value: 'es', label: t.sidebar.spanish },
        { value: 'en', label: t.sidebar.english },
      ]}
    />
  )
}

// ── AppSidebar ────────────────────────────────────────────────────────────────
export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const { t } = useI18n()

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
              aria-label={t.sidebar.closeMenu}
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

      </SidebarHeader>

      {/* Navegación */}
      <SidebarContent className="py-2">
        {/* Grupo Formularios */}
        <SidebarGroup>
          <SidebarGroupLabel
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'rgba(195, 165, 131, 0.75)' }}
          >
            {t.sidebar.forms}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {FORMULARIOS.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                const label = t.sidebar[item.labelKey]
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={label}
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
                        <span>{label}</span>
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
            {t.sidebar.reports}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {REPORTES.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                const label = t.sidebar[item.labelKey]
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={label}
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
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: preferencias + cerrar sesión + versión */}
      <SidebarFooter className="border-t p-2" style={{ borderColor: 'var(--border-color)' }}>
        <div
          className="space-y-0.5 pb-1.5 group-data-[collapsible=icon]:hidden"
        >
          <ThemeToggle />
          <LanguageToggle />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={t.sidebar.logout}
              className="justify-center cursor-pointer rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#ecd1c8', color: '#1a1a1a' }}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{t.sidebar.logout}</span>
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
