import React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-[8px] border px-3 py-2 text-sm shadow-sm transition-colors',
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
Textarea.displayName = 'Textarea'
