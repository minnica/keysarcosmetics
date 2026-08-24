import { describe, expect, it } from "vitest";
import {
  hasAnyPayrollScreenAccess,
  hasAnyPayrollScreenWriteAccess,
  isPayrollReadMethod,
} from "./access";

describe("Payroll read-only access policy", () => {
  it("classifies GET and HEAD as read operations", () => {
    expect(isPayrollReadMethod("GET")).toBe(true);
    expect(isPayrollReadMethod("HEAD")).toBe(true);
    expect(isPayrollReadMethod("POST")).toBe(false);
    expect(isPayrollReadMethod("PUT")).toBe(false);
    expect(isPayrollReadMethod("PATCH")).toBe(false);
    expect(isPayrollReadMethod("DELETE")).toBe(false);
  });

  it("allows viewing a screen without granting writes", () => {
    const access = {
      canManagePayrollAccess: false,
      payrollScreenPermissions: ["payroll/gastos" as const],
      payrollWritePermissions: [],
    };

    expect(hasAnyPayrollScreenAccess(access, ["payroll/gastos"])).toBe(true);
    expect(hasAnyPayrollScreenWriteAccess(access, ["payroll/gastos"])).toBe(
      false,
    );
  });

  it("allows writes only for explicitly editable screens", () => {
    const access = {
      canManagePayrollAccess: false,
      payrollScreenPermissions: [
        "payroll/gastos" as const,
        "payroll/movimientos" as const,
      ],
      payrollWritePermissions: ["payroll/movimientos" as const],
    };

    expect(hasAnyPayrollScreenWriteAccess(access, ["payroll/gastos"])).toBe(
      false,
    );
    expect(
      hasAnyPayrollScreenWriteAccess(access, ["payroll/movimientos"]),
    ).toBe(true);
  });

  it("keeps access managers fully authorized", () => {
    const access = {
      canManagePayrollAccess: true,
      payrollScreenPermissions: [],
      payrollWritePermissions: [],
    };

    expect(hasAnyPayrollScreenAccess(access, ["payroll/resumen"])).toBe(true);
    expect(hasAnyPayrollScreenWriteAccess(access, ["payroll/resumen"])).toBe(
      true,
    );
  });
});
