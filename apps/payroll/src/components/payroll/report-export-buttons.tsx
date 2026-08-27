"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet, Loader2, Printer } from "lucide-react";
import { Button, toast } from "@cosmetics/ui";
import {
  exportReportToExcel,
  exportReportToPdf,
  type ReportExportConfig,
} from "@/lib/report-export";

type ReportExportButtonsProps<T> = {
  config: ReportExportConfig<T>;
  disabled?: boolean;
  iconOnly?: boolean;
  appearance?: "default" | "on-dark";
};

export function ReportExportButtons<T>({
  config,
  disabled,
  iconOnly = false,
  appearance = "default",
}: ReportExportButtonsProps<T>) {
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  async function exportReport(format: "pdf" | "excel") {
    setExporting(format);
    try {
      if (format === "pdf") await exportReportToPdf(config);
      else await exportReportToExcel(config);
      toast.success(`Reporte ${format.toUpperCase()} generado.`);
    } catch {
      toast.error(`No se pudo generar el reporte ${format.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Exportar reporte">
      <Button
        type="button"
        variant="outline"
        size={iconOnly ? "icon" : "sm"}
        className={appearance === "on-dark" ? "border-white/40 bg-[#f7efe7] text-[#2d241d] shadow-[0_5px_16px_rgba(0,0,0,0.2)] hover:border-white hover:bg-white hover:text-[#17130f]" : undefined}
        disabled={disabled || exporting !== null}
        onClick={() => window.print()}
        aria-label="Imprimir reporte ejecutivo"
        title="Imprimir reporte"
      >
        <Printer className={`${iconOnly ? "h-5 w-5" : "mr-2 h-4 w-4"}`} />
        {!iconOnly && "Imprimir"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size={iconOnly ? "icon" : "sm"}
        className={appearance === "on-dark" ? "border-white/40 bg-[#f7efe7] text-[#2d241d] shadow-[0_5px_16px_rgba(0,0,0,0.2)] hover:border-white hover:bg-white hover:text-[#17130f] disabled:border-white/20 disabled:bg-white/20 disabled:text-white/45" : undefined}
        disabled={disabled || exporting !== null}
        onClick={() => void exportReport("pdf")}
        aria-label={exporting === "pdf" ? "Generando reporte PDF" : "Exportar reporte PDF"}
        title="Exportar PDF"
      >
        {exporting === "pdf" ? (
          <Loader2 className={`${iconOnly ? "" : "mr-2"} h-4 w-4 animate-spin`} />
        ) : (
          <FileDown className={`${iconOnly ? "h-5 w-5" : "mr-2 h-4 w-4"}`} />
        )}
        {!iconOnly && (exporting === "pdf" ? "Generando PDF…" : "Exportar PDF")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size={iconOnly ? "icon" : "sm"}
        className={appearance === "on-dark" ? "border-white/40 bg-[#f7efe7] text-[#2d241d] shadow-[0_5px_16px_rgba(0,0,0,0.2)] hover:border-white hover:bg-white hover:text-[#17130f] disabled:border-white/20 disabled:bg-white/20 disabled:text-white/45" : undefined}
        disabled={disabled || exporting !== null}
        onClick={() => void exportReport("excel")}
        aria-label={exporting === "excel" ? "Generando reporte Excel" : "Exportar reporte Excel"}
        title="Exportar Excel"
      >
        {exporting === "excel" ? (
          <Loader2 className={`${iconOnly ? "" : "mr-2"} h-4 w-4 animate-spin`} />
        ) : (
          <FileSpreadsheet className={`${iconOnly ? "h-5 w-5" : "mr-2 h-4 w-4"}`} />
        )}
        {!iconOnly && (exporting === "excel" ? "Generando Excel…" : "Exportar Excel")}
      </Button>
    </div>
  );
}
