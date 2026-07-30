"use client";
import { MovementCatalogPage } from "@/components/payroll/movement-catalog-page";
export default function BonosPage() {
  return (
    <MovementCatalogPage
      kind="BONUS"
      singular="Bono"
      plural="Bonos"
      description="Conceptos positivos disponibles para movimientos."
      tone="sage"
    />
  );
}
