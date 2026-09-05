import { expect, test } from "playwright/test";
import {
  assertReleaseIdentity,
  frontendReleaseComponents,
  frontendReleasePaths,
  readExpectedReleases,
  requiredEnvironment,
  writeVerifiedReleaseManifest,
  type ReleaseSet,
} from "../helpers/release-identity";

type HealthPayload = {
  status: string;
  release: string;
};

test("los alias estables y la API exponen los releases esperados", async ({
  browser,
  request,
}) => {
  const expectedReleases = readExpectedReleases("E2E");

  async function readFrontendRelease(
    component: (typeof frontendReleaseComponents)[number],
    bypassSecret: string | undefined,
  ): Promise<string> {
    const upperComponent = component.toUpperCase();
    const context = await browser.newContext({
      baseURL: requiredEnvironment(`${upperComponent}_BASE_URL`),
      extraHTTPHeaders: bypassSecret
        ? {
            "x-vercel-protection-bypass": bypassSecret,
            "x-vercel-set-bypass-cookie": "true",
          }
        : undefined,
    });
    try {
      const page = await context.newPage();
      const response = await page.goto(frontendReleasePaths[component], {
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

  const frontendEntries = await Promise.all(
    frontendReleaseComponents.map(async (component) => [
      component,
      await readFrontendRelease(
        component,
        process.env[`${component.toUpperCase()}_VERCEL_BYPASS_SECRET`],
      ),
    ]),
  );
  const healthResponse = await request.get(
    `${requiredEnvironment("API_BASE_URL")}/health`,
  );

  expect(healthResponse.ok()).toBe(true);

  const health = (await healthResponse.json()) as HealthPayload;
  expect(health.status).toBe("ok");
  const actualReleases: ReleaseSet = {
    ...Object.fromEntries(frontendEntries),
    api: health.release,
  } as ReleaseSet;
  assertReleaseIdentity(expectedReleases, actualReleases);

  await writeVerifiedReleaseManifest(process.env["RELEASE_MANIFEST_PATH"], {
    environment: requiredEnvironment("RELEASE_MANIFEST_ENVIRONMENT"),
    releases: actualReleases,
    suiteSha: process.env["GITHUB_SHA"]?.trim(),
  });

  test.info().annotations.push(
    { type: "envelope-release", description: actualReleases.envelope ?? "" },
    { type: "finance-release", description: actualReleases.finance ?? "" },
    { type: "hr-release", description: actualReleases.hr ?? "" },
    { type: "payroll-release", description: actualReleases.payroll ?? "" },
    {
      type: "scheduler-release",
      description: actualReleases.scheduler ?? "",
    },
    { type: "api-release", description: actualReleases.api ?? "" },
  );
});
