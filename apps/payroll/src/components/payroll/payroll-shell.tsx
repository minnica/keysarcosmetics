'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
} from '@cosmetics/ui'
import { BonusCatalogProvider } from './bonus-catalog-context'

const sections = [
  {
    label: 'Nómina',
    items: [
      { href: '/', label: 'Resumen', icon: 'M4 6h16M4 12h10M4 18h16' },
      { href: '/movimientos', label: 'Movimientos', icon: 'M12 3v18M5 8h14M7 16h10' },
      { href: '/bonos', label: 'Bonos', icon: 'M5 12l4 4L19 6' },
      { href: '/esquemas', label: 'Esquemas', icon: 'M4 17l5-5 4 4 7-9M4 20h16' },
      { href: '/prestamos-adelantos', label: 'Préstamos', icon: 'M6 7h12M6 12h12M6 17h7' },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { href: '/reportes/desglose-sucursal', label: 'Desglose por sucursal', icon: 'M5 19V9m7 10V5m7 14v-7' },
      { href: '/recibos', label: 'Recibos', icon: 'M7 3h10l2 3v15H5V3h2zm0 6h10M7 13h10M7 17h6' },
    ],
  },
]

function Icon({ path, className = 'h-4 w-4' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(localStorage.getItem('keysar-theme') === 'dark')
  }, [])

  function setTheme(nextDark: boolean) {
    setDark(nextDark)
    document.documentElement.classList.toggle('dark', nextDark)
    localStorage.setItem('keysar-theme', nextDark ? 'dark' : 'light')
  }

  return (
    <div className="space-y-1 px-2 py-0.5 group-data-[collapsible=icon]:hidden">
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Tema</div>
      <div className="flex rounded-md border border-[var(--border-color)] p-0.5" role="radiogroup" aria-label="Tema visual">
        {[
          { value: false, label: 'Claro', path: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' },
          { value: true, label: 'Oscuro', path: 'M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z' },
        ].map((option) => {
          const selected = dark === option.value
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(option.value)}
              className={`flex h-6 flex-1 cursor-pointer items-center justify-center gap-1 rounded-[6px] text-[10px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'bg-[var(--accent)] text-white shadow-sm dark:text-[#1a1a1a]' : 'text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]'}`}
            >
              <Icon path={option.path} className="h-2.5 w-2.5" />
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PayrollSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="hidden h-16 flex-col items-center justify-center gap-1 group-data-[collapsible=icon]:flex">
          <img src="/logo.svg" alt="Keysar Cosmetics" className="h-6 w-6 object-contain" />
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
              <Icon path="M6 6l12 12M18 6 6 18" />
            </button>
          ) : (
            <SidebarTrigger className="absolute right-2 top-2 text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]" />
          )}
          <img src="/logo.svg" alt="Keysar Cosmetics" className="h-auto max-w-[52px] object-contain" />
          <span className="font-brand text-lg uppercase tracking-widest text-[var(--text-primary)]">Keysar Cosmetics</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(195,165,131,0.85)]">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        onClick={() => setOpenMobile(false)}
                        className={isActive ? '!bg-[var(--sidebar-active-bg)] !text-[var(--sidebar-active-text)] hover:!bg-[var(--sidebar-active-bg)]' : undefined}
                      >
                        <Link href={item.href}>
                          <Icon path={item.icon} />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-2" style={{ borderColor: 'var(--border-color)' }}>
        <ThemeToggle />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => router.push('/login')}
              tooltip="Cerrar sesión"
              className="cursor-pointer justify-center rounded-lg bg-[var(--color-nude)] text-[#1a1a1a] transition-colors hover:opacity-90"
            >
              <Icon path="M10 6H6v12h4M14 8l4 4-4 4M8 12h10" className="h-4 w-4 shrink-0" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="pb-1 text-center text-[10px] uppercase tracking-wider text-[var(--text-muted)] group-data-[collapsible=icon]:hidden">Payroll demo</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function PayrollShell({ children }: { children: React.ReactNode }) {
  return (
    <BonusCatalogProvider>
      <SidebarProvider>
        <PayrollSidebar />
        <SidebarInset className="min-w-0 overflow-x-hidden bg-[var(--bg-primary)]">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-[var(--bg-card)] px-4 md:hidden" style={{ borderColor: 'var(--border-color)' }}>
            <SidebarTrigger className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
            <img src="/logo.svg" alt="Keysar Cosmetics" className="h-7 w-7 object-contain" />
            <span className="font-brand text-sm uppercase tracking-widest text-[var(--text-primary)]">Keysar Payroll</span>
          </header>
          <div className="min-w-0 p-4 pb-10 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </BonusCatalogProvider>
  )
}
