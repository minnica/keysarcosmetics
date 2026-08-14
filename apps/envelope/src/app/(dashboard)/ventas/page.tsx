"use client";

// Pantalla de captura de ventas — distribución por empleado y conciliación de pagos
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CheckCircle2, CreditCard, Pencil, Plus, RotateCcw, Save, Trash2, Users, X } from "lucide-react";
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
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  DatePicker,
  DateRangePicker,
  DataTable,
  Input,
  Label,
  ProgressKeysar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  type DateRange,
} from "@cosmetics/ui";
import type { ColumnDef } from "@cosmetics/ui";
import {
  useEmpleados,
  useMetodosPago,
  useSucursales,
  useVentas,
} from "@/hooks";
import { GenerateEnvelopeDialog } from "@/components/GenerateEnvelopeDialog";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { formatCurrency, formatDate, generateId, todayISO } from "@/lib/utils";
import type { RegistroVenta, VentaItem } from "@/lib/mock-data";
import { actionButtonStyles } from "@/lib/action-button-styles";

function createSaleSchema(messages: {
  selectBranch: string;
  selectDate: string;
  selectEmployee: string;
  amountPositive: string;
}) {
  return z.object({
    sucursalId: z.string().min(1, messages.selectBranch),
    fecha: z.string().min(1, messages.selectDate),
    vendedorId: z.string().min(1, messages.selectEmployee),
    monto: z.coerce.number().positive(messages.amountPositive),
  });
}

function createPaymentSchema(messages: {
  selectPaymentMethod: string;
  quantityPositive: string;
}) {
  return z.object({
    metodoPagoId: z.string().min(1, messages.selectPaymentMethod),
    cantidad: z.coerce.number().positive(messages.quantityPositive),
  });
}

type SaleForm = z.infer<ReturnType<typeof createSaleSchema>>;
type PaymentForm = z.infer<ReturnType<typeof createPaymentSchema>>;
type SaleContext = SaleForm & { totalCents: number };
type EmployeeAllocation = { empleadoId: string; amountCents: number };
type PaymentAllocation = {
  id: string;
  metodoPagoId: string;
  amountCents: number;
};
type EditingSale = {
  originalIds: string[];
  originalItems: VentaItem[][];
  originalBranch: { id: string; name: string };
  originalSessionId: string | null;
  originalTotalCents: number;
  preserveSessionWhenSingle: boolean;
};

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (value: number) => value / 100;

/** Reparte centavos sin perder el total por redondeo. */
function splitEvenly(
  totalCents: number,
  employeeIds: string[],
): EmployeeAllocation[] {
  const base = Math.floor(totalCents / employeeIds.length);
  const remainder = totalCents % employeeIds.length;
  return employeeIds.map((empleadoId, index) => ({
    empleadoId,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}

/**
 * Convierte dos distribuciones de un mismo total en detalles persistibles.
 * La matriz conserva exactamente tanto el total por empleado como por método.
 */
function allocatePaymentsToEmployees(
  employees: EmployeeAllocation[],
  payments: PaymentAllocation[],
): Map<string, VentaItem[]> {
  const result = new Map<string, VentaItem[]>();
  const remainingPayments = payments.map((payment) => ({
    ...payment,
    remainingCents: payment.amountCents,
  }));
  let paymentIndex = 0;

  for (const employee of employees) {
    let employeeRemaining = employee.amountCents;
    const items: VentaItem[] = [];

    while (employeeRemaining > 0 && paymentIndex < remainingPayments.length) {
      const payment = remainingPayments[paymentIndex];
      if (!payment) break;
      const allocatedCents = Math.min(
        employeeRemaining,
        payment.remainingCents,
      );

      if (allocatedCents > 0) {
        items.push({
          id: generateId(),
          cantidad: fromCents(allocatedCents),
          metodoPagoId: payment.metodoPagoId,
        });
      }

      employeeRemaining -= allocatedCents;
      payment.remainingCents -= allocatedCents;
      if (payment.remainingCents === 0) paymentIndex += 1;
    }

    result.set(employee.empleadoId, items);
  }

  return result;
}

export default function VentasPage() {
  const { user } = useSession();
  const canViewKeysarHomeData = Boolean(
    user?.canManageAccess ||
      user?.screenPermissions.includes("reportes/ver-datos-keysar-home"),
  );
  const [saleRange, setSaleRange] = useState<DateRange>({
    from: todayISO(),
    to: todayISO(),
  });
  const { sucursales } = useSucursales();
  const { empleados } = useEmpleados();
  const { metodosPago } = useMetodosPago();
  const { registros, addBatch, updateBatch, remove: deleteRegistro } = useVentas({
    fechaInicio: saleRange.from,
    fechaFin: saleRange.to,
  });
  const { locale, t, dataTableLabels } = useI18n();
  const saleSchema = useMemo(
    () => createSaleSchema({
      selectBranch: t.sales.selectBranch,
      selectDate: t.sales.selectDate,
      selectEmployee: t.sales.selectEmployee,
      amountPositive: t.sales.amountPositive,
    }),
    [t],
  );
  const paymentSchema = useMemo(
    () => createPaymentSchema({
      selectPaymentMethod: t.sales.selectPaymentMethod,
      quantityPositive: t.sales.quantityPositive,
    }),
    [t],
  );

  const saleForm = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      sucursalId: "",
      fecha: todayISO(),
      vendedorId: "",
      monto: 0,
    },
  });
  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { metodoPagoId: "", cantidad: 0 },
  });

  const [saleContext, setSaleContext] = useState<SaleContext | null>(null);
  const [employeeAllocations, setEmployeeAllocations] = useState<
    EmployeeAllocation[]
  >([]);
  const [employeeToAdd, setEmployeeToAdd] = useState("");
  const [paymentAllocations, setPaymentAllocations] = useState<
    PaymentAllocation[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [editingSale, setEditingSale] = useState<EditingSale | null>(null);
  const [financialDetailsDirty, setFinancialDetailsDirty] = useState(false);
  const selectedPaymentMethod = paymentForm.watch("metodoPagoId");
  const selectedInitialEmployee = saleForm.watch("vendedorId");
  const allocatedEmployeeCents = employeeAllocations.reduce(
    (sum, employee) => sum + employee.amountCents,
    0,
  );
  const paidCents = paymentAllocations.reduce(
    (sum, payment) => sum + payment.amountCents,
    0,
  );
  const totalCents = saleContext?.totalCents ?? 0;
  const remainingPaymentCents = totalCents - paidCents;
  const remainingEmployeeCents = totalCents - allocatedEmployeeCents;
  const employeesHavePositiveAmounts = employeeAllocations.every(
    (allocation) => allocation.amountCents > 0,
  );
  const employeeDistributionMatches =
    employeeAllocations.length > 0 &&
    employeesHavePositiveAmounts &&
    remainingEmployeeCents === 0;
  const paymentsMatch =
    paymentAllocations.length > 0 && remainingPaymentCents === 0;
  const canSave = employeeDistributionMatches && paymentsMatch && !saving;
  const paymentProgress =
    totalCents > 0 ? Math.min(100, (paidCents / totalCents) * 100) : 0;
  const filteredRegistros = useMemo(
    () =>
      [...registros].filter(
        (record) =>
          record.fecha >= saleRange.from &&
          record.fecha <= saleRange.to &&
          (canViewKeysarHomeData ||
            (record.vendedorNombre ??
              empleados.find((employee) => employee.id === record.vendedorId)
                ?.nombreCompleto ??
              "")
              .trim()
              .toLocaleUpperCase("es-MX") !==
              "KEYSAR HOME"),
      ),
    [canViewKeysarHomeData, empleados, registros, saleRange],
  );
  const visibleRegistros = useMemo(
    () => [...filteredRegistros].reverse(),
    [filteredRegistros],
  );

  const visibleSucursales = sucursales;

  useEffect(() => {
    if (saleContext || saleForm.getValues("sucursalId")) return;
    if (visibleSucursales.length !== 1) return;
    const [singleSucursal] = visibleSucursales;
    if (!singleSucursal) return;

    saleForm.setValue("sucursalId", singleSucursal.id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [saleContext, saleForm, visibleSucursales]);

  const activeEmployees = useMemo(
    () => empleados.filter((employee) => employee.activo),
    [empleados],
  );
  const initialEmployeeOptions = useMemo(() => {
    const allocatedAfterInitial = new Set(
      editingSale
        ? employeeAllocations.slice(1).map((allocation) => allocation.empleadoId)
        : [],
    );
    return empleados
      .filter(
        (employee) =>
          (employee.activo || employee.id === selectedInitialEmployee) &&
          !allocatedAfterInitial.has(employee.id),
      )
      .map((employee) => ({
        value: employee.id,
        label: employee.nombreCompleto,
      }));
  }, [editingSale, empleados, employeeAllocations, selectedInitialEmployee]);
  const availableEmployees = activeEmployees
    .filter(
      (employee) =>
        !employeeAllocations.some(
          (allocation) => allocation.empleadoId === employee.id,
        ),
    )
    .map((employee) => ({
      value: employee.id,
      label: employee.nombreCompleto,
    }));

  const sucursalNombre = (id: string, embedded?: string) =>
    embedded ??
    visibleSucursales.find((sucursal) => sucursal.id === id)?.nombre ??
    (editingSale?.originalBranch.id === id
      ? editingSale.originalBranch.name
      : id);
  const vendedorNombre = (id: string, embedded?: string) =>
    embedded ??
    empleados.find((employee) => employee.id === id)?.nombreCompleto ??
    id;
  const metodoPagoNombre = (id: string, embedded?: string) =>
    embedded ?? metodosPago.find((method) => method.id === id)?.nombre ?? id;

  function handleStartSale(data: SaleForm) {
    const normalizedAmount = toCents(data.monto);
    setSaleContext({
      ...data,
      monto: fromCents(normalizedAmount),
      totalCents: normalizedAmount,
    });

    if (editingSale && employeeAllocations.length > 0) {
      if (normalizedAmount !== editingSale.originalTotalCents) {
        setFinancialDetailsDirty(true);
      }
      setEmployeeAllocations((current) =>
        current.map((allocation, index) =>
          index === 0
            ? {
                empleadoId: data.vendedorId,
                amountCents:
                  current.length === 1
                    ? normalizedAmount
                    : allocation.amountCents,
              }
            : allocation,
        ),
      );
      setEmployeeToAdd("");
      paymentForm.reset({ metodoPagoId: "", cantidad: 0 });
      return;
    }

    setEmployeeAllocations(splitEvenly(normalizedAmount, [data.vendedorId]));
    setPaymentAllocations([]);
    setEmployeeToAdd("");
    paymentForm.reset({ metodoPagoId: "", cantidad: 0 });
  }

  function handleAddEmployee() {
    if (!saleContext || !employeeToAdd) return;
    const employeeIds = [
      ...employeeAllocations.map((allocation) => allocation.empleadoId),
      employeeToAdd,
    ];
    setEmployeeAllocations(splitEvenly(saleContext.totalCents, employeeIds));
    setFinancialDetailsDirty(true);
    setEmployeeToAdd("");
  }

  function handleRemoveEmployee(employeeId: string) {
    if (!saleContext || employeeAllocations.length === 1) return;
    const employeeIds = employeeAllocations
      .filter((allocation) => allocation.empleadoId !== employeeId)
      .map((allocation) => allocation.empleadoId);
    setEmployeeAllocations(splitEvenly(saleContext.totalCents, employeeIds));
    setFinancialDetailsDirty(true);
  }

  function handleEmployeeAmountChange(employeeId: string, value: string) {
    const amountCents = Math.max(0, toCents(Number(value) || 0));
    setEmployeeAllocations((current) =>
      current.map((allocation) =>
        allocation.empleadoId === employeeId
          ? { ...allocation, amountCents }
          : allocation,
      ),
    );
    setFinancialDetailsDirty(true);
  }

  function handlePaymentMethodChange(methodId: string) {
    paymentForm.setValue("metodoPagoId", methodId, { shouldValidate: true });
    paymentForm.setValue(
      "cantidad",
      fromCents(Math.max(remainingPaymentCents, 0)),
    );
  }

  function handleAddPayment(data: PaymentForm) {
    const amountCents = toCents(data.cantidad);
    if (amountCents > remainingPaymentCents) {
      paymentForm.setError("cantidad", {
        message: `${t.sales.maxPending} ${formatCurrency(fromCents(remainingPaymentCents))}`,
      });
      return;
    }

    setPaymentAllocations((current) => [
      ...current,
      { id: generateId(), metodoPagoId: data.metodoPagoId, amountCents },
    ]);
    setFinancialDetailsDirty(true);
    paymentForm.reset({ metodoPagoId: "", cantidad: 0 });
  }

  function handleRemovePayment(paymentId: string) {
    setPaymentAllocations((current) =>
      current.filter((payment) => payment.id !== paymentId),
    );
    setFinancialDetailsDirty(true);
    paymentForm.reset({ metodoPagoId: "", cantidad: 0 });
  }

  function resetCapture() {
    setSaleContext(null);
    setEmployeeAllocations([]);
    setEmployeeToAdd("");
    setPaymentAllocations([]);
    setSaving(false);
    setEditingSale(null);
    setFinancialDetailsDirty(false);
    saleForm.reset({
      sucursalId: "",
      fecha: todayISO(),
      vendedorId: "",
      monto: 0,
    });
    paymentForm.reset({ metodoPagoId: "", cantidad: 0 });
  }

  function editSaleContext() {
    setSaleContext(null);
    if (editingSale) {
      paymentForm.reset({ metodoPagoId: "", cantidad: 0 });
      return;
    }
    setEmployeeAllocations([]);
    setEmployeeToAdd("");
    setPaymentAllocations([]);
    paymentForm.reset({ metodoPagoId: "", cantidad: 0 });
  }

  function handleEditRecord(record: RegistroVenta) {
    const relatedRecords = record.sesionId
      ? filteredRegistros.filter(
          (candidate) => candidate.sesionId === record.sesionId,
        )
      : [record];
    const recordsToEdit = [
      record,
      ...relatedRecords.filter((candidate) => candidate.id !== record.id),
    ];
    const total = recordsToEdit.reduce(
      (saleSum, sale) =>
        saleSum +
        sale.items.reduce(
          (itemSum, item) => itemSum + toCents(item.cantidad),
          0,
        ),
      0,
    );
    const paymentsByMethod = new Map<string, number>();
    for (const sale of recordsToEdit) {
      for (const item of sale.items) {
        paymentsByMethod.set(
          item.metodoPagoId,
          (paymentsByMethod.get(item.metodoPagoId) ?? 0) +
            toCents(item.cantidad),
        );
      }
    }
    const allSessionRecords = record.sesionId
      ? registros.filter((candidate) => candidate.sesionId === record.sesionId)
      : [record];
    const preserveSessionWhenSingle = Boolean(
      record.sesionId &&
        (user?.selfDataOnly ||
          allSessionRecords.length !== recordsToEdit.length),
    );

    saleForm.reset({
      sucursalId: record.sucursalId,
      fecha: record.fecha,
      vendedorId: record.vendedorId,
      monto: fromCents(total),
    });
    setSaleContext({
      sucursalId: record.sucursalId,
      fecha: record.fecha,
      vendedorId: record.vendedorId,
      monto: fromCents(total),
      totalCents: total,
    });
    setEmployeeAllocations(
      recordsToEdit.map((sale) => ({
        empleadoId: sale.vendedorId,
        amountCents: sale.items.reduce(
          (sum, item) => sum + toCents(item.cantidad),
          0,
        ),
      })),
    );
    setPaymentAllocations(
      [...paymentsByMethod.entries()].map(([metodoPagoId, amountCents]) => ({
        id: generateId(),
        metodoPagoId,
        amountCents,
      })),
    );
    setEmployeeToAdd("");
    paymentForm.reset({ metodoPagoId: "", cantidad: 0 });
    setEditingSale({
      originalIds: recordsToEdit.map((sale) => sale.id),
      originalItems: recordsToEdit.map((sale) => sale.items),
      originalBranch: {
        id: record.sucursalId,
        name: sucursalNombre(record.sucursalId, record.sucursalNombre),
      },
      originalSessionId: record.sesionId ?? null,
      originalTotalCents: total,
      preserveSessionWhenSingle,
    });
    setFinancialDetailsDirty(false);
    setSaving(false);

    window.requestAnimationFrame(() => {
      const capture = document.getElementById("sale-capture");
      capture?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      capture?.focus({ preventScroll: true });
    });
  }

  async function handleSaveSale() {
    if (!saleContext || !canSave) return;
    const itemsByEmployee = allocatePaymentsToEmployees(
      employeeAllocations,
      paymentAllocations,
    );
    const sesionId =
      employeeAllocations.length > 1
        ? (editingSale?.originalSessionId ?? generateId())
        : editingSale?.preserveSessionWhenSingle
          ? editingSale.originalSessionId
          : null;
    const sales: RegistroVenta[] = employeeAllocations.map((allocation, index) => ({
      id: generateId(),
      sucursalId: saleContext.sucursalId,
      vendedorId: allocation.empleadoId,
      fecha: saleContext.fecha,
      items:
        editingSale && !financialDetailsDirty
          ? (editingSale.originalItems[index] ?? [])
          : (itemsByEmployee.get(allocation.empleadoId) ?? []),
      ...(sesionId ? { sesionId } : {}),
    }));

    setSaving(true);
    try {
      if (editingSale) {
        await updateBatch(editingSale.originalIds, sales);
        toast.success(t.sales.updatedSuccess);
      } else {
        await addBatch(sales);
        toast.success(t.sales.registeredSuccess);
      }
      resetCapture();
    } catch {
      toast.error(
        editingSale ? t.sales.updatedError : t.sales.registeredError,
      );
      setSaving(false);
    }
  }

  const registroColumns: ColumnDef<RegistroVenta>[] = [
    {
      id: "sucursal",
      accessorFn: (row) => sucursalNombre(row.sucursalId, row.sucursalNombre),
      header: t.common.branch,
      cell: ({ row }) =>
        sucursalNombre(row.original.sucursalId, row.original.sucursalNombre),
    },
    {
      accessorKey: "fecha",
      header: t.common.date,
      cell: ({ row }) => formatDate(row.original.fecha, 'dd/MM/yyyy', locale),
    },
    {
      id: "vendedor",
      accessorFn: (row) => vendedorNombre(row.vendedorId, row.vendedorNombre),
      header: t.common.employee,
      cell: ({ row }) =>
        vendedorNombre(
          row.original.vendedorId,
          row.original.vendedorNombre,
        ),
    },
    {
      id: "total",
      accessorFn: (row) =>
        row.items.reduce((sum, item) => sum + item.cantidad, 0),
      header: t.sales.assignedSaleColumn,
      cell: ({ row }) => (
        <div className="number-display text-right">
          {formatCurrency(
            row.original.items.reduce((sum, item) => sum + item.cantidad, 0),
          )}
        </div>
      ),
    },
    {
      id: "voucher",
      accessorFn: (row) => row.sesionId ?? "",
      header: t.sales.sharedSaleColumn,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const { sesionId } = row.original;
        if (!sesionId)
          return <span style={{ color: "var(--text-muted)" }}>—</span>;
        const voucherTotal = filteredRegistros
          .filter((record) => record.sesionId === sesionId)
          .reduce(
            (sum, record) =>
              sum +
              record.items.reduce(
                (itemSum, item) => itemSum + item.cantidad,
                0,
              ),
            0,
          );
        return (
          <span className="whitespace-nowrap text-xs">
            <span className="uppercase">{t.sales.shared}</span> · {formatCurrency(voucherTotal)}
          </span>
        );
      },
    },
    {
      id: "metodos",
      accessorFn: (row) =>
        [
          ...new Set(
            row.items.map((item) =>
              metodoPagoNombre(item.metodoPagoId, item.metodoPagoNombre),
            ),
          ),
        ].join(" "),
      header: t.sales.usedMethods,
      cell: ({ row }) => (
        <span className="text-sm">
          {[
            ...new Set(
              row.original.items.map((item) =>
                metodoPagoNombre(item.metodoPagoId, item.metodoPagoNombre),
              ),
            ),
          ].join(", ")}
        </span>
      ),
    },
    {
      id: "acciones",
      header: () => <div className="text-right">{t.common.actions}</div>,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const record = row.original;
        const total = record.items.reduce(
          (sum, item) => sum + item.cantidad,
          0,
        );
        return (
          <div className="flex justify-end gap-2">
            {saleContext ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className={actionButtonStyles.neutral}
                    aria-label={t.sales.editRecord}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t.sales.replaceCaptureTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.sales.replaceCaptureDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleEditRecord(record)}>
                      {t.sales.startEditing}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                size="icon"
                variant="outline"
                className={actionButtonStyles.neutral}
                onClick={() => handleEditRecord(record)}
                aria-label={t.sales.editRecord}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className={actionButtonStyles.danger}
                  aria-label={t.sales.deleteRecord}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.sales.deleteRecordTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.sales.deleteRecordDescription}{" "}
                    {vendedorNombre(record.vendedorId, record.vendedorNombre)} {t.sales.byAmount}{" "}
                    {formatCurrency(total)}. {t.common.deleteCannotUndo}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className={actionButtonStyles.dangerSolid}
                    onClick={() => deleteRegistro(record.id)}
                  >
                    {t.common.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t.sales.title}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {t.sales.description}
          </p>
        </div>
        <GenerateEnvelopeDialog
          sucursales={visibleSucursales}
          empleados={empleados}
          metodosPago={metodosPago}
        />
      </header>

      <Card
        id="sale-capture"
        tabIndex={-1}
        aria-current={!saleContext ? "step" : undefined}
        className="scroll-mt-4 transition-[border-color,box-shadow] duration-200 focus:outline-none"
        style={stepCardStyle(!saleContext ? "active" : "complete")}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-caps">{t.sales.step} 1</p>
              <CardTitle className="mt-1 text-lg">
                {editingSale ? t.sales.editSaleData : t.sales.saleData}
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {editingSale && (
                <Badge variant="outline">{t.sales.editingRecord}</Badge>
              )}
              <StepStatusBadge status={!saleContext ? "active" : "complete"} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={saleForm.handleSubmit(handleStartSale)}
            className="space-y-5"
          >
            <fieldset
              disabled={!!saleContext}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <FormField
                label={t.common.branch}
                htmlFor="sucursal"
                error={saleForm.formState.errors.sucursalId?.message}
              >
                <Controller
                  control={saleForm.control}
                  name="sucursalId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!saleContext}
                    >
                      <SelectTrigger id="sucursal">
                        <SelectValue placeholder={t.sales.select} />
                      </SelectTrigger>
                      <SelectContent>
                        {editingSale &&
                          !visibleSucursales.some(
                            (sucursal) =>
                              sucursal.id === editingSale.originalBranch.id,
                          ) && (
                            <SelectItem value={editingSale.originalBranch.id}>
                              {editingSale.originalBranch.name}
                            </SelectItem>
                          )}
                        {visibleSucursales.map((sucursal) => (
                          <SelectItem key={sucursal.id} value={sucursal.id}>
                            {sucursal.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label={t.common.date}
                htmlFor="fecha"
                error={saleForm.formState.errors.fecha?.message}
              >
                <Controller
                  control={saleForm.control}
                  name="fecha"
                  render={({ field }) => (
                    <DatePicker
                      id="fecha"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t.common.date}
                      disabled={!!saleContext}
                    />
                  )}
                />
              </FormField>
              <FormField
                label={t.sales.initialEmployee}
                htmlFor="vendedor"
                error={saleForm.formState.errors.vendedorId?.message}
              >
                <Controller
                  control={saleForm.control}
                  name="vendedorId"
                  render={({ field }) => (
                    <Combobox
                      id="vendedor"
                      options={initialEmployeeOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t.sales.select}
                      searchPlaceholder={t.employees.searchEmployee}
                      emptyMessage={t.sales.noActiveEmployees}
                      disabled={!!saleContext}
                    />
                  )}
                />
              </FormField>
              <FormField
                label={t.sales.totalAmountMxn}
                htmlFor="monto"
                error={saleForm.formState.errors.monto?.message}
              >
                <Input
                  id="monto"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  {...saleForm.register("monto")}
                />
              </FormField>
            </fieldset>

            {!saleContext ? (
              <div className="flex justify-end">
                <Button type="submit">
                  {editingSale ? t.sales.applyData : t.sales.continue}{" "}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  borderColor: "var(--border-color)",
                  backgroundColor: "var(--table-row-alt)",
                }}
              >
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {sucursalNombre(saleContext.sucursalId)} ·{" "}
                    {formatDate(saleContext.fecha, 'dd/MM/yyyy', locale)}
                  </p>
                  <p className="number-display text-xl">
                    {formatCurrency(saleContext.monto)}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <RotateCcw className="mr-1.5 h-4 w-4" /> {t.sales.changeData}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t.sales.changeSaleDataTitle}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {editingSale
                          ? t.sales.changeEditedSaleDataDescription
                          : t.sales.changeSaleDataDescription}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.sales.keepCapture}</AlertDialogCancel>
                      <AlertDialogAction onClick={editSaleContext}>
                        {t.sales.changeData}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {saleContext && (
        <section className="space-y-5" aria-labelledby="step-two-title">
          <Card
            aria-current={!canSave ? "step" : undefined}
            className="transition-[border-color,box-shadow] duration-200"
            style={stepCardStyle(canSave ? "complete" : "active")}
          >
            <CardHeader
              className="border-b"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-caps">{t.sales.step} 2</p>
                  <CardTitle id="step-two-title" className="mt-1 text-xl">
                    {t.sales.distributionAndPayment}
                  </CardTitle>
                </div>
                <StepStatusBadge status={canSave ? "complete" : "active"} />
              </div>
            </CardHeader>

            <CardContent
              className="grid grid-cols-1 gap-8 pt-6 xl:grid-cols-2 xl:gap-0 xl:divide-x"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="space-y-4 xl:pr-8">
                <div className="space-y-1.5">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Users className="h-5 w-5" /> {t.sales.employees}
                  </h3>
                </div>
                <div className="space-y-2">
                  {employeeAllocations.map((allocation) => (
                    <div
                      key={allocation.empleadoId}
                      className="grid grid-cols-[minmax(0,1fr)_8.5rem_2.5rem] items-end gap-2 rounded-lg border p-3"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div className="min-w-0 self-center">
                        <p className="truncate text-sm font-semibold">
                          {vendedorNombre(allocation.empleadoId)}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {t.sales.assignedSale}
                        </p>
                      </div>
                      <div>
                        <Label
                          htmlFor={`employee-${allocation.empleadoId}`}
                          className="sr-only"
                        >
                          {t.sales.amountFor} {vendedorNombre(allocation.empleadoId)}
                        </Label>
                        <Input
                          id={`employee-${allocation.empleadoId}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={fromCents(allocation.amountCents)}
                          onChange={(event) =>
                            handleEmployeeAmountChange(
                              allocation.empleadoId,
                              event.target.value,
                            )
                          }
                          className="text-right tabular-nums"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className={actionButtonStyles.danger}
                        disabled={employeeAllocations.length === 1}
                        onClick={() =>
                          handleRemoveEmployee(allocation.empleadoId)
                        }
                        aria-label={`${t.sales.removeEmployee} ${vendedorNombre(allocation.empleadoId)}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {availableEmployees.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Combobox
                      id="new-employee"
                      options={availableEmployees}
                      value={employeeToAdd}
                      onValueChange={setEmployeeToAdd}
                      placeholder={t.sales.addAnotherEmployee}
                      searchPlaceholder={t.employees.searchEmployee}
                      emptyMessage={t.sales.noAvailableEmployees}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddEmployee}
                      disabled={!employeeToAdd}
                    >
                      <Plus className="mr-1.5 h-4 w-4" /> {t.sales.add}
                    </Button>
                  </div>
                )}

                <div
                  className="border-t pt-4"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <div aria-live="polite">
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t.sales.assignedTotal}
                    </p>
                    <p className="number-display text-lg">
                      {formatCurrency(fromCents(allocatedEmployeeCents))}
                    </p>
                    {!employeeDistributionMatches && (
                      <p className="text-xs text-red-600" role="alert">
                        {!employeesHavePositiveAmounts
                          ? t.sales.employeeAmountRequired
                          : `${remainingEmployeeCents > 0 ? t.sales.missing : t.sales.exceedsBy} ${formatCurrency(fromCents(Math.abs(remainingEmployeeCents)))}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="space-y-4 border-t pt-8 xl:border-t-0 xl:pl-8 xl:pt-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="space-y-1.5">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <CreditCard className="h-5 w-5" /> {t.sidebar.paymentMethods}
                  </h3>
                </div>
                <div
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: "var(--border-color)",
                    backgroundColor: "var(--table-row-alt)",
                  }}
                >
                  <div className="mb-2 flex items-end justify-between gap-4">
                    <div>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t.sales.registered}
                      </p>
                      <p className="number-display text-lg">
                        {formatCurrency(fromCents(paidCents))}
                      </p>
                    </div>
                    <div className="text-right" aria-live="polite">
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t.sales.pendingToRegister}
                      </p>
                      <p
                        className={`number-display text-lg ${paymentsMatch ? "text-green-700 dark:text-green-400" : ""}`}
                      >
                        {formatCurrency(
                          fromCents(Math.max(remainingPaymentCents, 0)),
                        )}
                      </p>
                    </div>
                  </div>
                  <ProgressKeysar value={paymentProgress} />
                </div>

                {paymentAllocations.length > 0 && (
                  <div className="space-y-2" aria-label={t.sales.registeredPayments}>
                    {paymentAllocations.map((payment) => (
                      <div
                        key={payment.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto_2.5rem] items-center gap-2 rounded-lg border px-3 py-2.5"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        <span className="truncate text-sm font-medium">
                          {metodoPagoNombre(payment.metodoPagoId)}
                        </span>
                        <span className="number-display whitespace-nowrap text-sm">
                          {formatCurrency(fromCents(payment.amountCents))}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className={actionButtonStyles.danger}
                          onClick={() => handleRemovePayment(payment.id)}
                          aria-label={`${t.sales.deletePaymentWith} ${metodoPagoNombre(payment.metodoPagoId)}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {!paymentsMatch && (
                  <form
                    onSubmit={paymentForm.handleSubmit(handleAddPayment)}
                    className="space-y-3 rounded-lg border p-4"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <FormField
                      label={t.common.paymentMethod}
                      htmlFor="payment-method"
                      error={paymentForm.formState.errors.metodoPagoId?.message}
                    >
                      <Controller
                        control={paymentForm.control}
                        name="metodoPagoId"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={handlePaymentMethodChange}
                          >
                            <SelectTrigger id="payment-method">
                              <SelectValue placeholder={t.sales.select} />
                            </SelectTrigger>
                            <SelectContent>
                              {metodosPago.map((method) => (
                                <SelectItem key={method.id} value={method.id}>
                                  {method.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>

                    {selectedPaymentMethod && (
                      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <FormField
                          label={t.sales.paidAmountMxn}
                          htmlFor="payment-amount"
                          error={paymentForm.formState.errors.cantidad?.message}
                        >
                          <Input
                            id="payment-amount"
                            type="number"
                            min="0.01"
                            max={fromCents(remainingPaymentCents)}
                            step="0.01"
                            {...paymentForm.register("cantidad")}
                          />
                        </FormField>
                        <Button type="submit">
                          <Plus className="mr-1.5 h-4 w-4" /> {t.sales.registerPayment}
                        </Button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </CardContent>
          </Card>

          <Card
            aria-current={canSave ? "step" : undefined}
            className="sticky bottom-4 z-10 backdrop-blur transition-[border-color,box-shadow] duration-200"
            style={stepCardStyle(canSave ? "active" : "pending", true)}
          >
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div
                className="flex min-w-0 flex-1 items-start justify-between gap-4"
                aria-live="polite"
              >
                <div>
                  <p className="label-caps">{t.sales.step} 3</p>
                  <h2 className="mt-1 text-base font-semibold">
                    {editingSale ? t.sales.updateSale : t.sales.saveSale}
                  </h2>
                  <p className="mt-1 text-sm">
                    {canSave
                      ? t.sales.readyToSave
                      : t.sales.completeDistributionAndPayments}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {t.sales.saleTotal}{" "}
                    <span className="number-display">
                      {formatCurrency(saleContext.monto)}
                    </span>
                  </p>
                </div>
                <StepStatusBadge status={canSave ? "active" : "pending"} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {editingSale && (
                  <Button
                    type="button"
                    disabled={saving}
                    variant="outline"
                    className={actionButtonStyles.neutral}
                    onClick={resetCapture}
                  >
                    <X className="mr-1.5 h-4 w-4" /> {t.sales.cancelEdit}
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      disabled={!canSave}
                      className="sm:min-w-44"
                    >
                      <Save className="mr-1.5 h-4 w-4" />{" "}
                      {saving
                        ? t.common.saving
                        : editingSale
                          ? t.sales.updateSale
                          : t.sales.savingSale}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {editingSale
                          ? t.sales.updateSaleTitle
                          : t.sales.saveSaleTitle}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {editingSale
                          ? t.sales.updateSaleDescription
                          : t.sales.saveSaleDescription}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleSaveSale}
                        disabled={saving}
                      >
                        {saving
                          ? t.common.saving
                          : editingSale
                            ? t.sales.updateSaleConfirm
                            : t.sales.saveSaleConfirm}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="saved-sales-title">
        <h2 id="saved-sales-title" className="section-heading">
          {t.sales.savedRecords}
        </h2>
        <DateRangePicker
          value={saleRange}
          onChange={setSaleRange}
          fromLabel={t.common.from}
          toLabel={t.common.to}
        />
        <DataTable
          columns={registroColumns}
          data={visibleRegistros}
          emptyMessage={
            filteredRegistros.length === 0
              ? t.common.noSalesSelectedPeriod
              : t.dataTable.empty
          }
          searchPlaceholder={t.sales.searchSavedRecords}
          labels={dataTableLabels}
        />
      </section>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type StepStatus = "active" | "complete" | "pending";

function stepCardStyle(status: StepStatus, translucent = false) {
  const backgroundColor = translucent
    ? "color-mix(in srgb, var(--bg-card) 94%, transparent)"
    : "var(--bg-card)";

  if (status === "active") {
    return {
      backgroundColor,
      borderColor: "var(--color-gold)",
      borderLeftColor: "var(--color-gold)",
      borderLeftWidth: 4,
      boxShadow:
        "0 8px 24px rgba(195, 165, 131, 0.18), 0 2px 6px rgba(195, 165, 131, 0.12)",
    };
  }

  if (status === "complete") {
    return {
      backgroundColor,
      borderColor: "var(--color-green-sage)",
      borderLeftColor: "var(--color-green-olive)",
      borderLeftWidth: 4,
      boxShadow: "var(--card-shadow)",
    };
  }

  return {
    backgroundColor: translucent
      ? "color-mix(in srgb, var(--bg-card) 88%, transparent)"
      : "var(--bg-card)",
    borderColor: "var(--border-color)",
    borderLeftColor: "var(--border-color)",
    borderLeftWidth: 4,
    boxShadow: "none",
  };
}

function StepStatusBadge({ status }: { status: StepStatus }) {
  const { t } = useI18n();

  if (status === "complete") {
    return (
      <Badge className="shrink-0 gap-1.5 border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
        <CheckCircle2 className="h-3.5 w-3.5" /> {t.sales.completed}
      </Badge>
    );
  }

  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className="shrink-0 gap-1.5"
        style={{
          borderColor: "var(--color-gold)",
          backgroundColor: "var(--color-nude)",
          color: "var(--color-charcoal)",
        }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--color-gold)" }}
          aria-hidden="true"
        />
        {t.sales.inProgress}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="shrink-0"
      style={{ color: "var(--text-muted)" }}
    >
      {t.sales.pending}
    </Badge>
  );
}
