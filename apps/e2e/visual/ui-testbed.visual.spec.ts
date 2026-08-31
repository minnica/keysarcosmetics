import { expect, test, type Page } from "playwright/test";

async function openScenario(page: Page, scenario: string) {
  await page.goto(`?scenario=${scenario}`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.addStyleTag({
    content:
      "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }",
  });
}

test("DatePicker cerrado y abierto", async ({ page }) => {
  await openScenario(page, "date-picker");
  await expect(page).toHaveScreenshot("date-picker-closed.png", {
    fullPage: true,
  });
  await page.getByRole("button", { name: "20/08/2026" }).click();
  await expect(page).toHaveScreenshot("date-picker-open.png", {
    fullPage: true,
  });
});

test("DateRangePicker completo y selector abierto", async ({ page }) => {
  await openScenario(page, "date-range");
  await expect(page).toHaveScreenshot("date-range-complete.png", {
    fullPage: true,
  });
  await page.getByRole("button", { name: "01/08/2026" }).click();
  await expect(page).toHaveScreenshot("date-range-open.png", {
    fullPage: true,
  });
});

test("Calendar", async ({ page }) => {
  await openScenario(page, "calendar");
  await expect(page).toHaveScreenshot("calendar.png", { fullPage: true });
});

test("Combobox abierto y filtrado", async ({ page }) => {
  await openScenario(page, "combobox");
  await page.getByRole("combobox").click();
  await expect(page).toHaveScreenshot("combobox-open.png", { fullPage: true });
  await page.getByPlaceholder("Buscar sucursal").fill("nor");
  await expect(page).toHaveScreenshot("combobox-filtered.png", {
    fullPage: true,
  });
});

test("DataTable normal, filtrada y paginada", async ({ page }) => {
  await openScenario(page, "data-table");
  await expect(page).toHaveScreenshot("data-table.png", { fullPage: true });
  await page.getByPlaceholder("BUSCAR VENDEDORA").fill("Ana");
  await expect(page).toHaveScreenshot("data-table-filtered.png", {
    fullPage: true,
  });
  await page.getByPlaceholder("BUSCAR VENDEDORA").fill("");
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(page).toHaveScreenshot("data-table-paginated.png", {
    fullPage: true,
  });
});

test("DataTable vacía", async ({ page }) => {
  await openScenario(page, "data-table-empty");
  await expect(page).toHaveScreenshot("data-table-empty.png", {
    fullPage: true,
  });
});

test("Select abierto", async ({ page }) => {
  await openScenario(page, "select");
  await page.getByRole("combobox", { name: "Periodo" }).click();
  await expect(page).toHaveScreenshot("select-open.png", { fullPage: true });
});

test("Dialog abierto", async ({ page }) => {
  await openScenario(page, "dialog");
  await page.getByRole("button", { name: "Abrir edición" }).click();
  await expect(page).toHaveScreenshot("dialog-open.png");
});

test("AlertDialog abierto", async ({ page }) => {
  await openScenario(page, "alert-dialog");
  await page.getByRole("button", { name: "Eliminar registro" }).click();
  await expect(page).toHaveScreenshot("alert-dialog-open.png");
});

test("Sidebar expandido y colapsado", async ({ page }, testInfo) => {
  await openScenario(page, "sidebar");
  const toggle = page.getByRole("button", { name: "Toggle Sidebar" });

  if (testInfo.project.name === "mobile-chromium") {
    await expect(page).toHaveScreenshot("sidebar-collapsed.png");
    await toggle.click();
    await expect(page).toHaveScreenshot("sidebar-expanded.png");
    return;
  }

  await expect(page).toHaveScreenshot("sidebar-expanded.png");
  await toggle.click();
  await expect(page).toHaveScreenshot("sidebar-collapsed.png");
});

test("Toast visible", async ({ page }) => {
  await openScenario(page, "toast");
  await expect(page.getByText("Cambios guardados")).toBeVisible();
  await expect(page).toHaveScreenshot("toast.png");
});
