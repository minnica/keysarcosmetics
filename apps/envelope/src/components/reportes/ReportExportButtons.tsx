'use client'

import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@cosmetics/ui'

type ReportExportButtonsProps = {
  disabled?: boolean
  exporting?: 'pdf' | 'excel' | null
  onExportPdf: () => void
  onExportExcel: () => void
  pdfLabel: string
  excelLabel: string
}

export function ReportExportButtons({
  disabled,
  exporting,
  onExportPdf,
  onExportExcel,
  pdfLabel,
  excelLabel,
}: ReportExportButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onExportPdf}
        disabled={disabled || exporting === 'pdf'}
      >
        {exporting === 'pdf' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        {pdfLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onExportExcel}
        disabled={disabled || exporting === 'excel'}
      >
        {exporting === 'excel' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4" />
        )}
        {excelLabel}
      </Button>
    </div>
  )
}
