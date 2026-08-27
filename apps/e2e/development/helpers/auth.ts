import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "playwright/test";

export async function authenticateAndSaveState({
  page,
  email,
  password,
  stateFile,
}: {
  page: Page;
  email: string;
  password: string;
  stateFile: string;
}): Promise<void> {
  const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBe(true);

  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);

  await Promise.all([
    page.waitForURL((url) => url.pathname !== "/login"),
    page.locator('button[type="submit"]').click(),
  ]);

  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(window.localStorage.getItem("auth_token"))),
    )
    .toBe(true);

  await mkdir(path.dirname(stateFile), { recursive: true });
  await page.context().storageState({ path: stateFile });
}
