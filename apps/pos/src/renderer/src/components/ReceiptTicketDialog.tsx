import { Printer, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import type { PaymentMethodOption, ReceiptSettings, Ticket } from "../types";

interface ReceiptTicketDialogProps {
  open: boolean;
  ticket: Ticket | null;
  settings: ReceiptSettings;
  paymentMethods: PaymentMethodOption[];
  onOpenChange: (open: boolean) => void;
}

export function ReceiptTicketDialog({
  open,
  ticket,
  settings,
  paymentMethods,
  onOpenChange,
}: ReceiptTicketDialogProps) {
  if (!ticket) return null;

  const paymentLabel = (methodId: string) =>
    paymentMethods.find((method) => method.id === methodId)?.label ?? methodId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="receipt-preview-dialog sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Ticket final</DialogTitle>
          <DialogDescription>
            Vista previa para impresora térmica de punto de venta.
          </DialogDescription>
        </DialogHeader>

        <div className="customer-ticket-shell">
          <article
            className="customer-ticket"
            aria-label={`Ticket ${ticket.id}`}
          >
            <header className="customer-ticket-header">
              {settings.logoUrl && (
                <img src={settings.logoUrl} alt={settings.companyName} />
              )}
              <h2>{settings.companyName}</h2>
              <strong>{settings.branchName}</strong>
              <span>{settings.address}</span>
            </header>

            <div className="customer-ticket-folio">
              <span>FOLIO</span>
              <strong>{ticket.id}</strong>
              <small>{ticket.createdAt}</small>
            </div>

            {(settings.showClientName ||
              settings.showClientPhone ||
              settings.showSellerName) && (
              <section className="customer-ticket-meta">
                {settings.showClientName && (
                  <div>
                    <span>CLIENTE</span>
                    <strong>{ticket.clientName}</strong>
                  </div>
                )}
                {settings.showClientPhone && ticket.clientPhone && (
                  <div>
                    <span>TELÉFONO</span>
                    <strong>{ticket.clientPhone}</strong>
                  </div>
                )}
                {settings.showSellerName && (
                  <div>
                    <span>VENDEDOR</span>
                    <strong>{ticket.sellerSummary}</strong>
                  </div>
                )}
              </section>
            )}

            <section className="customer-ticket-products">
              <div className="ticket-product-heading">
                <span>DESCRIPCIÓN</span>
                <span>IMPORTE</span>
              </div>
              {ticket.products.map((product) => (
                <div className="ticket-product-line" key={product.productId}>
                  <span>
                    {product.quantity} × {product.name}
                  </span>
                  <strong>{formatCurrency(product.total)}</strong>
                </div>
              ))}
            </section>

            <section className="customer-ticket-totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(ticket.subtotal)}</strong>
              </div>
              {ticket.discountAmount > 0 && (
                <div>
                  <span>Descuento promocional</span>
                  <strong>-{formatCurrency(ticket.discountAmount)}</strong>
                </div>
              )}
              <div className="ticket-final-total">
                <span>TOTAL</span>
                <strong>{formatCurrency(ticket.total)}</strong>
              </div>
            </section>

            <section className="customer-ticket-payments">
              <h3>FORMA DE PAGO</h3>
              {ticket.payments.length > 0 ? (
                ticket.payments.map((payment) => (
                  <div key={payment.id}>
                    <span>{paymentLabel(payment.methodId)}</span>
                    <strong>{formatCurrency(payment.amount)}</strong>
                  </div>
                ))
              ) : (
                <div>
                  <span>Pendiente de cobro</span>
                  <strong>{formatCurrency(0)}</strong>
                </div>
              )}
              {ticket.balanceDue > 0 && (
                <div className="ticket-balance-due">
                  <span>SALDO PENDIENTE</span>
                  <strong>{formatCurrency(ticket.balanceDue)}</strong>
                </div>
              )}
            </section>

            <footer className="customer-ticket-footer">
              {settings.footerMessage && (
                <strong>{settings.footerMessage}</strong>
              )}
              {settings.policies && <p>{settings.policies}</p>}
              <span>••• {settings.companyName} •••</span>
            </footer>
          </article>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <X size={16} /> Cerrar
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
