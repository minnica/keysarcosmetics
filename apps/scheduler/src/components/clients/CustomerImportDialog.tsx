"use client";

import { useRef, useState } from "react";
import type {
  SchedulerCustomerFieldDefinitionDto,
  SchedulerCustomerSourceDto,
} from "@cosmetics/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cosmetics/ui";
import { AlertCircle, Download, FileSpreadsheet, Upload } from "lucide-react";
import {
  downloadSchedulerCustomerImportTemplate,
  readSchedulerCustomerImportFile,
  type SchedulerCustomerImportPreview,
  type SchedulerCustomerImportRow,
} from "@/lib/scheduler-customer-import";

export function CustomerImportDialog({
  branchName,
  definitions,
  disabled,
  onImport,
  onOpenChange,
  open,
  sources,
}: {
  branchName: string;
  definitions: SchedulerCustomerFieldDefinitionDto[];
  disabled: boolean;
  onImport: (rows: SchedulerCustomerImportRow[]) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sources: SchedulerCustomerSourceDto[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<SchedulerCustomerImportPreview | null>(
    null,
  );
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFileName("");
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function selectFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setError(null);
    setFileName(file.name);
    try {
      setPreview(
        await readSchedulerCustomerImportFile(file, definitions, sources),
      );
    } catch (cause) {
      setPreview(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible leer el archivo seleccionado.",
      );
    } finally {
      setReading(false);
    }
  }

  async function importRows() {
    if (!preview?.rows.length) return;
    setImporting(true);
    setError(null);
    try {
      await onImport(preview.rows);
      reset();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible importar los clientes.",
      );
    } finally {
      setImporting(false);
    }
  }

  const errors =
    preview?.issues.filter((issue) => issue.severity === "ERROR") ?? [];
  const warnings =
    preview?.issues.filter((issue) => issue.severity === "WARNING") ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !importing) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-[760px] overflow-y-auto rounded-[28px] border-[#e7ddd4] bg-white p-0">
        <DialogHeader className="border-b border-[#eee6df] px-6 py-5 pr-14 text-left">
          <DialogTitle className="page-title text-3xl text-[#263649]">
            Importar clientes
          </DialogTitle>
          <DialogDescription>
            La plantilla corresponde a{" "}
            {branchName || "la sucursal seleccionada"} y conserva el orden
            exacto de los campos activos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 bg-[#faf8f6] p-6">
          <section className="rounded-2xl border border-[#e6d9cd] bg-white p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5ede4] text-[#ad8b67]">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-[#263649]">
                    1. Descarga la plantilla
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Incluye instrucciones, encabezados y catálogos válidos para
                    procedencia y campos configurables.
                  </p>
                </div>
              </div>
              <Button
                className="shrink-0 rounded-xl"
                disabled={disabled}
                onClick={() =>
                  void downloadSchedulerCustomerImportTemplate({
                    branchName,
                    definitions,
                    sources,
                  })
                }
                type="button"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" /> Plantilla Excel
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e6d9cd] bg-white p-4">
            <p className="font-semibold text-[#263649]">
              2. Selecciona el archivo completo
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Se aceptan .xlsx, .xls y .csv. Primero se revisan columnas,
              obligatorios, listas, fechas y teléfonos repetidos dentro del
              archivo.
            </p>
            <input
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onChange={(event) => void selectFile(event.target.files?.[0])}
              type="file"
            />
            <Button
              className="mt-4 h-11 rounded-xl bg-[#263649] px-4 text-white hover:bg-[#1d2b3a]"
              disabled={disabled || reading || importing}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Upload className="mr-2 h-4 w-4" />
              {reading ? "Revisando…" : "Elegir archivo"}
            </Button>
            {fileName ? (
              <p className="mt-3 text-sm font-medium text-[#526273]">
                {fileName}
              </p>
            ) : null}
          </section>

          {preview ? (
            <section className="rounded-2xl border border-[#e6d9cd] bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <ImportMetric label="Registros" value={preview.rows.length} />
                <ImportMetric
                  label="Errores"
                  value={errors.length}
                  tone="error"
                />
                <ImportMetric
                  label="Advertencias"
                  value={warnings.length}
                  tone="warning"
                />
              </div>
              {preview.issues.length ? (
                <div className="mt-4 max-h-44 space-y-2 overflow-y-auto pr-1">
                  {preview.issues.map((issue, index) => (
                    <div
                      className={`flex gap-2 rounded-xl border px-3 py-2 text-xs ${
                        issue.severity === "ERROR"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                      key={`${issue.rowNumber}-${issue.message}-${index}`}
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Fila {issue.rowNumber}: {issue.message}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm font-medium text-emerald-700">
                  Archivo listo para importar.
                </p>
              )}
            </section>
          ) : null}

          {error ? (
            <p
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[#eee6df] bg-white px-6 py-4">
          <Button
            disabled={importing}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            className="bg-[#263649] text-white hover:bg-[#1d2b3a]"
            disabled={
              disabled ||
              importing ||
              !preview?.rows.length ||
              errors.length > 0
            }
            onClick={() => void importRows()}
            type="button"
          >
            {importing
              ? "Importando…"
              : `Importar ${preview?.rows.length ?? 0} clientes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportMetric({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "error" | "warning";
  value: number;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        tone === "error"
          ? "border-rose-200 bg-rose-50"
          : tone === "warning"
            ? "border-amber-200 bg-amber-50"
            : "border-[#e6d9cd] bg-[#faf8f6]"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-[#263649]">{value}</p>
    </div>
  );
}
