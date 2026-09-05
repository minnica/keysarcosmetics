import { test, expect } from "./helpers/read-only-test";
import { openAuthenticatedPage } from "./helpers/ui";

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

  test("carga Reportes sin emitir escrituras", async ({ page }) => {
    await openAuthenticatedPage(page, "/reportes", "Reportes");
  });
});
