"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@cosmetics/ui";
import {
  BadgeCheck,
  CalendarX2,
  HeartHandshake,
  Loader2,
  Search,
  TicketCheck,
  UserRoundX,
} from "lucide-react";
import { schedulerDesignProposals } from "@scheduler/design-proposals";
import type {
  DesignCustomerRecoveryCase,
  DesignCustomerRecoveryReason,
  DesignCustomerRecoveryStatus,
} from "../../../design/contracts";

interface CustomerRecoveryDialogProps {
  branchId: string;
  canWrite: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const reasonLabels: Record<DesignCustomerRecoveryReason, string> = {
  NEVER_ATTENDED: "Nunca asistió",
  MEMBERSHIP_ENDED: "Membresía terminada",
  TREATMENT_ENDED: "Tratamiento terminado",
};

const statusLabels: Record<DesignCustomerRecoveryStatus, string> = {
  PENDING: "Por recuperar",
  RECOVERED: "Recuperado",
  LOST: "Cliente perdido",
};

function formatDate(value: string | null) {
  if (!value) return "Sin visita previa";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

function RecoveryStatusBadge({
  status,
}: {
  status: DesignCustomerRecoveryStatus;
}) {
  const className = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    RECOVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    LOST: "border-rose-200 bg-rose-50 text-rose-700",
  }[status];
  return (
    <Badge className={`rounded-full ${className}`} variant="outline">
      {statusLabels[status]}
    </Badge>
  );
}

export function CustomerRecoveryDialog({
  branchId,
  canWrite,
  open,
  onOpenChange,
}: CustomerRecoveryDialogProps) {
  const [cases, setCases] = useState<DesignCustomerRecoveryCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState<DesignCustomerRecoveryReason | "ALL">(
    "ALL",
  );
  const [status, setStatus] = useState<DesignCustomerRecoveryStatus | "ALL">(
    "ALL",
  );
  const [selected, setSelected] = useState<DesignCustomerRecoveryCase | null>(
    null,
  );
  const [nextStatus, setNextStatus] =
    useState<DesignCustomerRecoveryStatus>("RECOVERED");
  const [notes, setNotes] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !branchId) return;
    let active = true;
    setLoading(true);
    setError(null);
    void schedulerDesignProposals
      .customerRecoveryCases({ branchIds: [branchId] })
      .then((items) => {
        if (active) setCases(items);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "No fue posible cargar la recuperación de clientes.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [branchId, open]);

  const filteredCases = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");
    return cases.filter(
      (item) =>
        (reason === "ALL" || item.reason === reason) &&
        (status === "ALL" || item.status === status) &&
        (!normalizedQuery ||
          [item.customerName, item.phone, item.portfolioOwnerName].some(
            (value) =>
              value?.toLocaleLowerCase("es-MX").includes(normalizedQuery),
          )),
    );
  }, [cases, query, reason, status]);

  const summary = useMemo(
    () => ({
      pending: cases.filter((item) => item.status === "PENDING").length,
      recovered: cases.filter((item) => item.status === "RECOVERED").length,
      lost: cases.filter((item) => item.status === "LOST").length,
      total: cases.length,
    }),
    [cases],
  );

  function openUpdate(item: DesignCustomerRecoveryCase) {
    setSelected(item);
    setNextStatus(item.status === "RECOVERED" ? "LOST" : "RECOVERED");
    setNotes("");
    setCode("");
    setError(null);
  }

  async function saveStatus() {
    if (!selected || notes.trim().length < 5 || !code) return;
    setSaving(true);
    setError(null);
    try {
      const grant = await schedulerDesignProposals.authorizeOperation({
        code,
        purpose: "CUSTOMER_RECOVERY_STATUS_CHANGE",
        targetType: "CUSTOMER_RECOVERY",
        targetId: selected.id,
      });
      const updated =
        await schedulerDesignProposals.updateCustomerRecoveryStatus(
          selected.id,
          {
            status: nextStatus,
            notes: notes.trim(),
            authorizationToken: grant.token,
          },
        );
      await schedulerDesignProposals.commitOperation({
        token: grant.token,
        action: `Recuperación: ${statusLabels[nextStatus]}`,
        targetType: "CUSTOMER_RECOVERY",
        targetId: selected.id,
        metadata: {
          customerId: selected.customerId,
          reason: selected.reason,
          fromStatus: selected.status,
          toStatus: nextStatus,
        },
      });
      setCases((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelected(null);
      setNotes("");
      setCode("");
      toast.success(`Cliente marcado como ${statusLabels[nextStatus]}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible actualizar el caso de recuperación.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setSelected(null);
      setQuery("");
      setReason("ALL");
      setStatus("ALL");
      setError(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto overflow-x-hidden rounded-[28px] p-0">
          <DialogHeader className="border-b border-[#eee6df] bg-[linear-gradient(135deg,#fff_0%,#fbf4ec_100%)] px-6 py-5 text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#263649] text-white">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle>Activación y recuperación de clientes</DialogTitle>
                <DialogDescription className="mt-1">
                  Seguimiento exclusivo para recuperar clientes sin alterar sus
                  citas, membresías o tratamientos históricos.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 px-6 pb-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Por recuperar",
                  value: summary.pending,
                  Icon: CalendarX2,
                  color: "text-amber-700",
                },
                {
                  label: "Recuperados",
                  value: summary.recovered,
                  Icon: BadgeCheck,
                  color: "text-emerald-700",
                },
                {
                  label: "Clientes perdidos",
                  value: summary.lost,
                  Icon: UserRoundX,
                  color: "text-rose-700",
                },
                {
                  label: "Total identificado",
                  value: summary.total,
                  Icon: TicketCheck,
                  color: "text-[#526273]",
                },
              ].map(({ label, value, Icon, color }) => (
                <div
                  className="rounded-2xl border border-[#e8ded5] bg-white p-4"
                  key={label}
                >
                  <div className={`flex items-center gap-2 ${color}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-[0.12em]">
                      {label}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#263649]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 rounded-2xl border border-[#e8ded5] bg-[#fcfaf8] p-4 md:grid-cols-[minmax(220px,1fr)_220px_200px]">
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  aria-label="Buscar cliente en recuperación"
                  className="h-11 rounded-xl border-[#dfd5cc] bg-white pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nombre, teléfono o representante"
                  value={query}
                />
              </span>
              <Select
                value={reason}
                onValueChange={(value) =>
                  setReason(value as DesignCustomerRecoveryReason | "ALL")
                }
              >
                <SelectTrigger
                  aria-label="Motivo de recuperación"
                  className="h-11 rounded-xl border-[#dfd5cc] bg-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los motivos</SelectItem>
                  {Object.entries(reasonLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as DesignCustomerRecoveryStatus | "ALL")
                }
              >
                <SelectTrigger
                  aria-label="Status de recuperación"
                  className="h-11 rounded-xl border-[#dfd5cc] bg-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los status</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando cartera de
                recuperación…
              </div>
            ) : filteredCases.length ? (
              <div className="overflow-hidden rounded-2xl border border-[#e8ded5]">
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left text-sm">
                    <thead className="bg-[#faf8f5] text-xs font-semibold text-[#526273]">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Motivo de recuperación</th>
                        <th className="px-4 py-3">Actividad</th>
                        <th className="px-4 py-3">Cartera</th>
                        <th className="px-4 py-3">Status exclusivo</th>
                        <th className="px-4 py-3 text-right">Gestión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases.map((item) => (
                        <tr
                          className="border-t border-[#f0e8e1] odd:bg-[#fcfaf8]"
                          key={item.id}
                        >
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#263649]">
                              {item.customerName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.phone ?? "Sin teléfono"} · {item.branchName}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-[#526273]">
                              {reasonLabels[item.reason]}
                            </p>
                            <p className="mt-1 max-w-[280px] text-xs leading-5 text-slate-500">
                              {item.reasonDetail}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-xs leading-5 text-slate-500">
                            <span className="block">
                              Detectado: {formatDate(item.eligibilityAt)}
                            </span>
                            <span className="block">
                              Última cita: {formatDate(item.lastAppointmentAt)}
                            </span>
                            <span className="block">
                              {item.attendedCount} asistencias
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {item.portfolioOwnerName}
                          </td>
                          <td className="px-4 py-4">
                            <RecoveryStatusBadge status={item.status} />
                            {item.history[0] ? (
                              <p className="mt-2 max-w-[220px] text-xs text-slate-500">
                                {item.history[0].notes}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              className="rounded-xl"
                              disabled={!canWrite}
                              onClick={() => openUpdate(item)}
                              size="sm"
                              variant="outline"
                            >
                              Actualizar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#d9c9bb] px-6 text-center">
                <BadgeCheck className="h-7 w-7 text-[#ad8b67]" />
                <p className="mt-3 font-semibold">Sin casos en este filtro</p>
                <p className="mt-1 text-sm text-slate-500">
                  Cambia el motivo, status o término de búsqueda.
                </p>
              </div>
            )}

            {error && !selected ? (
              <p className="text-sm font-medium text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelected(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-xl overflow-x-hidden rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Resultado de recuperación</DialogTitle>
            <DialogDescription>
              {selected?.customerName}. El cambio queda separado del expediente
              y conserva historial de quién lo autorizó.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-status">Nuevo status</Label>
              <Select
                value={nextStatus}
                onValueChange={(value) =>
                  setNextStatus(value as DesignCustomerRecoveryStatus)
                }
              >
                <SelectTrigger id="recovery-status" className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Por recuperar</SelectItem>
                  <SelectItem value="RECOVERED">Recuperado</SelectItem>
                  <SelectItem value="LOST">Cliente perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-notes">Resultado de la gestión</Label>
              <Textarea
                id="recovery-notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej. Aceptó una nueva cita para continuar el tratamiento."
                rows={4}
                value={notes}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-code">Código de autorización</Label>
              <Input
                autoComplete="one-time-code"
                id="recovery-code"
                inputMode="numeric"
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                placeholder="Código personal"
                type="password"
                value={code}
              />
            </div>
            {selected?.history.length ? (
              <div className="rounded-2xl border border-[#e8ded5] bg-[#fcfaf8] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9b7652]">
                  Último movimiento
                </p>
                <p className="mt-2 text-sm text-[#364152]">
                  {statusLabels[selected.history[0]!.fromStatus]} →{" "}
                  {statusLabels[selected.history[0]!.toStatus]}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selected.history[0]!.actorName} ·{" "}
                  {formatDate(selected.history[0]!.createdAt)}
                </p>
              </div>
            ) : null}
            {error ? (
              <p className="text-sm font-medium text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setSelected(null)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="bg-[#263649] text-white hover:bg-[#1d2b3a]"
              disabled={
                saving ||
                !code ||
                notes.trim().length < 5 ||
                nextStatus === selected?.status
              }
              onClick={() => void saveStatus()}
            >
              {saving ? "Guardando…" : "Autorizar y guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
