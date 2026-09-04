import { describe, expect, it } from "vitest";
import type { ResolvedSchedulerAccess } from "./scheduler-access";
import {
  assertMergeableExternalCustomerIds,
  normalizeSchedulerCustomerEmail,
  normalizeSchedulerCustomerFieldKey,
  normalizeSchedulerCustomerName,
  normalizeSchedulerCustomerPhone,
  schedulerCustomerScopeWhere,
  validateSchedulerCustomerFieldValue,
} from "./scheduler-customers";

const access: ResolvedSchedulerAccess = {
  userId: "user-1",
  name: "User",
  email: "user@example.com",
  role: "GERENTE",
  employeeId: "employee-1",
  positionId: "position-1",
  positionName: "Gerencia",
  canManageAccess: false,
  selfProfessionalOnly: false,
  professionalEmployeeId: "employee-1",
  permissions: [],
  authorizedBranches: [{ id: "branch-1", name: "Sucursal", active: true }],
  branchScope: "ASSIGNED",
  secondaryAuthorizationConfigured: true,
};

describe("Scheduler customer identity rules", () => {
  it("normalizes identity fields deterministically", () => {
    expect(normalizeSchedulerCustomerName("  María   López ")).toBe(
      "maria lopez",
    );
    expect(normalizeSchedulerCustomerPhone("+52 (55) 1234-5678")).toBe(
      "525512345678",
    );
    expect(normalizeSchedulerCustomerPhone("---")).toBeNull();
    expect(normalizeSchedulerCustomerEmail(" TEST@Example.COM ")).toBe(
      "test@example.com",
    );
    expect(normalizeSchedulerCustomerFieldKey("Tipo de piel")).toBe(
      "tipo_de_piel",
    );
  });

  it("never treats a name as a unique identity", () => {
    expect(normalizeSchedulerCustomerName("Ana Pérez")).toBe(
      normalizeSchedulerCustomerName("ANA PEREZ"),
    );
    expect(normalizeSchedulerCustomerPhone(null)).toBeNull();
  });

  it("materializes branch scope and closes access outside it", () => {
    expect(schedulerCustomerScopeWhere(access, "branch-2")).toEqual({
      id: "__no_authorized_customer__",
    });
    expect(schedulerCustomerScopeWhere(access, "branch-1")).toHaveProperty(
      "OR",
    );
    expect(
      schedulerCustomerScopeWhere({ ...access, selfProfessionalOnly: true }),
    ).toMatchObject({ OR: expect.any(Array) });
  });

  it("validates custom field values by their versioned definition", () => {
    expect(validateSchedulerCustomerFieldValue("TEXT", "sensible", null)).toBe(
      true,
    );
    expect(validateSchedulerCustomerFieldValue("NUMBER", 12.5, null)).toBe(
      true,
    );
    expect(validateSchedulerCustomerFieldValue("BOOLEAN", false, null)).toBe(
      true,
    );
    expect(
      validateSchedulerCustomerFieldValue("DATE", "2026-09-04", null),
    ).toBe(true);
    expect(
      validateSchedulerCustomerFieldValue("SELECT", "seca", ["seca", "mixta"]),
    ).toBe(true);
    expect(
      validateSchedulerCustomerFieldValue("SELECT", "otra", ["seca", "mixta"]),
    ).toBe(false);
  });

  it("blocks merges across distinct external identities", () => {
    expect(() => assertMergeableExternalCustomerIds("ext-1", "ext-2")).toThrow(
      "identidades externas distintas",
    );
    expect(() =>
      assertMergeableExternalCustomerIds("ext-1", null),
    ).not.toThrow();
  });
});
