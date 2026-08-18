'use client'

import { Loader2 } from 'lucide-react'

interface RefreshingDataIndicatorProps {
  label: string
}

export function RefreshingDataIndicator({ label }: RefreshingDataIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-muted)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
