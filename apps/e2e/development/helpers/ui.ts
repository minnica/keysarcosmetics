import { expect, type Locator, type Page } from "playwright/test";

export async function openAuthenticatedPage(
  page: Page,
  path: string,
  heading: string | RegExp,
): Promise<void> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBe(true);
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(
    page.getByRole("heading", { level: 1, name: heading }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(window.localStorage.getItem("auth_token"))),
    )
    .toBe(true);
}

export async function selectDifferentCalendarDay(
  page: Page,
  trigger: Locator,
): Promise<void> {
  const before = (await trigger.textContent())?.trim();
  await trigger.click();

  const grid = page.getByRole("grid").last();
  await expect(grid).toBeVisible();
  const days = grid.getByRole("gridcell");
  const count = await days.count();

  for (let index = 0; index < count; index += 1) {
    const day = days.nth(index);
    if (
      (await day.isVisible()) &&
      (await day.isEnabled()) &&
      (await day.getAttribute("aria-selected")) !== "true"
    ) {
      await day.click();
      await expect(grid).toBeHidden();
      if (before) await expect(trigger).not.toHaveText(before);
      return;
    }
  }

  throw new Error("El calendario no expuso otro día seleccionable.");
}
