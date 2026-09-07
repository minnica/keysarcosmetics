import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const referenceRoot = process.env.SCHEDULER_REFERENCE_ROOT;
const outputRoot = process.env.SCHEDULER_BASELINE_OUTPUT;

if (!referenceRoot || !outputRoot) {
  throw new Error(
    "Define SCHEDULER_REFERENCE_ROOT y SCHEDULER_BASELINE_OUTPUT antes de ejecutar la captura.",
  );
}

const schedulerRoot = path.resolve(referenceRoot, "apps/scheduler");
const appRoot = path.join(schedulerRoot, ".next/server/app");
const staticRoot = path.join(schedulerRoot, ".next/static");
const publicRoot = path.join(schedulerRoot, "public");

if (!fs.existsSync(path.join(appRoot, "index.html"))) {
  throw new Error(
    `No existe el build estático de Scheduler en ${appRoot}. Ejecuta el build de la referencia primero.`,
  );
}

fs.mkdirSync(outputRoot, { recursive: true });

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
]);

function resolveRequest(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  if (pathname.startsWith("/_next/static/")) {
    return path.join(staticRoot, pathname.slice("/_next/static/".length));
  }
  if (pathname === "/logo.svg" || pathname.startsWith("/fonts/")) {
    return path.join(publicRoot, pathname.slice(1));
  }
  const route =
    pathname === "/" ? "index" : pathname.replace(/^\//, "").replace(/\/$/, "");
  return path.join(appRoot, `${route}.html`);
}

const agendaViewports = [
  [1536, 864],
  [1366, 768],
  [1280, 720],
  [1280, 600],
  [390, 844],
  [360, 800],
];

const desktopPages = [
  ["clientes", "/clientes"],
  ["clientes-encuestas", "/clientes/reporte-de-encuestas"],
  ["clientes-recordatorios", "/clientes/recordatorios"],
  ["reportes-resumen", "/reportes"],
  ["reportes-reservas", "/reportes/reservas"],
  ["reportes-historial", "/reportes/reservas/historial"],
  ["reportes-rendimiento", "/reportes/reservas/rendimiento"],
  ...[
    "locals",
    "professionals",
    "services",
    "commissions",
    "resources",
    "surveys",
    "consents",
    "whatsapp",
    "gift-cards",
    "status-colors",
  ].map((section) => [
    `administracion-${section}`,
    `/administracion?section=${section}`,
  ]),
  ...[
    "company",
    "website",
    "agenda",
    "payments",
    "reminders",
    "records",
    "emails",
    "integrations",
    "notifications",
    "clients",
    "surveys",
  ].map((section) => [
    `configuraciones-${section}`,
    `/configuraciones?section=${section}`,
  ]),
];

const mobilePages = [
  ["clientes", "/clientes"],
  ["administracion-comercios", "/administracion?section=locals"],
  ["configuraciones-empresa", "/configuraciones?section=company"],
  ["reportes-resumen", "/reportes"],
  ["reportes-reservas", "/reportes/reservas"],
];

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

async function createPage(width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    const fixedInstant = "2026-06-30T17:00:00.000Z";
    const NativeDate = Date;
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedInstant]));
      }

      static now() {
        return new NativeDate(fixedInstant).getTime();
      }
    }
    Object.defineProperty(window, "Date", { value: FixedDate });
  });
  await context.route("**/*", async (route) => {
    const requestPath = resolveRequest(route.request().url());
    if (!requestPath.startsWith(schedulerRoot) || !fs.existsSync(requestPath)) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType:
        mimeTypes.get(path.extname(requestPath)) ?? "application/octet-stream",
      body: fs.readFileSync(requestPath),
    });
  });
  return { context, page: await context.newPage() };
}

async function load(page, route) {
  await page.goto(`http://scheduler-reference.local${route}`, {
    waitUntil: "networkidle",
  });
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  await page.evaluate(() => document.fonts.ready);
}

async function capture(page, name, fullPage = false) {
  await page.screenshot({
    path: path.join(outputRoot, `${name}.png`),
    fullPage,
  });
}

for (const [width, height] of agendaViewports) {
  const { context, page } = await createPage(width, height);
  await load(page, "/");
  await capture(page, `agenda-day-${width}x${height}`);
  await context.close();
}

for (const [name, route] of desktopPages) {
  const { context, page } = await createPage(1536, 864);
  await load(page, route);
  await capture(page, `${name}-1536x864`, true);
  await context.close();
}

for (const [name, route] of mobilePages) {
  const { context, page } = await createPage(390, 844);
  await load(page, route);
  await capture(page, `${name}-390x844`, true);
  await context.close();
}

const interactions = [
  {
    name: "agenda-week-1536x864",
    route: "/",
    action: (page) => page.getByRole("button", { name: "Semana" }).click(),
  },
  {
    name: "agenda-list-1536x864",
    route: "/",
    action: (page) =>
      page.getByRole("button", { name: "Ver agenda como lista" }).click(),
  },
  {
    name: "agenda-new-booking-dialog-1536x864",
    route: "/",
    action: (page) => page.getByRole("button", { name: "Nuevo" }).click(),
  },
  {
    name: "agenda-filters-390x844",
    route: "/",
    viewport: [390, 844],
    action: (page) =>
      page.getByRole("button", { name: "Abrir filtros de agenda" }).click(),
  },
  {
    name: "clientes-new-dialog-1536x864",
    route: "/clientes",
    action: (page) =>
      page.getByRole("button", { name: "Nuevo cliente" }).click(),
  },
  {
    name: "administracion-new-commerce-dialog-1536x864",
    route: "/administracion?section=locals",
    action: (page) =>
      page.getByRole("button", { name: "Nuevo comercio" }).click(),
  },
];

for (const item of interactions) {
  const [width, height] = item.viewport ?? [1536, 864];
  const { context, page } = await createPage(width, height);
  await load(page, item.route);
  await item.action(page);
  await page.waitForTimeout(100);
  await capture(page, item.name);
  await context.close();
}

await browser.close();
