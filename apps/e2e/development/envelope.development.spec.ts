import { test, expect } from "./helpers/read-only-test";
import {
  openAuthenticatedPage,
  selectDifferentCalendarDay,
} from "./helpers/ui";

test.describe("Envelope autenticado en development", () => {
  test("carga el dashboard e interactúa con su fecha de referencia", async ({
    page,
  }) => {
    await openAuthenticatedPage(page, "/", "Dashboard");
    await selectDifferentCalendarDay(page, page.locator("#fecha-dashboard"));
  });

  test("carga ventas y filtra los registros guardados por fecha", async ({
    page,
  }) => {
    await openAuthenticatedPage(page, "/ventas", /Registro de ventas/i);
    await selectDifferentCalendarDay(page, page.locator("#date-range-from"));
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("abre el buscador de empleados de la captura sin continuar", async ({
    page,
  }) => {
    await openAuthenticatedPage(page, "/ventas", /Registro de ventas/i);
    await page.locator("#vendedor").click();
    await expect(page.getByPlaceholder(/Buscar empleado/i)).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("carga citas y usa el calendario del listado", async ({ page }) => {
    await openAuthenticatedPage(page, "/citas", /Registro de citas/i);
    await selectDifferentCalendarDay(page, page.locator("#date-range-from"));
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("carga el reporte total general y cambia su fecha inicial", async ({
    page,
  }) => {
    await openAuthenticatedPage(
      page,
      "/reportes/total-general",
      /Total general de ventas/i,
    );
    await selectDifferentCalendarDay(page, page.locator("#date-range-from"));
  });

  test("abre y cancela el diálogo móvil de captura de cita", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthenticatedPage(page, "/citas", /Registro de citas/i);
    await page.getByRole("button", { name: /Guardar cita/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("navega desde el sidebar móvil hacia ventas", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthenticatedPage(page, "/", "Dashboard");
    await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
    await page.getByRole("button", { name: /Formularios/i }).click();
    await page.getByRole("link", { name: "Ventas" }).click();
    await expect(page).toHaveURL(/\/ventas$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Registro de ventas/i }),
    ).toBeVisible();
  });

  test("cierra la sesión y vuelve al login", async ({ page }) => {
    await openAuthenticatedPage(page, "/", "Dashboard");
    await page.getByRole("button", { name: /Cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator("#email")).toBeVisible();
  });
});
