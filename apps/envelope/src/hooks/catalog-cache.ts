'use client'

import { useEffect, useState } from 'react'

type CatalogSnapshot<T> = {
  items: T[]
  loading: boolean
  loaded: boolean
  error: string | null
}

type CatalogStore<T> = CatalogSnapshot<T> & {
  refetch: () => Promise<void>
}

type Listener = () => void

export function createCatalogStore<T>(
  load: () => Promise<T[]>,
  errorMessage: string,
) {
  let items: T[] = []
  let loaded = false
  let loading = false
  let error: string | null = null
  let inflight: Promise<void> | null = null
  const listeners = new Set<Listener>()

  function snapshot(): CatalogSnapshot<T> {
    return {
      items,
      loading: loading || (!loaded && error === null),
      loaded,
      error,
    }
  }

  function emit() {
    listeners.forEach((listener) => listener())
  }

  async function refetch(): Promise<void> {
    if (inflight) return inflight

    loading = true
    error = null
    emit()

    inflight = load()
      .then((data) => {
        items = data
        loaded = true
      })
      .catch(() => {
        error = errorMessage
      })
      .finally(() => {
        loading = false
        inflight = null
        emit()
      })

    return inflight
  }

  function useStore(): CatalogStore<T> {
    const [state, setState] = useState<CatalogSnapshot<T>>(snapshot)

    useEffect(() => {
      const listener = () => setState(snapshot())
      listeners.add(listener)

      if (!loaded && !inflight) {
        void refetch()
      }

      listener()

      return () => {
        listeners.delete(listener)
      }
    }, [])

    return { ...state, refetch }
  }

  return { useStore, refetch }
}
