// Componente base Modal (sin lógica de negocio)
import React from 'react'
import { cn } from '../lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Contenido */}
      <div className={cn('relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl', className)}>
        {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
