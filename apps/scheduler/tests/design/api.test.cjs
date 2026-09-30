const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const ts = require("typescript");

// Compila los módulos fuente para probar el mismo mock que usa el navegador.
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(outputText, filename);
};
const {
  createDesignState,
  designDemoAccounts,
  designOrigin,
  designBootstrap,
  designSessionToken,
} = require("../../design/store.ts");
const { handleDesignRequest } = require("../../design/api.ts");
const { createSchedulerApiClient } = require("@cosmetics/api-client");
const { http, HttpResponse } = require("msw");
const { setupServer } = require("msw/node");

function session(scenario = "normal", role = "master") {
  const state = createDesignState({ role, scenario, date: "2026-09-29" });
  function request(method, path, body = {}, extraHeaders = {}) {
    return handleDesignRequest(state, {
      method,
      url: new URL(path, designOrigin),
      body,
      headers: new Headers({
        authorization: `Bearer ${designSessionToken(state.controls.accountId)}`,
        ...extraHeaders,
      }),
    });
  }
  return { state, request };
}

test("las tres cuentas demo conservan identidad, alcance y códigos personales", () => {
  const { state, request } = session();
  const expectations = [
    {
      email: "master@example.test",
      accountId: "full-master",
      code: "0000",
      fullAccess: true,
    },
    {
      email: "operations@example.test",
      accountId: "full-operations",
      code: "3333",
      fullAccess: true,
    },
    {
      email: "limited@example.test",
      accountId: "limited-polanco",
      code: "4444",
      fullAccess: false,
    },
  ];

  assert.equal(designDemoAccounts.length, 3);
  for (const expected of expectations) {
    const login = request("POST", "/api/auth/login", {
      email: expected.email,
      password: "demo",
    });
    assert.equal(login.status, 201);
    assert.equal(login.body.data.token, designSessionToken(expected.accountId));
    const bootstrap = request("GET", "/api/scheduler/bootstrap").body.data;
    assert.equal(bootstrap.user.email, expected.email);
    assert.equal(bootstrap.canManageAccess, expected.fullAccess);
    assert.equal(
      bootstrap.authorizedBranchIds.length,
      expected.fullAccess ? state.catalog.branches.length : 1,
    );
    assert.equal(
      request("GET", "/api/scheduler/administration/catalog").status,
      expected.fullAccess ? 200 : 403,
    );
    assert.equal(
      request("POST", "/api/scheduler/authorizations", {
        secret: expected.code,
        purpose: "CLIENT_RECORD_VIEW",
        targetId: state.customers[0].id,
      }).status,
      201,
    );
  }
});

test("una sesión o código de otro usuario no autoriza movimientos", () => {
  const { state, request } = session();
  request("POST", "/api/auth/login", {
    email: "operations@example.test",
    password: "demo",
  });
  assert.equal(
    request("POST", "/api/scheduler/authorizations", {
      secret: "0000",
      purpose: "CLIENT_RECORD_VIEW",
      targetId: state.customers[0].id,
    }).status,
    403,
  );
  const previousToken = designSessionToken("full-operations");
  request("POST", "/api/auth/login", {
    email: "master@example.test",
    password: "demo",
  });
  const response = handleDesignRequest(state, {
    method: "GET",
    url: new URL("/api/scheduler/bootstrap", designOrigin),
    body: {},
    headers: new Headers({ authorization: `Bearer ${previousToken}` }),
  });
  assert.equal(response.status, 401);
});

test("el cliente Axios real funciona con MSW sin servidor ni credenciales reales", async () => {
  const { state } = session();
  const server = setupServer(
    http.all(`${designOrigin}/api/*`, async ({ request }) => {
      const body = request.method === "GET" ? {} : await request.json();
      const reply = handleDesignRequest(state, {
        method: request.method,
        url: new URL(request.url),
        body,
        headers: request.headers,
      });
      return HttpResponse.json(reply.body, { status: reply.status });
    }),
  );
  server.listen({ onUnhandledRequest: "error" });
  let token = null;
  const client = createSchedulerApiClient(designOrigin, {
    getAccessToken: () => token,
    setAccessToken: (value) => {
      token = value;
    },
  });
  try {
    const bootstrap = await client.login("master@example.test", "demo");
    assert.equal(bootstrap.user.role, "SUPER_ADMIN");
    const catalog = await client.operationalCatalog();
    assert.ok(catalog.branches.length > 0);
    const input = {
      branchId: catalog.branches[0].branchId,
      serviceProfileId: catalog.services[0].id,
      professionalProfileId: catalog.professionals[0].id,
      date: state.controls.date,
    };
    const available = await client.availability(input);
    assert.ok(available.slots.length > 0);
    const slot = available.slots[0];
    const create = {
      branchId: input.branchId,
      customerId: state.customers[0].id,
      startsAt: slot.startsAt,
      services: [
        {
          serviceProfileId: input.serviceProfileId,
          professionalProfileIds: [input.professionalProfileId],
          resourceIds: slot.resourceIds,
        },
      ],
    };
    const appointment = await client.createAppointment(
      create,
      "test-reservation",
    );
    const replay = await client.createAppointment(create, "test-reservation");
    assert.equal(replay.id, appointment.id);
    assert.equal(
      state.appointments.filter((item) => item.id === appointment.id).length,
      1,
    );
    assert.equal(
      (await client.availability(input)).slots.some(
        (item) => item.startsAt === slot.startsAt,
      ),
      false,
    );
    await assert.rejects(
      client.createAppointment(create, "second-reservation"),
      (error) => error.response.status === 409,
    );
    await assert.rejects(
      client.updateAppointment(appointment.id, {
        ...create,
        expectedVersion: 99,
      }),
      (error) => error.response.status === 409,
    );
    await client.cancelAppointment(appointment.id, {
      expectedVersion: appointment.version,
      reason: "Prueba de cancelación",
    });
    assert.equal(
      (await client.availability(input)).slots.some(
        (item) => item.startsAt === slot.startsAt,
      ),
      true,
    );
    const added = await client.createCustomer({
      branchId: input.branchId,
      displayName: "Cliente de prueba",
      phone: "5550000099",
    });
    assert.equal(
      (await client.searchCustomers({ query: "Cliente de prueba" })).items[0]
        .id,
      added.id,
    );
    await assert.rejects(
      client.createCustomer({
        branchId: input.branchId,
        displayName: "Duplicado",
        phone: "555 000 0099",
      }),
      (error) => error.response.data.code === "PHONE_DUPLICATE",
    );
    const authorization = await client.createAuthorization({
      secret: "0000",
      purpose: "CLIENT_RECORD_VIEW",
      screenKey: "scheduler/clients",
      targetId: added.id,
    });
    assert.equal(
      (await client.customerDetail(added.id, authorization.token)).displayName,
      "Cliente de prueba",
    );
    await assert.rejects(
      client.customerDetail(added.id, authorization.token),
      (error) => error.response.status === 403,
    );
    client.logout();
    assert.equal(token, null);
    await assert.rejects(
      client.bootstrap(),
      (error) => error.response.status === 401,
    );
  } finally {
    server.close();
  }
});

test("los perfiles restringen escrituras y sucursales también en el mock HTTP", () => {
  const { state, request } = session("normal", "read-only");
  assert.equal(
    request("POST", "/api/scheduler/clients", {
      branchId: state.catalog.branches[0].branchId,
      displayName: "Sin permiso",
    }).status,
    403,
  );
  assert.equal(
    request("GET", "/api/scheduler/appointments?branchId=otra").status,
    403,
  );
  assert.equal(
    request("GET", "/api/scheduler/operations/candidates").status,
    403,
  );
  state.controls.role = "specialist";
  const ownId = state.catalog.professionals[0].id;
  const visible = request("GET", "/api/scheduler/appointments").body.data.items;
  assert.ok(
    visible.every((item) =>
      item.services.some((line) =>
        line.professionals.some(
          (person) => person.professionalProfileId === ownId,
        ),
      ),
    ),
  );
  assert.equal(designBootstrap(state).selfProfessionalOnly, true);
  assert.equal(request("POST", "/api/scheduler/clients/merge").status, 403);
});

test("los ajustes conservan capas independientes y las descargas reflejan clientes editados", () => {
  const { state, request } = session();
  const commerceId = state.catalog.commerces[0].id,
    branchProfileId = state.catalog.branches[0].id;
  const endpoint = "/api/scheduler/administration/settings/company";
  assert.equal(
    request("PUT", endpoint, {
      scope: "BRANCH",
      commerceId,
      branchProfileId,
      expectedVersion: 1,
      document: { companyName: "Sucursal demo" },
    }).status,
    200,
  );
  const result = request(
    "GET",
    `${endpoint}/resolved?commerceId=${commerceId}&branchProfileId=${branchProfileId}`,
  ).body.data;
  assert.equal(result.layers[1].document.companyName, "Sucursal demo");
  assert.equal(result.layers[0].document.companyName, "Keysar Cosmetics");
  const id = state.customers[0].id;
  assert.equal(
    request("PUT", `/api/scheduler/clients/${id}`, {
      branchId: state.catalog.branches[0].branchId,
      displayName: "Nombre actualizado",
      expectedVersion: 1,
    }).status,
    200,
  );
  const token = request("POST", "/api/scheduler/authorizations", {
    secret: "0000",
    purpose: "SENSITIVE_EXPORT",
  }).body.data.token;
  const exported = request(
    "GET",
    "/api/scheduler/exports/CUSTOMERS",
    {},
    { "x-scheduler-authorization": token },
  );
  assert.equal(exported.body.data.rows[0].Cliente, "Nombre actualizado");
  assert.ok(
    state.movements.some((item) => item.action.includes("/exports/CUSTOMERS")),
  );
  assert.ok(
    state.movements.every((item) => !JSON.stringify(item).includes("0000")),
  );
});

test("escenarios, campos obligatorios y endpoints nuevos fallan de forma explícita", () => {
  const empty = session("empty");
  assert.equal(empty.state.appointments.length, 0);
  const error = session("error");
  assert.equal(
    error.request("GET", "/api/scheduler/operations/catalog").status,
    503,
  );
  assert.equal(error.request("GET", "/api/scheduler/bootstrap").status, 200);
  const conflict = session("conflict");
  assert.equal(
    conflict.request("POST", "/api/scheduler/clients", {}).status,
    409,
  );
  const { state, request } = session();
  state.fields[0].required = true;
  assert.equal(
    request("POST", "/api/scheduler/clients", {
      branchId: state.catalog.branches[0].branchId,
      displayName: "Falta fecha",
    }).status,
    400,
  );
  assert.equal(request("GET", "/api/scheduler/nueva-funcion").status, 501);
  assert.equal(
    request(
      "GET",
      "/api/scheduler/bootstrap",
      {},
      { authorization: "Bearer token-real" },
    ).status,
    401,
  );
});

test("el catálogo de status agrega, versiona e inactiva sin reescribir citas", () => {
  const { state, request } = session();
  const commerceId = state.catalog.commerces[0].id;
  const appointmentSnapshot = structuredClone(state.appointments);
  const authorize = () =>
    request("POST", "/api/scheduler/authorizations", {
      secret: "0000",
      purpose: "STATUS_COLORS_CHANGE",
      targetType: "SchedulerCommerce",
      targetId: commerceId,
    }).body.data.token;

  const created = request(
    "POST",
    "/api/scheduler/design-proposals/status-definitions",
    {
      commerceId,
      label: "Reprogramación solicitada",
      color: "#8b6fa7",
      active: true,
      authorizationToken: authorize(),
    },
  );
  assert.equal(created.status, 201);
  assert.equal(created.body.data.version, 1);
  assert.equal(created.body.data.system, false);
  assert.match(created.body.data.key, /^CUSTOM_/);

  const edited = request(
    "PUT",
    `/api/scheduler/design-proposals/status-definitions/${created.body.data.id}`,
    {
      commerceId,
      label: "Reprogramación pendiente",
      color: "#76558f",
      active: true,
      expectedVersion: 1,
      authorizationToken: authorize(),
    },
  );
  assert.equal(edited.status, 200);
  assert.equal(edited.body.data.version, 2);
  assert.equal(edited.body.data.key, created.body.data.key);

  const inactive = request(
    "PUT",
    `/api/scheduler/design-proposals/status-definitions/${created.body.data.id}`,
    {
      commerceId,
      label: "Reprogramación pendiente",
      color: "#76558f",
      active: false,
      expectedVersion: 2,
      authorizationToken: authorize(),
    },
  );
  assert.equal(inactive.status, 200);
  assert.equal(inactive.body.data.active, false);
  assert.equal(inactive.body.data.version, 3);

  const catalog = request(
    "GET",
    `/api/scheduler/design-proposals/status-definitions?commerceId=${commerceId}`,
  ).body.data;
  const definition = catalog.items.find(
    (item) => item.id === created.body.data.id,
  );
  const revisions = catalog.revisions
    .filter((item) => item.id === created.body.data.id)
    .sort((left, right) => left.version - right.version);
  assert.equal(definition.active, false);
  assert.deepEqual(
    revisions.map((revision) => ({
      version: revision.version,
      label: revision.label,
      active: revision.active,
      current: revision.effectiveTo === null,
    })),
    [
      {
        version: 1,
        label: "Reprogramación solicitada",
        active: true,
        current: false,
      },
      {
        version: 2,
        label: "Reprogramación pendiente",
        active: true,
        current: false,
      },
      {
        version: 3,
        label: "Reprogramación pendiente",
        active: false,
        current: true,
      },
    ],
  );
  const confirmed = catalog.items.find(
    (item) => item.canonicalStatus === "CONFIRMED",
  );
  const recolored = request(
    "PUT",
    `/api/scheduler/design-proposals/status-definitions/${confirmed.id}`,
    {
      commerceId,
      label: confirmed.label,
      color: "#315f52",
      active: true,
      expectedVersion: confirmed.version,
      authorizationToken: authorize(),
    },
  );
  assert.equal(recolored.status, 200);
  assert.equal(
    state.administration.statusColors[0].colors.find(
      (item) => item.status === "CONFIRMED",
    ).color,
    "#315f52",
  );
  assert.deepEqual(state.appointments, appointmentSnapshot);
  assert.ok(!JSON.stringify(catalog).includes("0000"));
  assert.deepEqual(
    state.movements
      .filter((movement) => movement.targetType === "STATUS_DEFINITION")
      .map((movement) => movement.action),
    [
      "Actualización de status",
      "Inactivación de status",
      "Actualización de status",
      "Alta de status",
    ],
  );
  assert.ok(!JSON.stringify(state.movements).includes("0000"));
});

test("los códigos de agente son únicos y cada movimiento consume una autorización", () => {
  const { state, request } = session();
  const agents = request(
    "GET",
    "/api/scheduler/design-proposals/authorization-agents",
  ).body.data;
  assert.ok(agents.length >= 3);
  assert.ok(agents.every((agent) => !("code" in agent)));

  const duplicate = request(
    "PUT",
    `/api/scheduler/design-proposals/authorization-agents/${agents[1].id}`,
    { ...agents[1], code: "0000" },
  );
  assert.equal(duplicate.status, 409);

  const grant = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations",
    {
      code: "1111",
      purpose: "APPOINTMENT_UPDATE",
      targetType: "APPOINTMENT",
      targetId: state.appointments[0].id,
    },
  ).body.data;
  const committed = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations/commit",
    {
      token: grant.token,
      action: "Cambio de cita",
      targetType: "APPOINTMENT",
      targetId: state.appointments[0].id,
    },
  );
  assert.equal(committed.status, 201);
  assert.equal(committed.body.data.actor, "Renata Castillo");
  assert.ok(!JSON.stringify(committed.body.data).includes("1111"));
  assert.equal(
    request(
      "POST",
      "/api/scheduler/design-proposals/operation-authorizations/commit",
      {
        token: grant.token,
        action: "Reintento",
        targetType: "APPOINTMENT",
        targetId: state.appointments[0].id,
      },
    ).status,
    403,
  );
});

test("la cabina exige un visitante y especialista por lugar y autoriza cada monto", () => {
  const { state, request } = session();
  const appointmentId = state.appointments[0].id;
  const cabin = state.catalog.resources.find(
    (resource) => resource.id === "resource-rv4-double",
  );
  const specialists = state.catalog.professionals.slice(0, 2);
  const input = {
    cabinResourceId: cabin.id,
    cabinCapacity: cabin.capacity,
    visitors: [
      {
        id: "visitor-primary",
        customerId: state.customers[0].id,
        name: state.customers[0].displayName,
        specialistProfileId: specialists[0].id,
        purchased: true,
        purchaseAmount: 1750,
      },
      {
        id: "visitor-2",
        customerId: null,
        name: "Visitante ficticia",
        specialistProfileId: specialists[1].id,
        purchased: false,
        purchaseAmount: null,
      },
    ],
  };

  assert.equal(
    request(
      "PUT",
      `/api/scheduler/design-proposals/appointments/${appointmentId}/cabin-visit`,
      input,
    ).status,
    403,
  );
  const grant = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations",
    {
      code: "1111",
      purpose: "PURCHASE_CAPTURE",
      targetType: "APPOINTMENT_PURCHASE",
      targetId: appointmentId,
    },
  ).body.data;
  const saved = request(
    "PUT",
    `/api/scheduler/design-proposals/appointments/${appointmentId}/cabin-visit`,
    input,
    { "x-design-operation-authorization": grant.token },
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.cabinCapacity, 2);
  assert.equal(saved.body.data.visitors.length, 2);
  assert.equal(saved.body.data.visitors[0].purchaseAmount, 1750);

  const committed = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations/commit",
    {
      token: grant.token,
      action: "Registro de compra por visitante",
      targetType: "APPOINTMENT_PURCHASE",
      targetId: appointmentId,
      metadata: { purchaseTotal: "1750" },
    },
  );
  assert.equal(committed.status, 201);
  assert.equal(committed.body.data.actor, "Renata Castillo");
  assert.ok(!JSON.stringify(committed.body.data).includes("1111"));
});

test("un código activo sin permiso de compra no puede registrar montos", () => {
  const { state, request } = session();
  const agent = state.operationAgents.find(
    (candidate) => candidate.code === "1111",
  );
  assert.equal(
    request(
      "PUT",
      `/api/scheduler/design-proposals/authorization-agents/${agent.id}`,
      {
        externalId: agent.externalId,
        name: agent.name,
        role: agent.role,
        source: agent.source,
        active: true,
        allowedPurposes: ["APPOINTMENT_STATUS_CHANGE"],
      },
    ).status,
    200,
  );
  assert.equal(
    request(
      "POST",
      "/api/scheduler/design-proposals/operation-authorizations",
      {
        code: "1111",
        purpose: "PURCHASE_CAPTURE",
        targetType: "APPOINTMENT_PURCHASE",
        targetId: state.appointments[0].id,
      },
    ).status,
    403,
  );
  assert.equal(
    request(
      "POST",
      "/api/scheduler/design-proposals/operation-authorizations",
      {
        code: "1111",
        purpose: "APPOINTMENT_STATUS_CHANGE",
        targetType: "APPOINTMENT",
        targetId: state.appointments[0].id,
      },
    ).status,
    201,
  );
});

test("el apartado valida venta, anticipo y conserva ambos importes", () => {
  const { state, request } = session();
  const appointmentId = state.appointments[0].id;
  const branch = state.catalog.branches.find(
    (item) => item.branchId === state.appointments[0].branchId,
  );
  const cabin = state.catalog.resources.find(
    (resource) =>
      resource.branchProfileId === branch.id && resource.capacity === 1,
  );
  const specialist = state.catalog.professionals[0];
  const grant = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations",
    {
      code: "1111",
      purpose: "PURCHASE_CAPTURE",
      targetType: "APPOINTMENT_PURCHASE",
      targetId: appointmentId,
    },
  ).body.data;
  const invalid = request(
    "PUT",
    `/api/scheduler/design-proposals/appointments/${appointmentId}/cabin-visit`,
    {
      cabinResourceId: cabin.id,
      cabinCapacity: 1,
      visitors: [
        {
          id: "visitor-primary",
          customerId: state.appointments[0].customerId,
          name: state.appointments[0].customerName,
          specialistProfileId: specialist.id,
          purchased: true,
          purchaseAmount: 1200,
          purchaseKind: "LAYAWAY",
          saleAmount: 1200,
          depositAmount: 1500,
        },
      ],
    },
    { "x-design-operation-authorization": grant.token },
  );
  assert.equal(invalid.status, 400);

  const saved = request(
    "PUT",
    `/api/scheduler/design-proposals/appointments/${appointmentId}/cabin-visit`,
    {
      cabinResourceId: cabin.id,
      cabinCapacity: 1,
      visitors: [
        {
          id: "visitor-primary",
          customerId: state.appointments[0].customerId,
          name: state.appointments[0].customerName,
          specialistProfileId: specialist.id,
          purchased: true,
          purchaseAmount: 1200,
          purchaseKind: "LAYAWAY",
          saleAmount: 1200,
          depositAmount: 350,
        },
      ],
    },
    { "x-design-operation-authorization": grant.token },
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.visitors[0].purchaseKind, "LAYAWAY");
  assert.equal(saved.body.data.visitors[0].saleAmount, 1200);
  assert.equal(saved.body.data.visitors[0].depositAmount, 350);
});

test("el reporte por cabina usa la misma población para métricas y detalle", () => {
  const { state, request } = session();
  const report = request(
    "POST",
    "/api/scheduler/design-proposals/reports/cabin-sales",
    {
      dateFrom: state.controls.date,
      dateTo: state.controls.date,
      branchIds: state.catalog.branches.map((branch) => branch.branchId),
    },
  );
  assert.equal(report.status, 201);
  assert.equal(report.body.data.rows.length, 2);
  assert.equal(report.body.data.summary.appointments, 1);
  assert.equal(report.body.data.summary.visitors, 2);
  assert.equal(report.body.data.summary.buyers, 2);
  assert.equal(report.body.data.summary.saleAmount, 4250);
  assert.equal(report.body.data.summary.depositAmount, 2450);
  assert.equal(report.body.data.summary.balanceAmount, 1800);
  assert.equal(report.body.data.summary.conversionRate, 100);
  assert.equal(report.body.data.byCabin[0].saleAmount, 4250);

  const filtered = request(
    "POST",
    "/api/scheduler/design-proposals/reports/cabin-sales",
    {
      dateFrom: state.controls.date,
      dateTo: state.controls.date,
      branchIds: state.catalog.branches.map((branch) => branch.branchId),
      query: "Visitante demostración",
    },
  ).body.data;
  assert.equal(filtered.rows.length, 1);
  assert.equal(filtered.summary.saleAmount, 2400);
  assert.equal(filtered.summary.depositAmount, 600);
  assert.equal(filtered.summary.balanceAmount, 1800);
});

test("los filtros combinables alimentan series, servicios y ranking de especialistas", () => {
  const { state, request } = session();
  const target = new Date(`${state.controls.date}T12:00:00`);
  target.setMonth(target.getMonth() - 8);
  const dateFrom = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-01`;
  const report = request(
    "POST",
    "/api/scheduler/design-proposals/reports/cabin-sales",
    {
      dateFrom,
      dateTo: state.controls.date,
      branchIds: state.catalog.branches.map((branch) => branch.branchId),
      status: "ATTENDED",
      purchaseKind: "LAYAWAY",
      serviceProfileId: "service-rv4",
      specialistProfileId: "professional-rv4-2",
      minSaleAmount: 1000,
      maxSaleAmount: 3000,
    },
  );
  assert.equal(report.status, 201);
  assert.ok(report.body.data.rows.length >= 1);
  assert.ok(
    report.body.data.rows.every(
      (row) =>
        row.status === "ATTENDED" &&
        row.purchaseKind === "LAYAWAY" &&
        row.serviceProfileIds.includes("service-rv4") &&
        row.specialistProfileId === "professional-rv4-2",
    ),
  );
  assert.ok(report.body.data.byWeek.length >= 1);
  assert.ok(report.body.data.byMonth.length >= 1);
  assert.ok(report.body.data.bySpecialist.length >= 1);
  assert.ok(
    report.body.data.bySpecialist.every(
      (item, index, values) =>
        index === 0 || values[index - 1].saleAmount >= item.saleAmount,
    ),
  );
  assert.ok(report.body.data.serviceAnalytics.length >= 1);
  assert.ok(report.body.data.filterOptions.services.length >= 1);
});

test("las proyecciones separan histórico, venta real y estimación por sucursal", () => {
  const { state, request } = session();
  const report = request(
    "POST",
    "/api/scheduler/design-proposals/reports/sales-projections",
    {
      targetMonth: state.controls.date.slice(0, 7),
      branchIds: state.catalog.branches.map((branch) => branch.branchId),
      lookbackMonths: 6,
    },
  );
  assert.equal(report.status, 201);
  assert.equal(report.body.data.historical.length, 6);
  assert.ok(report.body.data.summary.historicalAverage > 0);
  assert.ok(report.body.data.summary.projectedAmount > 0);
  assert.ok(report.body.data.byBranch.length >= 1);
  assert.match(report.body.data.methodology, /Estimación demo/);
});

test("una compra registrada sólo admite corrección con propósito específico", () => {
  const { state, request } = session();
  const appointment = state.appointments.find(
    (item) => item.status === "ATTENDED" && state.appointmentCabinVisits[item.id],
  );
  const visit = state.appointmentCabinVisits[appointment.id];
  const input = {
    cabinResourceId: visit.cabinResourceId,
    cabinCapacity: visit.cabinCapacity,
    visitors: visit.visitors.map((visitor) => ({
      ...visitor,
      saleAmount: Number(visitor.saleAmount ?? 0) + 50,
      purchaseAmount: Number(visitor.saleAmount ?? 0) + 50,
      depositAmount:
        visitor.purchaseKind === "FULL"
          ? Number(visitor.saleAmount ?? 0) + 50
          : visitor.depositAmount,
    })),
  };
  assert.equal(
    request(
      "PUT",
      `/api/scheduler/design-proposals/appointments/${appointment.id}/cabin-visit`,
      input,
    ).status,
    403,
  );
  const grant = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations",
    {
      code: "1111",
      purpose: "PURCHASE_CORRECTION",
      targetType: "APPOINTMENT_PURCHASE",
      targetId: appointment.id,
    },
  ).body.data;
  assert.equal(
    request(
      "PUT",
      `/api/scheduler/design-proposals/appointments/${appointment.id}/cabin-visit`,
      input,
      { "x-design-operation-authorization": grant.token },
    ).status,
    200,
  );
});

test("no permite marcar asistencia antes de que termine la sesión", () => {
  const { state, request } = session();
  const appointment = state.appointments[0];
  appointment.endsAt = "2999-01-01T00:00:00.000Z";
  const result = request(
    "POST",
    `/api/scheduler/appointments/${appointment.id}/status`,
    { status: "ATTENDED", expectedVersion: appointment.version },
  );
  assert.equal(result.status, 409);
  assert.match(result.body.message, /termine el tiempo/);
});

test("las respuestas adicionales se relacionan con la cita por ID", () => {
  const { state, request } = session();
  const appointmentId = state.appointments[0].id;
  const answers = [
    { definitionId: "design-field-sales-owner", value: "Renata Castillo" },
    {
      definitionId: "design-field-attending-specialist",
      value: "Camila Torres",
    },
  ];
  assert.equal(
    request(
      "PUT",
      `/api/scheduler/design-proposals/appointments/${appointmentId}/answers`,
      { answers },
    ).status,
    200,
  );
  assert.deepEqual(
    request(
      "GET",
      `/api/scheduler/design-proposals/appointments/${appointmentId}/answers`,
    ).body.data,
    answers,
  );
});

test("la búsqueda avanzada combina agenda, servicios, cumpleaños, vendedor y campos", () => {
  const { state, request } = session();
  const combined = request(
    "POST",
    "/api/scheduler/design-proposals/customers/advanced-search",
    {
      query: "",
      branchIds: state.catalog.branches.map((branch) => branch.branchId),
      appointmentStatuses: ["CANCELED"],
      serviceProfileIds: ["class-rv4"],
      birthdayMonth: 11,
      sellerNames: ["Venta de empresa"],
      customFields: [{ definitionId: "design-field-type", value: "Nuevo" }],
      page: 1,
      pageSize: 25,
    },
  );
  assert.equal(combined.status, 201);
  assert.equal(combined.body.data.total, 1);
  assert.equal(combined.body.data.items[0].displayName, "Lucía Velasco Pérez");
  assert.equal(combined.body.data.items[0].agenda.canceledCount, 1);

  const inactive = request(
    "POST",
    "/api/scheduler/design-proposals/customers/advanced-search",
    {
      query: "",
      branchIds: state.catalog.branches.map((branch) => branch.branchId),
      noAppointmentWithinDays: 30,
      appointmentStatuses: [],
      serviceProfileIds: [],
      sellerNames: [],
      customFields: [],
      page: 1,
      pageSize: 25,
    },
  ).body.data;
  assert.equal(inactive.total, 1);
  assert.equal(inactive.items[0].displayName, "Sofía Mendoza Lara");
  assert.equal(inactive.items[0].agenda.lastAppointmentAt, null);
});
