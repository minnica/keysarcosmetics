import { useEffect, useMemo, useState } from "react";
import {
  CircleDollarSign,
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
import type {
  Product,
  PaymentMethodOption,
  PaymentStatus,
  Seller,
  Ticket,
  TicketEditProductInput,
  TicketEditRequest,
} from "../types";

interface EditableLine extends TicketEditProductInput {
  id: string;
}

interface TicketEditDialogProps {
  open: boolean;
  ticket: Ticket | null;
  sellers: Seller[];
  products: Product[];
  paymentMethods: PaymentMethodOption[];
  onOpenChange: (open: boolean) => void;
  onSave: (ticketId: string, changes: TicketEditRequest) => boolean;
}

export function TicketEditDialog({
  open,
  ticket,
  sellers,
  products,
  paymentMethods,
  onOpenChange,
  onSave,
}: TicketEditDialogProps) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [sellerIds, setSellerIds] = useState<string[]>([]);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PAID");
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [authorizationCode, setAuthorizationCode] = useState("");

  useEffect(() => {
    if (!ticket || !open) return;
    setClientName(ticket.clientName);
    setClientPhone(ticket.clientPhone);
    setSellerIds(ticket.sellerSales.map((sale) => sale.sellerId));
    setDiscountAmount(ticket.discountAmount);
    setPaymentStatus(
      ticket.ticketType === "LAYAWAY_PAYMENT" ? "PAID" : ticket.paymentStatus,
    );
    setAmountPaid(
      ticket.ticketType === "LAYAWAY_PAYMENT" ? ticket.total : ticket.amountPaid,
    );
    setPaymentMethodId(
      ticket.payments[0]?.methodId ??
        paymentMethods.find((method) => method.active)?.id ??
        "",
    );
    setAuthorizationCode("");
    setLines(
      ticket.products.map((line, index) => ({
        id: `${line.productId}-${index}-${crypto.randomUUID()}`,
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.quantity > 0 ? line.total / line.quantity : 0,
      })),
    );
  }, [open, paymentMethods, ticket]);

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
  const normalizedAmountPaid =
    paymentStatus === "PAID"
      ? total
      : paymentStatus === "PENDING"
        ? 0
        : Math.min(total, Math.max(0, amountPaid || 0));
  const nextBalanceDue = Math.max(0, total - normalizedAmountPaid);
  const invalidLayaway =
    paymentStatus === "LAYAWAY" &&
    (normalizedAmountPaid <= 0 || normalizedAmountPaid >= total);
  const needsPaymentMethod =
    paymentStatus !== "PENDING" && normalizedAmountPaid > 0;
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
    if (status === "PAID") setAmountPaid(total);
    if (status === "PENDING") setAmountPaid(0);
    if (status === "LAYAWAY") {
      const suggestedAmount = Math.min(
        Math.max(1, total * 0.3),
        Math.max(0, total - 0.01),
      );
      setAmountPaid(
        amountPaid > 0 && amountPaid < total ? amountPaid : suggestedAmount,
      );
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
                  </button>
                ))}
            </div>
            <small>
              El total se dividirá en partes iguales entre los vendedores
              seleccionados.
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
            <div className="ticket-edit-payment-grid">
              <div className="field-stack">
                <Label>Método de pago</Label>
                <Select
                  value={paymentMethodId}
                  onValueChange={setPaymentMethodId}
                  disabled={paymentStatus === "PENDING"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods
                      .filter(
                        (method) =>
                          method.active || method.id === paymentMethodId,
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
                <Label htmlFor="ticket-edit-amount-paid">Monto cobrado</Label>
                <Input
                  id="ticket-edit-amount-paid"
                  type="number"
                  min="0"
                  max={total}
                  step="0.01"
                  value={normalizedAmountPaid}
                  disabled={paymentStatus !== "LAYAWAY"}
                  onChange={(event) =>
                    setAmountPaid(Number(event.target.value))
                  }
                />
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
            {invalidLayaway && (
              <small className="is-negative">
                El apartado requiere un abono mayor a $0 y menor al total.
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
          {requiresAuthorization && (
            <section className="ticket-edit-authorization">
              <div>
                <strong>Autorización administrativa requerida</strong>
                <small>
                  La nueva venta profundiza el importe autorizado bajo el
                  mínimo combinado.
                </small>
              </div>
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
              discountAmount < 0 ||
              discountAmount > subtotal ||
              invalidLayaway ||
              (needsPaymentMethod && !paymentMethodId)
            }
            onClick={() => {
              const saved = onSave(ticket.id, {
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
                paymentMethodId,
                authorizationCode,
              });
              if (saved) onOpenChange(false);
            }}
          >
            <Save size={16} /> Guardar y actualizar registros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
