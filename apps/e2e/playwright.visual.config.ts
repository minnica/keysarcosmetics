import { defineConfig, devices } from "playwright/test";

const isCI = Boolean(process.env.CI);
const baseURL = process.env.UI_TESTBED_BASE_URL ?? "http://127.0.0.1:3010";
const usesStaticFile = baseURL.startsWith("file://");
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./visual",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.005,
    },
  },
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{projectName}/{arg}{ext}",
  use: {
    baseURL,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    colorScheme: "light",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        browserName: "chromium",
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  ...(usesStaticFile
    ? {}
    : {
        webServer: {
          command: "pnpm --filter @cosmetics/ui-testbed start",
          url: "http://127.0.0.1:3010",
          reuseExistingServer: !isCI,
          timeout: 60_000,
        },
      }),
});
