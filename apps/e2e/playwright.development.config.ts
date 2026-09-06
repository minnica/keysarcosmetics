import path from "node:path";
import { defineConfig, devices } from "playwright/test";

const authDir = path.join(__dirname, ".auth");

function vercelProtectionBypass(secret: string | undefined) {
  if (!secret) return {};

  return {
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
  };
}

export default defineConfig({
  testDir: "./development",
  outputDir: "./test-results/development",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  workers: process.env["CI"] ? 2 : undefined,
  reporter: process.env["CI"]
    ? [
        ["github"],
        [
          "html",
          { outputFolder: "playwright-report-development", open: "never" },
        ],
      ]
    : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices["Desktop Chrome"],
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "release-identity",
      testMatch: /release\.identity\.spec\.ts/,
    },
    {
      name: "envelope-auth-setup",
      testMatch: /auth\/envelope\.setup\.ts/,
      dependencies: ["release-identity"],
      use: {
        baseURL: process.env["ENVELOPE_BASE_URL"],
        ...vercelProtectionBypass(process.env["ENVELOPE_VERCEL_BYPASS_SECRET"]),
      },
    },
    {
      name: "payroll-auth-setup",
      testMatch: /auth\/payroll\.setup\.ts/,
      dependencies: ["release-identity"],
      use: {
        baseURL: process.env["PAYROLL_BASE_URL"],
        ...vercelProtectionBypass(process.env["PAYROLL_VERCEL_BYPASS_SECRET"]),
      },
    },
    {
      name: "scheduler-auth-setup",
      testMatch: /auth\/scheduler\.setup\.ts/,
      dependencies: ["release-identity"],
      use: {
        baseURL: process.env["SCHEDULER_BASE_URL"],
        ...vercelProtectionBypass(
          process.env["SCHEDULER_VERCEL_BYPASS_SECRET"],
        ),
      },
    },
    {
      name: "envelope-development",
      testMatch: /envelope\.development\.spec\.ts/,
      dependencies: ["envelope-auth-setup"],
      use: {
        baseURL: process.env["ENVELOPE_BASE_URL"],
        storageState: path.join(authDir, "envelope.json"),
        ...vercelProtectionBypass(process.env["ENVELOPE_VERCEL_BYPASS_SECRET"]),
      },
    },
    {
      name: "payroll-development",
      testMatch: /payroll\.development\.spec\.ts/,
      dependencies: ["payroll-auth-setup"],
      use: {
        baseURL: process.env["PAYROLL_BASE_URL"],
        storageState: path.join(authDir, "payroll.json"),
        ...vercelProtectionBypass(process.env["PAYROLL_VERCEL_BYPASS_SECRET"]),
      },
    },
    {
      name: "scheduler-development",
      testMatch: /scheduler\.development\.spec\.ts/,
      dependencies: ["scheduler-auth-setup"],
      use: {
        baseURL: process.env["SCHEDULER_BASE_URL"],
        storageState: path.join(authDir, "scheduler.json"),
        ...vercelProtectionBypass(
          process.env["SCHEDULER_VERCEL_BYPASS_SECRET"],
        ),
      },
    },
  ],
});
