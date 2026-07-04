'use client'

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
    label: 'Nomina',
    items: [
      { href: '/', label: 'Summary', icon: 'M4 6h16M4 12h10M4 18h16' },
      { href: '/movimientos', label: 'Movimientos', icon: 'M12 3v18M5 8h14M7 16h10' },
      { href: '/bonos', label: 'Bonos', icon: 'M5 12l4 4L19 6' },
      { href: '/esquemas', label: 'Esquemas', icon: 'M4 17l5-5 4 4 7-9M4 20h16' },
      { href: '/prestamos-adelantos', label: 'Prestamos', icon: 'M6 7h12M6 12h12M6 17h7' },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { href: '/reportes/desglose-sucursal', label: 'Payroll breakdown', icon: 'M5 19V9m7 10V5m7 14v-7' },
      { href: '/recibos', label: 'Recibos', icon: 'M7 3h10l2 3v15H5V3h2zm0 6h10M7 13h10M7 17h6' },
    ],
  },
]

function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
      <path d="M10 6H6v12h4M14 8l4 4-4 4M8 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PayrollSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()

  function handleNavClick() {
    setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-[color:var(--border-color)]">
      <SidebarHeader className="border-b p-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="hidden h-16 flex-col items-center justify-center gap-1 group-data-[collapsible=icon]:flex">
          <div className="grid h-7 w-7 place-items-center rounded-full border border-[color:var(--border-color)] bg-[#080706] font-brand text-sm text-[color:var(--text-strong)] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">K</div>
          <SidebarTrigger className="text-[var(--text-muted)] hover:bg-[rgba(239,207,155,0.12)] hover:text-[color:var(--text-strong)]" />
        </div>

        <div className="relative flex flex-col items-center gap-1 px-3 pb-3 pt-4 group-data-[collapsible=icon]:hidden">
          {isMobile ? (
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              aria-label="Cerrar menu"
              className="absolute right-2 top-2 rounded-md p-1.5 text-[color:var(--text-muted)] transition-colors hover:bg-[rgba(239,207,155,0.12)] hover:text-[color:var(--text-strong)]"
            >
              <CloseIcon />
            </button>
          ) : (
            <SidebarTrigger className="absolute right-2 top-2 text-[var(--text-muted)] hover:bg-[rgba(239,207,155,0.12)] hover:text-[color:var(--text-strong)]" />
          )}
          <div className="grid h-12 w-12 place-items-center rounded-full border border-[color:var(--border-color)] bg-[#080706] font-brand text-2xl text-[color:var(--text-strong)] shadow-[0_12px_28px_rgba(0,0,0,0.36)]">
            K
          </div>
          <span className="mt-1 font-brand text-xl tracking-[-0.04em]" style={{ color: 'var(--text-strong)' }}>
            Keysar Cosmetics
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--accent)' }}>
            Nómina demo
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
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
                        onClick={handleNavClick}
                        className={
                          isActive
                            ? '!bg-[var(--sidebar-active-bg)] !text-[var(--sidebar-active-text)] hover:!bg-[var(--sidebar-active-bg)] hover:!text-[var(--sidebar-active-text)]'
                            : 'hover:!bg-[rgba(239,207,155,0.12)] hover:!text-[color:var(--text-strong)]'
                        }
                      >
                        <Link href={item.href}>
                          <NavIcon path={item.icon} />
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
        <div className="rounded-xl border border-[#2c241c] bg-[#080706] px-3 py-2 group-data-[collapsible=icon]:hidden">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Modo demo</p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => router.push('/login')}
              tooltip="Salir"
              className="payroll-button-primary cursor-pointer justify-center rounded-lg"
            >
              <LogoutIcon />
              <span>Salir</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
        <SidebarInset className="min-w-0 overflow-x-hidden bg-transparent">
          <header
            className="flex h-12 shrink-0 items-center gap-3 border-b px-4 md:hidden"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
          >
            <SidebarTrigger className="text-[var(--text-muted)] hover:text-[color:var(--text-strong)]" />
            <div className="grid h-7 w-7 place-items-center rounded-full border border-[color:var(--border-color)] bg-[#080706] font-brand text-sm text-[color:var(--text-strong)]">K</div>
            <span className="font-brand text-sm text-[color:var(--text-strong)]">Keysar Payroll</span>
          </header>
          <div className="min-w-0 p-4 pb-10 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </BonusCatalogProvider>
  )
}
