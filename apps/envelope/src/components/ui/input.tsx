import React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-[8px] border px-3 py-1 text-sm shadow-sm transition-colors',
        'placeholder:text-[var(--text-muted)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      style={{
        backgroundColor: 'var(--input-bg)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
      {...props}
    />
  )
)
Input.displayName = 'Input'
