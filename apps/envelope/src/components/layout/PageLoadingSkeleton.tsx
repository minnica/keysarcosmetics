'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { Skeleton, cn } from '@cosmetics/ui'

function ContentSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn(
        'bg-[rgba(195,165,131,0.18)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] dark:bg-[rgba(243,240,233,0.08)]',
        className,
      )}
      {...props}
    />
  )
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn('overflow-hidden rounded-lg border shadow-sm', className)}
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {children}
    </section>
  )
}

export function PageLoadingSkeleton() {
  return (
    <div
      className="mx-auto min-h-[calc(100vh-7rem)] w-full max-w-[1480px] space-y-5"
      role="status"
      aria-live="polite"
      aria-label="Cargando contenido"
    >
      <span className="sr-only">Cargando contenido...</span>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <ContentSkeleton className="h-8 w-52 max-w-full rounded-[7px]" />
          <ContentSkeleton className="h-3 w-72 max-w-full rounded-full opacity-70" />
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <ContentSkeleton className="h-9 w-full rounded-lg sm:w-40" />
          <ContentSkeleton className="h-9 w-full rounded-lg sm:w-28" />
        </div>
      </div>

      <Panel>
        <div className="h-1 bg-gradient-to-r from-[var(--color-gold)] via-[var(--color-green-sage)] to-[var(--color-blue-soft)]" />
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="space-y-5">
            <div className="space-y-3">
              <ContentSkeleton className="h-3 w-24 rounded-full opacity-70" />
              <ContentSkeleton className="h-10 w-48 max-w-full rounded-[7px]" />
              <ContentSkeleton className="h-3 w-64 max-w-full rounded-full opacity-60" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[72, 56, 84].map((width, index) => (
                <div key={index} className="space-y-2 rounded-lg border p-3" style={{ borderColor: 'var(--border-color)' }}>
                  <ContentSkeleton className="h-2.5 w-16 rounded-full opacity-60" />
                  <ContentSkeleton className="h-6 w-24 rounded-[6px]" />
                  <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(195,165,131,0.12)] dark:bg-[rgba(243,240,233,0.06)]">
                    <ContentSkeleton className="h-full rounded-full" style={{ width: `${width}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-3">
                <ContentSkeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <ContentSkeleton className="h-2.5 w-20 rounded-full opacity-60" />
                  <ContentSkeleton className="h-4 w-full max-w-44 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel>
          <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--border-color)' }}>
            <div className="space-y-2">
              <ContentSkeleton className="h-4 w-36 rounded-full" />
              <ContentSkeleton className="h-3 w-56 max-w-full rounded-full opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <ContentSkeleton className="h-8 rounded-lg sm:w-28" />
              <ContentSkeleton className="h-8 rounded-lg sm:w-28" />
              <ContentSkeleton className="col-span-2 h-8 rounded-lg sm:w-10" />
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
              <ContentSkeleton className="h-9 rounded-lg" />
              <ContentSkeleton className="h-9 rounded-lg" />
              <ContentSkeleton className="h-9 rounded-lg" />
            </div>

            <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
              <div className="grid grid-cols-[minmax(9rem,1.4fr)_minmax(6rem,0.9fr)_minmax(5rem,0.7fr)_4rem] gap-4 px-4 py-3" style={{ backgroundColor: 'var(--table-row-alt)' }}>
                {[0, 1, 2, 3].map((index) => (
                  <ContentSkeleton key={index} className="h-2.5 rounded-full opacity-65" />
                ))}
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {[92, 76, 84, 68, 88].map((width, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-[minmax(9rem,1.4fr)_minmax(6rem,0.9fr)_minmax(5rem,0.7fr)_4rem] items-center gap-4 px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <ContentSkeleton className="h-8 w-8 shrink-0 rounded-lg opacity-80" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <ContentSkeleton className="h-3 rounded-full" style={{ width: `${width}%` }} />
                        <ContentSkeleton className="h-2.5 w-24 rounded-full opacity-55" />
                      </div>
                    </div>
                    <ContentSkeleton className="h-3 w-24 max-w-full rounded-full opacity-70" />
                    <ContentSkeleton className="h-6 w-16 rounded-full opacity-75" />
                    <ContentSkeleton className="h-7 w-7 justify-self-end rounded-md opacity-70" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
          <Panel className="p-4">
            <div className="mb-5 flex items-center justify-between gap-4">
              <ContentSkeleton className="h-4 w-28 rounded-full" />
              <ContentSkeleton className="h-8 w-20 rounded-lg" />
            </div>
            <div className="flex h-40 items-end gap-2">
              {[42, 68, 56, 82, 64, 74, 50].map((height, index) => (
                <ContentSkeleton key={index} className="w-full rounded-t-md" style={{ height: `${height}%` }} />
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="mb-5 space-y-2">
              <ContentSkeleton className="h-4 w-32 rounded-full" />
              <ContentSkeleton className="h-3 w-44 rounded-full opacity-60" />
            </div>
            <div className="space-y-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex items-center gap-3">
                  <ContentSkeleton className="h-9 w-9 shrink-0 rounded-lg opacity-80" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <ContentSkeleton className="h-3 w-full rounded-full" />
                    <ContentSkeleton className="h-2.5 w-3/5 rounded-full opacity-55" />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
