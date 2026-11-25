import type { PilotReference, PilotSnapshot } from "@cosmetics/types";
import {
  calculatePayroll,
  type CalculationEmployee,
} from "../services/payroll-calculation";

export function referenceForCut(cut: PilotSnapshot): PilotReference[] {
  return cut.periods.map((period) => {
    const run = cut.runs.find((r) => r.periodStart === period.start);
    const mode = run?.mode ?? "WITH_VAT";
    if (run)
      return {
        period: period.start,
        mode,
        source: run.status,
        lines: cut.lines.filter((l) => l.payrollRunId === run.id),
      };
    const branchName = (id: string | null) =>
      cut.branches.find((b) => b.id === id)?.name ?? "CORPORATIVO";
    const employees: CalculationEmployee[] = cut.employees.flatMap((e) => {
      const assignment = cut.assignments
        .filter(
          (a) =>
            a.employeeId === e.id &&
            a.effectiveFrom <= period.start &&
            (!a.effectiveTo || a.effectiveTo >= period.start),
        )
        .at(-1);
      const scheme = cut.schemes
        .filter(
          (s) =>
            s.schemeId === assignment?.schemeId &&
            s.effectiveFrom <= period.start,
        )
        .at(-1);
      const inPeriod = (d: string) => d >= period.start && d <= period.finish;
      const sales = cut.sales
        .filter((s) => s.employeeId === e.id && inPeriod(s.date))
        .map((s) => ({ ...s, branchName: branchName(s.branchId) }));
      const movements = cut.movements
        .filter(
          (m) =>
            m.employeeId === e.id &&
            m.status === "APPROVED" &&
            inPeriod(m.date),
        )
        .map((m) => ({ ...m, branchName: branchName(m.branchId) }));
      const installments = cut.loans
        .filter((l) => l.employeeId === e.id)
        .flatMap((l) =>
          l.installments.filter(
            (i) =>
              (i.status === "SCHEDULED" && i.end <= period.finish) ||
              (i.start === period.start &&
                i.end === period.finish &&
                i.status !== "CANCELED"),
          ),
        );
      if (
        !sales.length &&
        !movements.length &&
        !installments.length &&
        !(e.active && (assignment || Number(e.salary) > 0))
      )
        return [];
      return [
        {
          employeeId: e.id,
          employeeName: e.name,
          positionName: e.position,
          monthlySalary: e.salary,
          bankName: null,
          accountNumber: null,
          phoneNumber: null,
          scheme: scheme
            ? {
                name: scheme.name,
                version: scheme.version,
                tiers: scheme.tiers.map((t) => ({
                  fromAmount: t.from,
                  toAmount: t.to,
                  rate: t.rate,
                })),
              }
            : null,
          sales,
          movements,
          loanPayment:
            installments.reduce((n, i) => n + Math.round(i.amount * 100), 0) /
            100,
        },
      ];
    });
    const { lines } = calculatePayroll({
      employees,
      mode,
      vatRate: "0.16",
      expenseTotal: 0,
    });
    return {
      period: period.start,
      mode,
      source: "CALCULATED",
      lines: lines.map((l) => ({
        employeeId: l.employeeId,
        salaryPayment: l.salaryPayment.toNumber(),
        commission: l.commission.toNumber(),
        bonus: l.bonus.toNumber(),
        fine: l.fine.toNumber(),
        adjustmentPositive: l.adjustmentPositive.toNumber(),
        adjustmentNegative: l.adjustmentNegative.toNumber(),
        perDiem: l.perDiem.toNumber(),
        supplies: l.supplies.toNumber(),
        loanPayment: l.loanPayment.toNumber(),
        totalPayment: l.totalPayment.toNumber(),
        receiptStatus: null,
        branches: l.branchLines.map((b) => ({
          branchId: b.branchId,
          branchName: b.branchName,
          cost: b.totalCost.toNumber(),
        })),
      })),
    };
  });
}
