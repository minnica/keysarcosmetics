"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Box,
  Building2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Input,
  Label,
  MultiCombobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  toast,
  type ColumnDef,
} from "@cosmetics/ui";
import type {
  SchedulerOperationalCandidatesDto,
  SchedulerOperationalCatalogDto,
  SchedulerResourceKind,
  SchedulerScreenKey,
  SchedulerServiceMode,
} from "@cosmetics/types";
import { schedulerApi, schedulerApiErrorMessage } from "@/lib/api";
import { useSchedulerSession } from "@/lib/session";

type OperationalSection = "locals" | "professionals" | "services" | "resources";
type BranchCandidate = SchedulerOperationalCandidatesDto["branches"][number];
type EmployeeCandidate = SchedulerOperationalCandidatesDto["employees"][number];
type ServiceCandidate = SchedulerOperationalCandidatesDto["services"][number];

const sectionCopy: Record<
  OperationalSection,
  { title: string; description: string; screen: SchedulerScreenKey }
> = {
  locals: {
    title: "Comercios y sucursales",
    description:
      "Activa sucursales existentes y define la frontera operativa de su agenda.",
    screen: "scheduler/administration/locals",
  },
  professionals: {
    title: "Especialistas",
    description:
      "Convierte empleados existentes en profesionales agendables de forma explícita.",
    screen: "scheduler/administration/professionals",
  },
  services: {
    title: "Servicios y clases",
    description:
      "Configura duración, capacidad y sucursales sobre el catálogo comercial real.",
    screen: "scheduler/administration/services",
  },
  resources: {
    title: "Recursos físicos",
    description:
      "Administra cabinas, equipos y estaciones sin confundirlos con profesionales.",
    screen: "scheduler/administration/resources",
  },
};

function StatusBadge({
  active,
  configured = true,
}: {
  active: boolean | null;
  configured?: boolean;
}) {
  if (!configured || active === null)
    return <Badge variant="outline">Sin configurar</Badge>;
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Activo" : "Inactivo"}
    </Badge>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" aria-label="Cargando catálogo operativo">
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  return message ? (
    <p className="mt-1 text-sm text-red-700" role="alert">
      {message}
    </p>
  ) : null;
}

const branchFormSchema = z.object({
  commerceId: z.string().min(1, "Selecciona un comercio"),
  timezone: z.string().min(1, "Captura una zona horaria IANA"),
  active: z.boolean(),
  bookingEnabled: z.boolean(),
});
type BranchForm = z.infer<typeof branchFormSchema>;

function BranchEditor({
  candidate,
  catalog,
  onSaved,
  canAdmin,
}: {
  candidate: BranchCandidate;
  catalog: SchedulerOperationalCatalogDto;
  onSaved: () => Promise<void>;
  canAdmin: boolean;
}) {
  const profile = catalog.branches.find(
    (item) => item.branchId === candidate.id,
  );
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<BranchForm>({
    defaultValues: {
      commerceId: profile?.commerceId ?? catalog.commerces[0]?.id ?? "",
      timezone: profile?.timezone ?? "America/Mexico_City",
      active: profile?.active ?? false,
      bookingEnabled: profile?.bookingEnabled ?? false,
    },
  });

  const submit = handleSubmit(async (values) => {
    const parsed = branchFormSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        setError(issue.path[0] as keyof BranchForm, { message: issue.message });
      return;
    }
    setSaving(true);
    try {
      await schedulerApi.updateBranchProfile(candidate.id, {
        ...parsed.data,
        ...(profile ? { expectedVersion: profile.version } : {}),
      });
      toast.success("Perfil de sucursal guardado");
      await onSaved();
    } catch (error) {
      toast.error(
        schedulerApiErrorMessage(error, "No fue posible guardar la sucursal."),
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{candidate.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit} noValidate>
          <div>
            <Label htmlFor="branch-commerce">Comercio</Label>
            <Select
              value={watch("commerceId")}
              onValueChange={(value) =>
                setValue("commerceId", value, { shouldDirty: true })
              }
              disabled={!canAdmin || saving}
            >
              <SelectTrigger id="branch-commerce" className="mt-2">
                <SelectValue placeholder="Selecciona un comercio" />
              </SelectTrigger>
              <SelectContent>
                {catalog.commerces.map((commerce) => (
                  <SelectItem key={commerce.id} value={commerce.id}>
                    {commerce.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.commerceId?.message} />
          </div>
          <div>
            <Label htmlFor="branch-timezone">Zona horaria IANA</Label>
            <Input
              id="branch-timezone"
              className="mt-2"
              {...register("timezone")}
              disabled={!canAdmin || saving}
              aria-invalid={Boolean(errors.timezone)}
            />
            <FieldError message={errors.timezone?.message} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={watch("active") ? "default" : "outline"}
              onClick={() =>
                setValue("active", !watch("active"), { shouldDirty: true })
              }
              disabled={!canAdmin || saving}
            >
              {watch("active") ? "Perfil activo" : "Perfil inactivo"}
            </Button>
            <Button
              type="button"
              variant={watch("bookingEnabled") ? "default" : "outline"}
              onClick={() =>
                setValue("bookingEnabled", !watch("bookingEnabled"), {
                  shouldDirty: true,
                })
              }
              disabled={!canAdmin || saving}
            >
              {watch("bookingEnabled")
                ? "Reservas habilitadas"
                : "Reservas deshabilitadas"}
            </Button>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-700">
            Las reservas sólo pueden habilitarse cuando ya existen horario
            general, profesional y servicio activos.
          </p>
          <Button
            type="submit"
            disabled={!canAdmin || saving || catalog.commerces.length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando…" : "Guardar perfil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const professionalFormSchema = z
  .object({
    biography: z.string().max(5000).nullable(),
    acceptsOnline: z.boolean(),
    active: z.boolean(),
    branchProfileIds: z.array(z.string()),
    specialtyIds: z.array(z.string()),
  })
  .superRefine((value, context) => {
    if (value.active && value.branchProfileIds.length === 0)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchProfileIds"],
        message: "Selecciona al menos una sucursal",
      });
  });
type ProfessionalForm = z.infer<typeof professionalFormSchema>;

function ProfessionalEditor({
  candidate,
  catalog,
  onSaved,
  canAdmin,
}: {
  candidate: EmployeeCandidate;
  catalog: SchedulerOperationalCatalogDto;
  onSaved: () => Promise<void>;
  canAdmin: boolean;
}) {
  const profile = catalog.professionals.find(
    (item) => item.employeeId === candidate.id,
  );
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<ProfessionalForm>({
    defaultValues: {
      biography: profile?.biography ?? "",
      acceptsOnline: profile?.acceptsOnline ?? false,
      active: profile?.active ?? false,
      branchProfileIds: profile?.branchProfileIds ?? [],
      specialtyIds: profile?.specialtyIds ?? [],
    },
  });
  const submit = handleSubmit(async (values) => {
    const parsed = professionalFormSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        setError(issue.path[0] as keyof ProfessionalForm, {
          message: issue.message,
        });
      return;
    }
    setSaving(true);
    try {
      await schedulerApi.updateProfessionalProfile(candidate.id, {
        ...parsed.data,
        biography: parsed.data.biography || null,
        ...(profile ? { expectedVersion: profile.version } : {}),
      });
      toast.success("Perfil profesional guardado");
      await onSaved();
    } catch (error) {
      toast.error(
        schedulerApiErrorMessage(
          error,
          "No fue posible guardar el perfil profesional.",
        ),
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{candidate.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit} noValidate>
          <div>
            <Label htmlFor="professional-branches">Sucursales</Label>
            <MultiCombobox
              id="professional-branches"
              className="mt-2"
              options={catalog.branches
                .filter((branch) => branch.active)
                .map((branch) => ({
                  value: branch.id,
                  label: branch.branchName,
                }))}
              value={watch("branchProfileIds")}
              onValueChange={(value) =>
                setValue("branchProfileIds", value, { shouldDirty: true })
              }
              placeholder="Selecciona sucursales"
              selectedCountLabel="sucursales seleccionadas"
              disabled={!canAdmin || saving}
            />
            <FieldError message={errors.branchProfileIds?.message} />
          </div>
          <div>
            <Label htmlFor="professional-specialties">Especialidades</Label>
            <MultiCombobox
              id="professional-specialties"
              className="mt-2"
              options={catalog.specialties
                .filter((item) => item.active)
                .map((item) => ({ value: item.id, label: item.name }))}
              value={watch("specialtyIds")}
              onValueChange={(value) =>
                setValue("specialtyIds", value, { shouldDirty: true })
              }
              placeholder="Sin especialidades"
              selectedCountLabel="especialidades seleccionadas"
              disabled={!canAdmin || saving}
            />
          </div>
          <div>
            <Label htmlFor="professional-biography">Biografía operativa</Label>
            <Textarea
              id="professional-biography"
              className="mt-2 min-h-28"
              {...register("biography")}
              disabled={!canAdmin || saving}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={watch("active") ? "default" : "outline"}
              onClick={() =>
                setValue("active", !watch("active"), { shouldDirty: true })
              }
              disabled={!canAdmin || saving}
            >
              {watch("active") ? "Profesional activo" : "Profesional inactivo"}
            </Button>
            <Button
              type="button"
              variant={watch("acceptsOnline") ? "default" : "outline"}
              onClick={() =>
                setValue("acceptsOnline", !watch("acceptsOnline"), {
                  shouldDirty: true,
                })
              }
              disabled={!canAdmin || saving}
            >
              {watch("acceptsOnline")
                ? "Reserva en línea"
                : "Sólo reserva interna"}
            </Button>
          </div>
          <Button type="submit" disabled={!canAdmin || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando…" : "Guardar profesional"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const serviceFormSchema = z
  .object({
    durationMinutes: z.coerce.number().int().min(1).max(1440),
    preparationMinutes: z.coerce.number().int().min(0).max(1440),
    cleanupMinutes: z.coerce.number().int().min(0).max(1440),
    capacity: z.coerce.number().int().min(1).max(1000),
    mode: z.enum(["INDIVIDUAL", "CLASS"]),
    acceptsOnline: z.boolean(),
    active: z.boolean(),
    branchProfileIds: z.array(z.string()),
  })
  .superRefine((value, context) => {
    if (value.active && value.branchProfileIds.length === 0)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchProfileIds"],
        message: "Selecciona al menos una sucursal",
      });
    if (value.mode === "INDIVIDUAL" && value.capacity !== 1)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capacity"],
        message: "Un servicio individual debe tener capacidad 1",
      });
  });
type ServiceForm = z.infer<typeof serviceFormSchema>;

function ServiceEditor({
  candidate,
  catalog,
  onSaved,
  canAdmin,
}: {
  candidate: ServiceCandidate;
  catalog: SchedulerOperationalCatalogDto;
  onSaved: () => Promise<void>;
  canAdmin: boolean;
}) {
  const profile = catalog.services.find(
    (item) => item.catalogItemId === candidate.id,
  );
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<ServiceForm>({
    defaultValues: {
      durationMinutes: profile?.durationMinutes ?? 60,
      preparationMinutes: profile?.preparationMinutes ?? 0,
      cleanupMinutes: profile?.cleanupMinutes ?? 0,
      capacity: profile?.capacity ?? 1,
      mode: profile?.mode ?? "INDIVIDUAL",
      acceptsOnline: profile?.acceptsOnline ?? false,
      active: profile?.active ?? false,
      branchProfileIds: profile?.branchProfileIds ?? [],
    },
  });
  const submit = handleSubmit(async (values) => {
    const parsed = serviceFormSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        setError(issue.path[0] as keyof ServiceForm, {
          message: issue.message,
        });
      return;
    }
    setSaving(true);
    try {
      await schedulerApi.updateServiceProfile(candidate.id, {
        ...parsed.data,
        ...(profile ? { expectedVersion: profile.version } : {}),
      });
      toast.success("Perfil de servicio guardado");
      await onSaved();
    } catch (error) {
      toast.error(
        schedulerApiErrorMessage(error, "No fue posible guardar el servicio."),
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{candidate.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="service-duration">Duración (min)</Label>
              <Input
                id="service-duration"
                type="number"
                className="mt-2"
                {...register("durationMinutes")}
                disabled={!canAdmin || saving}
              />
              <FieldError message={errors.durationMinutes?.message} />
            </div>
            <div>
              <Label htmlFor="service-preparation">Preparación (min)</Label>
              <Input
                id="service-preparation"
                type="number"
                className="mt-2"
                {...register("preparationMinutes")}
                disabled={!canAdmin || saving}
              />
              <FieldError message={errors.preparationMinutes?.message} />
            </div>
            <div>
              <Label htmlFor="service-cleanup">Limpieza (min)</Label>
              <Input
                id="service-cleanup"
                type="number"
                className="mt-2"
                {...register("cleanupMinutes")}
                disabled={!canAdmin || saving}
              />
              <FieldError message={errors.cleanupMinutes?.message} />
            </div>
            <div>
              <Label htmlFor="service-capacity">Capacidad</Label>
              <Input
                id="service-capacity"
                type="number"
                className="mt-2"
                {...register("capacity")}
                disabled={!canAdmin || saving}
              />
              <FieldError message={errors.capacity?.message} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="service-mode">Modalidad</Label>
              <Select
                value={watch("mode")}
                onValueChange={(value: SchedulerServiceMode) => {
                  setValue("mode", value, { shouldDirty: true });
                  if (value === "INDIVIDUAL")
                    setValue("capacity", 1, { shouldDirty: true });
                }}
                disabled={!canAdmin || saving}
              >
                <SelectTrigger id="service-mode" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">
                    Servicio individual
                  </SelectItem>
                  <SelectItem value="CLASS">Clase con capacidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="service-branches">Sucursales</Label>
              <MultiCombobox
                id="service-branches"
                className="mt-2"
                options={catalog.branches
                  .filter((branch) => branch.active)
                  .map((branch) => ({
                    value: branch.id,
                    label: branch.branchName,
                  }))}
                value={watch("branchProfileIds")}
                onValueChange={(value) =>
                  setValue("branchProfileIds", value, { shouldDirty: true })
                }
                placeholder="Selecciona sucursales"
                selectedCountLabel="sucursales seleccionadas"
                disabled={!canAdmin || saving}
              />
              <FieldError message={errors.branchProfileIds?.message} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={watch("active") ? "default" : "outline"}
              onClick={() =>
                setValue("active", !watch("active"), { shouldDirty: true })
              }
              disabled={!canAdmin || saving}
            >
              {watch("active") ? "Servicio activo" : "Servicio inactivo"}
            </Button>
            <Button
              type="button"
              variant={watch("acceptsOnline") ? "default" : "outline"}
              onClick={() =>
                setValue("acceptsOnline", !watch("acceptsOnline"), {
                  shouldDirty: true,
                })
              }
              disabled={!canAdmin || saving}
            >
              {watch("acceptsOnline")
                ? "Reserva en línea"
                : "Sólo reserva interna"}
            </Button>
          </div>
          <Button type="submit" disabled={!canAdmin || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando…" : "Guardar servicio"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const resourceFormSchema = z.object({
  branchProfileId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  kind: z.enum(["ROOM", "EQUIPMENT", "STATION", "OTHER"]),
  capacity: z.coerce.number().int().min(1).max(1000),
  exclusive: z.boolean(),
  acceptsOnline: z.boolean(),
  active: z.boolean(),
});
type ResourceForm = z.infer<typeof resourceFormSchema>;

function ResourceEditor({
  catalog,
  resourceId,
  onSaved,
  canAdmin,
}: {
  catalog: SchedulerOperationalCatalogDto;
  resourceId: string | null;
  onSaved: () => Promise<void>;
  canAdmin: boolean;
}) {
  const resource = catalog.resources.find((item) => item.id === resourceId);
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResourceForm>({
    defaultValues: {
      branchProfileId:
        resource?.branchProfileId ??
        catalog.branches.find((item) => item.active)?.id ??
        "",
      name: resource?.name ?? "",
      kind: resource?.kind ?? "ROOM",
      capacity: resource?.capacity ?? 1,
      exclusive: resource?.exclusive ?? true,
      acceptsOnline: resource?.acceptsOnline ?? false,
      active: resource?.active ?? true,
    },
  });
  const submit = handleSubmit(async (values) => {
    const parsed = resourceFormSchema.safeParse(values);
    if (!parsed.success)
      return toast.warning(
        "Revisa los campos obligatorios y la capacidad del recurso.",
      );
    setSaving(true);
    try {
      const input = {
        ...parsed.data,
        ...(resource ? { expectedVersion: resource.version } : {}),
      };
      if (resource) await schedulerApi.updateResource(resource.id, input);
      else await schedulerApi.createResource(input);
      toast.success(resource ? "Recurso actualizado" : "Recurso creado");
      await onSaved();
    } catch (error) {
      toast.error(
        schedulerApiErrorMessage(error, "No fue posible guardar el recurso."),
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {resource ? `Editar ${resource.name}` : "Nuevo recurso"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="resource-name">Nombre</Label>
              <Input
                id="resource-name"
                className="mt-2"
                {...register("name")}
                disabled={!canAdmin || saving}
                aria-invalid={Boolean(errors.name)}
              />
            </div>
            <div>
              <Label htmlFor="resource-branch">Sucursal</Label>
              <Select
                value={watch("branchProfileId")}
                onValueChange={(value) =>
                  setValue("branchProfileId", value, { shouldDirty: true })
                }
                disabled={!canAdmin || saving || Boolean(resource)}
              >
                <SelectTrigger id="resource-branch" className="mt-2">
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.branches
                    .filter((item) => item.active)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.branchName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resource-kind">Tipo</Label>
              <Select
                value={watch("kind")}
                onValueChange={(value: SchedulerResourceKind) =>
                  setValue("kind", value, { shouldDirty: true })
                }
                disabled={!canAdmin || saving}
              >
                <SelectTrigger id="resource-kind" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROOM">Cabina / sala</SelectItem>
                  <SelectItem value="EQUIPMENT">Equipo</SelectItem>
                  <SelectItem value="STATION">Estación</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resource-capacity">Capacidad</Label>
              <Input
                id="resource-capacity"
                type="number"
                className="mt-2"
                {...register("capacity")}
                disabled={!canAdmin || saving}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={watch("active") ? "default" : "outline"}
              onClick={() =>
                setValue("active", !watch("active"), { shouldDirty: true })
              }
              disabled={!canAdmin || saving}
            >
              {watch("active") ? "Recurso activo" : "Recurso inactivo"}
            </Button>
            <Button
              type="button"
              variant={watch("exclusive") ? "default" : "outline"}
              onClick={() =>
                setValue("exclusive", !watch("exclusive"), {
                  shouldDirty: true,
                })
              }
              disabled={!canAdmin || saving}
            >
              {watch("exclusive") ? "Uso exclusivo" : "Uso compartido"}
            </Button>
            <Button
              type="button"
              variant={watch("acceptsOnline") ? "default" : "outline"}
              onClick={() =>
                setValue("acceptsOnline", !watch("acceptsOnline"), {
                  shouldDirty: true,
                })
              }
              disabled={!canAdmin || saving}
            >
              {watch("acceptsOnline")
                ? "Reserva en línea"
                : "Sólo reserva interna"}
            </Button>
          </div>
          <Button
            type="submit"
            disabled={!canAdmin || saving || catalog.branches.length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando…" : "Guardar recurso"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function OperationalCatalogWorkspace({
  section,
}: {
  section: OperationalSection;
}) {
  const { bootstrap } = useSchedulerSession();
  const [candidates, setCandidates] =
    useState<SchedulerOperationalCandidatesDto | null>(null);
  const [catalog, setCatalog] = useState<SchedulerOperationalCatalogDto | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commerceName, setCommerceName] = useState("");
  const [creatingCommerce, setCreatingCommerce] = useState(false);
  const copy = sectionCopy[section];
  const canAdmin = Boolean(
    bootstrap?.permissions.some(
      (permission) =>
        permission.screenKey === copy.screen &&
        permission.capabilities.includes("ADMIN"),
    ),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCandidates, nextCatalog] = await Promise.all([
        schedulerApi.operationalCandidates(),
        schedulerApi.operationalCatalog(),
      ]);
      setCandidates(nextCandidates);
      setCatalog(nextCatalog);
    } catch (requestError) {
      setError(
        schedulerApiErrorMessage(
          requestError,
          "No fue posible cargar los catálogos operativos.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setSelectedId(null);
  }, [section]);

  const branchColumns = useMemo<ColumnDef<BranchCandidate>[]>(
    () => [
      { accessorKey: "name", header: "SUCURSAL" },
      {
        id: "canonicalStatus",
        header: "CATÁLOGO",
        accessorFn: (row) => (row.active ? "ACTIVA" : "INACTIVA"),
        cell: ({ row }) => <StatusBadge active={row.original.active} />,
      },
      {
        id: "profileStatus",
        header: "SCHEDULER",
        accessorFn: (row) =>
          row.profileActive === null
            ? "SIN CONFIGURAR"
            : row.profileActive
              ? "ACTIVO"
              : "INACTIVO",
        cell: ({ row }) => (
          <StatusBadge
            active={row.original.profileActive}
            configured={Boolean(row.original.profileId)}
          />
        ),
      },
      {
        id: "actions",
        header: "ACCIONES",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedId(row.original.id)}
          >
            {row.original.profileId ? "Configurar" : "Activar"}
          </Button>
        ),
      },
    ],
    [],
  );
  const employeeColumns = useMemo<ColumnDef<EmployeeCandidate>[]>(
    () => [
      { accessorKey: "name", header: "EMPLEADO" },
      {
        accessorKey: "positionName",
        header: "PUESTO",
        cell: ({ row }) => row.original.positionName ?? "Sin puesto",
      },
      {
        id: "profileStatus",
        header: "SCHEDULER",
        accessorFn: (row) =>
          row.profileActive === null
            ? "SIN CONFIGURAR"
            : row.profileActive
              ? "ACTIVO"
              : "INACTIVO",
        cell: ({ row }) => (
          <StatusBadge
            active={row.original.profileActive}
            configured={Boolean(row.original.profileId)}
          />
        ),
      },
      {
        id: "actions",
        header: "ACCIONES",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedId(row.original.id)}
          >
            {row.original.profileId ? "Configurar" : "Activar"}
          </Button>
        ),
      },
    ],
    [],
  );
  const serviceColumns = useMemo<ColumnDef<ServiceCandidate>[]>(
    () => [
      { accessorKey: "name", header: "SERVICIO" },
      { accessorKey: "sku", header: "SKU" },
      {
        id: "duration",
        header: "DURACIÓN",
        accessorFn: (row) => row.durationMinutes ?? -1,
        cell: ({ row }) =>
          row.original.durationMinutes
            ? `${row.original.durationMinutes} min`
            : "Pendiente",
      },
      {
        id: "profileStatus",
        header: "SCHEDULER",
        accessorFn: (row) =>
          row.profileActive === null
            ? "SIN CONFIGURAR"
            : row.profileActive
              ? "ACTIVO"
              : "INACTIVO",
        cell: ({ row }) => (
          <StatusBadge
            active={row.original.profileActive}
            configured={Boolean(row.original.profileId)}
          />
        ),
      },
      {
        id: "actions",
        header: "ACCIONES",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedId(row.original.id)}
          >
            {row.original.profileId ? "Configurar" : "Activar"}
          </Button>
        ),
      },
    ],
    [],
  );

  async function createCommerce() {
    const name = commerceName.trim();
    if (!name) return toast.warning("Escribe el nombre del comercio.");
    setCreatingCommerce(true);
    try {
      await schedulerApi.createCommerce({ name, active: true });
      setCommerceName("");
      toast.success("Comercio creado");
      await load();
    } catch (requestError) {
      toast.error(
        schedulerApiErrorMessage(
          requestError,
          "No fue posible crear el comercio.",
        ),
      );
    } finally {
      setCreatingCommerce(false);
    }
  }

  if (loading)
    return (
      <div className="p-5 sm:p-8">
        <LoadingState />
      </div>
    );
  if (error || !candidates || !catalog)
    return (
      <div className="p-5 sm:p-8">
        <Card>
          <CardContent className="flex flex-col items-start gap-4 pt-6">
            <p className="text-sm text-red-800" role="alert">
              {error ?? "El catálogo no está disponible."}
            </p>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  const selectedBranch = candidates.branches.find(
    (item) => item.id === selectedId,
  );
  const selectedEmployee = candidates.employees.find(
    (item) => item.id === selectedId,
  );
  const selectedService = candidates.services.find(
    (item) => item.id === selectedId,
  );
  const resourceColumns: ColumnDef<
    SchedulerOperationalCatalogDto["resources"][number]
  >[] = [
    { accessorKey: "name", header: "RECURSO" },
    { accessorKey: "kind", header: "TIPO" },
    { accessorKey: "capacity", header: "CAPACIDAD" },
    {
      id: "status",
      header: "ESTATUS",
      accessorFn: (row) => (row.active ? "ACTIVO" : "INACTIVO"),
      cell: ({ row }) => <StatusBadge active={row.original.active} />,
    },
    {
      id: "actions",
      header: "ACCIONES",
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedId(row.original.id)}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-7 p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title text-wrap-balance">{copy.title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
            {copy.description}
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </header>

      {!canAdmin ? (
        <div
          className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Tu acceso es de sólo lectura. Puedes revisar candidatos y
          configuración, pero no guardar cambios.
        </div>
      ) : null}

      {section === "locals" ? (
        <div className="space-y-6">
          {bootstrap?.user.role === "SUPER_ADMIN" ? (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
                <div className="w-full max-w-md">
                  <Label htmlFor="commerce-name">Nuevo comercio</Label>
                  <Input
                    id="commerce-name"
                    className="mt-2"
                    value={commerceName}
                    onChange={(event) => setCommerceName(event.target.value)}
                    placeholder="Nombre canónico"
                  />
                </div>
                <Button
                  onClick={() => void createCommerce()}
                  disabled={creatingCommerce}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {creatingCommerce ? "Creando…" : "Crear comercio"}
                </Button>
              </CardContent>
            </Card>
          ) : null}
          <section aria-labelledby="branch-candidates-title">
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[var(--scheduler-accent-strong)]" />
              <h2 id="branch-candidates-title" className="section-heading">
                SUCURSALES CANÓNICAS
              </h2>
            </div>
            <DataTable
              columns={branchColumns}
              data={candidates.branches}
              emptyMessage="No hay sucursales autorizadas para configurar."
              searchPlaceholder="Buscar sucursal…"
            />
          </section>
          {selectedBranch ? (
            <BranchEditor
              key={`${selectedBranch.id}-${catalog.branches.find((item) => item.branchId === selectedBranch.id)?.version ?? 0}`}
              candidate={selectedBranch}
              catalog={catalog}
              onSaved={load}
              canAdmin={canAdmin}
            />
          ) : null}
        </div>
      ) : null}

      {section === "professionals" ? (
        <div className="space-y-6">
          <section aria-labelledby="professional-candidates-title">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-[var(--scheduler-accent-strong)]" />
              <h2
                id="professional-candidates-title"
                className="section-heading"
              >
                EMPLEADOS CANDIDATOS
              </h2>
            </div>
            <DataTable
              columns={employeeColumns}
              data={candidates.employees}
              emptyMessage="No hay empleados dentro de tu alcance."
              searchPlaceholder="Buscar empleado…"
            />
          </section>
          {selectedEmployee ? (
            <ProfessionalEditor
              key={`${selectedEmployee.id}-${catalog.professionals.find((item) => item.employeeId === selectedEmployee.id)?.version ?? 0}`}
              candidate={selectedEmployee}
              catalog={catalog}
              onSaved={load}
              canAdmin={canAdmin}
            />
          ) : null}
        </div>
      ) : null}

      {section === "services" ? (
        <div className="space-y-6">
          <section aria-labelledby="service-candidates-title">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--scheduler-accent-strong)]" />
              <h2 id="service-candidates-title" className="section-heading">
                SERVICIOS DEL CATÁLOGO
              </h2>
            </div>
            <DataTable
              columns={serviceColumns}
              data={candidates.services}
              emptyMessage="No hay servicios canónicos disponibles."
              searchPlaceholder="Buscar servicio o SKU…"
            />
          </section>
          {selectedService ? (
            <ServiceEditor
              key={`${selectedService.id}-${catalog.services.find((item) => item.catalogItemId === selectedService.id)?.version ?? 0}`}
              candidate={selectedService}
              catalog={catalog}
              onSaved={load}
              canAdmin={canAdmin}
            />
          ) : null}
        </div>
      ) : null}

      {section === "resources" ? (
        <div className="space-y-6">
          <section aria-labelledby="resources-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Box className="h-5 w-5 text-[var(--scheduler-accent-strong)]" />
                <h2 id="resources-title" className="section-heading">
                  RECURSOS CONFIGURADOS
                </h2>
              </div>
              <Button
                size="sm"
                onClick={() => setSelectedId(null)}
                disabled={!canAdmin}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo recurso
              </Button>
            </div>
            <DataTable
              columns={resourceColumns}
              data={catalog.resources}
              emptyMessage="Crea la primera cabina, equipo o estación para esta agenda."
              searchPlaceholder="Buscar recurso…"
            />
          </section>
          <ResourceEditor
            key={selectedId ?? "new-resource"}
            catalog={catalog}
            resourceId={selectedId}
            onSaved={load}
            canAdmin={canAdmin}
          />
        </div>
      ) : null}
    </div>
  );
}
