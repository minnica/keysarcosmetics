import React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-[10px] font-medium transition-colors duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        // Variantes con paleta de marca
        variant === 'default'     && 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:text-[var(--color-charcoal)]',
        variant === 'outline'     && 'border border-[var(--border-color)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--accent-hover)]',
        variant === 'ghost'       && 'text-[var(--text-primary)] hover:bg-[var(--accent-hover)]',
        variant === 'destructive' && 'bg-red-400 text-white hover:bg-red-500',
        variant === 'secondary'   && 'bg-[var(--accent-hover)] text-[var(--text-primary)] hover:bg-[var(--nude)]',
        // Tamaños
        size === 'sm'   && 'h-8 px-3 text-xs',
        size === 'md'   && 'h-9 px-4 text-sm',
        size === 'lg'   && 'h-11 px-6 text-base',
        size === 'icon' && 'h-9 w-9',
        className
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
