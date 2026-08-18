"use client";

import { MovementCatalogPage } from "@/components/payroll/movement-catalog-page";

export default function ViaticosPage() {
  return (
    <MovementCatalogPage
      kind="PER_DIEM"
      singular="Viático"
      plural="Viáticos"
      description="Apoyos de traslado y alimentos reutilizables."
      tone="sage"
    />
  );
}
