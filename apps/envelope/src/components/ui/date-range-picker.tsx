'use client'
import React from 'react'
import { cn } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'

export interface DateRange { from: string; to: string }

interface DateRangePickerProps {
  value: DateRange
  onChange: (value: DateRange) => void
  className?: string
}

/** Selector de rango de fechas (desde / hasta) */
export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
      <input
        type="date"
        value={value.from}
        max={value.to || undefined}
        onChange={e => onChange({ ...value, from: e.target.value })}
        className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
      />
      <span className="text-gray-400 text-sm">—</span>
      <input
        type="date"
        value={value.to}
        min={value.from || undefined}
        onChange={e => onChange({ ...value, to: e.target.value })}
        className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
      />
    </div>
  )
}
