'use client'
// Reporte: Ventas mensuales por vendedor
import { useState } from 'react'
import {
  Badge,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@cosmetics/ui'

import { useReportes } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { formatCurrency, formatDate, monthName } from '@/lib/utils'

function monthDates(year: number, month: number): string[] {
  const totalDays = new Date(year, month, 0).getDate()
  return Array.from({ length: totalDays }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    return `${year}-${String(month).padStart(2, '0')}-${day}`
  })
}

type SalesRow = {
  sellerId: string
  sellerName: string
  total: number
  byDate: Record<string, number>
}

export default function VentasPorVendedorDiaPage() {
  const { registros, empleados, loading, error } = useReportes()
  const { locale, t } = useI18n()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const years = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i)
  const months = t.reports.months
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const filtered = registros.filter((r) => r.fecha.startsWith(prefix))
  const dias = monthDates(year, month)

  const rowsMap = new Map<string, SalesRow>()

  for (const reg of filtered) {
    const seller = empleados.find((e) => e.id === reg.vendedorId)
    if (!seller) continue

    const key = seller.id
    const dayTotal = reg.items.reduce((sum, item) => sum + item.cantidad, 0)
    const existing = rowsMap.get(key)

    if (existing) {
      existing.total += dayTotal
      existing.byDate[reg.fecha] = (existing.byDate[reg.fecha] ?? 0) + dayTotal
    } else {
      rowsMap.set(key, {
        sellerId: seller.id,
        sellerName: seller.nombreCompleto,
        total: dayTotal,
        byDate: { [reg.fecha]: dayTotal },
      })
    }
  }

  const rows = [...rowsMap.values()].sort((a, b) =>
    b.total - a.total || a.sellerName.localeCompare(b.sellerName),
  )

  const hasData = rows.length > 0
  const zeroBadgeClassName = 'rounded-full bg-[#b85f5a] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#b85f5a] tabular-nums'
  const positiveBadgeClassName = 'rounded-full bg-[#7d9f8a] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#7d9f8a] tabular-nums'

  function renderAmount(value: number) {
    if (value === 0) {
      return (
        <Badge variant="destructive" className={zeroBadgeClassName}>
          {formatCurrency(value)}
        </Badge>
      )
    }

    return (
      <Badge className={positiveBadgeClassName}>
        {formatCurrency(value)}
      </Badge>
    )
  }

  function totalDia(fecha: string): number {
    return rows.reduce((sum, row) => sum + (row.byDate[fecha] ?? 0), 0)
  }

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0)
  const periodLabel = monthName(year, month, locale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title font-semibold uppercase">{t.reports.salesBySellerDayTitle}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {t.reports.salesBySellerDayDescription}
        </p>
      </div>

      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1.5">
          <Label>{t.common.monthlyPeriod}</Label>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((name, i) => (
                <SelectItem key={name} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t.reports.year}</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {t.common.monthlyPeriod}: {periodLabel}
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.common.loadingData}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !hasData ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t.reports.noSalesSellerPeriod}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-background whitespace-nowrap min-w-56 uppercase">
                  {t.common.employee}
                </TableHead>
                {dias.map((dia) => (
                  <TableHead key={dia} className="text-right whitespace-nowrap uppercase">
                    {formatDate(dia, 'EEEE dd', locale)}
                  </TableHead>
                ))}
                <TableHead className="text-right whitespace-nowrap uppercase">{t.common.total}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.sellerId}>
                  <TableCell className="sticky left-0 z-10 bg-background whitespace-nowrap font-medium">
                    {row.sellerName}
                  </TableCell>
                  {dias.map((dia) => (
                    <TableCell key={dia} className="text-right">
                      {renderAmount(row.byDate[dia] ?? 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium">
                    {renderAmount(row.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="sticky left-0 z-20 bg-background font-semibold text-xs uppercase">
                  {t.common.grandTotal}
                </TableCell>
                {dias.map((dia) => (
                  <TableCell key={dia} className="text-right font-semibold">
                    {renderAmount(totalDia(dia))}
                  </TableCell>
                ))}
                <TableCell className="text-right font-bold text-base">
                  {renderAmount(grandTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  )
}
