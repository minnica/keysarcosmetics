import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  commissionOverviewPayment,
  isManagementPosition,
  isSpecialistPosition,
  salaryOverviewNetPayment,
  salaryOverviewPayment,
} from "./payroll.service";

const D = Prisma.Decimal;

describe("payroll overview rules", () => {
  it("identifica facialistas y especialistas sin depender de mayúsculas", () => {
    expect(isSpecialistPosition("Facialista")).toBe(true);
    expect(isSpecialistPosition("ESPECIALISTA DE CABINA")).toBe(true);
    expect(isSpecialistPosition("Gerente de sucursal")).toBe(false);
    expect(isSpecialistPosition(null)).toBe(false);
  });

  it("identifica puestos de gerencia sin confundir otros puestos", () => {
    expect(isManagementPosition("Gerente")).toBe(true);
    expect(isManagementPosition("GERENTE DE SUCURSAL")).toBe(true);
    expect(isManagementPosition("Administrador general")).toBe(false);
    expect(isManagementPosition(null)).toBe(false);
  });

  it("usa la mitad del sueldo en quincenal y el sueldo completo en mensual", () => {
    expect(salaryOverviewPayment("9000", "FORTNIGHT").toString()).toBe("4500");
    expect(salaryOverviewPayment("9000", "MONTHLY").toString()).toBe("9000");
    expect(salaryOverviewPayment(null, "FORTNIGHT").toString()).toBe("0");
  });

  it("resta la multa dirigida a una nómina salarial", () => {
    expect(
      salaryOverviewNetPayment("9000", "FORTNIGHT", "500").toString(),
    ).toBe("4000");
    expect(salaryOverviewNetPayment("9000", "MONTHLY", "500").toString()).toBe(
      "8500",
    );
  });

  it("calcula el neto de comisiones sin agregar sueldo", () => {
    const total = commissionOverviewPayment({
      commission: new D(15_780),
      bonus: new D(500),
      adjustmentPositive: new D(200),
      perDiem: new D(300),
      supplies: new D(100),
      fine: new D(80),
      adjustmentNegative: new D(11_000),
      loanPayment: new D(1_000),
    });
    expect(total.toString()).toBe("4800");
  });
});
