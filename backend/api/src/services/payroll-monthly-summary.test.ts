import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildMonthlyPayrollSummary,
  type MonthlyPayrollRunInput,
} from "./payroll-monthly-summary";

const money = (value: number) => new Prisma.Decimal(value);

function run(
  input: Partial<MonthlyPayrollRunInput> &
    Pick<MonthlyPayrollRunInput, "id" | "periodStart" | "periodEnd" | "status">,
): MonthlyPayrollRunInput {
  return {
    mode: "WITH_VAT",
    salesWithVat: money(0),
    salesWithoutVat: money(0),
    expenseTotal: money(0),
    payrollTotal: money(0),
    generalBalance: money(0),
    lines: [],
    ...input,
  };
}

function line(employeeId: string, employeeName: string, totalPayment: number) {
  return {
    employeeId,
    employeeName,
    positionName: "VENTAS",
    salaryPayment: money(5_000),
    salesWithVat: money(20_000),
    salesWithoutVat: money(17_241.38),
    commission: money(1_000),
    bonus: money(200),
    fine: money(100),
    adjustmentPositive: money(50),
    adjustmentNegative: money(25),
    perDiem: money(80),
    supplies: money(0),
    loanPayment: money(500),
    totalPayment: money(totalPayment),
    branchLines: [{ branchName: "CENTRO" }],
  };
}

describe("buildMonthlyPayrollSummary", () => {
  it("suma corridas calculadas aunque todavía no estén pagadas", () => {
    const summary = buildMonthlyPayrollSummary("2026-07", [
      run({
        id: "first",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-15T00:00:00.000Z"),
        status: "DRAFT",
        payrollTotal: money(5_705),
        salesWithVat: money(20_000),
        expenseTotal: money(1_000),
        generalBalance: money(13_295),
        lines: [line("employee-a", "ANA", 5_705)],
      }),
      run({
        id: "second",
        periodStart: new Date("2026-07-16T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T00:00:00.000Z"),
        status: "APPROVED",
        payrollTotal: money(6_205),
        salesWithVat: money(22_000),
        expenseTotal: money(800),
        generalBalance: money(14_995),
        lines: [line("employee-a", "ANA", 6_205)],
      }),
    ]);

    expect(summary.complete).toBe(true);
    expect(summary.includesDraft).toBe(true);
    expect(summary.payrollTotal.toString()).toBe("11910");
    expect(summary.lines[0]?.firstFortnightTotal.toString()).toBe("5705");
    expect(summary.lines[0]?.secondFortnightTotal.toString()).toBe("6205");
    expect(summary.lines[0]?.commission.toString()).toBe("2000");
  });

  it("marca el mes incompleto y excluye corridas canceladas", () => {
    const summary = buildMonthlyPayrollSummary("2026-07", [
      run({
        id: "active",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-15T00:00:00.000Z"),
        status: "APPROVED",
        payrollTotal: money(3_000),
      }),
      run({
        id: "canceled",
        periodStart: new Date("2026-07-16T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T00:00:00.000Z"),
        status: "CANCELED",
        payrollTotal: money(9_000),
      }),
    ]);

    expect(summary.complete).toBe(false);
    expect(summary.runCount).toBe(1);
    expect(summary.payrollTotal.toString()).toBe("3000");
    expect(summary.secondFortnight).toBeNull();
  });

  it("distingue corridas reales de periodos estimados", () => {
    const summary = buildMonthlyPayrollSummary("2026-07", [
      run({
        id: "actual",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-15T00:00:00.000Z"),
        status: "APPROVED",
        payrollTotal: money(3_000),
      }),
      run({
        id: "estimate",
        periodStart: new Date("2026-07-16T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T00:00:00.000Z"),
        status: "ESTIMATED",
        payrollTotal: money(4_000),
      }),
    ]);

    expect(summary.complete).toBe(true);
    expect(summary.isApproximate).toBe(true);
    expect(summary.runCount).toBe(1);
    expect(summary.estimatedCount).toBe(1);
    expect(summary.payrollTotal.toString()).toBe("7000");
    expect(summary.secondFortnight?.status).toBe("ESTIMATED");
  });
});
