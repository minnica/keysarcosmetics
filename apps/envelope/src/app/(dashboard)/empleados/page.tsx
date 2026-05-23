"use client";
// Pantalla de gestión de empleados
import { useState, type ChangeEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Pencil, Trash2 } from "lucide-react";
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
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@cosmetics/ui"

;
import { useEmpleados } from "@/hooks";
import { formatCurrency } from "@/lib/utils";
import { PUESTOS, type Empleado, type Puesto } from "@/lib/mock-data";

const empleadoSchema = z.object({
  nombres: z.string().min(1, "Requerido"),
  apellidoPaterno: z.string().min(1, "Requerido"),
  apellidoMaterno: z.string().min(1, "Requerido"),
  banco: z.string().min(1, "El banco es requerido").max(40),
  numeroCuenta: z.string().trim().optional(),
  puesto: z.enum(PUESTOS),
  metaIndividual: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
});

type EmpleadoForm = z.infer<typeof empleadoSchema>;

export default function EmpleadosPage() {
  const { empleados, loading, error, add, update, remove } = useEmpleados();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Empleado | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EmpleadoForm>({
    resolver: zodResolver(empleadoSchema),
    defaultValues: {
      nombres: "",
      apellidoPaterno: "",
      apellidoMaterno: "",
      banco: "BBVA",
      numeroCuenta: "",
      puesto: "VENDEDOR",
      metaIndividual: 0,
    },
  });

  function registerUppercase(
    field:
      | "nombres"
      | "apellidoPaterno"
      | "apellidoMaterno"
      | "banco"
      | "numeroCuenta",
  ) {
    const registered = register(field);

    return {
      ...registered,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        event.target.value = event.target.value.toUpperCase();
        void registered.onChange(event);
      },
    };
  }

  const nombres = watch("nombres");
  const apellidoP = watch("apellidoPaterno");
  const apellidoM = watch("apellidoMaterno");
  const nombreCompleto = [nombres, apellidoP, apellidoM]
    .filter(Boolean)
    .join(" ");

  function openNew() {
    setEditing(null);
    reset({
      nombres: "",
      apellidoPaterno: "",
      apellidoMaterno: "",
      banco: "BBVA",
      numeroCuenta: "",
      puesto: "VENDEDOR",
      metaIndividual: 0,
    });
    setModalOpen(true);
  }

  function openEdit(emp: Empleado) {
    setEditing(emp);
    reset({
      nombres: emp.nombres,
      apellidoPaterno: emp.apellidoPaterno,
      apellidoMaterno: emp.apellidoMaterno,
      banco: emp.banco,
      numeroCuenta: emp.numeroCuenta,
      puesto: emp.puesto as Puesto,
      metaIndividual: emp.metaIndividual,
    });
    setModalOpen(true);
  }

  async function onSubmit(data: EmpleadoForm) {
    const payload = {
      ...data,
      nombres: data.nombres.trim().toUpperCase(),
      apellidoPaterno: data.apellidoPaterno.trim().toUpperCase(),
      apellidoMaterno: data.apellidoMaterno.trim().toUpperCase(),
      banco: data.banco.trim().toUpperCase(),
      numeroCuenta: data.numeroCuenta?.trim().toUpperCase() ?? "",
      nombreCompleto: [
        data.nombres.trim().toUpperCase(),
        data.apellidoPaterno.trim().toUpperCase(),
        data.apellidoMaterno.trim().toUpperCase(),
      ]
        .filter(Boolean)
        .join(" "),
    };

    if (editing) {
      await update({ ...editing, ...payload });
    } else {
      await add(payload);
    }

    setModalOpen(false);
  }

  const badgePuesto = (p: string) =>
    p === "GERENTE" ? "default" : ("secondary" as const);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Empleados</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Gestión del catálogo de empleados
          </p>
        </div>
        <Button onClick={openNew}>
          <UserPlus className="h-4 w-4 mr-1.5" /> Nuevo empleado
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando empleados...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre completo</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>No. cuenta</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead className="text-right">Meta individual</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empleados.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">
                  {emp.nombreCompleto}
                </TableCell>
                <TableCell>{emp.banco}</TableCell>
                <TableCell className="font-mono text-xs">
                  {emp.numeroCuenta}
                </TableCell>
                <TableCell>
                  <Badge variant={badgePuesto(emp.puesto)}>{emp.puesto}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(emp.metaIndividual)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(emp)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(emp.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
          </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input
              value={nombreCompleto}
              disabled
              placeholder="Se construye automáticamente"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {(["nombres", "apellidoPaterno", "apellidoMaterno"] as const).map(
              (field) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field}>
                    {field === "nombres"
                      ? "Nombre(s)"
                      : field === "apellidoPaterno"
                        ? "Apellido paterno"
                        : "Apellido materno"}
                  </Label>
                  <Input id={field} {...registerUppercase(field)} />
                  {errors[field] && (
                    <p className="text-xs text-red-500">
                      {errors[field]?.message}
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="banco">Banco</Label>
              <Input
                id="banco"
                placeholder="Ej. BBVA"
                {...registerUppercase("banco")}
              />
              {errors.banco && (
                <p className="text-xs text-red-500">{errors.banco.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numeroCuenta">Número de cuenta</Label>
              <Input id="numeroCuenta" {...registerUppercase("numeroCuenta")} />
              {errors.numeroCuenta && (
                <p className="text-xs text-red-500">
                  {errors.numeroCuenta.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="puesto">Puesto</Label>
            <Controller
              control={control}
              name="puesto"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="puesto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUESTOS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="metaIndividual">Meta individual (MXN)</Label>
            <Input
              id="metaIndividual"
              type="number"
              step="100"
              min="0"
              {...register("metaIndividual")}
            />
            {errors.metaIndividual && (
              <p className="text-xs text-red-500">
                {errors.metaIndividual.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Guardando..."
                : editing
                  ? "Guardar cambios"
                  : "Crear empleado"}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
