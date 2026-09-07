"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Plus,
  Save,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import type {
  SchedulerAvailabilityOwnerType,
  SchedulerOperationalCatalogDto,
} from "@cosmetics/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  Input,
  Label,
  MultiCombobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import { schedulerApi } from "@/lib/api";
import {
  buildSchedulerAvailabilityDraft,
  buildSchedulerAvailabilityRules,
  schedulerAdministrationInvalidations,
  schedulerWeekdayOptions,
  type SchedulerAvailabilityDayDraft,
} from "@/lib/scheduler-administration-presentation";
import {
  ConflictNotice,
  invalidateSchedulerQueries,
  runSchedulerMutation,
} from "@/components/api/ApiState";
import { AdministrationCoverageNotice } from "./RestoredAdministrationFrame";

type OperationalSection = "locals" | "professionals" | "services" | "resources";

interface OwnerOption {
  id: string;
  label: string;
  branchProfileIds: string[];
}

function AvailabilityManager({
  catalog,
  ownerType,
  owners,
  canAdmin,
  onSaved,
}: {
  catalog: SchedulerOperationalCatalogDto;
  ownerType: SchedulerAvailabilityOwnerType;
  owners: OwnerOption[];
  canAdmin: boolean;
  onSaved: () => Promise<void>;
}) {
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const owner = owners.find((item) => item.id === ownerId) ?? owners[0];
  const ownerSignature = owners
    .map((item) => `${item.id}:${item.branchProfileIds.join(",")}`)
    .join("|");
  const branchOptions = catalog.branches.filter((branch) =>
    owner?.branchProfileIds.includes(branch.id),
  );
  const [branchProfileId, setBranchProfileId] = useState(
    branchOptions[0]?.id ?? "",
  );
  const [days, setDays] = useState<SchedulerAvailabilityDayDraft[]>(() =>
    buildSchedulerAvailabilityDraft(
      catalog.availabilityRules,
      ownerType,
      owner?.id ?? "",
      branchOptions[0]?.id,
    ),
  );
  const [exception, setException] = useState({
    date: "",
    kind: "UNAVAILABLE" as "AVAILABLE" | "UNAVAILABLE",
    start: "",
    end: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  useEffect(() => {
    const nextOwner = owners.find((item) => item.id === ownerId) ?? owners[0];
    if (!nextOwner) return;
    if (ownerId !== nextOwner.id) setOwnerId(nextOwner.id);
    setBranchProfileId((current) =>
      nextOwner.branchProfileIds.includes(current)
        ? current
        : (nextOwner.branchProfileIds[0] ?? ""),
    );
  }, [ownerId, ownerSignature, owners]);

  useEffect(() => {
    if (!owner) return;
    setDays(
      buildSchedulerAvailabilityDraft(
        catalog.availabilityRules,
        ownerType,
        owner.id,
        branchProfileId,
      ),
    );
  }, [branchProfileId, catalog.availabilityRules, owner, owner?.id, ownerType]);

  const activeExceptions = catalog.availabilityExceptions.filter(
    (item) =>
      item.ownerType === ownerType &&
      item.ownerId === owner?.id &&
      item.branchProfileId === branchProfileId &&
      item.effectiveTo === null,
  );

  async function saveSchedule() {
    if (!owner || !branchProfileId) return;
    let rules;
    try {
      rules = buildSchedulerAvailabilityRules(days);
    } catch (cause) {
      toast.warning(
        cause instanceof Error ? cause.message : "Revisa el horario.",
      );
      return;
    }
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.replaceAvailabilityRules({
          branchProfileId,
          ownerType,
          ownerId: owner.id,
          rules,
        }),
      {
        onSuccess: async () => {
          toast.success("Horario actualizado.");
          invalidateSchedulerQueries(...schedulerAdministrationInvalidations());
          await onSaved();
        },
        onError: toast.error,
        onConflict: setConflict,
      },
    );
    setSaving(false);
  }

  async function addException() {
    if (!owner || !branchProfileId || !exception.date) return;
    const hasStart = Boolean(exception.start);
    const hasEnd = Boolean(exception.end);
    if (hasStart !== hasEnd || (hasStart && exception.start >= exception.end)) {
      toast.warning(
        "El día especial debe cubrir el día completo o tener un intervalo válido.",
      );
      return;
    }
    const next = [
      ...activeExceptions.map((item) => ({
        kind: item.kind,
        date: item.date,
        startMinute: item.startMinute,
        endMinute: item.endMinute,
        reason: item.reason,
      })),
      {
        kind: exception.kind,
        date: exception.date,
        startMinute: exception.start
          ? Number(exception.start.slice(0, 2)) * 60 +
            Number(exception.start.slice(3))
          : null,
        endMinute: exception.end
          ? Number(exception.end.slice(0, 2)) * 60 +
            Number(exception.end.slice(3))
          : null,
        reason: exception.reason.trim() || null,
      },
    ];
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.replaceAvailabilityExceptions({
          branchProfileId,
          ownerType,
          ownerId: owner.id,
          exceptions: next,
        }),
      {
        onSuccess: async () => {
          setException({
            date: "",
            kind: "UNAVAILABLE",
            start: "",
            end: "",
            reason: "",
          });
          toast.success("Día especial agregado.");
          invalidateSchedulerQueries(...schedulerAdministrationInvalidations());
          await onSaved();
        },
        onError: toast.error,
        onConflict: setConflict,
      },
    );
    setSaving(false);
  }

  async function removeException(exceptionId: string) {
    if (!owner || !branchProfileId) return;
    const next = activeExceptions
      .filter((item) => item.id !== exceptionId)
      .map((item) => ({
        kind: item.kind,
        date: item.date,
        startMinute: item.startMinute,
        endMinute: item.endMinute,
        reason: item.reason,
      }));
    setSaving(true);
    await runSchedulerMutation(
      () =>
        schedulerApi.replaceAvailabilityExceptions({
          branchProfileId,
          ownerType,
          ownerId: owner.id,
          exceptions: next,
        }),
      {
        onSuccess: async () => {
          toast.success("Día especial retirado.");
          invalidateSchedulerQueries(...schedulerAdministrationInvalidations());
          await onSaved();
        },
        onError: toast.error,
        onConflict: setConflict,
      },
    );
    setSaving(false);
  }

  if (!owners.length) {
    return (
      <AdministrationCoverageNotice title="Primero activa el perfil">
        El horario se configura sobre un perfil Scheduler, no sobre el registro
        canónico sin activar.
      </AdministrationCoverageNotice>
    );
  }

  return (
    <Card className="admin-card">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-[#ad8b67]" />
          <h2 className="admin-section-title">
            Horario, descansos y días especiales
          </h2>
        </div>
        <ConflictNotice
          message={conflict}
          onReload={() => {
            setConflict(null);
            void onSaved();
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Perfil</Label>
            <Select value={owner?.id ?? ""} onValueChange={setOwnerId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {owners.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sucursal</Label>
            <Select value={branchProfileId} onValueChange={setBranchProfileId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {branchOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <div className="min-w-[720px] divide-y divide-slate-100">
            {days.map((day, index) => (
              <div
                key={day.weekday}
                className="grid grid-cols-[120px_1fr_1fr] items-center gap-4 px-4 py-3"
              >
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    disabled={!canAdmin || saving}
                    onChange={(event) =>
                      setDays((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, enabled: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  {schedulerWeekdayOptions[index]?.label}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Apertura ${schedulerWeekdayOptions[index]?.label}`}
                    type="time"
                    value={day.start}
                    disabled={!day.enabled || !canAdmin || saving}
                    onChange={(event) =>
                      setDays((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, start: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <span className="text-slate-400">a</span>
                  <Input
                    aria-label={`Cierre ${schedulerWeekdayOptions[index]?.label}`}
                    type="time"
                    value={day.end}
                    disabled={!day.enabled || !canAdmin || saving}
                    onChange={(event) =>
                      setDays((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, end: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <input
                      type="checkbox"
                      checked={day.breakEnabled}
                      disabled={!day.enabled || !canAdmin || saving}
                      onChange={(event) =>
                        setDays((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, breakEnabled: event.target.checked }
                              : item,
                          ),
                        )
                      }
                    />{" "}
                    Descanso
                  </label>
                  <Input
                    aria-label={`Inicio descanso ${schedulerWeekdayOptions[index]?.label}`}
                    type="time"
                    value={day.breakStart}
                    disabled={
                      !day.enabled || !day.breakEnabled || !canAdmin || saving
                    }
                    onChange={(event) =>
                      setDays((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, breakStart: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <Input
                    aria-label={`Fin descanso ${schedulerWeekdayOptions[index]?.label}`}
                    type="time"
                    value={day.breakEnd}
                    disabled={
                      !day.enabled || !day.breakEnabled || !canAdmin || saving
                    }
                    onChange={(event) =>
                      setDays((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, breakEnd: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {canAdmin ? (
          <Button
            onClick={() => void saveSchedule()}
            disabled={saving || !branchProfileId}
          >
            <Save className="mr-2 h-4 w-4" /> Guardar horario
          </Button>
        ) : null}

        <div className="border-t border-slate-200 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#ad8b67]" />
            <h3 className="text-sm font-semibold">Días especiales</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeExceptions.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white pl-2 text-xs"
              >
                <span>
                  {item.date} ·{" "}
                  {item.kind === "AVAILABLE" ? "Disponible" : "No disponible"}
                </span>
                {canAdmin ? (
                  <Button
                    className="h-7 px-2"
                    size="sm"
                    variant="ghost"
                    aria-label={`Retirar excepción ${item.date}`}
                    onClick={() => void removeException(item.id)}
                  >
                    ×
                  </Button>
                ) : null}
              </span>
            ))}
          </div>
          {canAdmin ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
              <div>
                <Label>Fecha</Label>
                <DatePicker
                  className="mt-1.5"
                  value={exception.date}
                  onChange={(value) =>
                    setException((current) => ({ ...current, date: value }))
                  }
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={exception.kind}
                  onValueChange={(value) =>
                    setException((current) => ({
                      ...current,
                      kind: value as "AVAILABLE" | "UNAVAILABLE",
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNAVAILABLE">No disponible</SelectItem>
                    <SelectItem value="AVAILABLE">Disponible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Desde (opcional)</Label>
                <Input
                  className="mt-1.5"
                  type="time"
                  value={exception.start}
                  onChange={(event) =>
                    setException((current) => ({
                      ...current,
                      start: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Hasta (opcional)</Label>
                <Input
                  className="mt-1.5"
                  type="time"
                  value={exception.end}
                  onChange={(event) =>
                    setException((current) => ({
                      ...current,
                      end: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Motivo</Label>
                <Input
                  className="mt-1.5"
                  value={exception.reason}
                  onChange={(event) =>
                    setException((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </div>
              <Button
                onClick={() => void addException()}
                disabled={saving || !exception.date}
              >
                <Plus className="mr-2 h-4 w-4" /> Agregar
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamCatalogPanel({
  catalog,
  canAdmin,
  onSaved,
}: {
  catalog: SchedulerOperationalCatalogDto;
  canAdmin: boolean;
  onSaved: () => Promise<void>;
}) {
  const [specialtyName, setSpecialtyName] = useState("");
  const [group, setGroup] = useState({
    name: "",
    commerceId: catalog.commerces[0]?.id ?? "",
    branchProfileId: catalog.branches[0]?.id ?? "",
    professionalProfileIds: [] as string[],
  });
  const groupBranches = useMemo(
    () =>
      catalog.branches.filter(
        (branch) => branch.commerceId === group.commerceId,
      ),
    [catalog.branches, group.commerceId],
  );

  useEffect(() => {
    setGroup((current) =>
      groupBranches.some((branch) => branch.id === current.branchProfileId)
        ? current
        : {
            ...current,
            branchProfileId: groupBranches[0]?.id ?? "",
            professionalProfileIds: [],
          },
    );
  }, [groupBranches]);

  async function createSpecialty() {
    await runSchedulerMutation(
      () =>
        schedulerApi.createSpecialty({
          commerceId: group.commerceId,
          name: specialtyName.trim(),
          active: true,
        }),
      {
        onSuccess: async () => {
          setSpecialtyName("");
          toast.success("Especialidad creada.");
          await onSaved();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
  }
  async function toggleSpecialty(
    item: SchedulerOperationalCatalogDto["specialties"][number],
  ) {
    await runSchedulerMutation(
      () =>
        schedulerApi.updateSpecialty(item.id, {
          commerceId: item.commerceId,
          name: item.name,
          active: !item.active,
        }),
      {
        onSuccess: async () => {
          toast.success("Especialidad actualizada.");
          await onSaved();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
  }
  async function createGroup() {
    await runSchedulerMutation(
      () =>
        schedulerApi.createProfessionalGroup({
          ...group,
          name: group.name.trim(),
          active: true,
        }),
      {
        onSuccess: async () => {
          setGroup((current) => ({
            ...current,
            name: "",
            professionalProfileIds: [],
          }));
          toast.success("Grupo creado.");
          await onSaved();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
  }
  async function toggleGroup(
    item: SchedulerOperationalCatalogDto["groups"][number],
  ) {
    await runSchedulerMutation(
      () =>
        schedulerApi.updateProfessionalGroup(item.id, {
          commerceId: item.commerceId,
          branchProfileId: item.branchProfileId,
          name: item.name,
          active: !item.active,
          professionalProfileIds: item.professionalProfileIds,
        }),
      {
        onSuccess: async () => {
          toast.success("Grupo actualizado.");
          await onSaved();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="admin-card">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="admin-eyebrow">Perfiles</p>
              <h2 className="admin-section-title">Especialidades</h2>
            </div>
            <Badge variant="outline">{catalog.specialties.length}</Badge>
          </div>
          <div className="space-y-2">
            {catalog.specialties.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <Badge variant={item.active ? "default" : "secondary"}>
                  {item.name}
                </Badge>
                {canAdmin ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void toggleSpecialty(item)}
                  >
                    {item.active ? "Desactivar" : "Activar"}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {canAdmin ? (
            <div className="flex gap-2">
              <Input
                value={specialtyName}
                onChange={(event) => setSpecialtyName(event.target.value)}
                placeholder="Nueva especialidad"
              />
              <Button
                onClick={() => void createSpecialty()}
                disabled={specialtyName.trim().length < 2}
              >
                <Plus className="mr-2 h-4 w-4" /> Agregar
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card className="admin-card">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="admin-eyebrow">Organización</p>
              <h2 className="admin-section-title">Grupos</h2>
            </div>
            <Badge variant="outline">{catalog.groups.length}</Badge>
          </div>
          <div className="space-y-2">
            {catalog.groups.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.professionalProfileIds.length} especialistas
                  </p>
                </div>
                {canAdmin ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void toggleGroup(item)}
                  >
                    {item.active ? "Desactivar" : "Activar"}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {canAdmin ? (
            <div className="grid gap-3">
              <Input
                value={group.name}
                onChange={(event) =>
                  setGroup((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Nombre del grupo"
              />
              <Select
                value={group.commerceId}
                onValueChange={(value) =>
                  setGroup((current) => ({ ...current, commerceId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Comercio" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.commerces.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={group.branchProfileId}
                onValueChange={(value) =>
                  setGroup((current) => ({
                    ...current,
                    branchProfileId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {groupBranches.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.branchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MultiCombobox
                options={catalog.professionals
                  .filter((item) => item.active)
                  .map((item) => ({ value: item.id, label: item.name }))}
                value={group.professionalProfileIds}
                onValueChange={(value) =>
                  setGroup((current) => ({
                    ...current,
                    professionalProfileIds: value,
                  }))
                }
                placeholder="Especialistas"
                selectedCountLabel="especialistas seleccionados"
              />
              <Button
                onClick={() => void createGroup()}
                disabled={
                  group.name.trim().length < 2 ||
                  !group.commerceId ||
                  !group.branchProfileId
                }
              >
                <UsersRound className="mr-2 h-4 w-4" /> Crear grupo
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceRelationsPanel({
  catalog,
  canAdmin,
  onSaved,
}: {
  catalog: SchedulerOperationalCatalogDto;
  canAdmin: boolean;
  onSaved: () => Promise<void>;
}) {
  const [serviceProfileId, setServiceProfileId] = useState(
    catalog.services[0]?.id ?? "",
  );
  const service =
    catalog.services.find((item) => item.id === serviceProfileId) ??
    catalog.services[0];
  const branchOptions = useMemo(
    () =>
      catalog.branches.filter((item) =>
        service?.branchProfileIds.includes(item.id),
      ),
    [catalog.branches, service?.branchProfileIds],
  );
  const [branchProfileId, setBranchProfileId] = useState(
    branchOptions[0]?.id ?? "",
  );
  const selectedProfessionals = useMemo(
    () =>
      catalog.professionalServices
        .filter(
          (item) =>
            item.serviceProfileId === service?.id &&
            item.branchProfileId === branchProfileId &&
            item.active,
        )
        .map((item) => item.professionalProfileId),
    [branchProfileId, catalog.professionalServices, service?.id],
  );
  const selectedResources = useMemo(
    () =>
      catalog.resourceRequirements
        .filter(
          (item) =>
            item.serviceProfileId === service?.id &&
            item.active &&
            catalog.resources.some(
              (resource) =>
                resource.id === item.resourceId &&
                resource.branchProfileId === branchProfileId,
            ),
        )
        .map((item) => item.resourceId),
    [
      branchProfileId,
      catalog.resourceRequirements,
      catalog.resources,
      service?.id,
    ],
  );
  const [professionalIds, setProfessionalIds] = useState(selectedProfessionals);
  const [resourceIds, setResourceIds] = useState(selectedResources);

  useEffect(() => {
    setProfessionalIds(selectedProfessionals);
    setResourceIds(selectedResources);
  }, [selectedProfessionals, selectedResources]);
  useEffect(() => {
    setBranchProfileId((current) =>
      branchOptions.some((item) => item.id === current)
        ? current
        : (branchOptions[0]?.id ?? ""),
    );
  }, [branchOptions]);

  async function saveRelations() {
    if (!service || !branchProfileId) return;
    const existingProfessionals = catalog.professionalServices.filter(
      (item) =>
        item.serviceProfileId === service.id &&
        item.branchProfileId === branchProfileId,
    );
    const branchResourceIds = new Set(
      catalog.resources
        .filter((item) => item.branchProfileId === branchProfileId)
        .map((item) => item.id),
    );
    const existingResources = catalog.resourceRequirements.filter(
      (item) =>
        item.serviceProfileId === service.id &&
        branchResourceIds.has(item.resourceId),
    );
    const professionalTargets = new Set([
      ...existingProfessionals.map((item) => item.professionalProfileId),
      ...professionalIds,
    ]);
    const resourceTargets = new Set([
      ...existingResources.map((item) => item.resourceId),
      ...resourceIds,
    ]);
    await runSchedulerMutation(
      async () => {
        await Promise.all([
          ...Array.from(professionalTargets).map((professionalProfileId) =>
            schedulerApi.updateProfessionalService({
              professionalProfileId,
              serviceProfileId: service.id,
              branchProfileId,
              active: professionalIds.includes(professionalProfileId),
            }),
          ),
          ...Array.from(resourceTargets).map((resourceId) =>
            schedulerApi.updateResourceRequirement({
              serviceProfileId: service.id,
              resourceId,
              requiredUnits: 1,
              exclusive:
                catalog.resources.find((item) => item.id === resourceId)
                  ?.exclusive ?? true,
              active: resourceIds.includes(resourceId),
            }),
          ),
        ]);
      },
      {
        onSuccess: async () => {
          toast.success("Asignaciones actualizadas.");
          await onSaved();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: schedulerAdministrationInvalidations(),
      },
    );
  }

  if (!service) return null;
  return (
    <Card className="admin-card">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-[#ad8b67]" />
          <h2 className="admin-section-title">
            Asignaciones y compatibilidades
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Servicio activo</Label>
            <Select value={service.id} onValueChange={setServiceProfileId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {catalog.services.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sucursal</Label>
            <Select value={branchProfileId} onValueChange={setBranchProfileId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {branchOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Especialistas</Label>
            <MultiCombobox
              className="mt-1.5"
              options={catalog.professionals
                .filter(
                  (item) =>
                    item.active &&
                    item.branchProfileIds.includes(branchProfileId),
                )
                .map((item) => ({ value: item.id, label: item.name }))}
              value={professionalIds}
              onValueChange={setProfessionalIds}
              placeholder="Selecciona especialistas"
              selectedCountLabel="especialistas seleccionados"
              disabled={!canAdmin}
            />
          </div>
          <div>
            <Label>Recursos requeridos</Label>
            <MultiCombobox
              className="mt-1.5"
              options={catalog.resources
                .filter(
                  (item) =>
                    item.active && item.branchProfileId === branchProfileId,
                )
                .map((item) => ({ value: item.id, label: item.name }))}
              value={resourceIds}
              onValueChange={setResourceIds}
              placeholder="Selecciona recursos"
              selectedCountLabel="recursos seleccionados"
              disabled={!canAdmin}
            />
          </div>
        </div>
        {canAdmin ? (
          <Button
            onClick={() => void saveRelations()}
            disabled={!branchProfileId}
          >
            <Save className="mr-2 h-4 w-4" /> Guardar asignaciones
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdministrationRelationsPanel({
  section,
  catalog,
  canAdmin,
  onSaved,
}: {
  section: OperationalSection;
  catalog: SchedulerOperationalCatalogDto;
  canAdmin: boolean;
  onSaved: () => Promise<void>;
}) {
  if (section === "professionals") {
    return (
      <div className="space-y-5">
        <TeamCatalogPanel
          catalog={catalog}
          canAdmin={canAdmin}
          onSaved={onSaved}
        />
        <AvailabilityManager
          catalog={catalog}
          ownerType="PROFESSIONAL"
          owners={catalog.professionals.map((item) => ({
            id: item.id,
            label: item.name,
            branchProfileIds: item.branchProfileIds,
          }))}
          canAdmin={canAdmin}
          onSaved={onSaved}
        />
      </div>
    );
  }
  if (section === "services")
    return (
      <ServiceRelationsPanel
        catalog={catalog}
        canAdmin={canAdmin}
        onSaved={onSaved}
      />
    );
  if (section === "resources") {
    return (
      <AvailabilityManager
        catalog={catalog}
        ownerType="RESOURCE"
        owners={catalog.resources.map((item) => ({
          id: item.id,
          label: item.name,
          branchProfileIds: [item.branchProfileId],
        }))}
        canAdmin={canAdmin}
        onSaved={onSaved}
      />
    );
  }
  return (
    <AvailabilityManager
      catalog={catalog}
      ownerType="BRANCH"
      owners={catalog.branches.map((item) => ({
        id: item.id,
        label: item.branchName,
        branchProfileIds: [item.id],
      }))}
      canAdmin={canAdmin}
      onSaved={onSaved}
    />
  );
}
