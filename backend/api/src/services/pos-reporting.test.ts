import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  exportFilterMetadata,
  paginateReportRows,
  posLocalDateStart,
  resolvePosReportPeriod,
  signedPaymentAmount,
} from "./pos-reporting";
import { resolvePosDataScope } from "./pos-scope";

describe("agregados y exportaciones POS", () => {
  it("usa el mes calendario de America/Mexico_City", () => {
    const period = resolvePosReportPeriod({ month: "2026-09" });
    expect(period.dateFrom).toBe("2026-09-01");
    expect(period.dateTo).toBe("2026-09-30");
    expect(period.instantFrom.toISOString()).toBe("2026-09-01T06:00:00.000Z");
    expect(period.instantToExclusive.toISOString()).toBe(
      "2026-10-01T06:00:00.000Z",
    );
    expect(posLocalDateStart("2026-01-01").toISOString()).toBe(
      "2026-01-01T06:00:00.000Z",
    );
  });

  it("rechaza periodos ambiguos o mayores a 366 días", () => {
    expect(() =>
      resolvePosReportPeriod({
        dateFrom: "2026-02-30",
        dateTo: "2026-03-01",
      }),
    ).toThrow("obligatorio");
    expect(() =>
      resolvePosReportPeriod({
        month: "2026-09",
        dateFrom: "2026-09-01",
        dateTo: "2026-09-30",
      }),
    ).toThrow("no ambos");
    expect(() =>
      resolvePosReportPeriod({
        dateFrom: "2025-01-01",
        dateTo: "2026-01-02",
      }),
    ).toThrow("366");
  });

  it("exporta el conjunto completo y pagina sólo la pantalla", () => {
    const rows = Array.from({ length: 1_205 }, (_, index) => index);
    expect(paginateReportRows(rows, 2, 100, false)).toEqual(
      rows.slice(100, 200),
    );
    expect(paginateReportRows(rows, 9, 100, true)).toEqual(rows);
  });

  it("firma compensaciones por movimiento sin duplicar tickets", () => {
    expect(signedPaymentAmount(new Prisma.Decimal("25.50"), "SALE").toFixed(2)).toBe(
      "25.50",
    );
    expect(
      signedPaymentAmount(new Prisma.Decimal("25.50"), "REFUND").toFixed(2),
    ).toBe("-25.50");
  });

  it("materializa alcances de 1, 10, 20 y 30 sucursales sin nombres fijos", () => {
    for (const size of [1, 10, 20, 30]) {
      const ids = Array.from({ length: size }, (_, index) => `branch-${index}`);
      expect(
        resolvePosDataScope({
          authorizedBranchIds: ids,
          employeeId: "employee-1",
          canViewAllPortfolio: false,
        }),
      ).toEqual({
        timeZone: "America/Mexico_City",
        branchIds: ids,
        portfolio: { mode: "OWN", employeeId: "employee-1" },
      });
    }
  });

  it("audita filtros libres mediante hash y no conserva su valor", () => {
    const metadata = exportFilterMetadata({
      bankId: "bank-1",
      search: "clienta sensible",
    });
    expect(metadata["bankId"]).toBe("bank-1");
    expect(metadata["searchApplied"]).toBe(true);
    expect(metadata["searchHash"]).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.values(metadata)).not.toContain("clienta sensible");
  });
});
