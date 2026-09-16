import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "./app";
import { prisma } from "./prisma/client";
import { consumeMembershipAttendance } from "./services/pos-memberships";
import { hashOpaqueToken } from "./services/pos-security";

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

    const owedItem = await request(
      "/api/pos/catalog/items",
      json(
        "POST",
        {
          sku: `RV5-DEL-${suffix}`.toUpperCase(),
          name: `Producto entregable RV5 ${suffix}`,
          kind: "PRODUCT",
          description: "Producto para historial canónico de entregas",
          benefits: ["Entrega parcial y final"],
          branchIds: [branchId],
          published: true,
          listPrice: "100.00",
          minimumPrice: "90.00",
          unitCost: "40.00",
          unitCostUsd: "0.00",
          partnerCost: "50.00",
          taxRate: "16.00",
        },
        masterToken,
      ),
    );
    expect(owedItem.response.status).toBe(201);
    const owedItemId = (owedItem.body["data"] as { id: string }).id;
    const branchLocation = await prisma.inventoryLocation.upsert({
      where: { branchId },
      create: {
        code: `RV5-BRANCH-${suffix}`.toUpperCase(),
        name: `Ubicación RV5 ${suffix}`,
        type: "BRANCH",
        branchId,
      },
      update: {},
    });
    await prisma.inventoryBalance.upsert({
      where: {
        locationId_itemId: {
          locationId: branchLocation.id,
          itemId: owedItemId,
        },
      },
      create: {
        locationId: branchLocation.id,
        itemId: owedItemId,
        availableQuantity: 3,
      },
      update: { availableQuantity: 3 },
    });
    const owedCheckout = await request(
      "/api/pos/tickets",
      mutationJson(
        "POST",
        {
          branchId,
          customer: { id: checkoutData.customerId },
          lines: [
            {
              itemId: owedItemId,
              quantity: "3.00",
              unitPrice: "100.00",
              delivered: false,
            },
          ],
          sellers: [{ employeeId, share: "300.00" }],
          payments: [{ methodId: cash.id, amount: "300.00" }],
        },
        employeeToken,
      ),
    );
    expect(owedCheckout.response.status).toBe(201);
    const owedTicket = owedCheckout.body["data"] as {
      id: string;
      owedProducts: Array<{ id: string; deliveries?: unknown[] }>;
    };
    expect(owedTicket.owedProducts).toHaveLength(1);
    expect(owedTicket.owedProducts[0]?.deliveries).toEqual([]);
    const owedProductId = owedTicket.owedProducts[0]!.id;
    const partialDeliveryKey = randomUUID();
    const postDelivery = (quantity: string, idempotencyKey: string) =>
      request(`/api/pos/owed-products/${owedProductId}/deliveries`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${employeeToken}`,
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({ quantity }),
      });
    const partialDelivery = await postDelivery("1.00", partialDeliveryKey);
    expect(partialDelivery.response.status).toBe(201);
    const partialDeliveryReplay = await postDelivery(
      "1.00",
      partialDeliveryKey,
    );
    expect(partialDeliveryReplay.response.status).toBe(201);
    expect(partialDeliveryReplay.body["data"]).toEqual(
      partialDelivery.body["data"],
    );
    const finalDelivery = await postDelivery("2.00", randomUUID());
    expect(finalDelivery.response.status).toBe(201);

    const ticketAfterDeliveries = await request(
      `/api/pos/tickets/${owedTicket.id}`,
      { headers: { authorization: `Bearer ${masterToken}` } },
    );
    expect(ticketAfterDeliveries.response.status).toBe(200);
    const deliveredOwed = (
      ticketAfterDeliveries.body["data"] as {
        owedProducts: Array<{
          id: string;
          status: string;
          deliveredQuantity: string;
          deliveries: Array<{
            id: string;
            quantity: string;
            deliveredAt: string;
            actorCredentialId: string;
            actorName: string;
            inventoryMovementId: string;
          }>;
        }>;
      }
    ).owedProducts[0]!;
    expect(deliveredOwed.status).toBe("DELIVERED");
    expect(deliveredOwed.deliveredQuantity).toBe("3.00");
    expect(deliveredOwed.deliveries.map((item) => item.quantity)).toEqual([
      "1.00",
      "2.00",
    ]);
    expect(deliveredOwed.deliveries.map((item) => item.actorName)).toEqual([
      `POS Integration Employee ${suffix}`,
      `POS Integration Employee ${suffix}`,
    ]);
    expect(
      deliveredOwed.deliveries.every(
        (item) =>
          Boolean(item.actorCredentialId) &&
          Boolean(item.inventoryMovementId) &&
          Number.isFinite(Date.parse(item.deliveredAt)),
      ),
    ).toBe(true);
    const deliveryRows = await prisma.posOwedProductDeliveryLine.findMany({
      where: { owedProductId },
      include: { delivery: true },
      orderBy: { delivery: { creadoEn: "asc" } },
    });
    expect(deliveryRows).toHaveLength(2);
    expect(deliveryRows.map((row) => row.quantity.toFixed(2))).toEqual([
      "1.00",
      "2.00",
    ]);
    expect(deliveredOwed.deliveries.map((item) => item.id)).toEqual(
      deliveryRows.map((row) => row.deliveryId),
    );

    const ticketListAfterDeliveries = await request(
      `/api/pos/tickets?customerId=${checkoutData.customerId}&page=1&pageSize=20`,
      { headers: { authorization: `Bearer ${masterToken}` } },
    );
    expect(ticketListAfterDeliveries.response.status).toBe(200);
    const listedOwedTicket = (
      ticketListAfterDeliveries.body["data"] as {
        items: Array<{
          id: string;
          owedProducts: Array<{ deliveries: unknown[] }>;
        }>;
      }
    ).items.find((item) => item.id === owedTicket.id);
    expect(listedOwedTicket?.owedProducts[0]?.deliveries).toEqual(
      deliveredOwed.deliveries,
    );

    const revisionItem = await request(
      "/api/pos/catalog/items",
      json(
        "POST",
        {
          sku: `RV5-REV-${suffix}`.toUpperCase(),
          name: `Producto revisable RV5 ${suffix}`,
          kind: "PRODUCT",
          description: "Producto para revisión compensatoria",
          benefits: ["Conciliación incremental"],
          branchIds: [branchId],
          published: true,
          listPrice: "50.00",
          minimumPrice: "40.00",
          unitCost: "20.00",
          unitCostUsd: "0.00",
          partnerCost: "25.00",
          taxRate: "16.00",
        },
        masterToken,
      ),
    );
    expect(revisionItem.response.status).toBe(201);
    const revisionItemId = (revisionItem.body["data"] as { id: string }).id;
    await prisma.inventoryBalance.create({
      data: {
        locationId: branchLocation.id,
        itemId: revisionItemId,
        availableQuantity: 10,
      },
    });
    const revisableCheckout = await request(
      "/api/pos/tickets",
      mutationJson(
        "POST",
        {
          branchId,
          customer: { id: checkoutData.customerId },
          lines: [
            {
              itemId: revisionItemId,
              quantity: "2.00",
              unitPrice: "50.00",
              delivered: true,
            },
          ],
          sellers: [{ employeeId, share: "100.00" }],
          payments: [{ methodId: cash.id, amount: "100.00" }],
        },
        employeeToken,
      ),
    );
    expect(revisableCheckout.response.status).toBe(201);
    const revisableTicket = revisableCheckout.body["data"] as {
      id: string;
      folio: string;
    };
    const revisionAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: masterPin, purpose: "RECEIPT_HISTORY_ADMIN" },
        masterToken,
      ),
    );
    const revisionAuthorizationToken = (
      revisionAuthorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const rejectedDeliveredReduction = await request(
      `/api/pos/tickets/${owedTicket.id}/revisions`,
      mutationJson(
        "POST",
        {
          reason: "No reducir una entrega ya materializada",
          authorizationToken: revisionAuthorizationToken,
          revision: {
            clientName: "Clienta Checkout RV5",
            clientPhone: "5512345678",
            sellerIds: [employeeId],
            products: [
              {
                itemId: owedItemId,
                quantity: "2.00",
                unitPrice: "100.00",
              },
            ],
            discountAmount: "0.00",
            paymentStatus: "PAID",
            amountPaid: "200.00",
            payments: [{ methodId: cash.id, amount: "200.00" }],
          },
        },
        masterToken,
      ),
    );
    expect(rejectedDeliveredReduction.response.status).toBe(409);
    const owedRevisionKey = randomUUID();
    const owedRevisionPayload = {
      reason: "Ampliar adeudo conservando entregas RV5-P1",
      authorizationToken: revisionAuthorizationToken,
      revision: {
        clientName: "Clienta Checkout RV5",
        clientPhone: "5512345678",
        sellerIds: [employeeId],
        products: [
          {
            itemId: owedItemId,
            quantity: "4.00",
            unitPrice: "100.00",
          },
        ],
        discountAmount: "0.00",
        paymentStatus: "PAID" as const,
        amountPaid: "400.00",
        payments: [{ methodId: cash.id, amount: "400.00" }],
      },
    };
    const postOwedRevision = () =>
      request(`/api/pos/tickets/${owedTicket.id}/revisions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${masterToken}`,
          "idempotency-key": owedRevisionKey,
        },
        body: JSON.stringify(owedRevisionPayload),
      });
    const appliedOwedRevision = await postOwedRevision();
    expect(appliedOwedRevision.response.status).toBe(201);
    expect(appliedOwedRevision.body["data"]).toEqual(
      expect.objectContaining({
        version: 2,
        differences: expect.arrayContaining([
          expect.objectContaining({ field: "OWED_PRODUCTS" }),
        ]),
      }),
    );
    const replayedOwedRevision = await postOwedRevision();
    expect(replayedOwedRevision.response.status).toBe(201);
    expect(replayedOwedRevision.body["data"]).toEqual(
      appliedOwedRevision.body["data"],
    );
    const owedAfterRevision = await request(
      `/api/pos/tickets/${owedTicket.id}`,
      { headers: { authorization: `Bearer ${masterToken}` } },
    );
    expect(owedAfterRevision.response.status).toBe(200);
    const owedAfterRevisionData = owedAfterRevision.body["data"] as {
      lines: Array<{ itemId: string; quantity: string }>;
      owedProducts: Array<{
        quantity: string;
        deliveredQuantity: string;
        pendingQuantity: string;
        status: string;
        deliveries: Array<{ id: string; quantity: string }>;
      }>;
    };
    expect(owedAfterRevisionData.lines).toEqual([
      expect.objectContaining({ itemId: owedItemId, quantity: "4.00" }),
    ]);
    expect(owedAfterRevisionData.owedProducts).toEqual([
      expect.objectContaining({
        quantity: "4.00",
        deliveredQuantity: "3.00",
        pendingQuantity: "1.00",
        status: "PENDING",
        deliveries: deliveredOwed.deliveries,
      }),
    ]);
    const [
      owedRevisionEvents,
      owedRevisionOperations,
      owedRevisionBalance,
      owedProjectionSum,
    ] = await Promise.all([
      prisma.posTicketEvent.findMany({
        where: { ticketId: owedTicket.id, type: "REVISION" },
      }),
      prisma.posPaymentOperation.findMany({
        where: { ticketId: owedTicket.id },
        orderBy: { creadoEn: "asc" },
      }),
      prisma.inventoryBalance.findUniqueOrThrow({
        where: {
          locationId_itemId: {
            locationId: branchLocation.id,
            itemId: owedItemId,
          },
        },
      }),
      prisma.posLegacySaleProjection.aggregate({
        where: { operation: { ticketId: owedTicket.id } },
        _sum: { amount: true },
      }),
    ]);
    expect(owedRevisionEvents).toHaveLength(1);
    expect(owedRevisionEvents[0]?.snapshot).toEqual(
      expect.objectContaining({
        effects: expect.objectContaining({
          inventoryMovementId: null,
          owedProductChanges: [
            expect.objectContaining({
              id: owedProductId,
              before: { quantity: "3.00", status: "DELIVERED" },
              after: { quantity: "4.00", status: "PENDING" },
            }),
          ],
        }),
      }),
    );
    expect(owedRevisionOperations.map((operation) => operation.kind)).toEqual([
      "SALE",
      "REFUND",
      "REVISION",
    ]);
    expect(
      owedRevisionOperations.map((operation) => operation.amount.toFixed(2)),
    ).toEqual(["300.00", "300.00", "400.00"]);
    expect(owedRevisionBalance.availableQuantity.toFixed(2)).toBe("0.00");
    expect(owedProjectionSum._sum.amount?.toFixed(2)).toBe("400.00");
    await prisma.inventoryBalance.update({
      where: {
        locationId_itemId: {
          locationId: branchLocation.id,
          itemId: owedItemId,
        },
      },
      data: { availableQuantity: { increment: 1 } },
    });
    const deliveredAfterRevision = await postDelivery("1.00", randomUUID());
    expect(deliveredAfterRevision.response.status).toBe(201);
    const owedAfterFinalDelivery = await request(
      `/api/pos/tickets/${owedTicket.id}`,
      { headers: { authorization: `Bearer ${masterToken}` } },
    );
    expect(owedAfterFinalDelivery.response.status).toBe(200);
    expect(
      (
        owedAfterFinalDelivery.body["data"] as {
          owedProducts: Array<{
            quantity: string;
            deliveredQuantity: string;
            pendingQuantity: string;
            status: string;
            deliveries: Array<{ quantity: string }>;
          }>;
        }
      ).owedProducts[0],
    ).toEqual(
      expect.objectContaining({
        quantity: "4.00",
        deliveredQuantity: "4.00",
        pendingQuantity: "0.00",
        status: "DELIVERED",
        deliveries: [
          expect.objectContaining({ quantity: "1.00" }),
          expect.objectContaining({ quantity: "2.00" }),
          expect.objectContaining({ quantity: "1.00" }),
        ],
      }),
    );

    const retailRevisionAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: masterPin, purpose: "RECEIPT_HISTORY_ADMIN" },
        masterToken,
      ),
    );
    const retailRevisionAuthorizationToken = (
      retailRevisionAuthorization.body["data"] as {
        authorizationToken: string;
      }
    ).authorizationToken;
    const revisionKey = randomUUID();
    const revisionPayload = {
      reason: "Ajuste de cantidad y precio RV5-P1",
      authorizationToken: retailRevisionAuthorizationToken,
      revision: {
        clientName: "Clienta Checkout RV5 Corregida",
        clientPhone: "5512345678",
        sellerIds: [employeeId],
        products: [
          {
            itemId: revisionItemId,
            quantity: "3.00",
            unitPrice: "40.00",
          },
        ],
        discountAmount: "0.00",
        paymentStatus: "PAID",
        amountPaid: "120.00",
        payments: [{ methodId: cash.id, amount: "120.00" }],
      },
    };
    const postRevision = () =>
      request(`/api/pos/tickets/${revisableTicket.id}/revisions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${masterToken}`,
          "idempotency-key": revisionKey,
        },
        body: JSON.stringify(revisionPayload),
      });
    const appliedRevision = await postRevision();
    expect(appliedRevision.response.status).toBe(201);
    expect(appliedRevision.body["data"]).toEqual(
      expect.objectContaining({
        actorCredentialId: expect.any(String),
        version: 2,
        differences: expect.arrayContaining([
          expect.objectContaining({ field: "LINES" }),
          expect.objectContaining({ field: "TOTALS" }),
          expect.objectContaining({ field: "PAYMENTS" }),
        ]),
      }),
    );
    const replayedRevision = await postRevision();
    expect(replayedRevision.response.status).toBe(201);
    expect(replayedRevision.body["data"]).toEqual(appliedRevision.body["data"]);

    const revisedReload = await request(
      `/api/pos/tickets/${revisableTicket.id}`,
      { headers: { authorization: `Bearer ${masterToken}` } },
    );
    expect(revisedReload.response.status).toBe(200);
    expect(revisedReload.body["data"]).toEqual(
      expect.objectContaining({
        customerName: "Clienta Checkout RV5 Corregida",
        customerPhone: "5512345678",
        total: "120.00",
        amountReceived: "120.00",
        pendingAmount: "0.00",
        settlementStatus: "PAID",
      }),
    );
    const revisedReloadData = revisedReload.body["data"] as {
      lines: Array<{ itemId: string; quantity: string; unitPrice: string }>;
      paymentOperations: Array<{ kind: string; amount: string }>;
    };
    expect(revisedReloadData.lines).toEqual([
      expect.objectContaining({
        itemId: revisionItemId,
        quantity: "3.00",
        unitPrice: "40.00",
      }),
    ]);
    expect(revisedReloadData.paymentOperations).toEqual([
      expect.objectContaining({ kind: "REVISION", amount: "120.00" }),
    ]);
    const [revisionEvents, revisionOperations, revisionBalance, projectionSum] =
      await Promise.all([
        prisma.posTicketEvent.findMany({
          where: { ticketId: revisableTicket.id, type: "REVISION" },
        }),
        prisma.posPaymentOperation.findMany({
          where: { ticketId: revisableTicket.id },
          orderBy: { creadoEn: "asc" },
        }),
        prisma.inventoryBalance.findUniqueOrThrow({
          where: {
            locationId_itemId: {
              locationId: branchLocation.id,
              itemId: revisionItemId,
            },
          },
        }),
        prisma.posLegacySaleProjection.aggregate({
          where: { operation: { ticketId: revisableTicket.id } },
          _sum: { amount: true },
        }),
      ]);
    expect(revisionEvents).toHaveLength(1);
    expect(revisionEvents[0]?.snapshot).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        appliedVersion: 2,
        effects: expect.objectContaining({
          compensationOperationId: expect.any(String),
          revisionOperationId: expect.any(String),
          inventoryMovementId: expect.any(String),
        }),
      }),
    );
    expect(revisionOperations.map((operation) => operation.kind)).toEqual([
      "SALE",
      "REFUND",
      "REVISION",
    ]);
    expect(
      revisionOperations.map((operation) => operation.amount.toFixed(2)),
    ).toEqual(["100.00", "100.00", "120.00"]);
    expect(revisionBalance.availableQuantity.toFixed(2)).toBe("7.00");
    expect(projectionSum._sum.amount?.toFixed(2)).toBe("120.00");

    const preservedPackage = await prisma.posPackage.create({
      data: {
        name: `Paquete revisable RV5 ${suffix}`,
        sku: `RV5-PKG-${suffix}`.toUpperCase(),
        description: "Composición preservada durante la revisión",
        price: "150.00",
        status: "PUBLISHED",
        branchAssignments: { create: [{ branchId }] },
        lines: { create: [{ itemId: serviceId, quantity: "1.00" }] },
      },
    });
    const packageCheckout = await request(
      "/api/pos/tickets",
      mutationJson(
        "POST",
        {
          branchId,
          customer: { id: checkoutData.customerId },
          lines: [
            {
              itemId: serviceId,
              packageId: preservedPackage.id,
              quantity: "1.00",
              unitPrice: "150.00",
              delivered: true,
            },
          ],
          sellers: [{ employeeId, share: "150.00" }],
          payments: [{ methodId: cash.id, amount: "150.00" }],
        },
        employeeToken,
      ),
    );
    expect(packageCheckout.response.status).toBe(201);
    const packageTicket = packageCheckout.body["data"] as {
      id: string;
      lines: Array<{ id: string; packageId: string | null }>;
    };
    const packageLineId = packageTicket.lines[0]!.id;
    const packageRevisionAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: masterPin, purpose: "RECEIPT_HISTORY_ADMIN" },
        masterToken,
      ),
    );
    const packageAuthorizationToken = (
      packageRevisionAuthorization.body["data"] as {
        authorizationToken: string;
      }
    ).authorizationToken;
    const packageRevision = (quantity: string, unitPrice: string) => ({
      reason: "Conservar composición del paquete RV5-P1",
      authorizationToken: packageAuthorizationToken,
      revision: {
        clientName: "Clienta Paquete RV5 Corregida",
        clientPhone: "5512345678",
        sellerIds: [employeeId],
        products: [{ itemId: serviceId, quantity, unitPrice }],
        discountAmount: "0.00",
        paymentStatus: "PAID",
        amountPaid: "150.00",
        payments: [{ methodId: cash.id, amount: "150.00" }],
      },
    });
    const rejectedPackageChange = await request(
      `/api/pos/tickets/${packageTicket.id}/revisions`,
      mutationJson("POST", packageRevision("2.00", "75.00"), masterToken),
    );
    expect(rejectedPackageChange.response.status).toBe(409);
    await expect(
      prisma.masterAuthorization.findUniqueOrThrow({
        where: { tokenHash: hashOpaqueToken(packageAuthorizationToken) },
      }),
    ).resolves.toMatchObject({ usedAt: null });
    const packageRevisionKey = randomUUID();
    const postPackageRevision = () =>
      request(`/api/pos/tickets/${packageTicket.id}/revisions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${masterToken}`,
          "idempotency-key": packageRevisionKey,
        },
        body: JSON.stringify(packageRevision("1.00", "150.00")),
      });
    const appliedPackageRevision = await postPackageRevision();
    expect(appliedPackageRevision.response.status).toBe(201);
    const replayedPackageRevision = await postPackageRevision();
    expect(replayedPackageRevision.response.status).toBe(201);
    expect(replayedPackageRevision.body["data"]).toEqual(
      appliedPackageRevision.body["data"],
    );
    const [
      reloadedPackageTicket,
      packageRevisionEvent,
      packageOperations,
      packageProjectionSum,
    ] = await Promise.all([
      request(`/api/pos/tickets/${packageTicket.id}`, {
        headers: { authorization: `Bearer ${masterToken}` },
      }),
      prisma.posTicketEvent.findFirstOrThrow({
        where: { ticketId: packageTicket.id, type: "REVISION" },
      }),
      prisma.posPaymentOperation.findMany({
        where: { ticketId: packageTicket.id },
        orderBy: { creadoEn: "asc" },
      }),
      prisma.posLegacySaleProjection.aggregate({
        where: { operation: { ticketId: packageTicket.id } },
        _sum: { amount: true },
      }),
    ]);
    expect(reloadedPackageTicket.body["data"]).toEqual(
      expect.objectContaining({
        customerName: "Clienta Paquete RV5 Corregida",
        total: "150.00",
        lines: [
          expect.objectContaining({
            id: packageLineId,
            packageId: preservedPackage.id,
            quantity: "1.00",
            unitPrice: "150.00",
          }),
        ],
      }),
    );
    expect(packageRevisionEvent.snapshot).toEqual(
      expect.objectContaining({
        before: expect.objectContaining({
          packages: [
            expect.objectContaining({
              id: preservedPackage.id,
              lines: [expect.objectContaining({ ticketLineId: packageLineId })],
            }),
          ],
        }),
        after: expect.objectContaining({
          packages: [expect.objectContaining({ id: preservedPackage.id })],
        }),
        effects: expect.objectContaining({
          inventoryMovementId: null,
          packagePreservations: [
            expect.objectContaining({ id: preservedPackage.id }),
          ],
        }),
      }),
    );
    await expect(
      prisma.posTicketEvent.count({
        where: { ticketId: packageTicket.id, type: "REVISION" },
      }),
    ).resolves.toBe(1);
    expect(packageOperations.map((operation) => operation.kind)).toEqual([
      "SALE",
      "REFUND",
      "REVISION",
    ]);
    expect(
      packageOperations.map((operation) => operation.amount.toFixed(2)),
    ).toEqual(["150.00", "150.00", "150.00"]);
    expect(packageProjectionSum._sum.amount?.toFixed(2)).toBe("150.00");

    const membershipItem = await request(
      "/api/pos/catalog/items",
      json(
        "POST",
        {
          sku: `RV5-MEM-${suffix}`.toUpperCase(),
          name: `Membresía revisable RV5 ${suffix}`,
          kind: "MEMBERSHIP",
          description: "Tarjetón para revisión compensatoria",
          benefits: ["Dos sesiones canónicas"],
          branchIds: [branchId],
          published: true,
          listPrice: "500.00",
          minimumPrice: "400.00",
          unitCost: "0.00",
          unitCostUsd: "0.00",
          partnerCost: "0.00",
          taxRate: "16.00",
          membershipSessions: 2,
          membershipRenewalThreshold: 1,
        },
        masterToken,
      ),
    );
    expect(membershipItem.response.status).toBe(201);
    const membershipItemId = (membershipItem.body["data"] as { id: string }).id;
    const alternateSeller = await prisma.empleado.create({
      data: {
        nombres: "Alterna",
        apellidoPaterno: "Revision",
        apellidoMaterno: "RV5",
        nombreCompleto: `Vendedora Alterna RV5 ${suffix}`,
        banco: "TEST",
        numeroCuenta: `ALT-${suffix}`,
        puesto: "TEST",
        metaIndividual: 0,
        sucursalId: branchId,
      },
    });
    const membershipCheckout = await request(
      "/api/pos/tickets",
      mutationJson(
        "POST",
        {
          branchId,
          customer: { id: checkoutData.customerId },
          lines: [
            {
              itemId: membershipItemId,
              quantity: "1.00",
              unitPrice: "500.00",
              delivered: true,
            },
          ],
          sellers: [{ employeeId, share: "500.00" }],
          payments: [{ methodId: cash.id, amount: "500.00" }],
        },
        employeeToken,
      ),
    );
    expect(membershipCheckout.response.status).toBe(201);
    const membershipTicket = membershipCheckout.body["data"] as {
      id: string;
      businessDate: string;
      memberships: Array<{ id: string; status: string }>;
    };
    expect(membershipTicket.memberships).toHaveLength(1);
    const membershipId = membershipTicket.memberships[0]!.id;
    const employeeCredential = await prisma.posCredential.findFirstOrThrow({
      where: { employeeId },
    });
    const attendanceTicket = await prisma.posTicket.create({
      data: {
        folio: `MEM-ATTENDANCE-${suffix}`,
        terminalSequence: BigInt(Date.now() + 100_000),
        status: "COMPLETED",
        settlementStatus: "PAID",
        businessDate: new Date("2026-09-16T00:00:00.000Z"),
        branchId,
        terminalId,
        createdByCredentialId: employeeCredential.id,
        customerId: checkoutData.customerId,
        customerNameSnapshot: "Clienta Checkout RV5",
        subtotal: "0.00",
        minimumTotal: "0.00",
        spareTotal: "0.00",
        discountTotal: "0.00",
        taxTotal: "0.00",
        total: "0.00",
        amountPaid: "0.00",
        pendingAmount: "0.00",
      },
    });
    const membershipAppointment = await prisma.posAppointment.create({
      data: {
        ticketId: attendanceTicket.id,
        customerId: checkoutData.customerId,
        kind: "NEXT_SESSION",
        status: "SCHEDULED",
        scheduledAt: new Date("2026-09-17T18:00:00.000Z"),
        serviceNameSnapshot: "Sesión consumida antes de la revisión",
        branchId,
        sellerId: employeeId,
        membershipId,
        createdByCredentialId: employeeCredential.id,
      },
    });
    await prisma.$transaction((tx) =>
      consumeMembershipAttendance(
        tx,
        {
          membershipId,
          appointmentId: membershipAppointment.id,
          event: "ATTENDED",
          branchId,
          signatureStatus: "PENDING",
        },
        {
          credentialId: employeeCredential.id,
          terminalId,
          sessionId: randomUUID(),
          employeeId,
          isMaster: false,
          authorizedBranchIds: [branchId],
        },
      ),
    );
    const membershipRevisionAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: masterPin, purpose: "RECEIPT_HISTORY_ADMIN" },
        masterToken,
      ),
    );
    const membershipRevisionAuthorizationToken = (
      membershipRevisionAuthorization.body["data"] as {
        authorizationToken: string;
      }
    ).authorizationToken;
    const rejectedMembershipUnitChange = await request(
      `/api/pos/tickets/${membershipTicket.id}/revisions`,
      mutationJson(
        "POST",
        {
          reason: "No agregar un tarjetón sin identificar su unidad",
          authorizationToken: membershipRevisionAuthorizationToken,
          revision: {
            clientName: "Clienta Checkout RV5",
            clientPhone: "5512345678",
            sellerIds: [alternateSeller.id],
            products: [
              {
                itemId: membershipItemId,
                quantity: "2.00",
                unitPrice: "450.00",
              },
            ],
            discountAmount: "0.00",
            paymentStatus: "PAID",
            amountPaid: "900.00",
            payments: [{ methodId: cash.id, amount: "900.00" }],
          },
        },
        masterToken,
      ),
    );
    expect(rejectedMembershipUnitChange.response.status).toBe(409);
    const rejectedMembershipDowngrade = await request(
      `/api/pos/tickets/${membershipTicket.id}/revisions`,
      mutationJson(
        "POST",
        {
          reason: "No desactivar una membresía con sesión consumida",
          authorizationToken: membershipRevisionAuthorizationToken,
          revision: {
            clientName: "Clienta Checkout RV5",
            clientPhone: "5512345678",
            sellerIds: [alternateSeller.id],
            products: [
              {
                itemId: membershipItemId,
                quantity: "1.00",
                unitPrice: "450.00",
              },
            ],
            discountAmount: "0.00",
            paymentStatus: "LAYAWAY",
            amountPaid: "100.00",
            payments: [{ methodId: cash.id, amount: "100.00" }],
          },
        },
        masterToken,
      ),
    );
    expect(rejectedMembershipDowngrade.response.status).toBe(409);

    const membershipRevisionKey = randomUUID();
    const membershipRevisionPayload = {
      reason: "Conciliar membresía preservando sesión consumida",
      authorizationToken: membershipRevisionAuthorizationToken,
      revision: {
        clientName: "Clienta Membresía RV5 Corregida",
        clientPhone: "5512345678",
        sellerIds: [alternateSeller.id],
        products: [
          {
            itemId: membershipItemId,
            quantity: "1.00",
            unitPrice: "450.00",
          },
        ],
        discountAmount: "0.00",
        paymentStatus: "PAID" as const,
        amountPaid: "450.00",
        payments: [{ methodId: cash.id, amount: "450.00" }],
      },
    };
    const postMembershipRevision = () =>
      request(`/api/pos/tickets/${membershipTicket.id}/revisions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${masterToken}`,
          "idempotency-key": membershipRevisionKey,
        },
        body: JSON.stringify(membershipRevisionPayload),
      });
    const appliedMembershipRevision = await postMembershipRevision();
    expect(appliedMembershipRevision.response.status).toBe(201);
    expect(appliedMembershipRevision.body["data"]).toEqual(
      expect.objectContaining({
        version: 2,
        differences: expect.arrayContaining([
          expect.objectContaining({ field: "MEMBERSHIPS" }),
        ]),
      }),
    );
    const replayedMembershipRevision = await postMembershipRevision();
    expect(replayedMembershipRevision.response.status).toBe(201);
    expect(replayedMembershipRevision.body["data"]).toEqual(
      appliedMembershipRevision.body["data"],
    );

    const secondMembershipAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: masterPin, purpose: "RECEIPT_HISTORY_ADMIN" },
        masterToken,
      ),
    );
    const secondMembershipRevision = await request(
      `/api/pos/tickets/${membershipTicket.id}/revisions`,
      mutationJson(
        "POST",
        {
          reason: "Segunda conciliación de membresía RV5-P1",
          authorizationToken: (
            secondMembershipAuthorization.body["data"] as {
              authorizationToken: string;
            }
          ).authorizationToken,
          revision: {
            ...membershipRevisionPayload.revision,
            products: [
              {
                itemId: membershipItemId,
                quantity: "1.00",
                unitPrice: "425.00",
              },
            ],
            amountPaid: "425.00",
            payments: [{ methodId: cash.id, amount: "425.00" }],
          },
        },
        masterToken,
      ),
    );
    expect(secondMembershipRevision.response.status).toBe(201);
    const [reloadedMembershipTicket, reconciledMembership, membershipEvents] =
      await Promise.all([
        request(`/api/pos/tickets/${membershipTicket.id}`, {
          headers: { authorization: `Bearer ${masterToken}` },
        }),
        prisma.posClientMembership.findUniqueOrThrow({
          where: { id: membershipId },
          include: {
            attendance: true,
            sellerChanges: true,
            statusChanges: true,
            revisionProjections: { orderBy: { version: "asc" } },
          },
        }),
        prisma.posTicketEvent.findMany({
          where: { ticketId: membershipTicket.id, type: "REVISION" },
          orderBy: { creadoEn: "asc" },
        }),
      ]);
    expect(reloadedMembershipTicket.response.status).toBe(200);
    expect(reloadedMembershipTicket.body["data"]).toEqual(
      expect.objectContaining({
        customerName: "Clienta Membresía RV5 Corregida",
        total: "425.00",
      }),
    );
    expect(reconciledMembership).toEqual(
      expect.objectContaining({
        customerNameSnapshot: "Clienta Checkout RV5",
        currentSellerId: alternateSeller.id,
        usedSessions: 1,
        status: "ACTIVE",
      }),
    );
    expect(reconciledMembership.purchaseAmount.toFixed(2)).toBe("500.00");
    expect(reconciledMembership.attendance).toHaveLength(1);
    expect(reconciledMembership.sellerChanges).toHaveLength(1);
    expect(reconciledMembership.revisionProjections).toEqual([
      expect.objectContaining({
        version: 2,
        customerNameSnapshot: "Clienta Membresía RV5 Corregida",
      }),
      expect.objectContaining({
        version: 3,
        customerNameSnapshot: "Clienta Membresía RV5 Corregida",
      }),
    ]);
    expect(
      reconciledMembership.revisionProjections.map((projection) =>
        projection.purchaseAmount.toFixed(2),
      ),
    ).toEqual(["450.00", "425.00"]);
    expect(membershipEvents).toHaveLength(2);
    expect(membershipEvents[1]?.snapshot).toEqual(
      expect.objectContaining({
        appliedVersion: 3,
        effects: expect.objectContaining({
          membershipChanges: [expect.objectContaining({ id: membershipId })],
        }),
      }),
    );
    const membershipOperations = await prisma.posPaymentOperation.findMany({
      where: { ticketId: membershipTicket.id },
      orderBy: { creadoEn: "asc" },
    });
    expect(membershipOperations.map((operation) => operation.kind)).toEqual([
      "SALE",
      "REFUND",
      "REVISION",
      "REFUND",
      "REVISION",
    ]);
    expect(
      membershipOperations.map((operation) => operation.amount.toFixed(2)),
    ).toEqual(["500.00", "500.00", "450.00", "450.00", "425.00"]);
    const membershipXReport = await request(
      `/api/pos/reports/x-report?businessDate=${membershipTicket.businessDate}&branchId=${branchId}`,
      { headers: { authorization: `Bearer ${masterToken}` } },
    );
    expect(membershipXReport.response.status).toBe(200);
    expect(membershipXReport.body["data"]).toEqual(
      expect.objectContaining({
        membershipCount: 1,
        membershipSalesTotal: "425.00",
      }),
    );

    const membershipAccess = await request(
      "/api/pos/personal-authorizations",
      json(
        "POST",
        { pin: masterPin, purpose: "MEMBERSHIPS_ACCESS" },
        masterToken,
      ),
    );
    expect(membershipAccess.response.status).toBe(201);
    const membershipAccessToken = (
      membershipAccess.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const membershipDataset = await request(
      `/api/pos/memberships?branchIds=${branchId}&purchaseTicketId=${membershipTicket.id}&page=1&pageSize=20`,
      {
        headers: {
          authorization: `Bearer ${masterToken}`,
          "x-pos-personal-authorization": membershipAccessToken,
        },
      },
    );
    expect(membershipDataset.response.status).toBe(200);
    expect(
      (
        membershipDataset.body["data"] as {
          items: Array<{
            id: string;
            purchaseAmount: string;
            usedSessions: number;
            currentSellerId: string;
            attendance: unknown[];
          }>;
        }
      ).items,
    ).toEqual([
      expect.objectContaining({
        id: membershipId,
        purchaseAmount: "425.00",
        usedSessions: 1,
        currentSellerId: alternateSeller.id,
        attendance: [expect.objectContaining({ id: expect.any(String) })],
      }),
    ]);
    const profileIdempotencyKey = randomUUID();
    const updateMembershipProfile = () =>
      request(`/api/pos/memberships/${membershipId}/profile`, {
        ...json(
          "POST",
          {
            profile: "VIP",
            personalAuthorizationToken: membershipAccessToken,
          },
          masterToken,
        ),
        headers: {
          ...json("POST", {}, masterToken).headers,
          "idempotency-key": profileIdempotencyKey,
        },
      });
    const updatedMembershipProfile = await updateMembershipProfile();
    expect(updatedMembershipProfile.response.status).toBe(200);
    expect(updatedMembershipProfile.body["data"]).toEqual(
      expect.objectContaining({ id: membershipId, profile: "VIP" }),
    );
    const replayedMembershipProfile = await updateMembershipProfile();
    expect(replayedMembershipProfile.response.status).toBe(200);
    expect(replayedMembershipProfile.body["data"]).toEqual(
      expect.objectContaining({ id: membershipId, profile: "VIP" }),
    );
    const membershipExport = await request(
      "/api/pos/memberships/export",
      json(
        "POST",
        {
          branchIds: [branchId],
          purchaseTicketId: membershipTicket.id,
          personalAuthorizationToken: membershipAccessToken,
        },
        masterToken,
      ),
    );
    expect(membershipExport.response.status).toBe(200);
    expect(
      (
        membershipExport.body["data"] as {
          items: Array<{ id: string; purchaseAmount: string }>;
        }
      ).items,
    ).toEqual([
      expect.objectContaining({ id: membershipId, purchaseAmount: "425.00" }),
    ]);

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
          revision: {
            clientName: "Clienta Checkout RV5 Ajustada",
            clientPhone: "5598765432",
            sellerIds: [employeeId],
            products: [
              {
                itemId: serviceId,
                quantity: "1.00",
                unitPrice: "199.00",
              },
            ],
            discountAmount: "0.00",
            paymentStatus: "PAID",
            amountPaid: "199.00",
            payments: [
              { methodId: cash.id, amount: "100.00" },
              { methodId: transfer.id, amount: "99.00" },
            ],
          },
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

  it("persiste correcciones y anulaciones de gastos con autorización consumible", async () => {
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
    const employeeWithoutCashPermission = (
      employeeLogin.body["data"] as { accessToken: string }
    ).accessToken;
    const forbiddenExpense = await request(
      "/api/pos/expenses",
      mutationJson(
        "POST",
        {
          expenseTypeId: randomUUID(),
          amount: "10.00",
          concept: "Gasto sin permiso",
        },
        employeeWithoutCashPermission,
      ),
    );
    expect(forbiddenExpense.response.status).toBe(403);

    const expenseType = await request(
      "/api/pos/expense-types",
      json(
        "POST",
        { name: `Insumos RV7 ${suffix}`, active: true },
        masterToken,
      ),
    );
    expect(expenseType.response.status).toBe(201);
    const expenseTypeId = (expenseType.body["data"] as { id: string }).id;

    const deniedUnlock = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: "0000", purpose: "CASH_MANAGER_ACCESS" },
        masterToken,
      ),
    );
    expect(deniedUnlock.response.status).toBe(403);
    const unlock = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: masterPin, purpose: "CASH_MANAGER_ACCESS" },
        masterToken,
      ),
    );
    expect(unlock.response.status).toBe(201);
    const unlockToken = (unlock.body["data"] as { authorizationToken: string })
      .authorizationToken;
    const verifiedUnlock = await request(
      "/api/pos/auth/verify",
      json(
        "POST",
        {
          authorizationToken: unlockToken,
          purpose: "CASH_MANAGER_ACCESS",
        },
        masterToken,
      ),
    );
    expect(verifiedUnlock.response.status).toBe(200);
    const reusedUnlock = await request(
      "/api/pos/auth/verify",
      json(
        "POST",
        {
          authorizationToken: unlockToken,
          purpose: "CASH_MANAGER_ACCESS",
        },
        masterToken,
      ),
    );
    expect(reusedUnlock.response.status).toBe(403);

    const createExpenseRequest = mutationJson(
      "POST",
      {
        expenseTypeId,
        amount: "125.40",
        concept: `Consumibles RV7 ${suffix}`,
        comment: "Alta para validar corrección persistente",
      },
      masterToken,
    );
    const createdExpense = await request(
      "/api/pos/expenses",
      createExpenseRequest,
    );
    expect(createdExpense.response.status).toBe(201);
    const expenseId = (createdExpense.body["data"] as { id: string }).id;
    const replayedCreate = await request(
      "/api/pos/expenses",
      createExpenseRequest,
    );
    expect(replayedCreate.response.status).toBe(201);
    expect((replayedCreate.body["data"] as { id: string }).id).toBe(expenseId);

    const correctionAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          pin: masterPin,
          purpose: "CASH_EXPENSE_EDIT",
          entityType: "PosCashExpense",
          entityId: expenseId,
        },
        masterToken,
      ),
    );
    expect(correctionAuthorization.response.status).toBe(201);
    const correctionToken = (
      correctionAuthorization.body["data"] as {
        authorizationToken: string;
      }
    ).authorizationToken;
    const correctionRequest = mutationJson(
      "PUT",
      {
        expenseTypeId,
        amount: "140.55",
        concept: `Consumibles corregidos RV7 ${suffix}`,
        comment: "Importe corregido",
        reason: "Corrección dirigida RV7-P1",
        authorizationToken: correctionToken,
      },
      masterToken,
    );
    const correctedExpense = await request(
      `/api/pos/expenses/${expenseId}`,
      correctionRequest,
    );
    expect(correctedExpense.response.status).toBe(200);
    const replacementId = (
      correctedExpense.body["data"] as {
        id: string;
        amount: string;
        correctsExpenseId: string;
      }
    ).id;
    expect(correctedExpense.body["data"]).toEqual(
      expect.objectContaining({
        amount: "140.55",
        correctsExpenseId: expenseId,
        status: "ACTIVE",
      }),
    );
    const replayedCorrection = await request(
      `/api/pos/expenses/${expenseId}`,
      correctionRequest,
    );
    expect(replayedCorrection.response.status).toBe(200);
    expect((replayedCorrection.body["data"] as { id: string }).id).toBe(
      replacementId,
    );
    const reusedCorrection = await request(
      `/api/pos/expenses/${replacementId}`,
      mutationJson(
        "PUT",
        {
          expenseTypeId,
          amount: "150.00",
          concept: `Reutilización rechazada RV7 ${suffix}`,
          comment: null,
          reason: "No debe reutilizar el token",
          authorizationToken: correctionToken,
        },
        masterToken,
      ),
    );
    expect(reusedCorrection.response.status).toBe(403);

    const voidAuthorization = await request(
      "/api/pos/authorizations",
      json(
        "POST",
        {
          pin: masterPin,
          purpose: "CASH_EXPENSE_VOID",
          entityType: "PosCashExpense",
          entityId: replacementId,
        },
        masterToken,
      ),
    );
    expect(voidAuthorization.response.status).toBe(201);
    const voidToken = (
      voidAuthorization.body["data"] as { authorizationToken: string }
    ).authorizationToken;
    const voidRequest = mutationJson(
      "POST",
      {
        authorizationToken: voidToken,
        reason: "Anulación dirigida RV7-P1",
      },
      masterToken,
    );
    const voidedExpense = await request(
      `/api/pos/expenses/${replacementId}/void`,
      voidRequest,
    );
    expect(voidedExpense.response.status).toBe(200);
    expect(voidedExpense.body["data"]).toEqual(
      expect.objectContaining({ id: replacementId, status: "VOIDED" }),
    );
    const replayedVoid = await request(
      `/api/pos/expenses/${replacementId}/void`,
      voidRequest,
    );
    expect(replayedVoid.response.status).toBe(200);

    const secondExpense = await request(
      "/api/pos/expenses",
      mutationJson(
        "POST",
        {
          expenseTypeId,
          amount: "25.00",
          concept: `Segundo gasto RV7 ${suffix}`,
          comment: null,
        },
        masterToken,
      ),
    );
    expect(secondExpense.response.status).toBe(201);
    const secondExpenseId = (secondExpense.body["data"] as { id: string }).id;
    const reusedVoid = await request(
      `/api/pos/expenses/${secondExpenseId}/void`,
      mutationJson(
        "POST",
        {
          authorizationToken: voidToken,
          reason: "No debe reutilizar el token",
        },
        masterToken,
      ),
    );
    expect(reusedVoid.response.status).toBe(403);

    const persistedExpenses = await prisma.posCashExpense.findMany({
      where: { id: { in: [expenseId, replacementId, secondExpenseId] } },
      select: {
        id: true,
        status: true,
        amount: true,
        correctsExpenseId: true,
        voidAuthorizationId: true,
      },
    });
    expect(persistedExpenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expenseId,
          status: "VOIDED",
          correctsExpenseId: null,
        }),
        expect.objectContaining({
          id: replacementId,
          status: "VOIDED",
          correctsExpenseId: expenseId,
        }),
        expect.objectContaining({
          id: secondExpenseId,
          status: "ACTIVE",
          correctsExpenseId: null,
        }),
      ]),
    );
    expect(
      persistedExpenses
        .find((expense) => expense.id === expenseId)
        ?.amount.toFixed(2),
    ).toBe("125.40");
    expect(
      persistedExpenses
        .find((expense) => expense.id === replacementId)
        ?.amount.toFixed(2),
    ).toBe("140.55");
    expect(
      persistedExpenses.find((expense) => expense.id === replacementId)
        ?.voidAuthorizationId,
    ).not.toBeNull();

    const compensatedMovements = await prisma.posCashMovement.findMany({
      where: { expenseId: { in: [expenseId, replacementId] } },
      orderBy: { creadoEn: "asc" },
      select: { expenseId: true, kind: true, amount: true },
    });
    expect(compensatedMovements).toHaveLength(4);
    expect(
      compensatedMovements.map((movement) => ({
        expenseId: movement.expenseId,
        kind: movement.kind,
        amount: movement.amount.toFixed(2),
      })),
    ).toEqual(
      expect.arrayContaining([
        { expenseId, kind: "EXPENSE", amount: "125.40" },
        { expenseId, kind: "VOID", amount: "-125.40" },
        { expenseId: replacementId, kind: "CORRECTION", amount: "140.55" },
        { expenseId: replacementId, kind: "VOID", amount: "-140.55" },
      ]),
    );
    expect(
      compensatedMovements
        .reduce((total, movement) => total + movement.amount.toNumber(), 0)
        .toFixed(2),
    ).toBe("0.00");

    const reloadedExpenses = await request(
      "/api/pos/expenses?page=1&pageSize=100",
      { headers: { authorization: `Bearer ${masterToken}` } },
    );
    expect(reloadedExpenses.response.status).toBe(200);
    const reloadedItems = (
      reloadedExpenses.body["data"] as {
        items: Array<{ id: string; status: string }>;
      }
    ).items;
    expect(reloadedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expenseId, status: "VOIDED" }),
        expect.objectContaining({ id: replacementId, status: "VOIDED" }),
        expect.objectContaining({ id: secondExpenseId, status: "ACTIVE" }),
      ]),
    );
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
