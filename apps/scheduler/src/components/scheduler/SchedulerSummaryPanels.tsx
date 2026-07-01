'use client'

import { Badge, Card, CardContent } from '@cosmetics/ui'
import { formatMoney } from './scheduler-utils'

interface SchedulerSummaryPanelsProps {
  visibleBookingsCount: number
  estimatedRevenue: number
  paidCount: number
  waitingCount: number
  pendingCount: number
}

export function SchedulerSummaryPanels({
  visibleBookingsCount,
  estimatedRevenue,
  paidCount,
  waitingCount,
  pendingCount,
}: SchedulerSummaryPanelsProps) {
  return (
    <div className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="rounded-[26px] border-white/80 bg-white/68 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[0.76rem] uppercase tracking-[0.26em] text-slate-400">Resumen del dia</p>
              <h2 className="mt-1 text-[1.55rem] font-semibold tracking-[-0.03em] text-slate-800">
                {visibleBookingsCount} reservas visibles
              </h2>
            </div>
            <Badge className="rounded-full bg-[rgba(195,165,131,0.1)] px-3 py-1 text-[var(--scheduler-accent)]">
              Agenda activa
            </Badge>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="scheduler-stat-card">
              <p className="text-[0.92rem] text-slate-500">Ingreso estimado</p>
              <p className="mt-1.5 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-800">{formatMoney(estimatedRevenue)}</p>
            </div>
            <div className="scheduler-stat-card">
              <p className="text-[0.92rem] text-slate-500">Pagadas</p>
              <p className="mt-1.5 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-800">{paidCount}</p>
            </div>
            <div className="scheduler-stat-card">
              <p className="text-[0.92rem] text-slate-500">En espera</p>
              <p className="mt-1.5 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-800">{waitingCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[26px] border-white/80 bg-white/68 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
        <CardContent className="p-4">
          <div className="mb-3">
            <p className="text-[0.76rem] uppercase tracking-[0.26em] text-slate-400">Operacion</p>
            <h2 className="mt-1 text-[1.55rem] font-semibold tracking-[-0.03em] text-slate-800">Indicadores operativos</h2>
          </div>
          <div className="space-y-2.5 text-[0.9rem] text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
              {pendingCount} reservas estan pendientes de confirmacion o seguimiento.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
              {visibleBookingsCount - paidCount} reservas aun no estan marcadas como pagadas.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
              La agenda ya permite revisar disponibilidad, estatus, pagos y bloqueos en flujo local.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
