'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cosmetics/ui'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Ban, Clock3, Trash2, X } from 'lucide-react'
import { type Professional } from '@/lib/mock-scheduler-data'
import { endHourOptions, minuteOptions, startHourOptions, type BlockDraft } from './scheduler-utils'

interface SchedulerBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  professionals: Professional[]
  draft: BlockDraft | null
  onDraftChange: (draft: BlockDraft) => void
  onSave: () => void
  onDelete?: () => void
}

export function SchedulerBlockDialog({
  open,
  onOpenChange,
  professionals,
  draft,
  onDraftChange,
  onSave,
  onDelete,
}: SchedulerBlockDialogProps) {
  if (!draft) return null
  const currentDraft = draft

  const isEditing = Boolean(currentDraft.blockId)

  function patchDraft(patch: Partial<BlockDraft>) {
    const nextDraft: BlockDraft = {
      professionalId: patch.professionalId ?? currentDraft.professionalId,
      date: patch.date ?? currentDraft.date,
      startHour: patch.startHour ?? currentDraft.startHour,
      startMinute: patch.startMinute ?? currentDraft.startMinute,
      endHour: patch.endHour ?? currentDraft.endHour,
      endMinute: patch.endMinute ?? currentDraft.endMinute,
      ...(patch.blockId ?? currentDraft.blockId
        ? { blockId: patch.blockId ?? currentDraft.blockId }
        : {}),
      ...(patch.label ?? currentDraft.label
        ? { label: patch.label ?? currentDraft.label }
        : {}),
      ...(patch.variant ?? currentDraft.variant
        ? { variant: patch.variant ?? currentDraft.variant }
        : {}),
    }

    onDraftChange(nextDraft)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="scheduler-dialog border-0 bg-transparent p-0 shadow-none sm:max-w-[680px]"
        hideCloseButton
      >
        <div className="scheduler-modal-shell overflow-hidden rounded-[30px]">
          <DialogHeader className="border-b border-[rgba(236,209,200,0.88)] px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="label-caps">Agenda</p>
                <DialogTitle className="mt-1 text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--scheduler-ink-strong)]">
                  {isEditing ? 'Editar bloqueo' : 'Bloquear horario'}
                </DialogTitle>
                <p className="mt-1 text-[0.92rem] text-slate-500">
                  Ajusta la franja manual para dejar ese espacio fuera de agenda.
                </p>
              </div>
              <button
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(236,209,200,0.95)] bg-white text-slate-500 shadow-sm transition hover:bg-[rgba(245,237,228,0.85)] hover:text-slate-700"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-4 bg-[linear-gradient(180deg,rgba(243,240,233,0.4)_0%,rgba(255,255,255,0.22)_100%)] px-4 py-4 md:px-6 md:py-5">
            <div className="scheduler-modal-section rounded-[24px] p-4 md:p-5">
              <div className="rounded-[20px] border border-[rgba(236,209,200,0.88)] bg-white px-4 py-3">
                <p className="text-[0.78rem] uppercase tracking-[0.18em] text-slate-400">Fecha</p>
                <p className="mt-1 text-[1rem] font-semibold capitalize text-[var(--scheduler-ink-strong)]">
                  {format(currentDraft.date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <label className="scheduler-modal-label">Profesional</label>
                <Select value={currentDraft.professionalId} onValueChange={(value) => patchDraft({ professionalId: value })}>
                  <SelectTrigger className="scheduler-modal-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="scheduler-modal-select-content max-h-[320px]">
                    {professionals.map((professional) => (
                      <SelectItem key={professional.id} className="scheduler-modal-select-item" value={professional.id}>
                        {professional.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[22px] border border-[rgba(236,209,200,0.88)] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-[var(--scheduler-ink-strong)]">
                    <Clock3 className="h-4 w-4 text-[var(--scheduler-accent)]" />
                    <p className="text-[0.95rem] font-semibold">Inicio</p>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                    <Select value={currentDraft.startHour} onValueChange={(value) => patchDraft({ startHour: value })}>
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[280px]">
                        {startHourOptions.map((option) => (
                          <SelectItem key={option} className="scheduler-modal-select-item" value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="pb-4 text-2xl text-[var(--color-gold)]">:</span>
                    <Select value={currentDraft.startMinute} onValueChange={(value) => patchDraft({ startMinute: value })}>
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[240px]">
                        {minuteOptions.map((option) => (
                          <SelectItem key={option} className="scheduler-modal-select-item" value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[rgba(236,209,200,0.88)] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-[var(--scheduler-ink-strong)]">
                    <Ban className="h-4 w-4 text-[var(--scheduler-accent)]" />
                    <p className="text-[0.95rem] font-semibold">Fin</p>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                    <Select value={currentDraft.endHour} onValueChange={(value) => patchDraft({ endHour: value })}>
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[280px]">
                        {endHourOptions.map((option) => (
                          <SelectItem key={option} className="scheduler-modal-select-item" value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="pb-4 text-2xl text-[var(--color-gold)]">:</span>
                    <Select value={currentDraft.endMinute} onValueChange={(value) => patchDraft({ endMinute: value })}>
                      <SelectTrigger className="scheduler-modal-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="scheduler-modal-select-content max-h-[240px]">
                        {minuteOptions.map((option) => (
                          <SelectItem key={option} className="scheduler-modal-select-item" value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[rgba(236,209,200,0.95)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button className="scheduler-modal-secondary" onClick={() => onOpenChange(false)} variant="outline">
                Cancelar
              </Button>

              <div className="flex flex-col gap-3 sm:flex-row">
                {isEditing && onDelete ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="scheduler-modal-secondary text-rose-700 hover:bg-rose-50 hover:text-rose-800" variant="outline">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Quitar bloqueo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="z-[80] rounded-[24px] border border-[rgba(236,209,200,0.95)] bg-white p-6 text-[var(--scheduler-ink-strong)] shadow-[0_24px_64px_rgba(15,23,42,0.28)]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-[1.25rem] font-semibold">Quitar bloqueo</AlertDialogTitle>
                        <AlertDialogDescription className="text-[0.95rem] leading-6 text-slate-600">
                          Esta accion vuelve a dejar disponible ese espacio dentro de la agenda local.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="scheduler-modal-secondary mt-0">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="scheduler-modal-secondary border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                          onClick={onDelete}
                        >
                          Quitar bloqueo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
                <Button className="scheduler-modal-cta" onClick={onSave}>
                  <Ban className="mr-2 h-4 w-4" />
                  {isEditing ? 'Guardar cambios' : 'Guardar bloqueo'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
