import { beforeEach, describe, expect, it } from "vitest";
import {
  createAuthorizationToken,
  createTerminalSecret,
  fingerprintSecret,
  hashOpaqueToken,
  hashPosSecret,
  normalizePosAlias,
  normalizeTerminalCode,
  verifyPosSecret,
} from "./pos-security";

describe("seguridad POS", () => {
  beforeEach(() => {
    process.env["POS_PIN_PEPPER"] = "pepper-de-prueba-pos-con-mas-de-32-caracteres";
  });

  it("normaliza identidades sin conservar el PIN", () => {
    expect(normalizePosAlias("  Venta.Polanco ")).toBe("venta.polanco");
    expect(normalizeTerminalCode(" terminal-01 ")).toBe("TERMINAL-01");
    expect(fingerprintSecret("4826", "pin")).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprintSecret("4826", "pin")).not.toBe(
      fingerprintSecret("4826", "terminal"),
    );
  });

  it("genera secretos opacos y tokens de autorización no reversibles", () => {
    expect(createTerminalSecret().length).toBeGreaterThanOrEqual(43);
    const token = createAuthorizationToken();
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    expect(hashOpaqueToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOpaqueToken(token)).not.toContain(token);
  });

  it("almacena códigos únicamente como bcrypt", async () => {
    const hash = await hashPosSecret("4826");
    expect(hash).not.toContain("4826");
    await expect(verifyPosSecret("4826", hash)).resolves.toBe(true);
    await expect(verifyPosSecret("4827", hash)).resolves.toBe(false);
  });
});
