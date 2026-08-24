import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Minus,
  PackageCheck,
  PackagePlus,
  Plus,
  ShieldCheck,
  Sparkles,
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
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import type { Product, RetailDeal } from "../types";

interface DealPickerDialogProps {
  open: boolean;
  deals: RetailDeal[];
  products: Product[];
  branch: string;
  onOpenChange: (open: boolean) => void;
  onAddDeal: (deal: RetailDeal, quantity: number) => void;
}

const businessToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function DealPickerDialog({
  open,
  deals,
  products,
  branch,
  onOpenChange,
  onAddDeal,
}: DealPickerDialogProps) {
  const availableDeals = useMemo(() => {
    const today = businessToday();
    return deals.filter(
      (deal) =>
        deal.status === "PUBLISHED" &&
        deal.startDate <= today &&
        deal.endDate >= today &&
        deal.branches.includes(branch) &&
        deal.lines.every((line) =>
          products.some((product) => product.id === line.productId && product.active),
        ),
    );
  }, [branch, deals, products]);
  const [selectedId, setSelectedId] = useState(availableDeals[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!open) return;
    setSelectedId(availableDeals[0]?.id ?? "");
    setQuantity(1);
  }, [availableDeals, open]);

  const selectedDeal = availableDeals.find((deal) => deal.id === selectedId);
  const lineProducts = selectedDeal?.lines.flatMap((line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    return product ? [{ ...line, product }] : [];
  }) ?? [];
  const listTotal = lineProducts.reduce(
    (sum, line) => sum + line.product.maxPrice * line.quantity,
    0,
  );
  const minimumTotal = lineProducts.reduce(
    (sum, line) => sum + line.product.minPrice * line.quantity,
    0,
  );
  const savings = Math.max(0, listTotal - (selectedDeal?.price ?? 0));

  const addSelected = () => {
    if (!selectedDeal) return;
    onAddDeal(selectedDeal, quantity);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="deal-picker-dialog sm:max-w-[940px]">
        <DialogHeader>
          <DialogTitle>Deals disponibles</DialogTitle>
          <DialogDescription>
            Selecciona un paquete autorizado. Sus artículos conservarán precio,
            costo y movimiento de inventario individuales.
          </DialogDescription>
        </DialogHeader>
        {availableDeals.length === 0 ? (
          <div className="deal-picker-empty">
            <PackagePlus size={34} />
            <strong>No hay Deals publicados para {branch}</strong>
            <span>Un usuario master puede configurarlos desde Inventory → Deal.</span>
          </div>
        ) : (
          <div className="deal-picker-layout">
            <div className="deal-picker-list">
              {availableDeals.map((deal) => {
                const dealProducts = deal.lines.flatMap((line) => {
                  const product = products.find((candidate) => candidate.id === line.productId);
                  return product ? [{ ...line, product }] : [];
                });
                return (
                  <button
                    key={deal.id}
                    type="button"
                    className={selectedId === deal.id ? "is-selected" : ""}
                    onClick={() => {
                      setSelectedId(deal.id);
                      setQuantity(1);
                    }}
                  >
                    <span className="deal-picker-list-icon"><PackageCheck size={18} /></span>
                    <span>
                      <small>{deal.sku}</small>
                      <strong>{deal.name}</strong>
                      <em>{dealProducts.map((line) => line.product.name).join(" + ")}</em>
                    </span>
                    <strong>{formatCurrency(deal.price)}</strong>
                    {selectedId === deal.id && <CheckCircle2 size={17} />}
                  </button>
                );
              })}
            </div>
            {selectedDeal && (
              <section className="deal-picker-detail">
                <div className="deal-picker-detail-heading">
                  <div>
                    <Badge><Sparkles size={12} /> DEAL AUTORIZADO</Badge>
                    <h3>{selectedDeal.name}</h3>
                    <p>{selectedDeal.description}</p>
                  </div>
                  <div><span>PRECIO DEL PAQUETE</span><strong>{formatCurrency(selectedDeal.price)}</strong></div>
                </div>
                <div className="deal-picker-products">
                  <span>ARTÍCULOS INCLUIDOS</span>
                  {lineProducts.map((line) => (
                    <article key={line.productId}>
                      <img src={line.product.image} alt={line.product.name} />
                      <div>
                        <strong>{line.product.name}</strong>
                        <span>{line.product.kind === "SERVICE" ? "Servicio" : "Producto"} · {line.product.sku}</span>
                      </div>
                      <Badge variant="outline">{line.quantity * quantity} × paquete</Badge>
                    </article>
                  ))}
                </div>
                <div className="deal-picker-pricing">
                  <div><span>Precio de lista</span><strong>{formatCurrency(listTotal * quantity)}</strong></div>
                  <div><span>Ahorro Deal</span><strong>-{formatCurrency(savings * quantity)}</strong></div>
                  <div className="deal-picker-final"><span>Total</span><strong>{formatCurrency(selectedDeal.price * quantity)}</strong></div>
                  {selectedDeal.price < minimumTotal && <small><ShieldCheck size={13} /> Precio debajo del mínimo conjunto autorizado exclusivamente para este Deal.</small>}
                </div>
                <div className="deal-picker-quantity">
                  <span>Cantidad de paquetes</span>
                  <div>
                    <Button type="button" variant="outline" size="icon" onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={quantity === 1}><Minus size={15} /></Button>
                    <strong>{quantity}</strong>
                    <Button type="button" variant="outline" size="icon" onClick={() => setQuantity((current) => current + 1)}><Plus size={15} /></Button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={addSelected} disabled={!selectedDeal}><PackagePlus size={16} /> Añadir Deal al ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
