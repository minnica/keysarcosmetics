'use client'

import { Button, Popover, PopoverContent, PopoverTrigger } from '@cosmetics/ui'
import {
  ArrowLeft,
  ArrowRight,
  ChevronsLeftRight,
  CircleHelp,
  Copy,
  Filter,
  MapPinned,
  Plus,
  RefreshCcw,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { schedulerLegendItems, type SchedulerView } from '@/lib/mock-scheduler-data'
import { getLegendIcon } from './scheduler-utils'

interface SchedulerHeaderProps {
  currentView: SchedulerView
  onViewChange: (view: SchedulerView) => void
  selectedDate: Date
  weekDays: Date[]
  selectedCommerceName: string
  selectedBranchName: string
  onDateStep: (direction: 'prev' | 'next') => void
  onGoToday: () => void
  onRefresh: () => void
  onOpenFilters: () => void
  onOpenNewBooking: () => void
}

export function SchedulerHeader({
  currentView,
  onViewChange,
  selectedDate,
  weekDays,
  selectedCommerceName,
  selectedBranchName,
  onDateStep,
  onGoToday,
  onRefresh,
  onOpenFilters,
  onOpenNewBooking,
}: SchedulerHeaderProps) {
  return (
    <>
      <div className="mb-0 border-b border-[rgba(236,209,200,0.8)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(251,248,244,0.9)_100%)] px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex overflow-hidden rounded-full border border-[rgba(236,209,200,0.8)] bg-white p-1 shadow-sm">
                <button
                  className={
                    currentView === 'day'
                      ? 'min-w-[92px] rounded-full bg-[var(--scheduler-ink-strong)] px-5 py-2.5 text-sm font-semibold text-white transition'
                      : 'min-w-[92px] rounded-full px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-[rgba(244,234,221,0.45)]'
                  }
                  onClick={() => onViewChange('day')}
                  type="button"
                >
                  Dia
                </button>
                <button
                  className={
                    currentView === 'week'
                      ? 'min-w-[92px] rounded-full bg-[var(--scheduler-ink-strong)] px-5 py-2.5 text-sm font-semibold text-white transition'
                      : 'min-w-[92px] rounded-full px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-[rgba(244,234,221,0.45)]'
                  }
                  onClick={() => onViewChange('week')}
                  type="button"
                >
                  Semana
                </button>
              </div>
              <button
                className="rounded-[18px] border border-[rgba(236,209,200,0.8)] bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                onClick={onGoToday}
                type="button"
              >
                Hoy
              </button>
              <div className="flex items-center gap-1 rounded-[18px] border border-transparent bg-transparent">
                <button className="rounded-full p-2.5 text-slate-500 transition hover:bg-white" onClick={() => onDateStep('prev')} type="button">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button className="rounded-full p-2.5 text-slate-500 transition hover:bg-white" onClick={() => onDateStep('next')} type="button">
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div>
              <h1 className="page-title text-[clamp(2rem,3.2vw,2.72rem)] text-[var(--scheduler-ink-strong)]">
                {currentView === 'day'
                  ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                  : `${format(weekDays[0] ?? selectedDate, "EEEE, d 'de' MMMM", { locale: es })} - ${format(
                      weekDays[6] ?? selectedDate,
                      "EEEE, d 'de' MMMM 'de' yyyy",
                      { locale: es },
                    )}`}
              </h1>
              <div className="mt-1.5 inline-flex items-center gap-2 rounded-full bg-[rgba(244,234,221,0.62)] px-4 py-1.5 text-sm font-medium text-slate-500">
                <MapPinned className="h-4 w-4" />
                <span>{selectedCommerceName}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>{selectedBranchName}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <Popover>
              <PopoverTrigger asChild>
                <button className="scheduler-toolbar-button scheduler-toolbar-button-large" type="button">
                  <CircleHelp className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[680px] rounded-[28px] border-[rgba(236,209,200,0.9)] bg-white p-5 shadow-[0_22px_56px_rgba(15,23,42,0.16)]">
                <div className="mb-4">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Leyenda</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-800">Estados y origen</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {schedulerLegendItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[rgba(236,209,200,0.8)] px-3 py-3 text-sm text-slate-700">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(236,209,200,0.78)] bg-[rgba(248,244,239,0.75)] text-slate-700">
                        {getLegendIcon(item.icon)}
                      </div>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <p className="text-sm italic text-slate-400">Actualizado hace 0 min</p>
            <div className="hidden h-6 w-px bg-slate-200 md:block" />
            <button className="scheduler-toolbar-button" onClick={onRefresh} type="button">
              <RefreshCcw className="h-4 w-4" />
            </button>
            <button className="scheduler-toolbar-button" type="button">
              <ChevronsLeftRight className="h-4 w-4" />
            </button>
            <button
              aria-label="Abrir filtros de agenda"
              className="scheduler-toolbar-button"
              onClick={onOpenFilters}
              type="button"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button className="scheduler-toolbar-button" type="button">
              <Copy className="h-4 w-4" />
            </button>
            <Button className="scheduler-modal-cta h-[52px] rounded-[20px] px-6 text-base font-medium" onClick={onOpenNewBooking}>
              Nuevo
              <Plus className="ml-3 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
