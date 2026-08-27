import { expect, test } from "playwright/test";
import {
  assertFullGitSha,
  optionalEnvironment,
  requiredEnvironment,
} from "./helpers/environment";

type HealthPayload = {
  status: string;
  release: string;
};

test("los alias estables y la API exponen los releases esperados", async ({
  browser,
  request,
}) => {
  const expectedFrontendSha = requiredEnvironment("E2E_EXPECTED_FRONTEND_SHA");
  const expectedApiSha = optionalEnvironment("E2E_EXPECTED_API_SHA");
  assertFullGitSha(expectedFrontendSha, "E2E_EXPECTED_FRONTEND_SHA");
  if (expectedApiSha) assertFullGitSha(expectedApiSha, "E2E_EXPECTED_API_SHA");

  async function readFrontendRelease(
    baseURL: string,
    bypassSecret: string | undefined,
  ): Promise<string> {
    const context = await browser.newContext({
      baseURL,
      extraHTTPHeaders: bypassSecret
        ? {
            "x-vercel-protection-bypass": bypassSecret,
            "x-vercel-set-bypass-cookie": "true",
          }
        : undefined,
    });
    try {
      const page = await context.newPage();
      const response = await page.goto("/login", {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok()).toBe(true);
      const release = await page
        .locator('meta[name="keysar-release"]')
        .getAttribute("content");
      expect(release).toBeTruthy();
      return release ?? "";
    } finally {
      await context.close();
    }
  }

  const [envelopeRelease, payrollRelease, healthResponse] = await Promise.all([
    readFrontendRelease(
      requiredEnvironment("ENVELOPE_BASE_URL"),
      process.env["ENVELOPE_VERCEL_BYPASS_SECRET"],
    ),
    readFrontendRelease(
      requiredEnvironment("PAYROLL_BASE_URL"),
      process.env["PAYROLL_VERCEL_BYPASS_SECRET"],
    ),
    request.get(`${requiredEnvironment("API_BASE_URL")}/health`),
  ]);

  expect(envelopeRelease).toBe(expectedFrontendSha);
  expect(payrollRelease).toBe(expectedFrontendSha);
  expect(healthResponse.ok()).toBe(true);

  const health = (await healthResponse.json()) as HealthPayload;
  expect(health.status).toBe("ok");
  expect(health.release).toMatch(/^[a-f0-9]{40}$/i);
  if (expectedApiSha) expect(health.release).toBe(expectedApiSha);

  test
    .info()
    .annotations.push(
      { type: "frontend-release", description: expectedFrontendSha },
      { type: "api-release", description: health.release },
    );
});
