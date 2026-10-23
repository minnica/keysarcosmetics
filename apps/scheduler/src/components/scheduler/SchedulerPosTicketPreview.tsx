"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  cn,
} from "@cosmetics/ui";
import { ChevronRight, ReceiptText, X } from "lucide-react";
import type { DesignPosTicketSnapshot } from "../../../design/contracts";
import { formatMoney } from "./scheduler-utils";

interface SchedulerPosTicketPreviewProps {
  ticket: DesignPosTicketSnapshot;
  clientName: string;
  branchName?: string | null;
  specialistName?: string | null;
  className?: string;
  tone?: "light" | "dark";
}

const ticketStatusLabels: Record<DesignPosTicketSnapshot["status"], string> = {
  COMPLETED: "Liquidado",
  LAYAWAY: "Apartado",
};

export function SchedulerPosTicketPreview({
  ticket,
  clientName,
  branchName,
  specialistName,
  className,
  tone = "light",
}: SchedulerPosTicketPreviewProps) {
  const lineTotal = ticket.lines.reduce((total, line) => total + line.total, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label={`Ver ticket POS ${ticket.folio}`}
          className={cn(
            "group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
            tone === "dark"
              ? "border-emerald-200/20 bg-emerald-50/10 text-white hover:bg-emerald-50/15"
              : "border-[#d9e5df] bg-[#f3f8f5] text-slate-700 hover:border-emerald-300 hover:bg-emerald-50",
            className,
          )}
          type="button"
        >
          <span className="min-w-0">
            <span
              className={cn(
                "flex items-center gap-2 text-sm font-semibold",
                tone === "dark" ? "text-emerald-100" : "text-[#315f50]",
              )}
            >
              <ReceiptText className="h-4 w-4" /> Ticket POS {ticket.folio}
            </span>
            <span
              className={cn(
                "mt-1 block text-xs",
                tone === "dark" ? "text-white/50" : "text-slate-500",
              )}
            >
              Sólo lectura · {formatMoney(ticket.total)} · Clic para visualizar
            </span>
          </span>
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 transition group-hover:translate-x-0.5",
              tone === "dark" ? "text-white/50" : "text-emerald-700",
            )}
          />
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-[92vh] w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-[26px] border-[#ddd7d1] bg-[#f4f1ed] p-0 shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
        hideCloseButton
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="relative border-b border-[#ded7cf] bg-white px-5 py-4 pr-16 text-left">
          <DialogTitle className="flex items-center gap-2 text-[1.15rem] text-slate-900">
            <ReceiptText className="h-5 w-5" /> Ticket final
          </DialogTitle>
          <DialogDescription>
            Vista del comprobante emitido por Punto de Venta. Sólo lectura.
          </DialogDescription>
          <DialogClose asChild>
            <button
              aria-label={`Cerrar ticket ${ticket.folio}`}
              className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#ded7cf] bg-white text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              type="button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="max-h-[calc(92vh-150px)] overflow-y-auto p-4 sm:p-6">
          <article
            aria-label={`Ticket ${ticket.folio}`}
            className="mx-auto w-full max-w-[330px] bg-white px-5 py-6 font-mono text-[10px] text-black shadow-[0_12px_30px_rgba(30,26,23,0.18)]"
          >
            <header className="grid justify-items-center gap-1 text-center">
              <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full border-2 border-black font-serif text-xl font-bold">
                K
              </div>
              <h2 className="m-0 font-serif text-lg tracking-[0.13em]">
                KEYSAR COSMETICS
              </h2>
              <strong className="uppercase tracking-[0.08em]">
                {branchName ? `Sucursal ${branchName}` : "Punto de Venta"}
              </strong>
            </header>

            <section className="my-4 grid gap-1 border-y border-black py-2.5 text-center">
              <span className="text-[7px] tracking-[0.12em]">FOLIO</span>
              <strong className="text-[11px] tracking-[0.05em]">
                {ticket.folio}
              </strong>
              <small className="text-[8px]">{ticket.businessDate}</small>
            </section>

            <section className="mb-3 grid gap-1.5">
              <div className="flex justify-between gap-3">
                <span className="text-[7px] tracking-[0.12em]">CLIENTE</span>
                <strong className="max-w-[70%] text-right">{clientName}</strong>
              </div>
              {specialistName ? (
                <div className="flex justify-between gap-3">
                  <span className="text-[7px] tracking-[0.12em]">
                    FACIALISTA
                  </span>
                  <strong className="max-w-[70%] text-right">
                    {specialistName}
                  </strong>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <span className="text-[7px] tracking-[0.12em]">ESTATUS</span>
                <strong>{ticketStatusLabels[ticket.status]}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[7px] tracking-[0.12em]">ORIGEN</span>
                <strong>
                  {ticket.appointmentCreatedFromPos ? "POS · Agenda" : "POS"}
                </strong>
              </div>
            </section>

            <section className="border-t border-dashed border-black py-3">
              <div className="mb-2 flex justify-between gap-3 text-[7px] font-bold tracking-[0.1em]">
                <span>DESCRIPCIÓN</span>
                <span>IMPORTE</span>
              </div>
              {ticket.lines.map((line) => (
                <div
                  className="my-1.5 flex justify-between gap-3"
                  key={line.id}
                >
                  <span className="max-w-[68%]">
                    {line.quantity} × {line.name}
                    {line.kind === "MEMBERSHIP" ? (
                      <small className="block text-[7px] text-neutral-600">
                        Membresía
                      </small>
                    ) : null}
                  </span>
                  <strong>{formatMoney(line.total)}</strong>
                </div>
              ))}
            </section>

            <section className="border-t border-dashed border-black py-3">
              {lineTotal !== ticket.total ? (
                <div className="my-1 flex justify-between gap-3">
                  <span>Subtotal</span>
                  <strong>{formatMoney(lineTotal)}</strong>
                </div>
              ) : null}
              <div className="mt-2 flex justify-between gap-3 border-t-2 border-black pt-2 text-sm">
                <span>TOTAL</span>
                <strong>{formatMoney(ticket.total)}</strong>
              </div>
              <p className="mt-2 text-center text-[7px]">
                Todos nuestros precios ya incluyen IVA.
              </p>
            </section>

            <footer className="grid gap-2 border-t border-dashed border-black pt-3 text-center">
              <strong className="font-serif text-xs">
                Gracias por tu compra
              </strong>
              <span className="text-[7px] tracking-[0.1em]">
                ••• KEYSAR COSMETICS •••
              </span>
            </footer>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
