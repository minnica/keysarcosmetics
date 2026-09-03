import { describe, expect, it } from "vitest";
import { allocateLargestRemainder, quoteFromSnapshots } from "./pos-tickets";

const item = (
  overrides: Partial<
    Parameters<typeof quoteFromSnapshots>[0]["lines"][number]["item"]
  > = {},
) => ({
  id: "item-1",
  name: "Producto",
  sku: "KSR-001",
  kind: "PRODUCT" as const,
  listPriceCents: 100_00,
  minimumPriceCents: 70_00,
  unitCostCents: 30_00,
  taxRateBasisPoints: 1600,
  familyName: "Facial",
  categoryName: "Suero",
  ...overrides,
});

describe("motor autoritativo de tickets POS", () => {
  it("distribuye centavos por mayor residuo sin perder el total", () => {
    expect(allocateLargestRemainder(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(
      allocateLargestRemainder(17, [50, 30, 20]).reduce(
        (sum, value) => sum + value,
        0,
      ),
    ).toBe(17);
  });

  it("evalúa el mínimo combinado sobre todo el carrito", () => {
    const quote = quoteFromSnapshots({
      lines: [
        { item: item(), quantity: "1.00", unitPrice: "50.00" },
        {
          item: item({ id: "item-2", sku: "KSR-002" }),
          quantity: "1.00",
          unitPrice: "90.00",
        },
      ],
      payments: [{ amount: "140.00" }],
    });
    expect(quote.totalCents).toBe(140_00);
    expect(quote.minimumCents).toBe(140_00);
    expect(quote.requiresAuthorization).toBe(false);
  });

  it("limita el descuento al SPARE y calcula IVA incluido por línea", () => {
    const quote = quoteFromSnapshots({
      lines: [{ item: item(), quantity: "1.00", unitPrice: "116.00" }],
      discount: { kind: "FIXED", value: "16.00" },
      payments: [{ amount: "100.00" }],
    });
    expect(quote.discountCents).toBe(16_00);
    expect(quote.totalCents).toBe(100_00);
    expect(quote.taxCents).toBe(13_79);
    expect(quote.requiresAuthorization).toBe(false);
  });

  it("limita el descuento al piso global sin requerir autorización", () => {
    const quote = quoteFromSnapshots({
      lines: [{ item: item(), quantity: "2.00", unitPrice: "80.00" }],
      discount: { kind: "PERCENT", value: "20.00" },
    });
    expect(quote.minimumCents).toBe(140_00);
    expect(quote.discountCents).toBe(20_00);
    expect(quote.totalCents).toBe(140_00);
    expect(quote.requiresAuthorization).toBe(false);
    expect(quote.pendingCents).toBe(140_00);
  });

  it("exige autorización cuando el precio capturado queda bajo el piso global", () => {
    const quote = quoteFromSnapshots({
      lines: [{ item: item(), quantity: "2.00", unitPrice: "60.00" }],
    });
    expect(quote.totalCents).toBe(120_00);
    expect(quote.minimumCents).toBe(140_00);
    expect(quote.requiresAuthorization).toBe(true);
  });
});
