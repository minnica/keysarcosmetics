import { test, expect } from "./helpers/read-only-test";
import {
  openAuthenticatedPage,
  selectDifferentCalendarDay,
} from "./helpers/ui";

test.describe("Payroll autenticado en development", () => {
  test("carga el resumen y alterna entre vista quincenal y mensual", async ({
    page,
  }) => {
    await openAuthenticatedPage(page, "/", /Corridas de nómina/i);
    await page.getByRole("button", { name: "Mensual" }).click();
    await expect(page.getByRole("button", { name: "Mensual" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByLabel("Mes consolidado").click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("abre el selector de quincena del resumen", async ({ page }) => {
    await openAuthenticatedPage(page, "/", /Corridas de nómina/i);
    const fortnight = page.getByRole("combobox", { name: "Quincena" }).first();
    await fortnight.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("carga movimientos e interactúa con su rango de fechas", async ({
    page,
  }) => {
    await openAuthenticatedPage(page, "/movimientos", /Movimientos de nómina/i);
    await selectDifferentCalendarDay(page, page.locator("#date-range-from"));
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Modo solo lectura")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Nuevo movimiento/i }),
    ).toHaveCount(0);
  });

  test("carga esquemas y sus tablas sin habilitar mutaciones", async ({
    page,
  }) => {
    await openAuthenticatedPage(page, "/esquemas", /Esquemas de comisión/i);
    await expect(page.getByRole("table")).toHaveCount(2);
    await expect(page.getByText("Modo solo lectura")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Asignar esquema/i }),
    ).toHaveCount(0);
  });

  test("carga recibos y alterna sus vistas", async ({ page }) => {
    await openAuthenticatedPage(page, "/recibos", "Recibos");
    await page.getByRole("tab", { name: "Emitidos" }).click();
    await expect(page.getByRole("tab", { name: "Emitidos" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("combobox", { name: "Quincena" }),
    ).toBeVisible();
  });

  test("carga el desglose por sucursal y abre la base de comisión", async ({
    page,
  }) => {
    await openAuthenticatedPage(
      page,
      "/reportes/desglose-sucursal",
      /Reporte por sucursal/i,
    );
    await page.getByRole("combobox", { name: "Base de comisión" }).click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("table").first()).toBeVisible();
  });

  test("navega desde el sidebar móvil hacia movimientos", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthenticatedPage(page, "/", /Corridas de nómina/i);
    await page.getByRole("button", { name: "Toggle Sidebar" }).first().click();
    await page.getByRole("link", { name: "Movimientos" }).click();
    await expect(page).toHaveURL(/\/movimientos$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Movimientos de nómina/i }),
    ).toBeVisible();
  });

  test("cierra la sesión y vuelve al login", async ({ page }) => {
    await openAuthenticatedPage(page, "/", /Corridas de nómina/i);
    await page.getByRole("button", { name: /Cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator("#email")).toBeVisible();
  });
});
