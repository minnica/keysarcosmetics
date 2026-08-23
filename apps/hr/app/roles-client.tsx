"use client";

import { useDeferredValue, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Award, Baby, Bell, Building2, CalendarDays, Check, ChevronLeft, ChevronRight,
  ClipboardList, Clock3, Download, FileSpreadsheet, FileText, HelpCircle,
  Menu, Pencil, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles,
  Store, Trash2, Upload, UserRound, Users, X,
} from "lucide-react";
import { initialMockState, type CatalogRecord, type Employee, type MockState } from "./mock-data";

type Section = "employees" | "personal" | "calendar" | "requests" | "vacations" | "branches" | "positions" | "facialists" | "birthdays" | "policies" | "access";
type DataSection = Exclude<Section, "employees" | "personal" | "vacations" | "birthdays">;
type Editor = { type: "employee"; item?: Employee } | { type: "record"; section: DataSection; item?: CatalogRecord } | null;

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

const heroCopy: Record<Section, { eyebrow: string; line1: string; line2: string; description: string }> = {
  employees: { eyebrow: "Directorio de personal", line1: "Todos los", line2: "empleados.", description: "Consulta los registros del personal según tu nivel de acceso." },
  personal: { eyebrow: "Administración de personal", line1: "Altas y", line2: "edición.", description: "Consulta o administra perfiles y horarios con datos de demostración." },
  calendar: { eyebrow: "Planeación y control", line1: "Calendario", line2: "laboral.", description: "Organiza turnos y asignaciones diarias por sucursal." },
  requests: { eyebrow: "Autorizaciones", line1: "Solicitudes", line2: "del equipo.", description: "Revisa permisos y ausencias pendientes, autorizadas o rechazadas." },
  vacations: { eyebrow: "Historial general", line1: "Vacaciones.", line2: "Todo el equipo.", description: "Consulta los periodos registrados y su estado actual." },
  branches: { eyebrow: "Catálogo central", line1: "Nuestras", line2: "sucursales.", description: "Administra horarios y responsables de cada punto de venta." },
  positions: { eyebrow: "Catálogo central", line1: "Puestos y", line2: "funciones.", description: "Mantén actualizados los roles operativos del equipo." },
  facialists: { eyebrow: "Cobertura de cabinas", line1: "Horarios", line2: "facialistas.", description: "Organiza la cobertura de especialistas por sucursal." },
  birthdays: { eyebrow: "Cultura Keysar", line1: "Cumpleaños", line2: "del equipo.", description: "Consulta y actualiza las fechas importantes del personal." },
  policies: { eyebrow: "Documentos internos", line1: "Políticas y", line2: "reglamentos.", description: "Administra las versiones vigentes y sus acuses." },
  access: { eyebrow: "Seguridad y permisos", line1: "Control.", line2: "Acceso total.", description: "Configura usuarios, perfiles y alcances de demostración." },
};

const recordLabels: Record<DataSection, { title: string; subtitle: string; columns: [string, string, string]; add: string }> = {
  calendar: { title: "Asignaciones del calendario", subtitle: "Turnos registrados por fecha", columns: ["Empleado", "Fecha", "Sucursal y turno"], add: "Nueva asignación" },
  requests: { title: "Solicitudes del personal", subtitle: "Permisos, ausencias y vacaciones", columns: ["Empleado", "Solicitud", "Motivo"], add: "Nueva solicitud" },
  branches: { title: "Sucursales", subtitle: "Puntos de venta registrados", columns: ["Sucursal", "Horario", "Responsable"], add: "Nueva sucursal" },
  positions: { title: "Puestos", subtitle: "Catálogo de funciones", columns: ["Puesto", "Descripción", "Asignación"], add: "Nuevo puesto" },
  facialists: { title: "Horarios facialistas", subtitle: "Cobertura semanal de cabinas", columns: ["Facialista", "Días", "Sucursal y turno"], add: "Nuevo horario" },
  policies: { title: "Políticas y reglamentos", subtitle: "Documentos internos vigentes", columns: ["Documento", "Versión", "Acuses"], add: "Nuevo documento" },
  access: { title: "Usuarios y permisos", subtitle: "Perfiles de acceso mock", columns: ["Perfil", "Módulos", "Nivel"], add: "Nuevo perfil" },
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function useMockState() {
  const [state, setState] = useState<MockState>(initialMockState);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("keysar-hr-mocks");
    if (stored) {
      try { setState(JSON.parse(stored) as MockState); } catch { /* conserva los mocks iniciales */ }
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem("keysar-hr-mocks", JSON.stringify(state));
  }, [hydrated, state]);
  return [state, setState] as const;
}

function ActionButton({ children, onClick, tone = "default", disabled = false, type = "button" }: { children: ReactNode; onClick?: () => void; tone?: "default" | "gold" | "danger" | "green"; disabled?: boolean; type?: "button" | "submit" }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`action-button action-${tone}`}>{children}</button>;
}

function Hero({ section, state }: { section: Section; state: MockState }) {
  const copy = heroCopy[section];
  return <section className="hr-hero"><div className="hero-copy"><p>{copy.eyebrow}</p><h1>{copy.line1}<br /><em>{copy.line2}</em></h1><span>{copy.description}</span></div><div className="hero-stats"><div><small>Personal</small><strong>{state.employees.length}</strong></div><div><small>Activos</small><strong>{state.employees.filter((item) => item.status === "Activo").length}</strong></div><div><small>Sucursales</small><strong>{state.branches.filter((item) => item.status === "Activo").length}</strong></div></div></section>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><div><small>Datos de demostración</small><h2 id="modal-title">{title}</h2></div><button onClick={onClose} aria-label="Cerrar"><X size={18} /></button></header>{children}</section></div>;
}

function EmployeeForm({ item, onSave, onClose }: { item?: Employee; onSave: (employee: Employee) => void; onClose: () => void }) {
  const [form, setForm] = useState<Employee>(item ?? { id: 0, name: "", username: "", email: "", role: "Vendedor", branch: "Sin asignar", shift: "10:00–18:00", restDay: "Domingo", birthday: "", status: "Activo" });
  const update = (key: keyof Employee, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); if (!form.name.trim()) return; onSave({ ...form, id: form.id || Date.now(), name: form.name.trim() }); };
  return <form className="editor-form" onSubmit={submit}><div className="form-grid"><label className="wide">Nombre completo<input autoFocus required value={form.name} onChange={(event) => update("name", event.target.value)} /></label><label>Usuario<input required value={form.username} onChange={(event) => update("username", event.target.value)} /></label><label>Correo<input type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} /></label><label>Puesto<select value={form.role} onChange={(event) => update("role", event.target.value)}><option>Master</option><option>Gerente</option><option>Facialista</option><option>Vendedor</option></select></label><label>Sucursal<select value={form.branch} onChange={(event) => update("branch", event.target.value)}><option>Sin asignar</option><option>Mitikah</option><option>Mitikah VIP</option><option>Opatra</option><option>Galerías Insurgentes</option><option>Masaryk</option><option>Parque Delta</option></select></label><label>Turno<select value={form.shift} onChange={(event) => update("shift", event.target.value)}><option>10:00–18:00</option><option>14:00–20:00</option><option>09:00–17:00</option></select></label><label>Día de descanso<select value={form.restDay} onChange={(event) => update("restDay", event.target.value)}>{["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => <option key={day}>{day}</option>)}</select></label><label>Cumpleaños<input type="date" value={form.birthday} onChange={(event) => update("birthday", event.target.value)} /></label><label>Estado<select value={form.status} onChange={(event) => update("status", event.target.value)}><option>Activo</option><option>Inactivo</option><option>Vacaciones</option></select></label></div><footer><ActionButton onClick={onClose}>Cancelar</ActionButton><ActionButton type="submit" tone="gold">Guardar empleado</ActionButton></footer></form>;
}

function RecordForm({ item, section, onSave, onClose }: { item?: CatalogRecord; section: DataSection; onSave: (record: CatalogRecord) => void; onClose: () => void }) {
  const [form, setForm] = useState<CatalogRecord>(item ?? { id: 0, name: "", detail: "", extra: "", status: section === "requests" ? "Pendiente" : "Activo" });
  const labels = recordLabels[section];
  const submit = (event: FormEvent) => { event.preventDefault(); if (!form.name.trim()) return; onSave({ ...form, id: form.id || Date.now(), name: form.name.trim() }); };
  return <form className="editor-form" onSubmit={submit}><div className="form-grid single"><label>{labels.columns[0]}<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>{labels.columns[1]}<input required value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} /></label><label>{labels.columns[2]}<input required value={form.extra} onChange={(event) => setForm({ ...form, extra: event.target.value })} /></label><label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CatalogRecord["status"] })}><option>Activo</option><option>Inactivo</option><option>Pendiente</option><option>Autorizado</option><option>Rechazado</option></select></label></div><footer><ActionButton onClick={onClose}>Cancelar</ActionButton><ActionButton type="submit" tone="gold">Guardar registro</ActionButton></footer></form>;
}

function PanelHeading({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions?: ReactNode }) {
  return <header className="panel-heading"><div><small>{eyebrow}</small><h2>{title}</h2><span>{subtitle}</span></div>{actions && <div className="heading-actions">{actions}</div>}</header>;
}

function EmployeeTable({ state, setState, openEditor, notify }: { state: MockState; setState: React.Dispatch<React.SetStateAction<MockState>>; openEditor: (item?: Employee) => void; notify: (message: string) => void }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const shown = useMemo(() => state.employees.filter((item) => `${item.name} ${item.username} ${item.email} ${item.role} ${item.branch}`.toLowerCase().includes(deferredSearch.toLowerCase())), [state.employees, deferredSearch]);
  const remove = (id: number) => { if (!window.confirm("¿Eliminar este empleado del mock?")) return; setState((current) => ({ ...current, employees: current.employees.filter((item) => item.id !== id) })); setSelected((current) => current.filter((value) => value !== id)); notify("Empleado eliminado del mock."); };
  const removeSelected = () => { if (!selected.length || !window.confirm(`¿Eliminar ${selected.length} empleados seleccionados?`)) return; setState((current) => ({ ...current, employees: current.employees.filter((item) => !selected.includes(item.id)) })); setSelected([]); notify("Selección eliminada."); };
  const toggle = (id: number) => setState((current) => ({ ...current, employees: current.employees.map((item) => item.id === id ? { ...item, status: item.status === "Activo" ? "Inactivo" : "Activo" } : item) }));
  const exportCsv = () => { const rows = [["Nombre", "Usuario", "Correo", "Puesto", "Sucursal", "Estado"], ...state.employees.map((item) => [item.name, item.username, item.email, item.role, item.branch, item.status])]; const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "empleados-keysar-mock.csv"; anchor.click(); URL.revokeObjectURL(url); notify("Directorio exportado."); };
  const importMock = (file: File) => { const base = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "); const name = base || "Empleado importado"; setState((current) => ({ ...current, employees: [...current.employees, { id: Date.now(), name, username: `mock${current.employees.length + 1}`, email: "mock@keysar.mx", role: "Vendedor", branch: "Sin asignar", shift: "10:00–18:00", restDay: "Domingo", birthday: "", status: "Activo" }] })); notify(`Carga mock completada: ${file.name}`); };
  return <section className="content-stack"><PanelHeading eyebrow="Registro general" title="Directorio de empleados" subtitle={`${state.employees.length} cuentas · ${state.employees.filter((item) => item.status === "Activo").length} activas`} actions={<><ActionButton onClick={exportCsv}><Download size={13} /> Descargar plantilla Excel</ActionButton><label className="action-button action-green"><Upload size={13} /> Carga masiva Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) importMock(file); event.target.value = ""; }} /></label></>} /><div className="directory-search"><Search size={14} /><input aria-label="Buscar empleados" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empleado, usuario, correo, puesto o sucursal" /></div><div className="selection-bar"><label><input type="checkbox" checked={shown.length > 0 && shown.every((item) => selected.includes(item.id))} onChange={(event) => setSelected(event.target.checked ? shown.map((item) => item.id) : [])} /> Seleccionar todos</label><span>{selected.length} empleados seleccionados</span><ActionButton tone="danger" disabled={!selected.length} onClick={removeSelected}>Borrar seleccionados</ActionButton></div><div className="table-shell"><table><thead><tr><th>Sel.</th><th>Empleado</th><th>Usuario</th><th>Correo</th><th>Puesto</th><th>Sucursal</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{shown.map((item) => <tr key={item.id}><td><input type="checkbox" checked={selected.includes(item.id)} onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id])} /></td><td><div className="employee-cell"><span>{initials(item.name)}</span><b>{item.name}</b></div></td><td className="gold-text">{item.username}</td><td>{item.email}</td><td>{item.role}</td><td>{item.branch}</td><td><button className={`status-pill status-${item.status.toLowerCase()}`} onClick={() => toggle(item.id)}>{item.status}</button></td><td><div className="row-actions"><ActionButton onClick={() => openEditor(item)}><Pencil size={12} /> Editar</ActionButton><ActionButton tone="danger" onClick={() => remove(item.id)}><Trash2 size={12} /> Borrar</ActionButton></div></td></tr>)}</tbody></table>{!shown.length && <div className="empty-row">No hay empleados que coincidan con la búsqueda.</div>}</div></section>;
}

function PersonalPage({ employees, openEditor }: { employees: Employee[]; openEditor: (item?: Employee) => void }) {
  return <section className="content-stack"><PanelHeading eyebrow="Administración de personal" title="Personal y horarios" subtitle="Edita los datos operativos y horarios individuales" actions={<ActionButton tone="gold" onClick={() => openEditor()}><Plus size={13} /> Nuevo empleado</ActionButton>} /><div className="table-shell"><table><thead><tr><th>Empleado</th><th>Puesto</th><th>Sucursal</th><th>Turno</th><th>Descanso</th><th>Acción</th></tr></thead><tbody>{employees.map((item) => <tr key={item.id}><td><div className="employee-cell"><span>{initials(item.name)}</span><b>{item.name}</b></div></td><td>{item.role}</td><td>{item.branch}</td><td>{item.shift}</td><td>{item.restDay}</td><td><ActionButton onClick={() => openEditor(item)}><Pencil size={12} /> Editar perfil</ActionButton></td></tr>)}</tbody></table></div></section>;
}

function CatalogPage({ section, records, onAdd, onEdit, onDelete, onStatus }: { section: DataSection; records: CatalogRecord[]; onAdd: () => void; onEdit: (item: CatalogRecord) => void; onDelete: (item: CatalogRecord) => void; onStatus: (item: CatalogRecord, status: CatalogRecord["status"]) => void }) {
  const labels = recordLabels[section];
  return <section className="content-stack"><PanelHeading eyebrow="Gestión administrativa" title={labels.title} subtitle={`${records.length} registros en el mock`} actions={<ActionButton tone="gold" onClick={onAdd}><Plus size={13} /> {labels.add}</ActionButton>} /><div className="table-shell"><table><thead><tr><th>{labels.columns[0]}</th><th>{labels.columns[1]}</th><th>{labels.columns[2]}</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{records.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td>{item.detail}</td><td>{item.extra}</td><td><span className={`record-status record-${item.status.toLowerCase()}`}>{item.status}</span></td><td><div className="row-actions">{section === "requests" && item.status === "Pendiente" && <><ActionButton tone="green" onClick={() => onStatus(item, "Autorizado")}><Check size={12} /> Autorizar</ActionButton><ActionButton tone="danger" onClick={() => onStatus(item, "Rechazado")}>Rechazar</ActionButton></>}<ActionButton onClick={() => onEdit(item)}><Pencil size={12} /> Editar</ActionButton><ActionButton tone="danger" onClick={() => onDelete(item)}><Trash2 size={12} /> Borrar</ActionButton></div></td></tr>)}</tbody></table>{!records.length && <div className="empty-row"><ClipboardList size={24} /> No hay registros. Usa “{labels.add}” para crear el primero.</div>}</div></section>;
}

function VacationsPage({ records, onAdd, onEdit, onDelete }: { records: CatalogRecord[]; onAdd: () => void; onEdit: (item: CatalogRecord) => void; onDelete: (item: CatalogRecord) => void }) {
  const vacations = records.filter((item) => item.detail.toLowerCase().includes("vacaciones"));
  return <section className="content-stack"><div className="vacation-summary"><div><small>Registros</small><strong>{vacations.length}</strong><span>Solicitudes de vacaciones</span></div><div><small>Autorizadas</small><strong>{vacations.filter((item) => item.status === "Autorizado").length}</strong><span>Con aprobación</span></div><div><small>Pendientes</small><strong>{vacations.filter((item) => item.status === "Pendiente").length}</strong><span>Requieren atención</span></div></div><PanelHeading eyebrow="Historial general" title="Vacaciones del equipo" subtitle={`${vacations.length} periodos registrados`} actions={<ActionButton tone="gold" onClick={onAdd}><Plus size={13} /> Nueva solicitud</ActionButton>} /><div className="table-shell"><table><thead><tr><th>Empleado</th><th>Periodo</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{vacations.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td>{item.detail}</td><td>{item.extra}</td><td><span className={`record-status record-${item.status.toLowerCase()}`}>{item.status}</span></td><td><div className="row-actions"><ActionButton onClick={() => onEdit(item)}><Pencil size={12} /> Editar</ActionButton><ActionButton tone="danger" onClick={() => onDelete(item)}><Trash2 size={12} /> Borrar</ActionButton></div></td></tr>)}</tbody></table>{!vacations.length && <div className="empty-row">No hay periodos de vacaciones registrados.</div>}</div></section>;
}

function BirthdaysPage({ employees, openEditor }: { employees: Employee[]; openEditor: (item: Employee) => void }) {
  const sorted = [...employees].filter((item) => item.birthday).sort((a, b) => a.birthday.slice(5).localeCompare(b.birthday.slice(5)));
  return <section className="content-stack"><PanelHeading eyebrow="Celebramos a nuestro equipo" title="Cumpleaños" subtitle={`${sorted.length} fechas registradas`} /><div className="birthday-grid">{sorted.map((item) => <article key={item.id}><small>{new Date(`${item.birthday}T12:00:00`).toLocaleDateString("es-MX", { month: "long" })}</small><strong>{new Date(`${item.birthday}T12:00:00`).getDate()}</strong><div><b>{item.name}</b><span>{item.role} · {item.branch}</span></div><ActionButton onClick={() => openEditor(item)}><Pencil size={12} /> Editar fecha</ActionButton></article>)}</div></section>;
}

export default function RolesClient() {
  const [state, setState] = useMockState();
  const [section, setSection] = useState<Section>("employees");
  const [editor, setEditor] = useState<Editor>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [updatedAt, setUpdatedAt] = useState(new Date());

  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 2800); return () => window.clearTimeout(timer); }, [notice]);
  const go = (next: Section) => { setSection(next); setMobileOpen(false); };
  const openEmployee = (item?: Employee) => setEditor({ type: "employee", item });
  const saveEmployee = (employee: Employee) => { setState((current) => ({ ...current, employees: current.employees.some((item) => item.id === employee.id) ? current.employees.map((item) => item.id === employee.id ? employee : item) : [...current.employees, employee] })); setEditor(null); setNotice(employee.id ? "Empleado guardado en los mocks." : "Empleado creado en los mocks."); };
  const recordsFor = (target: DataSection) => state[target];
  const saveRecord = (target: DataSection, record: CatalogRecord) => { setState((current) => ({ ...current, [target]: current[target].some((item) => item.id === record.id) ? current[target].map((item) => item.id === record.id ? record : item) : [...current[target], record] })); setEditor(null); setNotice("Registro guardado en los mocks."); };
  const deleteRecord = (target: DataSection, record: CatalogRecord) => { if (!window.confirm(`¿Eliminar “${record.name}” del mock?`)) return; setState((current) => ({ ...current, [target]: current[target].filter((item) => item.id !== record.id) })); setNotice("Registro eliminado del mock."); };
  const setRecordStatus = (target: DataSection, record: CatalogRecord, status: CatalogRecord["status"]) => { setState((current) => ({ ...current, [target]: current[target].map((item) => item.id === record.id ? { ...item, status } : item) })); setNotice(`Solicitud marcada como ${status.toLowerCase()}.`); };
  return <div className="hr-app"><aside className={`admin-sidebar ${mobileOpen ? "sidebar-open" : ""}`}><header><span>Menú administrativo</span><button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><X size={18} /></button></header><nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => id === "new" ? openEmployee() : go(id)} className={`${id === "new" ? "new-employee-nav" : ""} ${section === id ? "active" : ""}`}><Icon size={16} /><span>{label}</span>{id === "requests" && <b>{state.requests.filter((item) => item.status === "Pendiente").length}</b>}</button>)}</nav></aside><div className="hr-main"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu size={20} /></button><button className="top-brand" onClick={() => go("employees")}><span>K</span><div><b>KEYSAR COSMETICS</b><small>Gestión de personal</small></div></button><p>Hola, <em>ENRIQUE</em></p><div className="top-actions"><button onClick={() => go("birthdays")}><Baby size={12} /> Cumpleaños</button><button onClick={() => go("policies")}><FileText size={12} /> Políticas</button><button onClick={() => { setUpdatedAt(new Date()); setNotice("Información mock actualizada."); }}><RefreshCw size={12} /> Actualizado {updatedAt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</button><div className="preferences"><button onClick={() => setPreferencesOpen((value) => !value)}><Settings2 size={12} /> Preferencias</button>{preferencesOpen && <div className="preferences-menu"><small>Apariencia</small><b>Tema oscuro original</b><small>Datos</small><button onClick={() => { setState(initialMockState); setNotice("Mocks restaurados."); setPreferencesOpen(false); }}>Restaurar mocks iniciales</button></div>}</div><div className="account"><b>Enrique Galicia Garatachia</b><small>Usuario Maestro</small></div><span className="demo-badge">Mock local</span></div></header><Hero section={section} state={state} /><main className="content-area">{section === "employees" && <EmployeeTable state={state} setState={setState} openEditor={openEmployee} notify={setNotice} />}{section === "personal" && <PersonalPage employees={state.employees} openEditor={openEmployee} />}{section === "vacations" && <VacationsPage records={state.requests} onAdd={() => setEditor({ type: "record", section: "requests" })} onEdit={(item) => setEditor({ type: "record", section: "requests", item })} onDelete={(item) => deleteRecord("requests", item)} />}{section === "birthdays" && <BirthdaysPage employees={state.employees} openEditor={openEmployee} />}{!["employees", "personal", "vacations", "birthdays"].includes(section) && <CatalogPage section={section as DataSection} records={recordsFor(section as DataSection)} onAdd={() => setEditor({ type: "record", section: section as DataSection })} onEdit={(item) => setEditor({ type: "record", section: section as DataSection, item })} onDelete={(item) => deleteRecord(section as DataSection, item)} onStatus={(item, status) => setRecordStatus(section as DataSection, item, status)} />}</main></div>{mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" />}{editor?.type === "employee" && <Modal title={editor.item ? "Editar empleado" : "Nuevo empleado"} onClose={() => setEditor(null)}><EmployeeForm item={editor.item} onSave={saveEmployee} onClose={() => setEditor(null)} /></Modal>}{editor?.type === "record" && <Modal title={editor.item ? `Editar: ${editor.item.name}` : recordLabels[editor.section].add} onClose={() => setEditor(null)}><RecordForm item={editor.item} section={editor.section} onSave={(record) => saveRecord(editor.section, record)} onClose={() => setEditor(null)} /></Modal>}{notice && <div className="toast"><Check size={15} /> {notice}</div>}<div className="help"><button onClick={() => setHelpOpen((value) => !value)}><HelpCircle size={18} /> ¿Necesitas ayuda?</button>{helpOpen && <aside><button onClick={() => setHelpOpen(false)} aria-label="Cerrar"><X size={14} /></button><b>Centro de ayuda</b><p>Los cambios se guardan únicamente como mocks en este navegador. Puedes restaurarlos desde Preferencias.</p></aside>}</div></div>;
}
