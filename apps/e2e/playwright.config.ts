import { defineConfig, devices } from "playwright/test";

function vercelProtectionBypass(secret: string | undefined) {
  if (!secret) {
    return {};
  }

  return {
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
  };
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"]
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  timeout: 30_000,
  use: {
    // Environment diagnostics must never persist pages, request headers or data.
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "release-identity",
      testMatch: /release\.smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
    {
      name: "api",
      testMatch: /api\.smoke\.spec\.ts/,
      use: {
        baseURL: process.env["API_BASE_URL"] ?? "http://127.0.0.1:4000",
      },
    },
    {
      name: "envelope",
      testMatch: /web\.smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...vercelProtectionBypass(process.env["ENVELOPE_VERCEL_BYPASS_SECRET"]),
        channel: "chrome",
        baseURL: process.env["ENVELOPE_BASE_URL"] ?? "http://127.0.0.1:3001",
      },
    },
    ...(process.env["TARGET_ENVIRONMENT"] === "production"
      ? []
      : [
          {
            name: "finance",
            testMatch: /mock-shell\.smoke\.spec\.ts/,
            use: {
              ...devices["Desktop Chrome"],
              ...vercelProtectionBypass(
                process.env["FINANCE_VERCEL_BYPASS_SECRET"],
              ),
              channel: "chrome",
              baseURL:
                process.env["FINANCE_BASE_URL"] ?? "http://127.0.0.1:3006",
            },
          },
          {
            name: "hr",
            testMatch: /mock-shell\.smoke\.spec\.ts/,
            use: {
              ...devices["Desktop Chrome"],
              ...vercelProtectionBypass(process.env["HR_VERCEL_BYPASS_SECRET"]),
              channel: "chrome",
              baseURL: process.env["HR_BASE_URL"] ?? "http://127.0.0.1:3007",
            },
          },
        ]),
    {
      name: "payroll",
      testMatch: /web\.smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...vercelProtectionBypass(process.env["PAYROLL_VERCEL_BYPASS_SECRET"]),
        channel: "chrome",
        baseURL: process.env["PAYROLL_BASE_URL"] ?? "http://127.0.0.1:3002",
      },
    },
    {
      name: "scheduler",
      testMatch: /web\.smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...vercelProtectionBypass(
          process.env["SCHEDULER_VERCEL_BYPASS_SECRET"],
        ),
        channel: "chrome",
        baseURL: process.env["SCHEDULER_BASE_URL"] ?? "http://127.0.0.1:3004",
      },
    },
  ],
});
