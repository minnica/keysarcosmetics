import type { Server } from "node:http";
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

integrationDescribe("seguridad y terminales POS", () => {
  beforeAll(async () => {
    process.env["JWT_SECRET"] = "jwt-compartido-integracion-con-32-caracteres";
    process.env["POS_JWT_SECRET"] = "jwt-pos-integracion-separado-con-32-caracteres";
    process.env["POS_PIN_PEPPER"] = "pepper-pos-integracion-separado-con-32-caracteres";
    const [branch, secondBranch, position, employee, user] = await prisma.$transaction([
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
    await prisma.empleado.update({ where: { id: employeeId }, data: { positionId } });

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Puerto de integración no disponible");
    baseUrl = `http://127.0.0.1:${address.port}`;

    const login = await request("/api/auth/login", json("POST", { email, password }));
    sharedToken = ((login.body["data"] as { token: string }).token);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await prisma.auditLog.deleteMany({ where: { OR: [{ terminalId }, { targetId: { in: [employeeId, userId, positionId, terminalId] } }] } });
    await prisma.masterAuthorization.deleteMany({ where: { terminalId } });
    await prisma.positionPosPermission.deleteMany({ where: { positionId } });
    await prisma.posMasterCredential.deleteMany({ where: { credential: { OR: [{ employeeId }, { userId }] } } });
    await prisma.posCredential.deleteMany({ where: { OR: [{ employeeId }, { userId }] } });
    await prisma.posTerminal.deleteMany({ where: { id: terminalId } });
    await prisma.usuario.deleteMany({ where: { id: userId } });
    await prisma.empleado.deleteMany({ where: { id: employeeId } });
    await prisma.position.deleteMany({ where: { id: positionId } });
    await prisma.sucursal.deleteMany({ where: { id: { in: [branchId, secondBranchId] } } });
    await prisma.$disconnect();
  });

  it("provisiona sin exponer secretos y rechaza al puesto sin permisos", async () => {
    const terminal = await request(
      "/api/pos/terminals",
      json("POST", { code: `TERM-${suffix}`, name: "Terminal integration", branchId }, sharedToken),
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
      json("PUT", { userId, alias: `master.${suffix}`, pin: masterPin, active: true, offlineEnabled: false, isMaster: true }, sharedToken),
    );
    expect(master.response.status).toBe(200);
    expect(JSON.stringify(master.body)).not.toContain(masterPin);

    const employee = await request(
      "/api/pos/provision/credentials",
      json("PUT", { employeeId, alias: `employee.${suffix}`, pin: employeePin, active: true, offlineEnabled: false, isMaster: false }, sharedToken),
    );
    expect(employee.response.status).toBe(200);
    expect(JSON.stringify(employee.body)).not.toContain(employeePin);

    const pendingLogin = await request(
      "/api/pos/auth/login",
      json("POST", { alias: `master.${suffix}`, pin: masterPin, terminalCode: `TERM-${suffix}`, terminalSecret }),
    );
    expect(pendingLogin.response.status).toBe(401);

    const activated = await request(
      `/api/pos/terminals/${terminalId}/status`,
      json("PATCH", { status: "ACTIVE" }, sharedToken),
    );
    expect(activated.response.status).toBe(200);

    const denied = await request(
      "/api/pos/auth/login",
      json("POST", { alias: `employee.${suffix}`, pin: employeePin, terminalCode: `TERM-${suffix}`, terminalSecret }),
    );
    expect(denied.response.status).toBe(401);
  });

  it("otorga permisos sólo con autorización master y aplica 403 en ruta directa", async () => {
    const login = await request(
      "/api/pos/auth/login",
      json("POST", { alias: `master.${suffix}`, pin: masterPin, terminalCode: `TERM-${suffix}`, terminalSecret }),
    );
    expect(login.response.status).toBe(200);
    masterToken = ((login.body["data"] as { accessToken: string }).accessToken);
    const unboundAuthorization = await request(
      "/api/pos/authorizations",
      json("POST", { alias: `master.${suffix}`, pin: masterPin, purpose: "POSITION_PERMISSIONS_UPDATE" }, masterToken),
    );
    const unboundAuthorizationToken = ((unboundAuthorization.body["data"] as { authorizationToken: string }).authorizationToken);
    const rejectedUnboundAuthorization = await request(
      `/api/pos/access/positions/${positionId}/permissions`,
      json("PUT", { permissions: ["SALE_CREATE"], authorizationToken: unboundAuthorizationToken }, masterToken),
    );
    expect(rejectedUnboundAuthorization.response.status).toBe(403);

    const authorization = await request(
      "/api/pos/authorizations",
      json("POST", { alias: `master.${suffix}`, pin: masterPin, purpose: "POSITION_PERMISSIONS_UPDATE", entityType: "Position", entityId: positionId }, masterToken),
    );
    const authorizationToken = ((authorization.body["data"] as { authorizationToken: string }).authorizationToken);
    const updated = await request(
      `/api/pos/access/positions/${positionId}/permissions`,
      json("PUT", { permissions: ["SALE_CREATE"], authorizationToken }, masterToken),
    );
    expect(updated.response.status).toBe(200);

    const employeeLogin = await request(
      "/api/pos/auth/login",
      json("POST", { alias: `employee.${suffix}`, pin: employeePin, terminalCode: `TERM-${suffix}`, terminalSecret }),
    );
    expect(employeeLogin.response.status).toBe(200);
    const employeeToken = ((employeeLogin.body["data"] as { accessToken: string }).accessToken);
    const forbidden = await request("/api/pos/access/bootstrap", { headers: { authorization: `Bearer ${employeeToken}` } });
    expect(forbidden.response.status).toBe(403);
  });

  it("cambia la sucursal una sola vez y revoca las sesiones ligadas a la asignación anterior", async () => {
    const authorization = await request(
      "/api/pos/authorizations",
      json("POST", { alias: `master.${suffix}`, pin: masterPin, purpose: "TERMINAL_BRANCH_CHANGE", entityType: "PosTerminal", entityId: terminalId }, masterToken),
    );
    const authorizationToken = ((authorization.body["data"] as { authorizationToken: string }).authorizationToken);
    const changed = await request(
      `/api/pos/terminals/${terminalId}/branch`,
      json("POST", { branchId: secondBranchId, authorizationToken }, masterToken),
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
      json("POST", { alias: `master.${suffix}`, pin: masterPin, terminalCode: `TERM-${suffix}`, terminalSecret }),
    );
    expect(login.response.status).toBe(200);
    const token = ((login.body["data"] as { accessToken: string }).accessToken);

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
