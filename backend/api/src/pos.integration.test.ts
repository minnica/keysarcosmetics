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
    const credentials = await prisma.posCredential.findMany({
      where: { OR: [{ employeeId }, { userId }] },
      select: { id: true },
    });
    const credentialIds = credentials.map((credential) => credential.id);
    await prisma.posNotificationRead.deleteMany({
      where: { notification: { branchId: { in: [branchId, secondBranchId] } } },
    });
    await prisma.posNotificationOutbox.deleteMany({
      where: { notification: { branchId: { in: [branchId, secondBranchId] } } },
    });
    await prisma.posNotification.deleteMany({
      where: { branchId: { in: [branchId, secondBranchId] } },
    });
    await prisma.posAttendance.deleteMany({
      where: { branchId: { in: [branchId, secondBranchId] } },
    });
    await prisma.posBusinessDay.deleteMany({
      where: { branchId: { in: [branchId, secondBranchId] } },
    });
    await prisma.posIdempotencyRecord.deleteMany({
      where: { actorCredentialId: { in: credentialIds } },
    });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { terminalId },
          { targetId: { in: [employeeId, userId, positionId, terminalId] } },
        ],
      },
    });
    await prisma.posPersonalAuthorization.deleteMany({
      where: { credentialId: { in: credentialIds } },
    });
    await prisma.masterAuthorization.deleteMany({ where: { terminalId } });
    await prisma.posSession.deleteMany({ where: { terminalId } });
    await prisma.posPositionBranchAssignment.deleteMany({
      where: { positionId },
    });
    await prisma.posCredentialBranchAssignment.deleteMany({
      where: { credentialId: { in: credentialIds } },
    });
    await prisma.positionPosPermission.deleteMany({ where: { positionId } });
    await prisma.posMasterCredential.deleteMany({
      where: { credential: { OR: [{ employeeId }, { userId }] } },
    });
    await prisma.posCredential.deleteMany({
      where: { OR: [{ employeeId }, { userId }] },
    });
    await prisma.posTerminal.deleteMany({ where: { id: terminalId } });
    await prisma.usuario.deleteMany({ where: { id: userId } });
    await prisma.empleado.deleteMany({ where: { id: employeeId } });
    await prisma.position.deleteMany({ where: { id: positionId } });
    await prisma.sucursal.deleteMany({
      where: { id: { in: [branchId, secondBranchId] } },
    });
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
          alias: `master.${suffix}`,
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
    expect(liveSession.response.status).toBe(200);
    const liveData = liveSession.body["data"] as {
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
    expect(removedLive.response.status).toBe(403);
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
