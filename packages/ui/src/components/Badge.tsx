// Componente base Badge
import React from 'react'
import { cn } from '../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-brand-100 text-brand-700',
        variant === 'success' && 'bg-green-100 text-green-700',
        variant === 'warning' && 'bg-yellow-100 text-yellow-700',
        variant === 'destructive' && 'bg-red-100 text-red-700',
        variant === 'outline' && 'border border-gray-300 text-gray-700',
        className
      )}
      {...props}
    />
  )
}
