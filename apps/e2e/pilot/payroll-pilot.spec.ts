import { expect, test } from "playwright/test";
test("el operador aprueba un bono, lo conserva al recargar y concilia contra la referencia", async ({
  page,
}) => {
  await page.goto("/conciliacion");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Usuario del piloto").fill("nomina");
  await page
    .getByLabel("Clave del piloto")
    .fill("clave-exclusiva-de-la-fixture");
  const login = page.waitForResponse((r) =>
    r.url().endsWith("/api/piloto/session"),
  );
  await page.getByRole("button", { name: "Ingresar al piloto" }).click();
  expect((await login).status()).toBe(200);
  await expect(
    page.getByRole("link", { name: "Conciliar importes" }),
  ).toBeVisible();
  await page.goto("/operacion-bonos-multas");
  const row = page.getByRole("row").filter({ hasText: "BONO AISLAMIENTO QA" });
  await expect(row).toContainText("PERSONA SINTÉTICA QA");
  const result = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/piloto/cut") && r.request().method() === "PUT",
  );
  await row
    .getByRole("button", { name: "Aprobar BONO AISLAMIENTO QA" })
    .click();
  expect((await result).status()).toBe(200);
  await page.reload();
  await expect(row).toContainText(/APROBAD[OA]/i);
  await page.getByRole("link", { name: "Conciliar importes" }).click();
  await page.getByLabel("Quincena").selectOption("2026-11-16");
  const person = page
    .getByRole("row")
    .filter({ hasText: "PERSONA SINTÉTICA QA" });
  await expect(person).toContainText("300.00");
  await page.getByLabel("Quincena").selectOption("2026-11-01");
  await expect(person).toContainText("CONFIRMED");
});
