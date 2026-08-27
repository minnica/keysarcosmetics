import { expect, test } from "playwright/test";

type HealthPayload = {
  release: string;
  status: string;
};

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(
      `Falta ${name}; configura el environment sin imprimir su valor.`,
    );
  return value;
}

function assertFullGitSha(value: string, name: string): void {
  if (!/^[a-f0-9]{40}$/i.test(value)) {
    throw new Error(`${name} debe contener un SHA completo de 40 caracteres.`);
  }
}

test("the environment serves the expected frontend and API releases", async ({
  browser,
  request,
}) => {
  const expectedFrontendSha = requiredEnvironment(
    "SMOKE_EXPECTED_FRONTEND_SHA",
  );
  const expectedApiSha = requiredEnvironment("SMOKE_EXPECTED_API_SHA");
  assertFullGitSha(expectedFrontendSha, "SMOKE_EXPECTED_FRONTEND_SHA");
  assertFullGitSha(expectedApiSha, "SMOKE_EXPECTED_API_SHA");

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
  expect(health.release).toBe(expectedApiSha);
});
