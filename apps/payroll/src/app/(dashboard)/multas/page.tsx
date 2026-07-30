'use client'

import { MovementCatalogPage } from '@/components/payroll/movement-catalog-page'
import { usePayrollMockData } from '@/components/payroll/bonus-catalog-context'

export default function MultasPage() {
  const { fines, upsertFine, removeFine } = usePayrollMockData()
  return <MovementCatalogPage items={fines} singular="Multa" plural="Multas" createLabel="Nueva multa" description="Conceptos de descuento listos para movimientos." tone="rose" upsertItem={upsertFine} removeItem={removeFine} />
}
