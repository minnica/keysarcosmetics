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
  DatePicker,
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
  TicketMembershipRefundSession,
} from "../types";

type ReturnMode = "ALL" | "SELECT" | "NONE";
type ProductDecision = "RETURN" | "GIFT" | "COURTESY" | "WRITE_OFF";

interface TicketCancellationDialogProps {
  open: boolean;
  ticket: Ticket | null;
  returnableProducts: TicketInventoryLine[];
  membershipSessions: TicketMembershipRefundSession[];
  authorizationRequired: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (request: TicketCancellationRequest) => void;
}

export function TicketCancellationDialog({
  open,
  ticket,
  returnableProducts,
  membershipSessions,
  authorizationRequired,
  onOpenChange,
  onConfirm,
}: TicketCancellationDialogProps) {
  const [returnMode, setReturnMode] = useState<ReturnMode>("ALL");
  const [refundAmount, setRefundAmount] = useState(0);
  const [effectiveDateMode, setEffectiveDateMode] = useState<
    "CANCELLATION_DATE" | "ORIGINAL_SALE_DATE" | "CUSTOM_DATE"
  >("CANCELLATION_DATE");
  const [customEffectiveDate, setCustomEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [authorizationCode, setAuthorizationCode] = useState("");
  const [productDecisions, setProductDecisions] = useState<
    Record<string, ProductDecision>
  >({});
  const [membershipDecisions, setMembershipDecisions] = useState<
    Record<string, "PENDING_REASSIGNMENT" | "LOST_CLIENT">
  >({});

  useEffect(() => {
    if (!open || !ticket) return;
    setReturnMode(returnableProducts.length > 0 ? "ALL" : "NONE");
    setRefundAmount(ticket.amountPaid);
    setEffectiveDateMode("CANCELLATION_DATE");
    setCustomEffectiveDate("");
    setReason("");
    setAuthorizationCode("");
    setProductDecisions(
      Object.fromEntries(
        returnableProducts.map((line) => [line.productId, "RETURN"]),
      ),
    );
    setMembershipDecisions(
      Object.fromEntries(
        membershipSessions.map((membership) => [
          membership.membershipId,
          "PENDING_REASSIGNMENT",
        ]),
      ),
    );
  }, [membershipSessions, open, returnableProducts, ticket]);

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
    if (returnMode === "NONE") {
      return returnableProducts.map((line) => ({
        ...line,
        disposition: "WRITE_OFF" as const,
      }));
    }
    if (returnMode !== "SELECT") return [];
    return returnableProducts.flatMap((line) => {
      const decision = productDecisions[line.productId];
      return decision === "GIFT" ||
        decision === "COURTESY" ||
        decision === "WRITE_OFF"
        ? [{ ...line, disposition: decision }]
        : [];
    });
  }, [productDecisions, returnMode, returnableProducts]);
  const membershipRefundSessions = useMemo(
    () =>
      membershipSessions.map((membership) => ({
        ...membership,
        disposition:
          membershipDecisions[membership.membershipId] ??
          "PENDING_REASSIGNMENT",
      })),
    [membershipDecisions, membershipSessions],
  );

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
                  ["NONE", "Dar de baja todo"],
                  ["SELECT", "Decidir por producto"],
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
                      <SelectItem value="WRITE_OFF">
                        <span className="ticket-decision-option">
                          <XCircle size={14} /> Dar de baja
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <small>
                Sólo los productos marcados para regresar se sumarán al
                inventario. Regalos, cortesías y bajas quedarán documentados
                en el ticket cancelado y en el reporte de inventario.
              </small>
            </div>
          )}
        </section>

        {membershipSessions.length > 0 ? (
          <section className="ticket-cancellation-section">
            <div className="ticket-cancellation-heading">
              <div>
                <span>MEMBRESÍA CON ASISTENCIAS</span>
                <h3>¿Qué pasará con las sesiones ya tomadas?</h3>
              </div>
              <Sparkles size={20} />
            </div>
            <div className="ticket-return-product-list ticket-return-decision-list">
              {membershipSessions.map((membership) => (
                <div key={membership.membershipId}>
                  <span>
                    <strong>{membership.membershipName}</strong>
                    <small>
                      {membership.membershipFolio} · {membership.usedSessions} de {membership.totalSessions} sesiones tomadas · {membership.remainingSessions} sin usar
                    </small>
                  </span>
                  <Select
                    value={
                      membershipDecisions[membership.membershipId] ??
                      "PENDING_REASSIGNMENT"
                    }
                    onValueChange={(value) =>
                      setMembershipDecisions((current) => ({
                        ...current,
                        [membership.membershipId]: value as
                          | "PENDING_REASSIGNMENT"
                          | "LOST_CLIENT",
                      }))
                    }
                  >
                    <SelectTrigger
                      aria-label={`Destino de sesiones de ${membership.membershipName}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING_REASSIGNMENT">
                        Guardar para próxima membresía
                      </SelectItem>
                      <SelectItem value="LOST_CLIENT">
                        Sesiones perdidas · cliente perdido
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <small>
                Guardar para próxima membresía permite transferir estas
                asistencias cuando la clienta compre otro plan. La opción de
                cliente perdido cierra definitivamente el saldo histórico.
              </small>
            </div>
          </section>
        ) : null}

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
          <div className="field-stack">
            <Label>Fecha de afectación del refund</Label>
            <Select
              value={effectiveDateMode}
              onValueChange={(value) =>
                setEffectiveDateMode(
                  value as
                    | "CANCELLATION_DATE"
                    | "ORIGINAL_SALE_DATE"
                    | "CUSTOM_DATE",
                )
              }
            >
              <SelectTrigger aria-label="Fecha contable del refund">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CANCELLATION_DATE">
                  Día de la cancelación
                </SelectItem>
                <SelectItem value="ORIGINAL_SALE_DATE">
                  Día de la venta original
                </SelectItem>
                <SelectItem value="CUSTOM_DATE">
                  Movimiento personalizado
                </SelectItem>
              </SelectContent>
            </Select>
            {effectiveDateMode === "CUSTOM_DATE" ? (
              <DatePicker
                value={customEffectiveDate}
                onChange={setCustomEffectiveDate}
                placeholder="Selecciona la fecha contable"
              />
            ) : null}
            <small>
              El refund se registra como movimiento negativo. El ticket
              original nunca cambia de fecha ni se elimina. La fecha
              personalizada afectará el dashboard, reporte, corte e inventario
              del día elegido.
            </small>
          </div>
          <div className="field-stack">
            <Label htmlFor="ticket-cancellation-reason">
              Motivo de cancelación
            </Label>
            <Input
              id="ticket-cancellation-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Describe la causa para la auditoría"
              maxLength={240}
            />
          </div>
          {authorizationRequired ? (
            <div className="field-stack">
              <Label htmlFor="ticket-cancellation-code">
                Código master
              </Label>
              <Input
                id="ticket-cancellation-code"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={authorizationCode}
                onChange={(event) => setAuthorizationCode(event.target.value)}
                placeholder="Ingresa el código master"
              />
              <small>
                Ingresa un código master o tu código personal si tu perfil
                tiene TICKET_CANCELLATION. Autoriza únicamente esta acción.
              </small>
            </div>
          ) : null}
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
              (ticket.amountPaid > 0 && refundAmount <= 0) ||
              refundAmount > ticket.amountPaid ||
              reason.trim().length < 5 ||
              (effectiveDateMode === "CUSTOM_DATE" &&
                !customEffectiveDate) ||
              (authorizationRequired && !authorizationCode.trim()) ||
              (returnMode === "SELECT" &&
                returnedProducts.length === 0 &&
                nonReturnedProducts.length === 0)
            }
            onClick={() =>
              onConfirm({
                refundAmount,
                effectiveDateMode,
                customEffectiveDate,
                reason: reason.trim(),
                authorizationCode,
                returnedProducts,
                nonReturnedProducts,
                membershipRefundSessions,
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
