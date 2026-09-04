'use client'

import { Badge, Calendar, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@cosmetics/ui'
import { CalendarDays, ChevronLeft, ChevronRight, List, PanelLeftClose, Search } from 'lucide-react'
import { addMonths, format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  bookingStatusOptions,
  type BranchOption,
  type BookingStatus,
  type CommerceOption,
  type Professional,
} from '@/lib/mock-scheduler-data'
import { SchedulerAvatar } from './SchedulerAvatar'

export type SchedulerDisplayMode = 'calendar' | 'list'

interface SchedulerSidebarProps {
  commerces: CommerceOption[]
  selectedCommerce: string
  onCommerceChange: (value: string) => void
  branches: BranchOption[]
  selectedBranch: string
  onBranchChange: (value: string) => void
  visibleProfessionalCount: number
  professionals: Professional[]
  selectedProfessionalIds: string[]
  onToggleProfessional: (professionalId: string) => void
  professionalQuery: string
  onProfessionalQueryChange: (value: string) => void
  statusFilter: BookingStatus | 'active'
  onStatusFilterChange: (value: BookingStatus | 'active') => void
  quickTimeFilter: string
  timeSlots: string[]
  onQuickTimeFilterChange: (value: string) => void
  monthCursor: Date
  onMonthCursorChange: (date: Date) => void
  selectedDate: Date
  onSelectedDateChange: (date: Date) => void
  onDateQuickCreate: (date: Date) => void
  displayMode: SchedulerDisplayMode
  onDisplayModeChange: (mode: SchedulerDisplayMode) => void
  onCollapse?: () => void
}

export function SchedulerSidebar({
  commerces,
  selectedCommerce,
  onCommerceChange,
  branches,
  selectedBranch,
  onBranchChange,
  visibleProfessionalCount,
  professionals,
  selectedProfessionalIds,
  onToggleProfessional,
  professionalQuery,
  onProfessionalQueryChange,
  statusFilter,
  onStatusFilterChange,
  quickTimeFilter,
  timeSlots,
  onQuickTimeFilterChange,
  monthCursor,
  onMonthCursorChange,
  selectedDate,
  onSelectedDateChange,
  onDateQuickCreate,
  displayMode,
  onDisplayModeChange,
  onCollapse,
}: SchedulerSidebarProps) {
  return (
    <div className="min-h-full bg-[linear-gradient(180deg,rgba(255,251,247,0.96)_0%,rgba(245,239,232,0.92)_100%)] backdrop-blur">
      <div className="flex min-h-full flex-col px-4 pb-5 pt-4">
        <div className="mb-4">
          <p className="label-caps">Vista y recursos</p>
          <p className="mt-1 text-sm text-slate-500">Define qué quieres ver en la agenda.</p>
        </div>

        <div className="mb-5 flex items-center gap-2 rounded-[20px] border border-[rgba(236,209,200,0.82)] bg-white p-1.5 shadow-sm">
          <button
            aria-label="Ver agenda como calendario"
            aria-pressed={displayMode === 'calendar'}
            className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[15px] text-sm font-semibold transition ${
              displayMode === 'calendar'
                ? 'bg-[var(--scheduler-ink-strong)] text-white shadow-sm'
                : 'text-slate-500 hover:bg-[var(--scheduler-accent-soft)]'
            }`}
            onClick={() => onDisplayModeChange('calendar')}
            type="button"
          >
            <CalendarDays className="h-5 w-5" />
            Calendario
          </button>
          <button
            aria-label="Ver agenda como lista"
            aria-pressed={displayMode === 'list'}
            className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[15px] text-sm font-semibold transition ${
              displayMode === 'list'
                ? 'bg-[var(--scheduler-ink-strong)] text-white shadow-sm'
                : 'text-slate-500 hover:bg-[var(--scheduler-accent-soft)]'
            }`}
            onClick={() => onDisplayModeChange('list')}
            type="button"
          >
            <List className="h-5 w-5" />
            Lista
          </button>
          {onCollapse ? (
            <button
              aria-label="Ocultar panel de recursos"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] text-slate-400 transition hover:bg-[var(--scheduler-accent-soft)] hover:text-slate-700"
              onClick={onCollapse}
              type="button"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-5">
          <div className="space-y-5">
            <div className="scheduler-sidebar-card space-y-4">
              <div>
                <label className="scheduler-label">Comercio</label>
                <Select value={selectedCommerce} onValueChange={onCommerceChange}>
                  <SelectTrigger className="scheduler-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="scheduler-select-content max-h-[220px]">
                    {commerces.map((commerce) => (
                      <SelectItem key={commerce.id} className="scheduler-select-item" value={commerce.id}>
                        {commerce.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="scheduler-label">Sucursal</label>
              <Select value={selectedBranch} onValueChange={onBranchChange}>
                <SelectTrigger className="scheduler-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="scheduler-select-content max-h-[220px]">
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} className="scheduler-select-item" value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            </div>

            <div className="scheduler-sidebar-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <label className="scheduler-label !mb-0">Especialista</label>
                  <p className="mt-1 text-[0.78rem] uppercase tracking-[0.14em] text-slate-500">Disponibles en esta sucursal</p>
                </div>
                <Badge className="rounded-full border-0 bg-[rgba(195,165,131,0.12)] px-3 py-1 text-xs font-semibold text-[var(--scheduler-accent-strong)]">
                  {visibleProfessionalCount} activos
                </Badge>
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-[18px] border border-[rgba(236,209,200,0.92)] bg-[rgba(248,244,239,0.92)] px-3 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  className="w-full border-0 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
                  placeholder="Buscar especialista"
                  value={professionalQuery}
                  onChange={(event) => onProfessionalQueryChange(event.target.value)}
                />
              </div>

              <div className="space-y-2.5">
                {professionals.map((professional) => {
                  const isSelected = selectedProfessionalIds.includes(professional.id)

                  return (
                    <button
                      key={professional.id}
                      className={[
                        'flex w-full items-center gap-3 rounded-[20px] border px-3 py-2.5 text-left transition-all duration-200',
                        isSelected
                          ? 'border-[rgba(195,165,131,0.34)] bg-[linear-gradient(135deg,rgba(244,234,221,0.95),rgba(255,255,255,0.98))] shadow-[0_12px_28px_rgba(195,165,131,0.12)]'
                          : 'border-[rgba(236,209,200,0.8)] bg-white hover:border-[rgba(195,165,131,0.32)] hover:shadow-sm',
                      ].join(' ')}
                      onClick={() => onToggleProfessional(professional.id)}
                      type="button"
                    >
                      <SchedulerAvatar
                        accent={professional.accent}
                        avatar={professional.avatar}
                        name={professional.name}
                        shortName={professional.shortName}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.94rem] font-semibold tracking-[-0.02em] text-slate-800">{professional.name}</p>
                        <p className="text-[0.92rem] text-slate-400">Disponible hoy</p>
                      </div>
                      <div className={isSelected ? 'h-3 w-3 rounded-full bg-[var(--scheduler-accent)]' : 'h-3 w-3 rounded-full bg-slate-200'} />
                    </button>
                  )
                })}
                {professionals.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[rgba(236,209,200,0.92)] bg-[rgba(248,244,239,0.7)] px-4 py-5 text-sm text-slate-500">
                    No tienes especialistas disponibles en esta sucursal. Revisa sus asignaciones o tus permisos.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="scheduler-sidebar-card">
              <label className="scheduler-label">Estado de la reserva</label>
              <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as BookingStatus | 'active')}>
                <SelectTrigger className="scheduler-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="scheduler-select-content max-h-[260px]">
                  {bookingStatusOptions.map((option) => (
                    <SelectItem key={option.value} className="scheduler-select-item" value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="scheduler-sidebar-card">
              <label className="scheduler-label">Busqueda rapida de hora</label>
              <Select value={quickTimeFilter} onValueChange={onQuickTimeFilterChange}>
                <SelectTrigger className="scheduler-select">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="scheduler-select-content max-h-[240px]">
                  <SelectItem className="scheduler-select-item" value="all">Todas las horas</SelectItem>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} className="scheduler-select-item" value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="mt-auto min-w-0 overflow-hidden rounded-[30px] border-white/80 bg-white/85 shadow-[0_22px_48px_rgba(15,23,42,0.09)]">
            <CardContent className="min-w-0 p-4">
              <div className="mb-3">
                <p className="scheduler-label !mb-0">Ir a una fecha</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Selecciona un día para abrir una nueva cita.</p>
              </div>
              <div className="mb-3 flex items-center justify-between">
                <button
                  aria-label="Mes anterior"
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                  onClick={() => onMonthCursorChange(subMonths(monthCursor, 1))}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="text-lg font-semibold capitalize text-slate-800">{format(monthCursor, 'MMMM', { locale: es })}</p>
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-400">{format(monthCursor, 'yyyy', { locale: es })}</p>
                </div>
                <button
                  aria-label="Mes siguiente"
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                  onClick={() => onMonthCursorChange(addMonths(monthCursor, 1))}
                  type="button"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <Calendar
                className="mx-auto !w-full max-w-full !p-0"
                classNames={{
                  caption: 'hidden',
                  nav: 'hidden',
                  months: 'w-full',
                  month: 'w-full',
                  table: 'w-full border-collapse',
                  head_row: 'grid w-full grid-cols-7',
                  head_cell: 'w-full text-center text-[0.72rem] font-normal text-muted-foreground',
                  row: 'mt-1 grid w-full grid-cols-7',
                  cell: 'relative h-8 w-full p-0 text-center text-sm focus-within:relative focus-within:z-20',
                  day: 'mx-auto inline-flex h-8 w-8 items-center justify-center rounded-md p-0 font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:opacity-100',
                }}
                locale={es}
                mode="single"
                month={monthCursor}
                onMonthChange={onMonthCursorChange}
                onSelect={(date) => {
                  if (!date) return
                  onSelectedDateChange(date)
                  onDateQuickCreate(date)
                }}
                selected={selectedDate}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
