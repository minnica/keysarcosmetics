'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Skeleton, cn } from '@cosmetics/ui'

type TableLoadingSkeletonProps = {
  columns?: number
  rows?: number
  showFilters?: boolean
  className?: string
  label?: string
}

function ContentSkeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <Skeleton
      className={cn(
        'bg-[rgba(195,165,131,0.18)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] dark:bg-[rgba(243,240,233,0.08)]',
        className,
      )}
      style={style}
    />
  )
}

function Panel({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn('overflow-hidden rounded-xl border', className)}
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--card-shadow)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function TableLoadingSkeleton({
  columns = 4,
  rows = 5,
  showFilters = false,
  className,
  label = 'Cargando datos',
}: TableLoadingSkeletonProps) {
  const safeColumns = Math.max(2, columns)
  const rowTemplate = [
    'minmax(10rem,1.4fr)',
    ...Array.from({ length: safeColumns - 2 }, () => 'minmax(6rem,0.8fr)'),
    'minmax(4rem,0.45fr)',
  ].join(' ')

  return (
    <div className={cn('space-y-3', className)} role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}...</span>

      {showFilters ? (
        <Panel className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <ContentSkeleton className="h-4 w-28 rounded-full" />
            <ContentSkeleton className="h-8 w-32 rounded-lg" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-2">
                <ContentSkeleton className="h-3 w-24 rounded-full opacity-70" />
                <ContentSkeleton className="h-10 rounded-lg" />
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="flex items-center gap-3">
        <ContentSkeleton className="h-10 flex-1 rounded-lg" />
        <ContentSkeleton className="hidden h-5 w-20 rounded-full sm:block" />
        <ContentSkeleton className="h-9 w-24 shrink-0 rounded-lg" />
      </div>

      <Panel>
        <div
          className="grid gap-4 px-4 py-3"
          style={{
            gridTemplateColumns: rowTemplate,
            backgroundColor: 'var(--table-row-alt)',
          }}
        >
          {Array.from({ length: safeColumns }).map((_, index) => (
            <ContentSkeleton key={index} className="h-3 rounded-full opacity-65" />
          ))}
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid items-center gap-4 px-4 py-4"
              style={{ gridTemplateColumns: rowTemplate }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <ContentSkeleton className="h-8 w-8 shrink-0 rounded-lg opacity-80" />
                <div className="min-w-0 flex-1 space-y-2">
                  <ContentSkeleton className="h-3 rounded-full" style={{ width: `${92 - (rowIndex % 4) * 8}%` }} />
                  <ContentSkeleton className="h-2.5 w-24 rounded-full opacity-55" />
                </div>
              </div>
              {Array.from({ length: safeColumns - 1 }).map((_, colIndex) => (
                <ContentSkeleton
                  key={colIndex}
                  className={cn('h-3 rounded-full opacity-70', colIndex === safeColumns - 2 ? 'justify-self-end' : '')}
                  style={{ width: colIndex === safeColumns - 2 ? 34 : 96 }}
                />
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex items-center justify-between">
        <ContentSkeleton className="h-3 w-28 rounded-full opacity-60" />
        <div className="flex items-center gap-2">
          <ContentSkeleton className="h-7 w-7 rounded-md opacity-70" />
          <ContentSkeleton className="h-3 w-10 rounded-full opacity-60" />
          <ContentSkeleton className="h-7 w-7 rounded-md opacity-70" />
        </div>
      </div>
    </div>
  )
}

export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-live="polite" aria-label="Cargando dashboard">
      <span className="sr-only">Cargando dashboard...</span>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <ContentSkeleton className="h-8 w-44 max-w-full rounded-[7px]" />
          <ContentSkeleton className="h-3 w-72 max-w-full rounded-full opacity-70" />
        </div>
        <div className="space-y-2">
          <ContentSkeleton className="h-3 w-28 rounded-full opacity-70" />
          <ContentSkeleton className="h-10 w-44 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {['var(--color-gold)', 'var(--color-green-sage)', 'var(--color-blue-soft)'].map((accent, cardIndex) => (
          <Panel key={accent} className="border-t-[3px]" style={{ borderTopColor: accent }}>
            <div className="space-y-4 p-5">
              <ContentSkeleton className="h-3 w-28 rounded-full opacity-70" />
              {[0, 1, 2].map((rowIndex) => (
                <div key={rowIndex} className="flex items-center justify-between gap-4">
                  <ContentSkeleton className="h-3 rounded-full opacity-65" style={{ width: 92 + rowIndex * 12 }} />
                  <ContentSkeleton className="h-4 w-24 rounded-full" />
                </div>
              ))}
              <div className="flex items-end justify-between border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
                <ContentSkeleton className="h-3 w-16 rounded-full opacity-70" />
                <ContentSkeleton className="h-7 w-28 rounded-[7px]" />
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <section className="space-y-3">
        <ContentSkeleton className="h-3 w-52 rounded-full opacity-75" />
        <Panel className="p-6">
          <div className="flex h-[280px] items-end gap-3">
            {[52, 78, 64, 88, 58, 74, 46, 82, 68, 72, 55, 80].map((height, index) => (
              <ContentSkeleton key={index} className="w-full rounded-t-md" style={{ height: `${height}%` }} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="space-y-3">
        <ContentSkeleton className="h-3 w-56 rounded-full opacity-75" />
        <Panel className="space-y-4 p-6">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="grid grid-cols-[9rem_minmax(0,1fr)_4rem] items-center gap-4">
              <ContentSkeleton className="h-3 rounded-full opacity-65" />
              <ContentSkeleton className="h-5 rounded-full" style={{ width: `${88 - index * 10}%` }} />
              <ContentSkeleton className="h-3 rounded-full opacity-65" />
            </div>
          ))}
        </Panel>
      </section>
    </div>
  )
}

export function RankingLoadingSkeleton({ label = 'Cargando ranking' }: { label?: string }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.125fr)_minmax(0,1fr)_minmax(0,0.875fr)] lg:items-stretch">
        {[0, 1, 2].map((index) => (
          <Panel
            key={index}
            className={
              index === 0
                ? 'lg:min-h-72'
                : index === 1
                  ? 'lg:mt-8 lg:min-h-64'
                  : 'lg:mt-16 lg:min-h-56'
            }
          >
            <div className="space-y-5 p-5">
              <div className="flex items-center justify-between">
                <ContentSkeleton className="h-10 w-10 rounded-lg" />
                <ContentSkeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="space-y-3">
                <ContentSkeleton className="h-5 w-3/4" />
                <ContentSkeleton className="h-8 w-2/3" />
              </div>
              <ContentSkeleton className="h-2 w-full rounded-full" />
              <div className="flex gap-4">
                <ContentSkeleton className="h-3 w-24" />
                <ContentSkeleton className="h-3 w-20" />
              </div>
            </div>
          </Panel>
        ))}
      </div>
      <Panel>
        <div className="divide-y divide-[var(--border-color)]">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="flex items-center gap-4 p-4">
              <ContentSkeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <ContentSkeleton className="h-4 w-2/5" />
                <ContentSkeleton className="h-2 w-full rounded-full" />
              </div>
              <ContentSkeleton className="h-5 w-28 shrink-0" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

export function AccessLoadingSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]" role="status" aria-live="polite" aria-label="Cargando accesos">
      <span className="sr-only">Cargando accesos...</span>
      <Panel className="p-6">
        <div className="mb-6 space-y-2">
          <ContentSkeleton className="h-5 w-44 rounded-full" />
          <ContentSkeleton className="h-3 w-72 max-w-full rounded-full opacity-65" />
        </div>
        <div className="mb-5 rounded-lg border p-4" style={{ borderColor: 'var(--border-color)' }}>
          <ContentSkeleton className="h-4 w-56 rounded-full" />
          <ContentSkeleton className="mt-3 h-3 w-80 max-w-full rounded-full opacity-60" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <ContentSkeleton key={index} className="h-12 rounded-xl" />
          ))}
        </div>
      </Panel>
      <Panel className="p-6">
        <div className="mb-6 space-y-2">
          <ContentSkeleton className="h-5 w-40 rounded-full" />
          <ContentSkeleton className="h-3 w-64 max-w-full rounded-full opacity-65" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center gap-3">
              <ContentSkeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <ContentSkeleton className="h-3 w-3/4 rounded-full" />
                <ContentSkeleton className="h-2.5 w-1/2 rounded-full opacity-60" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
