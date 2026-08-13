'use client'

import Link from 'next/link'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@cosmetics/ui'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChevronsLeftRight,
  CircleHelp,
  Copy,
  Filter,
  MapPinned,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { schedulerBranches, schedulerLegendItems, type SchedulerView } from '@/lib/mock-scheduler-data'
import { getLegendIcon } from './scheduler-utils'

interface SchedulerHeaderProps {
  currentView: SchedulerView
  onViewChange: (view: SchedulerView) => void
  selectedDate: Date
  weekDays: Date[]
  selectedBranch: string
  onDateStep: (direction: 'prev' | 'next') => void
  onGoToday: () => void
  onRefresh: () => void
  onOpenNewBooking: () => void
}

export function SchedulerHeader({
  currentView,
  onViewChange,
  selectedDate,
  weekDays,
  selectedBranch,
  onDateStep,
  onGoToday,
  onRefresh,
  onOpenNewBooking,
}: SchedulerHeaderProps) {
  const branchName = schedulerBranches.find((branch) => branch.id === selectedBranch)?.name

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(90deg,#172230_0%,#1d2937_100%)] text-white shadow-[0_18px_44px_rgba(8,14,24,0.2)]">
        <div className="flex min-h-[78px] items-center justify-between gap-6 px-5 sm:px-6 xl:px-8">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(195,165,131,0.28),rgba(236,209,200,0.12))] ring-1 ring-white/10">
                <img alt="Keysar Cosmetics" className="h-7 w-7 object-contain" src="/logo.svg" />
              </div>
              <div>
                <p className="page-title text-[1.68rem] text-white">Keysar Scheduler</p>
                <p className="text-[0.68rem] uppercase tracking-[0.32em] text-white/45">Agenda interna</p>
              </div>
            </div>
            <nav className="hidden items-center gap-2 xl:flex">
              <Link
                className="rounded-full bg-white/12 px-5 py-2.5 text-[0.92rem] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition"
                href="/"
              >
                Agenda
              </Link>
              {['Clientes', 'Servicios'].map((item) => (
                <button
                  key={item}
                  className="rounded-full px-5 py-2.5 text-[0.92rem] font-medium text-white/60 transition hover:bg-white/6 hover:text-white"
                  type="button"
                >
                  {item}
                </button>
              ))}
              <Link
                className="rounded-full px-5 py-2.5 text-[0.92rem] font-medium text-white/60 transition hover:bg-white/6 hover:text-white"
                href="/reportes"
              >
                Reportes
              </Link>
              <Link
                className="rounded-full border border-[#c3a583]/45 bg-[#c3a583]/20 px-5 py-2.5 text-[0.92rem] font-medium text-white transition hover:bg-[#c3a583]/30"
                href="/administracion"
              >
                Administración
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              aria-label="Abrir Reportes"
              className="scheduler-header-button lg:hidden"
              href="/reportes"
            >
              <BarChart3 className="h-5 w-5" />
            </Link>
            <Link
              aria-label="Abrir Administración"
              className="scheduler-header-button lg:hidden"
              href="/administracion"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Link>
            <div className="hidden items-center gap-3 lg:flex">
            <button className="scheduler-header-button" type="button">
              <Search className="h-5 w-5" />
            </button>
            <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-5 py-2.5 text-sm font-medium text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              Reservas Online
            </div>
            <button className="scheduler-header-button" type="button">
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
              ER
            </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-0 rounded-br-[26px] border-x border-b border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.7)_100%)] px-5 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.07)] backdrop-blur sm:px-6">
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
                {branchName}
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
            <button className="scheduler-toolbar-button" type="button">
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
