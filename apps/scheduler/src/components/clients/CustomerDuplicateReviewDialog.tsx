"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cosmetics/ui";
import {
  GitMerge,
  RefreshCw,
  SearchX,
  Smartphone,
  UserRound,
} from "lucide-react";
import type { DesignCustomerDuplicateCandidate } from "../../../design/contracts";
import { SchedulerProtectedPhone } from "@/components/scheduler/SchedulerProtectedPhone";

export function CustomerDuplicateReviewDialog({
  canViewCustomerPhone,
  candidates,
  error,
  loading,
  onOpenChange,
  onRetry,
  onReview,
  open,
}: {
  canViewCustomerPhone: boolean;
  candidates: DesignCustomerDuplicateCandidate[];
  error: string | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onReview: (candidate: DesignCustomerDuplicateCandidate) => void;
  open: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[820px] overflow-y-auto rounded-[28px] border-[#e7ddd4] bg-white p-0">
        <DialogHeader className="border-b border-[#eee6df] px-6 py-5 pr-14 text-left">
          <DialogTitle className="page-title text-3xl text-[#263649]">
            Posibles registros repetidos
          </DialogTitle>
          <DialogDescription>
            Coincidencias por teléfono, correo o nombre completo. Revisa los dos
            perfiles antes de elegir cuál identidad conservar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 bg-[#faf8f6] p-6">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Revisando coincidencias…
            </p>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <p>{error}</p>
              <Button
                className="mt-3"
                onClick={onRetry}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Reintentar
              </Button>
            </div>
          ) : candidates.length ? (
            candidates.map((candidate) => (
              <article
                className="rounded-2xl border border-[#e2d6ca] bg-white p-4 shadow-[0_8px_24px_rgba(38,54,73,0.04)]"
                key={candidate.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {candidate.reasons.map((reason) => (
                      <Badge
                        className="rounded-full border-[#dfcdbb] bg-[#fbf4ec] text-[#8e6c4b]"
                        key={`${candidate.id}-${reason.kind}`}
                        title={reason.value}
                        variant="outline"
                      >
                        {reason.kind === "PHONE" ? (
                          <Smartphone className="mr-1 h-3 w-3" />
                        ) : (
                          <UserRound className="mr-1 h-3 w-3" />
                        )}
                        {reason.label}
                      </Badge>
                    ))}
                  </div>
                  <Badge
                    className={
                      candidate.confidence === "HIGH"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
                    {candidate.confidence === "HIGH"
                      ? "Coincidencia alta"
                      : "Revisar identidad"}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {candidate.customers.map((customer) => (
                    <div
                      className="rounded-xl border border-[#eee6df] bg-[#fcfaf8] p-3"
                      key={customer.id}
                    >
                      <p className="font-semibold text-[#263649]">
                        {customer.displayName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        <SchedulerProtectedPhone
                          canView={canViewCustomerPhone}
                          phone={customer.phone}
                        />
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {customer.email || "Sin correo"}
                      </p>
                      <p className="mt-2 text-[11px] font-medium text-[#8e6c4b]">
                        {customer.currentPortfolios
                          .map((portfolio) => portfolio.ownerName)
                          .join(", ") || "Sin cartera vigente"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    className="rounded-xl"
                    onClick={() => onReview(candidate)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <GitMerge className="mr-2 h-3.5 w-3.5" /> Revisar fusión
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5ede4] text-[#ad8b67]">
                <SearchX className="h-5 w-5" />
              </span>
              <p className="mt-4 font-semibold text-[#263649]">
                No hay coincidencias pendientes
              </p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                No encontramos teléfonos, correos o nombres completos repetidos
                en la sucursal seleccionada.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#eee6df] bg-white px-6 py-4">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
