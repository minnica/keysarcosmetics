"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  BadgeDollarSign,
  CalendarDays,
  DoorOpen,
  Link2,
  Plus,
  Save,
  Store,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import type {
  SchedulerOperationalCandidatesDto,
  SchedulerOperationalCatalogDto,
} from "@cosmetics/types";
import type {
  DesignBranchCommercialMode,
  DesignBranchCommercialModel,
} from "../../../design/contracts";
import { schedulerDesignProposals } from "@scheduler/design-proposals";

const branchCommercialSchema = z
  .object({
    id: z.string(),
    commerceId: z.string().min(1, "Selecciona un comercio"),
    mode: z.enum(["POS_LINKED", "SCHEDULER_STANDALONE"]),
    posBranchId: z.string(),
    branchName: z.string(),
    timezone: z.string().min(1, "Captura una zona horaria IANA"),
    cabinCount: z.number().int().min(1).max(20),
    cabinCapacity: z.number().int().min(1).max(10),
    branchMonthlyAmount: z.number().min(0),
    cabinMonthlyAmount: z.number().min(0),
  })
  .superRefine((value, context) => {
    if (value.mode === "POS_LINKED" && !value.posBranchId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["posBranchId"],
        message: "Selecciona una sucursal activa del POS",
      });
    }
    if (
      value.mode === "SCHEDULER_STANDALONE" &&
      value.branchName.trim().length < 2
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchName"],
        message: "Captura el nombre de la sucursal",
      });
    }
    if (value.mode === "SCHEDULER_STANDALONE") {
      if (value.branchMonthlyAmount <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["branchMonthlyAmount"],
          message: "Captura una renta mensual mayor a cero",
        });
      }
      if (value.cabinMonthlyAmount <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cabinMonthlyAmount"],
          message: "Captura una renta por cabina mayor a cero",
        });
      } else if (value.cabinMonthlyAmount >= value.branchMonthlyAmount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cabinMonthlyAmount"],
          message: "La cabina debe costar menos que la sucursal",
        });
      }
    }
  });

type BranchCommercialForm = z.infer<typeof branchCommercialSchema>;

const monthlyCurrency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function modelLabel(mode: DesignBranchCommercialMode) {
  return mode === "POS_LINKED" ? "Ligada a POS" : "Solo Agenda";
}

export function BranchCabinCommercialPanel({
  candidates,
  catalog,
  canAdmin,
  onSaved,
}: {
  candidates: SchedulerOperationalCandidatesDto;
  catalog: SchedulerOperationalCatalogDto;
  canAdmin: boolean;
  onSaved: () => Promise<void>;
}) {
  const [models, setModels] = useState<DesignBranchCommercialModel[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BranchCommercialForm>({
    defaultValues: {
      id: "",
      commerceId: catalog.commerces[0]?.id ?? "",
      mode: "POS_LINKED",
      posBranchId: candidates.branches.find((branch) => branch.active)?.id ?? "",
      branchName: "",
      timezone: "America/Mexico_City",
      cabinCount: 1,
      cabinCapacity: 1,
      branchMonthlyAmount: 0,
      cabinMonthlyAmount: 0,
    },
  });

  const loadModels = useCallback(async () => {
    if (!schedulerDesignProposals.available) return;
    try {
      setModels(await schedulerDesignProposals.listBranchCommercialModels());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No fue posible cargar los modelos de sucursal.",
      );
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  if (!schedulerDesignProposals.available) return null;

  const mode = watch("mode");
  const cabinCount = watch("cabinCount") || 0;
  const branchMonthlyAmount = watch("branchMonthlyAmount") || 0;
  const cabinMonthlyAmount = watch("cabinMonthlyAmount") || 0;
  const estimatedMonthlyAmount =
    mode === "SCHEDULER_STANDALONE"
      ? branchMonthlyAmount + cabinMonthlyAmount * cabinCount
      : null;
  const editing = Boolean(watch("id"));

  function openNewModel() {
    reset({
      id: "",
      commerceId: catalog.commerces[0]?.id ?? "",
      mode: "POS_LINKED",
      posBranchId: candidates.branches.find((branch) => branch.active)?.id ?? "",
      branchName: "",
      timezone: "America/Mexico_City",
      cabinCount: 1,
      cabinCapacity: 1,
      branchMonthlyAmount: 0,
      cabinMonthlyAmount: 0,
    });
    setOpen(true);
  }

  function openExistingModel(model: DesignBranchCommercialModel) {
    const profile = catalog.branches.find(
      (branch) => branch.id === model.branchProfileId,
    );
    reset({
      id: model.id,
      commerceId: model.commerceId,
      mode: model.mode,
      posBranchId: model.posBranchId ?? "",
      branchName: model.branchName,
      timezone: profile?.timezone ?? "America/Mexico_City",
      cabinCount: model.cabinCount,
      cabinCapacity: model.cabinCapacity,
      branchMonthlyAmount: model.branchMonthlyAmount ?? 0,
      cabinMonthlyAmount: model.cabinMonthlyAmount ?? 0,
    });
    setOpen(true);
  }

  const submit = handleSubmit(async (values) => {
    const parsed = branchCommercialSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path[0] as keyof BranchCommercialForm, {
          message: issue.message,
        });
      }
      return;
    }
    setSaving(true);
    try {
      await schedulerDesignProposals.saveBranchCommercialModel({
        ...(parsed.data.id ? { id: parsed.data.id } : {}),
        commerceId: parsed.data.commerceId,
        mode: parsed.data.mode,
        timezone: parsed.data.timezone,
        cabinCount: parsed.data.cabinCount,
        cabinCapacity: parsed.data.cabinCapacity,
        ...(parsed.data.mode === "POS_LINKED"
          ? { posBranchId: parsed.data.posBranchId }
          : {
              branchName: parsed.data.branchName.trim(),
              branchMonthlyAmount: parsed.data.branchMonthlyAmount,
              cabinMonthlyAmount: parsed.data.cabinMonthlyAmount,
            }),
      });
      toast.success(
        parsed.data.id
          ? "Sucursal y cabinas actualizadas"
          : "Sucursal y cabinas configuradas",
      );
      setOpen(false);
      await onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la sucursal y sus cabinas.",
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <Card className="admin-card overflow-hidden border-[#d9c6b3]">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-[#ad8b67]" />
                <h2 className="admin-section-title">
                  Sucursales, contratación y cabinas
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Elige si la sucursal proviene del POS o si operará únicamente
                con Agenda. En ambos casos sus cabinas se configuran dentro de
                la misma alta y quedan disponibles como columnas de reserva.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/administracion?section=resources">
                  <DoorOpen className="mr-2 h-4 w-4" /> Ver recursos
                </Link>
              </Button>
              <Button disabled={!canAdmin} onClick={openNewModel} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Alta de sucursal
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#d8e1ea] bg-[#f4f8fb] p-4">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Store className="h-4 w-4 text-[#60758a]" /> POS + Agenda
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sólo permite seleccionar sucursales activas que ya existen en
                POS. Cada sucursal elige su propia cantidad y capacidad de cabinas.
              </p>
            </div>
            <div className="rounded-2xl border border-[#e6d8ca] bg-[#fbf7f2] p-4">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <CalendarDays className="h-4 w-4 text-[#ad8b67]" /> Solo Agenda
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Crea una sucursal independiente con renta mensual. Cada cabina
                agrega una cuota menor a la renta base de la sucursal.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {models.map((model) => (
              <div
                className="rounded-2xl border border-[#e7ddd3] bg-white p-4"
                key={model.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {model.branchName}
                    </p>
                    <Badge className="mt-2" variant="outline">
                      {modelLabel(model.mode)}
                    </Badge>
                  </div>
                  <Button
                    disabled={!canAdmin}
                    onClick={() => openExistingModel(model)}
                    size="sm"
                    variant="outline"
                  >
                    Configurar
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-[#f8f5f1] p-3">
                    <span className="text-xs text-slate-500">Cabinas</span>
                    <strong className="mt-1 block text-slate-800">
                      {model.cabinCount}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-[#f8f5f1] p-3">
                    <span className="text-xs text-slate-500">Capacidad</span>
                    <strong className="mt-1 block text-slate-800">
                      Base {model.cabinCapacity} por cabina nueva
                    </strong>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {model.estimatedMonthlyAmount === null
                    ? "Cobro administrado por la integración comercial con POS."
                    : `Estimado mensual demo: ${monthlyCurrency.format(model.estimatedMonthlyAmount)}.`}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="admin-dialog admin-dialog-wide max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Configurar sucursal y cabinas" : "Alta de sucursal y cabinas"}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={submit} noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["POS_LINKED", "POS + Agenda", "Selecciona una sucursal existente en POS."],
                ["SCHEDULER_STANDALONE", "Solo Agenda", "Crea una sucursal independiente con renta."],
              ] as const).map(([value, title, description]) => (
                <button
                  className={`rounded-2xl border p-4 text-left transition ${
                    mode === value
                      ? "border-[#ad8b67] bg-[#fbf7f2] ring-2 ring-[#ad8b67]/20"
                      : "border-[#e7ddd3] bg-white hover:border-[#ccb9a7]"
                  }`}
                  disabled={saving || editing}
                  key={value}
                  onClick={() => setValue("mode", value, { shouldDirty: true })}
                  type="button"
                >
                  <span className="font-semibold text-slate-800">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {description}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="branch-plan-commerce">Comercio</Label>
                <Select
                  disabled={saving}
                  onValueChange={(value) =>
                    setValue("commerceId", value, { shouldDirty: true })
                  }
                  value={watch("commerceId")}
                >
                  <SelectTrigger className="mt-2" id="branch-plan-commerce">
                    <SelectValue placeholder="Selecciona un comercio" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.commerces
                      .filter((commerce) => commerce.active)
                      .map((commerce) => (
                        <SelectItem key={commerce.id} value={commerce.id}>
                          {commerce.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.commerceId ? (
                  <p className="mt-1 text-xs text-red-700">{errors.commerceId.message}</p>
                ) : null}
              </div>

              {mode === "POS_LINKED" ? (
                <div>
                  <Label htmlFor="branch-plan-pos">Sucursal registrada en POS</Label>
                  <Select
                    disabled={saving || editing}
                    onValueChange={(value) =>
                      setValue("posBranchId", value, { shouldDirty: true })
                    }
                    value={watch("posBranchId")}
                  >
                    <SelectTrigger className="mt-2" id="branch-plan-pos">
                      <SelectValue placeholder="Selecciona una sucursal del POS" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.branches
                        .filter((branch) => branch.active)
                        .map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.posBranchId ? (
                    <p className="mt-1 text-xs text-red-700">{errors.posBranchId.message}</p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <Label htmlFor="branch-plan-name">Nombre de sucursal</Label>
                  <Input
                    className="mt-2"
                    disabled={saving}
                    id="branch-plan-name"
                    placeholder="Ej. Satélite"
                    {...register("branchName")}
                  />
                  {errors.branchName ? (
                    <p className="mt-1 text-xs text-red-700">{errors.branchName.message}</p>
                  ) : null}
                </div>
              )}

              <div>
                <Label htmlFor="branch-plan-cabins">Número de cabinas</Label>
                <Input
                  className="mt-2"
                  disabled={saving}
                  id="branch-plan-cabins"
                  max={20}
                  min={1}
                  type="number"
                  {...register("cabinCount", { valueAsNumber: true })}
                />
                {errors.cabinCount ? (
                  <p className="mt-1 text-xs text-red-700">Entre 1 y 20 cabinas.</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="branch-plan-capacity">
                  Personas por cabina nueva
                </Label>
                <Input
                  className="mt-2"
                  disabled={saving}
                  id="branch-plan-capacity"
                  max={10}
                  min={1}
                  type="number"
                  {...register("cabinCapacity", { valueAsNumber: true })}
                />
                {errors.cabinCapacity ? (
                  <p className="mt-1 text-xs text-red-700">Entre 1 y 10 personas.</p>
                ) : null}
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Las capacidades diferentes se ajustan después en Recursos sin
                  sobrescribir las cabinas existentes.
                </p>
              </div>
              <div>
                <Label htmlFor="branch-plan-timezone">Zona horaria IANA</Label>
                <Input
                  className="mt-2"
                  disabled={saving}
                  id="branch-plan-timezone"
                  {...register("timezone")}
                />
              </div>
            </div>

            {mode === "SCHEDULER_STANDALONE" ? (
              <div className="rounded-2xl border border-[#e6d8ca] bg-[#fbf7f2] p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <BadgeDollarSign className="h-4 w-4 text-[#ad8b67]" />
                  Configuración comercial demo
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Estos importes permiten validar la regla de renta; no ejecutan
                  cobros ni sustituyen el catálogo comercial definitivo.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="branch-plan-base-price">Renta mensual de sucursal</Label>
                    <Input
                      className="mt-2"
                      disabled={saving}
                      id="branch-plan-base-price"
                      min={1}
                      step={1}
                      type="number"
                      {...register("branchMonthlyAmount", { valueAsNumber: true })}
                    />
                    {errors.branchMonthlyAmount ? (
                      <p className="mt-1 text-xs text-red-700">{errors.branchMonthlyAmount.message}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="branch-plan-cabin-price">Renta mensual por cabina</Label>
                    <Input
                      className="mt-2"
                      disabled={saving}
                      id="branch-plan-cabin-price"
                      min={1}
                      step={1}
                      type="number"
                      {...register("cabinMonthlyAmount", { valueAsNumber: true })}
                    />
                    {errors.cabinMonthlyAmount ? (
                      <p className="mt-1 text-xs text-red-700">{errors.cabinMonthlyAmount.message}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#d8e1ea] bg-[#f4f8fb] p-4 text-sm text-slate-600">
              <strong className="text-slate-800">Resumen:</strong> {cabinCount || 0}{" "}
              {cabinCount === 1 ? "cabina" : "cabinas"}; las nuevas se crearán
              con capacidad de {watch("cabinCapacity") || 0}{" "}
              {watch("cabinCapacity") === 1 ? "persona" : "personas"}.
              {estimatedMonthlyAmount !== null ? (
                <span className="mt-1 block">
                  Estimado mensual demo: {monthlyCurrency.format(estimatedMonthlyAmount)}.
                </span>
              ) : (
                <span className="mt-1 block">
                  La sucursal se validará contra el catálogo activo del POS.
                </span>
              )}
            </div>

            <div className="flex justify-end">
              <Button disabled={!canAdmin || saving} type="submit">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando…" : "Guardar sucursal y cabinas"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
