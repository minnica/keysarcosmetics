import { afterEach, describe, expect, it } from "vitest";
import type { ResolvedSchedulerAccess } from "./scheduler-access";
import {
  hasSchedulerBranchAccess,
  hasSchedulerCapability,
  isSchedulerMockModeEnabled,
  schedulerAuthorizationRequirements,
  schedulerAuthorizationTokenHash,
} from "./scheduler-access";

const originalNodeEnv = process.env["NODE_ENV"];
const originalMockFlag = process.env["SCHEDULER_ALLOW_MOCKS"];

afterEach(() => {
  process.env["NODE_ENV"] = originalNodeEnv;
  if (originalMockFlag === undefined)
    delete process.env["SCHEDULER_ALLOW_MOCKS"];
  else process.env["SCHEDULER_ALLOW_MOCKS"] = originalMockFlag;
});

function accessFixture(): ResolvedSchedulerAccess {
  return {
    userId: "user-1",
    name: "Usuario",
    email: "user@example.com",
    role: "GERENTE",
    employeeId: "employee-1",
    positionId: "position-1",
    positionName: "Gerencia",
    canManageAccess: false,
    selfProfessionalOnly: true,
    professionalEmployeeId: "employee-1",
    permissions: [
      {
        screenKey: "scheduler/agenda",
        capabilities: ["READ", "WRITE"],
      },
    ],
    authorizedBranches: [{ id: "branch-1", name: "Sucursal 1", active: true }],
    branchScope: "ASSIGNED",
    secondaryAuthorizationConfigured: true,
  };
}

describe("Scheduler access boundary", () => {
  it("separates capabilities and materializes branch membership", () => {
    const access = accessFixture();
    expect(hasSchedulerCapability(access, "scheduler/agenda", "READ")).toBe(
      true,
    );
    expect(
      hasSchedulerCapability(access, "scheduler/agenda", "EXCEPTION"),
    ).toBe(false);
    expect(hasSchedulerCapability(access, "scheduler/clients", "READ")).toBe(
      false,
    );
    expect(hasSchedulerBranchAccess(access, "branch-1")).toBe(true);
    expect(hasSchedulerBranchAccess(access, "branch-2")).toBe(false);
  });

  it("binds each secondary purpose to a fixed screen and capability", () => {
    expect(schedulerAuthorizationRequirements.AVAILABILITY_OVERRIDE).toEqual({
      screenKey: "scheduler/agenda",
      capability: "EXCEPTION",
      branchRequired: true,
    });
    expect(schedulerAuthorizationRequirements.SENSITIVE_EXPORT).toEqual({
      screenKey: "scheduler/clients",
      capability: "EXPORT",
    });
  });

  it("stores only a deterministic SHA-256 token digest", () => {
    const token = "temporary-opaque-token";
    const digest = schedulerAuthorizationTokenHash(token);
    expect(digest).toHaveLength(64);
    expect(digest).not.toContain(token);
    expect(schedulerAuthorizationTokenHash(token)).toBe(digest);
  });

  it("enables mocks only with the exact flag in development", () => {
    process.env["NODE_ENV"] = "development";
    process.env["SCHEDULER_ALLOW_MOCKS"] = "true";
    expect(isSchedulerMockModeEnabled()).toBe(true);

    process.env["NODE_ENV"] = "production";
    expect(isSchedulerMockModeEnabled()).toBe(false);

    process.env["NODE_ENV"] = "development";
    process.env["SCHEDULER_ALLOW_MOCKS"] = "TRUE";
    expect(isSchedulerMockModeEnabled()).toBe(false);
  });
});
