"use client";

import { useState } from "react";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ColumnDef,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  toast,
} from "@cosmetics/ui";
import { MetricCard } from "./metric-card";
import { SectionCard } from "./section-card";
import { usePayrollData } from "./payroll-data-context";
import { apiErrorMessage } from "@/lib/api";
import { formatCurrency, uppercaseInput } from "@/lib/format";
import type { CatalogKind, PayrollCatalogItem } from "@/lib/types";

type CatalogPageProps = {
  kind: CatalogKind;
  singular: string;
  plural: string;
  description: string;
  createLabel?: string;
  tone: "sage" | "gold" | "rose" | "blue";
};

const EMPTY_FORM = { name: "", amount: "0", notes: "" };

export function MovementCatalogPage({
  kind,
  singular,
  plural,
  description,
  createLabel,
  tone,
}: CatalogPageProps) {
  const data = usePayrollData();
  const items = data.catalogs.filter(
    (item) => item.kind === kind && item.active,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayrollCatalogItem | null>(
    null,
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openCreateDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }
  function openEditDialog(item: PayrollCatalogItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      amount: String(item.amount),
      notes: item.notes,
    });
    setDialogOpen(true);
  }

  async function saveItem() {
    const amount = Number(form.amount);
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error(`Completa nombre y monto de ${singular.toLowerCase()}.`);
      return;
    }
    setSaving(true);
    try {
      await data.saveCatalog(kind, {
        ...(editingId ? { id: editingId } : {}),
        name: form.name,
        amount,
        notes: form.notes,
      });
      setDialogOpen(false);
      toast.success(`${singular} ${editingId ? "actualizado" : "creado"}.`);
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function removeItem() {
    if (!deleteTarget) return;
    try {
      await data.removeCatalog(deleteTarget.id);
      toast.success(`${singular} desactivado.`);
      setDeleteTarget(null);
    } catch (cause) {
      toast.error(apiErrorMessage(cause));
    }
  }

  const columns: ColumnDef<PayrollCatalogItem>[] = [
    {
      accessorKey: "name",
      header: "CONCEPTO",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: "MONTO",
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="number-display text-right">
          {formatCurrency(row.original.amount)}
        </div>
      ),
    },
    { accessorKey: "notes", header: "NOTAS" },
    {
      id: "actions",
      header: "ACCIONES",
      meta: { align: "right" },
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Editar ${row.original.name}`}
            onClick={() => openEditDialog(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Desactivar ${row.original.name}`}
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">
            Catálogo de {plural.toLocaleLowerCase("es-MX")}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {description}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusCircle className="mr-1.5 h-4 w-4" />
          {createLabel ?? `Nuevo ${singular.toLowerCase()}`}
        </Button>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label={`${plural} activos`}
          value={`${items.length}`}
          tone={tone}
        />
        <MetricCard
          label="Monto agregado"
          value={formatCurrency(
            items.reduce((total, item) => total + item.amount, 0),
          )}
          tone="blue"
        />
      </div>
      <SectionCard title={`${plural.toUpperCase()} REGISTRADOS`}>
        <DataTable
          columns={columns}
          data={items}
          searchPlaceholder={`Buscar ${singular.toLowerCase()}`}
          emptyMessage={`Sin ${plural.toLowerCase()}; crea el primero para usarlo en movimientos.`}
          pageSize={10}
        />
      </SectionCard>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? `Editar ${singular.toLowerCase()}`
                : (createLabel ?? `Nuevo ${singular.toLowerCase()}`)}
            </DialogTitle>
            <DialogDescription>
              Este concepto quedará disponible en movimientos de nómina.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: uppercaseInput(event.target.value),
                  }))
                }
                placeholder="Concepto"
              />
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notas</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: uppercaseInput(event.target.value),
                  }))
                }
                placeholder="Regla o detalle"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void saveItem()}>
              {saving ? "Guardando…" : `Guardar ${singular.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Desactivar {singular.toLowerCase()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} dejará de estar disponible para nuevos
              movimientos; el histórico se conserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void removeItem()}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
