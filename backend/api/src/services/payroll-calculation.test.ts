import { describe, expect, it } from "vitest";
import {
  calculatePayroll,
  generateInstallmentSchedule,
} from "./payroll-calculation";

const employee = {
  employeeId: "employee-1",
  employeeName: "EMPLEADA PRUEBA",
  positionName: "VENDEDORA",
  bankName: "BANCO",
  accountNumber: "1234",
  phoneNumber: "525500000000",
  monthlySalary: "10000",
  scheme: {
    name: "GENERAL",
    version: 1,
    tiers: [
      { fromAmount: "0", toAmount: "14999.99", rate: "0.05" },
      { fromAmount: "15000", toAmount: null, rate: "0.10" },
    ],
  },
  sales: [
    { branchId: "a", branchName: "SUCURSAL A", amount: "11600" },
    { branchId: "b", branchName: "SUCURSAL B", amount: "5800" },
  ],
  movements: [
    {
      kind: "BONUS" as const,
      branchId: "a",
      branchName: "SUCURSAL A",
      amount: "500",
      commissionable: true,
    },
    {
      kind: "FINE" as const,
      branchId: null,
      branchName: "CORPORATIVO",
      amount: "100",
      commissionable: true,
    },
  ],
  loanPayment: "400",
};

describe("calculatePayroll", () => {
  it("usa la misma base para seleccionar rango y calcular comisión sin IVA", () => {
    const result = calculatePayroll({
      mode: "WITHOUT_VAT",
      vatRate: "0.16",
      expenseTotal: "1000",
      employees: [employee],
    });
    const line = result.lines[0]!;

    expect(line.salesWithVat.toString()).toBe("17400");
    expect(line.salesWithoutVat.toString()).toBe("15000");
    expect(line.individualRate?.toString()).toBe("0.1");
    expect(line.commission.toString()).toBe("1500");
    expect(line.salaryPayment.toString()).toBe("5000");
    expect(line.totalPayment.toString()).toBe("6500");
    expect(result.generalBalance.toString()).toBe("9900");
  });

  it("distribuye sueldo, comisión y préstamo proporcionalmente sin perder centavos", () => {
    const result = calculatePayroll({
      mode: "WITH_VAT",
      vatRate: "0.16",
      expenseTotal: 0,
      employees: [employee],
    });
    const line = result.lines[0]!;
    const allocated = line.branchLines.reduce(
      (total, branch) => total + Number(branch.totalCost),
      0,
    );

    expect(line.individualRate?.toString()).toBe("0.1");
    expect(line.commission.toString()).toBe("1740");
    expect(allocated).toBe(Number(line.totalPayment));
  });

  it("bloquea aprobación sin esquema y pago sin datos bancarios", () => {
    const result = calculatePayroll({
      mode: "WITH_VAT",
      vatRate: "0.16",
      expenseTotal: 0,
      employees: [
        {
          ...employee,
          scheme: null,
          bankName: null,
          accountNumber: "",
          monthlySalary: null,
        },
      ],
    });
    const warnings = result.lines[0]!.warnings;

    expect(
      warnings.find((item) => item.code === "MISSING_SCHEME")?.blockingApproval,
    ).toBe(true);
    expect(
      warnings.find((item) => item.code === "MISSING_BANK")?.blockingPayment,
    ).toBe(true);
    expect(
      warnings.find((item) => item.code === "MISSING_ACCOUNT")?.blockingPayment,
    ).toBe(true);
    expect(
      warnings.find((item) => item.code === "MISSING_SALARY")?.blockingApproval,
    ).toBe(false);
  });
});

describe("generateInstallmentSchedule", () => {
  it("genera quincenas consecutivas y ajusta el último centavo", () => {
    const schedule = generateInstallmentSchedule(
      "1000",
      3,
      new Date("2026-07-16T00:00:00.000Z"),
    );

    expect(schedule.map((item) => item.amount.toString())).toEqual([
      "333.33",
      "333.33",
      "333.34",
    ]);
    expect(
      schedule.map((item) => item.periodStart.toISOString().slice(0, 10)),
    ).toEqual(["2026-07-16", "2026-08-01", "2026-08-16"]);
    expect(
      schedule.map((item) => item.periodEnd.toISOString().slice(0, 10)),
    ).toEqual(["2026-07-31", "2026-08-15", "2026-08-31"]);
  });
});
