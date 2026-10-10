const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = readFileSync(
  path.join(__dirname, "../src/lib/scheduler-customer-import.ts"),
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
  require: () => ({}),
  Set,
  Map,
  Number,
  String,
});

const { parseSchedulerCustomerImportMatrix, schedulerCustomerImportHeaders } =
  exported;

const definitions = [
  {
    id: "field-birthday",
    label: "Fecha de nacimiento",
    type: "DATE",
    required: false,
    active: true,
    options: null,
  },
  {
    id: "field-owner",
    label: "Representante de cartera",
    type: "SELECT",
    required: true,
    active: true,
    options: ["Renata Castillo", "Cartera de la empresa"],
  },
];
const sources = [
  { id: "source-referral", name: "Recomendación", active: true },
];

test("orders identity, contact and configurable fields in the template", () => {
  assert.deepEqual(Array.from(schedulerCustomerImportHeaders(definitions)), [
    "Nombre completo *",
    "Teléfono",
    "Correo principal",
    "Correos alternos",
    "Procedencia",
    "Nombre preferido",
    "Canal de contacto",
    "Alias",
    "Notas",
    "Notas de perfil",
    "Fecha de nacimiento",
    "Representante de cartera *",
  ]);
});

test("parses a valid customer row into the canonical write contract", () => {
  const headers = schedulerCustomerImportHeaders(definitions);
  const preview = parseSchedulerCustomerImportMatrix(
    [
      headers,
      [
        "Ana Torres Ruiz",
        "+52 55 1234 5678",
        "ANA@example.com",
        "ana.alt@example.com",
        "Recomendación",
        "Anita",
        "WhatsApp",
        "Ana T.",
        "Cliente demo",
        "Prefiere mensajes",
        "1993-05-21",
        "Renata Castillo",
      ],
    ],
    definitions,
    sources,
  );

  assert.equal(preview.issues.length, 0);
  assert.equal(preview.rows.length, 1);
  assert.equal(preview.rows[0].input.phone, "525512345678");
  assert.equal(preview.rows[0].input.email, "ana@example.com");
  assert.equal(preview.rows[0].input.sourceId, "source-referral");
  assert.equal(preview.rows[0].input.profile.contactPreference, "WHATSAPP");
  assert.deepEqual(
    Array.from(preview.rows[0].input.customFields, (field) => ({ ...field })),
    [
      { definitionId: "field-birthday", value: "1993-05-21" },
      { definitionId: "field-owner", value: "Renata Castillo" },
    ],
  );
});

test("blocks repeated phones and missing required configurable data", () => {
  const headers = schedulerCustomerImportHeaders(definitions);
  const preview = parseSchedulerCustomerImportMatrix(
    [
      headers,
      ["Ana Torres", "5512345678", "", "", "", "", "", "", "", "", "", ""],
      [
        "Otra Persona",
        "55 1234 5678",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Renata Castillo",
      ],
    ],
    definitions,
    sources,
  );

  assert.equal(
    preview.issues.filter((issue) => issue.severity === "ERROR").length,
    2,
  );
  assert.match(preview.issues[0].message, /Representante de cartera/);
  assert.match(preview.issues[1].message, /repite/);
});
