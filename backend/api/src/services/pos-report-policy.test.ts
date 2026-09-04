import { describe, expect, it } from "vitest";
import {
  redactPosReportCosts,
  resolvePosReportBranchScope,
} from "./pos-report-policy";

describe("política de reportes POS", () => {
  it("rechaza una sucursal fuera de la unión autorizada", () => {
    expect(() =>
      resolvePosReportBranchScope({
        authorizedBranchIds: ["branch-a"],
        requestedBranchIds: ["branch-b"],
      }),
    ).toThrow("no autorizada");
  });

  it("permite seleccionar un subconjunto y materializa todas las autorizadas", () => {
    expect(
      resolvePosReportBranchScope({
        authorizedBranchIds: ["branch-a", "branch-b"],
        requestedBranchIds: ["branch-b"],
      }),
    ).toEqual(["branch-b"]);
    expect(
      resolvePosReportBranchScope({
        authorizedBranchIds: ["branch-a", "branch-b"],
        requestedBranchIds: [],
      }),
    ).toEqual(["branch-a", "branch-b"]);
  });

  it("redacta costos y utilidad sin alterar las demás columnas", () => {
    expect(
      redactPosReportCosts(
        {
          Producto: "Serum",
          Venta: "500.00",
          "Costo unitario": "100.00",
          Utilidad: "400.00",
          Margen: "80.00",
        },
        false,
      ),
    ).toEqual({ Producto: "Serum", Venta: "500.00" });
  });
});
