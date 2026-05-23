import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, placeholder, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-9 w-full appearance-none rounded-[8px] border px-3 py-1 pr-8 text-sm shadow-sm transition-colors',
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
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4"
        style={{ color: 'var(--text-muted)' }}
      />
    </div>
  )
)
Select.displayName = 'Select'
