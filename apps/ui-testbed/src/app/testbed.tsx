"use client";

import * as React from "react";
import type { ColumnDef } from "@cosmetics/ui";
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
  BaseToaster,
  Button,
  Calendar,
  Combobox,
  DataTable,
  DatePicker,
  DateRangePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  baseToast,
} from "@cosmetics/ui";
import { BarChart3, LayoutDashboard, Settings, Users } from "lucide-react";

type TestRecord = { name: string; branch: string; total: string };

const tableRows: TestRecord[] = [
  { name: "Ana Lucía", branch: "Centro", total: "$12,840.00" },
  { name: "Mariana Soto", branch: "Norte", total: "$10,420.00" },
  { name: "Renata Cruz", branch: "Centro", total: "$9,870.00" },
  { name: "Sofía Luna", branch: "Sur", total: "$8,350.00" },
  { name: "Valeria Gil", branch: "Norte", total: "$7,920.00" },
  { name: "Camila Ríos", branch: "Centro", total: "$7,580.00" },
  { name: "Julia Pérez", branch: "Sur", total: "$6,910.00" },
  { name: "Elena Mora", branch: "Norte", total: "$6,450.00" },
  { name: "Paula Vega", branch: "Centro", total: "$5,980.00" },
  { name: "Lucía Solís", branch: "Sur", total: "$5,620.00" },
  { name: "Andrea León", branch: "Centro", total: "$5,140.00" },
  { name: "Mónica Silva", branch: "Norte", total: "$4,860.00" },
];

const columns: ColumnDef<TestRecord>[] = [
  { accessorKey: "name", header: "Vendedora" },
  { accessorKey: "branch", header: "Sucursal" },
  { accessorKey: "total", header: "Ventas", meta: { align: "right" } },
];

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="testbed-shell">
      <section className="testbed-panel">
        <p className="testbed-caption">Keysar · UI regression canary</p>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </section>
    </main>
  );
}

function DatePickerScenario() {
  const [value, setValue] = React.useState("2026-08-20");
  return (
    <Panel title="Selector de fecha">
      <DatePicker
        value={value}
        onChange={setValue}
        placeholder="Fecha de corte"
      />
    </Panel>
  );
}

function DateRangeScenario() {
  const [value, setValue] = React.useState({
    from: "2026-08-01",
    to: "2026-08-15",
  });
  return (
    <Panel title="Rango de fechas">
      <DateRangePicker
        value={value}
        onChange={setValue}
        fromLabel="Desde"
        toLabel="Hasta"
      />
    </Panel>
  );
}

function CalendarScenario() {
  const [selected, setSelected] = React.useState<Date | undefined>(
    new Date(2026, 7, 20, 12),
  );
  return (
    <Panel title="Calendario">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        defaultMonth={new Date(2026, 7, 1, 12)}
      />
    </Panel>
  );
}

function ComboboxScenario() {
  const [value, setValue] = React.useState("centro");
  return (
    <Panel title="Sucursal">
      <Combobox
        id="branch-combobox"
        value={value}
        onValueChange={setValue}
        options={[
          { value: "centro", label: "Centro" },
          { value: "norte", label: "Norte" },
          { value: "sur", label: "Sur" },
        ]}
        placeholder="Seleccionar sucursal"
        searchPlaceholder="Buscar sucursal"
      />
    </Panel>
  );
}

function DataTableScenario({ empty = false }: { empty?: boolean }) {
  return (
    <Panel title={empty ? "Tabla vacía" : "Resumen de ventas"}>
      <DataTable
        columns={columns}
        data={empty ? [] : tableRows}
        pageSize={10}
        searchPlaceholder="Buscar vendedora"
        emptyMessage="No hay ventas"
      />
    </Panel>
  );
}

function SelectScenario() {
  const [value, setValue] = React.useState("month");
  return (
    <Panel title="Periodo de nómina">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger aria-label="Periodo">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Agosto 2026</SelectItem>
          <SelectItem value="previous">Julio 2026</SelectItem>
          <SelectItem value="quarter">Tercer trimestre</SelectItem>
        </SelectContent>
      </Select>
    </Panel>
  );
}

function DialogScenario() {
  return (
    <Panel title="Diálogo de edición">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Abrir edición</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar sucursal</DialogTitle>
            <DialogDescription>
              Los cambios se reflejarán en los reportes nuevos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline">Cancelar</Button>
            <Button>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function AlertDialogScenario() {
  return (
    <Panel title="Confirmación destructiva">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Eliminar registro</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

function SidebarScenario() {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4 text-sm font-semibold tracking-[0.12em]">
          KEYSAR
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Operación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Resumen">
                    <LayoutDashboard />
                    <span>Resumen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Ventas">
                    <BarChart3 />
                    <span>Ventas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Equipo">
                    <Users />
                    <span>Equipo</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Configuración">
                <Settings />
                <span>Configuración</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <div className="flex min-h-svh flex-1 flex-col bg-background">
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium">Resumen</span>
        </header>
        <main className="p-6">
          <p className="text-sm text-[color:var(--text-muted)]">
            Vista de navegación compartida.
          </p>
        </main>
      </div>
    </SidebarProvider>
  );
}

function ToastScenario() {
  React.useEffect(() => {
    const id = baseToast.add({
      title: "Cambios guardados",
      description: "La sucursal fue actualizada.",
      type: "success",
    });
    return () => baseToast.close(id);
  }, []);
  return (
    <>
      <Panel title="Notificaciones">
        <p className="text-sm text-[color:var(--text-muted)]">
          Estado visible para captura.
        </p>
      </Panel>
      <BaseToaster timeout={0} />
    </>
  );
}

export function Testbed({ scenario }: { scenario: string }) {
  switch (scenario) {
    case "date-picker":
      return <DatePickerScenario />;
    case "date-range":
      return <DateRangeScenario />;
    case "calendar":
      return <CalendarScenario />;
    case "combobox":
      return <ComboboxScenario />;
    case "data-table":
      return <DataTableScenario />;
    case "data-table-empty":
      return <DataTableScenario empty />;
    case "select":
      return <SelectScenario />;
    case "dialog":
      return <DialogScenario />;
    case "alert-dialog":
      return <AlertDialogScenario />;
    case "sidebar":
      return <SidebarScenario />;
    case "toast":
      return <ToastScenario />;
    default:
      return <DataTableScenario />;
  }
}
