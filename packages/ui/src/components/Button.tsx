// Componente base Button — sin lógica de negocio
import React from 'react'
import { cn } from '../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variant === 'default' && 'bg-brand-600 text-white hover:bg-brand-700',
          variant === 'outline' && 'border border-brand-600 text-brand-600 hover:bg-brand-50',
          variant === 'ghost' && 'hover:bg-brand-50 text-brand-600',
          variant === 'destructive' && 'bg-red-600 text-white hover:bg-red-700',
          size === 'sm' && 'h-8 px-3 text-sm',
          size === 'md' && 'h-10 px-4 text-sm',
          size === 'lg' && 'h-12 px-6 text-base',
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
