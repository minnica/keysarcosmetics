"use client";

import { MovementCatalogPage } from "@/components/payroll/movement-catalog-page";

export default function MultasPage() {
  return (
    <MovementCatalogPage
      kind="FINE"
      singular="Multa"
      plural="Multas"
      createLabel="Nueva multa"
      description="Conceptos de descuento listos para movimientos."
      tone="rose"
    />
  );
}
