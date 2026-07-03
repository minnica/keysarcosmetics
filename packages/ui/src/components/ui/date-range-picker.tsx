'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'
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
  fromLabel?: string
  toLabel?: string
}

function isoToDate(iso: string): Date | undefined {
  return iso ? parseISO(iso) : undefined
}

function dateToISO(date: Date | undefined): string {
  return date ? format(date, 'yyyy-MM-dd') : ''
}

function DateSelector({
  id,
  label,
  value,
  onSelect,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onSelect: (date: Date) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false)
  const selected = isoToDate(value)

  const triggerLabel = value
    ? format(parseISO(value), 'dd/MM/yyyy')
    : label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'h-9 w-full justify-start text-left font-normal sm:w-44',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) return
            onSelect(date)
            setOpen(false)
          }}
          {...(selected ? { defaultMonth: selected } : {})}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export function DateRangePicker({
  value,
  onChange,
  className,
  fromLabel = 'From',
  toLabel = 'To',
}: DateRangePickerProps) {
  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <DateSelector
        id="date-range-from"
        label={fromLabel}
        value={value.from}
        onSelect={(date) => {
          const from = dateToISO(date)
          onChange({
            from,
            to: value.to < from ? from : value.to,
          })
        }}
      />
      <DateSelector
        id="date-range-to"
        label={toLabel}
        value={value.to}
        onSelect={(date) => {
          const to = dateToISO(date)
          onChange({
            from: value.from > to ? to : value.from,
            to,
          })
        }}
      />
    </div>
  )
}
