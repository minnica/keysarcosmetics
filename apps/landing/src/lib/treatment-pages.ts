import { treatmentGroups } from "@/data/treatments";
import { notFound } from "next/navigation";

export function getCategory(key: string) {
  const group = treatmentGroups.find((item) => item.key === key);
  if (!group) notFound();
  return group;
}

export function getTreatment(category: string, slug: string) {
  const group = getCategory(category);
  const treatment = group.treatments.find((item) => item.slug === slug);
  if (!treatment) notFound();
  return { group, treatment };
}
