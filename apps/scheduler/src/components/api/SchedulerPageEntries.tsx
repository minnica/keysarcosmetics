"use client";

import dynamic from "next/dynamic";

function SchedulerEntryFallback() {
  return (
    <main
      aria-label="Cargando módulo"
      className="min-h-[50dvh] space-y-5 bg-[var(--bg-primary)] px-5 py-8 sm:px-7 lg:px-10"
    >
      <div
        aria-hidden="true"
        className="h-10 w-64 max-w-full animate-pulse rounded-xl bg-slate-200/75 motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="h-24 w-full animate-pulse rounded-2xl bg-slate-200/75 motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="h-64 w-full animate-pulse rounded-2xl bg-slate-200/75 motion-reduce:animate-none"
      />
    </main>
  );
}

const ApiAgendaWorkspace = dynamic(
  () =>
    import("./ApiAgendaWorkspace").then((module) => module.ApiAgendaWorkspace),
  { loading: SchedulerEntryFallback },
);
const ApiAdministrationWorkspace = dynamic(
  () =>
    import("./ApiAdministrationWorkspace").then(
      (module) => module.ApiAdministrationWorkspace,
    ),
  { loading: SchedulerEntryFallback },
);
const ApiClientsWorkspace = dynamic(
  () =>
    import("./ApiClientsWorkspace").then(
      (module) => module.ApiClientsWorkspace,
    ),
  { loading: SchedulerEntryFallback },
);
const ApiReportsWorkspace = dynamic(
  () =>
    import("./ApiReportsWorkspace").then(
      (module) => module.ApiReportsWorkspace,
    ),
  { loading: SchedulerEntryFallback },
);
const ApiSettingsWorkspace = dynamic(
  () =>
    import("./ApiSettingsWorkspace").then(
      (module) => module.ApiSettingsWorkspace,
    ),
  { loading: SchedulerEntryFallback },
);

// RV1 keeps one explicit production entry per module. Restored presentation
// replaces these entries only after its API adapter is ready; fixtures never do.
export function SchedulerAgendaEntry() {
  return <ApiAgendaWorkspace />;
}

export function SchedulerClientsEntry() {
  return <ApiClientsWorkspace />;
}

export function SchedulerAdministrationEntry() {
  return <ApiAdministrationWorkspace />;
}

export function SchedulerSettingsEntry() {
  return <ApiSettingsWorkspace />;
}

export function SchedulerReportsEntry({
  view = "summary",
}: {
  view?: "summary" | "sales";
}) {
  return <ApiReportsWorkspace view={view} />;
}

export function SchedulerReservationReportsEntry({
  view = "reservations",
  fixedBranchId,
}: {
  view?:
    | "reservations"
    | "history"
    | "performance"
    | "locations"
    | "messaging"
    | "metrics"
    | "services"
    | "services-by-location"
    | "providers-by-location";
  fixedBranchId?: string;
}) {
  return (
    <ApiReportsWorkspace
      view={view}
      {...(fixedBranchId ? { fixedBranchId } : {})}
    />
  );
}

export function SchedulerClientSectionEntry({
  section,
}: {
  section: "reporte-de-encuestas" | "recordatorios";
}) {
  return (
    <ApiReportsWorkspace
      view={section === "reporte-de-encuestas" ? "surveys" : "reminders"}
    />
  );
}
