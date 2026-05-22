import React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm',
        'placeholder:text-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent',
        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
