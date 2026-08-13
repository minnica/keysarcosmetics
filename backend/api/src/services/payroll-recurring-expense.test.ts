import { describe, expect, it } from "vitest";
import {
  nextRecurringExpenseDate,
  nextRecurringExpenseOccurrence,
  recurrenceCycleKey,
  recurringExpenseDates,
} from "./payroll-recurring-expense";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);

describe("recurring payroll expenses", () => {
  it("genera una ocurrencia mensual y ajusta el día al fin de mes", () => {
    const dates = recurringExpenseDates(
      {
        frequency: "MONTHLY",
        effectiveFrom: date("2026-01-31"),
        effectiveTo: null,
      },
      date("2026-01-01"),
      date("2026-04-30"),
    );

    expect(dates.map(iso)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("genera una ocurrencia por quincena desde la fecha de vigencia", () => {
    const dates = recurringExpenseDates(
      {
        frequency: "BIWEEKLY",
        effectiveFrom: date("2026-08-08"),
        effectiveTo: date("2026-09-15"),
      },
      date("2026-08-01"),
      date("2026-09-30"),
    );

    expect(dates.map(iso)).toEqual(["2026-08-08", "2026-08-16", "2026-09-01"]);
  });

  it("respeta la vigencia de una versión y propone la siguiente aplicación", () => {
    const dates = recurringExpenseDates(
      {
        frequency: "MONTHLY",
        effectiveFrom: date("2026-08-05"),
        effectiveTo: date("2026-09-04"),
      },
      date("2026-08-01"),
      date("2026-10-31"),
    );

    expect(dates.map(iso)).toEqual(["2026-08-05"]);
    expect(iso(nextRecurringExpenseDate("MONTHLY", date("2026-08-05")))).toBe(
      "2026-09-05",
    );
    expect(
      iso(
        nextRecurringExpenseOccurrence(
          {
            frequency: "MONTHLY",
            anchorDate: date("2026-01-31"),
            effectiveFrom: date("2026-01-31"),
            effectiveTo: null,
          },
          date("2026-02-28"),
        ),
      ),
    ).toBe("2026-03-31");

    const versionedDates = recurringExpenseDates(
      {
        frequency: "MONTHLY",
        anchorDate: date("2026-01-31"),
        effectiveFrom: date("2026-02-28"),
        effectiveTo: null,
      },
      date("2026-02-01"),
      date("2026-04-30"),
    );
    expect(versionedDates.map(iso)).toEqual([
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
    expect(recurrenceCycleKey("BIWEEKLY", date("2026-08-16"))).toBe(
      "2026-08-2",
    );
  });
});
