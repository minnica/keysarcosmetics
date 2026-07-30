'use client'

import { useState } from 'react'
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button, toast } from '@cosmetics/ui'
import {
  exportReportToExcel,
  exportReportToPdf,
  type ReportExportConfig,
} from '@/lib/report-export'

type ReportExportButtonsProps<T> = {
  config: ReportExportConfig<T>
  disabled?: boolean
}

export function ReportExportButtons<T>({ config, disabled }: ReportExportButtonsProps<T>) {
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  async function exportReport(format: 'pdf' | 'excel') {
    setExporting(format)
    try {
      if (format === 'pdf') await exportReportToPdf(config)
      else await exportReportToExcel(config)
      toast.success(`Reporte ${format.toUpperCase()} generado.`)
    } catch {
      toast.error(`No se pudo generar el reporte ${format.toUpperCase()}.`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || exporting !== null}
        onClick={() => void exportReport('pdf')}
      >
        {exporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
        {exporting === 'pdf' ? 'Generando PDF…' : 'Exportar PDF'}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || exporting !== null}
        onClick={() => void exportReport('excel')}
      >
        {exporting === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
        {exporting === 'excel' ? 'Generando Excel…' : 'Exportar Excel'}
      </Button>
    </div>
  )
}
