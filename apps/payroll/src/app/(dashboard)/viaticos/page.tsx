'use client'

import { MovementCatalogPage } from '@/components/payroll/movement-catalog-page'
import { usePayrollMockData } from '@/components/payroll/bonus-catalog-context'

export default function ViaticosPage() {
  const { perDiems, upsertPerDiem, removePerDiem } = usePayrollMockData()
  return <MovementCatalogPage items={perDiems} singular="Viático" plural="Viáticos" description="Apoyos de traslado y alimentos reutilizables." tone="sage" upsertItem={upsertPerDiem} removeItem={removePerDiem} />
}
