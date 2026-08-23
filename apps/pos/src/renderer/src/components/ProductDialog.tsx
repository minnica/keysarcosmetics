import { useEffect, useMemo, useState } from "react";
import {
  Minus,
  Plus,
  Save,
  ShieldCheck,
  ShoppingBag,
  Trash2,
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
  Textarea,
} from "@cosmetics/ui";
import {
  administratorCode,
  formatCurrency,
  getSellerSku,
} from "../mock-data";
import type { CartItem, Product } from "../types";

interface ProductDialogProps {
  product: Product | null;
  cartItem?: CartItem | null;
  otherItemsSubtotal: number;
  otherItemsMinimumTotal: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (item: CartItem) => void;
  onRemove?: (itemId: string) => void;
}

export function ProductDialog({
  product,
  cartItem,
  otherItemsSubtotal,
  otherItemsMinimumTotal,
  open,
  onOpenChange,
  onSubmit,
  onRemove,
}: ProductDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [comment, setComment] = useState("");
  const [adminCode, setAdminCode] = useState("");

  useEffect(() => {
    if (!product || !open) return;
    setQuantity(cartItem?.quantity ?? 1);
    setPrice(cartItem?.unitPrice ?? product.maxPrice);
    setComment(cartItem?.comment ?? "");
    setAdminCode(cartItem?.adminAuthorized ? administratorCode : "");
  }, [cartItem, open, product]);

  const priceState = useMemo(() => {
    if (!product)
      return {
        belowLineMinimum: false,
        ticketCovered: true,
        authorizationRequired: false,
        authorized: false,
      };
    const difference = price - product.minPrice;
    const proposedTicketTotal = otherItemsSubtotal + price * quantity;
    const proposedMinimumTotal =
      otherItemsMinimumTotal + product.minPrice * quantity;
    const authorizationRequired = proposedTicketTotal < proposedMinimumTotal;
    return {
      belowLineMinimum: difference < 0,
      ticketCovered: !authorizationRequired,
      authorizationRequired,
      authorized: adminCode === administratorCode,
    };
  }, [
    adminCode,
    otherItemsMinimumTotal,
    otherItemsSubtotal,
    price,
    product,
    quantity,
  ]);

  if (!product) return null;

  const canSubmit =
    quantity >= 1 &&
    price >= 0 &&
    (!priceState.authorizationRequired || priceState.authorized);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      id: cartItem?.id ?? `${product.id}-${Date.now()}`,
      product,
      quantity,
      unitPrice: price,
      comment: comment.trim(),
      adminAuthorized: priceState.authorizationRequired,
    });
    onOpenChange(false);
  };

  const handleRemove = () => {
    if (!cartItem || !onRemove) return;
    onRemove(cartItem.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="product-dialog sm:max-w-[760px]">
        <div className="product-dialog-grid">
          <div className="product-dialog-image-wrap">
            <img
              src={product.image}
              alt={product.name}
              className="product-dialog-image"
            />
            <Badge className="product-kind-badge">
              {product.kind === "SERVICE" ? "SERVICIO" : "PRODUCTO"}
            </Badge>
          </div>

          <div className="product-dialog-form">
            <DialogHeader>
              <DialogTitle>
                {cartItem ? `Editar ${product.name}` : product.name}
              </DialogTitle>
              <DialogDescription>
                {getSellerSku(product)} · {product.family} / {product.category}
              </DialogDescription>
            </DialogHeader>

            <div className="price-band">
              <div>
                <span>PRECIO DE LISTA</span>
                <strong>{formatCurrency(product.maxPrice)}</strong>
              </div>
              <div>
                <span>SKU CON PRECIO MÍNIMO</span>
                <strong>{getSellerSku(product)}</strong>
              </div>
            </div>

            <div className="field-stack">
              <Label htmlFor="sale-price">Precio de venta</Label>
              <Input
                id="sale-price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(event) => setPrice(Number(event.target.value))}
              />
              {priceState.authorizationRequired ? (
                <p className="field-message is-negative" role="alert">
                  El total del ticket no cubre el piso combinado. Requiere
                  autorización administrativa.
                </p>
              ) : priceState.belowLineMinimum && priceState.ticketCovered ? (
                <p className="field-message is-positive">
                  Reducción cubierta por el margen total del ticket. No requiere
                  autorización.
                </p>
              ) : (
                <p className="field-message is-neutral">
                  {price > product.maxPrice
                    ? "Precio libre sobre lista."
                    : "Precio permitido para venta."}
                </p>
              )}
            </div>

            {priceState.authorizationRequired && (
              <div className="admin-authorization">
                <ShieldCheck size={20} />
                <div className="field-stack">
                  <Label htmlFor="admin-code">
                    Autorización de administrador
                  </Label>
                  <Input
                    id="admin-code"
                    type="password"
                    inputMode="numeric"
                    placeholder="Código de 4 dígitos"
                    value={adminCode}
                    onChange={(event) => setAdminCode(event.target.value)}
                  />
                  <span>
                    {priceState.authorized
                      ? "Código autorizado. El ticket bajo piso quedará en el reporte administrativo."
                      : "Mock de demostración: usa 2468."}
                  </span>
                </div>
              </div>
            )}

            <div className="field-stack">
              <Label>Cantidad</Label>
              <div className="quantity-control">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setQuantity((current) => Math.max(1, current - 1))
                  }
                  aria-label="Reducir cantidad"
                >
                  <Minus size={16} />
                </Button>
                <strong>{quantity}</strong>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((current) => current + 1)}
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            <div className="field-stack">
              <Label htmlFor="product-comment">Comentarios</Label>
              <Textarea
                id="product-comment"
                placeholder="Indicaciones, presentación, cita o nota para el ticket…"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>

            <div className="line-total">
              <span>
                Total de la línea
                <small
                  className={
                    priceState.ticketCovered ? "is-covered" : "is-uncovered"
                  }
                >
                  {priceState.ticketCovered
                    ? "Ticket global cubierto"
                    : "Ticket global bajo piso"}
                </small>
              </span>
              <strong>{formatCurrency(price * quantity)}</strong>
            </div>

            <DialogFooter className="product-dialog-actions">
              {cartItem && onRemove ? (
                <Button
                  type="button"
                  variant="outline"
                  className="remove-line-button"
                  onClick={handleRemove}
                >
                  <Trash2 size={16} /> Quitar producto
                </Button>
              ) : (
                <span />
              )}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {cartItem ? <Save size={17} /> : <ShoppingBag size={17} />}
                  {cartItem ? "Guardar cambios" : "Añadir al carrito"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
