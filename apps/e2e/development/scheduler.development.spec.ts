import { test, expect } from "./helpers/read-only-test";
import { openAuthenticatedPage } from "./helpers/ui";
import {
  schedulerAgendaAppointmentsFixture,
  schedulerAgendaBlocksFixture,
} from "./fixtures/scheduler-agenda";

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

  test("renderiza DTOs controlados sin sustituir sesión ni permisos", async ({
    page,
  }, testInfo) => {
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
    await expect(page.getByText("María Camila Celis")).toBeVisible();
    await expect(page.getByText("Atendida").first()).toBeVisible();
    await expect(page.getByText("Llegó").first()).toBeVisible();
    await expect(
      page.getByText(/Facial premium, Masaje de seguimiento/),
    ).toBeVisible();
    await expect(page.getByText(/Mantenimiento de cabina/)).toBeVisible();

    await testInfo.attach("scheduler-agenda-rv1-1366x768", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });

  test("carga Reportes sin emitir escrituras", async ({ page }) => {
    await openAuthenticatedPage(page, "/reportes", "Reportes");
  });
});
