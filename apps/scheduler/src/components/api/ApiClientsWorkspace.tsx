"use client";

import { useState } from "react";
import type {
  SchedulerCustomerDetailDto,
  SchedulerCustomerFinancialHistoryDto,
  SchedulerCustomerSummaryDto,
  SchedulerCustomerVisitHistoryDto,
} from "@cosmetics/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { Eye, LockKeyhole, Pencil, Plus, Search, UserRound } from "lucide-react";
import { schedulerApi } from "@/lib/api";
import { useSchedulerSession } from "@/lib/session";
import {
  ConflictNotice,
  QueryBoundary,
  WorkspaceHeader,
  runSchedulerMutation,
  useSchedulerQuery,
} from "./ApiState";

interface CustomerDraft {
  id: string | null;
  displayName: string;
  phone: string;
  email: string;
  notes: string;
  sourceId: string;
  version: number | null;
}

const emptyDraft: CustomerDraft = {
  id: null,
  displayName: "",
  phone: "",
  email: "",
  notes: "",
  sourceId: "",
  version: null,
};

export function ApiClientsWorkspace() {
  const { bootstrap, canAccess } = useSchedulerSession();
  const canWrite = canAccess("clients", "WRITE");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState(
    bootstrap?.authorizedBranchIds[0] ?? "",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [recordCustomer, setRecordCustomer] = useState<SchedulerCustomerSummaryDto | null>(null);
  const [recordSecret, setRecordSecret] = useState("");
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [record, setRecord] = useState<{
    detail: SchedulerCustomerDetailDto;
    visits: SchedulerCustomerVisitHistoryDto;
    financial: SchedulerCustomerFinancialHistoryDto;
  } | null>(null);

  const results = useSchedulerQuery(
    () =>
      schedulerApi.searchCustomers({
        query,
        branchId,
        page: 1,
        pageSize: 50,
      }),
    [query, branchId],
    query.length >= 2 && Boolean(branchId),
  );
  const sources = useSchedulerQuery(() => schedulerApi.customerSources(), []);

  function openEdit(customer: SchedulerCustomerSummaryDto) {
    setDraft({
      id: customer.id,
      displayName: customer.displayName,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      notes: "",
      sourceId: customer.source?.id ?? "",
      version: customer.version,
    });
    setConflict(null);
    setDialogOpen(true);
  }

  async function save() {
    if (!branchId || draft.displayName.trim().length < 2) {
      toast.error("Captura un nombre y selecciona una sucursal.");
      return;
    }
    setSaving(true);
    await runSchedulerMutation(
      () => {
        const input = {
          displayName: draft.displayName.trim(),
          phone: draft.phone.trim() || null,
          email: draft.email.trim() || null,
          sourceId: draft.sourceId || null,
          branchId,
          ...(!draft.id || draft.notes.trim()
            ? { notes: draft.notes.trim() || null }
            : {}),
          ...(draft.version ? { expectedVersion: draft.version } : {}),
        };
        return draft.id
          ? schedulerApi.updateCustomer(draft.id, input)
          : schedulerApi.createCustomer(input);
      },
      {
        onSuccess: async () => {
          toast.success(draft.id ? "Cliente actualizado." : "Cliente creado.");
          setDialogOpen(false);
          setDraft(emptyDraft);
          if (query.length >= 2) await results.reload();
        },
        onError: toast.error,
        onConflict: setConflict,
      },
    );
    setSaving(false);
  }

  async function loadSensitiveRecord() {
    if (!recordCustomer || !branchId || !recordSecret) return;
    setRecordLoading(true);
    setRecordError(null);
    try {
      const target = { targetType: "Customer", targetId: recordCustomer.id };
      const [detailAuthorization, visitsAuthorization, financialAuthorization] = await Promise.all([
        schedulerApi.createAuthorization({ secret: recordSecret, purpose: "CLIENT_RECORD_VIEW", screenKey: "scheduler/clients", ...target }),
        schedulerApi.createAuthorization({ secret: recordSecret, purpose: "CLIENT_VISIT_HISTORY_VIEW", screenKey: "scheduler/clients", ...target }),
        schedulerApi.createAuthorization({ secret: recordSecret, purpose: "CLIENT_FINANCIAL_HISTORY_VIEW", screenKey: "scheduler/clients", ...target }),
      ]);
      const [detail, visits, financial] = await Promise.all([
        schedulerApi.customerDetail(recordCustomer.id, detailAuthorization.token),
        schedulerApi.customerVisits(recordCustomer.id, visitsAuthorization.token, { branchId, page: 1, pageSize: 25 }),
        schedulerApi.customerFinancialHistory(recordCustomer.id, financialAuthorization.token, { branchId, page: 1, pageSize: 25 }),
      ]);
      setRecord({ detail, visits, financial });
      setRecordSecret("");
    } catch (cause) {
      setRecordError(cause instanceof Error ? cause.message : "No fue posible abrir el expediente.");
    } finally {
      setRecordLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <WorkspaceHeader
        eyebrow="Identidad compartida"
        title="Clientes"
        description="Búsqueda canónica por nombre, teléfono o correo. Scheduler reutiliza la identidad de cliente y su cartera vigente."
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setDraft(emptyDraft);
                setConflict(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
            </Button>
          ) : (
            <Badge variant="outline">
              <LockKeyhole className="mr-1 h-3.5 w-3.5" /> Sólo lectura
            </Badge>
          )
        }
      />
      <div className="space-y-5 px-5 py-6 sm:px-7 lg:px-10">
        <Card>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.35fr)_auto] md:items-end">
            <div>
              <Label htmlFor="customer-query">Buscar cliente</Label>
              <Input
                id="customer-query"
                className="mt-1.5"
                placeholder="Mínimo 2 caracteres"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && queryInput.trim().length >= 2)
                    setQuery(queryInput.trim());
                }}
              />
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {bootstrap?.authorizedBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={queryInput.trim().length < 2}
              onClick={() => setQuery(queryInput.trim())}
            >
              <Search className="mr-2 h-4 w-4" /> Buscar
            </Button>
          </CardContent>
        </Card>

        {query.length < 2 ? (
          <div className="rounded-2xl border border-dashed border-[#dccfc3] bg-white/60 p-10 text-center text-sm text-slate-500">
            Escribe al menos dos caracteres para consultar la base compartida.
          </div>
        ) : (
          <QueryBoundary
            loading={results.loading}
            error={results.error}
            empty={!results.data?.items.length}
            emptyTitle="Sin coincidencias"
            emptyDescription="Puedes ajustar la búsqueda o crear un cliente nuevo si tienes permiso."
            onRetry={() => void results.reload()}
          >
            <div className="grid gap-3">
              {results.data?.items.map((customer) => (
                <article
                  key={customer.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#e7ddd4] bg-white p-5 sm:flex-row sm:items-center"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5ede4] text-[#ad8b67]">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{customer.displayName}</p>
                      {!customer.active ? <Badge variant="outline">Inactivo</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {[customer.phone, customer.email].filter(Boolean).join(" · ") || "Sin contacto"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {customer.source?.name ?? "Sin procedencia"} · v{customer.version}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => { setRecordCustomer(customer); setRecord(null); setRecordError(null); setRecordSecret(""); }}>
                      <Eye className="mr-2 h-4 w-4" /> Expediente
                    </Button>
                    {canWrite ? <Button variant="outline" onClick={() => openEdit(customer)}><Pencil className="mr-2 h-4 w-4" /> Editar</Button> : null}
                  </div>
                </article>
              ))}
            </div>
          </QueryBoundary>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
            <DialogDescription>
              Se validarán teléfono y correo contra la identidad compartida antes de guardar.
            </DialogDescription>
          </DialogHeader>
          <ConflictNotice
            message={conflict}
            onReload={() => {
              setConflict(null);
              setDialogOpen(false);
              if (query.length >= 2) void results.reload();
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="customer-name">Nombre</Label>
              <Input
                id="customer-name"
                className="mt-1.5"
                value={draft.displayName}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, displayName: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Teléfono</Label>
              <Input
                id="customer-phone"
                className="mt-1.5"
                value={draft.phone}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, phone: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="customer-email">Correo</Label>
              <Input
                id="customer-email"
                className="mt-1.5"
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, email: event.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Procedencia</Label>
              <Select
                value={draft.sourceId || "NONE"}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    sourceId: value === "NONE" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin procedencia</SelectItem>
                  {sources.data?.filter((source) => source.active).map((source) => (
                    <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="customer-notes">Notas</Label>
              <Textarea
                id="customer-notes"
                className="mt-1.5"
                value={draft.notes}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, notes: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(recordCustomer)} onOpenChange={(open) => { if (!open) setRecordCustomer(null); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expediente de {recordCustomer?.displayName}</DialogTitle>
            <DialogDescription>La lectura de perfil, visitas y finanzas se autoriza y audita por separado.</DialogDescription>
          </DialogHeader>
          {!record ? (
            <div className="space-y-4 rounded-2xl border bg-slate-50 p-5">
              <div><Label htmlFor="record-secret">Código personal</Label><Input id="record-secret" className="mt-1.5" type="password" value={recordSecret} onChange={(event) => setRecordSecret(event.target.value)} /></div>
              {recordError ? <p className="text-sm text-red-600">{recordError}</p> : null}
              <Button disabled={recordLoading || !recordSecret || !bootstrap?.secondaryAuthorizationConfigured} onClick={() => void loadSensitiveRecord()}>{recordLoading ? "Autorizando…" : "Autorizar consulta"}</Button>
              {!bootstrap?.secondaryAuthorizationConfigured ? <p className="text-sm text-amber-700">Configura primero tu código personal en Configuraciones.</p> : null}
            </div>
          ) : (
            <div className="space-y-5">
              <Card><CardContent className="pt-5"><h3 className="font-semibold">Perfil</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-400">Nombre</dt><dd>{record.detail.displayName}</dd></div><div><dt className="text-slate-400">Preferencia</dt><dd>{record.detail.profile?.contactPreference ?? "Sin definir"}</dd></div><div><dt className="text-slate-400">Teléfono</dt><dd>{record.detail.phone ?? "—"}</dd></div><div><dt className="text-slate-400">Correo</dt><dd>{record.detail.email ?? "—"}</dd></div></dl>{record.detail.notes ? <p className="mt-3 text-sm text-slate-600">{record.detail.notes}</p> : null}</CardContent></Card>
              <Card><CardContent className="pt-5"><h3 className="font-semibold">Visitas ({record.visits.total})</h3><div className="mt-3 space-y-2">{record.visits.items.length ? record.visits.items.map((visit) => <div key={visit.id} className="rounded-xl border p-3 text-sm"><p className="font-medium">{visit.serviceName}</p><p className="text-slate-500">{visit.branchName} · {visit.status} · {visit.scheduledAt ? new Date(visit.scheduledAt).toLocaleString("es-MX") : "Sin fecha"}</p></div>) : <p className="text-sm text-slate-500">Sin visitas registradas.</p>}</div></CardContent></Card>
              <Card><CardContent className="pt-5"><h3 className="font-semibold">Historial financiero POS ({record.financial.total})</h3><div className="mt-3 space-y-2">{record.financial.items.length ? record.financial.items.map((ticket) => <div key={ticket.ticketId} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-3"><p className="font-medium">{ticket.folio}</p><span>${ticket.total}</span></div><p className="text-slate-500">{ticket.branchName} · {ticket.status} · pagado ${ticket.amountPaid}</p></div>) : <p className="text-sm text-slate-500">Sin movimientos financieros.</p>}</div><p className="mt-3 text-xs text-slate-400">Autoridad: {record.financial.authority}</p></CardContent></Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
