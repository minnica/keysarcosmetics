'use client'
// Reporte: Ventas mensuales por vendedor
import { useState } from 'react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@cosmetics/ui'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BarChart3, ChevronRight, DollarSign } from 'lucide-react'

import { useReportes } from '@/hooks'
import { useI18n } from '@/lib/i18n'
import { formatCurrency, formatDate, monthName } from '@/lib/utils'
import { ReportExportButtons } from '@/components/reportes/ReportExportButtons'
import { exportReportToExcel, exportReportToPdf, type ExportColumn } from '@/lib/report-export'

function monthDates(year: number, month: number): string[] {
  const totalDays = new Date(year, month, 0).getDate()
  return Array.from({ length: totalDays }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    return `${year}-${String(month).padStart(2, '0')}-${day}`
  })
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size))
  }
  return chunks
}

type SalesRow = {
  sellerId: string
  sellerName: string
  total: number
  byDate: Record<string, number>
  daysWithoutSale: number
  approximateDayAmount: number
}

export default function VentasPorVendedorDiaPage() {
  const { registros, empleados, loading, error } = useReportes()
  const { locale, t } = useI18n()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [mobileSearch, setMobileSearch] = useState('')

  const years = Array.from({ length: now.getFullYear() - 2022 }, (_, i) => 2023 + i)
  const months = t.reports.months
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const filtered = registros.filter((r) => r.fecha.startsWith(prefix))
  const daysInMonth = new Date(year, month, 0).getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth
  const dias = monthDates(year, month).slice(0, elapsedDays)

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
        daysWithoutSale: 0,
        approximateDayAmount: 0,
      })
    }
  }

  const rows = [...rowsMap.values()]
    .map((row) => {
      const saleDaysCount = Object.keys(row.byDate).length
      const daysWithoutSale = Math.max(0, elapsedDays - saleDaysCount)

      return {
        ...row,
        daysWithoutSale,
        // Promedio real: total del mes dividido entre los días con venta.
        approximateDayAmount: saleDaysCount > 0 ? row.total / saleDaysCount : 0,
      }
    })
    .sort((a, b) =>
      b.total - a.total || a.sellerName.localeCompare(b.sellerName),
    )

  const hasData = rows.length > 0
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null)
  const selectedRow = selectedSellerId ? rows.find((row) => row.sellerId === selectedSellerId) ?? null : null
  const mobileRows = rows.filter((row) =>
    row.sellerName.toLowerCase().includes(mobileSearch.trim().toLowerCase()),
  )

  const zeroBadgeClassName = 'rounded-full bg-[#b85f5a] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#b85f5a] tabular-nums'
  function renderAmount(value: number) {
    if (value === 0) {
      return (
        <Badge variant="destructive" className={zeroBadgeClassName}>
          {formatCurrency(value)}
        </Badge>
      )
    }

    return formatCurrency(value)
  }

  function totalDia(fecha: string): number {
    return rows.reduce((sum, row) => sum + (row.byDate[fecha] ?? 0), 0)
  }

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0)
  const periodLabel = monthName(year, month, locale)
  type ExportRow = {
    empleado: string
    byDate: Record<string, number>
    daysWithoutSale: number
    approximateDayAmount: number
    total: number
  }

  const exportRows: ExportRow[] = rows.map((row) => ({
    empleado: row.sellerName,
    byDate: row.byDate,
    daysWithoutSale: row.daysWithoutSale,
    approximateDayAmount: row.approximateDayAmount,
    total: row.total,
  }))

  const exportColumns: ExportColumn<ExportRow>[] = [
    {
      header: t.common.employee,
      accessor: (row) => row.empleado,
      width: 24,
    },
    ...dias.map((dia) => ({
      header: formatDate(dia, 'dd/MM', locale),
      accessor: (row: ExportRow) => row.byDate[dia] ?? 0,
      format: 'currency' as const,
      width: 11,
    })),
    {
      header: 'DÍAS SIN VENTA',
      accessor: (row) => row.daysWithoutSale,
      format: 'number',
      width: 12,
    },
    {
      header: 'MONTO DÍA APROX',
      accessor: (row) => row.approximateDayAmount,
      format: 'currency',
      width: 14,
    },
    {
      header: t.common.total,
      accessor: (row) => row.total,
      format: 'currency',
      width: 14,
    },
  ]

  const exportFooterRow: ExportRow = {
    empleado: t.common.grandTotal,
    byDate: Object.fromEntries(
      dias.map((dia) => [dia, totalDia(dia)]),
    ),
    daysWithoutSale: 0,
    approximateDayAmount: rows.reduce((sum, row) => sum + row.approximateDayAmount, 0),
    total: grandTotal,
  }

  function exportPdf() {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    })

    const chunks = chunkArray(dias, 10)
    const summaryWidths = [52, 58, 50]
    const pageBottom = doc.internal.pageSize.getHeight() - 28
    let currentY = 70
    const lastAutoTable = () => (doc as any).lastAutoTable?.finalY as number | undefined

    function drawPageHeader() {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text(t.reports.salesBySellerDayTitle, 40, 32)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`${t.common.monthlyPeriod} ${periodLabel}`, 40, 42)
    }

    chunks.forEach((dayChunk, index) => {
      const newPage = index % 3 === 0
      if (newPage) {
        if (index > 0) {
          doc.addPage()
        }
        currentY = 70
        drawPageHeader()
      } else {
        currentY = (lastAutoTable() ?? currentY) + 22
      }

      const firstDay = dayChunk[0]!
      const lastDay = dayChunk[dayChunk.length - 1]!
      const subtitle = `${formatDate(firstDay, 'dd/MM/yyyy', locale)} - ${formatDate(lastDay, 'dd/MM/yyyy', locale)}`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(subtitle, 40, currentY - 10)
      doc.setFont('helvetica', 'normal')

      const head = [[
        t.common.employee,
        ...dayChunk.map((dia) => formatDate(dia, 'dd/MM', locale)),
        'DÍAS SIN VENTA',
        'MONTO DÍA APROX',
        t.common.total,
      ]]

      const body = rows.map((row) => [
        row.sellerName,
        ...dayChunk.map((dia) => formatCurrency(row.byDate[dia] ?? 0)),
        row.daysWithoutSale === 0 ? '0 DÍAS' : `${row.daysWithoutSale} DÍAS`,
        formatCurrency(row.approximateDayAmount),
        formatCurrency(row.total),
      ])

      const foot = [[
        t.common.grandTotal,
        ...dayChunk.map((dia) => formatCurrency(totalDia(dia))),
        '—',
        formatCurrency(rows.reduce((sum, row) => sum + row.approximateDayAmount, 0)),
        formatCurrency(grandTotal),
      ]]

      autoTable(doc, {
        startY: currentY,
        head,
        body,
        foot,
        theme: 'striped',
        styles: {
          font: 'helvetica',
          fontSize: 6.2,
          cellPadding: 2,
          overflow: 'ellipsize',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [100, 134, 114],
          textColor: 255,
          fontStyle: 'bold',
        },
        footStyles: {
          fillColor: [236, 240, 238],
          textColor: 20,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 249],
        },
        margin: { top: 48, left: 26, right: 26, bottom: 24 },
        tableWidth: 'wrap',
        columnStyles: {
          0: { cellWidth: 140 },
          ...Object.fromEntries(dayChunk.map((_, dayIndex) => [dayIndex + 1, { cellWidth: 34 }])),
          [dayChunk.length + 1]: { cellWidth: summaryWidths[0] },
          [dayChunk.length + 2]: { cellWidth: summaryWidths[1] },
          [dayChunk.length + 3]: { cellWidth: summaryWidths[2] },
        },
      })

      currentY = (lastAutoTable() ?? currentY) + 10
      if (currentY > pageBottom) {
        doc.addPage()
        currentY = 70
        drawPageHeader()
      }
    })

    doc.save(`ventas-vendedor-dia-${year}-${String(month).padStart(2, '0')}.pdf`)
  }

  function handleExport(kind: 'pdf' | 'excel') {
    setExporting(kind)
    try {
      if (kind === 'pdf') {
        exportPdf()
      } else {
        exportReportToExcel({
          title: t.reports.salesBySellerDayTitle,
          subtitle: `${t.common.monthlyPeriod} ${periodLabel}`,
          filename: `ventas-vendedor-dia-${year}-${String(month).padStart(2, '0')}`,
          sheetName: 'Ventas Vendedor Dia',
          orientation: 'landscape',
          columns: exportColumns,
          rows: exportRows,
          footerRow: exportFooterRow,
        })
      }
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title font-semibold uppercase">{t.reports.salesBySellerDayTitle}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {t.reports.salesBySellerDayDescription}
          </p>
        </div>
        <ReportExportButtons
          disabled={loading || !!error || !hasData}
          exporting={exporting}
          onExportPdf={() => handleExport('pdf')}
          onExportExcel={() => handleExport('excel')}
          pdfLabel={t.common.exportPdf}
          excelLabel={t.common.exportExcel}
        />
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
        <>
          <div className="space-y-3 md:hidden">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.12em]">Buscar empleado</Label>
              <Input
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Escribe el nombre del vendedor"
                className="h-11 border-[color:var(--border-color)] bg-[var(--bg-card)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">VENDEDORES</div>
                  <CardTitle className="text-xl number-display">{rows.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">TOTAL MES</div>
                  <CardTitle className="text-xl number-display">{formatCurrency(grandTotal)}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-3">
              {mobileRows.map((row) => (
                <Card
                  key={row.sellerId}
                  className="border-[color:var(--border-color)] bg-[var(--bg-card)] shadow-sm"
                >
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => setSelectedSellerId(row.sellerId)}
                  >
                    <CardHeader className="flex-row items-start justify-between gap-3 p-4">
                      <div className="space-y-1">
                        <CardTitle className="text-base leading-snug">{row.sellerName}</CardTitle>
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 px-4 pb-4">
                      <div className="rounded-xl bg-[color:var(--bg-primary)] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">TOTAL</div>
                        <div className="mt-1 number-display text-sm">{formatCurrency(row.total)}</div>
                      </div>
                      <div className="rounded-xl bg-[color:var(--bg-primary)] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">PROMEDIO</div>
                        <div className="mt-1 number-display text-sm">{formatCurrency(row.approximateDayAmount)}</div>
                      </div>
                      <div className="col-span-2 flex items-center justify-between rounded-xl bg-[color:var(--bg-primary)] px-3 py-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">DÍAS SIN VENTA</div>
                          <div className="mt-1 number-display text-sm">
                            {row.daysWithoutSale === 0 ? '0' : row.daysWithoutSale}
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center rounded-md border border-[color:var(--border-color)] px-3 py-1 text-xs font-medium text-[color:var(--text-primary)]">
                          Ver detalle
                        </span>
                      </div>
                    </CardContent>
                  </button>
                </Card>
              ))}
            </div>

            {mobileRows.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No hay empleados que coincidan con la búsqueda.
              </p>
            )}

            <Sheet
              open={!!selectedRow}
              onOpenChange={(open) => {
                if (!open) setSelectedSellerId(null)
              }}
            >
              <SheetContent
                side="bottom"
                className="h-[88vh] rounded-t-[28px] border-[color:var(--border-color)] bg-[var(--bg-card)] p-0"
              >
                {selectedRow ? (
                  <div className="flex h-full flex-col">
                    <SheetHeader className="border-b border-[color:var(--border-color)] px-5 pb-4 pt-6 text-left">
                      <SheetTitle className="text-left text-xl">{selectedRow.sellerName}</SheetTitle>
                      <SheetDescription className="text-left">
                        {t.common.monthlyPeriod}: {periodLabel}
                      </SheetDescription>
                    </SheetHeader>

                    <div className="grid grid-cols-2 gap-3 px-5 py-4">
                      <div className="rounded-2xl bg-[color:var(--bg-primary)] px-4 py-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                          <DollarSign className="h-3.5 w-3.5" />
                          Total del mes
                        </div>
                        <div className="mt-2 number-display text-lg">{formatCurrency(selectedRow.total)}</div>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--bg-primary)] px-4 py-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Monto día aprox
                        </div>
                        <div className="mt-2 number-display text-lg">{formatCurrency(selectedRow.approximateDayAmount)}</div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 pb-5">
                      <div className="space-y-2">
                        {dias.map((dia) => {
                          const value = selectedRow.byDate[dia] ?? 0

                          return (
                            <div
                              key={dia}
                              className="flex items-center justify-between rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] px-4 py-3"
                            >
                              <div>
                                <div className="text-sm font-medium">
                                  {formatDate(dia, 'EEEE dd', locale)}
                                </div>
                                <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                                  {value === 0 ? 'Sin venta' : 'Con venta'}
                                </div>
                              </div>
                              {value === 0 ? (
                                <Badge variant="destructive" className={zeroBadgeClassName}>
                                  {formatCurrency(value)}
                                </Badge>
                              ) : (
                                <div className="number-display text-sm">{formatCurrency(value)}</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </SheetContent>
            </Sheet>
          </div>

          <div className="hidden max-h-[calc(100vh-22rem)] overflow-auto rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] shadow-sm md:block">
            <table className="min-w-max w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-2 py-3 text-left text-xs font-medium uppercase text-[color:var(--table-header-text)] whitespace-nowrap min-w-56 shadow-[1px_0_0_var(--border-color)]">
                  {t.common.employee}
                </th>
                {dias.map((dia) => (
                  <th
                    key={dia}
                    className="sticky top-0 z-20 border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-2 py-3 text-right text-xs font-medium uppercase text-[color:var(--table-header-text)] whitespace-nowrap"
                  >
                    {formatDate(dia, 'EEEE dd', locale)}
                  </th>
                ))}
                <th className="sticky top-0 z-20 border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-2 py-3 text-center text-xs font-medium uppercase text-[color:var(--table-header-text)] whitespace-nowrap">
                  DÍAS SIN VENTA
                </th>
                <th className="sticky top-0 z-20 border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-2 py-3 text-right text-xs font-medium uppercase text-[color:var(--table-header-text)] whitespace-nowrap">
                  MONTO DÍA APROX
                </th>
                <th className="sticky top-0 z-20 border-b border-[color:var(--border-color)] bg-[color:var(--table-header-bg)] px-2 py-3 text-right text-xs font-medium uppercase text-[color:var(--table-header-text)] whitespace-nowrap">
                  {t.common.total}
                </th>
              </tr>
            </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={row.sellerId}
                    className="border-b border-[color:var(--border-color)]"
                    style={{ backgroundColor: rowIndex % 2 === 1 ? 'var(--table-row-alt)' : 'transparent' }}
                  >
                    <td
                      className="sticky left-0 z-10 px-2 py-3 whitespace-nowrap font-medium shadow-[1px_0_0_var(--border-color)]"
                      style={{ backgroundColor: rowIndex % 2 === 1 ? 'var(--table-row-alt)' : 'var(--bg-card)' }}
                    >
                      {row.sellerName}
                    </td>
                  {dias.map((dia) => (
                    <td key={dia} className="px-2 py-3 text-right whitespace-nowrap">
                      {renderAmount(row.byDate[dia] ?? 0)}
                    </td>
                  ))}
                  <td className="px-2 py-3 text-center whitespace-nowrap">
                    {row.daysWithoutSale === 0 ? (
                      <span className="inline-flex items-center rounded-full bg-[#7d9f8a] px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                        0 DÍAS
                      </span>
                    ) : (
                      <span className="tabular-nums">{row.daysWithoutSale} DÍAS</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right whitespace-nowrap">
                    {renderAmount(row.approximateDayAmount)}
                  </td>
                  <td className="px-2 py-3 text-right whitespace-nowrap font-medium">
                    {renderAmount(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
              <tfoot className="border-t border-[color:var(--border-color)] bg-[color:var(--bg-card)] font-medium">
                <tr>
                <td className="sticky left-0 z-30 bg-[color:var(--bg-card)] px-2 py-3 text-xs font-semibold uppercase whitespace-nowrap shadow-[1px_0_0_var(--border-color)]">
                  {t.common.grandTotal}
                </td>
                {dias.map((dia) => (
                  <td key={dia} className="px-2 py-3 text-right font-semibold whitespace-nowrap">
                    {renderAmount(totalDia(dia))}
                  </td>
                ))}
                <td className="px-2 py-3 text-center font-semibold whitespace-nowrap">
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                </td>
                <td className="px-2 py-3 text-right font-semibold whitespace-nowrap">
                  {renderAmount(rows.reduce((sum, row) => sum + row.approximateDayAmount, 0))}
                </td>
                <td className="px-2 py-3 text-right font-bold text-base whitespace-nowrap">
                  {renderAmount(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
