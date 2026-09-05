"use client";

import { useSearchParams } from "next/navigation";
import { useSchedulerSession } from "@/lib/session";
import { AdministrationWorkspace } from "./AdministrationWorkspace";
import { OperationalCatalogWorkspace } from "./OperationalCatalogWorkspace";

const operationalSections = [
  "locals",
  "professionals",
  "services",
  "resources",
] as const;
type OperationalSection = (typeof operationalSections)[number];

function isOperationalSection(value: string): value is OperationalSection {
  return operationalSections.some((candidate) => candidate === value);
}

export function AdministrationEntry() {
  const searchParams = useSearchParams();
  const { bootstrap } = useSchedulerSession();
  const section = searchParams.get("section") ?? "locals";

  if (bootstrap?.mockModeEnabled) return <AdministrationWorkspace />;
  if (isOperationalSection(section)) {
    return <OperationalCatalogWorkspace section={section} />;
  }
  return null;
}
