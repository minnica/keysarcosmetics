import { describe, expect, it, vi } from "vitest";
import { verifyPortalAccount } from "./portal-login";
const email = "operador@example.invalid",
  id = "cuenta-qa";
function issuer(changes: Record<string, unknown> = {}) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      success: true,
      data: {
        token: "token-exclusivo-del-emisor",
        usuario: {
          id,
          email,
          activo: true,
          canManagePayrollAccess: false,
          payrollScreenPermissions: ["payroll/bonos"],
          ...changes,
        },
      },
    }),
  );
}
describe("identidad de nómina para la cuenta autorizada", () => {
  it("acepta sólo la identidad vigente de nómina y devuelve un booleano", async () => {
    const request = issuer();
    await expect(
      verifyPortalAccount(email, "clave-qa", id, request),
    ).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith(
      "https://cosmetics-api.fly.dev/api/auth/login",
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        headers: expect.objectContaining({ "Cache-Control": "no-store" }),
      }),
    );
  });
  it.each([
    { id: "otra" },
    { email: "otra@example.invalid" },
    { activo: false },
    { payrollScreenPermissions: [] },
  ])("rechaza una identidad fuera del piloto", async (change) => {
    await expect(
      verifyPortalAccount(email, "clave-qa", id, issuer(change)),
    ).resolves.toBe(false);
  });
  it("rechaza si el servicio oficial no autentica", async () => {
    await expect(
      verifyPortalAccount(
        email,
        "clave-qa",
        id,
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response(null, { status: 401 })),
      ),
    ).resolves.toBe(false);
  });
});
