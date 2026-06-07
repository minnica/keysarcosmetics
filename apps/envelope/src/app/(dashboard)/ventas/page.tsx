"use client";
// Pantalla de captura de ventas — flujo de sobre físico digitalizado
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Trash2, Pencil, Save } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Textarea,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Combobox,
  DataTable,
  toast,
} from "@cosmetics/ui";
import type { ColumnDef } from "@cosmetics/ui";
import {
  useSucursales,
  useEmpleados,
  useMetodosPago,
  useVentas,
} from "@/hooks";
import { formatCurrency, formatDate, todayISO, generateId } from "@/lib/utils";
import type { VentaItem, RegistroVenta } from "@/lib/mock-data";

// ── Esquemas Zod ──────────────────────────────────────────────────────────────

const selectorSchema = z.object({
  sucursalId: z.string().min(1, "Selecciona una sucursal"),
  fecha: z.string().min(1, "Selecciona una fecha"),
  vendedorId: z.string().optional(),
});

const ventaItemSchema = z.object({
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  metodoPagoId: z.string().min(1, "Selecciona un método de pago"),
  notas: z.string().optional(),
});

type SelectorForm = z.infer<typeof selectorSchema>;
type VentaItemForm = z.infer<typeof ventaItemSchema>;

// Pila de ítems pendientes por vendedor
type VendorStack = { vendedorId: string; items: VentaItem[] };

// ── Toast informativo ─────────────────────────────────────────────────────────
const infoToastOptions = {
  duration: 8000,
  style: {
    background: '#6fc9db',
    color: '#ffffff',
    border: '1px solid #bae2e8',
    boxShadow: '0 4px 12px rgba(111, 201, 219, 0.25)',
  },
};

const INFO_TOAST_MSG =
  "Venta enlistada. Puedes cambiar de vendedor en el Paso 1 para agregar ventas a otro vendedor, o dar clic en «Guardar registros» para persistir todo.";

// ── Componente principal ──────────────────────────────────────────────────────

export default function VentasPage() {
  const { sucursales } = useSucursales();
  const { empleados } = useEmpleados();
  const { metodosPago } = useMetodosPago();
  const { registros, add: addRegistro, remove: deleteRegistro } = useVentas();

  const selectorForm = useForm<SelectorForm>({
    resolver: zodResolver(selectorSchema),
    defaultValues: { sucursalId: "", fecha: todayISO(), vendedorId: "" },
  });
  const selectorControl = selectorForm.control;
  const watchedSucursal = selectorForm.watch("sucursalId");
  const watchedVendedor = selectorForm.watch("vendedorId") ?? "";
  const watchedFecha = selectorForm.watch("fecha");

  // Pilas de ítems pendientes agrupadas por vendedorId
  const [pendingVendors, setPendingVendors] = useState<VendorStack[]>([]);
  // Bloquea sucursal + fecha cuando ya hay ítems (pero nunca vendedor)
  const [selectorLocked, setSelectorLocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VentaItem | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const itemForm = useForm<VentaItemForm>({
    resolver: zodResolver(ventaItemSchema),
    defaultValues: { cantidad: 0, metodoPagoId: "", notas: "" },
  });
  const itemControl = itemForm.control;

  // Paso 2 visible con solo sucursal + fecha
  const contextValido = !!(watchedSucursal && watchedFecha);
  // Agregar ítems requiere además un vendedor seleccionado
  const canAddItem = !!(contextValido && watchedVendedor);

  const hasPendingItems = pendingVendors.some((v) => v.items.length > 0);
  const grandTotal = pendingVendors.reduce(
    (s, v) => s + v.items.reduce((si, i) => si + i.cantidad, 0),
    0,
  );

  function openAddModal() {
    setEditingItem(null);
    setEditingVendorId(null);
    itemForm.reset({ cantidad: 0, metodoPagoId: "", notas: "" });
    setModalOpen(true);
  }

  function openEditItemModal(vendedorId: string, item: VentaItem) {
    setEditingItem(item);
    setEditingVendorId(vendedorId);
    itemForm.reset({
      cantidad: item.cantidad,
      metodoPagoId: item.metodoPagoId,
      notas: item.notas ?? "",
    });
    setModalOpen(true);
  }

  function handleSaveItem(data: VentaItemForm) {
    const cleanData = {
      cantidad: data.cantidad,
      metodoPagoId: data.metodoPagoId,
      ...(data.notas !== undefined && data.notas !== ""
        ? { notas: data.notas }
        : {}),
    };

    if (editingItem && editingVendorId) {
      // Editar ítem existente en su pila de vendedor
      setPendingVendors((prev) =>
        prev.map((v) =>
          v.vendedorId === editingVendorId
            ? {
                ...v,
                items: v.items.map((i) =>
                  i.id === editingItem.id
                    ? { id: editingItem.id, ...cleanData }
                    : i,
                ),
              }
            : v,
        ),
      );
    } else {
      // Agregar nuevo ítem a la pila del vendedor activo
      const newItem: VentaItem = { id: generateId(), ...cleanData };
      setPendingVendors((prev) => {
        const exists = prev.find((v) => v.vendedorId === watchedVendedor);
        if (exists) {
          return prev.map((v) =>
            v.vendedorId === watchedVendedor
              ? { ...v, items: [...v.items, newItem] }
              : v,
          );
        }
        return [...prev, { vendedorId: watchedVendedor, items: [newItem] }];
      });
    }

    setSelectorLocked(true);
    toast.info(INFO_TOAST_MSG, infoToastOptions);
    setModalOpen(false);
  }

  function handleDeleteItem(vendedorId: string, itemId: string) {
    setPendingVendors((prev) =>
      prev
        .map((v) =>
          v.vendedorId === vendedorId
            ? { ...v, items: v.items.filter((i) => i.id !== itemId) }
            : v,
        )
        .filter((v) => v.items.length > 0),
    );
    // Si ya no quedan ítems, desbloquear selector
    const remaining = pendingVendors
      .map((v) =>
        v.vendedorId === vendedorId
          ? { ...v, items: v.items.filter((i) => i.id !== itemId) }
          : v,
      )
      .filter((v) => v.items.length > 0);
    if (remaining.length === 0) setSelectorLocked(false);
  }

  async function handleGuardarRegistro() {
    const toSave = pendingVendors.filter((v) => v.items.length > 0);
    if (toSave.length === 0) return;
    // Generar sesionId compartido solo cuando hay múltiples vendedores (mismo voucher)
    const sesionId = toSave.length > 1 ? generateId() : null;
    setSaving(true);
    try {
      for (const vs of toSave) {
        await addRegistro({
          id: generateId(),
          sucursalId: watchedSucursal,
          vendedorId: vs.vendedorId,
          fecha: watchedFecha,
          items: vs.items,
          ...(sesionId ? { sesionId } : {}),
        });
      }
      setPendingVendors([]);
      setSelectorLocked(false);
      selectorForm.reset({ sucursalId: "", fecha: todayISO(), vendedorId: "" });
      toast.success(
        toSave.length > 1
          ? `${toSave.length} registros guardados`
          : "Registro guardado",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleNuevoRegistro() {
    setPendingVendors([]);
    setSelectorLocked(false);
    selectorForm.reset({ sucursalId: "", fecha: todayISO(), vendedorId: "" });
  }

  const sucursalNombre = (id: string, embedded?: string) =>
    embedded ?? sucursales.find((s) => s.id === id)?.nombre ?? id;
  const vendedorNombre = (id: string) =>
    empleados.find((e) => e.id === id)?.nombreCompleto ?? id;
  const metodoPagoNombre = (id: string, embedded?: string) =>
    embedded ?? metodosPago.find((m) => m.id === id)?.nombre ?? id;

  // ── Columnas tabla registros guardados ────────────────────────────────────────
  const registroColumns: ColumnDef<RegistroVenta>[] = [
    {
      id: 'sucursal',
      accessorFn: (row) => sucursalNombre(row.sucursalId, row.sucursalNombre),
      header: 'Sucursal',
      cell: ({ row }) => sucursalNombre(row.original.sucursalId, row.original.sucursalNombre),
    },
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      cell: ({ row }) => formatDate(row.original.fecha),
    },
    {
      id: 'vendedor',
      accessorFn: (row) => vendedorNombre(row.vendedorId),
      header: 'Vendedor',
      cell: ({ row }) => vendedorNombre(row.original.vendedorId),
    },
    {
      id: 'total',
      accessorFn: (row) => row.items.reduce((s, i) => s + i.cantidad, 0),
      header: 'Total ventas',
      cell: ({ row }) => {
        const total = row.original.items.reduce((s, i) => s + i.cantidad, 0);
        return <div className="text-right font-medium">{formatCurrency(total)}</div>;
      },
    },
    {
      id: 'voucher',
      accessorFn: (row) => row.sesionId ?? '',
      header: 'Voucher',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const { sesionId } = row.original;
        if (!sesionId) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        const voucherTotal = registros
          .filter((r) => r.sesionId === sesionId)
          .reduce((s, r) => s + r.items.reduce((si, i) => si + i.cantidad, 0), 0);
        return (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            Voucher compartido · {formatCurrency(voucherTotal)}
          </Badge>
        );
      },
    },
    {
      id: 'metodos',
      accessorFn: (row) =>
        [...new Set(row.items.map((i) => metodoPagoNombre(i.metodoPagoId, i.metodoPagoNombre)))].join(' '),
      header: 'Métodos usados',
      cell: ({ row }) => {
        const metodos = [...new Set(row.original.items.map((i) => metodoPagoNombre(i.metodoPagoId, i.metodoPagoNombre)))];
        return (
          <div className="flex gap-1 flex-wrap">
            {metodos.map((m) => (
              <Badge key={m} variant="secondary">{m}</Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'notas',
      accessorFn: (row) => row.items.flatMap((i) => (i.notas ? [i.notas] : [])).join(', '),
      header: 'Notas',
      cell: ({ row }) => {
        const notas = row.original.items.flatMap((i) => (i.notas ? [i.notas] : [])).join(", ");
        return (
          <span className="text-xs max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {notas || "—"}
          </span>
        );
      },
    },
    {
      id: 'acciones',
      header: () => <div className="text-right">Acciones</div>,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const reg = row.original;
        const total = reg.items.reduce((s, i) => s + i.cantidad, 0);
        return (
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará el registro de{" "}
                    {vendedorNombre(reg.vendedorId)} del {formatDate(reg.fecha)} por {formatCurrency(total)}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => deleteRegistro(reg.id)}
                  >
                    Eliminar
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
      <div>
        <h1 className="page-title font-semibold uppercase">Registro de ventas</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Captura las ventas del día por vendedor y sucursal
        </p>
      </div>

      {/* ── Paso 1: Selector ── */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <h2 className="section-heading mb-4">1. Selección</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sucursal">Sucursal</Label>
            <Controller
              control={selectorControl}
              name="sucursalId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={selectorLocked}>
                  <SelectTrigger id="sucursal">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {selectorForm.formState.errors.sucursalId && (
              <p className="text-xs text-red-500">
                {selectorForm.formState.errors.sucursalId.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              disabled={selectorLocked}
              {...selectorForm.register("fecha")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendedor">
              Vendedor
              {hasPendingItems && (
                <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                  — cambia para agregar a otro vendedor
                </span>
              )}
            </Label>
            <Controller
              control={selectorControl}
              name="vendedorId"
              render={({ field }) => (
                <Combobox
                  id="vendedor"
                  options={empleados.filter((e) => e.activo).map((e) => ({ value: e.id, label: e.nombreCompleto }))}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar vendedor..."
                  emptyMessage="Sin vendedores"
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* ── Paso 2: Ventas del día (multi-vendedor) ── */}
      {contextValido && (
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-heading">2. Ventas del día</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {sucursalNombre(watchedSucursal)} · {formatDate(watchedFecha)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {watchedVendedor && (
                <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                  Para:{" "}
                  <strong className="font-semibold">{vendedorNombre(watchedVendedor)}</strong>
                </span>
              )}
              <Button
                onClick={openAddModal}
                size="sm"
                disabled={!canAddItem}
                title={!canAddItem ? "Selecciona un vendedor en el Paso 1" : undefined}
              >
                <PlusCircle className="h-4 w-4 mr-1.5" /> Agregar venta
              </Button>
            </div>
          </div>

          {hasPendingItems ? (
            <>
              <div className="space-y-4">
                {pendingVendors.map((vs) => {
                  const subtotal = vs.items.reduce((s, i) => s + i.cantidad, 0);
                  return (
                    <div
                      key={vs.vendedorId}
                      className="rounded-lg border p-4 space-y-3"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="section-heading">{vendedorNombre(vs.vendedorId)}</h3>
                        <span className="number-display text-sm">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cantidad</TableHead>
                              <TableHead>Método de pago</TableHead>
                              <TableHead>Notas</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vs.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  {formatCurrency(item.cantidad)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {metodoPagoNombre(item.metodoPagoId)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {item.notas ?? "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openEditItemModal(vs.vendedorId, item)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="icon" variant="ghost">
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Se eliminará esta venta de {formatCurrency(item.cantidad)} del registro actual.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-red-600 hover:bg-red-700"
                                            onClick={() => handleDeleteItem(vs.vendedorId, item.id)}
                                          >
                                            Eliminar
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Total acumulado:{" "}
                    <span className="number-display">{formatCurrency(grandTotal)}</span>
                  </p>
                  {pendingVendors.length > 1 && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {pendingVendors.length} vendedores · voucher combinado
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNuevoRegistro}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleGuardarRegistro}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-1.5" />{" "}
                    {saving ? "Guardando..." : "Guardar registros"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10" style={{ color: 'var(--text-muted)' }}>
              <ShoppingCartEmpty />
              <p className="mt-2 text-sm">
                {watchedVendedor
                  ? "Sin ventas agregadas. Haz clic en «Agregar venta»."
                  : "Selecciona un vendedor en el Paso 1 para agregar ventas."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tabla de registros guardados ── */}
      <div className="space-y-3">
        <h2 className="section-heading">Registros guardados</h2>
        {registros.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay registros guardados.</p>
        ) : (
          <DataTable
            columns={registroColumns}
            data={[...registros].reverse()}
            emptyMessage="Sin registros guardados"
            searchPlaceholder="Buscar por vendedor, sucursal, fecha..."
          />
        )}
      </div>

      {/* ── Modal de agregar/editar ítem ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar venta" : "Agregar venta"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? `Editando venta de ${editingVendorId ? vendedorNombre(editingVendorId) : ""}`
                : watchedVendedor
                  ? `Para ${vendedorNombre(watchedVendedor)}`
                  : "Ingresa los datos de la venta"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={itemForm.handleSubmit(handleSaveItem)}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="cantidad">Cantidad (MXN)</Label>
              <Input
                id="cantidad"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...itemForm.register("cantidad")}
              />
              {itemForm.formState.errors.cantidad && (
                <p className="text-xs text-red-500">
                  {itemForm.formState.errors.cantidad.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="metodoPago">Método de pago</Label>
              <Controller
                control={itemControl}
                name="metodoPagoId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="metodoPago">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {metodosPago.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {itemForm.formState.errors.metodoPagoId && (
                <p className="text-xs text-red-500">
                  {itemForm.formState.errors.metodoPagoId.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Textarea
                id="notas"
                rows={3}
                placeholder="Observaciones..."
                {...itemForm.register("notas")}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShoppingCartEmpty() {
  return (
    <svg
      className="h-12 w-12"
      style={{ color: 'var(--border-color)' }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}
