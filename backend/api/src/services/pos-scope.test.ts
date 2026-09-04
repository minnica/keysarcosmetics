import { describe, expect, it } from "vitest";
import { assertBranchAuthorized, resolveRequestedBranchIds } from "./pos-scope";

describe("alcance POS por sucursal", () => {
  it("materializa all_authorized como la unión exacta", () => {
    expect(
      resolveRequestedBranchIds({
        authorizedBranchIds: ["branch-a", "branch-b"],
      }),
    ).toEqual(["branch-a", "branch-b"]);
  });

  it("acepta únicamente subconjuntos autorizados", () => {
    expect(
      resolveRequestedBranchIds({
        authorizedBranchIds: ["branch-a", "branch-b"],
        requestedBranchIds: ["branch-b", "branch-b"],
      }),
    ).toEqual(["branch-b"]);
    expect(() =>
      resolveRequestedBranchIds({
        authorizedBranchIds: ["branch-a"],
        requestedBranchIds: ["branch-b"],
      }),
    ).toThrow("no autorizada");
  });

  it("rechaza IDs forzados en operaciones individuales", () => {
    expect(() => assertBranchAuthorized(["branch-a"], "branch-b")).toThrow(
      "no está autorizada",
    );
  });
});
