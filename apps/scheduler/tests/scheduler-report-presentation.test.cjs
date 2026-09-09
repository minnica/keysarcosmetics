const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = readFileSync(
  path.join(__dirname, "../src/lib/scheduler-report-presentation.ts"),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const exported = {};
vm.runInNewContext(outputText, { exports: exported, Map, Set, Number });

const {
  groupReportRows,
  mergeSchedulerReportPages,
  reportMetricCards,
  reportTrend,
  schedulerReportViews,
} = exported;

function dataset(key, rows, summary = {}) {
  return {
    key,
    dateFrom: "2026-08-01",
    dateTo: "2026-08-31",
    interval: "[dateFrom, dateTo + 1 day)",
    source: "CANONICAL",
    sourceAuthority: "SCHEDULER",
    sourceAuthorities: ["SCHEDULER"],
    generatedAt: "2026-09-06T00:00:00.000Z",
    branchIds: ["branch-1"],
    timeZones: { "branch-1": "America/Mexico_City" },
    filters: {
      professionalProfileId: null,
      serviceProfileId: null,
      status: null,
      channel: null,
      searchApplied: false,
    },
    summary,
    columns: Object.keys(rows[0] ?? {}),
    rows,
    page: 1,
    pageSize: 100,
    total: rows.length,
    notes: [],
  };
}

test("declares every restored route with explicit canonical datasets", () => {
  assert.deepEqual(Array.from(schedulerReportViews.reservations.keys), [
    "APPOINTMENTS",
    "OCCUPANCY",
    "CANCELLATIONS",
    "NO_SHOW",
  ]);
  assert.equal(schedulerReportViews.sales.primaryKey, "SALES");
  assert.equal(schedulerReportViews.surveys.primaryKey, "SURVEYS");
  assert.equal(schedulerReportViews.reminders.primaryKey, "COMMUNICATIONS");
  assert.equal(
    schedulerReportViews["services-by-location"].primaryKey,
    "SERVICES",
  );
  assert.equal(
    schedulerReportViews["providers-by-location"].primaryKey,
    "PROFESSIONALS",
  );
});

test("merges every report page without replacing canonical summary metadata", () => {
  const first = dataset("APPOINTMENTS", [{ appointment_id: "a" }], {
    Citas: 2,
  });
  first.total = 2;
  const second = { ...first, page: 2, rows: [{ appointment_id: "b" }] };
  const merged = mergeSchedulerReportPages(first, [second]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(merged.rows.map((row) => row.appointment_id))),
    ["a", "b"],
  );
  assert.equal(merged.summary.Citas, 2);
  assert.equal(merged.page, 1);
  assert.equal(merged.pageSize, 2);
});

test("groups charts from real rows and keeps chronological trends", () => {
  const rows = [
    { Fecha: "2026-08-02", Sucursal: "Centro", Venta: "40.00" },
    { Fecha: "2026-08-01", Sucursal: "Norte", Venta: "25.00" },
    { Fecha: "2026-08-02", Sucursal: "Centro", Venta: "10.00" },
  ];
  assert.deepEqual(
    JSON.parse(JSON.stringify(groupReportRows(rows, "Sucursal", "Venta"))),
    [
      { label: "Centro", value: 50 },
      { label: "Norte", value: 25 },
    ],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(reportTrend(dataset("SALES", rows), "Venta"))),
    [
      { label: "2026-08-01", value: 25 },
      { label: "2026-08-02", value: 50 },
    ],
  );
});

test("maps summary cards only to fields returned by their dataset", () => {
  const cards = reportMetricCards("sales", {
    SALES: dataset("SALES", [], {
      Tickets: 3,
      "Venta vigente": "1250.00",
      Cobrado: "900.00",
    }),
    PAYMENTS: dataset("PAYMENTS", [], { Neto: "900.00" }),
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(cards.map((card) => card.value))),
    [3, 1250, 900, 900],
  );
});
