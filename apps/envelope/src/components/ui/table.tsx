import React from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div
      className="w-full overflow-auto rounded-[12px] border"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('border-b', className)}
      style={{
        backgroundColor: 'var(--table-header-bg)',
        borderColor: 'var(--border-color)',
      }}
      {...props}
    />
  )
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn('divide-y', className)}
      style={{
        backgroundColor: 'var(--bg-card)',
        divideColor: 'var(--border-color)',
      }}
      {...props}
    />
  )
}

export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn('border-t font-medium', className)}
      style={{
        backgroundColor: 'var(--accent-hover)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
      {...props}
    />
  )
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors even:bg-[var(--table-row-alt)] hover:bg-[var(--accent-hover)]',
        className
      )}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap',
        className
      )}
      style={{ color: 'var(--table-header-text)' }}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-3 whitespace-nowrap', className)}
      style={{ color: 'var(--text-primary)' }}
      {...props}
    />
  )
}
