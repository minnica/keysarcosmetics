"use client";

import { useEffect, useState } from "react";
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
import { KeyRound, ShieldCheck } from "lucide-react";

export function SchedulerOperationAuthorizationDialog({
  open,
  title,
  description,
  saving,
  error,
  onOpenChange,
  onAuthorize,
}: {
  open: boolean;
  title: string;
  description: string;
  saving: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onAuthorize: (code: string) => void;
}) {
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!open) setCode("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(440px,calc(100vw-2rem))] rounded-[24px] border-0 bg-white p-0 shadow-[0_24px_70px_rgba(7,12,20,0.28)]">
        <DialogHeader className="border-b border-[#eee6df] px-6 py-5 text-left">
          <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <DialogTitle className="text-xl text-[#263649]">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onAuthorize(code);
          }}
        >
          <div className="space-y-2 px-6 py-5">
            <Label htmlFor="operation-personal-code">Código personal</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ad8b67]" />
              <Input
                autoComplete="off"
                autoFocus
                className="h-12 rounded-xl border-[#dfd5cc] pl-10"
                id="operation-personal-code"
                inputMode="numeric"
                maxLength={12}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                type="password"
                value={code}
              />
            </div>
            <p className="text-xs leading-5 text-slate-500">
              El código sólo identifica al responsable y nunca se guarda en el movimiento.
            </p>
            {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}
          </div>
          <DialogFooter className="border-t border-[#eee6df] px-6 py-4">
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancelar
            </Button>
            <Button className="bg-[#263649] text-white hover:bg-[#1d2b3a]" disabled={code.length < 4 || saving} type="submit">
              {saving ? "Autorizando…" : "Autorizar movimiento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
