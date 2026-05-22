import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        variant === 'default' && 'bg-rose-50 text-rose-700 ring-rose-200',
        variant === 'success' && 'bg-green-50 text-green-700 ring-green-200',
        variant === 'warning' && 'bg-yellow-50 text-yellow-700 ring-yellow-200',
        variant === 'destructive' && 'bg-red-50 text-red-700 ring-red-200',
        variant === 'outline' && 'bg-white text-gray-600 ring-gray-300',
        variant === 'secondary' && 'bg-gray-100 text-gray-700 ring-gray-200',
        className
      )}
      {...props}
    />
  )
}
