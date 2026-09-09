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
  vm.runInNewContext(outputText, { exports: exported, Number, Error });
  return exported;
}

const {
  buildSchedulerAvailabilityDraft,
  buildSchedulerAvailabilityRules,
  schedulerMinutesToTime,
  schedulerTimeToMinutes,
  toggleSchedulerRelation,
} = loadSource("scheduler-administration-presentation");

test("maps canonical working and break rules into the seven-day editor", () => {
  const result = buildSchedulerAvailabilityDraft(
    [
      {
        ownerType: "PROFESSIONAL",
        ownerId: "professional-1",
        branchProfileId: "branch-1",
        weekday: "MONDAY",
        kind: "WORKING",
        startMinute: 480,
        endMinute: 1020,
        effectiveTo: null,
      },
      {
        ownerType: "PROFESSIONAL",
        ownerId: "professional-1",
        branchProfileId: "branch-1",
        weekday: "MONDAY",
        kind: "BREAK",
        startMinute: 780,
        endMinute: 840,
        effectiveTo: null,
      },
      {
        ownerType: "PROFESSIONAL",
        ownerId: "another-professional",
        branchProfileId: "branch-1",
        weekday: "MONDAY",
        kind: "WORKING",
        startMinute: 0,
        endMinute: 60,
        effectiveTo: null,
      },
      {
        ownerType: "PROFESSIONAL",
        ownerId: "professional-1",
        branchProfileId: "branch-2",
        weekday: "TUESDAY",
        kind: "WORKING",
        startMinute: 0,
        endMinute: 60,
        effectiveTo: null,
      },
    ],
    "PROFESSIONAL",
    "professional-1",
    "branch-1",
  );
  assert.equal(result.length, 7);
  assert.deepEqual(
    { ...result[0] },
    {
      weekday: "MONDAY",
      enabled: true,
      start: "08:00",
      end: "17:00",
      breakEnabled: true,
      breakStart: "13:00",
      breakEnd: "14:00",
    },
  );
  assert.equal(result[1].enabled, false);
});

test("builds canonical rules and validates breaks against working hours", () => {
  const days = buildSchedulerAvailabilityDraft([], "BRANCH", "branch-1");
  days[0] = {
    ...days[0],
    enabled: true,
    start: "09:00",
    end: "18:00",
    breakEnabled: true,
    breakStart: "14:00",
    breakEnd: "15:00",
  };
  assert.deepEqual(
    JSON.parse(JSON.stringify(buildSchedulerAvailabilityRules(days))),
    [
      {
        kind: "WORKING",
        weekday: "MONDAY",
        startMinute: 540,
        endMinute: 1080,
      },
      {
        kind: "BREAK",
        weekday: "MONDAY",
        startMinute: 840,
        endMinute: 900,
      },
    ],
  );

  days[0].breakStart = "08:00";
  assert.throws(
    () => buildSchedulerAvailabilityRules(days),
    /dentro del horario de trabajo/,
  );
});

test("converts boundary times and toggles canonical relations", () => {
  assert.equal(schedulerMinutesToTime(1440), "24:00");
  assert.equal(schedulerTimeToMinutes("24:00"), 1440);
  assert.ok(Number.isNaN(schedulerTimeToMinutes("24:30")));
  assert.deepEqual(Array.from(toggleSchedulerRelation(["a", "b"], "b")), ["a"]);
  assert.deepEqual(Array.from(toggleSchedulerRelation(["a"], "c")), ["a", "c"]);
});
