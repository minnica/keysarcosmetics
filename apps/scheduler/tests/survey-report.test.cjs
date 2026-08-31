const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const modules = new Map();
function loadSource(name) {
  if (modules.has(name)) return modules.get(name);
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
  vm.runInNewContext(outputText, {
    exports: exported,
    require: (specifier) => loadSource(specifier.replace(/^\.\//, "")),
  });
  modules.set(name, exported);
  return exported;
}

const {
  reportSurveys,
  demoSurveyDeliveries,
  getSurveyDateRange,
  filterSurveyDeliveries,
  summarizeRatings,
  buildSurveyReport,
  surveyReportCsv,
} = loadSource("survey-report");
const survey = reportSurveys[0];
const filters = {
  surveyId: survey.id,
  period: "30",
  professionalIds: ["opatra-cabina-1"],
  serviceIds: ["svc-1"],
  from: "",
  to: "",
};
const delivery = demoSurveyDeliveries[0];
const filter = (changes = {}, records = demoSurveyDeliveries) =>
  filterSurveyDeliveries(records, { ...filters, ...changes });

test("reference survey contains the six categories in the requested order", () => {
  const report = buildSurveyReport(survey, demoSurveyDeliveries);
  assert.equal(
    report.categories.map((item) => item.name).join("|"),
    "Calidad|Puntualidad|Limpieza y orden|Recomendabilidad|Atención del personal|Agendamiento",
  );
  assert.ok(report.categories.every((item) => item.questions.length === 1));
});

test("unanswered demo preserves the reference numbers without fabricated scores", () => {
  const report = buildSurveyReport(survey, filter());
  assert.equal(report.sent, 1);
  assert.equal(report.responded, 0);
  assert.equal(report.average, 0);
  assert.equal(report.responseRate, 0);
  assert.ok(
    report.categories.every((category) =>
      category.distribution.every(
        (item) => item.count === 0 && item.percentage === 0,
      ),
    ),
  );
});

test("inclusive relative date ranges have the correct start", () => {
  assert.equal(getSurveyDateRange("7").from, "2026-06-24");
  assert.equal(getSurveyDateRange("30").from, "2026-06-01");
  assert.equal(getSurveyDateRange("90").from, "2026-04-02");
  assert.equal(getSurveyDateRange("all").from, "");
  assert.equal(
    getSurveyDateRange("7", "", "", "2024-03-01").from,
    "2024-02-24",
  );
});

test("custom ranges reject missing and inverted bounds", () => {
  assert.equal(getSurveyDateRange("custom").valid, false);
  assert.equal(
    getSurveyDateRange("custom", "2026-07-01", "2026-06-01").valid,
    false,
  );
  assert.equal(
    filter({ period: "custom", from: "2026-06-30", to: "2026-06-30" }).length,
    1,
  );
  assert.equal(
    filter({ period: "custom", from: "2026-06-01", to: "2026-06-29" }).length,
    0,
  );
});

test("all filter dimensions apply together; no selection means no matches", () => {
  assert.equal(filter().length, 1);
  assert.equal(filter({ surveyId: "other" }).length, 0);
  assert.equal(filter({ professionalIds: [] }).length, 0);
  assert.equal(filter({ serviceIds: [] }).length, 0);
  assert.equal(filter({ serviceIds: ["svc-2"] }).length, 0);
  assert.equal(
    filter({ professionalIds: ["other", "opatra-cabina-1"] }).length,
    1,
  );
  assert.equal(
    filter({}, [
      { ...delivery, sentAt: "2026-05-31" },
      { ...delivery, sentAt: "2026-07-01" },
    ]).length,
    0,
  );
});

test("ratings ignore missing, out-of-range and non-integer values", () => {
  const result = summarizeRatings([5, 4, 1, 0, -1, 6, 4.5, NaN, Infinity]);
  assert.equal(result.count, 3);
  assert.equal(result.average, 10 / 3);
  assert.equal(result.distribution[0].rating, 5);
  assert.equal(result.distribution[0].count, 1);
  assert.equal(result.distribution[4].rating, 1);
  assert.equal(summarizeRatings([]).average, 0);
});

test("partial responses use actual answers, not zeroes for unanswered questions", () => {
  const records = [
    {
      ...delivery,
      respondedAt: "2026-06-30",
      ratings: { "question-quality": 5, "question-punctuality": 3, unknown: 1 },
    },
    { ...delivery, id: "second", ratings: { "question-quality": 1 } },
  ];
  const report = buildSurveyReport(survey, records);
  assert.equal(report.sent, 2);
  assert.equal(report.responded, 1);
  assert.equal(report.responseRate, 50);
  assert.equal(report.count, 2);
  assert.equal(report.average, 4);
  assert.equal(report.categories[0].average, 5);
  assert.equal(report.categories[1].questions[0].average, 3);
  assert.equal(report.categories[2].count, 0);
});

test("category scores aggregate multiple questions; text questions are not star scores", () => {
  const questions = [
    { id: "a", category: "Calidad", type: "rating", text: "First" },
    { id: "b", category: "Calidad", type: "rating", text: "Second" },
    { id: "c", category: "Calidad", type: "comment", text: "Comment" },
  ];
  const report = buildSurveyReport(
    { ...survey, questionIds: ["a", "b", "c", "missing"] },
    [{ ...delivery, respondedAt: "2026-06-30", ratings: { a: 5, b: 3, c: 1 } }],
    questions,
  );
  assert.equal(report.categories.length, 1);
  assert.equal(report.categories[0].questions.length, 2);
  assert.equal(report.categories[0].average, 4);
});

test("empty filtered reports retain questions and never divide by zero", () => {
  const report = buildSurveyReport(survey, []);
  assert.equal(report.sent, 0);
  assert.equal(report.responseRate, 0);
  assert.equal(report.average, 0);
  assert.equal(report.categories.length, 6);
});

test("CSV matches current filters and escapes quotes and spreadsheet formulas", () => {
  const report = buildSurveyReport(survey, []);
  const csv = surveyReportCsv(
    { ...survey, name: '=HYPERLINK("bad")' },
    report,
    filters,
  );
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"Encuestas enviadas","0"'));
  assert.ok(csv.includes('"Desde","2026-06-01"'));
  assert.ok(csv.includes('"Datos de demostración"'));
  assert.ok(
    csv.includes("¿Cómo calificarías la puntualidad del servicio recibido?"),
  );
});
