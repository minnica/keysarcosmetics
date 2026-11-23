"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Box,
  Building2,
  DoorOpen,
  Megaphone,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Sparkles,
  Tags,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  SchedulerServiceMarketingType,
  SchedulerServiceMode,
} from "@cosmetics/types";
import { schedulerApi, schedulerApiErrorMessage } from "@/lib/api";
import { useSchedulerSession } from "@/lib/session";
import { schedulerAdministrationInvalidations } from "@/lib/scheduler-administration-presentation";
import { invalidateSchedulerQueries } from "@/components/api/ApiState";
import { AdministrationRelationsPanel } from "./AdministrationRelationsPanel";
import { BranchCabinCommercialPanel } from "./BranchCabinCommercialPanel";
import {
  AdministrationCoverageNotice,
  AdministrationRefreshButton,
  RestoredAdministrationFrame,
} from "./RestoredAdministrationFrame";

type OperationalSection = "locals" | "professionals" | "services" | "resources";
type OperationalEditor = "branch" | "professional" | "service" | "resource";
type BranchCandidate = SchedulerOperationalCandidatesDto["branches"][number];
type EmployeeCandidate = SchedulerOperationalCandidatesDto["employees"][number];
type ServiceCandidate = SchedulerOperationalCandidatesDto["services"][number];

const sectionCopy: Record<
  OperationalSection,
  { title: string; description: string; screen: SchedulerScreenKey }
> = {
  locals: {
    title: "Sucursales y cabinas",
    description:
      "Vincula sucursales POS o contrata sucursales independientes y configura sus cabinas.",
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

function resourceKindLabel(kind: SchedulerResourceKind) {
  return {
    ROOM: "Cabina / sala",
    EQUIPMENT: "Equipo",
    STATION: "Estación",
    OTHER: "Otro recurso",
  }[kind];
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
    listPrice: z
      .string()
      .refine(
        (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
        "Captura un precio válido",
      ),
    categoryId: z.string().min(1, "Selecciona una categoría"),
    marketingType: z.enum(["STANDARD", "PROMOTION", "CAMPAIGN"]),
    campaignName: z.string().trim().max(100),
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
    if (value.marketingType !== "STANDARD" && !value.campaignName)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["campaignName"],
        message: "Indica el nombre de la promoción o campaña",
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
      listPrice: profile?.listPrice ?? "0.00",
      categoryId:
        profile?.categoryId ??
        catalog.serviceCategories.find((item) => item.active)?.id ??
        "",
      marketingType: profile?.marketingType ?? "STANDARD",
      campaignName: profile?.campaignName ?? "",
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
              <Label htmlFor="service-price">Precio</Label>
              <Input
                id="service-price"
                type="number"
                min="0"
                step="0.01"
                className="mt-2"
                {...register("listPrice")}
                disabled={!canAdmin || saving}
              />
              <FieldError message={errors.listPrice?.message} />
            </div>
            <div>
              <Label htmlFor="service-category">Categoría</Label>
              <Select
                value={watch("categoryId")}
                onValueChange={(value) =>
                  setValue("categoryId", value, { shouldDirty: true })
                }
                disabled={!canAdmin || saving}
              >
                <SelectTrigger id="service-category" className="mt-2">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.serviceCategories
                    .filter((item) => item.active)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.categoryId?.message} />
            </div>
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
              <Label htmlFor="service-marketing">Clasificación comercial</Label>
              <Select
                value={watch("marketingType")}
                onValueChange={(value: SchedulerServiceMarketingType) => {
                  setValue("marketingType", value, { shouldDirty: true });
                  if (value === "STANDARD")
                    setValue("campaignName", "", { shouldDirty: true });
                }}
                disabled={!canAdmin || saving}
              >
                <SelectTrigger id="service-marketing" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Servicio regular</SelectItem>
                  <SelectItem value="PROMOTION">Promoción</SelectItem>
                  <SelectItem value="CAMPAIGN">Campaña</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="service-campaign">
                Nombre de promoción o campaña
              </Label>
              <Input
                id="service-campaign"
                className="mt-2"
                placeholder="Ej. Hidratación de temporada"
                {...register("campaignName")}
                disabled={
                  !canAdmin || saving || watch("marketingType") === "STANDARD"
                }
              />
              <FieldError message={errors.campaignName?.message} />
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

type ServiceCategoryDraft = {
  id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
  version?: number;
};

const emptyServiceDraft = {
  name: "",
  listPrice: "",
  durationMinutes: "60",
  categoryId: "",
  marketingType: "STANDARD" as SchedulerServiceMarketingType,
  campaignName: "",
  mode: "INDIVIDUAL" as SchedulerServiceMode,
  capacity: "1",
  branchProfileIds: [] as string[],
  acceptsOnline: true,
  active: true,
};

function ServiceCatalogManager({
  catalog,
  canAdmin,
  onSaved,
}: {
  catalog: SchedulerOperationalCatalogDto;
  canAdmin: boolean;
  onSaved: () => Promise<void>;
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<ServiceCategoryDraft>({
    id: "",
    name: "",
    description: "",
    color: "#ad8b67",
    active: true,
  });
  const [serviceDraft, setServiceDraft] = useState(emptyServiceDraft);

  const openCategory = (
    category?: SchedulerOperationalCatalogDto["serviceCategories"][number],
  ) => {
    setCategoryDraft(
      category
        ? {
            id: category.id,
            name: category.name,
            description: category.description ?? "",
            color: category.color,
            active: category.active,
            version: category.version,
          }
        : {
            id: "",
            name: "",
            description: "",
            color: "#ad8b67",
            active: true,
          },
    );
    setCategoryOpen(true);
  };

  const saveCategory = async () => {
    const name = categoryDraft.name.trim();
    const commerceId = catalog.commerces.find((item) => item.active)?.id;
    if (!name || !commerceId) {
      toast.warning("Escribe el nombre de la categoría.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        commerceId,
        name,
        description: categoryDraft.description.trim() || null,
        color: categoryDraft.color,
        active: categoryDraft.active,
        ...(categoryDraft.version
          ? { expectedVersion: categoryDraft.version }
          : {}),
      };
      if (categoryDraft.id)
        await schedulerApi.updateServiceCategory(categoryDraft.id, input);
      else await schedulerApi.createServiceCategory(input);
      toast.success(
        categoryDraft.id ? "Categoría actualizada." : "Categoría creada.",
      );
      await onSaved();
      setCategoryOpen(false);
    } catch (error) {
      toast.error(
        schedulerApiErrorMessage(error, "No fue posible guardar la categoría."),
      );
    } finally {
      setSaving(false);
    }
  };

  const setCategoryStatus = async (
    category: SchedulerOperationalCatalogDto["serviceCategories"][number],
    active: boolean,
  ) => {
    setSaving(true);
    try {
      await schedulerApi.updateServiceCategory(category.id, {
        commerceId: category.commerceId,
        name: category.name,
        description: category.description,
        color: category.color,
        active,
        expectedVersion: category.version,
      });
      await onSaved();
      toast.success(active ? "Categoría activada." : "Categoría desactivada.");
    } catch (error) {
      toast.error(
        schedulerApiErrorMessage(error, "No fue posible cambiar el estatus."),
      );
    } finally {
      setSaving(false);
    }
  };

  const saveService = async () => {
    const price = Number(serviceDraft.listPrice);
    const duration = Number(serviceDraft.durationMinutes);
    const capacity = Number(serviceDraft.capacity);
    if (
      !serviceDraft.name.trim() ||
      !serviceDraft.categoryId ||
      !serviceDraft.branchProfileIds.length ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      toast.warning(
        "Completa nombre, precio, categoría, duración y sucursales.",
      );
      return;
    }
    if (
      serviceDraft.marketingType !== "STANDARD" &&
      !serviceDraft.campaignName.trim()
    ) {
      toast.warning("Indica el nombre de la promoción o campaña.");
      return;
    }
    setSaving(true);
    try {
      await schedulerApi.createService({
        name: serviceDraft.name.trim(),
        listPrice: price.toFixed(2),
        durationMinutes: duration,
        preparationMinutes: 0,
        cleanupMinutes: 0,
        capacity: serviceDraft.mode === "INDIVIDUAL" ? 1 : capacity,
        mode: serviceDraft.mode,
        acceptsOnline: serviceDraft.acceptsOnline,
        active: serviceDraft.active,
        branchProfileIds: serviceDraft.branchProfileIds,
        categoryId: serviceDraft.categoryId,
        marketingType: serviceDraft.marketingType,
        campaignName:
          serviceDraft.marketingType === "STANDARD"
            ? null
            : serviceDraft.campaignName.trim(),
      });
      toast.success("Servicio creado y asignado a su categoría.");
      await onSaved();
      setServiceOpen(false);
      setServiceDraft(emptyServiceDraft);
    } catch (error) {
      toast.error(
        schedulerApiErrorMessage(error, "No fue posible crear el servicio."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="admin-card overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 border-b border-[#eadfd5] bg-[linear-gradient(120deg,#fff,#f7f0e8)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="admin-eyebrow">Catálogo comercial</p>
            <h2 className="admin-section-title mt-1">
              Categorías y altas de servicio
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Organiza el catálogo, identifica promociones y crea servicios con
              su categoría desde el inicio.
            </p>
          </div>
          {canAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => openCategory()}>
                <Tags className="mr-2 h-4 w-4" /> Nueva categoría
              </Button>
              <Button
                onClick={() => {
                  setServiceDraft({
                    ...emptyServiceDraft,
                    categoryId:
                      catalog.serviceCategories.find((item) => item.active)
                        ?.id ?? "",
                    branchProfileIds: catalog.branches
                      .filter((item) => item.active)
                      .map((item) => item.id),
                  });
                  setServiceOpen(true);
                }}
                disabled={
                  !catalog.serviceCategories.some((item) => item.active)
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Nuevo servicio
              </Button>
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {catalog.serviceCategories.map((category) => (
            <article
              className="rounded-2xl border border-[#eadfd5] bg-white p-4 shadow-sm"
              key={category.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <h3 className="truncate font-semibold text-slate-800">
                    {category.name}
                  </h3>
                </div>
                <StatusBadge active={category.active} />
              </div>
              <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">
                {category.description ?? "Sin descripción."}
              </p>
              <p className="mt-2 text-xs font-medium text-[#947252]">
                {
                  catalog.services.filter(
                    (item) => item.categoryId === category.id,
                  ).length
                }{" "}
                servicios
              </p>
              {canAdmin ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCategory(category)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving || category.active}
                    onClick={() => void setCategoryStatus(category, true)}
                  >
                    <Power className="mr-1.5 h-3.5 w-3.5" /> Activo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving || !category.active}
                    onClick={() => void setCategoryStatus(category, false)}
                  >
                    <PowerOff className="mr-1.5 h-3.5 w-3.5" /> Inactivo
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </CardContent>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="admin-dialog max-w-xl overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {categoryDraft.id ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Nombre</Label>
              <Input
                id="category-name"
                className="mt-1.5"
                value={categoryDraft.name}
                onChange={(event) =>
                  setCategoryDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="category-description">Descripción</Label>
              <Textarea
                id="category-description"
                className="mt-1.5"
                value={categoryDraft.description}
                onChange={(event) =>
                  setCategoryDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <div>
                <Label htmlFor="category-color">Color de identificación</Label>
                <Input
                  id="category-color"
                  className="mt-1.5"
                  value={categoryDraft.color}
                  onChange={(event) =>
                    setCategoryDraft((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                />
              </div>
              <input
                aria-label="Seleccionar color"
                className="h-10 w-14 rounded-lg border border-slate-200 p-1"
                type="color"
                value={categoryDraft.color}
                onChange={(event) =>
                  setCategoryDraft((current) => ({
                    ...current,
                    color: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => void saveCategory()}
                disabled={saving || !categoryDraft.name.trim()}
              >
                <Save className="mr-2 h-4 w-4" /> Guardar categoría
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={serviceOpen} onOpenChange={setServiceOpen}>
        <DialogContent className="admin-dialog admin-dialog-wide max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Nuevo servicio</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nombre del servicio</Label>
                <Input
                  className="mt-1.5"
                  value={serviceDraft.name}
                  onChange={(event) =>
                    setServiceDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Precio</Label>
                <Input
                  className="mt-1.5"
                  min="0"
                  step="0.01"
                  type="number"
                  value={serviceDraft.listPrice}
                  onChange={(event) =>
                    setServiceDraft((current) => ({
                      ...current,
                      listPrice: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="rounded-xl border border-[#e7ddd4] bg-[#f8f5f1] px-4 py-3 sm:col-span-2">
                <p className="text-sm font-medium text-slate-800">
                  SKU automático y consecutivo
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Se generará al guardar usando la categoría seleccionada y su
                  siguiente número disponible.
                </p>
              </div>
              <div>
                <Label>Duración (min)</Label>
                <Input
                  className="mt-1.5"
                  min="1"
                  type="number"
                  value={serviceDraft.durationMinutes}
                  onChange={(event) =>
                    setServiceDraft((current) => ({
                      ...current,
                      durationMinutes: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select
                  value={serviceDraft.categoryId}
                  onValueChange={(value) =>
                    setServiceDraft((current) => ({
                      ...current,
                      categoryId: value,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.serviceCategories
                      .filter((item) => item.active)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo comercial</Label>
                <Select
                  value={serviceDraft.marketingType}
                  onValueChange={(value: SchedulerServiceMarketingType) =>
                    setServiceDraft((current) => ({
                      ...current,
                      marketingType: value,
                      campaignName:
                        value === "STANDARD" ? "" : current.campaignName,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Regular</SelectItem>
                    <SelectItem value="PROMOTION">Promoción</SelectItem>
                    <SelectItem value="CAMPAIGN">Campaña</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {serviceDraft.marketingType !== "STANDARD" ? (
                <div className="sm:col-span-2">
                  <Label>Nombre de promoción o campaña</Label>
                  <Input
                    className="mt-1.5"
                    value={serviceDraft.campaignName}
                    onChange={(event) =>
                      setServiceDraft((current) => ({
                        ...current,
                        campaignName: event.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}
              <div>
                <Label>Modalidad</Label>
                <Select
                  value={serviceDraft.mode}
                  onValueChange={(value: SchedulerServiceMode) =>
                    setServiceDraft((current) => ({
                      ...current,
                      mode: value,
                      capacity: value === "INDIVIDUAL" ? "1" : current.capacity,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="CLASS">Clase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacidad</Label>
                <Input
                  className="mt-1.5"
                  disabled={serviceDraft.mode === "INDIVIDUAL"}
                  min="1"
                  type="number"
                  value={serviceDraft.capacity}
                  onChange={(event) =>
                    setServiceDraft((current) => ({
                      ...current,
                      capacity: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Sucursales</Label>
              <MultiCombobox
                className="mt-1.5"
                options={catalog.branches
                  .filter((item) => item.active)
                  .map((item) => ({ value: item.id, label: item.branchName }))}
                value={serviceDraft.branchProfileIds}
                onValueChange={(value) =>
                  setServiceDraft((current) => ({
                    ...current,
                    branchProfileIds: value,
                  }))
                }
                placeholder="Selecciona sucursales"
                selectedCountLabel="sucursales seleccionadas"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={serviceDraft.active ? "default" : "outline"}
                onClick={() =>
                  setServiceDraft((current) => ({
                    ...current,
                    active: !current.active,
                  }))
                }
              >
                {serviceDraft.active ? "Activo" : "Inactivo"}
              </Button>
              <Button
                variant={serviceDraft.acceptsOnline ? "default" : "outline"}
                onClick={() =>
                  setServiceDraft((current) => ({
                    ...current,
                    acceptsOnline: !current.acceptsOnline,
                  }))
                }
              >
                {serviceDraft.acceptsOnline
                  ? "Reserva en línea"
                  : "Sólo interno"}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void saveService()} disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> Guardar servicio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const resourceFormSchema = z.object({
  branchProfileId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  kind: z.enum(["ROOM", "EQUIPMENT", "STATION", "OTHER"]),
  capacity: z.coerce.number().int().min(1).max(1000),
  quantity: z.coerce.number().int().min(1).max(20),
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
      quantity: 1,
      exclusive: resource?.exclusive ?? true,
      acceptsOnline: resource?.acceptsOnline ?? false,
      active: resource?.active ?? true,
    },
  });
  const selectedBranchProfileId = watch("branchProfileId");
  const selectedKind = watch("kind");
  const selectedCapacity = watch("capacity") || 1;
  const selectedQuantity = resource ? 1 : watch("quantity") || 1;
  const selectedName = watch("name").trim() || "Cabina";
  const selectedBranchName =
    catalog.branches.find((item) => item.id === selectedBranchProfileId)
      ?.branchName ?? "Sucursal sin seleccionar";
  const isCabin = selectedKind === "ROOM";
  const submit = handleSubmit(async (values) => {
    const parsed = resourceFormSchema.safeParse(values);
    if (!parsed.success)
      return toast.warning(
        "Revisa los campos obligatorios y la capacidad del recurso.",
      );
    setSaving(true);
    try {
      const { quantity, ...resourceData } = parsed.data;
      const input = {
        ...resourceData,
        ...(resource ? { expectedVersion: resource.version } : {}),
      };
      if (resource) await schedulerApi.updateResource(resource.id, input);
      else {
        await Promise.all(
          Array.from({ length: quantity }, (_value, index) =>
            schedulerApi.createResource({
              ...input,
              name: quantity === 1 ? input.name : `${input.name} ${index + 1}`,
            }),
          ),
        );
      }
      toast.success(
        resource
          ? "Recurso actualizado"
          : quantity === 1
            ? "Recurso creado"
            : `${quantity} ${selectedKind === "ROOM" ? "cabinas creadas" : "unidades creadas"}`,
      );
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
          {resource ? `Editar ${resource.name}` : "Nueva cabina o recurso"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="resource-name">Nombre base</Label>
              <Input
                id="resource-name"
                className="mt-2"
                {...register("name")}
                disabled={!canAdmin || saving}
                aria-invalid={Boolean(errors.name)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Ejemplo: Cabina doble, Cabina facial o Equipo Hydrafacial.
              </p>
            </div>
            <div>
              <Label htmlFor="resource-branch">Sucursal propietaria</Label>
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
              <p className="mt-1 text-xs text-slate-500">
                Las columnas creadas sólo aparecerán dentro de esta sucursal.
              </p>
            </div>
            <div>
              <Label htmlFor="resource-kind">Tipo de recurso</Label>
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
              <Label htmlFor="resource-capacity">
                {isCabin ? "Personas por cabina" : "Capacidad por unidad"}
              </Label>
              <Input
                id="resource-capacity"
                type="number"
                className="mt-2"
                {...register("capacity")}
                disabled={!canAdmin || saving}
              />
              <p className="mt-1 text-xs text-slate-500">
                {isCabin
                  ? "1 individual, 2 doble, 3 triple, etc."
                  : "Número máximo de usos simultáneos."}
              </p>
            </div>
            {!resource ? (
              <div>
                <Label htmlFor="resource-quantity">
                  {isCabin
                    ? "Número de cabinas en esta sucursal"
                    : "Número de unidades en esta sucursal"}
                </Label>
                <Input
                  id="resource-quantity"
                  type="number"
                  min={1}
                  max={20}
                  className="mt-2"
                  {...register("quantity")}
                  disabled={!canAdmin || saving}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Cada unidad tendrá su propia columna, numeración y
                  disponibilidad.
                </p>
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-[#e6d8ca] bg-[#fbf7f2] p-4">
            <div className="flex items-start gap-3">
              <DoorOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#ad8b67]" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Vista previa de configuración
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {selectedBranchName} · {selectedQuantity}{" "}
                  {isCabin
                    ? selectedQuantity === 1
                      ? "cabina"
                      : "cabinas"
                    : selectedQuantity === 1
                      ? "unidad"
                      : "unidades"}{" "}
                  · {selectedCapacity}{" "}
                  {selectedCapacity === 1 ? "persona" : "personas"} por unidad.
                </p>
                {!resource && selectedQuantity > 1 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Se crearán: {selectedName} 1, {selectedName} 2
                    {selectedQuantity > 2
                      ? ` … ${selectedName} ${selectedQuantity}`
                      : ""}
                    .
                  </p>
                ) : null}
              </div>
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
  const [activeEditor, setActiveEditor] = useState<OperationalEditor | null>(
    null,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [commerceDialogOpen, setCommerceDialogOpen] = useState(false);
  const [commerceDraft, setCommerceDraft] = useState({
    id: "",
    name: "",
    active: true,
  });
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
  const refreshAfterMutation = useCallback(async () => {
    invalidateSchedulerQueries(...schedulerAdministrationInvalidations());
    await load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setSelectedId(null);
    setActiveEditor(null);
    setEditorOpen(false);
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
            onClick={() => {
              setSelectedId(row.original.id);
              setActiveEditor("branch");
              setEditorOpen(true);
            }}
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
            onClick={() => {
              setSelectedId(row.original.id);
              setActiveEditor("professional");
              setEditorOpen(true);
            }}
          >
            {row.original.profileId ? "Configurar" : "Activar"}
          </Button>
        ),
      },
    ],
    [],
  );

  const updateServiceStatus = useCallback(
    async (candidate: ServiceCandidate, active: boolean) => {
      const profile = catalog?.services.find(
        (item) => item.catalogItemId === candidate.id,
      );
      if (!profile) {
        setSelectedId(candidate.id);
        setActiveEditor("service");
        setEditorOpen(true);
        return;
      }
      try {
        await schedulerApi.updateServiceProfile(candidate.id, {
          durationMinutes: profile.durationMinutes,
          preparationMinutes: profile.preparationMinutes,
          cleanupMinutes: profile.cleanupMinutes,
          capacity: profile.capacity,
          mode: profile.mode,
          acceptsOnline: profile.acceptsOnline,
          active,
          listPrice: profile.listPrice,
          categoryId: profile.categoryId,
          marketingType: profile.marketingType,
          campaignName: profile.campaignName,
          branchProfileIds: profile.branchProfileIds,
          expectedVersion: profile.version,
        });
        toast.success(active ? "Servicio activado." : "Servicio desactivado.");
        await refreshAfterMutation();
      } catch (error) {
        toast.error(
          schedulerApiErrorMessage(error, "No fue posible cambiar el estatus."),
        );
      }
    },
    [catalog?.services, refreshAfterMutation],
  );

  const serviceColumns = useMemo<ColumnDef<ServiceCandidate>[]>(
    () => [
      { accessorKey: "name", header: "SERVICIO" },
      { accessorKey: "sku", header: "SKU" },
      {
        id: "category",
        header: "CATEGORÍA",
        accessorFn: (row) => {
          const profile = catalog?.services.find(
            (item) => item.catalogItemId === row.id,
          );
          return (
            catalog?.serviceCategories.find(
              (item) => item.id === profile?.categoryId,
            )?.name ?? "Sin categoría"
          );
        },
      },
      {
        id: "campaign",
        header: "PROMOCIÓN / CAMPAÑA",
        accessorFn: (row) =>
          catalog?.services.find((item) => item.catalogItemId === row.id)
            ?.campaignName ?? "Servicio regular",
        cell: ({ row }) => {
          const profile = catalog?.services.find(
            (item) => item.catalogItemId === row.original.id,
          );
          return profile?.marketingType !== "STANDARD" ? (
            <Badge
              className="border-amber-200 bg-amber-50 text-amber-800"
              variant="outline"
            >
              <Megaphone className="mr-1 h-3 w-3" />
              {profile?.campaignName}
            </Badge>
          ) : (
            <span className="text-xs text-slate-400">Regular</span>
          );
        },
      },
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
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={!canAdmin || row.original.profileActive === true}
              onClick={() => void updateServiceStatus(row.original, true)}
            >
              <Power className="mr-1.5 h-3.5 w-3.5" /> Activo
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canAdmin || row.original.profileActive !== true}
              onClick={() => void updateServiceStatus(row.original, false)}
            >
              <PowerOff className="mr-1.5 h-3.5 w-3.5" /> Inactivo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedId(row.original.id);
                setActiveEditor("service");
                setEditorOpen(true);
              }}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
            </Button>
          </div>
        ),
      },
    ],
    [canAdmin, catalog, updateServiceStatus],
  );

  async function saveCommerce() {
    const name = commerceDraft.name.trim();
    if (!name) return toast.warning("Escribe el nombre del comercio.");
    setCreatingCommerce(true);
    try {
      if (commerceDraft.id) {
        await schedulerApi.updateCommerce(commerceDraft.id, {
          name,
          active: commerceDraft.active,
        });
      } else {
        await schedulerApi.createCommerce({ name, active: true });
      }
      setCommerceDraft({ id: "", name: "", active: true });
      setCommerceDialogOpen(false);
      toast.success(
        commerceDraft.id ? "Comercio actualizado" : "Comercio creado",
      );
      await refreshAfterMutation();
    } catch (requestError) {
      toast.error(
        schedulerApiErrorMessage(
          requestError,
          "No fue posible guardar el comercio.",
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
  const resourceSummary = catalog.branches.map((branch) => {
    const branchResources = catalog.resources.filter(
      (resource) => resource.branchProfileId === branch.id && resource.active,
    );
    const cabins = branchResources.filter(
      (resource) => resource.kind === "ROOM",
    );
    return {
      branch,
      cabins: cabins.length,
      cabinCapacity: cabins.reduce(
        (total, resource) => total + resource.capacity,
        0,
      ),
      specialists: catalog.professionals.filter(
        (professional) =>
          professional.active &&
          professional.branchProfileIds.includes(branch.id),
      ).length,
    };
  });
  const resourceColumns: ColumnDef<
    SchedulerOperationalCatalogDto["resources"][number]
  >[] = [
    { accessorKey: "name", header: "RECURSO" },
    {
      id: "branch",
      header: "SUCURSAL",
      accessorFn: (row) =>
        catalog.branches.find((branch) => branch.id === row.branchProfileId)
          ?.branchName ?? "Sin sucursal",
    },
    {
      accessorKey: "kind",
      header: "TIPO",
      cell: ({ row }) => resourceKindLabel(row.original.kind),
    },
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
          onClick={() => {
            setSelectedId(row.original.id);
            setActiveEditor("resource");
            setEditorOpen(true);
          }}
        >
          Editar
        </Button>
      ),
    },
  ];

  const editorTitle =
    activeEditor === "branch"
      ? selectedBranch?.name
      : activeEditor === "professional"
        ? selectedEmployee?.name
        : activeEditor === "service"
          ? selectedService?.name
          : activeEditor === "resource" && selectedId
            ? "Editar recurso"
            : "Nuevo recurso";

  return (
    <RestoredAdministrationFrame
      section={section}
      readOnly={!canAdmin}
      actions={
        <AdministrationRefreshButton
          onClick={() => void load()}
          loading={loading}
        />
      }
    >
      <div className="space-y-6">
        {section === "locals" ? (
          <>
            <BranchCabinCommercialPanel
              candidates={candidates}
              catalog={catalog}
              canAdmin={canAdmin}
              onSaved={refreshAfterMutation}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {catalog.commerces.map((commerce) => (
                <Card key={commerce.id} className="admin-card">
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {commerce.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {
                          catalog.branches.filter(
                            (branch) => branch.commerceId === commerce.id,
                          ).length
                        }{" "}
                        sucursales
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge active={commerce.active} />
                      {bootstrap?.user.role === "SUPER_ADMIN" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCommerceDraft({
                              id: commerce.id,
                              name: commerce.name,
                              active: commerce.active,
                            });
                            setCommerceDialogOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {bootstrap?.user.role === "SUPER_ADMIN" ? (
                <button
                  type="button"
                  className="min-h-24 rounded-2xl border border-dashed border-[#ccb9a7] bg-white/50 p-5 text-left transition hover:border-[#ad8b67] hover:bg-white"
                  onClick={() => {
                    setCommerceDraft({ id: "", name: "", active: true });
                    setCommerceDialogOpen(true);
                  }}
                >
                  <Plus className="mb-2 h-5 w-5 text-[#ad8b67]" />
                  <span className="text-sm font-semibold">Nuevo comercio</span>
                </button>
              ) : null}
            </div>
            <Card className="admin-card">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#ad8b67]" />
                  <h2
                    id="branch-candidates-title"
                    className="admin-section-title"
                  >
                    Sucursales canónicas
                  </h2>
                </div>
                <DataTable
                  columns={branchColumns}
                  data={candidates.branches}
                  emptyMessage="No hay sucursales autorizadas para configurar."
                  searchPlaceholder="Buscar sucursal…"
                />
              </CardContent>
            </Card>
            <AdministrationRelationsPanel
              section={section}
              catalog={catalog}
              canAdmin={canAdmin}
              onSaved={refreshAfterMutation}
            />
            <AdministrationCoverageNotice title="Identidad comercial sin contrato Scheduler">
              Contacto, domicilio e imagen pertenecen a la entidad canónica de
              sucursal. RV4 no los simula ni los sobrescribe desde un perfil de
              agenda.
            </AdministrationCoverageNotice>
          </>
        ) : null}

        {section === "professionals" ? (
          <>
            <Card className="admin-card">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-[#ad8b67]" />
                  <h2 className="admin-section-title">Empleados candidatos</h2>
                </div>
                <DataTable
                  columns={employeeColumns}
                  data={candidates.employees}
                  emptyMessage="No hay empleados dentro de tu alcance."
                  searchPlaceholder="Buscar especialista…"
                />
              </CardContent>
            </Card>
            <AdministrationRelationsPanel
              section={section}
              catalog={catalog}
              canAdmin={canAdmin}
              onSaved={refreshAfterMutation}
            />
          </>
        ) : null}

        {section === "services" ? (
          <>
            <ServiceCatalogManager
              catalog={catalog}
              canAdmin={canAdmin}
              onSaved={refreshAfterMutation}
            />
            <Card className="admin-card">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#ad8b67]" />
                  <h2 className="admin-section-title">
                    Servicios del catálogo
                  </h2>
                </div>
                <DataTable
                  columns={serviceColumns}
                  data={candidates.services}
                  emptyMessage="No hay servicios canónicos disponibles."
                  searchPlaceholder="Buscar servicio o SKU…"
                />
              </CardContent>
            </Card>
            <AdministrationRelationsPanel
              section={section}
              catalog={catalog}
              canAdmin={canAdmin}
              onSaved={refreshAfterMutation}
            />
            <AdministrationCoverageNotice title="Sincronización comercial">
              Las altas creadas aquí quedan disponibles para agenda y reportes.
              El SKU se genera automáticamente con el prefijo de la categoría y
              el siguiente consecutivo disponible.
            </AdministrationCoverageNotice>
          </>
        ) : null}

        {section === "locals" ? (
          <>
            <div
              className="grid scroll-mt-28 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              id="cabinas-recursos"
            >
              {resourceSummary.map(
                ({ branch, cabins, cabinCapacity, specialists }) => (
                  <Card className="admin-card" key={branch.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ad8b67]">
                            Sucursal
                          </p>
                          <h2 className="mt-1 text-lg font-semibold text-slate-800">
                            {branch.branchName}
                          </h2>
                        </div>
                        <StatusBadge active={branch.active} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-[#fbf7f2] p-3">
                          <DoorOpen className="h-4 w-4 text-[#ad8b67]" />
                          <strong className="mt-2 block text-lg text-slate-800">
                            {cabins}
                          </strong>
                          <span className="text-[0.68rem] text-slate-500">
                            Cabinas
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#fbf7f2] p-3">
                          <UsersRound className="h-4 w-4 text-[#ad8b67]" />
                          <strong className="mt-2 block text-lg text-slate-800">
                            {cabinCapacity}
                          </strong>
                          <span className="text-[0.68rem] text-slate-500">
                            Personas
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#fbf7f2] p-3">
                          <UserRound className="h-4 w-4 text-[#60758a]" />
                          <strong className="mt-2 block text-lg text-slate-800">
                            {specialists}
                          </strong>
                          <span className="text-[0.68rem] text-slate-500">
                            Especialistas
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
            <Card className="admin-card">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Box className="h-5 w-5 text-[#ad8b67]" />
                    <h2 className="admin-section-title">
                      Cabinas y recursos por sucursal
                    </h2>
                  </div>
                  {canAdmin ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedId(null);
                        setActiveEditor("resource");
                        setEditorOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Nueva cabina o recurso
                    </Button>
                  ) : null}
                </div>
                <DataTable
                  columns={resourceColumns}
                  data={catalog.resources}
                  emptyMessage="Crea la primera cabina, equipo o estación para esta agenda."
                  searchPlaceholder="Buscar recurso…"
                />
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="admin-dialog admin-dialog-wide max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{editorTitle}</DialogTitle>
          </DialogHeader>
          {activeEditor === "branch" && selectedBranch ? (
            <BranchEditor
              key={`${selectedBranch.id}-${catalog.branches.find((item) => item.branchId === selectedBranch.id)?.version ?? 0}`}
              candidate={selectedBranch}
              catalog={catalog}
              onSaved={async () => {
                await refreshAfterMutation();
                setEditorOpen(false);
              }}
              canAdmin={canAdmin}
            />
          ) : null}
          {activeEditor === "professional" && selectedEmployee ? (
            <ProfessionalEditor
              key={`${selectedEmployee.id}-${catalog.professionals.find((item) => item.employeeId === selectedEmployee.id)?.version ?? 0}`}
              candidate={selectedEmployee}
              catalog={catalog}
              onSaved={async () => {
                await refreshAfterMutation();
                setEditorOpen(false);
              }}
              canAdmin={canAdmin}
            />
          ) : null}
          {activeEditor === "service" && selectedService ? (
            <ServiceEditor
              key={`${selectedService.id}-${catalog.services.find((item) => item.catalogItemId === selectedService.id)?.version ?? 0}`}
              candidate={selectedService}
              catalog={catalog}
              onSaved={async () => {
                await refreshAfterMutation();
                setEditorOpen(false);
              }}
              canAdmin={canAdmin}
            />
          ) : null}
          {activeEditor === "resource" ? (
            <ResourceEditor
              key={selectedId ?? "new-resource"}
              catalog={catalog}
              resourceId={selectedId}
              onSaved={async () => {
                await refreshAfterMutation();
                setEditorOpen(false);
              }}
              canAdmin={canAdmin}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={commerceDialogOpen} onOpenChange={setCommerceDialogOpen}>
        <DialogContent className="admin-dialog max-w-lg overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {commerceDraft.id ? "Editar comercio" : "Nuevo comercio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="commerce-name">Nombre canónico</Label>
              <Input
                id="commerce-name"
                className="mt-1.5"
                value={commerceDraft.name}
                onChange={(event) =>
                  setCommerceDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            {commerceDraft.id ? (
              <Button
                type="button"
                variant={commerceDraft.active ? "default" : "outline"}
                onClick={() =>
                  setCommerceDraft((current) => ({
                    ...current,
                    active: !current.active,
                  }))
                }
              >
                {commerceDraft.active ? "Comercio activo" : "Comercio inactivo"}
              </Button>
            ) : null}
            <div className="flex justify-end">
              <Button
                onClick={() => void saveCommerce()}
                disabled={
                  creatingCommerce || commerceDraft.name.trim().length < 2
                }
              >
                <Save className="mr-2 h-4 w-4" />{" "}
                {creatingCommerce ? "Guardando…" : "Guardar comercio"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </RestoredAdministrationFrame>
  );
}
