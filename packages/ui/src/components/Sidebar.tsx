// Componente base Sidebar (sin lógica de negocio)
import React from 'react'
import { cn } from '../lib/utils'

export interface SidebarProps {
  children: React.ReactNode
  className?: string
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col border-r border-gray-200 bg-white',
        className
      )}
    >
      {children}
    </aside>
  )
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex h-16 items-center border-b px-6', className)} {...props} />
}

export function SidebarNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <nav className={cn('flex-1 space-y-1 overflow-y-auto p-4', className)} {...props} />
}
