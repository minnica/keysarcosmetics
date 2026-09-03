import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Gift,
  PackageCheck,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import type {
  Ticket,
  TicketCancellationRequest,
  TicketInventoryLine,
} from "../types";

type ReturnMode = "ALL" | "SELECT" | "NONE";
type ProductDecision = "RETURN" | "GIFT" | "COURTESY";

interface TicketCancellationDialogProps {
  open: boolean;
  ticket: Ticket | null;
  returnableProducts: TicketInventoryLine[];
  onOpenChange: (open: boolean) => void;
  authorizationRequired?: boolean;
  defaultAuthorizationAlias?: string;
  onConfirm: (request: TicketCancellationRequest) => void | Promise<void>;
}

export function TicketCancellationDialog({
  open,
  ticket,
  returnableProducts,
  onOpenChange,
  onConfirm,
  authorizationRequired = false,
  defaultAuthorizationAlias = "",
}: TicketCancellationDialogProps) {
  const [returnMode, setReturnMode] = useState<ReturnMode>("ALL");
  const [refundAmount, setRefundAmount] = useState(0);
  const [productDecisions, setProductDecisions] = useState<
    Record<string, ProductDecision>
  >({});
  const [reason, setReason] = useState("");
  const [authorizationAlias, setAuthorizationAlias] = useState("");
  const [authorizationCode, setAuthorizationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !ticket) return;
    setReturnMode(returnableProducts.length > 0 ? "ALL" : "NONE");
    setRefundAmount(ticket.amountPaid);
    setReason("");
    setAuthorizationAlias(defaultAuthorizationAlias);
    setAuthorizationCode("");
    setProductDecisions(
      Object.fromEntries(
        returnableProducts.map((line) => [line.productId, "RETURN"]),
      ),
    );
  }, [defaultAuthorizationAlias, open, returnableProducts, ticket]);

  const returnedProducts = useMemo(() => {
    if (returnMode === "NONE") return [];
    return returnableProducts.filter(
      (line) =>
        returnMode === "ALL" ||
        (returnMode === "SELECT" &&
          productDecisions[line.productId] === "RETURN"),
    );
  }, [productDecisions, returnMode, returnableProducts]);

  const nonReturnedProducts = useMemo(() => {
    if (returnMode !== "SELECT") return [];
    return returnableProducts.flatMap((line) => {
      const decision = productDecisions[line.productId];
      return decision === "GIFT" || decision === "COURTESY"
        ? [{ ...line, disposition: decision }]
        : [];
    });
  }, [productDecisions, returnMode, returnableProducts]);

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
                  ["ALL", "Sí, regresar todo"],
                  ["NONE", "No regresar"],
                  ["SELECT", "Elegir regalo o cortesía"],
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
                    <Gift size={16} />
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

          {returnMode === "ALL" && returnableProducts.length > 0 && (
            <div className="ticket-return-product-list">
              {returnableProducts.map((line) => (
                <div key={`${line.branch}-${line.productId}`}>
                  <span>
                    <strong>{line.productName}</strong>
                    <small>{line.branch} · entregado {line.quantity}</small>
                  </span>
                  <Badge variant="outline">{line.quantity} unidades</Badge>
                </div>
              ))}
            </div>
          )}

          {returnMode === "SELECT" && returnableProducts.length > 0 && (
            <div className="ticket-return-product-list ticket-return-decision-list">
              {returnableProducts.map((line) => (
                <div key={`${line.branch}-${line.productId}`}>
                  <span>
                    <strong>{line.productName}</strong>
                    <small>
                      {line.branch} · {line.quantity} unidades
                    </small>
                  </span>
                  <Select
                    value={productDecisions[line.productId] ?? "RETURN"}
                    onValueChange={(value) =>
                      setProductDecisions((current) => ({
                        ...current,
                        [line.productId]: value as ProductDecision,
                      }))
                    }
                  >
                    <SelectTrigger
                      aria-label={`Decisión para ${line.productName}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETURN">
                        <span className="ticket-decision-option">
                          <RotateCcw size={14} /> Regresar a stock
                        </span>
                      </SelectItem>
                      <SelectItem value="GIFT">
                        <span className="ticket-decision-option">
                          <Gift size={14} /> Producto de regalo
                        </span>
                      </SelectItem>
                      <SelectItem value="COURTESY">
                        <span className="ticket-decision-option">
                          <Sparkles size={14} /> Producto de cortesía
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <small>
                Sólo los productos marcados para regresar se sumarán al
                inventario. Regalos y cortesías quedarán documentados en el
                ticket cancelado.
              </small>
            </div>
          )}
        </section>

        <section className="ticket-cancellation-section">
          <div className="field-stack">
            <Label htmlFor="ticket-cancellation-reason">Motivo</Label>
            <Input
              id="ticket-cancellation-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motivo de la cancelación o devolución"
            />
          </div>
          {authorizationRequired && (
            <div className="form-grid two-columns">
              <div className="field-stack">
                <Label htmlFor="ticket-cancellation-alias">Alias master</Label>
                <Input id="ticket-cancellation-alias" value={authorizationAlias} onChange={(event) => setAuthorizationAlias(event.target.value)} />
              </div>
              <div className="field-stack">
                <Label htmlFor="ticket-cancellation-code">PIN master</Label>
                <Input id="ticket-cancellation-code" type="password" value={authorizationCode} onChange={(event) => setAuthorizationCode(event.target.value)} />
              </div>
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
              submitting ||
              reason.trim().length < 3 ||
              (authorizationRequired && (!authorizationAlias.trim() || !authorizationCode)) ||
              (returnMode === "SELECT" &&
                returnedProducts.length === 0 &&
                nonReturnedProducts.length === 0)
            }
            onClick={() => {
              setSubmitting(true);
              void Promise.resolve(onConfirm({
                refundAmount,
                returnedProducts,
                nonReturnedProducts,
                reason: reason.trim(),
                authorizationAlias: authorizationAlias.trim(),
                authorizationCode,
              })).finally(() => setSubmitting(false));
            }}
          >
            <XCircle size={16} /> Confirmar cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
