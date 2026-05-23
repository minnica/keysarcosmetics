import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        // default → dorado/gold (acento de marca)
        variant === 'default'     && 'bg-[#f5ede4] text-[#8a6040] ring-[#dfc4a8]',
        // success → verde oliva (>80% meta cumplida)
        variant === 'success'     && 'bg-[#e8f2ec] text-[#3d6b52] ring-[#9fcfb1]',
        // warning → gold suave (50-80%)
        variant === 'warning'     && 'bg-[#f5ede4] text-[#a07040] ring-[#dfc4a8]',
        // destructive → rojo suave (<50%)
        variant === 'destructive' && 'bg-red-50 text-red-600 ring-red-200',
        // outline → neutro
        variant === 'outline'     && 'bg-transparent ring-[var(--border-color)]',
        // secondary → fondo de carta
        variant === 'secondary'   && 'bg-[var(--accent-hover)] ring-[var(--border-color)]',
        className
      )}
      style={
        variant === 'outline'
          ? { color: 'var(--text-primary)' }
          : variant === 'secondary'
          ? { color: 'var(--text-primary)' }
          : undefined
      }
      {...props}
    />
  )
}
