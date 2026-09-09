import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "./app";
import { prisma } from "./prisma/client";

const enabled = process.env["RUN_DATABASE_TESTS"] === "true";
const integrationDescribe = enabled ? describe : describe.skip;
const suffix = `${process.pid}-${Date.now()}`;
const email = `pos-integration-${suffix}@keysar.test`;
const password = "Pos-Integration-Password";
const masterPin = "741852";
const employeePin = "963258";
let server: Server;
let baseUrl = "";
let userId = "";
let branchId = "";
let secondBranchId = "";
let positionId = "";
let employeeId = "";
let terminalId = "";
let terminalSecret = "";
let sharedToken = "";
let masterToken = "";
let employeeToken = "";

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: (await response.json()) as Record<string, unknown> };
}

const json = (method: string, body: unknown, token?: string): RequestInit => ({
  method,
  headers: {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(body),
});

const mutationJson = (
  method: string,
  body: unknown,
  token: string,
): RequestInit => ({
  ...json(method, body, token),
  headers: {
    ...json(method, body, token).headers,
    "idempotency-key": randomUUID(),
  },
});

integrationDescribe("seguridad y terminales POS", () => {
  beforeAll(async () => {
    process.env["JWT_SECRET"] = "jwt-compartido-integracion-con-32-caracteres";
    process.env["POS_JWT_SECRET"] =
      "jwt-pos-integracion-separado-con-32-caracteres";
    process.env["POS_PIN_PEPPER"] =
      "pepper-pos-integracion-separado-con-32-caracteres";
    const [branch, secondBranch, position, employee, user] =
      await prisma.$transaction([
        prisma.sucursal.create({ data: { nombre: `POS Branch ${suffix}` } }),
        prisma.sucursal.create({ data: { nombre: `POS Branch 2 ${suffix}` } }),
        prisma.position.create({ data: { nombre: `POS Position ${suffix}` } }),
        prisma.empleado.create({
          data: {
            nombres: "POS",
            apellidoPaterno: "Integration",
            apellidoMaterno: "Employee",
            nombreCompleto: `POS Integration Employee ${suffix}`,
            banco: "TEST",
            numeroCuenta: suffix,
            puesto: "TEST",
            metaIndividual: 0,
          },
        }),
        prisma.usuario.create({
          data: {
            nombre: `POS Integration Admin ${suffix}`,
            email,
            passwordHash: await bcrypt.hash(password, 4),
            rol: "SUPER_ADMIN",
          },
        }),
      ]);
    branchId = branch.id;
    secondBranchId = secondBranch.id;
    positionId = position.id;
    employeeId = employee.id;
    userId = user.id;
    await prisma.empleado.update({
      where: { id: employeeId },
      data: { positionId, sucursalId: branchId },
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Puerto de integración no disponible");
    baseUrl = `http://127.0.0.1:${address.port}`;

    const login = await request(
      "/api/auth/login",
      json("POST", { email, password }),
    );
    sharedToken = (login.body["data"] as { token: string }).token;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    // Esta suite corre contra una base de datos efímera. La asistencia cerrada es
    // inmutable por diseño, así que sus fixtures se conservan hasta destruirla.
    await prisma.$disconnect();
  });

  it("provisiona sin exponer secretos y rechaza al puesto sin permisos", async () => {
    const terminal = await request(
      "/api/pos/terminals",
      json(
        "POST",
        { code: `TERM-${suffix}`, name: "Terminal integration", branchId },
        sharedToken,
      ),
    );
    expect(terminal.response.status).toBe(201);
    const terminalData = terminal.body["data"] as {
      terminal: { id: string; status: string };
      terminalSecret: string;
    };
    terminalId = terminalData.terminal.id;
    terminalSecret = terminalData.terminalSecret;
    expect(terminalData.terminal.status).toBe("PENDING");

    const master = await request(
      "/api/pos/provision/credentials",
      json(
        "PUT",
        {
          userId,
          alias: `master.${suffix}`,
          pin: masterPin,
          active: true,
          offlineEnabled: false,
          isMaster: true,
        },
        sharedToken,
      ),
    );
    expect(master.response.status).toBe(200);
    expect(JSON.stringify(master.body)).not.toContain(masterPin);

    const employee = await request(
      "/api/pos/provision/credentials",
      json(
        "PUT",
        {
          employeeId,
          alias: `employee.${suffix}`,
          pin: employeePin,
          active: true,
          offlineEnabled: false,
          isMaster: false,
        },
        sharedToken,
      ),
    );
    expect(employee.response.status).toBe(200);
    expect(JSON.stringify(employee.body)).not.toContain(employeePin);

    const pendingLogin = await request(
      "/api/pos/auth/login",
      json("POST", {
        alias: `master.${suffix}`,
        pin: masterPin,
        terminalCode: `TERM-${suffix}`,
        terminalSecret,
      }),
    );
    expect(pendingLogin.response.status).toBe(401);

    const activated = await request(
      `/api/pos/terminals/${terminalId}/status`,
      json("PATCH", { status: "ACTIVE" }, sharedToken),
    );
    expect(activated.response.status).toBe(200);

    const denied = await request(
      "/api/pos/auth/login",
      json("POST", {
        alias: `employee.${suffix}`,
        pin: employeePin,
        terminalCode: `TERM-${suffix}`,
        terminalSecret,
      }),
    );
    expect(denied.response.status).toBe(401);
  });

  it("otorga permisos sólo con autorización master y aplica 403 en ruta directa", async () => {
    const login = await request(
      "/api/pos/auth/login",
      json("POST", {
        alias: `master.${suffix}`,
        pin: masterPin,
        terminalCode: `TERM-${suffix}`,
        terminalSecret,
      }),
    );
    expect(login.response.status).toBe(200);
    masterToken = (login.body["data"] as { accessToken: string }).accessToken;
    const unboundAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          pin: masterPin,
          purpose: "POSITION_PERMISSIONS_UPDATE",
        },
        masterToken,
      ),
    );
    const unboundAuthorizationToken = (
      unboundAuthorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const rejectedUnboundAuthorization = await request(
      `/api/pos/access/positions/${positionId}/permissions`,
      json(
        "PUT",
        {
          permissions: ["SALE_CREATE"],
          authorizationToken: unboundAuthorizationToken,
        },
        masterToken,
      ),
    );
    expect(rejectedUnboundAuthorization.response.status).toBe(403);

    const authorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          alias: `master.${suffix}`,
          pin: masterPin,
          purpose: "POSITION_PERMISSIONS_UPDATE",
          entityType: "Position",
          entityId: positionId,
        },
        masterToken,
      ),
    );
    const authorizationToken = (
      authorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const updated = await request(
      `/api/pos/access/positions/${positionId}/permissions`,
      json(
        "PUT",
        { permissions: ["SALE_CREATE"], authorizationToken },
        masterToken,
      ),
    );
    expect(updated.response.status).toBe(200);
    const reused = await request(
      `/api/pos/access/positions/${positionId}/permissions`,
      json(
        "PUT",
        { permissions: ["SALE_CREATE"], authorizationToken },
        masterToken,
      ),
    );
    expect(reused.response.status).toBe(403);

    const expiringAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          pin: masterPin,
          purpose: "POSITION_PERMISSIONS_UPDATE",
          entityType: "Position",
          entityId: positionId,
        },
        masterToken,
      ),
    );
    expect(expiringAuthorization.response.status).toBe(201);
    const expiringAuthorizationToken = (
      expiringAuthorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const expiringRow = await prisma.masterAuthorization.findFirstOrThrow({
      where: {
        purpose: "POSITION_PERMISSIONS_UPDATE",
        entityId: positionId,
        usedAt: null,
      },
      orderBy: { creadoEn: "desc" },
    });
    await prisma.masterAuthorization.update({
      where: { id: expiringRow.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const expired = await request(
      `/api/pos/access/positions/${positionId}/permissions`,
      json(
        "PUT",
        {
          permissions: ["SALE_CREATE"],
          authorizationToken: expiringAuthorizationToken,
        },
        masterToken,
      ),
    );
    expect(expired.response.status).toBe(403);

    const employeeLogin = await request(
      "/api/pos/auth/login",
      json("POST", {
        alias: `employee.${suffix}`,
        pin: employeePin,
        terminalCode: `TERM-${suffix}`,
        terminalSecret,
      }),
    );
    expect(employeeLogin.response.status).toBe(200);
    employeeToken = (employeeLogin.body["data"] as { accessToken: string })
      .accessToken;
    const forbidden = await request("/api/pos/access/bootstrap", {
      headers: { authorization: `Bearer ${employeeToken}` },
    });
    expect(forbidden.response.status).toBe(403);
  });

  it("administra personal y delegación master sin exponer claves", async () => {
    const role = await request(
      "/api/pos/access/positions",
      json(
        "POST",
        {
          name: `Facialista RV3 ${suffix}`,
          description: "Puesto de integración RV3",
          active: true,
        },
        masterToken,
      ),
    );
    expect(role.response.status).toBe(201);
    const roleId = (role.body["data"] as { id: string }).id;
    const roleAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          pin: masterPin,
          purpose: "POSITION_PERMISSIONS_UPDATE",
          entityType: "Position",
          entityId: roleId,
        },
        masterToken,
      ),
    );
    expect(roleAuthorization.response.status).toBe(201);
    const permissionUpdate = await request(
      `/api/pos/access/positions/${roleId}/permissions`,
      json(
        "PUT",
        {
          permissions: ["CLOCK_IN_VIEW"],
          authorizationToken: (
            roleAuthorization.body["data"] as {
              authorizationToken: string;
            }
          ).authorizationToken,
        },
        masterToken,
      ),
    );
    expect(permissionUpdate.response.status).toBe(200);
    const pin = "1593";
    const alias = `rv3.${suffix}`;
    const employee = await request(
      "/api/pos/access/employees",
      json(
        "POST",
        {
          displayName: "Vendedora RV3",
          alias,
          pin,
          active: true,
          positionId: roleId,
        },
        masterToken,
      ),
    );
    expect(employee.response.status).toBe(201);
    expect(JSON.stringify(employee.body)).not.toContain(pin);
    const createdEmployeeId = (employee.body["data"] as { id: string }).id;

    const delegatedCode = "8520";
    const delegated = await request(
      "/api/pos/access/master-delegations",
      json(
        "PUT",
        { employeeIds: [createdEmployeeId], code: delegatedCode },
        masterToken,
      ),
    );
    expect(delegated.response.status).toBe(200);
    expect(JSON.stringify(delegated.body)).not.toContain(delegatedCode);
    const login = await request(
      "/api/pos/auth/login",
      json("POST", {
        alias,
        pin,
        terminalCode: `TERM-${suffix}`,
        terminalSecret,
      }),
    );
    const token = (login.body["data"] as { accessToken: string }).accessToken;
    expect(
      (login.body["data"] as { actor: { isMaster: boolean } }).actor.isMaster,
    ).toBe(true);
    const codeOnlyAuthorization = await request(
      "/api/pos/authorizations",
      json("POST", { pin: delegatedCode, purpose: "EMPLOYEES_ACCESS" }, token),
    );
    expect(codeOnlyAuthorization.response.status).toBe(201);
    const attributedAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          alias,
          pin: delegatedCode,
          purpose: "BUSINESS_DAY_CLOSE",
        },
        token,
      ),
    );
    expect(attributedAuthorization.response.status).toBe(201);

    const revoked = await request(
      "/api/pos/access/master-delegations",
      json(
        "PUT",
        { employeeIds: [createdEmployeeId], code: null },
        masterToken,
      ),
    );
    expect(revoked.response.status).toBe(200);
    expect(
      (
        await request("/api/pos/auth/me", {
          headers: { authorization: `Bearer ${token}` },
        })
      ).response.status,
    ).toBe(401);

    const personalLogin = await request(
      "/api/pos/auth/login",
      json("POST", {
        alias,
        pin,
        terminalCode: `TERM-${suffix}`,
        terminalSecret,
      }),
    );
    const personalToken = (
      personalLogin.body["data"] as { accessToken: string }
    ).accessToken;
    const nextAlias = `rv3.changed.${suffix}`;
    const selfChanged = await request(
      "/api/pos/access/me/credential",
      json(
        "PUT",
        { currentPin: pin, alias: nextAlias, newPin: "1594" },
        personalToken,
      ),
    );
    expect(selfChanged.response.status).toBe(200);
    expect(
      (
        await request("/api/pos/auth/me", {
          headers: { authorization: `Bearer ${personalToken}` },
        })
      ).response.status,
    ).toBe(401);
    expect(
      (
        await request(
          "/api/pos/auth/login",
          json("POST", {
            alias: nextAlias,
            pin: "1594",
            terminalCode: `TERM-${suffix}`,
            terminalSecret,
          }),
        )
      ).response.status,
    ).toBe(200);
  });

  it("liga autorización personal, alcance y permisos a la sesión vigente", async () => {
    const forcedIdentity = await request(
      "/api/pos/personal-authorizations",
      json(
        "POST",
        { pin: employeePin, purpose: "TICKET_REVIEW", sellerId: employeeId },
        employeeToken,
      ),
    );
    expect(forcedIdentity.response.status).toBe(400);

    const wrongIdentity = await request(
      "/api/pos/personal-authorizations",
      json("POST", { pin: masterPin, purpose: "TICKET_REVIEW" }, employeeToken),
    );
    expect(wrongIdentity.response.status).toBe(403);

    const personal = await request(
      "/api/pos/personal-authorizations",
      json(
        "POST",
        { pin: employeePin, purpose: "TICKET_REVIEW" },
        employeeToken,
      ),
    );
    expect(personal.response.status).toBe(201);

    const branchAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          alias: `master.${suffix}`,
          pin: masterPin,
          purpose: "POSITION_BRANCH_SCOPE_UPDATE",
          entityType: "Position",
          entityId: positionId,
        },
        masterToken,
      ),
    );
    const branchAuthorizationToken = (
      branchAuthorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const assigned = await request(
      `/api/pos/access/positions/${positionId}/branches`,
      json(
        "PUT",
        {
          branchIds: [branchId, secondBranchId],
          authorizationToken: branchAuthorizationToken,
        },
        masterToken,
      ),
    );
    expect(assigned.response.status).toBe(200);

    const permissionAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          alias: `master.${suffix}`,
          pin: masterPin,
          purpose: "POSITION_PERMISSIONS_UPDATE",
          entityType: "Position",
          entityId: positionId,
        },
        masterToken,
      ),
    );
    const permissionAuthorizationToken = (
      permissionAuthorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const expanded = await request(
      `/api/pos/access/positions/${positionId}/permissions`,
      json(
        "PUT",
        {
          permissions: [
            "SALE_CREATE",
            "REPORTS_VIEW",
            "REPORTS_PRINT",
            "BUSINESS_DAY_OPEN",
            "CLOCK_IN_VIEW",
            "SESSION_EXIT",
          ],
          authorizationToken: permissionAuthorizationToken,
        },
        masterToken,
      ),
    );
    expect(expanded.response.status).toBe(200);

    const liveSession = await request("/api/pos/auth/me", {
      headers: { authorization: `Bearer ${employeeToken}` },
    });
    expect(liveSession.response.status).toBe(401);
    const refreshedEmployeeLogin = await request(
      "/api/pos/auth/login",
      json("POST", {
        alias: `employee.${suffix}`,
        pin: employeePin,
        terminalCode: `TERM-${suffix}`,
        terminalSecret,
      }),
    );
    expect(refreshedEmployeeLogin.response.status).toBe(200);
    employeeToken = (
      refreshedEmployeeLogin.body["data"] as { accessToken: string }
    ).accessToken;
    const refreshedSession = await request("/api/pos/auth/me", {
      headers: { authorization: `Bearer ${employeeToken}` },
    });
    const liveData = refreshedSession.body["data"] as {
      authorizedBranches: Array<{ id: string }>;
    };
    expect(
      liveData.authorizedBranches.map((branch) => branch.id).sort(),
    ).toEqual([branchId, secondBranchId].sort());

    const period = "2026-09-03";
    const allowedReport = await request(
      `/api/pos/reports/SALES_DETAIL?dateFrom=${period}&dateTo=${period}&branchIds=${secondBranchId}`,
      { headers: { authorization: `Bearer ${employeeToken}` } },
    );
    expect(allowedReport.response.status).toBe(200);
    const reportData = allowedReport.body["data"] as { branchIds: string[] };
    expect(reportData.branchIds).toEqual([secondBranchId]);

    const forcedBranch = await request(
      `/api/pos/reports/SALES_DETAIL?dateFrom=${period}&dateTo=${period}&branchIds=${randomUUID()}`,
      { headers: { authorization: `Bearer ${employeeToken}` } },
    );
    expect(forcedBranch.response.status).toBe(403);

    const revokeAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          alias: `master.${suffix}`,
          pin: masterPin,
          purpose: "POSITION_PERMISSIONS_UPDATE",
          entityType: "Position",
          entityId: positionId,
        },
        masterToken,
      ),
    );
    const revokeAuthorizationToken = (
      revokeAuthorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    await request(
      `/api/pos/access/positions/${positionId}/permissions`,
      json(
        "PUT",
        {
          permissions: [
            "SALE_CREATE",
            "BUSINESS_DAY_OPEN",
            "CLOCK_IN_VIEW",
            "SESSION_EXIT",
          ],
          authorizationToken: revokeAuthorizationToken,
        },
        masterToken,
      ),
    );
    const removedLive = await request(
      `/api/pos/reports/SALES_DETAIL?dateFrom=${period}&dateTo=${period}`,
      { headers: { authorization: `Bearer ${employeeToken}` } },
    );
    expect(removedLive.response.status).toBe(401);
    const relogin = await request(
      "/api/pos/auth/login",
      json("POST", {
        alias: `employee.${suffix}`,
        pin: employeePin,
        terminalCode: `TERM-${suffix}`,
        terminalSecret,
      }),
    );
    expect(relogin.response.status).toBe(200);
    employeeToken = (relogin.body["data"] as { accessToken: string })
      .accessToken;
  });

  it("persiste catálogo y clientes RV4 sin exponer costos ni reutilizar autorizaciones", async () => {
    const sku = `RV4-${suffix}`.toUpperCase();
    const createdItem = await request(
      "/api/pos/catalog/items",
      json(
        "POST",
        {
          sku,
          name: `Producto RV4 ${suffix}`,
          kind: "PRODUCT",
          description: "Producto persistente para integración RV4",
          benefits: ["Persistencia comprobable"],
          branchIds: [branchId],
          published: true,
          listPrice: "199.00",
          minimumPrice: "179.00",
          unitCost: "81.00",
          unitCostUsd: "4.50",
          partnerCost: "99.00",
          taxRate: "16.00",
        },
        masterToken,
      ),
    );
    expect(createdItem.response.status).toBe(201);
    expect((createdItem.body["data"] as { unitCost: string }).unitCost).toBe(
      "81.00",
    );

    const employeeCatalog = await request(
      `/api/pos/catalog/items?query=${encodeURIComponent(sku)}&page=1&pageSize=20`,
      { headers: { authorization: `Bearer ${employeeToken}` } },
    );
    expect(employeeCatalog.response.status).toBe(200);
    const employeeItem = (
      employeeCatalog.body["data"] as {
        items: Array<Record<string, unknown>>;
      }
    ).items[0];
    expect(employeeItem?.["sku"]).toBe(sku);
    expect(employeeItem).not.toHaveProperty("unitCost");
    expect(employeeItem).not.toHaveProperty("partnerCost");

    const customerPhone = `55${Date.now().toString().slice(-8)}`;
    const createdCustomer = await request(
      "/api/pos/customers",
      json(
        "POST",
        {
          displayName: `Clienta RV4 ${suffix}`,
          firstName: "Clienta",
          lastName: "RV4",
          birthday: "1990-09-09",
          phone: customerPhone,
          whatsapp: customerPhone,
          registrationFolio: `CLI-${suffix}`,
          registrationBranchId: branchId,
          branchId,
        },
        masterToken,
      ),
    );
    expect(createdCustomer.response.status).toBe(201);
    const customerId = (createdCustomer.body["data"] as { id: string }).id;

    const reloadedCustomers = await request(
      "/api/pos/customers?page=1&pageSize=100",
      { headers: { authorization: `Bearer ${masterToken}` } },
    );
    expect(reloadedCustomers.response.status).toBe(200);
    expect(
      (
        reloadedCustomers.body["data"] as {
          items: Array<{ id: string; registrationFolio: string | null }>;
        }
      ).items,
    ).toContainEqual(
      expect.objectContaining({
        id: customerId,
        registrationFolio: `CLI-${suffix}`,
      }),
    );

    const authorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: masterPin, purpose: "CUSTOMER_DIRECTORY_ADMIN" },
        masterToken,
      ),
    );
    expect(authorization.response.status).toBe(201);
    const authorizationToken = (
      authorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const removed = await request(
      `/api/pos/customers/${customerId}`,
      json("DELETE", { authorizationToken }, masterToken),
    );
    expect(removed.response.status).toBe(200);
    const reused = await request(
      `/api/pos/customers/${customerId}`,
      json("DELETE", { authorizationToken }, masterToken),
    );
    expect(reused.response.status).toBe(403);
  });

  it("hace Clock Out personal e idempotente y sale sin cerrar la jornada", async () => {
    const openingAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          alias: `master.${suffix}`,
          pin: masterPin,
          purpose: "BUSINESS_DAY_OPEN_SKIP",
          entityType: "Sucursal",
          entityId: branchId,
        },
        employeeToken,
      ),
    );
    expect(openingAuthorization.response.status).toBe(201);
    const openingAuthorizationToken = (
      openingAuthorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const opened = await request(
      "/api/pos/business-days/open",
      mutationJson(
        "POST",
        { skipped: true, authorizationToken: openingAuthorizationToken },
        employeeToken,
      ),
    );
    expect(opened.response.status).toBe(201);

    const attendanceList = await request(
      `/api/pos/attendance?branchId=${branchId}`,
      { headers: { authorization: `Bearer ${employeeToken}` } },
    );
    const attendance = (
      attendanceList.body["data"] as {
        items: Array<{ id: string; status: string }>;
      }
    ).items.find((item) => item.status === "OPEN");
    expect(attendance).toBeDefined();

    const service = await request(
      "/api/pos/catalog/items",
      json(
        "POST",
        {
          sku: `RV5-SVC-${suffix}`.toUpperCase(),
          name: `Servicio RV5 ${suffix}`,
          kind: "SERVICE",
          description: "Servicio persistente para checkout RV5",
          benefits: ["Flujo de venta integrado"],
          branchIds: [branchId],
          published: true,
          listPrice: "199.00",
          minimumPrice: "179.00",
          unitCost: "40.00",
          unitCostUsd: "0.00",
          partnerCost: "0.00",
          taxRate: "16.00",
        },
        masterToken,
      ),
    );
    expect(service.response.status).toBe(201);
    const serviceId = (service.body["data"] as { id: string }).id;
    const [cash, transfer] = await prisma.$transaction([
      prisma.metodoPago.create({
        data: {
          nombre: `Efectivo RV5 ${suffix}`,
          tipo: "EFECTIVO",
          posPolicy: { create: { activeForPos: true } },
        },
      }),
      prisma.metodoPago.create({
        data: {
          nombre: `Otro RV5 ${suffix}`,
          tipo: "OTRO",
          posPolicy: { create: { activeForPos: true } },
        },
      }),
    ]);
    const checkout = await request(
      "/api/pos/tickets",
      mutationJson(
        "POST",
        {
          branchId,
          customer: {
            create: {
              displayName: "Clienta Checkout RV5",
              firstName: "Clienta",
              lastName: "Checkout",
              birthday: "1991-04-12",
              gender: "MUJER",
              phone: `56${Date.now().toString().slice(-8)}`,
              whatsapp: `57${Date.now().toString().slice(-8)}`,
              companyName: "Keysar Cosmetics",
              registrationFolio: `CLI-RV5-${suffix}`,
              registrationBranchId: branchId,
              ownerEmployeeId: employeeId,
            },
          },
          lines: [
            {
              itemId: serviceId,
              quantity: "1.00",
              unitPrice: "199.00",
              delivered: true,
            },
          ],
          sellers: [{ employeeId, share: "199.00" }],
          payments: [
            { methodId: cash.id, amount: "100.00" },
            { methodId: transfer.id, amount: "99.00" },
          ],
        },
        employeeToken,
      ),
    );
    expect(checkout.response.status).toBe(201);
    const checkoutData = checkout.body["data"] as {
      id: string;
      customerId: string;
      total: string;
      amountReceived: string;
      paymentOperations: Array<{ payments: unknown[] }>;
    };
    expect(checkoutData.total).toBe("199.00");
    expect(checkoutData.amountReceived).toBe("199.00");
    expect(checkoutData.paymentOperations[0]?.payments).toHaveLength(2);
    await expect(
      prisma.customer.findUniqueOrThrow({
        where: { id: checkoutData.customerId },
        select: {
          firstName: true,
          lastName: true,
          birthday: true,
          whatsapp: true,
          companyName: true,
          registrationFolio: true,
          registrationBranchId: true,
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        firstName: "Clienta",
        lastName: "Checkout",
        companyName: "Keysar Cosmetics",
        registrationFolio: `CLI-RV5-${suffix}`,
        registrationBranchId: branchId,
      }),
    );

    const receiptsAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: masterPin, purpose: "RECEIPT_HISTORY_ADMIN" },
        masterToken,
      ),
    );
    const receiptsAuthorizationToken = (
      receiptsAuthorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const revision = await request(
      `/api/pos/tickets/${checkoutData.id}/revisions`,
      mutationJson(
        "POST",
        {
          reason: "Corrección de prueba RV5",
          revision: { clientName: "Clienta Checkout RV5" },
          authorizationToken: receiptsAuthorizationToken,
        },
        masterToken,
      ),
    );
    expect(revision.response.status).toBe(201);
    const rejectedReuse = await request(
      `/api/pos/tickets/${checkoutData.id}/cancellations`,
      mutationJson(
        "POST",
        {
          reason: "No debe reutilizar la autorización",
          refundAmount: "199.00",
          returnedLines: [],
          authorizationToken: receiptsAuthorizationToken,
        },
        masterToken,
      ),
    );
    expect(rejectedReuse.response.status).toBe(403);
    const cancellationAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: masterPin, purpose: "RECEIPT_HISTORY_ADMIN" },
        masterToken,
      ),
    );
    const cancellation = await request(
      `/api/pos/tickets/${checkoutData.id}/cancellations`,
      mutationJson(
        "POST",
        {
          reason: "Cancelación compensada RV5",
          refundAmount: "199.00",
          returnedLines: [],
          authorizationToken: (
            cancellationAuthorization.body["data"] as {
              authorizationToken: string;
            }
          ).authorizationToken,
        },
        masterToken,
      ),
    );
    expect(cancellation.response.status).toBe(201);

    const identified = await request(
      "/api/pos/attendance/identify",
      json("POST", { pin: employeePin }, employeeToken),
    );
    expect(identified.response.status).toBe(200);
    expect(
      (identified.body["data"] as { openAttendance: { id: string } })
        .openAttendance.id,
    ).toBe(attendance!.id);

    const forcedSeller = await request(
      `/api/pos/attendance/${attendance!.id}/clock-out`,
      mutationJson("POST", { pin: masterPin }, employeeToken),
    );
    expect(forcedSeller.response.status).toBe(403);

    const firstClockOut = await request(
      `/api/pos/attendance/${attendance!.id}/clock-out`,
      mutationJson("POST", { pin: employeePin }, employeeToken),
    );
    expect(firstClockOut.response.status).toBe(200);
    const secondClockOut = await request(
      `/api/pos/attendance/${attendance!.id}/clock-out`,
      mutationJson("POST", { pin: employeePin }, employeeToken),
    );
    expect(secondClockOut.response.status).toBe(200);
    expect((secondClockOut.body["data"] as { id: string }).id).toBe(
      attendance!.id,
    );

    const dayBefore = await prisma.posBusinessDay.findFirstOrThrow({
      where: { branchId, status: "OPEN" },
      select: { id: true, status: true, closeSummary: true },
    });
    const attendanceBefore = await prisma.posAttendance.count({
      where: { businessDayId: dayBefore.id },
    });
    const exited = await request(
      "/api/pos/session/exit",
      json("POST", {}, employeeToken),
    );
    expect(exited.response.status).toBe(200);
    const dayAfter = await prisma.posBusinessDay.findUniqueOrThrow({
      where: { id: dayBefore.id },
      select: { status: true, closeSummary: true },
    });
    expect(dayAfter).toEqual({ status: "OPEN", closeSummary: null });
    expect(
      await prisma.posAttendance.count({
        where: { businessDayId: dayBefore.id },
      }),
    ).toBe(attendanceBefore);
    const deadSession = await request("/api/pos/auth/me", {
      headers: { authorization: `Bearer ${employeeToken}` },
    });
    expect(deadSession.response.status).toBe(401);
    expect(
      await prisma.posPersonalAuthorization.count({
        where: {
          credential: { employeeId },
          session: { revokedAt: { not: null } },
          revokedAt: { not: null },
        },
      }),
    ).toBeGreaterThan(0);
  });

  it("registra el conteo final y cierra la jornada con el actor autorizador", async () => {
    const day = await prisma.posBusinessDay.findFirstOrThrow({
      where: { branchId, status: "OPEN" },
      select: { id: true },
    });
    const skipAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          pin: masterPin,
          purpose: "BUSINESS_DAY_CLOSE_SKIP",
          entityType: "PosBusinessDay",
          entityId: day.id,
        },
        masterToken,
      ),
    );
    expect(skipAuthorization.response.status).toBe(201);
    const closingCount = await request(
      `/api/pos/business-days/${day.id}/closing-count`,
      mutationJson(
        "POST",
        {
          skipped: true,
          authorizationToken: (
            skipAuthorization.body["data"] as {
              authorizationToken: string;
            }
          ).authorizationToken,
        },
        masterToken,
      ),
    );
    expect(closingCount.response.status).toBe(201);

    const closeAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          alias: `master.${suffix}`,
          pin: masterPin,
          purpose: "BUSINESS_DAY_CLOSE",
          entityType: "PosBusinessDay",
          entityId: day.id,
        },
        masterToken,
      ),
    );
    expect(closeAuthorization.response.status).toBe(201);
    const closeRequest = mutationJson(
      "POST",
      {
        authorizationToken: (
          closeAuthorization.body["data"] as { authorizationToken: string }
        ).authorizationToken,
      },
      masterToken,
    );
    const closed = await request(
      `/api/pos/business-days/${day.id}/close`,
      closeRequest,
    );
    expect(closed.response.status).toBe(200);
    const repeated = await request(
      `/api/pos/business-days/${day.id}/close`,
      closeRequest,
    );
    expect(repeated.response.status).toBe(200);
    expect(repeated.body["data"]).toEqual(closed.body["data"]);
    expect(repeated.body["message"]).toBe(closed.body["message"]);
    expect(repeated.body["replayed"]).toBe(true);

    const masterCredential = await prisma.posCredential.findUniqueOrThrow({
      where: { userId },
      select: { id: true },
    });
    const persisted = await prisma.posBusinessDay.findUniqueOrThrow({
      where: { id: day.id },
      select: {
        status: true,
        closedByCredentialId: true,
        closeSummary: true,
      },
    });
    expect(persisted.status).toBe("CLOSED");
    expect(persisted.closedByCredentialId).toBe(masterCredential.id);
    expect(persisted.closeSummary).not.toBeNull();
  });

  it("cambia la sucursal una sola vez y revoca las sesiones ligadas a la asignación anterior", async () => {
    const authorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          alias: `master.${suffix}`,
          pin: masterPin,
          purpose: "TERMINAL_BRANCH_CHANGE",
          entityType: "PosTerminal",
          entityId: terminalId,
        },
        masterToken,
      ),
    );
    const authorizationToken = (
      authorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const changed = await request(
      `/api/pos/terminals/${terminalId}/branch`,
      json(
        "POST",
        { branchId: secondBranchId, authorizationToken },
        masterToken,
      ),
    );
    expect(changed.response.status).toBe(200);

    const replay = await request(
      `/api/pos/terminals/${terminalId}/branch`,
      json("POST", { branchId, authorizationToken }, masterToken),
    );
    expect(replay.response.status).toBe(401);
  });

  it("revoca la terminal y corta una sesión vigente", async () => {
    const login = await request(
      "/api/pos/auth/login",
      json("POST", {
        alias: `master.${suffix}`,
        pin: masterPin,
        terminalCode: `TERM-${suffix}`,
        terminalSecret,
      }),
    );
    expect(login.response.status).toBe(200);
    const token = (login.body["data"] as { accessToken: string }).accessToken;

    const revoked = await request(
      `/api/pos/terminals/${terminalId}/status`,
      json("PATCH", { status: "REVOKED" }, sharedToken),
    );
    expect(revoked.response.status).toBe(200);

    const session = await request("/api/pos/auth/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(session.response.status).toBe(401);
  });
});
