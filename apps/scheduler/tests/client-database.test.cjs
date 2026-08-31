const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Load the small, pure TypeScript modules without adding a test dependency.
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

const { initialSchedulerClients } = loadSource("mock-client-data");
const { schedulerDayBookings } = loadSource("mock-scheduler-data");
const { emptyClientFilters, filterClientDatabase, sortClientDatabase } =
  loadSource("client-database");
const filter = (
  query = "",
  values = {},
  clients = initialSchedulerClients,
  bookings = schedulerDayBookings,
  referenceDate,
) =>
  filterClientDatabase(
    clients,
    query,
    { ...emptyClientFilters, ...values },
    bookings,
    referenceDate,
  );

test("preserves all existing clients with no filters", () => {
  assert.equal(filter().length, 4);
  assert.equal(filter()[0].id, initialSchedulerClients[0].id);
});

test("searches names without accents and preserves aliases", () => {
  assert.equal(filter("MARIA CAMILA")[0].id, "client-maria-camila");
  assert.equal(filter("  patricia  ").length, 1);
});

test("searches formatted phone numbers, email and official identification", () => {
  assert.equal(filter("+52 (55) 5100-0280")[0].id, "client-patricia-delgado");
  assert.equal(filter("yumi@example.com")[0].id, "client-yumi-hirasawa");
  const client = {
    ...initialSchedulerClients[0],
    officialId: "ABC-123",
    alternateEmails: ["second@example.com"],
  };
  assert.equal(filter("abc-123", {}, [client]).length, 1);
  assert.equal(filter("second@example.com", {}, [client]).length, 1);
  assert.equal(filter("missing123@example.com", {}, [client]).length, 0);
});

test("filters by branch, professional, service and reservation status", () => {
  assert.equal(filter("", { branch: "galerias-insurgentes" }).length, 2);
  assert.equal(filter("", { branch: "keysar-reforma" }).length, 0);
  assert.equal(
    filter("", {
      professional: "opatra-cabina-1",
      service: "FACIAL PREMIUM",
      status: "arrived",
    })[0].id,
    "client-patricia-delgado",
  );
});

test("does not combine filters across different bookings", () => {
  const client = { ...initialSchedulerClients[0], history: [] };
  const bookings = [
    {
      id: "a",
      clientId: client.id,
      branchId: "one",
      professionalId: "first",
      serviceName: "Facial",
      status: "arrived",
    },
    {
      id: "b",
      clientId: client.id,
      branchId: "two",
      professionalId: "second",
      serviceName: "Massage",
      status: "reserved",
    },
  ];
  assert.equal(
    filter("", { branch: "one", service: "Massage" }, [client], bookings)
      .length,
    0,
  );
  assert.equal(
    filter("", { branch: "two", service: "Massage" }, [client], bookings)
      .length,
    1,
  );
});

test("distinguishes clients with and without reservations", () => {
  assert.equal(filter("", { hasBooked: "yes" }).length, 4);
  assert.equal(filter("", { hasBooked: "no" }).length, 0);
  const client = {
    ...initialSchedulerClients[0],
    id: "new-client",
    history: [],
  };
  assert.equal(filter("", { hasBooked: "no" }, [client]).length, 1);
});

test("missing demographic data never becomes inferred data", () => {
  const client = {
    ...initialSchedulerClients[0],
    gender: undefined,
    birthDate: undefined,
    createdAt: undefined,
  };
  assert.equal(filter("", { gender: "female" }, [client]).length, 0);
  assert.equal(filter("", { birthdayFrom: "2026-01-01" }, [client]).length, 0);
  assert.equal(filter("", { createdFrom: "2026-01-01" }, [client]).length, 0);
});

test("filters upcoming birthdays from the current calendar day", () => {
  const referenceDate = new Date(2026, 7, 29);
  assert.equal(
    filter(
      "",
      { upcomingBirthdayDays: "7" },
      initialSchedulerClients,
      schedulerDayBookings,
      referenceDate,
    ).length,
    1,
  );
  assert.equal(
    filter(
      "",
      { upcomingBirthdayDays: "30" },
      initialSchedulerClients,
      schedulerDayBookings,
      referenceDate,
    ).length,
    3,
  );
});

test("filters clients with no recent activity and includes new leads", () => {
  const referenceDate = new Date(2026, 7, 29);
  const lead = {
    ...initialSchedulerClients[0],
    id: "client-without-activity",
    history: [],
  };
  assert.equal(
    filter(
      "",
      { inactiveDays: "60" },
      initialSchedulerClients,
      schedulerDayBookings,
      referenceDate,
    ).length,
    1,
  );
  assert.equal(
    filter("", { inactiveDays: "60" }, [lead], [], referenceDate).length,
    1,
  );
});

test("birthdays ignore birth year and allow a range crossing New Year", () => {
  const client = { ...initialSchedulerClients[0], birthDate: "1990-01-05" };
  assert.equal(
    filter("", { birthdayFrom: "2026-12-01", birthdayTo: "2026-01-10" }, [
      client,
    ]).length,
    1,
  );
  assert.equal(
    filter("", { birthdayFrom: "2026-02-01", birthdayTo: "2026-12-01" }, [
      client,
    ]).length,
    0,
  );
});

test("creation date ranges are inclusive and combine with gender", () => {
  const client = {
    ...initialSchedulerClients[0],
    createdAt: "2026-08-26",
    gender: "female",
  };
  assert.equal(
    filter(
      "",
      { createdFrom: "2026-08-26", createdTo: "2026-08-26", gender: "female" },
      [client],
    ).length,
    1,
  );
  assert.equal(filter("", { createdTo: "2026-08-25" }, [client]).length, 0);
});

test("sorts both ways without mutating the source", () => {
  assert.equal(
    sortClientDatabase(initialSchedulerClients, {
      key: "fullName",
      direction: "asc",
    })[0].fullName,
    "Adriana Acosta",
  );
  assert.equal(
    sortClientDatabase(initialSchedulerClients, {
      key: "fullName",
      direction: "desc",
    })[0].fullName,
    "Yumi Hirasawa",
  );
  assert.equal(initialSchedulerClients[0].fullName, "Patricia Delgado");
  assert.equal(
    sortClientDatabase(initialSchedulerClients, {
      key: "officialId",
      direction: "asc",
    }).length,
    4,
  );
});
