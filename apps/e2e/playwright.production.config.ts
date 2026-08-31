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
  testDir: "./production",
  outputDir: "./test-results/production",
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  retries: 0,
  workers: 1,
  reporter: process.env["CI"] ? "github" : "list",
  timeout: 45_000,
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
      name: "envelope-production-auth-setup",
      testMatch: /auth\/envelope\.setup\.ts/,
      use: {
        baseURL: process.env["ENVELOPE_BASE_URL"],
        ...vercelProtectionBypass(process.env["ENVELOPE_VERCEL_BYPASS_SECRET"]),
      },
    },
    {
      name: "payroll-production-auth-setup",
      testMatch: /auth\/payroll\.setup\.ts/,
      use: {
        baseURL: process.env["PAYROLL_BASE_URL"],
        ...vercelProtectionBypass(process.env["PAYROLL_VERCEL_BYPASS_SECRET"]),
      },
    },
    {
      name: "envelope-production-smoke",
      testMatch: /envelope\.production\.spec\.ts/,
      dependencies: ["envelope-production-auth-setup"],
      use: {
        baseURL: process.env["ENVELOPE_BASE_URL"],
        storageState: path.join(authDir, "production-envelope.json"),
        ...vercelProtectionBypass(process.env["ENVELOPE_VERCEL_BYPASS_SECRET"]),
      },
    },
    {
      name: "payroll-production-smoke",
      testMatch: /payroll\.production\.spec\.ts/,
      dependencies: ["payroll-production-auth-setup"],
      use: {
        baseURL: process.env["PAYROLL_BASE_URL"],
        storageState: path.join(authDir, "production-payroll.json"),
        ...vercelProtectionBypass(process.env["PAYROLL_VERCEL_BYPASS_SECRET"]),
      },
    },
  ],
});
