import type { Ticket } from "./types";

export const VAT_RATE = 0.16;

export const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const calculateIncludedVat = (
  grossAmount: number,
  includesVat: boolean,
) => {
  const gross = roundCurrency(Math.max(0, grossAmount));
  if (!includesVat) return { gross, net: gross, vat: 0 };
  const net = roundCurrency(gross / (1 + VAT_RATE));
  return { gross, net, vat: roundCurrency(gross - net) };
};

export const getTicketTaxSummary = (ticket: Ticket) => {
  if (
    typeof ticket.netTotal === "number" &&
    typeof ticket.vatAmount === "number"
  ) {
    return {
      gross: ticket.total,
      net: ticket.netTotal,
      vat: ticket.vatAmount,
    };
  }
  const lineNet = ticket.products.reduce(
    (sum, product) => sum + (product.netTotal ?? product.total),
    0,
  );
  const lineVat = ticket.products.reduce(
    (sum, product) => sum + (product.vatAmount ?? 0),
    0,
  );
  if (lineVat <= 0) return { gross: ticket.total, net: ticket.total, vat: 0 };
  const ratio = ticket.subtotal > 0 ? ticket.total / ticket.subtotal : 1;
  const net = roundCurrency(lineNet * ratio);
  return {
    gross: ticket.total,
    net,
    vat: roundCurrency(ticket.total - net),
  };
};
