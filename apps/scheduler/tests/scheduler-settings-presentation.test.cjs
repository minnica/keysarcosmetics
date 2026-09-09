const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = readFileSync(
  path.join(__dirname, "../src/lib/scheduler-settings-presentation.ts"),
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
  structuredClone,
  Object,
  Array,
  Boolean,
  JSON,
  URL,
});

const {
  buildSchedulerSettingLayerDocument,
  resolveSchedulerSettingDocumentForScope,
  schedulerSettingDefinitions,
  setSchedulerSettingValue,
  validateSchedulerSettingDocument,
} = exported;

const plain = (value) => JSON.parse(JSON.stringify(value));

test("declares a structured form for every versioned settings section", () => {
  assert.deepEqual(Object.keys(schedulerSettingDefinitions).sort(), [
    "agenda",
    "clients",
    "company",
    "emails",
    "integrations",
    "notifications",
    "payments",
    "records",
    "reminders",
    "surveys",
    "website",
  ]);
  assert.equal(schedulerSettingDefinitions.integrations.fields.length, 0);
  assert.ok(
    schedulerSettingDefinitions.payments.fields.every(
      (field) => !/secret|token|key|password/i.test(field.path),
    ),
  );
});

test("resolves only the layers at or below the layer being edited", () => {
  const resolved = {
    layers: [
      { scope: "COMMERCE", document: { color: "gold", nested: { a: 1 } } },
      { scope: "BRANCH", document: { nested: { b: 2 } } },
      { scope: "USER", document: { color: "rose" } },
    ],
  };
  assert.deepEqual(
    plain(
      resolveSchedulerSettingDocumentForScope(resolved, "COMMERCE", {
        enabled: true,
      }),
    ),
    { enabled: true, color: "gold", nested: { a: 1 } },
  );
  assert.deepEqual(
    plain(
      resolveSchedulerSettingDocumentForScope(resolved, "BRANCH", {
        enabled: true,
      }),
    ),
    { enabled: true, color: "gold", nested: { a: 1, b: 2 } },
  );
});

test("writes only changed form paths and preserves unknown layer keys", () => {
  const initial = {
    title: "Original",
    nested: { enabled: false, inherited: 7 },
  };
  const edited = setSchedulerSettingValue(initial, "nested.enabled", true);
  const result = buildSchedulerSettingLayerDocument({
    currentLayer: { unknown: { future: true }, nested: { own: "keep" } },
    initialEffective: initial,
    editedEffective: edited,
    fieldPaths: ["title", "nested.enabled"],
  });
  assert.deepEqual(plain(result), {
    unknown: { future: true },
    nested: { own: "keep", enabled: true },
  });
});

test("validates URLs, numeric ranges, e-mails and the public CLABE reference", () => {
  assert.match(
    validateSchedulerSettingDocument(schedulerSettingDefinitions.website, {
      ...schedulerSettingDefinitions.website.defaults,
      website: "javascript:alert(1)",
    }),
    /URL http o https/,
  );
  assert.match(
    validateSchedulerSettingDocument(schedulerSettingDefinitions.payments, {
      ...schedulerSettingDefinitions.payments.defaults,
      bankClabe: "123",
    }),
    /18 dígitos/,
  );
  assert.equal(
    validateSchedulerSettingDocument(schedulerSettingDefinitions.payments, {
      ...schedulerSettingDefinitions.payments.defaults,
      bankClabe: "012345678901234567",
    }),
    null,
  );
});
