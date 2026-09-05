"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  SchedulerAppointmentDto,
  SchedulerAppointmentStatus,
  SchedulerOperationalCatalogDto,
} from "@cosmetics/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { CalendarDays, LockKeyhole, Plus, RefreshCw } from "lucide-react";
import { schedulerApi } from "@/lib/api";
import { useSchedulerSession } from "@/lib/session";
import {
  ConflictNotice,
  QueryBoundary,
  WorkspaceHeader,
  runSchedulerMutation,
  useSchedulerQuery,
} from "./ApiState";

const statuses: SchedulerAppointmentStatus[] = [
  "PENDING",
  "RESERVED",
  "CONFIRMED",
  "ARRIVED",
  "WAITING",
  "ATTENDED",
  "NO_SHOW",
  "CANCELED",
];

const statusLabels: Record<SchedulerAppointmentStatus, string> = {
  PENDING: "Pendiente",
  RESERVED: "Reservada",
  CONFIRMED: "Confirmada",
  ARRIVED: "Llegó",
  WAITING: "En espera",
  ATTENDED: "Atendida",
  NO_SHOW: "No asistió",
  CANCELED: "Cancelada",
};

function todayInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dayBounds(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatDateTime(value: string, timezone?: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timezone ? { timeZone: timezone } : {}),
  }).format(new Date(value));
}

interface AppointmentDraft {
  customerQuery: string;
  customerId: string;
  serviceProfileId: string;
  professionalProfileId: string;
  startsAt: string;
  notes: string;
}

const emptyDraft: AppointmentDraft = {
  customerQuery: "",
  customerId: "",
  serviceProfileId: "",
  professionalProfileId: "",
  startsAt: "",
  notes: "",
};

export function ApiAgendaWorkspace() {
  const { bootstrap, canAccess } = useSchedulerSession();
  const canWrite = canAccess("agenda", "WRITE");
  const [date, setDate] = useState(todayInput);
  const [branchId, setBranchId] = useState(
    bootstrap?.authorizedBranchIds[0] ?? "",
  );
  const [status, setStatus] = useState<SchedulerAppointmentStatus | "ALL">(
    "ALL",
  );
  const [showCreate, setShowCreate] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [draft, setDraft] = useState<AppointmentDraft>(emptyDraft);
  const [blockDraft, setBlockDraft] = useState({
    startsAt: `${date}T09:00`,
    endsAt: `${date}T10:00`,
    reason: "",
    professionalProfileId: "",
    resourceId: "",
  });
  const [mutationBusy, setMutationBusy] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const bounds = useMemo(() => dayBounds(date), [date]);

  const catalog = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
  );
  const agenda = useSchedulerQuery(
    async () => {
      const [appointments, blocks] = await Promise.all([
        schedulerApi.appointments({
          branchId,
          ...bounds,
          ...(status === "ALL" ? {} : { status }),
          page: 1,
          pageSize: 100,
        }),
        schedulerApi.scheduleBlocks({ branchId, ...bounds }),
      ]);
      return { appointments, blocks };
    },
    [branchId, bounds.from, bounds.to, status],
    Boolean(branchId),
  );

  useEffect(() => {
    if (!branchId && bootstrap?.authorizedBranchIds[0]) {
      setBranchId(bootstrap.authorizedBranchIds[0]);
    }
  }, [bootstrap, branchId]);
  useEffect(() => {
    setBlockDraft((value) => ({
      ...value,
      startsAt: `${date}T09:00`,
      endsAt: `${date}T10:00`,
    }));
  }, [date]);

  const branchProfile = catalog.data?.branches.find(
    (branch) => branch.branchId === branchId,
  );
  const services =
    catalog.data?.services.filter(
      (service) =>
        service.active &&
        (!branchProfile || service.branchProfileIds.includes(branchProfile.id)),
    ) ?? [];
  const professionals =
    catalog.data?.professionals.filter(
      (professional) =>
        professional.active &&
        (!branchProfile ||
          professional.branchProfileIds.includes(branchProfile.id)),
    ) ?? [];

  const customers = useSchedulerQuery(
    () =>
      schedulerApi.searchCustomers({
        query: draft.customerQuery.trim(),
        branchId,
        page: 1,
        pageSize: 10,
      }),
    [draft.customerQuery, branchId],
    draft.customerQuery.trim().length >= 2 && Boolean(branchId),
  );

  const availability = useSchedulerQuery(
    () =>
      schedulerApi.availability({
        branchId,
        serviceProfileId: draft.serviceProfileId,
        date,
        ...(draft.professionalProfileId
          ? { professionalProfileId: draft.professionalProfileId }
          : {}),
      }),
    [branchId, draft.serviceProfileId, draft.professionalProfileId, date],
    Boolean(branchId && draft.serviceProfileId),
  );

  async function mutate(action: () => Promise<unknown>, success: string) {
    setMutationBusy(true);
    setConflict(null);
    await runSchedulerMutation(action, {
      onSuccess: async () => {
        toast.success(success);
        setShowCreate(false);
        setShowBlock(false);
        setDraft(emptyDraft);
        await agenda.reload();
      },
      onError: toast.error,
      onConflict: (message) => setConflict(message),
    });
    setMutationBusy(false);
  }

  function createAppointment() {
    const service = services.find(
      (item) => item.id === draft.serviceProfileId,
    );
    const slot = availability.data?.slots.find(
      (item) =>
        item.startsAt === draft.startsAt &&
        item.professionalProfileId === draft.professionalProfileId,
    );
    if (!service || !slot || !draft.customerId) {
      toast.error("Selecciona cliente, servicio y horario disponible.");
      return;
    }
    void mutate(
      () =>
        schedulerApi.createAppointment(
          {
            branchId,
            customerId: draft.customerId,
            startsAt: slot.startsAt,
            status: "RESERVED",
            notes: draft.notes.trim() || null,
            services: [
              {
                serviceProfileId: service.id,
                professionalProfileIds: [slot.professionalProfileId],
                resourceIds: slot.resourceIds,
              },
            ],
          },
          crypto.randomUUID(),
        ),
      "Cita creada.",
    );
  }

  function changeStatus(
    appointment: SchedulerAppointmentDto,
    next: SchedulerAppointmentStatus,
  ) {
    if (next === "CANCELED") {
      const reason = window.prompt("Motivo de cancelación");
      if (!reason?.trim()) return;
      void mutate(
        () =>
          schedulerApi.cancelAppointment(appointment.id, {
            expectedVersion: appointment.version,
            reason: reason.trim(),
          }),
        "Cita cancelada.",
      );
      return;
    }
    void mutate(
      () =>
        schedulerApi.changeAppointmentStatus(appointment.id, {
          status: next,
          expectedVersion: appointment.version,
        }),
      "Estado actualizado.",
    );
  }

  function createBlock() {
    if (!blockDraft.reason.trim()) {
      toast.error("Captura el motivo del bloqueo.");
      return;
    }
    void mutate(
      () => schedulerApi.createScheduleBlock({
        branchId,
        startsAt: new Date(blockDraft.startsAt).toISOString(),
        endsAt: new Date(blockDraft.endsAt).toISOString(),
        reason: blockDraft.reason.trim(),
        professionalProfileId: blockDraft.professionalProfileId || null,
        resourceId: blockDraft.resourceId || null,
      }),
      "Bloqueo creado.",
    );
  }

  function moveAppointment(appointment: SchedulerAppointmentDto) {
    const next = window.prompt(
      "Nuevo instante ISO con zona horaria",
      appointment.startsAt,
    );
    if (!next) return;
    const parsed = new Date(next);
    if (Number.isNaN(parsed.valueOf())) {
      toast.error("La nueva fecha no es válida.");
      return;
    }
    void mutate(
      () => schedulerApi.moveAppointment(appointment.id, {
        startsAt: parsed.toISOString(),
        expectedVersion: appointment.version,
      }),
      "Cita movida.",
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <WorkspaceHeader
        eyebrow="Operación canónica"
        title="Agenda"
        description="Citas, estados y bloqueos cargados directamente desde Scheduler. Los horarios se muestran en la zona de cada sucursal."
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setShowBlock((value) => !value); setShowCreate(false); }}>
                <LockKeyhole className="mr-2 h-4 w-4" /> Nuevo bloqueo
              </Button>
              <Button onClick={() => { setShowCreate((value) => !value); setShowBlock(false); }}>
                <Plus className="mr-2 h-4 w-4" /> Nueva cita
              </Button>
            </div>
          ) : (
            <Badge variant="outline">
              <LockKeyhole className="mr-1 h-3.5 w-3.5" /> Sólo lectura
            </Badge>
          )
        }
      />

      <div className="space-y-5 px-5 py-6 sm:px-7 lg:px-10">
        <div className="grid gap-4 rounded-2xl border border-[#e7ddd4] bg-white p-4 md:grid-cols-3">
          <div>
            <Label htmlFor="agenda-branch">Sucursal</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger id="agenda-branch" className="mt-1.5">
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
          <div>
            <Label htmlFor="agenda-date">Fecha</Label>
            <Input
              id="agenda-date"
              className="mt-1.5"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="agenda-status">Estado</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as SchedulerAppointmentStatus | "ALL")
              }
            >
              <SelectTrigger id="agenda-status" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {statuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {statusLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ConflictNotice
          message={conflict}
          onReload={() => {
            setConflict(null);
            void agenda.reload();
          }}
        />

        {showCreate ? (
          <Card className="border-[#ddcdbf]">
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="customer-search">Buscar cliente</Label>
                <Input
                  id="customer-search"
                  className="mt-1.5"
                  placeholder="Nombre, teléfono o correo (mínimo 2 caracteres)"
                  value={draft.customerQuery}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      customerQuery: event.target.value,
                      customerId: "",
                    }))
                  }
                />
                {customers.data?.items.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {customers.data.items.map((customer) => (
                      <Button
                        key={customer.id}
                        size="sm"
                        type="button"
                        variant={
                          draft.customerId === customer.id ? "default" : "outline"
                        }
                        onClick={() =>
                          setDraft((value) => ({
                            ...value,
                            customerId: customer.id,
                            customerQuery: customer.displayName,
                          }))
                        }
                      >
                        {customer.displayName}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <Label>Servicio</Label>
                <Select
                  value={draft.serviceProfileId}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      serviceProfileId: value,
                      startsAt: "",
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} · {service.durationMinutes} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Profesional</Label>
                <Select
                  value={draft.professionalProfileId || "ANY"}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      professionalProfileId: value === "ANY" ? "" : value,
                      startsAt: "",
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Cualquier profesional</SelectItem>
                    {professionals.map((professional) => (
                      <SelectItem key={professional.id} value={professional.id}>
                        {professional.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Horario disponible</Label>
                <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {availability.loading ? (
                    <span className="text-sm text-slate-500">Calculando disponibilidad…</span>
                  ) : availability.error ? (
                    <span className="text-sm text-red-600">{availability.error}</span>
                  ) : availability.data?.slots.length ? (
                    availability.data.slots.map((slot) => (
                      <Button
                        key={`${slot.startsAt}-${slot.professionalProfileId}`}
                        size="sm"
                        type="button"
                        variant={draft.startsAt === slot.startsAt ? "default" : "outline"}
                        onClick={() =>
                          setDraft((value) => ({
                            ...value,
                            startsAt: slot.startsAt,
                            professionalProfileId: slot.professionalProfileId,
                          }))
                        }
                      >
                        {new Intl.DateTimeFormat("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: availability.data?.timezone,
                        }).format(new Date(slot.startsAt))} · {slot.professionalName}
                      </Button>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      Selecciona un servicio o no hay horarios disponibles.
                    </span>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="appointment-notes">Notas</Label>
                <Textarea
                  id="appointment-notes"
                  className="mt-1.5"
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, notes: event.target.value }))
                  }
                />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button disabled={mutationBusy} onClick={createAppointment}>
                  Guardar cita
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {showBlock ? (
          <Card className="border-[#ddcdbf]">
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
              <div><Label htmlFor="block-start">Inicio</Label><Input id="block-start" className="mt-1.5" type="datetime-local" value={blockDraft.startsAt} onChange={(event) => setBlockDraft((value) => ({ ...value, startsAt: event.target.value }))} /></div>
              <div><Label htmlFor="block-end">Fin</Label><Input id="block-end" className="mt-1.5" type="datetime-local" value={blockDraft.endsAt} onChange={(event) => setBlockDraft((value) => ({ ...value, endsAt: event.target.value }))} /></div>
              <div><Label>Profesional (opcional)</Label><Select value={blockDraft.professionalProfileId || "ALL"} onValueChange={(value) => setBlockDraft((current) => ({ ...current, professionalProfileId: value === "ALL" ? "" : value }))}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Toda la sucursal</SelectItem>{professionals.map((professional) => <SelectItem key={professional.id} value={professional.id}>{professional.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Recurso (opcional)</Label><Select value={blockDraft.resourceId || "NONE"} onValueChange={(value) => setBlockDraft((current) => ({ ...current, resourceId: value === "NONE" ? "" : value }))}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">Sin recurso específico</SelectItem>{catalog.data?.resources.filter((resource) => resource.branchProfileId === branchProfile?.id && resource.active).map((resource) => <SelectItem key={resource.id} value={resource.id}>{resource.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2"><Label htmlFor="block-reason">Motivo</Label><Input id="block-reason" className="mt-1.5" value={blockDraft.reason} onChange={(event) => setBlockDraft((value) => ({ ...value, reason: event.target.value }))} /></div>
              <div className="flex gap-2 md:col-span-2"><Button disabled={mutationBusy} onClick={createBlock}>Guardar bloqueo</Button><Button variant="outline" onClick={() => setShowBlock(false)}>Cancelar</Button></div>
            </CardContent>
          </Card>
        ) : null}

        <QueryBoundary
          loading={agenda.loading || catalog.loading}
          error={agenda.error ?? catalog.error}
          empty={!agenda.data?.appointments.items.length && !agenda.data?.blocks.length}
          emptyTitle="Día disponible"
          emptyDescription="No hay citas ni bloqueos canónicos para esta fecha."
          onRetry={() => {
            void catalog.reload();
            void agenda.reload();
          }}
        >
          <div className="grid gap-3">
            {agenda.data?.blocks.map((block) => (
              <article
                key={block.id}
                className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4"
              >
                <LockKeyhole className="h-5 w-5 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Bloqueo · {block.reason}</p>
                  <p className="text-sm text-slate-500">
                    {formatDateTime(block.startsAt, block.timezone)} – {formatDateTime(block.endsAt, block.timezone)}
                  </p>
                </div>
                {canWrite && block.status === "ACTIVE" ? <Button size="sm" variant="outline" onClick={() => void mutate(() => schedulerApi.cancelScheduleBlock(block.id, { expectedVersion: block.version, reason: "Cancelado desde la agenda" }), "Bloqueo cancelado.")}>Quitar bloqueo</Button> : null}
              </article>
            ))}
            {agenda.data?.appointments.items.map((appointment) => (
              <article
                key={appointment.id}
                className="rounded-2xl border border-[#e7ddd4] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5ede4] text-[#ad8b67]">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{appointment.customerName}</p>
                      <Badge variant="outline">{statusLabels[appointment.status]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDateTime(appointment.startsAt, appointment.timezone)} · {appointment.services.map((service) => service.serviceName).join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {appointment.branchName} · v{appointment.version} · {appointment.origin}
                    </p>
                  </div>
                  {canWrite && appointment.status !== "CANCELED" ? (
                    <div className="flex flex-col gap-2 sm:flex-row"><Button size="sm" variant="outline" onClick={() => moveAppointment(appointment)}>Mover</Button><Select
                      value={appointment.status}
                      disabled={mutationBusy}
                      onValueChange={(value) =>
                        changeStatus(
                          appointment,
                          value as SchedulerAppointmentStatus,
                        )
                      }
                    >
                      <SelectTrigger className="w-full md:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((item) => (
                          <SelectItem key={item} value={item}>
                            {statusLabels[item]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select></div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </QueryBoundary>
        <Button variant="ghost" onClick={() => void agenda.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
        </Button>
      </div>
    </div>
  );
}
