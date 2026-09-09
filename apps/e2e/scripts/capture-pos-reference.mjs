import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const e2eRoot = path.resolve(scriptDir, "..");
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(e2eRoot, "pos-visual/reference-fixture.json"),
    "utf8",
  ),
);
const manifest = JSON.parse(
  fs.readFileSync(
    path.join(e2eRoot, "pos-visual/reference-scenarios.json"),
    "utf8",
  ),
);

const requiredScreenIds = [
  "dashboard",
  "sale",
  "seller-sales",
  "receipts",
  "customers",
  "appointments",
  "memberships",
  "inventory",
  "warehouse",
  "branch-inventory",
  "suppliers",
  "inventory-movements",
  "deals",
  "catalog",
  "settings",
  "x-report",
  "reports",
  "cash-manager",
  "clock-in",
  "close-day",
  "employees",
  "competition",
  "websites",
  "data-update",
  "my-account",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateManifest() {
  assert(
    manifest.schemaVersion === 1,
    "Versión desconocida del manifiesto POS.",
  );
  assert(
    manifest.referenceSha === fixture.reference.sha,
    "El SHA del manifiesto no coincide con el fixture.",
  );
  const screenIds = manifest.screens.map((screen) => screen.id);
  assert(
    new Set(screenIds).size === screenIds.length,
    "Hay pantallas POS duplicadas.",
  );
  assert(
    requiredScreenIds.every((screenId) => screenIds.includes(screenId)) &&
      screenIds.every((screenId) => requiredScreenIds.includes(screenId)),
    "El inventario no cubre exactamente todos los ScreenId aprobados.",
  );
  const viewportIds = [
    ...manifest.coreViewports,
    ...manifest.breakpointViewports,
  ].map((viewport) => viewport.id);
  assert(
    new Set(viewportIds).size === viewportIds.length,
    "Hay identificadores de viewport duplicados.",
  );
  for (const expected of ["desktop", "tablet", "mobile", "minimum"]) {
    assert(
      viewportIds.includes(expected),
      `Falta el viewport obligatorio ${expected}.`,
    );
  }
  assert(
    manifest.settingsSections.length === 10,
    "Settings debe cubrir 10 secciones.",
  );
  assert(
    manifest.reportDefinitions.length === 11,
    "Reports debe cubrir 11 reportes.",
  );
  assert(
    manifest.warehouseTabs.length === 10,
    "Bodega debe cubrir 10 pestañas.",
  );
}

const viewports = new Map(
  [...manifest.coreViewports, ...manifest.breakpointViewports].map(
    (viewport) => [viewport.id, viewport],
  ),
);
const screens = new Map(manifest.screens.map((screen) => [screen.id, screen]));

function captureName(id, viewportId) {
  return `${id.replace(/[^a-z0-9.-]+/gi, "-")}--${viewportId}.png`;
}

function buildJobs() {
  const jobs = [];
  for (const scenario of manifest.accessScenarios) {
    for (const viewport of scenario.viewports) {
      jobs.push({
        ...scenario,
        viewport,
        file: captureName(scenario.id, viewport),
      });
    }
  }
  for (const screen of manifest.screens) {
    for (const viewport of manifest.coreViewports) {
      jobs.push({
        id: `screen.${screen.id}.default`,
        screen: screen.id,
        viewport: viewport.id,
        actions: [],
        file: captureName(`screen.${screen.id}.default`, viewport.id),
      });
    }
  }
  for (const section of manifest.settingsSections) {
    const id = `settings.${section.toLocaleLowerCase("es-MX").replace(/[^a-z0-9]+/g, "-")}`;
    jobs.push({
      id,
      screen: "settings",
      viewport: "desktop",
      actions: [
        {
          kind: "clickText",
          selector: ".settings-directory-list button",
          text: section,
        },
      ],
      file: captureName(id, "desktop"),
    });
  }
  for (const report of manifest.reportDefinitions) {
    const slug = report.label
      .toLocaleLowerCase("es-MX")
      .replace(/[^a-z0-9]+/g, "-");
    const id = `reports.${slug}`;
    jobs.push({
      id,
      screen: "reports",
      viewport: "desktop",
      actions: [
        { kind: "openReport", group: report.group, text: report.label },
      ],
      file: captureName(id, "desktop"),
    });
  }
  for (const tab of manifest.warehouseTabs) {
    const slug = tab.label
      .toLocaleLowerCase("es-MX")
      .replace(/[^a-z0-9]+/g, "-");
    const id = `${tab.screen}.${slug}`;
    const isBranchRequest = tab.screen === "branch-inventory";
    jobs.push({
      id,
      screen: tab.screen,
      ...(isBranchRequest ? { navigationScreen: "inventory" } : {}),
      viewport: "desktop",
      actions: isBranchRequest
        ? [
            {
              kind: "clickText",
              selector: ".catalog-order-menu-wrap > button",
              text: "Generar pedido",
            },
            {
              kind: "clickText",
              selector: ".catalog-order-menu button",
              text: tab.label,
            },
          ]
        : [
            {
              kind: "clickText",
              selector: ".warehouse-tabs button",
              text: tab.label,
            },
          ],
      file: captureName(id, "desktop"),
    });
  }
  for (const variant of manifest.variants) {
    jobs.push({ ...variant, file: captureName(variant.id, variant.viewport) });
  }
  for (const probe of manifest.breakpointScenarios) {
    jobs.push({
      ...probe,
      actions: [],
      file: captureName(probe.id, probe.viewport),
    });
  }
  const names = jobs.map((job) => job.file);
  assert(
    new Set(names).size === names.length,
    "El manifiesto genera nombres de captura duplicados.",
  );
  for (const job of jobs) {
    assert(
      viewports.has(job.viewport),
      `Viewport desconocido en ${job.id}: ${job.viewport}.`,
    );
    if (job.screen)
      assert(screens.has(job.screen), `Pantalla desconocida en ${job.id}.`);
  }
  return jobs;
}

validateManifest();
const jobs = buildJobs();

if (process.env.POS_BASELINE_LIST_ONLY === "1") {
  const summary = {
    referenceSha: fixture.reference.sha,
    screens: manifest.screens.length,
    settingsSections: manifest.settingsSections.length,
    reports: manifest.reportDefinitions.length,
    warehouseTabs: manifest.warehouseTabs.length,
    captures: jobs.length,
    files: jobs.map((job) => job.file),
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exit(0);
}

const visualMode = process.env.POS_VISUAL_MODE ?? "reference";
assert(
  visualMode === "reference" || visualMode === "candidate",
  "POS_VISUAL_MODE debe ser reference o candidate.",
);
const sourceRoot = process.env.POS_VISUAL_ROOT;
const outputRoot = process.env.POS_VISUAL_OUTPUT;
assert(sourceRoot, "Define POS_VISUAL_ROOT con la raíz extraída y compilada.");
assert(
  outputRoot,
  "Define POS_VISUAL_OUTPUT con un directorio nuevo de salida.",
);

const absoluteSourceRoot = path.resolve(sourceRoot);
const absoluteOutputRoot = path.resolve(outputRoot);
const appRoot = path.join(absoluteSourceRoot, "apps/pos");
const distRoot = path.join(appRoot, "dist");
const publicRoot = path.join(appRoot, "public");
assert(
  fs.existsSync(path.join(distRoot, "index.html")),
  `No existe ${distRoot}/index.html.`,
);
assert(
  !fs.existsSync(absoluteOutputRoot) ||
    fs.readdirSync(absoluteOutputRoot).length === 0,
  `La salida ${absoluteOutputRoot} ya contiene archivos; no se sobrescribe evidencia.`,
);

function hashFile(filename, algorithm = "sha256") {
  return createHash(algorithm).update(fs.readFileSync(filename)).digest("hex");
}

function gitBlobHash(filename) {
  const contents = fs.readFileSync(filename);
  return createHash("sha1")
    .update(`blob ${contents.length}\0`)
    .update(contents)
    .digest("hex");
}

function sourceSnapshotHash(root) {
  const includedRoots = [
    "apps/pos",
    "packages/ui",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
  ];
  const ignoredDirectories = new Set([
    "node_modules",
    "dist",
    "dist-electron",
    "release",
    ".turbo",
    "coverage",
  ]);
  const files = [];
  const walk = (relativePath) => {
    const filename = path.join(root, relativePath);
    assert(fs.existsSync(filename), `Falta ${relativePath} en la referencia.`);
    const stats = fs.lstatSync(filename);
    if (stats.isDirectory()) {
      for (const entry of fs.readdirSync(filename).sort()) {
        if (!ignoredDirectories.has(entry)) {
          walk(path.posix.join(relativePath, entry));
        }
      }
      return;
    }
    assert(stats.isFile(), `Tipo de archivo no soportado: ${relativePath}.`);
    files.push(relativePath);
  };
  for (const includedRoot of includedRoots) walk(includedRoot);
  const hash = createHash("sha256");
  for (const relativePath of files.sort()) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(root, relativePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function verifyReferenceSource() {
  assert(
    absoluteOutputRoot.includes(fixture.reference.sha),
    "La salida de referencia debe incluir el SHA completo en su ruta.",
  );
  const snapshotHash = sourceSnapshotHash(absoluteSourceRoot);
  assert(
    snapshotHash === fixture.reference.sourceSnapshotSha256,
    `La fuente completa no coincide con el snapshot aprobado (${snapshotHash}).`,
  );
  for (const [relativePath, expectedBlob] of Object.entries(
    fixture.essentialBlobs,
  )) {
    const filename = path.join(absoluteSourceRoot, relativePath);
    assert(
      fs.existsSync(filename),
      `Falta el archivo de referencia ${relativePath}.`,
    );
    const actualBlob = gitBlobHash(filename);
    assert(
      actualBlob === expectedBlob,
      `${relativePath} no pertenece al SHA aprobado (${actualBlob} != ${expectedBlob}).`,
    );
  }
  for (const [relativePath, expectedSha256] of Object.entries(
    fixture.assetSha256,
  )) {
    const filename = path.join(absoluteSourceRoot, relativePath);
    assert(
      fs.existsSync(filename),
      `Falta el asset de referencia ${relativePath}.`,
    );
    assert(
      hashFile(filename) === expectedSha256,
      `El asset ${relativePath} no coincide con el baseline aprobado.`,
    );
  }
}

if (visualMode === "reference") verifyReferenceSource();
const sourceSha =
  visualMode === "reference"
    ? fixture.reference.sha
    : process.env.POS_CANDIDATE_SHA;
assert(sourceSha, "En modo candidate debes definir POS_CANDIDATE_SHA.");

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
  [".png", "image/png"],
  [
    ".xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
]);

function resolveRequest(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  if (pathname === "/" || pathname === "/index.html")
    return path.join(distRoot, "index.html");
  if (pathname.startsWith("/assets/"))
    return path.join(distRoot, pathname.slice(1));
  if (
    pathname === "/logo.svg" ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/templates/")
  ) {
    return path.join(publicRoot, pathname.slice(1));
  }
  return "";
}

const stabilityCss = `
  *,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
  [data-rv-sensitive="true"]{color:transparent!important;text-shadow:none!important}
`;

async function redactSensitiveContent(page) {
  await page.evaluate(() => {
    const sensitivePhrases = [
      "usuario de prueba",
      "claves mock",
      "código estático de prueba",
      "mock de demostración",
      "demostración:",
      "pruebas:",
      "mock:",
    ];
    for (const element of document.querySelectorAll("small")) {
      const text = (element.textContent ?? "").toLocaleLowerCase("es-MX");
      if (
        element.classList.contains("software-login-demo") ||
        sensitivePhrases.some((phrase) => text.includes(phrase))
      ) {
        element.setAttribute("data-rv-sensitive", "true");
      }
    }
  });
}

async function createPage(browser, viewport, job) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: fixture.rendering.deviceScaleFactor,
    locale: fixture.clock.locale,
    timezoneId: fixture.clock.timezone,
    colorScheme: fixture.rendering.colorScheme,
    reducedMotion: fixture.rendering.reducedMotion,
    hasTouch: viewport.width <= 420,
  });
  await context.addInitScript(
    ({ fixedInstant, randomSeed, online }) => {
      const NativeDate = Date;
      class FixedDate extends NativeDate {
        constructor(...args) {
          if (args.length === 0) super(fixedInstant);
          else super(...args);
        }
        static now() {
          return new NativeDate(fixedInstant).getTime();
        }
      }
      Object.defineProperty(window, "Date", { value: FixedDate });
      let state = randomSeed >>> 0;
      Math.random = () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
      };
      let uuidCounter = 0;
      Object.defineProperty(Crypto.prototype, "randomUUID", {
        configurable: true,
        value: () => {
          uuidCounter += 1;
          return `12080400-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
        },
      });
      Object.defineProperty(Navigator.prototype, "onLine", {
        configurable: true,
        get: () => online,
      });
    },
    {
      fixedInstant: fixture.clock.instant,
      randomSeed: fixture.determinism.seedMathRandom,
      online: job.networkState !== "offline",
    },
  );
  await context.route("**/*", async (route) => {
    const requestPath = resolveRequest(route.request().url());
    if (
      !requestPath ||
      !requestPath.startsWith(appRoot) ||
      !fs.existsSync(requestPath)
    ) {
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

async function loadReference(page) {
  await page.goto("http://pos-reference.local/", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: stabilityCss });
  await page.evaluate(() => document.fonts.ready);
}

async function discoverHistoricalMasterCode(page) {
  if (visualMode === "candidate") {
    const fixtureCode = process.env.POS_VISUAL_FIXTURE_MASTER_CODE;
    assert(
      /^\d{4}$/.test(fixtureCode ?? ""),
      "Define POS_VISUAL_FIXTURE_MASTER_CODE con la credencial efímera de cuatro dígitos usada al compilar el candidato.",
    );
    return fixtureCode;
  }
  const demoCopy = await page.locator(".software-login-demo").innerText();
  const code = demoCopy.match(/\b\d{4}\b/)?.[0];
  assert(
    code,
    "No fue posible descubrir el acceso histórico dentro de la referencia aislada.",
  );
  return code;
}

function discoverHistoricalSellerCode() {
  const mockData = fs.readFileSync(
    path.join(appRoot, "src/renderer/src/mock-data.ts"),
    "utf8",
  );
  const code = mockData.match(/accessCode:\s*"(\d{4})"/)?.[1];
  assert(
    code,
    "No fue posible descubrir una clave de vendedor en la referencia aislada.",
  );
  return code;
}

async function enterLogin(page, { dismissConnectivityNotice = true } = {}) {
  const historicalMasterCode = await discoverHistoricalMasterCode(page);
  await page.getByPlaceholder("Alias del vendedor").fill("master");
  await page.getByPlaceholder("Código de acceso").fill(historicalMasterCode);
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await page.locator(".inventory-count-screen").waitFor();
  const connectivityDialog = page.locator(".connectivity-dialog");
  await connectivityDialog.waitFor();
  if (dismissConnectivityNotice) {
    await connectivityDialog
      .getByRole("button", { name: "Entendido", exact: true })
      .click();
    await connectivityDialog.waitFor({ state: "hidden" });
  }
  return historicalMasterCode;
}

async function enterOperationalSession(page) {
  const historicalMasterCode = await enterLogin(page);
  await page.getByRole("button", { name: /Skip count/ }).click();
  if (
    visualMode === "candidate" &&
    (await page.locator("#inventory-skip-master-code").count()) > 0
  ) {
    await page
      .locator("#inventory-skip-master-code")
      .fill(historicalMasterCode);
    await page
      .getByRole("button", { name: "Confirmar y enviar", exact: true })
      .click();
  }
  await page.locator(".pos-app").waitFor();
  return historicalMasterCode;
}

async function ensureSidebarExpanded(page) {
  const sidebar = page.locator(".pos-sidebar");
  if (!(await sidebar.isVisible())) {
    await page
      .getByRole("button", { name: "Menú general", exact: true })
      .click({ force: true });
    await sidebar.waitFor();
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const collapsed = await sidebar.evaluate((element) =>
      element.classList.contains("is-collapsed"),
    );
    if (!collapsed) return;
    await sidebar.locator(".sidebar-toggle").click({ force: true });
    await page.waitForTimeout(150);
  }
  assert(
    !(await sidebar.evaluate((element) =>
      element.classList.contains("is-collapsed"),
    )),
    "No fue posible expandir el menú lateral.",
  );
}

async function openSidebarGroup(page, groupIndex) {
  const group = page.locator(".sidebar-nav-group").nth(groupIndex);
  const submenu = group.locator(".sidebar-submenu");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await ensureSidebarExpanded(page);
    if ((await submenu.count()) > 0) return submenu;
    await group.locator(":scope > button.sidebar-item").click({ force: true });
    await page.waitForTimeout(150);
  }
  throw new Error(`No fue posible desplegar el grupo ${groupIndex} del menú.`);
}

async function withWideNavigationViewport(page, callback) {
  const requestedViewport = page.viewportSize();
  const mustWiden = requestedViewport && requestedViewport.width <= 920;
  if (mustWiden) {
    await page.setViewportSize({
      width: 921,
      height: Math.max(requestedViewport.height, 900),
    });
  }
  try {
    await callback();
  } finally {
    if (mustWiden) await page.setViewportSize(requestedViewport);
  }
}

async function navigateToScreen(page, screenId, historicalMasterCode) {
  const screen = screens.get(screenId);
  assert(screen, `No existe navegación para ${screenId}.`);
  const navigation = screen.navigation;
  await withWideNavigationViewport(page, async () => {
    await ensureSidebarExpanded(page);
    if (navigation.kind === "account") {
      await page.locator(".header-account-button").click({ force: true });
    } else if (navigation.kind === "sale" || navigation.kind === "inventory") {
      const submenu = await openSidebarGroup(
        page,
        navigation.kind === "sale" ? 0 : 1,
      );
      await submenu
        .locator("button")
        .filter({ hasText: navigation.label })
        .first()
        .click({ force: true });
    } else {
      await page
        .locator("button.sidebar-item")
        .filter({ hasText: navigation.label })
        .first()
        .click({ force: true });
    }
    if (
      screenId === "close-day" &&
      (await page.locator(".inventory-count-screen").isVisible())
    ) {
      await page
        .getByRole("button", { name: /Skip count/ })
        .click({ force: true });
      if (
        visualMode === "candidate" &&
        (await page.locator("#inventory-skip-master-code").count()) > 0
      ) {
        await page
          .locator("#inventory-skip-master-code")
          .fill(historicalMasterCode);
        await page
          .getByRole("button", { name: "Confirmar y enviar", exact: true })
          .click();
      }
    }
  });
  await page
    .getByRole("heading", { name: screen.title, exact: true })
    .first()
    .waitFor();
}

async function enterClosingCount(page) {
  await enterOperationalSession(page);
  await withWideNavigationViewport(page, async () => {
    const submenu = await openSidebarGroup(page, 0);
    await submenu
      .locator("button")
      .filter({ hasText: "Close day" })
      .click({ force: true });
  });
  await page.locator(".inventory-count-screen").waitFor();
}

async function clickText(page, step) {
  const base = step.selector
    ? page.locator(step.selector)
    : page.getByRole("button");
  const locator = base.filter({ hasText: step.text }).nth(step.index ?? 0);
  await locator.click({ force: true });
}

async function runActions(page, actions, historicalMasterCode) {
  for (const step of actions ?? []) {
    if (step.kind === "click") {
      await page
        .locator(step.selector)
        .nth(step.index ?? 0)
        .click({ force: true });
    } else if (step.kind === "clickText") {
      await clickText(page, step);
    } else if (step.kind === "clickLabel") {
      await page
        .getByRole("button", { name: step.label, exact: true })
        .click({ force: true });
    } else if (step.kind === "clickPrefixLabel") {
      await page
        .getByRole("button", { name: new RegExp(`^${step.label}`) })
        .first()
        .click({ force: true });
    } else if (step.kind === "fillLabel") {
      await page.getByLabel(step.label, { exact: true }).fill(step.value);
    } else if (step.kind === "fillSecret") {
      await page
        .getByLabel(step.label, { exact: true })
        .fill(historicalMasterCode);
    } else if (step.kind === "fillSellerSecret") {
      await page
        .getByLabel(step.label, { exact: true })
        .fill(discoverHistoricalSellerCode());
    } else if (step.kind === "openReport") {
      const group = page
        .locator(".reports-menu-trigger")
        .filter({ hasText: step.group })
        .first();
      if ((await group.getAttribute("aria-expanded")) !== "true") {
        await group.click({ force: true });
      }
      await page
        .locator(".reports-submenu button")
        .filter({ hasText: step.text })
        .first()
        .click({
          force: true,
        });
    } else if (step.kind === "scrollEnd") {
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
    } else {
      throw new Error(`Acción desconocida: ${step.kind}.`);
    }
    await page.waitForTimeout(50);
  }
}

async function prepareJob(page, job) {
  await loadReference(page);
  let historicalMasterCode = "";
  if (job.stage === "LOGIN") return;
  if (job.stage === "LOGIN_ERROR") {
    await page
      .getByPlaceholder("Alias del vendedor")
      .fill("usuario-rv0-inexistente");
    await page.getByPlaceholder("Código de acceso").fill("0000");
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page
      .getByText("Usuario o contraseña incorrectos.", { exact: true })
      .waitFor();
    return;
  }
  if (job.stage === "CONNECTIVITY_NOTICE") {
    await enterLogin(page, { dismissConnectivityNotice: false });
    return;
  }
  if (
    job.stage === "OPENING_COUNT" ||
    job.stage === "OPENING_COUNT_CONFIRMATION"
  ) {
    historicalMasterCode = await enterLogin(page);
    if (job.stage === "OPENING_COUNT_CONFIRMATION") {
      const inputs = page.locator(".inventory-count-product input");
      const inputCount = await inputs.count();
      assert(
        inputCount > 0,
        "El conteo de apertura no presentó productos capturables.",
      );
      for (let index = 0; index < inputCount; index += 1) {
        const input = inputs.nth(index);
        await input.click();
        await input.pressSequentially("0", { delay: 25 });
        await input.press("Tab");
        assert(
          (await input.inputValue()) === "0",
          `El conteo de apertura no conservó el valor del campo ${index + 1}.`,
        );
      }
      const openDayButton = page.locator(".open-day-button");
      await openDayButton.waitFor();
      try {
        await page.waitForFunction(
          (expectedInputCount) => {
            const renderedInputs = Array.from(
              document.querySelectorAll(".inventory-count-product input"),
            );
            const button = document.querySelector(".open-day-button");
            return (
              renderedInputs.length === expectedInputCount &&
              renderedInputs.every(
                (input) => input instanceof HTMLInputElement && input.value,
              ) &&
              button instanceof HTMLButtonElement &&
              !button.disabled
            );
          },
          inputCount,
          { timeout: 10_000 },
        );
      } catch {
        const values = await inputs.evaluateAll((elements) =>
          elements.map((element) =>
            element instanceof HTMLInputElement ? element.value : "<no-input>",
          ),
        );
        const progress = await page
          .locator(".inventory-count-progress > strong")
          .textContent();
        throw new Error(
          `Open Day continúa deshabilitado: progreso ${progress ?? "desconocido"}, ` +
            `${values.filter(Boolean).length}/${inputCount} campos con valor (${values.join(", ")}).`,
        );
      }
      await openDayButton.click();
      await page
        .getByRole("heading", {
          name: "¿Estás seguro de enviar estos datos?",
          exact: true,
        })
        .waitFor();
    }
    return;
  }
  if (job.stage === "CLOSING_COUNT") {
    await enterClosingCount(page);
    return;
  }
  historicalMasterCode = await enterOperationalSession(page);
  if (job.screen)
    await navigateToScreen(
      page,
      job.navigationScreen ?? job.screen,
      historicalMasterCode,
    );
  await runActions(page, job.actions, historicalMasterCode);
}

const stagingRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "keysar-pos-rv0-captures-"),
);
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const browserVersion = browser.version();
  const captureIndex = [];
  for (const [jobIndex, job] of jobs.entries()) {
    const viewport = viewports.get(job.viewport);
    const { context, page } = await createPage(browser, viewport, job);
    try {
      await prepareJob(page, job);
      if (job.media) await page.emulateMedia({ media: job.media });
      await redactSensitiveContent(page);
      await page.evaluate(() => document.fonts.ready);
      const destination = path.join(stagingRoot, job.file);
      await page.screenshot({ path: destination, fullPage: false });
      captureIndex.push({
        id: job.id,
        screen: job.screen ?? null,
        stage: job.stage ?? "OPEN",
        viewport: job.viewport,
        width: viewport.width,
        height: viewport.height,
        file: job.file,
        sha256: hashFile(destination),
      });
      process.stdout.write(`[${jobIndex + 1}/${jobs.length}] ${job.file}\n`);
    } finally {
      await context.close();
    }
  }
  const captureManifest = {
    schemaVersion: 1,
    mode: visualMode,
    sourceSha,
    referenceSha: fixture.reference.sha,
    fixedInstant: fixture.clock.instant,
    locale: fixture.clock.locale,
    timezone: fixture.clock.timezone,
    browser: fixture.rendering.browser,
    browserVersion,
    playwright: fixture.rendering.playwright,
    nodeVersion: process.version,
    packageManager: process.env.npm_config_user_agent ?? "direct-node",
    deviceScaleFactor: fixture.rendering.deviceScaleFactor,
    colorScheme: fixture.rendering.colorScheme,
    reducedMotion: fixture.rendering.reducedMotion,
    fixtureSha256: hashFile(
      path.join(e2eRoot, "pos-visual/reference-fixture.json"),
    ),
    scenarioManifestSha256: hashFile(
      path.join(e2eRoot, "pos-visual/reference-scenarios.json"),
    ),
    referenceSourceSnapshotSha256: fixture.reference.sourceSnapshotSha256,
    sensitiveContentRedacted: true,
    captures: captureIndex,
  };
  fs.writeFileSync(
    path.join(stagingRoot, "capture-index.json"),
    `${JSON.stringify(captureManifest, null, 2)}\n`,
  );
  fs.mkdirSync(absoluteOutputRoot, { recursive: true });
  fs.cpSync(stagingRoot, absoluteOutputRoot, {
    recursive: true,
    errorOnExist: true,
  });
  process.stdout.write(`Evidencia completa: ${absoluteOutputRoot}\n`);
} catch (error) {
  throw new Error(
    `La captura POS falló sin publicar evidencia parcial. ${error instanceof Error ? error.message : String(error)}`,
  );
} finally {
  if (browser) await browser.close();
  fs.rmSync(stagingRoot, { recursive: true, force: true });
}
