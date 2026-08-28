import { useEffect, useState } from "react";
import { Gift, PackageCheck, Printer, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import { getTicketTaxSummary } from "../tax";
import type {
  LayawayRecord,
  PaymentMethodOption,
  ReceiptSettings,
  Ticket,
  VoucherIssue,
  VoucherTemplate,
} from "../types";

interface ReceiptTicketDialogProps {
  open: boolean;
  ticket: Ticket | null;
  layaway: LayawayRecord | null;
  settings: ReceiptSettings;
  branchAddresses: Record<string, string>;
  paymentMethods: PaymentMethodOption[];
  voucherTemplates: VoucherTemplate[];
  allowPrint: boolean;
  onIssueVoucher: (ticket: Ticket, voucherId: string) => VoucherIssue | null;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptTicketDialog({
  open,
  ticket,
  layaway,
  settings,
  branchAddresses,
  paymentMethods,
  voucherTemplates,
  allowPrint,
  onIssueVoucher,
  onOpenChange,
}: ReceiptTicketDialogProps) {
  const [selectedVoucherId, setSelectedVoucherId] = useState("");
  const [issuedVoucher, setIssuedVoucher] = useState<VoucherIssue | null>(null);

  useEffect(() => {
    setSelectedVoucherId("");
    setIssuedVoucher(null);
  }, [open, ticket?.id]);

  if (!ticket) return null;

  const paymentLabel = (methodId: string) =>
    paymentMethods.find((method) => method.id === methodId)?.label ?? methodId;
  const taxSummary = getTicketTaxSummary(ticket);
  const ticketBranchName = ticket.branchName
    ? `Sucursal ${ticket.branchName.replace(/^Sucursal\s+/i, "")}`
    : settings.branchName;
  const ticketBranchKey = ticket.branchName?.replace(/^Sucursal\s+/i, "");
  const ticketBranchAddress =
    ticket.branchAddress ||
    (ticketBranchKey ? branchAddresses[ticketBranchKey] : "") ||
    settings.address;

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
                <img
                  src={settings.logoUrl}
                  alt={settings.companyName}
                  style={{
                    width: `${settings.logoWidth}px`,
                    maxWidth: "100%",
                    maxHeight: "72px",
                  }}
                />
              )}
              <h2>{settings.companyName}</h2>
              <strong>{ticketBranchName}</strong>
              <span>{ticketBranchAddress}</span>
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

            {(ticket.deals?.length ?? 0) > 0 && (
              <section className="customer-ticket-deals">
                <h3><PackageCheck size={14} /> DEALS</h3>
                {ticket.deals?.map((deal) => (
                  <div key={`${deal.dealId}-${deal.dealSku}`}>
                    <span>{deal.quantity} × {deal.dealName}<small>{deal.dealSku}</small></span>
                    <strong>{formatCurrency(deal.total)}</strong>
                  </div>
                ))}
              </section>
            )}

            <section className="customer-ticket-products">
              <div className="ticket-product-heading">
                <span>DESCRIPCIÓN</span>
                <span>IMPORTE</span>
              </div>
              {ticket.products.map((product, index) => (
                <div className="ticket-product-line" key={`${product.productId}-${index}`}>
                  <span>
                    {product.quantity} × {product.name}
                    {product.dealName && <small>Incluido en {product.dealName}</small>}
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
              {settings.showVatBreakdown && (
                <>
                  <div>
                    <span>Subtotal sin IVA</span>
                    <strong>{formatCurrency(taxSummary.net)}</strong>
                  </div>
                  <div>
                    <span>IVA 16% incluido</span>
                    <strong>{formatCurrency(taxSummary.vat)}</strong>
                  </div>
                </>
              )}
              <div className="ticket-final-total">
                <span>TOTAL</span>
                <strong>{formatCurrency(ticket.total)}</strong>
              </div>
              {!settings.showVatBreakdown && (
                <p className="customer-ticket-tax-note">
                  Todos nuestros precios ya incluyen IVA.
                </p>
              )}
            </section>

            <section className="customer-ticket-payments">
              <h3>FORMA DE PAGO</h3>
              {ticket.payments.length > 0 ? (
                ticket.payments.map((payment) => (
                  <div key={payment.id}>
                    <span>
                      {payment.folio && <small>Folio {payment.folio}</small>}
                      {paymentLabel(payment.methodId)}
                      {payment.cardOrBank ? ` · ${payment.cardOrBank}` : ""}
                      {payment.authorizationCode
                        ? ` · Aut. ${payment.authorizationCode}`
                        : ""}
                    </span>
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

            {layaway && layaway.payments.length > 0 && (
              <section className="customer-ticket-payment-history">
                <h3>HISTORIAL DE PAGOS</h3>
                {layaway.payments.map((payment) => {
                  const entries = payment.payments ?? [
                    {
                      id: payment.id,
                      methodId: payment.methodId,
                      amount: payment.amount,
                    },
                  ];
                  return (
                    <div key={payment.id}>
                      <span>
                        <strong>{payment.folio}</strong>
                        <small>{payment.createdAt}</small>
                        <small>
                          {entries
                            .map(
                              (entry) =>
                                `${paymentLabel(entry.methodId)}${entry.cardOrBank ? ` · ${entry.cardOrBank}` : ""}${entry.authorizationCode ? ` · Aut. ${entry.authorizationCode}` : ""} ${formatCurrency(entry.amount)}`,
                            )
                            .join(" + ")}
                        </small>
                      </span>
                      <span>
                        <strong>{formatCurrency(payment.amount)}</strong>
                        {typeof payment.balanceAfter === "number" && (
                          <small>
                            Saldo {formatCurrency(payment.balanceAfter)}
                          </small>
                        )}
                      </span>
                    </div>
                  );
                })}
                <div className={layaway.status === "PAID" ? "is-paid" : ""}>
                  <span>
                    <strong>ESTATUS DEL APARTADO</strong>
                  </span>
                  <span>
                    <strong>
                      {layaway.status === "PAID" ? "LIQUIDADO" : "SALDO PENDIENTE"}
                    </strong>
                    <small>{formatCurrency(layaway.balanceDue)}</small>
                  </span>
                </div>
              </section>
            )}

            <footer className="customer-ticket-footer">
              {settings.footerMessage && (
                <strong>{settings.footerMessage}</strong>
              )}
              {settings.policies && <p>{settings.policies}</p>}
              <span>••• {settings.companyName} •••</span>
            </footer>
          </article>
        </div>

        {ticket.ticketType !== "LAYAWAY_PAYMENT" && voucherTemplates.length > 0 && (
          <section className="receipt-voucher-picker">
            <div>
              <Gift size={18} />
              <span>
                <strong>Promoción para la próxima visita</strong>
                <small>Elige sólo si deseas emitir e imprimir un voucher.</small>
              </span>
            </div>
            {!issuedVoucher ? (
              <div className="receipt-voucher-picker-actions">
                <Select value={selectedVoucherId} onValueChange={setSelectedVoucherId}>
                  <SelectTrigger><SelectValue placeholder="Elegir voucher" /></SelectTrigger>
                  <SelectContent>
                    {voucherTemplates.map((voucher) => (
                      <SelectItem key={voucher.id} value={voucher.id}>{voucher.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedVoucherId}
                  onClick={() => setIssuedVoucher(onIssueVoucher(ticket, selectedVoucherId))}
                >
                  <Gift size={15} /> Generar
                </Button>
              </div>
            ) : (
              <article className="customer-voucher-print">
                <small>VOUCHER PROMOCIONAL</small>
                <h3>{issuedVoucher.voucherName}</h3>
                <p>{issuedVoucher.message}</p>
                <strong>{issuedVoucher.folio}</strong>
                <span>{issuedVoucher.clientName} · {issuedVoucher.branch}</span>
              </article>
            )}
          </section>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <X size={16} /> Cerrar
          </Button>
          {allowPrint ? (
            <Button type="button" onClick={() => window.print()}>
              <Printer size={16} /> Imprimir ticket
            </Button>
          ) : (
            <span className="receipt-print-restricted">
              Impresión no autorizada para este rol
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
