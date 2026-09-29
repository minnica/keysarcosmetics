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
    assert.ok(
      normal
        .webpack({ resolve: { alias: {} } })
        .resolve.alias["@scheduler/runtime"].endsWith("/src/lib/runtime.tsx"),
    );
    process.env.SCHEDULER_DESIGN_MODE = "1";
    const design = config("phase-production-build");
    assert.equal(design.distDir, ".next-design");
    assert.equal(design.typescript.tsconfigPath, "tsconfig.design.json");
    assert.equal(
      design.env.NEXT_PUBLIC_API_URL,
      "https://scheduler-design.invalid",
    );
    assert.ok(
      design
        .webpack({ resolve: { alias: {} } })
        .resolve.alias["@scheduler/runtime"].endsWith("/design/runtime.tsx"),
    );
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
