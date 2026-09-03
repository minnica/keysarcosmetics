import { describe, expect, it } from "vitest";
import {
  posCatalogItemUpsertSchema,
  posCustomerSearchQuerySchema,
  posCatalogItemWriteSchema,
  posLoginRequestSchema,
  posMutationHeadersSchema,
  posTerminalStatusUpdateSchema,
  posTicketQuoteRequestSchema,
} from "./pos.contracts";

describe("contratos públicos del POS", () => {
  it("normaliza el alias y no acepta campos inesperados en login", () => {
    const parsed = posLoginRequestSchema.parse({
      alias: "  Venta.Polanco  ",
      pin: "4826",
      terminalCode: "T-01",
      terminalSecret: "a".repeat(32),
    });

    expect(parsed.alias).toBe("venta.polanco");
    expect(
      posLoginRequestSchema.safeParse({ ...parsed, ignored: true }).success,
    ).toBe(false);
  });

  it("sólo permite activar o revocar una terminal provisionada", () => {
    expect(posTerminalStatusUpdateSchema.parse({ status: "ACTIVE" })).toEqual({
      status: "ACTIVE",
    });
    expect(
      posTerminalStatusUpdateSchema.safeParse({ status: "PENDING" }).success,
    ).toBe(false);
  });

  it("protege las reglas de publicación del catálogo", () => {
    const result = posCatalogItemUpsertSchema.safeParse({
      id: "item-1",
      sku: "KSR-001",
      name: "SERUM",
      kind: "PRODUCT",
      familyId: null,
      categoryId: null,
      description: null,
      benefits: [],
      imageUrl: null,
      published: true,
      active: true,
      listPrice: "100.00",
      minimumPrice: "90.00",
      taxRate: "16.00",
    });

    expect(result.success).toBe(false);
  });

  it("no acepta precio mínimo mayor a lista ni IVA fuera de rango", () => {
    const base = {
      sku: "KSR-001",
      name: "SERUM",
      kind: "PRODUCT" as const,
      familyId: null,
      categoryId: null,
      supplierId: null,
      description: "Tratamiento facial",
      benefits: ["Hidratación"],
      branchIds: [],
      published: true,
      active: true,
      listPrice: "100.00",
      minimumPrice: "90.00",
      unitCost: "40.00",
      taxRate: "16.00",
    };
    expect(posCatalogItemWriteSchema.safeParse({ ...base, minimumPrice: "101.00" }).success).toBe(false);
    expect(posCatalogItemWriteSchema.safeParse({ ...base, taxRate: "101.00" }).success).toBe(false);
    expect(posCatalogItemWriteSchema.safeParse(base).success).toBe(true);
  });

  it("exige criterio de búsqueda y decimales exactos para una cotización", () => {
    expect(posCustomerSearchQuerySchema.safeParse({ query: " " }).success).toBe(
      false,
    );
    expect(
      posTicketQuoteRequestSchema.safeParse({
        branchId: "branch-1",
        lines: [{ itemId: "item-1", quantity: "1", unitPrice: "100.00" }],
        sellers: [{ employeeId: "employee-1", share: "100.00" }],
        payments: [
          { methodId: "payment-1", methodType: "CASH", amount: "100.00" },
        ],
      }).success,
    ).toBe(false);
    expect(
      posMutationHeadersSchema.safeParse({ "idempotency-key": "invalid" })
        .success,
    ).toBe(false);
  });
});
