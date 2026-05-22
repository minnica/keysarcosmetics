import React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm',
        'placeholder:text-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent',
        'disabled:cursor-not-allowed disabled:bg-gray-50',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
