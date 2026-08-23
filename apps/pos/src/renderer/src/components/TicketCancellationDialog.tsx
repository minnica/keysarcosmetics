import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, PackageCheck, RotateCcw, XCircle } from "lucide-react";
import {
  Badge,
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
import { formatCurrency } from "../mock-data";
import type {
  Ticket,
  TicketCancellationRequest,
  TicketInventoryLine,
} from "../types";

type ReturnMode = "ALL" | "PARTIAL" | "NONE";

interface TicketCancellationDialogProps {
  open: boolean;
  ticket: Ticket | null;
  returnableProducts: TicketInventoryLine[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (request: TicketCancellationRequest) => void;
}

export function TicketCancellationDialog({
  open,
  ticket,
  returnableProducts,
  onOpenChange,
  onConfirm,
}: TicketCancellationDialogProps) {
  const [returnMode, setReturnMode] = useState<ReturnMode>("ALL");
  const [refundAmount, setRefundAmount] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open || !ticket) return;
    setReturnMode(returnableProducts.length > 0 ? "ALL" : "NONE");
    setRefundAmount(ticket.amountPaid);
    setQuantities(
      Object.fromEntries(
        returnableProducts.map((line) => [line.productId, line.quantity]),
      ),
    );
  }, [open, returnableProducts, ticket]);

  const returnedProducts = useMemo(() => {
    if (returnMode === "NONE") return [];
    return returnableProducts.flatMap((line) => {
      const quantity =
        returnMode === "ALL"
          ? line.quantity
          : Math.max(
              0,
              Math.min(line.quantity, quantities[line.productId] ?? 0),
            );
      return quantity > 0 ? [{ ...line, quantity }] : [];
    });
  }, [quantities, returnMode, returnableProducts]);

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ticket-cancellation-dialog sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Cancelar ticket {ticket.id}</DialogTitle>
          <DialogDescription>
            La cancelación descontará la venta y sus cobros de los reportes,
            retirará sus citas y registrará como suma lo que regrese a stock.
          </DialogDescription>
        </DialogHeader>

        <div className="ticket-cancellation-warning">
          <AlertTriangle size={19} />
          <span>
            El ticket quedará visible como <strong>CANCELADO</strong>; no se
            eliminará el rastro histórico.
          </span>
        </div>

        <section className="ticket-cancellation-section">
          <div className="ticket-cancellation-heading">
            <div>
              <span>DEVOLUCIÓN DE PRODUCTOS</span>
              <h3>¿El inventario regresa al stock?</h3>
            </div>
            <PackageCheck size={20} />
          </div>
          {returnableProducts.length > 0 ? (
            <div className="ticket-return-options" role="radiogroup">
              {(
                [
                  ["ALL", "Regresar todo"],
                  ["PARTIAL", "Regreso parcial"],
                  ["NONE", "No regresar"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={returnMode === value}
                  className={returnMode === value ? "is-active" : ""}
                  onClick={() => setReturnMode(value)}
                >
                  {value === "ALL" ? (
                    <RotateCcw size={16} />
                  ) : value === "NONE" ? (
                    <XCircle size={16} />
                  ) : (
                    <PackageCheck size={16} />
                  )}
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <p className="ticket-no-returnable-products">
              Este ticket no tiene productos físicos entregados para devolver.
            </p>
          )}

          {returnMode !== "NONE" && returnableProducts.length > 0 && (
            <div className="ticket-return-product-list">
              {returnableProducts.map((line) => (
                <div key={`${line.branch}-${line.productId}`}>
                  <span>
                    <strong>{line.productName}</strong>
                    <small>{line.branch} · entregado {line.quantity}</small>
                  </span>
                  {returnMode === "PARTIAL" ? (
                    <Input
                      aria-label={`Cantidad a regresar de ${line.productName}`}
                      type="number"
                      min="0"
                      max={line.quantity}
                      value={quantities[line.productId] ?? 0}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [line.productId]: Number(event.target.value),
                        }))
                      }
                    />
                  ) : (
                    <Badge variant="outline">{line.quantity} unidades</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ticket-cancellation-section">
          <div className="field-stack">
            <Label htmlFor="ticket-refund-amount">Monto a cancelar</Label>
            <Input
              id="ticket-refund-amount"
              type="number"
              min="0"
              max={ticket.amountPaid}
              step="0.01"
              value={refundAmount}
              onChange={(event) => setRefundAmount(Number(event.target.value))}
            />
            <small>
              Cobrado en el ticket: {formatCurrency(ticket.amountPaid)}. La
              venta completa de {formatCurrency(ticket.total)} dejará de sumar
              en los módulos.
            </small>
          </div>
        </section>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Conservar ticket
          </Button>
          <Button
            type="button"
            className="ticket-cancel-confirm"
            disabled={
              refundAmount < 0 ||
              refundAmount > ticket.amountPaid ||
              (returnMode === "PARTIAL" && returnedProducts.length === 0)
            }
            onClick={() =>
              onConfirm({
                refundAmount,
                returnedProducts,
              })
            }
          >
            <XCircle size={16} /> Confirmar cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
