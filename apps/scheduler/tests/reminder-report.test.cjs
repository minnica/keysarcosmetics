const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function loadSource(name) {
  const source = readFileSync(
    path.join(__dirname, "../src/lib", name + ".ts"),
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
  return exported;
}
const {
  filterReminderReservations,
  summarizeReminders,
  demoReminderMessages,
  defaultReminderPeriod,
} = loadSource("reminder-report");
const { reservationHistory } = loadSource("mock-reservation-report-data");
const reservation = (id, status, amount) => ({
  id,
  status,
  amount,
  performedAt: "2026-08-05T10:00:00",
  client: "Demo",
  service: "Demo",
  provider: "Demo",
  branch: "Demo",
});
const records = [
  reservation("a", "confirmed", 100),
  reservation("b", "attended", 200),
  reservation("c", "reserved", 300),
  reservation("d", "canceled", 400),
];

test("default period filters existing reservation data inclusively", () => {
  const result = filterReminderReservations(
    reservationHistory,
    defaultReminderPeriod.from,
    defaultReminderPeriod.to,
  );
  assert.equal(result.length, 35);
  assert.ok(
    result.every((item) => item.performedAt.slice(0, 10) >= "2026-08-05"),
  );
  assert.equal(
    filterReminderReservations(records, "2026-08-05", "2026-08-05").length,
    4,
  );
});
test("invalid or empty periods yield no records", () => {
  assert.equal(filterReminderReservations(records, "", "2026-08-05").length, 0);
  assert.equal(
    filterReminderReservations(records, "2026-08-06", "2026-08-05").length,
    0,
  );
  assert.equal(
    filterReminderReservations(records, "2026-08-06", "2026-09-05").length,
    0,
  );
});
test("confirmed includes attended reservations, not canceled or unconfirmed amounts", () => {
  const result = summarizeReminders(records, []);
  assert.equal(result.reserved, 4);
  assert.equal(result.confirmed, 2);
  assert.equal(result.attended, 1);
  assert.equal(result.revenue, 300);
  assert.equal(result.rate, 50);
});
test("demo never infers sends or failures from existing bookings", () => {
  const result = summarizeReminders(records, demoReminderMessages);
  assert.equal(demoReminderMessages.length, 0);
  for (const channel of [result.email, result.whatsapp]) {
    assert.equal(channel.sent, 0);
    assert.equal(channel.confirmed, 0);
    assert.equal(channel.failures.length, 0);
  }
});
test("email and WhatsApp failures stay in their respective tabs", () => {
  const result = summarizeReminders(records, [
    {
      id: "one",
      reservationId: "a",
      channel: "email",
      status: "not-sent",
      reason: "Sin correo",
    },
    {
      id: "two",
      reservationId: "b",
      channel: "whatsapp",
      status: "not-sent",
      reason: "Sin teléfono",
    },
    {
      id: "other",
      reservationId: "outside-period",
      channel: "email",
      status: "not-sent",
    },
  ]);
  assert.equal(result.email.failures.length, 1);
  assert.equal(result.whatsapp.failures.length, 1);
  assert.equal(result.email.failures[0].reason, "Sin correo");
  assert.equal(result.whatsapp.failures[0].reservation.id, "b");
});
test("repeated confirmations do not duplicate reservation income", () => {
  const result = summarizeReminders(records, [
    { id: "one", reservationId: "a", channel: "email", status: "confirmed" },
    { id: "two", reservationId: "a", channel: "email", status: "confirmed" },
    { id: "three", reservationId: "b", channel: "whatsapp", status: "sent" },
  ]);
  assert.equal(result.email.sent, 2);
  assert.equal(result.email.confirmed, 1);
  assert.equal(result.email.revenue, 100);
  assert.equal(result.email.rate, 25);
  assert.equal(result.whatsapp.sent, 1);
  assert.equal(result.whatsapp.confirmed, 0);
});
test("empty periods have finite zero-valued metrics", () => {
  const result = summarizeReminders([], []);
  assert.equal(result.revenue, 0);
  assert.equal(result.rate, 0);
  assert.equal(result.email.rate, 0);
  assert.equal(result.whatsapp.rate, 0);
});
