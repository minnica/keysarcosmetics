'use client'

import { createContext, useContext, useState } from 'react'
import {
  bonusTemplates,
  fineTemplates,
  initialExpenses,
  perDiemTemplates,
  type PayrollBonus,
  type PayrollCatalogItem,
  type PayrollExpense,
} from '@/lib/mock-data'
import { normalizeUppercase } from '@/lib/format'

type PayrollMockContextValue = {
  bonuses: PayrollBonus[]
  fines: PayrollCatalogItem[]
  perDiems: PayrollCatalogItem[]
  expenses: PayrollExpense[]
  upsertBonus: (bonus: Omit<PayrollBonus, 'id'> & { id?: string }) => void
  removeBonus: (bonusId: string) => void
  upsertFine: (fine: Omit<PayrollCatalogItem, 'id'> & { id?: string }) => void
  removeFine: (fineId: string) => void
  upsertPerDiem: (perDiem: Omit<PayrollCatalogItem, 'id'> & { id?: string }) => void
  removePerDiem: (perDiemId: string) => void
  addExpense: (expense: Omit<PayrollExpense, 'id'>) => void
  removeExpense: (expenseId: string) => void
}

const PayrollMockContext = createContext<PayrollMockContextValue | null>(null)

function createCatalogItem(prefix: string, item: Omit<PayrollCatalogItem, 'id'> & { id?: string }): PayrollCatalogItem {
  return {
    id: item.id ?? `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
    name: normalizeUppercase(item.name),
    amount: item.amount,
    notes: normalizeUppercase(item.notes),
  }
}

function normalizeExpense(expense: PayrollExpense): PayrollExpense {
  return {
    ...expense,
    concept: normalizeUppercase(expense.concept),
    category: normalizeUppercase(expense.category),
    branch: normalizeUppercase(expense.branch),
    notes: normalizeUppercase(expense.notes),
  }
}

export function PayrollMockProvider({ children }: { children: React.ReactNode }) {
  const [bonuses, setBonuses] = useState<PayrollBonus[]>(() => bonusTemplates.map((item) => createCatalogItem('bonus', item)))
  const [fines, setFines] = useState<PayrollCatalogItem[]>(() => fineTemplates.map((item) => createCatalogItem('fine', item)))
  const [perDiems, setPerDiems] = useState<PayrollCatalogItem[]>(() => perDiemTemplates.map((item) => createCatalogItem('per-diem', item)))
  const [expenses, setExpenses] = useState<PayrollExpense[]>(() => initialExpenses.map(normalizeExpense))

  const upsertBonus = (bonus: Omit<PayrollBonus, 'id'> & { id?: string }) => {
    const nextBonus: PayrollBonus = {
      id: bonus.id ?? `bonus-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
      name: normalizeUppercase(bonus.name),
      amount: bonus.amount,
      notes: normalizeUppercase(bonus.notes),
    }

    setBonuses((current) => {
      const exists = current.some((item) => item.id === nextBonus.id)
      return exists ? current.map((item) => (item.id === nextBonus.id ? nextBonus : item)) : [nextBonus, ...current]
    })
  }

  const removeBonus = (bonusId: string) => {
    setBonuses((current) => current.filter((item) => item.id !== bonusId))
  }

  const upsertFine = (fine: Omit<PayrollCatalogItem, 'id'> & { id?: string }) => {
    const nextFine = createCatalogItem('fine', fine)
    setFines((current) => current.some((item) => item.id === nextFine.id)
      ? current.map((item) => (item.id === nextFine.id ? nextFine : item))
      : [nextFine, ...current])
  }

  const removeFine = (fineId: string) => {
    setFines((current) => current.filter((item) => item.id !== fineId))
  }

  const upsertPerDiem = (perDiem: Omit<PayrollCatalogItem, 'id'> & { id?: string }) => {
    const nextPerDiem = createCatalogItem('per-diem', perDiem)
    setPerDiems((current) => current.some((item) => item.id === nextPerDiem.id)
      ? current.map((item) => (item.id === nextPerDiem.id ? nextPerDiem : item))
      : [nextPerDiem, ...current])
  }

  const removePerDiem = (perDiemId: string) => {
    setPerDiems((current) => current.filter((item) => item.id !== perDiemId))
  }

  const addExpense = (expense: Omit<PayrollExpense, 'id'>) => {
    setExpenses((current) => [normalizeExpense({
      ...expense,
      id: `expense-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
    }), ...current])
  }

  const removeExpense = (expenseId: string) => {
    setExpenses((current) => current.filter((item) => item.id !== expenseId))
  }

  return (
    <PayrollMockContext.Provider value={{
      bonuses,
      fines,
      perDiems,
      expenses,
      upsertBonus,
      removeBonus,
      upsertFine,
      removeFine,
      upsertPerDiem,
      removePerDiem,
      addExpense,
      removeExpense,
    }}>
      {children}
    </PayrollMockContext.Provider>
  )
}

export function usePayrollMockData() {
  const context = useContext(PayrollMockContext)

  if (!context) {
    throw new Error('usePayrollMockData must be used within PayrollMockProvider')
  }

  return context
}

export const useBonusCatalog = usePayrollMockData
