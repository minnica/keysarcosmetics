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
  CalendarCheck2, ClipboardList,
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
  SidebarMenuSkeleton,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  Skeleton,
  useSidebar,
} from '@cosmetics/ui'
import { useI18n, type Locale } from '@/lib/i18n'
import { SCREEN_CONFIG, type AccessSection } from '@/lib/access'
import { useSession } from '@/lib/session'

type PreferenceOption<T extends string> = {
  value: T
  label: string
  icon?: React.ElementType
}

const ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  ventas: ShoppingCart,
  citas: CalendarCheck2,
  servicios: ClipboardList,
  empleados: Users,
  sucursales: Building2,
  'metodos-pago': CreditCard,
  bancos: Landmark,
  puestos: Briefcase,
  'reportes/detalle-metodo-pago': BarChart2,
  'reportes/metodo-pago-por-dia': CalendarDays,
  'reportes/ventas-por-vendedor': UserCheck,
  'reportes/ventas-por-vendedor-dia': CalendarRange,
  'reportes/total-general': TrendingUp,
  'reportes/citas': ClipboardList,
  accesos: LayoutDashboard,
}

type NavItem = (typeof SCREEN_CONFIG)[number]

const SECTION_LABELS: Record<AccessSection, 'forms' | 'reports' | 'admin'> = {
  forms: 'forms',
  reports: 'reports',
  admin: 'admin',
}

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
  const { canAccess, isAccessManager, logout, status } = useSession()

  function handleNavClick() {
    setOpenMobile(false)
  }

  function handleLogout() {
    logout()
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
        {status === 'loading' ? (
          <SidebarLoadingNavigation />
        ) : (['forms', 'reports', 'admin'] as const).map((section) => {
          const items = SCREEN_CONFIG.filter((item) => {
            if (item.section !== section) return false
            if (item.key === 'accesos') return isAccessManager
            return isAccessManager || canAccess(item.key)
          })

          if (items.length === 0) return null

          return (
            <SidebarGroup key={section}>
              <SidebarGroupLabel
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'rgba(195, 165, 131, 0.75)' }}
              >
                {t.sidebar[SECTION_LABELS[section] as keyof typeof t.sidebar]}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item: NavItem) => {
                    const isActive = pathname === item.path
                    const Icon = ICONS[item.key] ?? LayoutDashboard
                    const label = t.sidebar[item.labelKey]
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={label}
                          onClick={handleNavClick}
                          className={
                            isActive
                              ? '!bg-[var(--sidebar-active-bg)] !text-[var(--sidebar-active-text)] hover:!bg-[var(--sidebar-active-bg)] hover:!text-[var(--sidebar-active-text)]'
                              : undefined
                          }
                        >
                          <Link href={item.path}>
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
          )
        })}
      </SidebarContent>

      {/* Footer: preferencias + cerrar sesión + versión */}
      <SidebarFooter className="border-t p-2" style={{ borderColor: 'var(--border-color)' }}>
        {status === 'loading' ? (
          <SidebarLoadingFooter />
        ) : (
          <>
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
          </>
        )}
      </SidebarFooter>

      {/* Rail — handle secundario para colapsar/expandir en desktop (complementa el trigger del header) */}
      <SidebarRail />
    </Sidebar>
  )
}

function SidebarLoadingNavigation() {
  return (
    <>
      {[
        { labelWidth: 'w-16', items: 4 },
        { labelWidth: 'w-20', items: 3 },
        { labelWidth: 'w-14', items: 2 },
      ].map((section, sectionIndex) => (
        <SidebarGroup key={sectionIndex}>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            <Skeleton className={`h-2.5 ${section.labelWidth} opacity-70`} />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array.from({ length: section.items }).map((_, itemIndex) => (
                <SidebarMenuItem key={itemIndex}>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}

function SidebarLoadingFooter() {
  return (
    <>
      <div className="space-y-2 pb-1.5 group-data-[collapsible=icon]:hidden">
        <div className="space-y-1 px-2">
          <Skeleton className="h-2.5 w-12 opacity-70" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-1 px-2">
          <Skeleton className="h-2.5 w-14 opacity-70" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuSkeleton showIcon className="h-9" />
        </SidebarMenuItem>
      </SidebarMenu>
      <Skeleton className="mx-auto h-2.5 w-24 opacity-60 group-data-[collapsible=icon]:hidden" />
    </>
  )
}
