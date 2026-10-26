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
  if (specifier === "@scheduler/runtime") {
    return path.join(sourceRoot, "lib/runtime.tsx");
  }
  if (specifier === "@scheduler/design-proposals") {
    return path.join(sourceRoot, "lib/design-proposals.ts");
  }
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
    "app/(dashboard)/movimientos/page.tsx",
    "app/(dashboard)/page.tsx",
    "app/(dashboard)/reportes/comisiones/page.tsx",
    "app/(dashboard)/reportes/compras-cabinas/page.tsx",
    "app/(dashboard)/reportes/page.tsx",
    "app/(dashboard)/reportes/proyecciones/page.tsx",
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
    "app/(dashboard)/reportes/seguimiento-citas/page.tsx",
    "app/(dashboard)/reportes/ventas/page.tsx",
    "app/portal/page.tsx",
  ]);
});

test("mounts the customer self-service portal outside the staff dashboard", () => {
  const route = readFileSync(
    path.join(sourceRoot, "app/portal/page.tsx"),
    "utf8",
  );
  const portal = readFileSync(
    path.join(
      sourceRoot,
      "components/portal/SchedulerCustomerPortal.tsx",
    ),
    "utf8",
  );
  const documentExport = readFileSync(
    path.join(sourceRoot, "lib/scheduler-customer-portal-document.ts"),
    "utf8",
  );

  assert.match(route, /SchedulerCustomerPortal/);
  assert.match(portal, /Accede a tu portal/);
  assert.match(portal, /Repetir tu visita/);
  assert.match(portal, /Apartados y saldos/);
  assert.match(portal, /Mis documentos/);
  assert.match(
    portal,
    /await import\(\s*["']@\/lib\/scheduler-customer-portal-document["']\s*\)/,
  );
  assert.match(documentExport, /await Promise\.all\(\[import\("jspdf"\)\]\)/);
  assert.doesNotMatch(documentExport, /^import .* from ["']jspdf["']/m);
});

test("combines commerce and resources into one administration submenu", () => {
  const primaryNav = readFileSync(
    path.join(sourceRoot, "components/SchedulerPrimaryNav.tsx"),
    "utf8",
  );
  const sidebar = readFileSync(
    path.join(sourceRoot, "components/layout/SchedulerAppSidebar.tsx"),
    "utf8",
  );
  const administrationEntry = readFileSync(
    path.join(sourceRoot, "components/api/ApiAdministrationWorkspace.tsx"),
    "utf8",
  );
  assert.match(primaryNav, /id: "locals",\s+label: "Sucursales y cabinas"/);
  assert.doesNotMatch(primaryNav, /id: "resources", label: "Recursos"/);
  assert.match(sidebar, /label: "Sucursales y cabinas"/);
  assert.doesNotMatch(
    sidebar,
    /label: "Recursos"[\s\S]*adminSection: "resources"/,
  );
  assert.match(
    administrationEntry,
    /requestedSection === "resources" \? "locals" : requestedSection/,
  );
});

test("returns to the agenda after a successful post-sale save", () => {
  const agendaWorkspace = readFileSync(
    path.join(sourceRoot, "components/api/ApiAgendaWorkspace.tsx"),
    "utf8",
  );
  const agendaGrid = readFileSync(
    path.join(sourceRoot, "components/scheduler/SchedulerAgendaGrid.tsx"),
    "utf8",
  );

  assert.match(
    agendaWorkspace,
    /journalKind === "POST_SALE_COMMENT"[\s\S]{0,160}setJournalRequest\(null\)[\s\S]{0,80}setJournalEntries\(\[\]\)/,
  );
  const postSaleOpeners = agendaGrid.match(
    /onOpenPostSaleComment=\{\(selectedBooking\) => \{[\s\S]{0,120}setOpenBookingCardId\(null\);[\s\S]{0,120}onOpenPostSaleComment\(selectedBooking\);/g,
  );
  assert.equal(postSaleOpeners?.length, 2);
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
  for (const relativePath of [
    "lib/scheduler-report-export.ts",
    "components/reports/cabin-sales-report-export.ts",
    "components/reports/commission-report-export.ts",
  ]) {
    const source = readFileSync(path.join(sourceRoot, relativePath), "utf8");
    assert.match(source, /await import\("xlsx"\)/);
    assert.match(source, /import\("jspdf"\)/);
    assert.match(source, /import\("jspdf-autotable"\)/);
    assert.doesNotMatch(
      source,
      /^import .* from ["'](?:xlsx|jspdf|jspdf-autotable)["']/m,
    );
  }
});

test("separates commission configuration from its report route", () => {
  const administration = readFileSync(
    path.join(
      sourceRoot,
      "components/administration/RestoredAdministrationSections.tsx",
    ),
    "utf8",
  );
  const report = readFileSync(
    path.join(sourceRoot, "components/reports/CommissionReportWorkspace.tsx"),
    "utf8",
  );
  assert.doesNotMatch(administration, /Reporte de comisiones/);
  assert.match(administration, /Configurar esquemas|Nueva comisión/);
  assert.match(administration, /Listado de esquemas de comisión/);
  assert.match(administration, /MEMBERSHIP_SALES/);
  assert.match(administration, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(administration, /Guardar esquema/);
  assert.match(report, /Reporte de comisiones/);
  assert.match(report, /href="\/administracion\?section=commissions"/);
  assert.match(report, /Periodo de corte/);
  assert.match(report, /Cerrar periodo/);
});

test("shows the POS ticket without duplicating attendance and purchase rows", () => {
  const source = readFileSync(
    path.join(sourceRoot, "components/scheduler/SchedulerAgendaGrid.tsx"),
    "utf8",
  );
  const tooltip = source.slice(
    source.indexOf("function SchedulerAppointmentTooltipCard"),
    source.indexOf("interface SchedulerAppointmentSummaryProps"),
  );
  const ticketPreview = readFileSync(
    path.join(sourceRoot, "components/scheduler/SchedulerPosTicketPreview.tsx"),
    "utf8",
  );
  assert.match(tooltip, /SchedulerPosTicketPreview/);
  assert.match(
    ticketPreview,
    /Vista del comprobante emitido por Punto de Venta/,
  );
  assert.match(ticketPreview, /DESCRIPCIÓN/);
  assert.match(ticketPreview, /TOTAL/);
  assert.match(ticketPreview, /Sólo lectura/);
  assert.match(ticketPreview, /hideCloseButton/);
  assert.match(
    ticketPreview,
    /onEscapeKeyDown=\{\(event\) => event\.preventDefault\(\)\}/,
  );
  assert.match(
    ticketPreview,
    /onInteractOutside=\{\(event\) => event\.preventDefault\(\)\}/,
  );
  assert.match(
    ticketPreview,
    /aria-label=\{`Cerrar ticket \$\{ticket\.folio\}`\}/,
  );
  assert.doesNotMatch(ticketPreview, /DialogFooter/);
  assert.doesNotMatch(tooltip, /<dt>Estado<\/dt>/);
  assert.doesNotMatch(tooltip, /<dt>Resultado<\/dt>/);
});

test("exposes notification rules, delivery traceability and reminder attribution", () => {
  const source = readFileSync(
    path.join(
      sourceRoot,
      "components/administration/RestoredCommunicationsSection.tsx",
    ),
    "utf8",
  );
  assert.match(source, /Centro de notificaciones/);
  assert.match(source, /Automatización conectada a cada cita/);
  assert.match(source, /schedulerApi\.notificationRules\(\)/);
  assert.match(source, /schedulerApi\.notificationSummary\(\)/);
  assert.match(source, /Cita vinculada/);
  assert.match(source, /Confirmadas por recordatorio/);
  assert.match(source, /Acciones seguras disponibles para la clienta/);
  assert.match(source, /schedulerApi\.retryMessage/);
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
