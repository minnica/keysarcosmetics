import { expect, test } from "playwright/test";

test("the protected application exposes a functional login shell", async ({
  page,
}) => {
  const response = await page.goto("/login", { waitUntil: "domcontentloaded" });

  expect(response?.ok()).toBe(true);
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});
