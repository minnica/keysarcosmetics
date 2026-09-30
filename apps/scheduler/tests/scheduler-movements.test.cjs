const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { test } = require("node:test");

const helperPath = path.resolve(
  __dirname,
  "../src/components/api/scheduler-movement-export.ts",
);

function movement(overrides) {
  return {
    id: overrides.id,
    actorId: overrides.actorId,
    actor: overrides.actorId === "agent-b" ? "Agente B" : "Agente A",
    actorRole: "Especialista",
    actorSource: "POS_CRM",
    action: `Movimiento ${overrides.id}`,
    purpose: "APPOINTMENT_STATUS_CHANGE",
    targetType: "appointment",
    targetId: overrides.id,
    createdAt: overrides.createdAt,
    metadata: {},
  };
}

test("agrupa por agente y día local sin mezclar movimientos", async () => {
  const { groupDesignMovements } = await import(pathToFileURL(helperPath).href);
  const groups = groupDesignMovements([
    movement({
      id: "late",
      actorId: "agent-a",
      createdAt: "2026-10-01T05:30:00.000Z",
    }),
    movement({
      id: "early",
      actorId: "agent-a",
      createdAt: "2026-09-30T06:30:00.000Z",
    }),
    movement({
      id: "next-day",
      actorId: "agent-a",
      createdAt: "2026-10-01T06:30:00.000Z",
    }),
    movement({
      id: "other-agent",
      actorId: "agent-b",
      createdAt: "2026-10-01T05:30:00.000Z",
    }),
  ]);

  assert.equal(groups.length, 3);
  const sameDay = groups.find((group) => group.id === "agent-a:2026-09-30");
  assert.ok(sameDay);
  assert.deepEqual(
    sameDay.movements.map((item) => item.id),
    ["late", "early"],
  );
  assert.equal(sameDay.firstActivityAt, "2026-09-30T06:30:00.000Z");
  assert.equal(sameDay.lastActivityAt, "2026-10-01T05:30:00.000Z");
});

test("mantiene la generación de Excel fuera del bundle inicial", () => {
  const source = readFileSync(helperPath, "utf8");
  assert.match(source, /await import\("xlsx"\)/);
  assert.doesNotMatch(source, /^import .* from ["']xlsx["']/m);
  assert.match(source, /"Resumen por agente"/);
  assert.match(source, /"Detalle"/);
});
