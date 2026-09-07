"use client";

import { useSearchParams } from "next/navigation";
import { OperationalCatalogWorkspace } from "@/components/administration/OperationalCatalogWorkspace";
import { RestoredCommunicationsSection } from "@/components/administration/RestoredCommunicationsSection";
import { RestoredConsentsSection } from "@/components/administration/RestoredConsentsSection";
import {
  RestoredCommissionsSection,
  RestoredGiftCardsSection,
  RestoredServiceExtensions,
  RestoredStatusColorsSection,
} from "@/components/administration/RestoredAdministrationSections";
import { RestoredSurveysSection } from "@/components/administration/RestoredSurveysSection";

const operationalSections = [
  "locals",
  "professionals",
  "services",
  "resources",
] as const;
type OperationalSection = (typeof operationalSections)[number];

function isOperationalSection(value: string): value is OperationalSection {
  return operationalSections.some((section) => section === value);
}

export function ApiAdministrationWorkspace() {
  const section = useSearchParams().get("section") ?? "locals";
  if (isOperationalSection(section)) {
    return (
      <>
        <OperationalCatalogWorkspace section={section} />
        {section === "services" ? <RestoredServiceExtensions /> : null}
      </>
    );
  }
  if (section === "commissions") return <RestoredCommissionsSection />;
  if (section === "surveys") return <RestoredSurveysSection />;
  if (section === "consents") return <RestoredConsentsSection />;
  if (section === "whatsapp") return <RestoredCommunicationsSection />;
  if (section === "gift-cards") return <RestoredGiftCardsSection />;
  if (section === "status-colors") return <RestoredStatusColorsSection />;
  return <OperationalCatalogWorkspace section="locals" />;
}
