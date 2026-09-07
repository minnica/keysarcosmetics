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
  vm.runInNewContext(outputText, { exports: exported, Intl, Date, Set });
  return exported;
}

const {
  adaptSchedulerAppointment,
  adaptSchedulerBlock,
  buildSchedulerAgendaPresentation,
  buildSchedulerCanonicalOperatingHours,
  buildSchedulerVisualBookings,
} = loadSource("scheduler-agenda-presentation");
const {
  buildSchedulerAgendaRange,
  loadAllSchedulerAppointments,
  schedulerLocalDateTimeToInstant,
} = loadSource("scheduler-agenda-data");
const {
  buildSchedulerQueryScope,
  schedulerQueryMatchesInvalidation,
  shouldAcceptSchedulerResponse,
} = loadSource("scheduler-query-scope");

const service = (overrides = {}) => ({
  id: "appointment-service-1",
  sequence: 1,
  serviceProfileId: "service-1",
  serviceName: "Facial premium",
  serviceVersion: 4,
  durationMinutes: 60,
  preparationMinutes: 10,
  cleanupMinutes: 5,
  capacityUnits: 1,
  startsAt: "2026-09-07T04:30:00.000Z",
  endsAt: "2026-09-07T05:30:00.000Z",
  occupiesFrom: "2026-09-07T04:20:00.000Z",
  occupiesUntil: "2026-09-07T05:35:00.000Z",
  professionals: [
    {
      professionalProfileId: "professional-1",
      name: "Renata Castillo",
      role: "PRIMARY",
    },
  ],
  resources: [
    { resourceId: "resource-1", name: "Cabina 1", units: 1, exclusive: true },
  ],
  membership: {
    membershipId: "membership-1",
    name: "Plan facial",
    status: "RESERVED",
  },
  ...overrides,
});

const appointment = (overrides = {}) => ({
  id: "appointment-1",
  branchId: "branch-1",
  branchProfileId: "branch-profile-1",
  branchName: "Mítikah",
  customerId: "customer-1",
  customerName: "María Camila Celis",
  status: "ARRIVED",
  origin: "SCHEDULER",
  timezone: "America/Mexico_City",
  startsAt: "2026-09-07T04:30:00.000Z",
  endsAt: "2026-09-07T05:30:00.000Z",
  notes: null,
  cancellationReason: null,
  version: 7,
  services: [service()],
  stateHistory: [],
  createdAt: "2026-09-01T15:00:00.000Z",
  updatedAt: "2026-09-06T15:00:00.000Z",
  ...overrides,
});

test("converts instants with the branch timezone across midnight", () => {
  const result = adaptSchedulerAppointment(appointment());
  assert.equal(result.localDate, "2026-09-06");
  assert.equal(result.localStart, "22:30");
  assert.equal(result.localEnd, "23:30");
  assert.equal(result.statusLabel, "Llegó");
});

test("keeps ARRIVED and ATTENDED as different presentation states", () => {
  assert.equal(adaptSchedulerAppointment(appointment()).statusLabel, "Llegó");
  assert.equal(
    adaptSchedulerAppointment(appointment({ status: "ATTENDED" })).statusLabel,
    "Atendida",
  );
});

test("preserves multi-service participants, resources, membership and versions", () => {
  const second = service({
    id: "appointment-service-2",
    sequence: 2,
    serviceProfileId: "service-2",
    serviceName: "Masaje",
    serviceVersion: 9,
    professionals: [
      {
        professionalProfileId: "professional-2",
        name: "Camila Torres",
        role: "SUPPORT",
      },
    ],
    resources: [],
    membership: null,
  });
  const source = appointment({ services: [second, service()] });
  const result = adaptSchedulerAppointment(source);
  assert.deepEqual(Array.from(result.columnIds), [
    "professional:professional-2",
    "professional:professional-1",
    "resource:resource-1",
  ]);
  assert.equal(result.services[0].id, "appointment-service-1");
  assert.equal(result.services[1].serviceVersion, 9);
  assert.equal(result.services[0].membership.membershipId, "membership-1");
  assert.equal(result.version, 7);
  assert.equal(result.canonical, source);
});

test("represents absent contact, avatar and price explicitly", () => {
  const result = adaptSchedulerAppointment(appointment());
  assert.deepEqual(
    { ...result.contact },
    { phone: null, email: null, avatarUrl: null },
  );
  assert.equal(result.totalPrice, null);
});

test("keeps professional and resource blocks distinct", () => {
  const source = {
    id: "block-1",
    branchId: "branch-1",
    branchProfileId: "branch-profile-1",
    professionalProfileId: "professional-1",
    resourceId: "resource-1",
    startsAt: "2026-09-06T15:00:00.000Z",
    endsAt: "2026-09-06T16:00:00.000Z",
    timezone: "America/Mexico_City",
    reason: "Mantenimiento",
    status: "ACTIVE",
    version: 3,
    createdAt: "2026-09-01T15:00:00.000Z",
    canceledAt: null,
  };
  const result = adaptSchedulerBlock(source);
  assert.deepEqual(Array.from(result.columnIds), [
    "professional:professional-1",
    "resource:resource-1",
  ]);
  assert.equal(result.canonical, source);
});

test("builds typed columns without turning resources into professionals", () => {
  const catalog = {
    commerces: [],
    branches: [{ id: "branch-profile-1", branchId: "branch-1" }],
    professionals: [
      {
        id: "professional-1",
        name: "Renata",
        active: true,
        branchProfileIds: ["branch-profile-1"],
      },
    ],
    resources: [
      {
        id: "resource-1",
        name: "Cabina 1",
        active: true,
        branchProfileId: "branch-profile-1",
      },
    ],
    services: [],
    specialties: [],
    groups: [],
    professionalServices: [],
    resourceRequirements: [],
    availabilityRules: [],
    availabilityExceptions: [],
  };
  const result = buildSchedulerAgendaPresentation({
    catalog,
    branchId: "branch-1",
    appointments: [appointment()],
    blocks: [],
  });
  assert.equal(result.columns[0].kind, "PROFESSIONAL");
  assert.equal(result.columns[1].kind, "RESOURCE");
});

test("projects one canonical appointment into its professional and resource columns", () => {
  const presentation = buildSchedulerAgendaPresentation({
    catalog: {
      commerces: [],
      branches: [{ id: "branch-profile-1", branchId: "branch-1" }],
      professionals: [
        {
          id: "professional-1",
          name: "Renata",
          active: true,
          branchProfileIds: ["branch-profile-1"],
        },
      ],
      resources: [
        {
          id: "resource-1",
          name: "Cabina 1",
          active: true,
          branchProfileId: "branch-profile-1",
        },
      ],
      services: [],
      specialties: [],
      groups: [],
      professionalServices: [],
      resourceRequirements: [],
      availabilityRules: [],
      availabilityExceptions: [],
    },
    branchId: "branch-1",
    appointments: [appointment()],
    blocks: [],
  });
  const bookings = buildSchedulerVisualBookings(presentation);
  assert.equal(bookings.length, 2);
  assert.equal(bookings[0].sourceId, "appointment-1");
  assert.equal(bookings[0].status, "arrived");
  assert.deepEqual(
    bookings.map((item) => item.professionalId),
    ["professional:professional-1", "resource:resource-1"],
  );
});

test("derives the visible calendar window from canonical branch rules and closures", () => {
  const monday = new Date("2026-09-07T12:00:00");
  const result = buildSchedulerCanonicalOperatingHours(
    {
      branches: [
        {
          id: "branch-profile-1",
          branchId: "branch-1",
          commerceId: "commerce-1",
        },
      ],
      availabilityRules: [
        {
          id: "rule-1",
          branchProfileId: "branch-profile-1",
          ownerType: "BRANCH",
          ownerId: "branch-profile-1",
          kind: "WORKING",
          weekday: "MONDAY",
          startMinute: 480,
          endMinute: 1080,
          effectiveTo: null,
        },
      ],
      availabilityExceptions: [
        {
          id: "exception-1",
          branchProfileId: "branch-profile-1",
          ownerType: "BRANCH",
          ownerId: "branch-profile-1",
          kind: "UNAVAILABLE",
          date: "2026-09-07",
          startMinute: null,
          endMinute: null,
          effectiveTo: null,
        },
      ],
    },
    "branch-1",
    [monday],
  );
  const mondaySchedule = result.schedule.find((day) => day.day === "Lunes");
  assert.equal(mondaySchedule.enabled, false);
});

test("loads every appointment page in the visible range", async () => {
  const requestedPages = [];
  const items = await loadAllSchedulerAppointments(
    async ({ page, pageSize }) => {
      requestedPages.push(page);
      const count = page === 3 ? 25 : pageSize;
      return {
        items: Array.from({ length: count }, (_, index) => ({
          id: `${page}-${index}`,
        })),
        page,
        pageSize,
        total: 225,
      };
    },
    {
      branchId: "branch-1",
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-10T00:00:00.000Z",
    },
  );
  assert.equal(items.length, 225);
  assert.deepEqual(requestedPages, [1, 2, 3]);
});

test("builds a complete Monday-to-Sunday range with UTC guards", () => {
  const result = buildSchedulerAgendaRange(
    new Date("2026-09-09T12:00:00"),
    "week",
  );
  assert.deepEqual(Array.from(result.visibleDateKeys), [
    "2026-09-07",
    "2026-09-08",
    "2026-09-09",
    "2026-09-10",
    "2026-09-11",
    "2026-09-12",
    "2026-09-13",
  ]);
  assert.equal(result.from, "2026-09-06T00:00:00.000Z");
  assert.equal(result.to, "2026-09-15T00:00:00.000Z");
});

test("converts a branch-local block time to its UTC instant", () => {
  assert.equal(
    schedulerLocalDateTimeToInstant(
      "2026-09-07",
      "09:30",
      "America/Mexico_City",
    ),
    "2026-09-07T15:30:00.000Z",
  );
});

test("query scopes separate users, branches and filters", () => {
  const base = { queryKey: "agenda", dependencies: ["2026-09-06", "ALL"] };
  const first = buildSchedulerQueryScope({
    ...base,
    sessionKey: "user-1",
    branchId: "branch-1",
  });
  assert.notEqual(
    first,
    buildSchedulerQueryScope({
      ...base,
      sessionKey: "user-2",
      branchId: "branch-1",
    }),
  );
  assert.notEqual(
    first,
    buildSchedulerQueryScope({
      ...base,
      sessionKey: "user-1",
      branchId: "branch-2",
    }),
  );
  assert.notEqual(
    first,
    buildSchedulerQueryScope({
      ...base,
      sessionKey: "user-1",
      branchId: "branch-1",
      dependencies: ["2026-09-07", "ALL"],
    }),
  );
});

test("rejects stale responses and targets invalidation by prefix", () => {
  assert.equal(
    shouldAcceptSchedulerResponse({
      request: 1,
      currentRequest: 2,
      requestScope: "a",
      currentScope: "a",
    }),
    false,
  );
  assert.equal(
    shouldAcceptSchedulerResponse({
      request: 2,
      currentRequest: 2,
      requestScope: "a",
      currentScope: "b",
    }),
    false,
  );
  assert.equal(
    shouldAcceptSchedulerResponse({
      request: 2,
      currentRequest: 2,
      requestScope: "a",
      currentScope: "a",
    }),
    true,
  );
  assert.equal(
    schedulerQueryMatchesInvalidation("agenda:availability", ["agenda"]),
    true,
  );
  assert.equal(schedulerQueryMatchesInvalidation("reports", ["agenda"]), false);
});
