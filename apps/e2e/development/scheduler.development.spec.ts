import { test, expect } from "./helpers/read-only-test";
import { openAuthenticatedPage } from "./helpers/ui";
import {
  schedulerAgendaAppointmentsFixture,
  schedulerAgendaBlocksFixture,
  schedulerAgendaCatalogFixture,
} from "./fixtures/scheduler-agenda";
import { schedulerCustomerPageFixture } from "./fixtures/scheduler-clients";

test.describe("Scheduler autenticado en development", () => {
  test("carga Agenda desde el backend sin activar fixtures", async ({
    page,
  }) => {
    await openAuthenticatedPage(page, "/", "Agenda");
    await expect(
      page.getByText(/datos de demostración|modo mock/i),
    ).toHaveCount(0);
  });

  test("carga Clientes con el alcance de la sesión", async ({ page }) => {
    await openAuthenticatedPage(page, "/clientes", "Clientes");
  });

  test("renderiza el listado RV3 con identidad canónica y paginación", async ({
    page,
  }, testInfo) => {
    await page.route("**/api/scheduler/clients/search?**", async (route) => {
      const url = new URL(route.request().url());
      await route.fulfill({
        json: schedulerCustomerPageFixture(
          url.searchParams.get("branchId") ?? "missing-branch",
        ),
      });
    });
    await page.route(
      "**/api/scheduler/clients/field-definitions?**",
      async (route) => route.fulfill({ json: [] }),
    );

    await page.setViewportSize({ width: 1366, height: 768 });
    await openAuthenticatedPage(page, "/clientes", "Clientes");
    await page.getByLabel("Buscar cliente").fill("María");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.getByText("María Camila Celis")).toBeVisible();
    await expect(
      page.getByText("Sucursal autorizada · Keysar Cosmetics"),
    ).toBeVisible();
    await expect(page.getByText("1–1 de 1").first()).toBeVisible();

    await testInfo.attach("scheduler-clients-rv3-list-1366x768", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });

  test("renderiza DTOs controlados sin sustituir sesión ni permisos", async ({
    page,
  }, testInfo) => {
    await page.route("**/api/scheduler/operations/catalog", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: schedulerAgendaCatalogFixture(await response.json()),
      });
    });
    await page.route("**/api/scheduler/appointments?**", async (route) => {
      const url = new URL(route.request().url());
      await route.fulfill({
        json: schedulerAgendaAppointmentsFixture({
          branchId: url.searchParams.get("branchId") ?? "missing-branch",
          from: url.searchParams.get("from") ?? new Date().toISOString(),
        }),
      });
    });
    await page.route("**/api/scheduler/blocks?**", async (route) => {
      const url = new URL(route.request().url());
      await route.fulfill({
        json: schedulerAgendaBlocksFixture({
          branchId: url.searchParams.get("branchId") ?? "missing-branch",
          from: url.searchParams.get("from") ?? new Date().toISOString(),
        }),
      });
    });

    await page.setViewportSize({ width: 1366, height: 768 });
    await openAuthenticatedPage(page, "/", "Agenda");
    await expect(page.getByText("María Camila Celis").first()).toBeVisible();
    await expect(
      page.getByText(/Facial premium.*Masaje de seguimiento/).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Mantenimiento de cabina/).first(),
    ).toBeVisible();
    await testInfo.attach("scheduler-agenda-rv2-calendar-1366x768", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });

    await page
      .getByRole("button", { name: "Lista", exact: true })
      .first()
      .click();
    await expect(page.getByText("Atendido").first()).toBeVisible();
    await expect(page.getByText("Llegó").first()).toBeVisible();

    await testInfo.attach("scheduler-agenda-rv2-list-1366x768", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });

  test("carga Reportes sin emitir escrituras", async ({ page }) => {
    await openAuthenticatedPage(page, "/reportes", "Reportes");
  });
});
