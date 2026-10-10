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
  designAuthorizationRoleId,
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

function operationToken(request, purpose, targetId, code = "0000", scopeKey) {
  const response = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations",
    {
      code,
      purpose,
      ...(scopeKey ? { scopeKey } : {}),
      targetType: "APPOINTMENT",
      targetId,
    },
  );
  assert.equal(response.status, 201);
  return response.body.data.token;
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

test("el historial de visitas separa la compra de cada clienta en una cabina doble", () => {
  const { state, request } = session();
  const attendedAppointment = state.appointments.find(
    (appointment) => appointment.status === "ATTENDED",
  );
  assert.ok(attendedAppointment);
  const cabinVisit = state.appointmentCabinVisits[attendedAppointment.id];
  const companionCustomer = state.customers.find(
    (customer) => customer.id !== attendedAppointment.customerId,
  );
  assert.ok(cabinVisit);
  assert.ok(companionCustomer);
  assert.equal(cabinVisit.visitors.length, 2);
  cabinVisit.visitors[1].customerId = companionCustomer.id;

  const authorization = request("POST", "/api/scheduler/authorizations", {
    secret: "0000",
    purpose: "CLIENT_VISIT_HISTORY_VIEW",
    screenKey: "scheduler/clients",
    targetId: attendedAppointment.customerId,
  });
  assert.equal(authorization.status, 201);

  const visits = request(
    "GET",
    `/api/scheduler/clients/${attendedAppointment.customerId}/visits`,
    {},
    {
      "x-scheduler-authorization": authorization.body.data.token,
    },
  );
  assert.equal(visits.status, 200);
  const attendedVisit = visits.body.data.items.find(
    (visit) => visit.id === attendedAppointment.id,
  );
  assert.equal(attendedVisit.purchase.purchaseKind, "FULL");
  assert.equal(attendedVisit.purchase.saleAmount, 1850);
  assert.equal(attendedVisit.purchase.depositAmount, 1850);
  assert.equal(attendedVisit.purchase.balanceAmount, 0);

  const companionAuthorization = request(
    "POST",
    "/api/scheduler/authorizations",
    {
      secret: "0000",
      purpose: "CLIENT_VISIT_HISTORY_VIEW",
      screenKey: "scheduler/clients",
      targetId: companionCustomer.id,
    },
  );
  assert.equal(companionAuthorization.status, 201);
  const companionVisits = request(
    "GET",
    `/api/scheduler/clients/${companionCustomer.id}/visits`,
    {},
    {
      "x-scheduler-authorization": companionAuthorization.body.data.token,
    },
  );
  assert.equal(companionVisits.status, 200);
  const companionVisit = companionVisits.body.data.items.find(
    (visit) => visit.id === attendedAppointment.id,
  );
  assert.equal(companionVisit.purchase.purchaseKind, "LAYAWAY");
  assert.equal(companionVisit.purchase.saleAmount, 2400);
  assert.equal(companionVisit.purchase.depositAmount, 600);
  assert.equal(companionVisit.purchase.balanceAmount, 1800);
  assert.notEqual(
    companionVisit.purchase.saleAmount,
    attendedVisit.purchase.saleAmount,
  );

  const currentAppointment = state.appointments.find(
    (appointment) => appointment.id !== attendedAppointment.id,
  );
  currentAppointment.customerId = companionCustomer.id;
  currentAppointment.customerName = companionCustomer.displayName;
  currentAppointment.status = "ARRIVED";
  currentAppointment.startsAt = new Date(
    new Date(attendedAppointment.startsAt).getTime() + 7 * 86_400_000,
  ).toISOString();
  currentAppointment.endsAt = new Date(
    new Date(currentAppointment.startsAt).getTime() + 60 * 60_000,
  ).toISOString();

  const openLayaways = request(
    "GET",
    `/api/scheduler/design-proposals/customers/${companionCustomer.id}/layaways?currentAppointmentId=${currentAppointment.id}`,
  );
  assert.equal(openLayaways.status, 200);
  const targetLayaway = openLayaways.body.data.find(
    (layaway) => layaway.sourceAppointmentId === attendedAppointment.id,
  );
  assert.ok(targetLayaway);
  assert.equal(targetLayaway.balanceAmount, 1800);

  const partialToken = operationToken(
    request,
    "PURCHASE_CAPTURE",
    attendedAppointment.id,
    "1111",
    "PURCHASE_CAPTURE",
  );
  const partial = request(
    "POST",
    `/api/scheduler/design-proposals/customers/${companionCustomer.id}/layaways/${attendedAppointment.id}/payments`,
    {
      visitAppointmentId: currentAppointment.id,
      amount: 500,
      authorizationToken: partialToken,
    },
  );
  assert.equal(partial.status, 201);
  assert.equal(partial.body.data.paidAmount, 1100);
  assert.equal(partial.body.data.balanceAmount, 1300);
  assert.equal(partial.body.data.settlementStatus, "OPEN");
  assert.equal(
    partial.body.data.payments[0].visitAppointmentId,
    currentAppointment.id,
  );

  const partialCommit = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations/commit",
    {
      token: partialToken,
      action: "Abono a apartado",
      targetType: "LAYAWAY",
      targetId: attendedAppointment.id,
      metadata: { amount: "500" },
    },
  );
  assert.equal(partialCommit.status, 201);

  const settlementToken = operationToken(
    request,
    "PURCHASE_CAPTURE",
    attendedAppointment.id,
    "1111",
    "PURCHASE_CAPTURE",
  );
  const settled = request(
    "POST",
    `/api/scheduler/design-proposals/customers/${companionCustomer.id}/layaways/${attendedAppointment.id}/payments`,
    {
      visitAppointmentId: currentAppointment.id,
      amount: 1300,
      authorizationToken: settlementToken,
    },
  );
  assert.equal(settled.status, 201);
  assert.equal(settled.body.data.paidAmount, 2400);
  assert.equal(settled.body.data.balanceAmount, 0);
  assert.equal(settled.body.data.settlementStatus, "PAID");
  assert.equal(settled.body.data.payments.length, 2);

  const settlementCommit = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations/commit",
    {
      token: settlementToken,
      action: "Liquidación de apartado",
      targetType: "LAYAWAY",
      targetId: attendedAppointment.id,
      metadata: { amount: "1300" },
    },
  );
  assert.equal(settlementCommit.status, 201);

  const refreshedAuthorization = request(
    "POST",
    "/api/scheduler/authorizations",
    {
      secret: "0000",
      purpose: "CLIENT_VISIT_HISTORY_VIEW",
      screenKey: "scheduler/clients",
      targetId: companionCustomer.id,
    },
  );
  const refreshedVisits = request(
    "GET",
    `/api/scheduler/clients/${companionCustomer.id}/visits`,
    {},
    {
      "x-scheduler-authorization": refreshedAuthorization.body.data.token,
    },
  );
  const settledVisit = refreshedVisits.body.data.items.find(
    (visit) => visit.id === attendedAppointment.id,
  );
  assert.equal(settledVisit.purchase.depositAmount, 2400);
  assert.equal(settledVisit.purchase.balanceAmount, 0);
  assert.equal(settledVisit.purchase.settlementStatus, "PAID");
  assert.equal(settledVisit.purchase.payments.length, 2);
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
      customFields: [
        {
          definitionId: "design-field-sales-owner",
          value: "Renata Castillo",
        },
      ],
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

test("la exportación de clientes acepta rol o código autorizado", () => {
  const master = session();
  const direct = master.request(
    "GET",
    `/api/scheduler/exports/CUSTOMERS?branchIds=${master.state.catalog.branches[0].branchId}`,
  );
  assert.equal(direct.status, 200);
  assert.ok(direct.body.data.columns.includes("Teléfono"));
  assert.ok(direct.body.data.columns.includes("Cartera vigente"));

  const limited = session("normal", "specialist");
  assert.equal(
    limited.request("GET", "/api/scheduler/exports/CUSTOMERS").status,
    403,
  );
  const token = limited.request("POST", "/api/scheduler/authorizations", {
    secret: "4444",
    purpose: "SENSITIVE_EXPORT",
    screenKey: "scheduler/clients",
    targetType: "SchedulerReport",
    targetId: "CUSTOMERS",
  }).body.data.token;
  assert.equal(
    limited.request(
      "GET",
      "/api/scheduler/exports/CUSTOMERS",
      {},
      { "x-scheduler-authorization": token },
    ).status,
    200,
  );
});

test("detecta duplicados por teléfono o nombre y reutiliza la fusión protegida", () => {
  const { state, request } = session();
  const branchId = state.catalog.branches[0].branchId;
  const candidates = request(
    "POST",
    "/api/scheduler/design-proposals/customers/duplicates",
    { branchIds: [branchId] },
  ).body.data;
  const candidate = candidates.find((item) =>
    item.reasons.some((reason) => reason.kind === "PHONE"),
  );
  assert.ok(candidate);
  assert.equal(candidate.customers.length, 2);
  assert.equal(candidate.confidence, "HIGH");

  const authorizationToken = request("POST", "/api/scheduler/authorizations", {
    secret: "0000",
    purpose: "CLIENT_MERGE",
    screenKey: "scheduler/clients",
    targetType: "CustomerMerge",
    targetId: `${candidate.customers[0].id}:${candidate.customers[1].id}`,
  }).body.data.token;
  assert.equal(
    request("POST", "/api/scheduler/clients/merge", {
      sourceCustomerId: candidate.customers[1].id,
      targetCustomerId: candidate.customers[0].id,
      expectedSourceVersion: candidate.customers[1].version,
      expectedTargetVersion: candidate.customers[0].version,
      reason: "Unificación de coincidencia revisada en clientes.",
      authorizationToken,
    }).status,
    201,
  );
  const refreshed = request(
    "POST",
    "/api/scheduler/design-proposals/customers/duplicates",
    { branchIds: [branchId] },
  ).body.data;
  assert.equal(
    refreshed.some((item) => item.id === candidate.id),
    false,
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
      visibleInAgenda: true,
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
      visibleInAgenda: false,
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
      visibleInAgenda: false,
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
      visibleInAgenda: revision.visibleInAgenda,
      current: revision.effectiveTo === null,
    })),
    [
      {
        version: 1,
        label: "Reprogramación solicitada",
        active: true,
        visibleInAgenda: true,
        current: false,
      },
      {
        version: 2,
        label: "Reprogramación pendiente",
        active: true,
        visibleInAgenda: false,
        current: false,
      },
      {
        version: 3,
        label: "Reprogramación pendiente",
        active: false,
        visibleInAgenda: false,
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
      visibleInAgenda: true,
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

test("mover una cita sin venta actualiza reportes y una venta posterior bloquea otro cambio", () => {
  const { state, request } = session();
  const appointment = state.appointments.find(
    (item) => item.status === "CONFIRMED",
  );
  const branch = state.catalog.branches.find(
    (item) => item.branchId === appointment.branchId,
  );
  const rooms = state.catalog.resources.filter(
    (resource) =>
      resource.active &&
      resource.kind === "ROOM" &&
      resource.branchProfileId === branch.id,
  );
  const sourceRoom = rooms.find((room) => room.capacity === 1);
  const targetRoom = rooms.find(
    (room) => room.id !== sourceRoom.id && room.capacity > 1,
  );
  const sourceProfessional = appointment.services[0].professionals[0];
  const targetProfessional = state.catalog.professionals.find(
    (professional) =>
      professional.active &&
      professional.id !== sourceProfessional.professionalProfileId,
  );
  const representative = state.operationAgents.find((agent) => agent.active);

  appointment.services[0].resources = [
    {
      resourceId: sourceRoom.id,
      name: sourceRoom.name,
      units: 1,
      exclusive: true,
    },
  ];
  appointment.services[0].capacityUnits = sourceRoom.capacity;
  state.appointmentCabinVisits[appointment.id] = {
    appointmentId: appointment.id,
    cabinResourceId: sourceRoom.id,
    cabinName: sourceRoom.name,
    cabinCapacity: sourceRoom.capacity,
    representativeId: representative.id,
    representativeName: representative.name,
    representativeRole: representative.role,
    representativeSource: representative.source,
    visitors: [
      {
        id: "visitor-drag-report",
        customerId: appointment.customerId,
        name: appointment.customerName,
        specialistProfileId: sourceProfessional.professionalProfileId,
        purchased: null,
        purchaseAmount: null,
        purchaseKind: null,
        saleAmount: null,
        depositAmount: null,
        saleOwnerSpecialistProfileId: null,
        settlementStatus: "NOT_APPLICABLE",
        settledAt: null,
      },
    ],
    updatedAt: appointment.updatedAt,
  };

  const grantToken = operationToken(
    request,
    "APPOINTMENT_MOVE",
    appointment.id,
  );
  const moved = request(
    "POST",
    `/api/scheduler/appointments/${appointment.id}/move`,
    {
      startsAt: appointment.startsAt,
      expectedVersion: appointment.version,
      services: appointment.services.map((service) => ({
        serviceProfileId: service.serviceProfileId,
        professionalProfileIds: [targetProfessional.id],
        resourceIds: [targetRoom.id],
        startsAt: service.startsAt,
        capacityUnits: targetRoom.capacity,
        membershipId: service.membership?.membershipId ?? null,
      })),
    },
  );
  assert.equal(moved.status, 201);
  assert.equal(
    state.appointmentCabinVisits[appointment.id].cabinResourceId,
    targetRoom.id,
  );
  assert.equal(
    state.appointmentCabinVisits[appointment.id].visitors[0]
      .specialistProfileId,
    targetProfessional.id,
  );

  const movedVisitor = state.appointmentCabinVisits[appointment.id].visitors[0];
  Object.assign(movedVisitor, {
    purchased: true,
    purchaseAmount: 900,
    purchaseKind: "FULL",
    saleAmount: 900,
    depositAmount: 900,
    saleOwnerSpecialistProfileId: targetProfessional.id,
    settlementStatus: "PAID",
    settledAt: appointment.startsAt,
  });

  const report = request(
    "POST",
    "/api/scheduler/design-proposals/reports/cabin-sales",
    {
      dateFrom: state.controls.date,
      dateTo: state.controls.date,
      branchIds: [appointment.branchId],
      query: appointment.customerName,
    },
  );
  assert.equal(report.status, 201);
  const reportRow = report.body.data.rows.find(
    (row) => row.appointmentId === appointment.id,
  );
  assert.equal(reportRow.cabinResourceId, targetRoom.id);
  assert.equal(reportRow.attendingSpecialistProfileId, targetProfessional.id);

  const blockedAfterSale = request(
    "POST",
    `/api/scheduler/appointments/${appointment.id}/move`,
    {
      startsAt: appointment.startsAt,
      expectedVersion: moved.body.data.version,
      services: moved.body.data.services.map((service) => ({
        serviceProfileId: service.serviceProfileId,
        professionalProfileIds: [sourceProfessional.professionalProfileId],
        resourceIds: [sourceRoom.id],
        startsAt: service.startsAt,
        capacityUnits: sourceRoom.capacity,
        membershipId: service.membership?.membershipId ?? null,
      })),
    },
  );
  assert.equal(blockedAfterSale.status, 409);
  assert.match(blockedAfterSale.body.message, /compra o apartado/i);
  assert.equal(
    state.appointmentCabinVisits[appointment.id].cabinResourceId,
    targetRoom.id,
  );

  const committed = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations/commit",
    {
      token: grantToken,
      action: "Cambio de horario y asignación por arrastre",
      targetType: "APPOINTMENT",
      targetId: appointment.id,
      metadata: {
        previousColumnId: `resource:${sourceRoom.id}`,
        targetColumnId: `resource:${targetRoom.id}`,
        source: "DRAG_DROP",
      },
    },
  );
  assert.equal(committed.status, 201);
  assert.equal(
    committed.body.data.metadata.targetColumnId,
    `resource:${targetRoom.id}`,
  );

  const attendedAppointment = state.appointments.find(
    (item) => item.status === "ATTENDED",
  );
  state.appointmentCabinVisits[attendedAppointment.id]?.visitors.forEach(
    (visitor) => {
      Object.assign(visitor, {
        purchased: false,
        purchaseAmount: 0,
        purchaseKind: "NONE",
        saleAmount: 0,
        depositAmount: 0,
        saleOwnerSpecialistProfileId: null,
        settlementStatus: "NOT_APPLICABLE",
        settledAt: null,
      });
    },
  );
  const blockedAfterAttendance = request(
    "POST",
    `/api/scheduler/appointments/${attendedAppointment.id}/move`,
    {
      startsAt: attendedAppointment.startsAt,
      expectedVersion: attendedAppointment.version,
      services: attendedAppointment.services.map((service) => ({
        serviceProfileId: service.serviceProfileId,
        professionalProfileIds: service.professionals.map(
          (professional) => professional.professionalProfileId,
        ),
        resourceIds: service.resources.map((resource) => resource.resourceId),
        startsAt: service.startsAt,
        capacityUnits: service.capacityUnits,
        membershipId: service.membership?.membershipId ?? null,
      })),
    },
  );
  assert.equal(blockedAfterAttendance.status, 409);
  assert.match(blockedAfterAttendance.body.message, /llegó o fue atendida/i);

  const { state: readOnlyState, request: readOnlyRequest } = session(
    "normal",
    "read-only",
  );
  const readOnlyAppointment = readOnlyState.appointments.find(
    (item) => item.status === "CONFIRMED",
  );
  const denied = readOnlyRequest(
    "POST",
    `/api/scheduler/appointments/${readOnlyAppointment.id}/move`,
    {
      startsAt: readOnlyAppointment.startsAt,
      expectedVersion: readOnlyAppointment.version,
      services: readOnlyAppointment.services.map((service) => ({
        serviceProfileId: service.serviceProfileId,
        professionalProfileIds: service.professionals.map(
          (professional) => professional.professionalProfileId,
        ),
        resourceIds: service.resources.map((resource) => resource.resourceId),
        startsAt: service.startsAt,
        capacityUnits: service.capacityUnits,
        membershipId: service.membership?.membershipId ?? null,
      })),
    },
  );
  assert.equal(denied.status, 403);
});

test("la baja POS transfiere la cartera vigente y conserva el representante histórico de las citas", () => {
  const { state, request } = session();
  const seller = state.operationAgents.find(
    (agent) => agent.source === "POS_CRM" && agent.name === "Renata Castillo",
  );
  const customer = state.customers.find((candidate) =>
    candidate.currentPortfolios.some(
      (portfolio) => portfolio.employeeId === seller.externalId,
    ),
  );
  const historicalAppointment = state.appointments.find(
    (appointment) => appointment.customerId === customer.id,
  );
  const historicalOwner = request(
    "POST",
    "/api/scheduler/design-proposals/appointments/contexts",
    { appointmentIds: [historicalAppointment.id] },
  ).body.data[historicalAppointment.id].portfolioSellerName;
  assert.equal(historicalOwner, seller.name);

  const deactivated = request(
    "PUT",
    `/api/scheduler/design-proposals/authorization-agents/${seller.id}`,
    {
      externalId: seller.externalId,
      name: seller.name,
      role: seller.role,
      source: seller.source,
      active: false,
      allowedPurposes: seller.allowedPurposes,
    },
  );
  assert.equal(deactivated.status, 200);
  assert.equal(
    customer.currentPortfolios.find(
      (portfolio) => portfolio.branchId === historicalAppointment.branchId,
    ).ownerName,
    "Cartera de la empresa",
  );
  assert.equal(
    customer.customFields.find(
      (field) => field.definitionId === "design-field-sales-owner",
    ).value,
    "Cartera de la empresa",
  );
  assert.ok(
    !state.fields
      .find((field) => field.id === "design-field-sales-owner")
      .options.includes(seller.name),
  );
  assert.equal(
    request("POST", "/api/scheduler/design-proposals/appointments/contexts", {
      appointmentIds: [historicalAppointment.id],
    }).body.data[historicalAppointment.id].portfolioSellerName,
    historicalOwner,
  );

  const nextAppointment = request("POST", "/api/scheduler/appointments", {
    branchId: historicalAppointment.branchId,
    customerId: customer.id,
    startsAt: new Date(
      new Date(historicalAppointment.startsAt).getTime() + 7 * 86_400_000,
    ).toISOString(),
    status: "RESERVED",
    services: historicalAppointment.services.map((service) => ({
      serviceProfileId: service.serviceProfileId,
      professionalProfileIds: service.professionals.map(
        (professional) => professional.professionalProfileId,
      ),
      resourceIds: [],
    })),
  });
  assert.equal(nextAppointment.status, 201);
  assert.equal(
    request("POST", "/api/scheduler/design-proposals/appointments/contexts", {
      appointmentIds: [nextAppointment.body.data.id],
    }).body.data[nextAppointment.body.data.id].portfolioSellerName,
    "Cartera de la empresa",
  );

  assert.equal(
    request("POST", "/api/scheduler/clients", {
      branchId: historicalAppointment.branchId,
      displayName: "Cliente sin representante",
    }).status,
    400,
  );
  assert.equal(
    request(
      "PUT",
      `/api/scheduler/design-proposals/authorization-agents/${seller.id}`,
      {
        externalId: seller.externalId,
        name: seller.name,
        role: seller.role,
        source: seller.source,
        active: true,
        allowedPurposes: seller.allowedPurposes,
      },
    ).status,
    200,
  );
  assert.equal(
    customer.currentPortfolios.find(
      (portfolio) => portfolio.branchId === historicalAppointment.branchId,
    ).ownerName,
    "Cartera de la empresa",
  );
});

test("la cabina exige un visitante y especialista por lugar y autoriza cada monto", () => {
  const { state, request } = session();
  const appointmentId = state.appointments[0].id;
  const cabin = state.catalog.resources.find(
    (resource) => resource.id === "resource-rv4-double",
  );
  const specialists = state.catalog.professionals.slice(0, 2);
  const representative = state.operationAgents.find((agent) => agent.active);
  const input = {
    cabinResourceId: cabin.id,
    cabinCapacity: cabin.capacity,
    representativeId: representative.id,
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
  assert.equal(saved.body.data.representativeId, representative.id);
  const synchronizedService = state.appointments.find(
    (item) => item.id === appointmentId,
  ).services[0];
  assert.deepEqual(
    synchronizedService.professionals.map(
      (professional) => professional.professionalProfileId,
    ),
    specialists.map((specialist) => specialist.id),
  );
  assert.ok(
    synchronizedService.resources.some(
      (resource) => resource.resourceId === cabin.id,
    ),
  );
  assert.equal(synchronizedService.capacityUnits, cabin.capacity);
  const contexts = request(
    "POST",
    "/api/scheduler/design-proposals/appointments/contexts",
    { appointmentIds: [appointmentId] },
  );
  assert.equal(contexts.status, 201);
  assert.equal(
    contexts.body.data[appointmentId].representativeName,
    representative.name,
  );
  assert.equal(contexts.body.data[appointmentId].hasPurchase, true);
  assert.equal(contexts.body.data[appointmentId].purchaseKind, "FULL");
  assert.equal(contexts.body.data[appointmentId].saleAmount, 1750);
  assert.deepEqual(
    contexts.body.data[appointmentId].attendeeNames,
    saved.body.data.visitors.map((visitor) => visitor.name),
  );
  assert.deepEqual(
    contexts.body.data[appointmentId].attendingSpecialistProfileIds,
    [],
  );
  assert.ok("nextAppointmentAt" in contexts.body.data[appointmentId]);

  const anotherCabin = state.catalog.resources.find(
    (resource) =>
      resource.kind === "ROOM" &&
      resource.branchProfileId === cabin.branchProfileId &&
      resource.id !== cabin.id,
  );
  assert.equal(
    request(
      "PUT",
      `/api/scheduler/design-proposals/appointments/${appointmentId}/cabin-visit`,
      { ...input, cabinResourceId: anotherCabin.id },
    ).status,
    409,
  );

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

test("la atención de cabina rechaza traslapes de especialista y cabina", () => {
  const { state, request } = session();
  const target = state.appointments[0];
  const blocker = state.appointments[1];
  const branch = state.catalog.branches.find(
    (candidate) => candidate.branchId === target.branchId,
  );
  const cabin = state.catalog.resources.find(
    (resource) =>
      resource.active &&
      resource.kind === "ROOM" &&
      resource.capacity === 1 &&
      resource.branchProfileId === branch.id,
  );
  const [specialist, alternateSpecialist] = state.catalog.professionals;
  const representative = state.operationAgents.find((agent) => agent.active);
  const targetService = target.services[0];
  blocker.branchId = target.branchId;
  blocker.branchProfileId = target.branchProfileId;
  blocker.timezone = target.timezone;
  blocker.startsAt = target.startsAt;
  blocker.endsAt = target.endsAt;
  blocker.services[0] = {
    ...blocker.services[0],
    startsAt: targetService.startsAt,
    endsAt: targetService.endsAt,
    occupiesFrom: targetService.occupiesFrom,
    occupiesUntil: targetService.occupiesUntil,
    professionals: [
      {
        professionalProfileId: specialist.id,
        name: specialist.name,
        role: "PRIMARY",
      },
    ],
    resources: [],
  };
  const input = {
    cabinResourceId: cabin.id,
    cabinCapacity: 1,
    representativeId: representative.id,
    visitors: [
      {
        id: "visitor-primary",
        customerId: target.customerId,
        name: target.customerName,
        specialistProfileId: specialist.id,
        purchased: false,
        purchaseAmount: null,
        purchaseKind: "NONE",
        saleAmount: null,
        depositAmount: null,
      },
    ],
  };

  const professionalBusy = request(
    "PUT",
    `/api/scheduler/design-proposals/appointments/${target.id}/cabin-visit`,
    input,
  );
  assert.equal(professionalBusy.status, 409);
  assert.equal(professionalBusy.body.code, "PROFESSIONAL_BUSY");

  blocker.services[0].professionals = [
    {
      professionalProfileId: alternateSpecialist.id,
      name: alternateSpecialist.name,
      role: "PRIMARY",
    },
  ];
  blocker.services[0].resources = [
    {
      resourceId: cabin.id,
      name: cabin.name,
      units: 1,
      exclusive: true,
    },
  ];
  const cabinBusy = request(
    "PUT",
    `/api/scheduler/design-proposals/appointments/${target.id}/cabin-visit`,
    input,
  );
  assert.equal(cabinBusy.status, 409);
  assert.equal(cabinBusy.body.code, "RESOURCE_BUSY");
});

test("los puestos autorizan por separado llegada y montos de compra", () => {
  const { state, request } = session();
  const arrivalAgent = state.operationAgents.find(
    (candidate) => candidate.code === "1111",
  );
  const purchaseAgent = state.operationAgents.find(
    (candidate) => candidate.code === "2222",
  );
  const policy = request(
    "GET",
    "/api/scheduler/design-proposals/authorization-policy",
  ).body.data;
  const arrivalRoleId = designAuthorizationRoleId(
    arrivalAgent.source,
    arrivalAgent.role,
  );
  const purchaseRoleId = designAuthorizationRoleId(
    purchaseAgent.source,
    purchaseAgent.role,
  );
  assert.equal(
    request("PUT", "/api/scheduler/design-proposals/authorization-policy", {
      expectedVersion: policy.version,
      rules: policy.rules.map((rule) => ({
        scopeKey: rule.scopeKey,
        roleIds:
          rule.scopeKey === "STATUS:ARRIVED"
            ? [arrivalRoleId]
            : rule.scopeKey === "PURCHASE_CAPTURE"
              ? [purchaseRoleId]
              : rule.roleIds,
      })),
    }).status,
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
  const arrivalGrant = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations",
    {
      code: "1111",
      purpose: "APPOINTMENT_STATUS_CHANGE",
      scopeKey: "STATUS:ARRIVED",
      targetType: "APPOINTMENT",
      targetId: state.appointments[0].id,
    },
  );
  assert.equal(arrivalGrant.status, 201);
  assert.equal(
    request(
      "POST",
      `/api/scheduler/appointments/${state.appointments[0].id}/status`,
      {
        status: "CONFIRMED",
        expectedVersion: state.appointments[0].version,
        authorizationToken: arrivalGrant.body.data.token,
      },
    ).status,
    403,
  );
  assert.equal(
    request(
      "POST",
      "/api/scheduler/design-proposals/operation-authorizations",
      {
        code: "2222",
        purpose: "APPOINTMENT_STATUS_CHANGE",
        scopeKey: "STATUS:ARRIVED",
        targetType: "APPOINTMENT",
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
        code: "2222",
        purpose: "PURCHASE_CAPTURE",
        targetType: "APPOINTMENT_PURCHASE",
        targetId: state.appointments[0].id,
      },
    ).status,
    201,
  );
  assert.equal(
    request(
      "POST",
      "/api/scheduler/design-proposals/operation-authorizations",
      {
        code: "0000",
        purpose: "APPOINTMENT_STATUS_CHANGE",
        scopeKey: "STATUS:ARRIVED",
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
  const representative = state.operationAgents.find((agent) => agent.active);
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
      representativeId: representative.id,
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
      representativeId: representative.id,
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
  assert.equal(
    saved.body.data.visitors[0].saleOwnerSpecialistProfileId,
    specialist.id,
  );
  assert.equal(saved.body.data.visitors[0].settlementStatus, "OPEN");
  assert.equal(saved.body.data.visitors[0].settledAt, null);

  const settlementSpecialist = state.catalog.professionals.find(
    (candidate) =>
      candidate.id !== specialist.id &&
      candidate.branchProfileIds.includes(branch.id),
  );
  const correctionGrant = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations",
    {
      code: "1111",
      purpose: "PURCHASE_CORRECTION",
      targetType: "APPOINTMENT_PURCHASE",
      targetId: appointmentId,
    },
  ).body.data;
  const settled = request(
    "PUT",
    `/api/scheduler/design-proposals/appointments/${appointmentId}/cabin-visit`,
    {
      cabinResourceId: cabin.id,
      cabinCapacity: 1,
      representativeId: representative.id,
      visitors: [
        {
          id: "visitor-primary",
          customerId: state.appointments[0].customerId,
          name: state.appointments[0].customerName,
          specialistProfileId: settlementSpecialist.id,
          purchased: true,
          purchaseAmount: 1200,
          purchaseKind: "FULL",
          saleAmount: 1200,
          depositAmount: 1200,
        },
      ],
    },
    { "x-design-operation-authorization": correctionGrant.token },
  );
  assert.equal(settled.status, 200);
  assert.equal(
    settled.body.data.visitors[0].specialistProfileId,
    settlementSpecialist.id,
  );
  assert.equal(
    settled.body.data.visitors[0].saleOwnerSpecialistProfileId,
    specialist.id,
  );
  assert.equal(settled.body.data.visitors[0].settlementStatus, "PAID");
  assert.ok(settled.body.data.visitors[0].settledAt);

  const attributedRow = request(
    "POST",
    "/api/scheduler/design-proposals/reports/cabin-sales",
    {
      dateFrom: state.controls.date,
      dateTo: state.controls.date,
      branchIds: [state.appointments[0].branchId],
      query: state.appointments[0].customerName,
    },
  ).body.data.rows.find((row) => row.appointmentId === appointmentId);
  assert.equal(attributedRow.specialistProfileId, specialist.id);
  assert.equal(attributedRow.saleOwnerSpecialistProfileId, specialist.id);
  assert.equal(
    attributedRow.attendingSpecialistProfileId,
    settlementSpecialist.id,
  );
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
  assert.equal(report.body.data.summary.branches, 1);
  assert.equal(report.body.data.summary.cabins, 1);
  assert.equal(report.body.data.byBranch[0].saleAmount, 4250);
  assert.equal(report.body.data.byBranch[0].appointments, 1);
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
    (item) =>
      item.status === "ATTENDED" && state.appointmentCabinVisits[item.id],
  );
  const visit = state.appointmentCabinVisits[appointment.id];
  const input = {
    cabinResourceId: visit.cabinResourceId,
    cabinCapacity: visit.cabinCapacity,
    representativeId: visit.representativeId,
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
  const withoutAuthorization = request(
    "POST",
    `/api/scheduler/appointments/${appointment.id}/status`,
    { status: "ATTENDED", expectedVersion: appointment.version },
  );
  assert.equal(withoutAuthorization.status, 403);
  assert.match(withoutAuthorization.body.message, /código personal/);
  const authorizationToken = operationToken(
    request,
    "APPOINTMENT_STATUS_CHANGE",
    appointment.id,
    "0000",
    "STATUS:ATTENDED",
  );
  const result = request(
    "POST",
    `/api/scheduler/appointments/${appointment.id}/status`,
    {
      status: "ATTENDED",
      expectedVersion: appointment.version,
      authorizationToken,
    },
  );
  assert.equal(result.status, 409);
  assert.match(result.body.message, /termine el tiempo/);
});

test("no permite marcar asistencia sin completar compra o no compra", () => {
  const { state, request } = session();
  const appointment = state.appointments[0];
  const branch = state.catalog.branches.find(
    (item) => item.branchId === appointment.branchId,
  );
  const cabin = state.catalog.resources.find(
    (resource) =>
      resource.branchProfileId === branch.id && resource.capacity === 1,
  );
  const specialist = state.catalog.professionals.find((candidate) =>
    candidate.branchProfileIds.includes(branch.id),
  );
  const representative = state.operationAgents.find((agent) => agent.active);
  appointment.endsAt = "2000-01-01T00:00:00.000Z";

  const attendedToken = operationToken(
    request,
    "APPOINTMENT_STATUS_CHANGE",
    appointment.id,
    "0000",
    "STATUS:ATTENDED",
  );
  const incomplete = request(
    "POST",
    `/api/scheduler/appointments/${appointment.id}/status`,
    {
      status: "ATTENDED",
      expectedVersion: appointment.version,
      authorizationToken: attendedToken,
    },
  );
  assert.equal(incomplete.status, 409);
  assert.match(incomplete.body.message, /Completa para cada visitante/);
  const arrivalToken = operationToken(
    request,
    "APPOINTMENT_STATUS_CHANGE",
    appointment.id,
    "0000",
    "STATUS:ARRIVED",
  );
  const arrivalIncomplete = request(
    "POST",
    `/api/scheduler/appointments/${appointment.id}/status`,
    {
      status: "ARRIVED",
      expectedVersion: appointment.version,
      authorizationToken: arrivalToken,
    },
  );
  assert.equal(arrivalIncomplete.status, 409);
  assert.match(arrivalIncomplete.body.message, /Completa la atención/);

  const capture = request(
    "PUT",
    `/api/scheduler/design-proposals/appointments/${appointment.id}/cabin-visit`,
    {
      cabinResourceId: cabin.id,
      cabinCapacity: 1,
      representativeId: representative.id,
      visitors: [
        {
          id: "visitor-primary",
          customerId: appointment.customerId,
          name: appointment.customerName,
          specialistProfileId: specialist.id,
          purchased: false,
          purchaseAmount: null,
          purchaseKind: "NONE",
          saleAmount: null,
          depositAmount: null,
        },
      ],
    },
  );
  assert.equal(capture.status, 200);
  assert.equal(
    capture.body.data.visitors[0].settlementStatus,
    "NOT_APPLICABLE",
  );

  const completedArrivalToken = operationToken(
    request,
    "APPOINTMENT_STATUS_CHANGE",
    appointment.id,
    "0000",
    "STATUS:ARRIVED",
  );
  const arrivalCompleted = request(
    "POST",
    `/api/scheduler/appointments/${appointment.id}/status`,
    {
      status: "ARRIVED",
      expectedVersion: appointment.version,
      authorizationToken: completedArrivalToken,
    },
  );
  assert.equal(arrivalCompleted.status, 201);
  assert.equal(arrivalCompleted.body.data.status, "ARRIVED");
  const arrivalContext = request(
    "POST",
    "/api/scheduler/design-proposals/appointments/contexts",
    { appointmentIds: [appointment.id] },
  );
  assert.deepEqual(
    arrivalContext.body.data[appointment.id].attendingSpecialistProfileIds,
    [specialist.id],
  );

  const completedAttendanceToken = operationToken(
    request,
    "APPOINTMENT_STATUS_CHANGE",
    appointment.id,
    "0000",
    "STATUS:ATTENDED",
  );
  const completed = request(
    "POST",
    `/api/scheduler/appointments/${appointment.id}/status`,
    {
      status: "ATTENDED",
      expectedVersion: arrivalCompleted.body.data.version,
      authorizationToken: completedAttendanceToken,
    },
  );
  assert.equal(completed.status, 201);
  assert.equal(completed.body.data.status, "ATTENDED");
});

test("permite corregir un status con código sin borrar el historial anterior", () => {
  const { state, request } = session();
  const appointment = state.appointments.find(
    (candidate) => candidate.status === "ATTENDED",
  );
  const previousHistoryLength = appointment.stateHistory.length;
  const authorizationToken = operationToken(
    request,
    "APPOINTMENT_STATUS_CHANGE",
    appointment.id,
    "0000",
    "STATUS:CONFIRMED",
  );
  const corrected = request(
    "POST",
    `/api/scheduler/appointments/${appointment.id}/status`,
    {
      status: "CONFIRMED",
      expectedVersion: appointment.version,
      authorizationToken,
      reason: "Corrección autorizada por captura equivocada",
    },
  );

  assert.equal(corrected.status, 201);
  assert.equal(corrected.body.data.status, "CONFIRMED");
  assert.equal(
    corrected.body.data.stateHistory.length,
    previousHistoryLength + 1,
  );
  assert.equal(corrected.body.data.stateHistory.at(-1).fromStatus, "ATTENDED");
  assert.equal(corrected.body.data.stateHistory.at(-1).toStatus, "CONFIRMED");
});

test("liga cada sucursal POS o independiente con sus cabinas y su modelo de renta", () => {
  const { state, request } = session();
  const commerceId = state.catalog.commerces[0].id;
  const initialModels = request(
    "GET",
    "/api/scheduler/design-proposals/branch-commercial-models",
  );
  assert.equal(initialModels.status, 200);
  assert.equal(initialModels.body.data.length, state.catalog.branches.length);

  const missingPosBranch = request(
    "POST",
    "/api/scheduler/design-proposals/branch-commercial-models",
    {
      commerceId,
      mode: "POS_LINKED",
      posBranchId: "branch-not-in-pos",
      timezone: "America/Mexico_City",
      cabinCount: 2,
      cabinCapacity: 1,
    },
  );
  assert.equal(missingPosBranch.status, 409);

  const posModel = initialModels.body.data.find(
    (model) => model.posBranchId === "branch-rv4",
  );
  const updatedPos = request(
    "POST",
    "/api/scheduler/design-proposals/branch-commercial-models",
    {
      id: posModel.id,
      commerceId,
      mode: "POS_LINKED",
      posBranchId: "branch-rv4",
      timezone: "America/Mexico_City",
      cabinCount: 4,
      cabinCapacity: 2,
    },
  );
  assert.equal(updatedPos.status, 201);
  assert.equal(updatedPos.body.data.cabinCount, 4);
  assert.equal(updatedPos.body.data.estimatedMonthlyAmount, null);
  const polancoProfile = state.catalog.branches.find(
    (branch) => branch.branchId === "branch-rv4",
  );
  assert.equal(
    state.catalog.resources.filter(
      (resource) =>
        resource.branchProfileId === polancoProfile.id &&
        resource.kind === "ROOM" &&
        resource.active,
    ).length,
    4,
  );
  const reducedPos = request(
    "POST",
    "/api/scheduler/design-proposals/branch-commercial-models",
    {
      id: updatedPos.body.data.id,
      commerceId,
      mode: "POS_LINKED",
      posBranchId: "branch-rv4",
      timezone: "America/Mexico_City",
      cabinCount: 2,
      cabinCapacity: 1,
    },
  );
  assert.equal(reducedPos.status, 201);
  const polancoCabins = state.catalog.resources.filter(
    (resource) =>
      resource.branchProfileId === polancoProfile.id &&
      resource.kind === "ROOM",
  );
  assert.equal(polancoCabins.filter((resource) => resource.active).length, 2);
  assert.equal(polancoCabins.length, 4);

  const invalidRent = request(
    "POST",
    "/api/scheduler/design-proposals/branch-commercial-models",
    {
      commerceId,
      mode: "SCHEDULER_STANDALONE",
      branchName: "Satélite",
      timezone: "America/Mexico_City",
      cabinCount: 3,
      cabinCapacity: 1,
      branchMonthlyAmount: 500,
      cabinMonthlyAmount: 500,
    },
  );
  assert.equal(invalidRent.status, 400);

  const standalone = request(
    "POST",
    "/api/scheduler/design-proposals/branch-commercial-models",
    {
      commerceId,
      mode: "SCHEDULER_STANDALONE",
      branchName: "Satélite",
      timezone: "America/Mexico_City",
      cabinCount: 3,
      cabinCapacity: 2,
      branchMonthlyAmount: 2400,
      cabinMonthlyAmount: 300,
    },
  );
  assert.equal(standalone.status, 201);
  assert.equal(standalone.body.data.estimatedMonthlyAmount, 3300);
  assert.equal(standalone.body.data.mode, "SCHEDULER_STANDALONE");
  assert.ok(
    state.candidates.branches.some(
      (branch) => branch.id === standalone.body.data.branchId,
    ),
  );
  assert.equal(
    state.catalog.resources.filter(
      (resource) =>
        resource.branchProfileId === standalone.body.data.branchProfileId &&
        resource.kind === "ROOM" &&
        resource.active,
    ).length,
    3,
  );
  assert.ok(
    state.catalog.availabilityRules.some(
      (rule) =>
        rule.branchProfileId === standalone.body.data.branchProfileId &&
        rule.ownerType === "RESOURCE",
    ),
  );
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
      sellerNames: ["Cartera de la empresa"],
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
  assert.equal(inactive.total, 2);
  const inactiveNames = inactive.items.map((item) => item.displayName);
  assert.ok(inactiveNames.includes("Sofía Mendoza Lara"));
  assert.ok(inactiveNames.includes("Maria Camila Celis"));
  assert.ok(
    inactive.items.every((item) => item.agenda.lastAppointmentAt === null),
  );
});

test("la especialista preferida se fija por cliente sin impedir otra asignación por cita", () => {
  const { state, request } = session();
  const customerId = state.customers[0].id;
  const specialist = state.catalog.professionals[1];
  const saved = request(
    "PUT",
    `/api/scheduler/design-proposals/customers/${customerId}/specialist-preference`,
    { specialistProfileId: specialist.id },
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.specialistProfileId, specialist.id);
  assert.equal(
    request(
      "GET",
      `/api/scheduler/design-proposals/customers/${customerId}/specialist-preference`,
    ).body.data.specialistName,
    specialist.name,
  );
  assert.notEqual(
    state.appointments[0].services[0].professionals[0].professionalProfileId,
    undefined,
  );
  assert.equal(
    request(
      "PUT",
      `/api/scheduler/design-proposals/customers/${customerId}/specialist-preference`,
      { specialistProfileId: null },
    ).body.data,
    null,
  );
});

test("comentarios y postventa exigen asistencia, código y conservan snapshots descargables", () => {
  const { state, request } = session();
  const appointment = state.appointments.find(
    (candidate) => candidate.status === "ATTENDED",
  );
  const pendingAppointment = state.appointments.find(
    (candidate) => candidate.status === "CONFIRMED",
  );
  const unauthorized = request(
    "POST",
    `/api/scheduler/design-proposals/appointments/${appointment.id}/journal`,
    {
      kind: "SELLER_COMMENT",
      comment: "Seguimiento ficticio de la cita.",
      authorizationToken: "invalid",
    },
  );
  assert.equal(unauthorized.status, 403);

  const pendingGrant = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations",
    {
      code: "1111",
      purpose: "APPOINTMENT_COMMENT_CREATE",
      targetType: "APPOINTMENT_JOURNAL",
      targetId: pendingAppointment.id,
    },
  ).body.data;
  assert.equal(
    request(
      "POST",
      `/api/scheduler/design-proposals/appointments/${pendingAppointment.id}/journal`,
      {
        kind: "SELLER_COMMENT",
        comment: "Todavía no corresponde.",
        authorizationToken: pendingGrant.token,
      },
    ).status,
    409,
  );

  const grant = request(
    "POST",
    "/api/scheduler/design-proposals/operation-authorizations",
    {
      code: "1111",
      purpose: "POST_SALE_COMMENT_CREATE",
      targetType: "APPOINTMENT_JOURNAL",
      targetId: appointment.id,
    },
  ).body.data;
  const saved = request(
    "POST",
    `/api/scheduler/design-proposals/appointments/${appointment.id}/journal`,
    {
      kind: "POST_SALE_COMMENT",
      comment: "La clienta calificó bien el servicio.",
      categoryId: "service-good",
      categoryLabel: "Servicio bueno",
      categoryVersion: 1,
      authorizationToken: grant.token,
    },
  );
  assert.equal(saved.status, 201);
  assert.equal(saved.body.data.actorName, "Renata Castillo");
  assert.equal(saved.body.data.categoryLabel, "Servicio bueno");

  assert.equal(
    request(
      "POST",
      "/api/scheduler/design-proposals/operation-authorizations/commit",
      {
        token: grant.token,
        action: "Comentario postventa",
        targetType: "APPOINTMENT_JOURNAL",
        targetId: appointment.id,
      },
    ).status,
    201,
  );
  const report = request(
    "POST",
    "/api/scheduler/design-proposals/reports/appointment-journal",
    {
      dateFrom: "2020-01-01",
      dateTo: "2030-12-31",
      branchIds: [appointment.branchId],
      kinds: ["POST_SALE_COMMENT"],
    },
  );
  assert.equal(report.status, 201);
  assert.equal(report.body.data.summary.postSaleComments, 1);
  assert.equal(report.body.data.rows[0].customerName, appointment.customerName);
  assert.equal(report.body.data.rows[0].categoryLabel, "Servicio bueno");
});
