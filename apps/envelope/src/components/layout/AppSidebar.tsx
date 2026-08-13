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
  Award, CalendarCheck2, ClipboardList,
  Target,
  ChevronDown, Languages,
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
import { useI18n } from '@/lib/i18n'
import {
  getScreenConfigByPath,
  SCREEN_CONFIG,
  SECTION_ORDER,
  type AccessSection,
} from '@/lib/access'
import { useSession } from '@/lib/session'

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
  'reportes/ranking-vendedores': Award,
  'reportes/ranking-sucursales': Building2,
  'reportes/total-general': TrendingUp,
  'reportes/metas-sucursal': Target,
  'reportes/citas': ClipboardList,
  accesos: LayoutDashboard,
}

type NavItem = (typeof SCREEN_CONFIG)[number]
type CollapsibleSection = Exclude<AccessSection, 'admin'>

const SECTION_LABELS: Record<
  AccessSection,
  'forms' | 'reports' | 'rankings' | 'admin'
> = {
  forms: 'forms',
  reports: 'reports',
  rankings: 'rankings',
  admin: 'admin',
}

const SECTION_LABEL_CLASS_NAME =
  'text-[10px] font-sans font-semibold uppercase tracking-[0.14em]'

const SECTION_LABEL_STYLE: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontFamily: "'Gilroy', 'Inter', sans-serif",
  fontWeight: 600,
}

function getActiveCollapsibleSection(
  pathname: string,
): CollapsibleSection | null {
  const section = getScreenConfigByPath(pathname)?.section
  return section && section !== 'admin' ? section : null
}

function PreferenceToggle({
  label,
  valueLabel,
  checked,
  icon: Icon,
  onCheckedChange,
}: {
  label: string
  valueLabel: string
  checked: boolean
  icon: React.ElementType
  onCheckedChange: (checked: boolean) => void
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
            ? 'border-[var(--accent)] bg-[var(--accent)]'
            : 'border-[var(--border-color)] bg-[var(--input-disabled-bg)]'
        }`}
      >
        <span
          className={`absolute left-0 top-0.5 h-3.5 w-3.5 rounded-full border transition-[transform,background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none ${
            checked
              ? 'translate-x-[17px] border-white/80 bg-white shadow-sm'
              : 'translate-x-0.5 border-[var(--color-gold)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(79,74,68,0.32)]'
          }`}
        />
      </span>
    </button>
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
    <PreferenceToggle
      label={t.sidebar.theme}
      valueLabel={dark ? t.sidebar.dark : t.sidebar.light}
      checked={dark}
      icon={dark ? Moon : Sun}
      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
    />
  )
}

function LanguageToggle() {
  const { locale, setLocale, t } = useI18n()

  return (
    <PreferenceToggle
      label={t.sidebar.language}
      valueLabel={locale === 'es' ? t.sidebar.spanish : t.sidebar.english}
      checked={locale === 'en'}
      icon={Languages}
      onCheckedChange={(checked) => setLocale(checked ? 'en' : 'es')}
    />
  )
}

// ── AppSidebar ────────────────────────────────────────────────────────────────
export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar()
  const { t } = useI18n()
  const { canAccess, isAccessManager, logout, status } = useSession()
  const activeCollapsibleSection = getActiveCollapsibleSection(pathname)
  const [expandedSection, setExpandedSection] =
    useState<CollapsibleSection | null>(activeCollapsibleSection)

  useEffect(() => {
    setExpandedSection(activeCollapsibleSection)
  }, [activeCollapsibleSection])

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
        ) : SECTION_ORDER.map((section) => {
          const items = SCREEN_CONFIG.filter((item) => {
            if (item.section !== section) return false
            if (item.key === 'accesos') return isAccessManager
            return isAccessManager || canAccess(item.key)
          })

          if (items.length === 0) return null

          const isCollapsible = section !== 'admin'
          const isExpanded = isCollapsible && expandedSection === section
          const showItems = !isCollapsible || (!isMobile && sidebarState === 'collapsed') || isExpanded
          const sectionLabel = t.sidebar[SECTION_LABELS[section] as keyof typeof t.sidebar]

          return (
            <SidebarGroup key={section}>
              {isCollapsible ? (
                <SidebarGroupLabel asChild>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-section-${section}`}
                    onClick={() => setExpandedSection(isExpanded ? null : section)}
                    className={`${SECTION_LABEL_CLASS_NAME} group/disclosure w-full cursor-pointer justify-between transition-colors duration-200 hover:bg-[var(--accent-hover)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none`}
                    style={SECTION_LABEL_STYLE}
                  >
                    <span className="truncate">{sectionLabel}</span>
                    <span className="flex items-center gap-1.5" aria-hidden="true">
                      <span className="min-w-4 text-center text-[10px] tabular-nums text-[var(--text-muted)]">
                        {items.length}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                  </button>
                </SidebarGroupLabel>
              ) : (
                <SidebarGroupLabel
                  className={SECTION_LABEL_CLASS_NAME}
                  style={SECTION_LABEL_STYLE}
                >
                  {sectionLabel}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent
                id={isCollapsible ? `sidebar-section-${section}` : undefined}
                hidden={!showItems}
              >
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
                          <Link
                            href={item.path}
                            aria-current={isActive ? 'page' : undefined}
                          >
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
            <div className="space-y-0.5 pb-1.5 group-data-[collapsible=icon]:hidden">
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
