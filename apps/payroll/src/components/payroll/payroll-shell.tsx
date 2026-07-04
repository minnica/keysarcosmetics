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

const sections = [
  {
    label: 'Nomina',
    items: [
      { href: '/', label: 'Corridas', icon: 'M4 6h16M4 12h10M4 18h16' },
      { href: '/movimientos', label: 'Movimientos', icon: 'M12 3v18M5 8h14M7 16h10' },
      { href: '/esquemas', label: 'Esquemas', icon: 'M4 17l5-5 4 4 7-9M4 20h16' },
      { href: '/prestamos-adelantos', label: 'Prestamos', icon: 'M6 7h12M6 12h12M6 17h7' },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { href: '/reportes/desglose-sucursal', label: 'Desglose', icon: 'M5 19V9m7 10V5m7 14v-7' },
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
          <div className="grid h-7 w-7 place-items-center rounded-full border border-[color:var(--border-color)] bg-[#080706] font-serif text-sm text-[#d9d3ca] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">K</div>
          <SidebarTrigger className="text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]" />
        </div>

        <div className="relative flex flex-col items-center gap-1 px-3 pb-3 pt-4 group-data-[collapsible=icon]:hidden">
          {isMobile ? (
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              aria-label="Cerrar menu"
              className="absolute right-2 top-2 rounded-md p-1.5 text-[color:var(--text-muted)] transition-colors hover:bg-[var(--accent-hover)] hover:text-[color:var(--text-primary)]"
            >
              <CloseIcon />
            </button>
          ) : (
            <SidebarTrigger className="absolute right-2 top-2 text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-primary)]" />
          )}
          <div className="grid h-12 w-12 place-items-center rounded-full border border-[color:var(--border-color)] bg-[#080706] font-serif text-2xl text-[#d9d3ca] shadow-[0_12px_28px_rgba(0,0,0,0.36)]">
            K
          </div>
          <span className="mt-1 font-serif text-xl tracking-[-0.04em]" style={{ color: 'var(--text-primary)' }}>
            Keysar Cosmetics
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--accent)' }}>
            Payroll demo
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(140, 117, 106, 0.82)' }}>
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
                            : 'hover:!bg-[var(--accent-hover)] hover:!text-[var(--text-primary)]'
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
        <div className="space-y-1.5 rounded-xl border border-[#2c241c] bg-[#080706] p-3 group-data-[collapsible=icon]:hidden">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Modo demo</p>
          <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
            Datos mock, sin backend ni base de datos.
          </p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => router.push('/login')}
              tooltip="Salir"
              className="cursor-pointer justify-center rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#d7b488', color: '#050404' }}
            >
              <LogoutIcon />
              <span>Salir</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="pb-1 text-center text-[10px] uppercase tracking-wider group-data-[collapsible=icon]:hidden" style={{ color: 'var(--text-muted)' }}>
          Payroll mock v0.1
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export function PayrollShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <PayrollSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden bg-transparent">
        <header
          className="flex h-12 shrink-0 items-center gap-3 border-b px-4 md:hidden"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
        >
          <SidebarTrigger className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
          <div className="grid h-7 w-7 place-items-center rounded-full border border-[color:var(--border-color)] bg-[#080706] font-serif text-sm text-[#d9d3ca]">K</div>
          <span className="text-sm font-semibold">Keysar Payroll</span>
        </header>
        <div className="min-w-0 p-4 pb-10 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
