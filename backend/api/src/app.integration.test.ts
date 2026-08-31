import type { Server } from "node:http";
import bcrypt from "bcryptjs";
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

  it("excludes Keysar Home from seller-day reports until its explicit permission is enabled", async () => {
    const branch = await prisma.sucursal.create({
      data: { nombre: `Integration Keysar Home ${process.pid}` },
    });
    const position = await prisma.position.create({
      data: {
        nombre: `Integration Gerente ${process.pid}`,
        screenPermissions: {
          create: {
            screenKey: "reportes/ventas-por-vendedor-dia",
            allowed: true,
          },
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
        // Cubre las variantes históricas que antes omitía la comparación SQL exacta.
        nombreCompleto: "  Keysar Home  ",
        banco: "TEST",
        numeroCuenta: `keysar-home-${process.pid}`,
        puesto: "VENDEDOR",
        metaIndividual: 0,
      },
    });
    const paymentMethod = await prisma.metodoPago.create({
      data: { nombre: `Integration Keysar Home ${process.pid}`, tipo: "EFECTIVO" },
    });
    const sale = await prisma.venta.create({
      data: {
        fecha: new Date("2026-08-12T12:00:00.000Z"),
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

    const hidden = await jsonRequest(
      "/api/envelope/reportes/ventas-por-vendedor-dia?fechaInicio=2026-08-01&fechaFin=2026-08-31",
      { headers },
    );
    expect(hidden.response.status).toBe(200);
    expect(hidden.body).toMatchObject({ success: true });
    expect(JSON.stringify(hidden.body)).not.toContain(keysarHomeEmployee.id);

    await prisma.positionScreenPermission.create({
      data: {
        positionId: position.id,
        screenKey: "reportes/ver-datos-keysar-home",
        allowed: true,
      },
    });

    const visible = await jsonRequest(
      "/api/envelope/reportes/ventas-por-vendedor-dia?fechaInicio=2026-08-01&fechaFin=2026-08-31",
      { headers },
    );
    expect(visible.response.status).toBe(200);
    expect(JSON.stringify(visible.body)).toContain(keysarHomeEmployee.id);
  });
});
