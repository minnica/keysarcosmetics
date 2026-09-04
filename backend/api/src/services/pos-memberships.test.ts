import { describe, expect, it } from "vitest";
import {
  PosMembershipError,
  allocateMembershipUnitCents,
  membershipListWhere,
  membershipScopeWhere,
  type PosMembershipContext,
} from "./pos-memberships";

const sellerContext: PosMembershipContext = {
  credentialId: "credential-1",
  terminalId: "terminal-1",
  sessionId: "session-1",
  employeeId: "seller-1",
  isMaster: false,
  authorizedBranchIds: ["branch-1", "branch-2"],
  historicalBranchIds: ["branch-1", "branch-2", "branch-inactive"],
};

describe("membresías POS", () => {
  it("emite una unidad por tarjetón y conserva exactamente el importe", () => {
    expect(allocateMembershipUnitCents(10_01, 2)).toEqual([501, 500]);
    expect(
      allocateMembershipUnitCents(10_01, 2).reduce(
        (total, amount) => total + amount,
        0,
      ),
    ).toBe(10_01);
    expect(() => allocateMembershipUnitCents(10_00, 1.5)).toThrow(
      PosMembershipError,
    );
  });

  it("limita la cartera del vendedor a sus sucursales autorizadas", () => {
    expect(membershipScopeWhere(sellerContext, ["branch-2"])).toEqual({
      purchaseBranchId: { in: ["branch-2"] },
      currentSellerId: "seller-1",
    });
    expect(() => membershipScopeWhere(sellerContext, ["branch-3"])).toThrow();
  });

  it("obliga al master a declarar el alcance de sucursales", () => {
    const masterContext: PosMembershipContext = {
      ...sellerContext,
      employeeId: null,
      isMaster: true,
    };
    expect(() => membershipScopeWhere(masterContext)).toThrow(
      "debe indicar explícitamente las sucursales",
    );
    expect(membershipScopeWhere(masterContext, ["branch-1"])).toEqual({
      purchaseBranchId: { in: ["branch-1"] },
    });
  });

  it("filtra seguimientos activos sin ampliar cartera ni alcance", () => {
    expect(
      membershipListWhere({
        context: sellerContext,
        branchIds: ["branch-1"],
        followUpOnly: true,
      }),
    ).toEqual({
      purchaseBranchId: { in: ["branch-1"] },
      currentSellerId: "seller-1",
      status: "ACTIVE",
    });
  });

  it("consulta por IDs canónicos y admite históricos explícitos sólo en listados", () => {
    expect(
      membershipListWhere({
        context: sellerContext,
        branchIds: ["branch-inactive"],
        customerId: "customer-1",
        purchaseTicketId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toEqual({
      purchaseBranchId: { in: ["branch-inactive"] },
      currentSellerId: "seller-1",
      customerId: "customer-1",
      ticketId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(() =>
      membershipScopeWhere(sellerContext, ["branch-inactive"]),
    ).toThrow("no autorizada");
  });
});
