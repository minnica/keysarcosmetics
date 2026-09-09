import { describe, expect, it } from "vitest";
import {
  isValidIanaTimezone,
  normalizeSchedulerCatalogName,
  parseSchedulerEffectiveRange,
  schedulerAvailabilityOwner,
  schedulerAvailabilityOwnerFields,
  uniqueSchedulerIds,
  validateSchedulerAvailabilityRules,
} from "./scheduler-operations";

describe("Scheduler operational catalog rules", () => {
  it("normalizes names deterministically without merging arbitrary entities", () => {
    expect(normalizeSchedulerCatalogName("  Cabína Láser #1  ")).toBe(
      "cabina laser 1",
    );
  });

  it("accepts IANA timezones and rejects arbitrary labels", () => {
    expect(isValidIanaTimezone("America/Mexico_City")).toBe(true);
    expect(isValidIanaTimezone("hora-centro")).toBe(false);
  });

  it("validates effective ranges", () => {
    expect(
      parseSchedulerEffectiveRange({
        effectiveFrom: "2026-09-04T00:00:00.000Z",
        effectiveTo: "2026-10-04T00:00:00.000Z",
      }).effectiveTo?.toISOString(),
    ).toBe("2026-10-04T00:00:00.000Z");
    expect(() =>
      parseSchedulerEffectiveRange({
        effectiveFrom: "2026-10-04T00:00:00.000Z",
        effectiveTo: "2026-09-04T00:00:00.000Z",
      }),
    ).toThrow("posterior");
  });

  it("requires breaks to be contained and rejects overlapping work periods", () => {
    expect(() =>
      validateSchedulerAvailabilityRules([
        {
          kind: "WORKING",
          weekday: "MONDAY",
          startMinute: 540,
          endMinute: 1080,
        },
        { kind: "BREAK", weekday: "MONDAY", startMinute: 780, endMinute: 840 },
      ]),
    ).not.toThrow();
    expect(() =>
      validateSchedulerAvailabilityRules([
        {
          kind: "WORKING",
          weekday: "MONDAY",
          startMinute: 540,
          endMinute: 720,
        },
        {
          kind: "WORKING",
          weekday: "MONDAY",
          startMinute: 660,
          endMinute: 780,
        },
      ]),
    ).toThrow("traslaparse");
    expect(() =>
      validateSchedulerAvailabilityRules([
        { kind: "BREAK", weekday: "MONDAY", startMinute: 780, endMinute: 840 },
      ]),
    ).toThrow("dentro");
  });

  it("maps availability owners without polymorphic ambiguity", () => {
    expect(schedulerAvailabilityOwnerFields("BRANCH", "branch-1")).toEqual({
      professionalProfileId: null,
      resourceId: null,
    });
    expect(
      schedulerAvailabilityOwner({
        branchProfileId: "branch-profile-1",
        professionalProfileId: null,
        resourceId: "resource-1",
      }),
    ).toEqual({ ownerType: "RESOURCE", ownerId: "resource-1" });
    expect(uniqueSchedulerIds(["one", "one", "two"])).toEqual(["one", "two"]);
  });
});
