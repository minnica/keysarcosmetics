'use client'
// Shell del layout autenticado — usa SidebarProvider + SidebarInset del Sidebar canónico shadcn
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@cosmetics/ui'
import { AppSidebar } from './AppSidebar'

interface LayoutShellProps {
  children: React.ReactNode
}

export function LayoutShell({ children }: LayoutShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        {/* Barra de navegación superior — visible solo en móvil (md:hidden) */}
        <header
          className="flex h-12 shrink-0 items-center gap-3 border-b px-4 md:hidden"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
        >
          <SidebarTrigger className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
          <img
            src="/logo.svg"
            alt="Keysar Cosmetics"
            className="h-6 object-contain"
            style={{ maxWidth: '100px' }}
          />
        </header>
        <div className="p-6 min-w-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
