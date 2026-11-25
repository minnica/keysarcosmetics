import { defineConfig } from "playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: "./pilot",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3098",
    channel: "chrome",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3098",
    cwd: resolve(__dirname, "../payroll"),
    url: "http://127.0.0.1:3098/login",
    env: { PILOT_LOCAL_TEST: "1", PILOT_API_ORIGIN: "http://127.0.0.1:4078" },
    reuseExistingServer: false,
    timeout: 60000,
  },
});
