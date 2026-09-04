import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CircleDollarSign,
  LockKeyhole,
  Minus,
  Plus,
  Save,
  ShoppingBag,
  Users,
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
  Product,
  PaymentEntry,
  PaymentMethodOption,
  PaymentStatus,
  Seller,
  Ticket,
  TicketEditProductInput,
  TicketEditRequest,
} from "../types";
import { PaymentReferenceFields } from "./PaymentReferenceFields";

interface EditableLine extends TicketEditProductInput {
  id: string;
}

interface TicketEditDialogProps {
  open: boolean;
  ticket: Ticket | null;
  sellers: Seller[];
  products: Product[];
  paymentMethods: PaymentMethodOption[];
  bankCatalog: BankCatalogEntry[];
  installmentOptions: number[];
  onOpenChange: (open: boolean) => void;
  backendMode?: boolean;
  defaultAuthorizationAlias?: string;
  onSave: (ticketId: string, changes: TicketEditRequest) => boolean | Promise<boolean>;
}

export function TicketEditDialog({
  open,
  ticket,
  sellers,
  products,
  paymentMethods,
  bankCatalog,
  installmentOptions,
  onOpenChange,
  onSave,
  backendMode = false,
  defaultAuthorizationAlias = "",
}: TicketEditDialogProps) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [sellerIds, setSellerIds] = useState<string[]>([]);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PAID");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [authorizationCode, setAuthorizationCode] = useState("");
  const [authorizationAlias, setAuthorizationAlias] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ticket || !open) return;
    setClientName(ticket.clientName);
    setClientPhone(ticket.clientPhone);
    setSellerIds(ticket.sellerSales.map((sale) => sale.sellerId));
    setDiscountAmount(ticket.discountAmount);
    setPaymentStatus(
      ticket.ticketType === "LAYAWAY_PAYMENT" ? "PAID" : ticket.paymentStatus,
    );
    const fallbackMethod = paymentMethods.find((method) => method.active)?.id ?? "";
    setPayments(
      ticket.payments.length > 0
        ? ticket.payments.map((payment) => ({ ...payment }))
        : ticket.amountPaid > 0 && fallbackMethod
          ? [
              {
                id: crypto.randomUUID(),
                methodId: fallbackMethod,
                amount:
                  ticket.ticketType === "LAYAWAY_PAYMENT"
                    ? ticket.total
                    : ticket.amountPaid,
              },
            ]
          : [],
    );
    setAuthorizationCode("");
    setAuthorizationAlias(defaultAuthorizationAlias);
    const recordedProductTotal = ticket.products.reduce(
      (sum, line) => sum + line.total,
      0,
    );
    const subtotalScale =
      recordedProductTotal > 0 ? ticket.subtotal / recordedProductTotal : 1;
    setLines(
      ticket.products.map((line, index) => ({
        id: `${line.productId}-${index}-${crypto.randomUUID()}`,
        productId: line.productId,
        quantity: line.quantity,
        unitPrice:
          line.quantity > 0
            ? Math.round(
                ((line.total * subtotalScale) / line.quantity) * 100,
              ) / 100
            : 0,
      })),
    );
  }, [defaultAuthorizationAlias, open, paymentMethods, ticket]);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const normalizedDiscount = Math.min(
    subtotal,
    Math.max(0, discountAmount || 0),
  );
  const total = Math.max(0, subtotal - normalizedDiscount);
  const enteredPaymentTotal = payments.reduce(
    (sum, payment) => sum + Math.max(0, Number(payment.amount) || 0),
    0,
  );
  const normalizedAmountPaid =
    paymentStatus === "PENDING" ? 0 : Math.min(total, enteredPaymentTotal);
  const nextBalanceDue = Math.max(0, total - normalizedAmountPaid);
  const invalidLayaway =
    paymentStatus === "LAYAWAY" &&
    (normalizedAmountPaid <= 0 || normalizedAmountPaid >= total);
  const invalidPaid =
    paymentStatus === "PAID" && Math.abs(enteredPaymentTotal - total) > 0.01;
  const needsPaymentMethod = paymentStatus !== "PENDING";
  const paymentIsCard = (methodId: string) => {
    const method = paymentMethods.find((candidate) => candidate.id === methodId);
    const identity = `${methodId} ${method?.label ?? ""}`.toLocaleLowerCase("es-MX");
    return identity.includes("card") || identity.includes("tarjeta");
  };
  const paymentNeedsAuthorization = (methodId: string) => {
    const method = paymentMethods.find((candidate) => candidate.id === methodId);
    const identity = `${methodId} ${method?.label ?? ""}`.toLocaleLowerCase("es-MX");
    return !identity.includes("cash") && !identity.includes("efectivo");
  };
  const paymentReferencesAreValid = payments.every(
    (payment) =>
      !paymentNeedsAuthorization(payment.methodId) ||
      paymentReferenceIsValid(
        payment,
        paymentIsCard(payment.methodId),
        installmentOptions,
      ),
  );
  const installmentTermsAreValid = paymentReferencesAreValid;
  const minimumTotal = lines.reduce((sum, line) => {
    const product = productById.get(line.productId);
    return sum + (product?.minPrice ?? 0) * line.quantity;
  }, 0);
  const requiresAuthorization =
    total - minimumTotal < Math.min(0, ticket?.deviation ?? 0);
  const hasInvalidLine = lines.some(
    (line) => !line.productId || line.quantity < 1 || line.unitPrice < 0,
  );

  const toggleSeller = (sellerId: string) => {
    setSellerIds((current) =>
      current.includes(sellerId)
        ? current.filter((id) => id !== sellerId)
        : [...current, sellerId],
    );
  };

  const addPayment = () => {
    const methodId =
      paymentMethods.find(
        (method) =>
          method.active &&
          !payments.some((payment) => payment.methodId === method.id),
      )?.id ?? paymentMethods.find((method) => method.active)?.id ?? "";
    if (!methodId) return;
    const remaining = Math.max(0, total - enteredPaymentTotal);
    setPayments((current) => {
      if (remaining > 0.01 || current.length === 0) {
        return [
          ...current,
          { id: crypto.randomUUID(), methodId, amount: remaining },
        ];
      }
      const donorIndex = current.findIndex((payment) => payment.amount > 0.01);
      if (donorIndex < 0)
        return [
          ...current,
          { id: crypto.randomUUID(), methodId, amount: 0 },
        ];
      const dividedAmount = Math.round((current[donorIndex]!.amount / 2) * 100) / 100;
      return [
        ...current.map((payment, index) =>
          index === donorIndex
            ? { ...payment, amount: payment.amount - dividedAmount }
            : payment,
        ),
        { id: crypto.randomUUID(), methodId, amount: dividedAmount },
      ];
    });
  };

  const updateLine = (lineId: string, changes: Partial<EditableLine>) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, ...changes } : line,
      ),
    );
  };

  const addLine = () => {
    const firstProduct = products.find((product) => product.active);
    if (!firstProduct) return;
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        productId: firstProduct.id,
        quantity: 1,
        unitPrice: firstProduct.maxPrice,
      },
    ]);
  };

  const changePaymentStatus = (status: PaymentStatus) => {
    setPaymentStatus(status);
    const defaultMethod =
      payments[0]?.methodId ??
      paymentMethods.find((method) => method.active)?.id ??
      "";
    if (status === "PAID" && defaultMethod) {
      setPayments((current) => [
        { ...(current[0] ?? { id: crypto.randomUUID(), methodId: defaultMethod }), amount: total },
      ]);
    }
    if (status === "PENDING") setPayments([]);
    if (status === "LAYAWAY") {
      const suggestedAmount = Math.min(
        Math.max(1, total * 0.3),
        Math.max(0, total - 0.01),
      );
      if (defaultMethod) {
        setPayments((current) => [
          {
            ...(current[0] ?? {
              id: crypto.randomUUID(),
              methodId: defaultMethod,
            }),
            amount:
              enteredPaymentTotal > 0 && enteredPaymentTotal < total
                ? enteredPaymentTotal
                : suggestedAmount,
          },
        ]);
      }
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ticket-edit-dialog sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Editar ticket {ticket.id}</DialogTitle>
          <DialogDescription>
            Los cambios actualizarán automáticamente venta, vendedores,
            inventario y registros relacionados.
          </DialogDescription>
        </DialogHeader>

        <div className="ticket-edit-form">
          <section className="ticket-edit-section">
            <div className="ticket-edit-section-heading">
              <ShoppingBag size={17} />
              <div>
                <span>CLIENTE Y VENTA</span>
                <strong>Datos generales</strong>
              </div>
            </div>
            <div className="ticket-edit-grid">
              <div className="field-stack">
                <Label htmlFor="ticket-client-name">Nombre del cliente</Label>
                <Input
                  id="ticket-client-name"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="ticket-client-phone">Teléfono</Label>
                <Input
                  id="ticket-client-phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="ticket-edit-section">
            <div className="ticket-edit-section-heading">
              <Users size={17} />
              <div>
                <span>DIVISIÓN DE VENTA</span>
                <strong>Vendedores participantes</strong>
              </div>
            </div>
            <div className="ticket-edit-sellers">
              {ticket.sellerSales
                .filter(
                  (sale) =>
                    sale.participantKind === "COMPANY" &&
                    sellerIds.includes(sale.sellerId),
                )
                .map((sale) => (
                  <div
                    key={sale.sellerId}
                    className="ticket-edit-company-seller is-selected"
                  >
                    <span><Building2 size={14} /></span>
                    <span>
                      <strong>{sale.sellerName}</strong>
                      <small>
                        Empresa · {sale.participantCode ?? "EMPRESA-001"}
                      </small>
                    </span>
                    <LockKeyhole size={12} aria-label="Participación obligatoria" />
                  </div>
                ))}
              {sellers
                .filter(
                  (seller) => seller.active || sellerIds.includes(seller.id),
                )
                .map((seller) => (
                  <button
                    key={seller.id}
                    type="button"
                    className={
                      sellerIds.includes(seller.id) ? "is-selected" : ""
                    }
                    onClick={() => toggleSeller(seller.id)}
                  >
                    <span>{seller.initials}</span>
                    {seller.name}
                    <i
                      className="ticket-edit-seller-action"
                      aria-hidden="true"
                    >
                      {sellerIds.includes(seller.id) ? (
                        <Minus size={12} />
                      ) : (
                        <Plus size={12} />
                      )}
                    </i>
                  </button>
                ))}
            </div>
            <small>
              El total se dividirá en partes iguales entre los participantes.
              La empresa permanece incluida cuando la clienta pertenece a su
              cartera.
            </small>
          </section>

          <section className="ticket-edit-section">
            <div className="ticket-edit-section-heading ticket-edit-products-heading">
              <ShoppingBag size={17} />
              <div>
                <span>PRODUCTOS Y SERVICIOS</span>
                <strong>Detalle de la venta</strong>
              </div>
              <Button type="button" variant="outline" onClick={addLine}>
                <Plus size={15} /> Agregar
              </Button>
            </div>
            <div className="ticket-edit-lines">
              {lines.map((line) => {
                const historicalProduct = ticket.products.find(
                  (product) => product.productId === line.productId,
                );
                const hasCatalogProduct = products.some(
                  (product) => product.id === line.productId,
                );
                return (
                <div key={line.id} className="ticket-edit-line">
                  <div className="field-stack ticket-edit-product-field">
                    <Label>Producto o servicio</Label>
                    <Select
                      value={line.productId}
                      onValueChange={(productId) => {
                        const product = productById.get(productId);
                        updateLine(line.id, {
                          productId,
                          unitPrice: product?.maxPrice ?? line.unitPrice,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!hasCatalogProduct && historicalProduct && (
                          <SelectItem value={line.productId}>
                            {historicalProduct.name}
                          </SelectItem>
                        )}
                        {products
                          .filter(
                            (product) =>
                              product.active || product.id === line.productId,
                          )
                          .map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="field-stack">
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.id, {
                          quantity: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field-stack">
                    <Label>Precio unitario</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(event) =>
                        updateLine(line.id, {
                          unitPrice: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="ticket-edit-line-total">
                    <span>Total</span>
                    <strong>
                      {formatCurrency(line.quantity * line.unitPrice)}
                    </strong>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Quitar producto"
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((item) => item.id !== line.id),
                      )
                    }
                  >
                    <Minus size={15} />
                  </Button>
                </div>
                );
              })}
            </div>
          </section>

          <section className="ticket-edit-section">
            <div className="ticket-edit-section-heading">
              <CircleDollarSign size={17} />
              <div>
                <span>COBRO Y APARTADO</span>
                <strong>Estado, método y saldo del ticket</strong>
              </div>
            </div>
            <div className="ticket-edit-payment-status" role="group" aria-label="Estado de cobro">
              {(
                [
                  ["PAID", "Pagado"],
                  ["LAYAWAY", "Apartado"],
                  ["PENDING", "Pendiente"],
                ] as const
              ).map(([status, label]) => (
                <button
                  key={status}
                  type="button"
                  className={paymentStatus === status ? "is-active" : ""}
                  onClick={() => changePaymentStatus(status)}
                  disabled={ticket.ticketType === "LAYAWAY_PAYMENT"}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ticket-edit-payments-heading">
              <span>FORMAS DE PAGO REGISTRADAS</span>
              {paymentStatus !== "PENDING" && (
                <Button type="button" variant="outline" size="sm" onClick={addPayment}>
                  <Plus size={14} /> Agregar método
                </Button>
              )}
            </div>
            <div className="ticket-edit-payment-grid">
              <div className="ticket-edit-payment-list">
                {payments.map((payment, index) => (
                  <div className="ticket-edit-payment-row" key={payment.id}>
                    <span className="payment-row-number">{index + 1}</span>
                    <div className="field-stack">
                      <Label>Método de pago</Label>
                      <Select
                        value={payment.methodId}
                        onValueChange={(methodId) =>
                          setPayments((current) =>
                            current.map((item) => {
                              if (item.id !== payment.id) return item;
                              const {
                                cardType: _cardType,
                                cardNetwork: _cardNetwork,
                                bankId: _bankId,
                                bankName: _bankName,
                                installmentMonths: _installmentMonths,
                                ...paymentWithoutTerms
                              } = item;
                              return {
                                ...paymentWithoutTerms,
                                methodId,
                                cardOrBank: "",
                                authorizationCode: "",
                              };
                            }),
                          )
                        }
                      >
                        <SelectTrigger aria-label={`Método editado ${index + 1}`}>
                          <SelectValue placeholder="Selecciona método" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods
                            .filter(
                              (method) =>
                                method.active || method.id === payment.methodId,
                            )
                            .map((method) => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="field-stack">
                      <Label>Monto cobrado</Label>
                      <Input
                        type="number"
                        min="0"
                        max={total}
                        step="0.01"
                        value={payment.amount}
                        aria-label={`Monto editado ${index + 1}`}
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
                    {paymentNeedsAuthorization(payment.methodId) && (
                      <PaymentReferenceFields
                        payment={payment}
                        isCard={paymentIsCard(payment.methodId)}
                        bankCatalog={bankCatalog}
                        installmentOptions={installmentOptions}
                        ariaContext={`del pago editado ${index + 1}`}
                        onChange={(nextPayment) =>
                          setPayments((current) =>
                            current.map((item) =>
                              item.id === payment.id ? nextPayment : item,
                            ),
                          )
                        }
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Quitar método"
                      aria-label={`Quitar método de pago ${index + 1}`}
                      disabled={payments.length === 1}
                      onClick={() =>
                        setPayments((current) =>
                          current.filter((item) => item.id !== payment.id),
                        )
                      }
                    >
                      <Minus size={15} />
                    </Button>
                  </div>
                ))}
                {paymentStatus !== "PENDING" && payments.length === 0 && (
                  <button type="button" className="ticket-edit-empty-payment" onClick={addPayment}>
                    <Plus size={15} /> Agregar el primer método de pago
                  </button>
                )}
              </div>
              <div className="ticket-edit-payment-preview">
                <span>Saldo actualizado</span>
                <strong className={nextBalanceDue > 0 ? "is-negative" : ""}>
                  {formatCurrency(nextBalanceDue)}
                </strong>
                <small>
                  {paymentStatus === "PAID"
                    ? "Ticket liquidado"
                    : paymentStatus === "LAYAWAY"
                      ? "Apartado activo"
                      : "Pendiente de cobro"}
                </small>
              </div>
            </div>
            {invalidPaid && (
              <small className="is-negative">
                Los métodos de pago deben sumar exactamente {formatCurrency(total)}.
              </small>
            )}
            {invalidLayaway && (
              <small className="is-negative">
                El apartado requiere un abono mayor a $0 y menor al total.
              </small>
            )}
            {!installmentTermsAreValid && (
              <small className="is-negative">
                Indica crédito o débito y el plazo de toda tarjeta de crédito.
              </small>
            )}
            {!paymentReferencesAreValid && (
              <small className="is-negative">
                Los cobros no efectivos requieren banco y cuatro dígitos de autorización;
                las tarjetas también requieren crédito/débito y Visa/Mastercard.
              </small>
            )}
          </section>

          <section className="ticket-edit-summary">
            <div className="field-stack">
              <Label htmlFor="ticket-edit-discount">Descuento en pesos</Label>
              <Input
                id="ticket-edit-discount"
                type="number"
                min="0"
                max={subtotal}
                step="0.01"
                value={discountAmount}
                onChange={(event) =>
                  setDiscountAmount(Number(event.target.value))
                }
              />
            </div>
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div>
              <span>Descuento</span>
              <strong>-{formatCurrency(normalizedDiscount)}</strong>
            </div>
            <div className="ticket-edit-grand-total">
              <span>Nuevo total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <Badge variant="outline">
              Cobrado: {formatCurrency(normalizedAmountPaid)}
            </Badge>
          </section>
          {(backendMode || requiresAuthorization) && (
            <section className="ticket-edit-authorization">
              <div>
                <strong>Autorización administrativa requerida</strong>
                <small>
                  {requiresAuthorization
                    ? "La nueva venta profundiza el importe autorizado bajo el mínimo combinado."
                    : "Las revisiones del ticket requieren autorización master y conservan el original."}
                </small>
              </div>
              <Input
                value={authorizationAlias}
                onChange={(event) => setAuthorizationAlias(event.target.value)}
                placeholder="Alias master"
                aria-label="Alias master para revisar ticket"
              />
              <Input
                type="password"
                inputMode="numeric"
                value={authorizationCode}
                onChange={(event) => setAuthorizationCode(event.target.value)}
                placeholder="Código master"
                aria-label="Código master para editar bajo mínimo"
              />
            </section>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              !clientName.trim() ||
              sellerIds.length === 0 ||
              lines.length === 0 ||
              hasInvalidLine ||
              !installmentTermsAreValid ||
              !paymentReferencesAreValid ||
              discountAmount < 0 ||
              discountAmount > subtotal ||
              invalidLayaway ||
              invalidPaid ||
              (needsPaymentMethod &&
                (payments.length === 0 ||
                  payments.some(
                    (payment) => !payment.methodId || payment.amount <= 0,
                  ))) ||
              saving ||
              (backendMode && (!authorizationAlias.trim() || !authorizationCode))
            }
            onClick={() => {
              setSaving(true);
              void Promise.resolve(onSave(ticket.id, {
                clientName: clientName.trim(),
                clientPhone: clientPhone.trim(),
                sellerIds,
                products: lines.map(({ productId, quantity, unitPrice }) => ({
                  productId,
                  quantity,
                  unitPrice,
                })),
                discountAmount: normalizedDiscount,
                paymentStatus,
                amountPaid: normalizedAmountPaid,
                paymentMethodId: payments[0]?.methodId ?? "",
                payments: payments.map((payment) => ({ ...payment })),
                authorizationCode,
                authorizationAlias: authorizationAlias.trim(),
              })).then((saved) => {
                if (saved) onOpenChange(false);
              }).finally(() => setSaving(false));
            }}
          >
            <Save size={16} /> Guardar y actualizar registros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
