import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "playwright/test";
import type {
  PilotCut,
  PilotReferenceLine,
} from "../../../packages/types/src/payroll-pilot";
import {
  applyLoanAtClose,
  loanCharges,
  loanRemaining,
  restoreImportedLoan,
} from "../../payroll/src/components/payroll/payroll-deductions";
import type { DemoLoan } from "../../payroll/src/components/payroll/payroll-demo-context";

const start = "2026-11-16",
  end = "2026-11-30",
  prior = "2026-11-01";
const payrollRequire = createRequire(
  resolve(__dirname, "../../payroll/package.json"),
);
const periods = [
  { start: prior, finish: "2026-11-15" },
  { start, finish: end },
];
const sourceLoan = {
  id: "credito-prueba",
  employeeId: "ventas",
  kind: "LOAN" as const,
  requestedAt: prior,
  requestedAmount: 900,
  installmentCount: 3,
  paidAmount: 100,
  balance: 800,
  status: "PENDING",
  installments: [
    { start: prior, end: "2026-11-15", amount: 100, status: "PAID" as const },
    { start, end, amount: 73.42, status: "SCHEDULED" as const },
    { start, end, amount: 726.58, status: "CANCELED" as const },
  ],
};
const referenceLine: PilotReferenceLine = {
  employeeId: "ventas",
  salaryPayment: 0,
  commission: 30,
  bonus: 0,
  perDiem: 0,
  supplies: 0,
  adjustmentPositive: 0,
  adjustmentNegative: 0,
  fine: 0,
  loanPayment: 70,
  totalPayment: 0,
  receiptStatus: null,
  branches: [],
};
function fixture(): PilotCut {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    revision: 0,
    changes: {},
    references: periods.map((p) => ({
      period: p.start,
      mode: "WITH_VAT",
      source: p.start === prior ? "APPROVED" : "DRAFT",
      lines: [referenceLine],
    })),
    original: {
      format: 1,
      capturedAt: start + "T17:00:00Z",
      closedStart: prior,
      openStart: start,
      periods,
      branches: ["NORTE", "SUR"].map((id) => ({
        id,
        name: id,
        createdAt: prior,
        endedAt: null,
        active: true,
      })),
      employees: [
        {
          id: "ventas",
          name: "VENTAS DE PRUEBA",
          position: "VENTAS",
          salary: null,
        },
        {
          id: "fijo",
          name: "SUELDO CONFIDENCIAL QA",
          position: "GERENCIA",
          salary: 12345.6,
        },
        {
          id: "esp",
          name: "ESPECIALISTA QA",
          position: "ESPECIALISTA",
          salary: 15000,
        },
      ].map((e) => ({ ...e, active: true, branchId: "NORTE" })),
      sales: [
        {
          id: "venta",
          employeeId: "ventas",
          branchId: "NORTE",
          date: start,
          amount: 300,
        },
      ],
      schemes: [
        {
          id: "esquema-v1",
          schemeId: "esquema",
          name: "ESCALA QA",
          version: 1,
          active: true,
          effectiveFrom: prior,
          tiers: [{ id: "tramo", from: 0, to: null, rate: 0.1 }],
        },
      ],
      assignments: [
        {
          id: "asignacion",
          employeeId: "ventas",
          schemeId: "esquema",
          effectiveFrom: prior,
          effectiveTo: null,
        },
      ],
      catalog: [],
      movements: [],
      loans: [sourceLoan],
      runs: [],
      lines: [],
    },
  };
}
async function loadFixture(page: Page, cut = fixture()) {
  await page.route("**/api/piloto/cut", async (route) => {
    if (route.request().method() === "PUT") {
      Object.assign(cut.changes, route.request().postDataJSON().changes);
      await route.fulfill({ json: { revision: ++cut.revision } });
      return;
    }
    await route.fulfill({ json: cut });
  });
}
test("cuotas importadas con calendario, cierre idempotente y abono histórico", () => {
  const loan: DemoLoan = {
    id: "credito",
    employeeId: "uno",
    payrollModule: "COMMISSION",
    payrollRunId: "run",
    requestedAt: prior,
    amount: 900,
    installments: 3,
    paidInstallments: 1,
    firstPeriod: prior,
    status: "APPROVED",
    notes: "",
    history: [],
    sourceBalance: 800,
    sourceSchedule: sourceLoan.installments,
  };
  expect(loanCharges(loan, prior, "2026-11-15").map((c) => c.amount)).toEqual([
    100,
  ]);
  expect(loanCharges(loan, start, end).map((c) => c.amount)).toEqual([73.42]);
  const closed = applyLoanAtClose(loan, "COMMISSION", start, end, "QA");
  expect(loanRemaining(closed)).toBeCloseTo(726.58, 2);
  expect(applyLoanAtClose(closed, "COMMISSION", start, end, "QA")).toBe(closed);
  expect(loanCharges(closed, start, end).map((c) => c.amount)).toEqual([73.42]);
  expect(loanCharges(closed, "2026-12-01", "2026-12-15")).toEqual([]);
  expect(
    loanCharges(loan, "2026-12-01", "2026-12-15").map((c) => c.amount),
  ).toEqual([73.42]);
  expect(loanCharges({ ...loan, sourceSchedule: [] }, start, end)).toEqual([]);
  const legacy = restoreImportedLoan(
    { ...loan, appliedPeriodStarts: [start] },
    loan,
  );
  expect(loanCharges(legacy, "2026-12-01", "2026-12-15")).toEqual([]);
});

test("salarios, feriados, sucursales, deducciones y tres formatos desde los módulos", async ({
  page,
}) => {
  test.setTimeout(100_000);
  const cut = fixture();
  await loadFixture(page, cut);
  for (const route of ["/nomina-salario-fijo", "/nomina-especialistas"]) {
    await page.goto(route);
    const button = page.getByRole("button", { name: /Días feriados/ });
    await expect(button).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Días festivos o feriados/ }),
    ).toHaveCount(0);
    await button.click();
    await expect(page.getByRole("dialog")).toContainText("Agregar día doble");
    await page.keyboard.press("Escape");
    if (route === "/nomina-salario-fijo")
      await expect(
        page.getByText("Total distribuido", { exact: true }),
      ).toBeVisible();
  }
  await page.goto("/nomina-salario-fijo");
  const fixed = page
    .getByRole("row")
    .filter({ hasText: "SUELDO CONFIDENCIAL QA" })
    .first();
  await expect(fixed).toBeVisible();
  await expect(fixed).toContainText("6,172.80");
  await checkExports(page, false);
  await page.goto("/");
  await checkExports(page, true);
  await page.goto("/nomina-comisiones");
  await page
    .getByRole("button", { name: "Ver deducciones de VENTAS DE PRUEBA" })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("73.42");
  await expect(dialog).toContainText("credito-prueba");
  await expect(dialog).toContainText(/Pendiente para otro pago.*43\.42/);
  await expect(dialog).toContainText("70.00");
  await expect(dialog).not.toContainText("726.58");
  await page.keyboard.press("Escape");
  await page.goto("/empleados");
  await page.getByRole("button", { name: "Nuevo empleado" }).click();
  const add = page.getByRole("dialog");
  await add.getByLabel("Nombre completo").fill("ALTA SUCURSALES QA");
  await add.getByLabel("Sucursal principal").click();
  await page.getByRole("checkbox", { name: /TODAS LAS SUCURSALES/ }).click();
  await page.keyboard.press("Escape");
  await add.getByLabel("Fecha de nacimiento").fill("2000-01-01");
  await add.getByLabel("Banco", { exact: true }).fill("PRUEBA");
  await add.getByLabel("CLABE interbancaria").fill("000000000000000000");
  await add.getByRole("button", { name: /Registrar empleado/ }).click();
  await expect
    .poll(
      () =>
        (
          cut.changes.employees as
            | { name: string; primaryBranchIds?: string[] }[]
            | undefined
        )?.find((e) => e.name === "ALTA SUCURSALES QA")?.primaryBranchIds,
    )
    .toEqual(["NORTE", "SUR"]);
  await page.reload();
  await expect(
    page.getByText("ALTA SUCURSALES QA", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar perfil de VENTAS DE PRUEBA" })
    .click();
  const profile = page.getByRole("dialog");
  await profile.getByLabel("Sucursal principal").click();
  await page.getByRole("checkbox", { name: /TODAS LAS SUCURSALES/ }).click();
  await expect(page.getByRole("checkbox", { name: /SUR/ })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(profile.getByLabel("Sucursal principal")).toContainText("TODAS");
  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = profile.getByRole("switch", {
    name: /participa en comisiones/i,
  });
  for (let i = 0; i < 2; i++) {
    const within = await toggle.evaluate((el) => {
      const a = el.getBoundingClientRect(),
        b = el.querySelector("span")!.getBoundingClientRect();
      return b.left >= a.left && b.right <= a.right;
    });
    expect(within).toBeTruthy();
    await toggle.click();
    await page.waitForFunction(
      () =>
        !document
          .getAnimations()
          .some((a) => a.playState === "running" && a instanceof CSSTransition),
    );
  }
});

test("el perfil ordinario oculta el sueldo en tabla, descarga y conciliación; el administrador general lo ve", async ({
  page,
}) => {
  const cut = fixture();
  cut.changes.activeEmployeeId = "ventas";
  cut.changes.roles = [
    {
      id: "role-employee",
      name: "LECTURA",
      permissions: [
        "module.fixed_payroll",
        "module.consolidated",
        "module.employees",
        "portal.view",
      ],
    },
  ];
  await loadFixture(page, cut);
  await page.goto("/nomina-salario-fijo");
  const row = page
    .getByRole("row")
    .filter({ hasText: "SUELDO CONFIDENCIAL QA" })
    .first();
  await expect(row).toContainText("Confidencial");
  await expect(row).not.toContainText("6,172.80");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar reporte Excel" })
    .first()
    .click();
  const excel = payrollRequire(
    "xlsx",
  ) as typeof import("../../payroll/node_modules/xlsx");
  const book = excel.read(await readFile((await (await download).path())!));
  const data = excel.utils.sheet_to_json<(string | number)[]>(
    book.Sheets[book.SheetNames[0]!]!,
    { header: 1 },
  );
  const employee = data.find((r) => r[0] === "SUELDO CONFIDENCIAL QA");
  expect(employee).toContain("CONFIDENCIAL");
  expect(employee).not.toContain(6172.8);
  await page.goto("/conciliacion");
  await expect(
    page.getByRole("row").filter({ hasText: "SUELDO CONFIDENCIAL QA" }),
  ).toContainText("Sueldo confidencial");

  // La prueba local puede iniciar con otro perfil. El piloto publicado autentica la cuenta del PO.
  const base = {
    name: "LECTOR QA",
    id: "lector",
    active: true,
    position: "GERENCIA",
    category: "MANAGEMENT",
    branchId: "NORTE",
    costBranchIds: ["NORTE"],
    monthlySalary: 0,
    salaryPayrollModuleId: null,
    commissionPayrollModuleId: null,
    schemeId: null,
    bank: "",
    account: "",
    roleId: "role-general-admin",
    hireDate: "",
    terminationDate: null,
    socialCostRate: 0,
    isrCostRate: 0,
    ivaRate: 0,
    isrRetentionRate: 0,
    ivaRetentionRate: 0,
  };
  cut.changes.employees = [
    base,
    {
      ...base,
      id: "fijo",
      name: "SUELDO CONFIDENCIAL QA",
      salaryPayrollModuleId: "FIXED",
      monthlySalary: 12345.6,
      showSalaryInPayroll: false,
    },
  ];
  cut.changes.activeEmployeeId = "lector";
  await page.goto("/nomina-salario-fijo");
  await expect(row).toContainText("6,172.80");
});

async function checkExports(page: Page, tableOnly: boolean) {
  const excel = payrollRequire(
    "xlsx",
  ) as typeof import("../../payroll/node_modules/xlsx");
  const downloadFile = async (name: string) => {
    const result = page.waitForEvent("download");
    await page.getByRole("button", { name }).first().click();
    return readFile((await (await result).path())!);
  };
  const workbook = excel.read(await downloadFile("Exportar reporte Excel"));
  const grid = excel.utils.sheet_to_csv(
    workbook.Sheets[workbook.SheetNames[0]!]!,
  );
  expect(grid).toContain("SIN VALIDEZ DE PAGO");
  expect(grid).not.toContain("ANÁLISIS");
  expect(grid.includes("RESUMEN EJECUTIVO")).toBe(!tableOnly);
  const pdf = (await downloadFile("Exportar reporte PDF")).toString("latin1");
  expect(pdf.startsWith("%PDF")).toBeTruthy();
  expect(pdf).toContain("SIN VALIDEZ DE PAGO");
  expect(pdf).not.toContain("ANÁLISIS DEL REPORTE");
  await page
    .getByRole("button", { name: /Imprimir reporte/ })
    .first()
    .click();
  const print = page.frameLocator("iframe").last().locator("body");
  await expect(print).toContainText("SIN VALIDEZ DE PAGO");
  await expect(print.locator(".analysis")).toHaveCount(0);
  await expect(print.locator(".metadata")).toHaveCount(tableOnly ? 0 : 1);
  await expect(print.locator("table")).toHaveCount(1);
}
