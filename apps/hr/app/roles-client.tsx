"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
  type ColumnDef,
} from "@cosmetics/ui";
import {
  Award,
  Baby,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  Download,
  FileText,
  HelpCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  HrButton as ActionButton,
  HrConfirmDialog,
  HrFormDialog,
  HrIconButton,
  HrStatusBadge,
} from "./hr-ui";
import {
  initialMockState,
  type CatalogRecord,
  type Employee,
  type MockState,
} from "./mock-data";

type Section =
  | "employees"
  | "personal"
  | "calendar"
  | "requests"
  | "vacations"
  | "branches"
  | "positions"
  | "facialists"
  | "birthdays"
  | "policies"
  | "access";
type DataSection = Exclude<
  Section,
  "employees" | "personal" | "vacations" | "birthdays"
>;
type Editor =
  | { type: "employee"; item?: Employee }
  | { type: "record"; section: DataSection; item?: CatalogRecord }
  | null;
type ConfirmState = {
  title: string;
  description: string;
  confirmLabel?: string;
  action: () => void;
} | null;

const nav: { id: Section | "new"; label: string; icon: typeof Users }[] = [
  { id: "new", label: "Nuevo empleado", icon: Plus },
  { id: "employees", label: "Todos los empleados", icon: Users },
  { id: "personal", label: "Personal y horarios", icon: UserRound },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "requests", label: "Solicitudes", icon: Check },
  { id: "vacations", label: "Historial de vacaciones", icon: Sparkles },
  { id: "branches", label: "Sucursales", icon: Store },
  { id: "positions", label: "Puestos", icon: Award },
  { id: "facialists", label: "Horarios facialistas", icon: Clock3 },
  { id: "birthdays", label: "Cumpleaños", icon: Baby },
  { id: "policies", label: "Políticas y reglamentos", icon: FileText },
  { id: "access", label: "Usuarios y permisos", icon: ShieldCheck },
];

const heroCopy: Record<
  Section,
  { eyebrow: string; line1: string; line2: string; description: string }
> = {
  employees: {
    eyebrow: "Directorio de personal",
    line1: "Todos los",
    line2: "empleados.",
    description:
      "Consulta los registros del personal según tu nivel de acceso.",
  },
  personal: {
    eyebrow: "Administración de personal",
    line1: "Altas y",
    line2: "edición.",
    description:
      "Consulta o administra perfiles y horarios con datos de demostración.",
  },
  calendar: {
    eyebrow: "Planeación y control",
    line1: "Calendario",
    line2: "laboral.",
    description: "Organiza turnos y asignaciones diarias por sucursal.",
  },
  requests: {
    eyebrow: "Autorizaciones",
    line1: "Solicitudes",
    line2: "del equipo.",
    description:
      "Revisa permisos y ausencias pendientes, autorizadas o rechazadas.",
  },
  vacations: {
    eyebrow: "Historial general",
    line1: "Vacaciones.",
    line2: "Todo el equipo.",
    description: "Consulta los periodos registrados y su estado actual.",
  },
  branches: {
    eyebrow: "Catálogo central",
    line1: "Nuestras",
    line2: "sucursales.",
    description: "Administra horarios y responsables de cada punto de venta.",
  },
  positions: {
    eyebrow: "Catálogo central",
    line1: "Puestos y",
    line2: "funciones.",
    description: "Mantén actualizados los roles operativos del equipo.",
  },
  facialists: {
    eyebrow: "Cobertura de cabinas",
    line1: "Horarios",
    line2: "facialistas.",
    description: "Organiza la cobertura de especialistas por sucursal.",
  },
  birthdays: {
    eyebrow: "Cultura Keysar",
    line1: "Cumpleaños",
    line2: "del equipo.",
    description: "Consulta y actualiza las fechas importantes del personal.",
  },
  policies: {
    eyebrow: "Documentos internos",
    line1: "Políticas y",
    line2: "reglamentos.",
    description: "Administra las versiones vigentes y sus acuses.",
  },
  access: {
    eyebrow: "Seguridad y permisos",
    line1: "Control.",
    line2: "Acceso total.",
    description: "Configura usuarios, perfiles y alcances de demostración.",
  },
};

const recordLabels: Record<
  DataSection,
  {
    title: string;
    subtitle: string;
    columns: [string, string, string];
    add: string;
  }
> = {
  calendar: {
    title: "Asignaciones del calendario",
    subtitle: "Turnos registrados por fecha",
    columns: ["Empleado", "Fecha", "Sucursal y turno"],
    add: "Nueva asignación",
  },
  requests: {
    title: "Solicitudes del personal",
    subtitle: "Permisos, ausencias y vacaciones",
    columns: ["Empleado", "Solicitud", "Motivo"],
    add: "Nueva solicitud",
  },
  branches: {
    title: "Sucursales",
    subtitle: "Puntos de venta registrados",
    columns: ["Sucursal", "Horario", "Responsable"],
    add: "Nueva sucursal",
  },
  positions: {
    title: "Puestos",
    subtitle: "Catálogo de funciones",
    columns: ["Puesto", "Descripción", "Asignación"],
    add: "Nuevo puesto",
  },
  facialists: {
    title: "Horarios facialistas",
    subtitle: "Cobertura semanal de cabinas",
    columns: ["Facialista", "Días", "Sucursal y turno"],
    add: "Nuevo horario",
  },
  policies: {
    title: "Políticas y reglamentos",
    subtitle: "Documentos internos vigentes",
    columns: ["Documento", "Versión", "Acuses"],
    add: "Nuevo documento",
  },
  access: {
    title: "Usuarios y permisos",
    subtitle: "Perfiles de acceso mock",
    columns: ["Perfil", "Módulos", "Nivel"],
    add: "Nuevo perfil",
  },
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function useMockState() {
  const [state, setState] = useState<MockState>(initialMockState);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("keysar-hr-mocks");
    if (stored) {
      try {
        setState(JSON.parse(stored) as MockState);
      } catch {
        /* conserva los mocks iniciales */
      }
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem("keysar-hr-mocks", JSON.stringify(state));
  }, [hydrated, state]);
  return [state, setState, hydrated] as const;
}

function Hero({ section, state }: { section: Section; state: MockState }) {
  const copy = heroCopy[section];
  return (
    <section className="hr-hero">
      <div className="hero-copy">
        <p>{copy.eyebrow}</p>
        <h1>
          {copy.line1}
          <br />
          <em>{copy.line2}</em>
        </h1>
        <span>{copy.description}</span>
      </div>
      <div className="hero-stats">
        <div>
          <small>Personal</small>
          <strong>{state.employees.length}</strong>
        </div>
        <div>
          <small>Activos</small>
          <strong>
            {state.employees.filter((item) => item.status === "Activo").length}
          </strong>
        </div>
        <div>
          <small>Sucursales</small>
          <strong>
            {state.branches.filter((item) => item.status === "Activo").length}
          </strong>
        </div>
      </div>
    </section>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="form-field">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EmployeeForm({
  item,
  onSave,
  onClose,
}: {
  item?: Employee;
  onSave: (employee: Employee) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Employee>(
    item ?? {
      id: 0,
      name: "",
      username: "",
      email: "",
      role: "Vendedor",
      branch: "Sin asignar",
      shift: "10:00–18:00",
      restDay: "Domingo",
      birthday: "",
      status: "Activo",
    },
  );
  const update = (key: keyof Employee, value: string | number) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, id: form.id || Date.now(), name: form.name.trim() });
  };
  return (
    <form id="employee-form" className="form-grid" onSubmit={submit}>
      <div className="form-field wide">
        <Label htmlFor="employee-name">Nombre completo</Label>
        <Input
          id="employee-name"
          autoFocus
          required
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
        />
      </div>
      <div className="form-field">
        <Label htmlFor="employee-username">Usuario</Label>
        <Input
          id="employee-username"
          required
          value={form.username}
          onChange={(event) => update("username", event.target.value)}
        />
      </div>
      <div className="form-field">
        <Label htmlFor="employee-email">Correo</Label>
        <Input
          id="employee-email"
          type="email"
          required
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
        />
      </div>
      <SelectField
        id="employee-role"
        label="Puesto"
        value={form.role}
        options={["Master", "Gerente", "Facialista", "Vendedor"]}
        onChange={(value) => update("role", value)}
      />
      <SelectField
        id="employee-branch"
        label="Sucursal"
        value={form.branch}
        options={[
          "Sin asignar",
          "Mitikah",
          "Mitikah VIP",
          "Opatra",
          "Galerías Insurgentes",
          "Masaryk",
          "Parque Delta",
        ]}
        onChange={(value) => update("branch", value)}
      />
      <SelectField
        id="employee-shift"
        label="Turno"
        value={form.shift}
        options={["10:00–18:00", "14:00–20:00", "09:00–17:00"]}
        onChange={(value) => update("shift", value)}
      />
      <SelectField
        id="employee-rest"
        label="Día de descanso"
        value={form.restDay}
        options={[
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
          "Domingo",
        ]}
        onChange={(value) => update("restDay", value)}
      />
      <div className="form-field">
        <Label htmlFor="employee-birthday">Cumpleaños</Label>
        <Input
          id="employee-birthday"
          type="date"
          value={form.birthday}
          onChange={(event) => update("birthday", event.target.value)}
        />
      </div>
      <SelectField
        id="employee-status"
        label="Estado"
        value={form.status}
        options={["Activo", "Inactivo", "Vacaciones"]}
        onChange={(value) => update("status", value)}
      />
    </form>
  );
}

function RecordForm({
  item,
  section,
  onSave,
  onClose,
}: {
  item?: CatalogRecord;
  section: DataSection;
  onSave: (record: CatalogRecord) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CatalogRecord>(
    item ?? {
      id: 0,
      name: "",
      detail: "",
      extra: "",
      status: section === "requests" ? "Pendiente" : "Activo",
    },
  );
  const labels = recordLabels[section];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, id: form.id || Date.now(), name: form.name.trim() });
  };
  return (
    <form id="record-form" className="form-grid single" onSubmit={submit}>
      <div className="form-field">
        <Label htmlFor="record-name">{labels.columns[0]}</Label>
        <Input
          id="record-name"
          autoFocus
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </div>
      <div className="form-field">
        <Label htmlFor="record-detail">{labels.columns[1]}</Label>
        <Input
          id="record-detail"
          required
          value={form.detail}
          onChange={(event) => setForm({ ...form, detail: event.target.value })}
        />
      </div>
      <div className="form-field">
        <Label htmlFor="record-extra">{labels.columns[2]}</Label>
        <Textarea
          id="record-extra"
          required
          value={form.extra}
          onChange={(event) => setForm({ ...form, extra: event.target.value })}
        />
      </div>
      <SelectField
        id="record-status"
        label="Estado"
        value={form.status}
        options={["Activo", "Inactivo", "Pendiente", "Autorizado", "Rechazado"]}
        onChange={(value) =>
          setForm({ ...form, status: value as CatalogRecord["status"] })
        }
      />
    </form>
  );
}

function PanelHeading({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="panel-heading">
      <div>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </header>
  );
}

function LoadingPanel() {
  return (
    <section className="content-stack pt-4">
      <Card className="rounded-none border-[#51452f] bg-[#191919] shadow-none">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-5 w-48 rounded-none bg-[#2a261f]" />
          <Skeleton className="h-10 w-full rounded-none bg-[#24211b]" />
          <Skeleton className="h-10 w-full rounded-none bg-[#24211b]" />
          <Skeleton className="h-10 w-3/4 rounded-none bg-[#24211b]" />
        </CardContent>
      </Card>
    </section>
  );
}

function EmployeeTable({
  state,
  setState,
  openEditor,
  notify,
  requestConfirm,
}: {
  state: MockState;
  setState: React.Dispatch<React.SetStateAction<MockState>>;
  openEditor: (item?: Employee) => void;
  notify: (message: string) => void;
  requestConfirm: (confirmation: NonNullable<ConfirmState>) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const shown = useMemo(
    () =>
      state.employees.filter((item) =>
        `${item.name} ${item.username} ${item.email} ${item.role} ${item.branch}`
          .toLowerCase()
          .includes(deferredSearch.toLowerCase()),
      ),
    [state.employees, deferredSearch],
  );
  const remove = (id: number) => {
    requestConfirm({
      title: "Eliminar empleado",
      description:
        "El registro se eliminará únicamente de los mocks locales de HR.",
      action: () => {
        setState((current) => ({
          ...current,
          employees: current.employees.filter((item) => item.id !== id),
        }));
        setSelected((current) => current.filter((value) => value !== id));
        notify("Empleado eliminado del mock.");
      },
    });
  };
  const removeSelected = () => {
    if (!selected.length) return;
    requestConfirm({
      title: `Eliminar ${selected.length} empleados`,
      description:
        "Esta acción eliminará todos los registros seleccionados del mock local.",
      confirmLabel: "Eliminar selección",
      action: () => {
        setState((current) => ({
          ...current,
          employees: current.employees.filter(
            (item) => !selected.includes(item.id),
          ),
        }));
        setSelected([]);
        notify("Selección eliminada.");
      },
    });
  };
  const toggle = (id: number) =>
    setState((current) => ({
      ...current,
      employees: current.employees.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "Activo" ? "Inactivo" : "Activo",
            }
          : item,
      ),
    }));
  const exportCsv = () => {
    const rows = [
      ["Nombre", "Usuario", "Correo", "Puesto", "Sucursal", "Estado"],
      ...state.employees.map((item) => [
        item.name,
        item.username,
        item.email,
        item.role,
        item.branch,
        item.status,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "empleados-keysar-mock.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Directorio exportado.");
  };
  const importMock = (file: File) => {
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    const name = base || "Empleado importado";
    setState((current) => ({
      ...current,
      employees: [
        ...current.employees,
        {
          id: Date.now(),
          name,
          username: `mock${current.employees.length + 1}`,
          email: "mock@keysar.mx",
          role: "Vendedor",
          branch: "Sin asignar",
          shift: "10:00–18:00",
          restDay: "Domingo",
          birthday: "",
          status: "Activo",
        },
      ],
    }));
    notify(`Carga mock completada: ${file.name}`);
  };
  return (
    <section className="content-stack">
      <PanelHeading
        eyebrow="Registro general"
        title="Directorio de empleados"
        subtitle={`${state.employees.length} cuentas · ${state.employees.filter((item) => item.status === "Activo").length} activas`}
        actions={
          <>
            <ActionButton onClick={exportCsv}>
              <Download size={13} /> Descargar plantilla Excel
            </ActionButton>
            <Button
              asChild
              className="h-8 rounded-none border border-[#c4a052] bg-[#174c3c] px-3 text-[8px] font-normal text-white hover:bg-[#1f624e]"
            >
              <label>
                <Upload size={13} /> Carga masiva Excel
                <Input
                  className="hidden"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) importMock(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </Button>
          </>
        }
      />
      <div className="directory-search">
        <Search size={14} />
        <Input
          aria-label="Buscar empleados"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar empleado, usuario, correo, puesto o sucursal"
          className="h-full rounded-none border-0 bg-transparent px-0 text-[10px] shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="selection-bar">
        <label>
          <Input
            className="h-4 w-4 rounded-none p-0 shadow-none"
            type="checkbox"
            checked={
              shown.length > 0 &&
              shown.every((item) => selected.includes(item.id))
            }
            onChange={(event) =>
              setSelected(
                event.target.checked ? shown.map((item) => item.id) : [],
              )
            }
          />{" "}
          Seleccionar todos
        </label>
        <span>{selected.length} empleados seleccionados</span>
        <ActionButton
          tone="danger"
          disabled={!selected.length}
          onClick={removeSelected}
        >
          Borrar seleccionados
        </ActionButton>
      </div>
      <div className="table-shell">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sel.</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Input
                    className="h-4 w-4 rounded-none p-0 shadow-none"
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(item.id)
                          ? current.filter((value) => value !== item.id)
                          : [...current, item.id],
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="employee-cell">
                    <span>{initials(item.name)}</span>
                    <b>{item.name}</b>
                  </div>
                </TableCell>
                <TableCell className="gold-text">{item.username}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{item.role}</TableCell>
                <TableCell>{item.branch}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    className="h-auto rounded-full p-0 hover:bg-transparent"
                    onClick={() => toggle(item.id)}
                    aria-label={`Cambiar estado de ${item.name}`}
                  >
                    <HrStatusBadge status={item.status} />
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="row-actions">
                    <ActionButton onClick={() => openEditor(item)}>
                      <Pencil size={12} /> Editar
                    </ActionButton>
                    <ActionButton tone="danger" onClick={() => remove(item.id)}>
                      <Trash2 size={12} /> Borrar
                    </ActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!shown.length && (
          <div className="empty-row">
            No hay empleados que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </section>
  );
}

function PersonalPage({
  employees,
  openEditor,
}: {
  employees: Employee[];
  openEditor: (item?: Employee) => void;
}) {
  return (
    <section className="content-stack">
      <PanelHeading
        eyebrow="Administración de personal"
        title="Personal y horarios"
        subtitle="Edita los datos operativos y horarios individuales"
        actions={
          <ActionButton tone="gold" onClick={() => openEditor()}>
            <Plus size={13} /> Nuevo empleado
          </ActionButton>
        }
      />
      <Tabs defaultValue="personal" className="hr-tabs">
        <TabsList className="rounded-none border-[#51452f] bg-[#191919]">
          <TabsTrigger value="personal" className="rounded-none">
            Personal
          </TabsTrigger>
          <TabsTrigger value="horarios" className="rounded-none">
            Horarios y descansos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <PersonalTable
            employees={employees}
            openEditor={openEditor}
            mode="personal"
          />
        </TabsContent>
        <TabsContent value="horarios">
          <PersonalTable
            employees={employees}
            openEditor={openEditor}
            mode="schedule"
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function PersonalTable({
  employees,
  openEditor,
  mode,
}: {
  employees: Employee[];
  openEditor: (item?: Employee) => void;
  mode: "personal" | "schedule";
}) {
  return (
    <div className="table-shell">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            {mode === "personal" ? (
              <>
                <TableHead>Puesto</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Estado</TableHead>
              </>
            ) : (
              <>
                <TableHead>Turno</TableHead>
                <TableHead>Descanso</TableHead>
                <TableHead>Sucursal</TableHead>
              </>
            )}
            <TableHead>Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="employee-cell">
                  <span>{initials(item.name)}</span>
                  <b>{item.name}</b>
                </div>
              </TableCell>
              {mode === "personal" ? (
                <>
                  <TableCell>{item.role}</TableCell>
                  <TableCell>{item.branch}</TableCell>
                  <TableCell>
                    <HrStatusBadge status={item.status} />
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell>{item.shift}</TableCell>
                  <TableCell>{item.restDay}</TableCell>
                  <TableCell>{item.branch}</TableCell>
                </>
              )}
              <TableCell>
                <ActionButton onClick={() => openEditor(item)}>
                  <Pencil size={12} /> Editar perfil
                </ActionButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CatalogPage({
  section,
  records,
  onAdd,
  onEdit,
  onDelete,
  onStatus,
}: {
  section: DataSection;
  records: CatalogRecord[];
  onAdd: () => void;
  onEdit: (item: CatalogRecord) => void;
  onDelete: (item: CatalogRecord) => void;
  onStatus: (item: CatalogRecord, status: CatalogRecord["status"]) => void;
}) {
  const labels = recordLabels[section];
  const columns = useMemo<ColumnDef<CatalogRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: labels.columns[0],
        cell: ({ row }) => (
          <b className="uppercase text-white">{row.original.name}</b>
        ),
      },
      { accessorKey: "detail", header: labels.columns[1] },
      { accessorKey: "extra", header: labels.columns[2] },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <HrStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="row-actions">
              {section === "requests" && item.status === "Pendiente" && (
                <>
                  <ActionButton
                    tone="green"
                    onClick={() => onStatus(item, "Autorizado")}
                  >
                    <Check size={12} /> Autorizar
                  </ActionButton>
                  <ActionButton
                    tone="danger"
                    onClick={() => onStatus(item, "Rechazado")}
                  >
                    Rechazar
                  </ActionButton>
                </>
              )}
              <HrIconButton
                label={`Editar ${item.name}`}
                onClick={() => onEdit(item)}
              >
                <Pencil size={13} />
              </HrIconButton>
              <HrIconButton
                label={`Eliminar ${item.name}`}
                onClick={() => onDelete(item)}
              >
                <Trash2 size={13} />
              </HrIconButton>
            </div>
          );
        },
      },
    ],
    [labels, onDelete, onEdit, onStatus, section],
  );
  return (
    <section className="content-stack">
      <PanelHeading
        eyebrow="Gestión administrativa"
        title={labels.title}
        subtitle={`${records.length} registros en el mock`}
        actions={
          <ActionButton tone="gold" onClick={onAdd}>
            <Plus size={13} /> {labels.add}
          </ActionButton>
        }
      />
      <div className="hr-data-table">
        <DataTable
          columns={columns}
          data={records}
          emptyMessage={`No hay registros. Usa ${labels.add} para crear el primero.`}
          searchPlaceholder={`Buscar en ${labels.title}`}
          pageSize={10}
          labels={{ records: "Registros", all: "Todos" }}
        />
      </div>
    </section>
  );
}

function VacationsPage({
  records,
  onAdd,
  onEdit,
  onDelete,
}: {
  records: CatalogRecord[];
  onAdd: () => void;
  onEdit: (item: CatalogRecord) => void;
  onDelete: (item: CatalogRecord) => void;
}) {
  const vacations = records.filter((item) =>
    item.detail.toLowerCase().includes("vacaciones"),
  );
  return (
    <section className="content-stack">
      <div className="vacation-summary">
        <div>
          <small>Registros</small>
          <strong>{vacations.length}</strong>
          <span>Solicitudes de vacaciones</span>
        </div>
        <div>
          <small>Autorizadas</small>
          <strong>
            {vacations.filter((item) => item.status === "Autorizado").length}
          </strong>
          <span>Con aprobación</span>
        </div>
        <div>
          <small>Pendientes</small>
          <strong>
            {vacations.filter((item) => item.status === "Pendiente").length}
          </strong>
          <span>Requieren atención</span>
        </div>
      </div>
      <PanelHeading
        eyebrow="Historial general"
        title="Vacaciones del equipo"
        subtitle={`${vacations.length} periodos registrados`}
        actions={
          <ActionButton tone="gold" onClick={onAdd}>
            <Plus size={13} /> Nueva solicitud
          </ActionButton>
        }
      />
      <div className="table-shell">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vacations.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <b>{item.name}</b>
                </TableCell>
                <TableCell>{item.detail}</TableCell>
                <TableCell>{item.extra}</TableCell>
                <TableCell>
                  <HrStatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  <div className="row-actions">
                    <ActionButton onClick={() => onEdit(item)}>
                      <Pencil size={12} /> Editar
                    </ActionButton>
                    <ActionButton tone="danger" onClick={() => onDelete(item)}>
                      <Trash2 size={12} /> Borrar
                    </ActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!vacations.length && (
          <div className="empty-row">
            No hay periodos de vacaciones registrados.
          </div>
        )}
      </div>
    </section>
  );
}

function BirthdaysPage({
  employees,
  openEditor,
}: {
  employees: Employee[];
  openEditor: (item: Employee) => void;
}) {
  const sorted = [...employees]
    .filter((item) => item.birthday)
    .sort((a, b) => a.birthday.slice(5).localeCompare(b.birthday.slice(5)));
  return (
    <section className="content-stack">
      <PanelHeading
        eyebrow="Celebramos a nuestro equipo"
        title="Cumpleaños"
        subtitle={`${sorted.length} fechas registradas`}
      />
      <div className="birthday-grid">
        {sorted.map((item) => (
          <Card
            key={item.id}
            className="birthday-card rounded-none border-0 bg-[#191919] shadow-none"
          >
            <CardContent className="contents">
              <small>
                {new Date(`${item.birthday}T12:00:00`).toLocaleDateString(
                  "es-MX",
                  { month: "long" },
                )}
              </small>
              <strong>{new Date(`${item.birthday}T12:00:00`).getDate()}</strong>
              <div>
                <b>{item.name}</b>
                <span>
                  {item.role} · {item.branch}
                </span>
              </div>
              <ActionButton onClick={() => openEditor(item)}>
                <Pencil size={12} /> Editar fecha
              </ActionButton>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function RolesClient() {
  const [state, setState, hydrated] = useMockState();
  const [section, setSection] = useState<Section>("employees");
  const [editor, setEditor] = useState<Editor>(null);
  const [confirmation, setConfirmation] = useState<ConfirmState>(null);
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const go = (next: Section) => {
    setSection(next);
  };
  const openEmployee = (item?: Employee) =>
    setEditor({ type: "employee", item });
  const saveEmployee = (employee: Employee) => {
    setState((current) => ({
      ...current,
      employees: current.employees.some((item) => item.id === employee.id)
        ? current.employees.map((item) =>
            item.id === employee.id ? employee : item,
          )
        : [...current.employees, employee],
    }));
    setEditor(null);
    toast.success(
      employee.id
        ? "Empleado guardado en los mocks."
        : "Empleado creado en los mocks.",
    );
  };
  const recordsFor = (target: DataSection) => state[target];
  const saveRecord = (target: DataSection, record: CatalogRecord) => {
    setState((current) => ({
      ...current,
      [target]: current[target].some((item) => item.id === record.id)
        ? current[target].map((item) => (item.id === record.id ? record : item))
        : [...current[target], record],
    }));
    setEditor(null);
    toast.success("Registro guardado en los mocks.");
  };
  const deleteRecord = (target: DataSection, record: CatalogRecord) => {
    setConfirmation({
      title: `Eliminar ${record.name}`,
      description: "El registro se eliminará únicamente del mock local de HR.",
      action: () => {
        setState((current) => ({
          ...current,
          [target]: current[target].filter((item) => item.id !== record.id),
        }));
        toast.success("Registro eliminado del mock.");
      },
    });
  };
  const setRecordStatus = (
    target: DataSection,
    record: CatalogRecord,
    status: CatalogRecord["status"],
  ) => {
    setState((current) => ({
      ...current,
      [target]: current[target].map((item) =>
        item.id === record.id ? { ...item, status } : item,
      ),
    }));
    toast.success(`Solicitud marcada como ${status.toLowerCase()}.`);
  };
  return (
    <SidebarProvider defaultOpen className="hr-app">
      <Sidebar
        collapsible="offcanvas"
        className="hr-sidebar border-r-[#7a6232]"
      >
        <SidebarHeader className="hr-sidebar-header">
          <span>Menú administrativo</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="sr-only">
              Navegación HR
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="hr-sidebar-nav">
                {nav.map(({ id, label, icon: Icon }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      tooltip={label}
                      isActive={section === id}
                      onClick={() => (id === "new" ? openEmployee() : go(id))}
                      className={id === "new" ? "new-employee-nav" : ""}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                    {id === "requests" && (
                      <SidebarMenuBadge>
                        {
                          state.requests.filter(
                            (item) => item.status === "Pendiente",
                          ).length
                        }
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="hr-main">
        <header className="topbar">
          <SidebarTrigger className="mobile-menu" />
          <Button
            variant="ghost"
            className="top-brand !h-auto !p-0 hover:bg-transparent"
            onClick={() => go("employees")}
          >
            <span>K</span>
            <div>
              <b>KEYSAR COSMETICS</b>
              <small>Gestión de personal</small>
            </div>
          </Button>
          <p>
            Hola, <em>ENRIQUE</em>
          </p>
          <div className="top-actions">
            <ActionButton
              className="top-action !h-[37px]"
              onClick={() => go("birthdays")}
            >
              <Baby size={12} /> Cumpleaños
            </ActionButton>
            <ActionButton
              className="top-action !h-[37px]"
              onClick={() => go("policies")}
            >
              <FileText size={12} /> Políticas
            </ActionButton>
            <ActionButton
              className="top-action !h-[37px]"
              onClick={() => {
                setUpdatedAt(new Date());
                toast.success("Información mock actualizada.");
              }}
            >
              <RefreshCw size={12} /> Actualizado{" "}
              {updatedAt.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </ActionButton>
            <Popover>
              <div className="preferences">
                <PopoverTrigger asChild>
                  <ActionButton className="top-action !h-[37px]">
                    <Settings2 size={12} /> Preferencias
                  </ActionButton>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="preferences-menu rounded-none border-[#c4a052] bg-[#161616] text-[#eee9df]"
                >
                  <small>Apariencia</small>
                  <b>Tema oscuro original</b>
                  <small>Datos</small>
                  <ActionButton
                    onClick={() => {
                      setState(initialMockState);
                      toast.success("Mocks restaurados.");
                    }}
                  >
                    Restaurar mocks iniciales
                  </ActionButton>
                </PopoverContent>
              </div>
            </Popover>
            <div className="account">
              <b>Enrique Galicia Garatachia</b>
              <small>Usuario Maestro</small>
            </div>
            <Badge
              variant="outline"
              className="demo-badge rounded-none border-[#7a6232]"
            >
              Mock local
            </Badge>
          </div>
        </header>
        <Hero section={section} state={state} />
        <main className="content-area">
          {!hydrated ? (
            <LoadingPanel />
          ) : (
            <>
              {section === "employees" && (
                <EmployeeTable
                  state={state}
                  setState={setState}
                  openEditor={openEmployee}
                  notify={(message) => toast.success(message)}
                  requestConfirm={setConfirmation}
                />
              )}
              {section === "personal" && (
                <PersonalPage
                  employees={state.employees}
                  openEditor={openEmployee}
                />
              )}
              {section === "vacations" && (
                <VacationsPage
                  records={state.requests}
                  onAdd={() =>
                    setEditor({ type: "record", section: "requests" })
                  }
                  onEdit={(item) =>
                    setEditor({ type: "record", section: "requests", item })
                  }
                  onDelete={(item) => deleteRecord("requests", item)}
                />
              )}
              {section === "birthdays" && (
                <BirthdaysPage
                  employees={state.employees}
                  openEditor={openEmployee}
                />
              )}
              {!["employees", "personal", "vacations", "birthdays"].includes(
                section,
              ) && (
                <CatalogPage
                  section={section as DataSection}
                  records={recordsFor(section as DataSection)}
                  onAdd={() =>
                    setEditor({
                      type: "record",
                      section: section as DataSection,
                    })
                  }
                  onEdit={(item) =>
                    setEditor({
                      type: "record",
                      section: section as DataSection,
                      item,
                    })
                  }
                  onDelete={(item) =>
                    deleteRecord(section as DataSection, item)
                  }
                  onStatus={(item, status) =>
                    setRecordStatus(section as DataSection, item, status)
                  }
                />
              )}
            </>
          )}
        </main>
      </SidebarInset>
      {editor?.type === "employee" && (
        <HrFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          title={editor.item ? "Editar empleado" : "Nuevo empleado"}
          footer={
            <>
              <ActionButton onClick={() => setEditor(null)}>
                Cancelar
              </ActionButton>
              <ActionButton type="submit" form="employee-form" tone="gold">
                Guardar empleado
              </ActionButton>
            </>
          }
        >
          <EmployeeForm
            item={editor.item}
            onSave={saveEmployee}
            onClose={() => setEditor(null)}
          />
        </HrFormDialog>
      )}
      {editor?.type === "record" && (
        <HrFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          title={
            editor.item
              ? `Editar: ${editor.item.name}`
              : recordLabels[editor.section].add
          }
          footer={
            <>
              <ActionButton onClick={() => setEditor(null)}>
                Cancelar
              </ActionButton>
              <ActionButton type="submit" form="record-form" tone="gold">
                Guardar registro
              </ActionButton>
            </>
          }
        >
          <RecordForm
            item={editor.item}
            section={editor.section}
            onSave={(record) => saveRecord(editor.section, record)}
            onClose={() => setEditor(null)}
          />
        </HrFormDialog>
      )}
      <HrConfirmDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={confirmation?.title ?? "Confirmar acción"}
        description={confirmation?.description ?? ""}
        confirmLabel={confirmation?.confirmLabel}
        onConfirm={() => {
          confirmation?.action();
          setConfirmation(null);
        }}
      />
      <Popover>
        <div className="help">
          <PopoverTrigger asChild>
            <Button className="help-trigger !h-11 rounded-full border border-[#c4a052] bg-[#111] px-[18px] text-[9px] font-bold text-white hover:bg-[#211f1b]">
              <HelpCircle size={18} /> ¿Necesitas ayuda?
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-[280px] rounded-none border-[#c4a052] bg-[#171717] text-[#eee9df]"
          >
            <b className="font-brand text-lg font-normal">Centro de ayuda</b>
            <p className="mt-2 text-[10px] leading-6 text-[#c1b5a1]">
              Los cambios se guardan únicamente como mocks en este navegador.
              Puedes restaurarlos desde Preferencias.
            </p>
          </PopoverContent>
        </div>
      </Popover>
    </SidebarProvider>
  );
}
