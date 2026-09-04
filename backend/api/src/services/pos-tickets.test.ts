import { describe, expect, it } from "vitest";
import {
  allocateLargestRemainder,
  assertNoSensitivePaymentData,
  containsLikelyPan,
  PosTicketError,
  quoteFromSnapshots,
  sellerProjectionPayments,
  validatePaymentCommercialDetails,
} from "./pos-tickets";

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

describe("reglas comerciales de pagos y participantes", () => {
  const card = (
    overrides: Partial<
      Parameters<typeof validatePaymentCommercialDetails>[0]
    > = {},
  ) =>
    validatePaymentCommercialDetails({
      methodType: "TARJETA",
      cardType: "CREDIT",
      cardNetworkId: "VISA",
      bankId: "MX-BANK-038",
      installmentMonths: 6,
      authorizationLastFour: "1234",
      activeInstallments: [1, 3, 6, 9, 12, 18, 24],
      ...overrides,
    });

  it("acepta crédito sólo con red, banco, autorización y plazo vigente", () => {
    expect(() => card()).not.toThrow();
    expect(() => card({ installmentMonths: 48 })).toThrow(PosTicketError);
    expect(() => card({ bankId: undefined })).toThrow(PosTicketError);
  });

  it("rechaza plazo en débito y detalles de tarjeta en efectivo", () => {
    expect(() =>
      card({ cardType: "DEBIT", installmentMonths: undefined }),
    ).not.toThrow();
    expect(() => card({ cardType: "DEBIT", installmentMonths: 3 })).toThrow(
      PosTicketError,
    );
    expect(() =>
      card({
        methodType: "EFECTIVO",
        cardType: undefined,
        cardNetworkId: "VISA",
        bankId: undefined,
        installmentMonths: undefined,
        authorizationLastFour: undefined,
      }),
    ).toThrow(PosTicketError);
  });

  it("permite banco en transferencia sin tipo, red ni plazo", () => {
    expect(() =>
      card({
        methodType: "TRANSFERENCIA",
        cardType: undefined,
        cardNetworkId: undefined,
        bankId: "MX-BANK-038",
        installmentMonths: undefined,
        authorizationLastFour: "1234",
      }),
    ).not.toThrow();
  });

  it("detecta PAN aun cuando contiene espacios o guiones", () => {
    expect(containsLikelyPan("4111 1111 1111 1111")).toBe(true);
    expect(containsLikelyPan("4111-1111-1111-1111")).toBe(true);
    expect(containsLikelyPan("Autorización 1234")).toBe(false);
  });

  it("impide PAN, CVV y banda dentro de snapshots de revisión", () => {
    expect(() =>
      assertNoSensitivePaymentData({
        payments: [{ cardNumber: "4111111111111111" }],
      }),
    ).toThrow(PosTicketError);
    expect(() => assertNoSensitivePaymentData({ cvv: "123" })).toThrow(
      PosTicketError,
    );
    expect(() =>
      assertNoSensitivePaymentData({ authorizationCode: "1234" }),
    ).not.toThrow();
  });

  it("proyecta a legacy sólo la participación humana y conserva centavos", () => {
    expect(
      sellerProjectionPayments(
        [
          { methodId: "cash", amountCents: 7_001 },
          { methodId: "card", amountCents: 2_999 },
        ],
        2_500,
        10_000,
      ),
    ).toEqual([
      { methodId: "cash", amountCents: 1_750 },
      { methodId: "card", amountCents: 750 },
    ]);
    expect(
      sellerProjectionPayments(
        [{ methodId: "cash", amountCents: 10_000 }],
        0,
        10_000,
      ),
    ).toEqual([]);
  });
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
