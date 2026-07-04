'use client'

import { createContext, useContext, useState } from 'react'
import { bonusTemplates, type PayrollBonus } from '@/lib/mock-data'

type BonusCatalogContextValue = {
  bonuses: PayrollBonus[]
  upsertBonus: (bonus: Omit<PayrollBonus, 'id'> & { id?: string }) => void
  removeBonus: (bonusId: string) => void
}

const BonusCatalogContext = createContext<BonusCatalogContextValue | null>(null)

export function BonusCatalogProvider({ children }: { children: React.ReactNode }) {
  const [bonuses, setBonuses] = useState<PayrollBonus[]>(bonusTemplates)

  const upsertBonus = (bonus: Omit<PayrollBonus, 'id'> & { id?: string }) => {
    const nextBonus: PayrollBonus = {
      id: bonus.id ?? `bonus-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
      name: bonus.name,
      amount: bonus.amount,
      notes: bonus.notes,
    }

    setBonuses((current) => {
      const exists = current.some((item) => item.id === nextBonus.id)
      return exists ? current.map((item) => (item.id === nextBonus.id ? nextBonus : item)) : [nextBonus, ...current]
    })
  }

  const removeBonus = (bonusId: string) => {
    setBonuses((current) => current.filter((item) => item.id !== bonusId))
  }

  return (
    <BonusCatalogContext.Provider value={{ bonuses, upsertBonus, removeBonus }}>
      {children}
    </BonusCatalogContext.Provider>
  )
}

export function useBonusCatalog() {
  const context = useContext(BonusCatalogContext)

  if (!context) {
    throw new Error('useBonusCatalog must be used within BonusCatalogProvider')
  }

  return context
}
