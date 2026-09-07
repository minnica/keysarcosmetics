import { test, expect } from "./helpers/read-only-test";
import { openAuthenticatedPage } from "./helpers/ui";
import { schedulerOperationalCatalogRv4Fixture } from "./fixtures/scheduler-administration";
import {
  schedulerConsentTemplatesRv6Fixture,
  schedulerMessageOutboxRv6Fixture,
  schedulerMessageTemplatesRv6Fixture,
  schedulerSurveysRv6Fixture,
} from "./fixtures/scheduler-engagement";

function apiResponse<T>(data: T) {
  return { success: true, message: "Fixture visual RV6", data };
}

test.describe("Scheduler RV6 — evidencia visual de engagement", () => {
  test.skip(
    process.env["E2E_SCHEDULER_ENGAGEMENT_VISUAL"] !== "true",
    "Requiere una cuenta E2E con READ en Encuestas, Consentimientos y Comunicaciones.",
  );

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/scheduler/operations/catalog", (route) =>
      route.fulfill({
        json: apiResponse(schedulerOperationalCatalogRv4Fixture),
      }),
    );
    await page.route("**/api/scheduler/surveys", (route) =>
      route.fulfill({ json: apiResponse(schedulerSurveysRv6Fixture) }),
    );
    await page.route("**/api/scheduler/documents/consent-templates", (route) =>
      route.fulfill({ json: apiResponse(schedulerConsentTemplatesRv6Fixture) }),
    );
    await page.route("**/api/scheduler/communications/templates", (route) =>
      route.fulfill({ json: apiResponse(schedulerMessageTemplatesRv6Fixture) }),
    );
    await page.route("**/api/scheduler/communications/outbox", (route) =>
      route.fulfill({ json: apiResponse(schedulerMessageOutboxRv6Fixture) }),
    );
  });

  test("renderiza los tres paneles restaurados en escritorio", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    const sections = [
      ["surveys", "Encuestas"],
      ["consents", "Consentimientos"],
      ["whatsapp", "Comunicaciones"],
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
      await testInfo.attach(`scheduler-rv6-${section}-1366x768`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    }
  });

  test("confina comunicaciones en móvil", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthenticatedPage(
      page,
      "/administracion?section=whatsapp",
      "Administración",
    );
    await expect(page.getByText("Confirmación de cita")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).toBe(true);
    await testInfo.attach("scheduler-rv6-communications-390x844", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });
});
