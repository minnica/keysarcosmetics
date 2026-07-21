'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CategoriaAtencion } from '@cosmetics/types'
import { api } from '@/lib/api'

export type AttentionCategory = CategoriaAtencion & {
  subcategorias: Array<{ id: string; nombre: string; activa: boolean; categoriaId: string }>
}

function message(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}

export function useAttentionServices() {
  const [categories, setCategories] = useState<AttentionCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<{ success: boolean; data: AttentionCategory[] }>('/api/envelope/servicios')
      setCategories(response.data.data)
      setLoaded(true)
    } catch (loadError) {
      setError(message(loadError, 'No se pudieron cargar los servicios'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  const addCategory = useCallback(async (nombre: string) => {
    try {
      await api.post('/api/envelope/servicios/categorias', { nombre })
      await refetch()
    } catch (saveError) { throw new Error(message(saveError, 'No se pudo crear la categoría')) }
  }, [refetch])

  const addSubcategory = useCallback(async (categoriaId: string, nombre: string) => {
    try {
      await api.post('/api/envelope/servicios/subcategorias', { categoriaId, nombre })
      await refetch()
    } catch (saveError) { throw new Error(message(saveError, 'No se pudo crear el servicio')) }
  }, [refetch])

  const deactivateCategory = useCallback(async (id: string) => {
    try { await api.delete(`/api/envelope/servicios/categorias/${id}`); await refetch() }
    catch (deleteError) { throw new Error(message(deleteError, 'No se pudo desactivar la categoría')) }
  }, [refetch])

  const deactivateSubcategory = useCallback(async (id: string) => {
    try { await api.delete(`/api/envelope/servicios/subcategorias/${id}`); await refetch() }
    catch (deleteError) { throw new Error(message(deleteError, 'No se pudo desactivar el servicio')) }
  }, [refetch])

  return { categories, loading, loaded, error, addCategory, addSubcategory, deactivateCategory, deactivateSubcategory }
}
