import { test, expect } from "./helpers/read-only-test";
import { openAuthenticatedPage } from "./helpers/ui";
import { schedulerSettingsRv5Documents } from "./fixtures/scheduler-settings";

test.describe("Scheduler RV5 — evidencia visual de configuraciones", () => {
  test.skip(
    process.env["E2E_SCHEDULER_SETTINGS_VISUAL"] !== "true",
    "Requiere una cuenta E2E con READ en las secciones de Configuraciones.",
  );

  test.beforeEach(async ({ page }) => {
    await page.route(
      "**/api/scheduler/administration/settings/*/resolved?**",
      async (route) => {
        const url = new URL(route.request().url());
        const section = url.pathname
          .split("/")
          .at(-2) as keyof typeof schedulerSettingsRv5Documents;
        const commerceId = url.searchParams.get("commerceId") ?? "commerce-rv5";
        await route.fulfill({
          json: {
            success: true,
            message: "Fixture visual RV5",
            data: {
              section,
              precedence: ["COMMERCE", "BRANCH", "USER"],
              document: schedulerSettingsRv5Documents[section],
              layers: [
                {
                  scope: "COMMERCE",
                  scopeReferenceId: commerceId,
                  version: 3,
                  document: schedulerSettingsRv5Documents[section],
                },
              ],
            },
          },
        });
      },
    );
  });

  test("renderiza formularios versionados sin editor JSON", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    for (const [section, heading] of [
      ["company", "Empresa"],
      ["agenda", "Agenda"],
      ["records", "Fichas médicas"],
      ["integrations", "Integraciones"],
    ] as const) {
      await openAuthenticatedPage(
        page,
        `/configuraciones?section=${section}`,
        "Configuraciones",
      );
      await expect(
        page.getByRole("heading", { name: heading }).last(),
      ).toBeVisible();
      await expect(page.getByText("Documento JSON efectivo")).toHaveCount(0);
      await testInfo.attach(`scheduler-settings-rv5-${section}-1366x768`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    }
  });

  test("mantiene el formulario confinado en móvil", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthenticatedPage(
      page,
      "/configuraciones?section=clients",
      "Configuraciones",
    );
    await expect(
      page.getByRole("heading", { name: "Clientes" }).last(),
    ).toBeVisible();
    await expect(page.getByText("Preferencias")).toBeVisible();
    await testInfo.attach("scheduler-settings-rv5-clients-390x844", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });
});
