import { describe, expect, it } from "vitest";
import {
  validatePosPilotOptions,
  type PosPilotReconciliationOptions,
} from "./pos-pilot-reconciliation";

const validOptions: PosPilotReconciliationOptions = {
  branchId: "branch-pilot",
  businessDate: "2026-09-03",
  minimumTicketCount: 1,
  requireClosedDay: true,
  requireCoverage: true,
  requireOfflineSync: true,
};

describe("POS pilot reconciliation options", () => {
  it("accepts a complete pilot scope", () => {
    expect(() => validatePosPilotOptions(validOptions)).not.toThrow();
  });

  it("rejects impossible calendar dates", () => {
    expect(() =>
      validatePosPilotOptions({
        ...validOptions,
        businessDate: "2026-02-30",
      }),
    ).toThrow("no es una fecha válida");
  });

  it("rejects negative or fractional ticket thresholds", () => {
    expect(() =>
      validatePosPilotOptions({
        ...validOptions,
        minimumTicketCount: -1,
      }),
    ).toThrow("entero mayor o igual a cero");
    expect(() =>
      validatePosPilotOptions({
        ...validOptions,
        minimumTicketCount: 1.5,
      }),
    ).toThrow("entero mayor o igual a cero");
  });
});
