import type { DemoLoan } from "./payroll-demo-context";

export interface PayrollCharge {
  source: string;
  reference: string;
  date: string;
  amount: number;
}

export function loanCharges(loan: DemoLoan, start: string, end: string) {
  if (loan.status !== "APPROVED") return [];
  if (loan.sourceSchedule) {
    return loan.sourceSchedule.flatMap((item, index) => {
      const applied = loan.pilotPayments?.[index];
      // Las cuotas vencidas se cobran una vez. Las reservadas y pagadas pertenecen a su quincena.
      const due = applied
        ? applied >= start && applied <= end
        : item.status === "SCHEDULED"
          ? item.end <= end
          : item.status !== "CANCELED" &&
            item.start >= start &&
            item.end <= end;
      if (!due || item.amount <= 0) return [];
      return [
        {
          index,
          date: item.start,
          amount: item.amount,
          source:
            item.status === "PAID"
              ? "Cuota pagada del corte"
              : item.status === "RESERVED"
                ? "Cuota reservada del corte"
                : "Cuota programada del corte",
        },
      ];
    });
  }
  const alreadyApplied = loan.appliedPeriodStarts?.includes(start);
  if (
    loan.firstPeriod > end ||
    loan.installments <= 0 ||
    (!alreadyApplied && loan.paidInstallments >= loan.installments)
  )
    return [];
  return [
    {
      index: -1,
      date: start,
      amount: Math.round((100 * loan.amount) / loan.installments) / 100,
      source: "Cuota de prueba",
    },
  ];
}

export function applyLoanAtClose(
  loan: DemoLoan,
  module: string,
  start: string,
  end: string,
  by: string,
): DemoLoan {
  if (
    loan.payrollModule !== module ||
    (!loan.sourceSchedule && loan.appliedPeriodStarts?.includes(start))
  )
    return loan;
  const charges = loanCharges(loan, start, end).filter(
    (c) =>
      !loan.sourceSchedule ||
      (loan.sourceSchedule[c.index]?.status === "SCHEDULED" &&
        !loan.pilotPayments?.[c.index]),
  );
  if (!charges.length) return loan;
  const pilotPayments = { ...loan.pilotPayments };
  if (loan.sourceSchedule)
    for (const charge of charges) pilotPayments[charge.index] = start;
  return {
    ...loan,
    pilotPayments,
    paidInstallments: Math.min(
      loan.installments,
      loan.paidInstallments + charges.length,
    ),
    appliedPeriodStarts: Array.from(
      new Set([...(loan.appliedPeriodStarts ?? []), start]),
    ),
    history: [
      ...loan.history,
      {
        id: crypto.randomUUID(),
        date: start,
        by,
        action: `${charges.length} CUOTA(S) APLICADA(S) EN EL CIERRE ${start}`,
      },
    ],
  };
}

export function restoreImportedLoan(
  saved: DemoLoan,
  source: DemoLoan,
): DemoLoan {
  if (!source.sourceSchedule || source.sourceBalance === undefined)
    return saved;
  const restored = {
    ...saved,
    sourceSchedule: source.sourceSchedule,
    sourceBalance: source.sourceBalance,
  };
  if (saved.pilotPayments || !saved.appliedPeriodStarts?.length)
    return restored;
  // Las revisiones anteriores guardaban la quincena de cierre sin identificar cada cuota aplicada.
  const pilotPayments: Record<number, string> = {};
  for (const start of [...saved.appliedPeriodStarts].sort()) {
    if (source.appliedPeriodStarts?.includes(start)) continue;
    const [year, month, day] = start.split("-").map(Number);
    if (!year || !month || !day) continue;
    const end =
      day <= 15
        ? start.slice(0, 7) + "-15"
        : new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    source.sourceSchedule.forEach((item, index) => {
      if (
        item.status === "SCHEDULED" &&
        item.end <= end &&
        !pilotPayments[index]
      )
        pilotPayments[index] = start;
    });
  }
  return { ...restored, pilotPayments };
}

export function loanRemaining(loan: DemoLoan) {
  if (loan.sourceBalance !== undefined && loan.sourceSchedule) {
    const paid = loan.sourceSchedule.reduce(
      (sum, item, i) => sum + (loan.pilotPayments?.[i] ? item.amount : 0),
      0,
    );
    return Math.max(0, loan.sourceBalance - paid);
  }
  return Math.max(
    0,
    loan.amount -
      (loan.amount / Math.max(1, loan.installments)) * loan.paidInstallments,
  );
}
