import React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps { value: number; className?: string }

/** Barra de progreso: rojo <50%, amarillo 50-80%, verde >80% */
export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const color = clamped < 50 ? 'bg-red-500' : clamped < 80 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className={cn('w-full h-2 bg-gray-100 rounded-full overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
    </div>
  )
}
