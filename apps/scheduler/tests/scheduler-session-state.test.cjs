const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = readFileSync(
  path.join(__dirname, "../src/lib/scheduler-session-state.ts"),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const exported = {};
vm.runInNewContext(outputText, { exports: exported });

const {
  schedulerSessionRefreshIntervalMs,
  shouldAcceptSchedulerSessionResponse,
} = exported;

test("revalidates an authenticated Scheduler session every 30 seconds", () => {
  assert.equal(schedulerSessionRefreshIntervalMs, 30_000);
});

test("rejects bootstrap responses after logout or an account switch", () => {
  assert.equal(
    shouldAcceptSchedulerSessionResponse({
      request: 1,
      currentRequest: 2,
      token: "old-token",
      currentToken: null,
    }),
    false,
  );
  assert.equal(
    shouldAcceptSchedulerSessionResponse({
      request: 2,
      currentRequest: 2,
      token: "old-token",
      currentToken: "new-token",
    }),
    false,
  );
  assert.equal(
    shouldAcceptSchedulerSessionResponse({
      request: 2,
      currentRequest: 2,
      token: "current-token",
      currentToken: "current-token",
    }),
    true,
  );
});
