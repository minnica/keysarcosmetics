"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@cosmetics/ui";
import { CalendarClock, History, MessageCircle } from "lucide-react";
import type {
  DesignAppointmentJournalEntry,
  DesignAppointmentJournalKind,
} from "../../../design/contracts";

export interface AppointmentJournalCategoryOption {
  id: string;
  label: string;
  version: number;
}

interface SchedulerAppointmentJournalDialogProps {
  open: boolean;
  customerName: string;
  kind: Exclude<DesignAppointmentJournalKind, "CANCELLATION_REASON">;
  categories: AppointmentJournalCategoryOption[];
  entries: DesignAppointmentJournalEntry[];
  loading?: boolean;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    comment: string;
    category?: AppointmentJournalCategoryOption;
    tentativeDate?: string;
  }) => void;
}

const titles: Record<
  Exclude<DesignAppointmentJournalKind, "CANCELLATION_REASON">,
  string
> = {
  SELLER_COMMENT: "Comentario de la cita",
  POST_SALE_COMMENT: "Seguimiento postventa",
  RESCHEDULE_REASON: "Solicitud de reagenda",
};

const kindLabels: Record<DesignAppointmentJournalKind, string> = {
  SELLER_COMMENT: "Vendedor",
  POST_SALE_COMMENT: "Postventa",
  CANCELLATION_REASON: "Cancelación",
  RESCHEDULE_REASON: "Reagenda",
};

export function SchedulerAppointmentJournalDialog({
  open,
  customerName,
  kind,
  categories,
  entries,
  loading = false,
  saving = false,
  onOpenChange,
  onSubmit,
}: SchedulerAppointmentJournalDialogProps) {
  const [comment, setComment] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tentativeDate, setTentativeDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setComment("");
    setCategoryId(categories[0]?.id ?? "");
    setTentativeDate("");
  }, [categories, kind, open]);

  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );
  const valid =
    comment.trim().length >= 3 &&
    (kind !== "POST_SALE_COMMENT" || Boolean(selectedCategory)) &&
    (kind !== "RESCHEDULE_REASON" || Boolean(tentativeDate));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scheduler-modal-shell max-h-[88vh] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white">
        <DialogHeader className="text-left">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5ede4] text-[#9a7654]">
              {kind === "RESCHEDULE_REASON" ? (
                <CalendarClock className="h-5 w-5" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
            </span>
            <div>
              <DialogTitle>{titles[kind]}</DialogTitle>
              <p className="mt-1 text-sm text-slate-500">{customerName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {kind === "POST_SALE_COMMENT" ? (
            <div className="space-y-2">
              <label className="scheduler-modal-label">Categoría</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {kind === "RESCHEDULE_REASON" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {categories.length ? (
                <div className="space-y-2">
                  <label className="scheduler-modal-label">Motivo frecuente</label>
                  <Select value={comment} onValueChange={setComment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona o escribe otro" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.label}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="scheduler-modal-label" htmlFor="journal-tentative-date">
                  Fecha tentativa obligatoria
                </label>
                <Input
                  id="journal-tentative-date"
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setTentativeDate(event.target.value)}
                  type="date"
                  value={tentativeDate}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="scheduler-modal-label" htmlFor="appointment-journal-comment">
              {kind === "RESCHEDULE_REASON" ? "Motivo de reagenda" : "Comentario"}
            </label>
            <Textarea
              id="appointment-journal-comment"
              maxLength={2000}
              onChange={(event) => setComment(event.target.value)}
              placeholder={
                kind === "POST_SALE_COMMENT"
                  ? "Describe la opinión de la clienta sobre el servicio"
                  : kind === "RESCHEDULE_REASON"
                    ? "Describe por qué se solicita la nueva fecha"
                    : "Agrega el seguimiento realizado por el vendedor"
              }
              rows={4}
              value={comment}
            />
            <p className="text-right text-xs text-slate-400">
              {comment.length}/2000
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Cerrar
            </Button>
            <Button
              disabled={!valid || saving}
              onClick={() =>
                onSubmit({
                  comment: comment.trim(),
                  ...(selectedCategory ? { category: selectedCategory } : {}),
                  ...(tentativeDate ? { tentativeDate } : {}),
                })
              }
            >
              {saving ? "Guardando…" : "Autorizar y guardar"}
            </Button>
          </div>
        </div>

        <section className="border-t border-[#eee6df] pt-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <History className="h-4 w-4" /> Historial de la cita
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Cargando historial…</p>
          ) : entries.length ? (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <article
                  className="rounded-xl border border-[#eee6df] bg-[#fbfaf8] p-3"
                  key={entry.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-[#efe5da] px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[#76583d]">
                      {kindLabels[entry.kind]}
                    </span>
                    <time className="text-xs text-slate-400">
                      {new Date(entry.createdAt).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {entry.comment}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {entry.actorName} · {entry.actorRole}
                    {entry.categoryLabel ? ` · ${entry.categoryLabel}` : ""}
                    {entry.tentativeDate
                      ? ` · Tentativa ${entry.tentativeDate}`
                      : ""}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aún no hay registros.</p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
