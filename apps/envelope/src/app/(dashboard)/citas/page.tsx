"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  ArrowDown,
  Check,
  CheckCircle2,
  Clock3,
  Pencil,
  Plus,
  Save,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import type {
  EstatusCita,
  RegistroCita,
  TipoCompraCita,
} from "@cosmetics/types";
import type { ColumnDef, DateRange } from "@cosmetics/ui";
import {
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  DataTable,
  DatePicker,
  DateRangePicker,
  Dialog,
  DialogContent,
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
  Separator,
  toast,
  useIsMobile,
} from "@cosmetics/ui";
import { RefreshingDataIndicator } from "@/components/RefreshingDataIndicator";
import { TableLoadingSkeleton } from "@/components/layout/DataLoadingSkeleton";
import {
  useAppointmentCatalogs,
  useAppointments,
  useSucursales,
} from "@/hooks";
import { currentFortnightRange } from "@/lib/date-periods";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { formatCurrency, formatDate, todayISO } from "@/lib/utils";
import { actionButtonStyles } from "@/lib/action-button-styles";

const purchaseTypes = ["PAGO_NETO", "COMPRA_CON_APARTADO"] as const;
const appointmentStatuses = ["ATENDIDA", "NO_LLEGO", "CANCELADA"] as const;
const excludedSellerPositions = new Set([
  "ADMINISTRADOR",
  "ADMINISTRADOR GENERAL",
  "MANTENIMIENTO",
  "RECURSOS HUMANOS",
  "EXTERNO",
]);

const appointmentSchema = z
  .object({
    fecha: z.string().min(1, "Selecciona una fecha"),
    hora: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora válida"),
    categoriaId: z.string().min(1, "Selecciona una categoría"),
    subcategoriaId: z.string().min(1, "Selecciona un servicio"),
    estatus: z.enum(appointmentStatuses),
    nombreCliente: z
      .string()
      .trim()
      .min(2, "Escribe el nombre de la clienta")
      .max(160),
    sucursalId: z.string().min(1, "Selecciona una sucursal"),
    vendedorId: z.string().min(1, "Selecciona un vendedor"),
    facialistaId: z.string().min(1, "Selecciona una facialista"),
    compro: z.boolean(),
    tipoCompra: z.union([z.enum(purchaseTypes), z.literal("")]),
    montoCompra: z.coerce.number().finite().min(0),
    montoApartado: z.coerce.number().finite().min(0),
    bonoSalidaTarde: z.boolean(),
    bonoComida: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.compro && !data.tipoCompra) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoCompra"],
        message: "Selecciona el tipo de compra",
      });
    }
    if (data.compro && data.montoCompra <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["montoCompra"],
        message: "El monto debe ser mayor a cero",
      });
    }
    if (
      data.compro &&
      data.tipoCompra === "COMPRA_CON_APARTADO" &&
      data.montoApartado <= 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["montoApartado"],
        message: "El pago de apartado debe ser mayor a cero",
      });
    }
    if (
      data.compro &&
      data.tipoCompra === "COMPRA_CON_APARTADO" &&
      data.montoApartado > data.montoCompra
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["montoApartado"],
        message: "El pago de apartado no puede superar la compra tentativa",
      });
    }
    if (data.estatus !== "ATENDIDA" && data.compro) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estatus"],
        message: "Una cita no atendida no puede registrar compra",
      });
    }
  });

type AppointmentForm = z.infer<typeof appointmentSchema>;

const copy = {
  es: {
    title: "Registro de citas",
    step: "Paso",
    details: "Datos de la cita",
    team: "Atención y equipo",
    next: "Continuar",
    back: "Volver",
    inProgress: "En curso",
    completed: "Completado",
    service: "Datos de la atención",
    date: "Fecha",
    time: "Hora",
    client: "Nombre de la clienta",
    branch: "Sucursal",
    seller: "Vendedor",
    facialist: "Facialista",
    attentionType: "Servicio de atención",
    category: "Categoría",
    subcategory: "Servicio",
    noServices: "Primero da de alta una categoría y un servicio.",
    status: "Estatus",
    attended: "Atendida",
    noShow: "No llegó",
    cancelled: "Cancelada",
    searchSeller: "Buscar vendedor...",
    searchFacialist: "Buscar facialista...",
    purchase: "Resultado de compra",
    boughtQuestion: "¿La clienta compró?",
    no: "No compró",
    yes: "Sí compró",
    applies: "Aplica",
    notApplies: "No aplica",
    concept: "Concepto de compra",
    amount: "Monto",
    expectedPurchase: "Compra tentativa",
    net: "Pago neto",
    withDeposit: "Compra con apartado",
    depositPayment: "Pago de apartado",
    depositHelp: "Indica cuánto deja hoy la clienta para reservar esta compra.",
    balance: "Pendiente por cubrir",
    received: "Pago recibido hoy",
    bonuses: "Bonos aplicables",
    late: "Bono salida tarde",
    meal: "Bono de comida",
    total: "Total del registro",
    save: "Guardar cita",
    saved: "Cita registrada correctamente",
    edit: "Editar",
    editing: "Editando cita",
    update: "Guardar cambios",
    updated: "Cita actualizada correctamente",
    cancelEdit: "Cancelar edición",
    recent: "Citas registradas",
    noRecords: "Sin citas registradas en este período.",
    search: "Buscar citas...",
    loading: "Cargando citas",
    registeredBy: "Registró",
    purchaseColumn: "Compra",
    bonusColumn: "Bonos",
    none: "Sin compra",
    noBonus: "Sin bono",
    notAttendedHelp:
      "La compra y los bonos no aplican para una cita cancelada o cuando la clienta no llegó.",
    delete: "Eliminar",
    deleteTitle: "¿Eliminar esta cita?",
    deleteDescription: "Se eliminará permanentemente el registro de",
    deleteConfirm: "Eliminar cita",
    deleted: "Cita eliminada correctamente",
    deleting: "Eliminando...",
  },
  en: {
    title: "Appointment records",
    step: "Step",
    details: "Appointment details",
    team: "Service and team",
    next: "Continue",
    back: "Back",
    inProgress: "In progress",
    completed: "Completed",
    service: "Appointment details",
    date: "Date",
    time: "Time",
    client: "Client name",
    branch: "Branch",
    seller: "Seller",
    facialist: "Facialist",
    attentionType: "Care service",
    category: "Category",
    subcategory: "Service",
    noServices: "Create a category and service first.",
    status: "Status",
    attended: "Completed",
    noShow: "No show",
    cancelled: "Cancelled",
    searchSeller: "Search seller...",
    searchFacialist: "Search facialist...",
    purchase: "Purchase result",
    boughtQuestion: "Did the client buy?",
    no: "No purchase",
    yes: "Purchased",
    applies: "Applies",
    notApplies: "Does not apply",
    concept: "Purchase type",
    amount: "Amount",
    expectedPurchase: "Expected purchase",
    net: "Net payment",
    withDeposit: "Purchase with deposit",
    depositPayment: "Deposit payment",
    depositHelp: "Enter how much the client leaves today to reserve this purchase.",
    balance: "Balance remaining",
    received: "Payment received today",
    bonuses: "Applicable bonuses",
    late: "Late departure bonus",
    meal: "Meal bonus",
    total: "Record total",
    save: "Save appointment",
    saved: "Appointment saved successfully",
    edit: "Edit",
    editing: "Editing appointment",
    update: "Save changes",
    updated: "Appointment updated successfully",
    cancelEdit: "Cancel editing",
    recent: "Saved appointments",
    noRecords: "No appointments in this period.",
    search: "Search appointments...",
    loading: "Loading appointments",
    registeredBy: "Recorded by",
    purchaseColumn: "Purchase",
    bonusColumn: "Bonuses",
    none: "No purchase",
    noBonus: "No bonus",
    notAttendedHelp:
      "Purchases and bonuses do not apply to cancelled or no-show appointments.",
    delete: "Delete",
    deleteTitle: "Delete this appointment?",
    deleteDescription: "The appointment record for",
    deleteConfirm: "Delete appointment",
    deleted: "Appointment deleted successfully",
    deleting: "Deleting...",
  },
} as const;

export default function AppointmentsPage() {
  const { locale, t, dataTableLabels } = useI18n();
  const text = copy[locale];
  const isMobile = useIsMobile();
  const { user } = useSession();
  const isFacialistPosition = Boolean(
    user?.positionName
      ?.trim()
      .toLocaleUpperCase("es-MX")
      .includes("FACIALISTA"),
  );
  const canModifyExistingAppointments = !isFacialistPosition;
  const { sucursales } = useSucursales();
  const {
    employees,
    categories,
    loading: catalogsLoading,
    error: catalogsError,
  } = useAppointmentCatalogs();
  const [range, setRange] = useState<DateRange>(() => currentFortnightRange());
  const [editing, setEditing] = useState<RegistroCita | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<RegistroCita | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);
  const [desktopStep, setDesktopStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const appointmentFilters = useMemo(
    () => ({ fechaInicio: range.from, fechaFin: range.to }),
    [range.from, range.to],
  );
  const { records, loading, loaded, error, add, update, remove } =
    useAppointments(appointmentFilters);

  const form = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      fecha: todayISO(),
      hora: "",
      categoriaId: "",
      subcategoriaId: "",
      estatus: "ATENDIDA",
      nombreCliente: "",
      sucursalId: "",
      vendedorId: "",
      facialistaId: "",
      compro: false,
      tipoCompra: "",
      montoCompra: 0,
      montoApartado: 0,
      bonoSalidaTarde: false,
      bonoComida: false,
    },
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;
  const bought = watch("compro");
  const status = watch("estatus");
  const attended = status === "ATENDIDA";
  const purchaseType = watch("tipoCompra");
  const amount = watch("montoCompra") || 0;
  const depositAmount = watch("montoApartado") || 0;
  const isPurchaseWithDeposit = purchaseType === "COMPRA_CON_APARTADO";
  const receivedAmount = isPurchaseWithDeposit ? depositAmount : amount;
  const outstandingAmount = Math.max(Number(amount) - Number(depositAmount), 0);
  const lateBonus = watch("bonoSalidaTarde");
  const mealBonus = watch("bonoComida");

  const visibleBranches = sucursales;

  const sellers = useMemo(() => {
    return employees.filter((employee) => {
      const positionName = (employee.position?.nombre ?? employee.puesto)
        .trim()
        .toUpperCase();
      return !excludedSellerPositions.has(positionName);
    });
  }, [employees]);
  const facialists = useMemo(() => {
    const matched = employees.filter((employee) =>
      (employee.position?.nombre ?? employee.puesto)
        .trim()
        .toUpperCase()
        .includes("FACIALISTA"),
    );
    const available = matched.length > 0 ? matched : employees;
    return user?.selfDataOnly && user.empleadoId
      ? available.filter((employee) => employee.id === user.empleadoId)
      : available;
  }, [employees, user?.empleadoId, user?.selfDataOnly]);

  useEffect(() => {
    if (
      !form.getValues("sucursalId") &&
      visibleBranches.length === 1 &&
      visibleBranches[0]
    ) {
      setValue("sucursalId", visibleBranches[0].id, { shouldValidate: true });
    }
  }, [form, setValue, visibleBranches]);

  useEffect(() => {
    if (
      !form.getValues("facialistaId") &&
      user?.empleadoId &&
      facialists.some((employee) => employee.id === user.empleadoId)
    ) {
      setValue("facialistaId", user.empleadoId, { shouldValidate: true });
    }
  }, [facialists, form, setValue, user?.empleadoId]);

  const employeeOption = (employee: {
    id: string;
    nombreCompleto: string;
  }) => ({ value: employee.id, label: employee.nombreCompleto });
  const conceptLabels: Record<TipoCompraCita, string> = {
    PAGO_NETO: text.net,
    COMPRA_CON_APARTADO: text.withDeposit,
    PAGO_DE_APARTADO: text.depositPayment,
  };
  const selectedCategoryId = watch("categoriaId");
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );
  const availableSubcategories = selectedCategory?.subcategorias ?? [];
  const statusLabels: Record<EstatusCita, string> = {
    ATENDIDA: text.attended,
    NO_LLEGO: text.noShow,
    CANCELADA: text.cancelled,
  };

  const columns = useMemo<ColumnDef<RegistroCita>[]>(
    () => [
      {
        accessorKey: "fecha",
        header: text.date.toUpperCase(),
        cell: ({ row }) => formatDate(row.original.fecha, "dd/MM/yyyy", locale),
      },
      {
        accessorKey: "hora",
        header: text.time.toUpperCase(),
        cell: ({ row }) => row.original.hora ?? "—",
      },
      {
        accessorKey: "subcategoriaNombre",
        header: text.attentionType.toUpperCase(),
        cell: ({ row }) => (
          <div>
            <div>{row.original.subcategoriaNombre}</div>
            <div className="text-xs text-[color:var(--text-muted)]">
              {row.original.categoriaNombre}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "estatus",
        header: text.status.toUpperCase(),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.estatus === "ATENDIDA"
                ? "outline"
                : row.original.estatus === "NO_LLEGO"
                  ? "destructive"
                  : "secondary"
            }
          >
            {statusLabels[row.original.estatus].toUpperCase()}
          </Badge>
        ),
      },
      { accessorKey: "nombreCliente", header: text.client.toUpperCase() },
      { accessorKey: "sucursalNombre", header: text.branch.toUpperCase() },
      { accessorKey: "vendedorNombre", header: text.seller.toUpperCase() },
      { accessorKey: "facialistaNombre", header: text.facialist.toUpperCase() },
      {
        id: "purchase",
        accessorFn: (row) =>
          row.tipoCompra
            ? `${conceptLabels[row.tipoCompra]} ${row.total}`
            : text.none,
        header: text.purchaseColumn.toUpperCase(),
        cell: ({ row }) =>
          row.original.tipoCompra ? (
            row.original.tipoCompra === "COMPRA_CON_APARTADO" ? (
              <div className="space-y-1">
                <div>
                  <span>{text.withDeposit}</span>
                  <span className="number-display ml-2 text-xs">
                    {formatCurrency(row.original.montoCompra)}
                  </span>
                </div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  <span>{text.depositPayment}</span>
                  <span className="number-display ml-2">
                    {formatCurrency(row.original.montoApartado)}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div>{conceptLabels[row.original.tipoCompra]}</div>
                <div className="number-display text-xs">
                  {formatCurrency(row.original.total)}
                </div>
              </div>
            )
          ) : (
            <Badge variant="secondary">{text.none.toUpperCase()}</Badge>
          ),
      },
      {
        id: "bonuses",
        accessorFn: (row) =>
          [
            row.bonoSalidaTarde ? text.late : "",
            row.bonoComida ? text.meal : "",
          ]
            .filter(Boolean)
            .join(" ") || text.noBonus,
        header: text.bonusColumn.toUpperCase(),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.bonoSalidaTarde && (
              <Badge variant="outline">{text.late.toUpperCase()}</Badge>
            )}
            {row.original.bonoComida && (
              <Badge variant="outline">{text.meal.toUpperCase()}</Badge>
            )}
            {!row.original.bonoSalidaTarde && !row.original.bonoComida && (
              <span className="text-xs text-[color:var(--text-muted)]">
                {text.noBonus}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "creadoPorNombre",
        header: text.registeredBy.toUpperCase(),
      },
      ...(canModifyExistingAppointments ? [{
        id: "actions",
        header: t.common.actions.toUpperCase(),
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`${text.edit}: ${row.original.nombreCliente}`}
              title={text.edit}
              onClick={() => openEdit(row.original)}
              className={`${actionButtonStyles.neutral} h-9 w-9`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`${text.delete}: ${row.original.nombreCliente}`}
              title={text.delete}
              onClick={() => setRecordToDelete(row.original)}
              className={`${actionButtonStyles.danger} h-9 w-9`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        meta: { align: "right" },
      } satisfies ColumnDef<RegistroCita>] : []),
    ],
    [
      canModifyExistingAppointments,
      conceptLabels,
      locale,
      statusLabels,
      t.common.actions,
      text,
    ],
  );

  async function onSubmit(data: AppointmentForm) {
    try {
      const input = {
        fecha: data.fecha,
        hora: data.hora,
        subcategoriaId: data.subcategoriaId,
        estatus: data.estatus,
        nombreCliente: data.nombreCliente.trim(),
        sucursalId: data.sucursalId,
        vendedorId: data.vendedorId,
        facialistaId: data.facialistaId,
        tipoCompra:
          data.estatus === "ATENDIDA" && data.compro
            ? (data.tipoCompra as TipoCompraCita)
            : null,
        montoCompra:
          data.estatus === "ATENDIDA" && data.compro ? data.montoCompra : 0,
        montoApartado:
          data.estatus === "ATENDIDA" &&
          data.compro &&
          data.tipoCompra === "COMPRA_CON_APARTADO"
            ? data.montoApartado
            : 0,
        bonoSalidaTarde: data.estatus === "ATENDIDA" && data.bonoSalidaTarde,
        bonoComida: data.estatus === "ATENDIDA" && data.bonoComida,
      };
      if (editing) {
        await update(editing.id, input);
        toast.success(text.updated);
      } else {
        await add(input);
        toast.success(text.saved);
      }
      setEditing(null);
      setMobileDialogOpen(false);
      setDesktopStep(1);
      reset({
        fecha: data.fecha,
        hora: "",
        categoriaId: data.categoriaId,
        subcategoriaId: data.subcategoriaId,
        estatus: "ATENDIDA",
        nombreCliente: "",
        sucursalId: data.sucursalId,
        vendedorId: "",
        facialistaId: data.facialistaId,
        compro: false,
        tipoCompra: "",
        montoCompra: 0,
        montoApartado: 0,
        bonoSalidaTarde: false,
        bonoComida: false,
      });
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : editing
            ? "No se pudo actualizar la cita"
            : "No se pudo registrar la cita",
      );
    }
  }

  function openEdit(record: RegistroCita) {
    setEditing(record);
    setDesktopStep(isMobile ? 1 : 3);
    reset({
      fecha: record.fecha,
      hora: record.hora ?? "",
      categoriaId: record.categoriaId,
      subcategoriaId: record.subcategoriaId,
      estatus: record.estatus,
      nombreCliente: record.nombreCliente,
      sucursalId: record.sucursalId,
      vendedorId: record.vendedorId,
      facialistaId: record.facialistaId,
      compro: record.tipoCompra !== null,
      tipoCompra:
        record.tipoCompra === "PAGO_DE_APARTADO"
          ? "PAGO_NETO"
          : (record.tipoCompra ?? ""),
      montoCompra: record.montoCompra,
      montoApartado: record.montoApartado,
      bonoSalidaTarde: record.bonoSalidaTarde,
      bonoComida: record.bonoComida,
    });
    if (isMobile) setMobileDialogOpen(true);
    else
      requestAnimationFrame(() =>
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
  }

  function cancelEdit() {
    setEditing(null);
    setMobileDialogOpen(false);
    setDesktopStep(1);
    reset({
      fecha: todayISO(),
      hora: "",
      categoriaId: "",
      subcategoriaId: "",
      estatus: "ATENDIDA",
      nombreCliente: "",
      sucursalId:
        visibleBranches.length === 1 ? (visibleBranches[0]?.id ?? "") : "",
      vendedorId: "",
      facialistaId:
        user?.empleadoId &&
        facialists.some((employee) => employee.id === user.empleadoId)
          ? user.empleadoId
          : "",
      compro: false,
      tipoCompra: "",
      montoCompra: 0,
      montoApartado: 0,
      bonoSalidaTarde: false,
      bonoComida: false,
    });
  }

  async function handleDelete() {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      await remove(recordToDelete.id);
      if (editing?.id === recordToDelete.id) cancelEdit();
      toast.success(text.deleted);
      setRecordToDelete(null);
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar la cita",
      );
    } finally {
      setDeleting(false);
    }
  }

  function selectPurchase(value: boolean) {
    setValue("compro", value, { shouldValidate: true });
    if (!value) {
      setValue("tipoCompra", "", { shouldValidate: true });
      setValue("montoCompra", 0, { shouldValidate: true });
      setValue("montoApartado", 0, { shouldValidate: true });
    }
  }

  function selectPurchaseType(value: AppointmentForm["tipoCompra"]) {
    setValue("tipoCompra", value, { shouldValidate: true });
    if (value !== "COMPRA_CON_APARTADO")
      setValue("montoApartado", 0, { shouldValidate: true });
  }

  function selectStatus(value: EstatusCita) {
    setValue("estatus", value, { shouldValidate: true });
    if (value !== "ATENDIDA") {
      setValue("compro", false);
      setValue("tipoCompra", "");
      setValue("montoCompra", 0);
      setValue("montoApartado", 0);
      setValue("bonoSalidaTarde", false);
      setValue("bonoComida", false);
    }
  }

  function selectCategory(categoryId: string) {
    setValue("categoriaId", categoryId, { shouldValidate: true });
    setValue("subcategoriaId", "", { shouldDirty: true });
    clearErrors("subcategoriaId");
  }

  function selectSubcategory(subcategoriaId: string) {
    setValue("subcategoriaId", subcategoriaId, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function continueDesktopStep(step: 1 | 2) {
    const fields =
      step === 1
        ? (["fecha", "hora", "nombreCliente", "sucursalId"] as const)
        : ([
            "categoriaId",
            "subcategoriaId",
            "estatus",
            "vendedorId",
            "facialistaId",
          ] as const);
    if (await trigger(fields)) setDesktopStep(step + 1);
  }

  function openTimePicker(input: HTMLInputElement) {
    try {
      input.showPicker?.();
    } catch {
      // Algunos navegadores solo permiten el selector nativo desde su propio control.
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 md:mx-0 md:max-w-none md:space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="page-title uppercase">{text.title}</h1>
      </div>

      {editing && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--color-gold)] bg-[color:var(--accent-hover)] px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Pencil className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.12em]">
                {text.editing}
              </div>
              <div className="truncate text-sm">
                {editing.nombreCliente} ·{" "}
                {formatDate(editing.fecha, "dd/MM/yyyy", locale)}{" "}
                {editing.hora ?? ""}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancelEdit}
            className="cursor-pointer"
          >
            <X className="mr-2 h-4 w-4" />
            {text.cancelEdit}
          </Button>
        </div>
      )}

      {!isMobile && (
        <form
          ref={formRef}
          onSubmit={handleSubmit(onSubmit)}
          className="scroll-mt-4 space-y-5"
        >
          <Card
            aria-current={desktopStep === 1 ? "step" : undefined}
            className={`border-l-4 transition-[border-color,box-shadow] duration-200 ${desktopStep === 1 ? "border-l-[color:var(--color-gold)] shadow-[0_8px_24px_rgba(195,165,131,0.18)]" : "border-l-[color:var(--color-green-olive)]"}`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-caps">{text.step} 1</p>
                  <CardTitle className="mt-1 text-lg">{text.details}</CardTitle>
                </div>
                {desktopStep > 1 ? (
                  <Badge className="gap-1.5 border-green-200 bg-green-50 text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {text.completed}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-[color:var(--color-gold)]"
                  >
                    {text.inProgress}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-x-3 gap-y-4 md:grid-cols-12">
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="appointment-date" className="uppercase">
                  {text.date}
                </Label>
                <Controller
                  name="fecha"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      id="appointment-date"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.fecha && (
                  <p className="text-xs text-red-500">{errors.fecha.message}</p>
                )}
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="appointment-time" className="uppercase">
                  {text.time}
                </Label>
                <Input
                  id="appointment-time"
                  type="time"
                  step="60"
                  aria-invalid={Boolean(errors.hora)}
                  aria-describedby={
                    errors.hora ? "appointment-time-error" : undefined
                  }
                  className="cursor-pointer tabular-nums md:max-w-36"
                  {...register("hora")}
                  onClick={(event) => openTimePicker(event.currentTarget)}
                />
                {errors.hora && (
                  <p
                    id="appointment-time-error"
                    className="text-xs text-red-500"
                  >
                    {errors.hora.message}
                  </p>
                )}
              </div>
              <div className="col-span-full space-y-1.5 md:order-4 md:col-span-5">
                <Label htmlFor="client-name" className="uppercase">
                  {text.client}
                </Label>
                <Input
                  id="client-name"
                  autoComplete="off"
                  className="uppercase"
                  {...register("nombreCliente")}
                />
                {errors.nombreCliente && (
                  <p className="text-xs text-red-500">
                    {errors.nombreCliente.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 md:order-3 md:col-span-3">
                <Label className="uppercase">{text.branch}</Label>
                <Controller
                  name="sucursalId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={text.branch} />
                      </SelectTrigger>
                      <SelectContent>
                        {visibleBranches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.sucursalId && (
                  <p className="text-xs text-red-500">
                    {errors.sucursalId.message}
                  </p>
                )}
              </div>
              <div className="col-span-full flex justify-end md:order-5">
                <Button
                  type="button"
                  onClick={() => void continueDesktopStep(1)}
                  className="cursor-pointer"
                >
                  {text.next}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {desktopStep >= 2 && (
            <Card
              aria-current={desktopStep === 2 ? "step" : undefined}
              className={`border-l-4 transition-[border-color,box-shadow] duration-200 ${desktopStep === 2 ? "border-l-[color:var(--color-gold)] shadow-[0_8px_24px_rgba(195,165,131,0.18)]" : "border-l-[color:var(--color-green-olive)]"}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="label-caps">{text.step} 2</p>
                    <CardTitle className="mt-1 text-lg">{text.team}</CardTitle>
                  </div>
                  {desktopStep > 2 ? (
                    <Badge className="gap-1.5 border-green-200 bg-green-50 text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {text.completed}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-[color:var(--color-gold)]"
                    >
                      {text.inProgress}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-x-3 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="uppercase">{text.category}</Label>
                  <Controller
                    name="categoriaId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={selectCategory}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={text.category} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.categoriaId && (
                    <p className="text-xs text-red-500">
                      {errors.categoriaId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="uppercase">{text.subcategory}</Label>
                  <Controller
                    name="subcategoriaId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={selectSubcategory}
                        disabled={!selectedCategoryId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={text.subcategory} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubcategories.map((subcategory) => (
                            <SelectItem
                              key={subcategory.id}
                              value={subcategory.id}
                            >
                              {subcategory.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.subcategoriaId && (
                    <p className="text-xs text-red-500">
                      {errors.subcategoriaId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="uppercase">{text.status}</Label>
                  <Controller
                    name="estatus"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          selectStatus(value as EstatusCita)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {appointmentStatuses.map((appointmentStatus) => (
                            <SelectItem
                              key={appointmentStatus}
                              value={appointmentStatus}
                            >
                              {statusLabels[appointmentStatus]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.estatus && (
                    <p className="text-xs text-red-500">
                      {errors.estatus.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="uppercase">{text.seller}</Label>
                  <Controller
                    name="vendedorId"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={sellers.map(employeeOption)}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={text.seller}
                        searchPlaceholder={text.searchSeller}
                        emptyMessage={text.searchSeller}
                        disabled={catalogsLoading}
                      />
                    )}
                  />
                  {errors.vendedorId && (
                    <p className="text-xs text-red-500">
                      {errors.vendedorId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5 xl:col-span-2">
                  <Label className="uppercase">{text.facialist}</Label>
                  <Controller
                    name="facialistaId"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={facialists.map(employeeOption)}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={text.facialist}
                        searchPlaceholder={text.searchFacialist}
                        emptyMessage={text.searchFacialist}
                        disabled={catalogsLoading}
                      />
                    )}
                  />
                  {errors.facialistaId && (
                    <p className="text-xs text-red-500">
                      {errors.facialistaId.message}
                    </p>
                  )}
                </div>
                <div className="col-span-full flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDesktopStep(1)}
                    className="cursor-pointer"
                  >
                    {text.back}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void continueDesktopStep(2)}
                    className="cursor-pointer"
                  >
                    {text.next}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {desktopStep >= 3 && (
            <Card
              aria-current="step"
              className="border-l-4 border-l-[color:var(--color-gold)] shadow-[0_8px_24px_rgba(195,165,131,0.18)]"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="label-caps">{text.step} 3</p>
                    <CardTitle className="mt-1 text-lg">
                      {text.purchase}
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-[color:var(--color-gold)]"
                  >
                    {text.inProgress}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {attended ? (
                  <>
                    <fieldset className="space-y-2">
                      <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                        {text.boughtQuestion}
                      </legend>
                      <div className="grid max-w-md grid-cols-2 gap-1 rounded-lg bg-[color:var(--bg-primary)] p-1">
                        <button
                          type="button"
                          aria-pressed={!bought}
                          onClick={() => selectPurchase(false)}
                          className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)] ${!bought ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] shadow-sm" : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"}`}
                        >
                          <X className="h-4 w-4" />
                          {text.no}
                        </button>
                        <button
                          type="button"
                          aria-pressed={bought}
                          onClick={() => selectPurchase(true)}
                          className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)] ${bought ? "bg-[var(--color-green-olive)] text-white shadow-sm" : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"}`}
                        >
                          <Check className="h-4 w-4" />
                          {text.yes}
                        </button>
                      </div>
                    </fieldset>

                    {bought && (
                      <div className="space-y-4 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] p-4">
                        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)]">
                          <div className="space-y-2">
                            <Label className="uppercase">{text.concept}</Label>
                            <Controller
                              name="tipoCompra"
                              control={control}
                              render={({ field }) => (
                                <Select
                                  value={field.value}
                                  onValueChange={(value) =>
                                    selectPurchaseType(
                                      value as AppointmentForm["tipoCompra"],
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={text.concept} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {purchaseTypes.map((type) => (
                                      <SelectItem key={type} value={type}>
                                        {conceptLabels[type]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {errors.tipoCompra && (
                              <p className="text-xs text-red-500">
                                {errors.tipoCompra.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="purchase-amount"
                              className="uppercase"
                            >
                              {isPurchaseWithDeposit
                                ? text.expectedPurchase
                                : text.amount}
                            </Label>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--text-muted)]">
                                $
                              </span>
                              <Input
                                id="purchase-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                className="pl-7 text-right tabular-nums"
                                {...register("montoCompra")}
                              />
                            </div>
                            {errors.montoCompra && (
                              <p className="text-xs text-red-500">
                                {errors.montoCompra.message}
                              </p>
                            )}
                          </div>
                        </div>
                        {isPurchaseWithDeposit && (
                          <div className="grid gap-3 rounded-lg border border-[color:var(--color-gold)] bg-[color:var(--bg-card)] p-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)]">
                            <div className="md:col-span-2 flex items-center gap-2 border-b border-[color:var(--border-color)] pb-3 text-sm font-medium text-[color:var(--text-primary)]">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-hover)] text-[color:var(--text-secondary)]">
                                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                              </span>
                              {text.depositHelp}
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {text.depositPayment}
                              </div>
                              <p className="text-xs text-[color:var(--text-muted)]">
                                {text.received}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="deposit-amount"
                                className="sr-only"
                              >
                                {text.depositPayment}
                              </Label>
                              <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--text-muted)]">
                                  $
                                </span>
                                <Input
                                  id="deposit-amount"
                                  type="number"
                                  min="0"
                                  max={amount || undefined}
                                  step="0.01"
                                  inputMode="decimal"
                                  className="border-[color:var(--color-gold)] bg-[color:var(--bg-primary)] pl-7 text-right tabular-nums"
                                  {...register("montoApartado")}
                                />
                              </div>
                              {errors.montoApartado && (
                                <p className="text-xs text-red-500">
                                  {errors.montoApartado.message}
                                </p>
                              )}
                            </div>
                            <div className="md:col-span-2 flex justify-end text-sm">
                              <span className="mr-2 text-[color:var(--text-muted)]">
                                {text.balance}
                              </span>
                              <span className="number-display">
                                {formatCurrency(outstandingAmount)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-sm font-medium uppercase">
                        {text.bonuses}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:max-w-2xl">
                        <button
                          type="button"
                          aria-pressed={lateBonus}
                          onClick={() =>
                            setValue("bonoSalidaTarde", !lateBonus)
                          }
                          className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)] ${lateBonus ? "border-[color:var(--color-gold)] bg-[color:var(--accent-hover)]" : "border-[color:var(--border-color)] hover:bg-[color:var(--bg-primary)]"}`}
                        >
                          <Clock3 className="h-4 w-4" />
                          <span className="flex-1">{text.late}</span>
                          {lateBonus && <Check className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          aria-pressed={mealBonus}
                          onClick={() => setValue("bonoComida", !mealBonus)}
                          className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)] ${mealBonus ? "border-[color:var(--color-gold)] bg-[color:var(--accent-hover)]" : "border-[color:var(--border-color)] hover:bg-[color:var(--bg-primary)]"}`}
                        >
                          <Utensils className="h-4 w-4" />
                          <span className="flex-1">{text.meal}</span>
                          {mealBonus && <Check className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    role="status"
                    className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] p-4 text-sm text-[color:var(--text-muted)]"
                  >
                    {text.notAttendedHelp}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 border-t border-[color:var(--border-color)] pt-4">
                  {bought && attended ? (
                    <div>
                      <div className="text-xs text-[color:var(--text-muted)]">
                        {isPurchaseWithDeposit ? text.received : text.amount}
                      </div>
                      <div className="number-display text-lg">
                        {formatCurrency(Number(receivedAmount))}
                      </div>
                    </div>
                  ) : (
                    <span />
                  )}
                  <Button
                    type="submit"
                    disabled={isSubmitting || catalogsLoading}
                    className="min-h-11 flex-1 cursor-pointer sm:max-w-52"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting
                      ? t.common.saving
                      : editing
                        ? text.update
                        : text.save}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      )}

      {isMobile && (
        <Dialog
          open={mobileDialogOpen}
          onOpenChange={(open) => {
            setMobileDialogOpen(open);
            if (!open && editing) cancelEdit();
          }}
        >
          <Button
            type="button"
            onClick={() => setMobileDialogOpen(true)}
            className="min-h-11 w-full cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            {text.save}
          </Button>
          <DialogContent className="inset-0 flex h-[100dvh] w-screen max-h-none max-w-none translate-x-0 translate-y-0 flex-col gap-3 overflow-hidden rounded-none border-0 p-4">
            <DialogHeader>
              <DialogTitle className="section-heading uppercase">
                {editing ? text.editing : text.title}
              </DialogTitle>
            </DialogHeader>
            <Separator />
            <form
              id="mobile-appointment-form"
              onSubmit={handleSubmit(onSubmit)}
              className="grid min-h-0 flex-1 content-start grid-cols-2 gap-x-3 gap-y-3 overflow-y-auto"
            >
              <div className="space-y-1">
                <Label
                  htmlFor="mobile-appointment-date"
                  className="text-[10px] uppercase"
                >
                  {text.date}
                </Label>
                <Controller
                  name="fecha"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      id="mobile-appointment-date"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.fecha && (
                  <p className="text-xs text-red-500">{errors.fecha.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="mobile-appointment-time"
                  className="text-[10px] uppercase"
                >
                  {text.time}
                </Label>
                <Input
                  id="mobile-appointment-time"
                  type="time"
                  step="60"
                  className="cursor-pointer tabular-nums"
                  {...register("hora")}
                  onClick={(event) => openTimePicker(event.currentTarget)}
                />
                {errors.hora && (
                  <p className="text-xs text-red-500">{errors.hora.message}</p>
                )}
              </div>
              <div className="col-span-2 space-y-1">
                <Label
                  htmlFor="mobile-client-name"
                  className="text-[10px] uppercase"
                >
                  {text.client}
                </Label>
                <Input
                  id="mobile-client-name"
                  autoComplete="off"
                  className="uppercase"
                  {...register("nombreCliente")}
                />
                {errors.nombreCliente && (
                  <p className="text-xs text-red-500">
                    {errors.nombreCliente.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">{text.category}</Label>
                <Controller
                  name="categoriaId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={selectCategory}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={text.category} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoriaId && (
                  <p className="text-xs text-red-500">
                    {errors.categoriaId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">
                  {text.subcategory}
                </Label>
                <Controller
                  name="subcategoriaId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={selectSubcategory}
                      disabled={!selectedCategoryId}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={text.subcategory} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubcategories.map((subcategory) => (
                          <SelectItem
                            key={subcategory.id}
                            value={subcategory.id}
                          >
                            {subcategory.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.subcategoriaId && (
                  <p className="text-xs text-red-500">
                    {errors.subcategoriaId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">{text.status}</Label>
                <Controller
                  name="estatus"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        selectStatus(value as EstatusCita)
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentStatuses.map((appointmentStatus) => (
                          <SelectItem
                            key={appointmentStatus}
                            value={appointmentStatus}
                          >
                            {statusLabels[appointmentStatus]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase">{text.branch}</Label>
                <Controller
                  name="sucursalId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={text.branch} />
                      </SelectTrigger>
                      <SelectContent>
                        {visibleBranches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.sucursalId && (
                  <p className="text-xs text-red-500">
                    {errors.sucursalId.message}
                  </p>
                )}
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] uppercase">{text.seller}</Label>
                <Controller
                  name="vendedorId"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={sellers.map(employeeOption)}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={text.seller}
                      searchPlaceholder={text.searchSeller}
                      emptyMessage={text.searchSeller}
                      disabled={catalogsLoading}
                    />
                  )}
                />
                {errors.vendedorId && (
                  <p className="text-xs text-red-500">
                    {errors.vendedorId.message}
                  </p>
                )}
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] uppercase">
                  {text.facialist}
                </Label>
                <Controller
                  name="facialistaId"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={facialists.map(employeeOption)}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={text.facialist}
                      searchPlaceholder={text.searchFacialist}
                      emptyMessage={text.searchFacialist}
                      disabled={catalogsLoading}
                    />
                  )}
                />
                {errors.facialistaId && (
                  <p className="text-xs text-red-500">
                    {errors.facialistaId.message}
                  </p>
                )}
              </div>
              {attended && (
                <>
                  <div className="col-span-2 flex items-center gap-3 py-1">
                    <Separator className="flex-1" />
                    <span className="label-caps shrink-0">{text.purchase}</span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">
                      {text.boughtQuestion}
                    </Label>
                    <Select
                      value={bought ? "yes" : "no"}
                      onValueChange={(value) => selectPurchase(value === "yes")}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">{text.no}</SelectItem>
                        <SelectItem value="yes">{text.yes}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {bought && (
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase">
                        {text.concept}
                      </Label>
                      <Controller
                        name="tipoCompra"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) =>
                              selectPurchaseType(
                                value as AppointmentForm["tipoCompra"],
                              )
                            }
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder={text.concept} />
                            </SelectTrigger>
                            <SelectContent>
                              {purchaseTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {conceptLabels[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.tipoCompra && (
                        <p className="text-xs text-red-500">
                          {errors.tipoCompra.message}
                        </p>
                      )}
                    </div>
                  )}
                  {bought && (
                    <div className="space-y-1">
                      <Label
                        htmlFor="mobile-purchase-amount"
                        className="text-[10px] uppercase"
                      >
                        {isPurchaseWithDeposit
                          ? text.expectedPurchase
                          : text.amount}
                      </Label>
                      <Input
                        id="mobile-purchase-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="h-10 text-right tabular-nums"
                        {...register("montoCompra")}
                      />
                      {errors.montoCompra && (
                        <p className="text-xs text-red-500">
                          {errors.montoCompra.message}
                        </p>
                      )}
                    </div>
                  )}
                  {bought && isPurchaseWithDeposit && (
                    <div className="space-y-1">
                      <Label
                        htmlFor="mobile-deposit-amount"
                        className="text-[10px] uppercase"
                      >
                        {text.depositPayment}
                      </Label>
                      <Input
                        id="mobile-deposit-amount"
                        type="number"
                        min="0"
                        max={amount || undefined}
                        step="0.01"
                        inputMode="decimal"
                        className="h-10 text-right tabular-nums"
                        {...register("montoApartado")}
                      />
                      {errors.montoApartado && (
                        <p className="text-xs text-red-500">
                          {errors.montoApartado.message}
                        </p>
                      )}
                    </div>
                  )}
                  {bought && isPurchaseWithDeposit && (
                    <div className="col-span-2 flex justify-end text-xs">
                      <span className="mr-2 text-[color:var(--text-muted)]">
                        {text.balance}
                      </span>
                      <span className="number-display">
                        {formatCurrency(outstandingAmount)}
                      </span>
                    </div>
                  )}
                  <div className="col-span-2 flex items-center gap-3 py-1">
                    <Separator className="flex-1" />
                    <span className="label-caps shrink-0">{text.bonuses}</span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase">
                        {text.late}
                      </Label>
                      <Select
                        value={lateBonus ? "yes" : "no"}
                        onValueChange={(value) =>
                          setValue("bonoSalidaTarde", value === "yes")
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">{text.notApplies}</SelectItem>
                          <SelectItem value="yes">{text.applies}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase">
                        {text.meal}
                      </Label>
                      <Select
                        value={mealBonus ? "yes" : "no"}
                        onValueChange={(value) =>
                          setValue("bonoComida", value === "yes")
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">{text.notApplies}</SelectItem>
                          <SelectItem value="yes">{text.applies}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </form>
            <DialogFooter className="shrink-0 border-t border-[color:var(--border-color)] pt-3 flex-row justify-end gap-2 space-x-0">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEdit}
                className="cursor-pointer"
              >
                {t.common.cancel}
              </Button>
              <Button
                form="mobile-appointment-form"
                type="submit"
                disabled={isSubmitting || catalogsLoading}
                className="cursor-pointer"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting
                  ? t.common.saving
                  : editing
                    ? text.update
                    : text.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {(catalogsError || error) && (
        <p role="alert" className="text-sm text-red-500">
          {catalogsError ?? error}
        </p>
      )}

      <section className="space-y-3 border-t border-[color:var(--border-color)] pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="section-heading uppercase">{text.recent}</h2>
          <DateRangePicker
            value={range}
            onChange={setRange}
            fromLabel={t.common.from}
            toLabel={t.common.to}
          />
        </div>
        {loading && loaded && (
          <RefreshingDataIndicator label={t.common.refreshingData} />
        )}
        {loading && !loaded ? (
          <TableLoadingSkeleton columns={13} rows={6} label={text.loading} />
        ) : (
          <>
            <div className="space-y-1 divide-y divide-[color:var(--border-color)] md:hidden">
              {records.length === 0 ? (
                <p className="py-8 text-center text-sm text-[color:var(--text-muted)]">
                  {text.noRecords}
                </p>
              ) : (
                records.map((record) => (
                  <article
                    key={record.id}
                    className="flex items-center gap-2 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <time className="shrink-0 text-sm font-semibold tabular-nums underline decoration-[color:var(--border-color)] underline-offset-4">
                          {record.hora ?? "—"}
                        </time>
                        <p className="truncate text-sm font-medium">
                          {record.nombreCliente}
                        </p>
                        {record.estatus !== "ATENDIDA" && (
                          <Badge
                            variant={
                              record.estatus === "NO_LLEGO"
                                ? "destructive"
                                : "secondary"
                            }
                            className="shrink-0 text-[10px]"
                          >
                            {statusLabels[record.estatus].toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-[color:var(--text-muted)]">
                        {record.vendedorNombre} · {record.categoriaNombre}:{" "}
                        {record.subcategoriaNombre} · {record.facialistaNombre}
                        {record.tipoCompra
                          ? ` · ${record.tipoCompra === "COMPRA_CON_APARTADO" ? `${formatCurrency(record.montoCompra)} / ${text.depositPayment}: ${formatCurrency(record.montoApartado)}` : formatCurrency(record.total)}`
                          : ""}
                      </p>
                    </div>
                    {canModifyExistingAppointments ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`${text.edit}: ${record.nombreCliente}`}
                          onClick={() => openEdit(record)}
                          className={`${actionButtonStyles.neutral} h-9 w-9 shrink-0`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`${text.delete}: ${record.nombreCliente}`}
                          onClick={() => setRecordToDelete(record)}
                          className={`${actionButtonStyles.danger} h-9 w-9 shrink-0`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
                  </article>
                ))
              )}
            </div>
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                data={records}
                emptyMessage={text.noRecords}
                searchPlaceholder={text.search}
                pageSize={20}
                labels={dataTableLabels}
              />
            </div>
          </>
        )}
      </section>

      <AlertDialog
        open={Boolean(recordToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setRecordToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {text.deleteDescription}{" "}
              <span className="font-semibold text-[color:var(--text-primary)]">
                {recordToDelete?.nombreCliente}
              </span>
              . {t.common.deleteCannotUndo}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className={actionButtonStyles.dangerSolid}
            >
              {deleting ? text.deleting : text.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
