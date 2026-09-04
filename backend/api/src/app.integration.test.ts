import type { Server } from "node:http";
import bcrypt from "bcryptjs";
import { ProtectedEmployeeKey } from "@prisma/client";
import { z } from "zod";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "./app";
import { prisma } from "./prisma/client";

const runDatabaseTests = process.env["RUN_DATABASE_TESTS"] === "true";
const integrationDescribe = runDatabaseTests ? describe : describe.skip;
const testEmail = `integration-${process.pid}@keysar.test`;
const restrictedTestEmail = `integration-keysar-home-${process.pid}@keysar.test`;
const testPassword = "Integration-Password-2026";
const loginResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ token: z.string().min(1) }),
});
const sessionResponseSchema = z.object({
  data: z.object({
    email: z.string().email(),
    canManageAccess: z.boolean(),
    canManagePayrollAccess: z.boolean(),
  }),
});

let server: Server;
let baseUrl: string;
let keysarHomeFixture: {
  branchId: string;
  employeeId: string;
  managerEmployeeId: string;
  paymentMethodId: string;
  positionId: string;
  saleId: string;
} | null = null;

async function jsonRequest(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.json() };
}

integrationDescribe("API integration with PostgreSQL", () => {
  beforeAll(async () => {
    process.env["JWT_SECRET"] = "integration-test-secret-with-adequate-length";
    await prisma.usuario.deleteMany({
      where: { email: { in: [testEmail, restrictedTestEmail] } },
    });
    await prisma.usuario.create({
      data: {
        nombre: "Integration Admin",
        email: testEmail,
        passwordHash: await bcrypt.hash(testPassword, 4),
        rol: "SUPER_ADMIN",
      },
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("No se pudo resolver el puerto del servidor de prueba");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: [testEmail, restrictedTestEmail] } },
    });
    if (keysarHomeFixture) {
      await prisma.ventaDetalle.deleteMany({
        where: { ventaId: keysarHomeFixture.saleId },
      });
      await prisma.venta.deleteMany({ where: { id: keysarHomeFixture.saleId } });
      await prisma.protectedEmployeeIdentity.deleteMany({
        where: { employeeId: keysarHomeFixture.employeeId },
      });
      await prisma.empleado.deleteMany({
        where: {
          id: {
            in: [
              keysarHomeFixture.employeeId,
              keysarHomeFixture.managerEmployeeId,
            ],
          },
        },
      });
      await prisma.position.deleteMany({
        where: { id: keysarHomeFixture.positionId },
      });
      await prisma.metodoPago.deleteMany({
        where: { id: keysarHomeFixture.paymentMethodId },
      });
      await prisma.sucursal.deleteMany({
        where: { id: keysarHomeFixture.branchId },
      });
    }
    await prisma.$disconnect();
  });

  it("reports process and database readiness", async () => {
    const health = await jsonRequest("/health");
    expect(health.response.status).toBe(200);
    expect(health.body).toMatchObject({ status: "ok" });

    const readiness = await jsonRequest("/ready");
    expect(readiness.response.status).toBe(200);
    expect(readiness.body).toMatchObject({ status: "ready" });
  });

  it("validates login input without querying credentials", async () => {
    const { response, body } = await jsonRequest("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "invalid-email", password: "" }),
    });

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false });
  });

  it("authenticates a real database user and resolves the session", async () => {
    const login = await jsonRequest("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    expect(login.response.status).toBe(200);
    const loginBody = loginResponseSchema.parse(login.body);

    const session = await jsonRequest("/api/auth/me", {
      headers: { authorization: `Bearer ${loginBody.data.token}` },
    });
    expect(session.response.status).toBe(200);
    const sessionBody = sessionResponseSchema.parse(session.body);
    expect(sessionBody.data.email).toBe(testEmail);
    expect(sessionBody.data.canManageAccess).toBe(true);
    expect(sessionBody.data.canManagePayrollAccess).toBe(true);
  });

  it("does not disclose whether a user or password was incorrect", async () => {
    const { response, body } = await jsonRequest("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "wrong-password" }),
    });

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ message: "Credenciales incorrectas" });
  });

  it("excludes Keysar Home from every sales report until its explicit permission is enabled", async () => {
    const reportDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const [year = "2026", month = "08"] = reportDate.split("-");
    const monthStart = `${year}-${month}-01`;
    const monthEnd = new Date(
      Date.UTC(Number(year), Number(month), 0),
    ).getUTCDate();
    const monthEndDate = `${year}-${month}-${String(monthEnd).padStart(2, "0")}`;
    const branch = await prisma.sucursal.create({
      data: { nombre: `Integration Keysar Home ${process.pid}` },
    });
    const position = await prisma.position.create({
      data: {
        nombre: `Integration Gerente ${process.pid}`,
        screenPermissions: {
          create: [
            { screenKey: "dashboard", allowed: true },
            { screenKey: "ventas", allowed: true },
            { screenKey: "reportes/detalle-metodo-pago", allowed: true },
            { screenKey: "reportes/metodo-pago-por-dia", allowed: true },
            { screenKey: "reportes/ventas-por-vendedor", allowed: true },
            {
              screenKey: "reportes/ventas-por-vendedor-dia",
              allowed: true,
            },
            { screenKey: "reportes/ranking-vendedores", allowed: true },
            { screenKey: "reportes/ranking-sucursales", allowed: true },
            { screenKey: "reportes/total-general", allowed: true },
            { screenKey: "reportes/metas-sucursal", allowed: true },
          ],
        },
      },
    });
    const managerEmployee = await prisma.empleado.create({
      data: {
        nombres: "Integration",
        apellidoPaterno: "Manager",
        apellidoMaterno: "Test",
        nombreCompleto: "Integration Manager Test",
        banco: "TEST",
        numeroCuenta: `manager-${process.pid}`,
        puesto: "GERENTE",
        metaIndividual: 0,
        positionId: position.id,
      },
    });
    const keysarHomeEmployee = await prisma.empleado.create({
      data: {
        nombres: "Keysar",
        apellidoPaterno: "Home",
        apellidoMaterno: "Test",
        // Replica el nombre histórico real que incluye espacios y un guion final.
        nombreCompleto: "  Keysar Home -  ",
        banco: "TEST",
        numeroCuenta: `keysar-home-${process.pid}`,
        puesto: "VENDEDOR",
        metaIndividual: 0,
      },
    });
    await prisma.protectedEmployeeIdentity.create({
      data: {
        key: ProtectedEmployeeKey.KEYSAR_HOME,
        employeeId: keysarHomeEmployee.id,
      },
    });

    const adminLogin = await jsonRequest("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const adminLoginBody = loginResponseSchema.parse(adminLogin.body);
    const protectedDelete = await jsonRequest(
      `/api/envelope/empleados/${keysarHomeEmployee.id}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${adminLoginBody.data.token}`,
        },
      },
    );
    expect(protectedDelete.response.status).toBe(409);
    expect(protectedDelete.body).toMatchObject({
      success: false,
      message: "No se puede eliminar un empleado protegido del sistema",
    });
    await expect(
      prisma.empleado.delete({ where: { id: keysarHomeEmployee.id } }),
    ).rejects.toMatchObject({ code: "P2003" });

    await prisma.empleado.update({
      where: { id: keysarHomeEmployee.id },
      data: { nombreCompleto: "Cuenta Comercial Renombrada" },
    });
    const paymentMethod = await prisma.metodoPago.create({
      data: { nombre: `Integration Keysar Home ${process.pid}`, tipo: "EFECTIVO" },
    });
    const sale = await prisma.venta.create({
      data: {
        fecha: new Date(`${reportDate}T12:00:00.000Z`),
        sucursalId: branch.id,
        vendedorId: keysarHomeEmployee.id,
        detalles: { create: { cantidad: 1250, metodoPagoId: paymentMethod.id } },
      },
    });
    await prisma.usuario.create({
      data: {
        nombre: "Integration Manager",
        email: restrictedTestEmail,
        passwordHash: await bcrypt.hash(testPassword, 4),
        rol: "GERENTE",
        empleadoId: managerEmployee.id,
      },
    });
    keysarHomeFixture = {
      branchId: branch.id,
      employeeId: keysarHomeEmployee.id,
      managerEmployeeId: managerEmployee.id,
      paymentMethodId: paymentMethod.id,
      positionId: position.id,
      saleId: sale.id,
    };

    const login = await jsonRequest("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: restrictedTestEmail, password: testPassword }),
    });
    const loginBody = loginResponseSchema.parse(login.body);
    const headers = { authorization: `Bearer ${loginBody.data.token}` };
    const savedSales = await jsonRequest(
      `/api/envelope/ventas?fechaInicio=${monthStart}&fechaFin=${monthEndDate}`,
      { headers },
    );
    expect(savedSales.response.status).toBe(200);
    expect(JSON.stringify(savedSales.body)).not.toContain(keysarHomeEmployee.id);

    const forbiddenEnvelopeSales = await jsonRequest(
      `/api/envelope/ventas?fechaInicio=${monthStart}&fechaFin=${monthEndDate}&includeProtectedForEnvelope=true`,
      { headers },
    );
    expect(forbiddenEnvelopeSales.response.status).toBe(403);

    await prisma.positionScreenPermission.create({
      data: {
        positionId: position.id,
        screenKey: "ventas/generar-sobre",
        allowed: true,
      },
    });
    const envelopeSales = await jsonRequest(
      `/api/envelope/ventas?fechaInicio=${monthStart}&fechaFin=${monthEndDate}&includeProtectedForEnvelope=true`,
      { headers },
    );
    expect(envelopeSales.response.status).toBe(200);
    expect(JSON.stringify(envelopeSales.body)).toContain(
      `"protectedIdentity":{"key":"KEYSAR_HOME"}`,
    );
    const reportCases = [
      {
        path: `/api/envelope/reportes/detalle-metodo-pago?fechaInicio=${monthStart}&fechaFin=${monthEndDate}`,
        exposesEmployee: false,
      },
      {
        path: `/api/envelope/reportes/metodo-pago-por-dia?mes=${month}&anio=${year}`,
        exposesEmployee: false,
      },
      {
        path: `/api/envelope/reportes/ventas-por-vendedor?fechaInicio=${monthStart}&fechaFin=${monthEndDate}`,
        exposesEmployee: true,
      },
      {
        path: `/api/envelope/reportes/ventas-por-vendedor-dia?fechaInicio=${monthStart}&fechaFin=${monthEndDate}`,
        exposesEmployee: true,
      },
      {
        path: `/api/envelope/reportes/ranking-vendedores?fechaInicio=${monthStart}&fechaFin=${monthEndDate}`,
        exposesEmployee: true,
      },
      {
        path: `/api/envelope/reportes/ranking-sucursales?fechaInicio=${monthStart}&fechaFin=${monthEndDate}`,
        exposesEmployee: false,
      },
      {
        path: `/api/envelope/reportes/total-general?fechaInicio=${monthStart}&fechaFin=${monthEndDate}`,
        exposesEmployee: false,
      },
      {
        path: "/api/envelope/reportes/metas-sucursal",
        exposesEmployee: false,
      },
      {
        path: `/api/envelope/reportes/dashboard?fecha=${reportDate}`,
        exposesEmployee: true,
      },
    ];
    const hiddenReports = new Map<string, string>();

    for (const reportCase of reportCases) {
      const hidden = await jsonRequest(reportCase.path, { headers });
      expect(hidden.response.status).toBe(200);
      expect(hidden.body).toMatchObject({ success: true });
      const serialized = JSON.stringify(hidden.body);
      expect(serialized).not.toContain(keysarHomeEmployee.id);
      hiddenReports.set(reportCase.path, serialized);
    }

    await prisma.positionScreenPermission.create({
      data: {
        positionId: position.id,
        screenKey: "reportes/ver-datos-keysar-home",
        allowed: true,
      },
    });

    for (const reportCase of reportCases) {
      const visible = await jsonRequest(reportCase.path, { headers });
      expect(visible.response.status).toBe(200);
      const serialized = JSON.stringify(visible.body);
      expect(serialized).not.toBe(hiddenReports.get(reportCase.path));
      if (reportCase.exposesEmployee) {
        expect(serialized).toContain(keysarHomeEmployee.id);
      }
    }

    await prisma.positionScreenPermission.deleteMany({
      where: {
        positionId: position.id,
        screenKey: "reportes/ver-datos-keysar-home",
      },
    });
    await prisma.protectedEmployeeIdentity.delete({
      where: { key: ProtectedEmployeeKey.KEYSAR_HOME },
    });
    const blockedWithoutIdentity = await jsonRequest(reportCases[0]!.path, {
      headers,
    });
    expect(blockedWithoutIdentity.response.status).toBe(500);
    expect(blockedWithoutIdentity.body).toMatchObject({ success: false });
  });
});
