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
  designOrigin,
  designBootstrap,
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
        authorization: `Bearer design-token-${state.controls.role}`,
        ...extraHeaders,
      }),
    });
  }
  return { state, request };
}

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

test("las respuestas adicionales se relacionan con la cita por ID", () => {
  const { state, request } = session();
  const appointmentId = state.appointments[0].id;
  const answers = [
    { definitionId: "design-field-sales-owner", value: "Renata Castillo" },
    { definitionId: "design-field-attending-specialist", value: "Camila Torres" },
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
