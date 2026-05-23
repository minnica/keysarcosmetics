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
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <CalendarDays className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
      <input
        type="date"
        value={value.from}
        max={value.to || undefined}
        onChange={e => onChange({ ...value, from: e.target.value })}
        className="h-9 rounded-[8px] border px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        style={inputStyle}
      />
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>
      <input
        type="date"
        value={value.to}
        min={value.from || undefined}
        onChange={e => onChange({ ...value, to: e.target.value })}
        className="h-9 rounded-[8px] border px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        style={inputStyle}
      />
    </div>
  )
}
