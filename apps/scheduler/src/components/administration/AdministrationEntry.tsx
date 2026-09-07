"use client";

import { useSearchParams } from "next/navigation";
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
  const section = searchParams.get("section") ?? "locals";

  if (isOperationalSection(section)) {
    return <OperationalCatalogWorkspace section={section} />;
  }
  return null;
}
