import { expect, test } from "../development/helpers/read-only-test";
import { openAuthenticatedPage } from "../development/helpers/ui";
import { readSessionAccess } from "./helpers/access";

test.describe("Smoke autenticado de Payroll en producción", () => {
  test("carga esquemas con permisos mínimos", async ({ page, request }) => {
    await openAuthenticatedPage(page, "/esquemas", /Esquemas de comisión/i);
    const access = await readSessionAccess(page, request);
    expect(access.rol).not.toBe("SUPER_ADMIN");
    expect(access.canManageAccess).toBe(false);
    expect(access.canManagePayrollAccess).toBe(false);
    expect(access.screenPermissions).toEqual([]);
    expect(access.payrollScreenPermissions).toEqual(["payroll/esquemas"]);
    expect(access.payrollWritePermissions).toEqual([]);
    await expect(page.getByText("Modo solo lectura")).toBeVisible();
  });

  test("carga ambos listados sin controles de escritura", async ({ page }) => {
    await openAuthenticatedPage(page, "/esquemas", /Esquemas de comisión/i);
    await expect(page.getByRole("table")).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: /Asignar esquema/i }),
    ).toHaveCount(0);
  });

  test("cierra la sesión de monitoreo", async ({ page }) => {
    await openAuthenticatedPage(page, "/esquemas", /Esquemas de comisión/i);
    await page.getByRole("button", { name: /Cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("#email")).toBeVisible();
  });
});
