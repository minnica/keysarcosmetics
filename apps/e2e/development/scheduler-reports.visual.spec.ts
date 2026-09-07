import { expect, test } from "./helpers/read-only-test";
import { openAuthenticatedPage } from "./helpers/ui";
import {
  schedulerReportKeys,
  schedulerReportRv7Fixture,
  type SchedulerReportKey,
} from "./fixtures/scheduler-reports";

test.describe("Scheduler RV7 — evidencia visual de reportes", () => {
  test.skip(
    process.env["E2E_SCHEDULER_REPORTS_VISUAL"] !== "true",
    "Requiere una cuenta E2E con lectura de Reportes.",
  );

  test.beforeEach(async ({ page }) => {
    await page.route(
      /\/api\/scheduler\/(reports|exports)\/([^?]+)/,
      (route) => {
        const key = route
          .request()
          .url()
          .match(/\/(?:reports|exports)\/([^?]+)/)?.[1] as
          | SchedulerReportKey
          | undefined;
        if (!key || !schedulerReportKeys.includes(key)) return route.continue();
        return route.fulfill({
          json: {
            success: true,
            message: "Fixture visual RV7",
            data: schedulerReportRv7Fixture(key),
          },
        });
      },
    );
  });

  test("renderiza resumen, reservas, ventas y desgloses profundos", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    const routes = [
      ["/reportes", "Resumen de operación", "summary"],
      ["/reportes/reservas", "Reporte de reservas", "reservations"],
      ["/reportes/ventas", "Ventas y pagos", "sales"],
      ["/reportes/reservas/locales", "Reservas por local", "locations"],
      ["/reportes/reservas/servicios", "Servicios reservados", "services"],
    ] as const;
    for (const [path, heading, attachment] of routes) {
      await openAuthenticatedPage(page, path, heading);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await testInfo.attach(`scheduler-rv7-${attachment}-1366x768`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    }
  });

  test("confina el historial en móvil", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthenticatedPage(
      page,
      "/reportes/reservas/historial",
      "Historial de reservas",
    );
    expect(
      await page.evaluate(
        () => document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).toBe(true);
    await testInfo.attach("scheduler-rv7-history-390x844", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });
});
