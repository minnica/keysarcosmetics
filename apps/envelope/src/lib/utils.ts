// Utilidades generales de la aplicación envelope
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import type { Locale } from './i18n'

function dateLocale(locale: Locale = 'es') {
  return locale === 'en' ? enUS : es
}

/** Combina clases de Tailwind evitando conflictos */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Formatea un número como pesos mexicanos */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Formatea una fecha ISO a formato legible */
export function formatDate(isoDate: string, fmt = 'dd/MM/yyyy', locale: Locale = 'es'): string {
  try {
    return format(parseISO(isoDate), fmt, { locale: dateLocale(locale) })
  } catch {
    return isoDate
  }
}

/** Retorna la fecha de hoy en formato YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Genera un ID único simple */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Nombre del mes en español */
export function monthName(year: number, month: number, locale: Locale = 'es'): string {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: dateLocale(locale) })
}
