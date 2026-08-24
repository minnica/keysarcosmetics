import { expect, test } from "playwright/test";

test("API process and database are ready", async ({ request }) => {
  const health = await request.get("/health");
  expect(health.ok()).toBe(true);
  await expect(health.json()).resolves.toMatchObject({ status: "ok" });

  const readiness = await request.get("/ready");
  expect(readiness.ok()).toBe(true);
  await expect(readiness.json()).resolves.toMatchObject({ status: "ready" });
});

test("unknown API routes return the JSON contract", async ({ request }) => {
  const response = await request.get("/api/ci-route-that-does-not-exist");
  expect(response.status()).toBe(404);
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    data: null,
  });
});
