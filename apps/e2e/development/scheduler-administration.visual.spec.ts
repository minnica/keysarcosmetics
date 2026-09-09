import { test, expect } from "./helpers/read-only-test";
import { openAuthenticatedPage } from "./helpers/ui";
import {
  schedulerAdministrationCandidatesFixture,
  schedulerAdministrationCatalogRv4Fixture,
  schedulerOperationalCatalogRv4Fixture,
  schedulerPosReferencesRv4Fixture,
} from "./fixtures/scheduler-administration";

function apiResponse<T>(data: T) {
  return { success: true, message: "Fixture visual RV4", data };
}

test.describe("Scheduler RV4 — evidencia visual de administración", () => {
  test.skip(
    process.env["E2E_SCHEDULER_ADMIN_VISUAL"] !== "true",
    "Requiere una cuenta E2E con READ en las secciones administrativas.",
  );

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/scheduler/operations/candidates", (route) =>
      route.fulfill({
        json: apiResponse(schedulerAdministrationCandidatesFixture),
      }),
    );
    await page.route("**/api/scheduler/operations/catalog", (route) =>
      route.fulfill({
        json: apiResponse(schedulerOperationalCatalogRv4Fixture),
      }),
    );
    await page.route("**/api/scheduler/administration/catalog", (route) =>
      route.fulfill({
        json: apiResponse(schedulerAdministrationCatalogRv4Fixture),
      }),
    );
    await page.route(
      "**/api/scheduler/administration/pos-references**",
      (route) =>
        route.fulfill({
          json: apiResponse(schedulerPosReferencesRv4Fixture),
        }),
    );
  });

  test("renderiza las siete secciones RV4 con contratos canónicos", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    const sections = [
      ["locals", "Comercios"],
      ["professionals", "Especialistas"],
      ["services", "Servicios"],
      ["commissions", "Comisiones"],
      ["resources", "Recursos"],
      ["gift-cards", "Gift cards"],
      ["status-colors", "Colores de status"],
    ] as const;

    for (const [section, title] of sections) {
      await openAuthenticatedPage(
        page,
        `/administracion?section=${section}`,
        "Administración",
      );
      await expect(
        page.getByRole("heading", { name: title }).last(),
      ).toBeVisible();
      await testInfo.attach(
        `scheduler-administration-rv4-${section}-1366x768`,
        {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        },
      );
    }
  });

  test("renderiza servicios, paquetes y clases en móvil", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthenticatedPage(
      page,
      "/administracion?section=services",
      "Administración",
    );
    await expect(page.getByText("Facial de hidratación").first()).toBeVisible();
    await expect(page.getByText("Ritual hidratante")).toBeVisible();
    await expect(
      page.getByText("Clase de automaquillaje").first(),
    ).toBeVisible();
    await testInfo.attach("scheduler-administration-rv4-services-390x844", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });
});
