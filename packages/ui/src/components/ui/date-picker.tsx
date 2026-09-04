'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
}

function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
  className,
  id,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const selected = value ? parseISO(value) : undefined
  const dialogBoundary = open
    ? (triggerRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null)
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">
            {value ? format(parseISO(value), 'dd/MM/yyyy') : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="date-picker-popover !w-auto max-w-[calc(100vw-24px)] p-0"
        align="start"
        side="bottom"
        avoidCollisions
        collisionPadding={12}
        sticky="always"
        {...(dialogBoundary ? { collisionBoundary: dialogBoundary } : {})}
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) return
            onChange(toISO(date))
            setOpen(false)
          }}
          {...(selected ? { defaultMonth: selected } : {})}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
