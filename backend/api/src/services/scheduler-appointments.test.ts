import { describe, expect, it } from "vitest";
import {
  assertSchedulerStatusTransition,
  resolveSchedulerDailyWindows,
  schedulerIntervalsOverlap,
  schedulerLocalDateKey,
  schedulerLocalMinuteToUtc,
  schedulerMembershipAllowsService,
  schedulerWindowContains,
  stableSchedulerRequestHash,
} from "./scheduler-appointments";

describe("Scheduler appointment engine", () => {
  it("keeps local dates and minutes stable in the configured IANA timezone", () => {
    const instant = schedulerLocalMinuteToUtc(
      "2026-09-04",
      9 * 60 + 30,
      "America/Mexico_City",
    );
    expect(instant.toISOString()).toBe("2026-09-04T15:30:00.000Z");
    expect(schedulerLocalDateKey(instant, "America/Mexico_City")).toBe(
      "2026-09-04",
    );
    expect(() =>
      schedulerLocalMinuteToUtc(
        "2026-03-08",
        2 * 60 + 30,
        "America/New_York",
      ),
    ).toThrow("no existe");
  });

  it("resolves working hours, breaks and date exceptions deterministically", () => {
    const windows = resolveSchedulerDailyWindows({
      date: "2026-09-07",
      rules: [
        {
          kind: "WORKING",
          weekday: "MONDAY",
          startMinute: 9 * 60,
          endMinute: 18 * 60,
        },
        {
          kind: "BREAK",
          weekday: "MONDAY",
          startMinute: 13 * 60,
          endMinute: 14 * 60,
        },
      ],
      exceptions: [
        {
          kind: "UNAVAILABLE",
          date: "2026-09-07",
          startMinute: 16 * 60,
          endMinute: 17 * 60,
        },
      ],
    });
    expect(windows).toEqual([
      { startMinute: 540, endMinute: 780 },
      { startMinute: 840, endMinute: 960 },
      { startMinute: 1020, endMinute: 1080 },
    ]);
    expect(schedulerWindowContains(windows, 600, 660)).toBe(true);
    expect(schedulerWindowContains(windows, 780, 840)).toBe(false);
  });

  it("uses half-open intervals so adjacent appointments do not collide", () => {
    expect(
      schedulerIntervalsOverlap(
        new Date("2026-09-04T15:00:00Z"),
        new Date("2026-09-04T16:00:00Z"),
        new Date("2026-09-04T16:00:00Z"),
        new Date("2026-09-04T17:00:00Z"),
      ),
    ).toBe(false);
    expect(
      schedulerIntervalsOverlap(
        new Date("2026-09-04T15:00:00Z"),
        new Date("2026-09-04T16:01:00Z"),
        new Date("2026-09-04T16:00:00Z"),
        new Date("2026-09-04T17:00:00Z"),
      ),
    ).toBe(true);
  });

  it("enforces forward-only status transitions", () => {
    expect(() =>
      assertSchedulerStatusTransition("RESERVED", "CONFIRMED"),
    ).not.toThrow();
    expect(() =>
      assertSchedulerStatusTransition("ATTENDED", "RESERVED"),
    ).toThrow("No se puede cambiar");
  });

  it("scopes membership conditions to configured services", () => {
    expect(
      schedulerMembershipAllowsService(
        { schedulerServiceProfileIds: ["service-1"] },
        "service-1",
        "item-1",
      ),
    ).toBe(true);
    expect(
      schedulerMembershipAllowsService(
        { serviceItemIds: ["item-2"] },
        "service-1",
        "item-1",
      ),
    ).toBe(false);
    expect(schedulerMembershipAllowsService(null, "service-1", "item-1")).toBe(
      true,
    );
  });

  it("hashes equivalent request objects independently of key order", () => {
    expect(stableSchedulerRequestHash({ branchId: "b", startsAt: "s" })).toBe(
      stableSchedulerRequestHash({ startsAt: "s", branchId: "b" }),
    );
  });
});
