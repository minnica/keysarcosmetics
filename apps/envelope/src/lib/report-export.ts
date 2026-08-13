'use client'

import type { CellObject } from 'xlsx'
import type { UserOptions } from 'jspdf-autotable'

export type ExportCellValue = string | number | null | undefined
export type ExportCellFormat = 'text' | 'number' | 'currency' | 'percent'

export type ExportColumn<T> = {
  header: string
  accessor: (row: T) => ExportCellValue
  width?: number
  format?: ExportCellFormat | ((row: T) => ExportCellFormat)
}

export type ReportExportConfig<T> = {
  title: string
  subtitle?: string
  filename: string
  sheetName: string
  orientation?: 'portrait' | 'landscape'
  columns: ExportColumn<T>[]
  rows: T[]
  footerRow?: T
  footerRows?: T[]
}

function sanitizeFilename(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function resolveFormat<T>(
  column: ExportColumn<T>,
  row: T,
): ExportCellFormat | undefined {
  return typeof column.format === 'function'
    ? column.format(row)
    : column.format
}

function formatForDisplay<T>(
  column: ExportColumn<T>,
  value: ExportCellValue,
  row: T,
): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const format = resolveFormat(column, row)

  if (format === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(value)
  }

  if (format === 'percent' && typeof value === 'number') {
    return `${value.toFixed(0)}%`
  }

  if (format === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return String(value)
}

function toExcelCell<T>(
  column: ExportColumn<T>,
  value: ExportCellValue,
  row: T,
): CellObject {
  if (value === null || value === undefined || value === '') {
    return { t: 's', v: '—' }
  }

  const format = resolveFormat(column, row)

  if (format === 'currency' && typeof value === 'number') {
    return {
      t: 'n',
      v: value,
      z: '$#,##0.00',
    }
  }

  if (format === 'percent' && typeof value === 'number') {
    return {
      t: 'n',
      v: value / 100,
      z: '0.00%',
    }
  }

  if (format === 'number' && typeof value === 'number') {
    return {
      t: 'n',
      v: value,
      z: '#,##0',
    }
  }

  return { t: 's', v: String(value) }
}

export async function exportReportToExcel<T>(config: ReportExportConfig<T>): Promise<void> {
  const XLSX = await import('xlsx')
  const filename = `${sanitizeFilename(config.filename)}.xlsx`
  const workbook = XLSX.utils.book_new()

  const titleRows = [[config.title], config.subtitle ? [config.subtitle] : []].filter(
    (row) => row.length > 0,
  )
  const headerRow = config.columns.map((column) => column.header)
  const bodyRows = config.rows.map((row) =>
    config.columns.map((column) =>
      toExcelCell(column, column.accessor(row), row),
    ),
  )
  const reportFooterRows =
    config.footerRows ?? (config.footerRow ? [config.footerRow] : [])
  const footerRows = reportFooterRows.map((row) =>
    config.columns.map((column) =>
      toExcelCell(column, column.accessor(row), row),
    ),
  )

  const sheet = XLSX.utils.aoa_to_sheet([
    ...titleRows,
    [],
    headerRow,
    ...bodyRows,
    ...footerRows,
  ])

  const widths = config.columns.map((column) => ({
    wch: Math.max(
      column.header.length,
      column.width ?? 12,
    ),
  }))
  sheet['!cols'] = widths
  const headerRowIndex = titleRows.length + 1
  const lastRowIndex = headerRowIndex + bodyRows.length
  const lastColumnIndex = Math.max(config.columns.length - 1, 0)
  sheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: 0 },
      e: { r: lastRowIndex, c: lastColumnIndex },
    }),
  }

  XLSX.utils.book_append_sheet(workbook, sheet, sanitizeFilename(config.sheetName).slice(0, 31) || 'Reporte')
  XLSX.writeFile(workbook, filename)
}

export async function exportReportToPdf<T>(config: ReportExportConfig<T>): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({
    orientation: config.orientation ?? 'landscape',
    unit: 'pt',
    format: 'a4',
  })

  const titleLines = [config.title, config.subtitle].filter(
    (line): line is string => Boolean(line),
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(titleLines[0] ?? config.title, 40, 32)

  if (titleLines[1]) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(titleLines[1], 40, 48)
  }

  const tableOptions: UserOptions = {
    startY: titleLines[1] ? 60 : 44,
    head: [config.columns.map((column) => column.header)],
    body: config.rows.map((row) =>
      config.columns.map((column) =>
        formatForDisplay(column, column.accessor(row), row),
      ),
    ),
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 4,
      overflow: 'linebreak',
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
    margin: { top: 72, left: 32, right: 32, bottom: 32 },
    tableWidth: 'auto',
    showFoot: 'lastPage',
  }

  const reportFooterRows =
    config.footerRows ?? (config.footerRow ? [config.footerRow] : [])
  if (reportFooterRows.length > 0) {
    tableOptions.foot = reportFooterRows.map((row) =>
      config.columns.map((column) =>
        formatForDisplay(column, column.accessor(row), row),
      ),
    )
  }

  autoTable(doc, tableOptions)

  doc.save(`${sanitizeFilename(config.filename)}.pdf`)
}
