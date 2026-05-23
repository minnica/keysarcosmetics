'use client'
import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

/** Modal accesible con backdrop, cierre con Escape y scroll interno */
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(96, 96, 96, 0.45)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        className={cn(
          'relative z-10 w-full max-w-lg rounded-[14px] shadow-[var(--card-shadow)]',
          'max-h-[90vh] flex flex-col',
          className
        )}
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 32px rgba(195, 165, 131, 0.18)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            {title && (
              <h2 id="dialog-title" className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors cursor-pointer hover:bg-[var(--accent-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Body con scroll */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}

interface DialogFooterProps { children: React.ReactNode; className?: string }
export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div
      className={cn('flex justify-end gap-2 pt-4 border-t', className)}
      style={{ borderColor: 'var(--border-color)' }}
    >
      {children}
    </div>
  )
}
