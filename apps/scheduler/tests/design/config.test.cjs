const assert = require("node:assert/strict");
const { test } = require("node:test");

test("el alias, destino HTTP y salida de diseño quedan separados del build normal", async () => {
  const { default: config } = await import("../../next.config.mjs");
  const previous = process.env.SCHEDULER_DESIGN_MODE;
  try {
    delete process.env.SCHEDULER_DESIGN_MODE;
    const normal = config("phase-production-build");
    assert.equal(normal.distDir, ".next");
    assert.equal(normal.env, undefined);
    const normalAliases = normal.webpack({ resolve: { alias: {} } }).resolve.alias;
    assert.ok(normalAliases["@scheduler/runtime"].replaceAll("\\", "/").endsWith("/src/lib/runtime.tsx"));
    assert.ok(normalAliases["@scheduler/design-proposals"].replaceAll("\\", "/").endsWith("/src/lib/design-proposals.ts"));
    process.env.SCHEDULER_DESIGN_MODE = "1";
    const design = config("phase-production-build");
    assert.equal(design.distDir, ".next-design");
    assert.equal(design.typescript.tsconfigPath, "tsconfig.design.json");
    assert.equal(
      design.env.NEXT_PUBLIC_API_URL,
      "https://scheduler-design.invalid",
    );
    const designAliases = design.webpack({ resolve: { alias: {} } }).resolve.alias;
    assert.ok(designAliases["@scheduler/runtime"].replaceAll("\\", "/").endsWith("/design/runtime.tsx"));
    assert.ok(designAliases["@scheduler/design-proposals"].replaceAll("\\", "/").endsWith("/design/proposals.ts"));
    const previousEnvironment = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    try {
      assert.throws(() => config("phase-production-build"), /producción/);
    } finally {
      if (previousEnvironment === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previousEnvironment;
    }
  } finally {
    if (previous === undefined) delete process.env.SCHEDULER_DESIGN_MODE;
    else process.env.SCHEDULER_DESIGN_MODE = previous;
  }
});
