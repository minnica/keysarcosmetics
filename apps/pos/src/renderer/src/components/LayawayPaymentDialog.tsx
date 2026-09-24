import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  PlusCircle,
  Trash2,
  UserRound,
  WalletCards,
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
import { paymentReferenceIsValid } from "../bank-catalog";
import type {
  BankCatalogEntry,
  Client,
  LayawayRecord,
  PaymentEntry,
  PaymentMethodOption,
  Seller,
} from "../types";
import { PaymentReferenceFields } from "./PaymentReferenceFields";

const installmentOptions = [1, 3, 6, 9, 12, 18, 24];

interface LayawayPaymentDialogProps {
  layaway: LayawayRecord;
  paymentMethods: PaymentMethodOption[];
  bankCatalog: BankCatalogEntry[];
  clients: Client[];
  sellers: Seller[];
  companyName: string;
  sellerId: string;
  onRegister: (
    payments: PaymentEntry[],
    deliveredCartItemIds: string[],
  ) => void;
}

const currentBusinessDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const createPayment = (methodId: string, amount: number): PaymentEntry => ({
  id: crypto.randomUUID(),
  methodId,
  amount,
  authorizationCode: "",
  cardOrBank: "",
});

export function LayawayPaymentDialog({
  layaway,
  paymentMethods,
  bankCatalog,
  clients,
  sellers,
  companyName,
  sellerId,
  onRegister,
}: LayawayPaymentDialogProps) {
  const activeMethods = useMemo(
    () => paymentMethods.filter((method) => method.active),
    [paymentMethods],
  );
  const defaultMethod = activeMethods[0]?.id ?? "";
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [deliveryIds, setDeliveryIds] = useState<string[]>([]);
  const paymentDate = currentBusinessDate();
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const layawayClient = clients.find((client) => client.id === layaway.clientId);
  const activeOwner = sellers.find(
    (seller) => seller.id === layawayClient?.ownerId && seller.active,
  );
  const isCompanyPortfolio = Boolean(
    !activeOwner ||
      layawayClient?.companyLocked ||
      (layawayClient?.ownerId && !activeOwner),
  );
  const ownershipName = isCompanyPortfolio
    ? layawayClient?.companyName || companyName || "Keysar Cosmetics"
    : activeOwner?.name ?? companyName ?? "Keysar Cosmetics";

  const paymentNeedsAuthorization = (methodId: string) => {
    const method = paymentMethods.find((candidate) => candidate.id === methodId);
    const identity = `${methodId} ${method?.label ?? ""}`.toLocaleLowerCase("es-MX");
    return !identity.includes("cash") && !identity.includes("efectivo");
  };
  const paymentIsCard = (methodId: string) => {
    const method = paymentMethods.find((candidate) => candidate.id === methodId);
    const identity = `${methodId} ${method?.label ?? ""}`.toLocaleLowerCase("es-MX");
    return identity.includes("card") || identity.includes("tarjeta");
  };
  const totalPayment = payments.reduce(
    (sum, payment) => sum + Math.max(0, Number(payment.amount) || 0),
    0,
  );
  const remaining = Math.max(0, layaway.balanceDue - totalPayment);
  const willLiquidate = remaining < 0.01;
  const referencesAreValid = payments.every(
    (payment) =>
      !paymentNeedsAuthorization(payment.methodId) ||
      paymentReferenceIsValid(
        payment,
        paymentIsCard(payment.methodId),
        installmentOptions,
      ),
  );
  const pendingProducts = layaway.items.filter(
    (item) =>
      item.kind === "PRODUCT" && item.deliveredQuantity < item.quantity,
  );
  const canRegister =
    Boolean(sellerId) &&
    Boolean(paymentDate) &&
    payments.length > 0 &&
    totalPayment > 0 &&
    totalPayment <= layaway.balanceDue + 0.01 &&
    ownershipConfirmed &&
    referencesAreValid;

  const startPayment = () => {
    setPayments(
      defaultMethod
        ? [createPayment(defaultMethod, layaway.balanceDue)]
        : [],
    );
    setDeliveryIds([]);
    setOwnershipConfirmed(false);
    setOpen(true);
  };

  const addPayment = () => {
    const availableMethod =
      activeMethods.find(
        (method) =>
          !payments.some((payment) => payment.methodId === method.id),
      )?.id ?? defaultMethod;
    if (!availableMethod || remaining <= 0) return;
    setPayments((current) => [
      ...current,
      createPayment(availableMethod, remaining),
    ]);
  };

  const register = () => {
    if (!canRegister) return;
    onRegister(
      payments.map((payment) => ({
        ...payment,
        amount: Math.max(0, Number(payment.amount) || 0),
      })),
      willLiquidate ? deliveryIds : [],
    );
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        className="layaway-add-payment-trigger"
        onClick={startPayment}
        disabled={!defaultMethod || !sellerId}
      >
        <CreditCard size={16} /> Agregar pago
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="layaway-payment-dialog sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {layaway.collectionType === "PENDING"
                ? "Registrar pago del saldo pendiente"
                : "Registrar pago del apartado"}
            </DialogTitle>
            <DialogDescription>
              Ticket {layaway.originalTicketId} · saldo actual {formatCurrency(layaway.balanceDue)}.
              Este ingreso generará un folio de pago independiente.
            </DialogDescription>
          </DialogHeader>

          <div className="layaway-payment-dialog-summary">
            <span><small>SALDO ANTERIOR</small><strong>{formatCurrency(layaway.balanceDue)}</strong></span>
            <span><small>ABONO A REGISTRAR</small><strong>{formatCurrency(totalPayment)}</strong></span>
            <span className={willLiquidate ? "is-paid" : ""}>
              <small>SALDO POSTERIOR</small><strong>{formatCurrency(remaining)}</strong>
            </span>
          </div>

          <div
            className={`layaway-owner-confirmation ${isCompanyPortfolio ? "is-company" : ""}`}
            role="alert"
          >
            {isCompanyPortfolio ? (
              <Building2 size={20} aria-hidden="true" />
            ) : (
              <UserRound size={20} aria-hidden="true" />
            )}
            <span>
              <small>PROPIEDAD DE LA VENTA</small>
              <strong>
                {isCompanyPortfolio
                  ? "Esta clienta es cartera de la empresa"
                  : `¿La venta pertenece a ${ownershipName}?`}
              </strong>
              <small>
                {isCompanyPortfolio
                  ? "El vendedor anterior ya no está activo o la procedencia mantiene la clienta ligada a la empresa."
                  : "El abono conservará la atribución del vendedor registrado para la clienta."}
              </small>
            </span>
            <Button
              type="button"
              variant={ownershipConfirmed ? "default" : "outline"}
              onClick={() => setOwnershipConfirmed(true)}
            >
              <CheckCircle2 size={15} />
              {ownershipConfirmed ? "Confirmado" : "Confirmar"}
            </Button>
          </div>

          <div className="layaway-payment-effective-date">
            <span className="layaway-payment-effective-date-icon">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <span>
              <small>FECHA DEL FOLIO DE PAGO</small>
              <strong>Día real del cobro</strong>
              <small>
                El folio se registra hoy. Sólo puede cambiarse después desde
                Editar ticket con acceso Master o permiso de edición asignado.
              </small>
            </span>
            <Badge variant="outline">
              <LockKeyhole size={13} aria-hidden="true" /> {paymentDate}
            </Badge>
          </div>

          <div className="multi-payment-list layaway-multi-payment-list">
            {payments.map((payment, index) => {
              const requiresAuthorization = paymentNeedsAuthorization(
                payment.methodId,
              );
              return (
                <div className="multi-payment-row" key={payment.id}>
                  <span className="payment-row-number">{index + 1}</span>
                  <div className="field-stack">
                    <Label>Método de pago</Label>
                    <Select
                      value={payment.methodId}
                      onValueChange={(methodId) =>
                        setPayments((current) =>
                          current.map((item) =>
                            {
                              if (item.id !== payment.id) return item;
                              const {
                                cardType: _cardType,
                                cardNetwork: _cardNetwork,
                                bankId: _bankId,
                                bankName: _bankName,
                                installmentMonths: _installmentMonths,
                                ...paymentWithoutCardTerms
                              } = item;
                              return {
                                ...paymentWithoutCardTerms,
                                methodId,
                                cardOrBank: "",
                                authorizationCode: "",
                              };
                            }
                          ),
                        )
                      }
                    >
                      <SelectTrigger aria-label={`Método del abono ${index + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="field-stack">
                    <Label>Monto</Label>
                    <Input
                      type="number"
                      min="0.01"
                      max={layaway.balanceDue}
                      step="0.01"
                      value={payment.amount}
                      aria-label={`Monto del abono ${index + 1}`}
                      onChange={(event) =>
                        setPayments((current) =>
                          current.map((item) =>
                            item.id === payment.id
                              ? { ...item, amount: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  {requiresAuthorization && (
                    <div className="payment-reference-fields">
                      <PaymentReferenceFields
                        payment={payment}
                        isCard={paymentIsCard(payment.methodId)}
                        bankCatalog={bankCatalog}
                        installmentOptions={installmentOptions}
                        ariaContext={`del abono ${index + 1}`}
                        onChange={(nextPayment) =>
                          setPayments((current) =>
                            current.map((item) =>
                              item.id === payment.id ? nextPayment : item,
                            ),
                          )
                        }
                      />
                    </div>
                  )}
                  {payments.length > 1 && (
                    <button
                      type="button"
                      className="remove-payment-button"
                      aria-label={`Quitar método de pago ${index + 1}`}
                      title="Quitar método"
                      onClick={() =>
                        setPayments((current) =>
                          current.filter((item) => item.id !== payment.id),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {remaining > 0.01 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="add-payment-button"
              onClick={addPayment}
            >
              <PlusCircle size={15} /> Añadir otro método
            </Button>
          )}

          {!referencesAreValid && (
            <p className="payment-authorization-note">
              Los pagos no efectivos requieren banco y cuatro dígitos de autorización.
              En tarjeta indica crédito o débito, Visa o Mastercard y, para crédito, el plazo.
            </p>
          )}
          {totalPayment > layaway.balanceDue + 0.01 && (
            <p className="payment-authorization-note">
              El abono no puede superar el saldo pendiente.
            </p>
          )}

          {willLiquidate && pendingProducts.length > 0 && (
            <div className="layaway-liquidation-delivery">
              <div>
                <span className="section-kicker">ENTREGA AL LIQUIDAR</span>
                <strong>Selecciona los productos que recibe hoy la clienta</strong>
              </div>
              <div className="layaway-delivery-list">
                {pendingProducts.map((item) => {
                  const selected = deliveryIds.includes(item.cartItemId);
                  return (
                    <button
                      key={item.cartItemId}
                      type="button"
                      className={selected ? "is-selected" : ""}
                      aria-pressed={selected}
                      onClick={() =>
                        setDeliveryIds((current) =>
                          selected
                            ? current.filter((id) => id !== item.cartItemId)
                            : [...current, item.cartItemId],
                        )
                      }
                    >
                      <span>
                        <strong>{item.productName}</strong>
                        <small>{item.quantity - item.deliveredQuantity} pendiente(s) · {layaway.branch}</small>
                      </span>
                      <Badge variant={selected ? "default" : "outline"}>
                        {selected ? "ENTREGAR HOY" : "MANTENER PENDIENTE"}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!canRegister} onClick={register}>
              {willLiquidate ? <CheckCircle2 size={16} /> : <WalletCards size={16} />}
              {willLiquidate ? "Liquidar y generar ticket" : "Registrar abono e imprimir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
