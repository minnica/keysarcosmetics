'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import type { DateRange as DayPickerDateRange } from 'react-day-picker'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

/** Rango de fechas en formato ISO YYYY-MM-DD — compatible con filtros de reportes */
export interface DateRange {
  from: string
  to: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (value: DateRange) => void
  className?: string
}

function isoToDate(iso: string): Date | undefined {
  return iso ? parseISO(iso) : undefined
}

function dateToISO(date: Date | undefined): string {
  return date ? format(date, 'yyyy-MM-dd') : ''
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selected: DayPickerDateRange = {
    from: isoToDate(value.from),
    to: isoToDate(value.to),
  }

  function handleSelect(range: DayPickerDateRange | undefined): void {
    if (!range) return
    onChange({
      from: dateToISO(range.from),
      to: dateToISO(range.to),
    })
    // Cierra el popover automáticamente al completar el rango
    if (range.from && range.to) setOpen(false)
  }

  const label =
    value.from && value.to
      ? `${format(parseISO(value.from), 'dd/MM/yyyy')} — ${format(parseISO(value.to), 'dd/MM/yyyy')}`
      : value.from
        ? format(parseISO(value.from), 'dd/MM/yyyy')
        : 'Selecciona un período'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 justify-start text-left font-normal',
            !value.from && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
