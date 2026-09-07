const assert = require("node:assert/strict");
const { existsSync, readFileSync, readdirSync, statSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const sourceRoot = path.resolve(__dirname, "../src");

function walk(directory, predicate) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute, predicate));
    else if (predicate(absolute)) files.push(absolute);
  }
  return files;
}

function sourcePath(file) {
  return path.relative(sourceRoot, file).split(path.sep).join("/");
}

function resolveProjectImport(specifier, importer) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;
  const base = specifier.startsWith("@/")
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(importer), specifier);
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

function productionGraph() {
  const entries = walk(path.join(sourceRoot, "app"), (file) =>
    /\.(?:ts|tsx)$/.test(file),
  );
  const reachable = new Set();
  const unresolved = [];

  function visit(file) {
    if (reachable.has(file)) return;
    reachable.add(file);
    const source = readFileSync(file, "utf8");
    const imports = [
      ...source.matchAll(
        /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
      ),
      ...source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
    ];
    for (const match of imports) {
      const specifier = match[1];
      const resolved = resolveProjectImport(specifier, file);
      if (resolved) visit(resolved);
      else if (specifier.startsWith(".") || specifier.startsWith("@/")) {
        unresolved.push(`${sourcePath(file)} -> ${specifier}`);
      }
    }
  }

  entries.forEach(visit);
  return { reachable: [...reachable], unresolved };
}

test("keeps the complete RV0 route inventory mounted", () => {
  const pages = walk(path.join(sourceRoot, "app"), (file) =>
    file.endsWith(`${path.sep}page.tsx`),
  )
    .map(sourcePath)
    .sort();
  assert.deepEqual(pages, [
    "app/(auth)/login/page.tsx",
    "app/(dashboard)/administracion/page.tsx",
    "app/(dashboard)/clientes/[section]/page.tsx",
    "app/(dashboard)/clientes/page.tsx",
    "app/(dashboard)/configuraciones/page.tsx",
    "app/(dashboard)/page.tsx",
    "app/(dashboard)/reportes/page.tsx",
    "app/(dashboard)/reportes/reservas/historial/page.tsx",
    "app/(dashboard)/reportes/reservas/locales/page.tsx",
    "app/(dashboard)/reportes/reservas/mensajeria-movil/page.tsx",
    "app/(dashboard)/reportes/reservas/metricas/page.tsx",
    "app/(dashboard)/reportes/reservas/page.tsx",
    "app/(dashboard)/reportes/reservas/prestadores-por-local/[branchId]/page.tsx",
    "app/(dashboard)/reportes/reservas/prestadores-por-local/opatra-mexico/page.tsx",
    "app/(dashboard)/reportes/reservas/rendimiento/page.tsx",
    "app/(dashboard)/reportes/reservas/servicios-por-local/[branchId]/page.tsx",
    "app/(dashboard)/reportes/reservas/servicios-por-local/opatra-mexico/page.tsx",
    "app/(dashboard)/reportes/reservas/servicios/page.tsx",
    "app/(dashboard)/reportes/ventas/page.tsx",
  ]);
});

test("keeps fixtures and retired workspaces out of the production graph", () => {
  const { reachable, unresolved } = productionGraph();
  assert.deepEqual(unresolved, []);

  const forbidden = [
    /\/mock-[^/]+\.(?:ts|tsx)$/,
    /\/SchedulerWorkspace\.tsx$/,
    /\/(?:Clients|Administration|Settings|Reports)Workspace\.tsx$/,
    /\/Reservation(?:ReportWorkspace|Locations|Metrics|MobileMessaging|ProvidersByLocation|Services)\.tsx$/,
  ];
  const forbiddenFiles = reachable
    .map(sourcePath)
    .filter((file) => forbidden.some((pattern) => pattern.test(`/${file}`)));
  assert.deepEqual(forbiddenFiles, []);

  const forbiddenMarkers = [
    "schedulerWeekBookings",
    "Datos de demostración",
    "modo mock",
    "scheduler-operating-hours-by-commerce",
  ];
  const markerHits = [];
  for (const file of reachable) {
    const source = readFileSync(file, "utf8");
    for (const marker of forbiddenMarkers) {
      if (source.includes(marker))
        markerHits.push(`${sourcePath(file)}: ${marker}`);
    }
  }
  assert.deepEqual(markerHits, []);
});

test("limits browser persistence to auth and the documented visual preference", () => {
  const { reachable } = productionGraph();
  const storageFiles = reachable
    .filter((file) =>
      /\b(?:localStorage|sessionStorage|indexedDB)\b/.test(
        readFileSync(file, "utf8"),
      ),
    )
    .map(sourcePath)
    .sort();
  assert.deepEqual(storageFiles, [
    "components/api/ApiSettingsWorkspace.tsx",
    "lib/scheduler-agenda-settings.ts",
    "lib/session.tsx",
  ]);
});

test("loads report generators only after the user requests an export", () => {
  const source = readFileSync(
    path.join(sourceRoot, "lib/scheduler-report-export.ts"),
    "utf8",
  );
  assert.match(source, /await import\("xlsx"\)/);
  assert.match(source, /import\("jspdf"\)/);
  assert.match(source, /import\("jspdf-autotable"\)/);
  assert.doesNotMatch(
    source,
    /^import .* from ["'](?:xlsx|jspdf|jspdf-autotable)["']/m,
  );
});

test("splits each operational workspace into its route module", () => {
  const source = readFileSync(
    path.join(sourceRoot, "components/api/SchedulerPageEntries.tsx"),
    "utf8",
  );
  for (const workspace of [
    "ApiAgendaWorkspace",
    "ApiAdministrationWorkspace",
    "ApiClientsWorkspace",
    "ApiReportsWorkspace",
    "ApiSettingsWorkspace",
  ]) {
    assert.match(source, new RegExp(`import\\(\\"\\./${workspace}\\"\\)`));
    assert.doesNotMatch(
      source,
      new RegExp(`^import .*${workspace}.* from`, "m"),
    );
  }
});
