"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "@cosmetics/ui";
import { HandCoins, WalletCards } from "lucide-react";
import type { DesignCustomerLayawaySummary } from "../../../design/contracts";
import { formatMoney } from "./scheduler-utils";

interface SchedulerLayawayPaymentDialogProps {
  customerName: string;
  layaway: DesignCustomerLayawaySummary | null;
  open: boolean;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number) => void;
}

export function SchedulerLayawayPaymentDialog({
  customerName,
  layaway,
  open,
  saving = false,
  onOpenChange,
  onSubmit,
}: SchedulerLayawayPaymentDialogProps) {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open) setAmount("");
  }, [open, layaway?.sourceAppointmentId]);

  if (!layaway) return null;

  const paymentAmount = Number(amount);
  const validPayment =
    Number.isFinite(paymentAmount) &&
    paymentAmount > 0 &&
    paymentAmount < layaway.balanceAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scheduler-modal-shell max-w-lg rounded-2xl border-0 bg-white">
        <DialogHeader className="text-left">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5ede4] text-[#9a7654]">
              <WalletCards className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>Abonar o liquidar apartado</DialogTitle>
              <p className="mt-1 text-sm text-slate-500">{customerName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#eadfd4] bg-[#fbf7f2] p-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Venta</p>
            <p className="mt-1 font-semibold text-slate-800">
              {formatMoney(layaway.saleAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Abonado</p>
            <p className="mt-1 font-semibold text-emerald-700">
              {formatMoney(layaway.paidAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Saldo</p>
            <p className="mt-1 font-semibold text-amber-700">
              {formatMoney(layaway.balanceAmount)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="scheduler-modal-label" htmlFor="layaway-payment-amount">
            Monto del abono
          </label>
          <Input
            id="layaway-payment-amount"
            inputMode="decimal"
            max={layaway.balanceAmount}
            min="0.01"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={amount}
          />
          <p className="text-xs text-slate-500">
            El abono debe ser menor al saldo. Para cubrirlo completo usa
            Liquidar.
          </p>
        </div>

        {layaway.payments.length ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Abonos posteriores registrados
            </p>
            <div className="mt-2 space-y-1.5">
              {layaway.payments.map((payment) => (
                <div
                  className="flex items-center justify-between gap-3 text-xs text-slate-600"
                  key={payment.id}
                >
                  <span>{payment.actorName}</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {formatMoney(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            disabled={saving}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cerrar
          </Button>
          <Button
            disabled={!validPayment || saving}
            onClick={() => onSubmit(paymentAmount)}
            variant="outline"
          >
            <HandCoins className="mr-2 h-4 w-4" />
            Abonar
          </Button>
          <Button
            disabled={saving || layaway.balanceAmount <= 0}
            onClick={() => onSubmit(layaway.balanceAmount)}
          >
            {saving
              ? "Guardando…"
              : `Liquidar ${formatMoney(layaway.balanceAmount)}`}
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Ambas acciones solicitarán un código personal autorizado y quedarán
          registradas en movimientos.
        </p>
      </DialogContent>
    </Dialog>
  );
}
