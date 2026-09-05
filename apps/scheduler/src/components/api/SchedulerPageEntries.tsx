"use client";

import dynamic from "next/dynamic";
import { useSchedulerSession } from "@/lib/session";
import { ApiAgendaWorkspace } from "./ApiAgendaWorkspace";
import { ApiAdministrationWorkspace } from "./ApiAdministrationWorkspace";
import { ApiClientsWorkspace } from "./ApiClientsWorkspace";
import { ApiReportsWorkspace } from "./ApiReportsWorkspace";
import { ApiSettingsWorkspace } from "./ApiSettingsWorkspace";

const MockAgendaWorkspace = dynamic(
  () => import("@/components/SchedulerWorkspace").then((module) => module.SchedulerWorkspace),
  { ssr: false },
);
const MockAdministrationWorkspace = dynamic(
  () => import("@/components/administration/AdministrationWorkspace").then((module) => module.AdministrationWorkspace),
  { ssr: false },
);
const MockClientsWorkspace = dynamic(
  () => import("@/components/clients/ClientsWorkspace").then((module) => module.ClientsWorkspace),
  { ssr: false },
);
const MockReportsWorkspace = dynamic(
  () => import("@/components/reports/ReportsWorkspace").then((module) => module.ReportsWorkspace),
  { ssr: false },
);
const MockReservationReportWorkspace = dynamic(
  () => import("@/components/reports/ReservationReportWorkspace").then((module) => module.ReservationReportWorkspace),
  { ssr: false },
);
const MockSettingsWorkspace = dynamic(
  () => import("@/components/settings/SettingsWorkspace").then((module) => module.SettingsWorkspace),
  { ssr: false },
);
const MockSurveyReportWorkspace = dynamic(
  () => import("@/components/clients/SurveyReportWorkspace").then((module) => module.SurveyReportWorkspace),
  { ssr: false },
);
const MockRemindersWorkspace = dynamic(
  () => import("@/components/clients/RemindersWorkspace").then((module) => module.RemindersWorkspace),
  { ssr: false },
);

export function SchedulerAgendaEntry() {
  const { bootstrap } = useSchedulerSession();
  return bootstrap?.mockModeEnabled ? <MockAgendaWorkspace /> : <ApiAgendaWorkspace />;
}

export function SchedulerClientsEntry() {
  const { bootstrap } = useSchedulerSession();
  return bootstrap?.mockModeEnabled ? <MockClientsWorkspace /> : <ApiClientsWorkspace />;
}

export function SchedulerAdministrationEntry() {
  const { bootstrap } = useSchedulerSession();
  if (bootstrap?.mockModeEnabled) return <MockAdministrationWorkspace />;
  return <ApiAdministrationWorkspace />;
}

export function SchedulerSettingsEntry() {
  const { bootstrap } = useSchedulerSession();
  return bootstrap?.mockModeEnabled ? <MockSettingsWorkspace /> : <ApiSettingsWorkspace />;
}

export function SchedulerReportsEntry({
  initialKey = "APPOINTMENTS",
}: {
  initialKey?: "APPOINTMENTS" | "SALES";
}) {
  const { bootstrap } = useSchedulerSession();
  return bootstrap?.mockModeEnabled ? <MockReportsWorkspace /> : <ApiReportsWorkspace initialKey={initialKey} />;
}

export function SchedulerReservationReportsEntry({
  view,
}: {
  view?: "history" | "performance";
}) {
  const { bootstrap } = useSchedulerSession();
  if (bootstrap?.mockModeEnabled) {
    return view ? <MockReservationReportWorkspace view={view} /> : <MockReservationReportWorkspace />;
  }
  return (
    <ApiReportsWorkspace
      compactTitle={view === "performance" ? "Rendimiento de reservas" : "Reporte de reservas"}
      initialKey={view === "performance" ? "PROFESSIONALS" : "APPOINTMENTS"}
    />
  );
}

export function SchedulerClientSectionEntry({
  section,
}: {
  section: "reporte-de-encuestas" | "recordatorios";
}) {
  const { bootstrap } = useSchedulerSession();
  if (bootstrap?.mockModeEnabled) {
    return section === "reporte-de-encuestas" ? <MockSurveyReportWorkspace /> : <MockRemindersWorkspace />;
  }
  return (
    <ApiReportsWorkspace
      compactTitle={section === "reporte-de-encuestas" ? "Reporte de encuestas" : "Recordatorios"}
      initialKey={section === "reporte-de-encuestas" ? "SURVEYS" : "COMMUNICATIONS"}
    />
  );
}
