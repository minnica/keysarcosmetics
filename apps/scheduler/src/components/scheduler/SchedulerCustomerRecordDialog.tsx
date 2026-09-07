"use client";

import type { SchedulerCustomerDetailDto } from "@cosmetics/types";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@cosmetics/ui";
import { Mail, MapPin, Phone, UserRound, X } from "lucide-react";
import type { Booking } from "@/lib/scheduler-presentation";

export function SchedulerCustomerRecordDialog({
  booking,
  detail,
  open,
  onOpenChange,
}: {
  booking: Booking | null;
  detail: SchedulerCustomerDetailDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!booking || !detail) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scheduler-dialog border-0 bg-transparent p-0 shadow-none sm:max-w-[620px]">
        <div className="scheduler-modal-shell max-h-[88vh] overflow-hidden rounded-2xl">
          <DialogHeader className="border-b border-[rgba(236,209,200,0.88)] bg-white px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="label-caps">Ficha autorizada</p>
                <DialogTitle className="mt-1 truncate text-[1.35rem] font-semibold tracking-[-0.025em] text-[var(--scheduler-ink-strong)]">
                  {detail.displayName}
                </DialogTitle>
              </div>
              <button
                aria-label="Cerrar ficha"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(236,209,200,0.95)] bg-white text-slate-500 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(88vh-88px)] space-y-4 overflow-y-auto bg-white px-5 py-5 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--scheduler-accent-soft)] p-4">
                <Phone className="h-4 w-4 text-[var(--scheduler-accent-strong)]" />
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                  Teléfono
                </p>
                <p className="mt-1 font-medium text-[var(--scheduler-ink-strong)]">
                  {detail.phone || "Sin información"}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--scheduler-accent-soft)] p-4">
                <Mail className="h-4 w-4 text-[var(--scheduler-accent-strong)]" />
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                  Correo
                </p>
                <p className="mt-1 break-all font-medium text-[var(--scheduler-ink-strong)]">
                  {detail.email || "Sin información"}
                </p>
              </div>
            </div>
            <section className="rounded-xl border border-[rgba(236,209,200,0.78)] p-4">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-[var(--scheduler-accent-strong)]" />
                <h3 className="font-semibold text-[var(--scheduler-ink-strong)]">
                  Perfil
                </h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">
                  {detail.active ? "Activo" : "Inactivo"}
                </Badge>
                {detail.preferredName ? (
                  <Badge variant="outline">
                    Prefiere: {detail.preferredName}
                  </Badge>
                ) : null}
                {detail.source ? (
                  <Badge variant="outline">Origen: {detail.source.name}</Badge>
                ) : null}
                {detail.profile?.contactPreference ? (
                  <Badge variant="outline">
                    Contacto: {detail.profile.contactPreference}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {detail.notes ||
                  detail.profile?.notes ||
                  "Sin notas registradas."}
              </p>
            </section>
            <section className="rounded-xl border border-[rgba(236,209,200,0.78)] p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--scheduler-accent-strong)]" />
                <h3 className="font-semibold text-[var(--scheduler-ink-strong)]">
                  Cartera vigente
                </h3>
              </div>
              <div className="mt-3 space-y-2">
                {detail.currentPortfolios.length ? (
                  detail.currentPortfolios.map((portfolio) => (
                    <p className="text-sm text-slate-600" key={portfolio.id}>
                      {portfolio.branchName || "Todas las sucursales"} ·{" "}
                      {portfolio.ownerName || "Empresa"}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Sin cartera vigente.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
