import { expect, test } from "playwright/test";
import {
  assertReleaseIdentity,
  readExpectedReleases,
  requiredEnvironment,
  writeVerifiedReleaseManifest,
  type ReleaseSet,
} from "../helpers/release-identity";

type HealthPayload = {
  release: string;
  status: string;
};

test("the environment serves the expected frontend and API releases", async ({
  browser,
  request,
}) => {
  const expectedReleases = readExpectedReleases("SMOKE");

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
      return (
        (await page
          .locator('meta[name="keysar-release"]')
          .getAttribute("content")) ?? ""
      );
    } finally {
      await context.close();
    }
  }

  const [envelopeRelease, payrollRelease, schedulerRelease, healthResponse] =
    await Promise.all([
      readFrontendRelease(
        requiredEnvironment("ENVELOPE_BASE_URL"),
        process.env["ENVELOPE_VERCEL_BYPASS_SECRET"],
      ),
      readFrontendRelease(
        requiredEnvironment("PAYROLL_BASE_URL"),
        process.env["PAYROLL_VERCEL_BYPASS_SECRET"],
      ),
      readFrontendRelease(
        requiredEnvironment("SCHEDULER_BASE_URL"),
        process.env["SCHEDULER_VERCEL_BYPASS_SECRET"],
      ),
      request.get(`${requiredEnvironment("API_BASE_URL")}/health`),
    ]);

  expect(healthResponse.ok()).toBe(true);

  const health = (await healthResponse.json()) as HealthPayload;
  expect(health.status).toBe("ok");
  const actualReleases: ReleaseSet = {
    envelope: envelopeRelease,
    payroll: payrollRelease,
    scheduler: schedulerRelease,
    api: health.release,
  };
  assertReleaseIdentity(expectedReleases, actualReleases);

  await writeVerifiedReleaseManifest(process.env["RELEASE_MANIFEST_PATH"], {
    environment: requiredEnvironment("RELEASE_MANIFEST_ENVIRONMENT"),
    releases: actualReleases,
    suiteSha: process.env["GITHUB_SHA"]?.trim(),
  });
});
