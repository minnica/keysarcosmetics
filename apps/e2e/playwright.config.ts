import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"]
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  timeout: 30_000,
  use: {
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
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
        channel: "chrome",
        baseURL: process.env["ENVELOPE_BASE_URL"] ?? "http://127.0.0.1:3001",
      },
    },
    {
      name: "payroll",
      testMatch: /web\.smoke\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        baseURL: process.env["PAYROLL_BASE_URL"] ?? "http://127.0.0.1:3002",
      },
    },
  ],
});
