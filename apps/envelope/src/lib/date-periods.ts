import type { DateRange } from '@cosmetics/ui'

function localISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function currentFortnightRange(reference = new Date()): DateRange {
  const year = reference.getFullYear()
  const month = reference.getMonth()
  const firstHalf = reference.getDate() <= 15
  const from = new Date(year, month, firstHalf ? 1 : 16)
  const to = new Date(year, month, firstHalf ? 15 : new Date(year, month + 1, 0).getDate())
  return { from: localISO(from), to: localISO(to) }
}
