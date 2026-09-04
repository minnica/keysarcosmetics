import { describe, expect, it } from "vitest";
import {
  redactPosReportCosts,
  resolvePosReportBranchScope,
} from "./pos-report-policy";

describe("política de reportes POS", () => {
  it("mantiene a un operador dentro de la sucursal de su terminal", () => {
    expect(resolvePosReportBranchScope({
      isMaster: false,
      terminalBranchId: "branch-a",
      requestedBranchIds: ["branch-b"],
      activeBranchIds: ["branch-a", "branch-b"],
    })).toEqual(["branch-a"]);
  });

  it("permite a master seleccionar sólo sucursales activas", () => {
    expect(resolvePosReportBranchScope({
      isMaster: true,
      terminalBranchId: "branch-a",
      requestedBranchIds: ["branch-b"],
      activeBranchIds: ["branch-a", "branch-b"],
    })).toEqual(["branch-b"]);
    expect(() => resolvePosReportBranchScope({
      isMaster: true,
      terminalBranchId: "branch-a",
      requestedBranchIds: ["branch-disabled"],
      activeBranchIds: ["branch-a"],
    })).toThrow("sucursales inválidas");
  });

  it("redacta costos y utilidad sin alterar las demás columnas", () => {
    expect(redactPosReportCosts({
      Producto: "Serum",
      Venta: "500.00",
      "Costo unitario": "100.00",
      Utilidad: "400.00",
      Margen: "80.00",
    }, false)).toEqual({ Producto: "Serum", Venta: "500.00" });
  });
});
