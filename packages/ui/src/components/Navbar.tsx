// Componente base Navbar (sin lógica de negocio)
import React from 'react'
import { cn } from '../lib/utils'

export interface NavbarProps {
  children: React.ReactNode
  className?: string
}

export function Navbar({ children, className }: NavbarProps) {
  return (
    <header
      className={cn(
        'flex h-16 items-center border-b border-gray-200 bg-white px-6',
        className
      )}
    >
      {children}
    </header>
  )
}
