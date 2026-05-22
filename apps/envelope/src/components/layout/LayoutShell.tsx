'use client'
// Shell del layout autenticado — gestiona el estado colapsado del sidebar
// y lo persiste en localStorage para que sobreviva recargas de página
import { useState, useEffect } from 'react'
import { AppSidebar } from './AppSidebar'

const STORAGE_KEY = 'envelope-sidebar-collapsed'

interface LayoutShellProps {
  children: React.ReactNode
}

export function LayoutShell({ children }: LayoutShellProps) {
  // Siempre iniciar en false para que servidor y cliente coincidan (evita hydration error)
  const [collapsed, setCollapsed] = useState(false)

  // Leer preferencia guardada solo después del montaje (solo en cliente)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'true') setCollapsed(true)
  }, [])

  // Persistir cada cambio posterior
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  function handleToggle() {
    setCollapsed(prev => !prev)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar collapsed={collapsed} onToggle={handleToggle} />
      <main className="flex-1 overflow-y-auto transition-all duration-300">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
