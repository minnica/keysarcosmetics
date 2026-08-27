import { expect, test as base } from "playwright/test";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const test = base.extend<{ readOnlyNetworkGuard: void }>({
  readOnlyNetworkGuard: [
    async ({ page }, use) => {
      const writes: string[] = [];
      page.on("request", (request) => {
        if (!SAFE_METHODS.has(request.method())) {
          const url = new URL(request.url());
          writes.push(`${request.method()} ${url.origin}${url.pathname}`);
        }
      });

      await use();

      expect(
        writes,
        "Los recorridos autenticados de ambientes deben permanecer en solo lectura.",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "playwright/test";
