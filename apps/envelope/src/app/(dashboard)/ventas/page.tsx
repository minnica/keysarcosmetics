"use client";
// Pantalla de captura de ventas — flujo de sobre físico digitalizado
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Trash2, Pencil, Save } from "lucide-react";
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
  toast,
} from "@cosmetics/ui";
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
  vendedorId: z.string().min(1, "Selecciona un vendedor"),
});

const ventaItemSchema = z.object({
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  metodoPagoId: z.string().min(1, "Selecciona un método de pago"),
  notas: z.string().optional(),
});

type SelectorForm = z.infer<typeof selectorSchema>;
type VentaItemForm = z.infer<typeof ventaItemSchema>;

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
  const watchedVendedor = selectorForm.watch("vendedorId");
  const watchedFecha = selectorForm.watch("fecha");

  const [tempItems, setTempItems] = useState<VentaItem[]>([]);
  const [selectorLocked, setSelectorLocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VentaItem | null>(null);
  const [saving, setSaving] = useState(false);

  const itemForm = useForm<VentaItemForm>({
    resolver: zodResolver(ventaItemSchema),
    defaultValues: { cantidad: 0, metodoPagoId: "", notas: "" },
  });
  const itemControl = itemForm.control;

  const selectorValido = watchedSucursal && watchedFecha && watchedVendedor;

  function openAddModal() {
    setEditingItem(null);
    itemForm.reset({ cantidad: 0, metodoPagoId: "", notas: "" });
    setModalOpen(true);
  }

  function openEditItemModal(item: VentaItem) {
    setEditingItem(item);
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

    if (editingItem) {
      setTempItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id ? { id: editingItem.id, ...cleanData } : i,
        ),
      );
      toast.success("Venta actualizada");
    } else {
      setTempItems((prev) => [...prev, { id: generateId(), ...cleanData }]);
      toast.success("Venta agregada");
    }

    setModalOpen(false);
  }

  function handleDeleteItem(id: string) {
    setTempItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleGuardarRegistro() {
    if (tempItems.length === 0) return;
    setSaving(true);
    try {
      const registro: RegistroVenta = {
        id: generateId(),
        sucursalId: watchedSucursal,
        vendedorId: watchedVendedor,
        fecha: watchedFecha,
        items: tempItems,
      };
      await addRegistro(registro);
      setTempItems([]);
      setSelectorLocked(false);
      selectorForm.reset({ sucursalId: "", fecha: todayISO(), vendedorId: "" });
      toast.success("Registro guardado");
    } finally {
      setSaving(false);
    }
  }

  function handleNuevoRegistro() {
    setTempItems([]);
    setSelectorLocked(false);
    selectorForm.reset({ sucursalId: "", fecha: todayISO(), vendedorId: "" });
  }

  const sucursalNombre = (id: string) =>
    sucursales.find((s) => s.id === id)?.nombre ?? id;
  const vendedorNombre = (id: string) =>
    empleados.find((e) => e.id === id)?.nombreCompleto ?? id;
  const metodoPagoNombre = (id: string) =>
    metodosPago.find((m) => m.id === id)?.nombre ?? id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Registro de ventas</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Captura las ventas del día por vendedor y sucursal
        </p>
      </div>

      {/* ── Paso 1: Selector ── */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          1. Selección
        </h2>
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
            <Label htmlFor="vendedor">Vendedor</Label>
            <Controller
              control={selectorControl}
              name="vendedorId"
              render={({ field }) => (
                <Combobox
                  id="vendedor"
                  options={empleados.map((e) => ({ value: e.id, label: e.nombreCompleto }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={selectorLocked}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar vendedor..."
                  emptyMessage="Sin vendedores"
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* ── Paso 2: Items temporales ── */}
      {selectorValido && (
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                2. Ventas del vendedor
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {vendedorNombre(watchedVendedor)} ·{" "}
                {sucursalNombre(watchedSucursal)} · {formatDate(watchedFecha)}
              </p>
            </div>
            <Button onClick={openAddModal} size="sm">
              <PlusCircle className="h-4 w-4 mr-1.5" /> Agregar venta
            </Button>
          </div>

          {tempItems.length > 0 ? (
            <>
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
                  {tempItems.map((item) => (
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
                            onClick={() => openEditItemModal(item)}
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
                                  onClick={() => handleDeleteItem(item.id)}
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
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Total:{" "}
                  {formatCurrency(
                    tempItems.reduce((s, i) => s + i.cantidad, 0),
                  )}
                </p>
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
                    {saving ? "Guardando..." : "Guardar registro"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10" style={{ color: 'var(--text-muted)' }}>
              <ShoppingCartEmpty />
              <p className="mt-2 text-sm">Sin ventas agregadas aún</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tabla de registros guardados ── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Registros guardados
        </h2>
        {registros.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay registros guardados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sucursal</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Total ventas</TableHead>
                <TableHead>Métodos usados</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...registros].reverse().map((reg) => {
                const total = reg.items.reduce((s, i) => s + i.cantidad, 0);
                const metodos = [
                  ...new Set(
                    reg.items.map((i) => metodoPagoNombre(i.metodoPagoId)),
                  ),
                ];
                const notas = reg.items
                  .flatMap((i) => (i.notas ? [i.notas] : []))
                  .join(", ");
                return (
                  <TableRow key={reg.id}>
                    <TableCell>{sucursalNombre(reg.sucursalId)}</TableCell>
                    <TableCell>{formatDate(reg.fecha)}</TableCell>
                    <TableCell>{vendedorNombre(reg.vendedorId)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {metodos.map((m) => (
                          <Badge key={m} variant="secondary">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {notas || "—"}
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Modal de agregar/editar item ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar venta" : "Agregar venta"}</DialogTitle>
            <DialogDescription>Ingresa los datos de la venta</DialogDescription>
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
