import type { Server } from "node:http";
import { createHash, randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POS_REPORT_KEYS, type PosReportKey } from "@cosmetics/types";
import { Prisma } from "@prisma/client";
import { app } from "./app";
import { prisma } from "./prisma/client";
import {
  fingerprintSecret,
  hashPosSecret,
  POS_DUMMY_BCRYPT_HASH,
} from "./services/pos-security";

const enabled = process.env["RUN_POS_REPORT_LOAD_TESTS"] === "true";
const loadDescribe = enabled ? describe : describe.skip;
const suffix = `pos-report-load-${process.pid}-${Date.now()}`;
const branchCounts = [1, 10, 20, 30] as const;
const ticketsPerBranch = Number(
  process.env["POS_REPORT_LOAD_TICKETS_PER_BRANCH"] ?? "400",
);
const screenPageMaxMs = Number(
  process.env["POS_REPORT_LOAD_SCREEN_PAGE_MAX_MS"] ?? "2000",
);
const screenCompleteMaxMs = Number(
  process.env["POS_REPORT_LOAD_SCREEN_COMPLETE_MAX_MS"] ?? "120000",
);
const exportMaxMs = Number(
  process.env["POS_REPORT_LOAD_EXPORT_MAX_MS"] ?? "30000",
);
const historyFrom = "2025-10-01";
const historyTo = "2026-10-01";
const pageSize = 100;
const longName = `Nombre sintético ${"L".repeat(210)}`;
const password = `Pos-${randomUUID()}-${randomUUID()}`;
const masterPin = String(randomInt(100_000, 500_000));
const employeePin = String(randomInt(500_000, 1_000_000));
const terminalSecret = `terminal-${randomUUID()}-${randomUUID()}`;

type ReportRow = Record<string, string | number | boolean | null>;
type Dataset = {
  key: PosReportKey;
  branchIds: string[];
  includesCosts: boolean;
  scope: { branches: Array<{ id: string; name: string; active: boolean }> };
  columns: string[];
  rows: ReportRow[];
  page: number;
  pageSize: number;
  total: number;
};
type RequestResult = {
  response: Response;
  body: Record<string, unknown>;
  durationMs: number;
  responseBytes: number;
};
type ScaleMetric = {
  branches: number;
  inactiveBranches: number;
  rows: number;
  reportRequests: number;
  reportCompleteMs: number;
  reportPageP95Ms: number;
  screenHydrationRequests: number;
  screenHydrationMs: number;
  screenHydrationPageP95Ms: number;
  exportMs: number;
  exportBytes: number;
};

let server: Server;
let baseUrl = "";
let masterToken = "";
let employeeToken = "";
let masterCredentialId = "";
let employeeCredentialId = "";
let employeeId = "";
let paymentMethodId = "";
const branchIds: string[] = [];
const inactiveBranchIds = new Set<string>();
const branchNames = new Map<string, string>();
const terminalIds: string[] = [];
const customerIds: string[] = [];
const itemIds: string[] = [];
const itemNames: string[] = [];
const scaleMetrics: ScaleMetric[] = [];

const percentile = (values: number[], ratio: number) => {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * ratio) - 1)] ?? 0;
};

const roundMs = (value: number) => Math.round(value * 100) / 100;

const digestRows = (rows: ReportRow[]) =>
  createHash("sha256").update(JSON.stringify(rows)).digest("hex");

async function request(path: string, token: string): Promise<RequestResult> {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  return {
    response,
    body: JSON.parse(text) as Record<string, unknown>,
    durationMs: performance.now() - startedAt,
    responseBytes: Buffer.byteLength(text),
  };
}

async function login(alias: string, pin: string) {
  const response = await fetch(`${baseUrl}/api/pos/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      alias,
      pin,
      terminalCode: `RV7-P2-TERM-00-${suffix}`,
      terminalSecret,
    }),
  });
  const body = (await response.json()) as Record<string, unknown>;
  expect(response.status).toBe(200);
  return (body["data"] as { accessToken: string }).accessToken;
}

async function createIdentityAndScope() {
  process.env["JWT_SECRET"] = `${randomUUID()}${randomUUID()}`;
  process.env["POS_JWT_SECRET"] = `${randomUUID()}${randomUUID()}`;
  process.env["POS_PIN_PEPPER"] = `${randomUUID()}${randomUUID()}`;

  const position = await prisma.position.create({
    data: { nombre: `RV7 P2 Report Reader ${suffix}` },
  });
  const employee = await prisma.empleado.create({
    data: {
      nombres: "Escala",
      apellidoPaterno: "Reporte",
      apellidoMaterno: "Sintético",
      nombreCompleto: longName,
      banco: "LOCAL",
      numeroCuenta: suffix,
      puesto: "PRUEBA",
      metaIndividual: 0,
      positionId: position.id,
    },
  });
  employeeId = employee.id;
  const user = await prisma.usuario.create({
    data: {
      nombre: `RV7 P2 Admin ${suffix}`,
      email: `${suffix}@keysar.test`,
      passwordHash: await bcrypt.hash(password, 4),
      rol: "SUPER_ADMIN",
    },
  });

  for (let index = 0; index < 30; index += 1) {
    const inactive = [5, 15, 25].includes(index);
    const name =
      index === 8
        ? ""
        : index === 18
          ? longName
          : `RV7 P2 Sucursal ${String(index + 1).padStart(2, "0")} ${suffix}`;
    const branch = await prisma.sucursal.create({
      data: {
        nombre: name,
        activa: !inactive,
        ...(inactive
          ? { desactivadaEn: new Date("2026-06-30T12:00:00Z") }
          : {}),
      },
    });
    branchIds.push(branch.id);
    branchNames.set(branch.id, name);
    if (inactive) inactiveBranchIds.add(branch.id);
  }
  await prisma.empleado.update({
    where: { id: employee.id },
    data: { sucursalId: branchIds[0] },
  });

  const terminalHash = await hashPosSecret(terminalSecret);
  for (let index = 0; index < branchIds.length; index += 1) {
    const terminal = await prisma.posTerminal.create({
      data: {
        code: `RV7-P2-TERM-${String(index).padStart(2, "0")}-${suffix}`.toUpperCase(),
        name: `Terminal sintética ${index}`,
        status: "ACTIVE",
        branchId: branchIds[index]!,
        secretHash: index === 0 ? terminalHash : POS_DUMMY_BCRYPT_HASH,
        secretFingerprint:
          index === 0
            ? fingerprintSecret(terminalSecret, "terminal")
            : createHash("sha256")
                .update(`${suffix}-terminal-${index}`)
                .digest("hex"),
      },
    });
    terminalIds.push(terminal.id);
  }

  const masterCredential = await prisma.posCredential.create({
    data: {
      userId: user.id,
      alias: `rv7.p2.master.${suffix}`,
      aliasNormalized: `rv7.p2.master.${suffix}`,
      pinHash: await hashPosSecret(masterPin),
      pinFingerprint: fingerprintSecret(masterPin, "pin"),
      masterProfile: { create: { active: true } },
    },
  });
  masterCredentialId = masterCredential.id;
  const employeeCredential = await prisma.posCredential.create({
    data: {
      employeeId: employee.id,
      alias: `rv7.p2.reader.${suffix}`,
      aliasNormalized: `rv7.p2.reader.${suffix}`,
      pinHash: await hashPosSecret(employeePin),
      pinFingerprint: fingerprintSecret(employeePin, "pin"),
      masterProfile: { create: { active: false } },
    },
  });
  employeeCredentialId = employeeCredential.id;

  const permissionNodes = await prisma.posPermissionNode.findMany({
    where: {
      key: { in: ["REPORTS_VIEW", "REPORTS_PRINT", "SALE_VIEW_ALL"] },
    },
    select: { id: true, key: true },
  });
  expect(permissionNodes.map((node) => node.key).sort()).toEqual([
    "REPORTS_PRINT",
    "REPORTS_VIEW",
    "SALE_VIEW_ALL",
  ]);
  await prisma.positionPosPermission.createMany({
    data: permissionNodes.map((node) => ({
      positionId: position.id,
      permissionNodeId: node.id,
      allowed: true,
    })),
  });
  await prisma.posPositionBranchAssignment.createMany({
    data: branchIds.map((branchId) => ({ positionId: position.id, branchId })),
  });
  await prisma.posCredentialBranchAssignment.createMany({
    data: [...inactiveBranchIds].map((branchId) => ({
      credentialId: masterCredential.id,
      branchId,
    })),
  });
}

async function createCatalogAndCustomers() {
  const sources = await Promise.all(
    ["", "Digital", "Recomendación", longName.slice(0, 150)].map(
      (name, index) =>
        prisma.customerSource.create({
          data: { name: name || `Sin etiqueta ${suffix}-${index}` },
        }),
    ),
  );
  const customers = Array.from({ length: 120 }, (_, index) => ({
    id: randomUUID(),
    displayName:
      index % 17 === 0 ? longName : `Clienta sintética ${index} ${suffix}`,
    normalizedName: `clienta sintetica ${index} ${suffix}`,
    phone: `5500${String(index).padStart(6, "0")}${String(process.pid).slice(-2)}`,
    phoneNormalized: `5500${String(index).padStart(6, "0")}${String(process.pid).slice(-2)}`,
    sourceId: sources[index % sources.length]!.id,
    creadoEn: new Date(Date.UTC(2025, 8, 1, 0, 0, index)),
  }));
  await prisma.customer.createMany({ data: customers });
  customerIds.push(...customers.map((customer) => customer.id));

  const items = Array.from({ length: 12 }, (_, index) => ({
    id: randomUUID(),
    sku: `RV7P2-${String(index).padStart(2, "0")}-${suffix}`.slice(0, 96),
    name:
      index === 0 ? "" : index === 1 ? longName : `Producto sintético ${index}`,
    normalizedName: `producto sintetico ${index} ${suffix}`,
    kind: "PRODUCT" as const,
    published: true,
    listPrice: "58.00",
    minimumPrice: "50.00",
    unitCost: "20.00",
    taxRate: "16.00",
    includesVat: true,
  }));
  await prisma.catalogItem.createMany({ data: items });
  itemIds.push(...items.map((item) => item.id));
  itemNames.push(...items.map((item) => item.name));

  const paymentMethod = await prisma.metodoPago.create({
    data: { nombre: `Efectivo sintético ${suffix}`, tipo: "EFECTIVO" },
  });
  paymentMethodId = paymentMethod.id;

  for (let branchIndex = 0; branchIndex < branchIds.length; branchIndex += 1) {
    const location = await prisma.inventoryLocation.create({
      data: {
        code: `RV7P2-${String(branchIndex).padStart(2, "0")}-${suffix}`.slice(
          0,
          64,
        ),
        name: (branchNames.get(branchIds[branchIndex]!) ?? "").slice(0, 160),
        type: "BRANCH",
        branchId: branchIds[branchIndex],
        active: !inactiveBranchIds.has(branchIds[branchIndex]!),
      },
    });
    await prisma.inventoryBalance.createMany({
      data: itemIds.map((itemId, itemIndex) => ({
        locationId: location.id,
        itemId,
        availableQuantity: String(1000 + branchIndex * 10 + itemIndex),
        reservedQuantity: String(itemIndex % 3),
      })),
    });
  }
}

async function createTicketVolume() {
  let globalIndex = 0;
  const historyStart = Date.parse(`${historyFrom}T00:00:00.000Z`);
  for (let branchIndex = 0; branchIndex < branchIds.length; branchIndex += 1) {
    const tickets: Prisma.PosTicketCreateManyInput[] = [];
    const lines: Prisma.PosTicketLineCreateManyInput[] = [];
    const sellers: Prisma.PosTicketSellerCreateManyInput[] = [];
    const operations: Prisma.PosPaymentOperationCreateManyInput[] = [];
    const payments: Prisma.PosPaymentCreateManyInput[] = [];
    for (
      let ticketIndex = 0;
      ticketIndex < ticketsPerBranch;
      ticketIndex += 1
    ) {
      const ticketId = randomUUID();
      const operationId = randomUUID();
      const businessDate = new Date(
        historyStart + (ticketIndex % 366) * 86_400_000,
      );
      const creadoEn = new Date(
        businessDate.getTime() + branchIndex * 20_000 + ticketIndex * 10,
      );
      const customerId = customerIds[globalIndex % customerIds.length]!;
      const folio = `RV7P2-${String(branchIndex).padStart(2, "0")}-${String(
        ticketIndex,
      ).padStart(4, "0")}-${suffix}`.slice(0, 80);
      tickets.push({
        id: ticketId,
        folio,
        terminalSequence: BigInt(ticketIndex + 1),
        status: "COMPLETED",
        settlementStatus: "PAID",
        businessDate,
        branchId: branchIds[branchIndex]!,
        terminalId: terminalIds[branchIndex]!,
        createdByCredentialId: employeeCredentialId,
        customerId,
        customerNameSnapshot:
          ticketIndex % 31 === 0
            ? null
            : ticketIndex % 37 === 0
              ? longName
              : `Clienta sintética ${globalIndex % customerIds.length}`,
        subtotal: "100.00",
        minimumTotal: "100.00",
        spareTotal: "16.00",
        discountTotal: "0.00",
        taxTotal: "16.00",
        total: "116.00",
        amountPaid: "116.00",
        pendingAmount: "0.00",
        creadoEn,
      });
      for (let lineIndex = 0; lineIndex < 2; lineIndex += 1) {
        const itemIndex = (globalIndex + lineIndex) % itemIds.length;
        lines.push({
          id: randomUUID(),
          ticketId,
          itemId: itemIds[itemIndex],
          itemNameSnapshot: itemNames[itemIndex]!,
          skuSnapshot: `RV7P2-${String(itemIndex).padStart(2, "0")}`,
          familySnapshot: lineIndex === 0 ? null : "Familia sintética",
          categorySnapshot: lineIndex === 0 ? "" : "Categoría sintética",
          quantity: "1.00",
          unitListPrice: "58.00",
          unitMinimumPrice: "50.00",
          unitPrice: "58.00",
          unitCostSnapshot: "20.00",
          taxRateSnapshot: "16.00",
          subtotal: "50.00",
          minimumTotal: "50.00",
          discountTotal: "0.00",
          taxTotal: "8.00",
          total: "58.00",
          creadoEn: new Date(creadoEn.getTime() + lineIndex),
        });
      }
      sellers.push({
        id: randomUUID(),
        ticketId,
        employeeId,
        sellerNameSnapshot: longName,
        shareAmount: "116.00",
        sharePercent: "100.0000",
        creadoEn,
      });
      operations.push({
        id: operationId,
        ticketId,
        folio: `${folio}-PAY`.slice(0, 80),
        kind: "SALE",
        amount: "116.00",
        businessDate,
        actorCredentialId: employeeCredentialId,
        terminalId: terminalIds[branchIndex]!,
        creadoEn,
      });
      payments.push({
        id: randomUUID(),
        operationId,
        paymentMethodId,
        methodNameSnapshot: "Efectivo",
        methodTypeSnapshot: "EFECTIVO",
        amount: "116.00",
        creadoEn,
      });
      globalIndex += 1;
    }
    await prisma.posTicket.createMany({ data: tickets });
    await Promise.all([
      prisma.posTicketLine.createMany({ data: lines }),
      prisma.posTicketSeller.createMany({ data: sellers }),
      prisma.posPaymentOperation.createMany({ data: operations }),
    ]);
    await prisma.posPayment.createMany({ data: payments });
  }
}

async function report(
  endpoint: "reports" | "exports",
  key: PosReportKey,
  selectedBranchIds: string[],
  token = employeeToken,
  page = 1,
) {
  const params = new URLSearchParams({
    dateFrom: historyFrom,
    dateTo: historyTo,
    branchIds: selectedBranchIds.join(","),
    page: String(page),
    pageSize: String(pageSize),
  });
  return request(`/api/pos/${endpoint}/${key}?${params}`, token);
}

async function collectScreenRows(
  key: PosReportKey,
  selectedBranchIds: string[],
) {
  const rows: ReportRow[] = [];
  const durations: number[] = [];
  let page = 1;
  let total = 0;
  let lastDataset: Dataset | null = null;
  do {
    const result = await report(
      "reports",
      key,
      selectedBranchIds,
      employeeToken,
      page,
    );
    expect(result.response.status).toBe(200);
    const dataset = result.body["data"] as Dataset;
    rows.push(...dataset.rows);
    durations.push(result.durationMs);
    total = dataset.total;
    lastDataset = dataset;
    if (dataset.rows.length === 0) break;
    page += 1;
  } while (rows.length < total);
  return { rows, durations, total, dataset: lastDataset! };
}

async function collectScreenTickets(selectedBranchIds: string[]) {
  const folios: string[] = [];
  const durations: number[] = [];
  let page = 1;
  let total = 0;
  do {
    const params = new URLSearchParams({
      branchIds: selectedBranchIds.join(","),
      page: String(page),
      pageSize: String(pageSize),
    });
    const result = await request(`/api/pos/tickets?${params}`, employeeToken);
    expect(result.response.status).toBe(200);
    const ticketPage = result.body["data"] as {
      items: Array<{ folio: string }>;
      total: number;
    };
    folios.push(...ticketPage.items.map((ticket) => ticket.folio));
    durations.push(result.durationMs);
    total = ticketPage.total;
    if (ticketPage.items.length === 0) break;
    page += 1;
  } while (folios.length < total);
  return { folios, durations, total };
}

loadDescribe("RV7-P2 POS report scale gate on PostgreSQL", () => {
  beforeAll(async () => {
    if (!Number.isInteger(ticketsPerBranch) || ticketsPerBranch < 1)
      throw new Error(
        "POS_REPORT_LOAD_TICKETS_PER_BRANCH debe ser entero positivo",
      );
    await createIdentityAndScope();
    await createCatalogAndCustomers();
    await createTicketVolume();

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Puerto de integración no disponible");
    baseUrl = `http://127.0.0.1:${address.port}`;
    masterToken = await login(`rv7.p2.master.${suffix}`, masterPin);
    employeeToken = await login(`rv7.p2.reader.${suffix}`, employeePin);
  }, 240_000);

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await prisma.$disconnect();
  });

  it("concilia pantalla y archivo en 1/10/20/30 sucursales dentro de los umbrales técnicos", async () => {
    for (const branchCount of branchCounts) {
      const selectedBranchIds = branchIds.slice(0, branchCount);
      const reportStartedAt = performance.now();
      const reportPages = await collectScreenRows(
        "SALES_DETAIL",
        selectedBranchIds,
      );
      const reportCompleteMs = performance.now() - reportStartedAt;
      const screenStartedAt = performance.now();
      const screenTickets = await collectScreenTickets(selectedBranchIds);
      const screenHydrationMs = performance.now() - screenStartedAt;
      const exported = await report(
        "exports",
        "SALES_DETAIL",
        selectedBranchIds,
      );
      expect(exported.response.status).toBe(200);
      const exportDataset = exported.body["data"] as Dataset;
      const expectedRows = branchCount * ticketsPerBranch;
      const inactiveCount = selectedBranchIds.filter((id) =>
        inactiveBranchIds.has(id),
      ).length;

      expect(reportPages.total).toBe(expectedRows);
      expect(reportPages.rows).toHaveLength(expectedRows);
      expect(screenTickets.total).toBe(expectedRows);
      expect(screenTickets.folios).toHaveLength(expectedRows);
      expect(exportDataset.total).toBe(expectedRows);
      expect(exportDataset.rows).toHaveLength(expectedRows);
      expect(digestRows(reportPages.rows)).toBe(digestRows(exportDataset.rows));
      expect([...screenTickets.folios].sort()).toEqual(
        exportDataset.rows.map((row) => String(row["Folio"])).sort(),
      );
      expect(exportDataset.branchIds).toEqual(selectedBranchIds);
      expect(
        exportDataset.scope.branches.filter((branch) => !branch.active),
      ).toHaveLength(inactiveCount);
      expect(percentile(reportPages.durations, 0.95)).toBeLessThan(
        screenPageMaxMs,
      );
      expect(percentile(screenTickets.durations, 0.95)).toBeLessThan(
        screenPageMaxMs,
      );
      expect(reportCompleteMs).toBeLessThan(screenCompleteMaxMs);
      expect(screenHydrationMs).toBeLessThan(screenCompleteMaxMs);
      expect(exported.durationMs).toBeLessThan(exportMaxMs);

      scaleMetrics.push({
        branches: branchCount,
        inactiveBranches: inactiveCount,
        rows: expectedRows,
        reportRequests: reportPages.durations.length,
        reportCompleteMs: roundMs(reportCompleteMs),
        reportPageP95Ms: roundMs(percentile(reportPages.durations, 0.95)),
        screenHydrationRequests: screenTickets.durations.length,
        screenHydrationMs: roundMs(screenHydrationMs),
        screenHydrationPageP95Ms: roundMs(
          percentile(screenTickets.durations, 0.95),
        ),
        exportMs: roundMs(exported.durationMs),
        exportBytes: exported.responseBytes,
      });
    }
  }, 240_000);

  it("certifica los datasets del catálogo y conserva costos, históricos y nombres límite", async () => {
    const selectedBranchIds = branchIds.slice(0, 30);
    const catalogMetrics: Array<{
      key: PosReportKey;
      rows: number;
      screenMs: number;
      exportMs: number;
    }> = [];
    for (const key of POS_REPORT_KEYS) {
      const screen = await report("reports", key, selectedBranchIds);
      const exported = await report("exports", key, selectedBranchIds);
      expect(screen.response.status).toBe(200);
      expect(exported.response.status).toBe(200);
      const screenDataset = screen.body["data"] as Dataset;
      const exportDataset = exported.body["data"] as Dataset;
      expect(screenDataset.branchIds).toEqual(selectedBranchIds);
      expect(exportDataset.branchIds).toEqual(selectedBranchIds);
      expect(screenDataset.total).toBe(exportDataset.total);
      expect(exportDataset.rows).toHaveLength(exportDataset.total);
      expect(screenDataset.rows).toEqual(
        exportDataset.rows.slice(0, screenDataset.rows.length),
      );
      expect(screen.durationMs).toBeLessThan(screenPageMaxMs);
      expect(exported.durationMs).toBeLessThan(exportMaxMs);
      expect(screenDataset.includesCosts).toBe(false);
      expect(JSON.stringify(exportDataset.rows)).not.toMatch(
        /Costo|Utilidad|Margen|Valor inventario/i,
      );
      catalogMetrics.push({
        key,
        rows: exportDataset.total,
        screenMs: roundMs(screen.durationMs),
        exportMs: roundMs(exported.durationMs),
      });
    }

    const costExport = await report(
      "exports",
      "MERCHANDISE_PROFITABILITY",
      selectedBranchIds,
      masterToken,
    );
    expect(costExport.response.status).toBe(200);
    const costDataset = costExport.body["data"] as Dataset;
    expect(costDataset.includesCosts).toBe(true);
    expect(costDataset.columns).toEqual(
      expect.arrayContaining(["Costo", "Utilidad"]),
    );

    const salesExport = await report(
      "exports",
      "SALES_DETAIL",
      selectedBranchIds,
    );
    const salesDataset = salesExport.body["data"] as Dataset;
    expect(
      salesDataset.rows.some((row) => row["Cliente"] === "Público general"),
    ).toBe(true);
    expect(salesDataset.rows.some((row) => row["Cliente"] === longName)).toBe(
      true,
    );
    expect(salesDataset.rows.some((row) => row["Sucursal"] === "")).toBe(true);
    expect(salesDataset.rows.some((row) => row["Sucursal"] === longName)).toBe(
      true,
    );
    for (const inactiveId of inactiveBranchIds) {
      expect(
        salesDataset.rows.filter((row) => row["branch_id"] === inactiveId),
      ).toHaveLength(ticketsPerBranch);
    }

    const audits = await prisma.auditLog.findMany({
      where: {
        action: "POS_REPORT_EXPORT",
        actorCredentialId: { in: [employeeCredentialId, masterCredentialId] },
      },
      select: { targetId: true, metadata: true },
    });
    expect(audits.length).toBeGreaterThanOrEqual(POS_REPORT_KEYS.length + 6);
    expect(
      audits.some((audit) => {
        const metadata = audit.metadata as {
          branchCount?: number;
          rowCount?: number;
        };
        return (
          audit.targetId === "SALES_DETAIL" &&
          metadata.branchCount === 30 &&
          metadata.rowCount === 30 * ticketsPerBranch
        );
      }),
    ).toBe(true);

    console.info(
      `RV7_P2_METRICS ${JSON.stringify({
        fixture: {
          branchCounts,
          inactiveBranches: inactiveBranchIds.size,
          ticketsPerBranch,
          maximumTickets: branchIds.length * ticketsPerBranch,
          maximumLines: branchIds.length * ticketsPerBranch * 2,
          historyDays: 366,
        },
        thresholdsMs: {
          screenPageMaxMs,
          screenCompleteMaxMs,
          exportMaxMs,
        },
        scale: scaleMetrics,
        catalog: catalogMetrics,
      })}`,
    );
  }, 240_000);
});
