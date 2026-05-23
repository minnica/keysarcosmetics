"use client"

import * as React from "react"
import { Progress } from "../ui/progress"
import { cn } from "../../lib/utils"

interface ProgressKeysarProps {
  value: number
  className?: string
}

// Paleta de marca Keysar: rojo suave < 50 %, dorado 50-80 %, verde oliva > 80 %
function getBrandColor(pct: number): string {
  if (pct < 50) return "#e07070"
  if (pct < 80) return "#c3a583"
  return "#648672"
}

/**
 * Wrapper sobre el primitive Progress que aplica los colores de marca Keysar
 * según el porcentaje: rojo < 50 %, dorado 50-80 %, verde > 80 %.
 * El color se inyecta vía CSS custom property --progress-indicator-color
 * para no necesitar props extra en el primitive.
 */
export function ProgressKeysar({ value, className }: ProgressKeysarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <Progress
      value={clamped}
      className={cn("[&>div]:bg-[var(--progress-indicator-color)]", className)}
      style={{
        backgroundColor: "var(--border-color)",
        "--progress-indicator-color": getBrandColor(clamped),
      } as React.CSSProperties}
    />
  )
}
