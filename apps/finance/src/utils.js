import React from 'react'

export const money = (value = 0) => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
}).format(Number(value) || 0)

export const monthLabel = (period) => {
  const [year, month] = period.split('-').map(Number)
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
}

export const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const downloadCsv = (filename, rows) => {
  if (!rows.length) rows = [{ mensaje: 'Sin registros' }]
  const headers = Object.keys(rows[0])
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers.map(escape).join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function useStoredState(key, initialValue) {
  const [value, setValue] = React.useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  React.useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value])
  return [value, setValue]
}

export const periodShift = (period, delta) => {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
