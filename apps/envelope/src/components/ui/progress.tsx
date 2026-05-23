import React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps { value: number; className?: string }

/** Barra de progreso con colores de marca Keysar:
 *  < 50% → rojo suave
 *  50-80% → dorado (#c3a583)
 *  > 80%  → verde oliva (#648672)
 */
export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const color =
    clamped < 50  ? '#e07070' :
    clamped < 80  ? '#c3a583' :
                    '#648672'
  return (
    <div
      className={cn('w-full h-2 rounded-full overflow-hidden', className)}
      style={{ backgroundColor: 'var(--border-color)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  )
}
