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
  release: string;
  status: string;
};

test("the environment serves the expected frontend and API releases", async ({
  browser,
  request,
}) => {
  const expectedReleases = readExpectedReleases("SMOKE");
  const expectedFrontendComponents = frontendReleaseComponents.filter(
    (component) => expectedReleases[component] !== undefined,
  );

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
      return (
        (await page
          .locator('meta[name="keysar-release"]')
          .getAttribute("content")) ?? ""
      );
    } finally {
      await context.close();
    }
  }

  const frontendEntries = await Promise.all(
    expectedFrontendComponents.map(async (component) => [
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
});
