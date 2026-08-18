import {
  PayrollExpenseFrequency,
  PayrollExpenseKind,
  Prisma,
} from "@prisma/client";
import { prisma } from "../prisma/client";

export type RecurringExpenseFrequency = Exclude<
  PayrollExpenseFrequency,
  "ONE_TIME"
>;

type RecurrenceWindow = {
  frequency: RecurringExpenseFrequency;
  anchorDate?: Date;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

export type PlannedRecurringExpense = {
  recurrenceId: string;
  recurrenceVersionId: string;
  date: Date;
  kind: PayrollExpenseKind;
  concept: string;
  category: string;
  categoryId: string | null;
  branchId: string | null;
  costCenter: string;
  amount: Prisma.Decimal;
  frequency: RecurringExpenseFrequency;
  notes: string | null;
  createdById: string;
};

function atUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function monthlyDate(anchor: Date, monthOffset: number): Date {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + monthOffset;
  const lastDay = atUtcDate(year, month + 1, 0).getUTCDate();
  return atUtcDate(year, month, Math.min(anchor.getUTCDate(), lastDay));
}

function nextFortnightDate(date: Date): Date {
  if (date.getUTCDate() < 16)
    return atUtcDate(date.getUTCFullYear(), date.getUTCMonth(), 16);
  return atUtcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

export function previousUtcDate(date: Date): Date {
  const previous = new Date(date);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous;
}

export function nextRecurringExpenseDate(
  frequency: RecurringExpenseFrequency,
  date: Date,
): Date {
  return frequency === "MONTHLY"
    ? monthlyDate(date, 1)
    : nextFortnightDate(date);
}

export function nextRecurringExpenseOccurrence(
  window: RecurrenceWindow,
  after: Date,
): Date {
  const rangeStart = new Date(after);
  rangeStart.setUTCDate(rangeStart.getUTCDate() + 1);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCFullYear(rangeEnd.getUTCFullYear() + 2);
  const next = recurringExpenseDates(window, rangeStart, rangeEnd)[0];
  if (!next) throw new Error("La recurrencia no tiene una siguiente fecha.");
  return next;
}

export function recurrenceCycleKey(
  frequency: RecurringExpenseFrequency,
  date: Date,
): string {
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return frequency === "MONTHLY"
    ? month
    : `${month}-${date.getUTCDate() <= 15 ? "1" : "2"}`;
}

export function recurringExpenseDates(
  window: RecurrenceWindow,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  if (rangeEnd < rangeStart) return [];

  const dates: Date[] = [];
  const effectiveEnd = window.effectiveTo ?? rangeEnd;
  if (effectiveEnd < rangeStart || window.effectiveFrom > rangeEnd)
    return dates;

  if (window.frequency === "MONTHLY") {
    const anchorDate = window.anchorDate ?? window.effectiveFrom;
    let offset = 0;
    while (true) {
      const candidate = monthlyDate(anchorDate, offset);
      if (candidate > rangeEnd || candidate > effectiveEnd) break;
      if (candidate >= window.effectiveFrom && candidate >= rangeStart)
        dates.push(candidate);
      offset += 1;
    }
    return dates;
  }

  let candidate = window.anchorDate ?? window.effectiveFrom;
  while (candidate <= rangeEnd && candidate <= effectiveEnd) {
    if (candidate >= window.effectiveFrom && candidate >= rangeStart)
      dates.push(candidate);
    candidate = nextFortnightDate(candidate);
  }
  return dates;
}

export async function plannedRecurringExpensesForRange(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<PlannedRecurringExpense[]> {
  const versions = await prisma.payrollExpenseRecurrenceVersion.findMany({
    where: {
      effectiveFrom: { lte: rangeEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: rangeStart } }],
      recurrence: {
        OR: [{ active: true }, { endedAt: { gte: rangeStart } }],
      },
    },
    include: {
      recurrence: { select: { endedAt: true } },
      categoryRecord: { select: { id: true, name: true } },
    },
  });

  return versions.flatMap((version) => {
    if (version.frequency === "ONE_TIME") return [];
    const effectiveTo =
      version.effectiveTo && version.recurrence.endedAt
        ? version.effectiveTo < version.recurrence.endedAt
          ? version.effectiveTo
          : version.recurrence.endedAt
        : (version.effectiveTo ?? version.recurrence.endedAt);
    return recurringExpenseDates(
      {
        frequency: version.frequency,
        anchorDate: version.anchorDate,
        effectiveFrom: version.effectiveFrom,
        effectiveTo,
      },
      rangeStart,
      rangeEnd,
    ).map((date) => ({
      recurrenceId: version.recurrenceId,
      recurrenceVersionId: version.id,
      date,
      kind: version.kind,
      concept: version.concept,
      category: version.categoryRecord?.name ?? version.category,
      categoryId: version.categoryId,
      branchId: version.branchId,
      costCenter: version.costCenter,
      amount: version.amount,
      frequency: version.frequency as RecurringExpenseFrequency,
      notes: version.notes,
      createdById: version.createdById,
    }));
  });
}

export async function materializeRecurringExpenses(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<PlannedRecurringExpense[]> {
  const planned = await plannedRecurringExpensesForRange(rangeStart, rangeEnd);
  if (planned.length === 0) return planned;

  await prisma.payrollExpense.createMany({
    data: planned.map((expense) => ({
      date: expense.date,
      kind: expense.kind,
      concept: expense.concept,
      category: expense.category,
      categoryId: expense.categoryId,
      branchId: expense.branchId,
      costCenter: expense.costCenter,
      amount: expense.amount,
      frequency: expense.frequency,
      notes: expense.notes,
      recurrenceId: expense.recurrenceId,
      recurrenceVersionId: expense.recurrenceVersionId,
      generated: true,
      createdById: expense.createdById,
    })),
    skipDuplicates: true,
  });
  return planned;
}
