import { describe, expect, it } from "vitest";
import {
  assertSchedulerSettingHasNoSecrets,
  mergeSchedulerSettingDocuments,
  schedulerCommissionIdentityKey,
  schedulerSettingScopeFields,
  validateSchedulerClassSchedules,
  validateSchedulerCommissionPolicy,
} from "./scheduler-administration";

describe("Scheduler administration rules", () => {
  it("builds stable commission identities without polymorphic ambiguity", () => {
    expect(
      schedulerCommissionIdentityKey({
        commerceId: "commerce-1",
        targetType: "PROFESSIONAL",
        targetId: "professional-1",
      }),
    ).toBe("commerce-1:PROFESSIONAL:professional-1");
    expect(() =>
      schedulerCommissionIdentityKey({
        commerceId: "commerce-1",
        targetType: "DEFAULT",
        targetId: "unexpected",
      }),
    ).toThrow("no acepta objetivo");
  });

  it("validates combined fixed, percentage and continuous tier rules", () => {
    expect(() =>
      validateSchedulerCommissionPolicy({
        commerceId: "commerce-1",
        targetType: "PROFESSIONAL",
        targetId: "professional-1",
        period: "MONTH",
        active: true,
        rules: [
          { mode: "APPOINTMENT", amount: "100.00" },
          { mode: "ATTENDED_APPOINTMENT", amount: "150.00" },
          { mode: "SALES_PERCENTAGE", percentage: "3.5" },
          {
            mode: "BRANCH_SALES_TIER",
            tiers: [
              { fromAmount: "0", toAmount: "50000", percentage: "3" },
              { fromAmount: "50000", toAmount: null, percentage: "5" },
            ],
          },
        ],
      }),
    ).not.toThrow();
    expect(() =>
      validateSchedulerCommissionPolicy({
        commerceId: "commerce-1",
        targetType: "DEFAULT",
        period: "MONTH",
        active: true,
        rules: [
          {
            mode: "BRANCH_SALES_TIER",
            tiers: [{ fromAmount: "1", toAmount: null, percentage: "101" }],
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects overlapping class schedules for the same professional", () => {
    expect(() =>
      validateSchedulerClassSchedules({
        schedules: [
          {
            branchProfileId: "branch-1",
            professionalProfileId: "professional-1",
            weekday: "MONDAY",
            startMinute: 600,
            endMinute: 660,
            capacity: 5,
          },
          {
            branchProfileId: "branch-1",
            professionalProfileId: "professional-1",
            weekday: "MONDAY",
            startMinute: 630,
            endMinute: 690,
            capacity: 5,
          },
        ],
      }),
    ).toThrow("traslapadas");
  });

  it("deep-merges settings in commerce, branch and user order", () => {
    expect(
      mergeSchedulerSettingDocuments(
        { booking: { minNotice: 60, online: true }, labels: ["base"] },
        { booking: { minNotice: 120 } },
        { labels: ["mine"] },
      ),
    ).toEqual({ booking: { minNotice: 120, online: true }, labels: ["mine"] });
  });

  it("rejects provider secrets at any nesting level", () => {
    expect(() =>
      assertSchedulerSettingHasNoSecrets({
        providers: [[{ apiToken: "must-not-be-stored" }]],
      }),
    ).toThrow("infraestructura");
    expect(() =>
      assertSchedulerSettingHasNoSecrets({
        provider: { publicCheckoutUrl: "https://example.test/pay" },
      }),
    ).not.toThrow();
  });

  it("materializes exactly one configuration scope", () => {
    expect(
      schedulerSettingScopeFields({
        scope: "BRANCH",
        commerceId: "commerce-1",
        branchProfileId: "branch-1",
        userId: "user-1",
      }),
    ).toEqual({
      scopeReferenceId: "branch-1",
      commerceId: null,
      branchProfileId: "branch-1",
      userId: null,
    });
    expect(
      schedulerSettingScopeFields({
        scope: "USER",
        commerceId: "commerce-1",
        userId: "user-1",
      }),
    ).toEqual({
      scopeReferenceId: "commerce-1:user-1",
      commerceId: "commerce-1",
      branchProfileId: null,
      userId: "user-1",
    });
  });
});
