"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@cosmetics/ui";
import { Download, KeyRound, ShieldCheck } from "lucide-react";

export function CustomerExportDialog({
  branchName,
  exporting,
  onExport,
  onOpenChange,
  open,
  requiresCode,
}: {
  branchName: string;
  exporting: boolean;
  onExport: (secret?: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  requiresCode: boolean;
}) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (requiresCode && !secret) {
      setError("Ingresa un código autorizado para exportar clientes.");
      return;
    }
    setError(null);
    try {
      await onExport(secret || undefined);
      setSecret("");
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible exportar los clientes.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !exporting) {
          setSecret("");
          setError(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-[560px] rounded-[28px] border-[#e7ddd4] bg-white p-0">
        <DialogHeader className="border-b border-[#eee6df] px-6 py-5 pr-14 text-left">
          <DialogTitle className="page-title text-3xl text-[#263649]">
            Exportar clientes
          </DialogTitle>
          <DialogDescription>
            Descarga en Excel los registros autorizados de {branchName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 bg-[#faf8f6] p-6">
          <div className="flex gap-3 rounded-2xl border border-[#e6d9cd] bg-white p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5ede4] text-[#ad8b67]">
              {requiresCode ? (
                <KeyRound className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </span>
            <div>
              <p className="font-semibold text-[#263649]">
                {requiresCode
                  ? "Requiere código autorizado"
                  : "Rol con permiso de exportación"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {requiresCode
                  ? "El permiso se valida para esta descarga y no se guarda el código."
                  : "Tu rol permite esta descarga sin solicitar un código adicional."}
              </p>
            </div>
          </div>
          {requiresCode ? (
            <div className="space-y-2">
              <Label htmlFor="customer-export-secret">Código personal</Label>
              <Input
                autoComplete="one-time-code"
                className="h-11 rounded-xl border-[#dfd5cc] bg-white tracking-[0.2em]"
                id="customer-export-secret"
                inputMode="numeric"
                maxLength={12}
                onChange={(event) =>
                  setSecret(event.target.value.replace(/\D/g, ""))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit();
                }}
                placeholder="Código autorizado"
                type="password"
                value={secret}
              />
            </div>
          ) : null}
          {error ? (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="border-t border-[#eee6df] bg-white px-6 py-4">
          <Button
            disabled={exporting}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            className="bg-[#263649] text-white hover:bg-[#1d2b3a]"
            disabled={exporting || (requiresCode && !secret)}
            onClick={() => void submit()}
            type="button"
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Generando…" : "Descargar Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
