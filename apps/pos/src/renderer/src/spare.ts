import type { Product, Ticket } from "./types";

export const getProductSpare = (product: Pick<Product, "minPrice" | "maxPrice">) =>
  Math.max(0, product.maxPrice - product.minPrice);

export const getTicketSpare = (ticket: Ticket, products: Product[]) =>
  ticket.products.reduce((total, line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    return total + (product ? getProductSpare(product) * line.quantity : 0);
  }, 0);
