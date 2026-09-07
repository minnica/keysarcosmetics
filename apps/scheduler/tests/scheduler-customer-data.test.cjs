const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = readFileSync(
  path.join(__dirname, "../src/lib/scheduler-customer-data.ts"),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const exported = {};
vm.runInNewContext(outputText, {
  exports: exported,
  Date,
  Number,
  Set,
  require: () => ({}),
});

const {
  adaptSchedulerCustomerSummary,
  authorizationRetentionMs,
  customerFieldDraftValue,
  customerFieldWriteValue,
  splitCustomerList,
} = exported;

test("adapts the same canonical customer identity used by Agenda", () => {
  const result = adaptSchedulerCustomerSummary({
    id: "customer-1",
    displayName: "María Celis",
    aliases: ["María C."],
    phone: "+52 55 1234 5678",
    email: "maria@example.com",
  });
  assert.equal(result.id, "customer-1");
  assert.equal(result.fullName, "María Celis");
  assert.equal(result.normalizedPhone, "525512345678");
  assert.deepEqual(Array.from(result.aliases), ["María C."]);
});

test("normalizes multiline aliases and alternate emails without duplicates", () => {
  assert.deepEqual(Array.from(splitCustomerList("Uno\nDos, Uno,  Tres ")), [
    "Uno",
    "Dos",
    "Tres",
  ]);
});

test("converts custom fields without inventing missing values", () => {
  assert.equal(customerFieldWriteValue({ type: "NUMBER" }, "12.5"), 12.5);
  assert.equal(customerFieldWriteValue({ type: "BOOLEAN" }, false), false);
  assert.equal(
    customerFieldWriteValue({ type: "TEXT" }, "  piel seca "),
    "piel seca",
  );
  assert.equal(customerFieldDraftValue({ type: "BOOLEAN", value: true }), true);
  assert.equal(customerFieldDraftValue({ type: "TEXT", value: null }), "");
});

test("uses the server authorization expiry to limit sensitive retention", () => {
  assert.equal(
    authorizationRetentionMs(
      "2026-09-06T12:02:00.000Z",
      Date.parse("2026-09-06T12:00:00.000Z"),
    ),
    120_000,
  );
  assert.equal(
    authorizationRetentionMs(
      "2026-09-06T11:59:00.000Z",
      Date.parse("2026-09-06T12:00:00.000Z"),
    ),
    0,
  );
});
