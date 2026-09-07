const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function loadSource(name) {
  const source = readFileSync(
    path.join(__dirname, "../src/lib", `${name}.ts`),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exported = {};
  vm.runInNewContext(outputText, { exports: exported, Set });
  return exported;
}

const {
  extractSchedulerMessageVariables,
  formatSchedulerFileSize,
  formatSchedulerMessagePreview,
  schedulerOutboxStatusMeta,
  schedulerSurveyWriteInput,
  schedulerTemplateWriteInput,
} = loadSource("scheduler-engagement-presentation");

test("extracts valid message variables once and preserves their order", () => {
  assert.deepEqual(
    Array.from(
      extractSchedulerMessageVariables(
        "Hola {{ cliente.nombre }}, cita {{cita.fecha}} / {{cliente.nombre}} {{1invalid}}",
      ),
    ),
    ["cliente.nombre", "cita.fecha"],
  );
  assert.equal(
    formatSchedulerMessagePreview("Hola {{cliente.nombre}} {{sin_valor}}", {
      "cliente.nombre": "María",
    }),
    "Hola María {{sin_valor}}",
  );
});

test("keeps queued, provider accepted and delivered as distinct states", () => {
  assert.equal(schedulerOutboxStatusMeta.PENDING.label, "En cola");
  assert.equal(schedulerOutboxStatusMeta.SENT.label, "Enviado al proveedor");
  assert.equal(schedulerOutboxStatusMeta.DELIVERED.label, "Entregado");
  assert.match(schedulerOutboxStatusMeta.FAILED.detail, /reintento manual/);
});

test("builds versioned writes without leaking response-only fields", () => {
  const template = {
    id: "template-1",
    commerceId: "commerce-1",
    name: "Confirmación",
    channel: "WHATSAPP",
    active: true,
    currentVersion: 4,
    subject: null,
    body: "Hola {{cliente}}",
    variables: ["stale"],
    updatedAt: "2026-09-06T00:00:00.000Z",
  };
  assert.deepEqual(
    JSON.parse(JSON.stringify(schedulerTemplateWriteInput(template))),
    {
      commerceId: "commerce-1",
      name: "Confirmación",
      channel: "WHATSAPP",
      active: true,
      subject: null,
      body: "Hola {{cliente}}",
      variables: ["cliente"],
      expectedVersion: 4,
    },
  );

  const survey = {
    id: "survey-1",
    commerceId: "commerce-1",
    name: "Visita",
    status: "ACTIVE",
    currentVersion: 3,
    title: "Cuéntanos tu experiencia",
    introduction: null,
    questions: [
      {
        id: "question-1",
        sortOrder: 0,
        type: "RATING",
        prompt: "¿Cómo fue tu visita?",
        required: true,
      },
    ],
    serviceProfileIds: ["service-1"],
  };
  const write = schedulerSurveyWriteInput(survey, { status: "INACTIVE" });
  assert.equal(write.expectedVersion, 3);
  assert.equal(write.status, "INACTIVE");
  assert.deepEqual(JSON.parse(JSON.stringify(write.questions)), [
    { type: "RATING", prompt: "¿Cómo fue tu visita?", required: true },
  ]);
});

test("formats private document metadata without exposing storage paths", () => {
  assert.equal(formatSchedulerFileSize(512), "512 B");
  assert.equal(formatSchedulerFileSize(1536), "1.5 KB");
  assert.equal(formatSchedulerFileSize(2 * 1024 * 1024), "2.0 MB");
});
