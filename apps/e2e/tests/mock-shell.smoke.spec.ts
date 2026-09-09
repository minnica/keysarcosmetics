import { expect, test } from "playwright/test";

test("the selected mock application exposes a functional shell", async ({
  page,
}) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.ok()).toBe(true);
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator('meta[name="keysar-release"]')).toHaveAttribute(
    "content",
    /^[0-9a-f]{40}$/,
  );
});
