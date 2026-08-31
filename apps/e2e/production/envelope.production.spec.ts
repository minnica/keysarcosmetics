import { expect, test } from "../development/helpers/read-only-test";
import { openAuthenticatedPage } from "../development/helpers/ui";
import { readSessionAccess } from "./helpers/access";

test.describe("Smoke autenticado de Envelope en producción", () => {
  test("carga el dashboard con permisos mínimos", async ({ page, request }) => {
    await openAuthenticatedPage(page, "/", "Dashboard");
    const access = await readSessionAccess(page, request);
    expect(access.rol).not.toBe("SUPER_ADMIN");
    expect(access.canManageAccess).toBe(false);
    expect(access.selfDataOnly).toBe(true);
    expect([...access.screenPermissions].sort()).toEqual([
      "dashboard",
      "reportes/total-general",
    ]);
    expect(access.payrollScreenPermissions).toEqual([]);
    expect(access.payrollWritePermissions).toEqual([]);
  });

  test("carga el reporte total general sin mutar datos", async ({ page }) => {
    await openAuthenticatedPage(
      page,
      "/reportes/total-general",
      /Total general de ventas/i,
    );
    await expect(
      page
        .getByRole("table")
        .or(page.getByText(/Sin ventas en el período seleccionado/i)),
    ).toBeVisible();
  });

  test("cierra la sesión de monitoreo", async ({ page }) => {
    await openAuthenticatedPage(page, "/", "Dashboard");
    await page.getByRole("button", { name: /Cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator("#email")).toBeVisible();
  });
});
